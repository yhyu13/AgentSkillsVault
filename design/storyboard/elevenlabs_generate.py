#!/usr/bin/env python
"""
elevenlabs_generate.py
Render a storyboard's voice-over with ElevenLabs and derive slide cues and
per-word timestamps from the returned character alignment.

Pipeline:
  script.md  (SSML block + optional ```json {"beats":[...]} block)
       |
       v
  ElevenLabs API   (text_to_speech.convert_with_timestamps)
       |
       v
  -->  voiceover.mp3          written the moment the API answers
  -->  alignment_raw.json     raw character alignment + request metadata
  -->  word_timestamps.json   {"source","audio","duration","words","cues"}
  -->  TIMINGS + WORDS        rewritten in the deck (if --apply deck.html;
                              the deck is backed up first to deck.html.bak,
                              or .bak2, .bak3 ... -- an existing backup is
                              never overwritten; the deck's <audio src> is
                              pointed at the MP3 unless --keep-src)

Requires:
  python -m pip install elevenlabs
  Env var ELEVENLABS_API_KEY   (PowerShell: $env:ELEVENLABS_API_KEY="sk_...")
                               (bash:       export ELEVENLABS_API_KEY="sk_...")

Usage:
  python elevenlabs_generate.py script.md ./out
  python elevenlabs_generate.py script.md . --voice "Brian" --speed 0.90
  python elevenlabs_generate.py script.md . --apply storyboard.html
  python elevenlabs_generate.py script.md . --slides 15
  python elevenlabs_generate.py script.md . --dry-run        (no API call)
  python elevenlabs_generate.py --list-voices
  python elevenlabs_generate.py script.md . --reuse --apply storyboard.html
        (re-derive cues from the saved alignment_raw.json -- no API call)

Defaults:
  Voice    : 'Adam' (a voice id, or a name looked up in your ElevenLabs
             voices, case-insensitive; falls back to a small built-in table)
  Model    : 'eleven_multilingual_v2' (honours <break time="0.7s" /> tags)
  Settings : stability 0.55, similarity 0.75, style 0.10, speaker boost on,
             speed 0.90 (valid 0.7-1.2; lower = slower delivery)
  Output   : 'voiceover.mp3' (--out-name to change)

Input (script.md):
  * The TTS text is the SSML fenced block (any info string: ```ssml, ```xml
    or a bare ```; the fence may be indented). It is sent as ONE request so
    prosody stays continuous. A <break> glued to a word gets a space on each
    side so the words stay separate in the alignment.
    Fences follow CommonMark: a block closes at a line of the same fence
    character at least as long as the opening one (```ssml may close with
    ````, never with ~~~ or ``). A narration block that is never closed is
    an error (it would read the rest of the file aloud).
  * A fenced JSON block {"beats":[{"slide":1,"text":"...","pause_after":0.7}]}
    (one entry per slide) tells the tool how many slides there are and what
    each one says. Without an SSML block the text is built from the beats.
    A beats block that is not valid JSON (trailing comma, curly quotes) is
    reported with a [WARN] and ignored.
  * script.md must be UTF-8 (a BOM is fine).

How slide cues are computed:
  ElevenLabs returns character-level timestamps. Markup characters (e.g. a
  <break .../> tag, which may carry timestamps spanning the silence, also
  one whose < > were dropped) and whitespace are dropped; the rest is
  grouped into words [{text,start,end}]. A first / last character far
  longer than normal (> max(0.35s, 5x the median)) has a pause folded
  into it, so the word starts / ends at that character's other edge.
  The slide count N comes from --slides, else the beats block, else the
  deck passed to --apply. Then (--cue-method auto):
    1. text  : the beat texts (or the SSML split at <break>s >= --gap-threshold)
               are aligned to the spoken words; each beat's first word = cue.
               Each such boundary is checked against the audio: if there is
               no real pause before it (no <break> written there, silence
               < --gap-threshold) the SSML and beats blocks disagree, and the
               cue moves to the nearest real pause (a [WARN] names both words).
               A boundary the texts agree on but where the SSML has no
               <break> (its <break> sits elsewhere in the beat) keeps the
               beats block's cue and gets a [WARN].
    2. gaps  : if that fails and N is known, the N-1 longest silences between
               words (kept in time order) are the slide boundaries; between
               equally long ones a written <break> wins. [WARN] when some are
               shorter than --gap-threshold with no <break> there (likely
               mid-beat sentence pauses), or when the shortest one used is no
               longer than one left out (a guess). With no beats block, a
               deck / --slides count that differs from the SSML's own
               <break>-split beat count is a [WARN] (a note for --slides).
    3. threshold : otherwise every silence >= --gap-threshold (0.6s) is one.
  Slide 1 is always t=0. Each other cue = start of the first word after the
  boundary (+ --offset; negative = visuals lead the audio).
  A beat with empty text (a visual-only slide, e.g. a logo hold) is cued
  inside the silence before the next narrated beat (or after the last word),
  which the neighbouring pause_after values share in proportion. Built from
  the beats, its pause_after becomes the <break> that makes that silence.
  TIMINGS / cues use the beats block's own "slide" numbers (revisits allowed).
  Exit code 1 when no cues could be derived (e.g. no alignment returned).
"""
import argparse
import base64
import difflib
import json
import os
import re
import sys
import warnings
from pathlib import Path
from urllib.parse import quote, unquote

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sb_deckio  # noqa: E402  (sibling module, shipped with the skill)


DEFAULT_VOICE = 'Adam'
DEFAULT_MODEL = 'eleven_multilingual_v2'
DEFAULT_OUT_NAME = 'voiceover.mp3'
DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128'
RAW_NAME = 'alignment_raw.json'
WORDS_NAME = 'word_timestamps.json'
MAX_CHARS = 10000   # eleven_multilingual_v2 per-request character limit
MAX_BREAK = 3.0     # longest <break time="..."/> ElevenLabs honours

# Legacy premade voices -- only used when the SDK lookup can't find the name.
LEGACY_VOICES = {
    'adam':   'pNInz6obpgDQGcFmaJgB',
    'daniel': 'onwK4e9ZLuTAKqWW03F9',
    'brian':  'nPczCjzI2devNBz1zQrb',
    'rachel': '21m00Tcm4TlvDq8ikWAM',
    'antoni': 'ErXwobaYiN019PkySvjV',
    'arnold': 'VR6AewLTigWG4xSOukaG',
}
VOICE_ID_RE = re.compile(r'[A-Za-z0-9]{20}')

TAG_RE = re.compile(r'</?[A-Za-z][^<>]*>')
BREAK_RE = re.compile(r'<break\b[^>]*>', re.IGNORECASE)
BREAK_TIME_RE = re.compile(r'time\s*=\s*["\']?\s*(\d+(?:\.\d+)?|\.\d+)\s*(ms|s)?', re.IGNORECASE)
# Opening fence line: any indent (e.g. inside a list item), any info string
# (a backtick fence's info string may not contain backticks -- CommonMark).
FENCE_OPEN_RE = re.compile(r'^([ \t]*)(`{3,}|~{3,})[ \t]*(.*?)[ \t]*$')
# An SSML tag whose angle brackets were dropped from the alignment
# ('break time="0.7s" /'): a known tag name + attr=value pairs.
BARE_TAG_RE = re.compile(
    r'<?/?\b(?:break|phoneme|prosody|emphasis|say-as|sub|lang|speak)'
    r'(?:\s+[A-Za-z_:-]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s"\'<>/]+))+\s*/?\s*>?', re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r'\{\{[A-Z0-9_]+\}\}')

KEY_MISSING_MSG = """ELEVENLABS_API_KEY is not set.
Create a key at https://elevenlabs.io/app/settings/api-keys, then set it:
  PowerShell :  $env:ELEVENLABS_API_KEY="sk_..."
  bash / zsh :  export ELEVENLABS_API_KEY="sk_..."
(--dry-run checks the script and settings without calling the API.)"""

SDK_MISSING_MSG = """The ElevenLabs Python SDK is not installed. Install it with:
  python -m pip install elevenlabs"""


# --------------------------------------------------------------------------
# small utils
# --------------------------------------------------------------------------

def die(msg):
    sys.exit(f'[error] {msg}')


def warn(msg):
    print(f'[WARN] {msg}', file=sys.stderr)


def info(msg):
    print(msg)


def _field(obj, *names):
    """First non-None attribute / key among `names` on an SDK object or dict."""
    for n in names:
        v = obj.get(n) if isinstance(obj, dict) else getattr(obj, n, None)
        if v is not None:
            return v
    return None


def _num_list(nums):
    return ', '.join(str(n) for n in nums)


def _first_difference(a, b):
    """Short description of the first difference between two token lists ('' if equal)."""
    if a == b:
        return ''
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            continue
        sa, sb = ' '.join(a[i1:i2][:6]), ' '.join(b[j1:j2][:6])
        if tag == 'delete':
            return f'the SSML has "{sa}" where the beats have nothing'
        if tag == 'insert':
            return f'the beats have "{sb}" that the SSML lacks'
        return f'the SSML says "{sa}" where the beats say "{sb}"'
    return ''


