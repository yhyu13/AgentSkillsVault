#!/usr/bin/env python
"""
sb_deckio.py
Small, dependency-free helpers for reading and rewriting the JS constants a
storyboard deck exposes to the Python tooling (deck conventions):

    const TIMINGS = [{ time: 0.0, slide: 1 }, ...];
    const WORDS   = [{"text":"Hello","start":0.12,"end":0.48}, ...];
    Storyboard.init({ timings: TIMINGS, ..., words: WORDS, ... });

Public API (all functions take / return the deck HTML as a str):

    read_timings(html)              -> [{'time': float, 'slide': int}, ...] or None
    write_timings(html, timings)    -> html   (replace, or insert before the
                                               Storyboard.init call + add
                                               `timings: TIMINGS` to its opts)
    read_words(html)                -> [{'text','start','end'}, ...] or None
    write_words(html, words)        -> html   (replace, or insert
                                               `const WORDS = [...]` before the
                                               init call + add `words: WORDS`)
    count_slides(html)              -> int    (elements whose class list has
                                               the token `slide`; 0 = unknown)
    read_audio_src(html) / write_audio_src(html, src)
    format_timings(timings)         -> 'const TIMINGS = [...];' JS text
    apply_to_deck(path, timings=None, words=None, audio_src=None, backup=True)
                                    -> report dict (backs the deck up first to
                                       the first free <deck>.bak / .bak2 ...,
                                       never overwriting one; warns when
                                       len(timings) != slide count)
    backup_target(path)             -> (backup path, already_there)

The write_* functions accept an optional `notes` list; soft problems (e.g.
"no Storyboard.init() call found, WORDS inserted but not wired") are appended
to it. Hard failures raise DeckIOError.

Parsing is done on a masked copy of the HTML in which comments, string
literals (template literals too, `${...}` nesting included) and non-script
regions are blanked out (same length), so brackets inside strings (a word
like "[laughs]"), commented-out TIMINGS, or a code sample on a slide never
confuse the rewrite. Before a missing const is inserted, the script text is
also checked with only comments removed: a `const NAME` that shows up there
(inside a string, or code the masker misread), or an undeclared `NAME = ...`
assignment, raises DeckIOError instead of risking a duplicate declaration.
A rewritten array keeps its statement shape (`const TIMINGS = [...], X = 1;`
stays a comma list). Line endings (LF / CRLF) and a UTF-8 BOM are preserved.

Scope-aware: the TIMINGS / WORDS read and rewritten are the ones the deck's
Storyboard.init call can see (top level, or a block enclosing the call). A
deck that inlines the engine in a <script> keeps the engine's function-local
`let TIMINGS=[], ..., WORDS=[]` untouched, and those locals don't block
inserting the deck's own `const WORDS`.

CLI (inspection only):  python sb_deckio.py storyboard.html
"""
import json
import re
import shutil
import sys
from pathlib import Path

__all__ = [
    'DeckIOError', 'read_timings', 'write_timings', 'read_words', 'write_words',
    'count_slides', 'read_audio_src', 'write_audio_src', 'format_timings',
    'format_words', 'apply_to_deck', 'backup_target', 'find_init_call',
]


class DeckIOError(Exception):
    """The deck can't be rewritten (e.g. no TIMINGS and no Storyboard.init call)."""


# --------------------------------------------------------------------------
# Masking: produce same-length "views" of the document so regexes and bracket
# matching can run without tripping over comments / strings / markup.
# --------------------------------------------------------------------------

_REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
_REGEX_KEYWORDS = ('return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new',
                   'delete', 'void', 'throw', 'yield', 'await')


def _blank(chars, start, end):
    """Blank chars[start:end] with spaces, keeping line breaks."""
    for i in range(start, end):
        if chars[i] not in '\r\n':
            chars[i] = ' '


