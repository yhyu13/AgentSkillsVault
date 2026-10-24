#!/usr/bin/env python
"""
make_sfx.py
Synthesize the storyboard skill's own royalty-free SFX library (assets/sfx/).

Every sound is generated from scratch with numpy (filtered noise, oscillators,
additive partials, a synthetic convolution room) so the library carries no
third-party licence. Seeds are fixed per sound (numpy RandomState, whose
streams are frozen), so re-running the script produces byte-identical WAVs
(tests/test_sfx.py checks this against the committed files).

Output (default: assets/sfx/ next to this script):
  <name>.wav      48 kHz, stereo, 16-bit PCM, peak-normalized to -3 dBFS
  manifest.json   {"<name>": {"file", "duration", "gain_db", "use", "peak_time"}}
  _preview.wav    every sound back to back (0.5 s gaps) at its manifest gain,
                  for a human to audition. Not listed in the manifest.

gain_db is the default mix gain for a VO normalized to about -16 LUFS: it
brings each file to the same short-window loudness (TARGET_LOUDNESS, K-weighted,
200 ms window), plus a small per-sound trim (e.g. whoosh-soft / pop-soft are
deliberately a few dB quieter). All values are <= 0 dB. Every file peaks at
-3 dBFS, so its peak after gain is -3 + gain_db: short transients (tick, click,
typing) get gains near 0 and land around -7 to -8 dBFS, so the mixer must leave
headroom or limit the VO + SFX sum.

The loudness meter counts sub bass that laptop and phone speakers cannot play, so
the designs also carry mid-range harmonics (impact, pop-soft) and --analyze reports
the loudness each sound loses through simple laptop / phone speaker models (tests
keep it within 3.5 / 6.5 dB). Only the whooshes pan; the rest stay centred.

peak_time (additive extra) is the time, in seconds from the start of the file,
of its loudest moment (the loudest 5 ms inside the loudest 50 ms). It is ~0 for
transients (pop, tick, impact...), mid-file for whooshes, and the end of the
build for riser (place a riser at event_t - peak_time so it lands on the reveal).

Entries in an existing manifest.json that make_sfx.py does not generate (hand-
added custom sounds) are kept as long as their file still exists. A --only rebuild
keeps the other built-in entries; any that are missing (no manifest yet) or broken
are re-measured from their WAV on disk. A manifest that is not valid JSON is saved
as manifest.json.bak before it is rewritten. A UTF-8 BOM is accepted.

Usage:
    python make_sfx.py                   # rebuild assets/sfx/*.wav + manifest.json + _preview.wav
    python make_sfx.py --out some/dir    # build into another directory
    python make_sfx.py --only pop,tick   # rebuild a subset (merged into the existing manifest)
    python make_sfx.py --analyze         # also print the peak / RMS / centroid / loudness /
                                         # stereo balance / small-speaker (laptop, phone) table
    python make_sfx.py --analyze-only    # measure the files already in --out, don't regenerate
    python make_sfx.py --no-preview      # skip _preview.wav
    python make_sfx.py --list            # list the sounds and what they are for

Requires: pip install numpy
"""
import argparse
import json
import math
import shutil
import sys
import wave
import zlib
from pathlib import Path

try:
    import numpy as np
except ImportError:
    sys.exit("numpy not installed. Run:\n  pip install numpy")


SR = 48000                 # sample rate (Hz)
PEAK_DBFS = -3.0           # every file is peak-normalized to this
TARGET_LOUDNESS = -24.0    # K-weighted 200 ms-window max loudness after gain_db (LUFS-like)
LOUDNESS_WINDOW = 0.200    # seconds; ~the ear's loudness integration time for short sounds
PREVIEW_GAP = 0.5          # seconds of silence between sounds in _preview.wav
DEFAULT_OUT = Path(__file__).resolve().parent / 'assets' / 'sfx'

# Names every consumer (render_video.py auto sound design) may rely on.
REQUIRED = ['whoosh', 'whoosh-soft', 'swipe', 'pop', 'pop-soft', 'tick', 'click',
            'sparkle', 'riser', 'impact', 'chime', 'typing', 'confetti', 'success']


class SfxError(Exception):
    """A user-facing problem (empty / unknown sound names, unusable output directory),
    raised before anything is written. main() prints the message and exits 1. It is not
    a ValueError on purpose, so a genuine bug is never mistaken for bad input."""


def _say(msg, file=None):
    """print() that survives characters the stream cannot encode, e.g. a non-ASCII
    user-profile path (C:/Users/<name>/...) printed to a piped cp1252 stdout."""
    stream = file if file is not None else sys.stdout
    try:
        print(msg, file=stream)
    except UnicodeEncodeError:
        enc = getattr(stream, 'encoding', None) or 'ascii'
        print(msg.encode(enc, 'backslashreplace').decode(enc, 'replace'), file=stream)


def _warn(msg):
    _say(f'[warn] {msg}', sys.stderr)


# ---------------------------------------------------------------------------
# DSP building blocks
# ---------------------------------------------------------------------------
def _n(sec):
    return int(round(sec * SR))


def _t(n):
    return np.arange(n) / SR


def _rng(name):
    # RandomState's streams are frozen by numpy's compatibility policy, so the
    # same seed yields the same numbers on every numpy version.
    return np.random.RandomState(zlib.crc32(name.encode('utf-8')))


def _smooth(u):
    u = np.clip(u, 0.0, 1.0)
    return u * u * (3.0 - 2.0 * u)


def _ramp_in(t, sec):
    """sin^2 fade-in over `sec` seconds, then 1."""
    return np.where(t < sec, np.sin(0.5 * np.pi * np.clip(t / sec, 0, 1)) ** 2, 1.0)


def _bell(u, peak):
    """Smooth 0 -> 1 -> 0 hump over u in [0, 1] that peaks at u = peak."""
    k = math.log(0.5) / math.log(peak)
    return np.sin(np.pi * np.clip(u, 0.0, 1.0) ** k) ** 2


def _pan(mono, p):
    """Equal-power pan; p in [-1 (left), 1 (right)], scalar or per-sample."""
    theta = (np.clip(p, -1.0, 1.0) + 1.0) * (np.pi / 4.0)
    return np.stack([mono * np.cos(theta), mono * np.sin(theta)], axis=1)


def _place(buf, sig, start_sec):
    """Mix stereo `sig` into stereo `buf` starting at start_sec (truncated to fit)."""
    i = _n(start_sec)
    if i >= len(buf):
        return buf
    m = min(len(sig), len(buf) - i)
    buf[i:i + m] += sig[:m]
    return buf


def _svf(x, fc, q=0.7071, mode='bp'):
    """Topology-preserving state-variable filter (Zavalishin) with per-sample
    cutoff / Q. mode: 'lp', 'hp', or 'bp' (unity gain at the centre)."""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[0]
    fc = np.clip(np.broadcast_to(np.asarray(fc, dtype=np.float64), (n,)), 5.0, SR * 0.49)
    k = 1.0 / np.broadcast_to(np.asarray(q, dtype=np.float64), (n,))
    g = np.tan(np.pi * fc / SR)
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    xs, A1, A2, A3 = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    lp = [0.0] * n
    bp = [0.0] * n
    ic1 = ic2 = 0.0
    for i in range(n):
        v3 = xs[i] - ic2
        v1 = A1[i] * ic1 + A2[i] * v3
        v2 = ic2 + A2[i] * ic1 + A3[i] * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        bp[i] = v1
        lp[i] = v2
    lp = np.array(lp)
    bp = np.array(bp)
    if mode == 'lp':
        return lp
    if mode == 'hp':
        return x - k * bp - lp
    return k * bp


