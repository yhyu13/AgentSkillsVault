"""Tests for tts_free.py — the zero-config edge-tts voice path.

edge-tts is never contacted: a fake `edge_tts` module is injected into
sys.modules. Its Communicate yields real MP3 bytes (a tone per word, encoded by
the imageio-ffmpeg binary exactly the way Edge streams it: 24 kHz mono LAME CBR
with no Xing header) plus WordBoundary events in 100-ns ticks, so decoding,
trimming, concatenation and encoding are all exercised for real.

Run:
    python -m unittest discover -s tests -p "test_*.py"
"""
import asyncio
import contextlib
import io
import json
import math
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from array import array
from pathlib import Path
from unittest import mock

SKILL = Path(__file__).resolve().parent.parent
if str(SKILL) not in sys.path:
    sys.path.insert(0, str(SKILL))

import tts_free  # noqa: E402

WORD_SEC = 0.2          # fake voice: every word is a 0.2 s tone ...
WORD_DUR = 0.18         # ... whose WordBoundary duration is 0.18 s
LEAD_SIL = 0.1          # fake Edge segments start with 0.1 s of silence (like the real service)
TAIL_SIL = 0.3


def _fake_mp3(n_words, cache={}):  # noqa: B006 — deliberate per-process memo
    """Edge-like MP3: LEAD_SIL silence, n_words * WORD_SEC of 440 Hz tone, TAIL_SIL silence."""
    if n_words in cache:
        return cache[n_words]
    sr = 24000
    pcm = array('h', bytes(2 * int(LEAD_SIL * sr)))
    k = int(n_words * WORD_SEC * sr)
    pcm.extend(int(12000 * math.sin(2 * math.pi * 440 * i / sr)) for i in range(k))
    pcm.extend(array('h', bytes(2 * int(TAIL_SIL * sr))))
    if sys.byteorder != 'little':
        pcm.byteswap()
    # Encoding to a pipe means no Xing/LAME header — the same shape Edge streams.
    p = subprocess.run([tts_free.ffmpeg_exe(), '-hide_banner', '-loglevel', 'error',
                        '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0',
                        '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', 'pipe:1'],
                       input=pcm.tobytes(), capture_output=True, check=True)
    cache[n_words] = p.stdout
    return p.stdout


def _bare_words(text):
    """What Edge reports per WordBoundary: the word without surrounding punctuation."""
    return [w.strip('.,!?;:"“”()') for w in text.split() if w.strip('.,!?;:"“”()')]


class _Exc(types.SimpleNamespace):
    pass


class FakeNoAudio(Exception):
    pass


class FakeWebSocketError(Exception):
    pass


