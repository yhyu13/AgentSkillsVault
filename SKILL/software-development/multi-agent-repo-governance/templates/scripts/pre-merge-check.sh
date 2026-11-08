#!/usr/bin/env bash
# R1「Merge 前的主线冲突检查」的只读实现。
# 用法：bash scripts/pre-merge-check.sh <pr-branch> [base-branch]
#   <pr-branch>   待合并的 PR 分支名，必填。
#   [base-branch] 基线分支，默认 main。
# 退出码：0 = SAFE_TO_MERGE；1 = BLOCKED；2 = 用法错误或参数非法。
# 只读约束：本脚本不执行 merge、checkout、reset、stash、clean、push，
#   也不触碰工作树、暂存区与本地分支引用。两处例外均为任务明确允许的只读试算：
#   1) git fetch 只更新 remote-tracking 引用，不改本地分支与工作树；
#   2) git merge-tree --write-tree 只向对象库写松散对象，不改任何引用。
# Windows Git Bash 兼容：不硬编码盘符，主工作树路径由 git worktree list --porcelain 解析。
# 无状态约定（R1.1 补强）：本脚本无状态，10 分钟 TTL 由调用方按 CHECK_TIMESTAMP 判定；
#   脚本只负责产出时间戳与 HEAD（CHECK_TIMESTAMP 与 MAIN_HEAD 由同一轮检查产生，不跨轮拼接）。
set -euo pipefail

# ---------- 通用函数 ----------

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

# 解析某个本地分支被检出所在的 worktree；未检出时回退到主工作树根目录。
find_worktree_for_branch() {
  local wanted="$1" line wt="" br=""
  while IFS= read -r line; do
    case "$line" in
      "worktree "*) wt="${line#worktree }" ;;
      "branch "*)
        br="${line#branch }"
        if [ "$br" = "refs/heads/$wanted" ]; then
          printf '%s\n' "$wt"
          return 0
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)
  get_main_worktree_root
}

# 解析 main 工作树（从 git worktree list --porcelain，不硬编码路径），
# 在该工作树内读取 main 分支的完整 HEAD SHA，供结论溯源使用。
resolve_main_head() {
  local main_wt
  if main_wt="$(find_worktree_for_branch main)"; then
    git -C "$main_wt" rev-parse main 2>/dev/null || printf '(unavailable)\n'
  else
    printf '(unavailable)\n'
  fi
}

# 带超时与禁用交互凭据提示的 fetch，避免非交互环境挂起。
fetch_remote() {
  if command -v timeout >/dev/null 2>&1; then
    GIT_TERMINAL_PROMPT=0 timeout 20 git fetch --no-tags --quiet "$1"
  else
    GIT_TERMINAL_PROMPT=0 git fetch --no-tags --quiet "$1"
  fi
}

# 阻塞原因累加器。
BLOCK_REASONS=()
block() {
  BLOCK_REASONS+=("$1")
  printf 'BLOCKED 项：%s\n' "$1"
}

print_verdict() {
  section "结论"
  # 同一轮检查内产出溯源信息：时间戳与主线 HEAD 同源，供成功与阻塞两个分支共用，
  # 不得跨轮拼接；TTL 由调用方按 CHECK_TIMESTAMP 判定，脚本不持有状态。
  CHECK_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  MAIN_HEAD="$(resolve_main_head)"
  if [ "${#BLOCK_REASONS[@]}" -gt 0 ]; then
    printf 'BLOCKED\n'
    printf 'CHECK_TIMESTAMP=%s\n' "$CHECK_TIMESTAMP"
    printf 'MAIN_HEAD=%s\n' "$MAIN_HEAD"
    printf '存在 %d 项阻塞：\n' "${#BLOCK_REASONS[@]}"
    local r
    for r in "${BLOCK_REASONS[@]}"; do
      printf -- '- %s\n' "$r"
    done
    printf '\n按 R1：禁止 merge，禁止 --no-verify，禁止 checkout --、reset、stash、clean、强推，禁止丢弃用户改动。\n'
    printf '请先处理上述阻塞项，再重新运行本脚本。\n'
    exit 1
  fi
  printf 'SAFE_TO_MERGE\n'
  printf 'CHECK_TIMESTAMP=%s\n' "$CHECK_TIMESTAMP"
  printf 'MAIN_HEAD=%s\n' "$MAIN_HEAD"
  printf '冲突 0 处；脏文件 0 个；基线已同步；PR 分支已包含基线最新提交。\n'
  printf '按 R1：允许合并（每个 PR 合并前仍需单独重跑本检查）。\n'
  exit 0
}

