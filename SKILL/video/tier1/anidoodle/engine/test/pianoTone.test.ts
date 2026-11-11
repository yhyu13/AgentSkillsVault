// The piano ruler's measures, tone colour between recorded layers and keys, and the two-band release, on synthetic takes.
import { bandEnvelope, envelopeGap, ruled, bandDecay, centroidHz, onsetOf } from "../src/canvas-core/music/pianoRuler";
import { registerBank, clearBanks, samplerVoice, sampleZones, toneColour, colourFilters, releaseLow, measuredTone, trebleFix, TREBLE_LEVEL, RELEASE_SPLIT, type SampleBank, type SampleZone } from "../src/canvas-core/music/sampler";
import { PIANO_BANDS } from "../src/canvas-core/music/keysTables";
import { hz } from "../src/canvas-core/music/theory";
import type { Played } from "../src/canvas-core/music/perform";

export const name = "piano tone";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const SR = 48000;
  // a take whose upper partials grow with the layer: brightness b sets partial n to b^(n-1)
  const tone = (f: number, b: number, secs = 2, tau = 1.2) => { const a = new Float32Array(Math.round(secs * SR)); for (let i = 0; i < a.length; i++) { let s = 0; for (let n = 1; n <= 24 && n * f < 20000; n++) s += Math.pow(b, n - 1) * Math.sin((2 * Math.PI * n * f * i) / SR); a[i] = 0.2 * s * Math.exp(-i / (SR * tau)); } return a; };
  const BRIGHT = [0.45, 0.65, 0.85];
  const bank = (id: string, pitches: number[], layers = 3, damped = true): SampleBank & { id?: string } => {
    const zones: SampleBank["zones"] = [];
    for (const midi of pitches) for (let layer = 1; layer <= layers; layer++) {
      const a = tone(hz(midi), BRIGHT[layer - 1]);
      const zone: SampleZone = { file: `${id}_${midi}_${layer}.flac`, midi, layer, rr: 1, frames: a.length, channels: 1, peakDb: -6, rmsDb: -14, sha256: (midi * 100 + layer * 10).toString(16).padStart(64, "0") };
      zones.push({ zone, channels: [a] });
    }
    return { entry: { title: id, source: "synthetic", license: "CC0-1.0", kind: "struck", range: [21, 108], layers, damped, normalized: true, zones: zones.map((z) => z.zone) }, zones };
  };
  const key = (p: number, v: number, off = 1.8): Played => ({ p, v, tone: v, t: 0, off, role: "melody", w: v });
  const centroidOf = (x: Float32Array) => centroidHz(x, SR, 0, 0.3);

  // ruler measures
  const dark = tone(220, 0.4), bright = tone(220, 0.85), mid = tone(220, 0.65);
  const eD = bandEnvelope(dark, SR, 0, 0.15), eB = bandEnvelope(bright, SR, 0, 0.15), eM = bandEnvelope(mid, SR, 0, 0.15);
  ok(eD.length === PIANO_BANDS.length, "one envelope value per piano band");
  ok(envelopeGap(eD, eD) === 0 && envelopeGap(eD, eB) > 3, `envelope gap: zero for the same take, large dark vs bright (${envelopeGap(eD, eB).toFixed(1)} dB)`);
  ok(Math.abs(envelopeGap(eD, eB.map((x) => x - 20)) - envelopeGap(eD, eB)) < 1e-9, "envelope gap ignores level");
  ok(ruled(eD, eD, eD, eB) === 0 && Math.abs(ruled(eB, eD, eD, eB) - 1) < 1e-9, "ruled: 0 on the truth, 1.0 a whole soft-to-loud step off");
  ok(ruled(eM, eD, eD, eB) > 0.2 && ruled(eM, eD, eD, eB) < 0.9, `ruled: a middle take sits between (${ruled(eM, eD, eD, eB).toFixed(2)})`);
  ok(centroidOf(bright) > centroidOf(dark) * 1.3, "centroid rises with brightness");
  const lead = new Float32Array(SR); lead.set(tone(220, 0.5, 0.5), 4800); ok(Math.abs(onsetOf(lead) - 4800) < 50, "onset found after a silent lead-in");
  const falling = tone(440, 0.5, 2, 0.5), rate = bandDecay(falling, SR, 0, 0.1, 1.5, [[300, 600]])[0];
  ok(Math.abs(rate - 20 * Math.log10(Math.E) / 0.5) < 2, `band decay reads an exponential's rate (${rate.toFixed(1)} dB/s, want 17.4)`);
  ok(Number.isNaN(bandDecay(falling, SR, 0, 0.1, 1.5, [[300, 600], [12000, 16000]])[1]), "band decay: an empty band is NaN, not a number");

  // tone colour
  clearBanks();
  try {
    const grand = registerBank("piano", bank("piano", [56, 60, 64]));
    const other = registerBank("vibes", bank("vibes", [56, 60, 64]));
    ok(measuredTone(grand, {}) && !measuredTone(other, {}) && !measuredTone(grand, { velocityTone: "lowpass" }) && !measuredTone(grand, { sampleFilter: "off" }), "tone colour: on for the piano banks, off elsewhere, and off on request");
    const ks = [key(60, 0.3)], picked = sampleZones(grand, ks, 1, [], undefined, true)[0].zone.layer, nearest = sampleZones(grand, ks, 1)[0].zone.layer;
    ok(picked === 2 && nearest === 1, `a blow between layers takes the louder layer to soften (louder ${picked}, nearest ${nearest})`);
    const loud = grand.zones.find((z) => z.zone.midi === 60 && z.zone.layer === 3)!, soft = grand.zones.find((z) => z.zone.midi === 60 && z.zone.layer === 1)!;
    ok(toneColour(grand, loud, 60, 0.9) === null && toneColour(grand, soft, 60, 0.9) === null, "never brightens: at or above the take's own layer of an even keyboard there is nothing to do");
    const d = toneColour(grand, loud, 60, 0.5)!;
    ok(d.length === PIANO_BANDS.length && d[16] < d[6] - 3, `softening cuts the top more than the body (7.7 kHz ${d[16].toFixed(1)} dB vs 240 Hz ${d[6].toFixed(1)} dB)`);
    ok(d.every((x) => x <= 6 + 12 && x >= -18 - 12), "colour stays inside its caps (plus the level shift)");
    const truth = soft.channels[0].length ? grand.zones.find((z) => z.zone.midi === 60 && z.zone.layer === 2)!.channels[0] : new Float32Array(0);
    const asIs = samplerVoice(grand, [key(60, 0.5)], [], SR, SR * 2, { velocityTone: "lowpass", release: "flat" }, 1).L;
    const held = { ...grand, zones: grand.zones.filter((z) => !(z.zone.midi === 60 && z.zone.layer === 2)) };
    const fromLoud = samplerVoice(held, [key(60, 0.5)], [], SR, SR * 2, { release: "flat" }, 1).L, fromLoudPlain = samplerVoice(held, [key(60, 0.5)], [], SR, SR * 2, { velocityTone: "lowpass", release: "flat" }, 1).L;
    const tE = bandEnvelope(truth, SR, 0, 0.15), sE = bandEnvelope(soft.channels[0], SR, 0, 0.15), lE = bandEnvelope(loud.channels[0], SR, 0, 0.15);
    const gOn = ruled(bandEnvelope(fromLoud, SR, 0, 0.15), tE, sE, lE), gOff = ruled(bandEnvelope(fromLoudPlain, SR, 0, 0.15), tE, sE, lE);
    ok(gOn < gOff * 0.6, `held-out middle layer: the softened loud take lands nearer the real one (${gOn.toFixed(2)} vs ${gOff.toFixed(2)})`);
    ok(ruled(bandEnvelope(asIs, SR, 0, 0.15), tE, sE, lE) < 0.05, "a blow at a recorded layer plays that take untouched");
    // a key between recorded pitches: the colour is read between its neighbours
    const shifted = toneColour(grand, grand.zones.find((z) => z.zone.midi === 60 && z.zone.layer === 2)!, 62, 0.5)!;
    ok(Array.isArray(shifted) && shifted.length === PIANO_BANDS.length, "a moved take gets a colour from the keys either side");
    ok(toneColour(grand, grand.zones.find((z) => z.zone.midi === 64 && z.zone.layer === 2)!, 66, 0.5) === null, "past the last recorded key there is no neighbour to read, so nothing changes");
    // filters land on the colour asked for
    let seed = 12345; const noise = Float32Array.from({ length: SR }, () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32) - 0.5);
    const want = PIANO_BANDS.map((f) => (f > 1000 ? -9 : 0)), fs = colourFilters(want, SR), shaped = Float32Array.from(noise); for (const f of fs) f.run(shaped);
    const resp = bandEnvelope(shaped, SR, 0, 1), ref = bandEnvelope(noise, SR, 0, 1);
    const err = [8, 10, 12, 14].map((j) => Math.abs(resp[j] - ref[j] - want[j]));
    ok(Math.max(...err) < 2, `octave filters land within 2 dB of the colour at the octave centres (worst ${Math.max(...err).toFixed(2)} dB)`);
    ok(colourFilters(PIANO_BANDS.map(() => 0), SR).length === 0, "a flat colour builds no filters");

    // treble level: one dull take among bright neighbours is lifted inside the cap and its neighbours come down
    const keysOf = (id: string, dull?: number) => { const b = bank(id, [48, 52, 56, 60, 64, 68, 72], 1); b.zones.forEach((z) => { z.channels = [tone(hz(z.zone.midi), z.zone.midi === dull ? 0.55 : 0.85)]; }); return b; };
    const lev = registerBank("piano", keysOf("piano", 60)), fx = trebleFix(lev), at = (m: number) => { const f = fx.get(lev.zones.find((z) => z.zone.midi === m)!); return f ? Math.max(...f.map(Math.abs)) * Math.sign(f.find((x) => x !== 0)!) : 0; };
    ok(at(60) > 0 && at(60) <= TREBLE_LEVEL.liftDb + 1e-9, `a dull take is lifted, never past the cap (${at(60).toFixed(1)} dB, cap ${TREBLE_LEVEL.liftDb})`);
    ok(at(56) < 0 && at(64) < 0, `its brighter neighbours come down to split the rest (${at(56).toFixed(1)}, ${at(64).toFixed(1)} dB)`);
    const flat = trebleFix(registerBank("piano", keysOf("piano"))), most = Math.max(0, ...[...flat.values()].map((f) => Math.max(...f.map(Math.abs))));
    ok(most <= 1.5, `an even keyboard gets at most a small touch (${most.toFixed(1)} dB)`);
    ok(trebleFix(registerBank("piano.upright", keysOf("piano.upright", 60))).size === 0, "the upright is left as recorded");
    const lifted = toneColour(lev, lev.zones.find((z) => z.zone.midi === 60)!, 60, 0.9);
    ok(!!lifted && lifted[16] > lifted[6], "a take at its own key and layer still gets its fixed treble shelf");

    // two-band release
    ok(releaseLow(24, 0.5) === 0.5 * RELEASE_SPLIT.lowMul && releaseLow(60, 0.1) === 0.1 && releaseLow(84, 0.08) === 0.08, "the low band lingers longest at the bottom and not at all from middle C up");
    const lowKey = registerBank("piano", bank("piano", [36, 40], 1)), keyUp = 0.6;
    const twoBand = samplerVoice(lowKey, [key(36, 0.8, keyUp)], [], SR, SR * 2, {}, 1).L, flatRel = samplerVoice(lowKey, [key(36, 0.8, keyUp)], [], SR, SR * 2, { release: "flat" }, 1).L;
    const bands: [number, number][] = [[30, 250], [500, 1000]], r2 = bandDecay(twoBand, SR, keyUp, 0.02, 0.2, bands), r1 = bandDecay(flatRel, SR, keyUp, 0.02, 0.2, bands);
    ok(r2[0] < r1[0] * 0.6, `two-band: the bass hum falls slower after key-up (${r2[0].toFixed(0)} vs ${r1[0].toFixed(0)} dB/s)`);
    ok(Math.abs(r2[1] - r1[1]) < r1[1] * 0.25, `two-band: the upper partials still stop as fast (${r2[1].toFixed(0)} vs ${r1[1].toFixed(0)} dB/s)`);
    const before = Math.round(0.5 * SR); ok(twoBand.slice(0, before).every((x, i) => Math.abs(x - flatRel[i]) < 1e-6), "before key-up the split sums back to the take exactly");
    const up = registerBank("piano.upright", bank("piano.upright", [36, 40], 1)), u2 = samplerVoice(up, [key(36, 0.8, keyUp)], [], SR, SR * 2, {}, 1).L, u1 = samplerVoice(up, [key(36, 0.8, keyUp)], [], SR, SR * 2, { release: "flat" }, 1).L;
    ok(u2.every((x, i) => x === u1[i]), "the upright keeps its single-rate release unless asked");
  } finally { clearBanks(); }
};
