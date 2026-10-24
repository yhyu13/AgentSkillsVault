#!/usr/bin/env python
"""
compress_anim_timings.py
Scale all data-t-rel values in a storyboard.html by a factor.

Use this when slide *content* feels late even though the slide *cues* are
right. The animations within each slide have `data-t-rel="X"` start delays
that can stack up - a scale of 0.4 makes most animations arrive within ~1s
of the slide cue, matching narration pacing closely.

Only live markup is touched: data-t-rel inside HTML comments (<!-- -->),
JS comments in <script> (// and /* */, plus the legacy <!-- / --> line
comments of classic scripts) and CSS comments in <style> is left as-is
(markup inside JS strings, e.g. innerHTML templates, is still scaled).
Markup is scanned tag by tag, so a quoted attribute value (title="<!--")
can't open a comment. Text that is not markup is not scaled either: CSS in
<style> (a [data-t-rel="1"] selector - a note lists them, since the scaled
elements no longer match) and <textarea>/<title> text. JS regex literals are
told apart from divisions (`if (x) /re/`, `{a:1} / 2`) so a comment after
them is still found. The attribute name is matched case-insensitively and
quoted or unquoted (data-t-rel="1.2", DATA-T-REL='1.2', data-t-rel=1.2, and
data-t-rel=\\"1.2\\" inside a JS string), only as a whole attribute name
(sb-data-t-rel= is another attribute); only the number changes.

A backup is written before modifying (skip with --no-backup): <file>.bak, or
<file>.bak2, .bak3 ... when older backups exist - an existing backup is never
overwritten, so compressing twice keeps the original timings.

Usage:
    python compress_anim_timings.py <storyboard.html> <scale>
    python compress_anim_timings.py storyboard.html 0.4
    python compress_anim_timings.py storyboard.html 0.5 --no-backup
    python compress_anim_timings.py storyboard.html --report   # just report current values
"""
import argparse
import math
import re
import shutil
import sys
from pathlib import Path


# group 1 = the quote (None when unquoted; \" or \' inside a JS/JSON string),
# group 2 = the number. The name must start the attribute: preceded by whitespace, '/',
# a quote, '[' (an attribute selector) or the start (so sb-data-t-rel= / x-data-t-rel=
# are other attributes).
PATTERN = re.compile(r'''(?<![^\s/"'\[])data-t-rel\s*=\s*(\\?["'])?([\d.]+)(?(1)\1|(?=[\s>/]|$))''',
                     re.IGNORECASE)

_WS = ' \t\r\n\f'
_TAG_NAME = re.compile(r'<([A-Za-z][^\s/>]*)')
_COMMENT_END = re.compile(r'--!?>')
# elements whose content is text, not markup (no comments or tags inside)
_RAW_TEXT = {'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes'}
# one attribute of a start tag: name [= "v" | 'v' | v]
_ATTR = re.compile(r'''([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?''')
# the HTML spec's JavaScript MIME type essences: a <script type> equal to one of these
# (ASCII case-insensitive, surrounding whitespace stripped) runs as a classic script
_JS_MIME = {'application/ecmascript', 'application/javascript', 'application/x-ecmascript',
            'application/x-javascript', 'text/ecmascript', 'text/javascript',
            'text/javascript1.0', 'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3',
            'text/javascript1.4', 'text/javascript1.5', 'text/jscript', 'text/livescript',
            'text/x-ecmascript', 'text/x-javascript'}
# JSON payloads: JS-like comment/string rules, no legacy HTML-like comments
_JSON_TYPES = {'importmap', 'application/json', 'application/ld+json', 'speculationrules'}
# a '/' after one of these (or after a keyword below) starts a regex literal, not a division
_REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
_REGEX_WORDS = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete',
                'void', 'throw', 'yield', 'await'}