# ---------- 参数 ----------

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf '用法：bash scripts/pre-merge-check.sh <pr-branch> [base-branch]\n' >&2
  printf '默认 base-branch 为 main。\n' >&2
  exit 2
fi

PR_BRANCH="$1"
BASE_BRANCH="${2:-main}"

# ---------- 0. 当前所在 worktree / 分支 ----------

section "0. 当前所在 worktree / 分支"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  printf 'BLOCKED：当前目录不是 git 仓库，无法执行 R1 检查。\n' >&2
  exit 1
fi

CUR_WT="$(git rev-parse --show-toplevel)"
CUR_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || printf '(detached HEAD)')"
printf '当前 worktree：%s\n' "$CUR_WT"
printf '当前分支：%s\n' "$CUR_BRANCH"
printf '待检查 PR 分支：%s\n' "$PR_BRANCH"
printf '基线分支：%s\n' "$BASE_BRANCH"

# ---------- 1. 分支存在性 ----------

section "1. 分支存在性"

if ! git rev-parse --verify --quiet "${BASE_BRANCH}^{commit}" >/dev/null; then
  block "基线分支 ${BASE_BRANCH} 不存在或无法解析为提交。"
  print_verdict
fi
if ! git rev-parse --verify --quiet "${PR_BRANCH}^{commit}" >/dev/null; then
  block "PR 分支 ${PR_BRANCH} 不存在或无法解析为提交。"
  print_verdict
fi
printf '基线分支 %s -> %s\n' "$BASE_BRANCH" "$(git rev-parse --short "${BASE_BRANCH}^{commit}")"
printf 'PR 分支 %s -> %s\n' "$PR_BRANCH" "$(git rev-parse --short "${PR_BRANCH}^{commit}")"

# ---------- 2. main 工作树脏检查（含 staged / unstaged / untracked） ----------

section "2. ${BASE_BRANCH} 工作树脏检查（含 untracked）"

if ! STATUS_WT="$(find_worktree_for_branch "$BASE_BRANCH")"; then
  block "无法解析 ${BASE_BRANCH} 对应的工作树路径。"
  print_verdict
fi
printf '被检查的工作树：%s\n' "$STATUS_WT"

# status --porcelain 默认包含未跟踪文件（?? 行），无需额外参数。
if ! PORCELAIN="$(git -C "$STATUS_WT" status --porcelain 2>&1)"; then
  block "无法在 ${STATUS_WT} 执行 git status --porcelain。"
  print_verdict
fi

STAGED=0
UNSTAGED=0
UNTRACKED=0
DIRTY_TOTAL=0

if [ -n "$PORCELAIN" ]; then
  while IFS= read -r line; do
    if [ -z "$line" ]; then
      continue
    fi
    x="${line:0:1}"
    y="${line:1:1}"
    DIRTY_TOTAL=$((DIRTY_TOTAL + 1))
    if [ "$x" = "?" ] && [ "$y" = "?" ]; then
      UNTRACKED=$((UNTRACKED + 1))
    else
      # 第一列非空格 = 已暂存；第二列非空格 = 未暂存。
      if [ "$x" != " " ]; then
        STAGED=$((STAGED + 1))
      fi
      if [ "$y" != " " ]; then
        UNSTAGED=$((UNSTAGED + 1))
      fi
    fi
  done <<< "$PORCELAIN"
fi

printf 'staged 改动：%d 个\n' "$STAGED"
printf 'unstaged 改动：%d 个\n' "$UNSTAGED"
printf 'untracked 文件：%d 个\n' "$UNTRACKED"
printf '脏文件合计：%d 个\n' "$DIRTY_TOTAL"

if [ "$DIRTY_TOTAL" -gt 0 ]; then
  printf '脏文件清单：\n%s\n' "$PORCELAIN"
  # merge-tree 只比较已提交的树，看不到未提交改动；
  # 因此「含未提交改动的主线」无法被试算覆盖，按 R1 直接判 BLOCKED。
  block "${BASE_BRANCH} 工作树存在 ${DIRTY_TOTAL} 个脏文件；merge-tree 无法覆盖未提交改动，未确认无冲突即不允许 merge。"
else
  printf '检查结论：clean（0 个脏文件）\n'
fi

# ---------- 3. base 与远端同步 ----------

section "3. ${BASE_BRANCH} 与远端同步"

# sed -n '1p' 会读完全部输入，避免 grep -q 提前退出在 pipefail 下触发 SIGPIPE。
REMOTE_NAME="$(git remote | sed -n '1p')"
if [ -z "$REMOTE_NAME" ]; then
  printf 'WARN：未配置任何 remote，跳过远端同步比较（不影响其余检查）。\n'
