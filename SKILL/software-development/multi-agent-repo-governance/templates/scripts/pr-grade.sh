#!/usr/bin/env bash
# pr-grade.sh — specs/006-agent-submit-governance H3 分级层的机判引擎。
# 用法：
#   bash scripts/pr-grade.sh --pr <N> [base]      # 完整评级：收集输入并输出 GRADE= 块
#   bash scripts/pr-grade.sh --check-commit   <N> # pr-gate job：提交信息格式 / Refs / 禁 Closes
#   bash scripts/pr-grade.sh --check-ownership <N> # pr-gate job：diff 是否越出切片独占目录
#   bash scripts/pr-grade.sh --check-syntax   <N>  # pr-gate job：改动的 *.sh 执行 bash -n
#   bash scripts/pr-grade.sh --check-template <N>  # pr-gate job：PR 模板 6 小节 + 三件套关键词
#   bash scripts/pr-grade.sh --selftest           # 离线自测：绿/黄/红/用法 4 类退出码
# 退出码（D-06）：0=GREEN 1=YELLOW 2=RED 3=用法错误
# 依赖：git、grep/sed/tr、gh（真实 PR 模式；CI 中由 GH_TOKEN 提供）。
# 只读约束：除调用 pre-merge-check.sh（其自身只读）外无任何写操作。
# Windows Git Bash 兼容：不硬编码盘符，主工作树路径由 git 解析。
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "$(pwd)")"

# 项目相关项全部抽到 .agent-gate.conf，换项目只改那个文件
# shellcheck source=/dev/null
[ -f "$REPO_ROOT/.agent-gate.conf" ] && . "$REPO_ROOT/.agent-gate.conf"
# .agent-gate.conf 能覆盖 GOV_PATHS_RE，所以它自己必须同属治理面（自保护）
GOV_PATHS_RE="${GOV_PATHS_RE:-^(AGENTS\.md|scripts/pre-merge-check\.sh|scripts/new-slice\.sh|\.github/.*|\.agent-gate\.conf)$}"
DEFAULT_ISSUE="${DEFAULT_ISSUE:-34}"
BRANCH_PREFIX="${BRANCH_PREFIX:-feat}"
WORKTREE_DIR="${WORKTREE_DIR:-wt}"
# 注：D2「契约漂移」维度目前由**独立 reviewer 人工承担**（见 references/governance-model.md）。
# 这里刻意不留一个定义了却从不参与计算的变量——那会让「漂移 0 处」变成「没算」而不是「算了是 0」。
BINARY_RE='\.(png|jpg|jpeg|gif|webp|glb|gltf|fbx|bin|mp4|mov|zip|7z|rar|exe|dll|so|dylib|psd|blend)$'
SECRET_RE='(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-[A-Za-z0-9]{20}|xox[baprs]-[A-Za-z0-9-]{10})'
DEP_RE='^(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|Pipfile|go\.mod|Cargo\.toml)$'

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 3; }