def _biquad(x, b, a):
    """Direct-form-I biquad; b = (b0, b1, b2), a = (1, a1, a2)."""
    b0, b1, b2 = b
    a1, a2 = a[1], a[2]
    xs = np.asarray(x, dtype=np.float64).tolist()
    out = [0.0] * len(xs)
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(xs):
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        out[i] = yi
    return np.array(out)


def _highpass_coeffs(fc, q=0.7071):
    """RBJ-cookbook 2nd-order high-pass."""
    w0 = 2.0 * math.pi * fc / SR
    alpha = math.sin(w0) / (2.0 * q)
    c = math.cos(w0)
    a0 = 1.0 + alpha
    b = ((1.0 + c) / 2.0 / a0, -(1.0 + c) / a0, (1.0 + c) / 2.0 / a0)
    a = (1.0, -2.0 * c / a0, (1.0 - alpha) / a0)
    return b, a


def _lowpass_fft(x, fc, order=2):
    """Zero-phase Butterworth-magnitude low-pass (whole-signal FFT)."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    X *= 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))
    return np.fft.irfft(X, n)


def _colored_noise(rng, n, slope_db_per_oct=-3.0):
    """Gaussian noise with a spectral tilt (-3 = pink, 0 = white), unit RMS,
    with the sub-30 Hz rumble rolled off."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = f[1]
    X *= (f / 1000.0) ** (slope_db_per_oct / (20.0 * math.log10(2.0)))
    X *= (f * f) / (f * f + 30.0 ** 2)
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-12)


def _osc(freq):
    """Phase (radians) of an oscillator following a per-sample frequency array."""
    return 2.0 * np.pi * np.cumsum(freq) / SR


def _saw(freq, phase0=0.0):
    """Band-limited (polyBLEP) sawtooth following a per-sample frequency array."""
    dt = np.asarray(freq, dtype=np.float64) / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2.0 * ph - 1.0
    lo = ph < dt
    x = ph[lo] / dt[lo]
    y[lo] -= x + x - x * x - 1.0
    hi = ph > 1.0 - dt
    x = (ph[hi] - 1.0) / dt[hi]
    y[hi] -= x * x + x + x + 1.0
    return y


def _flange(x, delay_ms):
    """x delayed by a per-sample (fractional) delay; mix it back in for a moving comb."""
    n = len(x)
    idx = np.arange(n) - np.asarray(delay_ms) * (SR / 1000.0)
    return np.interp(idx, np.arange(n), x, left=0.0)


def _room(rng, rt60, bright=9000.0, dark=2500.0, predelay=0.006, length=None, mono_below=250.0):
    """Synthetic stereo room impulse response: decorrelated L/R noise with an
    exponential decay that darkens over time. Below `mono_below` Hz both channels
    share one IR (mono bass: tails never phase-cancel in a mono downmix).
    Unit energy per channel."""
    length = length or min(rt60 * 1.1, 2.0)
    n = _n(length)
    t = _t(n)
    env = 10.0 ** (-3.0 * t / rt60) * _ramp_in(t, 0.004)
    blend = np.clip(t / (0.6 * rt60), 0.0, 1.0)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    low = 1.0 / np.sqrt(1.0 + (f / mono_below) ** 4)
    A = np.fft.rfft(rng.standard_normal(n))
    B = np.fft.rfft(rng.standard_normal(n))
    noises = (np.fft.irfft(A, n), np.fft.irfft(A * low + B * np.sqrt(1.0 - low * low), n))
    pd = _n(predelay)
    ir = np.zeros((n + pd, 2))
    for ch, w in enumerate(noises):
        ir[pd:, ch] = (_lowpass_fft(w, bright) * (1.0 - blend) + _lowpass_fft(w, dark) * blend) * env
    return ir / np.sqrt(np.sum(ir ** 2, axis=0))


def _smooth_power(x, win):
    """Per-channel power of stereo x, moving-averaged over `win` seconds (centred)."""
    w = max(1, min(_n(win), len(x)))                 # 'same' needs the kernel no longer than x
    k = np.ones(w) / w
    return np.stack([np.convolve(x[:, c] ** 2, k, 'same') for c in range(x.shape[1])], axis=1)


def _hold_balance(dry, mix, win=0.06, smooth=0.02):
    """Slow per-channel gain that puts the L/R balance of `mix` back on that of `dry`
    (60 ms power windows, then 20 ms gain smoothing, at most about +/-4 dB). Where the dry
    has died away (30 dB down) the target drifts to centre. Total power is kept."""
    d, m = _smooth_power(dry, win), _smooth_power(mix, win)
    eps_d = 1e-3 * float(np.max(d[:, 0] + d[:, 1])) + 1e-30
    eps_m = 1e-9 * float(np.max(m)) + 1e-30
    share = (d[:, 0] + 0.5 * eps_d) / (d[:, 0] + d[:, 1] + eps_d)
    total = m[:, 0] + m[:, 1]
    g = np.stack([np.sqrt(share * total / (m[:, 0] + eps_m)),
                  np.sqrt((1.0 - share) * total / (m[:, 1] + eps_m))], axis=1)
    w = max(1, min(_n(smooth), len(g)))
    g = np.stack([np.convolve(g[:, c], np.ones(w) / w, 'same') for c in range(2)], axis=1)
    return mix * np.clip(g, 0.6, 1.6)


def _reverb(rng, x, rt60, wet, bright=9000.0, dark=2500.0, predelay=0.006, hold_balance=False):
    """Add a subtle synthetic room to stereo x (length preserved).

    hold_balance: a tone and its own room reflections interfere with a different phase
    in each channel, which can tilt a chime's image 4-5 dB to one side. With it the
    result keeps the dry signal's L/R balance (_hold_balance): the room adds space, never
    a pan. Only for tonal sounds: on a moving source (a whoosh) the far-side tail is the
    point, so it stays off there."""
    ir = _room(rng, rt60, bright, dark, predelay)
    n = len(x)
    size = 1 << int(math.ceil(math.log2(n + len(ir) - 1)))
    Y = np.fft.rfft(x, size, axis=0) * np.fft.rfft(ir, size, axis=0)
    y = x + wet * np.fft.irfft(Y, size, axis=0)[:n]
    return _hold_balance(x, y) if hold_balance else y


def _decay_tone(t, freq, tau, amp=1.0, phase=0.0):
    return amp * np.sin(2.0 * np.pi * freq * t + phase) * np.exp(-t / tau)