else
  printf '使用 remote：%s\n' "$REMOTE_NAME"
  if fetch_remote "$REMOTE_NAME"; then
    FETCH_OK=0
  else
    FETCH_OK=$?
  fi
  if [ "$FETCH_OK" -ne 0 ]; then
    printf 'WARN：git fetch 失败或超时（退出码 %d），跳过远端同步比较。\n' "$FETCH_OK"
  else
    REMOTE_REF="refs/remotes/${REMOTE_NAME}/${BASE_BRANCH}"
    if ! git rev-parse --verify --quiet "${REMOTE_REF}^{commit}" >/dev/null; then
      printf 'WARN：远端尚无 %s（空仓库或尚未推送），跳过同步比较。\n' "$REMOTE_REF"
    else
      LOCAL_SHA="$(git rev-parse "${BASE_BRANCH}^{commit}")"
      REMOTE_SHA="$(git rev-parse "${REMOTE_REF}^{commit}")"
      printf '本地 %s：%s\n' "$BASE_BRANCH" "$LOCAL_SHA"
      printf '远端 %s：%s\n' "$REMOTE_REF" "$REMOTE_SHA"
      if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
        printf '检查结论：in-sync（本地与远端一致）\n'
      else
        block "本地 ${BASE_BRANCH} 与远端 ${REMOTE_NAME}/${BASE_BRANCH} 不同步。"
      fi
    fi
  fi
fi

# ---------- 4. merge-tree 非破坏性冲突试算 ----------

section "4. merge-tree 非破坏性冲突试算"

# 优先使用 --write-tree：退出码 0 = 干净，1 = 有冲突，其余 = 出错。
# 该命令只向对象库写松散对象，不改工作树、暂存区、本地分支引用。
if MERGE_OUT="$(git merge-tree --write-tree --messages "$BASE_BRANCH" "$PR_BRANCH" 2>&1)"; then
  MERGE_STATUS=0
else
  MERGE_STATUS=$?
fi

case "$MERGE_STATUS" in
  0)
    printf '试算退出码：0（0 处冲突）\n'
    printf '合并结果树：%s\n' "$(sed -n '1p' <<< "$MERGE_OUT")"
    ;;
  1)
    printf '试算退出码：1（存在冲突）\n'
    printf '%s\n' "$MERGE_OUT"
    CONFLICT_COUNT="$(grep -c '^CONFLICT' <<< "$MERGE_OUT" || true)"
    block "merge-tree 试算检出 ${CONFLICT_COUNT} 处冲突信息（退出码 1）。"
    ;;
  129)
    # 老版本 git 不支持 --write-tree，退化到 3 参数形式并扫描冲突标记。
    printf 'WARN：当前 git 不支持 --write-tree，退化到 git merge-tree <base-tree> <b1> <b2>。\n'
    if ! BASE_TREE="$(git merge-base "$BASE_BRANCH" "$PR_BRANCH" 2>/dev/null)"; then
      block "退化模式无法求 merge-base（两分支可能无共同祖先）。"
    else
      if LEGACY_OUT="$(git merge-tree "$BASE_TREE" "$BASE_BRANCH" "$PR_BRANCH" 2>&1)"; then
        LEGACY_STATUS=0
      else
        LEGACY_STATUS=$?
      fi
      if [ "$LEGACY_STATUS" -ne 0 ] || grep -qE 'CONFLICT|<<<<<<<|changed in both' <<< "$LEGACY_OUT"; then
        printf '%s\n' "$LEGACY_OUT"
        block "退化模式试算检出冲突或报错（退出码 ${LEGACY_STATUS}）。"
      else
        printf '退化模式试算退出码：0（0 处冲突）\n'
      fi
    fi
    ;;
  *)
    printf '试算退出码：%d（异常）\n' "$MERGE_STATUS"
    printf '%s\n' "$MERGE_OUT"
    block "merge-tree 试算异常退出（退出码 ${MERGE_STATUS}），无法确认无冲突。"
    ;;
esac

# ---------- 5. PR 分支是否包含 base 最新提交 ----------

section "5. PR 分支是否包含 ${BASE_BRANCH} 最新提交"

if git merge-base --is-ancestor "${BASE_BRANCH}^{commit}" "${PR_BRANCH}^{commit}"; then
  printf '检查结论：up-to-date（PR 分支已包含基线最新提交）\n'
else
  block "PR 分支 ${PR_BRANCH} 未包含 ${BASE_BRANCH} 的最新提交，需先同步基线。"
fi

# ---------- 结论 ----------

print_verdict