def _quiet_import(fn):
    """Import the SDK without the pydantic-v1-on-py3.14 UserWarning noise."""
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        return fn()


# --------------------------------------------------------------------------
# script.md parsing
# --------------------------------------------------------------------------

def _dedent(body, indent):
    """Strip the opening fence's indentation from each body line (list items)."""
    out = []
    for ln in body.split('\n'):
        k = 0
        while k < len(indent) and k < len(ln) and ln[k] in ' \t':
            k += 1
        out.append(ln[k:])
    return '\n'.join(out)


def parse_fenced_blocks(text):
    """[{'info': 'ssml', 'body': '...', 'closed': True}] for every fenced code
    block, in order. CommonMark rules: a block closes at the first later line
    that is only a run of its fence character at least as long as the opening
    fence (```ssml may close with ````, never with ~~~ or ``); an empty block
    closes at its own fence; an unclosed block runs to the end of the file
    ('closed': False)."""
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    out, i = [], 0
    while i < len(lines):
        m = FENCE_OPEN_RE.match(lines[i])
        if not m or (m.group(2)[0] == '`' and '`' in m.group(3)):
            i += 1
            continue
        indent, fence, info_str = m.groups()
        close = re.compile(r'[ \t]*' + re.escape(fence[0]) + r'{%d,}[ \t]*$' % len(fence))
        j = i + 1
        while j < len(lines) and not close.match(lines[j]):
            j += 1
        out.append({'info': info_str.split()[0].lower() if info_str else '',
                    'body': _dedent('\n'.join(lines[i + 1:j]), indent),
                    'closed': j < len(lines), 'fence': fence})
        i = j + 1
    return out


_BEATS_KEY_RE = re.compile(r'["\'“”]beats["\'“”]\s*:')


def _looks_like_beats(body):
    """A block meant as the {"beats": [...]} JSON (valid or not)."""
    return body.lstrip()[:1] in ('{', '[') and bool(_BEATS_KEY_RE.search(body))


def _beats_json_problem(body):
    """Why a beats-looking block isn't usable, for the warning (None if it is)."""
    try:
        data = json.loads(body)
    except ValueError as e:
        hints = []
        if re.search(r',\s*[}\]]', body):
            hints.append('trailing commas are not allowed')
        if re.search('[“”]\\s*:|:\\s*[“”]', body):
            hints.append('curly quotes must be plain ASCII "')
        return f'not valid JSON ({e})' + (f' -- {"; ".join(hints)}' if hints else '')
    if not isinstance(data, dict) or not isinstance(data.get('beats'), list) or not data['beats']:
        return 'expected {"beats": [{"slide": 1, "text": "...", "pause_after": 0.7}, ...]}'
    return None


def _parse_beats_json(body):
    try:
        data = json.loads(body)
    except ValueError:
        return None
    if not isinstance(data, dict) or not isinstance(data.get('beats'), list) or not data['beats']:
        return None
    beats = []
    for i, b in enumerate(data['beats']):
        if isinstance(b, str):
            b = {'text': b}
        if not isinstance(b, dict):
            continue
        try:
            slide = int(b.get('slide', i + 1))
        except (TypeError, ValueError):
            slide = i + 1
        if slide < 1:
            slide = i + 1
        try:
            pause = float(b.get('pause_after', 0.7))
        except (TypeError, ValueError):
            pause = 0.7
        beats.append({'slide': slide, 'text': str(b.get('text', '')).strip(), 'pause_after': pause})
    return beats or None


def extract_beats(blocks, problems=None):
    """The {"beats":[...]} block (json info string or JSON-looking body), or None.
    A block that looks like the beats block but can't be used is reported in
    `problems` (list of str) -- it must never be dropped silently."""
    bad = []
    for b in blocks:
        if b['info'] in ('json', 'jsonc', 'json5', '') or b['body'].lstrip().startswith('{'):
            beats = _parse_beats_json(b['body'])
            if beats:
                return beats
            if _looks_like_beats(b['body']):
                bad.append(_beats_json_problem(b['body']))
    if problems is not None:
        problems += [p for p in bad if p]
    return None


_NON_SSML_INFOS = {'json', 'jsonc', 'json5', 'js', 'javascript', 'ts', 'typescript', 'python',
                   'py', 'bash', 'sh', 'shell', 'powershell', 'ps1', 'css', 'html', 'yaml',
                   'yml', 'toml', 'csv', 'diff', 'console'}


def extract_ssml(blocks):
    """The SSML narration block: ```ssml > ```xml/```speak > first block with a
    <break> tag > first non-code block. None if there is none."""
    cands = [b for b in blocks
             if b['info'] not in _NON_SSML_INFOS and not _looks_like_beats(b['body'])
             and not _parse_beats_json(b['body'])]
    for pick in (lambda b: b['info'] == 'ssml',
                 lambda b: b['info'] in ('xml', 'speak'),
                 lambda b: BREAK_RE.search(b['body']),
                 lambda b: True):
        for b in cands:
            if pick(b) and b['body'].strip():
                return b['body'].strip()
    return None


def beats_to_ssml(beats):
    """TTS text from the beats block: the beat texts joined by their
    pause_after <break>s. A pause over ElevenLabs' 3s maximum becomes several
    tags. A beat with no text (a visual-only slide) is just its pause -- a
    trailing one too, so the audio holds on that last slide."""
    parts = []
    for i, b in enumerate(beats):
        parts.append(b['text'])
        pause = round(max(0.0, b['pause_after']), 1)
        if i < len(beats) - 1 or not spoken_tokens(b['text']):
            while pause > 0:
                chunk = min(MAX_BREAK, pause)
                parts.append(f'<break time="{chunk:.1f}s" />')
                pause = round(pause - chunk, 1)
    return '\n'.join(p for p in parts if p)


def clean_tts_text(ssml):
    """Strip HTML comments and an outer <speak> wrapper; put a space on each
    side of a <break> tag glued to a word (`frame.<break .../>Then`), so the
    words stay separate in the alignment even if the API drops the tag's
    characters from it. Everything else is kept."""
    t = re.sub(r'<!--.*?-->', '', ssml, flags=re.DOTALL).strip()
    m = re.fullmatch(r'<speak\b[^>]*>(.*)</speak\s*>', t, flags=re.DOTALL | re.IGNORECASE)
    t = (m.group(1) if m else t).strip()
    t = re.sub(r'(?<=\S)(<break\b[^>]*>)', r' \1', t, flags=re.IGNORECASE)
    return re.sub(r'(<break\b[^>]*>)(?=\S)', r'\1 ', t, flags=re.IGNORECASE)


def read_script_text(path):
    """script.md as text (UTF-8, with or without BOM; UTF-16 with BOM).
    Missing / unreadable / non-UTF-8 files are friendly errors, not tracebacks."""
    p = Path(path)
    if not p.is_file():
        die(f'Script not found: {p}' + (' (that is a folder)' if p.is_dir() else '')
            + '\n  Pass the path to script.md (the file with the ```ssml narration block).')
    try:
        data = p.read_bytes()
    except OSError as e:
        die(f'Cannot read {p}: {e.strerror or e}')
    if data[:2] in (b'\xff\xfe', b'\xfe\xff'):
        try:
            return data.decode('utf-16')
        except UnicodeDecodeError:
            pass
    try:
        return data.decode('utf-8-sig')
    except UnicodeDecodeError as e:
        line = data[:e.start].count(b'\n') + 1
        die(f'{p} is not UTF-8 text (byte 0x{data[e.start]:02x} on line {line}; saved as ANSI / '
            f'Windows-1252?). Re-save it as UTF-8 -- VS Code: "Save with Encoding" > UTF-8; '
            f'Notepad: Save as > Encoding: UTF-8.')


def load_script(path):
    """-> {'text': tts text, 'beats': [..] | None, 'source': 'ssml' | 'beats' | 'plain'}"""
    raw = read_script_text(path)
    blocks = parse_fenced_blocks(raw)
    problems = []
    beats = extract_beats(blocks, problems)
    ssml = extract_ssml(blocks)
    open_block = next((b for b in blocks if ssml and not b['closed'] and b['body'].strip() == ssml), None)
    if open_block:
        die(f'{path}: the ```{open_block["info"]} narration block is never closed, so it runs to the end '
            f'of the file and everything after it would be read aloud. Close it with a line of '
            f'{open_block["fence"]} (the same fence character, at least as many as the opening fence).')
    if problems and not beats:
        warn(f'{Path(path).name}: the beats block is IGNORED -- {problems[0]}. '
             + ('Slide count and beat texts fall back to --slides / the --apply deck / the SSML '
                'split at <break> tags.' if ssml else 'There is no SSML block to fall back on.')
             + ' Fix the ```json block (python -m json.tool can check it).')
    if ssml:
        source = 'ssml'
    elif beats:
        if any(b['info'] == 'ssml' and not b['body'].strip() for b in blocks):
            warn(f'{Path(path).name}: the ```ssml block is empty; the TTS text is built from the '
                 f'beats (joined by their pause_after <break>s).')
        ssml, source = beats_to_ssml(beats), 'beats'
    elif not blocks and Path(path).suffix.lower() in ('.txt', '.ssml', '.xml'):
        ssml, source = raw.strip(), 'plain'
    else:
        die(f'No narration found in {path}. script.md needs the SSML inside a fenced block '
            f'(```ssml ... ``` or ``` ... ```) and/or a ```json {{"beats": [...]}} block.')
    text = clean_tts_text(ssml)
    if PLACEHOLDER_RE.search(text):
        die(f'{path} still contains template placeholders like '
            f'{PLACEHOLDER_RE.search(text).group(0)} -- fill in the narration first.')
    if not TAG_RE.sub('', text).strip():
        die(f'The narration block in {path} is empty.')
    return {'text': text, 'beats': beats, 'source': source}


