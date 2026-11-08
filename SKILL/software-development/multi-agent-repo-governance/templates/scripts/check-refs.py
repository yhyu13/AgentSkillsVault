#!/usr/bin/env python3
# check-refs.py — 文档引用可达性检查器（规格 007 切片 refcheck-tool 交付）
#
# 解决的真实问题：机判（pr-grade.sh）只从 PR 正文里 grep「失败 N 个」当 test_fail，
# 根本不重跑命令——所以「引用指向不存在的文件」这类失准一路放行，是独立评审 subagent
# 实跑 os.path.exists 才抓到的。本脚本把这类检查变成会真跑命令的机判项。
#
# 用法：
#   python scripts/check-refs.py                 # 扫全仓（git ls-files 的 .md/.html）
#   python scripts/check-refs.py a.md b.md       # 扫指定文件
#   python scripts/check-refs.py --pr <N>        # 只扫该 PR diff 触及的文件
#   python scripts/check-refs.py --all --json    # 机器可读输出
#
# 退出码：0 = 全部可达；1 = 有不可达引用（清单打到 stdout）；2 = 用法错误。
#
# 解析三类引用：
#   1. Markdown 链接  ](path/to.md)  ](path/to.md#锚点)
#   2. 行内代码里的路径  `docs/pitch/decisions.md`
#   3. 正文裸路径  docs/pitch/decisions.md（必须带目录分隔符，避免把 README.md 这类
#      概念性词误判）
#
# 路径判定规则（保证通用，不绑定任何项目）：
#   - 首段是仓根真实存在的条目 → 按仓根相对路径解析
#   - 以 ./ ../ 开头 → 按文件所在目录解析
#   - 裸文件名（带扩展名）→ 先按文件所在目录，再按仓根
#   - 首段不是仓根条目（如 SKILL/、feat/、wt/）→ 视为外部仓路径，跳过
#   - 含通配符或尖括号（*.md、<slice>）→ 跳过
#   - file:line 形式 → 额外校验行号不超出文件行数
#   - md 目标的 #锚点 → 校验目标文件里确实有该标题

import argparse
import difflib
import json
import os
import re
import subprocess
import sys

IGNORE_FILE = '.refcheck-ignore'
SKIP_DIRS = {'.git', 'node_modules', 'vendor', 'dist', 'build', '__pycache__',
             '.venv', 'venv', '.mypy_cache', '.pytest_cache', 'coverage', 'out'}
EXT_RE = re.compile(r'\.(md|markdown|html|htm|py|sh|bash|yml|yaml|json|txt|js|mjs|cjs|ts|tsx|jsx|css|scss|svg|png|jpe?g|gif|webp|mp4|webm|mov|mp3|wav|glb|gltf|bin|pdf|docx|xlsx|pptx|tsx?)$')
CODE_SPAN_RE = re.compile(r'`([^`\n]{2,200})`')
MD_LINK_RE = re.compile(r'\]\(\s*([^)\s]+)')
BARE_PATH_RE = re.compile(r'(?<![\w/.-])((?:[\w.-]+/)+[\w./-]+\.[A-Za-z0-9]{1,8})\b')
HEADING_RE = re.compile(r'^(#{1,6})\s+(.*?)\s*$', re.M)
TEXT_EXT_RE = re.compile(r'\.(md|markdown|html|htm|txt|rst)$', re.I)


def repo_root(start, override=None):
    """向上找仓根：.git 在主仓是目录，在 worktree 里是文件——两种都要认。

    认错的代价很大（会把修复写进主工作树），所以认到第一个含 .git 的目录就停，
    并且后面所有写入都限制在这个根之下。
    """
    if override:
        return os.path.abspath(override)
    d = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(d, '.git')):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.abspath(start)
        d = parent


def root_entries(root):
    out = set()
    try:
        for name in os.listdir(root):
            if name in SKIP_DIRS or name == '.git':
                continue
            out.add(name)
    except OSError:
        pass
    return out