def _mask_js(src, keep_literals=False):
    """Return `src` with JS comments blanked and string/template/regex literal
    *contents* blanked (the delimiters stay). Same length as `src`.

    Template literals nest: in `a${ xs.map(x => `<li>${x}</li>`) }b` the whole
    outer literal -- text, `${...}` substitutions and the inner template -- is
    its contents, so the scanner tracks `${` / `}` depth per open template.
    keep_literals=True blanks comments only (string / template / regex text
    stays): a second opinion for "is NAME declared anywhere?" checks."""
    out = list(src)
    i, n = 0, len(src)
    last_sig = ''          # last significant (non-space) char outside literals
    last_word = ''
    tmpl = []              # open template literals, innermost last: the `{` depth
    #                        inside its current `${...}`, or -1 while in its text
    tmpl_open = 0          # index of the outermost open template's backtick
    while i < n:
        c = src[i]
        if tmpl and tmpl[-1] < 0:              # template text
            if c == '\\':
                i += 2
                continue
            if c == '`':
                tmpl.pop()
                i += 1
                if not tmpl and not keep_literals:
                    _blank(out, tmpl_open + 1, i - 1)
                last_sig, last_word = '`', ''
                continue
            if c == '$' and i + 1 < n and src[i + 1] == '{':
                tmpl[-1] = 0
                i += 2
                last_sig, last_word = '{', ''
                continue
            i += 1
            continue
        nxt = src[i + 1] if i + 1 < n else ''
        if c == '`':
            if not tmpl:
                tmpl_open = i
            tmpl.append(-1)
            i += 1
            continue
        if tmpl and c in '{}':                 # code inside a `${...}` substitution
            if c == '{':
                tmpl[-1] += 1
            elif tmpl[-1] == 0:                # `}` closing the substitution
                tmpl[-1] = -1
                i += 1
                continue
            else:
                tmpl[-1] -= 1
        if c == '/' and nxt == '/':
            j = i
            while j < n and src[j] not in '\r\n':
                j += 1
            _blank(out, i, j)
            i = j
            continue
        if c == '/' and nxt == '*':
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            _blank(out, i, j)
            i = j
            continue
        if c in '\'"':
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == c:
                    break
                if src[j] in '\r\n':             # unterminated string
                    break
                j += 1
            j = min(j, n)
            if not keep_literals:
                _blank(out, i + 1, j)
            i = j + 1
            last_sig, last_word = c, ''
            continue
        if c == '/' and (last_sig == '' or last_sig in _REGEX_PREV or last_word in _REGEX_KEYWORDS):
            # regex literal
            j, in_class = i + 1, False
            while j < n and src[j] not in '\r\n':
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '[':
                    in_class = True
                elif src[j] == ']':
                    in_class = False
                elif src[j] == '/' and not in_class:
                    break
                j += 1
            j = min(j, n)
            if not keep_literals:
                _blank(out, i + 1, j)
            i = j + 1
            last_sig, last_word = '/', ''
            continue
        if not c.isspace():
            if c.isalnum() or c in '_$':
                j = i
                while j < n and (src[j].isalnum() or src[j] in '_$'):
                    j += 1
                last_word = src[i:j]
                last_sig = src[j - 1]
                i = j
                continue
            last_sig, last_word = c, ''
        i += 1
    if tmpl and not keep_literals:             # unterminated template: runs to the end
        _blank(out, tmpl_open + 1, n)
    return ''.join(out)


_REGION_RE = re.compile(r'<!--|<script\b[^>]*>|<style\b[^>]*>', re.IGNORECASE)


def _regions(html):
    """Yield (kind, start, end, content_start, content_end) for HTML comments,
    <script> and <style> elements, scanning in document order (so a <script>
    inside an HTML comment is part of the comment, and `<!--` inside a script
    is just script text)."""
    i = 0
    while True:
        m = _REGION_RE.search(html, i)
        if not m:
            return
        tok = m.group(0)
        if tok == '<!--':
            e = html.find('-->', m.end())
            e = len(html) if e < 0 else e + 3
            yield 'comment', m.start(), e, m.start(), e
        else:
            kind = 'script' if tok[1:7].lower() == 'script' else 'style'
            close = re.compile(r'</' + kind + r'\s*>', re.IGNORECASE).search(html, m.end())
            ce = close.start() if close else len(html)
            e = close.end() if close else len(html)
            yield kind, m.start(), e, m.end(), ce
        i = e


def _js_view(html, keep_literals=False):
    """Only inline <script> contents survive (masked); everything else blank."""
    out = list(html)
    _blank(out, 0, len(html))
    for kind, _, _, cs, ce in _regions(html):
        if kind == 'script':
            out[cs:ce] = _mask_js(html[cs:ce], keep_literals)
    return ''.join(out)


def _html_view(html):
    """Markup only: comments, <script> and <style> contents blanked."""
    out = list(html)
    for kind, s, e, cs, ce in _regions(html):
        if kind == 'comment':
            _blank(out, s, e)
        else:
            _blank(out, cs, ce)
    return ''.join(out)


_OPEN = {'[': ']', '{': '}', '(': ')'}


def _match_bracket(view, pos):
    """Index of the bracket closing view[pos] (view is masked). -1 if none."""
    stack = []
    for i in range(pos, len(view)):
        c = view[i]
        if c in _OPEN:
            stack.append(_OPEN[c])
        elif c in ')]}':
            if not stack or stack.pop() != c:
                return -1
            if not stack:
                return i
    return -1


def _newline(html):
    return '\r\n' if '\r\n' in html else '\n'


def _line_start(text, pos):
    return text.rfind('\n', 0, pos) + 1


def _indent_at(text, pos):
    ls = _line_start(text, pos)
    m = re.match(r'[ \t]*', text[ls:])
    return m.group(0)