# ---------------------------------------------------------------------------
# Sound designs. Each takes (rng, n_samples) and returns float stereo (n, 2).
# ---------------------------------------------------------------------------
def _whoosh_core(rng, n, f_start, f_peak, f_end, peak_at, q, air, body, tilt,
                 pan_from, pan_to, sharpness, flange, lowpass, rt60, wet, resonance=0.8):
    t = _t(n)
    u = t / t[-1]
    a = _smooth(u / peak_at)
    b = _smooth((u - peak_at) / (1.0 - peak_at))
    rising = u <= peak_at
    logf = np.where(rising,
                    math.log(f_start) + (math.log(f_peak) - math.log(f_start)) * a,
                    math.log(f_peak) + (math.log(f_end) - math.log(f_peak)) * b)
    fc = np.exp(logf)
    env = _bell(u, peak_at) ** sharpness

    src = _colored_noise(rng, n, tilt)
    white = rng.standard_normal(n)
    # broad band + a narrower resonant band riding the same sweep (the audible "pitch" of the pass-by)
    sig = _svf(src, fc, q, 'bp') + resonance * _svf(src, fc, 3.5, 'bp')
    if air:
        sig += air * _svf(white, np.minimum(fc * 3.0, 12000.0), 0.8, 'bp')
    if body:
        sig += body * _svf(src, np.maximum(fc * 0.35, 60.0), 0.7, 'lp')
    if flange:
        # comb sweep tied to the pass-by: long delay far away, short at the peak
        sig = sig + flange * _flange(sig, 0.25 + 2.2 * (1.0 - _bell(u, peak_at)))
    mono = sig * env
    if lowpass:
        mono = _svf(mono, lowpass, 0.7071, 'lp')
    progress = np.where(rising, 0.5 * a, 0.5 + 0.5 * b)
    stereo = _pan(mono, pan_from + (pan_to - pan_from) * progress)
    return _reverb(rng, stereo, rt60, wet)


def whoosh(rng, n):
    return _whoosh_core(rng, n, f_start=380.0, f_peak=2400.0, f_end=520.0, peak_at=0.48,
                        q=1.3, air=0.16, body=0.2, tilt=-3.0, pan_from=-0.9, pan_to=0.9,
                        sharpness=1.4, flange=0.3, lowpass=9000.0, rt60=0.45, wet=0.12)


def whoosh_soft(rng, n):
    return _whoosh_core(rng, n, f_start=220.0, f_peak=1150.0, f_end=300.0, peak_at=0.5,
                        q=1.0, air=0.05, body=0.3, tilt=-4.5, pan_from=-0.5, pan_to=0.5,
                        sharpness=1.2, flange=0.2, lowpass=3000.0, rt60=0.4, wet=0.12,
                        resonance=0.5)


def swipe(rng, n):
    return _whoosh_core(rng, n, f_start=900.0, f_peak=4200.0, f_end=1500.0, peak_at=0.36,
                        q=1.5, air=0.18, body=0.0, tilt=-3.0, pan_from=-0.6, pan_to=0.65,
                        sharpness=1.6, flange=0.3, lowpass=11000.0, rt60=0.25, wet=0.08)


def pop(rng, n):
    t = _t(n)
    f = 300.0 + 600.0 * np.exp(-t / 0.012)          # 900 -> 300 Hz pitch drop
    ph = _osc(f)
    amp = _ramp_in(t, 0.0012) * np.exp(-t / 0.030)
    tone = (np.sin(ph) + 0.10 * np.sin(2.0 * ph) * np.exp(-t / 0.012)) * amp
    click = (_svf(rng.standard_normal(n), 3500.0, 0.7071, 'hp')
             * np.exp(-t / 0.0007) * _ramp_in(t, 0.0002) * 0.45)
    return _reverb(rng, _pan(tone + click, 0.0), rt60=0.2, wet=0.07, bright=7000.0)


def pop_soft(rng, n):
    t = _t(n)
    f = 240.0 + 340.0 * np.exp(-t / 0.019)          # 580 -> 240 Hz: lower and rounder than pop
    ph = _osc(f)
    amp = _ramp_in(t, 0.003) * np.exp(-t / 0.040)
    # a soft 2nd harmonic (no bright click) keeps it audible on phone speakers, which
    # barely reproduce the 240 Hz fundamental on its own
    tone = (np.sin(ph) + 0.40 * np.sin(2.0 * ph) * np.exp(-t / 0.032)) * amp
    thud = (_svf(rng.standard_normal(n), 1000.0, 0.8, 'bp')
            * np.exp(-t / 0.0015) * _ramp_in(t, 0.0005) * 0.11)
    mono = _svf(tone + thud, 2400.0, 0.7071, 'lp')
    return _reverb(rng, _pan(mono, 0.0), rt60=0.22, wet=0.08, bright=5000.0)


def tick(rng, n):
    t = _t(n)
    noise = (_svf(rng.standard_normal(n), 2500.0, 0.7071, 'hp') * np.exp(-t / 0.0005) * 0.8)
    tone = (_decay_tone(t, 4100.0, 0.0032, 0.9)
            + _decay_tone(t, 6300.0, 0.0018, 0.5, 1.0)
            + _decay_tone(t, 2050.0, 0.0050, 0.3))
    mono = (noise + tone) * _ramp_in(t, 0.00025)
    return _reverb(rng, _pan(mono, 0.0), rt60=0.12, wet=0.05, bright=12000.0)


def click(rng, n):
    def strike(m, fscale, level):
        t = _t(m)
        noise = (_svf(rng.standard_normal(m), 3000.0 * fscale, 0.9, 'bp') * np.exp(-t / 0.0008) * 0.9)
        tone = (_decay_tone(t, 2300.0 * fscale, 0.0028, 0.55)
                + _decay_tone(t, 1250.0 * fscale, 0.0040, 0.45, 0.5)
                + _decay_tone(t, 540.0 * fscale, 0.0070, 0.35))
        return _pan(level * (noise + tone) * _ramp_in(t, 0.0003), 0.0)

    buf = np.zeros((n, 2))
    _place(buf, strike(_n(0.03), 1.0, 1.0), 0.0)        # press
    _place(buf, strike(_n(0.03), 1.12, 0.35), 0.016)    # release, a touch higher
    return _reverb(rng, buf, rt60=0.15, wet=0.06, bright=10000.0)


def sparkle(rng, n):
    t_all = _t(n)
    pool = [1046.5 * 2.0 ** (s / 12.0) for s in (0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24)]  # C6..C8 pentatonic
    count = 9
    idx = np.clip(np.round(np.linspace(1, 10, count) + rng.uniform(-1.2, 1.2, count)), 0, 10).astype(int)
    onsets = np.cumsum(rng.uniform(0.018, 0.050, count)) - 0.014
    amps = rng.uniform(0.55, 1.0, count) * (1.0 - 0.35 * np.arange(count) / (count - 1))
    taus = rng.uniform(0.07, 0.15, count)
    pans = rng.uniform(-0.5, 0.5, count)
    buf = np.zeros((n, 2))
    for i in range(count):
        m = n - _n(onsets[i])
        t = _t(m)
        f = pool[idx[i]]
        note = (np.sin(2.0 * np.pi * f * t) * np.exp(-t / taus[i])
                + 0.18 * np.sin(2.0 * np.pi * 2.0 * f * t) * np.exp(-t / (0.4 * taus[i]))
                + 0.07 * np.sin(2.0 * np.pi * 2.76 * f * t) * np.exp(-t / (0.25 * taus[i])))
        _place(buf, _pan(amps[i] * note * _ramp_in(t, 0.0015), pans[i]), onsets[i])
    shimmer_env = _ramp_in(t_all, 0.012) * np.exp(-t_all / 0.18) * 0.05
    for ch in range(2):
        buf[:, ch] += _svf(rng.standard_normal(n), 7000.0, 0.7071, 'hp') * shimmer_env
    return _reverb(rng, buf, rt60=1.0, wet=0.3, bright=11000.0, dark=5000.0, hold_balance=True)