def load_ignore(root):
    pats = []
    p = os.path.join(root, IGNORE_FILE)
    if os.path.exists(p):
        for line in open(p, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            pats.append(line)
    return pats


def ignored(ref, pats):
    """忽略清单匹配：支持前缀与通配。尾斜杠会被归一，避免 'wt/' 变成 'wt//' 永不命中。"""
    r = ref.rstrip('/')
    for pat in pats:
        p = pat.rstrip('/')
        if not p:
            continue
        if p.endswith('*'):
            if r.startswith(p[:-1]):
                return True
        elif r == p or r.startswith(p + '/'):
            return True
    return False


def slugify(text):
    text = re.sub(r'`([^`]*)`', r'\1', text)
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    text = text.strip().lower()
    text = re.sub(r'[^\w\s\-㐀-鿿]', '', text)
    return re.sub(r'\s+', '-', text)


def headings_of(path):
    try:
        text = open(path, encoding='utf-8', errors='replace').read()
    except OSError:
        return set()
    return {slugify(m.group(2)) for m in HEADING_RE.finditer(text)}


def clean_token(tok):
    tok = tok.strip().rstrip('。，、；：,.;:）)】」』"\'')
    if tok.startswith('<') or '<' in tok or '>' in tok:
        return None
    if '*' in tok or '…' in tok or '...' in tok:
        return None
    if re.search(r'(^|[/_.-])(NN|nn|XXX|xxx|NNN|nnn)([/_.-]|$)', tok):
        return None  # 模板占位符，不是真引用
    if '{' in tok or '}' in tok:
        return None  # 花括号展开（{a,b}.png），不是单个文件
    if '–' in tok or '—' in tok or '～' in tok:
        return None  # 区间写法（01–04.png），不是单个文件
    if tok.startswith('http://') or tok.startswith('https://') or tok.startswith('mailto:'):
        return None
    if tok.startswith('#') or tok.startswith('/'):
        return None
    if tok.startswith('[') or tok.startswith('{') or tok.startswith('<'):
        return None  # 列表/字典字面量，不是路径
    return tok


def looks_like_path(tok):
    """只把「像路径」的 token 当引用：带目录分隔符，或带已知扩展名。"""
    if not tok or '/' in tok:
        return True
    return bool(EXT_RE.search(tok))


def tokens_in_span(span):
    """行内代码可能是一条命令：`bash scripts/x.sh --json`。逐词拆，只留像路径的。"""
    out = []
    for piece in span.split():
        piece = piece.strip('`"\'')
        if not looks_like_path(piece):
            continue
        # 去掉紧跟的标点
        piece = piece.rstrip('.,;:)]}')
        if piece:
            out.append(piece)
    return out


HTML_COMMENT_RE = re.compile(r'<!--.*?-->', re.S)
CSS_COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)


def collect_tokens(path, text):
    """返回 [(行号, 原始引用, 是否 markdown 链接)]"""
    out = []
    # HTML 注释里的路径是「来源标注」（例如内联 CSS 的出处），不是运行时链接
    text = HTML_COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)
    # 内联 CSS/JS 的来源标注（/* inlined: assets/base.css */）同样是注释，不是活链接
    text = CSS_COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)
    for i, line in enumerate(text.split('\n'), 1):
        for m in MD_LINK_RE.finditer(line):
            out.append((i, m.group(1), True))
        for m in CODE_SPAN_RE.finditer(line):
            for piece in tokens_in_span(m.group(1)):
                out.append((i, piece, False))
        for m in BARE_PATH_RE.finditer(line):
            out.append((i, m.group(1), False))
    return out


def ancestors(start_dir, root):
    """从文件所在目录逐级上溯到仓根——切片内的文档常引用「切片根」下的相对路径。"""
    d = os.path.abspath(start_dir)
    root = os.path.abspath(root)
    while True:
        yield d
        if d == root or os.path.dirname(d) == d:
            return
        d = os.path.dirname(d)