def _break_seconds(tag):
    m = BREAK_TIME_RE.search(tag)
    if not m:
        return 0.0
    v = float(m.group(1))
    return v / 1000.0 if (m.group(2) or '').lower() == 'ms' else v


def split_on_breaks(text, min_break):
    """Split SSML into beat texts at <break> tags >= min_break seconds
    (the contract's fallback when script.md has no beats block)."""
    segs, last = [], 0
    for m in BREAK_RE.finditer(text):
        if _break_seconds(m.group(0)) >= min_break:
            segs.append(text[last:m.start()])
            last = m.end()
    segs.append(text[last:])
    return [s for s in segs if spoken_tokens(s)]


# --------------------------------------------------------------------------
# tokens / words / cues
# --------------------------------------------------------------------------

def _norm_token(tok):
    return ''.join(c for c in tok.lower() if c.isalnum())


def spoken_tokens(text):
    """Normalised spoken tokens of a text: markup removed, punctuation-only dropped."""
    toks = (_norm_token(t) for t in TAG_RE.sub(' ', text).split())
    return [t for t in toks if t]


def alignment_dict(a):
    """SDK alignment object / dict -> {'characters', 'character_start_times_seconds',
    'character_end_times_seconds'} (None if empty/absent)."""
    if a is None:
        return None
    if not isinstance(a, dict):
        if hasattr(a, 'model_dump'):
            a = a.model_dump()
        elif hasattr(a, 'dict'):
            a = a.dict()
        else:
            a = dict(vars(a))
    chars = a.get('characters') or []
    starts = (a.get('character_start_times_seconds') or a.get('characterStartTimesSeconds') or [])
    ends = (a.get('character_end_times_seconds') or a.get('characterEndTimesSeconds') or [])
    if not chars:
        return None
    return {'characters': [str(c) for c in chars],
            'character_start_times_seconds': [float(x) for x in starts],
            'character_end_times_seconds': [float(x) for x in ends]}


def merge_alignments(parts):
    """Concatenate per-chunk alignments (streaming responses). If a chunk's
    times restart near zero they're treated as chunk-relative and offset."""
    parts = [p for p in parts if p]
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0]
    out = {'characters': [], 'character_start_times_seconds': [], 'character_end_times_seconds': []}
    last_end = 0.0
    for p in parts:
        st, en = p['character_start_times_seconds'], p['character_end_times_seconds']
        off = last_end if (st and out['characters'] and st[0] < last_end - 0.05) else 0.0
        out['characters'] += p['characters']
        out['character_start_times_seconds'] += [x + off for x in st]
        out['character_end_times_seconds'] += [x + off for x in en]
        if out['character_end_times_seconds']:
            last_end = max(last_end, out['character_end_times_seconds'][-1])
    return out


