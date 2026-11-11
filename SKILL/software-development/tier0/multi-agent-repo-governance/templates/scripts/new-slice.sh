#!/usr/bin/env bash
# R4「单 issue 多 PR 多 worktree 并行」的切片创建脚本。
# 用法：bash scripts/new-slice.sh <slice-name> [base]
#   <slice-name> 切片名，用于 worktree 路径 wt/<slice-name> 与分支 feat/<slice-name>。
#   [base]       基线分支或提交，默认 main；显式传 base 等价于 user 指明目标分支。
# 退出码：0 = 创建成功；1 = 被 R2 或前置检查阻塞；2 = 用法错误或参数非法。
# 写操作约束：除最后的 git worktree add 外，全部为只读检查。
# Windows Git Bash 兼容：不硬编码盘符，主工作树路径由 git worktree list --porcelain 解析。
set -euo pipefail

section() {
  printf '\n=== %s ===\n' "$1"
}

# 解析主工作树根目录：porcelain 列表的第一条 worktree 恒为主工作树。
get_main_worktree_root() {
  local line
  while IFS= read -r line; do
    case "$line" in
      "worktree "*)
        printf '%s\n' "${line#worktree }"
        return 0
        ;;
    esac
  done < <(git worktree list --porcelain)
  return 1
}

# ---------- 参数 ----------

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf '用法：bash scripts/new-slice.sh <slice-name> [base]\n' >&2
  printf '默认 base 为 main；显式传 base 等价于 user 指明目标分支。\n' >&2
  exit 2
fi

SLICE="$1"
BASE="${2:-main}"
BASE_GIVEN=0
if [ "$#" -eq 2 ]; then
  BASE_GIVEN=1
fi

# 项目相关项抽到 .agent-gate.conf（分支前缀 / 工作树目录名）
CONF="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "$(pwd)")/.agent-gate.conf"
# shellcheck source=/dev/null
[ -f "$CONF" ] && . "$CONF"
BRANCH="${BRANCH_PREFIX:-feat}/${SLICE}"
WT_REL="${WORKTREE_DIR:-wt}/${SLICE}"

