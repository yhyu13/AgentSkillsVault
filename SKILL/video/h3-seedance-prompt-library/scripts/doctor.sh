#!/usr/bin/env bash
# ============================================================================
# 本地模型体检 —— 探测本地推理服务与可用模型，并刷新 agents/fallback-models.json
#
#   bash scripts/doctor.sh            # 只体检
#   bash scripts/doctor.sh --refresh  # 体检 + 重写 fallback-models.json
#   bash scripts/doctor.sh --probe    # 体检 + 实际发一个请求验证能出字
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT/agents/fallback-models.json"

REFRESH=0
PROBE=0
for arg in "$@"; do
  case "$arg" in
    --refresh) REFRESH=1 ;;
    --probe)   PROBE=1 ;;
  esac
done

say() { printf '\n\033[1m▌%s\033[0m\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn(){ printf '  \033[33m!\033[0m %s\n' "$*"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$*"; }

LLAMA_ENDPOINTS=("http://127.0.0.1:8080/v1" "http://127.0.0.1:8081/v1")
OLLAMA_ENDPOINTS=("http://127.0.0.1:11434/v1")

say "探测本地推理服务"

# --- llama.cpp ------------------------------------------------------------
LLAMA_BASE=""
LLAMA_MODELS=""
for base in "${LLAMA_ENDPOINTS[@]}"; do
  body="$(curl -sS --max-time 6 "${base}/models" 2>/dev/null || true)"
  if [ -n "$body" ]; then
    LLAMA_BASE="$base"
    LLAMA_MODELS="$(printf '%s' "$body" | python -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit()
rows=d.get('data',d.get('models',[]))
for m in rows: print(m.get('id') or m.get('name') or '?')
" 2>/dev/null)"
    ok "llama.cpp 服务在线：$base"
    [ -n "$LLAMA_MODELS" ] && printf '%s\n' "$LLAMA_MODELS" | sed 's/^/      - /'
    break
  fi
done
[ -z "$LLAMA_BASE" ] && warn "llama.cpp 服务未发现（尝试过 ${LLAMA_ENDPOINTS[*]}）"

# --- Ollama ---------------------------------------------------------------
OLLAMA_BASE=""
OLLAMA_MODELS=""
for base in "${OLLAMA_ENDPOINTS[@]}"; do
  tags="$(curl -sS --max-time 6 "${base%/v1}/api/tags" 2>/dev/null || true)"
  if [ -n "$tags" ]; then
    OLLAMA_BASE="$base"
    OLLAMA_MODELS="$(printf '%s' "$tags" | python -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit()
for m in d.get('models',[]):
    det=m.get('details',{})
    print(f\"{m.get('name','?')}\t{det.get('parameter_size','')}\t{det.get('quantization_level','')}\")
" 2>/dev/null)"
    ok "Ollama 服务在线：$base"
    printf '%s\n' "$OLLAMA_MODELS" | sed 's/^/      - /'
    break
  fi
done
[ -z "$OLLAMA_BASE" ] && warn "Ollama 服务未发现（尝试过 ${OLLAMA_ENDPOINTS[*]}）"

# --- 实探 -----------------------------------------------------------------
if [ "$PROBE" -eq 1 ]; then
  say "实探：能否真的出字"
  if [ -n "$LLAMA_BASE" ] && [ -n "$LLAMA_MODELS" ]; then
    m="$(printf '%s\n' "$LLAMA_MODELS" | head -1)"
    r="$(curl -sS --max-time 60 "${LLAMA_BASE}/chat/completions" -H 'Content-Type: application/json' \
      -d "{\"model\":\"$m\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with the single word: OK\"}],\"max_tokens\":16}" 2>/dev/null || true)"
    printf '%s' "$r" | grep -q '"content"' && ok "llama.cpp/$m 出字正常" || bad "llama.cpp/$m 出字异常：$(printf '%s' "$r" | head -c 160)"
  fi
  if [ -n "$OLLAMA_BASE" ] && [ -n "$OLLAMA_MODELS" ]; then
    m="$(printf '%s\n' "$OLLAMA_MODELS" | head -1 | cut -f1)"
    r="$(curl -sS --max-time 60 "${OLLAMA_BASE}/chat/completions" -H 'Content-Type: application/json' \
      -d "{\"model\":\"$m\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with the single word: OK\"}],\"max_tokens\":16,\"stream\":false}" 2>/dev/null || true)"
    printf '%s' "$r" | grep -q '"content"' && ok "ollama/$m 出字正常" || bad "ollama/$m 出字异常：$(printf '%s' "$r" | head -c 160)"
  fi
fi

# --- 刷新配置 -------------------------------------------------------------
if [ "$REFRESH" -eq 1 ]; then
  say "刷新 $CFG"
  python - "$CFG" "$LLAMA_BASE" "$LLAMA_MODELS" "$OLLAMA_BASE" "$OLLAMA_MODELS" <<'PY'
import json, sys, datetime, pathlib

cfg_path, llama_base, llama_models, ollama_base, ollama_models = sys.argv[1:6]
cfg = json.loads(pathlib.Path(cfg_path).read_text(encoding="utf-8"))

def lines(s):
    return [x for x in (s or "").splitlines() if x.strip()]

fallbacks = []
pri = 1
if llama_base:
    for m in lines(llama_models):
        fallbacks.append({
            "name": f"llama.cpp:{m}", "kind": "local", "endpoint": llama_base,
            "model": m, "priority": pri,
            "note": "llama.cpp server，OpenAI 兼容端点",
        }); pri += 1

def size_hint(rows):
    """按参数量给 ollama 模型排序：大的优先（翻译任务质量优先）"""
    out = []
    for r in rows:
        parts = r.split("\t")
        name = parts[0]
        params = parts[1] if len(parts) > 1 else ""
        try:
            bn = float(params.replace("B", "").strip())
        except Exception:
            bn = 0.0
        out.append((bn, name))
    return [n for _, n in sorted(out, key=lambda x: -x[0])]

if ollama_base:
    for m in size_hint(lines(ollama_models)):
        fallbacks.append({
            "name": f"ollama:{m}", "kind": "local", "endpoint": ollama_base,
            "model": m, "priority": pri,
            "note": "Ollama 本地模型",
        }); pri += 1

# 保留人工排好的优先级：已有条目沿用原 priority，新发现的模型追加到末尾。
# 不按参数量重排——降级链的顺序反映的是实测延迟与质量，不是参数量。
existing = {f.get("name"): f for f in cfg.get("fallbacks", [])}
merged = []
used = set()
for f in fallbacks:
    old = existing.get(f["name"])
    if old:
        f["priority"] = old.get("priority", f.get("priority", 99))
        for k in ("latency_s", "note"):
            if k in old:
                f[k] = old[k]
    merged.append(f)
    used.add(f["name"])
nxt = max([f.get("priority", 0) for f in merged] or [0]) + 1
for name, old in existing.items():
    if name not in used:
        old["priority"] = nxt
        merged.append(old)
        nxt += 1

cfg["fallbacks"] = sorted(merged, key=lambda x: x.get("priority", 99))
cfg["_updated"] = datetime.date.today().isoformat()
pathlib.Path(cfg_path).write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"  已写入 {len(fallbacks)} 个本地候选")
PY
  ok "配置已刷新"
fi

say "完成"