def _typical_char_seconds(chars, starts, ends, n):
    """Median duration of one spoken character (robust to the few that carry a pause)."""
    ds = sorted((float(ends[i]) - float(starts[i])) / max(1, len(chars[i])) for i in range(n)
                if any(c.isalnum() for c in chars[i]) and float(ends[i]) > float(starts[i]))
    return ds[len(ds) // 2] if ds else 0.06


def alignment_to_words(al, pause_before=None):
    """Character alignment -> [{'text','start','end'}] of spoken words.
    Markup (<break .../>, <phoneme>..., or such a tag whose < > the API
    dropped) and whitespace chars are not spoken; they separate words. Word
    times use the first/last alphanumeric char, so trailing punctuation that
    absorbs a pause doesn't stretch a word. Punctuation-only tokens (a lone
    dash or ellipsis) are appended to the previous word's text.

    A pause folded into the letter next to it -- the silence of a <break>
    given to the next word's first letter (or the previous word's last) --
    is trimmed off: when that letter is far longer than normal (> max(0.35s,
    5x the median)) the word starts (ends) at its other edge. Only letters
    next to a pause are touched: next to markup in the alignment, or next to
    a written <break> (pause_before = word indexes that follow one, from
    break_positions -- for alignments without the tag characters). Digits
    are never trimmed ("2025" legitimately spans "twenty twenty-five")."""
    if not al:
        return []
    chars = al['characters']
    starts = al['character_start_times_seconds']
    ends = al['character_end_times_seconds']
    n = min(len(chars), len(starts))
    if len(ends) < n:
        ends = list(ends) + list(starts[len(ends):n])
    owner = []
    for i in range(n):
        owner.extend([i] * len(chars[i]))
    joined = ''.join(chars[:n])
    markup = [False] * n
    for rx in (TAG_RE, BARE_TAG_RE):
        for m in rx.finditer(joined):
            for off in range(m.start(), m.end()):
                markup[owner[off]] = True
    tokens, cur = [], []
    for i in range(n):
        if markup[i] or not chars[i].strip():
            if cur:
                tokens.append(cur)
                cur = []
            continue
        cur.append(i)
    if cur:
        tokens.append(cur)
    words, edges = [], []          # edges: (first, last) spoken char of each word
    for tok in tokens:
        text = ''.join(chars[i] for i in tok)
        spoken = [i for i in tok if any(c.isalnum() for c in chars[i])]
        if not spoken:
            if words:
                words[-1]['text'] += ' ' + text
            continue
        a, b = spoken[0], spoken[-1]
        s, e = float(starts[a]), float(ends[b])
        words.append({'text': text, 'start': round(s, 3), 'end': round(max(s, e), 3)})
        edges.append((a, b))

    typical = _typical_char_seconds(chars, starts, ends, n)

    def padded(i):
        """Expected length of letter(s) i when it holds a pause, else None."""
        exp = typical * max(1, len(chars[i]))
        long_ = float(ends[i]) - float(starts[i]) > max(0.35, 5 * exp)
        return exp if long_ and chars[i].isalpha() else None

    def markup_side(i, step):
        """Is the nearest non-blank char before (step -1) / after (+1) char i markup?"""
        k = i + step
        while 0 <= k < n and not markup[k] and not chars[k].strip():
            k += step
        return 0 <= k < n and markup[k]

    after_break = set(pause_before or ())
    for k, (a, b) in enumerate(edges):
        at_start = markup_side(a, -1) or k in after_break
        at_end = markup_side(b, 1) or (k + 1) in after_break
        if a == b and at_start:         # one letter ("A") between two pauses: the one before
            at_end = False
        w = words[k]
        pa, pb = padded(a) if at_start else None, padded(b) if at_end else None
        if pa is not None:
            w['start'] = round(max(float(starts[a]), float(ends[a]) - pa), 3)
        if pb is not None:
            w['end'] = round(min(float(ends[b]), float(starts[b]) + pb), 3)
        if pa is not None or pb is not None:
            w['end'] = max(w['end'], w['start'])
    return words


def word_gaps(words):
    """[(silence_seconds, index_of_word_after_gap)] between consecutive words."""
    return [(round(words[i]['start'] - words[i - 1]['end'], 3), i) for i in range(1, len(words))]


def break_positions(text, words):
    """{word_index: seconds} -- the <break> time written in the TTS text right
    before each spoken word, located in `words` by token alignment (works
    whether or not the API kept the tag characters in its alignment)."""
    toks, pend, pos = [], 0.0, 0
    pieces = []
    for m in TAG_RE.finditer(text):
        pieces += [(False, text[pos:m.start()]), (True, m.group(0))]
        pos = m.end()
    pieces.append((False, text[pos:]))
    for is_tag, s in pieces:
        if is_tag:
            if BREAK_RE.match(s):
                pend += _break_seconds(s)
            continue
        for raw in s.split():
            n = _norm_token(raw)
            if n:
                toks.append((n, pend))
                pend = 0.0
    if not any(b for _, b in toks) or not words:
        return {}
    tt = [n for n, _ in toks]
    wt = [_norm_token(w['text']) for w in words]
    if tt == wt:
        pairs = zip(range(len(tt)), range(len(wt)))
    else:
        pairs = ((b.a + k, b.b + k) for b in difflib.SequenceMatcher(None, tt, wt, autojunk=False)
                 .get_matching_blocks() for k in range(b.size))
    return {wi: round(toks[ti][1], 3) for ti, wi in pairs if wi > 0 and toks[ti][1] > 0}


def map_beats_to_words(beat_texts, words, certainty=False):
    """Word index at which each beat after the first starts, by aligning the
    beat texts' tokens with the spoken words (a beat whose first words were
    reworded maps to the start of the reworded run). None if it can't be done
    reliably. Every beat must have spoken text (pass narrated beats only).
    certainty=True -> (indexes, certain[]): certain = the words on both sides of
    that boundary match exactly (the two texts agree there)."""
    beat_tokens = [spoken_tokens(t) for t in beat_texts]
    if len(beat_tokens) < 2 or any(not bt for bt in beat_tokens):
        return None
    flat = [t for bt in beat_tokens for t in bt]
    wtoks = [_norm_token(w['text']) for w in words]
    bounds, acc = [], 0
    for bt in beat_tokens[:-1]:
        acc += len(bt)
        bounds.append(acc)
    if flat == wtoks:
        return (bounds, [True] * len(bounds)) if certainty else bounds
    sm = difflib.SequenceMatcher(None, flat, wtoks, autojunk=False)
    if sum(b.size for b in sm.get_matching_blocks()) < 0.8 * max(len(flat), len(wtoks)):
        return None
    ops = sm.get_opcodes()
    out, sure = [], []
    for k in bounds:
        j, ok = None, False
        for tag, i1, i2, j1, j2 in ops:
            if i1 <= k < i2:
                # equal: exact; replace: proportional (its first word when k starts it);
                # delete (beat words the audio lacks): the next spoken word
                j = j1 + (k - i1) if tag == 'equal' else \
                    j1 + round((k - i1) * (j2 - j1) / (i2 - i1)) if tag == 'replace' else j1
                ok = tag == 'equal' and k > i1       # the word before the boundary matched too
                break
        if j is None or j <= 0 or j >= len(words) or (out and j <= out[-1]):
            return None
        out.append(j)
        sure.append(ok)
    return (out, sure) if certainty else out


def _snap_to_pauses(est, words, breaks, threshold, notes, warns, labels, certain=None):
    """Check each text-derived boundary against the audio. A boundary stays when
    the texts agree around it (`certain`), or there is a real pause before it
    (a measured silence or a written <break> >= threshold, or any <break> at
    all). Otherwise the SSML and the beats block disagree right there (e.g.
    the SSML has a lead-in sentence the beats lack): the boundary moves to the
    nearest real pause in its neighbourhood (never into the next / previous
    boundary's share) and a warning says so. A boundary kept only because the
    texts agree, with no pause there while the SSML writes a <break> inside
    the neighbouring beat(s), is kept but warned about too."""
    L = len(words)
    certain = certain or [False] * len(est)

    def gap(j):
        return words[j]['start'] - words[j - 1]['end']

    def strong(j):
        return gap(j) >= threshold or breaks.get(j, 0.0) >= threshold

    def strength(j):
        return max(gap(j), breaks.get(j, 0.0))

    def at(j):
        return f'"{words[j]["text"]}" ({words[j]["start"]:.2f}s)'

    ok = [c or strong(e) or breaks.get(e, 0.0) > 0 for e, c in zip(est, certain)]
    out = []
    for k, e in enumerate(est):
        if ok[k]:
            out.append(e)
            if breaks and not strong(e) and not breaks.get(e):
                # the texts agree here, but the SSML's pause is elsewhere in the beat(s)
                lo, hi = (est[k - 1] if k else 0), (est[k + 1] if k + 1 < len(est) else L)
                moved = [j for j in range(lo + 1, hi) if j != e and breaks.get(j, 0.0) >= threshold]
                if moved:
                    j = min(moved, key=lambda j: (abs(j - e), j))
                    warns.append(f'Slide {labels[k]}: the beats block starts it at {at(e)}, but the SSML '
                                 f'has no <break> there -- its {breaks[j]:g}s <break> is before {at(j)}, '
                                 f'inside a beat. The cue follows the beats block, so that pause plays '
                                 f'mid-slide: move the <break> (or the beat boundary) so script.md\'s '
                                 f'two blocks match, or use --cue-method gaps to follow the pauses.')
            continue
        lo = out[-1] + 1 if out else 1
        if k and not ok[k - 1]:
            lo = max(lo, (est[k - 1] + e) // 2 + 1)
        if k + 1 == len(est):
            hi = L - 1
        elif ok[k + 1]:
            hi = est[k + 1] - 1
        else:
            hi = (e + est[k + 1]) // 2
        cands = [j for j in range(lo, hi + 1) if strong(j)]
        if cands:
            j = min(cands, key=lambda j: (abs(j - e), -strength(j), j))
            warns.append(f'Slide {labels[k]}: its beats-block text starts at "{words[e]["text"]}" '
                         f'({words[e]["start"]:.2f}s) but the pause in the audio is before '
                         f'"{words[j]["text"]}" ({words[j]["start"]:.2f}s) -- cue placed there. The SSML '
                         f'and beats blocks in script.md disagree; update the beats block.')
            out.append(j)
            continue
        out.append(e)
        if gap(e) < 0.15:
            notes.append(f'Slide {labels[k]} starts at {words[e]["start"]:.2f}s with only '
                         f'{max(gap(e), 0):.2f}s of silence before it -- was the <break> honoured?')
    return out


def _place_cues(words, n, voiced, vb, pauses, duration, notes, warns):
    """One cue per slide. A narrated slide starts at its first word. Slides
    with no narration (visual-only beats) share the silence they sit in --
    between the previous beat's last word and the next beat's first word, or
    after the last word -- split in proportion to the pause_after values."""
    pauses = [max(0.0, float(p)) for p in pauses] if pauses and len(pauses) == n else [0.7] * n
    first = dict(zip(voiced, [0] + list(vb)))        # slide index -> index of its first word
    cues = [None] * n
    for s, j in first.items():
        cues[s] = round(words[j]['start'], 2)
    cues[0] = 0.0
    i = 0
    while i < n:
        if i in first:
            i += 1
            continue
        run = []
        while i < n and i not in first:
            run.append(i)
            i += 1
        prv = run[0] - 1 if run[0] > 0 else None
        nxt = i if i < n else None
        if prv is None:                                   # before the first word
            s0, s1 = 0.0, words[first[nxt]]['start']
            holds = [pauses[r] for r in run]
            starts = [sum(holds[:k]) for k in range(len(run))]
        else:
            s0 = words[first[nxt] - 1]['end'] if nxt is not None else words[-1]['end']
            holds = [pauses[prv]] + [pauses[r] for r in run]
            starts = [sum(holds[:k + 1]) for k in range(len(run))]
            s1 = words[first[nxt]]['start'] if nxt is not None else \
                (duration if duration and duration > s0 else s0 + sum(holds))
        total = sum(holds)
        for k, r in enumerate(run):
            if r == 0:
                continue
            frac = starts[k] / total if total > 0 else (k + 1) / (len(run) + 1)
            t = s0 + (s1 - s0) * frac
            if nxt is not None:           # never on / past the next narrated slide's first word
                t = min(t, s1 - 0.05 * (len(run) - k))
            cues[r] = round(t, 2)
    for k in range(1, n):                                 # strictly increasing
        if cues[k] <= cues[k - 1]:
            cues[k] = round(cues[k - 1] + 0.01, 2)
    silent = [s for s in range(n) if s not in first]
    for s in silent:
        end = cues[s + 1] if s + 1 < n else max(duration or 0.0, words[-1]['end'])
        if end - cues[s] < 0.3:
            warns.append(f'Slide {s + 1} has no narration and gets only {max(0.0, end - cues[s]):.2f}s '
                         f'of audio -- give it a longer pause_after (seconds to hold) or a <break> '
                         f'in the SSML where it should appear.')
    placed = [f'{s + 1} @ {cues[s]:.2f}s' for s in silent if s]
    if placed:
        notes.append('Slides without narration placed inside the pauses: ' + ', '.join(placed))
    return cues


TIE_SECONDS = 0.02   # silences this close in length are "equally long"


def _check_gap_choice(words, top, rest, vb, labels, breaks, threshold, warns):
    """Warn when the longest silences picked as slide changes (`top`; `rest`
    = the ones left out, both longest first) are not clearly boundaries:
    some are shorter than the threshold with no <break> written there
    (ordinary sentence pauses -> the slide changes mid-beat), or the weakest
    one used is no longer than one left out (the pick is a guess)."""
    label = dict(zip(vb, labels))

    def at(i):
        return f'"{words[i]["text"]}" ({words[i]["start"]:.2f}s)'

    weak = sorted((i, g) for g, i in top if g < threshold and not breaks.get(i))
    if weak:
        warns.append(
            f'{len(top)} slide changes are needed but only {len(top) - len(weak)} pause(s) in the audio '
            f'are >= {threshold:g}s or at a <break>: slide(s) {_num_list(label[i] for i, _ in weak)} '
            f'start after short pauses ({", ".join(f"{g:.2f}s before {at(i)}" for i, g in weak)}) -- '
            f'probably mid-beat. Check the slide count (--slides / the deck), or mark the beats: '
            f'a ```json beats block, or <break>s between them.')
        return
    wg, wi = top[-1]
    tied = [(g, i) for g, i in rest
            if g >= wg - TIE_SECONDS and breaks.get(i, 0.0) >= breaks.get(wi, 0.0)]
    if tied:
        g, i = tied[0]
        warns.append(
            f'Slide {label[wi]} starts after a {wg:.2f}s pause before {at(wi)}, but an equally long '
            f'{g:.2f}s pause before {at(i)} was left out -- which of them is the slide change is a '
            f'guess. Mark the beats: a ```json beats block, or a longer <break> between beats '
            f'than inside them.')


def compute_cues(words, n_slides=None, beat_texts=None, gap_threshold=0.6, method='auto',
                 pauses=None, breaks=None, duration=None, warnings=None):
    """-> (cue_times [0.0, ...], method_used, notes[]).

    beat_texts : narration per slide ('' = a slide with no narration; it is
                 placed inside the pause before the next narrated slide).
    pauses     : each beat's pause_after (how such slides share a pause).
    breaks     : {word_index: <break> seconds} from the TTS text
                 (break_positions); text-derived boundaries are checked against
                 them and against the measured silences (_snap_to_pauses).
    duration   : audio length, for silent slides after the last word.
    warnings   : list that receives problems the user should fix (default:
                 they go to the returned notes)."""
    notes = []
    warns = notes if warnings is None else warnings
    if not words:
        return [], 'none', ['No word timings available -- cannot derive slide cues.']
    breaks = breaks or {}
    gaps = word_gaps(words)
    structured = bool(beat_texts) and (n_slides is None or len(beat_texts) == n_slides) \
        and method != 'threshold'
    voiced = [i for i, t in enumerate(beat_texts) if spoken_tokens(t)] if structured else []
    structured = structured and bool(voiced)
    vb, used = None, None           # first-word index of each narrated beat after the first
    if structured and method in ('auto', 'text'):
        if len(voiced) == 1:
            vb, used = [], 'text'
        else:
            mapped = map_beats_to_words([beat_texts[i] for i in voiced], words, certainty=True)
            if mapped is not None:
                vb = _snap_to_pauses(mapped[0], words, breaks, gap_threshold, notes, warns,
                                     [s + 1 for s in voiced[1:]], mapped[1])
                used = 'text'
            elif method == 'text':
                notes.append('Could not align the beat texts with the spoken words; falling back.')
    elif method == 'text':
        notes.append('Text alignment needs beat texts matching the slide count; falling back.')
    if vb is None and n_slides and method in ('auto', 'text', 'gaps'):
        want = max(0, (len(voiced) if structured else n_slides) - 1)
        if want > len(gaps):
            notes.append(f'Only {len(words)} words -- cannot place {n_slides} slides.')
        # longest silences first; between equal ones, a written <break> wins
        ranked = sorted(gaps, key=lambda g: (-g[0], -breaks.get(g[1], 0.0), g[1]))
        top, rest = ranked[:want], ranked[want:]
        vb, used = sorted(i for _, i in top), 'gaps'
        if top:
            notes.append(f'Shortest boundary silence used: {min(g for g, _ in top):.2f}s; '
                         f'longest silence not used: {max([g for g, _ in rest] or [0.0]):.2f}s.')
        if structured and len(vb) != len(voiced) - 1:
            structured = False
        if top:
            _check_gap_choice(words, top, rest, vb, [s + 1 for s in voiced[1:]] if structured
                              else list(range(2, len(vb) + 2)), breaks, gap_threshold, warns)
    if vb is None:
        if method == 'gaps':
            notes.append('--cue-method gaps needs a slide count (--slides / beats / --apply deck); '
                         'using the silence threshold instead.')
        vb, used, structured = [i for g, i in gaps if g >= gap_threshold], 'threshold', False
    if structured:
        return _place_cues(words, len(beat_texts), voiced, vb, pauses, duration, notes, warns), used, notes
    return [0.0] + [round(words[i]['start'], 2) for i in vb], used, notes


def apply_offset(cues, offset):
    if not offset:
        return cues
    out = [0.0]
    for t in cues[1:]:
        out.append(round(max(out[-1] + 0.01, t + offset, 0.0), 2))
    return out


# --------------------------------------------------------------------------
# MP3 duration (frame walk; no external tools)
# --------------------------------------------------------------------------

_MP3_BITRATES = {
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],   # MPEG-1 L3
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],       # MPEG-2/2.5 L3
}
_MP3_RATES = {3: (44100, 48000, 32000), 2: (22050, 24000, 16000), 0: (11025, 12000, 8000)}