def resolve(ref, src_path, root, entries):
    """返回 (kind, resolved_abs_path, anchor, lineno)；kind: 'ok' | 'miss' | 'skip'"""
    ref = ref.strip()
    if not ref:
        return ('skip', None, None, None)
    anchor = None
    if '#' in ref:
        ref, anchor = ref.split('#', 1)
    lineno = None
    if ':' in ref:
        head, tail = ref.rsplit(':', 1)
        # path:123 或 path:123-456（行号区间）
        if head and re.fullmatch(r'\d+(-\d+)?', tail):
            ref, lineno = head, tail
    if not ref:
        # 纯锚点（指向本文件内的标题）
        return ('skip', None, None, None)
    if ref.startswith('/'):
        return ('skip', None, None, None)

    if ref.startswith('./') or ref.startswith('../'):
        # 按「文件在仓内的相对路径」上溯，而不是文件系统绝对路径——
        # 否则同一份内容在 CI（浅 checkout）与本地 worktree（深 checkout）会得出相反结论。
        rel_src = os.path.relpath(src_path, root)
        cand_rel = os.path.normpath(os.path.join(os.path.dirname(rel_src), ref))
        if cand_rel.startswith('..' + os.sep) or cand_rel == '..':
            return ('out', None, anchor, lineno)   # 越出仓根 → 不可达
        return ('ok', os.path.join(root, cand_rel), anchor, lineno)

    # wt/<slice>/… 是工作树内路径：工作树活着就按它解析；否则视为「仓库内已合并后的对应文件」，
    # 交由上层给替换建议。
    if ref.startswith('wt/') or ref.startswith('.cindy-worktrees/'):
        parts = ref.split('/', 2)
        base = os.path.join(root, parts[0], parts[1])
        rest = parts[2] if len(parts) > 2 else ''
        if os.path.isdir(base):
            cand = os.path.normpath(os.path.join(base, rest)) if rest else base
            return ('ok', cand, anchor, lineno)
        return ('wt', rest, anchor, lineno)

    first = ref.split('/')[0]
    if first in entries:
        # 仓根相对；但切片文档也常写「切片根」相对路径 → 先按文件目录的祖先链找
        for base in ancestors(os.path.dirname(src_path), root):
            cand = os.path.normpath(os.path.join(base, ref))
            if os.path.exists(cand):
                return ('ok', cand, anchor, lineno)
        return ('ok', os.path.normpath(os.path.join(root, ref)), anchor, lineno)

    # 裸文件名（带已知扩展名）：同级目录 → 祖先链 → 仓内唯一同名文件。
    # 都找不到就跳过——裸名大量出现在「待创建的模板」语境里，报出来全是噪声。
    if '/' not in ref:
        if not EXT_RE.search(ref):
            return ('skip', None, None, None)
        for base in list(ancestors(os.path.dirname(src_path), root)) + [root]:
            cand = os.path.normpath(os.path.join(base, ref))
            if os.path.exists(cand):
                return ('ok', cand, anchor, lineno)
        hits = [q for q in index_files(root) if os.path.basename(q) == ref]
        if len(hits) == 1:
            return ('ok', os.path.join(root, hits[0]), anchor, lineno)
        return ('skip', None, None, None)

    # 首段不是仓根条目：可能是拼错（最常见的死链形态），也可能是外部仓路径。
    # 拼错 → 报；外部仓 → 跳过，但前提是登记在 .refcheck-ignore。
    close = None
    if EXT_RE.search(ref):
        # 只对「像文件」的 token 做拼写检测：分支名形态（feat/x、workbuddy/x）不是路径
        close = [c for c in difflib.get_close_matches(first, sorted(entries), n=2, cutoff=0.72)
                 if abs(len(c) - len(first)) <= 2][:1]
    if close:
        return ('typo', close[0], anchor, lineno)
    return ('skip', None, None, None)


SKIP_MARKER = 'refcheck:skip-file'


