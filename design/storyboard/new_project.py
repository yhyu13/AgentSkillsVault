#!/usr/bin/env python
"""
new_project.py
Scaffold a new storyboard project: the deck, the engine, the plan/script
templates and (only when asked) the 3D / Lottie vendor libraries and a style
kit -- so a first run starts from a working, correctly wired directory.

Usage:
  python new_project.py <out_dir>
  python new_project.py "C:/videos/launch day" --aspect 9:16 --title "Launch day"
  python new_project.py ./deck --style kurzgesagt --with-3d --with-lottie
  python new_project.py ./deck --force          # overwrite the files this tool writes

Creates (inside <out_dir>, created if missing):
  storyboard.html        template.html (16:9) or vertical_template.html (9:16) with the
                         <title> set, audio src -> voiceover.mp3, kit <link> + vendor <script>s,
                         and `const WORDS = []` + `words: WORDS` wired into Storyboard.init
                         when the template lacks them
  storyboard-engine.js   the motion engine
  concept.md, script.md  from concept.template.md / script.template.md (title, aspect, style filled;
                         script.md gets a ```json {"beats": [...]} block, one per slide, if the
                         template has none)
  kits/<style>.css       --style NAME (or NAME.css), when the skill ships kits/NAME.css (else: warning,
                         no kit)
  assets/vendor/three*.js           --with-3d   (three.min.js, three-bloom.js, three-extras.js)
  assets/vendor/lottie_svg.min.js   --with-lottie (if the skill bundles it; otherwise the deck
                                    links lottie-web from cdnjs and a warning is printed)

Safety: every destination is checked BEFORE anything is written; if any already
exists the run stops without touching the disk unless --force is given. Even with
--force it stops (writing nothing) when a destination is a folder, a folder it
needs (kits/, assets/) is a file, or <out_dir> is the skill folder itself. Other
files already in <out_dir> are never touched. Every file is written to a temp file
and renamed into place, so an overwritten file that is a hard link (e.g. into the
skill's templates) is replaced, never written through. Paths with spaces are fine;
the printed next-step commands are quoted to paste into PowerShell and bash.
"""
import argparse
import html as _html
import os
import re
import shutil
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
AUDIO_NAME = 'voiceover.mp3'
TEMPLATES = {'16:9': 'template.html', '9:16': 'vertical_template.html'}
ASPECT_ALIASES = {'16x9': '16:9', 'horizontal': '16:9', 'landscape': '16:9',
                  '9x16': '9:16', 'vertical': '9:16', 'portrait': '9:16'}
THREE_ORDER = ['three.min.js', 'three-bloom.js', 'three-extras.js']   # load order matters
LOTTIE_CANDIDATES = ['assets/vendor/lottie_svg.min.js', 'assets/vendor/lottie.min.js', 'lottie_svg.min.js']
LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_svg.min.js'


def _aspect(value):
    v = value.strip().lower()
    v = ASPECT_ALIASES.get(v, v)
    if v not in TEMPLATES:
        raise argparse.ArgumentTypeError("aspect must be 16:9 or 9:16 (got %r)" % value)
    return v


def _style(value):
    v = value.strip()
    if v.lower().endswith('.css'):   # "--style kurzgesagt.css" means the kit kurzgesagt
        v = v[:-4]
    if not re.match(r'^[A-Za-z0-9][A-Za-z0-9_.-]*$', v) or '..' in v:
        raise argparse.ArgumentTypeError("style must be a plain kit name like 'kurzgesagt' (got %r)" % value)
    return v


def _read(path):
    with open(str(path), encoding='utf-8', newline='') as f:   # newline='' keeps the template's line endings
        return f.read()


def _match_newlines(text, like):
    """Use the line-ending style of `like` (templates may be checked out with CRLF) throughout `text`."""
    text = text.replace('\r\n', '\n')
    return text.replace('\n', '\r\n') if '\r\n' in like else text