# `if (x) /re/.test(s)`: a '/' right after the ')' of one of these starts a regex
_CTRL_WORDS = {'if', 'while', 'for', 'with'}
# a '{' after one of these opens an object literal (an expression): `{a:1} / 2` divides
_EXPR_PREV = set('(,=:[?&|!+-*%<>~^')


def _blank(chars, start, end):
    """Blank chars[start:end] with spaces, keeping line breaks (same length)."""
    for i in range(start, end):
        if chars[i] not in '\r\n':
            chars[i] = ' '


def _code_comments(src, start, end, js=True, html_comments=False, regexes=None):
    """(start, end) spans of the comments in src[start:end].

    js=True: // and /* */, skipping string, template and regex literals (so
    "https://x" or '/*' inside a string is not a comment). html_comments=True
    (classic, non-module scripts) also treats '<!--' anywhere and '-->' at the
    start of a line as line comments, like browsers do. js=False (CSS): only
    /* */, skipping quoted strings. When `regexes` is a list, the (start, end)
    span of every regex literal is appended to it."""
    spans = []
    i, last, prev, word, sep = start, '', '', '', False
    bol = True          # nothing but whitespace / block comments so far on this line
    # open ( and { : ('(', follows if/while/for/with) / ('{', is an object literal) - so
    # a '/' after the matching ')' / '}' is told apart as regex or division
    stack = []
    while i < end:
        c = src[i]
        nxt = src[i + 1] if i + 1 < end else ''
        if c == '/' and nxt == '*':
            j = src.find('*/', i + 2, end)
            j = end if j < 0 else j + 2
            spans.append((i, j))
            bol = bol or '\n' in src[i:j]
            i = j
            continue
        if (js and c == '/' and nxt == '/') or (html_comments and (
                src.startswith('<!--', i, end) or (bol and src.startswith('-->', i, end)))):
            j = src.find('\n', i, end)
            j = end if j < 0 else j
            spans.append((i, j))
            i = j
            continue
        if c in '"\'' or (js and c == '`'):
            j = i + 1
            while j < end and src[j] != c:
                if src[j] == '\\':
                    j += 1
                elif c != '`' and src[j] == '\n':
                    break                      # unterminated string: stop at the line end
                j += 1
            i = j + 1
            prev, last, word, sep, bol = '', c, '', False, False
            continue
        # '/' right after a postfix ++ / -- is a division: `i++ / 2`
        postfix = last in ('+', '-') and prev == last
        if js and c == '/' and not postfix and (last == '' or last in _REGEX_PREV
                                                 or word in _REGEX_WORDS):
            j, in_class = i + 1, False
            while j < end and src[j] != '\n':
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
            if regexes is not None:
                regexes.append((i, min(j + 1, end)))
            i = j + 1
            prev, last, word, sep, bol = '', '/', '', False, False
            continue
        if c == '\n':
            bol = True
        if c.isspace():
            sep = True
        else:
            w0, l0, p0 = word, last, prev
            if c.isalnum() or c in '_$':
                word = word + c if (not sep and (last.isalnum() or last in '_$')) else c
            else:
                word = ''
            # prev only counts when adjacent, so `a + +b` is not `++`
            prev, last, sep, bol = ('' if sep else last), c, False, False
            if js and c == '(':
                stack.append(('(', w0 in _CTRL_WORDS))
            elif js and c == '{':
                arrow = l0 == '>' and p0 == '='          # `=> {` is a function body
                stack.append(('{', not arrow and (l0 in _EXPR_PREV or
                                                  (w0 in _REGEX_WORDS and w0 not in ('do', 'else')))))
            elif js and c in ')}' and stack and stack[-1][0] == ('(' if c == ')' else '{'):
                _, flag = stack.pop()
                if flag:
                    # `if (x)` ends a statement head (a regex may follow); `{a:1}` is a
                    # value (a '/' after it divides)
                    last = ';' if c == ')' else ')'
        i += 1
    return spans