# --------------------------------------------------------------------------
# Scopes: which `{...}` block a declaration lives in, so a deck that inlines
# the engine (whose function-scoped `let TIMINGS=[], ..., WORDS=[]` comes
# first) still has ITS OWN top-level consts read and rewritten.
# --------------------------------------------------------------------------

_NON_FUNCTION_HEADS = ('if', 'for', 'while', 'switch', 'catch', 'with')


def _script_start(html, pos):
    """Content start of the inline <script> holding html[pos] (0 if none)."""
    for kind, _, _, cs, ce in _regions(html):
        if cs > pos:
            break
        if kind == 'script' and cs <= pos < ce:
            return cs
    return 0


def _enclosing_blocks(view, pos, start):
    """Open-brace indices of the `{...}` blocks around view[pos], outermost
    first (view is masked; scanned from `start`, the script's first char)."""
    stack = []
    for m in re.finditer(r'[{}]', view[start:pos]):
        if m.group(0) == '{':
            stack.append(start + m.start())
        elif stack:
            stack.pop()
    return stack


def _is_function_body(view, o):
    """Is the `{` at view[o] a function body (`=> {`, `function f(...) {`,
    a method `m(...) {`) rather than an if/for/while/switch/catch block?"""
    k = o - 1
    while k >= 0 and view[k].isspace():
        k -= 1
    if k >= 1 and view[k - 1:k + 1] == '=>':
        return True
    if k < 0 or view[k] != ')':
        return False
    depth = 0
    while k >= 0:                                   # back to the matching `(`
        if view[k] in ')]}':
            depth += 1
        elif view[k] in '([{':
            depth -= 1
            if depth == 0:
                break
        k -= 1
    m = re.search(r'([\w$]+)\s*$', view[max(0, k - 64):max(k, 0)])
    return not (m and m.group(1) in _NON_FUNCTION_HEADS)


def _contains(view, o, pos):
    """Does the block opened at view[o] contain pos? (unbalanced: assume yes)"""
    c = _match_bracket(view, o)
    return c < 0 or o < pos <= c


def _decl_scope(html, view, pos, keyword):
    """Open-brace index of the block a declaration at pos is scoped to: the
    innermost block for let/const, the innermost function body for var.
    None = the top level of a <script> (global, shared by all classic scripts)."""
    blocks = _enclosing_blocks(view, pos, _script_start(html, pos))
    if keyword == 'var':
        blocks = [o for o in blocks if _is_function_body(view, o)]
    return blocks[-1] if blocks else None


def _init_anchor(html, view):
    """Start of the Storyboard.init(...) call, or None."""
    try:
        info = find_init_call(html, view)
    except DeckIOError:
        return None
    return info['start'] if info else None


def _pick_visible(html, view, matches, anchor):
    """The declaration match the deck's own code uses. With an init call
    (anchor): one whose scope holds it (innermost wins -- it shadows outer
    ones), or None when none can be seen from it -- a function-local
    `let TIMINGS=[]` in an inlined engine is not the deck's TIMINGS. Without
    one: a top-level declaration, else the first."""
    scoped = [(m, _decl_scope(html, view, m.start(), m.group(1))) for m in matches]
    if anchor is not None:
        vis = [(m, s) for m, s in scoped if s is None or _contains(view, s, anchor)]
        if not vis:
            return None
        return max(vis, key=lambda ms: (-1 if ms[1] is None else ms[1], -ms[0].start()))[0]
    top = [m for m, s in scoped if s is None]
    return top[0] if top else matches[0]


# --------------------------------------------------------------------------
# const NAME = [...];  location
# --------------------------------------------------------------------------

def _find_const_array(html, name, view=None):
    """Locate `const|let|var NAME = [ ... ];` -- the declaration the deck's
    Storyboard.init call can see (see _pick_visible); a function-local one it
    can't see (an inlined engine's internals) doesn't count.
    Returns (stmt_start, arr_start, arr_end_inclusive, stmt_end, keyword) or None."""
    view = _js_view(html) if view is None else view
    rx = re.compile(r'(?<![\w$.])(const|let|var)\s+' + re.escape(name) + r'\s*=\s*\[')
    matches = list(rx.finditer(view))
    if not matches:
        return None
    m = matches[0]
    if len(matches) > 1 or _decl_scope(html, view, m.start(), m.group(1)) is not None:
        m = _pick_visible(html, view, matches, _init_anchor(html, view))
        if m is None:
            return None
    arr_start = m.end() - 1
    arr_end = _match_bracket(view, arr_start)
    if arr_end < 0:
        raise DeckIOError(f'Unbalanced brackets in `{m.group(1)} {name} = [` array')
    stmt_end = arr_end + 1
    k = stmt_end
    while k < len(view) and view[k] in ' \t':
        k += 1
    if k < len(view) and view[k] == ';':
        stmt_end = k + 1
    return m.start(), arr_start, arr_end, stmt_end, m.group(1)


