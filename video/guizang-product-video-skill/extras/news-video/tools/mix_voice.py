#!/usr/bin/env python3
"""Lay the TTS narration over the skill's BGM + SFX mix (scripts/mix_audio.py) -> assets/final-mix.wav.

music-ducked.wav (already ducked under SFX) is ducked a further --duck-db under every subtitle span;
sfx-stem.wav stays as is; the voice leads. Two-pass loudnorm to --lufs / --tp. The result is recorded in
evidence/audio-mix.json as "voiceMix" so the overlay's render.mjs accepts it as the master.

  python3 mix_voice.py --project ./film [--duck-db 11] [--voice-gain 1.15] [--sfx-gain 0.9] [--lufs -16] [--tp -1.5]
"""
import argparse, hashlib, json, subprocess, tempfile, wave
from pathlib import Path
import numpy as np


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, default=Path('.'))
    ap.add_argument('--duck-db', type=float, default=11)
    ap.add_argument('--voice-gain', type=float, default=1.15)
    ap.add_argument('--sfx-gain', type=float, default=.9)
    ap.add_argument('--music-gain', type=float, default=1.0)
    ap.add_argument('--lufs', type=float, default=-16)
    ap.add_argument('--tp', type=float, default=-1.5)
    a = ap.parse_args()
    P = a.project.resolve()
    plan = json.loads((P/'plan.json').read_text(encoding='utf-8')); D = plan['duration']; R = 48000; N = int(round(D*R))

    def load(f, ch):
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(P/f), '-f', 'f32le', '-ac', str(ch), '-ar', str(R), '-'])
        x = np.frombuffer(raw, np.float32).reshape(-1, ch); out = np.zeros((N, ch), np.float32); out[:min(N, len(x))] = x[:N]; return out
    music = load('assets/music-ducked.wav', 2); sfx = load('assets/sfx-stem.wav', 2); voice = load('assets/voice.wav', 1)
    env = np.ones(N, np.float32); g = 10**(-a.duck_db/20); att, rel = .18, .45
    t = np.arange(N)/R
    for s in plan['subtitles']:
        x, y = s['start'], s['end']; seg = np.ones(N, np.float32)
        m = (t >= x-att) & (t < x); seg[m] = 1-(1-g)*(t[m]-(x-att))/att
        m = (t >= x) & (t < y); seg[m] = g
        m = (t >= y) & (t < y+rel); seg[m] = g+(1-g)*(t[m]-y)/rel
        env = np.minimum(env, seg)
    mix = music*a.music_gain*env[:, None] + sfx*a.sfx_gain + voice*a.voice_gain
    target = f'I={a.lufs}:TP={a.tp}:LRA=11'
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp)/'raw.wav'
        with wave.open(str(raw), 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(R); w.writeframes((np.clip(mix, -1, 1)*32767).astype('<i2').tobytes())
        meas = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(raw), '-af', f'loudnorm={target}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
        st = json.loads(meas[meas.rfind('{'):meas.rfind('}')+1])
        norm = f'loudnorm={target}:linear=true:' + ':'.join(f'{k}={st[v]}' for k, v in [('measured_I', 'input_i'), ('measured_TP', 'input_tp'), ('measured_LRA', 'input_lra'), ('measured_thresh', 'input_thresh'), ('offset', 'target_offset')])
        out = subprocess.run(['ffmpeg', '-y', '-v', 'info', '-i', str(raw), '-af', norm+':print_format=json', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', '-t', f'{D:.3f}', str(P/'assets/final-mix.wav')], capture_output=True, text=True, check=True).stderr
        fs = json.loads(out[out.rfind('{'):out.rfind('}')+1])
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    rep_p = P/'evidence/audio-mix.json'
    if not rep_p.exists(): raise SystemExit('evidence/audio-mix.json missing: run the skill scripts/mix_audio.py plan.json first')
    rep = json.loads(rep_p.read_text(encoding='utf-8'))
    rep['voiceMix'] = {'file': 'assets/final-mix.wav', 'sha256': sha(P/'assets/final-mix.wav'),
                       'voice': {'file': 'assets/voice.wav', 'sha256': sha(P/'assets/voice.wav'), 'engine': plan.get('voice', {}).get('engine')},
                       'basedOnMaster': rep['master']['sha256'], 'musicDuckUnderSpeechDb': a.duck_db,
                       'gains': {'music': a.music_gain, 'sfx': a.sfx_gain, 'voice': a.voice_gain}, 'loudnorm': {'measurement': st, 'output': fs}}
    rep_p.write_text(json.dumps(rep, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('assets/final-mix.wav', {k: fs.get(k) for k in ['output_i', 'output_tp', 'normalization_type']})


if __name__ == '__main__':
    main()
