#!/usr/bin/env python
"""
aaf_to_timings.py
Extract slide cue times from an AAF and emit a TIMINGS JS block
that you can paste into a storyboard.html.

Usage:
    python aaf_to_timings.py <path-to-aaf>
    python aaf_to_timings.py <path-to-aaf> --min-length 2.0
    python aaf_to_timings.py <path-to-aaf> --slides 15
    python aaf_to_timings.py <path-to-aaf> --all
    python aaf_to_timings.py <path-to-aaf> --list              # all tracks + clips
    python aaf_to_timings.py <path-to-aaf> --track 2           # read track 2
    python aaf_to_timings.py <path-to-aaf> --json              # TIMINGS as JSON (stdout)
    python aaf_to_timings.py <path-to-aaf> --json cues.json    # word_timestamps-style cues file
    python aaf_to_timings.py <path-to-aaf> --apply <path-to-storyboard.html>

Heuristics:
  Most narration AAFs alternate (short break) + (long narration clip).
  Default behavior keeps clips whose length is >= --min-length (2.0s),
  treating each as one slide cue. --all keeps every clip. The expected
  slide count comes from --slides N, or from the deck given to --apply
  (elements with class "slide" / data-slide); a mismatch is a WARNING.
  Short clips dropped AFTER the last kept cue (e.g. a closing
  "Try it free.") are listed as a WARNING, never dropped silently -
  unless they look like one more break of the alternation (the whole name
  is break/pause/silence/gap/breath..., optionally numbered or timed like
  "break 2" / "silence 0.7s" - "Break free today." is NOT a break; named
  like the short clips between the kept ones; or - when names can't tell -
  no longer than those); such clips are listed in a one-line note instead.
  0 kept cues is a WARNING, and --apply / --json FILE then refuse to write
  (exit 1) rather than empty the deck's TIMINGS.

Tracks:
  Reads the first sound track that has clips unless --track N is given
  (N = the track number printed by --list; a slot name such as A2 works too).

--json FILE writes the shared word_timestamps.json shape:
  {"source":"aaf", "aaf":..., "track":N, "audio":null, "duration":s, "words":[],
   "cues":[{"slide":1,"time":0.0}, ...]}
  If FILE already exists with words (e.g. an ElevenLabs word_timestamps.json),
  only its "cues" are replaced (plus "cues_source":"aaf"); its words are kept.
  Bare --json (no FILE) prints [{"time","slide"}, ...] to stdout as before.

--apply backs the deck up first (skip with --no-backup): <deck>.bak, or .bak2,
  .bak3 ... when older backups exist - an existing backup is never overwritten,
  so applying twice keeps the original TIMINGS. Then it replaces the
  TIMINGS array in place (or inserts `const TIMINGS = [...]` before the
  Storyboard.init(...) call and adds `timings: TIMINGS` to its options) via
  sb_deckio.py. It warns when the new TIMINGS length differs from the deck's
  slide count or from the TIMINGS it replaces. When the deck has no TIMINGS
  const and its init takes the cues from something else (`timings:
  window.TIMINGS`, `{timings}`), a new const would never be read: --apply then
  changes nothing and exits 1 (paste the printed block by hand). A deck that is
  not valid UTF-8 (saved as cp1252) is patched with its other bytes unchanged.
  Slide count: class="slide" elements, or data-slide elements (each numeric /
  named value once; data-slide on links / buttons and prev / next values, as in
  carousel controls, are not slides).

Requires: pip install pyaaf2
"""
import argparse
import json
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path

try:
    import aaf2
except ImportError:
    sys.exit("pyaaf2 not installed. Run:\n  python -m pip install pyaaf2")

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:   # shared deck rewriter (TIMINGS / WORDS consts), ships with the skill
    import sb_deckio
    _DECKIO_ERR = None
except Exception as _ex:   # pragma: no cover - only if sb_deckio.py is missing/broken
    sb_deckio = None
    _DECKIO_ERR = _ex


for _s in (sys.stdout, sys.stderr):
    try:   # clip names can hold any unicode; never crash on a cp1252 console
        _s.reconfigure(errors='replace')
    except Exception:
        pass