def _tag_end(text, j):
    """Index just past the '>' that closes a start tag (quoted attribute values
    may hold '>', '<!--' or '<script>')."""
    n = len(text)
    while j < n:
        c = text[j]
        if c == '>':
            return j + 1
        if c == '=':
            j += 1
            while j < n and text[j] in _WS:
                j += 1
            if j < n and text[j] in '"\'':
                k = text.find(text[j], j + 1)
                j = n if k < 0 else k + 1
            continue
        j += 1
    return n


def _tag_attrs(text, start, end):
    """{lowercased name: value} of the attributes in text[start:end] (a start tag
    after its name; the first occurrence of a name wins, like browsers)."""
    attrs = {}
    for m in _ATTR.finditer(text, start, end):
        name = m.group(1).lower()
        if name not in attrs:
            v = next((g for g in m.group(2, 3, 4) if g is not None), '')
            attrs[name] = v
    return attrs


def script_kind(attrs):
    """How a <script> with these attributes is treated, per the HTML spec:
    'classic' (runs as classic JS: no/empty type, a JavaScript MIME type, or
    language="javascript..."), 'module', 'json' (import maps, JSON / JSON-LD),
    'inert-js' (a JS MIME type with parameters, e.g. "text/javascript;
    charset=utf-8": browsers do NOT run it, but it is plainly JS) or 'data'
    (any other type, e.g. text/template: a data block, masked as markup)."""
    typ = attrs.get('type')
    if typ is None:
        lang = (attrs.get('language') or '').strip()
        if not lang:
            return 'classic'
        typ = 'text/' + lang
    t = typ.strip(_WS).lower()
    if not t or t in _JS_MIME:
        return 'classic'
    if t == 'module':
        return 'module'
    if t in _JSON_TYPES:
        return 'json'
    essence = t.split(';', 1)[0].strip(_WS)
    if essence in _JS_MIME or essence == 'module':
        return 'inert-js'
    return 'data'


def _close_tag(text, name, start):
    """Start of the </name> that ends a script/style/raw-text element (or len(text))."""
    m = re.compile(r'</' + re.escape(name) + r'(?=[\s/>]|$)', re.IGNORECASE).search(text, start)
    return m.start() if m else len(text)


def _comment_end(text, start):
    """End of the HTML comment whose '<!--' is at `start` (<!-->, <!---> and --!> included)."""
    j = start + 4
    if text.startswith('>', j):
        return j + 1
    if text.startswith('->', j):
        return j + 2
    m = _COMMENT_END.search(text, j)
    return m.end() if m else len(text)