def mp3_duration(data):
    """Duration in seconds of an MPEG Layer III stream, or None if unparseable."""
    n, i = len(data), 0
    if n >= 10 and data[:3] == b'ID3':
        size = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | ((data[8] & 0x7f) << 7) | (data[9] & 0x7f)
        i = 10 + size + (10 if data[5] & 0x10 else 0)
    samples, rate, first = 0, None, True
    while i + 4 <= n:
        b1, b2 = data[i + 1], data[i + 2]
        if data[i] != 0xFF or (b1 & 0xE0) != 0xE0:
            i += 1
            continue
        ver, layer = (b1 >> 3) & 3, (b1 >> 1) & 3
        bri, sri, pad = b2 >> 4, (b2 >> 2) & 3, (b2 >> 1) & 1
        if ver == 1 or layer != 1 or bri in (0, 15) or sri == 3:
            i += 1
            continue
        mpeg1 = ver == 3
        sr = _MP3_RATES[ver][sri]
        flen = (144 if mpeg1 else 72) * _MP3_BITRATES[1 if mpeg1 else 2][bri] * 1000 // sr + pad
        if first:
            first = False
            head = data[i:i + min(flen, 200)]
            if b'Xing' in head or b'Info' in head or b'VBRI' in head:   # VBR/LAME header frame
                i += flen
                continue
        samples += 1152 if mpeg1 else 576
        rate = sr
        i += flen
    return round(samples / rate, 3) if rate else None


# --------------------------------------------------------------------------
# ElevenLabs client
# --------------------------------------------------------------------------

def api_key_from_env():
    """ELEVENLABS_API_KEY, trimmed of whitespace and of quotes pasted along with
    it (`$env:ELEVENLABS_API_KEY='"sk_..."'`). None when unset / empty."""
    key = (os.environ.get('ELEVENLABS_API_KEY') or '').strip().strip('"\'').strip()
    return key or None


def make_client(api_key):
    try:
        ElevenLabs = _quiet_import(lambda: __import__('elevenlabs.client', fromlist=['ElevenLabs']).ElevenLabs)
    except ImportError:
        die(SDK_MISSING_MSG)
    except Exception as e:
        die(f'The ElevenLabs SDK failed to import ({type(e).__name__}: {e}).\n'
            f'  Try upgrading it:  python -m pip install -U elevenlabs')
    return ElevenLabs(api_key=api_key)


def make_voice_settings(args):
    kw = dict(stability=args.stability, similarity_boost=args.similarity, style=args.style,
              use_speaker_boost=not args.no_speaker_boost, speed=args.speed)
    try:
        VoiceSettings = _quiet_import(lambda: __import__('elevenlabs', fromlist=['VoiceSettings']).VoiceSettings)
        return VoiceSettings(**kw)
    except Exception:
        return kw


def api_error_message(e, what):
    status = getattr(e, 'status_code', None)
    body = getattr(e, 'body', None)
    detail = body
    if isinstance(body, dict):
        detail = body.get('detail', body)
    code, message = None, None
    if isinstance(detail, dict):
        code, message = detail.get('status') or detail.get('code'), detail.get('message')
    elif detail is not None:
        message = str(detail)
    if status is None and not message:
        return f'{what} failed: {type(e).__name__}: {e} (network problem? check your connection)'
    hint = {
        401: 'authentication failed -- check that ELEVENLABS_API_KEY is a valid key',
        402: 'payment required -- your plan/credits do not cover this request',
        403: 'forbidden -- the key lacks permission for this endpoint',
        404: 'not found -- check --voice (run --list-voices) and --model',
        422: 'the request was rejected (invalid parameter or text)',
        429: 'rate limited / too many concurrent requests -- wait and retry',
    }.get(status, 'ElevenLabs returned an error')
    if code in ('quota_exceeded',):
        hint = 'quota exceeded -- not enough characters left on your plan'
    if code in ('voice_not_found',):
        hint = 'voice not found -- run --list-voices to see available voices'
    if code in ('missing_permissions',):
        hint = ('the API key is missing a permission this request needs -- edit the key\'s '
                'permissions at https://elevenlabs.io/app/settings/api-keys')
    parts = [f'{what} failed (HTTP {status}): {hint}.']
    if code or message:
        parts.append(f'  ElevenLabs says: {code + ": " if code else ""}{message or ""}'.rstrip())
    return '\n'.join(parts)


def _voice_base_name(name):
    return re.split(r'\s+[-|(]\s*|\s*,', (name or '').strip(), maxsplit=1)[0].strip().lower()


def _match_voice(voices, target):
    exact = [v for v in voices if (_field(v, 'name') or '').strip().lower() == target]
    if exact:
        return exact[0]
    base = [v for v in voices if _voice_base_name(_field(v, 'name')) == target]
    return base[0] if base else None


def _short_err(e):
    s = getattr(e, 'status_code', None)
    if not s:
        return f'{type(e).__name__}: {e}'
    body = getattr(e, 'body', None)
    detail = body.get('detail') if isinstance(body, dict) else None
    code = (detail.get('status') or detail.get('code')) if isinstance(detail, dict) else None
    return f'HTTP {s}' + (f' {code}' if code else '')