def warn(msg):
    print(msg, file=sys.stderr)


# --------------------------------------------------------------------------
# AAF reading
# --------------------------------------------------------------------------
def _composition(f):
    """Top-level composition mob if the AAF marks one, else the first composition."""
    try:
        top = list(f.content.toplevel())
    except Exception:
        top = []
    comps = top or list(f.content.compositionmobs())
    return comps[0] if comps else None


def _media_kind(slot):
    try:
        return str(slot.media_kind or '')
    except Exception:
        return ''


def _clip_name(c, depth=0):
    """Best-effort human name for a sequence component."""
    if depth > 6:
        return ''
    try:
        mob = getattr(c, 'mob', None)
        if mob is not None and mob.name:
            return mob.name
    except Exception:
        pass
    # OperationGroup (gain/fade/effect) wraps its input segments
    for attr in ('segments', 'components'):
        try:
            kids = list(getattr(c, attr, None) or [])
        except Exception:
            kids = []
        for k in kids:
            n = _clip_name(k, depth + 1)
            if n:
                return n
    try:
        return c.name or ''
    except Exception:
        return ''


def _walk_sequence(seg, edit_rate):
    """Components of a Sequence as clip dicts (positions in seconds)."""
    clips = []
    pos = 0
    for i, c in enumerate(seg.components):
        kind = type(c).__name__
        length = c.length or 0
        if kind == 'Transition':
            # A transition overlaps its neighbours: the next segment starts earlier.
            pos -= length
            continue
        clips.append({
            'index': i,
            'start_sec': round(pos / edit_rate, 3),
            'length_sec': round(length / edit_rate, 3),
            'name': _clip_name(c),
            'type': kind,
            'is_filler': kind == 'Filler',
        })
        pos += length
    return clips


def _unwrap_segment(seg):
    """The Sequence under a track-level effect wrapper (OperationGroup: volume/pan,
    NestedScope), so those tracks still list their clips."""
    for _ in range(6):
        if hasattr(seg, 'components'):
            return seg
        kind = type(seg).__name__
        try:
            if kind == 'OperationGroup' and len(seg.segments):
                seg = seg.segments[0]
                continue
            if kind == 'NestedScope' and len(seg.slots):
                seg = seg.slots[-1]
                continue
        except Exception:
            pass
        break
    return seg


def list_tracks(aaf_path):
    """All slots of the composition: [{'track', 'slot_id', 'name', 'kind', 'edit_rate',
    'segment', 'clips', 'narration', 'duration_sec', 'clip_list'}]. 'track' is 1-based."""
    tracks = []
    with aaf2.open(str(aaf_path), 'r') as f:
        cm = _composition(f)
        if cm is None:
            return tracks, ''
        comp_name = cm.name or ''
        for n, slot in enumerate(cm.slots, start=1):
            seg = _unwrap_segment(slot.segment)
            try:
                edit_rate = float(slot.edit_rate)
            except Exception:
                edit_rate = 0.0
            clip_list = []
            if edit_rate and hasattr(seg, 'components'):
                clip_list = _walk_sequence(seg, edit_rate)
            dur = 0.0
            if clip_list:
                last = clip_list[-1]
                dur = round(last['start_sec'] + last['length_sec'], 3)
            elif edit_rate and getattr(seg, 'length', None):
                dur = round(seg.length / edit_rate, 3)
            tracks.append({
                'track': n,
                'slot_id': getattr(slot, 'slot_id', n),
                'name': getattr(slot, 'name', '') or '',
                'kind': _media_kind(slot),
                'edit_rate': edit_rate,
                'segment': type(seg).__name__,
                'clips': len(clip_list),
                'narration': sum(1 for c in clip_list if not c['is_filler']),
                'duration_sec': dur,
                'clip_list': clip_list,
            })
    return tracks, comp_name