# ---------- 评级核心（纯函数，可被 scripts/tests/run.sh source 测试） ----------
# 输入经环境变量传入；输出 GRADE= 块到 stdout，返回 0/1/2。
# 变量：CI_STATE=pass|fail|pending|none  H1_STATE=pass|fail|stale|none
#       CROSS(越界文件数) D2_AUTH(已授权正本数) D2_UNAUTH(未授权治理/正本数)
#       SECRETS DELETIONS BINARY DEPS TEST_FAIL(数字，-1=未知) TEMPLATE_OK=1|0
grade_from_inputs() {
  local green=1 reasons=() blockers=() r
  [ "${CI_STATE:-none}" = pass ]    || { green=0; reasons+=("D5: ci=${CI_STATE:-none}"); [ "${CI_STATE:-none}" != pass ] && case "${CI_STATE:-none}" in pending) blockers+=("CI pending，保守黄级（R-03）");; fail) blockers+=("CI required checks 失败（FR-614 失去绿级）");; esac; }
  case "${H1_STATE:-none}" in
    pass) ;;
    stale) green=0; reasons+=("H1: stale（超 TTL）"); blockers+=("R1 结论超 10 分钟，须重跑");;
    fail)  green=0; reasons+=("H1: fail"); blockers+=("R1 BLOCKED：合并被 R1 禁止，与等级无关");;
    *)     green=0; reasons+=("H1: none（未跑 pre-merge-check）"); blockers+=("缺 H1 三件套");;
  esac
  if [ "${CROSS:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D1: 越界 ${CROSS} 处"); blockers+=("文件所有权越界（FR-605-2）→红"); fi
  if [ "${D2_UNAUTH:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D2: 未授权治理/正本 ${D2_UNAUTH} 处"); blockers+=("触碰治理文件或正本未授权（FR-605-1/2）→红"); fi
  if [ "${D2_AUTH:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D2: 已授权共享正本 ${D2_AUTH} 处 →黄"); blockers+=("共享正本改动需 user 批准（FR-604-1）"); fi
  if [ "${SECRETS:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D3: 凭据模式命中 ${SECRETS} 处"); blockers+=("疑似密钥/凭据（FR-605-4）→红"); fi
  if [ "${DELETIONS:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D3: 删除/重命名既有文件 ${DELETIONS} 个"); blockers+=("删除正本/既有文件（FR-605-5）→红"); fi
  if [ "${BINARY:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D3: 二进制 ${BINARY} 个 →黄"); blockers+=("二进制/LFS 需人工确认体积与来源"); fi
  if [ "${DEPS:-0}" -gt 0 ] 2>/dev/null; then green=0; reasons+=("D3: 依赖清单变更 ${DEPS} 个 →黄"); blockers+=("新增/变更依赖需 user 批准"); fi
  if [ "${TEST_FAIL:-"-1"}" = "-1" ]; then green=0; reasons+=("D4: 测试失败数未知"); blockers+=("PR 第 6 小节未写明失败数（FR-604-3）"); fi
  [ "${TEST_FAIL:-"-1"}" = "0" ] || { green=0; [ "${TEST_FAIL:-"-1"}" != "-1" ] && { reasons+=("D4: 测试失败 ${TEST_FAIL} 个"); blockers+=("测试失败 >0 个不得合并"); }; }
  [ "${TEMPLATE_OK:-0}" = 1 ] || { green=0; reasons+=("D4: PR 模板 6 小节或三件套不齐"); blockers+=("模板/三件套缺失（FR-603-8）→黄"); }

  local grade=GREEN
  for r in "${blockers[@]:-}"; do
    case "$r" in *→红*) grade=RED;; esac
  done
  [ "$grade" = RED ] || { [ "$green" = 1 ] || grade=YELLOW; }
  if [ "$green" = 1 ] && [ "$grade" != RED ]; then grade=GREEN; blockers=(); reasons=("FR-603 8 项机判全过"); fi

  printf 'GRADE=%s\n' "$grade"
  printf 'INPUTS: ci=%s h1=%s h2_cross=%s h2_drift=%s d2_auth=%s d2_unauth=%s secrets=%s deletions=%s binary=%s deps=%s test_fail=%s template=%s\n' \
    "${CI_STATE:-none}" "${H1_STATE:-none}" "${CROSS:-0}" 0 "${D2_AUTH:-0}" "${D2_UNAUTH:-0}" \
    "${SECRETS:-0}" "${DELETIONS:-0}" "${BINARY:-0}" "${DEPS:-0}" "${TEST_FAIL:--1}" "${TEMPLATE_OK:-0}"
  printf 'REASONS: %s\n' "${reasons[*]:-无}"
  if [ "$grade" = GREEN ]; then printf 'BLOCKERS: 0 条\n';
  else printf 'BLOCKERS: %s 条\n' "${#blockers[@]}"; for r in "${blockers[@]:-}"; do [ -n "$r" ] && printf '  - %s\n' "$r"; done; fi
  printf 'REVIEWER: <由 reviewer subagent 补齐（fresh context）>\n'
  printf 'CHECK_TIMESTAMP: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  [ "$grade" = GREEN ] && return 0
  [ "$grade" = YELLOW ] && return 1
  return 2
}