def check_file(path, root, entries, pats, out, index=None):
    try:
        text = open(path, encoding='utf-8', errors='replace').read()
    except OSError as e:
        out.append({'file': path, 'line': 0, 'ref': '', 'reason': '无法读取: %s' % e})
        return
    # 显式声明「本文件有意引用尚不存在的物料」的，整文件跳过
    if SKIP_MARKER in text:
        return
    seen = set()
    for lineno, raw, is_link in collect_tokens(path, text):
        tok = clean_token(raw)
        if not tok:
            continue
        key = (lineno, tok)
        if key in seen:
            continue
        seen.add(key)
        kind, resolved, anchor, refline = resolve(tok, path, root, entries)
        if kind == 'skip':
            continue
        # ignore 在 resolve 之后判定：这样 wt/ 的既有例外能被登记豁免，
        # 而「拼错首段」这类问题仍会被报出来。
        if ignored(tok, pats):
            continue
        if kind == 'out':
            out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                        'line': lineno, 'ref': tok,
                        'reason': '相对路径越出仓根（层级写多了 ..）'})
            continue
        if kind == 'typo':
            out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                        'line': lineno, 'ref': tok,
                        'reason': '首段疑似拼错：%s → 仓根里是 %s' % (tok.split('/')[0], resolved)})
            continue
        if kind == 'wt':
            # 工作树已不在：给「仓库内同名文件」的替换建议
            sug = suggest_repo_file(resolved, index) if index else []
            reason = '工作树路径已不存在'
            fix = auto_fix(tok, root, index) if index else None
            if fix:
                reason += '；建议替换为：%s' % fix
            elif len(sug) == 1:
                reason += '；仓内疑似对应：%s' % sug[0]
            elif len(sug) > 1:
                reason += '；仓内同名候选：%s' % '、'.join(sug[:3])
            out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                        'line': lineno, 'ref': tok, 'reason': reason,
                        'fix': fix})
            continue
        if not os.path.exists(resolved):
            out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                        'line': lineno, 'ref': tok,
                        'reason': '路径不存在: %s' % (os.path.relpath(resolved, root)
                                                     if resolved.startswith(root) else resolved)})
            continue
        if refline is not None:
            try:
                n = sum(1 for _ in open(resolved, encoding='utf-8', errors='replace'))
            except OSError:
                n = 0
            last = int(str(refline).split('-')[-1])
            if last > n:
                out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                            'line': lineno, 'ref': tok,
                            'reason': '行号 %s 超出文件行数 %d' % (refline, n)})
            continue
        if anchor and resolved.lower().endswith(('.md', '.markdown')):
            slugs = headings_of(resolved)
            if slugs and anchor.lower() not in slugs:
                out.append({'file': os.path.relpath(path, root).replace(os.sep, '/'),
                            'line': lineno, 'ref': tok,
                            'reason': '锚点 #%s 在目标文件里不存在' % anchor})


def index_files(root):
    """仓内所有跟踪文件（相对路径），用于裸文件名的唯一同名查找。"""
    try:
        out = subprocess.run(['git', '-C', root, '-c', 'core.quotepath=false', 'ls-files'],
                             capture_output=True, text=True, timeout=120).stdout
    except Exception:
        return []
    return [l.strip() for l in out.splitlines() if l.strip()]


def suggest_repo_file(rest, index):
    """在仓内找路径以 rest 结尾的文件（工作树路径消失后的对应物）。"""
    if not rest:
        return []
    hits = [p for p in index if p.endswith('/' + rest) or p == rest]
    return sorted(hits)[:5]


def auto_fix(ref, root, index):
    """给出可自动套用的替换。

    wt/<slice>/<rest>  →  仓内 <rest>（唯一命中时才敢换）
    返回 None 表示没有把握、需人工判断。
    """
    if not ref.startswith(('wt/', '.cindy-worktrees/')):
        return None
    parts = ref.split('/', 2)
    rest = parts[2] if len(parts) > 2 else ''
    if not rest:
        return None
    cand = os.path.normpath(os.path.join(root, rest))
    if os.path.exists(cand):
        return rest
    hits = suggest_repo_file(rest, index)
    if len(hits) == 1:
        return hits[0]
    return None