def _get_all_voices(client):
    try:
        return client.voices.get_all(show_legacy=True)   # legacy premades (Adam, Rachel...) too
    except TypeError:
        return client.voices.get_all()


def resolve_voice(client, voice):
    """-> (voice_id, display_name). Accepts a 20-char voice id, or a name looked up
    via voices.search / voices.get_all (case-insensitive; 'Brian' matches
    'Brian - Deep, Resonant'), falling back to the legacy premade table."""
    v = (voice or '').strip()
    if VOICE_ID_RE.fullmatch(v):
        return v, v
    target = v.lower()
    errors, excs, listed = [], [], False
    for label, call in (('voices.search', lambda: client.voices.search(search=v, page_size=100)),
                        ('voices.get_all', lambda: _get_all_voices(client))):
        try:
            res = call()
        except Exception as e:  # permission-scoped keys may not allow voices_read
            errors.append(f'{label}: {_short_err(e)}')
            excs.append(e)
            continue
        listed = True
        match = _match_voice(list(_field(res, 'voices') or []), target)
        if match is not None:
            return _field(match, 'voice_id'), _field(match, 'name') or v
    if target in LEGACY_VOICES:
        if errors:
            warn(f'Voice lookup failed ({"; ".join(errors)}); using the built-in id for {v!r}.')
        return LEGACY_VOICES[target], v
    if not listed:
        # Every lookup errored: this is an auth / permission / network problem,
        # not "no such voice" -- say so, and offer the id route (no voices_read needed).
        die(api_error_message(excs[0], f'Looking up voice {v!r} by name') + '\n'
            f'  Lookup errors: {"; ".join(errors)}.\n'
            f'  A restricted key needs the "Voices: Read" permission to look voices up by name.\n'
            f'  Or skip the lookup: pass the voice id, e.g. --voice pNInz6obpgDQGcFmaJgB '
            f'(ids are shown in the ElevenLabs Voice Library / "Copy voice ID").')
    extra = f' Lookup errors: {"; ".join(errors)}.' if errors else ''
    die(f'Voice {v!r} not found in your ElevenLabs voices.{extra}\n'
        f'  Run with --list-voices to see names, or pass a voice id (20 characters).')


def list_voices(client):
    voices, errors = [], []
    try:
        token = None
        for _ in range(20):
            res = client.voices.search(page_size=100, next_page_token=token) if token else \
                client.voices.search(page_size=100)
            voices += list(_field(res, 'voices') or [])
            token = _field(res, 'next_page_token')
            if not _field(res, 'has_more') or not token:
                break
    except Exception as e:
        errors.append(f'voices.search: {_short_err(e)}')
    if not voices:
        try:
            voices = list(_field(_get_all_voices(client), 'voices') or [])
        except Exception as e:
            errors.append(f'voices.get_all: {_short_err(e)}')
    if not voices:
        die('Could not list voices' + (f' ({"; ".join(errors)})' if errors else '') + '.'
            + ('\n  A restricted API key needs the "Voices: Read" permission; an HTTP 401 '
               'invalid_api_key means ELEVENLABS_API_KEY itself is wrong.' if errors else ''))
    print(f'{"name":40s}  {"voice_id":22s}  {"category":12s}  labels')
    for v in sorted(voices, key=lambda x: (_field(x, 'name') or '').lower()):
        labels = _field(v, 'labels') or {}
        lab = ', '.join(f'{k}={val}' for k, val in labels.items()) if isinstance(labels, dict) else ''
        print(f'{(_field(v, "name") or "")[:40]:40s}  {_field(v, "voice_id") or "":22s}  '
              f'{str(_field(v, "category") or ""):12s}  {lab}')
    return len(voices)


def synthesize(client, voice_id, text, args):
    kwargs = dict(voice_id=voice_id, text=text, model_id=args.model,
                  voice_settings=make_voice_settings(args), output_format=args.output_format)
    if args.seed is not None:
        kwargs['seed'] = args.seed
    try:
        return client.text_to_speech.convert_with_timestamps(**kwargs)
    except Exception as e:
        die(api_error_message(e, 'ElevenLabs text-to-speech'))


# --------------------------------------------------------------------------
# response handling -- audio first, alignment second
# --------------------------------------------------------------------------

_AUDIO_FIELDS = ('audio_base_64', 'audio_base64', 'audioBase64')


def _decode_audio(v):
    if v is None:
        return b''
    if isinstance(v, (bytes, bytearray, memoryview)):
        return bytes(v)
    return base64.b64decode(v)


def take_audio(resp):
    """-> (mp3_bytes, parts) where parts are the objects that may carry an
    alignment. Handles the SDK object (audio_base_64, or the older
    audio_base64), dicts, raw bytes and iterators of chunks."""
    if isinstance(resp, (bytes, bytearray, memoryview)):
        return bytes(resp), []
    if isinstance(resp, str):
        return _decode_audio(resp), []
    if isinstance(resp, dict) or any(hasattr(resp, f) for f in _AUDIO_FIELDS + ('alignment',)):
        return _decode_audio(_field(resp, *_AUDIO_FIELDS)), [resp]
    if hasattr(resp, 'model_dump') or isinstance(resp, tuple):
        # a pydantic model iterates as (field, value) pairs -- never audio chunks
        raise TypeError(f'{type(resp).__name__} has no audio_base_64 / audio_base64 field')
    if hasattr(resp, '__iter__'):
        audio, parts = bytearray(), []
        for chunk in resp:
            a, p = take_audio(chunk)
            audio += a
            parts += p
        return bytes(audio), parts
    raise TypeError(f'unrecognised response type {type(resp).__name__}')


def take_alignment(parts):
    """-> (alignment, normalized_alignment) as plain dicts (or None)."""
    al, nal = [], []
    for p in parts:
        try:
            al.append(alignment_dict(_field(p, 'alignment')))
        except Exception as e:
            warn(f'Could not read the alignment ({type(e).__name__}: {e}).')
        try:
            nal.append(alignment_dict(_field(p, 'normalized_alignment', 'normalizedAlignment')))
        except Exception as e:
            warn(f'Could not read the normalized alignment ({type(e).__name__}: {e}).')
    return merge_alignments(al), merge_alignments(nal)


def save_audio(path, audio):
    """Write the paid-for MP3 -> the path actually written. If `path` can't be
    written (file locked by a player, read-only folder...), the MP3 goes to a
    fresh temp folder instead so the take is never lost."""
    try:
        path.write_bytes(audio)
        return path
    except OSError as e:
        import tempfile
        rescue = Path(tempfile.mkdtemp(prefix='elevenlabs_')) / path.name
        rescue.write_bytes(audio)
        warn(f'Could not write {path} ({e}). Saved the audio to {rescue} instead; the JSON files '
             f'go there too and the deck is NOT touched. That is a temp folder Windows may clean '
             f'up: fix the problem (close the player holding the file, make the folder writable), '
             f'COPY every file from "{rescue.parent}" into "{path.parent}", then re-run with '
             f'"{path.parent}" as out_dir plus --reuse (no new API call) to derive the cues and '
             f'update the deck.')
        return rescue


def dumps_word_timestamps(ts):
    """word_timestamps.json text: header keys first, one word / cue per line."""
    def arr(items):
        if not items:
            return '[]'
        return '[\n' + ',\n'.join('    ' + json.dumps(x, ensure_ascii=False) for x in items) + '\n  ]'
    head = [f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}'
            for k, v in ts.items() if k not in ('words', 'cues')]
    return ('{\n' + ',\n'.join(head + [f'  "words": {arr(ts.get("words", []))}',
                                       f'  "cues": {arr(ts.get("cues", []))}']) + '\n}\n')