# ---------- gh 输入收集 ----------
# pr_field <PR号> <json字段> [jq过滤]；issue_field <issue号>
pr_field() { gh pr view "$1" --json "$2" --jq "${3:-.$2}" 2>/dev/null || printf ''; }
issue_body() { gh issue view "$1" --json body --jq '.body' 2>/dev/null || printf ''; }

# 从 issue 正文解析切片独占目录表：行形如 “- `slice` → `dir1`、`dir2`（备注）"
ownership_dirs_for() { # $1=issue编号 $2=切片名 ; 输出目录清单（每行 1 个）
  local body; body="$(issue_body "$1")"
  printf '%s\n' "$body" | sed -n "s/^- \`${2}\` → //p" | sed 's/（.*）//' | tr '、' '\n' | tr -d '\`' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' || true
}
path_in_dirs() { # $1=path 其余=目录清单
  local p="$1" d; shift
  for d in "$@"; do
    case "$d" in */) case "$p" in "$d"*) return 0;; esac;; esac
    [ "$p" = "$d" ] && return 0
    case "$p" in "$d/"*) return 0;; esac
  done
  return 1
}

collect_and_grade() { # $1=PR号 $2=base
  local pr="$1" base="${2:-main}" head issue body reasons_pre=()
  head="$(pr_field "$pr" headRefName)"
  body="$(pr_field "$pr" body)"
  issue="$(printf '%s\n' "$body" | grep -oE '(Refs: *)?#([0-9]+)' | head -1 | grep -oE '[0-9]+' || true)"
  [ -n "$issue" ] || issue="$(printf '%s\n' "$body" | grep -oE 'issue[：:]*#([0-9]+)' | head -1 | grep -oE '[0-9]+' || true)"
  [ -n "$issue" ] || issue="$DEFAULT_ISSUE"

  local files name_status added
  files="$(gh pr diff "$pr" --name-only 2>/dev/null || printf '')"
  name_status="$(gh pr diff "$pr" --name-status 2>/dev/null || printf '')"
  added="$(gh pr diff "$pr" 2>/dev/null | grep -E '^\+' || true)"

  # CI 状态（R-03：pending 保守黄级；D-03：本地重跑 pr-gate 四子检，任一失败即 ci=fail）
  local states ci_state=pass s sub
  states="$(pr_field "$pr" statusCheckRollup '.statusCheckRollup[].conclusion' | sort -u || true)"
  for s in $states; do case "$s" in FAILURE|TIMED_OUT|CANCELLED) ci_state=fail;; esac; done
  pr_field "$pr" statusCheckRollup '.statusCheckRollup[].status' | grep -qE 'IN_PROGRESS|QUEUED|PENDING|WAITING' && ci_state=pending
  [ -n "$states" ] || ci_state=none
  for sub in commit ownership syntax template; do
    bash "$0" --check-"$sub" "$pr" >/dev/null 2>&1 || { ci_state=fail; reasons_pre+=("pr-gate --check-$sub 失败") ; }
  done

  # H1：直接重跑 pre-merge-check（R1 不被替代）
  local h1_state=fail
  if git rev-parse --verify --quiet "refs/remotes/origin/${head}" >/dev/null 2>&1 || git fetch origin "$head" >/dev/null 2>&1; then
    if bash "$REPO_ROOT/scripts/pre-merge-check.sh" "origin/${head}" "$base" >/tmp/pr-grade-h1.$$ 2>&1; then h1_state=pass; else h1_state=fail; fi
    grep -q '^SAFE_TO_MERGE' /tmp/pr-grade-h1.$$ 2>/dev/null || h1_state=fail
    rm -f "/tmp/pr-grade-h1.$$"
  fi

  # 切片与目录（切片名来自分支 feat/<slice>；未登记切片 → 目录清单为空 → 全部计越界，保守红）
  local slice; slice="${head#"$BRANCH_PREFIX"/}"
  local dirs=(); mapfile -t dirs < <(ownership_dirs_for "$issue" "$slice")

  # 计数
  local cross=0 d2_auth=0 d2_unauth=0 del=0 bin=0 deps=0 sec=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if printf '%s' "$f" | grep -Eq "$GOV_PATHS_RE"; then
      if path_in_dirs "$f" "${dirs[@]:-}"; then d2_auth=$((d2_auth+1)); else d2_unauth=$((d2_unauth+1)); fi
    elif ! path_in_dirs "$f" "${dirs[@]:-}"; then
      cross=$((cross+1))
    fi
    printf '%s' "$f" | grep -Eq "$BINARY_RE" && bin=$((bin+1))
    printf '%s' "$f" | grep -Eq "$DEP_RE" && deps=$((deps+1))
  done <<< "$files"
  del=$(printf '%s\n' "$name_status" | awk -F'\t' '$1 ~ /^D|^R/ {c++} END{print c+0}')
  sec=$(printf '%s\n' "$added" | grep -cE "$SECRET_RE" || true)

  # 模板与测试失败数
  local tpl=1 tf=-1
  for s in '## 1. 关联 issue' '## 2. 本切片交付什么' '## 3. 不做什么' '## 4. 验收方式' '## 5. pre-merge 检查结果' '## 6. 测试与截图'; do
    printf '%s' "$body" | grep -qF "$s" || tpl=0
  done
  for s in SAFE_TO_MERGE CHECK_TIMESTAMP MAIN_HEAD; do printf '%s' "$body" | grep -q "$s" || tpl=0; done
  printf '%s' "$body" | grep -oE '失败[ ]*[0-9]+[ ]*(项|个)' | grep -oE '[0-9]+' | head -1 | grep -qE '.' && tf="$(printf '%s' "$body" | grep -oE '失败[ ]*[0-9]+[ ]*(项|个)' | grep -oE '[0-9]+' | head -1)"

  # 子检查失败详情作为前置 NOTE 行输出（不破坏 GRADE= 块格式）
  for r in "${reasons_pre[@]:-}"; do [ -n "$r" ] && printf 'NOTE: %s\n' "$r"; done

  CI_STATE="$ci_state" H1_STATE="$h1_state" CROSS="$cross" D2_AUTH="$d2_auth" D2_UNAUTH="$d2_unauth" \
  SECRETS="$sec" DELETIONS="$del" BINARY="$bin" DEPS="$deps" TEST_FAIL="$tf" TEMPLATE_OK="$tpl" \
  PR_NUM="$pr" grade_from_inputs
}