def make_fake_edge(fail_first=0, fail_exc=None, sentence_only=False, old_signature=False):
    """Build a fake edge_tts module. Returns (module, calls list)."""
    calls = []
    state = {'failures_left': fail_first}

    def _stream_impl(self):
        async def gen():
            if state['failures_left'] > 0:
                state['failures_left'] -= 1
                raise (fail_exc or FakeWebSocketError('connection reset'))
            words = _bare_words(self.text)
            audio = _fake_mp3(len(words))
            third = max(1, len(audio) // 3)
            for i in range(0, len(audio), third):
                yield {'type': 'audio', 'data': audio[i:i + third]}
            ticks = tts_free.TICKS_PER_SECOND
            if sentence_only:
                yield {'type': 'SentenceBoundary', 'offset': int(LEAD_SIL * ticks),
                       'duration': int(len(words) * WORD_SEC * ticks), 'text': self.text}
                return
            for i, w in enumerate(words):
                yield {'type': 'WordBoundary', 'offset': int(round((LEAD_SIL + i * WORD_SEC) * ticks)),
                       'duration': int(round(WORD_DUR * ticks)), 'text': w}
        return gen()

    if old_signature:
        class Communicate:
            def __init__(self, text, voice='en-US-AriaNeural', *, rate='+0%', volume='+0%', pitch='+0Hz'):
                self.text, self.voice, self.rate, self.pitch = text, voice, rate, pitch
                calls.append({'text': text, 'voice': voice, 'rate': rate, 'pitch': pitch})

            def stream(self):
                return _stream_impl(self)
    else:
        class Communicate:
            def __init__(self, text, voice='en-US-EmmaMultilingualNeural', *, rate='+0%', volume='+0%',
                         pitch='+0Hz', boundary='SentenceBoundary', connector=None, proxy=None,
                         connect_timeout=10, receive_timeout=60):
                if not voice.endswith('Neural'):
                    raise ValueError(f'Invalid voice {voice!r}')
                self.text, self.voice, self.rate, self.pitch = text, voice, rate, pitch
                calls.append({'text': text, 'voice': voice, 'rate': rate, 'pitch': pitch,
                              'boundary': boundary})

            def stream(self):
                return _stream_impl(self)

    async def list_voices():
        return [
            {'ShortName': 'en-US-AndrewMultilingualNeural', 'Gender': 'Male', 'Locale': 'en-US',
             'FriendlyName': 'Andrew', 'VoiceTag': {'VoicePersonalities': ['Warm']}},
            {'ShortName': 'en-GB-RyanNeural', 'Gender': 'Male', 'Locale': 'en-GB',
             'FriendlyName': 'Ryan', 'VoiceTag': {'VoicePersonalities': ['Friendly']}},
            {'ShortName': 'fr-FR-DeniseNeural', 'Gender': 'Female', 'Locale': 'fr-FR',
             'FriendlyName': 'Denise', 'VoiceTag': {}},
            {'ShortName': 'en-US-AvaMultilingualNeural', 'Gender': 'Female', 'Locale': 'en-US',
             'FriendlyName': 'Ava', 'VoiceTag': {'VoicePersonalities': ['Expressive']}},
        ]

    mod = types.ModuleType('edge_tts')
    mod.Communicate = Communicate
    mod.list_voices = list_voices
    mod.exceptions = _Exc(NoAudioReceived=FakeNoAudio, WebSocketError=FakeWebSocketError)
    return mod, calls


def _decode(path, sr=48000):
    """Decode an MP3 *file* the way a browser does: ffmpeg reading a seekable file
    honors the LAME/Xing gapless header (encoder delay AND end padding); a pipe
    only gets the delay, so it would report up to one frame of extra tail."""
    p = subprocess.run([tts_free.ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-i', str(path),
                        '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '1', '-ar', str(sr), 'pipe:1'],
                       capture_output=True, check=True)
    pcm = array('h')
    pcm.frombytes(p.stdout[:len(p.stdout) // 2 * 2])
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm


def _rms_db(pcm, sr, t, half=0.01):
    a, b = max(0, int((t - half) * sr)), min(len(pcm), int((t + half) * sr))
    seg = pcm[a:b]
    if not seg:
        return -120.0
    ms = sum(x * x for x in seg) / len(seg)
    return 10 * math.log10(ms / (32768.0 ** 2) + 1e-12)


SCRIPT_MD = '''# Demo — Voice-Over Script

## 1. Paste into ElevenLabs

```
Hello there, world! <break time="0.7s" />
This part is ignored because the beats block wins. <break time="1.0s" />
```

## Beats

```json
{"beats": [
  {"slide": 1, "text": "Hello there, world!", "pause_after": 0.7},
  {"slide": 2, "text": "Fraud costs merchants billions. <break time=\\"0.3s\\" /> Most of it is invisible.", "pause_after": 1.0},
  {"slide": 3, "text": "Start protecting \\u201crevenue\\u201d today."}
]}
```

## 5. TIMINGS

```js
const TIMINGS = [];
```
'''

DECK_HTML = '''<!DOCTYPE html>
<html><head><title>t</title></head>
<body>
  <div class="deck">
    <section class="slide" data-slide="1"><h1>One</h1></section>
    <section class="slide dark" data-slide="2"><h1>Two</h1></section>
    <section class="slide" data-slide="3"><h1>Three</h1></section>
  </div>
  <audio id="voAudio" preload="auto" src="voiceover.mp3"></audio>
  <script src="storyboard-engine.js"></script>
  <script>
  const TIMINGS = [
    { time:  0.0, slide: 1 },
    { time:  8.0, slide: 2 },
    { time: 20.0, slide: 3 }
  ];
  const SLIDE_LABELS = ['One', 'Two', 'Three'];
  const WORD_HITS = [];
  Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, wordHits: WORD_HITS, fallbackDuration: 30 });
  </script>
</body>
</html>
'''


class _TmpMixin:
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='tts_free_test_'))
        self._backoff = tts_free.BACKOFF_BASE
        tts_free.BACKOFF_BASE = 0.0

    def tearDown(self):
        tts_free.BACKOFF_BASE = self._backoff
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_main(self, argv, fake):
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = tts_free.main(argv)
        return code, out.getvalue(), err.getvalue()


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

class TestParsing(_TmpMixin, unittest.TestCase):

    def test_beats_block_is_preferred(self):
        p = self.tmp / 'script.md'
        p.write_text(SCRIPT_MD, encoding='utf-8')
        beats, origin = tts_free.load_beats(p)
        self.assertIn('beats block', origin)
        self.assertEqual([b['slide'] for b in beats], [1, 2, 3])
        self.assertEqual([b['pause_after'] for b in beats], [0.7, 1.0, None])
        self.assertEqual(beats[0]['text'], 'Hello there, world!')
        # an in-beat <break> becomes an exact pause between two parts of one beat
        self.assertEqual([pt['text'] for pt in beats[1]['parts']],
                         ['Fraud costs merchants billions.', 'Most of it is invisible.'])
        self.assertAlmostEqual(beats[1]['parts'][0]['gap_after'], 0.3)
        self.assertEqual(beats[1]['parts'][-1]['gap_after'], 0.0)
        self.assertEqual(beats[2]['text'], 'Start protecting “revenue” today.')

    def test_ssml_fallback_splits_on_long_breaks(self):
        ssml = ('<break time="1s"/>Every card payment is a <emphasis>bet</emphasis>. <break time="0.7s" />\n'
                'Fraud &amp; chargebacks cost billions. <break time="0.3s"/> Mostly invisible. '
                '<break time="1.0s" />\n'
                'Radar scores it in 100 ms. <break time="600ms"/>\n'
                'Short pause here <break time="0.5s"/><break time="0.2s"/> then a new beat. '
                '<break time="1.5s" /> <break time="0.5s" />\n'
                'Start today.')
        p = self.tmp / 'script.md'
        p.write_text(f'# S\n\n```\n{ssml}\n```\n\n## 5\n\n```js\nconst TIMINGS = [];\n```\n', encoding='utf-8')
        beats, origin = tts_free.load_beats(p)
        self.assertIn('SSML', origin)
        self.assertEqual([b['text'] for b in beats], [
            'Every card payment is a bet.',
            'Fraud & chargebacks cost billions. Mostly invisible.',
            'Radar scores it in 100 ms.',
            'Short pause here',          # 0.5 + 0.2 consecutive breaks sum to 0.7 -> beat boundary
            'then a new beat.',
            'Start today.',
        ])
        self.assertEqual([b['slide'] for b in beats], [1, 2, 3, 4, 5, 6])
        pauses = [b['pause_after'] for b in beats]
        self.assertAlmostEqual(pauses[0], 0.7)
        self.assertAlmostEqual(pauses[1], 1.0)
        self.assertAlmostEqual(pauses[2], 0.6)      # '600ms' parsed
        self.assertAlmostEqual(pauses[3], 0.7)
        self.assertAlmostEqual(pauses[4], 2.0)      # 1.5 + 0.5 summed
        self.assertIsNone(pauses[5])
        self.assertEqual(len(beats[1]['parts']), 2)
        self.assertAlmostEqual(beats[1]['parts'][0]['gap_after'], 0.3)

    def test_ssml_min_break_threshold(self):
        beats = tts_free.beats_from_ssml('A one. <break time="0.5s"/> B two. <break time="0.8s"/> C three.',
                                         min_break=0.6)
        self.assertEqual([b['text'] for b in beats], ['A one. B two.', 'C three.'])
        beats = tts_free.beats_from_ssml('A one. <break time="0.5s"/> B two. <break time="0.8s"/> C three.',
                                         min_break=0.4)
        self.assertEqual(len(beats), 3)

    def test_utf8_bom_script(self):
        p = self.tmp / 'script.md'
        p.write_bytes(b'\xef\xbb\xbf```json\n{"beats": [{"slide": 1, "text": "Hi."}]}\n```\n')
        beats, origin = tts_free.load_beats(p)
        self.assertIn('beats block', origin)
        self.assertEqual(beats[0]['text'], 'Hi.')

    def test_invalid_beats_json_is_an_error(self):
        p = self.tmp / 'script.md'
        p.write_text('```json\n{"beats": [ {"text": "x",} ]}\n```\n', encoding='utf-8')
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.load_beats(p)
        self.assertIn('not valid JSON', str(cm.exception))

    def test_text_file_beats(self):
        p = self.tmp / 'beats.txt'
        p.write_text('First beat,\nwrapped over two lines.\n\n\nSecond beat. <break time="0.4s"/> Still second.'
                     '\n   \nThird beat. <break time="1.2s"/>\n', encoding='utf-8')
        beats, _ = tts_free.load_beats(text_path=p)
        self.assertEqual([b['text'] for b in beats],
                         ['First beat, wrapped over two lines.', 'Second beat. Still second.', 'Third beat.'])
        self.assertEqual(len(beats[1]['parts']), 2)
        self.assertIsNone(beats[0]['pause_after'])
        self.assertAlmostEqual(beats[2]['pause_after'], 1.2)    # trailing break = pause_after

    def test_rate_pitch_normalisation_and_argv(self):
        self.assertEqual(tts_free.norm_rate('-5%'), '-5%')
        self.assertEqual(tts_free.norm_rate('5%'), '+5%')
        self.assertEqual(tts_free.norm_rate('-5 %'), '-5%')
        self.assertEqual(tts_free.norm_rate('-5'), '-5%')        # signed number = a change in %
        self.assertEqual(tts_free.norm_rate('+10'), '+10%')
        self.assertEqual(tts_free.norm_rate('0.95'), '-5%')
        self.assertEqual(tts_free.norm_rate('1.1'), '+10%')
        self.assertEqual(tts_free.norm_rate('1'), '+0%')         # bare multiplier
        self.assertEqual(tts_free.norm_rate('1.0'), '+0%')
        self.assertEqual(tts_free.norm_pitch('-2hz'), '-2Hz')
        self.assertEqual(tts_free.norm_pitch('3'), '+3Hz')
        for bad in ('fast', '95%', '100%', '5', '0'):
            with self.assertRaises(tts_free.TTSError, msg=bad):
                tts_free.norm_rate(bad)
        # '95%' is refused as ambiguous, and the message offers both readings
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.norm_rate('95%')
        self.assertIn('-5%', str(cm.exception))
        self.assertIn('+95%', str(cm.exception))
        self.assertEqual(tts_free._fix_negative_values(['s.md', '--rate', '-5%', '--pitch', '-2Hz', '--pause', '1']),
                         ['s.md', '--rate=-5%', '--pitch=-2Hz', '--pause', '1'])

    def test_clean_text(self):
        self.assertEqual(tts_free.clean_text('a <emphasis>bet</emphasis>. Costs &amp; fees\n  of .5% '
                                             '<prosody rate="slow">wait</prosody> ... what'),
                         'a bet. Costs & fees of .5% wait... what')
        self.assertEqual(tts_free.clean_text('<speak><p>One.</p><p>Two!</p></speak>'), 'One. Two!')
        self.assertEqual(tts_free.clean_text('<?xml version="1.0"?><speak>Hi <!-- note --> there.</speak>'),
                         'Hi there.')

    def test_clean_text_keeps_comparison_operators(self):
        # a bare '<' / '>' is narration, not markup (edge-tts XML-escapes it)
        self.assertEqual(tts_free.clean_text('Latency < 5 ms, throughput > 10 GB.'),
                         'Latency < 5 ms, throughput > 10 GB.')
        self.assertEqual(tts_free.clean_text('from 900 to < 100 ms and <emphasis>fast</emphasis>.'),
                         'from 900 to < 100 ms and fast.')
        self.assertEqual(tts_free.clean_text('x<5 and y>3, a -> b, 3 <= 4'), 'x<5 and y>3, a -> b, 3 <= 4')
        beats = tts_free.beats_from_json({'beats': [{'text': 'Latency < 5 ms, throughput > 10 GB.'}]})
        self.assertEqual(beats[0]['text'], 'Latency < 5 ms, throughput > 10 GB.')

    def test_comment_with_break_neither_splits_nor_is_spoken(self):
        beats = tts_free.beats_from_ssml('One. <!-- TODO maybe add <break time="1s"/> here --> Two. '
                                         '<break time="1s"/> Three.')
        self.assertEqual([b['text'] for b in beats], ['One. Two.', 'Three.'])
        beats = tts_free.beats_from_json({'beats': [{'text': 'A <!-- <break time="0.3s"/> --> B.'}]})
        self.assertEqual(beats[0]['text'], 'A B.')
        self.assertEqual(len(beats[0]['parts']), 1)

    def test_indented_beats_block_under_list_item(self):
        # CommonMark allows a fence indented up to 3 spaces (e.g. under a numbered list item)
        p = self.tmp / 'script.md'
        p.write_text('1. Beats:\n\n   ```json\n   {"beats":[{"slide":1,"text":"A one.","pause_after":0.9},\n'
                     '      {"slide":2,"text":"B two."}]}\n   ```\n\n'
                     '```\nSSML one. <break time="1s"/> SSML two. <break time="1s"/> SSML three.\n```\n',
                     encoding='utf-8')
        beats, origin = tts_free.load_beats(p)
        self.assertIn('beats block', origin)
        self.assertEqual([b['text'] for b in beats], ['A one.', 'B two.'])
        self.assertEqual([b['pause_after'] for b in beats], [0.9, None])
        # the body of an indented fence is dedented; a 4-space fence is an indented code block, not a fence
        self.assertEqual(tts_free.fenced_blocks('  ```ssml\n  Hi.\n    Deeper.\n  ```\n'),
                         [('ssml', 'Hi.\n  Deeper.')])
        self.assertEqual(tts_free.fenced_blocks('    ```\n    Hi.\n    ```\n'), [])

    def test_ssml_block_preference_matches_elevenlabs_tool(self):
        p = self.tmp / 'script.md'
        p.write_text('```\nOld draft. <break time="1s"/> Old two.\n```\n\n'
                     '```ssml\nNew one. <break time="1s"/> New two. <break time="1s"/> New three.\n```\n',
                     encoding='utf-8')
        beats, _ = tts_free.load_beats(p)
        self.assertEqual([b['text'] for b in beats], ['New one.', 'New two.', 'New three.'])
        p.write_text('```\nPlain, no breaks.\n```\n\n```xml\n<speak>X one. <break time="1s"/> X two.</speak>\n```\n',
                     encoding='utf-8')
        self.assertEqual([b['text'] for b in tts_free.load_beats(p)[0]], ['X one.', 'X two.'])
        p.write_text('```js\nconst A = 1; <break time="1s"/>\n```\n\n```\nFirst. <break time="1s"/> Second.\n```\n',
                     encoding='utf-8')
        self.assertEqual([b['text'] for b in tts_free.load_beats(p)[0]], ['First.', 'Second.'])
        # agrees with elevenlabs_generate.extract_ssml when that module is importable
        try:
            import elevenlabs_generate as el
        except Exception:  # noqa: BLE001 — optional cross-check
            return
        for md in ('```\nOld. <break time="1s"/> Two.\n```\n\n```ssml\nNew. <break time="1s"/> B.\n```\n',
                   '1. x\n\n   ```\n   Ind. <break time="1s"/> Two.\n   ```\n'):
            mine = tts_free.pick_ssml_block(tts_free.fenced_blocks(md))
            theirs = el.extract_ssml(el.parse_fenced_blocks(md))
            self.assertEqual(tts_free.beats_from_ssml(mine), tts_free.beats_from_ssml(theirs))

    def test_bad_pause_after_values(self):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            beats = tts_free.beats_from_json({'beats': [
                {'text': 'A.', 'pause_after': 'soon'}, {'text': 'B.', 'pause_after': -2},
                {'text': 'C.', 'pause_after': '1.5'}, {'text': 'D.', 'pause_after': True}, {'text': 'E.'}]})
        self.assertEqual([b['pause_after'] for b in beats], [None, 0.0, 1.5, None, None])
        self.assertIn("'soon'", err.getvalue())
        self.assertIn('negative', err.getvalue())

    def test_script_encodings_and_bad_paths(self):
        p = self.tmp / 'ansi.md'
        p.write_bytes('```json\n{"beats":[{"text":"It’s “fine”."}]}\n```\n'.encode('cp1252'))
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            beats, _ = tts_free.load_beats(p)
        self.assertEqual(beats[0]['text'], 'It’s “fine”.')
        self.assertIn('not UTF-8', err.getvalue())
        p = self.tmp / 'utf16.md'
        p.write_bytes('```json\n{"beats":[{"text":"Déjà vu."}]}\n```\n'.encode('utf-16'))
        self.assertEqual(tts_free.load_beats(p)[0][0]['text'], 'Déjà vu.')
        (self.tmp / 'dir.md').mkdir()
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.load_beats(self.tmp / 'dir.md')
        self.assertIn('Not a file', str(cm.exception))

    def test_template_placeholders_are_refused(self):
        p = self.tmp / 'script.md'
        p.write_text('```\n{{NARRATION_WITH_BREAKS}}\n```\n', encoding='utf-8')
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.load_beats(p)
        self.assertIn('placeholder', str(cm.exception))

    def test_punctuation_only_text_is_a_silent_beat(self):
        beats = tts_free.beats_from_json({'beats': [{'text': '...', 'pause_after': 1.2}, {'text': 'Go — now.'}]})
        self.assertEqual(beats[0]['parts'], [])
        self.assertEqual(beats[0]['pause_after'], 1.2)
        self.assertEqual(tts_free.beats_from_ssml('One. <break time="1s"/> ... <break time="1s"/> Two.')[1]['text'],
                         'Two.')

    def test_short_mid_sentence_break_is_a_hesitation_not_a_split(self):
        # a split would make edge-tts intonate 'the winner is' as a finished sentence
        parts, trailing = tts_free._parts_from_text('And the winner is <break time="0.4s"/> you.')
        self.assertEqual(parts, [{'text': 'And the winner is... you.', 'gap_after': 0.0}])
        self.assertIsNone(trailing)
        # after a comma / dash the punctuation already pauses: plain join
        self.assertEqual(tts_free._parts_from_text('Fraud, <break time="0.3s"/> it turns out, costs.')[0],
                         [{'text': 'Fraud, it turns out, costs.', 'gap_after': 0.0}])
        self.assertEqual(tts_free._parts_from_text('It is <break time="0.3s"/> “quoted”.')[0][0]['text'],
                         'It is... “quoted”.')
        # after sentence/clause punctuation, or when long, a break is still an exact split
        self.assertEqual(tts_free._parts_from_text('Wait. <break time="0.3s"/> Then go.')[0],
                         [{'text': 'Wait.', 'gap_after': 0.3}, {'text': 'Then go.', 'gap_after': 0.0}])
        self.assertEqual(tts_free._parts_from_text('Here: <break time="0.3s"/> this.')[0][0]['gap_after'], 0.3)
        self.assertEqual(tts_free._parts_from_text('The answer is <break time="0.8s"/> forty-two.')[0],
                         [{'text': 'The answer is', 'gap_after': 0.8}, {'text': 'forty-two.', 'gap_after': 0.0}])
        # a soft break with nothing after it is the beat's pause_after, as before
        parts, trailing = tts_free._parts_from_text('No full stop <break time="0.4s"/>')
        self.assertEqual(parts, [{'text': 'No full stop', 'gap_after': 0.0}])
        self.assertAlmostEqual(trailing, 0.4)
        self.assertAlmostEqual(tts_free.beats_from_json({'beats': [{'text': 'No stop <break time="0.4s"/>'}]})[0]
                               ['pause_after'], 0.4)
        # the SSML fallback uses the same rule (and consecutive short breaks are summed first)
        beats = tts_free.beats_from_ssml('And the winner is <break time="0.4s"/> you. <break time="1s"/> '
                                         'Next one, <break time="0.2s"/> fine <break time="0.3s"/> '
                                         '<break time="0.2s"/> ok. <break time="0.3s"/> Done.')
        self.assertEqual([[p['text'] for p in b['parts']] for b in beats],
                         [['And the winner is... you.'], ['Next one, fine... ok.', 'Done.']])
        self.assertAlmostEqual(beats[1]['parts'][0]['gap_after'], 0.3)

    def test_resolve_voice(self):
        self.assertEqual(tts_free.resolve_voice('andrew'), 'en-US-AndrewMultilingualNeural')
        self.assertEqual(tts_free.resolve_voice(' Ava '), 'en-US-AvaMultilingualNeural')
        self.assertEqual(tts_free.resolve_voice('RYAN'), 'en-GB-RyanNeural')
        self.assertEqual(tts_free.resolve_voice('AndrewMultilingualNeural'), 'en-US-AndrewMultilingualNeural')
        self.assertEqual(tts_free.resolve_voice('en-US-GuyNeural'), 'en-US-GuyNeural')      # full names pass
        self.assertEqual(tts_free.resolve_voice('zh-CN-liaoning-XiaobeiNeural'), 'zh-CN-liaoning-XiaobeiNeural')
        for bad in ('bob', ''):
            with self.assertRaises(tts_free.TTSError) as cm:
                tts_free.resolve_voice(bad)
            self.assertIn('--list-voices', str(cm.exception))

    def test_beats_block_errors_are_specific(self):
        p = self.tmp / 'script.md'
        p.write_text('```json\n{“beats”: [{“text”: “Hi.”}]}\n```\n\n```\nSSML. <break time="1s"/> Two.\n```\n',
                     encoding='utf-8')
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.load_beats(p)           # a curly-quoted beats block is not silently skipped
        self.assertIn('ASCII', str(cm.exception))
        p.write_text('```json\n{"beats": [{"text": "Hi."},]}\n```\n', encoding='utf-8')
        with self.assertRaises(tts_free.TTSError) as cm:
            tts_free.load_beats(p)
        self.assertIn('trailing commas', str(cm.exception))
        for bad in (0, -1, 'two', 1.5, True):
            with self.assertRaises(tts_free.TTSError, msg=repr(bad)):
                tts_free.beats_from_json({'beats': [{'slide': bad, 'text': 'Hi.'}]})
        self.assertEqual(tts_free.beats_from_json({'beats': [{'slide': '3', 'text': 'Hi.'},
                                                             {'slide': 4.0, 'text': 'Yo.'}]})[1]['slide'], 4)

    def test_estimate_seconds(self):
        beats = tts_free.beats_from_json({'beats': [
            {'text': ' '.join(['word'] * 90), 'pause_after': 1.0},
            {'text': 'Wait. <break time="0.5s"/> ' + ' '.join(['word'] * 89)}]})
        # 180 words at 180 wpm = 60 s, + 0.5 in-beat + 1.0 pause + 0.25 lead-in + 1.0 tail
        # + 3 segments x (head + tail pad)
        pads = 3 * (tts_free.PAD_HEAD + tts_free.PAD_TAIL)
        self.assertAlmostEqual(tts_free.estimate_seconds(beats, '+0%'), 62.75 + pads, places=6)
        self.assertAlmostEqual(tts_free.estimate_seconds(beats, '-10%'), 60 / 0.9 + 2.75 + pads, places=6)

    def test_short_err_drops_ssl_noise(self):
        e = OSError('Cannot connect to host speech.platform.bing.com:443 '
                    'ssl:<ssl.SSLContext object at 0x0000022302AD9090> [getaddrinfo failed]')
        self.assertEqual(tts_free._short_err(e),
                         'OSError: Cannot connect to host speech.platform.bing.com:443 [getaddrinfo failed]')

    def test_restore_punctuation(self):
        text = 'Hello there, world! It’s “quoted” — fine.'
        words = [{'text': t, 'start': 0, 'end': 0} for t in ['Hello', 'there', 'world', 'It’s', 'quoted', 'fine']]
        got = [w['text'] for w in tts_free.restore_punctuation(text, words)]
        self.assertEqual(got, ['Hello', 'there,', 'world!', 'It’s', '“quoted”', 'fine.'])

    def test_restore_punctuation_ignores_tokens_not_in_text(self):
        # Edge may report a normalised token ('one' for '100'): it must not lock onto 'someone'
        words = [{'text': t, 'start': 0, 'end': 0} for t in ['It', 'costs', 'one', 'hundred', 'dollars',
                                                              'someone', 'knows']]
        got = [w['text'] for w in tts_free.restore_punctuation('It costs 100 dollars, someone knows.', words)]
        self.assertEqual(got, ['It', 'costs', 'one', 'hundred', 'dollars,', 'someone', 'knows.'])
        words = [{'text': t, 'start': 0, 'end': 0} for t in ['Fraud', 'costs', '$4.2 billion', 'e.g.', 'in', '100 ms']]
        got = [w['text'] for w in tts_free.restore_punctuation('Fraud costs $4.2 billion — e.g. in 100 ms.', words)]
        self.assertEqual(got, ['Fraud', 'costs', '$4.2 billion', 'e.g.', 'in', '100 ms.'])


# ---------------------------------------------------------------------------
# Synthesis + assembly (fake edge-tts, real ffmpeg)
# ---------------------------------------------------------------------------

class TestGenerate(_TmpMixin, unittest.TestCase):

    def _beats(self):
        p = self.tmp / 'script.md'
        p.write_text(SCRIPT_MD, encoding='utf-8')
        return tts_free.load_beats(p)[0]

    def _generate(self, fake, **kw):
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            return tts_free.generate(self._beats(), self.tmp / 'out', quiet=True, **kw)

    def test_contract_cues_exact_words_absolute(self):
        fake, calls = make_fake_edge()
        data = self._generate(fake, voice='en-GB-RyanNeural', rate='-5%')
        out = self.tmp / 'out'
        # --- files + JSON contract
        mp3, ts = out / 'voiceover.mp3', out / 'word_timestamps.json'
        self.assertTrue(mp3.exists() and ts.exists())
        on_disk = json.loads(ts.read_text(encoding='utf-8'))
        self.assertEqual(on_disk, data)
        self.assertEqual(data['source'], 'edge-tts')
        self.assertEqual(data['audio'], 'voiceover.mp3')
        self.assertIsInstance(data['duration'], float)
        for w in data['words']:
            self.assertEqual(set(w), {'text', 'start', 'end'})
            self.assertLessEqual(w['start'], w['end'])
        for c in data['cues']:
            self.assertEqual(set(c), {'slide', 'time'})
        self.assertEqual([c['slide'] for c in data['cues']], [1, 2, 3])
        # --- edge-tts was asked for word boundaries, one request per beat part
        self.assertEqual(len(calls), 4)
        self.assertTrue(all(c['boundary'] == 'WordBoundary' for c in calls))
        self.assertTrue(all(c['voice'] == 'en-GB-RyanNeural' and c['rate'] == '-5%' for c in calls))
        # --- cues are exactly the segment starts; pauses are exact
        beats = data['beats']
        self.assertEqual(data['cues'][0]['time'], 0.0)
        self.assertAlmostEqual(beats[0]['start'], tts_free.LEAD_IN, places=3)
        for c, b in zip(data['cues'][1:], beats[1:]):
            self.assertAlmostEqual(c['time'], b['start'], places=6)
        self.assertAlmostEqual(beats[1]['start'] - beats[0]['end'], 0.7, delta=0.0015)
        self.assertAlmostEqual(beats[2]['start'] - beats[1]['end'], 1.0, delta=0.0015)
        self.assertAlmostEqual(data['duration'] - beats[2]['end'], tts_free.TAIL, delta=0.0015)
        # --- words: absolute, ordered, punctuation restored, inside their beat
        texts = [w['text'] for w in data['words']]
        self.assertEqual(texts, ['Hello', 'there,', 'world!', 'Fraud', 'costs', 'merchants', 'billions.',
                                 'Most', 'of', 'it', 'is', 'invisible.', 'Start', 'protecting',
                                 '“revenue”', 'today.'])
        starts = [w['start'] for w in data['words']]
        self.assertEqual(starts, sorted(starts))
        per_beat = [3, 9, 4]
        k = 0
        for b, n in zip(beats, per_beat):
            ws = data['words'][k:k + n]
            k += n
            self.assertTrue(all(b['start'] <= w['start'] and w['end'] <= b['end'] + 1e-6 for w in ws))
            # first word sits one head-pad after the cue (codec delay compensated)
            self.assertGreaterEqual(ws[0]['start'] - b['start'], tts_free.PAD_HEAD - 0.003)
            self.assertLessEqual(ws[0]['start'] - b['start'], tts_free.PAD_HEAD + 0.03)
            # fake voice: consecutive words are WORD_SEC apart
            for a, c in zip(ws, ws[1:]):
                if a['text'] != 'billions.':      # the 0.3 s in-beat break sits there
                    self.assertAlmostEqual(c['start'] - a['start'], WORD_SEC, delta=0.002)
        # in-beat break: 'Most' starts 0.3 s + pads after 'billions.' ends
        i = texts.index('Most')
        gap = data['words'][i]['start'] - data['words'][i - 1]['end']
        self.assertGreater(gap, 0.3)
        self.assertLess(gap, 0.3 + tts_free.PAD_HEAD + tts_free.PAD_TAIL + 0.08)
        # --- the encoded MP3 decodes sample-exactly to the reported timeline
        pcm = _decode(mp3)
        self.assertAlmostEqual(len(pcm) / 48000, data['duration'], delta=0.002)
        for w in data['words']:
            self.assertGreater(_rms_db(pcm, 48000, (w['start'] + w['end']) / 2), -25, w)
        for a, b in zip(beats, beats[1:]):
            self.assertLess(_rms_db(pcm, 48000, (a['end'] + b['start']) / 2, half=0.05), -70)
        self.assertLess(_rms_db(pcm, 48000, 0.1, half=0.08), -70)      # lead-in is silent

    def test_no_trim_arithmetic_is_exact(self):
        fake, _ = make_fake_edge()
        data = self._generate(fake, trim=False, lead_in=0.5, default_pause=0.9)
        # expected: raw decoded segment lengths + exact silences, counted in samples
        seg_len = {}
        for beat in self._beats():
            for part in beat['parts']:
                n = len(_bare_words(part['text']))
                seg_len[part['text']] = len(tts_free.decode_mp3(_fake_mp3(n), 48000)) / 48000
        beats = self._beats()
        t = 0.5
        expected = []
        for i, b in enumerate(beats):
            expected.append(t)
            for j, part in enumerate(b['parts']):
                t += seg_len[part['text']]
                if j < len(b['parts']) - 1:
                    t += part['gap_after']
            if i < len(beats) - 1:
                t += b['pause_after'] if b['pause_after'] is not None else 0.9
        t += tts_free.TAIL
        got = [b['start'] for b in data['beats']]
        for g, e in zip(got, expected):
            self.assertAlmostEqual(g, e, delta=0.0006)
        self.assertEqual(data['cues'][0]['time'], 0.0)
        self.assertAlmostEqual(data['cues'][1]['time'], expected[1], delta=0.0006)
        self.assertAlmostEqual(data['duration'], t, delta=0.0006)
        # untrimmed: first word = segment start + fake lead silence + codec delay
        self.assertAlmostEqual(data['words'][0]['start'], 0.5 + LEAD_SIL + tts_free.EDGE_CODEC_DELAY, delta=0.0015)

    def test_silent_beat_and_repeated_slide(self):
        # an empty beat = a visual-only slide lasting exactly its pause_after;
        # two consecutive beats on one slide = one cue
        beats = tts_free.beats_from_json({'beats': [
            {'slide': 1, 'text': 'One two.', 'pause_after': 0.5},
            {'slide': 2, 'text': '', 'pause_after': 2.0},
            {'slide': 3, 'text': 'Three four five.'},
            {'slide': 3, 'text': 'Six seven.'},
        ]})
        fake, calls = make_fake_edge()
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            data = tts_free.generate(beats, self.tmp / 'out', quiet=True, default_pause=0.8)
        self.assertEqual(len(calls), 3)                 # the silent beat makes no request
        self.assertEqual([c['slide'] for c in data['cues']], [1, 2, 3])
        b = data['beats']
        self.assertAlmostEqual(data['cues'][1]['time'], b[0]['end'] + 0.5, delta=0.0015)
        self.assertAlmostEqual(b[1]['end'], b[1]['start'])
        self.assertAlmostEqual(data['cues'][2]['time'], data['cues'][1]['time'] + 2.0, delta=0.0015)
        self.assertAlmostEqual(b[3]['start'] - b[2]['end'], 0.8, delta=0.0015)
        self.assertEqual([w['text'] for w in data['words']],
                         ['One', 'two.', 'Three', 'four', 'five.', 'Six', 'seven.'])

    def test_last_beat_pause_after_lengthens_the_tail(self):
        fake, calls = make_fake_edge()
        beats = tts_free.beats_from_json({'beats': [{'slide': 1, 'text': 'One two.', 'pause_after': 0.5},
                                                    {'slide': 2, 'text': '', 'pause_after': 2.5}]})
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            data = tts_free.generate(beats, self.tmp / 'out', quiet=True)
        # a visual-only end slide holds for its own pause_after (> the 1.0 s default tail)
        self.assertEqual([c['slide'] for c in data['cues']], [1, 2])
        self.assertAlmostEqual(data['duration'] - data['cues'][1]['time'], 2.5, delta=0.0015)
        beats[-1]['pause_after'] = 0.2      # shorter than the tail: the tail wins
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            data = tts_free.generate(beats, self.tmp / 'out', quiet=True)
        self.assertAlmostEqual(data['duration'] - data['cues'][1]['time'], tts_free.TAIL, delta=0.0015)
        self.assertEqual(len(calls), 1)     # second run came from the cache

    def test_soft_break_is_one_request(self):
        fake, calls = make_fake_edge()
        beats = tts_free.beats_from_json({'beats': [{'text': 'And the winner is <break time="0.4s"/> you.'}]})
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            data = tts_free.generate(beats, self.tmp / 'out', quiet=True)
        self.assertEqual([c['text'] for c in calls], ['And the winner is... you.'])
        self.assertEqual([w['text'] for w in data['words']], ['And', 'the', 'winner', 'is...', 'you.'])

    def test_cache_skips_resynthesis(self):
        fake, calls = make_fake_edge()
        first = self._generate(fake)
        self.assertEqual(len(calls), 4)
        second = self._generate(fake)
        self.assertEqual(len(calls), 4, 'cached segments must not hit edge-tts again')
        self.assertEqual(first, second)
        third = self._generate(fake, rate='+10%')        # different params -> new requests
        self.assertEqual(len(calls), 8)
        self.assertEqual(third['rate'], '+10%')
        self._generate(fake, use_cache=False)
        self.assertEqual(len(calls), 12)

    def test_old_edge_tts_signature_without_boundary(self):
        fake, calls = make_fake_edge(old_signature=True)
        data = self._generate(fake)
        self.assertEqual(len(data['words']), 16)
        self.assertNotIn('boundary', calls[0])

    def test_sentence_boundary_only_falls_back_to_estimates(self):
        fake, _ = make_fake_edge(sentence_only=True)
        err = io.StringIO()
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(err):
            data = tts_free.generate(self._beats(), self.tmp / 'out', quiet=True)
        self.assertIn('estimated', err.getvalue())
        self.assertEqual(len(data['words']), 16)
        b0 = data['beats'][0]
        self.assertTrue(all(b0['start'] <= w['start'] <= b0['end'] for w in data['words'][:3]))

    def test_no_boundaries_for_wordless_text_is_not_an_upgrade_warning(self):
        # Edge answers a '...'-only request with silence and no boundary events: nothing to time
        seg = tts_free.prepare_segment(_fake_mp3(0), [], '...')
        self.assertFalse(seg['approx'])
        self.assertEqual(seg['words'], [])
        self.assertTrue(tts_free.prepare_segment(_fake_mp3(2), [], 'Two words.')['approx'])
        # and through generate(): a '...' beat makes no request and prints no warning
        beats = tts_free.beats_from_json({'beats': [{'slide': 1, 'text': 'One two.'},
                                                    {'slide': 2, 'text': '...', 'pause_after': 1.0},
                                                    {'slide': 3, 'text': 'Three.'}]})
        fake, calls = make_fake_edge()
        err = io.StringIO()
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(err):
            data = tts_free.generate(beats, self.tmp / 'out', quiet=True)
        self.assertEqual(len(calls), 2)
        self.assertNotIn('[WARN]', err.getvalue())
        self.assertEqual([c['slide'] for c in data['cues']], [1, 2, 3])
        self.assertAlmostEqual(data['cues'][2]['time'] - data['cues'][1]['time'], 1.0, delta=0.0015)

    def test_retries_transient_errors(self):
        fake, calls = make_fake_edge(fail_first=2)
        data = self._generate(fake, jobs=1)
        self.assertEqual(len(calls), 6)        # 4 segments + 2 failed attempts
        self.assertEqual(len(data['cues']), 3)

    def test_gives_up_with_clear_offline_error(self):
        fake, _ = make_fake_edge(fail_first=99, fail_exc=OSError('Cannot connect to host '
                                                                 'speech.platform.bing.com:443 [getaddrinfo failed]'))
        with mock.patch.dict(sys.modules, {'edge_tts': fake}), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(tts_free.TTSError) as cm:
                asyncio.run(tts_free.synth_segment('Hello.', 'en-US-AndrewMultilingualNeural', '+0%', '+0Hz'))
        self.assertIn('offline', str(cm.exception))

    def test_bad_voice_and_missing_package(self):
        fake, _ = make_fake_edge()
        with mock.patch.dict(sys.modules, {'edge_tts': fake}):
            with self.assertRaises(tts_free.TTSError) as cm:
                asyncio.run(tts_free.synth_segment('Hello.', 'nobody', '+0%', '+0Hz'))
        self.assertIn('--voice', str(cm.exception))
        with mock.patch.dict(sys.modules, {'edge_tts': None}):
            with self.assertRaises(tts_free.TTSError) as cm:
                asyncio.run(tts_free.synth_segment('Hello.', 'x', '+0%', '+0Hz'))
        self.assertIn('pip install edge-tts', str(cm.exception))

    def test_measure_wpm_uses_real_audio_length(self):
        fake, _ = make_fake_edge()
        paragraph = ' '.join(['word'] * 50)
        with mock.patch.dict(sys.modules, {'edge_tts': fake}):
            res = tts_free.measure_wpm(rates=('+0%',), paragraph=paragraph)
        self.assertEqual(res[0]['words'], 50)
        self.assertAlmostEqual(res[0]['wpm'], 60 / WORD_SEC, delta=60 / WORD_SEC * 0.03)


# ---------------------------------------------------------------------------
# CLI: --apply, --dry-run, --list-voices, --text
# ---------------------------------------------------------------------------

class TestCli(_TmpMixin, unittest.TestCase):

    def test_apply_rewrites_timings_and_words(self):
        import sb_deckio
        script = self.tmp / 'script.md'
        script.write_text(SCRIPT_MD, encoding='utf-8')
        deck = self.tmp / 'storyboard.html'
        deck.write_text(DECK_HTML, encoding='utf-8')
        fake, _ = make_fake_edge()
        code, out, err = self.run_main([str(script), '--apply', str(deck)], fake)
        self.assertEqual(code, 0, err)
        self.assertIn('const TIMINGS = [', out)
        data = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        html = deck.read_text(encoding='utf-8')
        timings = sb_deckio.read_timings(html)
        self.assertEqual([t['slide'] for t in timings], [1, 2, 3])
        for t, c in zip(timings, data['cues']):
            self.assertAlmostEqual(t['time'], c['time'], delta=0.0051)   # TIMINGS keep 2 decimals
        words = sb_deckio.read_words(html)
        self.assertEqual(words, data['words'])
        self.assertRegex(html, r'Storyboard\.init\(\{[^}]*words:\s*WORDS')
        self.assertLess(html.index('const WORDS'), html.index('Storyboard.init('))
        self.assertEqual((self.tmp / 'storyboard.html.bak').read_text(encoding='utf-8'), DECK_HTML)
        self.assertNotIn('[WARN]', err)
        # second run: WORDS already present and wired -> replaced, not duplicated
        code, _, err = self.run_main([str(script), '--apply', str(deck)], fake)
        html2 = deck.read_text(encoding='utf-8')
        self.assertEqual(html2.count('const WORDS'), 1)
        self.assertEqual(html2.count('words: WORDS'), 1)

    def test_apply_warns_on_slide_mismatch_and_audio_src(self):
        script = self.tmp / 'script.md'
        script.write_text(SCRIPT_MD, encoding='utf-8')
        deck = self.tmp / 'storyboard.html'
        four = DECK_HTML.replace('<section class="slide" data-slide="3"><h1>Three</h1></section>',
                                 '<section class="slide" data-slide="3"><h1>Three</h1></section>\n'
                                 '    <section class="slide" data-slide="4"><h1>Four</h1></section>')
        deck.write_text(four.replace('src="voiceover.mp3"', 'src="VO English.mp3"'), encoding='utf-8')
        fake, _ = make_fake_edge()
        code, _, err = self.run_main([str(script), '--apply', str(deck)], fake)
        self.assertEqual(code, 0, err)
        self.assertIn('[WARN]', err)
        self.assertIn('4 slides', err)
        self.assertIn('--set-src', err)
        self.assertIn('src="VO English.mp3"', deck.read_text(encoding='utf-8'))
        code, _, err = self.run_main([str(script), '--apply', str(deck), '--set-src'], fake)
        self.assertEqual(code, 0, err)
        self.assertIn('src="voiceover.mp3"', deck.read_text(encoding='utf-8'))

    def test_text_mode_out_dir_and_negative_rate(self):
        txt = self.tmp / 'beats.txt'
        txt.write_text('One two three.\n\nFour five.\n', encoding='utf-8')
        fake, calls = make_fake_edge()
        out_dir = self.tmp / 'deckdir'
        code, _, err = self.run_main(['--text', str(txt), '--out', str(out_dir), '--rate', '-5%',
                                      '--mp3-name', 'narration.mp3', '--pause', '0.9'], fake)
        self.assertEqual(code, 0, err)
        data = json.loads((out_dir / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(data['audio'], 'narration.mp3')
        self.assertTrue((out_dir / 'narration.mp3').exists())
        self.assertEqual(len(data['cues']), 2)
        self.assertAlmostEqual(data['beats'][1]['start'] - data['beats'][0]['end'], 0.9, delta=0.0015)
        self.assertTrue(all(c['rate'] == '-5%' for c in calls))

    def test_dry_run_synthesizes_nothing(self):
        script = self.tmp / 'script.md'
        script.write_text(SCRIPT_MD, encoding='utf-8')
        fake, calls = make_fake_edge()
        code, out, _ = self.run_main([str(script), '--dry-run'], fake)
        self.assertEqual(code, 0)
        self.assertEqual(calls, [])
        self.assertIn('3 beats', out)
        self.assertIn('words -> about', out)       # runtime estimate before any request
        self.assertFalse((self.tmp / 'voiceover.mp3').exists())

    def test_voice_alias_on_the_cli(self):
        txt = self.tmp / 'beats.txt'
        txt.write_text('One two.\n\nThree four.\n', encoding='utf-8')
        fake, calls = make_fake_edge()
        code, _, err = self.run_main(['--text', str(txt), '--voice', 'ryan'], fake)
        self.assertEqual(code, 0, err)
        self.assertIn('en-GB-RyanNeural', err)
        self.assertTrue(calls and all(c['voice'] == 'en-GB-RyanNeural' for c in calls))
        data = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(data['voice'], 'en-GB-RyanNeural')
        calls.clear()
        code, _, err = self.run_main(['--text', str(txt), '--voice', 'bob'], fake)
        self.assertEqual(code, 1)
        self.assertIn('Unknown --voice', err)
        self.assertEqual(calls, [])            # refused before any request

    def test_list_voices(self):
        fake, _ = make_fake_edge()
        code, out, _ = self.run_main(['--list-voices'], fake)
        self.assertEqual(code, 0)
        self.assertIn('Recommended', out)
        self.assertIn('en-GB-RyanNeural', out)
        self.assertNotIn('fr-FR-DeniseNeural', out)
        code, out, _ = self.run_main(['--list-voices', 'fr-FR'], fake)
        self.assertIn('fr-FR-DeniseNeural', out)
        self.assertNotIn('en-GB-RyanNeural', out)
        # 'male' must not match 'Female'
        code, out, _ = self.run_main(['--list-voices', 'en male'], fake)
        self.assertIn('2 voice(s)', out)
        self.assertIn('en-US-AndrewMultilingualNeural', out)
        self.assertNotIn('en-US-AvaMultilingualNeural', out)
        code, out, _ = self.run_main(['--list-voices', 'en', 'male'], fake)     # unquoted words too
        self.assertIn('2 voice(s)', out)
        code, out, _ = self.run_main(['--list-voices', 'female'], fake)
        self.assertIn('fr-FR-DeniseNeural', out)
        self.assertNotIn('en-GB-RyanNeural', out)

    def test_list_voices_offline_gives_up_early(self):
        fake, _ = make_fake_edge()
        attempts = []

        async def offline():
            attempts.append(1)
            raise OSError('Cannot connect to host speech.platform.bing.com:443 [getaddrinfo failed]')
        fake.list_voices = offline
        code, _, err = self.run_main(['--list-voices'], fake)
        self.assertEqual(code, 1)
        self.assertIn('offline', err)
        self.assertEqual(len(attempts), 3, 'offline: stop after 3 attempts, not all retries')

    def test_errors_exit_nonzero(self):
        fake, calls = make_fake_edge()
        code, _, err = self.run_main([str(self.tmp / 'missing.md')], fake)
        self.assertEqual(code, 1)
        self.assertIn('[ERROR]', err)
        (self.tmp / 'adir.md').mkdir()
        code, _, err = self.run_main([str(self.tmp / 'adir.md')], fake)
        self.assertEqual(code, 1)
        self.assertIn('Not a file', err)
        script = self.tmp / 'script.md'
        script.write_text(SCRIPT_MD, encoding='utf-8')
        code, _, err = self.run_main([str(script), '--rate', 'fast'], fake)
        self.assertEqual(code, 1)
        self.assertIn('--rate', err)
        bad = self.tmp / 'bad_pause.md'
        bad.write_text('```json\n{"beats":[{"text":"Hi.","pause_after":"soon"}]}\n```\n', encoding='utf-8')
        code, _, err = self.run_main([str(bad), '--dry-run'], fake)
        self.assertEqual(code, 0, err)
        self.assertIn('[WARN]', err)
        # a mistyped --apply deck / a non-MP3 --mp3-name fail before any edge-tts request
        code, _, err = self.run_main([str(script), '--apply', str(self.tmp / 'nope.html')], fake)
        self.assertEqual(code, 1)
        self.assertIn('Deck not found', err)
        code, _, err = self.run_main([str(script), '--mp3-name', 'vo.wav'], fake)
        self.assertEqual(code, 1)
        self.assertIn('.mp3', err)
        self.assertEqual(calls, [])

    def test_mp3_name_without_extension(self):
        txt = self.tmp / 'beats.txt'
        txt.write_text('One two.\n\nThree four.\n', encoding='utf-8')
        fake, _ = make_fake_edge()
        code, _, err = self.run_main(['--text', str(txt), '--mp3-name', 'narration'], fake)
        self.assertEqual(code, 0, err)
        self.assertTrue((self.tmp / 'narration.mp3').exists())
        data = json.loads((self.tmp / 'word_timestamps.json').read_text(encoding='utf-8'))
        self.assertEqual(data['audio'], 'narration.mp3')
        self.assertEqual(list(self.tmp.glob('*.tmp*')), [])
        # the file really is MP3 whatever the (temp) name: encode_mp3 forces the container
        out = self.tmp / 'odd name'
        tts_free.encode_mp3(array('h', bytes(4800)), 48000, out)
        self.assertAlmostEqual(len(_decode(out)), 2400, delta=48)


if __name__ == '__main__':
    unittest.main()