def riser(rng, n):
    t = _t(n)
    rise = 1.5
    u = np.clip(t / rise, 0.0, 1.0)
    f0 = 110.0 * 4.0 ** (u ** 1.6)                   # A2 -> A4, accelerating
    detunes = (-14.0, -5.0, 6.0, 15.0)               # cents
    pans = (-0.7, -0.25, 0.25, 0.7)
    saws = np.zeros((n, 2))
    for c, p in zip(detunes, pans):
        saws += _pan(_saw(f0 * 2.0 ** (c / 1200.0), rng.uniform()), p)
    saws += _pan(0.35 * np.sin(_osc(f0 * 0.5)), 0.0)  # sub octave for weight
    cutoff = 220.0 * (8500.0 / 220.0) ** (u ** 1.3)
    for ch in range(2):
        saws[:, ch] = _svf(saws[:, ch], cutoff, 1.8, 'lp')
    noise_fc = 700.0 * (8000.0 / 700.0) ** u
    noise = np.stack([_svf(_colored_noise(rng, n, -3.0), noise_fc, 0.9, 'bp') for _ in range(2)], axis=1)
    swell = _ramp_in(t, 0.15) * u ** 1.8
    release = np.where(t > rise, np.cos(0.5 * np.pi * np.clip((t - rise) / (t[-1] - rise), 0, 1)) ** 2, 1.0)
    mix = (0.3 * saws + 0.6 * noise * (u ** 0.8)[:, None]) * (swell * release)[:, None]
    return _reverb(rng, mix, rt60=0.8, wet=0.15)


def impact(rng, n):
    t = _t(n)
    f = 55.0 + 110.0 * np.exp(-t / 0.04)             # 165 -> 55 Hz thump
    sub = np.sin(_osc(f)) * _ramp_in(t, 0.0015) * np.exp(-t / 0.15)
    thump = 0.5 * np.tanh(1.8 * sub) / math.tanh(1.8)     # gentle saturation
    # parallel hard saturation of the same sub, band-limited to 300-1600 Hz: harmonics that
    # follow its pitch drop, so laptop / phone speakers hear the boom ("missing fundamental")
    growl = 0.7 * _svf(_svf(np.tanh(6.0 * sub), 300.0, 0.7071, 'hp'), 1600.0, 0.7071, 'lp')
    # mid "knock": the punch small speakers actually reproduce
    knock = np.sin(_osc(180.0 + 200.0 * np.exp(-t / 0.02))) * _ramp_in(t, 0.001) * np.exp(-t / 0.09) * 0.7
    burst = _lowpass_fft(_colored_noise(rng, n, -3.0), 3000.0) * np.exp(-t / 0.045) * _ramp_in(t, 0.0008) * 1.0
    crack = _svf(rng.standard_normal(n), 1800.0, 1.0, 'bp') * np.exp(-t / 0.007) * _ramp_in(t, 0.0003) * 1.3
    mono = thump + growl + knock + burst + crack
    return _reverb(rng, _pan(mono, 0.0), rt60=0.9, wet=0.35, bright=4000.0, dark=1200.0, predelay=0.012)


def chime(rng, n):
    t = _t(n)
    f = 880.0                                        # A5, glockenspiel-like bar modes
    partials = ((0.5, 0.10, 0.90), (1.0, 1.00, 0.62), (2.0, 0.16, 0.40),
                (2.76, 0.30, 0.30), (5.40, 0.10, 0.12), (8.93, 0.035, 0.06))
    buf = np.zeros((n, 2))
    for i, (ratio, amp, tau) in enumerate(partials):
        fr = f * ratio
        decay = 0.5 * np.exp(-t / (0.3 * tau)) + 0.5 * np.exp(-t / tau)
        ph = rng.uniform(0.0, 2.0 * np.pi)
        # a weak doublet ~0.7 Hz above gives the slow bell warble; it is identical in both
        # channels so a mono (phone) downmix never cancels. Width comes from pan + room.
        tone = np.sin(2.0 * np.pi * fr * t + ph) + 0.22 * np.sin(2.0 * np.pi * fr * 1.0008 * t + ph)
        # the strike tone stays centred; the weaker partials spread either side
        buf += _pan(amp * tone * decay, (-0.3, 0.0, -0.25, 0.3, -0.3, 0.3)[i])
    buf *= _ramp_in(t, 0.008)[:, None]
    return _reverb(rng, buf, rt60=1.4, wet=0.25, bright=10000.0, dark=4000.0, hold_balance=True)


def typing(rng, n):
    buf = np.zeros((n, 2))
    end = n / SR
    t0 = 0.012
    while t0 < end - 0.06:
        space = rng.uniform() < 0.12
        level = rng.uniform(0.65, 1.0)
        p = rng.uniform(-0.3, 0.3)
        m = _n(0.05)
        t = _t(m)
        fn = rng.uniform(2400.0, 4200.0) * (0.7 if space else 1.0)
        fb = rng.uniform(380.0, 700.0) * (0.75 if space else 1.0)
        fk = rng.uniform(1500.0, 2200.0)
        press = (_svf(rng.standard_normal(m), fn, 1.5, 'bp') * np.exp(-t / 0.0012) * 1.2
                 + _decay_tone(t, fb, 0.012 if space else 0.008, 0.40 if space else 0.26)
                 + _decay_tone(t, fk, 0.003, 0.3, rng.uniform(0.0, 6.28)))
        _place(buf, _pan(level * press * _ramp_in(t, 0.0003), p), t0)
        rel = rng.uniform(0.035, 0.07)
        r = _svf(rng.standard_normal(_n(0.02)), rng.uniform(3000.0, 5000.0), 1.2, 'bp')
        tr = _t(len(r))
        _place(buf, _pan(0.3 * level * r * np.exp(-tr / 0.001) * _ramp_in(tr, 0.0003), p), t0 + rel)
        roll = rng.uniform()
        if roll < 0.25:
            gap = rng.uniform(0.04, 0.06)            # rolled-over key pair
        else:
            gap = float(np.clip(rng.lognormal(math.log(0.095), 0.4), 0.05, 0.24))
            if roll > 0.9:
                gap += rng.uniform(0.08, 0.15)       # thinking pause
        t0 += gap
    return _reverb(rng, buf, rt60=0.25, wet=0.1, bright=9000.0)