def mask_comments(text, inert=None, regions=None):
    """Same-length copy of text with every comment blanked (newlines kept):
    HTML comments in markup, JS comments inside <script>, CSS comments inside
    <style>. Markup is scanned tag by tag (quoted attribute values are skipped),
    so title="<!--" or accept="image/*" can't open a comment, and <textarea> /
    <title> text is not markup. A <script> inside an HTML comment is part of
    the comment. Scripts are classified by script_kind(); when `inert` is a
    list, the type of every 'inert-js' script (JS that browsers won't run) is
    appended to it. When `regions` is a list, (kind, start, end) is appended for
    the content of every <style> (kind 'style': CSS, not markup), raw-text
    element (kind = its tag name, e.g. 'textarea': text, not markup) and JS
    regex literal (kind 'regex': a pattern, not markup)."""
    out = list(text)
    n = len(text)
    i = 0
    while True:
        lt = text.find('<', i)
        if lt < 0:
            break
        if text.startswith('<!--', lt):
            e = _comment_end(text, lt)
            _blank(out, lt, e)
            i = e
            continue
        if text.startswith('<!', lt) or text.startswith('<?', lt):   # doctype / CDATA / bogus
            e = text.find('>', lt)
            i = n if e < 0 else e + 1
            continue
        m = _TAG_NAME.match(text, lt)
        if not m:                      # an end tag or a stray '<'
            i = lt + 1
            continue
        name = m.group(1).lower()
        j = _tag_end(text, m.end())
        if name == 'plaintext':
            break
        if name in _RAW_TEXT:
            i = _close_tag(text, name, j)
            if regions is not None:
                regions.append((name, j, i))
            continue
        if name not in ('script', 'style'):
            i = j
            continue
        ce = _close_tag(text, name, j)
        rx = None
        if name == 'style':
            spans = _code_comments(text, j, ce, js=False)
            if regions is not None:
                regions.append(('style', j, ce))
        else:
            attrs = _tag_attrs(text, m.end(), j - 1)
            kind = script_kind(attrs)
            if kind == 'inert-js' and inert is not None:
                inert.append(attrs.get('type', ''))
            rx = [] if regions is not None else None
            if kind in ('classic', 'inert-js'):
                spans = _code_comments(text, j, ce, js=True, html_comments=True, regexes=rx)
            elif kind in ('module', 'json'):
                spans = _code_comments(text, j, ce, js=True, regexes=rx)
            else:
                # <script type="text/template" / "text/html">: markup - mask it as HTML
                sub = [] if regions is not None else None
                out[j:ce] = mask_comments(text[j:ce], regions=sub)
                if sub:
                    regions.extend((k, s + j, e + j) for k, s, e in sub)
                spans = []
        for s, e in spans:
            _blank(out, s, e)
        if rx:
            regions.extend(('regex', s, e) for s, e in rx)
        i = ce
    return ''.join(out)


def _num(v):
    try:
        f = float(v)
    except ValueError:
        return None
    return f if math.isfinite(f) else None


def _classify(text):
    """([(match, value)] live, [(kind, match, value)] not-markup) for the parsable
    data-t-rel values outside comments. Not-markup = inside <style> (a CSS selector
    such as [data-t-rel="1"]) or raw text (<textarea>, <title>: shown as text)."""
    regions = []
    masked = mask_comments(text, regions=regions)
    live, other = [], []
    for m in PATTERN.finditer(masked):
        v = _num(m.group(2))
        if v is None:
            continue
        kind = next((k for k, s, e in regions if s <= m.start() < e), None)
        if kind is None:
            live.append((m, v))
        else:
            other.append((kind, m, v))
    return live, other


def live_values(text):
    """[(match, value)] for the data-t-rel attribute values in live markup: outside
    comments, <style> CSS and <textarea>/<title> text (positions index the original
    text). Unparsable values (e.g. "1.2.3") are skipped."""
    return _classify(text)[0]


def live_matches(text):
    """data-t-rel matches in live markup (positions index the original text)."""
    return [m for m, _ in live_values(text)]


def not_markup_values(text):
    """[(kind, value)] for data-t-rel text that is not markup and is left as-is:
    kind 'style' (a CSS attribute selector) or a raw-text tag name ('textarea')."""
    return [(k, v) for k, _, v in _classify(text)[1]]


def commented_count(text):
    total = sum(1 for m in PATTERN.finditer(text) if _num(m.group(2)) is not None)
    live, other = _classify(text)
    return total - len(live) - len(other)


def _skipped_note(text, verb='left untouched'):
    """' (N inside comments; M in <style> / <textarea> (not markup) <verb>)' or ''."""
    parts = []
    skipped = commented_count(text)
    if skipped:
        parts.append(f'{skipped} inside comments')
    other = not_markup_values(text)
    if other:
        kinds = ', '.join(dict.fromkeys('JS regex literals' if k == 'regex' else f'<{k}>'
                                        for k, _ in other))
        parts.append(f'{len(other)} in {kinds} (not markup)')
    return f' ({"; ".join(parts)} {verb})' if parts else ''


def scale_html(text, scale):
    """Scale every live data-t-rel value. Only the number changes: the attribute's
    spelling, spacing and quotes are kept."""
    out, last = [], 0
    for m, val in live_values(text):
        out.append(text[last:m.start(2)])
        out.append(str(round(val * scale, 2)))
        last = m.end(2)
    out.append(text[last:])
    return ''.join(out)


