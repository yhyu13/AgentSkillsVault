#!/usr/bin/env bash
# ============================================================================
# H3 + Seedance 2.5 提示词库 —— 一条命令做完三件自动更新
#
#   1. 同步    把 src/ 的内容镜像到 Cindy 实际加载的 ~/.claude/skills/
#   2. 索引    扫描库文件重建 library/index.md
#   3. 情报    抓官方 H3 / Seedance 文档原件，与上次快照对比，报出变化
#
# 用法：
#   bash scripts/update.sh              # 全套
#   bash scripts/update.sh --no-intel   # 跳过联网抓取
#   bash scripts/update.sh --intel-only # 只抓情报不安装
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="$ROOT/library"
INTEL="$LIB/intel"
DEST="${CINDY_SKILLS_DIR:-C:/Users/Intel/.claude/skills}/h3-seedance-prompt-library"
SKILL_NAME="h3-seedance-prompt-library"

NO_INTEL=0
INTEL_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-intel)   NO_INTEL=1 ;;
    --intel-only) INTEL_ONLY=1 ;;
    -h|--help)    sed -n '2,15p' "$0"; exit 0 ;;
  esac
done

say()  { printf '\n\033[1m▌%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

# 动态渲染页面：每次抓到的 HTML 都带不同的 id / 时间戳 / 随机串，
# 直接比 sha 每次都会误报「已更新」。这些源先归一化再比，并降级为提示。
VOLATILE_PROVIDERS="Seedance"

normalize_hash() {
  local file="$1" provider="$2"
  [ -f "$file" ] || return 0
  if printf '%s' "$VOLATILE_PROVIDERS" | grep -qw "$provider"; then
    tr -d '\r' < "$file" \
      | sed -E 's/[0-9a-f]{16,}/HASH/g; s/[0-9]{5,}/NUM/g; s/"[a-zA-Z_]+":"[0-9]+"/"K":0/g' \
      | sha256sum | cut -d' ' -f1
  else
    sha256sum "$file" | cut -d' ' -f1
  fi
}

# ---------------------------------------------------------------------------
# 3. 模型情报：官方抓取源
#    新增源只要往这个列表里加一行即可
# ---------------------------------------------------------------------------
SOURCES=(
  "MiniMax-H3|SKILL.md|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/h3-prompt-writing/SKILL.md"
  "MiniMax-H3|base-en.txt|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/h3-prompt-writing/references/base-en.txt"
  "MiniMax-H3|ref-en.txt|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/h3-prompt-writing/references/ref-en.txt"
  "MiniMax-H3|scene-3d-animation|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/3d-animation-short-generator/SKILL.cn.md"
  "MiniMax-H3|scene-brand-promo|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/brand-promo-video-generator/SKILL.cn.md"
  "MiniMax-H3|scene-coop-game|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/co-op-game-intro-generator/SKILL.cn.md"
  "MiniMax-H3|scene-handdrawn|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/handdrawn-live-video-generator/SKILL.cn.md"
  "MiniMax-H3|scene-product-ad|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/minimalist-product-ad-generator/SKILL.cn.md"
  "MiniMax-H3|scene-music-video|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/music-video-subtitle-generator/SKILL.cn.md"
  "MiniMax-H3|scene-paper-collage|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/paper-collage-explainer-generator/SKILL.cn.md"
  "MiniMax-H3|scene-papercraft|https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/skills/papercraft-stop-motion-explainer/SKILL.cn.md"
  "Seedance|Ark-video-task-API|https://docs.volcengine.com/docs/ark/create-video-generation-task-api"
  "Seedance|Jimeng-video-3.0-Pro|https://www.volcengine.com/docs/JimengAI/JimengAI-VideoGeneration30Pro-InterfaceDocumentationSP"
)

fetch_intel() {
  say "抓取模型官方情报"
  local now cur prev
  now="$(date +%Y%m%d-%H%M%S)"
  cur="$INTEL/snapshots/$now"
  prev="$(ls -1d "$INTEL"/snapshots/*/ 2>/dev/null | sort | tail -n1 | sed 's:/$::')"
  [ "$prev" = "$cur" ] && prev=""
  mkdir -p "$cur"

  local report="$INTEL/CHANGES-$now.md"
  {
    echo "# 模型情报变化报告 $now"
    echo
    echo "> 抓取源见 \`scripts/update.sh\` 的 SOURCES 列表。原始文件存于 \`library/intel/snapshots/$now/\`。"
    echo
    echo "| 源 | 文件 | 状态 | 说明 |"
    echo "| --- | --- | --- | --- |"
  } > "$report"

  local changed=0
  for row in "${SOURCES[@]}"; do
    local provider file url
    provider="${row%%|*}"; row="${row#*|}"
    file="${row%%|*}"; url="${row#*|}"
    local out="$cur/$provider/$file"
    mkdir -p "$(dirname "$out")"
    local code attempt
    code=000
    for attempt in 1 2 3; do
      code="$(curl -sSL --max-time 30 -w '%{http_code}' -o "$out" "$url" 2>/dev/null || true)"
      code="${code:-000}"
      [ "$code" = "200" ] && [ -s "$out" ] && break
      sleep 2
    done

    local note="" state=""
    if [ "$code" = "200" ] && [ -s "$out" ]; then
      local new_sum old_sum
      new_sum="$(normalize_hash "$out" "$provider")"
      old_sum="$(normalize_hash "$prev/$provider/$file" "$provider" 2>/dev/null || true)"
      if [ -z "$old_sum" ]; then
        state="新增"; note="首次抓取"; changed=$((changed+1))
      elif [ "$old_sum" != "$new_sum" ]; then
        # 差异可能来自残缺下载而不是上游真的改了。重抓两次确认稳定性。
        local v1 v2 stable=1
        v1="$(normalize_hash "$out" "$provider")"
        curl -sSL --max-time 30 -o "$out.verify" "$url" 2>/dev/null || true
        v2="$(normalize_hash "$out.verify" "$provider" 2>/dev/null || true)"
        rm -f "$out.verify"
        if [ "$v1" != "$v2" ]; then
          # 两次不一致 → 再抓一次，取第三次的结论
          curl -sSL --max-time 30 -o "$out.verify2" "$url" 2>/dev/null || true
          local v3
          v3="$(normalize_hash "$out.verify2" "$provider" 2>/dev/null || true)"
          rm -f "$out.verify2"
          if [ "$v3" != "$v2" ]; then
            stable=0
            state="抓取不稳定"; note="两次抓取内容不一致，疑似截断或网络抖动；本次不作为变更处理，请人工核对"
          fi
        fi
        if [ "$stable" -eq 1 ]; then
          # 体积骤降过半 = 几乎确定是截断
          local osz nsz
          osz=$(wc -c < "$prev/$provider/$file" 2>/dev/null || echo 0)
          nsz=$(wc -c < "$out" 2>/dev/null || echo 0)
          if [ "$osz" -gt 0 ] && [ "$nsz" -lt $((osz / 2)) ]; then
            state="疑似截断"; note="体积从 $osz 掉到 $nsz 字节，八成是下载不完整，勿直接采用"
          elif printf '%s' "$VOLATILE_PROVIDERS" | grep -qw "$provider"; then
            state="疑似变化"; note="动态页面，归一化后仍有差异；需人工确认是否为真变更"
            changed=$((changed+1))
          else
            state="**已更新**"; note="内容有变化，需人工比对"
            changed=$((changed+1))
          fi
          diff -u "$prev/$provider/$file" "$out" > "$cur/$provider/$file.diff" 2>/dev/null || true
        fi
      else
        state="未变"; note="与上次快照一致"
      fi
    else
      state="抓取失败"; note="HTTP $code（站点可能需要 JS 渲染或已改版）"
      warn "$provider/$file HTTP $code"
      rm -f "$out"
    fi
    printf '| %s | \`%s\` | %s | %s |\n' "$provider" "$file" "$state" "$note" >> "$report"
  done

  {
    echo
    echo "**变化源数量：$changed**"
    echo
    echo "## 怎么用这份报告"
    echo
    echo "1. 对每一项「已更新」，打开 \`library/intel/snapshots/$now/\` 下同名的 \`.diff\` 文件看改了哪几行。"
    echo "2. 把确实影响写法的变化，手工并入 \`library/model-syntax.md\`（本脚本不自动改写库，避免模型擅自改动你的提示词）。"
    echo "3. 并完后重新 \`bash scripts/update.sh\` 同步到 Cindy。"
  } >> "$report"

  # 只保留最近 10 份快照
  ls -1d "$INTEL"/snapshots/*/ 2>/dev/null | sort | head -n -10 | while read -r old; do
    rm -rf "$old"
  done

  if [ "$changed" -gt 0 ]; then
    ok "有 $changed 个官方源发生变化 → $report"
  else
    ok "官方源全部未变 → $report"
  fi
}

# ---------------------------------------------------------------------------
# 1. 同步：src/ → Cindy 实际加载目录
# ---------------------------------------------------------------------------
sync_install() {
  say "同步到 Cindy 安装目录"
  mkdir -p "$DEST"
  # 目标为纯镜像：先清空再拷，源里删掉的文件才不会残留
  rm -rf "$DEST"/library "$DEST"/agents "$DEST"/scripts "$DEST"/examples
  rm -f  "$DEST"/SKILL.md "$DEST"/README.md "$DEST"/.gitignore "$DEST"/LICENSE "$DEST"/NOTICE.md
  cp -r "$LIB"      "$DEST/library"
  cp -r "$ROOT/agents"  "$DEST/agents"
  cp -r "$ROOT/scripts" "$DEST/scripts"
  [ -d "$ROOT/examples" ] && cp -r "$ROOT/examples" "$DEST/examples"
  cp    "$ROOT/SKILL.md" "$ROOT/README.md" "$ROOT/.gitignore" "$ROOT/LICENSE" "$ROOT/NOTICE.md" "$DEST/"
  [ -f "$ROOT/update.cmd" ] && cp "$ROOT/update.cmd" "$DEST/"
  # 情报快照是可再生的历史副本，安装目录不需要
  rm -rf "$DEST/library/intel/snapshots"
  ok "已安装到 $DEST"
  printf '  \033[90m→ 在 Cindy 里重开一个会话，Skill 才会被重新加载\033[0m\n'
}

# ---------------------------------------------------------------------------
# 2. 索引
# ---------------------------------------------------------------------------
build_index() {
  say "重建库索引"
  bash "$ROOT/scripts/build-index.sh" | sed 's/^/  /'
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
printf '\033[1m H3 + Seedance 2.5 提示词库 · 自动更新\033[0m\n'
printf ' 源目录 : %s\n' "$ROOT"

if [ "$INTEL_ONLY" -eq 1 ]; then
  [ "$NO_INTEL" -eq 0 ] && fetch_intel
  exit 0
fi

# 顺序很重要：先重建索引，再同步——否则装到 Cindy 的索引会比库里慢一版
build_index
sync_install
[ "$NO_INTEL" -eq 0 ] && fetch_intel

say "完成"
printf '  下一步：在 Cindy 重开会话，然后说「用 H3 提示词库：<你的大白话>」\n\n'