def default_track(tracks):
    """First sound track with real clips; else the first track that has clips at all
    (the pre-0.8 behaviour, which read the first slot with components)."""
    for t in tracks:
        if t['kind'].lower() == 'sound' and t['narration']:
            return t
    for t in tracks:
        if t['clips']:
            return t
    return None


def pick_track(tracks, spec):
    if spec is None:
        return default_track(tracks)
    s = str(spec).strip()
    if s.isdigit():
        n = int(s)
        for t in tracks:
            if t['track'] == n:
                return t
        return None
    for t in tracks:
        if t['name'] and t['name'].lower() == s.lower():
            return t
    return None


def list_clips(aaf_path, track=None):
    """Return the clips of one track: [{'index','start_sec','length_sec','name','type','is_filler'}]."""
    tracks, _ = list_tracks(aaf_path)
    t = pick_track(tracks, track)
    return list(t['clip_list']) if t else []


# --------------------------------------------------------------------------
# Cue selection
# --------------------------------------------------------------------------
def select_cues(clips, min_length=2.0, keep_all=False, gap_threshold=0.8):
    """Filter clips down to the ones that should each become a slide cue.

    Two-pass:
      1. Keep only clips above min-length (or everything if --all).
      2. Merge consecutive kept clips whose preceding gap (silence) is
         shorter than gap_threshold — those are mid-slide breaks (e.g.
         SSML <break time="0.7s" /> between sentences of the same beat),
         not slide changes.
    """
    if keep_all:
        narration = [c for c in clips if not c['is_filler']]
    else:
        narration = [c for c in clips if c['length_sec'] >= min_length and not c['is_filler']]

    if not narration:
        return narration

    cues = [dict(narration[0])]
    prev_end = narration[0]['start_sec'] + narration[0]['length_sec']
    for nxt in narration[1:]:
        # gap = silence (filler or dropped short clips) since the previous KEPT clip
        gap = nxt['start_sec'] - prev_end
        prev_end = nxt['start_sec'] + nxt['length_sec']
        if gap < gap_threshold:
            # Same slide — extend the previous cue, don't start a new one
            continue
        cues.append(dict(nxt))
    return cues


def dropped_tail(clips, min_length, keep_all):
    """Non-filler clips shorter than min_length that come after the last kept clip
    (e.g. a short closing line like "Try it free.") — these get no slide."""
    if keep_all:
        return []
    kept = [c['index'] for c in clips if not c['is_filler'] and c['length_sec'] >= min_length]
    if not kept:
        return []
    last = max(kept)
    return [c for c in clips
            if c['index'] > last and not c['is_filler'] and c['length_sec'] < min_length]


# names editors / TTS exports give silence clips. The WHOLE name must be one of these
# words, optionally numbered or timed ("break", "Break 2", "gap-1", "pause_03",
# "silence 0.7s", "<break 700ms>", "breath (0.5)"), so a closing line that merely starts
# with one ("Break free today.", "Silence is golden", "Empty your cart") is not a break.
_BREAK_NAME = re.compile(
    r'^\s*[\[(<{]?\s*(?:break|pause|silence|silent|gap|breath|room\s*tone|roomtone|'
    r'filler|blank|empty|spacer|sil)'
    r'(?:\s*(?:[\s_\-#:=]|time\s*=)\s*["\']?\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds|ms)?["\']?'
    r'|\s*\(\s*\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds|ms)?\s*\))?'
    r'\s*/?\s*[\])>}]?\s*$', re.I)


def looks_like_break(clip, clips, min_length):
    """True when a short trailing clip is probably one more break of a
    (break + narration) alternation rather than a closing line:
      - its whole name says so (break / pause / silence / gap / breath / ...,
        optionally numbered or timed: "break 2", "gap-1", "silence 0.7s"), or
      - it shares its name with a short clip BETWEEN the kept clips but with no
        kept (narration) clip, or
      - names can't tell (empty, or the same name as a narration clip - e.g.
        every clip points at one master mob) and it is no longer than the
        longest short clip between the kept clips."""
    name = (clip.get('name') or '').strip().lower()
    if _BREAK_NAME.match(name):
        return True
    kept = [c for c in clips if not c['is_filler'] and c['length_sec'] >= min_length]
    if not kept:
        return False
    last = max(c['index'] for c in kept)
    interior = [c for c in clips if not c['is_filler'] and c['length_sec'] < min_length
                and c['index'] < last]
    if not interior:
        return False
    kept_names = {(c.get('name') or '').strip().lower() for c in kept}
    interior_names = {(c.get('name') or '').strip().lower() for c in interior}
    if name and name not in kept_names:
        return name in interior_names
    return clip['length_sec'] <= max(c['length_sec'] for c in interior) + 0.05


