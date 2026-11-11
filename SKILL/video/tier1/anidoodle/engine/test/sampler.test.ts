// Tiny synthetic recordings: pitch, dynamics, dampers, bank routing and cache identity, no files.
import { registerBank, bankFor, clearBanks, samplerVoice, sampleZones, sampleCutoff, sampleGain, bankIdentity, type SampleBank, type SampleZone, pinnedPitch } from "../src/canvas-core/music/sampler";
import { renderPiece, voiceJobs, runVoiceJob, voiceJobKey, calibrateBank } from "../src/canvas-core/music/render";
import { nocturne } from "../src/canvas-core/music/pieces/nocturne";
import { marimbaCurious } from "../src/canvas-core/music/pieces/families";
import { hz } from "../src/canvas-core/music/theory";
import { centroid, stemRms } from "../src/canvas-core/music/meter";
import { pianoVelocity } from "../src/canvas-core/music/keysPiano";
import { Biquad } from "../src/canvas-core/music/dsp";
import { ampSim, transientGain } from "../src/canvas-core/music/mixDsp";
import { lofiStem, LOFI_DUSTY } from "../src/canvas-core/music/lofiFx";
import type { Played } from "../src/canvas-core/music/perform";
const cryptoModule = "node:crypto", { createHash } = await import(cryptoModule);

