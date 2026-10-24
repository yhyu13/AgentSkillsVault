// SOUNDCHECK TESTS. Each fault the scorecard exists to catch, built on purpose in code (a hole, a
// dead tail, a late start, a decorrelated pair, a rumble-heavy mix, a crowded body, a quiet master, a cut
// ending), and each must show up in its own metric, with a fix that names the time or the band.
import { analyze, evaluate, startHere, visualEvents, visualSync, buildProfile, profileFrom, grade, DEFAULT_PROFILE } from "../src/canvas-core/music/soundcheck";
import { loudness } from "../src/canvas-core/music/meter";

export const name = "soundcheck";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000;
  // mulberry32, never a plain LCG: an LCG's interleaved left/right outputs are correlated per band and fake a near -1 low-band correlation
  let seed = 9; const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; };
  /** A plucked chord every 0.25 s over a soft pad: music-like, steady, correlated (the same in both ears). */
  const music = (secs: number, { from = 0, to = secs, amp = 0.2 } = {}) => {
    const n = Math.round(secs * sr), L = new Float32Array(n), R = new Float32Array(n);
    for (let i = Math.round(from * sr); i < Math.min(n, Math.round(to * sr)); i++) {
      const t = i / sr, ph = t % 0.25, env = Math.exp(-ph * 10);
      const v = amp * (0.5 * Math.sin(2 * Math.PI * 330 * t) + 0.3 * Math.sin(2 * Math.PI * 495 * t) * env + 0.3 * Math.sin(2 * Math.PI * 1320 * t) * env + 0.15 * Math.sin(2 * Math.PI * 110 * t) + 0.05 * rnd());
      L[i] = v; R[i] = v;
    }
    return [L, R] as [Float32Array, Float32Array];
  };
  const at = (L: Float32Array, R: Float32Array, opts?: { allow?: [number, number][] }) => analyze(L, R, sr, opts).measures;
  const row = (m: ReturnType<typeof at>, k: string) => evaluate(m).find((r) => r.key === k)!;

  // a clean, steady, centred mix: no holes, no tail, sound from frame 0, nothing lost in mono
  const clean = at(...music(6));
  ok(clean.firstSound === 0 && clean.insideGap === 0 && clean.endSilence < 0.06, `clean mix: first sound ${clean.firstSound} s, longest hole ${clean.insideGap} s, end silence ${clean.endSilence.toFixed(2)} s`);
  ok(Math.abs(clean.monoLoss) < 0.1 && clean.bodyCorr > 0.99 && clean.corr > 0.99, `identical channels fold to mono with ${clean.monoLoss.toFixed(2)} dB extra loss, 150-2k correlation ${clean.bodyCorr.toFixed(2)}`);
  ok(["insideGap", "endSilence", "firstSound", "bodyCorr", "monoLoss", "rumble"].every((k) => row(clean, k).status === "PASS"), "clean mix passes the shape, stereo and rumble checks");

  // the loudness number agrees with the meter, and a -27 LUFS master fails with the gain it needs
  const [qL, qR] = music(6, { amp: 0.02 }), q = at(qL, qR), ref = loudness([qL, qR], sr).integrated;
  ok(Math.abs(q.lufs - ref) < 1e-9, `integrated loudness is meter.ts's own (${q.lufs.toFixed(2)} LUFS)`);
  ok(row(q, "lufs").status === "FAIL" && /LU under the web target/.test(row(q, "lufs").fix ?? ""), `a ${q.lufs.toFixed(1)} LUFS master fails: "${row(q, "lufs").fix?.slice(0, 60)}..."`);
  const gain = Math.pow(10, (-14 - ref) / 20), [tL, tR] = [qL.map((x) => x * gain), qR.map((x) => x * gain)], tgt = at(tL, tR);
  ok(Math.abs(tgt.lufs + 14) < 0.05 && row(tgt, "lufs").status === "PASS", `mastered to ${tgt.lufs.toFixed(2)} LUFS: PASS`);

  // a 1 s hole at 2.0 s: caught, timed, and its fix names the time; --allow over it clears it
  const [hL, hR] = music(6); for (let i = 2 * sr; i < 3 * sr; i++) { hL[i] = 0; hR[i] = 0; }
  const hole = at(hL, hR);
  ok(Math.abs(hole.insideGap - 1) <= 0.06 && Math.abs((hole.insideGapAt ?? 0) - 2) <= 0.06, `a 1 s hole at 2.0 s reads ${hole.insideGap.toFixed(2)} s at ${hole.insideGapAt?.toFixed(2)} s`);
  const hf = startHere(evaluate(hole)).find((r) => r.key === "insideGap");
  ok(row(hole, "insideGap").status === "FAIL" && /1\.0 s hole at 0:02\.0/.test(hf?.fix ?? ""), `the fix says where: "${hf?.fix?.slice(0, 40)}..."`);
  ok(!startHere(evaluate(hole)).some((r) => r.key === "arcDip"), "the arc dip inside that hole is the same fault: one fix, not two");
  ok(at(hL, hR, { allow: [[1.9, 3.1]] }).insideGap === 0, "a declared held breath (--allow 1.9:3.1) is not a hole");
  const [sL, sR] = music(6); for (let i = 2 * sr; i < 2.15 * sr; i++) { sL[i] = 0; sR[i] = 0; }
  ok(row(at(sL, sR), "insideGap").status === "PASS", `a 0.15 s breath is not a hole (${at(sL, sR).insideGap.toFixed(2)} s)`);

  // a dead tail and a late start
  const tail = at(...music(6, { to: 3 }));
  ok(Math.abs(tail.endSilence - 3) <= 0.06 && row(tail, "endSilence").status === "FAIL" && /from 0:03\.0/.test(row(tail, "endSilence").fix ?? ""), `3 s of dead tail: ${tail.endSilence.toFixed(2)} s from ${tail.endSilenceFrom.toFixed(2)} s, FAIL`);
  const late = at(...music(6, { from: 1.5 }));
  ok(Math.abs((late.firstSound ?? 0) - 1.5) <= 0.06 && row(late, "firstSound").status === "FAIL", `sound starting at 1.5 s: first sound ${late.firstSound} s, FAIL`);

  // a cut ending against a faded one
  const cut = at(...music(4));
  const [fL, fR] = music(4); for (let i = 3.5 * sr; i < 4 * sr; i++) { const g = Math.max(0, 1 - (i - 3.5 * sr) / (0.45 * sr)); fL[i] *= g; fR[i] *= g; }
  ok(row(cut, "tailLu").status === "FAIL" && row(at(fL, fR), "tailLu").status === "PASS", `a film that stops mid-note fails the tail (${cut.tailLu.toFixed(1)} LU); faded, it passes`);

  // a decorrelated pair: independent noise in each ear
  const n = 4 * sr, dL = new Float32Array(n), dR = new Float32Array(n); for (let i = 0; i < n; i++) { dL[i] = 0.1 * rnd(); dR[i] = 0.1 * rnd(); }
  const dec = at(dL, dR), df = startHere(evaluate(dec));
  ok(Math.abs(dec.bodyCorr) < 0.1 && Math.abs(dec.monoLoss - 3) < 0.3, `decorrelated pair: 150-2k correlation ${dec.bodyCorr.toFixed(2)}, mono loses ${dec.monoLoss.toFixed(2)} dB past the expected 3`);
  ok(row(dec, "bodyCorr").status === "FAIL" && row(dec, "monoLoss").status === "FAIL" && df.filter((r) => ["bodyCorr", "monoLoss", "corr", "sideMid"].includes(r.key)).length === 1 && /below 2 kHz/.test(df.find((r) => r.key === "bodyCorr")?.fix ?? ""), "it fails, and the four stereo numbers make one fix: narrow the width below 2 kHz");
  // decorrelated only in the body: a 600 Hz tone a quarter-turn apart, a centred 5 kHz tone
  const bL = new Float32Array(n), bR = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr, c = 0.1 * Math.sin(2 * Math.PI * 5000 * t); bL[i] = 0.2 * Math.sin(2 * Math.PI * 600 * t) + c; bR[i] = 0.2 * Math.cos(2 * Math.PI * 600 * t) + c; }
  const body = at(bL, bR);
  ok(Math.abs(body.bodyCorr) < 0.1 && body.bandCorr.sparkle > 0.95, `body-only decorrelation is seen per band (150-2k ${body.bodyCorr.toFixed(2)}, sparkle ${body.bandCorr.sparkle.toFixed(2)})`);

  // a rumble-heavy mix and a crowded body, each with a band-specific fix
  const [uL, uR] = music(4, { amp: 0.05 }); for (let i = 0; i < uL.length; i++) { const v = 0.4 * Math.sin(2 * Math.PI * 40 * (i / sr)); uL[i] += v; uR[i] += v; }
  const sub = at(uL, uR);
  ok(sub.bands.rumble > -3 && row(sub, "rumble").status === "FAIL" && /under 40 Hz/.test(row(sub, "rumble").fix ?? ""), `rumble-heavy: ${sub.bands.rumble.toFixed(1)} dB of the energy under 80 Hz, FAIL, "roll off under 40 Hz"`);
  ok(clean.bands.rumble < -20, `the clean mix keeps ${clean.bands.rumble.toFixed(1)} dB under 80 Hz`);
  const [xL, xR] = music(4, { amp: 0.03 }); for (let i = 0; i < xL.length; i++) { const v = 0.3 * Math.sin(2 * Math.PI * 630 * (i / sr)); xL[i] += v; xR[i] += v; }
  const box = at(xL, xR);
  ok(row(box, "body").status === "FAIL" && box.peakHz.body === 630 && /630 Hz/.test(row(box, "body").fix ?? ""), `crowded body: ${box.bands.body.toFixed(1)} dB, strongest third-octave ${box.peakHz.body} Hz named in the fix`);

  // a held breath: a steady bed that dips 15 dB for 0.4 s and snaps back
  const [pL, pR] = music(6); for (let i = 3 * sr; i < 3.4 * sr; i++) { pL[i] *= 0.18; pR[i] *= 0.18; }
  const sd = at(pL, pR);
  ok(sd.heldBreaths.length === 1 && Math.abs(sd.heldBreaths[0].at - 3) < 0.1, `a 0.4 s, 15 dB dip reads as one held breath at ${sd.heldBreaths[0]?.at.toFixed(2)} s`);

  // the profile: ranges grade PASS / WARN / FAIL, and a built profile moves taste ranges but never the delivery limits
  ok(grade(-14, { min: -16, max: -13, tol: 1 }) === "PASS" && grade(-16.5, { min: -16, max: -13, tol: 1 }) === "WARN" && grade(-18, { min: -16, max: -13, tol: 1 }) === "FAIL" && grade(5, undefined) === "INFO", "grade: inside PASS, within tolerance WARN, beyond FAIL, no range INFO");
  const built = buildProfile("test", [{ file: "a", measures: clean }, { file: "b", measures: tgt }]), prof = profileFrom(built);
  ok(built.metrics.lufs.min <= built.metrics.lufs.median && built.metrics.lufs.median <= built.metrics.lufs.max && built.from.length === 2, `built profile: lufs ${built.metrics.lufs.min}..${built.metrics.lufs.max}, median ${built.metrics.lufs.median}`);
  ok(JSON.stringify(prof.ranges.endSilence) === JSON.stringify(DEFAULT_PROFILE.ranges.endSilence) && prof.ranges.lufs.min !== DEFAULT_PROFILE.ranges.lufs.min && prof.ranges.sparkle !== undefined, "a built profile sets the taste ranges (loudness, bands) and keeps the hard ones (end silence)");

  // picture against sound
  const changed = Array.from({ length: 300 }, (_, i) => (i === 30 || i === 120 || i === 210 ? 0.5 : 0.01));
  const ev = visualEvents(changed, 30);
  ok(ev.length === 3 && Math.abs(ev[0] - 1) < 1e-9, `three cuts in a slow-changing picture read as events at ${ev.map((e) => e.toFixed(2)).join(", ")} s`);
  const vs = visualSync([1, 4, 7], [1.03, 5.5, 6.95], 10);
  ok(Math.abs(vs.share - 2 / 3) < 1e-9 && vs.unanswered.length === 1 && vs.unanswered[0] === 4 && vs.medianOffsetMs === -10, `2 of 3 events have an onset within 100 ms (+30 and -50 ms, median ${vs.medianOffsetMs}); the one at 4 s has none`);
  ok(Number.isFinite(vs.chance) && vs.chance <= 2 / 3, `chance baseline from shifted events: ${Math.round(vs.chance * 100)} %`);

  // silence: everything fails cleanly, never NaN-passes
  const z = at(new Float32Array(sr * 2), new Float32Array(sr * 2)), zr = evaluate(z);
  ok(z.silent && zr.find((r) => r.key === "lufs")!.status === "FAIL" && zr.every((r) => r.status !== "PASS" || r.value !== null), "a silent file fails loudness and passes nothing it could not measure");
};
