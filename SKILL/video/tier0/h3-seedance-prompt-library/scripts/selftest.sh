#!/usr/bin/env bash
# ============================================================================
# 提示词库自测 —— 一条命令跑完全部回归检查
#
#   bash scripts/selftest.sh
#
# 退出码 0 = 全通过；非 0 = 有失败项。
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="$ROOT/library"
DEST="${CINDY_SKILLS_DIR:-C:/Users/Intel/.claude/skills}/h3-seedance-prompt-library"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  \033[32m✓\033[0m %s\n' "$*"; }
no()   { FAIL=$((FAIL+1)); printf '  \033[31m✗\033[0m %s\n' "$*"; }
head2(){ printf '\n\033[1m▌%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
head2 "1 · 目录结构"
for f in SKILL.md README.md LICENSE NOTICE.md .gitignore update.cmd \
         agents/h3-seedance-translator.md agents/fallback-models.json agents/openai.yaml \
         scripts/update.sh scripts/build-index.sh scripts/doctor.sh scripts/local-llm.sh scripts/stage-publish.sh \
         library/index.md library/model-syntax.md; do
  [ -f "$ROOT/$f" ] && ok "$f" || no "$f 缺失"
done

# ---------------------------------------------------------------------------
head2 "2 · 维度文件格式合规"
DIM_FILES="subject-consistency scene-environment action-beats camera-movement lighting style-texture color-tone mood-emotion audio-dialogue-music negative-constraints pacing-duration image-model story-structure seedance-syntax reference-modes action-imitation director-styles shot-techniques h3-syntax shot-sequencing coverage-editing color-grading vfx-design"
for name in $DIM_FILES; do
  f="$LIB/$name.md"
  if [ ! -f "$f" ]; then no "$name.md 缺失"; continue; fi
  errs=""
  for k in '^id:' '^title:' '^dimension:' '^applies_to:' '^model_field:'; do
    grep -qE "$k" "$f" || errs="$errs 缺字段 ${k%:}"
  done
  [ -f "$f" ] && grep -q '^## 片段' "$f" || errs="$errs 缺「## 片段」节"
  grep -q '^## 排错提示' "$f" || errs="$errs 缺「## 排错提示」节"
  n=$(grep -c '^### ' "$f")
  [ "$n" -ge 14 ] || errs="$errs 片段数偏少($n)"
  # 每个片段四要素齐全
  frag=$(grep -c '^### ' "$f"); fields=$(grep -cE '^- \*\*(中文片段|英文片段|适用|要点)\*\*' "$f")
  [ "$frag" -gt 0 ] && [ "$fields" -lt "$frag" ] && errs="$errs 有片段缺四要素"
  [ -z "$errs" ] && ok "$(printf '%-24s %2s 片段  格式合规' "$name.md" "$n")" || no "$name.md —$errs"
done

# ---------------------------------------------------------------------------
head2 "3 · 片段 ID 唯一且编号连续"
dupes="$(grep -h '^### ' "$LIB"/*.md | sed -E 's/^### ([A-Z]+-[0-9]+).*/\1/' | sort | uniq -d)"
[ -z "$dupes" ] && ok "无重复 ID" || no "重复 ID: $(echo "$dupes" | tr '\n' ' ')"
for pre in SUB ENV ACT CAM LIT STY COL MOOD AUD NEG PAC IMG STO SD REF AIM DIR TEC H3S SEQ COV CGR VFX; do
  pat="^### ${pre}-[0-9]+"
  # 注意：前缀里可能含数字（如 H3S-），必须先剥前缀再取编号，否则会多抽一个 "3"
  ids="$(grep -hoE "$pat" "${LIB}"/*.md | sed -E "s/^### [A-Z0-9]+-//" | sort -n)"
  [ -z "$ids" ] && { no "$pre- 前缀没有任何片段"; continue; }
  exp=1; gap=""
  for i in $ids; do
    n=$((10#$i)); [ "$n" -eq "$exp" ] || gap="$gap 缺$pre-$exp"
    exp=$((10#$i + 1))
  done
  [ -z "$gap" ] && ok "$pre- 连续（$(echo "$ids" | wc -w) 个）" || no "$pre- 编号不连续:$gap"
done

# ---------------------------------------------------------------------------
head2 "4 · 索引与库一致"
declared="$(grep -oE '片段总数：[0-9]+' "$LIB/index.md" | grep -oE '[0-9]+')"
actual="$(grep -h '^### ' "$LIB"/*.md | grep -cE '^### [A-Z0-9]+-[0-9]+')"
[ "$declared" = "$actual" ] && ok "index 声明 $declared = 实际 $actual" || no "index 声明 $declared ≠ 实际 $actual"
for name in $DIM_FILES; do
  grep -q "$name.md" "$LIB/index.md" || no "index 缺 $name.md 条目"
done
ok "index 覆盖全部维度文件"

# ---------------------------------------------------------------------------
head2 "5 · 官方语法回归（防止被改回错误写法）"
regress() {
  if grep -qE "$2" "$LIB/$3"; then ok "$1"; else no "$1（$3 里找不到）"; fi
}
regress "Ref2VA 六段 subject_definitions"     "subject_definitions"      model-syntax.md
regress "Ref2VA 六段 retention_analysis"      "retention_analysis"       model-syntax.md
regress "Ref2VA 六段 detailed_description"    "detailed_description"     model-syntax.md
regress "H3 标签 <Picture N>"                 "<Picture ?[0-9N]"         model-syntax.md
regress "H3 标签 <Subject N>"                 "<Subject ?[0-9N]"         model-syntax.md
regress "I2VA 官方对齐句"                     "is fully referenced"      model-syntax.md
regress "FL2VA 对齐句 0.00-second mark"       "0.00-second mark"         model-syntax.md
regress "切镜短语 the camera cuts to"         "the camera cuts to"       model-syntax.md
regress "画外音官方固定短语"                  "says in an off-screen voiceover" audio-dialogue-music.md
regress "对白标签 <d>"                        "<d>"                      audio-dialogue-music.md
regress "官方运镜词表 Push In"                "Push In"                  model-syntax.md
regress "运镜自然英文动作句"                  "natural English action"   model-syntax.md
regress "screentrans 标签"                   "scenetrans"               model-syntax.md
regress "cutoff 标签"                         "cutoff"                   model-syntax.md
regress "官方六列镜头表 STO-23"               "STO-23"                   story-structure.md
regress "官方六列镜头表 STO-24"               "STO-24"                   story-structure.md
regress "Seedance 官方符号 音乐 ()"        "音乐"                          seedance-syntax.md
regress "Seedance 官方符号 音效 <>"        "音效"                          seedance-syntax.md
regress "Seedance 官方符号 对白 {}"        "对白"                          seedance-syntax.md
regress "Seedance 官方符号 字幕 【】"      "字幕"                          seedance-syntax.md
regress "官方固定句 Use @ImageN as the first frame" "Use @ImageN as the first frame"  seedance-syntax.md
regress "参考生视频五小节 Generation Goal" "Generation Goal"             seedance-syntax.md
regress "锁定 vs 不锁定"                    "不锁定"                       seedance-syntax.md
regress "动作模仿 req_key"                  "jimeng_dreamactor_m20_gen_video" action-imitation.md
regress "多参考素材 50 个上限"              "50"                           seedance-syntax.md
regress "关键帧参考句"                      "以图片"                       seedance-syntax.md
regress "官方转场示例"                      "向左擦除"                     seedance-syntax.md
regress "白模排除轨迹线"                    "轨迹线"                       seedance-syntax.md

regress "H3 官方规范 三字段"          "integrated_multimodal_description"  h3-syntax.md
regress "H3 切镜五短语"                 "the shot switches to"               h3-syntax.md
regress "H3 官方运镜词表"                "Push In"                            h3-syntax.md
regress "H3 画外音固定短语"              "says in an off-screen voiceover"    h3-syntax.md
regress "H3 连续性句式"                  "continues seamlessly across the cut" h3-syntax.md
regress "180 度轴线规则"                 "180"                               coverage-editing.md
regress "30 度规则"                      "30"                                coverage-editing.md
regress "切点动机分类"                   "切点"                               coverage-editing.md
regress "匹配剪辑"                       "匹配"                               coverage-editing.md
regress "J-cut / L-cut"                 "J-cut"                             coverage-editing.md
regress "镜头功能"                       "建立"                               shot-sequencing.md
regress "景别递进"                       "递进"                               shot-sequencing.md
regress "调色 三段式"                    "中间调"                             color-grading.md
regress "跨镜色彩一致性"                 "跨镜"                               color-grading.md
regress "特效能力边界"                   "特效"                               vfx-design.md

# 反向检查：第三方博客的错误说法不应残留在库里
STALE_ALLOW='已删除|不要引入|无官方出处|此前流传|此前库内|不是「|已删'
stale_words="$(grep -rhE '30~80 ?词|30–80 ?词' "$LIB"/*.md 2>/dev/null | grep -vE "$STALE_ALLOW" || true)"
if [ -n "$stale_words" ]; then
  no "库里仍把「提示词 30~80 词」当规则用（官方未说明字数限制）：$(printf '%s' "$stale_words" | head -1 | cut -c1-80)"
else
  ok "库里无「30~80 词」的错误规则残留"
fi
stale_dur="$(grep -rhE '4~30 ?秒|4-30 ?秒' "$LIB"/*.md 2>/dev/null | grep -vE "$STALE_ALLOW" || true)"
if [ -n "$stale_dur" ]; then
  no "库里仍把「4~30 秒」当规则用（官方是单段 30 秒直出）：$(printf '%s' "$stale_dur" | head -1 | cut -c1-80)"
else
  ok "库里无「4~30 秒」的错误规则残留"
fi

# 反向检查：H3 章节里不得把 Seedance 的槽位语法当成 H3 用法。
# 允许「这属于 Seedance / 不是 H3 语法」这类对比说明行。
h3_section="$(awk '/^## 一、/,/^## 二、/' "$LIB/model-syntax.md")"
ALLOW='不是 H3|属 Seedance|Seedance 2\.5|见 2\.4|已删除|伪硬上限'
bad_slot="$(printf '%s\n' "$h3_section" | grep -E '@Image[0-9]|@Video[0-9]|@Audio[0-9]' | grep -vE "$ALLOW" || true)"
if [ -n "$bad_slot" ]; then
  no "model-syntax.md 的 H3 章节里混入了 Seedance 槽位语法：$(printf '%s' "$bad_slot" | head -2)"
else
  ok "model-syntax.md 的 H3 章节无 Seedance 槽位语法"
fi
bad_cap="$(printf '%s\n' "$h3_section" | grep -E '≤ *12 *个参考文件|最多 *12 *个参考文件' | grep -vE "$ALLOW" || true)"
if [ -n "$bad_cap" ]; then
  no "model-syntax.md 的 H3 章节仍有「12 个参考文件」伪上限：$(printf '%s' "$bad_cap" | head -2)"
else
  ok "model-syntax.md 的 H3 章节无「12 个参考文件」伪上限"
fi
# 应当在别处明确说明 @ImageN 是 Seedance 专用
grep -qE '不是 H3 语法|只属 Seedance' "$LIB/model-syntax.md" \
  && ok "已注明 @ImageN 属 Seedance 2.5 专用" \
  || no "缺少「@ImageN 属 Seedance 专用」的说明"
if grep -qE '（OS，|（VO，' "$LIB/audio-dialogue-music.md"; then
  no "audio-dialogue-music.md 仍用 OS/VO 标记"
else
  ok "audio-dialogue-music.md 已无 OS/VO 标记"
fi

# ---------------------------------------------------------------------------
head2 "6 · 源码 ↔ 安装目录一致"
if [ -d "$DEST" ]; then
  diffs=0; checked=0
  while IFS= read -r rel; do
    checked=$((checked+1))
    a=$(sha256sum "$ROOT/$rel" 2>/dev/null | cut -d' ' -f1)
    b=$(sha256sum "$DEST/$rel" 2>/dev/null | cut -d' ' -f1)
    [ "$a" = "$b" ] || { diffs=$((diffs+1)); no "不一致: $rel"; }
  done < <(cd "$ROOT" && git ls-files | grep -v '^library/intel/' | grep -v '^LICENSE$' | grep -v '^NOTICE.md$')
  [ "$diffs" -eq 0 ] && ok "$checked 个文件全部一致" || true
else
  no "安装目录不存在：$DEST"
fi

# ---------------------------------------------------------------------------
head2 "7 · 发布包合规"
PUB="$(cd "$ROOT/.." && pwd)/.publish/h3-seedance-prompt-library"
if [ -d "$PUB" ]; then
  n=$(find "$PUB" -path '*minimax-h3-official*' | wc -l)
  [ "$n" -eq 0 ] && ok "发布包无官方原文" || no "发布包残留官方原文 $n 个文件"
  n=$(find "$PUB" -path '*snapshots*' | wc -l)
  [ "$n" -eq 0 ] && ok "发布包无情报快照" || no "发布包残留快照 $n 个"
  [ -d "$PUB/.git" ] && no "发布包含 .git 目录" || ok "发布包无 .git"
  [ -f "$PUB/SKILL.md" ] && ok "发布包含 SKILL.md" || no "发布包缺 SKILL.md"
  n=$(grep -cE '^name: h3-seedance-prompt-library' "$PUB/SKILL.md" 2>/dev/null || echo 0)
  [ "$n" -ge 1 ] && ok "frontmatter name 与包名一致" || no "frontmatter name 不匹配"
else
  no "发布包不存在（先跑 scripts/stage-publish.sh）"
fi

# ---------------------------------------------------------------------------
head2 "8 · git 仓库"
if [ -d "$ROOT/.git" ]; then
  n=$(cd "$ROOT" && git log --oneline | wc -l)
  [ "$n" -ge 1 ] && ok "$n 个提交" || no "没有提交"
  dirty=$(cd "$ROOT" && git status --porcelain | wc -l)
  [ "$dirty" -eq 0 ] && ok "工作区干净" || no "工作区有 $dirty 个未提交改动"
else
  no "不是 git 仓库"
fi

# ---------------------------------------------------------------------------
head2 "9 · 本地模型降级链"
if curl -sS --max-time 5 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  ok "Ollama 在线"
else
  no "Ollama 未运行（降级链少一条腿）"
fi
if curl -sS --max-time 5 http://127.0.0.1:8080/v1/models >/dev/null 2>&1; then
  ok "llama.cpp 在线"
else
  no "llama.cpp 未运行（降级链少一条腿）"
fi
if [ -f "$ROOT/agents/fallback-models.json" ]; then
  if python - "$ROOT/agents/fallback-models.json" <<'PY'
import json, sys
c = json.load(open(sys.argv[1], encoding="utf-8"))
fb = c.get("fallbacks", [])
assert c["primary"]["name"] == "MiniMax-M3.1-Flash", "主模型不是 MiniMax-M3.1-Flash"
assert len(fb) >= 3, "备选模型少于 3 个"
pr = [f["priority"] for f in fb]
assert pr == sorted(pr), "priority 未按升序排列"
assert len(set(pr)) == len(pr), "priority 有重复"
for f in fb:
    assert f.get("endpoint", "").startswith("http://127.0.0.1"), "端点不是本地: %s" % f.get("name")
    assert f.get("model"), "缺模型名: %s" % f.get("name")
print("  \033[32m✓\033[0m 路由表结构正确（主 %s + %d 个本地备选）" % (c["primary"]["name"], len(fb)))
PY
  then PASS=$((PASS+1)); else no "路由表结构有误"; fi
fi

# ---------------------------------------------------------------------------
printf '\n\033[1m▌结果\033[0m\n'
printf '  通过 \033[32m%d\033[0m  失败 \033[31m%d\033[0m\n\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
