"""Tests for elevenlabs_generate.py and sb_deckio.py.

The ElevenLabs API is never called: every test injects a fake client via
`elevenlabs_generate.make_client`. Run with:
    python -m unittest discover -s tests -p "test_*.py"
"""
import base64
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import warnings
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

SKILL = Path(__file__).resolve().parent.parent
if str(SKILL) not in sys.path:
    sys.path.insert(0, str(SKILL))

import elevenlabs_generate as eg  # noqa: E402
import sb_deckio  # noqa: E402

NODE = shutil.which('node')

# --------------------------------------------------------------------------
# fixtures
# --------------------------------------------------------------------------

# MPEG-1 Layer III, 128 kbps, 44.1 kHz, no CRC, no padding -> 417-byte frames
MP3_FRAME = b'\xff\xfb\x90\x64' + b'\x00' * (417 - 4)


def fake_mp3(seconds):
    n = int(math.ceil(seconds * 44100 / 1152))
    return MP3_FRAME * n, round(n * 1152 / 44100, 3)


SSML_3 = (
    'Every great story starts with a single frame. <break time="0.7s" />\n'
    'Then the motion begins, <break time="0.3s" /> and the audience leans in. <break time="0.7s" />\n'
    'Finally, the payoff lands. Thanks for watching.'
)
BEATS_3 = [
    {'slide': 1, 'text': 'Every great story starts with a single frame.', 'pause_after': 0.7},
    {'slide': 2, 'text': 'Then the motion begins, and the audience leans in.', 'pause_after': 0.7},
    {'slide': 3, 'text': 'Finally, the payoff lands. Thanks for watching.', 'pause_after': 0.0},
]
BEAT_FIRST_WORDS = ['Every', 'Then', 'Finally']


def script_md(ssml=SSML_3, beats=BEATS_3, ssml_info='ssml'):
    parts = ['# Test -- Voice-Over Script', '', '## 1. Paste into ElevenLabs', '',
             f'```{ssml_info}', ssml, '```', '']
    if beats is not None:
        parts += ['## Beats', '', '```json', json.dumps({'beats': beats}, indent=2), '```', '']
    parts += ['## 5. TIMINGS', '', '```js', 'const TIMINGS = [', '  { time: 0.0, slide: 1 }', '];', '```', '']
    return '\n'.join(parts)


def synth_alignment(text, char_dur=0.055, space_dur=0.03, tags='keep'):
    """A realistic character alignment for `text`, shaped like ElevenLabs'
    response: EVERY input character is listed (break-tag characters included,
    their timestamps spanning the requested silence), punctuation carries a
    natural pause. Other shapes the live API might use:
      'absorb'    tag chars dropped, the silence folded into the previous
                  character's end time;
      'next'      tag chars listed with zero length, the silence folded into
                  the NEXT spoken character (it starts when the silence does);
      'next_drop' like 'next' with the tag chars dropped;
      'partial'   only the tag's '<' and '>' dropped; its body spans the silence.
    Returns (alignment dict, end_time)."""
    chars, st, en = [], [], []
    t = 0.08
    pending = [0.0]      # silence waiting to be folded into the next spoken char ('next*')

    def plain(s):
        nonlocal t
        for c in s:
            d = space_dur if c.isspace() else char_dur
            if c == ',':
                d += 0.12
            elif c in '.!?':
                d += 0.25
            if pending[0] and not c.isspace():
                d += pending[0]
                pending[0] = 0.0
            chars.append(c)
            st.append(round(t, 4))
            en.append(round(t + d, 4))
            t += d

    pos = 0
    for m in re.finditer(r'<break\b[^>]*>', text):
        plain(text[pos:m.start()])
        dur = float(re.search(r'time="([\d.]+)s"', m.group(0)).group(1))
        pos = m.end()
        if tags == 'absorb':
            en[-1] = round(en[-1] + dur, 4)
            t += dur
            continue
        if tags in ('next', 'next_drop'):
            if tags == 'next':
                for c in m.group(0):
                    chars.append(c)
                    st.append(round(t, 4))
                    en.append(round(t, 4))
            pending[0] += dur
            continue
        if tags == 'partial':
            body = m.group(0)[1:-1]
            for c in body:
                chars.append(c)
                st.append(round(t, 4))
                en.append(round(t + dur / len(body), 4))
                t += dur / len(body)
            continue
        span = dur / len(m.group(0))
        for c in m.group(0):
            chars.append(c)
            st.append(round(t, 4))
            en.append(round(t + span, 4))
            t += span
    plain(text[pos:])
    return ({'characters': chars, 'character_start_times_seconds': st,
             'character_end_times_seconds': en}, t)


def expected_cues(text, alignment, first_words, folded=None):
    """Cue for each beat = start time of the first char of its first word
    (located in the alignment's own characters, so dropped tags don't shift it).
    folded = {word: seconds of silence folded into its first char} ('next' shapes)."""
    joined = ''.join(alignment['characters'])
    out, pos = [], 0
    for k, w in enumerate(first_words):
        idx = joined.index(w, pos)
        pos = idx + len(w)
        t = alignment['character_start_times_seconds'][idx] + (folded or {}).get(w, 0.0)
        out.append(0.0 if k == 0 else round(t, 2))
    return out


def sdk_response(audio_bytes, alignment, normalized=None):
    """The object convert_with_timestamps returns (real SDK model when available)."""
    b64 = base64.b64encode(audio_bytes).decode('ascii')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            from elevenlabs.types import AudioWithTimestampsResponse, CharacterAlignmentResponseModel
        conv = (lambda a: CharacterAlignmentResponseModel(**a) if a else None)
        return AudioWithTimestampsResponse(audio_base_64=b64, alignment=conv(alignment),
                                           normalized_alignment=conv(normalized))
    except ImportError:
        return SimpleNamespace(audio_base_64=b64, alignment=alignment, normalized_alignment=normalized)


class FakeTTS:
    def __init__(self, response=None, exc=None):
        self.response, self.exc, self.calls = response, exc, []

    def convert_with_timestamps(self, voice_id, **kw):
        self.calls.append(dict(voice_id=voice_id, **kw))
        if self.exc:
            raise self.exc
        return self.response


class FakeVoices:
    def __init__(self, voices=(), search_exc=None, getall_exc=None, page_size=None):
        self.voices = list(voices)
        self.search_exc, self.getall_exc = search_exc, getall_exc
        self.page_size = page_size
        self.search_calls, self.getall_calls = [], 0

    def search(self, **kw):
        self.search_calls.append(kw)
        if self.search_exc:
            raise self.search_exc
        q = (kw.get('search') or '').lower()
        res = [v for v in self.voices if q in v.name.lower()] if q else list(self.voices)
        if self.page_size and not q:
            start = int(kw.get('next_page_token') or 0)
            page = res[start:start + self.page_size]
            more = start + self.page_size < len(res)
            return SimpleNamespace(voices=page, has_more=more,
                                   next_page_token=str(start + self.page_size) if more else None)
        return SimpleNamespace(voices=res, has_more=False, next_page_token=None)

    def get_all(self, **kw):
        self.getall_calls += 1
        if self.getall_exc:
            raise self.getall_exc
        return SimpleNamespace(voices=list(self.voices))