def suggest_min_length(clips, expected, keep_all, gap_threshold):
    """Largest --min-length that yields exactly `expected` cues (None if none does)."""
    if not expected:
        return None
    cands = sorted({c['length_sec'] for c in clips if not c['is_filler'] and c['length_sec'] > 0},
                   reverse=True)
    for m in cands:
        if len(select_cues(clips, min_length=m, gap_threshold=gap_threshold)) == expected:
            return m
    return None


def format_timings_block(cues, keyword='const'):
    """Format as a JS TIMINGS array."""
    lines = [f'{keyword} TIMINGS = [']
    for i, c in enumerate(cues):
        t = c['start_sec']
        slide = i + 1
        comma = ',' if i < len(cues) - 1 else ''
        lines.append(f'  {{ time: {t:7.2f}, slide: {slide:2d} }}{comma}')
    lines.append('];')
    return '\n'.join(lines)


# --------------------------------------------------------------------------
# Deck helpers
# --------------------------------------------------------------------------
# data-slide on these is a control (carousel arrows, nav dots), not a slide
_CONTROL_TAGS = {'a', 'button', 'input', 'select', 'option', 'label', 'area'}
# data-slide values that name a direction, not a slide (Bootstrap 3 carousel: prev / next)
_NAV_VALUES = {'prev', 'previous', 'next', 'first', 'last', 'back', 'forward'}


class _SlideCounter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.class_slides = 0
        self.data_slide_values = set()
        self.data_slide_names = set()
        self.data_slide_bare = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'slide' in (a.get('class') or '').split():
            self.class_slides += 1
        if 'data-slide' in a and tag.lower() not in _CONTROL_TAGS:
            v = str(a.get('data-slide') or '').strip()
            if v.isdigit():
                self.data_slide_values.add(int(v))
            elif not v:
                self.data_slide_bare += 1          # <section data-slide> marker
            elif v.lower() not in _NAV_VALUES:
                self.data_slide_names.add(v)       # data-slide="intro"


def count_deck_slides(html_text):
    """Number of slides in a deck: elements with class "slide", or elements with a
    data-slide attribute - whichever is larger. Numeric / named data-slide values
    are counted once each (nav dots repeating data-slide="3" don't inflate it);
    data-slide on links / buttons / inputs and direction values (prev, next, ...
    as in Bootstrap carousel controls) are not slides. sb_deckio's count (which
    also honours a custom Storyboard.init slideSelector) is used too. HTML
    comments and <script> text are ignored. 0 = unknown."""
    p = _SlideCounter()
    try:
        p.feed(html_text)
        p.close()
    except Exception:
        pass
    n = max(p.class_slides, len(p.data_slide_values) + len(p.data_slide_names) + p.data_slide_bare)
    if sb_deckio is not None:
        try:
            n = max(n, sb_deckio.count_slides(html_text))
        except Exception:
            pass
    return n


def read_deck_text(path):
    """(text, bom, not_utf8) of a deck. Bytes that are not valid UTF-8 (a deck saved
    as cp1252 / latin-1) are kept as surrogate escapes, so writing the text back with
    encode_deck_text() leaves them byte-for-byte unchanged. UTF-16 decks are refused."""
    raw = Path(path).read_bytes()
    if raw.startswith((b'\xff\xfe', b'\xfe\xff')):
        sys.exit(f'{path} is UTF-16 text - re-save it as UTF-8 and run again.')
    bom = raw.startswith(b'\xef\xbb\xbf')
    body = raw[3:] if bom else raw
    try:
        return body.decode('utf-8'), bom, False
    except UnicodeDecodeError:
        return body.decode('utf-8', 'surrogateescape'), bom, True