def confetti(rng, n):
    t = _t(n)
    buf = np.zeros((n, 2))
    # 1) the popper: a band-passed bang + a small low thump + a hard crack
    bang = (_svf(rng.standard_normal(n), 1200.0, 0.7, 'bp') * np.exp(-t / 0.004) * _ramp_in(t, 0.0004)
            + np.sin(_osc(80.0 + 80.0 * np.exp(-t / 0.01))) * np.exp(-t / 0.02) * 0.6
            + _svf(rng.standard_normal(n), 5000.0, 0.7071, 'hp') * np.exp(-t / 0.0005) * 0.5)
    buf += _pan(bang, 0.0)
    # 2) paper rush: a quick bright whoosh
    m = _n(0.3)
    tr = _t(m)
    ur = tr / tr[-1]
    rush_fc = np.exp(math.log(2400.0) + (math.log(5200.0) - math.log(2400.0)) * _bell(ur, 0.3))
    for ch in range(2):
        rush = _svf(_colored_noise(rng, m, -1.5), rush_fc, 0.9, 'bp') * _bell(ur, 0.25) * 0.45
        buf[:m, ch] += rush
    # 3) crackle tail: sparse micro-transients (paper flecks landing), density and
    #    level decaying, wide stereo
    count = 320
    times = 0.015 + rng.exponential(0.5, count)
    for tc in times:
        if tc > n / SR - 0.02:
            continue
        mm = _n(0.006)
        tt = _t(mm)
        crack = (_decay_tone(tt, rng.uniform(2200.0, 7000.0), rng.uniform(0.0004, 0.0012), 1.0, rng.uniform(0, 6.28))
                 * rng.uniform(0.05, 0.28) * math.exp(-tc / 0.85))
        _place(buf, _pan(crack, rng.uniform(-0.9, 0.9)), tc)
    # 4) short glints riding the burst
    for _ in range(8):
        tc = rng.uniform(0.04, 0.45)
        mm = _n(0.25)
        tt = _t(mm)
        tw = _decay_tone(tt, rng.uniform(2600.0, 5200.0), rng.uniform(0.025, 0.05), rng.uniform(0.05, 0.1))
        _place(buf, _pan(tw * _ramp_in(tt, 0.002), rng.uniform(-0.7, 0.7)), tc)
    return _reverb(rng, buf, rt60=0.6, wet=0.2, bright=10000.0)


def success(rng, n):
    # G5 B5 D6; the earlier notes ring a little shorter so the top note is the one that
    # resolves (and stays on top in the tail)
    notes = ((0.00, 783.99, -0.2, 0.26), (0.09, 987.77, 0.0, 0.28), (0.18, 1174.66, 0.2, 0.42))
    buf = np.zeros((n, 2))
    for i, (onset, f, p, tau) in enumerate(notes):
        m = n - _n(onset)
        t = _t(m)
        decay = 0.45 * np.exp(-t / 0.08) + 0.55 * np.exp(-t / tau)
        tone = (np.sin(2.0 * np.pi * f * t)
                + 0.22 * np.sin(2.0 * np.pi * 2.0 * f * t) * np.exp(-t / 0.15)
                + 0.06 * np.sin(2.0 * np.pi * 3.0 * f * t) * np.exp(-t / 0.08)
                + 0.06 * np.sin(2.0 * np.pi * 2.76 * f * t) * np.exp(-t / 0.03))
        if i == len(notes) - 1:
            tone += 0.12 * np.sin(2.0 * np.pi * 2.0 * f * t + 1.0) * np.exp(-t / tau)  # octave sparkle
        _place(buf, _pan((0.85 + 0.075 * i) * tone * decay * _ramp_in(t, 0.003), p), onset)
    return _reverb(rng, buf, rt60=1.0, wet=0.22, bright=10000.0, dark=4000.0, hold_balance=True)


# name -> (design, duration s, fade-out s, loudness trim dB, use)
SOUNDS = {
    'whoosh': (whoosh, 0.80, 0.015, 0.0,
               "Showy slide transitions (push, slide, zoom, whip, morph) and big camera moves; "
               "the default transition whoosh, pans left to right."),
    'whoosh-soft': (whoosh_soft, 0.55, 0.015, -5.0,
                    "Gentle transitions and secondary camera drifts; darker, shorter and "
                    "quieter than whoosh."),
    'swipe': (swipe, 0.26, 0.012, -2.0,
              "Fast directional moves: swipe/wipe transitions, cards sliding in, carousel "
              "steps, quick zooms."),
    'pop': (pop, 0.13, 0.015, 0.0,
            "Playful element pops: popIn/bounce entrances, badges, emoji, bubbles, "
            "counters landing."),
    'pop-soft': (pop_soft, 0.15, 0.02, -4.0,
                 "Default for emphasis entrances (spring, scaleIn, overshoot, letterSpring); "
                 "subtle enough to repeat."),
    'tick': (tick, 0.05, 0.01, -5.0,
             "Word hits (WORD_HITS), bullet reveals, counter steps, timeline markers."),
    'click': (click, 0.07, 0.012, -3.0,
              "UI interactions: cursor clicks, button presses, toggles, tab switches in "
              "product demos."),
    'sparkle': (sparkle, 0.85, 0.15, -1.0,
                "Magic/highlight moments: glow, shine, starPop, sparkle effects, revealing "
                "a key insight."),
    'riser': (riser, 1.60, 0.03, 0.0,
              "Build-up into a big reveal or the final CTA; place it so it ends on the "
              "reveal (pairs with impact)."),
    'impact': (impact, 1.00, 0.12, 1.0,
               "Hero moments: title slams, big stat reveals, logo hits, the drop after a "
               "riser. Use sparingly."),
    'chime': (chime, 1.60, 0.2, -1.0,
              "Notifications, 'aha' moments, checkmarks appearing, gentle positive "
              "confirmations."),
    'typing': (typing, 1.00, 0.02, -4.0,
               "On-screen typing: typewriter, code, terminal and search-box animations "
               "(loop or trim to length)."),
    'confetti': (confetti, 1.25, 0.15, 0.0,
                 "Celebrations: confettiBurst, partyPopper, confettiRain, fireworks, "
                 "milestones."),
    'success': (success, 1.10, 0.2, 0.0,
                "Completion / win: checkDraw, badgeUnlock, trophyShine, goal reached, "
                "'done' states."),
}


assert all(name in SOUNDS for name in REQUIRED), 'every contract sound needs a design'


# ---------------------------------------------------------------------------
# Finishing, I/O, measurement
# ---------------------------------------------------------------------------
def _finish(x, n, fade_out):
    """Exact length, 20 Hz high-pass (DC/rumble removal), click-free fades,
    peak-normalize to PEAK_DBFS."""
    x = np.asarray(x, dtype=np.float64)
    out = np.zeros((n, 2))
    m = min(n, len(x))
    out[:m] = x[:m]
    b, a = _highpass_coeffs(20.0)
    for ch in range(2):
        out[:, ch] = _biquad(out[:, ch], b, a)
    t = _t(n)
    fin = _ramp_in(t, 0.001)
    fout = np.where(t > t[-1] - fade_out,
                    np.cos(0.5 * np.pi * np.clip((t - (t[-1] - fade_out)) / fade_out, 0, 1)) ** 2, 1.0)
    fade = (fin * fout)[:, None]
    # remove the offset the fades would leave on very short files (the high-pass's slow
    # tail): subtract the fade-weighted mean, so the result has zero mean AND zero edges
    out = (out - np.sum(out * fade, axis=0) / np.sum(fade)) * fade
    peak = np.max(np.abs(out))
    return out * (10.0 ** (PEAK_DBFS / 20.0) / peak) if peak > 0 else out


def _to_int16(x):
    return np.clip(np.round(x * 32767.0), -32768, 32767).astype('<i2')