def _replace_file(dst, fill):
    """Create `dst` as a brand-new file: `fill(tmp)` writes a temp file next to it, then os.replace() moves
    it into place. An existing `dst` -- even a hard link into the skill's own templates -- is swapped for
    the new file, never written through."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name('.%s.%d.tmp' % (dst.name, os.getpid()))
    try:
        fill(tmp)
        os.replace(str(tmp), str(dst))
    except BaseException:
        try:
            tmp.unlink()
        except OSError:
            pass
        raise


def _write_text(path, text):
    def fill(tmp):
        with open(str(tmp), 'w', encoding='utf-8', newline='') as f:
            f.write(text)
    _replace_file(path, fill)


def _copy_file(src, dst):
    _replace_file(dst, lambda tmp: shutil.copyfile(str(src), str(tmp)))


# Special inside "double quotes" in PowerShell and/or bash: $ ` " expand/end the string in both, ! is bash
# history expansion, \\ collapses to \ in bash (UNC paths), and PowerShell also ends a "..." string at the
# typographic double quotes U+201C U+201D U+201E (e.g. a folder named The <U+201C>Big<U+201D> Idea).
_DQ_UNSAFE = re.compile(u'[$`"!\u201c\u201d\u201e]|\\\\\\\\')
# PowerShell ends a '...' string at ANY of these (ASCII ' and the typographic single quotes U+2018 U+2019
# U+201A U+201B); doubling one inside the string yields that character literally.
_PS_SQUOTES = u"'\u2018\u2019\u201a\u201b"


def _quote(arg):
    """(PowerShell, bash) spellings of one command-line argument. Plain double quotes work in both shells
    for ordinary paths (spaces, apostrophes, brackets); a path with $ ` " ! \\\\, a typographic double
    quote or a trailing backslash is single-quoted instead (literal in both; only the quotes inside are
    escaped differently: PowerShell doubles every single-quote character, typographic ones included)."""
    s = str(arg)
    if not _DQ_UNSAFE.search(s) and not s.endswith('\\'):
        return '"%s"' % s, '"%s"' % s
    ps = ''.join(c + c if c in _PS_SQUOTES else c for c in s)
    return "'%s'" % ps, "'%s'" % s.replace("'", "'\\''")


def _command(fmt, *paths):
    """`fmt` with each %s filled by a quoted path: (PowerShell, bash) command lines."""
    q = [_quote(p) for p in paths]
    return fmt % tuple(p for p, _ in q), fmt % tuple(b for _, b in q)


def _cd_command(path):
    ps, sh = _command('cd %s', path)
    if re.search(r'[\[\]*?]', str(path)):   # PowerShell's cd (Set-Location -Path) treats these as wildcards
        ps = 'Set-Location -LiteralPath ' + ps[3:]
    return ps, sh


def _print_command(first, cont, cmd, note=''):
    """One line when both shells spell the command alike, else a PowerShell line and a bash line."""
    ps, sh = cmd
    if ps == sh:
        print(first + ps + note)
    else:
        print(first + 'PowerShell: ' + ps + note)
        print(cont + 'bash:       ' + sh + note)


def _same_file(a, b):
    try:
        return os.path.samefile(str(a), str(b))
    except OSError:
        return False


def _inside(path, folder):
    try:
        Path(os.path.realpath(str(path))).relative_to(os.path.realpath(str(folder)))
        return True
    except ValueError:
        return False


def _blocker(out, rel, kind, payload):
    """Why `rel` cannot be written into `out` even with --force (None when it can). Checked for every
    planned file before anything is written, so a run never dies half-way with a traceback."""
    cur = out
    for part in Path(rel).parts[:-1]:
        cur = cur / part
        if cur.exists() and not cur.is_dir():
            return '%s is a file, but the project needs a folder of that name' % cur.relative_to(out).as_posix()
    dst = out / rel
    if dst.is_dir():
        return '%s is a folder, not a file' % rel
    if dst.is_symlink() and _inside(dst, SKILL_DIR) and not (kind == 'copy' and _same_file(payload, dst)):
        return "%s is a link into the skill folder (%s) -- writing through it would change the skill" % (
            rel, os.path.realpath(str(dst)))
    return None


def _title_from_dir(out):
    words = [w for w in re.split(r'[-_\s]+', out.name) if w]
    return ' '.join(w[:1].upper() + w[1:] for w in words) or 'Storyboard'


def _fill(text, mapping):
    """Replace {{KEY}} placeholders. A placeholder that sits inside a JSON string ("{{KEY}}")
    gets a JSON-escaped value so the concept.md spec block stays parseable."""
    import json
    for key, val in mapping.items():
        if val is None:
            continue
        text = text.replace('"{{%s}}"' % key, json.dumps(val, ensure_ascii=False))
        text = text.replace('{{%s}}' % key, val)
    return text


def _insert_before_line_of(html, match_start, block):
    """Insert `block` lines at the start of the line containing match_start, reusing its indentation."""
    ls = html.rfind('\n', 0, match_start) + 1
    indent = html[ls:match_start]
    if indent.strip():
        indent = ''
    text = ''.join(indent + line + '\n' for line in block)
    return html[:ls] + text + html[ls:]


ENGINE_TAG_RE = re.compile(r'''(?i)<script\b[^>]*\bsrc\s*=\s*["'](?:\./)?storyboard-engine\.js["'][^>]*>\s*</script>''')
_REGION_RE = re.compile(r'(?i)<!--|<(script|style)\b[^>]*>')


def _markup_view(html):
    """Same-length copy of `html` with <!-- comments --> blanked (line breaks kept), so tag searches skip
    commented-out markup. A `<!--` inside a <script>/<style> body is code, not a comment."""
    out = list(html)
    i = 0
    while True:
        m = _REGION_RE.search(html, i)
        if not m:
            return ''.join(out)
        if m.group(0) == '<!--':
            e = html.find('-->', m.end())
            e = len(html) if e < 0 else e + 3
            for k in range(m.start(), e):
                if out[k] not in '\r\n':
                    out[k] = ' '
        else:
            close = re.compile(r'(?i)</%s\s*>' % m.group(1)).search(html, m.end())
            e = close.end() if close else len(html)
        i = e


def _search(pattern, html):
    """re.search over the markup (comments skipped); the match offsets are valid in `html`."""
    return re.search(pattern, _markup_view(html))


def _deckio():
    """sb_deckio.py (ships with the skill): the JS-aware reader/writer the voice tools use for the deck's
    TIMINGS / WORDS consts. None when this copy of the skill lacks it."""
    if str(SKILL_DIR) not in sys.path:
        sys.path.insert(0, str(SKILL_DIR))
    try:
        import sb_deckio
        return sb_deckio
    except Exception:
        return None


def _strip_code(html):
    """The markup with comments, <script> and <style> bodies removed (for counting elements)."""
    html = re.sub(r'(?s)<!--.*?-->', '', html)
    return re.sub(r'(?is)<(script|style)\b[^>]*>.*?</\1\s*>', '', html)


def count_slides(html):
    n = 0
    for m in re.finditer(r'''<[a-zA-Z][\w-]*\b[^>]*?\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')''', _strip_code(html)):
        if 'slide' in (m.group(1) or m.group(2) or '').split():
            n += 1
    return n


def ensure_words(src, notes=None):
    """Deck convention: `const WORDS = [...]` before the init call and `words: WORDS` in its opts (the
    voice tools fill it in place; captions + lip-sync read it). Adds whichever is missing, via sb_deckio
    (it parses the page: comments, strings and code shown on slides never confuse it; only a depth-1
    `words:` key counts as wired). A no-op for a deck with no Storyboard.init() call (legacy inline
    engine). Problems go to `notes` (list) and leave the deck unchanged."""
    notes = [] if notes is None else notes
    dio = _deckio()
    if dio is None:
        notes.append('sb_deckio.py is missing from the skill, so `const WORDS = [];` + `words: WORDS` were not '
                     'wired into Storyboard.init -- add them by hand (captions / lip-sync read WORDS).')
        return src
    try:
        if dio.find_init_call(src) is None:
            return src
        return dio.write_words(src, dio.read_words(src) or [], notes)
    except Exception as e:   # DeckIOError (e.g. WORDS declared some other way) or a parser surprise
        notes.append('WORDS was not wired into Storyboard.init: %s' % e)
        return src


def ensure_beats_block(text, n_slides):
    """Contract: script.md carries a fenced ```json {"beats": [...]} block (one entry per slide) that the
    voice tools prefer over the SSML block. Adds a placeholder block when the template has none."""
    for body in re.findall(r'(?ms)^```[ \t]*json[^\n]*\n(.*?)^```', text):
        if '"beats"' in body:
            return text
    n = max(1, n_slides)
    rows = ['  {"slide": %d, "text": "{{BEAT_%d_TEXT}}", "pause_after": 0.7}%s' % (i, i, ',' if i < n else '')
            for i in range(1, n + 1)]
    block = ('## Beats -- machine-readable narration\n\n'
             'One entry per slide, plain spoken text (no SSML); `pause_after` = seconds of silence after the '
             'beat. tts_free.py / elevenlabs_generate.py read this block first (fallback: the SSML block, split '
             'on `<break>` tags >= 0.6s). Keep it in sync with the SSML block.\n\n'
             '```json\n{"beats": [\n' + '\n'.join(rows) + '\n]}\n```\n\n---\n\n')
    m = re.search(r'(?m)^## 2\.', text)
    if m:
        return text[:m.start()] + block + text[m.start():]
    return text.rstrip('\n') + '\n\n---\n\n' + block.rstrip('-\n') + '\n'


def build_deck(src, title, kit_href=None, scripts=(), notes=None):
    """Return the deck HTML: <title>, audio src, kit <link> (last in <head>, so its :root tokens win
    over the template's), vendor <script>s (right before storyboard-engine.js), const WORDS.
    Tags inside <!-- comments --> are never used as anchors. Soft problems are appended to `notes`."""
    esc = _html.escape(title, quote=False)
    m = _search(r'(?is)<title\b[^>]*>.*?</title\s*>', src)
    if m:
        src = src[:m.start()] + '<title>%s</title>' % esc + src[m.end():]
    else:
        m = _search(r'(?i)<head\b[^>]*>', src)
        if m:
            src = src[:m.end()] + '\n  <title>%s</title>' % esc + src[m.end():]
    src = src.replace('{{TITLE}}', esc).replace('{{AUDIO_SRC}}', AUDIO_NAME)

    if kit_href:
        tag = '<link rel="stylesheet" href="%s" data-storyboard-kit>' % kit_href
        m = _search(r'(?i)</head\s*>', src)
        if not m:
            src = tag + '\n' + src
        elif src[src.rfind('\n', 0, m.start()) + 1:m.start()].strip():   # "</style></head>" on one line
            src = src[:m.start()] + tag + src[m.start():]
        else:
            src = _insert_before_line_of(src, m.start(), ['  ' + tag])

    if scripts:
        block = []
        for s in scripts:
            if isinstance(s, tuple):
                block.append('<!-- %s -->' % s[1])
                s = s[0]
            block.append('<script src="%s"></script>' % s)
        view = _markup_view(src)
        m = ENGINE_TAG_RE.search(view)
        if not m:   # a template with an inline engine: load the libraries before that script block
            m = next((sm for sm in re.finditer(r'(?is)<script\b(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script\s*>', view)
                      if re.search(r'\bconst\s+TIMINGS\s*=', sm.group(1))), None)
        if not m:
            m = re.search(r'(?i)</body\s*>', view)
        if m:
            src = _insert_before_line_of(src, m.start(), block)
        else:
            src += '\n' + '\n'.join(block) + '\n'
    return ensure_words(src, notes)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('out_dir', help='Project directory to create (may already exist; spaces are fine)')
    ap.add_argument('--aspect', type=_aspect, default='16:9',
                    help='16:9 (1920x1080, template.html; default) or 9:16 (1080x1920, vertical_template.html)')
    ap.add_argument('--title', default=None, help='Video title (default: derived from the folder name)')
    ap.add_argument('--style', type=_style, default=None,
                    help='Style kit name: copies kits/<name>.css from the skill and links it in the deck')
    ap.add_argument('--with-3d', action='store_true', help='Copy three.js (+ bloom/extras) into assets/vendor/ and link it')
    ap.add_argument('--with-lottie', action='store_true', help='Copy/link the lottie-web player for data-anim="lottie"')
    ap.add_argument('--force', action='store_true', help='Overwrite files this tool writes if they already exist')
    args = ap.parse_args()
    if hasattr(sys.stdout, 'reconfigure'):   # titles/paths with non-ASCII must not crash a cp1252 console
        try:
            sys.stdout.reconfigure(errors='replace')
            sys.stderr.reconfigure(errors='replace')
        except Exception:
            pass

    out = Path(args.out_dir).expanduser().resolve()
    if os.path.normcase(str(out)) == os.path.normcase(str(SKILL_DIR)) or _same_file(out, SKILL_DIR):
        sys.exit('[error] %s is the storyboard skill folder itself -- create the project somewhere else.' % out)
    anc = next((p for p in [out] + list(out.parents) if p.exists()), None)
    if anc is not None and not anc.is_dir():
        sys.exit('[error] %s exists and is not a directory%s.' % (anc, '' if anc == out else ', so %s cannot be '
                                                                  'created' % out))
    title = (args.title or '').strip() or _title_from_dir(out)
    warnings = []
    if _inside(out, SKILL_DIR):
        warnings.append('%s is inside the storyboard skill folder -- projects there mix with the skill\'s own files '
                        '(and its git repo); prefer a folder outside %s.' % (out, SKILL_DIR))

    template = SKILL_DIR / TEMPLATES[args.aspect]
    engine = SKILL_DIR / 'storyboard-engine.js'
    for req in (template, engine):
        if not req.is_file():
            sys.exit('[error] skill file missing: %s  (run: python "%s" to diagnose)' % (req, SKILL_DIR / 'doctor.py'))

    # ---- plan everything first: rel path -> ('text', str) | ('copy', Path)
    plan = []
    scripts = []

    kit_href = None
    if args.style:
        kit = SKILL_DIR / 'kits' / (args.style + '.css')
        if kit.is_file():
            kit_href = 'kits/%s.css' % args.style
            plan.append((kit_href, 'copy', kit))
            kit_assets = SKILL_DIR / 'kits' / args.style      # optional companion dir (fonts, textures)
            if kit_assets.is_dir():
                for f in sorted(kit_assets.rglob('*')):
                    if f.is_file():
                        plan.append(('kits/%s/%s' % (args.style, f.relative_to(kit_assets).as_posix()), 'copy', f))
        else:
            kits_dir = SKILL_DIR / 'kits'
            avail = sorted(p.stem for p in kits_dir.glob('*.css')) if kits_dir.is_dir() else []
            warnings.append("style kit '%s' not found at %s (available: %s) -- continuing without a kit; the style "
                            "name is still recorded in concept.md." % (args.style, kit, ', '.join(avail) or 'none yet'))

    if args.with_3d:
        vendor = SKILL_DIR / 'assets' / 'vendor'
        found = sorted(vendor.glob('three*.js')) if vendor.is_dir() else []
        found.sort(key=lambda p: (THREE_ORDER.index(p.name) if p.name in THREE_ORDER else len(THREE_ORDER), p.name))
        if not any(p.name == 'three.min.js' for p in found):
            warnings.append('three.min.js is not in %s -- data-anim="scene3d" will not work until you add it.' % vendor)
        for p in found:
            rel = 'assets/vendor/' + p.name
            plan.append((rel, 'copy', p))
            scripts.append(rel)

    if args.with_lottie:
        lottie = next((SKILL_DIR / c for c in LOTTIE_CANDIDATES if (SKILL_DIR / c).is_file()), None)
        if lottie is not None:
            rel = 'assets/vendor/' + lottie.name
            plan.append((rel, 'copy', lottie))
            scripts.append(rel)
        else:
            scripts.append((LOTTIE_CDN, 'lottie-web from CDN (not bundled with the skill); save it to '
                                        'assets/vendor/ and point this tag there for offline renders'))
            warnings.append('lottie_svg.min.js is not bundled with the skill -- the deck links lottie-web from '
                            'cdnjs instead (needs internet at preview/render time).')

    template_src = _read(template)
    if scripts and not ENGINE_TAG_RE.search(_markup_view(template_src)):
        warnings.append('%s embeds its own inline engine instead of loading storyboard-engine.js, so '
                        '--with-3d / --with-lottie features only work once the deck is switched to '
                        '<script src="storyboard-engine.js"></script> + Storyboard.init(...).' % template.name)
    deck = _match_newlines(build_deck(template_src, title, kit_href, scripts, notes=warnings), template_src)
    n_slides = count_slides(deck)
    plan.insert(0, ('storyboard.html', 'text', deck))
    plan.insert(1, ('storyboard-engine.js', 'copy', engine))

    mapping = {'TITLE': title, 'AUDIO_FILENAME': AUDIO_NAME, 'STYLE': args.style}
    for name, tmpl in (('concept.md', 'concept.template.md'), ('script.md', 'script.template.md')):
        src = SKILL_DIR / tmpl
        if not src.is_file():
            warnings.append('%s missing from the skill -- %s not created.' % (tmpl, name))
            continue
        raw = _read(src)
        text = _fill(raw, mapping)
        text = re.sub(r'"\{\{ASPECT[A-Za-z0-9_]*\}\}"', '"%s"' % args.aspect, text)
        text = re.sub(r'\{\{ASPECT[A-Za-z0-9_]*\}\}', args.aspect, text)
        if name == 'script.md':
            text = _match_newlines(ensure_beats_block(text, n_slides), raw)
        plan.append((name, 'text', text))

    # ---- everything is checked before a single byte is written
    blocked = []
    for rel, kind, payload in plan:
        b = _blocker(out, rel, kind, payload)
        if b and b not in blocked:
            blocked.append(b)
    if blocked:   # --force cannot fix these: they would crash half-way through the write
        sys.stderr.write('[error] cannot create the project in %s:\n' % out)
        for b in blocked:
            sys.stderr.write('          %s\n' % b)
        sys.stderr.write('        Nothing was written (--force does not help here). Move those out of the '
                         'way or pick another folder.\n')
        sys.exit(1)
    linked = set(rel for rel, kind, payload in plan if kind == 'copy' and _same_file(payload, out / rel))
    existing = [rel for rel, _, _ in plan if (out / rel).exists() and rel not in linked]
    if existing and not args.force:
        sys.stderr.write('[error] %d file(s) already exist in %s:\n' % (len(existing), out))
        for rel in existing:
            sys.stderr.write('          %s\n' % rel)
        sys.stderr.write('        Nothing was written. Re-run with --force to overwrite them '
                         '(other files in the folder are never touched).\n')
        sys.exit(1)

    written = []
    try:
        out.mkdir(parents=True, exist_ok=True)
        for rel, kind, payload in plan:
            if rel in linked:
                continue
            dst = out / rel
            if kind == 'text':
                _write_text(dst, payload)
            else:
                _copy_file(payload, dst)
            written.append(rel)
    except (OSError, shutil.Error) as e:
        sys.stderr.write('[error] writing the project failed: %s\n' % e)
        sys.stderr.write('        written before the error: %s\n' % (', '.join(written) or 'nothing'))
        sys.exit(1)

    print('[ok] %s project "%s" in %s' % (args.aspect, title, out))
    for rel, _, _ in plan:
        print('       %s%s' % (rel, '   (overwritten)' if rel in existing else
                                   '   (already the skill\'s own file via a link -- left as is)' if rel in linked
                                   else ''))
    for w in warnings:
        print('[warn] ' + w)

    # Commands are printed so they paste intact into PowerShell AND bash (see _quote / _cd_command).
    ind = ' ' * 15
    print()
    print('Next steps:')
    cd = _cd_command(out)
    if cd[0] == cd[1]:
        print('  1. ' + cd[0])
    else:
        print('  1. Go to the project folder:')
        _print_command('       ', '       ', cd)
    print('  2. Plan    -- fill concept.md: 3 directions -> pick one, the emotional arc, one beat per slide.')
    print('  3. Script  -- write script.md: the SSML narration block + the ```json {"beats": [...]} block.')
    print('  4. Build   -- author one slide per beat in storyboard.html; open it in Chrome, Space = play')
    print('               (until %s exists it plays on a PREVIEW clock).' % AUDIO_NAME)
    step = 5
    tts = SKILL_DIR / 'tts_free.py'
    el = SKILL_DIR / 'elevenlabs_generate.py'
    if tts.is_file() or el.is_file():
        print('  %d. Voice   -- writes %s + word_timestamps.json and retimes the deck:' % (step, AUDIO_NAME))
        if tts.is_file():
            _print_command(ind, ind, _command('python %s script.md --apply storyboard.html', tts),
                           '          (free, edge-tts)')
        if el.is_file():
            _print_command(ind, ind, _command('python %s script.md . --apply storyboard.html', el),
                           '   (ElevenLabs; see --help)')
        step += 1
    audit = SKILL_DIR / 'audit_deck.py'
    if audit.is_file():
        _print_command('  %d. Audit   -- ' % step, ind, _command('python %s storyboard.html', audit))
        step += 1
    _print_command('  %d. Render  -- ' % step, ind, _command('python %s storyboard.html', SKILL_DIR / 'render_video.py'))
    print()
    _print_command('Setup problems? ', ' ' * 16, _command('python %s --smoke', SKILL_DIR / 'doctor.py'))


if __name__ == '__main__':
    main()