# 字符数（AGENTS.md §4：主题 ≤ 72 个字符。Git Bash C locale 下 ${#var} 按字节计数，
# 与 CI runner（UTF-8 数字符）不一致；用 iconv 转 UCS-2LE 后按字节/2 换算，失败时回退 ${#}）
char_len() {
  local u
  u="$(printf '%s' "$1" | iconv -f UTF-8 -t UCS-2LE 2>/dev/null | wc -c | tr -d '[:space:]')" || u=0
  if [ "${u:-0}" -gt 0 ] 2>/dev/null; then printf '%s' $((u/2)); else printf '%s' "${#1}"; fi
}

# ---------- pr-gate 子检查（CI 单一判据来源） ----------
check_commit() { # $1=PR号（gh 的 commits 对象只有 messageHeadline/messageBody，无整段 message）
  local pr="$1" raw ok=1 cur="" line
  raw="$(gh pr view "$pr" --json commits --jq '.commits[] | "==C==\n" + .messageHeadline + "\n" + .messageBody' 2>/dev/null || printf '')"
  [ -n "$raw" ] || { printf 'check-commit: 无法读取提交信息\n' >&2; exit 1; }
  flush_one() {
    [ -n "$cur" ] || return 0
    local subj; subj="$(printf '%s' "$cur" | head -1)"
    printf '%s\n' "$cur" | head -1 | grep -Eq '^(feat|fix|docs|chore|spec|test)\([a-z0-9._-]{1,40}\): ' || { printf 'check-commit: 主题行格式不合规: %s\n' "$subj" >&2; ok=0; }
    [ "$(char_len "$subj")" -le 72 ] || { printf 'check-commit: 主题超 72 字符（实际 %s）: %s\n' "$(char_len "$subj")" "$subj" >&2; ok=0; }
    printf '%s' "$cur" | grep -qE 'Refs: #[0-9]+' || { printf 'check-commit: 缺 Refs: #N\n' >&2; ok=0; }
    if printf '%s' "$cur" | grep -qiE 'closes? #[0-9]+'; then printf 'check-commit: 禁止 Closes #N\n' >&2; ok=0; fi
    return 0
  }
  while IFS= read -r line; do
    if [ "$line" = "==C==" ]; then flush_one; cur=""; else [ -n "$line" ] && cur+="${line}"$'\n'; fi
  done <<< "$raw"
  flush_one
  [ "$ok" = 1 ] && { printf 'check-commit: PASS（格式/Refs/禁Closes）\n'; exit 0; }
  exit 1
}
check_ownership() {
  local pr="$1" head slice issue body files cross=0 f
  head="$(pr_field "$pr" headRefName)"; body="$(pr_field "$pr" body)"
  issue="$(printf '%s\n' "$body" | grep -oE '(Refs: *)?#([0-9]+)' | head -1 | grep -oE '[0-9]+' || true)"; issue="${issue:-$DEFAULT_ISSUE}"
  slice="${head#"$BRANCH_PREFIX"/}"
  local dirs=(); mapfile -t dirs < <(ownership_dirs_for "$issue" "$slice")
  files="$(gh pr diff "$pr" --name-only 2>/dev/null || printf '')"
  [ -n "$files" ] || { printf 'check-ownership: 无法读取 diff\n' >&2; exit 1; }
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    path_in_dirs "$f" "${dirs[@]:-}" || { printf 'check-ownership: 越界 %s（切片 %s 的独占目录之外）\n' "$f" "$slice" >&2; cross=$((cross+1)); }
  done <<< "$files"
  if [ "$cross" -gt 0 ]; then printf 'check-ownership: FAIL，越界 %s 处\n' "$cross" >&2; exit 2; fi
  printf 'check-ownership: PASS，越界 0 处\n'; exit 0
}
check_syntax() {
  local pr="$1" f bad=0
  for f in $(gh pr diff "$pr" --name-only 2>/dev/null || printf ''); do
    case "$f" in *.sh) [ -f "$REPO_ROOT/$f" ] || continue
      bash -n "$REPO_ROOT/$f" || { printf 'check-syntax: bash -n 失败: %s\n' "$f" >&2; bad=1; };; esac
  done
  [ "$bad" = 0 ] && { printf 'check-syntax: PASS\n'; exit 0; }; exit 1
}
pick_python() {
  # Windows 上的 python3 可能是 Microsoft Store 的空壳存根（打印空、退出 1），
  # 所以要用「真能 import」来判定，而不是 command -v。
  local c
  for c in python3 python py; do
    command -v "$c" >/dev/null 2>&1 || continue
    "$c" -c 'import sys' >/dev/null 2>&1 || continue
    printf '%s' "$c"; return 0
  done
  return 1
}