def api_error(status, body):
    """The SDK's ApiError (or a look-alike when the SDK isn't installed)."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            from elevenlabs.core.api_error import ApiError
        return ApiError(status_code=status, body=body)
    except ImportError:
        e = Exception('api error')
        e.status_code, e.body = status, body
        return e


# a nested template literal (the pre-fix masker lost track of the backticks here)
NESTED_TMPL = "  window.listHtml = `<ul>${['a', 'b'].map(i => `<li>${i}</li>`).join('')}</ul>`;"


def js_decls(html, name):
    """Real (code, not string/comment) declarations of `name` in the deck."""
    return len(re.findall(r'(?<![\w$.])(?:const|let|var)\s+' + name + r'\b', sb_deckio._js_view(html)))


def voice(name, vid, category='premade', labels=None):
    return SimpleNamespace(name=name, voice_id=vid, category=category, labels=labels or {})


ADAM_ID = 'AdamAdamAdamAdam0001'
BRIAN_ID = 'BrianBrianBrian00002'
DEFAULT_VOICES = [voice('Adam - Dominant, Firm', ADAM_ID), voice('Brian - Deep, Resonant', BRIAN_ID),
                  voice('Adamant Robot', 'RobotRobotRobot00003')]


def fake_client(response=None, exc=None, voices=DEFAULT_VOICES, **vkw):
    return SimpleNamespace(text_to_speech=FakeTTS(response, exc), voices=FakeVoices(voices, **vkw))


def deck_html(n_slides=4, words_const=None, init=None, audio_src='VO English.mp3', nl='\n'):
    slides = nl.join(
        f'    <section class="slide{" dark" if i % 2 == 0 else ""}" data-slide="{i}">'
        f'<div class="slide-center"><h1>Slide {i}</h1></div></section>'
        for i in range(1, n_slides + 1))
    timings = (',' + nl).join(f'    {{ time: {8.0 * i:5.1f}, slide: {i + 1} }}' for i in range(n_slides))
    labels = ', '.join(f"'Label {i}'" for i in range(1, n_slides + 1))
    init = init or ('Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, '
                    'wordHits: WORD_HITS, fallbackDuration: 75 });')
    lines = [
        '<!doctype html>', '<html><head><meta charset="utf-8"><title>Deck</title>',
        '<style>.slide{position:absolute} .slide-center{display:grid}</style></head>', '<body>',
        '  <div class="deck">', slides, '  </div>',
        '  <!-- <section class="slide">commented-out slide</section> -->',
        f'  <audio id="voAudio" preload="auto" src="{audio_src}"></audio>',
        '  <script src="storyboard-engine.js"></script>', '  <script>',
        '  const TIMINGS = [', timings, '  ];',
        f'  const SLIDE_LABELS = [{labels}];',
        '  // Optional per-word hits: {time, sel, hit}',
        '  const WORD_HITS = [];',
    ]
    if words_const is not None:
        lines.append(f'  const WORDS = {words_const};')
    lines += [f'  {init}', '  </script>', '</body>', '</html>', '']
    return nl.join(lines)


def run_main(argv):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = eg.main(argv)
    return code, out.getvalue(), err.getvalue()


def node_eval_init(html):
    """Run the deck's inline scripts in node with a stub Storyboard and return
    the opts passed to Storyboard.init (None when node is unavailable)."""
    if not NODE:
        return None
    bodies = [html[cs:ce] for kind, _, _, cs, ce in sb_deckio._regions(html)
              if kind == 'script' and html[cs:ce].strip()]
    js = ('var __opts = null, __later = [];'
          'var Storyboard = { init: function (o) { __opts = o; } }; var STORYBOARD = Storyboard;'
          'var __on = function (ev, fn) { __later.push(fn); };'
          'var window = { Storyboard: Storyboard, STORYBOARD: Storyboard, addEventListener: __on };'
          'var document = { readyState: "loading", addEventListener: __on };\n'
          + '\n;\n'.join(bodies)
          + '\n__later.forEach(function (f) { f(); });'
          + '\nconsole.log(JSON.stringify(__opts));\n')
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(js)
    try:
        r = subprocess.run([NODE, f.name], capture_output=True, text=True, encoding='utf-8', timeout=60)
    finally:
        os.unlink(f.name)
    if r.returncode != 0:
        raise AssertionError(f'node failed:\n{r.stderr}\n--- js ---\n{js[:3000]}')
    return json.loads(r.stdout.strip() or 'null')


class TempDirCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='sb_el_test_'))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.env = mock.patch.dict(os.environ, {'ELEVENLABS_API_KEY': 'test-key-not-real'})
        self.env.start()
        self.addCleanup(self.env.stop)

    def write_script(self, **kw):
        p = self.tmp / 'script.md'
        p.write_text(script_md(**kw), encoding='utf-8')
        return p

    def patch_client(self, client):
        p = mock.patch.object(eg, 'make_client', return_value=client)
        m = p.start()
        self.addCleanup(p.stop)
        return m


# --------------------------------------------------------------------------
# elevenlabs_generate: end to end with a mocked client
# --------------------------------------------------------------------------

class TestGenerate(TempDirCase):
    def setUp(self):
        super().setUp()
        self.alignment, end = synth_alignment(SSML_3)
        self.audio, self.audio_dur = fake_mp3(end + 0.4)
        self.expected = expected_cues(SSML_3, self.alignment, BEAT_FIRST_WORDS)

    def test_end_to_end_writes_mp3_words_and_cues(self):
        script = self.write_script()
        client = fake_client(sdk_response(self.audio, self.alignment))
        self.patch_client(client)
        out = self.tmp / 'out'
        code, stdout, stderr = run_main([str(script), str(out)])
        self.assertEqual(code, 0, stderr)

        # MP3, byte for byte, under the new default name
        self.assertEqual((out / 'voiceover.mp3').read_bytes(), self.audio)

        # the request: SSML block as one text, default model + settings, voice by name
        self.assertEqual(len(client.text_to_speech.calls), 1)
        call = client.text_to_speech.calls[0]
        self.assertEqual(call['text'], SSML_3)
        self.assertEqual(call['model_id'], 'eleven_multilingual_v2')
        self.assertEqual(call['voice_id'], ADAM_ID)
        self.assertEqual(call['output_format'], 'mp3_44100_128')
        vs = call['voice_settings']
        get = (lambda k: vs[k]) if isinstance(vs, dict) else (lambda k: getattr(vs, k))
        self.assertAlmostEqual(get('stability'), 0.55)
        self.assertAlmostEqual(get('similarity_boost'), 0.75)
        self.assertAlmostEqual(get('style'), 0.10)
        self.assertAlmostEqual(get('speed'), 0.90)
        self.assertTrue(get('use_speaker_boost'))

        # word_timestamps.json per contract
        ts = json.loads((out / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(list(ts.keys()), ['source', 'audio', 'duration', 'words', 'cues'])
        self.assertEqual(ts['source'], 'elevenlabs')
        self.assertEqual(ts['audio'], 'voiceover.mp3')
        self.assertAlmostEqual(ts['duration'], self.audio_dur, places=2)
        spoken = re.sub(r'<break\b[^>]*>', ' ', SSML_3).split()
        self.assertEqual([w['text'] for w in ts['words']], spoken)
        for w in ts['words']:
            self.assertEqual(set(w), {'text', 'start', 'end'})
            self.assertNotIn('<', w['text'])
            self.assertLessEqual(w['start'], w['end'])
        starts = [w['start'] for w in ts['words']]
        self.assertEqual(starts, sorted(starts))
        # "Then" starts exactly where its 'T' starts in the alignment
        i_then = SSML_3.index('Then')
        w_then = next(w for w in ts['words'] if w['text'] == 'Then')
        self.assertAlmostEqual(w_then['start'], self.alignment['character_start_times_seconds'][i_then], places=3)
        # "frame." ends at the 'e', not at the pause-absorbing '.'
        i_e = SSML_3.index('frame.') + 4
        w_frame = next(w for w in ts['words'] if w['text'] == 'frame.')
        self.assertAlmostEqual(w_frame['end'], self.alignment['character_end_times_seconds'][i_e], places=3)

        self.assertEqual(ts['cues'], [{'slide': i + 1, 'time': t} for i, t in enumerate(self.expected)])
        self.assertIn('method: text', stdout)
        self.assertIn('const TIMINGS = [', stdout)

        # raw alignment kept separately (break-tag characters included)
        raw = json.loads((out / 'alignment_raw.json').read_text(encoding='utf-8'))
        self.assertEqual(raw['alignment']['characters'], self.alignment['characters'])
        self.assertEqual(raw['voice_id'], ADAM_ID)
        self.assertEqual(raw['text'], SSML_3)

    def test_mp3_saved_before_alignment_parsing(self):
        class Exploding:
            def model_dump(self):
                raise RuntimeError('boom')
        resp = SimpleNamespace(audio_base_64=base64.b64encode(self.audio).decode(), alignment=Exploding(),
                               normalized_alignment=None)
        self.patch_client(fake_client(resp))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp)])
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        self.assertIn('Could not read the alignment', stderr)
        self.assertIn('no character alignment', stderr)

    def test_alignment_none(self):
        self.patch_client(fake_client(sdk_response(self.audio, None, None)))
        deck = self.tmp / 'deck.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        before = deck.read_bytes()
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertEqual(code, 1)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(ts['words'], [])
        self.assertEqual(ts['cues'], [])
        self.assertAlmostEqual(ts['duration'], self.audio_dur, places=2)
        self.assertIn('no character alignment', stderr)
        self.assertEqual(deck.read_bytes(), before, 'deck must not be touched without cues')

    def test_normalized_alignment_fallback(self):
        self.patch_client(fake_client(sdk_response(self.audio, None, self.alignment)))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp)])
        self.assertEqual(code, 0)
        self.assertIn('normalized_alignment', stderr)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], self.expected)

    def test_old_attribute_name_audio_base64(self):
        resp = SimpleNamespace(audio_base64=base64.b64encode(self.audio).decode(), alignment=self.alignment)
        self.patch_client(fake_client(resp))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp)])
        self.assertEqual(code, 0, stderr)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], self.expected)

    def test_dict_and_chunked_responses(self):
        a, parts = self.alignment, []
        cut = len(a['characters']) // 2
        half = len(self.audio) // 2
        for sl, au in ((slice(0, cut), self.audio[:half]), (slice(cut, None), self.audio[half:])):
            parts.append(SimpleNamespace(audio_base_64=base64.b64encode(au).decode(), alignment={
                k: v[sl] for k, v in a.items()}))
        for resp in ({'audio_base_64': base64.b64encode(self.audio).decode(), 'alignment': a},
                     iter(parts)):
            self.patch_client(fake_client(resp))
            code, _, stderr = run_main([str(self.write_script()), str(self.tmp)])
            self.assertEqual(code, 0, stderr)
            self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
            ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
            self.assertEqual([c['time'] for c in ts['cues']], self.expected)

    def test_unreadable_response_is_dumped(self):
        self.patch_client(fake_client(object()))
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp)])
        self.assertIn('Could not read audio', str(cm.exception.code))
        self.assertTrue((self.tmp / 'tts_response_raw.json').is_file())

    def test_model_without_audio_field_is_not_iterated_as_chunks(self):
        # a pydantic model iterates as (field, value) pairs; those must never be decoded as audio
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                from elevenlabs.types import CharacterAlignmentResponseModel
            resp = CharacterAlignmentResponseModel(**self.alignment)
        except ImportError:
            resp = SimpleNamespace(model_dump=lambda: {}, __iter__=None)
        with self.assertRaises(TypeError):
            eg.take_audio(resp)
        with self.assertRaises(TypeError):
            eg.take_audio(('text', 1))
        # bytes / iterators of bytes (plain `convert` streams) are still fine
        self.assertEqual(eg.take_audio(iter([b'ab', b'cd'])), (b'abcd', []))

    def test_slides_flag_overriding_the_beats_count_warns(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), str(self.tmp), '--slides', '4'])
        self.assertIn('--slides 4 overrides the beats block (3 beats)', stderr)
        self.assertIn('Slide count: 4 (from --slides)', stdout)

    def test_apply_rewrites_timings_and_words_and_warns_on_mismatch(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(4), encoding='utf-8')
        original = deck.read_bytes()
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertIn('[WARN]', stderr)
        self.assertIn('3 beats but storyboard.html has 4 slides', stderr)
        self.assertIn('3 cues but the deck has 4 slides', stderr)

        self.assertEqual((self.tmp / 'storyboard.html.bak').read_bytes(), original)
        html = deck.read_text(encoding='utf-8')
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(html)], self.expected)
        words = sb_deckio.read_words(html)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(words, ts['words'])
        self.assertLess(html.index('const WORDS'), html.index('Storyboard.init('))
        self.assertIn('fallbackDuration: 75, words: WORDS })', html)
        self.assertEqual(sb_deckio.read_audio_src(html), 'voiceover.mp3')
        opts = node_eval_init(html)
        if opts is not None:
            self.assertEqual(len(opts['words']), len(words))
            self.assertEqual([t['time'] for t in opts['timings']], self.expected)

    def test_apply_matching_deck_no_warning_and_replaces_words(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3, words_const='[]', audio_src='voiceover.mp3',
                                  init='Storyboard.init({ timings: TIMINGS, words: WORDS });'), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), '--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertNotIn('slides', stderr)
        html = deck.read_text(encoding='utf-8')
        self.assertEqual(html.count('const WORDS'), 1)
        self.assertEqual(html.count('words: WORDS'), 1)
        self.assertEqual(len(sb_deckio.read_words(html)), len(re.sub(r'<[^>]+>', ' ', SSML_3).split()))
        self.assertTrue((self.tmp / 'voiceover.mp3').is_file(), 'out_dir defaults to the deck folder')
        self.assertNotIn('<audio> src', stdout)

    def test_deck_slide_count_drives_gaps_without_beats(self):
        # no beats block, 3-slide deck: N comes from the deck
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script(beats=None)), str(self.tmp),
                                         '--apply', str(deck), '--cue-method', 'gaps'])
        self.assertEqual(code, 0, stderr)
        self.assertIn('Slide count: 3 (from storyboard.html)', stdout)
        self.assertIn('method: gaps', stdout)
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(deck.read_text(encoding='utf-8'))],
                         self.expected)

    def test_text_method_beats_long_intra_beat_pause(self):
        # a 0.9s pause INSIDE beat 2 is longer than the 0.7s pauses BETWEEN beats
        ssml = SSML_3.replace('<break time="0.3s" />', '<break time="0.9s" />')
        al, end = synth_alignment(ssml)
        audio, _ = fake_mp3(end)
        want = expected_cues(ssml, al, BEAT_FIRST_WORDS)
        self.patch_client(fake_client(sdk_response(audio, al)))
        script = self.write_script(ssml=ssml)
        code, stdout, _ = run_main([str(script), str(self.tmp)])
        self.assertIn('method: text', stdout)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], want)
        # the pure largest-gap heuristic picks the long intra-beat pause instead
        cues, used, _ = eg.compute_cues(ts['words'], n_slides=3, method='gaps')
        self.assertEqual(used, 'gaps')
        i_and = ssml.index('and the audience')
        self.assertIn(round(al['character_start_times_seconds'][i_and], 2), cues)

    def test_intra_beat_pause_is_not_reported_as_disagreement(self):
        ssml = SSML_3.replace('<break time="0.3s" />', '<break time="0.9s" />')
        al, end = synth_alignment(ssml)
        self.patch_client(fake_client(sdk_response(fake_mp3(end)[0], al)))
        code, _, stderr = run_main([str(self.write_script(ssml=ssml)), str(self.tmp)])
        self.assertEqual(code, 0, stderr)
        self.assertNotIn('disagree', stderr)
        self.assertNotIn('[WARN]', stderr)

    def _run_generated(self, ssml, beats=BEATS_3, extra=(), tags='keep'):
        sent = eg.clean_tts_text(ssml)
        al, end = synth_alignment(sent, tags=tags)
        self.patch_client(fake_client(sdk_response(fake_mp3(end + 0.3)[0], al)))
        code, stdout, stderr = run_main([str(self.write_script(ssml=ssml, beats=beats)), str(self.tmp)]
                                        + list(extra))
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        return code, stdout, stderr, ts, al

    def test_ssml_lead_in_the_beats_lack_snaps_to_the_real_pause(self):
        # reviewer case: the SSML gained "Let's move on." at the start of beat 2 but the
        # beats block was not updated; the 0.7s break sits before "Let's", not "Then"
        ssml = SSML_3.replace('Then the motion begins,', "Let's move on. Then the motion begins,")
        for tags in ('keep', 'absorb'):
            with self.subTest(tags=tags):
                code, stdout, stderr, ts, al = self._run_generated(ssml, tags=tags)
                self.assertEqual(code, 0, stderr)
                self.assertIn('method: text', stdout)
                want = expected_cues(ssml, al, ["Every", "Let's", 'Finally'])
                self.assertEqual([c['time'] for c in ts['cues']], want)
                self.assertIn('[WARN] Slide 2', stderr)
                self.assertIn('"Then"', stderr)
                self.assertIn('"Let\'s"', stderr)
                self.assertIn('do not say the same words', stderr)

    def test_one_extra_word_in_ssml_snaps_to_the_break(self):
        ssml = SSML_3.replace('Then the motion', 'And then the motion')
        code, _, stderr, ts, al = self._run_generated(ssml)
        self.assertEqual(code, 0, stderr)
        self.assertEqual([c['time'] for c in ts['cues']], expected_cues(ssml, al, ['Every', 'And', 'Finally']))
        self.assertIn('[WARN] Slide 2', stderr)

    def test_agreeing_texts_without_breaks_are_not_snapped(self):
        # no <break> tags at all, beats == SSML, and a long natural pause INSIDE beat 2:
        # the beats say where each slide starts, so nothing may move to that pause
        ssml = ('Every great story starts with a single frame. Then the motion begins, '
                'and the audience leans in. Finally, the payoff lands. Thanks for watching.')
        al, end = synth_alignment(ssml)
        cut = ssml.index('and the audience')
        for key in ('character_start_times_seconds', 'character_end_times_seconds'):
            al[key] = [t + (0.9 if i >= cut else 0.0) for i, t in enumerate(al[key])]
        self.patch_client(fake_client(sdk_response(fake_mp3(end + 1.0)[0], al)))
        code, stdout, stderr = run_main([str(self.write_script(ssml=ssml)), str(self.tmp)])
        self.assertEqual(code, 0, stderr)
        self.assertIn('method: text', stdout)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], expected_cues(ssml, al, BEAT_FIRST_WORDS))
        self.assertNotIn('disagree', stderr)

    def test_reworded_beat_start_still_lands_on_the_break(self):
        # the beats block rewords the first words of beat 3 ("So finally" vs "Finally")
        beats = [dict(b) for b in BEATS_3]
        beats[2]['text'] = 'So finally, the payoff lands. Thanks for watching.'
        code, _, stderr, ts, al = self._run_generated(SSML_3, beats=beats)
        self.assertEqual(code, 0, stderr)
        self.assertEqual([c['time'] for c in ts['cues']], self.expected)

    def _beats_only(self, beats, extra=(), tags='keep'):
        p = self.tmp / 'script.md'
        p.write_text('```json\n' + json.dumps({'beats': beats}) + '\n```\n', encoding='utf-8')
        sent = eg.load_script(p)['text']
        al, end = synth_alignment(sent, tags=tags)
        audio, dur = fake_mp3(end)
        client = fake_client(sdk_response(audio, al))
        self.patch_client(client)
        code, stdout, stderr = run_main([str(p), str(self.tmp)] + list(extra))
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        return code, stdout, stderr, ts, client.text_to_speech.calls[0]['text'], dur

    SILENT_MID = [
        {'slide': 1, 'text': 'Every great story starts with a single frame.', 'pause_after': 0.7},
        {'slide': 2, 'text': 'Then the motion begins. And the audience leans in.', 'pause_after': 0.7},
        {'slide': 3, 'text': '', 'pause_after': 1.5},
        {'slide': 4, 'text': 'Finally, the payoff lands. Thanks for watching.', 'pause_after': 0},
    ]

    def test_silent_beat_is_cued_inside_the_silence(self):
        # reviewer case: a visual-only beat (logo hold) used to push slide 3 onto a
        # 0.34s sentence pause inside beat 2 ("And"), shifting every later cue
        for method in ('auto', 'gaps'):
            with self.subTest(method=method):
                code, stdout, stderr, ts, sent, _ = self._beats_only(self.SILENT_MID, ['--cue-method', method])
                self.assertEqual(code, 0, stderr)
                self.assertIn('<break time="0.7s" />\n<break time="1.5s" />', sent)
                self.assertIn('Slide(s) 3 have no narration', stdout)
                words = {w['text']: w for w in ts['words']}
                cues = [c['time'] for c in ts['cues']]
                self.assertEqual(len(cues), 4)
                self.assertEqual(cues[1], round(words['Then']['start'], 2))
                self.assertEqual(cues[3], round(words['Finally,']['start'], 2))
                s0, s1 = words['in.']['end'], words['Finally,']['start']
                self.assertGreater(cues[2], s0 + 0.3)
                self.assertLess(cues[2], s1 - 1.0)
                self.assertAlmostEqual(cues[2], s0 + (s1 - s0) * 0.7 / 2.2, delta=0.02)
                self.assertNotIn('[WARN]', stderr)

    def test_leading_and_trailing_silent_beats(self):
        beats = [{'slide': 1, 'text': '', 'pause_after': 1.5},
                 {'slide': 2, 'text': 'Every great story starts with a single frame.', 'pause_after': 0.7},
                 {'slide': 3, 'text': 'Then the motion begins.', 'pause_after': 0.7},
                 {'slide': 4, 'text': '', 'pause_after': 2.0}]
        code, _, stderr, ts, sent, dur = self._beats_only(beats)
        self.assertEqual(code, 0, stderr)
        self.assertTrue(sent.startswith('<break time="1.5s" />\nEvery'), sent)
        self.assertTrue(sent.endswith('begins.\n<break time="0.7s" />\n<break time="2.0s" />'), sent)
        cues = [c['time'] for c in ts['cues']]
        w = ts['words']
        self.assertEqual(cues[0], 0.0)
        self.assertEqual(cues[1], round(w[0]['start'], 2))
        self.assertGreater(cues[1], 1.4)
        self.assertEqual(cues[2], round(next(x for x in w if x['text'] == 'Then')['start'], 2))
        s0 = w[-1]['end']
        self.assertAlmostEqual(cues[3], s0 + (dur - s0) * 0.7 / 2.7, delta=0.02)
        self.assertLess(cues[3], dur - 1.5)

    def test_silent_beat_without_hold_warns(self):
        beats = [dict(b) for b in self.SILENT_MID]
        beats[2]['pause_after'] = 0.0
        code, _, stderr, ts, sent, _ = self._beats_only(beats)
        self.assertIn('Slide 3 has no narration and gets only', stderr)

    def test_long_pause_split_into_3s_breaks(self):
        beats = [{'slide': 1, 'text': 'One.', 'pause_after': 4.5}, {'slide': 2, 'text': 'Two.', 'pause_after': 0}]
        text = eg.beats_to_ssml(eg._parse_beats_json(json.dumps({'beats': beats})))
        self.assertEqual(text, 'One.\n<break time="3.0s" />\n<break time="1.5s" />\nTwo.')

    def test_no_alignment_is_exit_code_1_without_apply(self):
        self.patch_client(fake_client(sdk_response(self.audio, None, None)))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp)])
        self.assertEqual(code, 1)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        self.assertIn('no character alignment', stderr)

    def test_beats_slide_numbers_are_kept(self):
        # a revisit (1, 2, 3, 2) on a 3-slide deck: TIMINGS keeps the numbers, the deck
        # warning explains the extra cue, the beats-vs-deck check does not misfire
        beats = [dict(b) for b in self.SILENT_MID]
        beats[2] = {'slide': 3, 'text': 'Now look back.', 'pause_after': 0.7}
        beats[3]['slide'] = 2
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        code, stdout, stderr, ts, _, _ = self._beats_only(beats, ['--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertEqual([c['slide'] for c in ts['cues']], [1, 2, 3, 2])
        self.assertEqual([t['slide'] for t in sb_deckio.read_timings(deck.read_text(encoding='utf-8'))],
                         [1, 2, 3, 2])
        self.assertIn('revisit slide 2', stderr)
        self.assertNotIn('beats but storyboard.html', stderr)
        self.assertIn('numbers its slides 1, 2, 3, 2', stdout)
        # skipped numbers are kept as written too
        two = [{'slide': 1, 'text': 'Hello there.', 'pause_after': 0.7},
               {'slide': 3, 'text': 'Goodbye now.', 'pause_after': 0}]
        code, _, stderr, ts, _, _ = self._beats_only(two)
        self.assertEqual([c['slide'] for c in ts['cues']], [1, 3])

    def test_break_positions(self):
        for tags in ('keep', 'absorb'):
            with self.subTest(tags=tags):
                al, _ = synth_alignment(SSML_3, tags=tags)
                words = eg.alignment_to_words(al)
                idx = {w['text']: i for i, w in enumerate(words)}
                self.assertEqual(eg.break_positions(SSML_3, words),
                                 {idx['Then']: 0.7, idx['and']: 0.3, idx['Finally,']: 0.7})
        self.assertEqual(eg.break_positions('no breaks here', eg.alignment_to_words(
            synth_alignment('no breaks here')[0])), {})

    def test_threshold_fallback_without_slide_count(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        script = self.write_script(beats=None)
        code, stdout, _ = run_main([str(script), str(self.tmp), '--cue-method', 'threshold'])
        self.assertIn('method: threshold', stdout)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], self.expected)   # 0.3s break < 0.6s default
        code, stdout, _ = run_main([str(script), str(self.tmp), '--cue-method', 'threshold',
                                    '--gap-threshold', '0.45'])
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        i_and = SSML_3.index('and the audience')
        self.assertEqual([c['time'] for c in ts['cues']],
                         sorted(self.expected + [round(self.alignment['character_start_times_seconds'][i_and], 2)]))
        code, stdout, _ = run_main([str(script), str(self.tmp), '--cue-method', 'threshold',
                                    '--gap-threshold', '0.3'])
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(len(ts['cues']), 5)   # + the ~0.34s sentence pause after "lands." 

    def test_break_split_used_when_no_beats_and_no_deck(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, _ = run_main([str(self.write_script(beats=None)), str(self.tmp)])
        self.assertIn('SSML split at <break>', stdout)
        self.assertIn('method: text', stdout)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], self.expected)

    def test_slides_flag_and_offset(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp), '--slides', '3',
                                    '--offset', '-0.2', '--out-name', 'take2.mp3'])
        self.assertEqual(code, 0, stderr)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(ts['audio'], 'take2.mp3')
        self.assertTrue((self.tmp / 'take2.mp3').is_file())
        self.assertEqual([c['time'] for c in ts['cues']],
                         [0.0] + [round(t - 0.2, 2) for t in self.expected[1:]])

    def test_reuse_skips_api(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        script = self.write_script()
        run_main([str(script), str(self.tmp)])
        first = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        with mock.patch.object(eg, 'make_client', side_effect=AssertionError('API must not be called')), \
                mock.patch.dict(os.environ, {}, clear=True):
            code, stdout, stderr = run_main([str(script), str(self.tmp), '--reuse'])
        self.assertEqual(code, 0, stderr)
        self.assertIn('no API call', stdout)
        again = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(again, first)

    def test_dry_run_needs_no_key_or_client(self):
        with mock.patch.object(eg, 'make_client', side_effect=AssertionError('no client in dry run')), \
                mock.patch.dict(os.environ, {}, clear=True):
            code, stdout, _ = run_main([str(self.write_script()), str(self.tmp), '--dry-run'])
        self.assertEqual(code, 0)
        self.assertIn('3 beats', stdout)
        self.assertFalse((self.tmp / 'voiceover.mp3').exists())

    def test_apply_deck_without_audio_element(self):
        deck = self.tmp / 'page.html'
        deck.write_text(re.sub(r'\s*<audio\b[^>]*></audio>', '', deck_html(3)), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertIn('no <audio> element', stderr)
        html = deck.read_text(encoding='utf-8')
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(html)], self.expected)
        self.assertEqual(len(sb_deckio.read_words(html)), len(re.sub(r'<[^>]+>', ' ', SSML_3).split()))

    def test_keep_src_leaves_audio_src(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck),
                                         '--keep-src'])
        self.assertEqual(code, 0, stderr)
        html = deck.read_text(encoding='utf-8')
        self.assertEqual(sb_deckio.read_audio_src(html), 'VO English.mp3')
        self.assertEqual(len(sb_deckio.read_timings(html)), 3)
        self.assertNotIn('<audio> src', stdout)

    def test_unwritable_mp3_path_is_rescued_to_temp(self):
        out = self.tmp / 'out'
        (out / 'voiceover.mp3').mkdir(parents=True)          # a directory: write_bytes fails
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        before = deck.read_bytes()
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), str(out), '--apply', str(deck)])
        m = re.search(r'Saved the audio to (.+?voiceover\.mp3) instead', stderr)
        self.assertIsNotNone(m, stderr)
        rescue = Path(m.group(1))
        self.addCleanup(shutil.rmtree, rescue.parent, True)
        self.assertEqual(rescue.read_bytes(), self.audio)
        self.assertTrue((rescue.parent / 'alignment_raw.json').is_file())
        self.assertTrue((rescue.parent / 'word_timestamps.json').is_file())
        self.assertEqual(code, 1)
        self.assertEqual(deck.read_bytes(), before, 'deck must not point at a temp file')
        # the advice is to copy the files back, not to use the temp folder as out_dir
        self.assertIn('COPY every file from', stderr)
        self.assertIn(f'"{out}" as out_dir plus --reuse', stderr)

    def test_audio_src_never_points_into_temp(self):
        deck = Path.home() / 'no_such_sb_project' / 'storyboard.html'   # not under %TEMP% (never written)
        mp3 = Path(tempfile.gettempdir()) / 'elevenlabs_abc123' / 'voiceover.mp3'
        if eg._in_temp_dir(deck):
            self.skipTest('home folder is inside the temp folder')
        err = io.StringIO()
        with redirect_stderr(err):
            self.assertIsNone(eg._audio_src_update(deck, deck_html(3), mp3))
        self.assertIn('temp folder', err.getvalue())
        # a deck that itself lives in temp (like these tests' decks) is still updated
        self.assertEqual(eg._audio_src_update(self.tmp / 'storyboard.html', deck_html(3),
                                              self.tmp / 'voiceover.mp3'), 'voiceover.mp3')

    def test_readonly_deck_rejected_before_api(self):
        import stat
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        os.chmod(deck, stat.S_IREAD)
        self.addCleanup(os.chmod, deck, stat.S_IREAD | stat.S_IWRITE)
        client = fake_client(exc=AssertionError('no call'))
        self.patch_client(client)
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertIn('read-only', str(cm.exception.code))
        self.assertEqual(client.text_to_speech.calls, [])

    def test_deck_write_failure_after_call_is_friendly(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        with mock.patch.object(sb_deckio, 'apply_to_deck',
                               side_effect=PermissionError(13, 'Permission denied')):
            with self.assertRaises(SystemExit) as cm:
                run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        msg = str(cm.exception.code)
        self.assertIn('locked or read-only', msg)
        self.assertIn('--reuse', msg)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        self.assertTrue((self.tmp / 'alignment_raw.json').is_file())

    def test_unwritable_word_timestamps_is_a_warning(self):
        (self.tmp / 'word_timestamps.json').mkdir()                 # write_text fails
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, _, stderr = run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertEqual(code, 1)
        self.assertIn('Could not write', stderr)
        self.assertIn('--reuse', stderr)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        # the deck is still updated from the in-memory cues
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(deck.read_text(encoding='utf-8'))],
                         self.expected)

    def test_apply_deck_with_nested_template_literals(self):
        # regression: the masker lost the backticks of a nested template literal,
        # hid the real TIMINGS and inserted a second `const TIMINGS`
        html = deck_html(3)
        html = html.replace('  const TIMINGS = [', NESTED_TMPL + '\n  const TIMINGS = [', 1)
        html = html.replace('  const WORD_HITS = [];', '  const WORD_HITS = [];\n' + NESTED_TMPL, 1)
        deck = self.tmp / 'storyboard.html'
        deck.write_text(html, encoding='utf-8')
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        code, stdout, stderr = run_main([str(self.write_script()), '--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertNotIn('Inserted a new', stderr)
        new = deck.read_text(encoding='utf-8')
        self.assertEqual(js_decls(new, 'TIMINGS'), 1)
        self.assertEqual(new.count('const TIMINGS'), 1)
        self.assertEqual(js_decls(new, 'WORDS'), 1)
        self.assertEqual(new.count(NESTED_TMPL), 2)
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(new)], self.expected)
        opts = node_eval_init(new)
        if opts is not None:
            self.assertEqual([t['time'] for t in opts['timings']], self.expected)
            self.assertEqual(len(opts['words']), len(sb_deckio.read_words(new)))

    def test_glued_break_tags_are_padded_and_words_stay_separate(self):
        glued = ('Every great story starts with a single frame.<break time="0.7s" />'
                 'Then the motion begins, and the audience leans in.<break time="0.7s" />'
                 'Finally, the payoff lands. Thanks for watching.')
        sent = eg.clean_tts_text(glued)
        self.assertIn('frame. <break time="0.7s" /> Then', sent)
        # the live API might drop the tag characters from the alignment
        al, end = synth_alignment(sent, tags='absorb')
        audio, _ = fake_mp3(end)
        client = fake_client(sdk_response(audio, al))
        self.patch_client(client)
        code, stdout, stderr = run_main([str(self.write_script(ssml=glued)), str(self.tmp)])
        self.assertEqual(code, 0, stderr)
        self.assertEqual(client.text_to_speech.calls[0]['text'], sent)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        texts = [w['text'] for w in ts['words']]
        self.assertIn('frame.', texts)
        self.assertIn('Then', texts)
        self.assertNotIn('frame.Then', texts)
        self.assertEqual([c['time'] for c in ts['cues']], expected_cues(sent, al, BEAT_FIRST_WORDS))

    def test_long_break_warning(self):
        ssml = SSML_3.replace('<break time="0.3s" />', '<break time="4.5s" />')
        with mock.patch.dict(os.environ, {}, clear=True):
            code, _, stderr = run_main([str(self.write_script(ssml=ssml)), str(self.tmp), '--dry-run'])
        self.assertEqual(code, 0)
        self.assertIn('3s maximum', stderr)

    def test_reuse_warns_when_script_changed(self):
        self.patch_client(fake_client(sdk_response(self.audio, self.alignment)))
        run_main([str(self.write_script()), str(self.tmp)])
        changed = self.write_script(ssml=SSML_3.replace('payoff lands', 'payoff arrives'))
        with mock.patch.object(eg, 'make_client', side_effect=AssertionError('API must not be called')):
            code, _, stderr = run_main([str(changed), str(self.tmp), '--reuse'])
        self.assertEqual(code, 0, stderr)
        self.assertIn('differs from the text', stderr)

    def test_non_literal_timings_rejected_before_api(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3).replace('const TIMINGS = [', 'const TIMINGS = window.T || ['), encoding='utf-8')
        client = fake_client(exc=AssertionError('no call'))
        self.patch_client(client)
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp), '--apply', str(deck)])
        self.assertIn('not as an array literal', str(cm.exception.code))
        self.assertEqual(client.text_to_speech.calls, [])

    def test_pause_folded_into_the_next_word_and_bracketless_tags(self):
        # alignment shapes the live API might use (reviewer probe): the <break>'s
        # silence folded into the next word's first char, or the tag's < > dropped
        keep = [w['text'] for w in eg.alignment_to_words(synth_alignment(SSML_3)[0])]
        for tags in ('next', 'next_drop', 'partial'):
            with self.subTest(tags=tags):
                code, stdout, stderr, ts, al = self._run_generated(SSML_3, tags=tags)
                self.assertEqual(code, 0, stderr)
                self.assertEqual([w['text'] for w in ts['words']], keep, 'no tag fragments as words')
                folded = {'Then': 0.7, 'Finally': 0.7} if tags != 'partial' else None
                self.assertEqual([c['time'] for c in ts['cues']],
                                 expected_cues(SSML_3, al, BEAT_FIRST_WORDS, folded))
                w = {x['text']: x for x in ts['words']}
                i_and = ''.join(al['characters']).index('and the')
                true_and = al['character_start_times_seconds'][i_and] + (0.3 if folded else 0.0)
                self.assertAlmostEqual(w['and']['start'], true_and, delta=0.01)
                self.assertNotIn('[WARN]', stderr)


class TestCueWarnings(TempDirCase):
    """Slide counts / pauses that don't clearly mark the slide changes must be
    reported, never silently turned into mid-beat cues."""
    FOUR = ['Alpha is first. It has two sentences.', 'Beta is second. It also has two.',
            'Gamma is third, and it runs on.', 'Delta ends it all.']

    def _four_beats_on_deck(self, extra=(), n_deck=6):
        # old-format script.md: bare fence, no beats block; the deck has 6 slides
        ssml = ' <break time="0.7s" />\n'.join(self.FOUR)
        al, end = synth_alignment(ssml)
        self.patch_client(fake_client(sdk_response(fake_mp3(end + 0.3)[0], al)))
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(n_deck), encoding='utf-8')
        script = self.write_script(ssml=ssml, beats=None, ssml_info='')
        code, stdout, stderr = run_main([str(script), str(self.tmp), '--apply', str(deck)] + list(extra))
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        return code, stdout, stderr, ts, al, ssml

    def test_deck_slide_count_that_differs_from_the_ssml_beats_warns(self):
        code, stdout, stderr, ts, al, ssml = self._four_beats_on_deck()
        self.assertEqual(code, 0, stderr)
        self.assertIn('Slide count: 6 (from storyboard.html)', stdout)
        self.assertIn('[WARN] The SSML has 4 beats (split at <break>s >= 0.6s) but storyboard.html '
                      'says 6 slides', stderr)
        self.assertIn('--slides 4', stderr)
        self.assertIn('[WARN] 5 slide changes are needed but only 3 pause(s)', stderr)
        self.assertIn('slide(s) 2, 4 start after short pauses', stderr)
        # the deck's count still drives the cues (contract): the 3 real breaks are among them
        cues = [c['time'] for c in ts['cues']]
        self.assertEqual(len(cues), 6)
        self.assertLessEqual(set(expected_cues(ssml, al, ['Alpha', 'Beta', 'Gamma', 'Delta'])), set(cues))

    def test_explicit_slides_flag_makes_the_count_mismatch_a_note(self):
        code, _, stderr, _, _, _ = self._four_beats_on_deck(['--slides', '6'])
        self.assertEqual(code, 0, stderr)
        self.assertIn('[note] The SSML has 4 beats', stderr)
        self.assertNotIn('[WARN] The SSML has', stderr)
        self.assertIn('[WARN] 5 slide changes are needed', stderr)    # the pauses are still weak
        # matching the SSML's beats instead: text method, no pause warnings
        code, stdout, stderr, ts, al, ssml = self._four_beats_on_deck(['--slides', '4'])
        self.assertIn('method: text', stdout)
        self.assertNotIn('The SSML has', stderr)
        self.assertNotIn('slide changes are needed', stderr)
        self.assertIn('4 cues but the deck has 6 slides', stderr)
        self.assertEqual([c['time'] for c in ts['cues']],
                         expected_cues(ssml, al, ['Alpha', 'Beta', 'Gamma', 'Delta']))

    @staticmethod
    def _words(spec):
        """[(text, silence_before)] -> words, each 0.3s long."""
        t, out = 0.1, []
        for text, gap in spec:
            t += gap
            out.append({'text': text, 'start': round(t, 3), 'end': round(t + 0.3, 3)})
            t += 0.3
        return out

    def test_equal_pauses_make_a_guess_and_warn(self):
        words = self._words([('One', 0), ('two', .05), ('Three', .8), ('four', .05), ('Five', .8),
                             ('six', .05), ('Seven', .8)])
        warns = []
        cues, used, _ = eg.compute_cues(words, 3, method='gaps', warnings=warns)
        self.assertEqual((used, len(cues)), ('gaps', 3))
        self.assertEqual(len(warns), 1)
        self.assertIn('equally long', warns[0])
        self.assertIn('guess', warns[0])
        # written <break>s settle the tie: no warning, and the cues sit on them
        warns = []
        cues, _, _ = eg.compute_cues(words, 3, method='gaps', breaks={4: 0.7, 6: 0.7}, warnings=warns)
        self.assertEqual(cues, [0.0, words[4]['start'], words[6]['start']])
        self.assertEqual(warns, [])
        # clearly longer boundary pauses: no warning
        words = self._words([('One', 0), ('two', .05), ('Three', .9), ('four', .3), ('Five', .8)])
        warns = []
        cues, _, _ = eg.compute_cues(words, 3, method='gaps', warnings=warns)
        self.assertEqual(cues, [0.0, words[2]['start'], words[4]['start']])
        self.assertEqual(warns, [])

    def test_short_boundary_pause_warns_unless_a_break_is_written_there(self):
        words = self._words([('One', 0), ('two', .05), ('Three', .8), ('four', .3), ('five', .1)])
        warns = []
        eg.compute_cues(words, 3, method='gaps', warnings=warns)
        self.assertEqual(len(warns), 1)
        self.assertIn('2 slide changes are needed but only 1 pause(s)', warns[0])
        self.assertIn('slide(s) 3 start after short pauses (0.30s before "four"', warns[0])
        warns = []
        eg.compute_cues(words, 3, method='gaps', breaks={3: 0.3}, warnings=warns)
        self.assertEqual(warns, [])

    MOVED_BEATS = ['Alpha begins here.', 'Beta talks. Gamma sentence moved.', 'Delta closes it.']

    def test_boundary_without_a_break_while_the_ssml_pauses_elsewhere_warns(self):
        # reviewer case: the words agree, but the SSML's <break> sits one sentence later
        ssml = ('Alpha begins here. Beta talks. <break time="0.8s" /> Gamma sentence moved. '
                '<break time="0.8s" /> Delta closes it.')
        al, _ = synth_alignment(ssml)
        words = eg.alignment_to_words(al)
        warns = []
        cues, used, _ = eg.compute_cues(words, 3, self.MOVED_BEATS, breaks=eg.break_positions(ssml, words),
                                        warnings=warns)
        w = {x['text']: x for x in words}
        self.assertEqual(used, 'text')
        self.assertEqual(cues, [0.0, round(w['Beta']['start'], 2), round(w['Delta']['start'], 2)])
        self.assertEqual(len(warns), 1)
        self.assertIn('Slide 2: the beats block starts it at "Beta"', warns[0])
        self.assertIn('0.8s <break> is before "Gamma"', warns[0])
        # the same beats with the breaks where the beats say: silent
        ok = 'Alpha begins here. <break time="0.8s" /> Beta talks. Gamma sentence moved. ' \
             '<break time="0.8s" /> Delta closes it.'
        al, _ = synth_alignment(ok)
        words = eg.alignment_to_words(al)
        warns = []
        eg.compute_cues(words, 3, self.MOVED_BEATS, breaks=eg.break_positions(ok, words), warnings=warns)
        self.assertEqual(warns, [])
        # through the CLI the warning reaches stderr
        beats = [{'slide': i + 1, 'text': t, 'pause_after': 0.8} for i, t in enumerate(self.MOVED_BEATS)]
        al, end = synth_alignment(ssml)
        self.patch_client(fake_client(sdk_response(fake_mp3(end)[0], al)))
        code, _, stderr = run_main([str(self.write_script(ssml=ssml, beats=beats)), str(self.tmp)])
        self.assertEqual(code, 0, stderr)
        self.assertIn('[WARN] Slide 2: the beats block starts it at "Beta"', stderr)


STUB_SDK_INIT = '''
class VoiceSettings:
    def __init__(self, **kw):
        self.__dict__.update(kw)
    def model_dump(self):
        return dict(self.__dict__)
'''
STUB_SDK_CLIENT = '''
import json, os
from types import SimpleNamespace

class _TTS:
    def convert_with_timestamps(self, voice_id, **kw):
        with open(os.environ['FAKE_EL_CALLS'], 'w', encoding='utf-8') as f:
            json.dump(dict(voice_id=voice_id, text=kw['text'], model_id=kw['model_id'],
                           voice_settings=kw['voice_settings'].model_dump()), f)
        with open(os.environ['FAKE_EL_RESPONSE'], encoding='utf-8') as f:
            r = json.load(f)
        return SimpleNamespace(audio_base_64=r['audio_base_64'],
                               alignment=SimpleNamespace(**r['alignment']), normalized_alignment=None)

class _Voices:
    def search(self, **kw):
        return SimpleNamespace(voices=[SimpleNamespace(name='Adam', voice_id='StubAdamStubAdam0001')],
                               has_more=False, next_page_token=None)
    def get_all(self, **kw):
        return self.search()

class ElevenLabs:
    def __init__(self, api_key=None, **kw):
        assert api_key
        self.text_to_speech, self.voices = _TTS(), _Voices()
'''


class TestCLI(TempDirCase):
    """Runs the script as a real subprocess against a stub `elevenlabs` package."""

    def test_cli_with_stub_sdk(self):
        stub = self.tmp / 'stub' / 'elevenlabs'
        stub.mkdir(parents=True)
        (stub / '__init__.py').write_text(STUB_SDK_INIT, encoding='utf-8')
        (stub / 'client.py').write_text(STUB_SDK_CLIENT, encoding='utf-8')
        alignment, end = synth_alignment(SSML_3)
        audio, _ = fake_mp3(end + 0.3)
        resp = self.tmp / 'resp.json'
        resp.write_text(json.dumps({'audio_base_64': base64.b64encode(audio).decode(), 'alignment': alignment}),
                        encoding='utf-8')
        deck = self.tmp / 'proj' / 'storyboard.html'
        deck.parent.mkdir()
        deck.write_text(deck_html(3), encoding='utf-8')
        script = self.tmp / 'proj' / 'script.md'
        script.write_text(script_md(), encoding='utf-8')
        env = dict(os.environ, PYTHONPATH=str(stub.parent), ELEVENLABS_API_KEY='stub-key',
                   FAKE_EL_RESPONSE=str(resp), FAKE_EL_CALLS=str(self.tmp / 'calls.json'),
                   PYTHONIOENCODING='cp1252')      # a legacy Windows console must not crash it
        r = subprocess.run([sys.executable, str(SKILL / 'elevenlabs_generate.py'), str(script),
                            '--apply', str(deck)], capture_output=True, text=True, env=env, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        call = json.loads((self.tmp / 'calls.json').read_text(encoding='utf-8'))
        self.assertEqual(call['voice_id'], 'StubAdamStubAdam0001')
        self.assertEqual(call['text'], SSML_3)
        self.assertEqual(call['voice_settings']['speed'], 0.9)
        self.assertEqual((deck.parent / 'voiceover.mp3').read_bytes(), audio)
        ts = json.loads((deck.parent / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], expected_cues(SSML_3, alignment, BEAT_FIRST_WORDS))
        html = deck.read_text(encoding='utf-8')
        self.assertEqual(len(sb_deckio.read_timings(html)), 3)
        self.assertEqual(sb_deckio.read_words(html), ts['words'])
        self.assertTrue((deck.parent / 'storyboard.html.bak').is_file())


class TestRealSDKOffline(TempDirCase):
    """The installed ElevenLabs SDK end to end, with its HTTP layer replaced by an
    httpx.MockTransport: proves the request kwargs are valid for the real client
    and the real response model (audio_base_64 attribute) is read -- no network."""

    def setUp(self):
        super().setUp()
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                import httpx
                from elevenlabs.client import ElevenLabs
        except Exception as e:
            self.skipTest(f'elevenlabs SDK / httpx not importable: {e}')
        self.httpx, self.RealClient = httpx, ElevenLabs
        self.requests = []
        self.alignment, end = synth_alignment(SSML_3)
        self.audio, _ = fake_mp3(end + 0.3)
        self.tts_status = 200

    def handler(self, request):
        httpx = self.httpx
        self.requests.append(request)
        path = request.url.path
        if request.method == 'GET' and path.startswith('/v2/voices'):
            return httpx.Response(200, json={
                'voices': [{'voice_id': ADAM_ID, 'name': 'Adam - Dominant, Firm', 'category': 'premade',
                            'labels': {'accent': 'american'}}],
                'has_more': False, 'next_page_token': None})
        if request.method == 'POST' and path.endswith('/with-timestamps'):
            if self.tts_status != 200:
                return httpx.Response(self.tts_status, json={
                    'detail': {'status': 'invalid_api_key', 'message': 'Invalid API key'}})
            return httpx.Response(200, json={'audio_base64': base64.b64encode(self.audio).decode('ascii'),
                                             'alignment': self.alignment, 'normalized_alignment': None})
        return httpx.Response(404, json={'detail': {'status': 'not_found', 'message': path}})

    def run_real(self, argv):
        transport = self.httpx.MockTransport(self.handler)

        def build(api_key=None, **kw):
            return self.RealClient(api_key=api_key, httpx_client=self.httpx.Client(transport=transport))
        with mock.patch('elevenlabs.client.ElevenLabs', side_effect=build):
            return run_main(argv)

    def test_real_client_request_and_response(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        code, stdout, stderr = self.run_real([str(self.write_script()), '--apply', str(deck)])
        self.assertEqual(code, 0, stderr)
        self.assertEqual((self.tmp / 'voiceover.mp3').read_bytes(), self.audio)
        search = [r for r in self.requests if r.url.path == '/v2/voices']
        self.assertEqual(search[0].url.params.get('search'), 'Adam')
        tts = [r for r in self.requests if r.method == 'POST']
        self.assertEqual(len(tts), 1)
        self.assertEqual(tts[0].url.path, f'/v1/text-to-speech/{ADAM_ID}/with-timestamps')
        self.assertEqual(tts[0].url.params.get('output_format'), 'mp3_44100_128')
        body = json.loads(tts[0].content)
        self.assertEqual(body['text'], SSML_3)
        self.assertEqual(body['model_id'], 'eleven_multilingual_v2')
        self.assertEqual(body['voice_settings'], {'stability': 0.55, 'similarity_boost': 0.75, 'style': 0.1,
                                                  'use_speaker_boost': True, 'speed': 0.9})
        self.assertEqual(tts[0].headers.get('xi-api-key'), 'test-key-not-real')
        want = expected_cues(SSML_3, self.alignment, BEAT_FIRST_WORDS)
        ts = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual([c['time'] for c in ts['cues']], want)
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(deck.read_text(encoding='utf-8'))], want)

    def test_real_client_api_error_is_friendly(self):
        self.tts_status = 401
        with self.assertRaises(SystemExit) as cm:
            self.run_real([str(self.write_script()), str(self.tmp), '--voice', 'pNInz6obpgDQGcFmaJgB'])
        msg = str(cm.exception.code)
        self.assertIn('HTTP 401', msg)
        self.assertIn('Invalid API key', msg)
        self.assertEqual([r.url.path for r in self.requests if r.method == 'GET'], [], 'a voice id needs no lookup')
        self.assertFalse((self.tmp / 'voiceover.mp3').exists())


class TestErrors(TempDirCase):
    def test_missing_api_key(self):
        with mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(eg, 'make_client', side_effect=AssertionError('must not build a client')):
            with self.assertRaises(SystemExit) as cm:
                run_main([str(self.write_script()), str(self.tmp)])
        msg = str(cm.exception.code)
        self.assertIn('$env:ELEVENLABS_API_KEY="', msg)
        self.assertIn('export ELEVENLABS_API_KEY="', msg)

    def test_api_key_is_trimmed_of_whitespace_and_quotes(self):
        for raw in ('  sk_abc \r\n', '"sk_abc"', "'sk_abc'"):
            with mock.patch.dict(os.environ, {'ELEVENLABS_API_KEY': raw}):
                self.assertEqual(eg.api_key_from_env(), 'sk_abc', repr(raw))
        for raw in ('', '   ', '""'):
            with mock.patch.dict(os.environ, {'ELEVENLABS_API_KEY': raw}):
                self.assertIsNone(eg.api_key_from_env(), repr(raw))
        with mock.patch.dict(os.environ, {'ELEVENLABS_API_KEY': ' "sk_q" '}):
            m = self.patch_client(fake_client(exc=ConnectionError('offline')))
            with self.assertRaises(SystemExit):
                run_main([str(self.write_script()), str(self.tmp)])
            m.assert_called_once_with('sk_q')

    def test_missing_sdk(self):
        with mock.patch.dict(sys.modules, {'elevenlabs': None, 'elevenlabs.client': None}):
            with self.assertRaises(SystemExit) as cm:
                eg.make_client('k')
        self.assertIn('pip install elevenlabs', str(cm.exception.code))

    def test_api_error_is_friendly_and_writes_nothing(self):
        err = api_error(401, {'detail': {'status': 'invalid_api_key', 'message': 'Invalid API key'}})
        self.patch_client(fake_client(exc=err))
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp)])
        msg = str(cm.exception.code)
        self.assertIn('HTTP 401', msg)
        self.assertIn('Invalid API key', msg)
        self.assertIn('ELEVENLABS_API_KEY', msg)
        self.assertFalse((self.tmp / 'voiceover.mp3').exists())

    def test_quota_error(self):
        err = api_error(401, {'detail': {'status': 'quota_exceeded', 'message': 'You have 3 credits'}})
        self.patch_client(fake_client(exc=err))
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp)])
        self.assertIn('quota exceeded', str(cm.exception.code))

    def test_network_error(self):
        self.patch_client(fake_client(exc=ConnectionError('getaddrinfo failed')))
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp)])
        self.assertIn('network', str(cm.exception.code))

    def test_bad_settings_rejected_before_api(self):
        self.patch_client(fake_client(exc=AssertionError('no call')))
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp), '--speed', '1.5'])
        self.assertIn('0.7-1.2', str(cm.exception.code))

    def test_missing_deck_rejected_before_api(self):
        client = fake_client(exc=AssertionError('no call'))
        self.patch_client(client)
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(self.tmp), '--apply', str(self.tmp / 'nope.html')])
        self.assertIn('not found', str(cm.exception.code))
        self.assertEqual(client.text_to_speech.calls, [])

    def test_out_dir_that_is_a_file_is_friendly(self):
        # easy slip: `script.md storyboard.html` instead of `script.md --apply storyboard.html`
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        client = fake_client(exc=AssertionError('no call'))
        self.patch_client(client)
        with self.assertRaises(SystemExit) as cm:
            run_main([str(self.write_script()), str(deck)])
        self.assertIn('is a file, not a folder', str(cm.exception.code))
        self.assertIn('Did you mean --apply', str(cm.exception.code))
        self.assertEqual(client.text_to_speech.calls, [])

    def test_placeholders_rejected(self):
        p = self.tmp / 'script.md'
        p.write_text('```\n{{NARRATION_WITH_BREAKS}}\n```\n', encoding='utf-8')
        with self.assertRaises(SystemExit) as cm:
            eg.load_script(p)
        self.assertIn('placeholders', str(cm.exception.code))


class TestVoices(unittest.TestCase):
    def test_voice_id_passthrough(self):
        c = fake_client()
        self.assertEqual(eg.resolve_voice(c, 'pNInz6obpgDQGcFmaJgB')[0], 'pNInz6obpgDQGcFmaJgB')
        self.assertEqual(c.voices.search_calls, [])

    def test_name_lookup_case_insensitive_and_base_name(self):
        c = fake_client()
        self.assertEqual(eg.resolve_voice(c, 'brian'), (BRIAN_ID, 'Brian - Deep, Resonant'))
        self.assertEqual(eg.resolve_voice(c, 'ADAM')[0], ADAM_ID)          # not 'Adamant Robot'
        self.assertEqual(eg.resolve_voice(c, 'adamant robot')[0], 'RobotRobotRobot00003')
        self.assertEqual(c.voices.search_calls[0]['search'], 'brian')

    def test_get_all_fallback_when_search_fails(self):
        c = fake_client(search_exc=RuntimeError('no voices_read'))
        self.assertEqual(eg.resolve_voice(c, 'Brian')[0], BRIAN_ID)
        self.assertEqual(c.voices.getall_calls, 1)

    def test_legacy_table_when_lookup_unavailable(self):
        c = fake_client(voices=[], search_exc=RuntimeError('x'), getall_exc=RuntimeError('y'))
        err = io.StringIO()
        with redirect_stderr(err):
            self.assertEqual(eg.resolve_voice(c, 'Daniel')[0], 'onwK4e9ZLuTAKqWW03F9')
        self.assertIn('Voice lookup failed', err.getvalue())

    def test_lookup_permission_error_is_not_reported_as_not_found(self):
        err = api_error(401, {'detail': {'status': 'missing_permissions',
                                         'message': 'The API key you used is missing the permission voices_read'}})
        c = fake_client(voices=[], search_exc=err, getall_exc=err)
        with self.assertRaises(SystemExit) as cm:
            eg.resolve_voice(c, 'My Custom Narrator')
        msg = str(cm.exception.code)
        self.assertNotIn('not found in your ElevenLabs voices', msg)
        self.assertIn('HTTP 401', msg)
        self.assertIn('missing_permissions', msg)
        self.assertIn('Voices: Read', msg)
        self.assertIn('--voice', msg)

    def test_lookup_ok_but_no_match_is_not_found(self):
        # one lookup errors, the other lists voices without a match -> genuinely not found
        c = fake_client(search_exc=RuntimeError('x'))
        with self.assertRaises(SystemExit) as cm:
            eg.resolve_voice(c, 'Nobody Here')
        self.assertIn('not found in your ElevenLabs voices', str(cm.exception.code))

    def test_unknown_voice_fails_before_tts(self):
        c = fake_client(voices=[])
        with self.assertRaises(SystemExit) as cm:
            eg.resolve_voice(c, 'Nobody Here')
        self.assertIn('--list-voices', str(cm.exception.code))

    def test_list_voices_paginates(self):
        many = [voice(f'Voice {i:03d}', f'V{i:019d}') for i in range(7)]
        c = fake_client(voices=many, page_size=3)
        out = io.StringIO()
        with mock.patch.object(eg, 'make_client', return_value=c), \
                mock.patch.dict(os.environ, {'ELEVENLABS_API_KEY': 'k'}), redirect_stdout(out):
            self.assertEqual(eg.main(['--list-voices']), 0)
        text = out.getvalue()
        for v in many:
            self.assertIn(v.voice_id, text)
        self.assertEqual(len(c.voices.search_calls), 3)


class TestScriptParsing(TempDirCase):
    def test_ssml_tagged_fence(self):
        p = self.write_script(ssml_info='ssml')
        s = eg.load_script(p)
        self.assertEqual(s['text'], SSML_3)
        self.assertEqual(s['source'], 'ssml')
        self.assertEqual([b['text'] for b in s['beats']], [b['text'] for b in BEATS_3])
        self.assertEqual(s['beats'][0]['pause_after'], 0.7)

    def test_bare_and_xml_fences(self):
        for info in ('', 'xml', 'text'):
            s = eg.load_script(self.write_script(ssml_info=info))
            self.assertEqual(s['text'], SSML_3, info)

    def test_ssml_block_preferred_over_earlier_plain_block(self):
        p = self.tmp / 'script.md'
        p.write_text('```\nplain fallback with no pauses\n```\n\n```ssml\n<speak>Hi <break time="1s"/> there</speak>\n```\n',
                     encoding='utf-8')
        self.assertEqual(eg.load_script(p)['text'], 'Hi <break time="1s"/> there')

    def test_crlf_and_tilde_fences(self):
        p = self.tmp / 'script.md'
        p.write_bytes(b'Intro\r\n\r\n~~~ssml\r\nOne. <break time="0.8s" />\r\nTwo.\r\n~~~\r\n')
        self.assertEqual(eg.load_script(p)['text'], 'One. <break time="0.8s" />\nTwo.')

    def test_beats_only_builds_tts_text(self):
        p = self.tmp / 'script.md'
        p.write_text('```json\n' + json.dumps({'beats': BEATS_3}) + '\n```\n', encoding='utf-8')
        s = eg.load_script(p)
        self.assertEqual(s['source'], 'beats')
        self.assertEqual(s['text'].count('<break time="0.7s" />'), 2)
        self.assertEqual(eg.spoken_tokens(s['text']),
                         eg.spoken_tokens(' '.join(b['text'] for b in BEATS_3)))

    def test_empty_ssml_block_does_not_swallow_following_blocks(self):
        # an unfilled ```ssml / ``` pair must close at its own fence
        text = ('```ssml\n```\n\n## Beats\n\n```json\n'
                '{"beats":[{"slide":1,"text":"Hi."},{"slide":2,"text":"Bye."}]}\n```\n')
        blocks = eg.parse_fenced_blocks(text)
        self.assertEqual([b['info'] for b in blocks], ['ssml', 'json'])
        self.assertEqual(blocks[0]['body'], '')
        self.assertEqual([b['text'] for b in eg.extract_beats(blocks)], ['Hi.', 'Bye.'])
        self.assertIsNone(eg.extract_ssml(blocks))
        p = self.tmp / 'script.md'
        p.write_text(text, encoding='utf-8')
        err = io.StringIO()
        with redirect_stderr(err):
            s = eg.load_script(p)
        self.assertEqual(s['source'], 'beats')
        self.assertNotIn('```', s['text'])
        self.assertNotIn('beats', s['text'])
        self.assertIn('ssml block is empty', err.getvalue())

    def test_empty_blocks_everywhere(self):
        blocks = eg.parse_fenced_blocks('```\n```\n\n```ssml\nHi <break time="1s"/> there.\n```\n\n~~~\n~~~\n')
        self.assertEqual([b['body'] for b in blocks], ['', 'Hi <break time="1s"/> there.', ''])

    def test_invalid_beats_json_is_reported_not_silently_dropped(self):
        bad = json.dumps({'beats': BEATS_3}, indent=2).replace('"pause_after": 0.0\n    }',
                                                               '"pause_after": 0.0,\n    },')
        self.assertRaises(ValueError, json.loads, bad)
        for fence in ('json', ''):
            with self.subTest(fence=fence or 'bare'):
                p = self.tmp / 'script.md'
                p.write_text(f'```\n{SSML_3}\n```\n\n```{fence}\n{bad}\n```\n', encoding='utf-8')
                err = io.StringIO()
                with redirect_stderr(err):
                    s = eg.load_script(p)
                self.assertIsNone(s['beats'])
                self.assertEqual(s['text'], SSML_3, 'the broken JSON must never become the narration')
                self.assertIn('beats block is IGNORED', err.getvalue())
                self.assertIn('trailing commas', err.getvalue())
        # curly quotes
        curly = json.dumps({'beats': BEATS_3}).replace('"text"', '“text”')
        p.write_text(f'```ssml\n{SSML_3}\n```\n\n```json\n{curly}\n```\n', encoding='utf-8')
        err = io.StringIO()
        with redirect_stderr(err):
            eg.load_script(p)
        self.assertIn('curly quotes', err.getvalue())
        # the CLI shows it too (dry run)
        code, _, stderr = run_main([str(p), str(self.tmp), '--dry-run'])
        self.assertEqual(code, 0)
        self.assertIn('beats block is IGNORED', stderr)

    def test_longer_closing_fence_ends_the_block(self):
        # reviewer case: ```ssml closed by ```` used to run on into the prose and the ```js block
        p = self.tmp / 'script.md'
        p.write_text('# S\n\n```ssml\nHi there. <break time="0.7s" /> Bye now.\n````\n\n'
                     'Some prose about settings.\n\n```js\nconst TIMINGS = [];\n```\n', encoding='utf-8')
        self.assertEqual(eg.load_script(p)['text'], 'Hi there. <break time="0.7s" /> Bye now.')
        self.assertEqual([b['info'] for b in eg.parse_fenced_blocks(p.read_text(encoding='utf-8'))],
                         ['ssml', 'js'])
        # a shorter fence, or the other fence character, is content -- not the end
        md = '````ssml\nOne. <break time="1s"/>\n```\n~~~\nTwo.\n`````\nAfter.\n'
        blocks = eg.parse_fenced_blocks(md)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]['body'], 'One. <break time="1s"/>\n```\n~~~\nTwo.')
        self.assertTrue(blocks[0]['closed'])
        # a backtick fence's info string may not contain backticks (inline code, not a fence)
        self.assertEqual(eg.parse_fenced_blocks('```js `x` ```\nbody\n'), [])

    def test_unclosed_narration_block_is_refused(self):
        p = self.tmp / 'script.md'
        p.write_text('```ssml\nHi there. <break time="0.7s" /> Bye now.\n``\n\nProse that must not be read.\n',
                     encoding='utf-8')
        with self.assertRaises(SystemExit) as cm:
            eg.load_script(p)
        self.assertIn('never closed', str(cm.exception.code))
        # an unclosed block that is NOT the narration (a trailing code sample) is harmless
        p.write_text('```ssml\nHi there. <break time="0.7s" /> Bye now.\n```\n\n```js\nconst X = 1;\n',
                     encoding='utf-8')
        self.assertEqual(eg.load_script(p)['text'], 'Hi there. <break time="0.7s" /> Bye now.')

    def test_indented_fence(self):
        p = self.tmp / 'script.md'
        p.write_text('1. Paste this:\n\n    ```ssml\n    Hello there. <break time="1s"/>\n      World.\n    ```\n',
                     encoding='utf-8')
        self.assertEqual(eg.load_script(p)['text'], 'Hello there. <break time="1s"/>\n  World.')

    def test_break_tags_padded(self):
        self.assertEqual(eg.clean_tts_text('frame.<break time="0.7s"/>Then'), 'frame. <break time="0.7s"/> Then')
        self.assertEqual(eg.clean_tts_text('<speak>a <break time="1s" />\nb</speak>'), 'a <break time="1s" />\nb')

    def test_missing_and_non_utf8_script_are_friendly(self):
        with self.assertRaises(SystemExit) as cm:
            eg.load_script(self.tmp / 'nope.md')
        self.assertIn('Script not found', str(cm.exception.code))
        with self.assertRaises(SystemExit) as cm:
            eg.load_script(self.tmp)
        self.assertIn('folder', str(cm.exception.code))
        p = self.tmp / 'ansi.md'
        p.write_bytes('```ssml\nIt\x92s here. <break time="1s"/> Next.\n```\n'.encode('latin-1'))
        with self.assertRaises(SystemExit) as cm:
            eg.load_script(p)
        self.assertIn('not UTF-8', str(cm.exception.code))
        self.assertIn('line 2', str(cm.exception.code))
        # UTF-16 with BOM (Notepad "Unicode") and UTF-8 with BOM both work
        for enc in ('utf-16', 'utf-8-sig'):
            p.write_bytes('```ssml\nIt’s here. <break time="1s"/> Next.\n```\n'.encode(enc))
            self.assertEqual(eg.load_script(p)['text'], 'It’s here. <break time="1s"/> Next.', enc)

    def test_split_on_breaks(self):
        segs = eg.split_on_breaks(SSML_3, 0.6)
        self.assertEqual(len(segs), 3)
        self.assertEqual(len(eg.split_on_breaks(SSML_3, 0.3)), 4)
        self.assertEqual(len(eg.split_on_breaks('A <break time="700ms"/> B', 0.6)), 2)


class TestAlignmentToWords(unittest.TestCase):
    def test_break_chars_excluded_and_separate_words(self):
        text = 'Hi.<break time="1.0s" />There, — friend…'
        al, _ = synth_alignment(text)
        words = eg.alignment_to_words(al)
        self.assertEqual([w['text'] for w in words], ['Hi.', 'There, —', 'friend…'])
        gap = words[1]['start'] - words[0]['end']
        self.assertGreater(gap, 1.0)       # the tag's silence is a gap, not part of a word

    def test_multi_char_entries_and_missing_ends(self):
        al = {'characters': ['He', 'y', ' ', 'yo'], 'character_start_times_seconds': [0.0, 0.2, 0.3, 0.5],
              'character_end_times_seconds': [0.2, 0.3]}
        words = eg.alignment_to_words(al)
        self.assertEqual([w['text'] for w in words], ['Hey', 'yo'])
        self.assertEqual(words[1]['start'], 0.5)

    def test_empty(self):
        self.assertEqual(eg.alignment_to_words(None), [])
        self.assertEqual(eg.compute_cues([])[0], [])

    @staticmethod
    def _al(spec):
        """[(char, start, end)] -> alignment dict."""
        return {'characters': [c for c, _, _ in spec],
                'character_start_times_seconds': [s for _, s, _ in spec],
                'character_end_times_seconds': [e for _, _, e in spec]}

    def test_pause_folded_into_a_char_is_trimmed_from_the_word(self):
        # "Hi there <break 1s> now" with the tag chars dropped and the 1.0s pause
        # folded into the last "e" of "there"
        spec, t = [], 0.0
        for c in 'Hi there now':
            d = 0.03 if c == ' ' else 0.06
            spec.append((c, round(t, 3), round(t + d, 3)))
            t += d
        i_e = 7
        spec[i_e] = ('e', spec[i_e][1], spec[i_e][2] + 1.0)
        spec = spec[:i_e + 1] + [(c, round(s + 1.0, 3), round(e + 1.0, 3)) for c, s, e in spec[i_e + 1:]]
        raw = eg.alignment_to_words(self._al(spec))
        self.assertEqual([w['text'] for w in raw], ['Hi', 'there', 'now'])
        self.assertEqual(raw[1]['end'], spec[i_e][2], 'no pause known there: untouched')
        breaks = eg.break_positions('Hi there <break time="1.0s" /> now', raw)
        self.assertEqual(breaks, {2: 1.0})
        words = eg.alignment_to_words(self._al(spec), pause_before=breaks)
        self.assertAlmostEqual(words[1]['end'], spec[i_e][1] + 0.06, places=3)
        self.assertGreater(words[2]['start'] - words[1]['end'], 0.99, 'the pause is a gap again')
        # a number after a <break> legitimately spans its spoken expansion: never trimmed
        al, _ = synth_alignment('Look. <break time="0.8s" /> 2025 was big.')
        i2 = ''.join(al['characters']).index('2025')
        al['character_end_times_seconds'][i2] += 0.5
        for k in range(i2 + 1, len(al['characters'])):
            al['character_start_times_seconds'][k] += 0.5
            al['character_end_times_seconds'][k] += 0.5
        w = eg.alignment_to_words(al)[1]
        self.assertEqual((w['text'], w['start']), ('2025', round(al['character_start_times_seconds'][i2], 3)))
        # a single-letter word right after a zero-length <break> tag: its START is trimmed
        al, _ = synth_alignment('Hello there. <break time="0.8s" /> A new start.', tags='next')
        words = eg.alignment_to_words(al)
        i_a = ''.join(al['characters']).index('A new')
        self.assertEqual([w['text'] for w in words], ['Hello', 'there.', 'A', 'new', 'start.'])
        self.assertAlmostEqual(words[2]['start'], al['character_start_times_seconds'][i_a] + 0.8, delta=0.01)
        # ordinary lengths are left alone: every word edge is a character edge
        al, _ = synth_alignment(SSML_3.replace('Then', 'Thennnnn'), char_dur=0.09)
        starts = {round(x, 3) for x in al['character_start_times_seconds']}
        ends = {round(x, 3) for x in al['character_end_times_seconds']}
        for w in eg.alignment_to_words(al):
            self.assertIn(w['start'], starts, w)
            self.assertIn(w['end'], ends, w)

    def test_bracketless_break_tag_is_not_a_word(self):
        al, _ = synth_alignment('One two. <break time="0.7s" /> Three <break time="1.2s" /> four.',
                                tags='partial')
        self.assertIn('break time="0.7s" /', ''.join(al['characters']))
        self.assertEqual([w['text'] for w in eg.alignment_to_words(al)], ['One', 'two.', 'Three', 'four.'])
        # narration that merely mentions a break stays spoken
        al, _ = synth_alignment('Take a break, then time it.')
        self.assertEqual([w['text'] for w in eg.alignment_to_words(al)],
                         ['Take', 'a', 'break,', 'then', 'time', 'it.'])


class TestMp3Duration(unittest.TestCase):
    def test_synthetic_frames_with_id3_and_xing(self):
        data, dur = fake_mp3(3.0)
        self.assertAlmostEqual(eg.mp3_duration(data), dur, places=3)
        id3 = b'ID3\x04\x00\x00\x00\x00\x00\x0a' + b'\x00' * 10
        xing = b'\xff\xfb\x90\x64' + b'\x00' * 32 + b'Info' + b'\x00' * (417 - 40)
        self.assertAlmostEqual(eg.mp3_duration(id3 + xing + data + b'TAG' + b'\x00' * 125), dur, places=3)
        self.assertIsNone(eg.mp3_duration(b'not an mp3'))

    def test_real_encoder_output(self):
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            self.skipTest('imageio-ffmpeg not available')
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / 'tone.mp3'
            r = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
                                'sine=frequency=440:duration=2.5', '-ar', '44100', '-b:a', '128k', str(out)],
                               capture_output=True, timeout=120)
            if r.returncode != 0:
                self.skipTest('ffmpeg could not encode mp3: ' + r.stderr.decode(errors='replace')[:200])
            self.assertAlmostEqual(eg.mp3_duration(out.read_bytes()), 2.5, delta=0.06)


# --------------------------------------------------------------------------
# sb_deckio
# --------------------------------------------------------------------------

class TestDeckIO(TempDirCase):
    def test_read_timings_variants(self):
        html = ('<script>\n// const TIMINGS = [{time: 99, slide: 9}];\n'
                'let TIMINGS = [ {slide: 1, time: 0}, { "time": 2.5, "slide": 2 }, {time:.5,slide:3,}, ];\n'
                '</script>')
        self.assertEqual(sb_deckio.read_timings(html),
                         [{'time': 0.0, 'slide': 1}, {'time': 2.5, 'slide': 2}, {'time': 0.5, 'slide': 3}])
        self.assertIsNone(sb_deckio.read_timings('<script>const X = [];</script>'))

    def test_ignores_code_samples_and_comments(self):
        html = ('<pre>const TIMINGS = [{ time: 5, slide: 1 }];</pre>\n'
                '<!-- <script>const TIMINGS = [{ time: 6, slide: 1 }];</script> -->\n'
                '<script>/* const TIMINGS = [{ time: 7, slide: 1 }]; */\n'
                'const s = "const TIMINGS = [{ time: 8, slide: 1 }]";\n'
                'const TIMINGS = [{ time: 0, slide: 1 }, { time: 3, slide: 2 }];\n'
                'Storyboard.init({ timings: TIMINGS });</script>')
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(html)], [0.0, 3.0])
        new = sb_deckio.write_timings(html, [0.0, 4.25])
        self.assertIn('<pre>const TIMINGS = [{ time: 5, slide: 1 }];</pre>', new)
        self.assertIn('"const TIMINGS = [{ time: 8, slide: 1 }]"', new)
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(new)], [0.0, 4.25])

    def test_write_timings_replaces_in_place_preserving_crlf_and_indent(self):
        html = deck_html(3, nl='\r\n')
        new = sb_deckio.write_timings(html, [{'time': 0, 'slide': 1}, {'time': 1.234, 'slide': 2},
                                             {'time': 9.5, 'slide': 3}])
        self.assertNotIn('\n', new.replace('\r\n', ''))
        self.assertIn('\r\n    { time:    1.23, slide:  2 },\r\n', new)
        self.assertIn('\r\n  ];', new)
        before, after = html.split('const TIMINGS')[0], html.split('const SLIDE_LABELS')[1]
        self.assertTrue(new.startswith(before))
        self.assertTrue(new.endswith(after))

    def test_write_timings_inserts_and_wires_when_missing(self):
        html = '<script>\n  Storyboard.init({ labels: [] });\n</script>'
        notes = []
        new = sb_deckio.write_timings(html, [0.0, 2.0], notes)
        self.assertLess(new.index('const TIMINGS'), new.index('Storyboard.init'))
        self.assertIn('labels: [], timings: TIMINGS', new)
        self.assertTrue(notes)
        with self.assertRaises(sb_deckio.DeckIOError):
            sb_deckio.write_timings('<p>no scripts</p>', [0.0])

    def test_write_words_insert_variants(self):
        words = [{'text': 'Hi', 'start': 0.1, 'end': 0.3}]
        cases = {
            'single': ('Storyboard.init({ timings: TIMINGS, fallbackDuration: 75 });',
                       'fallbackDuration: 75, words: WORDS }'),
            'multi_trailing_comma': ('Storyboard.init({\n    timings: TIMINGS,\n    labels: SLIDE_LABELS, // x\n  });',
                                     'labels: SLIDE_LABELS, // x\n    words: WORDS,\n  });'),
            'multi_no_comma': ('Storyboard.init({\n    timings: TIMINGS\n  });', 'timings: TIMINGS,\n    words: WORDS\n'),
            'multi_no_comma_comment': ('Storyboard.init({\n    timings: TIMINGS // cues\n  });',
                                       'timings: TIMINGS, // cues\n    words: WORDS\n  });'),
            'multi_block_comment': ('Storyboard.init({\n    timings: TIMINGS /* a\n b */\n  });',
                                    'timings: TIMINGS,\n    words: WORDS /* a\n b */'),
            'multi_last_on_close_line': ('Storyboard.init({\n    timings: TIMINGS, labels: SLIDE_LABELS });',
                                         'labels: SLIDE_LABELS, words: WORDS });'),
            'empty_obj': ('Storyboard.init({});', 'Storyboard.init({ words: WORDS });'),
            'no_args': ('Storyboard.init();', 'Storyboard.init({ words: WORDS });'),
            'alias': ('window.STORYBOARD.init({ timings: TIMINGS });', 'timings: TIMINGS, words: WORDS }'),
        }
        for name, (init, expect) in cases.items():
            with self.subTest(name):
                html = deck_html(2, init=init)
                new = sb_deckio.write_words(html, words)
                self.assertIn(expect, new)
                self.assertLess(new.index('const WORDS'), new.index('.init('))
                self.assertEqual(sb_deckio.read_words(new), words)
                again = sb_deckio.write_words(new, words)
                self.assertEqual(again, new, 'idempotent')
                opts = node_eval_init(new)
                if opts is not None:
                    self.assertEqual(opts['words'], words)

    def test_write_words_init_sharing_line_with_other_code(self):
        html = ("<body><script>document.addEventListener('DOMContentLoaded', () => "
                "Storyboard.init({ timings: TIMINGS }));</script>"
                "<script>const TIMINGS = [{ time: 0, slide: 1 }];</script></body>")
        new = sb_deckio.write_words(html, [{'text': 'a', 'start': 0, 'end': 0.1}])
        self.assertTrue(new.startswith('<body><script>\nconst WORDS = ['))
        self.assertIn('Storyboard.init({ timings: TIMINGS, words: WORDS })', new)
        if NODE:
            node_eval_init(new)   # syntax + TDZ check (throws on failure)

    def test_write_words_existing_other_value_is_noted(self):
        html = deck_html(2, init='Storyboard.init({ timings: TIMINGS, words: [] });')
        notes = []
        new = sb_deckio.write_words(html, [{'text': 'a', 'start': 0, 'end': 1}], notes)
        self.assertIn('words: [] }', new)
        self.assertTrue(any('already passes `words: []`' in n for n in notes))

    def test_words_with_hostile_text_roundtrip(self):
        words = [{'text': '[laughs]', 'start': 0, 'end': 0.5}, {'text': 'say "hi"}];', 'start': 0.5, 'end': 1},
                 {'text': '</script><b>', 'start': 1, 'end': 1.5}, {'text': "it's", 'start': 1.5, 'end': 2}]
        html = deck_html(2, words_const='[]')
        new = sb_deckio.write_words(html, words)
        self.assertNotIn('</script><b>', new)
        self.assertEqual(sb_deckio.read_words(new), words)
        # a second rewrite must still find the array end despite the brackets in strings
        new2 = sb_deckio.write_words(new, words[:1])
        self.assertEqual(sb_deckio.read_words(new2), words[:1])
        self.assertEqual(sb_deckio.read_timings(new2), sb_deckio.read_timings(html))
        opts = node_eval_init(new)
        if opts is not None:
            self.assertEqual(opts['words'], words)

    def test_legacy_deck_without_init(self):
        html = ('<script>\n  const TIMINGS = [{ time: 0, slide: 1 }];\n  const WORD_HITS = [];\n'
                '  const FALLBACK_DURATION = 60;\n</script>')
        notes = []
        new = sb_deckio.write_words(html, [{'text': 'a', 'start': 0, 'end': 1}], notes)
        self.assertLess(new.index('const WORD_HITS'), new.index('const WORDS'))
        self.assertLess(new.index('const WORDS'), new.index('FALLBACK_DURATION'))
        self.assertTrue(any('No Storyboard.init()' in n for n in notes))

    def test_count_slides(self):
        html = ('<div class="deck"><section class="slide" data-slide="1"><div class="slide-center"></div></section>'
                "<section class='dark slide'></section><div class=slide></div>"
                '<div data-class="slide"></div><div class="slides"></div></div>'
                '<!-- <section class="slide"></section> -->'
                '<script>const t = \'<section class="slide">\';</script>'
                '<style>.slide{}</style>')
        self.assertEqual(sb_deckio.count_slides(html), 3)
        self.assertEqual(sb_deckio.count_slides('<p>none</p>'), 0)
        custom = ('<div class="page"></div><div class="page"></div><div class="slide"></div>'
                  "<script>Storyboard.init({ slideSelector: '.page' });</script>")
        self.assertEqual(sb_deckio.count_slides(custom), 2)
        self.assertEqual(sb_deckio.count_slides(deck_html(5)), 5)

    def test_audio_src(self):
        html = '<audio src="a.mp3"></audio><audio id="voAudio" preload="auto" src="VO English.mp3"></audio>'
        self.assertEqual(sb_deckio.read_audio_src(html), 'VO English.mp3')
        new = sb_deckio.write_audio_src(html, 'voice & "over".mp3')
        self.assertIn('id="voAudio" preload="auto" src="voice &amp; &quot;over&quot;.mp3"', new)
        self.assertEqual(sb_deckio.read_audio_src(new), 'voice & "over".mp3')
        self.assertIn('<audio src="voiceover.mp3" data-storyboard-audio>',
                      sb_deckio.write_audio_src('<audio data-storyboard-audio>', 'voiceover.mp3'))
        with self.assertRaises(sb_deckio.DeckIOError):
            sb_deckio.write_audio_src('<p></p>', 'x.mp3')

    def test_apply_to_deck_backup_warnings_bom(self):
        deck = self.tmp / 'deck.html'
        original = b'\xef\xbb\xbf' + deck_html(4).encode('utf-8')
        deck.write_bytes(original)
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 1.0, 2.0],
                                      words=[{'text': 'x', 'start': 0, 'end': 1}], audio_src='voiceover.mp3')
        self.assertEqual(Path(rep['backup']).read_bytes(), original)
        self.assertEqual(rep['slides'], 4)
        self.assertTrue(any('3 cues but the deck has 4 slides' in w for w in rep['warnings']))
        data = deck.read_bytes()
        self.assertTrue(data.startswith(b'\xef\xbb\xbf'))
        html = data[3:].decode('utf-8')
        self.assertEqual(len(sb_deckio.read_timings(html)), 3)
        self.assertEqual(sb_deckio.read_audio_src(html), 'voiceover.mp3')
        rep2 = sb_deckio.apply_to_deck(deck, timings=[0.0, 1.0, 2.0, 3.0])
        self.assertEqual(rep2['warnings'], [])

    def test_init_continuing_an_expression(self):
        words = [{'text': 'a', 'start': 0, 'end': 0.1}]
        for lead in ('const sb = window.existing ||', 'if (window.go !== false)', 'const go = () =>'):
            with self.subTest(lead):
                html = ('<body><script>\n  const TIMINGS = [{ time: 0, slide: 1 }];\n'
                        f'  {lead}\n    Storyboard.init({{ timings: TIMINGS }});\n'
                        + ('  go();\n' if 'go =' in lead else '') + '</script></body>')
                new = sb_deckio.write_words(html, words)
                self.assertTrue(new.startswith('<body><script>\nconst WORDS = ['), new)
                self.assertIn(lead + '\n    Storyboard.init({ timings: TIMINGS, words: WORDS });', new)
                opts = node_eval_init(new)
                if opts is not None:
                    self.assertEqual(opts['words'], words)
        # a plain statement line (no semicolons) still gets WORDS right above init
        html = ('<script>\n  const TIMINGS = [{ time: 0, slide: 1 }]\n  const WORD_HITS = []\n'
                '  Storyboard.init({ timings: TIMINGS })\n</script>')
        new = sb_deckio.write_words(html, words)
        self.assertIn('const WORD_HITS = []\n  const WORDS = [', new)
        if NODE:
            node_eval_init(new)

    def test_non_literal_declaration_raises(self):
        html = ('<script>\n  const TIMINGS = [{ time: 0, slide: 1 }];\n  let WORDS = window.SB_WORDS;\n'
                '  Storyboard.init({ timings: TIMINGS, words: WORDS });\n</script>')
        self.assertIsNone(sb_deckio.read_words(html))
        with self.assertRaises(sb_deckio.DeckIOError):
            sb_deckio.write_words(html, [])
        with self.assertRaises(sb_deckio.DeckIOError):
            sb_deckio.write_timings('<script>var TIMINGS = load();\nStoryboard.init({});</script>', [0.0])

    def test_mask_js_template_literals(self):
        src = ("const a = `x${ {k: '}'}.k }y${`in${`deep ${1}`}`}z` + 'q';\n"
               "const b = `esc \\` still ${ \"}\" } in`;\n"
               "const TIMINGS = [1];\n"
               "const c = `line1\nline2 ${ [2].map(v => `${v}`) }`; // tail `\n"
               "const d = 2;")
        view = sb_deckio._mask_js(src)
        self.assertEqual(len(view), len(src))
        self.assertEqual(view.count('\n'), src.count('\n'))
        lines = view.split('\n')
        self.assertIsNotNone(re.fullmatch(r"const a = `( +)` \+ ' ';", lines[0]), lines[0])
        self.assertIn('const TIMINGS = [1];', view)
        self.assertTrue(lines[-1] == 'const d = 2;', lines[-1])
        for hidden in ('deep', 'still', 'line2', 'tail', 'map'):
            self.assertNotIn(hidden, view)
        # comments-only view keeps the literals
        loose = sb_deckio._mask_js(src, keep_literals=True)
        self.assertIn('deep ${1}', loose)
        self.assertNotIn('tail', loose)
        # unterminated template: blanked to the end, nothing after it is "code"
        self.assertNotIn('TIMINGS', sb_deckio._mask_js('const s = `oops ${x}\nconst TIMINGS = [];'))

    def test_nested_template_literals_in_deck(self):
        base_t = '  const TIMINGS = [\n    { time: 0.0, slide: 1 },\n    { time: 5.0, slide: 2 }\n  ];\n'
        init = '  Storyboard.init({ timings: TIMINGS });\n'
        n = NESTED_TMPL + '\n'
        variants = {
            'before_and_after': '<script>\n' + n + base_t + n + init + '</script>',
            'before_with_comment_backtick': '<script>\n' + n + base_t + '  // made by `tool\n' + init + '</script>',
            'in_other_script': '<script>\n' + n + '</script>\n<script>\n' + base_t + init + '</script>',
            'between_timings_and_init': '<script>\n' + base_t + n + init + '</script>',
            'after_init': '<script>\n' + base_t + init + n + '</script>',
        }
        words = [{'text': 'hi', 'start': 0, 'end': 1}]
        for name, html in variants.items():
            with self.subTest(name):
                self.assertEqual([t['time'] for t in sb_deckio.read_timings(html)], [0.0, 5.0])
                self.assertIsNotNone(sb_deckio.find_init_call(html))
                notes = []
                new = sb_deckio.write_words(sb_deckio.write_timings(html, [0.0, 1.5], notes), words, notes)
                self.assertEqual(js_decls(new, 'TIMINGS'), 1)
                self.assertEqual(js_decls(new, 'WORDS'), 1)
                self.assertFalse(any('No Storyboard.init' in x or 'Inserted' in x for x in notes), notes)
                self.assertEqual(new.count(NESTED_TMPL), html.count(NESTED_TMPL))
                opts = node_eval_init(new)
                if opts is not None:
                    self.assertEqual([t['time'] for t in opts['timings']], [0.0, 1.5])
                    self.assertEqual(opts['words'], words)

    def test_refuses_insert_when_name_appears_in_string_or_assignment(self):
        # a `const WORDS` only inside a string: refuse rather than risk a duplicate
        html = ('<script>\n  const TIMINGS = [{ time: 0, slide: 1 }];\n'
                '  const help = "paste: const WORDS = [...]";\n  Storyboard.init({ timings: TIMINGS });\n</script>')
        with self.assertRaises(sb_deckio.DeckIOError) as cm:
            sb_deckio.write_words(html, [])
        self.assertIn('string or template literal', str(cm.exception))
        # `const X = 1, TIMINGS = [...]` is not found as `const TIMINGS = [` -- must not insert a second one
        html = '<script>\n  const X = 1, TIMINGS = [{ time: 0, slide: 1 }];\n  Storyboard.init({ timings: TIMINGS });\n</script>'
        self.assertIsNone(sb_deckio.read_timings(html))
        with self.assertRaises(sb_deckio.DeckIOError) as cm:
            sb_deckio.write_timings(html, [0.0])
        self.assertIn('assigned', str(cm.exception))
        # comparisons / arrows / properties are not assignments
        ok = ('<script>\n  window.WORDS = [];\n  Storyboard.init({});\n'
              '  if (WORDS == null || window.WORDS === 1) {}\n  const f = WORDS => 1;\n</script>')
        new = sb_deckio.write_words(ok, [])
        self.assertIn('const WORDS = [', new)
        if NODE:
            self.assertEqual(node_eval_init(new)['words'], [])

    def test_comma_declaration_keeps_its_shape(self):
        html = ("<script>\n  const TIMINGS = [{ time: 0, slide: 1 }], SLIDE_LABELS = ['a', 'b'];\n"
                "  const WORDS = [], WORD_HITS = [];\n"
                "  Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, words: WORDS });\n</script>")
        new = sb_deckio.write_words(sb_deckio.write_timings(html, [0.0, 2.0]), [{'text': 'a', 'start': 0, 'end': 1}])
        self.assertIn("  ], SLIDE_LABELS = ['a', 'b'];", new)
        self.assertIn('], WORD_HITS = [];', new)
        self.assertNotIn('];,', new)
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(new)], [0.0, 2.0])
        opts = node_eval_init(new)
        if opts is not None:
            self.assertEqual(opts['labels'], ['a', 'b'])
            self.assertEqual(len(opts['timings']), 2)
        # ASI style (no semicolons) stays semicolon-free and valid
        asi = '<script>\n  const TIMINGS = [{ time: 0, slide: 1 }]\n  Storyboard.init({ timings: TIMINGS })\n</script>'
        new = sb_deckio.write_timings(asi, [0.0, 3.0])
        self.assertNotIn('];', new)
        if NODE:
            self.assertEqual(len(node_eval_init(new)['timings']), 2)

    def test_audio_src_adopt_overlay_id(self):
        # adopt mode: the page's own <audio> comes first; the overlay's narration is #sbVoAudio
        html = ('<audio src="podcast.mp3" controls></audio><section>A</section>'
                '<audio id="sbVoAudio" preload="metadata" src="voiceover.mp3"></audio>')
        self.assertEqual(sb_deckio.read_audio_src(html), 'voiceover.mp3')
        new = sb_deckio.write_audio_src(html, 'take2.mp3')
        self.assertIn('<audio src="podcast.mp3" controls>', new)
        self.assertIn('id="sbVoAudio" preload="metadata" src="take2.mp3"', new)
        # #voAudio still wins over #sbVoAudio
        both = html + '<audio id="voAudio" src="vo.mp3"></audio>'
        self.assertEqual(sb_deckio.read_audio_src(both), 'vo.mp3')

    def test_apply_to_deck_never_overwrites_a_backup(self):
        deck = self.tmp / 'deck.html'
        original = deck_html(3)
        deck.write_text(original, encoding='utf-8')
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 1.0, 2.0])
        self.assertEqual(Path(rep['backup']).name, 'deck.html.bak')
        first = deck.read_text(encoding='utf-8')
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 1.5, 2.5])
        self.assertEqual(Path(rep['backup']).name, 'deck.html.bak2')
        self.assertEqual((self.tmp / 'deck.html.bak').read_text(encoding='utf-8'), original)
        self.assertEqual((self.tmp / 'deck.html.bak2').read_text(encoding='utf-8'), first)
        # back to the first version's bytes: the backup that already holds them is reused
        deck.write_text(first, encoding='utf-8')
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 3.0, 4.0])
        self.assertEqual(Path(rep['backup']).name, 'deck.html.bak2')
        self.assertFalse((self.tmp / 'deck.html.bak3').exists())
        # nothing to change -> no backup at all
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 3.0, 4.0])
        self.assertFalse(rep['changed'])
        self.assertIsNone(rep['backup'])
        self.assertEqual(sorted(p.name for p in self.tmp.glob('deck.html.bak*')),
                         ['deck.html.bak', 'deck.html.bak2'])

    def test_apply_to_deck_without_audio_warns(self):
        deck = self.tmp / 'deck.html'
        deck.write_text(re.sub(r'\s*<audio\b[^>]*></audio>', '', deck_html(2)), encoding='utf-8')
        rep = sb_deckio.apply_to_deck(deck, timings=[0.0, 1.0], audio_src='voiceover.mp3')
        self.assertTrue(any('no <audio> element' in w for w in rep['warnings']))
        self.assertEqual(len(sb_deckio.read_timings(deck.read_text(encoding='utf-8'))), 2)

    # an engine-like library inlined before the deck's own script: function-local
    # state with the same names, assigned inside a nested function
    INLINE_ENGINE = ('<script>\n(function(){\n'
                     '  let TIMINGS=[], SLIDE_LABELS=[], WORD_HITS=[], WORDS=[], CAPTIONS=null;\n'
                     '  function init(opts){ TIMINGS=opts.timings||[]; WORDS=opts.words||[];\n'
                     '    if (!TIMINGS.length) { const X = { a: 1 }; } }\n'
                     '  window.__engine = { init: init, get words(){ return WORDS; } };\n'
                     '})();\n</script>')

    def _inline(self, html):
        return html.replace('<script src="storyboard-engine.js"></script>', self.INLINE_ENGINE)

    def test_inlined_engine_locals_are_not_the_decks_consts(self):
        html = self._inline(deck_html(3))
        self.assertIn('let TIMINGS=[]', html)
        engine_part = html[:html.index('</script>') + 9]
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(html)], [0.0, 8.0, 16.0])
        notes = []
        new = sb_deckio.write_words(sb_deckio.write_timings(html, [0.0, 1.5, 3.0], notes),
                                    [{'text': 'hi', 'start': 0, 'end': 1}], notes)
        self.assertTrue(new.startswith(engine_part), 'the engine script must be left as is')
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(new)], [0.0, 1.5, 3.0])
        self.assertEqual(sb_deckio.read_words(new), [{'text': 'hi', 'start': 0.0, 'end': 1.0}])
        self.assertEqual(new.count('const WORDS'), 1)
        opts = node_eval_init(new)
        if opts is not None:
            self.assertEqual([t['time'] for t in opts['timings']], [0.0, 1.5, 3.0])
            self.assertEqual(len(opts['words']), 1)
        # a deck without its own TIMINGS gets one inserted -- the engine's is never rewritten
        bare = re.sub(r'  const TIMINGS = \[.*?\];\n', '', html, count=1, flags=re.DOTALL)
        self.assertIsNone(sb_deckio.read_timings(bare))
        new = sb_deckio.write_timings(bare, [0.0, 2.0], notes)
        self.assertTrue(new.startswith(engine_part))
        self.assertEqual(len(sb_deckio.read_timings(new)), 2)
        if NODE:
            self.assertEqual(len(node_eval_init(new)['timings']), 2)

    def test_inlined_engine_does_not_block_the_elevenlabs_preflight(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(self._inline(deck_html(3)), encoding='utf-8')
        self.assertIsNotNone(eg._deck_preflight(deck))

    def test_conflicts_in_the_decks_own_scope_still_refuse(self):
        base = self._inline(deck_html(2))
        for bad in ('  let WORDS = window.SB_WORDS;\n',                  # top-level, not a literal
                    '  if (window.x) { var WORDS = 1; }\n',             # var hoists to global
                    '  function load(){ WORDS = [1]; }\n'):             # sloppy global assignment
            with self.subTest(bad=bad.strip()):
                html = base.replace('  const WORD_HITS = [];\n', '  const WORD_HITS = [];\n' + bad)
                with self.assertRaises(sb_deckio.DeckIOError):
                    sb_deckio.write_words(html, [])
        # a block-scoped let elsewhere is fine
        ok = base.replace('  const WORD_HITS = [];\n', '  const WORD_HITS = [];\n  { let WORDS = 2; }\n')
        new = sb_deckio.write_words(ok, [])
        self.assertIn('const WORDS = [];', new)
        if NODE:
            self.assertEqual(node_eval_init(new)['words'], [])

    def test_real_engine_inlined_into_template(self):
        eng_p, tpl_p = SKILL / 'storyboard-engine.js', SKILL / 'template.html'
        if not (eng_p.is_file() and tpl_p.is_file()):
            self.skipTest('engine / template not shipped')
        tpl = tpl_p.read_text(encoding='utf-8')
        tag = re.search(r'<script src="storyboard-engine\.js"></script>', tpl)
        if not tag:
            self.skipTest('template does not load storyboard-engine.js by a plain <script src>')
        eng = eng_p.read_text(encoding='utf-8').replace('</script', '<\\/script')
        html = tpl[:tag.start()] + '<script>\n' + eng + '\n</script>' + tpl[tag.end():]
        want = sb_deckio.read_timings(tpl)
        self.assertEqual(sb_deckio.read_timings(html), want)
        n = len(want)
        new = sb_deckio.write_words(sb_deckio.write_timings(html, [float(i) for i in range(n)]),
                                    [{'text': 'a', 'start': 0, 'end': 1}])
        self.assertIn(eng, new, 'the inlined engine must be left as is')
        self.assertEqual([t['time'] for t in sb_deckio.read_timings(new)], [float(i) for i in range(n)])
        self.assertEqual(sb_deckio.read_words(new), [{'text': 'a', 'start': 0.0, 'end': 1.0}])

    def test_apply_to_deck_revisits_and_out_of_range_slides(self):
        deck = self.tmp / 'deck.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        rep = sb_deckio.apply_to_deck(deck, timings=[{'time': 0, 'slide': 1}, {'time': 2, 'slide': 2},
                                                     {'time': 4, 'slide': 3}, {'time': 6, 'slide': 2}])
        self.assertTrue(any('4 cues but the deck has 3 slides' in w and 'revisit slide 2' in w
                            for w in rep['warnings']), rep['warnings'])
        rep = sb_deckio.apply_to_deck(deck, timings=[{'time': 0, 'slide': 1}, {'time': 2, 'slide': 2},
                                                     {'time': 4, 'slide': 5}])
        self.assertTrue(any('slide 5 but the deck has only 3' in w for w in rep['warnings']), rep['warnings'])

    def test_real_templates_parse(self):
        # read-only sanity check on the shipped templates (skipped if absent)
        for name in ('template.html', 'vertical_template.html'):
            p = SKILL / name
            if not p.is_file():
                continue
            with self.subTest(name):
                html = p.read_text(encoding='utf-8')
                n = sb_deckio.count_slides(html)
                self.assertGreater(n, 0)
                self.assertIsNotNone(sb_deckio.read_timings(html))
                new = sb_deckio.write_words(sb_deckio.write_timings(html, [0.0] * n),
                                            [{'text': 'a', 'start': 0, 'end': 1}])
                self.assertEqual(len(sb_deckio.read_timings(new)), n)


if __name__ == '__main__':
    unittest.main()