def backup_target(path):
    """Where to back `path` up: the first free <file>.bak, <file>.bak2, ... An
    existing backup is never overwritten (compressing twice must not lose the
    original timings). Returns (backup path, already_there): already_there is
    True when an existing backup holds exactly the current bytes."""
    data = path.read_bytes()
    n = 1
    while True:
        bak = path.with_name(path.name + ('.bak' if n == 1 else f'.bak{n}'))
        if not bak.exists():
            return bak, False
        try:
            if bak.read_bytes() == data:
                return bak, True
        except OSError:
            pass
        n += 1


def report_values(text):
    values = [v for _, v in live_values(text)]
    note = _skipped_note(text, 'ignored')
    if not values:
        print('No data-t-rel attributes found.' + note)
        return
    print(f'{len(values)} data-t-rel attributes found.' + note)
    print(f'  min  : {min(values):.2f}s')
    print(f'  max  : {max(values):.2f}s')
    print(f'  mean : {sum(values) / len(values):.2f}s')
    # Histogram
    buckets = [0] * 10
    for v in values:
        b = min(int(v / 0.5), 9)
        buckets[b] += 1
    print('  histogram (0.5s bins):')
    for i, count in enumerate(buckets):
        if count:
            print(f'    {i*0.5:.1f}-{(i+1)*0.5:.1f}s : {"#" * count} ({count})')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', help='Path to storyboard.html')
    ap.add_argument('scale', nargs='?', type=float, default=None,
                    help='Multiplier to apply to every data-t-rel (e.g. 0.4)')
    ap.add_argument('--report', action='store_true',
                    help='Print stats on current data-t-rel values and exit')
    ap.add_argument('--no-backup', action='store_true',
                    help='Do not write a backup (by default <file>.bak - or .bak2, .bak3 ... '
                         'when older backups exist - is written first)')
    ap.add_argument('--backup', action='store_true',
                    help=argparse.SUPPRESS)   # pre-0.8 flag; backups are now the default
    args = ap.parse_args(argv)

    path = Path(args.html)
    if not path.exists():
        sys.exit(f'File not found: {path}')
    with open(path, encoding='utf-8', newline='') as fh:   # keep the file's line endings
        text = fh.read()

    inert = []
    mask_comments(text, inert)
    for typ in dict.fromkeys(inert):
        print(f'note: <script type="{typ}"> is not run by browsers (a MIME type with parameters '
              f'is a data block) - use type="text/javascript" or drop the type. Its data-t-rel '
              f'values are treated as JS (comments skipped).')

    if args.report or args.scale is None:
        report_values(text)
        return
    if not math.isfinite(args.scale) or args.scale <= 0:
        sys.exit(f'scale must be a finite number > 0 (e.g. 0.4 to compress, 1.5 to stretch), '
                 f'got {args.scale}')

    count = len(live_values(text))
    if not count:
        print(f'No data-t-rel values to scale in {path.name}.')
        return

    if not args.no_backup:
        bak, already = backup_target(path)
        if already:
            print(f'Backup {bak.name} already holds this version (not rewritten)')
        else:
            shutil.copy2(path, bak)
            print(f'Backup written to {bak.name}')

    new_text = scale_html(text, args.scale)
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(new_text)
    print(f'Scaled {count} data-t-rel values by {args.scale} in {path.name}' + _skipped_note(text))
    css = [v for k, v in not_markup_values(text) if k == 'style']
    if css:
        print(f'note: <style> has {len(css)} [data-t-rel=...] selector(s) (values '
              f'{", ".join(dict.fromkeys(f"{v:g}" for v in css))}): CSS is not markup, so they were '
              f'not scaled - elements whose data-t-rel changed no longer match them. Update those '
              f'selectors by hand.')


if __name__ == '__main__':
    main()