def _dump_unknown(resp, path):
    try:
        if hasattr(resp, 'model_dump'):
            data = resp.model_dump()
        elif isinstance(resp, dict):
            data = resp
        else:
            data = {'repr': repr(resp)[:100000]}
        path.write_text(json.dumps(data, indent=2, default=str), encoding='utf-8')
        return True
    except Exception:
        return False


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('script', nargs='?', help='Path to script.md')
    ap.add_argument('out_dir', nargs='?',
                    help='Output directory for the MP3 + JSON (default: the --apply deck\'s folder, '
                         'else the script\'s folder)')
    ap.add_argument('--voice', default=DEFAULT_VOICE,
                    help=f'Voice name (looked up in your ElevenLabs voices) or voice id (default: {DEFAULT_VOICE})')
    ap.add_argument('--list-voices', action='store_true', help='List the voices your key can use and exit')
    ap.add_argument('--model', default=DEFAULT_MODEL,
                    help=f'Model id (default: {DEFAULT_MODEL} -- honours <break> tags)')
    ap.add_argument('--speed', type=float, default=0.90,
                    help='Speaking speed, 0.7-1.2 (default 0.90; lower is slower)')
    ap.add_argument('--stability', type=float, default=0.55, help='Voice stability 0-1 (default 0.55)')
    ap.add_argument('--similarity', type=float, default=0.75, help='Similarity boost 0-1 (default 0.75)')
    ap.add_argument('--style', type=float, default=0.10, help='Style exaggeration 0-1 (default 0.10)')
    ap.add_argument('--no-speaker-boost', action='store_true', help='Turn speaker boost off (default on)')
    ap.add_argument('--seed', type=int, default=None, help='Sampling seed, for more repeatable takes')
    ap.add_argument('--output-format', default=DEFAULT_OUTPUT_FORMAT,
                    choices=['mp3_44100_128', 'mp3_44100_192', 'mp3_44100_96', 'mp3_44100_64'],
                    help=f'ElevenLabs MP3 format (default {DEFAULT_OUTPUT_FORMAT})')
    ap.add_argument('--out-name', '--mp3-name', dest='out_name', default=DEFAULT_OUT_NAME,
                    help=f'Output MP3 filename (default {DEFAULT_OUT_NAME})')
    ap.add_argument('--slides', type=int, default=None,
                    help='Slide count N (default: beats block, else the --apply deck)')
    ap.add_argument('--cue-method', choices=['auto', 'text', 'gaps', 'threshold'], default='auto',
                    help='How slide boundaries are found (default auto: text, then gaps, then threshold)')
    ap.add_argument('--gap-threshold', type=float, default=0.6,
                    help='Silence / <break> length (s) that counts as a slide boundary when the '
                         'slide count is unknown (default 0.6)')
    ap.add_argument('--offset', type=float, default=0.0,
                    help='Seconds added to every cue after slide 1 (negative = visuals lead audio)')
    ap.add_argument('--apply', metavar='HTML',
                    help='Rewrite const TIMINGS + const WORDS (and the <audio> src) in this deck; '
                         'backs it up first to <deck>.bak (or .bak2, ... -- never overwritten)')
    ap.add_argument('--keep-src', action='store_true',
                    help='With --apply: leave the deck\'s <audio src> alone (default: point it at the new MP3)')
    ap.add_argument('--dry-run', action='store_true', help='Parse and report; do not call the API')
    ap.add_argument('--reuse', action='store_true',
                    help=f'Skip the API: re-derive words/cues from <out_dir>/{RAW_NAME}')
    return ap


def _validate_settings(args):
    if not 0.7 <= args.speed <= 1.2:
        die(f'--speed {args.speed} is outside ElevenLabs\' range 0.7-1.2.')
    for name in ('stability', 'similarity', 'style'):
        v = getattr(args, name)
        if not 0.0 <= v <= 1.0:
            die(f'--{name} {v} must be between 0 and 1.')
    if args.slides is not None and args.slides < 1:
        die('--slides must be >= 1.')
    if args.gap_threshold <= 0:
        die('--gap-threshold must be > 0 seconds.')


def _deck_preflight(deck_path):
    """Read the deck and prove TIMINGS / WORDS can be written -- before paying."""
    if not deck_path.is_file():
        die(f'--apply deck not found: {deck_path}')
    try:
        html = deck_path.read_text(encoding='utf-8-sig')
    except (OSError, UnicodeDecodeError) as e:
        die(f'Cannot read {deck_path} as UTF-8 text ({e}).')
    try:
        sb_deckio.write_words(sb_deckio.write_timings(html, [0.0]), [])
    except sb_deckio.DeckIOError as e:
        die(f'Cannot rewrite {deck_path.name}: {e}')
    if not os.access(deck_path, os.W_OK):
        die(f'{deck_path} is read-only -- make it writable before generating (the deck is '
            f'rewritten after the paid API call).')
    return html


def _in_temp_dir(path):
    import tempfile
    try:
        tmp = Path(tempfile.gettempdir()).resolve()
        p = Path(path).resolve()
        return p == tmp or tmp in p.parents
    except (OSError, ValueError):
        return False


def _audio_src_update(deck_path, deck_html, mp3_path):
    """New src for the deck's <audio> if it doesn't already point at mp3_path."""
    if _in_temp_dir(mp3_path) and not _in_temp_dir(deck_path):
        warn(f'{mp3_path} is in a temp folder that may be cleaned up; <audio> src left unchanged. '
             f'Copy the MP3 (and the JSON files) next to the deck and re-run with --reuse there.')
        return None
    cur = sb_deckio.read_audio_src(deck_html)
    if cur and re.match(r'^[a-z][a-z0-9+.-]*:', cur, re.IGNORECASE) and not cur.lower().startswith('file:'):
        warn(f'Deck audio src is {cur!r} (a URL) -- left unchanged; point it at {mp3_path.name}.')
        return None
    if cur and '{{' not in cur:
        try:
            if (deck_path.parent / unquote(cur.split('?')[0].split('#')[0])).resolve() == mp3_path.resolve():
                return None
        except (OSError, ValueError):
            pass
    try:
        rel = os.path.relpath(mp3_path.resolve(), deck_path.parent.resolve()).replace(os.sep, '/')
    except ValueError:        # different drive on Windows
        warn(f'{mp3_path} is on another drive than the deck; <audio> src left unchanged.')
        return None
    return quote(rel, safe="/:@!$&'()*+,;=-._~")


