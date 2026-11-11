#!/usr/bin/env bash
# 扫描 library/ 下的所有维度文件，生成 library/index.md
# 用法：bash scripts/build-index.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="$ROOT/library"
OUT="$LIB/index.md"

{
  echo "---"
  echo "id: library-index"
  echo "title: 提示词库索引"
  echo "dimension: 索引"
  echo "applies_to: [H3, Seedance2.5]"
  echo "model_field: 全局"
  echo "---"
  echo
  echo "# 提示词库索引"
  echo
  echo "> **用法**：先在这里定位维度，再读对应的维度文件挑片段。不要一次性读完整个库。"
  echo "> **生成**：\`bash scripts/build-index.sh\`（改完片段跑一次，索引自动更新）"
  echo
  echo "## 维度总览"
  echo
  echo "| 文件 | 维度 | 片段数 | ID 段 | 装配位置 |"
  echo "| --- | --- | --- | --- | --- |"
} > "$OUT.tmp"

total=0
for f in "$LIB"/*.md; do
  base="$(basename "$f")"
  [ "$base" = "index.md" ] && continue
  # model-syntax.md 是语法参考文档（用小节标题而非片段 ID），不计入片段库
  [ "$base" = "model-syntax.md" ] && continue
  # model-syntax.md 等参考文件没有 frontmatter / 装配位置，这里全部容错
  title="$(grep -m1 '^title:' "$f" 2>/dev/null | sed 's/^title: *//' || true)"
  dim="$(grep -m1 '^dimension:' "$f" 2>/dev/null | sed 's/^dimension: *//' || true)"
  place="$(grep -m1 '^> \*\*装配位置\*\*' "$f" 2>/dev/null | sed 's/^> \*\*装配位置\*\*：//' || true)"
  # 只统计片段型标题（### XXX-01），参考文档里的小节标题不计入片段总数
  count="$(grep -cE '^### [A-Z0-9]+-[0-9]+' "$f" 2>/dev/null || true)"
  count="${count:-0}"
  ids="$(grep '^### ' "$f" 2>/dev/null | sed -E 's/^### ([A-Z0-9]+)-[0-9]+.*/\1/' | sort -u | tr '\n' ' ' | sed 's/ $//' || true)"
  [ -z "$title" ] && title="$(grep -m1 '^# ' "$f" | sed 's/^# //')"
  [ -z "$place" ] && place="—"
  [ -z "$ids" ] && ids="—"
  echo "| \`$base\` | $dim | $count | \`$ids\` | $place |" >> "$OUT.tmp"
  total=$((total + count))
done

{
  echo
  echo "**片段总数：$total**"
  echo
  echo "## 维度文件说明"
} >> "$OUT.tmp"

for f in "$LIB"/*.md; do
  base="$(basename "$f")"
  [ "$base" = "index.md" ] && continue
  [ "$base" = "model-syntax.md" ] && continue
  echo "" >> "$OUT.tmp"
  echo "### \`$base\`" >> "$OUT.tmp"
  echo "" >> "$OUT.tmp"
  grep '^### ' "$f" | sed -E 's/^### /- /' >> "$OUT.tmp"
done

echo "" >> "$OUT.tmp"
echo "### \`model-syntax.md\`（参考文档，非片段库）" >> "$OUT.tmp"
echo "" >> "$OUT.tmp"
grep '^#\{1,3\} ' "$LIB/model-syntax.md" | sed -E 's/^#+ /- /' >> "$OUT.tmp"

{
  echo ""
  echo "## 装配优先级（翻译 Agent 用）"
  echo ""
  echo "1. \`model-syntax.md\` —— 先确定用哪个模型的骨架"
  echo "2. \`story-structure.md\` —— 再决定单镜还是多镜结构"
  echo "3. \`subject-consistency\` / \`scene-environment\` —— 主体与场景"
  echo "4. \`action-beats\` / \`pacing-duration\` —— 动作节拍与节奏"
  echo "5. \`camera-movement\` —— 一镜只给一个主运镜"
  echo "6. \`lighting\` / \`style-texture\` / \`color-tone\` / \`mood-emotion\` —— 视觉与情绪"
  echo "7. \`audio-dialogue-music\` —— 音画绑定"
  echo "8. \`negative-constraints\` —— 收尾补约束"
  echo "9. \`image-model\` —— 需要图生视频时再出关键帧"
} >> "$OUT.tmp"

mv "$OUT.tmp" "$OUT"
echo "已生成 $OUT（片段总数 $total）"