def _keep_terminator(block, view, stmt_end):
    """format_*() blocks end in `];`. Keep the original statement's shape: when
    the array wasn't followed by `;` (`const TIMINGS = [...], LABELS = [...];`
    or an ASI-style deck) the new text ends in `]` and the rest stays as is."""
    return block if view[stmt_end - 1] == ';' else block[:-1]


def _declares(view, o, name):
    """Does the block opened at view[o] declare `name` (let/const/var, comma lists too)?"""
    c = _match_bracket(view, o)
    body = view[o:c + 1 if c >= 0 else len(view)]
    return bool(re.search(r'(?<![\w$.])(?:let|const|var)\s+(?:[^;{}()]*?,\s*)?' + re.escape(name)
                          + r'(?![\w$])\s*(?:[=,;]|$)', body, re.MULTILINE))


def _private(html, view, pos, anchor, name, keyword=None):
    """True when the match at pos lives in a scope the insertion point (anchor)
    can't see -- e.g. an inlined engine's function-local `let ..., WORDS=[]` or
    its `WORDS = opts.words` -- so a new const next to the init call can't clash."""
    if anchor is None:
        return False
    if keyword in ('const', 'let', 'var'):
        s = _decl_scope(html, view, pos, keyword)
        return s is not None and not _contains(view, s, anchor)
    # an assignment is local when an enclosing block / function the anchor is not in declares NAME
    for o in _enclosing_blocks(view, pos, _script_start(html, pos)):
        if not _contains(view, o, anchor) and _declares(view, o, name):
            return True
    return False


def _check_not_declared(html, view, name, anchor=None):
    """Raise unless it is safe to insert a new `const NAME` -- a second
    declaration (or a const shadowing an assignment) is a SyntaxError /
    TypeError that kills the whole deck, so any doubt means refuse.
    `anchor` is where the new const goes (the init call): declarations and
    assignments in function / block scopes that don't hold it are ignored."""
    decl = re.compile(r'(?<![\w$.])(const|let|var)\s+' + re.escape(name) + r'(?![\w$])')
    for m in decl.finditer(view):
        if not _private(html, view, m.start(), anchor, name, m.group(1)):
            raise DeckIOError(f'`{name}` is declared but not as an array literal '
                              f'(`{m.group(1)} {name} = [...]`); rewrite it by hand.')
    for m in re.finditer(r'(?<![\w$.])' + re.escape(name) + r'\s*=(?![=>])', view):
        if re.search(r'(?<![\w$.])(?:const|let|var)\s+$', view[max(0, m.start() - 16):m.start()]):
            continue                                      # `let NAME = ...`: judged as a declaration above
        if not _private(html, view, m.start(), anchor, name):
            raise DeckIOError(f'`{name}` is assigned on line {html.count(chr(10), 0, m.start()) + 1} '
                              f'but not declared as `const {name} = [...]` (e.g. `const X = 1, {name} = [...]`); '
                              f'rewrite it by hand.')
    # Second opinion on the script text with only comments removed: a match here
    # sits in a string / template literal, or in code the masker misread.
    for m in decl.finditer(_js_view(html, keep_literals=True)):
        if not _private(html, view, m.start(), anchor, name, m.group(1)):
            raise DeckIOError(f'Found `{m.group(1)} {name}` on line {html.count(chr(10), 0, m.start()) + 1} '
                              f'inside a string or template literal (or in script code this tool could not '
                              f'parse); refusing to add a second `{name}` declaration -- edit the deck by hand.')


_INIT_RE = re.compile(r'(?<![\w$])(?:window\s*\.\s*)?(?:Storyboard|STORYBOARD)\s*\.\s*init\s*\(')


def find_init_call(html, view=None):
    """Locate the (last) `Storyboard.init(...)` / `STORYBOARD.init(...)` call.
    Returns dict {start, paren_open, paren_close, opts_open, opts_close} (opts_*
    are None when the first argument isn't an object literal) or None."""
    view = _js_view(html) if view is None else view
    matches = list(_INIT_RE.finditer(view))
    if not matches:
        return None
    m = matches[-1]
    p_open = m.end() - 1
    p_close = _match_bracket(view, p_open)
    if p_close < 0:
        raise DeckIOError('Unbalanced parentheses in Storyboard.init(...) call')
    info = {'start': m.start(), 'paren_open': p_open, 'paren_close': p_close,
            'opts_open': None, 'opts_close': None}
    k = p_open + 1
    while k < p_close and view[k].isspace():
        k += 1
    if view[k] == '{':
        info['opts_open'] = k
        info['opts_close'] = _match_bracket(view, k)
    return info