def write_wav(path, x):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.ascontiguousarray(_to_int16(x)).tobytes())


def read_wav(path):
    """Return (float array (frames, channels) scaled to [-1, 1), sample_rate).
    Reads 8/16/24/32-bit integer PCM (the library itself is always 16-bit stereo);
    raises wave.Error / ValueError / EOFError for anything else or a damaged file."""
    with wave.open(str(path), 'rb') as w:
        ch, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(frames)
    if width == 2:
        data = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
    elif width == 1:                                  # 8-bit WAV is unsigned
        data = (np.frombuffer(raw, dtype=np.uint8).astype(np.float64) - 128.0) / 128.0
    elif width == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        data = np.where(v >= 1 << 23, v - (1 << 24), v).astype(np.float64) / float(1 << 23)
    elif width == 4:
        data = np.frombuffer(raw, dtype='<i4').astype(np.float64) / 2147483648.0
    else:
        raise ValueError(f'{path}: unsupported {8 * width}-bit PCM')
    return data.reshape(-1, ch), rate


def _as_stereo(x):
    """(n, 1) -> (n, 2) by duplication; more than two channels -> the first two."""
    if x.shape[1] == 1:
        return np.repeat(x, 2, axis=1)
    return x[:, :2]


def synthesize(name):
    """Render one sound to a finished float stereo array (before 16-bit quantization)."""
    design, dur, fade_out, _trim, _use = SOUNDS[name]
    n = _n(dur)
    return _finish(design(_rng(name), n), n, fade_out)


# BS.1770 K-weighting pre-filter + RLB high-pass, exact coefficients for 48 kHz.
_K_SHELF = ((1.53512485958697, -2.69169618940638, 1.19839281085285), (1.0, -1.69065929318241, 0.73248077421585))
_K_RLB = ((1.0, -2.0, 1.0), (1.0, -1.99004745483398, 0.99007225036621))


def loudness(x, window=LOUDNESS_WINDOW):
    """Max K-weighted loudness (LUFS-like) over a sliding window. Sounds shorter
    than the window are averaged over the full window, which models the ear's
    temporal integration (short blips sound quieter than their peak suggests)."""
    power = np.zeros(len(x))
    for ch in range(x.shape[1]):
        y = _biquad(_biquad(x[:, ch], *_K_SHELF), *_K_RLB)
        power += y * y
    w = _n(window)
    if len(power) < w:
        power = np.concatenate([power, np.zeros(w - len(power))])
    cs = np.concatenate([[0.0], np.cumsum(power)])
    ms = (cs[w:] - cs[:-w]) / w
    return -0.691 + 10.0 * math.log10(max(float(np.max(ms)), 1e-12))


# Small-speaker models for the translation check (analysis only): Butterworth-magnitude
# 4th-order high-pass (Hz), optional 4th-order low-pass (Hz).
SPEAKERS = {'laptop': (180.0, None), 'phone': (450.0, 12000.0)}


def speaker(x, kind):
    """Stereo x as heard through a SPEAKERS model (zero-phase FFT filter)."""
    hp, lp = SPEAKERS[kind]
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    size = 1 << int(math.ceil(math.log2(n + 4096)))
    f = np.fft.rfftfreq(size, 1.0 / SR)
    f[0] = 1e-3
    h = 1.0 / np.sqrt(1.0 + (hp / f) ** 8)
    if lp:
        h = h / np.sqrt(1.0 + (f / lp) ** 8)
    return np.fft.irfft(np.fft.rfft(x, size, axis=0) * h[:, None], size, axis=0)[:n]


def speaker_loss(x, kind):
    """Loudness (dB, usually <= 0) the `kind` speaker model takes off the sound. A low
    thump that only a subwoofer can play loses 10 dB or more on 'phone'."""
    return loudness(speaker(x, kind)) - loudness(x)


def gain_for(name, x):
    trim = SOUNDS[name][3]
    return round(min(0.0, max(-40.0, TARGET_LOUDNESS - loudness(x) + trim)), 1)


def peak_time(x, coarse=0.050, fine=0.005):
    """Seconds from the file start to the sound's loudest moment: the centre of the
    loudest `fine` window inside the loudest `coarse` window. The coarse pass keeps
    noisy swells (riser, whoosh) from locking onto a random grain; the fine pass puts
    transients within a few ms of their attack."""
    power = np.mean(np.asarray(x, dtype=np.float64) ** 2, axis=1)
    cs = np.concatenate([[0.0], np.cumsum(power)])

    def loudest(w, lo, hi):
        """(start, width) of the loudest w-sample window starting in [lo, hi]."""
        w = max(1, min(w, len(power)))
        hi = max(lo, min(hi, len(power) - w))
        starts = np.arange(lo, hi + 1)
        return int(starts[np.argmax(cs[starts + w] - cs[starts])]), w

    c0, cw = loudest(_n(coarse), 0, len(power))
    f0, fw = loudest(_n(fine), c0, c0 + cw - _n(fine))
    return round((f0 + fw / 2.0) / SR, 3)


def _db(v):
    return 20.0 * math.log10(max(v, 1e-12))


def _frames(mono, frame=1024, hop=256):
    count = max(1, 1 + (len(mono) - frame) // hop)
    win = np.hanning(frame)
    freqs = np.fft.rfftfreq(frame, 1.0 / SR)
    rms, cent, times = [], [], []
    for i in range(count):
        seg = mono[i * hop:i * hop + frame]
        if len(seg) < frame:
            seg = np.concatenate([seg, np.zeros(frame - len(seg))])
        spec = np.abs(np.fft.rfft(seg * win)) ** 2
        rms.append(math.sqrt(float(np.mean(seg ** 2))))
        cent.append(float(np.sum(freqs * spec) / (np.sum(spec) + 1e-20)))
        times.append((i * hop + frame / 2) / SR)
    return np.array(times), np.array(rms), np.array(cent)


def _dominant_hz(mono, start, stop):
    seg = mono[_n(start):_n(stop)]
    size = 1 << 16
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), size))
    freqs = np.fft.rfftfreq(size, 1.0 / SR)
    spec[freqs < 60] = 0
    return float(freqs[int(np.argmax(spec))])


def _mono_loss(x, win=0.05):
    w = _n(win)
    mono = np.convolve(((x[:, 0] + x[:, 1]) / 2.0) ** 2, np.ones(w), 'valid')
    chans = np.convolve((x[:, 0] ** 2 + x[:, 1] ** 2) / 2.0, np.ones(w), 'valid')
    live = chans > np.max(chans) * 1e-3               # ignore the near-silent tail
    if not np.any(live):                              # digital silence
        return 0.0
    return 10.0 * math.log10(float(np.min(mono[live] / chans[live])) + 1e-12)


def _corr(a, b):
    """Pearson correlation that stays defined for a silent / constant channel."""
    if np.std(a) == 0.0 or np.std(b) == 0.0:
        return 1.0 if np.array_equal(a, b) else 0.0
    return float(np.corrcoef(a, b)[0, 1])