export const name = "sampler";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const SR = 48000, key = (p = 60, v = 1, t = 0, off = 0.2): Played => ({ p, v, t, off, role: "melody", w: v });
  const bank = (pitches = [60], layers = 1, rrs = 1, damped = false, rich = false): SampleBank => {
    const zones: SampleBank["zones"] = [];
    for (const midi of pitches) for (let layer = 1; layer <= layers; layer++) for (let rr = 1; rr <= rrs; rr++) {
      const a = new Float32Array(SR * 3), f = hz(midi);
      for (let i = 0; i < a.length; i++) a[i] = 0.3 * Math.exp(-i / (SR * 2)) * (Math.sin(2 * Math.PI * f * i / SR + (rr - 1) * 0.3) + (rich ? 0.7 * Math.sin(2 * Math.PI * 6500 * i / SR) : 0));
      const zone: SampleZone = { file: `${midi}_${layer}_${rr}.flac`, midi, layer, rr, frames: a.length, channels: 1, peakDb: -6, rmsDb: -14, sha256: (midi * 100 + layer * 10 + rr).toString(16).padStart(64, "0") };
      zones.push({ zone, channels: [a] });
    }
    return { entry: { title: "Test", source: "synthetic", license: "CC0-1.0", kind: "struck", range: [21, 108], layers, damped, normalized: true, zones: zones.map((z) => z.zone) }, zones };
  };
  const render = (b: SampleBank, ks = [key()], sr = SR, pedal: [number, number][] = [], opts = {}, seed = 1) => samplerVoice(b, ks, pedal, sr, sr * 3, opts, seed);
  const same = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((v, i) => v === b[i]);
  const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
  const throws = (f: () => unknown, re: RegExp) => { try { f(); return false; } catch (e) { return re.test(String(e)); } };
  const pitch = (a: Float32Array, sr: number) => {
    const ts = []; for (let i = Math.round(sr * 0.1); i < sr * 0.6; i++) if (a[i - 1] <= 0 && a[i] > 0) ts.push(i - 1 - a[i - 1] / (a[i] - a[i - 1]));
    return sr * (ts.length - 1) / (ts[ts.length - 1] - ts[0]);
  };
  const cents = (f: number, m: number) => Math.abs(1200 * Math.log2(f / hz(m)));
  clearBanks();
  try {
    const b = bank(), a = render(b), up = render(b, [key(62)]), lowRate = render(b, [key(62)], 24000);
    ok(cents(pitch(up.L, SR), 62) < 3, "two-semitone repitch is within 3 cents");
    ok(cents(pitch(lowRate.L, 24000), 62) < 3 && lowRate.L.every(Number.isFinite), "24 kHz stems render finite and in tune");
    // Unity playback still has the velocity low-pass, but the source reader must use integer frames.
    const expected = Float32Array.from(b.zones[0].channels[0], (v) => v * sampleGain(b.entry, b.zones[0].zone, 1));
    ok(same(a.L, expected) && same(a.L, a.R), "in-tune 48 kHz mono keeps original attack frames above the layer centre");
    const rich = bank([60], 1, 1, false, true), soft = render(rich, [key(60, 0.2)]), loud = render(rich, [key()]);
    ok(rms(loud.L) > rms(soft.L) * 3 && centroid([soft.L, soft.R], SR).energyWeighted > centroid([loud.L, loud.R], SR).energyWeighted * 0.85, "normalized dynamics stay expressive and soft notes retain their attack spectrum");
    const natural = bank([60], 2); natural.entry.normalized = false; natural.zones[1].channels[0] = Float32Array.from(natural.zones[0].channels[0], (v) => v * 2);
    const softLayer = render(natural, [{ ...key(60, 0.25), tone: 0.25 }]), hardLayer = render(natural, [{ ...key(60, 0.75), tone: 0.75 }]);
    ok(rms(hardLayer.L) > rms(softLayer.L) * 1.9, "unnormalized layers retain the source's level relationship");
    const damped = bank([60], 1, 1, true), dry = render(damped), held = render(damped, [key()], SR, [[0, 2]]), noPedal = render(damped, [key()], SR, [[0, 2]], { pedal: false });
    const tail = (o: { L: Float32Array }) => rms(o.L.subarray(Math.round(SR * 1.2), Math.round(SR * 1.4)));
    ok(tail(dry) === 0 && tail(noPedal) === 0 && tail(held) > 0.01 && tail(a) > 0.01, "middle-register damper is silent 1 s after lift; pedal holds; undamped rings");
    ok(rms(held.halo!) > 0 && rms(noPedal.halo!) === 0, "the pedal feeds a room halo and pedal:false disables it");
    const caught = render(damped, [key()], SR, [[0.2, 1.5]]), boundary = render(damped, [key()], SR, [[0, 0.2]]);
    ok(tail(caught) > 0.01 && tail(boundary) === 0, "pedal spans use the piano's inclusive down, exclusive up boundary");
    const registers = bank([36, 90], 1, 1, true), bass = render(registers, [key(36)]), treble = render(registerBank("piano", registers), [key(90)]);
    ok(rms(bass.L.subarray(SR * 0.3, SR * 0.4)) > 0 && tail(treble) > 0.01, "bass dampers close slowly; top grand keys have no dampers");
    ok(tail(render(registerBank("vibes", registers), [key(90)])) === 0 && tail(render(registerBank("piano.upright", registers), [key(90)])) === 0, "vibes and upright top keys still have dampers");
    clearBanks();
    ok(throws(() => render(b, [key(20)]), /Ab0.*A0.*C8/), "out-of-range note throws with note name and playable range");
    const varied = { ...key(), vary: { cents: 12, db: -6, bright: 1, decay: 1, phase: 0, seed: 17 } }, detuned = render(b, [varied]);
    ok(Math.abs(1200 * Math.log2(pitch(detuned.L, SR) / hz(60)) - 12) < 3 && rms(detuned.L) < rms(a.L) * 0.6, "per-note cents and dB are applied");
    const unpitched = bank(); unpitched.zones[0].zone.unpitched = true;
    ok(cents(pitch(render(unpitched, [varied]).L, SR), 60) < 3 && same(render(unpitched, [key(62)]).L, a.L), "unpitched zones never transpose, including cents variation");
    ok(same(render(b).L, a.L) && same(render(b, [key()], SR, [], {}, 99).L, a.L), "deterministic output; changing seed cannot change a single recording");

    const rb = bank([60, 63], 3, 3), repeated = Array.from({ length: 8 }, (_, i) => ({ ...key(61, 0.65, i * 0.3), vary: { cents: 0, db: 0, bright: 1, decay: 1, phase: 0, seed: 42 } }));
    const picks = sampleZones(rb, repeated, 1);
    ok(picks.every((z) => z.zone.midi === 60 && z.zone.layer === 2), "nearest pitch is chosen before the nearest velocity layer");
    ok(picks.every((z, i) => !i || z !== picks[i - 1]), "round robins never repeat back to back, even with identical note seeds");
    ok(sampleZones(rb, repeated, 1).every((z, i) => z === picks[i]) && sampleZones(rb, repeated, 99).every((z, i) => z === picks[i]), "each note's own seed owns its round robin");
    const fallback = repeated.map(({ vary, ...k }) => k), p1 = sampleZones(rb, fallback, 1), p2 = sampleZones(rb, fallback, 2);
    ok(p1.some((z, i) => z !== p2[i]) && p2.every((z) => z.zone.midi === 60 && z.zone.layer === 2), "a changed fallback seed changes round robins only");
    const rrA = render(rb, repeated), rrB = render(rb, repeated);
    ok(same(rrA.L, rrB.L) && same(rrA.R, rrB.R) && same(rrA.halo!, rrB.halo!), "repeated-note renders are bit-identical");
    const sparse = bank([60, 63], 3); sparse.zones = sparse.zones.filter((z) => z.zone.midi !== 60 || z.zone.layer === 1); sparse.entry.zones = sparse.zones.map((z) => z.zone);
    ok(sampleZones(sparse, [key(61, 1)], 1)[0].zone.midi === 60, "a missing layer never pulls a note to a farther pitch");
    ok(sampleZones(rb, [key(60, 0.332), key(60, 1 / 3), key(60, 0.666), key(60, 2 / 3)], 1).map((z) => z.zone.layer).join() === "1,2,2,3", "default centres split layers at 1/3 and 2/3, boundaries choose the harder layer");
    const custom = bank([60], 3); custom.entry.layerVelocity = [0.1, 0.35, 0.6];
    ok(sampleZones(custom, [key(60, 0.55), { ...key(60, 1), tone: 0.2 }], 1).map((z) => z.zone.layer).join() === "3,3", "manifest centres override defaults; played velocity owns the layer, tone only shapes the filter");
    const arts = bank([60], 2, 2, true), add = (art: "sus" | "rel") => {
      for (const z of arts.zones.slice().filter((z) => !z.zone.art)) { const zone = { ...z.zone, art, file: `${art}_${z.zone.file}`, sha256: (art === "sus" ? "a" : "b").repeat(64) }, channels = [art === "rel" ? new Float32Array(480).fill(0.25) : Float32Array.from(z.channels[0], (v) => v * 0.5)]; zone.frames = channels[0].length; arts.zones.push({ zone, channels }); }
      arts.entry.zones = arts.zones.map((z) => z.zone);
    };
    add("sus"); add("rel");
    const strikes = [key(60, 0.2, 0), key(60, 0.2, 0.2), key(60, 0.8, 0.5), key(60, 0.2, 1)];
    ok(sampleZones(arts, strikes, 7, [[0.2, 1]]).map((z) => z.zone.art ?? "ordinary").join() === "ordinary,sus,sus,ordinary", "sus only for strikes under the pedal, including both boundaries");
    const missingSus = { ...arts, zones: arts.zones.filter((z) => z.zone.art !== "sus" || z.zone.layer === 1) };
    ok(!sampleZones(missingSus, [key(60, 0.8)], 1, [[0, 1]])[0].zone.art, "missing sus at the ordinary pitch/layer falls back to ordinary");
    const ordinary = { ...arts, zones: arts.zones.filter((z) => !z.zone.art) }, withoutRel = { ...arts, zones: arts.zones.filter((z) => z.zone.art !== "rel") };
    ok(same(render(arts, [key()], SR, [[0, 2]], { pedal: false }).L.subarray(0, SR * 0.2), render(ordinary, [key()]).L.subarray(0, SR * 0.2)), "pedal:false never selects a sus recording");
    const release = (off: number, pedal: [number, number][] = []) => { const ks = [key(60, 0.5, 0, off)], a = render(arts, ks, SR, pedal), b = render(withoutRel, ks, SR, pedal); return Float32Array.from(a.L, (v, i) => v - b.L[i]); };
    const relEarly = release(0.1), relLate = release(1), relHeld = release(0.1, [[0.05, 1.2]]);
    ok(relEarly.slice(0, SR * 0.1).every((x) => x === 0) && rms(relEarly.subarray(SR * 0.1, SR * 0.11)) > 0 && relEarly.slice(SR * 0.11).every((x) => x === 0), "rel fires once at key-up for its exact recorded duration");
    ok(relHeld.slice(0, SR * 1.2).every((x) => x === 0) && rms(relHeld.subarray(SR * 1.2, SR * 1.21)) > 0 && relHeld.slice(SR * 1.21).every((x) => x === 0), "a caught note fires rel at pedal-up, once");
    const overlapping = [key(60, 0.5, 0, 0.12), key(60, 0.5, 0.1, 0.3)], overlapWith = render(arts, overlapping), overlapDry = render(withoutRel, overlapping), overlapRel = Float32Array.from(overlapWith.L, (x, i) => x - overlapDry.L[i]);
    ok(overlapRel.subarray(0, SR * 0.12).every((x) => x === 0) && rms(overlapRel.subarray(SR * 0.12, SR * 0.13)) > 0 && overlapRel.subarray(SR * 0.13, SR * 0.3).every((x) => x === 0) && rms(overlapRel.subarray(SR * 0.3, SR * 0.31)) > 0, "restruck notes release at each actual key-up, never at the artificial string choke");
    const ownLevel = rms(render(withoutRel, [key(60, 0.5, 0, 0.1)]).L.subarray(SR * 0.08, SR * 0.1));
    ok(Math.abs(20 * Math.log10(rms(relEarly.subarray(SR * 0.1, SR * 0.11)) / ownLevel) + 15) < 0.01 && rms(relEarly) > rms(relLate) * 1.4, "rel is 15 dB below the remaining string level, later releases are quieter");
    const undamped = { ...arts, entry: { ...arts.entry, damped: false } };
    ok(same(render(undamped).L, render({ ...undamped, zones: undamped.zones.filter((z) => z.zone.art !== "rel") }).L), "undamped instruments never add rel");
    const top = bank([90], 1, 1, true), relTop = { ...top.zones[0], zone: { ...top.zones[0].zone, art: "rel" as const }, channels: [new Float32Array(SR * 3).fill(0.25)] }; top.zones.push(relTop); top.entry.zones.push(relTop.zone);
    ok(same(render(registerBank("piano", top), [key(90)]).L, render({ ...top, entry: { ...top.entry, damped: false } }, [key(90)]).L), "undamped grand treble never adds rel"); clearBanks();
    ok(same(render(arts, strikes, SR, [[0.2, 1]], {}, 7).L, render(arts, strikes, SR, [[0.2, 1]], {}, 7).L), "sus and rel round robins render deterministically");
    ok(same(render(arts, [key(64)]).L, render(withoutRel, [key(64)]).L), "rel outside the two-semitone allowance is skipped");
    const ordinaryHash = bankIdentity(arts.entry), changedArt = { ...arts.entry, zones: arts.entry.zones.map((z) => z.art === "sus" ? { ...z, art: "rel" as const } : z) };
    ok(bankIdentity(changedArt) !== ordinaryHash, "articulations belong in the bank identity");
    ok(Math.abs(sampleCutoff(custom.entry, custom.zones[1].zone, { ...key(), tone: 0.2 }, SR, "relative") - (350 + 17650 * 0.85 ** 2)) < 1e-8 && sampleCutoff(custom.entry, custom.zones[1].zone, { ...key(), tone: 0.35 }, SR, "relative") === Infinity, "relative filter uses the chosen centre, bypassing at and above it");
    ok(same(render(b, [key()], SR, [], { sampleFilter: "off" }).L, expected), "filter-off plays unity-rate PCM with only its dynamic gain");
    ok(sampleGain(natural.entry, natural.zones[0].zone, 0.25) === 1 && Math.abs(20 * Math.log10(sampleGain(natural.entry, natural.zones[0].zone, 0.35)) - 1.6) < 1e-10 && sampleGain(natural.entry, natural.zones[0].zone, 0) === 0, "non-normalized gain is unity at the layer centre, gently relative below and above, silent at zero");
    ok([0.1, 0.3, 0.6, 0.8, 1].every((v) => sampleGain(b.entry, b.zones[0].zone, v) === pianoVelocity(v) * Math.pow(10, -8 * Math.max(0, 0.6 - v) / 20)), "normalized banks use exactly the modeled piano velocity law, including its soft-register level compensation");
    const calibration = bank([60], 3, 2); calibration.entry.normalized = false;
    for (const z of calibration.zones) { const v = (z.zone.layer - 0.5) / 3, dynamic = pianoVelocity(v) * Math.pow(10, -8 * Math.max(0, 0.6 - v) / 20); z.channels[0] = Float32Array.from(z.channels[0], (x) => x * dynamic); }
    const original = calibration.zones.map((z) => Float32Array.from(z.channels[0])); registerBank("piano", calibration);
    const calibrated = calibrateBank("piano"), redo = calibrateBank("piano");
    ok(calibrated.hash === redo.hash && JSON.stringify(calibrated.trim) === JSON.stringify(redo.trim), "pitch/layer calibration is deterministic from PCM and fixed modeled references");
    ok(calibrated.trim!.every(t => Number.isFinite(t.bandFractionDb) && Number.isFinite(t.bandExcessDb)), "load calibration measures every zone's masking-band fraction and excess over its modeled reference");
    ok(calibrated.zones.every((z, i) => same(z.channels[0], original[i])), "calibration never changes recording PCM or tone");
    const measured = (x: Float32Array, y: Float32Array) => { const mid = Float32Array.from(x, (v, i) => (v + y[i]) * 0.5); Biquad.make(SR, "hp", 30, 0.7071).run(mid); let energy = 0; for (const v of mid) energy += v * v; return 10 * Math.log10(energy / (SR * 12)); };
    const levels = [1, 2, 3].map((layer) => { const v = (layer - 0.5) / 3, r = render(calibrated, [{ ...key(60, v, 0, 1), tone: v }], SR, [], { pedal: false }); return measured(r.L, r.R); });
    const refs = [1, 2, 3].map((layer) => calibrated.trim!.find((t) => t.layer === layer)!.modeledDb);
    ok(calibrated.trim!.every((t) => !t.boostLimited && Math.abs(t.correctionDb - t.requestedDb!) < 1e-9) && levels.every((v, i) => Math.abs(v - refs[i]) <= 0.15) && levels.slice(1).every((v, i) => v - levels[i] >= refs[i + 1] - refs[i] - 0.15), "healthy calibrated layers meet fixed references and preserve at least the modeled dynamic range");
    ok([0.05, 0.25, 0.65, 1].every((v) => Math.abs(20 * Math.log10(sampleGain(calibration.entry, calibration.zones[2].zone, v))) <= 6.000001), "calibrated non-normalized notes add only a bounded relative adjustment");
    const noisy = bank([60], 3, 2); noisy.entry.normalized = false;
    for (const z of noisy.zones) { const v = (z.zone.layer - 0.5) / 3, dynamic = pianoVelocity(v) * Math.pow(10, -8 * Math.max(0, 0.6 - v) / 20), scale = z.zone.layer === 1 ? 1e-4 : z.zone.layer === 3 ? 1e3 : 1; z.channels[0] = Float32Array.from(z.channels[0], (x) => x * dynamic * 0.001 * scale); }
    registerBank("piano", noisy); const capped = calibrateBank("piano");
    ok(capped.trim!.every((t) => Math.abs(t.correctionDb - t.medianDb!) <= 9.000001) && capped.trim![0].medianDb! > 40, "zone corrections stay within 9 dB of the instrument median, while the whole-instrument trim is unlimited");
    ok(capped.trim!.filter((t) => t.boostLimited).every((t) => t.layer === 1) && capped.trim!.filter((t) => t.boostLimited).length === 2, "only zones needing excessive upward correction trigger louder-layer fallback");
    ok(capped.trim!.filter((t) => t.layer === 3).every((t) => t.requestedDb! < t.medianDb! - 9 && t.correctionDb === t.medianDb! - 9 && !t.boostLimited), "excessive downward corrections are capped too, without promoting an already-loud zone");
    const quietKeys = Array.from({ length: 8 }, (_, i) => key(60, 0.1, i * 0.1));
    const safePicks = sampleZones(capped, quietKeys, 42);
    ok(safePicks.every((z) => z.zone.midi === 60 && z.zone.layer === 2) && safePicks.every((z, i) => !i || z !== safePicks[i - 1]) && sampleZones(capped, quietKeys, 42).every((z, i) => z === safePicks[i]), "quiet zones use the next louder layer at the same pitch, with deterministic non-repeating round robin");
    ok(sampleGain(capped.entry, safePicks[0].zone, 0.1) < 1 && sampleGain(capped.entry, safePicks[0].zone, 0.1) >= Math.pow(10, -6 / 20), "louder-layer fallback is brought down only by the gentle bounded relative gain");
    const noHigher = { ...capped, zones: capped.zones.filter((z) => z.zone.layer === 1) };
    ok(sampleZones(noHigher, [key(60, 0.1)], 1)[0].zone.layer === 1, "a quiet zone without a louder layer keeps its capped correction, never changes pitch or disappears");
    const stillQuiet = { ...capped, trim: capped.trim!.map((t) => t.layer === 2 ? { ...t, boostLimited: true } : t) };
    ok(sampleZones(stillQuiet, [key(60, 0.1)], 1)[0].zone.layer === 3 && sampleZones({ ...capped, zones: capped.zones.filter((z) => z.zone.layer !== 2) }, [key(60, 0.1)], 1)[0].zone.layer === 3, "protection skips still-quiet and missing layers, staying at the selected pitch");
    const protectedArts = { ...arts, trim: arts.zones.filter((z) => z.zone.art !== "rel").map(({ zone: z }) => ({ file: z.file, midi: z.midi, layer: z.layer, measuredDb: -40, modeledDb: -20, correctionDb: z.layer === 1 ? 9 : 0, requestedDb: z.layer === 1 ? 20 : 0, medianDb: 0, boostLimited: z.layer === 1 })) };
    ok(sampleZones(protectedArts, [key(60, 0.1)], 1, [[0, 1]])[0].zone.art === "sus" && sampleZones(protectedArts, [key(60, 0.1)], 1)[0].zone.art === undefined && sampleZones(protectedArts, [key(60, 0.1)], 1)[0].zone.layer === 2, "louder-layer protection keeps sus tied to pedal-at-strike and ordinary playback otherwise");
    clearBanks();
    const invalid = bank([60], 3); invalid.entry.layerVelocity = [0.1, 0.5];
    ok(throws(() => registerBank("piano", invalid), /layerVelocity/), "invalid layerVelocity is rejected");
    const stereo = bank(); stereo.zones[0].zone.channels = 2; stereo.zones[0].channels.push(Float32Array.from(stereo.zones[0].channels[0], (v) => v * -0.25));
    const wide = render(stereo); ok(wide.R.every((v, i) => Math.abs(v + wide.L[i] * 0.25) < 1e-7), "stereo channel phase and level survive playback");
    const high = bank(); for (let i = 0; i < high.zones[0].channels[0].length; i++) high.zones[0].channels[0][i] = 0.3 * Math.sin(2 * Math.PI * 23000 * i / SR);
    const upHigh = render(high, [key(62)]), downHigh = render(high, [key()], 24000), center = (x: Float32Array, sr: number) => rms(x.subarray(sr * 0.1, sr * 0.6));
    ok(center(upHigh.L, SR) < 0.001 && center(downHigh.L, 24000) < 0.001, "sinc removes above-Nyquist energy before pitch-up and 24 kHz downsampling");
    const imagesDb = (x: Float32Array, f: number) => {
      let cc = 0, ss = 0, cs = 0, xc = 0, xs = 0;
      for (let i = 0; i < x.length; i++) { const c = Math.cos(2 * Math.PI * f * i / SR), s = Math.sin(2 * Math.PI * f * i / SR); cc += c*c; ss += s*s; cs += c*s; xc += x[i]*c; xs += x[i]*s; }
      const d = cc*ss-cs*cs, a = (xc*ss-xs*cs)/d, b = (xs*cc-xc*cs)/d;
      let residual = 0, signal = 0;
      for (let i = 0; i < x.length; i++) { const fit = a*Math.cos(2*Math.PI*f*i/SR)+b*Math.sin(2*Math.PI*f*i/SR); residual += (x[i]-fit)**2; signal += fit*fit; }
      return 10*Math.log10(residual/signal);
    };
    const tone = bank([60]); tone.zones[0].channels[0] = Float32Array.from({ length: SR*3 }, (_, i) => 0.3*Math.sin(2*Math.PI*15000*i/SR));
    for (const shift of [-3, -200]) {
      const k = { ...key(), vary: { cents: shift, db: 0, bright: 1, decay: 1, phase: 0, seed: 4 } }, f = 15000*2**(shift/1200);
      const played = render(tone, [k]);
      ok(imagesDb(played.L.slice(SR*0.1, SR*0.3), f) < -65, `${shift} cents: downward humanisation has no audible interpolation images`);
      const relZone = { ...tone.zones[0].zone, art: 'rel' as const, file: 'release.flac' }, withRel = { ...tone, entry: { ...tone.entry, damped: true, zones: [...tone.entry.zones, relZone] }, zones: [...tone.zones, { zone: relZone, channels: tone.zones[0].channels }] };
      const release = render(withRel, [k]), without = render({ ...tone, entry: { ...tone.entry, damped: true } }, [k]);
      const isolated = Float32Array.from(release.L.slice(SR*0.22, SR*0.32), (v, i) => v - without.L[SR*0.22+i]);
      ok(imagesDb(isolated, f) < -65, `${shift} cents: pitch-down release noise uses the same clean sinc path`);
    }
    const canonical = JSON.stringify([b.entry.kind, b.entry.range, b.entry.layers, null, b.entry.damped, true, b.entry.zones.map((z) => [z.sha256, z.midi, z.layer, z.rr, z.frames, z.channels, false, null])]);
    ok(bankIdentity(b.entry) === createHash("sha256").update(canonical).digest("hex"), "browser-safe bank identity agrees with SHA-256");
    const wideGaps = bank([60, 72]); wideGaps.entry.sparse = true; wideGaps.entry.maxShift = 6; wideGaps.zones[0].zone.measuredHz = 260;
    const shifted = render(wideGaps, [key(66)]);
    ok(cents(pitch(shifted.L, SR), 66) < 3 && shifted.L.every(Number.isFinite), "sparse banks allow wide shifts; measuredHz does not retune the recording");

    for (const [make, want] of [[nocturne, "acd240c8adffd25d00ee5279f2c72d3e"], [marimbaCurious, "d787a58c5704cf940a4404281e33d07a"]] as const) {
      const r = renderPiece(make(), SR), h = createHash("md5"); h.update(new Uint8Array(r.L.buffer)); h.update(new Uint8Array(r.R.buffer));
      ok(h.digest("hex") === want, `${make.name}: no-bank audio matches the pre-change md5`);
    }
    const piece = nocturne(), model = voiceJobs(piece, 24000, { seconds: 0.5 });
    const reg = registerBank("piano", b), sampled = voiceJobs(piece, 24000, { seconds: 0.5 });
    ok(sampled.every((j) => j.kind === "sampled" && j.bankHash === reg.hash) && voiceJobKey(model[0]) !== voiceJobKey(sampled[0]), "sampled jobs carry the bank hash and cannot hit modeled cache entries");
    const processed = { ...sampled[0], post: { id: "probe", seed: 1, lofi: LOFI_DUSTY, amp: 0.3, transient: { maxDb: 3, thrDb: -18, ratio: 2 } } }, { post, ...bare } = processed;
    const full = runVoiceJob(processed), manual = runVoiceJob(bare);
    lofiStem(post.lofi, post.id, manual.L, manual.R, bare.sr, bare.keys.map((k) => k.t), post.seed);
    ampSim(manual.L, manual.R, bare.sr, post.amp); const gr = transientGain(manual.L, manual.R, bare.sr, post.transient);
    ok(same(full.L, manual.L) && same(full.R, manual.R) && full.transientGr === gr, "sampled stems run the existing lo-fi, amp and transient chain in order");
    const disabled = { ...piece, parts: piece.parts.map((p) => ({ ...p, opts: { ...p.opts, sampled: false } })) };
    ok(voiceJobs(disabled, 24000, { seconds: 0.5 }).every((j, i) => { const a = runVoiceJob(j), b = runVoiceJob(model[i]); return j.kind === "piano" && same(a.L, b.L) && same(a.R, b.R); }), "sampled:false retains exact modeled audio");
    ok(voiceJobs({ ...piece, legacy: true }, 24000, { seconds: 0.5 }).every((j) => j.kind !== "sampled"), "legacy pieces never use a registered bank");
    registerBank("piano.upright", bank([63]));
    ok(bankFor("piano", "upright")?.id === "piano.upright" && !bankFor("piano", "felt"), "variants are exact bank ids, with no bare-id fallback");
    const job = sampled[0], replacement = bank(); replacement.zones[0].zone.sha256 = "f".repeat(64); registerBank("piano", replacement);
    ok(bankIdentity(replacement.entry) !== reg.hash && throws(() => runVoiceJob(job), /missing or changed/), "replaced banks invalidate jobs instead of silently serving another voice");
    const sustained = bank(); sustained.entry.kind = "sustained";
    ok(throws(() => registerBank("strings", sustained), /sustained zone without a loop/), "sustained zones without loops are rejected");
  } finally { clearBanks(); }

  // a drum pinned to a note lands inside what was recorded, on the same note name
  ok(pinnedPitch(31, [37, 59]) === 43 && pinnedPitch(60, [37, 59]) === 48 && pinnedPitch(43, [37, 59]) === 43, "a pinned pitch moves by octaves into the recorded range (G1 to G2, C4 to C3) and stays put when it is inside");
  ok([24, 31, 38, 60, 72, 90].every((p) => { const q = pinnedPitch(p, [37, 59]); return q >= 37 && q <= 59 && (q - p) % 12 === 0; }), "every pinned pitch stays in range and keeps its note name");
  { let threw = 0; for (const bad of [NaN, Infinity, -Infinity]) try { pinnedPitch(bad, [37, 59]); } catch { threw++; } ok(threw === 3, "a pinned pitch that is not a number is refused, never looped on"); }
};