def _top_level_props(html, view, o_open, o_close):
    """{name: value_text} for the depth-1 properties of the object literal
    spanning view[o_open..o_close]. Spreads / computed keys / methods are skipped;
    a shorthand property `{ WORDS }` maps to its own name."""
    segs, depth, seg_start = [], 0, o_open + 1
    for i in range(o_open + 1, o_close):
        c = view[i]
        if c in '[{(':
            depth += 1
        elif c in ']})':
            depth -= 1
        elif c == ',' and depth == 0:
            segs.append((seg_start, i))
            seg_start = i + 1
    segs.append((seg_start, o_close))
    props = {}
    for s, e in segs:
        seg = view[s:e]
        if not seg.strip():
            continue
        k0 = s + (len(seg) - len(seg.lstrip()))
        if view[k0] in '\'"':
            k1 = view.find(view[k0], k0 + 1)
            if k1 < 0 or k1 >= e:
                continue
            name, after = html[k0 + 1:k1], k1 + 1
        else:
            m = re.match(r'[A-Za-z_$][\w$]*', view[k0:e])
            if not m:
                continue
            name, after = m.group(0), k0 + m.end()
        rest = view[after:e].strip()
        if rest.startswith(':'):
            props[name] = rest[1:].strip()
        elif rest == '':
            props[name] = name
    return props


def _add_opt(html, view, info, key, value):
    """Insert `key: value` into the init call's object-literal opts."""
    o_open, o_close = info['opts_open'], info['opts_close']
    p = o_close - 1
    while p > o_open and view[p].isspace():
        p -= 1
    nl = _newline(html)
    if p == o_open:                                   # {}  -> { key: value }
        ins, at = f' {key}: {value} ', o_open + 1
        return html[:at] + ins + html[o_close:]
    trailing_comma = view[p] == ','
    comma = '' if trailing_comma else ','
    if '\n' in html[p:o_close]:                       # `}` on its own line: one prop per line
        # new line after the last property's line -- past a trailing `// comment`,
        # so the comment stays with the property it annotates
        indent = _indent_at(html, p)
        le = html.find('\n', p)
        at = p + 1
        if 0 <= le < o_close:
            le -= 1 if html[le - 1] == '\r' else 0
            tail = html[p + 1:le]
            if not tail.strip() or tail.lstrip().startswith('//'):
                at = le
        ins = nl + indent + f'{key}: {value}' + (',' if trailing_comma else '')
        return html[:p + 1] + comma + html[p + 1:at] + ins + html[at:]
    ins = f' {key}: {value}' if trailing_comma else f', {key}: {value}'
    return html[:p + 1] + ins + html[p + 1:]


def _wire_init(html, key, const_name, notes):
    """Make sure Storyboard.init opts reference `key: CONST_NAME`."""
    view = _js_view(html)
    info = find_init_call(html, view)
    if info is None:
        _note(notes, f'No Storyboard.init() call found; `{const_name}` is declared but not '
                     f'passed as `{key}:` (legacy inline-engine deck?).')
        return html
    if info['opts_open'] is None:
        if view[info['paren_open'] + 1:info['paren_close']].strip() == '':
            at = info['paren_open'] + 1
            return html[:at] + '{ ' + f'{key}: {const_name}' + ' }' + html[at:]
        _note(notes, f'Storyboard.init() is called with a non-literal argument; add '
                     f'`{key}: {const_name}` to its options by hand.')
        return html
    props = _top_level_props(html, view, info['opts_open'], info['opts_close'])
    if key in props:
        if props[key] != const_name:
            _note(notes, f'Storyboard.init() already passes `{key}: {props[key]}`; left it as is '
                         f'(the rewritten `{const_name}` const is not what init uses).')
        return html
    return _add_opt(html, view, info, key, const_name)


def _note(notes, msg):
    if notes is not None:
        notes.append(msg)


def _at_statement_boundary(before):
    """Can a new statement go right after `before` (masked JS)? No when the next
    line continues an expression (`x ||`, `=>`) or is the body of a braceless
    `if (...)` / `else` / `do`."""
    tail = before.rstrip()
    prev = tail[-1:]
    if prev in ('', ';', '{', '}', ']', '"', "'", '`'):
        return True
    m = re.search(r'[\w$]+$', tail)
    return bool(m) and m.group(0) not in ('else', 'do', 'return', 'throw', 'yield', 'await',
                                          'typeof', 'void', 'delete', 'new', 'in', 'of', 'case')