# 切片名合法性：首字符为字母或数字，其余为字母、数字、点、下划线、连字符，
# 长度 1 至 40 个字符；禁止 .. 与路径分隔符，避免路径穿越与非法 ref 名。
if ! [[ "$SLICE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$ ]] || [[ "$SLICE" == *".."* ]]; then
  printf 'BLOCKED：切片名 %s 非法，需匹配 ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$ 且不含 .. 。\n' "$SLICE" >&2
  exit 1
fi

# ---------- 0. 当前所在 worktree / 分支 ----------

section "0. 当前所在 worktree / 分支"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  printf 'BLOCKED：当前目录不是 git 仓库。\n' >&2
  exit 1
fi

CUR_WT="$(git rev-parse --show-toplevel)"
CUR_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || printf '(detached HEAD)')"
printf '当前 worktree：%s\n' "$CUR_WT"
printf '当前分支：%s\n' "$CUR_BRANCH"

# ---------- 1. R2 停止条件 ----------

section "1. R2 默认 main 与停止条件"

# 当前不在 main 且 user 未显式传 base 时，必须立即停止并提醒确认目标分支 / worktree。
if [ "$CUR_BRANCH" != "main" ] && [ "$BASE_GIVEN" -eq 0 ]; then
  printf 'BLOCKED（R2 立即停止）：当前 checkout 不是 main，且 user 未明确指明 branch 或 worktree。\n'
  printf '当前 checkout：%s\n' "$CUR_BRANCH"
  printf '当前 worktree：%s\n' "$CUR_WT"
  printf '按 R2：不得自行切换分支，不得在当前分支继续写任何文件。\n'
  printf '请 user 确认目标分支 / worktree 后重试，二选一：\n'
  printf '  - 沿用当前基线：bash scripts/new-slice.sh %s %s\n' "$SLICE" "$CUR_BRANCH"
  printf '  - 使用主工作树：先切换到主工作树的 main 分支，再重跑本脚本。\n'
  exit 1
fi

if [ "$CUR_BRANCH" = "main" ]; then
  printf '判定：当前 checkout 为 main，按 R2 允许继续（默认基线 main）。\n'
else
  printf '判定：当前 checkout 为 %s，user 已显式指明 base=%s，按 R2 允许继续。\n' "$CUR_BRANCH" "$BASE"
fi
printf '留痕：branch=%s；worktree=%s；rule=R2；conclusion=ALLOWED。\n' "$CUR_BRANCH" "$CUR_WT"

# ---------- 2. 前置只读检查（目标路径、分支、基线） ----------

section "2. 前置检查（目标路径、分支、基线）"

if ! git rev-parse --verify --quiet "${BASE}^{commit}" >/dev/null; then
  printf 'BLOCKED：基线 %s 不存在或无法解析为提交。\n' "$BASE" >&2
  exit 1
fi
BASE_COMMIT="$(git rev-parse "${BASE}^{commit}")"
printf '基线：%s -> %s\n' "$BASE" "$BASE_COMMIT"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  printf 'BLOCKED：分支 %s 已存在，不覆盖。\n' "$BRANCH" >&2
  exit 1
fi
printf '分支 %s：不存在（可创建）\n' "$BRANCH"

if ! MAIN_WT="$(get_main_worktree_root)"; then
  printf 'BLOCKED：无法解析主工作树根目录。\n' >&2
  exit 1
fi
TARGET_PATH="${MAIN_WT}/${WT_REL}"
printf '主工作树根目录：%s\n' "$MAIN_WT"
printf '目标 worktree 路径：%s\n' "$TARGET_PATH"

# 路径已被文件 / 目录占用，或已在 git worktree 注册表中，均报错退出不覆盖。
if [ -e "$TARGET_PATH" ]; then
  printf 'BLOCKED：目标路径 %s 已存在，不覆盖。\n' "$TARGET_PATH" >&2
  exit 1
fi
WT_LIST="$(git worktree list --porcelain)"
if grep -qF "worktree ${TARGET_PATH}" <<< "$WT_LIST"; then
  printf 'BLOCKED：目标路径 %s 已在 worktree 注册表中，不覆盖。\n' "$TARGET_PATH" >&2
  exit 1
fi
printf '目标路径：不存在（可创建）\n'

# ---------- 3. 创建（脚本唯一写操作） ----------

section "3. git worktree add（脚本唯一写操作）"

printf '执行：git worktree add -b %s %s %s\n' "$BRANCH" "$TARGET_PATH" "$BASE_COMMIT"
# 传 base 的提交哈希而非分支名，避免「分支已在其他 worktree 检出」导致被拒绝。
if ! git worktree add -b "$BRANCH" "$TARGET_PATH" "$BASE_COMMIT"; then
  printf 'BLOCKED：git worktree add 执行失败，未执行其他写操作。\n' >&2
  exit 1
fi

# ---------- 结果 ----------

section "创建结果"

printf '切片名：%s\n' "$SLICE"
printf 'worktree：%s\n' "$TARGET_PATH"
printf '分支：%s\n' "$BRANCH"
printf '基线：%s（%s）\n' "$BASE" "$BASE_COMMIT"
printf '文件所有权：本切片只写 %s 下自己登记的目录，不得写其他切片目录。\n' "$WT_REL"
printf '\n下一步（人工或 agent 执行）：\n'
printf '  1. 在 issue 切片拆分表登记本行：切片 / worktree / 分支 / PR / 状态。\n'
printf '  2. cd %s 后按 Spec Kit 阶段推进（constitution -> specify -> plan -> tasks -> implement）。\n' "$TARGET_PATH"
printf '  3. 按 R3 发 1 条开工进度评论；提交用 Refs: #<issue 编号> 关联同一 issue。\n'
printf '  4. 开 PR 套用 .github/PULL_REQUEST_TEMPLATE.md，合并前跑 bash scripts/pre-merge-check.sh %s main。\n' "$BRANCH"
exit 0
