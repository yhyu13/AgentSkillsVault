import { registerBank, clearBanks, type SampleBank } from '../src/canvas-core/music/sampler';
import { calibrateBank, renderPiece } from '../src/canvas-core/music/render';
import { maskingPlan, roleBandDb } from '../src/canvas-core/music/guards';
import { perform } from '../src/canvas-core/music/perform';
import { Biquad } from '../src/canvas-core/music/dsp';
import { hz } from '../src/canvas-core/music/theory';
import { marimbaCurious } from '../src/canvas-core/music/pieces/families';
import type { Piece, Role } from '../src/canvas-core/music/plan';

export const name = 'recorded support mix';
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 24000, frames = 48000, pitches = [48, 60, 72];
  const zones = pitches.map((midi, i) => {
    const pcm = Float32Array.from({ length: frames }, (_, n) => {
      const t = n / 48000, f = hz(midi);
      return 0.2 * Math.exp(-t * 3) * (Math.sin(2 * Math.PI * f * t) + (i < 2 ? 0.8 * Math.sin(2 * Math.PI * f * 5 * t) : 0));
    });
    return { zone: { file: `${midi}.flac`, midi, layer: 1, rr: 1, frames, channels: 1, peakDb: -6, rmsDb: -18, sha256: String(i + 1).repeat(64) }, channels: [pcm] };
  });
  const bank: SampleBank = { entry: { title: 'spectral fixture', source: 'synthetic', license: 'CC0-1.0', kind: 'struck', range: [48, 72], layers: 1, damped: false, normalized: false, zones: zones.map(z => z.zone) }, zones };
  const source = marimbaCurious();
  const part = source.parts[0];
  const piece = (role: Role, mixed = false): Piece => ({ ...source, tail: 0.2,
    plan: { ...source.plan, space: undefined }, mix: { ...source.mix, eq: 0, transient: null, space: null, drumRoom: null, tilt: 0, busDrive: 0, glue: null, width: { mid: 1, high: 1, monoHz: 0, splitHz: 800 } },
    parts: [{ ...part, inst: 'marimba', role, pan: 0, gainDb: 0, notes: mixed
      ? [{ t: 0, d: 0.4, p: 48, v: 0.5, role: 'bass' }, { t: 0.5, d: 0.4, p: 72, v: 0.5, role: 'accomp' }, { t: 1, d: 0.4, p: 72, v: 0.5, role: 'accomp' }]
      : [{ t: 0, d: 0.4, p: role === 'bass' ? 48 : 60, v: 0.5, role }] }] });
  const fraction = (a: Float32Array) => {
    const x = Biquad.make(sr, 'hp', 40, Math.SQRT1_2).run(Float32Array.from(a));
    const total = x.reduce((s, v) => s + v * v, 0);
    Biquad.make(sr, 'hp', 500, Math.SQRT1_2).run(x); Biquad.make(sr, 'lp', 4000, Math.SQRT1_2).run(x);
    return 10 * Math.log10(x.reduce((s, v) => s + v * v, 0) / total);
  };
  const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
  clearBanks();
  try {
    registerBank('marimba', bank); const calibrated = calibrateBank('marimba');
    const neutral = { ...calibrated, trim: calibrated.trim!.map(t => ({ ...t, bandFractionDb: -40, bandExcessDb: 0 })) };
    const render = (role: Role) => renderPiece(piece(role), sr, { seconds: 2, master: 'none', expressive: false }).dry[0];
    registerBank('marimba', neutral); const unchanged = render('melody'), bassBefore = render('bass'), accompBefore = render('accomp');
    registerBank('marimba', calibrated); const lead = render('melody'), bass = render('bass'), accomp = render('accomp');
    ok(lead.every((v, i) => v === unchanged[i]), 'recorded melody keeps every sample when support EQ measurements change');
    ok(fraction(bass) < fraction(bassBefore) - 2 && fraction(accomp) < fraction(accompBefore) - 1, 'load-measured recorded bass and accompaniment lose masking-band energy');
    ok(Math.abs(20 * Math.log10(rms(bass) / rms(bassBefore))) < 2.5 && Math.abs(20 * Math.log10(rms(accomp) / rms(accompBefore))) < 2.5, 'support EQ retains broadband balance through the existing makeup stage');
    // Keep this fixture below the EQ cap so a wrong role-only selection is audible.
    registerBank('marimba', { ...calibrated, trim: calibrated.trim!.map(t => ({ ...t,
      bandExcessDb: 0, bandFractionDb: t.midi === 48 ? -10 : -6 })) });
    const p = piece('accomp', true);
    // Include one melody note so the guard has a melody role; keep the complete accompaniment context.
    p.parts[0].notes[2].role = 'melody';
    const complete = perform(p, p.plan.tempo, { expressive: false }), plan = maskingPlan(p, { seconds: 2, perf: complete })!;
    const isolated = { ...complete, parts: complete.parts.map(q => ({ ...q, keys: q.keys.filter(k => k.role === 'bass') })) };
    const expected = roleBandDb(p, sr, { seconds: 2, master: 'none', perf: isolated, mixKeys: complete.parts.map(q => q.keys) }, plan.spans);
    const actual = roleBandDb(p, sr, plan.opts('bass'), plan.spans);
    ok(actual.every((v, i) => Math.abs(v - expected[i]) < 1e-8), 'role-isolated guard uses the complete part spectral choice, including mixed-role parts');
  } finally { clearBanks(); }
};