def _insert_statement_before_init(html, stmt_lines, notes, after_names=()):
    """Insert a statement on its own line(s) before the init call's line; if
    there is no init call, after the first existing const in `after_names`."""
    nl = _newline(html)
    view = _js_view(html)
    info = find_init_call(html, view)
    if info is not None:
        cs = next((r[3] for r in _regions(html)
                   if r[0] == 'script' and r[3] <= info['start'] < r[4]), None)
        ls = _line_start(html, info['start'])
        before = view[cs if cs is not None and cs < ls else ls:ls]
        if html[ls:info['start']].strip() == '' and (cs is None or ls > cs) and _at_statement_boundary(before):
            # init call starts its own statement line: insert above it, same indentation
            indent = _indent_at(html, info['start'])
            text = nl.join(indent + ln if ln else ln for ln in stmt_lines) + nl
            return html[:ls] + text + html[ls:]
        # init call shares its line with other code (`() => Storyboard.init(...)`,
        # `<script>Storyboard.init(...)`) or continues one (`x ||\n Storyboard.init(...)`,
        # `if (ok)\n Storyboard.init(...)`): declare at the top of its <script>.
        if cs is not None:
            text = nl + nl.join(stmt_lines) + nl
            return html[:cs] + text + html[cs:]
    for name in after_names:
        loc = _find_const_array(html, name, view)
        if loc:
            indent = _indent_at(html, loc[0])
            text = nl + nl.join(indent + ln if ln else ln for ln in stmt_lines)
            return html[:loc[3]] + text + html[loc[3]:]
    raise DeckIOError('Deck has no Storyboard.init(...) call and no TIMINGS const to anchor on.')


# --------------------------------------------------------------------------
# TIMINGS
# --------------------------------------------------------------------------

_NUM = r'(-?\d+(?:\.\d*)?|-?\.\d+)'


def _obj_field(obj_text, key):
    m = re.search(r'["\']?\b' + key + r'\b["\']?\s*:\s*' + _NUM, obj_text)
    return float(m.group(1)) if m else None


def read_timings(html):
    """Parse `const TIMINGS = [...]` -> [{'time': float, 'slide': int}] (None if absent)."""
    view = _js_view(html)
    loc = _find_const_array(html, 'TIMINGS', view)
    if loc is None:
        return None
    _, a, b, _, _ = loc
    out = []
    i = a + 1
    while i < b:
        if view[i] == '{':
            j = _match_bracket(view, i)
            if j < 0:
                break
            obj = html[i:j + 1]
            t, s = _obj_field(obj, 'time'), _obj_field(obj, 'slide')
            if t is not None:
                out.append({'time': t, 'slide': int(s) if s is not None else len(out) + 1})
            i = j + 1
        else:
            i += 1
    return out


def _norm_timings(timings):
    out = []
    for i, t in enumerate(timings):
        if isinstance(t, dict):
            out.append({'time': float(t.get('time', 0.0)), 'slide': int(t.get('slide', i + 1))})
        else:
            out.append({'time': float(t), 'slide': i + 1})
    return out


def format_timings(timings, indent='', nl='\n', keyword='const'):
    """JS text for `const TIMINGS = [...];` (entries indented by indent + 2)."""
    tl = _norm_timings(timings)
    lines = [f'{keyword} TIMINGS = [']
    for i, t in enumerate(tl):
        comma = ',' if i < len(tl) - 1 else ''
        lines.append(f'{indent}  {{ time: {t["time"]:7.2f}, slide: {t["slide"]:2d} }}{comma}')
    lines.append(f'{indent}];')
    return nl.join(lines)


def write_timings(html, timings, notes=None):
    """Replace (or insert) `const TIMINGS = [...]`. Returns the new html."""
    nl = _newline(html)
    view = _js_view(html)
    loc = _find_const_array(html, 'TIMINGS', view)
    if loc:
        s, _, _, e, kw = loc
        block = _keep_terminator(format_timings(timings, _indent_at(html, s), nl, kw), view, e)
        return html[:s] + block + html[e:]
    _check_not_declared(html, view, 'TIMINGS', _init_anchor(html, view))
    block = format_timings(timings, '', '\n').split('\n')
    html = _insert_statement_before_init(html, block, notes)
    _note(notes, 'Inserted a new `const TIMINGS` (the deck had none).')
    return _wire_init(html, 'timings', 'TIMINGS', notes)


# --------------------------------------------------------------------------
# WORDS
# --------------------------------------------------------------------------

def _js_string(s):
    # JSON strings are valid JS; also keep `</script>` from closing the block.
    return json.dumps(str(s), ensure_ascii=False).replace('</', '<\\/')


def format_words(words, indent='', nl='\n', keyword='const', per_line=4):
    """JS text for `const WORDS = [...];` -- JSON-compatible objects, a few per line."""
    items = []
    for w in words:
        items.append('{"text":%s,"start":%s,"end":%s}' % (
            _js_string(w.get('text', '')), _fmt_num(w.get('start', 0.0)), _fmt_num(w.get('end', 0.0))))
    if not items:
        return f'{keyword} WORDS = [];'
    lines = [f'{keyword} WORDS = [']
    for k in range(0, len(items), per_line):
        chunk = ','.join(items[k:k + per_line])
        comma = ',' if k + per_line < len(items) else ''
        lines.append(f'{indent}  {chunk}{comma}')
    lines.append(f'{indent}];')
    return nl.join(lines)


