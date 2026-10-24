#!/usr/bin/env node
// Music unit test: styles are vocabularies, the composer writes the notes.
//   node tools/music-unit.mjs
// Asserts: the approved launch score is bit-identical as composed material (md5); neutral mood is the
// calibrated palette exactly; missing material is an error, never a default; every groove family
// parses in every meter and varies with the seed; every style vocabulary composes, renders (true peak
// <= -1 dBTP, loudness at its master target) and meets its stem targets; the stem meter catches a sub
// 9 dB hot that LUFS alone passes; a seamless loop; a film fit that ends on its phrase; the score
// scaffold is empty; and the novelty gate hears the copy Alex heard (Daylight vs the launch score).
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { join } from "node:path";

const src = join(import.meta.dirname, "../src/canvas-core/music/index.ts");
const js = (await build({ entryPoints: [src], bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const md5 = (r) => { const h = createHash("md5"); h.update(Buffer.from(r.L.buffer, r.L.byteOffset, r.L.byteLength)); h.update(Buffer.from(r.R.buffer, r.R.byteOffset, r.R.byteLength)); return h.digest("hex"); };
const ok = []; const t0 = Date.now();
const pass = (s) => { ok.push(s); console.log(`  ok  ${s}`); };

// 1. The approved launch score, now composed material on the lo-fi electronic vocabulary: bit-identical.
const LAUNCH3_MD5_48K = "d20789f2344e6fff0d2a380c7c7825d2";
const launch = M.renderPiece(M.launchLofi3(), 48000);
assert.equal(md5(launch), LAUNCH3_MD5_48K, "launchLofi3 audio changed");
{ const tp = M.truePeak([launch.L, launch.R]).dbtp, lu = M.loudness([launch.L, launch.R], 48000).integrated; assert(tp <= -1 && Math.abs(lu + 14) <= 1);
  pass(`launchLofi3 md5 ${LAUNCH3_MD5_48K} (48 kHz), ${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP`); }

// 2. Mood controls: all at 0.5 = the calibrated palette exactly; moved, the sound changes.
const SR = 24000, launchMd5_24 = md5(M.renderPiece(M.launchLofi3(), SR));
assert.equal(md5(M.renderPiece(M.composePiece({ ...M.launchLofi3Material(), moodControls: { energy: 0.5, warmth: 0.5, brightness: 0.5, tension: 0.5, space: 0.5 } }), SR)), launchMd5_24, "neutral mood must be identity");
assert.notEqual(md5(M.renderPiece(M.composePiece({ ...M.launchLofi3Material(), moodControls: { warmth: 0.9, space: 0.8 } }), SR)), launchMd5_24);
pass("mood controls: 0.5 on all five = identical audio; warmth/space moved = different audio");

// 3. No defaults: missing material is an error that says what to compose.
const base = M.launchLofi3Material();
for (const [what, m] of [
  ["harmony", { ...base, sections: base.sections.map((s, i) => (i === 1 ? { ...s, harmony: [] } : s)) }],
  ["melody", { ...base, sections: base.sections.map((s) => ({ ...s, lead: undefined })) }],
  ["chord voicing", { ...base, chords: { Dm9: base.chords.Dm9 } }],
  ["groove", { ...base, grooves: {} }],
  ["form", { ...base, sections: [] }],
  ["seed/mood", { ...base, mood: undefined }],
]) assert.throws(() => M.composePiece(m), /compose/, `missing ${what} must throw`);
{ const sjs = (await build({ entryPoints: [join(import.meta.dirname, "../src/canvas-core/score.ts")], bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
  const S = await import("data:text/javascript;base64," + Buffer.from(sjs).toString("base64")); assert.throws(() => S.filmScore(S.scoreSkeleton(), 30, 300), /skeleton/); }
pass("missing harmony, melody, voicing, groove, form, mood: each throws; the score scaffold is empty and refuses to play");
// A bar that doesn't add up throws, the last one too: a short final bar is a silent gap nobody wrote.
{ const o = { role: "bass", bpb: 4 };
  assert.throws(() => M.line(0, "C2:3", o), /sums to 3 beats.*"C2:3 r:1"/, "a one-bar C2:3 in 4/4 must throw");
  assert.throws(() => M.line(0, "C2:4 | C2:3", o), /bar 1 sums to 3/);
  assert.equal(M.line(0, "C2:3 r:1", o).length, 1);
  assert.equal(M.line(6, "C2:2", o).length, 1, "a line starting off the barline may fill to it");
  const base = M.launchLofi3Material(), k = Object.keys(base.chords)[0];
  assert.throws(() => M.composePiece({ ...base, chords: { ...base.chords, [k]: { ...base.chords[k], bass: "C2:3" } } }), /sums to 3 beats/, "a short bass bar must fail compose (and so check)"); }
pass("notation: a short final bar throws with the rest to write (C2:3 -> C2:3 r:1); compose refuses it");

// 4. Groove families: every family parses in every meter, deterministic, and the seed varies the bars.
{ const meters = ["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8"]; let n = 0;
  for (const family of Object.keys(M.GROOVE_FAMILIES)) for (const meter of meters) for (let b = 0; b < 4; b++) {
    const g = { family, density: 0.8, variation: 0.8, fill: true }, bar = M.grooveBar(g, meter, 7, b, b, 4), again = M.grooveBar(g, meter, 7, b, b, 4);
    assert.deepEqual(bar, again); for (const x of Object.values(bar)) if (x) { M.line(0, x, { role: "drum", bpb: M.beatsPerBar(meter) }); n++; }
  }
  const bars = (seed) => Array.from({ length: 8 }, (_, b) => JSON.stringify(M.grooveBar({ family: "bounce", density: 0.7, variation: 0.8 }, "4/4", seed, b, b, 8)));
  assert.notDeepEqual(bars(1), bars(2)); assert(new Set(bars(1)).size > 1);
  pass(`${Object.keys(M.GROOVE_FAMILIES).length} groove families x ${meters.length} meters: ${n} bars parse, deterministic, seed-varied`); }

// 5. Every style vocabulary: a neutral test signal composes, renders, masters and meets its stem targets.
for (const v of Object.values(M.VOCAB)) {
  const p = M.composePiece(M.testMaterial(v, { bars: 4 })), r = M.renderPiece(p, SR), tp = M.truePeak([r.L, r.R]).dbtp, lu = M.loudness([r.L, r.R], SR).integrated;
  const target = M.STYLES[v.id].master === "dense" ? -14 : -16, b = M.measureStems(p, SR);
  assert(tp <= -1, `${v.id}: ${tp} dBTP`); assert(lu <= target + 1 && lu >= target - 6, `${v.id}: ${lu} LUFS vs ${target}`);
  if (!v.calibrated) assert(b.pass, `${v.id}: stems ${b.rows.filter((x) => !x.ok).map((x) => `${x.id} ${x.offDb.toFixed(1)}`).join(", ")}`);
  assert(!p.parts.some((x) => ["ePiano", "vinyl"].includes(x.inst)) || v.id === "lofi", `${v.id}: ePiano/vinyl only in the dusty lofi style`);
}
pass(`${Object.keys(M.VOCAB).length} style vocabularies compose, render (true peak <= -1 dBTP), master; uncalibrated palettes meet their stem targets on the test signal`);

{ const b = M.measureStems(M.launchLofi3(), SR); assert(b.pass); const w = b.rows.filter((x) => x.offDb !== null).reduce((a, x) => (Math.abs(x.offDb) > Math.abs(a.offDb) ? x : a));
  pass(`lofiElectronic (calibrated on the listened launch score): stems within +-3 dB, worst ${w.id} ${w.offDb.toFixed(1)} dB`); }

// 6. The lesson: a sub 9 dB hot still masters to -14 LUFS; only the stem meter sees it.
{ const hot = M.composePiece({ ...base, levels: { bass: 9 } }), r = M.renderPiece(hot, SR), lu = M.loudness([r.L, r.R], SR).integrated, b = M.measureStems(hot, SR), sub = b.rows.find((x) => x.id === "bass");
  assert(Math.abs(lu + 14) <= 1 && !b.pass && sub.offDb > 7, "the stem meter must flag a hot sub that LUFS passes");
  pass(`hot sub: mix ${lu.toFixed(1)} LUFS (passes), stem meter flags bass +${sub.offDb.toFixed(1)} dB`); }

// 7. A seamless loop (composer's material, loop: true): the seam is an ordinary sample step.
{ const lp = M.renderLoop(M.composePiece(M.testMaterial(M.VOCAB.lofiElectronic, { loop: true })), SR), n = lp.L.length, steps = [];
  for (let i = 1; i < n; i += 3) steps.push(Math.abs(lp.L[i] - lp.L[i - 1])); steps.sort((a, b) => a - b);
  const p999 = steps[Math.floor(steps.length * 0.999)], seam = Math.max(Math.abs(lp.L[0] - lp.L[n - 1]), Math.abs(lp.R[0] - lp.R[n - 1]));
  assert(seam <= p999, `seam ${seam} > ${p999}`); assert.equal(md5(lp), md5(M.renderLoop(M.composePiece(M.testMaterial(M.VOCAB.lofiElectronic, { loop: true })), SR)));
  pass(`loop: seam step ${seam.toFixed(4)} <= p99.9 ${p999.toFixed(4)}, deterministic`); }

// 8. Film fit: the composition is re-formed (stretch section repeated or dropped) and ends on its phrase.
for (const secs of [70, 90, 110]) {
  const f = M.fitScore(M.launchLofi3(), secs), perf = M.perform(f.piece, f.tempo, { expressive: true }), p = f.piece;
  assert.equal(p.harmony[p.harmony.length - 1].name, "Cmaj9"); assert.equal(f.form, "full");
  assert(Math.abs(perf.lastOnset - (secs - p.tail)) < 0.05 || (f.tempo === 90 && M.fitsAsWritten(p, secs))); assert(f.tempo >= 90 * 0.88 && f.tempo <= 90 * 1.12);
  pass(`fit ${secs} s: ${p.plan.sections[0].bars} bars at ${f.tempo.toFixed(1)} bpm, last onset ${perf.lastOnset.toFixed(2)} s on Cmaj9`);
}
{ const a = M.filmAudio(M.launchLofi3(), 40)(16000); assert.equal(a[0].length, 40 * 16000); pass("filmAudio: exactly the film's length"); }
// composed to length: the fit keeps the written tempo (the final ritard must not move the picture's hits); a form that does not fit is still fitted
{ const p = M.composePiece({ ...M.testMaterial(M.VOCAB.house, { bars: 8 }), tail: 2 }), natural = M.perform(p, p.plan.tempo, { expressive: true }).lastOnset + p.tail, bar = (4 * 60) / p.plan.tempo;
  const kept = M.fitScore(p, Math.round(natural)), moved = M.fitScore(p, natural + 2 * bar);
  assert.equal(kept.tempo, p.plan.tempo); assert.equal(M.perform(kept.piece, kept.tempo, { expressive: true }).sec(4 * 4), M.perform(p, p.plan.tempo, { expressive: true }).sec(4 * 4), "bar 5 lands where it was written");
  assert(moved.tempo !== p.plan.tempo || moved.piece.plan.sections.length !== p.plan.sections.length);
  pass(`fit: a score composed to ${Math.round(natural)} s keeps ${p.plan.tempo} bpm (natural end ${natural.toFixed(2)} s: the tail takes the difference); ${(natural + 2 * bar).toFixed(1)} s is refitted`); }

// 9. Composer-facing fixes (from the blind composer's report).
{ const t = M.testMaterial(M.VOCAB.playful, { bars: 4 }), sec = t.sections[0];
  const once = M.composePiece({ ...t, sections: [{ ...sec, lead: sec.lead.slice(0, 2) }] });
  assert(once.warnings.some((w) => /plays once/.test(w)), "a short line must warn");
  const looped = M.composePiece({ ...t, sections: [{ ...sec, lead: sec.lead.slice(0, 2), loopLines: true }] });
  assert.equal(looped.warnings.length, 0); assert.equal(looped.parts.find((p) => p.id === "lead").notes.length, 2 * once.parts.find((p) => p.id === "lead").notes.length);
  pass("lines: a short line warns; loopLines repeats it to fill the section");
  const lv = (x) => M.composePiece({ ...t, levels: x }).parts.find((p) => p.id === "lead").gainDb;
  assert(Math.abs(lv({ lead: 2 }) - lv({}) - 2) < 1e-9); pass("levels: a dB offset on top of the calibrated gain");
  const vsum = (en) => M.composePiece({ ...t, sections: [{ ...sec, energy: en }] }).parts.flatMap((p) => p.notes).reduce((a, n) => a + n.v, 0);
  assert(vsum(0.2) < vsum(0.5) && vsum(0.8) > vsum(0.5)); pass("section energy scales the dynamics of every part");
  const lit = { main: { kick: ["C4:4", "r:2 C4:2"] } }, mk = (from) => M.composePiece({ ...t, grooves: lit, sections: [{ kind: "hook", bars: from, harmony: ["c0"], lead: sec.lead.slice(0, from) }, { kind: "hook", bars: 2, harmony: ["c0"], lead: sec.lead.slice(0, 2) }] });
  const kicks = (p, bar) => p.parts.find((x) => x.id === "kick").notes.filter((n) => n.t >= bar * 4 && n.t < bar * 4 + 4).map((n) => n.t - bar * 4);
  assert.deepEqual(kicks(mk(1), 1), [0]); assert.deepEqual(kicks(mk(2), 2), [0]); pass("written grooves cycle from each section's first bar");
  const orch = (key, tonic) => M.composePiece(M.testMaterial(M.VOCAB.orchestral, { bars: 2, key, tonic })).parts.find((p) => p.id === "perc").opts.pitch % 12;
  assert.equal(orch("C", 0), 0); assert.equal(orch("D", 2), 2); pass("timpani in a drum lane is tuned to the key");
  const mod = M.composePiece({ ...t, sections: [sec, { ...sec, key: "D" }] }); assert.deepEqual(mod.plan.sections.map((x) => x.key), ["C", "D"]); pass("per-section key: the key check reads each key region");
  // the blind composer's case: Db lydian whose notes lean on Ab (the same pitch set as Ab major), tonic ~12 % of note time
  const lp = (key, mode, src) => ({ title: "k", seed: 1, tail: 1, harmony: [], plan: { style: "ambient", tempo: 70, meter: "4/4", sections: [{ id: "a", bars: 5, mood: "awe", key, mode, melody: ["stepwise"], dyn: [0.5, 0.5] }] }, parts: [{ id: "m", inst: "fmBell", role: "melody", notes: M.line(0, src, { role: "melody", bpb: 4 }) }] });
  const src = "Db4:2 Ab4:2 | Ab4:2 Eb4:2 | Eb4:1 F4:2 G4:1 | G4:1 Bb4:2 C5:1 | C5:1 Eb5:1 r:2";
  assert(M.detectMode(M.line(0, src, { role: "melody", bpb: 4 }), ["lydian", "major", "aeolian", "dorian", "mixolydian"])[0].tonic !== "Db", "fixture must fool the raw detector");
  assert.deepEqual(M.planProblems(lp("Db", "lydian", src)), []); assert(M.planProblems(lp("E", "major", src)).length > 0);
  pass("Db lydian leaning on Ab is accepted (scale fits, tonic heard); a wrong key is still flagged");
  const cen = (x) => { const a = new Float32Array([x]); return [a, a]; }; // a centred part: the stem meter reads its mid
  assert(M.stemBalance({ lead: cen(10 ** ((-16.5 + 5) / 20)) }, { lead: -16.5 }).pass); assert(!M.stemBalance({ lead: cen(10 ** ((-16.5 + 7) / 20)) }, { lead: -16.5 }).pass); pass("stems: the lead may sit +3 dB over tolerance (guards win), not more");
  { const n = 48000, x = new Float32Array(n).map((_, i) => 0.1 * Math.sin(i / 7)), z = new Float32Array(n), lo = new Float32Array(n).map((_, i) => 0.001 * Math.sin(i / 7));
    const left = M.stemRms(x, z), right = M.stemRms(z, x), tail = M.stemRms(Float32Array.from([...x.slice(0, n / 2), ...lo.slice(0, n / 2)]), Float32Array.from([...x.slice(0, n / 2), ...lo.slice(0, n / 2)]));
    assert(Math.abs(left - right) < 1e-9 && Math.abs(tail - M.stemRms(x, x)) < 0.1, `mid meter: L ${left} R ${right}, tail ${tail}`);
    pass(`stem meter: a part panned hard left reads as hard right (${left.toFixed(1)} dB both; v1 read the left channel only), a -40 dB tail does not dilute it (${tail.toFixed(2)} vs ${M.stemRms(x, x).toFixed(2)})`); }
  const w = M.composePiece(M.testMaterial(M.VOCAB.world, { bars: 4 })), wr = M.renderPiece(w, SR), g = M.guardReport(wr, SR, wr.L.length / SR);
  assert(Number.isFinite(g.lufs) && g.ghost.windows > 0); pass(`guards run on a 7/8 score (${g.ghost.windows} windows)`); }

// 9b. Chords and bars (from the blind composer's report).
{
  // chords: a tie holds over the bar line (no restrike), comping gives the chord part a rhythm with rests, "r" voices a silent chord
  const mat = (meter, sec, extra = {}) => ({ style: "cinematic", title: "t", seed: 3, mood: "tender", bpm: 80, key: "C", mode: "major", meter, grooves: {}, ...extra,
    chords: { C: { voicing: "[C4 E4 G4]", bass: meter === "3/4" ? "C2:3" : meter === "5/4" ? "C2:5" : meter === "6/8" ? "C2:2" : meter === "7/8" ? "C2:3.5" : "C2:4" }, F: { voicing: "[C4 F4 A4]", bass: "F2:4" }, N: { voicing: "r", bass: "G2:4" } },
    sections: [{ kind: "verse", groove: null, lead: "r:" + M.beatsPerBar(meter), ...sec }] });
  const chordsOf = (p) => p.parts.find((x) => x.id === "chords").notes, bassOf = (p) => p.parts.find((x) => x.id === "bass").notes;
  { const held = M.composePiece(mat("4/4", { bars: 2, harmony: ["C", "~"], lead: "E5:4 | D5:4" })), struck = M.composePiece(mat("4/4", { bars: 2, harmony: ["C", "C"], lead: "E5:4 | D5:4" }));
    assert.equal(chordsOf(held).length, 3); assert(chordsOf(held).every((n) => n.d === 8)); assert.equal(chordsOf(struck).length, 6); assert.deepEqual(held.harmony.map((h) => h.t), [0]);
    assert.equal(bassOf(held).length, 2, "the bass keeps its line under a held chord");
    const tiedBass = M.composePiece(mat("4/4", { bars: 2, harmony: ["C", "~"], bass: ["C2:4", "~"], lead: "E5:4 | D5:4" })); assert.equal(bassOf(tiedBass).length, 1); assert.equal(bassOf(tiedBass)[0].d, 8);
    const into = M.composePiece(mat("4/4", { bars: 2, harmony: ["C", "~ F"], bass: ["C2:4", "C2:2 F2:2"], lead: "E5:4 | D5:4" })); assert.deepEqual(chordsOf(into).map((n) => [n.t, n.d]).filter(([t]) => t === 0), [[0, 6], [0, 6], [0, 6]]); assert.deepEqual(into.harmony.map((h) => [h.t, h.name]), [[0, "C"], [6, "F"]]);
    pass("harmony \"~\": the chord holds over the bar line (3 notes of 8 beats, not 6 restrikes), the bass keeps its line unless its bar is \"~\"; \"~ F\" holds into the bar, then changes");
    const comp = M.composePiece(mat("4/4", { bars: 2, harmony: ["C F"], comp: ["x:1 r:.5 x:.5@0.6 r:1 x:1", "~:1 r:1 x:2"], bass: "C2:2 F2:2", lead: "E5:4 | D5:4" }));
    const on = (t) => chordsOf(comp).filter((n) => Math.abs(n.t - t) < 1e-9);
    assert.deepEqual([...new Set(chordsOf(comp).map((n) => n.t))], [0, 1.5, 3, 6]); assert(on(3).some((n) => n.p === 65), "x on beat 4 strikes the chord sounding there (F)");
    assert(Math.abs(on(1.5)[0].v - on(0)[0].v * 0.6) < 1e-9, "@VEL scales the strike"); assert.equal(on(3)[0].d, 2, "~:1 holds beat 4's strike over the bar line");
    assert.throws(() => M.composePiece(mat("4/4", { bars: 1, harmony: ["C"], comp: "x:1 r:1", lead: "E5:4" })), /comp bar .* sums to 2/);
    pass("comp: x strikes the chord sounding at that point, r rests, @VEL accents, ~ ties a push over the bar line; a comp bar that does not add up throws");
    const rest = M.composePiece(mat("4/4", { bars: 2, harmony: ["C", "N"], lead: "E5:4 | D5:4" }));
    assert(chordsOf(rest).every((n) => n.t < 4)); assert.deepEqual(rest.harmony.map((h) => h.name), ["C", "N"]); assert(bassOf(rest).some((n) => n.t === 4 && n.p === 43));
    pass("voicing \"r\": the chord part rests for that chord, the harmony still names it and its bass plays"); }
  { const one = (meter, bar, extra) => { const b = M.beatsPerBar(meter); return M.composePiece(mat(meter, { bars: 1, harmony: [bar], bass: `r:${b}`, lead: `r:${b}` }, extra)).harmony.map((h) => h.t); };
    assert.deepEqual(one("3/4", "C F"), [0, 2], "3/4: 2+1, never beat 2.5"); assert.deepEqual(one("6/8", "C F"), [0, 1]); assert.deepEqual(one("5/4", "C F"), [0, 3]);
    assert.deepEqual(one("5/4", "C F", { grouping: [2, 3] }), [0, 2]); assert.deepEqual(one("7/8", "C F"), [0, 2]); assert.deepEqual(one("4/4", "C F"), [0, 2]);
    assert.deepEqual(one("3/4", "C:1 F:2"), [0, 1]); assert.throws(() => one("3/4", "C:1 F:1"), /adds up to 2/);
    pass("split bars: 3/4 changes on beat 3 (2+1), 6/8 3+3 eighths, 5/4 3+2 or its grouping (2+3), 7/8 4+3 eighths, explicit beats \"C:1 F:2\"; a wrong sum throws"); }
}
// 9c. One level scale: alternates and your own voices are calibrated to the slot's target (the style's number plus its fix).
{ const stem = (p, slot) => { const r = M.renderPiece(p, SR, { stems: true, master: "none", only: (pt) => pt.id === slot }); return M.stemRms(r.stems[slot][0], r.stems[slot][1], SR); };
  const tm = (v, slot, voice, extra = {}) => M.composePiece({ ...M.testMaterial(v, { bars: 4, lines: slot === "counter" || slot === "arp" ? [slot] : [] }), voices: { [slot]: voice }, ...extra });
  let worst = 0, n = 0;
  for (const v of Object.values(M.VOCAB)) for (const [slot, alts] of Object.entries(v.alternates)) for (const name of Object.keys(alts)) {
    const p = tm(v, slot, name); if (p.stemTargets[slot] === undefined) continue; const off = stem(p, slot) - p.stemTargets[slot]; n++;
    assert(Math.abs(off) <= 1.5, `${v.id} ${slot} alternate ${name} sits ${off.toFixed(1)} dB off its target`); worst = Math.max(worst, Math.abs(off)); }
  const pianoLead = stem(tm(M.VOCAB.cinematic, "lead", "piano"), "lead") - M.VOCAB.cinematic.stemTargets.lead, synthLead = stem(tm(M.VOCAB.house, "lead", "synth"), "lead") - M.VOCAB.house.stemTargets.lead;
  pass(`alternates: all ${n} in every style sit within ${worst.toFixed(2)} dB of their target (cinematic piano lead ${pianoLead.toFixed(1)}, house synth lead ${synthLead.toFixed(1)}; the blind composer needed +14 and +16.5)`);
  const role = { chords: "accomp", arp: "accomp", lead: "melody", counter: "color", bass: "bass" }, offs = [];
  for (const [style, slot, inst] of [["cinematic", "lead", "piano"], ["cinematic", "counter", "strings"], ["house", "lead", "leadSynth"], ["world", "arp", "guitar"], ["folk", "chords", "strings"], ["jazz", "bass", "bass"], ["orchestral", "lead", "woodwind"], ["lofiElectronic", "chords", "ePiano"], ["suspense", "lead", "bowedSolo"], ["playful", "arp", "marimba"]]) {
    const p = tm(M.VOCAB[style], slot, { inst, role: role[slot] }), off = stem(p, slot) - p.stemTargets[slot]; offs.push(`${style} ${slot} ${inst} ${off >= 0 ? "+" : ""}${off.toFixed(1)}`);
    assert(Math.abs(off) <= 3, `your own ${inst} as ${style} ${slot} sits ${off.toFixed(1)} dB off`); }
  const cin = M.VOCAB.cinematic, own = tm(cin, "counter", { inst: "strings", role: "color" });
  assert.equal(own.stemTargets.counter, cin.stemTargets.counter + M.VOCAB_TARGET_FIX.cinematic.counter, "your own counter takes the slot's corrected target (-16.4, not -7.5)");
  const up = stem(tm(cin, "counter", { inst: "strings", role: "color", gainDb: 2 }), "counter") - stem(own, "counter"); assert(Math.abs(up - 2) < 0.05, `gainDb 2 = +2 dB (got ${up})`);
  pass(`your own voice (gainDb left out) sits at the slot's target within 3 dB: ${offs.join(", ")}; its target is the corrected one (cinematic counter ${own.stemTargets.counter.toFixed(1)}); gainDb: 2 = ${up.toFixed(2)} dB over`); }
// 10. Novelty: the copy Alex heard scores as a copy; the shipped demos stay apart; a reused fragment fails.
{ const d = M.novelty(M.daylightCopy(), M.DEMOS);
  assert(!d.pass && d.worst.name.startsWith("launchLofi") && d.worst.score > 0.6, `daylight copy scored ${d.worst.score} vs ${d.worst.name}`);
  pass(`novelty: Daylight vs ${d.worst.name} = ${d.worst.score} (threshold ${d.threshold}): FAIL, as Alex heard it`);
  let worst = { score: 0 };
  for (const n of Object.keys(M.DEMOS)) { const fam = Object.values(M.DEMO_FAMILIES).find((f) => f.includes(n)) ?? [n], v = M.novelty(M.DEMOS[n](), M.DEMOS, fam); assert(v.pass, `${n} vs ${v.worst.name} ${v.worst.score}`); if (v.worst.score > worst.score) worst = { ...v.worst, of: n }; }
  pass(`novelty: every demo vs every other demo passes (closest: ${worst.of} vs ${worst.name} ${worst.score})`);
  const quoted = M.composePiece({ ...M.testMaterial(M.VOCAB.playful, { bars: 4 }), sections: [{ kind: "hook", bars: 2, harmony: ["c0"], groove: null, lead: ["G5:1 B5:.5 C6:.5 B5:1 G5:1", "E5:1 G5:.5 A5:.5 G5:1 E5:1"] }] });
  const src = M.composePiece({ ...M.testMaterial(M.VOCAB.playful, { bars: 4 }), sections: [{ kind: "hook", bars: 2, harmony: ["c0"], groove: null, lead: ["D5:1 F#5:.5 G5:.5 F#5:1 D5:1", "B4:1 D5:.5 E5:.5 D5:1 B4:1"] }] });
  const r = M.novelty(quoted, { src: () => src }); assert(!r.pass && r.rows[0].reusedFragments > 0, "a transposed quote must be caught");
  pass(`novelty: a transposed 6-note quote of a shipped line fails (${r.rows[0].reusedFragments} reused fragments)`);
  // a shipped melody re-barred into 5/4 (each 4/4 bar gains a beat on its last note), transposed up a tone: its rhythm and bar
  // positions are new, its 6-note (interval, duration) fragments are broken, but its intervals are the tune: it must FAIL
  const rebar = (name) => { const src = M.DEMOS[name](), bpb = M.beatsPerBar(src.plan.meter), mel = src.parts.flatMap((p) => p.notes.filter((n) => n.role === "melody")).sort((a, b) => a.t - b.t), last = new Map();
    for (const n of mel) { const k = Math.floor(n.t / bpb + 1e-9); last.set(k, Math.max(last.get(k) ?? -1, n.t)); }
    const notes = mel.map((n) => { const k = Math.floor(n.t / bpb + 1e-9); return { ...n, p: n.p + 2, t: n.t + k, d: n.d + (n.t === last.get(k) ? 1 : 0) }; }), bars = Math.ceil((Math.max(...notes.map((n) => n.t + n.d)) + 1) / 5);
    return { title: "re-barred", seed: 5, tail: 1, harmony: [], parts: [{ id: "lead", inst: "piano", role: "melody", notes }], plan: { style: "folk", tempo: 90, meter: "5/4", sections: [{ id: "a", bars, mood: "calm", key: "D", mode: "major", melody: ["stepwise"], dyn: [0.6, 0.6] }] } }; };
  for (const name of ["launchLofi3", "nocturne"]) { const v = M.novelty(rebar(name), M.DEMOS), row = v.rows.find((x) => x.name === name);
    assert(!v.pass && row.quotedShapes > 0, `${name} re-barred into 5/4 passed (score ${row.score}, fragments ${row.reusedFragments}, shapes ${row.quotedShapes})`);
    pass(`novelty: ${name}'s melody re-barred into 5/4 and transposed FAILS (similarity only ${row.score}, 6-note fragments ${row.reusedFragments}, 8-note shapes quoted ${row.quotedShapes})`); } }

// 11. Speed without a changed bit: the voice cache and the parallel pool render exactly what a serial render does.
{ const p = M.composePiece(M.testMaterial(M.VOCAB.lofi, { bars: 4 })), cache = new Map(), fresh = md5(M.renderPiece(p, SR));
  assert.equal(md5(M.renderPiece(p, SR, { cache })), fresh); assert(cache.size > 3); assert.equal(md5(M.renderPiece(p, SR, { cache })), fresh, "a cache hit must be bit-identical");
  const r = M.renderPiece(p, SR, { cache }), a = M.maskingCheck(p, SR, { seconds: r.L.length / SR, tempo: r.tempo, perf: r.perf }), pl = M.maskingPlan(p, { seconds: r.L.length / SR, tempo: r.tempo, perf: r.perf, cache });
  assert.deepEqual(M.maskingFromBands(pl, Object.fromEntries(pl.roles.map((x) => [x, M.roleBandDb(p, SR, pl.opts(x), pl.spans)]))), a, "masking from cached role renders must equal the serial guard");
  const sel = new Float64Array(Array.from({ length: 999 }, (_, i) => Math.sin(i * 7.3) * 5)), sorted = [...sel].sort((x, y) => x - y); assert.equal(M.kth(Float64Array.from(sel), 999, 899), sorted[899]);
  pass(`voice cache: a hit renders bit-identically (md5 ${fresh.slice(0, 8)}), masking from cached role renders equals the serial guard; quickselect = sort`); }
// the master note names where its peak is: a spike planted on the lead at bar 3 beat 2 is found there, the lead named first
{ const p = M.composePiece(M.testMaterial(M.VOCAB.lofiElectronic, { bars: 4 })), r = M.renderPiece(p, SR, { stems: true }), bpb = M.beatsPerBar(p.plan.meter), at = Math.round(r.perf.sec(2 * bpb + 1) * SR);
  r.L[at] = 1.5; r.stems.lead[0][at] = 1.5; const pk = M.peakReport(r, SR);
  assert.equal(pk.bar, 3); assert.equal(pk.beat, 2); assert.equal(pk.parts[0].id, "lead"); assert(pk.parts[0].notes.length > 0);
  pass(`peak report: bar ${pk.bar} beat ${pk.beat}, ${pk.parts.map((x) => `${x.id}${x.notes.length ? ` ${x.notes.join(" ")}` : ""}`).join(", ")}`); }
{ const { spawnSync } = await import("node:child_process"), { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } = await import("node:fs");
  const dir = join(import.meta.dirname, "../out/music-unit"); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "x.wav"), "keep me");
  const run = spawnSync(process.execPath, [join(import.meta.dirname, "music.mjs"), "render", "lofiNostalgic", join(dir, "x.mp3"), "--seconds", "4", "--verify"], { encoding: "utf8" });
  const json = JSON.parse(run.stdout.slice(run.stdout.indexOf("{"), run.stdout.indexOf("\n}") + 2));
  assert.equal(readFileSync(join(dir, "x.wav"), "utf8"), "keep me", "rendering x.mp3 must never touch x.wav");
  assert(existsSync(join(dir, "x.mp3")) && readdirSync(dir).length === 2, `leftovers: ${readdirSync(dir).join(", ")}`);
  assert.equal(json.deterministic, true, "the parallel, cached render must equal a serial one bit for bit");
  pass("render x.mp3 leaves an existing x.wav alone (no temp left behind); the parallel cached render equals a serial one (--verify)"); }
console.log(`music unit: ${ok.length} checks PASS in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