def analyze(name, x):
    """Numbers used to check each sound against its intent. x: float stereo (n >= 1, 2)."""
    mono = x.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono)) ** 2
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    times, frms, fcent = _frames(mono, 512, 128) if len(mono) < 8192 else _frames(mono)
    top = float(np.max(frms))
    active = frms > top * 0.1                         # within 20 dB of the loudest frame
    if not np.any(active):                            # digital silence
        active = np.ones_like(active)
    above = np.nonzero(frms > top * 10 ** (-30 / 20))[0]
    info = {
        'dur': len(x) / SR,
        'peak_db': _db(float(np.max(np.abs(x)))),
        'rms_db': _db(math.sqrt(float(np.mean(x ** 2)))),
        'active_rms_db': _db(math.sqrt(float(np.mean(frms[active] ** 2)))),
        'centroid': float(np.sum(freqs * spec) / (np.sum(spec) + 1e-20)),
        'loud': loudness(x),
        't_peak': peak_time(x),
        't_30db': float(times[above[-1]]) if len(above) else 0.0,
        'dc': float(np.max(np.abs(x.mean(axis=0)))),
        'edge': float(max(np.max(np.abs(x[0])), np.max(np.abs(x[-1])))),
        'lr_corr': _corr(x[:, 0], x[:, 1]),
        # worst 50 ms mono-downmix loss vs the stereo channels (-3 dB = decorrelated; lower = cancelling)
        'mono_db': _mono_loss(x),
        # R-L level (dB) of the whole file: 0 = centred image
        'balance': _db(math.sqrt(float(np.mean(x[:, 1] ** 2)))) - _db(math.sqrt(float(np.mean(x[:, 0] ** 2)))),
        'laptop': speaker_loss(x, 'laptop'),
        'phone': speaker_loss(x, 'phone'),
    }
    notes = []
    if name in ('whoosh', 'whoosh-soft', 'swipe', 'riser') and top > 0.0:
        idx_act = np.nonzero(active)[0]
        a0, a1 = idx_act[0], idx_act[-1]
        pk = int(np.argmax(frms))
        notes.append(f'centroid {fcent[a0 + (a1 - a0) // 10]:.0f}->{fcent[pk]:.0f}->{fcent[a1 - (a1 - a0) // 10]:.0f} Hz')
        third = len(x) // 3
        bal = lambda seg: _db(math.sqrt(float(np.mean(seg[:, 1] ** 2)))) - _db(math.sqrt(float(np.mean(seg[:, 0] ** 2))))
        notes.append(f'R-L {bal(x[:third]):+.1f}/{bal(x[-third:]):+.1f} dB')
    if name in ('pop', 'pop-soft'):
        notes.append(f'pitch {_dominant_hz(mono, 0.0, 0.012):.0f}->{_dominant_hz(mono, 0.04, 0.09):.0f} Hz')
    if name == 'success':
        notes.append('notes ' + '/'.join(f'{_dominant_hz(mono, s, s + 0.08):.0f}' for s in (0.005, 0.095, 0.185)) + ' Hz')
    if name == 'chime':
        notes.append(f'fundamental {_dominant_hz(mono, 0.2, 0.8):.0f} Hz')
    if name == 'impact':
        notes.append(f'energy >150 Hz {100.0 * float(np.sum(spec[freqs > 150]) / np.sum(spec)):.0f}%')
    info['notes'] = ', '.join(notes)
    return info


def print_table(rows):
    head = (f"{'sound':<12} {'dur s':>6} {'peak':>6} {'rms':>6} {'actRMS':>7} {'centroid':>8} "
            f"{'L200':>6} {'gain':>6} {'t_pk':>5} {'t-30':>5} {'LRcor':>5} {'mono':>5} {'R-L':>5} "
            f"{'lap':>5} {'phone':>5}  notes")
    _say(head)
    _say('-' * len(head))
    for name, info, gain in rows:
        _say(f"{name:<12} {info['dur']:>6.3f} {info['peak_db']:>6.1f} {info['rms_db']:>6.1f} "
             f"{info['active_rms_db']:>7.1f} {info['centroid']:>8.0f} {info['loud']:>6.1f} "
             f"{gain:>6.1f} {info['t_peak']:>5.3f} {info['t_30db']:>5.2f} {info['lr_corr']:>5.2f} {info['mono_db']:>5.1f} "
             f"{info['balance']:>+5.1f} {info['laptop']:>5.1f} {info['phone']:>5.1f}  {info['notes']}")
    _say('(peak/rms dBFS; centroid Hz; L200 = K-weighted 200 ms max loudness of the file; '
         'gain = manifest gain_db; t_pk = manifest peak_time (loudest moment); t-30 = last frame within 30 dB of the loudest; '
         'LRcor = L/R correlation, 1 = mono; mono = worst 50 ms mono-downmix loss in dB, '
         '-3 = decorrelated, much lower = phase cancellation; R-L = stereo balance in dB, 0 = centred; '
         'lap / phone = loudness lost through a laptop (HP 180 Hz) / phone (HP 450 Hz) speaker model, dB)')


def analyze_dir(out_dir):
    """Measure every manifest entry already in out_dir (custom ones too) without
    regenerating anything. Entries that cannot be measured are skipped with a warning.
    Returns rows for print_table()."""
    out_dir = Path(out_dir)
    mpath = out_dir / 'manifest.json'
    if not mpath.is_file():
        raise SfxError(f'No manifest.json in {out_dir}')
    try:
        manifest = json.loads(mpath.read_text(encoding='utf-8-sig'))
    except (ValueError, OSError) as e:          # JSONDecodeError / UnicodeDecodeError are ValueErrors
        raise SfxError(f'{mpath} is not valid JSON: {e}') from e
    if not isinstance(manifest, dict):
        raise SfxError(f'{mpath}: expected a JSON object {{"<name>": {{"file": ...}}}}')
    rows = []
    for name, entry in manifest.items():
        if not isinstance(entry, dict):
            _warn(f'{name}: manifest entry is not an object, skipped')
            continue
        path = out_dir / str(entry.get('file', f'{name}.wav'))
        if not path.is_file():
            _warn(f'{name}: {path.name} not found, skipped')
            continue
        try:
            x, rate = read_wav(path)
        except (wave.Error, ValueError, EOFError, OSError) as e:
            _warn(f'{name}: cannot read {path.name} ({e}), skipped')
            continue
        if not len(x):
            _warn(f'{name}: {path.name} has no audio, skipped')
            continue
        if rate != SR or x.shape[1] != 2:
            _warn(f'{name}: {path.name} is {rate} Hz / {x.shape[1]} ch, not the library format '
                  f'({SR} Hz stereo); measured as stereo at {SR} Hz')
        try:
            gain = float(entry.get('gain_db', 0.0))
        except (TypeError, ValueError):
            gain = float('nan')
        info = analyze(name, _as_stereo(x))
        info['dur'] = len(x) / rate
        rows.append((name, info, gain))
    return rows


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def _write_json(path, obj):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(obj, indent=2) + '\n')