def _fmt_num(x):
    x = round(float(x), 3)
    s = f'{x:.3f}'.rstrip('0').rstrip('.')
    return s if s not in ('', '-0') else '0'


def read_words(html):
    """Parse `const WORDS = [...]` -> [{'text','start','end'}] (None if absent)."""
    view = _js_view(html)
    loc = _find_const_array(html, 'WORDS', view)
    if loc is None:
        return None
    _, a, b, _, _ = loc
    raw = html[a:b + 1]
    try:
        data = json.loads(raw.replace('<\\/', '</'))
        return [{'text': str(w.get('text', '')), 'start': float(w.get('start', 0)),
                 'end': float(w.get('end', 0))} for w in data]
    except (ValueError, AttributeError, TypeError):
        pass
    out = []
    i = a + 1
    while i < b:
        if view[i] == '{':
            j = _match_bracket(view, i)
            if j < 0:
                break
            obj = html[i:j + 1]
            tm = re.search(r'["\']?\btext\b["\']?\s*:\s*(["\'])((?:\\.|(?!\1).)*)\1', obj)
            text = tm.group(2) if tm else ''
            if tm and tm.group(1) == '"':
                try:
                    text = json.loads('"' + text + '"')
                except ValueError:
                    pass
            out.append({'text': text, 'start': _obj_field(obj, 'start') or 0.0,
                        'end': _obj_field(obj, 'end') or 0.0})
            i = j + 1
        else:
            i += 1
    return out


def write_words(html, words, notes=None):
    """Replace (or insert) `const WORDS = [...]` and make sure the init call
    passes `words: WORDS`. Returns the new html."""
    nl = _newline(html)
    view = _js_view(html)
    loc = _find_const_array(html, 'WORDS', view)
    if loc:
        s, _, _, e, kw = loc
        block = _keep_terminator(format_words(words, _indent_at(html, s), nl, kw), view, e)
        html = html[:s] + block + html[e:]
    else:
        after = ('WORD_HITS', 'SLIDE_LABELS', 'TIMINGS')
        anchor = _init_anchor(html, view)
        if anchor is None:            # legacy deck: WORDS goes after the first of these consts
            anchor = next((loc[0] for loc in (_find_const_array(html, n, view) for n in after) if loc), None)
        _check_not_declared(html, view, 'WORDS', anchor)
        block = format_words(words, '', '\n').split('\n')
        html = _insert_statement_before_init(html, block, notes, after_names=after)
    return _wire_init(html, 'words', 'WORDS', notes)


# --------------------------------------------------------------------------
# Slides / audio
# --------------------------------------------------------------------------

_TAG_CLASS_RE = re.compile(
    r'<([a-zA-Z][\w-]*)\b[^>]*?(?<![\w-])class\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))[^>]*>', re.DOTALL)


def _slide_class_from_init(html):
    """If init opts carry a simple `slideSelector: '.name'` / 'tag.name', return (tag|None, name)."""
    view = _js_view(html)
    info = find_init_call(html, view)
    if not info or info['opts_open'] is None:
        return None
    body = html[info['opts_open']:info['opts_close'] + 1]
    m = re.search(r'slideSelector\s*:\s*([\'"])\s*([a-zA-Z][\w-]*)?\.([\w-]+)\s*\1', body)
    if not m:
        return None
    return (m.group(2).lower() if m.group(2) else None), m.group(3)


def count_slides(html, class_name=None):
    """Count elements whose class list contains the token `slide` (or the class
    of a simple `slideSelector: '.x'` passed to Storyboard.init). Comments,
    scripts and styles are ignored. Returns 0 when nothing matches."""
    tag_filter = None
    if class_name is None:
        sel = _slide_class_from_init(html)
        if sel:
            tag_filter, class_name = sel
        else:
            class_name = 'slide'
    view = _html_view(html)
    n = 0
    for m in _TAG_CLASS_RE.finditer(view):
        classes = (m.group(2) or m.group(3) or m.group(4) or '').split()
        if class_name in classes and (tag_filter is None or m.group(1).lower() == tag_filter):
            n += 1
    return n


_AUDIO_TAG_RE = re.compile(r'<audio\b[^>]*>', re.IGNORECASE | re.DOTALL)
_SRC_ATTR_RE = re.compile(r'(\ssrc\s*=\s*)(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))', re.IGNORECASE)


def _find_audio_tag(html):
    view = _html_view(html)
    tags = list(_AUDIO_TAG_RE.finditer(view))
    if not tags:
        return None
    for pred in (lambda t: re.search(r'\sid\s*=\s*["\']?voAudio\b', t),
                 lambda t: re.search(r'\sdata-storyboard-audio\b', t, re.IGNORECASE),
                 lambda t: re.search(r'\sid\s*=\s*["\']?sbVoAudio\b', t),   # adopt-mode overlay.html
                 lambda t: True):
        for m in tags:
            if pred(html[m.start():m.end()]):
                return m
    return None