def files_from_pr(pr, root):
    """取 PR diff 触及的文件。gh 不可用/失败必须响亮失败——静默返回空列表会让闸门变成永真。"""
    try:
        r = subprocess.run(['gh', 'pr', 'diff', str(pr), '--name-only'],
                           capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        sys.stderr.write('check-refs: 找不到 gh，无法取 PR #%s 的文件列表\n' % pr)
        sys.exit(2)
    except Exception as e:
        sys.stderr.write('check-refs: 取 PR #%s 文件列表失败: %s\n' % (pr, e))
        sys.exit(2)
    if r.returncode != 0:
        sys.stderr.write('check-refs: gh pr diff #%s 失败: %s\n' % (pr, r.stderr.strip()[:200]))
        sys.exit(2)
    return [l.strip() for l in r.stdout.split('\n') if l.strip()]


def tracked_files(root):
    try:
        out = subprocess.run(['git', '-C', root, '-c', 'core.quotepath=false',
                              'ls-files', '*.md', '*.markdown', '*.html'],
                             capture_output=True, text=True, timeout=120).stdout
    except Exception:
        return []
    return [l.strip() for l in out.split('\n') if l.strip()]


def main():
    ap = argparse.ArgumentParser(description='文档引用可达性检查')
    ap.add_argument('files', nargs='*', help='要检查的文件（不给则按 --all / --pr）')
    ap.add_argument('--all', action='store_true', help='扫全仓')
    ap.add_argument('--pr', help='只扫该 PR diff 触及的文件')
    ap.add_argument('--json', action='store_true', help='JSON 输出')
    ap.add_argument('--fix', action='store_true',
                    help='自动套用有把握的替换（如 wt/ 前缀 → 仓内路径）')
    ap.add_argument('--root', help='显式指定仓根（默认从脚本位置向上找）')
    ap.add_argument('--dir', action='store_true',
                    help='按目录树扫描（配合 --root，用于校验一份模板/技能自身的引用）')
    args = ap.parse_args()

    root = repo_root(os.path.dirname(os.path.abspath(__file__)), args.root)
    entries = root_entries(root)
    pats = load_ignore(root)

    if args.dir:
        targets = []
        for base, dirs, names in os.walk(root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and d != '.git']
            for n in names:
                targets.append(os.path.join(base, n))
    elif args.pr:
        targets = files_from_pr(args.pr, root)
    elif args.files:
        targets = args.files
    else:
        targets = tracked_files(root)
    targets = [os.path.join(root, t) if not os.path.isabs(t) else t for t in targets]
    targets = [t for t in targets if os.path.isfile(t)]
    # 只查文本类文档：二进制（mp4/png/glb…）里的「路径」是解码噪声
    targets = [t for t in targets if TEXT_EXT_RE.search(t)]

    problems = []
    index = tracked_files(root) if args.pr else tracked_files(root)
    for t in targets:
        check_file(t, root, entries, pats, problems, index=index)

    if args.fix:
        by_file = {}
        for p in problems:
            if p.get('fix'):
                by_file.setdefault(p['file'], set()).add((p['ref'], p['fix']))
        for f, pairs in sorted(by_file.items()):
            path = os.path.normpath(os.path.join(root, f))
            if not path.startswith(os.path.abspath(root) + os.sep):
                print('  跳过（越出仓根）: %s' % f)
                continue
            try:
                text = open(path, encoding='utf-8').read()
            except OSError:
                continue
            n = 0
            for old, new in sorted(pairs, key=lambda x: -len(x[0])):
                c = text.count(old)
                if c:
                    text = text.replace(old, new)
                    n += c
            if n:
                open(path, 'w', encoding='utf-8', newline='').write(text)
                print('已修正 %s：%d 处引用' % (f, n))

    if args.json:
        print(json.dumps({'checked': len(targets), 'problems': problems},
                         ensure_ascii=False, indent=2))
    else:
        print('check-refs: 扫描 %d 个文件，%d 处不可达引用' % (len(targets), len(problems)))
        for p in problems:
            print('  %s:%s  %s' % (p['file'], p['line'] or '-', p['reason']))
            print('      引用: %s' % p['ref'])
        if problems:
            print('  修法：改引用路径，或把确认属于外部仓的路径写进 %s' % IGNORE_FILE)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
