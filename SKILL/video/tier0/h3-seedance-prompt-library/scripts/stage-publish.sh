#!/usr/bin/env bash
# ============================================================================
# 制作公开发布包
#
# 官方原件（MiniMax-H3 仓库的 skill 文件）没有明确再分发许可，
# 因此不随发布包分发：包内只保留带出处的规格摘要与差异报告，
# 原件由安装者自己跑 scripts/update.sh --intel-only 拉取。
#
#   bash scripts/stage-publish.sh [输出目录]
#   默认输出到 D:/AI训练/AI导演技能库-src/.publish/h3-seedance-prompt-library
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$(cd "$ROOT/.." && pwd)/.publish/h3-seedance-prompt-library}"

say() { printf '  %s\n' "$*"; }

rm -rf "$OUT"
mkdir -p "$OUT"

# 源文件：整体复制
cp "$ROOT/SKILL.md" "$ROOT/README.md" "$ROOT/LICENSE" "$ROOT/NOTICE.md" "$ROOT/.gitignore" "$OUT/"
[ -f "$ROOT/update.cmd" ] && cp "$ROOT/update.cmd" "$OUT/"
[ -d "$ROOT/examples" ] && cp -r "$ROOT/examples" "$OUT/"
cp -r "$ROOT/agents" "$ROOT/scripts" "$OUT/"

# library：逐文件复制，intel 下按规则处理
mkdir -p "$OUT/library/intel"
for f in "$ROOT"/library/*.md; do
  cp "$f" "$OUT/library/"
done

# intel：保留事实摘要与差异报告，剔除官方原文副本与快照
for f in official-facts.md corrections.md; do
  [ -f "$ROOT/library/intel/$f" ] && cp "$ROOT/library/intel/$f" "$OUT/library/intel/"
done
cp "$ROOT"/library/intel/CHANGES-*.md "$OUT/library/intel/" 2>/dev/null || true

# 占位说明，告诉安装者去哪拿原件
cat > "$OUT/library/intel/README.md" <<'EOF'
# 官方情报

本目录只保留**规格摘要**与**差异报告**，不含官方原文副本。

- `official-facts.md` —— 从 MiniMax 官方 `h3-prompt-writing` 规格提炼的结构事实，每条标注来源小节。
- `corrections.md` —— 本库与官方原件的逐条差异与改法。

官方原件（MiniMax-H3 仓库的 skill 文件）**未附带 LICENSE，无明确再分发许可**，故不随包分发。

自行拉取最新原件进行核对：

```bash
bash scripts/update.sh --intel-only
```

原件会落在 `library/intel/snapshots/<时间戳>/`，并生成变化报告 `library/intel/CHANGES-<时间戳>.md`。
EOF

# 校验
echo "发布包已生成：$OUT"
say "文件数：$(find "$OUT" -type f | wc -l)"
say "体积：  $(du -sh "$OUT" | cut -f1)"
if [ -d "$OUT/library/intel/minimax-h3-official" ]; then
  echo "  ✗ 官方原文仍在包里，发布前必须剔除" >&2
  exit 1
fi
say "官方原文：已剔除 ✓"
[ -f "$OUT/SKILL.md" ] || { echo "  ✗ 缺少 SKILL.md" >&2; exit 1; }
say "SKILL.md：存在 ✓"