def read_audio_src(html):
    """src of the deck's narration <audio> (#voAudio, [data-storyboard-audio],
    #sbVoAudio (adopt-mode overlay), else the first <audio>)."""
    m = _find_audio_tag(html)
    if not m:
        return None
    s = _SRC_ATTR_RE.search(html, m.start(), m.end())
    if not s:
        return None
    val = s.group(2) if s.group(2) is not None else (s.group(3) if s.group(3) is not None else s.group(4))
    return val.replace('&amp;', '&').replace('&quot;', '"')


def write_audio_src(html, src):
    """Set the src of the deck's narration <audio>. Raises DeckIOError if there is none."""
    m = _find_audio_tag(html)
    if not m:
        raise DeckIOError('Deck has no <audio> element.')
    val = src.replace('&', '&amp;').replace('"', '&quot;')
    s = _SRC_ATTR_RE.search(html, m.start(), m.end())
    if s:
        return html[:s.start()] + s.group(1) + '"' + val + '"' + html[s.end():]
    at = m.start() + len('<audio')
    return html[:at] + f' src="{val}"' + html[at:]


# --------------------------------------------------------------------------
# File-level convenience
# --------------------------------------------------------------------------

def _read_deck(path):
    raw = Path(path).read_bytes()
    bom = raw.startswith(b'\xef\xbb\xbf')
    return raw[3:].decode('utf-8') if bom else raw.decode('utf-8'), bom


def _write_deck(path, text, bom):
    data = text.encode('utf-8')
    Path(path).write_bytes((b'\xef\xbb\xbf' + data) if bom else data)


def backup_target(path):
    """Where to back `path` up: the first free `<file>.bak`, `.bak2`, `.bak3` ...
    An existing backup is never overwritten (applying twice must not lose the
    original deck) -- the same rule as aaf_to_timings.py / compress_anim_timings.py.
    Returns (backup_path, already_there): already_there is True when an
    existing backup holds exactly the current bytes (nothing to write)."""
    path = Path(path)
    data = path.read_bytes()
    n = 1
    while True:
        bak = path.with_name(path.name + ('.bak' if n == 1 else f'.bak{n}'))
        if not bak.exists():
            return bak, False
        try:
            if bak.is_file() and bak.read_bytes() == data:
                return bak, True
        except OSError:
            pass
        n += 1


def apply_to_deck(path, timings=None, words=None, audio_src=None, backup=True):
    """Rewrite TIMINGS / WORDS / audio src in a deck file in place.
    When backup is True the pre-edit bytes are saved first to the first free
    `<deck>.bak` / `.bak2` / ... (see backup_target; never overwritten).
    A slide-count mismatch or a missing <audio> element is a warning, not an error.
    Returns {'path', 'backup', 'slides', 'timings', 'warnings', 'notes', 'changed'}."""
    path = Path(path)
    html, bom = _read_deck(path)
    notes, warnings = [], []
    new = html
    slides = count_slides(html)
    if timings is not None:
        tl = _norm_timings(timings)
        nums = [t['slide'] for t in tl]
        if slides and len(tl) != slides:
            again = sorted({n for n in nums if nums.count(n) > 1})
            warnings.append(f'New TIMINGS has {len(tl)} cues but the deck has {slides} slides.'
                            + (f' (The cues revisit slide {", ".join(map(str, again))} -- fine if intended.)'
                               if again else ''))
        elif not slides:
            warnings.append('Could not count the slides in the deck (no class="slide" elements).')
        if slides and nums and max(nums) > slides:
            warnings.append(f'TIMINGS points at slide {max(nums)} but the deck has only {slides} slides.')
        new = write_timings(new, tl, notes)
    if words is not None:
        new = write_words(new, words, notes)
    if audio_src is not None:
        if _find_audio_tag(new) is None:
            warnings.append(f'Deck has no <audio> element; point your page at {audio_src!r} yourself.')
        else:
            new = write_audio_src(new, audio_src)
    report = {'path': str(path), 'backup': None, 'slides': slides,
              'timings': len(timings) if timings is not None else None,
              'warnings': warnings, 'notes': notes, 'changed': new != html}
    if new != html:
        if backup:
            bak, already = backup_target(path)
            if not already:
                shutil.copyfile(path, bak)
            report['backup'] = str(bak)
        _write_deck(path, new, bom)
    return report


def _main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv:
        print(__doc__)
        return 2
    for p in argv:
        html, _ = _read_deck(p)
        t = read_timings(html)
        w = read_words(html)
        print(f'{p}: slides={count_slides(html)} '
              f'timings={len(t) if t is not None else "none"} '
              f'words={len(w) if w is not None else "none"} '
              f'audio={read_audio_src(html)!r} '
              f'init={"yes" if find_init_call(html) else "no"}')
    return 0


if __name__ == '__main__':
    sys.exit(_main())