check_refs() { # $1=PR号：文档引用可达性（会真跑命令，不从正文里 grep 结论）
  local pr="$1" out py
  py="$(pick_python)" || { printf 'check-refs: 找不到可用的 python 解释器
' >&2; exit 1; }
  out="$("$py" "$REPO_ROOT/scripts/check-refs.py" --pr "$pr" 2>&1)" || {
    printf '%s
' "$out" >&2; exit 1;
  }
  printf '%s
' "$out"
  printf 'check-refs: PASS（引用全部可达）
'
}

check_template() {
  local pr="$1" body s ok=1
  body="$(pr_field "$pr" body)"
  [ -n "$body" ] || { printf 'check-template: 无法读取 PR 正文\n' >&2; exit 1; }
  for s in '## 1. 关联 issue' '## 2. 本切片交付什么' '## 3. 不做什么' '## 4. 验收方式' '## 5. pre-merge 检查结果' '## 6. 测试与截图' SAFE_TO_MERGE CHECK_TIMESTAMP MAIN_HEAD; do
    printf '%s' "$body" | grep -q "$s" || { printf 'check-template: 缺 %s\n' "$s" >&2; ok=0; }
  done
  [ "$ok" = 1 ] && { printf 'check-template: PASS（6 小节 + 三件套）\n'; exit 0; }; exit 1
}

selftest() {
  local pass=0 fail=0 out rc
  rc=0; out=$(CI_STATE=pass H1_STATE=pass CROSS=0 D2_AUTH=0 D2_UNAUTH=0 SECRETS=0 DELETIONS=0 BINARY=0 DEPS=0 TEST_FAIL=0 TEMPLATE_OK=1 grade_from_inputs) || rc=$?
  printf '%s\n' "$out" | grep -q '^GRADE=GREEN' && [ $rc -eq 0 ] && pass=$((pass+1)) || { fail=$((fail+1)); printf 'selftest GREEN 未达: rc=%s\n%s\n' "$rc" "$out" >&2; }
  rc=0; out=$(CI_STATE=pass H1_STATE=pass CROSS=0 D2_AUTH=1 D2_UNAUTH=0 SECRETS=0 DELETIONS=0 BINARY=0 DEPS=0 TEST_FAIL=0 TEMPLATE_OK=1 grade_from_inputs) || rc=$?
  printf '%s\n' "$out" | grep -q '^GRADE=YELLOW' && [ $rc -eq 1 ] && pass=$((pass+1)) || { fail=$((fail+1)); printf 'selftest YELLOW 未达: rc=%s\n%s\n' "$rc" "$out" >&2; }
  rc=0; out=$(CI_STATE=pass H1_STATE=pass CROSS=1 D2_AUTH=0 D2_UNAUTH=0 SECRETS=0 DELETIONS=0 BINARY=0 DEPS=0 TEST_FAIL=0 TEMPLATE_OK=1 grade_from_inputs) || rc=$?
  printf '%s\n' "$out" | grep -q '^GRADE=RED' && [ $rc -eq 2 ] && pass=$((pass+1)) || { fail=$((fail+1)); printf 'selftest RED 未达: rc=%s\n%s\n' "$rc" "$out" >&2; }
  rc=0; out=$(CI_STATE=fail H1_STATE=pass CROSS=0 D2_AUTH=0 D2_UNAUTH=1 SECRETS=0 DELETIONS=0 BINARY=0 DEPS=0 TEST_FAIL=0 TEMPLATE_OK=1 grade_from_inputs) || rc=$?
  printf '%s\n' "$out" | grep -q '^GRADE=RED' && [ $rc -eq 2 ] && pass=$((pass+1)) || { fail=$((fail+1)); printf 'selftest RED(治理文件) 未达: rc=%s\n%s\n' "$rc" "$out" >&2; }
  printf 'selftest: 通过 %s 项，失败 %s 项\n' "$pass" "$fail"
  [ "$fail" -eq 0 ] || exit 1
}

# ---------- 入口（仅直接执行时分发；被 source 时跳过，供 scripts/tests/run.sh 用） ----------
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  [ $# -ge 1 ] || usage
  case "$1" in
    --pr)             [ $# -ge 2 ] || usage; collect_and_grade "$2" "${3:-main}" ;;
    --check-commit)   [ $# -ge 2 ] || usage; check_commit "$2" ;;
    --check-ownership) [ $# -ge 2 ] || usage; check_ownership "$2" ;;
    --check-syntax)   [ $# -ge 2 ] || usage; check_syntax "$2" ;;
    --check-template) [ $# -ge 2 ] || usage; check_template "$2" ;;
    --check-refs)    [ $# -ge 2 ] || usage; check_refs "$2" ;;
    --selftest)       selftest ;;
    *) usage ;;
  esac
fi