def encode_deck_text(text, bom):
    data = text.encode('utf-8', 'surrogateescape')
    return (b'\xef\xbb\xbf' + data) if bom else data


def init_timings_expr(html_text):
    """The expression Storyboard.init(...) passes as `timings:` (e.g. 'TIMINGS',
    'window.TIMINGS'), or None when it passes none / can't be told."""
    if sb_deckio is None:
        return None
    try:
        view = sb_deckio._js_view(html_text)
        info = sb_deckio.find_init_call(html_text, view)
        if not info or info['opts_open'] is None or info['opts_close'] is None:
            return None
        props = sb_deckio._top_level_props(html_text, view, info['opts_open'], info['opts_close'])
    except Exception:
        return None
    v = props.get('timings')
    return v.strip() if isinstance(v, str) else None


def _need_deckio():
    if sb_deckio is None:
        sys.exit('--apply needs sb_deckio.py (ships next to aaf_to_timings.py in the storyboard skill); '
                 f'it could not be imported: {_DECKIO_ERR}')


def existing_timings_count(html_text):
    """Entries in the deck's current TIMINGS const (None = no TIMINGS const)."""
    _need_deckio()
    try:
        t = sb_deckio.read_timings(html_text)
    except Exception:
        return None
    return None if t is None else len(t)


def backup_target(path):
    """Where to back `path` up: the first free <file>.bak, <file>.bak2, ... An
    existing backup is never overwritten (applying twice must not lose the original
    TIMINGS) - the same rule as compress_anim_timings.py. Returns (backup path,
    already_there): already_there is True when an existing backup holds exactly the
    current bytes (nothing to write)."""
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


def apply_to_html(html_path, cues, backup=True):
    """Replace (or insert) the TIMINGS array in a storyboard.html via sb_deckio
    (a missing const is inserted before Storyboard.init(...) and wired into its
    options). Backs the deck up first when backup is True (<deck>.bak, or .bak2,
    .bak3 ... - an existing backup is never overwritten). Returns 'changed',
    'unchanged' (the deck already has these TIMINGS; nothing written) or None on
    failure."""
    _need_deckio()
    path = Path(html_path)
    if not path.exists():
        warn(f'  ! Deck not found: {path}')
        return None
    text, bom, not_utf8 = read_deck_text(path)
    timings = [{'time': round(c['start_sec'], 3), 'slide': i + 1} for i, c in enumerate(cues)]
    notes = []
    had = sb_deckio.read_timings(text) is not None
    expr = None if had else init_timings_expr(text)
    if expr is not None and expr != 'TIMINGS':
        # a new `const TIMINGS` would never be read: init takes its cues from elsewhere
        warn(f'  ! {path.name}: Storyboard.init() takes its timings from `{expr}`, not a TIMINGS '
             f'const - a new const would not be used, so the deck was NOT changed. Paste the '
             f'TIMINGS block above into it by hand, or pass `timings: TIMINGS` to init and run again.')
        return None
    try:
        new_text = sb_deckio.write_timings(text, timings, notes)
    except sb_deckio.DeckIOError as ex:
        warn(f'  ! Could not rewrite TIMINGS in {path}: {ex}')
        return None
    if not had and any('is not what init uses' in n for n in notes):
        warn(f'  ! {path.name}: Storyboard.init() does not read a TIMINGS const; the deck was NOT '
             f'changed - paste the TIMINGS block above into it by hand.')
        return None
    for n in notes:
        warn(f'# note: {n}')
    if new_text == text:
        return 'unchanged'
    if not_utf8:
        warn(f'# note: {path.name} is not valid UTF-8 (e.g. saved as cp1252); its other bytes '
             f'are written back unchanged')
    if not had:
        warn(f'# No TIMINGS const in {path.name}: inserted one before Storyboard.init(...)')
    if backup:
        bak, already = backup_target(path)
        if already:
            warn(f'# Backup {bak} already holds this version (not rewritten)')
        else:
            shutil.copy2(path, bak)
            warn(f'# Backup written to {bak}')
    path.write_bytes(encode_deck_text(new_text, bom))
    return 'changed'


