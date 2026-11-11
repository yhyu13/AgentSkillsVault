// LAUNCH SOUND. The picture's own math, heard. A launch template film knows, frame by frame, when a
// key is struck, when Generate goes down, when the ink drop lifts and blooms, when a card lands on its
// spring, and where on screen each happens; these are its sound cues, computed from the same timing
// that draws the picture, never laid on a grid by hand. The kit is music/sfx (placeSfx, sfxDuck,
// sfxAudibility); this adds what a film needs on top of it: each cue PANNED to where it happens on
// screen, and the audibility guarantee made constructive: a cue measured under the score is raised
// until it is heard (at most +8 dB), then the mix is checked again and a cue still buried throws.
//
// Restraint is part of the contract (references/music/sound-design.md): the template emits one riser
// and one impact, at the big reveal only, and nothing at all on its other cuts.
import { placeSfx, sfxDuck, sfxAudibility, type SfxCue, type SfxPlan, type SfxAudibility, type PlacedCue } from "./music/sfx";
import { limiter } from "./music/render";
import { deliver, layBed, type Delivered } from "./music/delivery";
import { loudness, truePeak } from "./music/meter";
import type { FilmAudio } from "./film";

/** A cue as the template emits it: a kit cue, plus where on screen it happens (px) and what made it. */
export type LaunchCue = SfxCue & { x?: number; role: "key" | "press" | "drop" | "bloom" | "land" | "arrive" | "riser" | "impact" };
export type LaunchPlan = Omit<SfxPlan, "cues"> & { cues: LaunchCue[]; W: number; spread?: number };
/** Stereo position from screen x: -spread at the left edge, +spread at the right (default 0.6: never hard-panned). */
export const panOf = (x: number | undefined, W: number, spread = 0.6) => (x === undefined ? 0 : Math.max(-1, Math.min(1, (x / W) * 2 - 1)) * spread);
// equal-power pan of a stereo sound's middle toward p (its width, the side signal, is kept as it is)
const balance = (L: Float32Array, R: Float32Array, p: number) => {
  if (!p) return;
  const a = ((p + 1) * Math.PI) / 4, gl = Math.cos(a) * Math.SQRT2, gr = Math.sin(a) * Math.SQRT2;
  for (let i = 0; i < L.length; i++) { const m = (L[i] + R[i]) / 2, s = (L[i] - R[i]) / 2; L[i] = m * gl + s; R[i] = m * gr - s; }
};

export type LaunchMix = { L: Float32Array; R: Float32Array; placed: PlacedCue[]; audibility: SfxAudibility[]; raised: { i: number; role: string; db: number }[]; lufs: number; dbtp: number; ok: boolean; delivered?: Delivered };
/** Score (null = silent) + the film's cues, panned, ducked, every cue heard, one true-peak ceiling (-1 dBTP). */
export const mixLaunch = (music: [Float32Array, Float32Array] | null, plan: LaunchPlan, sr = 48000, maxRaise = 8): LaunchMix => {
  const n = Math.round((plan.frames / plan.fps) * sr), cues = plan.cues.map((c) => ({ ...c })), raised = new Map<number, number>();
  let placed: PlacedCue[] = [], aud: SfxAudibility[] = [], fxL = new Float32Array(n), fxR = new Float32Array(n), mL = new Float32Array(n), mR = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) {
    placed = placeSfx({ ...plan, cues }, sr);
    fxL = new Float32Array(n); fxR = new Float32Array(n);
    placed.forEach((pc) => { const c = cues[pc.i], s = pc.sound; balance(s.L, s.R, panOf(c.x, plan.W, plan.spread)); for (let i = 0; i < s.L.length && pc.start + i < n; i++) { fxL[pc.start + i] += s.L[i]; fxR[pc.start + i] += s.R[i]; } });
    const duck = sfxDuck(placed, n, sr, plan.duck);
    mL = new Float32Array(n); mR = new Float32Array(n);
    if (music) { const m = Math.min(n, music[0].length); for (let i = 0; i < m; i++) { mL[i] = music[0][i] * duck[i]; mR[i] = music[1][i] * duck[i]; } }
    aud = sfxAudibility(placed, [mL, mR], sr, plan);
    const bad = aud.filter((a) => !a.ok); if (!bad.length) break;
    let moved = false;
    for (const a of bad) { const c = cues[a.i], now = raised.get(a.i) ?? 0, up = Math.min(maxRaise - now, a.minDb - a.marginDb + 0.5); if (up > 0.05) { c.gainDb = (c.gainDb ?? 0) + up; raised.set(a.i, now + up); moved = true; } }
    if (!moved) break;
  }
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = mL[i] + fxL[i]; R[i] = mR[i] + fxR[i]; }
  // no score: the cues sit on room tone instead of dropping to silence between them (delivery.ts)
  if (!music && plan.bed !== false && placed.length) layBed(L, R, [fxL, fxR], sr, plan.cues.length * 7919 + plan.frames, plan.bed ?? 22);
  // a launch film is dense: the whole mix to -14 LUFS, then the ceiling (delivery.ts); plan.master overrides
  let delivered: Delivered | undefined;
  if ((plan.master ?? "dense") === "none") limiter(L, R, sr, Math.pow(10, -1.3 / 20)); else delivered = deliver(L, R, sr, plan.master ?? "dense", { ceilingDb: -1.3 });
  const tp0 = truePeak([L, R]).dbtp; if (tp0 > -1.05) { const g = Math.pow(10, (-1.1 - tp0) / 20); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } }
  const fade = Math.min(n, Math.round(0.015 * sr)); for (let i = 0; i < fade; i++) { const g = i / fade; L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  const lu = n >= 0.4 * sr ? loudness([L, R], sr).integrated : NaN;
  return { L, R, placed, audibility: aud, raised: [...raised].map(([i, db]) => ({ i, role: cues[i].role, db })), lufs: lu, dbtp: truePeak([L, R]).dbtp, ok: aud.every((a) => a.ok), delivered };
};
/** What a Film's audio(sampleRate) returns; throws when a cue is still buried after raising it. */
export const launchAudio = (music: FilmAudio | null, plan: LaunchPlan) => Object.assign((sr: number): [Float32Array, Float32Array] => {
  const m = mixLaunch(music ? music(sr) : null, plan, sr);
  if (!m.ok) throw new Error(`launch sound: ${m.audibility.filter((a) => !a.ok).map((a) => `cue #${a.i} ${a.kind} @ ${a.atS.toFixed(2)} s is ${a.marginDb.toFixed(1)} dB under the score even raised +8 dB`).join("; ")}: thin the score there or move the cue`);
  return [m.L, m.R];
}, { scores: music?.scores ?? [] });