def _read_manifest(mpath):
    """The existing manifest.json as a dict ({} when there is none). Accepts a UTF-8 BOM
    (Windows PowerShell 5.1's Set-Content / Out-File -Encoding utf8 writes one). A file
    that is not a JSON object is copied to manifest.json.bak, so hand-added entries can
    be restored, and treated as empty."""
    if not mpath.exists():
        return {}
    try:
        data = json.loads(mpath.read_text(encoding='utf-8-sig'))
        problem = None if isinstance(data, dict) else 'not a JSON object'
    except (ValueError, OSError) as e:          # JSONDecodeError / UnicodeDecodeError are ValueErrors
        data, problem = None, str(e)
    if problem is None:
        return data
    bak = mpath.with_name(mpath.name + '.bak')
    try:
        shutil.copyfile(mpath, bak)
        saved = f'saved a copy as {bak.name}; '
    except OSError:
        saved = ''
    _warn(f'{mpath} is not a valid manifest ({problem}); {saved}rewriting it')
    return {}


def _builtin_entry_ok(v):
    """True for a manifest entry a consumer can use as-is (file name + numeric gain)."""
    return (isinstance(v, dict) and isinstance(v.get('file'), str) and bool(v['file'])
            and isinstance(v.get('gain_db'), (int, float)))


def _entry(name, x):
    """Manifest entry for built-in sound `name`, measured from its samples on disk."""
    return {'file': f'{name}.wav', 'duration': round(len(x) / SR, 4),
            'gain_db': gain_for(name, x), 'use': SOUNDS[name][4], 'peak_time': peak_time(x)}


def build_preview(out_dir, manifest):
    """_preview.wav: every sound in manifest order at its gain_db (relative balance
    preserved, whole file normalized to PEAK_DBFS), separated by PREVIEW_GAP."""
    gap = np.zeros((_n(PREVIEW_GAP), 2))
    parts = [np.zeros((_n(0.25), 2))]
    for name, entry in manifest.items():
        x, _ = read_wav(Path(out_dir) / entry['file'])
        parts += [_as_stereo(x) * 10.0 ** (entry['gain_db'] / 20.0), gap]
    audio = np.concatenate(parts)
    audio *= 10.0 ** (PEAK_DBFS / 20.0) / np.max(np.abs(audio))
    write_wav(Path(out_dir) / '_preview.wav', audio)


def build(out_dir=DEFAULT_OUT, names=None, preview=True, verbose=True):
    """Render `names` (None = all) into out_dir and write/merge manifest.json.
    Returns (manifest, analysis_rows). Raises SfxError, before writing anything, for an
    empty or unknown name list or an out_dir that cannot be a directory."""
    out_dir = Path(out_dir)
    names = list(SOUNDS) if names is None else list(dict.fromkeys(names))   # de-duplicated, order kept
    if not names:
        raise SfxError(f"no sound names given (have: {', '.join(SOUNDS)})")
    unknown = [nm for nm in names if nm not in SOUNDS]
    if unknown:
        raise SfxError(f"unknown sound(s): {', '.join(unknown)} (have: {', '.join(SOUNDS)})")
    if out_dir.exists() and not out_dir.is_dir():
        raise SfxError(f'output path {out_dir} exists and is not a directory')
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise SfxError(f'cannot create output directory {out_dir}: {e}') from e

    mpath = out_dir / 'manifest.json'
    old = _read_manifest(mpath)
    full = set(names) == set(SOUNDS)
    if full:
        # full rebuild: every built-in entry is regenerated; keep only hand-added custom
        # sounds whose file is still there
        old = {nm: v for nm, v in old.items()
               if nm not in SOUNDS and isinstance(v, dict) and isinstance(v.get('file'), str)
               and v['file'] and (out_dir / v['file']).is_file()}
        if old and verbose:
            _say(f"[keep] custom manifest entries: {', '.join(old)}")
    rows = []
    for name in names:
        write_wav(out_dir / f'{name}.wav', synthesize(name))
        x, _ = read_wav(out_dir / f'{name}.wav')     # measure what was actually written
        old[name] = _entry(name, x)
        rows.append((name, x, old[name]['gain_db']))
        if verbose:
            _say(f'[ok] {name + ".wav":<16} {len(x) / SR:.3f}s  gain_db {old[name]["gain_db"]:+.1f}  '
                 f'peak_time {old[name]["peak_time"]:.3f}s')
    if not full:
        # partial rebuild: the other built-in entries are kept as they are; any that are
        # missing or broken (first --only run into a fresh dir, an unreadable manifest)
        # are re-measured from their WAV on disk, or left out when there is none
        recovered = []
        for nm in SOUNDS:
            if nm in names or _builtin_entry_ok(old.get(nm)):
                continue
            old.pop(nm, None)
            path = out_dir / f'{nm}.wav'
            if not path.is_file():
                continue
            try:
                x, _ = read_wav(path)
            except (wave.Error, ValueError, EOFError, OSError) as e:
                _warn(f'{path.name}: cannot read it ({e}); left out of the manifest')
                continue
            if len(x):
                old[nm] = _entry(nm, _as_stereo(x))
                recovered.append(nm)
        if recovered and verbose:
            _say(f"[ok] re-measured from disk: {', '.join(recovered)}")
    manifest = {nm: old[nm] for nm in SOUNDS if nm in old}
    manifest.update({nm: v for nm, v in old.items() if nm not in manifest})   # keep foreign entries
    _write_json(mpath, manifest)
    if verbose:
        _say(f'[ok] {mpath}')
    # (re)build the audition file whenever the whole built-in set is on disk, so a
    # --only rebuild of one sound does not leave a stale preview behind
    if preview and all(nm in manifest and (out_dir / manifest[nm]['file']).is_file() for nm in SOUNDS):
        try:
            build_preview(out_dir, {nm: manifest[nm] for nm in SOUNDS})
        except (wave.Error, ValueError, EOFError) as e:
            _warn(f'_preview.wav not rebuilt: {e}')
        else:
            if verbose:
                _say(f"[ok] {out_dir / '_preview.wav'}")
    return manifest, rows


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            # a piped cp1252 console must not kill the run over a non-ASCII path
            stream.reconfigure(errors='backslashreplace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=str(DEFAULT_OUT), help='Output directory (default: assets/sfx next to this script)')
    ap.add_argument('--only', help='Comma-separated subset of sounds to rebuild')
    ap.add_argument('--no-preview', action='store_true', help='Skip _preview.wav')
    ap.add_argument('--analyze', action='store_true', help='Print the measurement table after building')
    ap.add_argument('--analyze-only', action='store_true', help='Measure existing files in --out without regenerating')
    ap.add_argument('--list', action='store_true', help='List sounds and their intended use')
    args = ap.parse_args()

    if args.list:
        for name, spec in SOUNDS.items():
            _say(f'{name:<12} {spec[1]:.2f}s  {spec[4]}')
        return

    out_dir = Path(args.out)
    if args.analyze_only:
        try:
            print_table(analyze_dir(out_dir))
        except SfxError as e:
            sys.exit(str(e))
        return

    names = None
    if args.only is not None:
        names = [s.strip() for s in args.only.split(',') if s.strip()]
        if not names:
            sys.exit(f"--only needs at least one sound name (have: {', '.join(SOUNDS)})")
    try:
        _manifest, rows = build(out_dir, names, preview=not args.no_preview)
    except SfxError as e:
        sys.exit(str(e))
    except OSError as e:                              # e.g. a WAV locked by a media player
        sys.exit(f'cannot write to {out_dir}: {e}')
    if args.analyze:
        _say('')
        print_table([(name, analyze(name, x), gain) for name, x, gain in rows])


if __name__ == '__main__':
    main()
