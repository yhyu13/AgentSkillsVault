import { mixSfx, filmSfx, sfxHarshness, type PlacedCue, type SfxPlan, type SfxHarshOptions } from "../src/canvas-core/music/sfxMix";
import { frozenPlans } from "./sfxFrozenPlans";
import { survey } from "./sfxKitSurvey";
const cryptoModule = "node:crypto", { createHash } = await import(cryptoModule);
const hash = (L: Float32Array, R: Float32Array) => createHash("sha256").update(new Uint8Array(L.buffer)).update(new Uint8Array(R.buffer)).digest("hex");
export const name = "sfx harshness";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000, n = sr * 2;
  const music: [Float32Array, Float32Array] = [Float32Array.from({ length: n }, (_, i) => 0.04 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.006 * Math.sin(2 * Math.PI * 4000 * i / sr)), new Float32Array(n)];
  music[1].set(music[0]);
  const synth = (f: number): PlacedCue => {
    const L = Float32Array.from({ length: sr / 4 }, (_, i) => i < sr * 0.02 ? 0.5 * Math.sin(2 * Math.PI * f * i / sr) : 0), R = L.slice();
    return { i: 0, cue: { frame: 15, kind: "tick", label: `${f} Hz` }, sound: { L, R, sr, kind: "tick", variant: "ui", seed: 1, hit: 0, window: [0, sr * 0.02], lufs: 0 }, hitS: 0.5, snappedFromS: 0.5, start: sr / 2, window: [sr / 2, sr * 0.52] };
  };
  const piercing = synth(4000), dull = synth(100), before = hash(piercing.sound.L, piercing.sound.R);
  const high = sfxHarshness([piercing], music, sr, {})[0], low = sfxHarshness([dull], music, sr, {})[0];
  ok(!high.ok && high.violations?.some((v) => v.metric === "liftDb"), "a loud 4 kHz burst exceeds the default lift cap");
  ok(low.ok && Math.abs(low.cueRmsDb - high.cueRmsDb) < 1e-6, "a 100 Hz thump at the same RMS passes");
  ok(high.peakDb > high.bodyDb + 10 && high.crestDb === high.peakDb - high.bodyDb, "a short peak with little following body has a large peak-body gap");
  ok(hash(piercing.sound.L, piercing.sound.R) === before, "measurement never changes the cue samples");
  const silence: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)], silent = sfxHarshness([piercing], silence, sr, {})[0];
  ok(silent.liftDb === null && silent.peakMarginDb === null && silent.violations.every((v) => v.metric !== "liftDb"), "silence-relative fields are null and lift is skipped");
  const click = synth(4000); click.sound.L.fill(0); click.sound.R.fill(0); click.sound.L[0] = click.sound.R[0] = 0.5;
  const impulse = sfxHarshness([click], silence, sr, {})[0];
  ok(impulse.bodyDb === -200 && impulse.peakAtS === 0.5 && Math.abs(impulse.peakDb + 6.020599913) < 1e-8, "body starts after the first peak: a single sample has no body");
  const tail = synth(4000); tail.sound.L.fill(0); tail.sound.R.fill(0); tail.sound.L[0] = tail.sound.R[0] = 0.5;
  tail.sound.L.fill(0.1, 1, 1 + sr * 0.15); tail.sound.R.set(tail.sound.L);
  const body = sfxHarshness([tail], silence, sr, {})[0];
  ok(Math.abs(body.bodyDb + 20) < 1e-6, "the 150 ms body uses stereo mean-power RMS without a +3 dB boost");
  const plan: SfxPlan = { fps: 30, frames: 60, cues: [{ frame: 15, kind: "tick", variant: "ui", label: "piercing key" }] };
  const report = mixSfx(music, plan, sr), cap = report.harshness[0].peakDb - 3, options: SfxHarshOptions = { maxPeakDb: cap, maxTiltDb: 0, maxLiftDb: 100 };
  const explicit = mixSfx(music, { ...plan, harsh: { ...options, mode: "report" } }, sr);
  ok(hash(report.L, report.R) === hash(explicit.L, explicit.R) && explicit.ok && !explicit.harshness[0].ok, "report flags a peak breach and keeps samples and audibility verdict unchanged");
  let message = "";
  try { mixSfx(music, { ...plan, harsh: { ...options, mode: "throw" } }, sr); } catch (e) { message = (e as Error).message; }
  ok(/piercing key/.test(message) && /peakDb/.test(message) && /cap/.test(message), `throw names the cue, metric, measured value and cap: ${message.replace(/\n/g, " ")}`);
  const tame = mixSfx(music, { ...plan, harsh: { ...options, mode: "tame" } }, sr), tameAgain = mixSfx(music, { ...plan, harsh: { ...options, mode: "tame" } }, sr);
  ok(tame.harshness[0].ok && tame.harshness[0].peakDb <= cap && tame.ok && tame.harshness[0].reductionDb >= 3, "tame lowers the peak under the cap and keeps the cue audible");
  ok(hash(tame.L, tame.R) === hash(tameAgain.L, tameAgain.R) && plan.cues[0].gainDb === undefined, "tame is deterministic and leaves the caller's plan alone");
  const liftCap = report.harshness[0].liftDb! - 2, lifted = mixSfx(music, { ...plan, harsh: { mode: "tame", maxLiftDb: liftCap, maxTiltDb: 0 } }, sr);
  ok(lifted.harshness[0].ok && lifted.harshness[0].liftDb! <= liftCap && lifted.ok, "tame lowers a lift breach under the cap while audible");
  const conflict = mixSfx(music, { ...plan, harsh: { ...options, mode: "tame", maxPeakDb: cap - 60 } }, sr);
  ok(!conflict.harshness[0].ok && conflict.harshness[0].conflict === "audibility floor" && conflict.ok && conflict.audibility[0].marginDb >= conflict.audibility[0].minDb, "an impossible cap reports an audibility conflict and stays audible");
  const tiltCap = report.harshness[0].tiltDb - 1, tilt = mixSfx(music, { ...plan, harsh: { mode: "tame", maxTiltDb: tiltCap, maxPeakDb: cap } }, sr);
  ok(hash(tilt.L, tilt.R) === hash(report.L, report.R) && tilt.harshness[0].conflict === "tilt cannot be fixed by gain" && tilt.harshness[0].reductionDb === 0, "a tilt breach leaves the cue unchanged and explains that gain cannot fix it");
  message = ""; try { mixSfx(null, { ...plan, harsh: { mode: "throw", maxTiltDb: tiltCap } }, sr); } catch (e) { message = (e as Error).message; }
  ok(/tiltDb/.test(message) && /piercing key/.test(message), "throw still rejects a tilt breach over silence");
  const override = mixSfx(music, { ...plan, harsh: { ...options, mode: "throw" }, cues: [{ ...plan.cues[0], harsh: { maxPeakDb: 0 } }] }, sr);
  ok(override.harshness[0].ok, "a per-cue cap overrides the plan cap");
  const floor = mixSfx(music, { ...plan, harsh: { ...options, mode: "tame", maxPeakDb: cap - 60 }, cues: [{ ...plan.cues[0], minDb: 0 }] }, sr);
  ok(floor.ok && floor.audibility[0].marginDb >= 0, "tame respects the per-cue audibility floor");
  const buriedPlan: SfxPlan = { ...plan, cues: [{ ...plan.cues[0], gainDb: -40 }], harsh: { mode: "tame", maxPeakDb: -100 } }, buried = mixSfx(music, buriedPlan, sr);
  ok(!buried.ok && buried.harshness[0].conflict === "audibility floor" && buried.harshness[0].reductionDb === 0, "tame never lowers an already buried cue");
  const overSilence = mixSfx(null, { ...plan, harsh: { ...options, mode: "tame" } }, sr);
  ok(overSilence.ok && overSilence.harshness[0].ok && overSilence.harshness[0].liftDb === null, "over silence, tame still enforces the absolute peak cap");
  for (const harsh of [{ mode: "unknown" }, { maxLiftDb: NaN }, { maxTiltDb: Infinity }, { maxPeakDb: "hot" }]) {
    message = ""; try { mixSfx(null, { ...plan, harsh: harsh as SfxHarshOptions }, sr); } catch (e) { message = (e as Error).message; }
    ok(/harsh\./.test(message), `invalid harsh option rejected: ${JSON.stringify(harsh)}`);
  }
  // Plan 2's hash covers the impact boom's shorter low tail (0.38 s decay).
  // Captured from production sources at c1beddfe4264a34d12531dbe931acef611fb0a02,
  // loaded by git show and bundled with these fixtures before the mixer was edited.
  const hashes = ["5db7c646b1e61b0016c5dd8a114e875f6cedbaed17f6b702a225ba2dcc187a85", "3064c924f76acb857c509a5c294cf043380451d544fda0b5372ce06d33ef133a", "f2fb798441ecf453b18de3ee2c849810e6fd56f4eaa14fd2002600985fb189f6"];
  const frozen = frozenPlans(sr);
  // the old peak-only master stays bit-identical when asked for; the loudness master is tested in delivery.test.ts
  frozen.plans.forEach((p0, i) => { const p = { ...p0, master: "none" as const }, m = mixSfx(frozen.music, p, sr), f = filmSfx(() => frozen.music, p)(sr);
    ok(hash(m.L, m.R) === hashes[i] && hash(...f) === hashes[i], `launch cue plan ${i}: mixSfx and filmSfx match base SHA-256 ${hashes[i]}`);
  });
  for (const row of survey()) ok(row.ok, `${row.kind}:${row.variant} over ${row.context}: default gain passes the measured default caps`);
};
