#!/usr/bin/env bash
# ============================================================================
# 本地模型客户端 —— 按 agents/fallback-models.json 的降级链依次尝试本地模型
#
#   bash scripts/local-llm.sh --prompt-file 提问.md
#   bash scripts/local-llm.sh --prompt-file 提问.md --model ollama:qwen3.5:27b
#   bash scripts/local-llm.sh --prompt-file 提问.md --system-file 角色.md --max-tokens 2048
#
# 走 OpenAI 兼容端点（llama.cpp server 与 Ollama 都提供）。
# 输出：纯文本正文；失败时退出码非 0 并打印已尝试的链路与原因。
#
# 三个已踩过的坑（都已在下面处理，勿改回）：
#   1. 中文不能作为 shell 参数传给 curl —— Git Bash 会先毁掉 UTF-8。
#      请求体一律由 python 写成临时文件，再用 curl --data-binary @file 发送。
#   2. 本地模型多是思考型：思考内容进 reasoning 字段，会把 max_tokens 吃光
#      导致 content 为空。默认 max_tokens 给到 1024 以上。
#   3. llama.cpp 支持 chat_template_kwargs.enable_thinking=false 关掉思考；
#      Ollama 的 OpenAI 兼容层不认 think 参数，只能靠给足 token。
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT/agents/fallback-models.json"

PROMPT_FILE=""
SYSTEM_FILE=""
ONLY_MODEL=""
MAX_TOKENS=2048
TIMEOUT=300

while [ $# -gt 0 ]; do
  case "$1" in
    --prompt-file) PROMPT_FILE="$2"; shift 2 ;;
    --system-file) SYSTEM_FILE="$2"; shift 2 ;;
    --model)       ONLY_MODEL="$2"; shift 2 ;;
    --max-tokens)  MAX_TOKENS="$2"; shift 2 ;;
    --timeout)     TIMEOUT="$2"; shift 2 ;;
    -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

[ -n "$PROMPT_FILE" ] && [ -f "$PROMPT_FILE" ] || { echo "缺少 --prompt-file" >&2; exit 2; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# python 负责读文件与写请求体：全程不经过 shell 字面量，UTF-8 安全
python - "$PROMPT_FILE" "$SYSTEM_FILE" "$MAX_TOKENS" "$TMP/body.json" <<'PY'
import json, io, sys
prompt_path, system_path, max_tokens, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
msgs = []
if system_path:
    with io.open(system_path, encoding="utf-8") as f:
        s = f.read().strip()
    if s:
        msgs.append({"role": "system", "content": s})
with io.open(prompt_path, encoding="utf-8") as f:
    msgs.append({"role": "user", "content": f.read()})
body = {"messages": msgs, "max_tokens": max_tokens, "temperature": 0.6, "stream": False}
with io.open(out, "w", encoding="utf-8") as f:
    f.write(json.dumps(body, ensure_ascii=False))
PY
[ -s "$TMP/body.json" ] || { echo "请求体构造失败" >&2; exit 2; }

# 读降级链
CHAIN="$(python - "$CFG" "$ONLY_MODEL" <<'PY'
import json, sys
cfg = json.load(open(sys.argv[1], encoding="utf-8"))
only = sys.argv[2]
fb = sorted(cfg.get("fallbacks", []), key=lambda x: x.get("priority", 99))
if only:
    fb = [f for f in fb if f.get("name") == only or f.get("model") == only]
for f in fb:
    print(f"{f['endpoint']}\t{f['model']}\t{f.get('name','')}")
PY
)"

[ -z "$CHAIN" ] && { echo "降级链为空或模型名不匹配：$CFG" >&2; exit 3; }

attempted=0
while IFS=$'\t' read -r endpoint model label; do
  [ -z "$endpoint" ] && continue
  attempted=$((attempted+1))
  printf '[%d] %s（%s）… ' "$attempted" "$label" "$model" >&2

  # 按端点类型调参：llama.cpp 能关思考，Ollama 只能给足 token
  python - "$TMP/body.json" "$model" "$endpoint" "$TMP/req.json" <<'PY'
import json, io, sys
src, model, endpoint, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
body = json.load(open(src, encoding="utf-8"))
body["model"] = model
if "11434" in endpoint or ":11434" in endpoint:
    body.pop("think", None)          # Ollama 兼容层不认 think
else:
    body["chat_template_kwargs"] = {"enable_thinking": False}
with io.open(out, "w", encoding="utf-8") as f:
    f.write(json.dumps(body, ensure_ascii=False))
PY

  resp="$(curl -sS --max-time "$TIMEOUT" "${endpoint%/v1}/v1/chat/completions" \
    -H 'Content-Type: application/json' --data-binary "@$TMP/req.json" 2>/dev/null || true)"

  printf '%s' "$resp" > "$TMP/resp.json"

  content="$(python - "$TMP/resp.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    print(""); sys.exit()
if "error" in d:
    print(""); sys.exit()
ch = (d.get("choices") or [{}])[0]
msg = ch.get("message") or {}
c = (msg.get("content") or "").strip()
if not c:
    c = (ch.get("text") or "").strip()
print(c)
PY
)"

  if [ -n "$content" ]; then
    printf '\033[32m成功\033[0m\n' >&2
    printf '%s\n' "$content"
    exit 0
  fi

  reason="$(python - "$TMP/resp.json" <<'PY'
import json, sys
raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
try:
    d = json.loads(raw)
except Exception:
    print(raw[:200].replace("\n", " ")); sys.exit()
if "error" in d:
    print("服务端报错: " + str(d["error"])[:180]); sys.exit()
ch = (d.get("choices") or [{}])[0]
msg = ch.get("message") or {}
think = (msg.get("reasoning_content") or msg.get("reasoning") or "")
print("content 为空；思考长度 %d（可能 max_tokens 被思考吃光）" % len(think)
      if think else "content 为空且无思考内容")
PY
)"
  printf '\033[31m失败\033[0m — %s\n' "$reason" >&2
done <<< "$CHAIN"

echo "所有本地降级链路都失败（已尝试 $attempted 个）" >&2
exit 4