def write_cues_json(out_path, cues, aaf_name, track, duration):
    cue_list = [{'slide': i + 1, 'time': round(c['start_sec'], 3)} for i, c in enumerate(cues)]
    out = Path(out_path)
    data = None
    if out.exists() and out.stat().st_size:
        try:
            data = json.loads(out.read_text(encoding='utf-8-sig'))
        except Exception:
            sys.exit(f'--json: {out} exists and is not JSON - refusing to overwrite it')
    if isinstance(data, dict) and data.get('words'):
        # keep an existing word_timestamps.json's words; only the cues come from the AAF
        data['cues'] = cue_list
        data['cues_source'] = 'aaf'
        data['cues_aaf'] = aaf_name
        merged = True
    else:
        data = {'source': 'aaf', 'aaf': aaf_name, 'track': track, 'audio': None,
                'duration': duration, 'words': [], 'cues': cue_list}
        merged = False
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(_dump_timestamps(data), encoding='utf-8')
    return merged


def _dump_timestamps(data):
    """JSON text with one object per line inside list values (compact for long word lists)."""
    if not isinstance(data, dict):
        return json.dumps(data, indent=2)
    rows = []
    for k, v in data.items():
        if isinstance(v, list) and v and all(isinstance(x, dict) for x in v):
            inner = ',\n'.join('    ' + json.dumps(x, ensure_ascii=False) for x in v)
            rows.append(f'  {json.dumps(k)}: [\n{inner}\n  ]')
        else:
            rows.append(f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}')
    return '{\n' + ',\n'.join(rows) + '\n}\n'


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def _print_listing(aaf_path, tracks, comp_name, chosen, min_length):
    print(f'# {len(tracks)} track(s) in {aaf_path.name}'
          + (f" (composition {comp_name!r})" if comp_name else ''))
    for t in tracks:
        mark = '*' if chosen is not None and t['track'] == chosen['track'] else ' '
        print(f'  {mark} track {t["track"]:2d}  {t["kind"] or "?":8s} name={t["name"]!r:10s} '
              f'{t["segment"]:10s} {t["clips"]:3d} clips ({t["narration"]} non-filler)  '
              f'dur {t["duration_sec"]:7.2f}s  rate {t["edit_rate"]:g}')
    if chosen is None:
        print('# (no track with clips)')
        return
    print(f'\n# clips on track {chosen["track"]} ({chosen["name"] or "unnamed"}) - '
          f'"." = shorter than --min-length {min_length}s or filler')
    for c in chosen['clip_list']:
        mark = '  ' if c['length_sec'] >= min_length and not c['is_filler'] else ' .'
        print(f'  [{c["index"]:3d}]{mark} @{c["start_sec"]:7.2f}s  len={c["length_sec"]:6.2f}s  '
              f'{c["type"]:12s}  name={c["name"]!r}')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('aaf', nargs='?', help='Path to .aaf file')
    ap.add_argument('--min-length', type=float, default=2.0,
                    help='Minimum clip length in seconds to count as a slide cue (default 2.0)')
    ap.add_argument('--all', action='store_true',
                    help='Keep every non-filler clip (no length filter)')
    ap.add_argument('--gap-threshold', type=float, default=0.8,
                    help='Silence (s) shorter than this between two clips means '
                         'same slide (mid-slide SSML break, not a slide change). '
                         'Default 0.8.')
    ap.add_argument('--offset', type=float, default=0.0,
                    help='Add this many seconds to every cue. Use negative '
                         'values to make visuals lead audio (standard animator '
                         'practice: -0.15 to -0.30). Slide 1 is clamped to >= 0.')
    ap.add_argument('--track', default=None, metavar='N',
                    help='Track to read: the number shown by --list (or a slot name like A2). '
                         'Default: the first sound track with clips.')
    ap.add_argument('--slides', type=int, default=None,
                    help='Expected slide count - warns if kept count differs '
                         '(default: the slide count of the --apply deck)')
    ap.add_argument('--json', nargs='?', const='-', default=None, metavar='FILE',
                    help='No FILE (or "-"): print TIMINGS as JSON to stdout. With FILE: write a '
                         'word_timestamps.json-style {"source":"aaf","cues":[...]} file.')
    ap.add_argument('--list', action='store_true',
                    help='List all tracks and the clips of the selected track (no filtering)')
    ap.add_argument('--apply', metavar='HTML',
                    help='Rewrite the TIMINGS array in this storyboard.html (backs it up first: HTML.bak, '
                         'or .bak2, .bak3 ... - an existing backup is never overwritten)')
    ap.add_argument('--no-backup', action='store_true',
                    help='With --apply: do not write a backup copy')
    args = ap.parse_args(argv)
    if args.aaf is None:
        # `--json in.aaf` (bare --json placed before the AAF) swallows the AAF path
        if args.json and args.json.lower().endswith('.aaf'):
            args.aaf, args.json = args.json, '-'
        else:
            ap.error('the following arguments are required: aaf')
    if args.json not in (None, '-') and Path(args.json).suffix.lower() in ('.aaf', '.html', '.htm', '.mp3', '.wav'):
        ap.error(f'--json FILE must be a .json path (got {args.json!r})')

    aaf_path = Path(args.aaf)
    if not aaf_path.exists():
        sys.exit(f'AAF not found: {aaf_path}')

    try:
        tracks, comp_name = list_tracks(aaf_path)
    except Exception as ex:   # not an AAF (OMF / XML / EDL / a WAV ...) or a damaged one
        sys.exit(f'Could not read {aaf_path} as an AAF file ({type(ex).__name__}: {ex}). '
                 f'Export the timeline as AAF from your editor and try again.')
    if not tracks:
        sys.exit('No composition / tracks found in AAF.')
    chosen = pick_track(tracks, args.track)
    if args.track is not None and chosen is None:
        sys.exit(f'No track {args.track!r} in {aaf_path.name}. Tracks: '
                 + ', '.join(f'{t["track"]}({t["name"] or t["kind"]})' for t in tracks)
                 + '  (see --list)')

    if args.list:
        _print_listing(aaf_path, tracks, comp_name, chosen, args.min_length)
        return

    clips = list(chosen['clip_list']) if chosen else []
    if not clips:
        sys.exit('No clips found in AAF.')
    others = [t for t in tracks if t is not chosen and t['narration']]
    if others and args.track is None:
        warn(f'# Reading track {chosen["track"]} ({chosen["name"] or chosen["kind"]}); '
             f'{len(others)} other track(s) have clips - see --list / --track N')

    cues = select_cues(clips, min_length=args.min_length, keep_all=args.all,
                       gap_threshold=args.gap_threshold)
    tail_all = dropped_tail(clips, args.min_length, args.all)
    tail_breaks = [c for c in tail_all if looks_like_break(c, clips, args.min_length)]
    tail = [c for c in tail_all if c not in tail_breaks]
    short_dropped = [c for c in clips if not c['is_filler'] and not args.all
                     and c['length_sec'] < args.min_length]

    if args.offset:
        for c in cues:
            c['start_sec'] = max(0.0, round(c['start_sec'] + args.offset, 3))
        # Re-sort just in case offset caused a re-order (shouldn't, but safe)
        cues.sort(key=lambda c: c['start_sec'])

    # expected slide count: --slides, and/or the deck being applied to
    deck_text, deck_n = None, 0
    if args.apply:
        p = Path(args.apply)
        if not p.exists():
            sys.exit(f'Deck not found: {p}')
        deck_text = read_deck_text(p)[0]
        deck_n = count_deck_slides(deck_text)
    expected, expected_src = args.slides, '--slides'
    if expected is None and deck_n:
        expected, expected_src = deck_n, f'slides in {Path(args.apply).name}'

    if short_dropped:
        warn(f'# Dropped {len(short_dropped)} clip(s) shorter than {args.min_length}s '
             f'(breaks/pauses are expected here; inspect with --list)')
    if tail_breaks:
        warn(f'# note: {len(tail_breaks)} trailing short clip(s) after the last cue look like breaks '
             f'(ignored): ' + ', '.join(f'[{c["index"]}] {c["name"]!r} {c["length_sec"]:.2f}s'
                                        for c in tail_breaks))
    if tail:
        warn(f'# WARNING: {len(tail)} short clip(s) AFTER the last cue were dropped - '
             f'a closing line here (e.g. "Try it free.") gets no slide:')
        for c in tail:
            warn(f'#   [{c["index"]:3d}] @{c["start_sec"]:7.2f}s  len={c["length_sec"]:5.2f}s  name={c["name"]!r}')
        m = max(0.1, round(min(c['length_sec'] for c in tail) - 0.05, 2))
        n_with = len(select_cues(clips, min_length=m, gap_threshold=args.gap_threshold))
        if n_with > len(cues):
            warn(f'#   keep it with --min-length {m:.2f} ({n_with} cues) or --all')
        else:
            warn(f'#   it sits less than --gap-threshold {args.gap_threshold}s after the previous clip, '
                 f'so even --min-length {m:.2f} merges it into the last slide; '
                 f'lower --gap-threshold or add the cue by hand')

    if expected is not None and len(cues) != expected:
        warn(f'# WARNING: kept {len(cues)} cues, but expected {expected} ({expected_src})')
        hint = suggest_min_length(clips, expected, args.all, args.gap_threshold)
        if hint is not None and not args.all:
            warn(f'# Hint: --min-length {hint:.2f} yields exactly {expected} cues')
        else:
            warn('# Try --min-length <smaller>, --all, --gap-threshold, or another --track')
    if deck_n and expected_src == '--slides' and deck_n != len(cues):
        warn(f'# WARNING: {Path(args.apply).name} has {deck_n} slides but the new TIMINGS has '
             f'{len(cues)} entries')

    if not cues:
        longest = max((c['length_sec'] for c in clips if not c['is_filler']), default=0.0)
        warn(f'# WARNING: 0 cues kept - every clip on track {chosen["track"]} is filler or shorter '
             f'than --min-length {args.min_length}s'
             + (f' (longest clip {longest:.2f}s: try --min-length {max(0.1, longest - 0.05):.2f} '
                f'or --all)' if longest else '') + '; see --list / --track N')
        refused = [w for w, on in (('--apply', args.apply), ('--json FILE', args.json not in (None, '-')))
                   if on]
        if refused:
            sys.exit(f'# Refusing to write 0 cues ({" / ".join(refused)}): nothing was changed.')

    if args.json == '-':
        # legacy: machine-readable TIMINGS on stdout (nothing else on stdout)
        out = [{'time': c['start_sec'], 'slide': i + 1} for i, c in enumerate(cues)]
        print(json.dumps(out, indent=2))
    else:
        if args.json is not None:
            merged = write_cues_json(args.json, cues, aaf_path.name, chosen['track'],
                                     chosen['duration_sec'])
            warn(f'# Wrote {len(cues)} cues to {args.json}'
                 + (' (merged into the existing word timestamps; words kept)' if merged else ''))
        print(f'# Source: {aaf_path.name} (track {chosen["track"]})')
        print(f'# {len(cues)} cues extracted (min length {args.min_length}s)')
        print()
        print(format_timings_block(cues))

    if args.apply:
        old_n = existing_timings_count(deck_text)
        if old_n is not None and old_n != len(cues):
            warn(f'# WARNING: replacing a {old_n}-entry TIMINGS with {len(cues)} entries in {args.apply}')
        status = apply_to_html(args.apply, cues, backup=not args.no_backup)
        if status == 'changed':
            warn(f'\n# Wrote new TIMINGS into {args.apply}')
        elif status == 'unchanged':
            warn(f'\n# TIMINGS in {args.apply} already match; file left unchanged')
        else:
            sys.exit(1)


if __name__ == '__main__':
    main()