def main(argv=None):
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(errors='replace')
        except Exception:
            pass
    args = build_parser().parse_args(argv)
    _validate_settings(args)

    if args.list_voices:
        api_key = api_key_from_env()
        if not api_key:
            die(KEY_MISSING_MSG)
        list_voices(make_client(api_key))
        return 0

    deck_path = Path(args.apply) if args.apply else None
    deck_html = _deck_preflight(deck_path) if deck_path else None
    deck_slides = sb_deckio.count_slides(deck_html) if deck_html is not None else 0

    if args.out_dir:
        out_dir = Path(args.out_dir)
    elif deck_path:
        out_dir = deck_path.parent
    elif args.script:
        out_dir = Path(args.script).parent
    else:
        build_parser().print_usage(sys.stderr)
        die('Give a script.md (or --list-voices).')
    if out_dir.exists() and not out_dir.is_dir():
        die(f'out_dir {out_dir} is a file, not a folder.'
            + (f' Did you mean --apply {args.out_dir} ?' if out_dir.suffix.lower() in ('.html', '.htm')
               else '')
            + '\n  Usage: python elevenlabs_generate.py script.md [out_dir] [--apply deck.html]')
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        die(f'Cannot create the output folder {out_dir}: {e.strerror or e}')
    mp3_path = out_dir / args.out_name
    raw_path = out_dir / RAW_NAME

    raw, rescued = None, False
    if args.reuse:
        if not raw_path.is_file():
            die(f'--reuse: {raw_path} not found (run once without --reuse first).')
        try:
            raw = json.loads(raw_path.read_text(encoding='utf-8'))
        except (OSError, ValueError) as e:
            die(f'--reuse: cannot read {raw_path} ({e}).')
        if not isinstance(raw, dict):
            die(f'--reuse: {raw_path} is not an {RAW_NAME} written by this tool.')
        if raw.get('audio') and args.out_name == DEFAULT_OUT_NAME:
            mp3_path = out_dir / raw['audio']
    if args.script:
        script = load_script(args.script)
    elif raw is not None:
        script = {'text': raw.get('text', ''), 'beats': None, 'source': RAW_NAME}
    else:
        die('Give the path to script.md.')

    text, beats = script['text'], script['beats']
    info(f'[ok] Narration: {len(text)} chars from {script["source"]} block'
         + (f', {len(beats)} beats' if beats else ''))
    if raw is not None and raw.get('text') and spoken_tokens(raw['text']) != spoken_tokens(text):
        warn(f'The narration in {args.script} differs from the text {RAW_NAME} was generated from; '
             f'cues follow the saved audio (re-run without --reuse to re-record).')

    # slide count: --slides > beats block > deck
    if args.slides:
        n_slides, n_src = args.slides, '--slides'
    elif beats:
        n_slides, n_src = len(beats), 'beats block'
    elif deck_slides:
        n_slides, n_src = deck_slides, deck_path.name
    else:
        n_slides, n_src = None, None
    if args.slides and beats and len(beats) != args.slides:
        warn(f'--slides {args.slides} overrides the beats block ({len(beats)} beats): cues come from '
             f'the SSML <break>s / the longest pauses, not from the beat texts.')
    beat_nums = [b['slide'] for b in beats] if beats else []
    if beats and deck_slides and (len(set(beat_nums)) != deck_slides or max(beat_nums) > deck_slides):
        warn(f'script has {len(beats)} beats but {deck_path.name} has {deck_slides} slides'
             + ('.' if beat_nums == list(range(1, len(beats) + 1))
                else f' (the beats use slides {_num_list(sorted(set(beat_nums)))}).'))
    if beats and beat_nums != list(range(1, len(beats) + 1)):
        info(f'[ok] Beats block numbers its slides {_num_list(beat_nums)} -- TIMINGS uses those numbers.')
    beat_texts = [b['text'] for b in beats] if beats else None
    if not beat_texts or (n_slides and len(beat_texts) != n_slides):
        implied = split_on_breaks(text, args.gap_threshold)
        if len(implied) >= 2 and (n_slides is None or len(implied) == n_slides):
            beat_texts = implied
        elif len(implied) >= 2 and not beats:
            # the SSML's own beat structure and the slide count disagree: say so
            msg = (f'The SSML has {len(implied)} beats (split at <break>s >= {args.gap_threshold:g}s) '
                   f'but {n_src} says {n_slides} slides. Cues follow the {n_slides}-slide count (the '
                   f'{n_slides - 1} longest pauses), so some slide changes may land on ordinary sentence '
                   f'pauses. Match the two: fix the deck, pass --slides {len(implied)}, or add a ```json '
                   f'{{"beats": [...]}} block (one entry per slide) to '
                   f'{Path(args.script or RAW_NAME).name}.')
            if n_src == '--slides':          # asked for explicitly: just a note
                print(f'[note] {msg}', file=sys.stderr)
            else:
                warn(msg)
    from_beats = bool(beats) and beat_texts is not None and len(beat_texts) == len(beats) \
        and beat_texts == [b['text'] for b in beats]
    if n_slides:
        info(f'[ok] Slide count: {n_slides} (from {n_src})')
    elif beat_texts:
        info(f'[ok] Slide count: {len(beat_texts)} (SSML split at <break> >= {args.gap_threshold}s)')
    if from_beats:
        silent = [i + 1 for i, b in enumerate(beats) if not spoken_tokens(b['text'])]
        if silent:
            info(f'[ok] Slide(s) {_num_list(silent)} have no narration: each is cued inside the pause '
                 f'before the next narrated slide (hold = its pause_after).')
        if script['source'] == 'ssml':
            diff = _first_difference(spoken_tokens(text), [t for b in beats for t in spoken_tokens(b['text'])])
            if diff:
                print(f'[note] The SSML block and the beats block do not say the same words ({diff}). '
                      f'The audio follows the SSML; cues are checked against its pauses. Keep the two '
                      f'blocks in sync.', file=sys.stderr)

    if len(text) > MAX_CHARS and 'multilingual_v2' in args.model:
        warn(f'Narration is {len(text)} chars; {args.model} accepts up to {MAX_CHARS} per request.')
    if 'v3' in args.model and BREAK_RE.search(text):
        warn(f'{args.model} does not honour <break> tags; use eleven_multilingual_v2 for SSML pauses.')
    long_breaks = [b for b in BREAK_RE.findall(text) if _break_seconds(b) > MAX_BREAK]
    if long_breaks:
        warn(f'{len(long_breaks)} <break> tag(s) exceed ElevenLabs\' {MAX_BREAK:g}s maximum '
             f'(e.g. {long_breaks[0]}); split the pause or shorten it.')

    if args.dry_run:
        info(f'[dry-run] voice={args.voice} model={args.model} speed={args.speed} '
             f'stability={args.stability} similarity={args.similarity} style={args.style} '
             f'speaker_boost={not args.no_speaker_boost} -> {mp3_path}')
        info('[dry-run] No API call made.')
        return 0

    if raw is None:
        api_key = api_key_from_env()
        if not api_key:
            die(KEY_MISSING_MSG)
        client = make_client(api_key)
        voice_id, voice_name = resolve_voice(client, args.voice)
        info(f'[..] Calling ElevenLabs (voice={voice_name} -> {voice_id}, model={args.model}, '
             f'speed={args.speed})...')
        resp = synthesize(client, voice_id, text, args)

        # 1) Audio to disk FIRST -- the call is paid; nothing below may lose it.
        try:
            audio, parts = take_audio(resp)
        except Exception as e:
            dump = out_dir / 'tts_response_raw.json'
            saved = _dump_unknown(resp, dump)
            die(f'Could not read audio from the ElevenLabs response ({type(e).__name__}: {e}).'
                + (f' Raw response saved to {dump}.' if saved else ''))
        if not audio:
            dump = out_dir / 'tts_response_raw.json'
            _dump_unknown(resp, dump)
            die(f'ElevenLabs returned no audio. Raw response saved to {dump}.')
        written = save_audio(mp3_path, audio)
        if written != mp3_path:
            rescued = True
            mp3_path, out_dir = written, written.parent
            raw_path = out_dir / RAW_NAME
        info(f'[ok] Wrote {mp3_path} ({len(audio):,} bytes)')

        # 2) Raw alignment next, so --reuse can re-derive cues without paying again.
        alignment, normalized = take_alignment(parts)
        vs = make_voice_settings(args)
        raw = {'source': 'elevenlabs', 'audio': mp3_path.name, 'voice': voice_name,
               'voice_id': voice_id, 'model': args.model, 'output_format': args.output_format,
               'voice_settings': vs.model_dump() if hasattr(vs, 'model_dump') else vs,
               'text': text, 'alignment': alignment, 'normalized_alignment': normalized}
        try:
            raw_path.write_text(json.dumps(raw, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            info(f'[ok] Wrote {raw_path}')
        except (OSError, TypeError, ValueError) as e:
            warn(f'Could not write {raw_path} ({type(e).__name__}: {e}); --reuse will not work.')
    else:
        alignment = alignment_dict(raw.get('alignment'))
        normalized = alignment_dict(raw.get('normalized_alignment'))
        info(f'[ok] Reusing {raw_path} (no API call)')

    # 3) Words + cues
    al = alignment or normalized
    if alignment is None and normalized is not None:
        warn('Response had no `alignment`; using `normalized_alignment` (text may be normalised).')
    sent = (raw.get('text') if args.reuse else None) or text      # the text the audio was made from
    words = alignment_to_words(al)
    breaks = break_positions(sent, words)
    if breaks:                  # trim pauses folded into the letters next to each <break>
        words = alignment_to_words(al, pause_before=breaks)
    if not al:
        warn('ElevenLabs returned no character alignment -- no word timings or slide cues. '
             'The MP3 is saved; set TIMINGS by hand or re-run.')

    try:
        duration = mp3_duration(mp3_path.read_bytes()) if mp3_path.is_file() else None
    except OSError:
        duration = None
    last = max([w['end'] for w in words] + (al['character_end_times_seconds'] if al else []) + [0.0])
    if duration is None or duration < last:
        duration = round(last, 3)

    cue_warnings = []
    cues, method, notes = compute_cues(
        words, n_slides=n_slides, beat_texts=beat_texts, gap_threshold=args.gap_threshold,
        method=args.cue_method, pauses=[b['pause_after'] for b in beats] if from_beats else None,
        breaks=breaks, duration=duration, warnings=cue_warnings)
    cues = apply_offset(cues, args.offset)
    for w in cue_warnings:
        warn(w)
    for n in notes:
        print(f'[note] {n}', file=sys.stderr)
    # slide numbers: the beats block's own numbers when the cues follow its beats
    nums = beat_nums if (from_beats and method in ('text', 'gaps') and len(cues) == len(beats)) \
        else list(range(1, len(cues) + 1))
    timings = [{'time': t, 'slide': s} for t, s in zip(cues, nums)]

    ts = {'source': 'elevenlabs', 'audio': mp3_path.name, 'duration': duration,
          'words': words, 'cues': [{'slide': c['slide'], 'time': c['time']} for c in timings]}
    ts_path = out_dir / WORDS_NAME
    exit_code = 0
    try:
        ts_path.write_text(dumps_word_timestamps(ts), encoding='utf-8')
        info(f'[ok] Wrote {ts_path} ({len(words)} words, {duration:.2f}s)')
    except OSError as e:
        exit_code = 1
        warn(f'Could not write {ts_path} ({e.strerror or e}) -- is it open or read-only? '
             f'The MP3 and {RAW_NAME} are saved: fix it and re-run with --reuse (no new API call).')
    if cues:
        info(f'[ok] {len(cues)} slide cues (method: {method})')
    else:
        exit_code = 1          # a take without cues is not a success, --apply or not

    if n_slides and cues and len(cues) != n_slides:
        warn(f'Expected {n_slides} slides ({n_src}) but derived {len(cues)} cues.')

    if cues:
        print()
        print(sb_deckio.format_timings(timings))

    if deck_path:
        if not cues:
            warn(f'No cues derived -- {deck_path} left unchanged.')
            return 1
        if rescued:
            warn(f'{deck_path} left unchanged (the MP3 could not be written to its output folder).')
            return 1
        src = None if args.keep_src else _audio_src_update(deck_path, deck_html, mp3_path)
        saved = (f'The MP3 and {RAW_NAME} are saved in {out_dir}; fix the deck, then re-run with '
                 f'--reuse --apply (no new API call).')
        try:
            rep = sb_deckio.apply_to_deck(deck_path, timings=timings, words=words, audio_src=src)
        except sb_deckio.DeckIOError as e:
            die(f'Could not rewrite {deck_path}: {e}\n  {saved}')
        except (OSError, UnicodeError) as e:
            die(f'Could not write {deck_path} ({getattr(e, "strerror", None) or e}) -- is it open in '
                f'another program, locked or read-only?\n  {saved}')
        for w in rep['warnings']:
            warn(f'{deck_path.name}: {w}')
        for n in rep['notes']:
            print(f'[note] {deck_path.name}: {n}', file=sys.stderr)
        if src:
            info(f'[ok] <audio> src -> {src!r}')
        info(f'[ok] Rewrote TIMINGS ({len(cues)}) + WORDS ({len(words)}) in {deck_path}'
             + (f' (backup: {Path(rep["backup"]).name})' if rep['backup'] else ''))
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
