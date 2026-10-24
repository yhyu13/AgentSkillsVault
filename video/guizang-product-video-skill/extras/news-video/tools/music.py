#!/usr/bin/env python3
"""Code-original news-bed score (numpy, no samples) arranged from plan.json shot boundaries -> assets/music.wav.

Soft pad swell under the first (title) shot, a steady pulse (pluck arpeggio + soft kick + shaker) under the
items with the chord turning over at every half shot, thinner texture under any "radar" shot, and a
Bb -> C -> F cadence on the last shot when it is an outro. Seeded and reproducible.

  python3 music.py --project ./film [--bpm 104] [--seed 7418] [--lufs -18]
"""
import argparse, json, math, subprocess, wave
from pathlib import Path
import numpy as np


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, default=Path('.'))
    ap.add_argument('--bpm', type=float, default=104)
    ap.add_argument('--seed', type=int, default=7418)
    ap.add_argument('--lufs', type=float, default=-18, help='bed loudness before the final mix')
    a = ap.parse_args()
    P = a.project.resolve()
    plan = json.loads((P/'plan.json').read_text(encoding='utf-8'))
    R = 48000; D = plan['duration']; N = int(round(D*R))
    L = np.zeros(N, np.float32); Rr = np.zeros(N, np.float32)
    rng = np.random.default_rng(a.seed)
    beat = 60/a.bpm
    hz = lambda n: 440*2**((n-69)/12)

    def add(start, dur, sig, pan=0.0):
        o = int(start*R)
        if o >= N: return
        sig = sig[:N-o]; lg, rg = math.sqrt((1-pan)/2), math.sqrt((1+pan)/2)
        L[o:o+len(sig)] += sig*lg; Rr[o:o+len(sig)] += sig*rg

    def tone(note, dur, amp, kind):
        t = np.arange(int(dur*R))/R; f = hz(note); p = 2*np.pi*f*t
        if kind == 'pad':
            env = np.minimum(1, t/.6)*np.minimum(1, (dur-t)/.8)
            s = (np.sin(p) + .18*np.sin(2*p+.3) + .06*np.sin(3*p)) * (1 + .15*np.sin(2*np.pi*.3*t))
        elif kind == 'pluck':
            env = np.minimum(1, t/.003)*np.exp(-5.5*t)*np.minimum(1, (dur-t)/.05)
            s = np.sin(p) + .35*np.sin(2*p)*np.exp(-8*t) + .12*np.sin(3*p)*np.exp(-12*t)
        else:  # bass
            env = np.minimum(1, t/.01)*np.exp(-2.6*t)*np.minimum(1, (dur-t)/.06)
            s = np.sin(p) + .2*np.sin(2*p)
        return (s*env*amp).astype(np.float32)

    CH = [[41, 57, 60, 64, 67], [38, 57, 60, 62, 65], [46, 57, 62, 65, 69], [36, 55, 60, 62, 67]]  # Fmaj9 Dm9 Bbmaj9 Csus
    shots = plan['shots']
    has_outro = len(shots) > 1 and shots[-1].get('kind') == 'outro'
    outro_start = shots[-1]['start'] if has_outro else D
    body_start = shots[1]['start'] if len(shots) > 1 else 0
    thin = [(s['start'], s['end']) for s in shots if s.get('kind') == 'radar']
    segs = []
    for s in shots:
        mid = (s['start']+s['end'])/2; segs += [(s['start'], mid), (mid, s['end'])]
    for k, (x, y) in enumerate(segs):
        if x >= outro_start: break
        ch = CH[k % 4]
        for i, n in enumerate(ch[1:]): add(x, y-x+.9, tone(n, y-x+.9, .018, 'pad'), (i-1.5)*.35)
        add(x, min(y-x, 2.2), tone(ch[0], min(y-x, 2.2), .11, 'bass'))
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    t, k = body_start, 0
    while t < outro_start - .05:
        seg = next((i for i, (x, y) in enumerate(segs) if x <= t < y), len(segs)-1)
        ch = CH[seg % 4]
        if not any(x <= t < y for x, y in thin) or k % 2 == 0:
            add(t, .9, tone(ch[1+pat[k % 8]]+12, .9, .05 if k % 2 == 0 else .035, 'pluck'), -.3 if k % 2 else .3)
        t += beat/2; k += 1
    t, k = body_start, 0
    while t < outro_start - .05:
        if k % 2 == 0:
            n = int(.18*R); tt = np.arange(n)/R
            ph = 2*np.pi*(50*tt + 60*.03*(1-np.exp(-tt/.03)))
            add(t, .18, (.16*np.sin(ph)*np.exp(-20*tt)).astype(np.float32))
        n = int(.04*R); tt = np.arange(n)/R
        add(t + beat/4, .04, (np.diff(rng.uniform(-1, 1, n+1))*.010*np.exp(-80*tt)).astype(np.float32), .4 if k % 2 else -.4)
        t += beat/2; k += 1
    for i, n in enumerate(CH[0][1:]): add(0, shots[0]['end']+.6, tone(n, shots[0]['end']+.6, .022, 'pad'), (i-1.5)*.35)
    if has_outro:
        o = outro_start
        for j, (ch, dur) in enumerate([(CH[2], .9), (CH[3], .9), (CH[0], max(1.0, D-o-1.8+.01))]):
            x = o + j*.9
            for i, n in enumerate(ch[1:]): add(x, dur, tone(n, dur, .024, 'pad'), (i-1.5)*.35)
            add(x, min(dur, 2.5), tone(ch[0], min(dur, 2.5), .12, 'bass'))
        for j, n in enumerate([72, 74, 76, 79, 81]): add(o + .3 + j*.18, 1.6, tone(n, 1.6, .06, 'pluck'), .15)
    tt = np.arange(N)/R; env = np.minimum(1, tt/.4)*np.clip((D-tt)/1.4, 0, 1)
    st = np.clip(np.stack([L*env, Rr*env], 1), -.98, .98)
    raw = P/'assets/music-raw.wav'; raw.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(raw), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(R); w.writeframes((st*32767).astype('<i2').tobytes())
    tmp = P/'assets/music-norm.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af', f'loudnorm=I={a.lufs}:TP=-2:LRA=9', '-ar', '48000', str(tmp)], check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(tmp), '-af', 'apad=whole_dur=%.3f' % (D+0.2), '-c:a', 'pcm_s16le', str(P/'assets/music.wav')], check=True)
    tmp.unlink()
    print('assets/music.wav', D, 's @', a.bpm, 'BPM, F major')


if __name__ == '__main__':
    main()
