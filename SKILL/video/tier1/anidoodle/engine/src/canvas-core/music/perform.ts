// Performance: written notes (beats) -> played key presses (seconds). This is where "MIDI" stops.
// Rules from music-performance research (Todd 1992; the KTH rule system, Friberg, Bresin and
// Sundberg 2006; Repp on melody lead and pedalling). All randomness from rng(seed), smoothed so
// deviations correlate across a phrase instead of jittering note to note.
import { beatsPerBar, type Piece, type Note, type Role } from "./plan";
import { clamp, gauss } from "./dsp";
import type { KeyPress, PedalSpan } from "./piano";
import { rng as mkRng } from "../core";
import { FEELS, mixProfile, type Lane } from "./mixProfiles";

/**
 * Sound-v2 hooks every voice may read (legacy pieces never get them): `tone` 0..1 = velocity through
 * the style's tone curve (brightness, attack hardness, partial mix should follow it, not only level);
 * `vary` = this note's own seeded micro-variation (anti-clone): cents, dB, brightness and decay
 * factors, a start phase 0..1 and an integer seed for the voice's own noise.
 */
export type NoteVary = { cents: number; db: number; bright: number; decay: number; phase: number; seed: number };
export type Played = KeyPress & { role: Role; kind?: string; w: number /* written velocity */; tone?: number; vary?: NoteVary; lane?: Lane };
export type PerformOpts = { expressive: boolean; flatVelocity?: number };
export type Performance = { parts: { id: string; keys: Played[] }[]; pedal: PedalSpan[]; sec: (beat: number) => number; lastOnset: number; meanLeadMs: number };

/** Which feel lane a part plays: the compose slot name when it is one, else from the instrument and role. */
export const laneOf = (id: string, inst: string, role: Role, rim = false): Lane => {
  const slots: Lane[] = ["kick", "snare", "ghost", "hat", "perc", "bass", "chords", "lead", "counter", "arp"];
  if ((slots as string[]).includes(id)) return id as Lane;
  if (inst === "kick") return "kick"; if (inst === "snare") return rim ? "ghost" : "snare"; if (inst === "hat" || inst === "noiseDrum") return "hat";
  return role === "bass" ? "bass" : role === "melody" ? "lead" : role === "accomp" || role === "inner" ? "chords" : role === "drum" ? "perc" : "counter";
};
const arch = (x: number) => Math.sin(Math.PI * Math.pow(clamp(x, 0, 1), 1.45)); // peaks near 0.62 of the phrase

export const perform = (p: Piece, tempo: number, o: PerformOpts): Performance => {
  const plan = p.plan, bpb = beatsPerBar(plan.meter), pick = plan.pickupBeats ?? 0, phraseB = (plan.phraseBars ?? 4) * bpb;
  const totalBeats = plan.sections.reduce((a, s) => a + s.bars * bpb, 0);
  // section spans and the dynamic level curve
  const spans: { a: number; b: number; dyn: [number, number] }[] = []; { let b = 0; for (const s of plan.sections) { spans.push({ a: b, b: b + s.bars * bpb, dyn: s.dyn }); b += s.bars * bpb; } }
  const level = (b: number) => { for (const s of spans) if (b < s.b) { const x = clamp((b - s.a) / (s.b - s.a), 0, 1); return s.dyn[0] + (s.dyn[1] - s.dyn[0]) * x; } return spans[spans.length - 1].dyn[1]; };
  // caesura: a breath before a sudden hush (next section starts far quieter than this one ended)
  const breaths: { at: number; beats: number }[] = [];
  if (o.expressive) for (let i = 1; i < spans.length; i++) if (spans[i].dyn[0] < 0.6 * spans[i - 1].dyn[1]) breaths.push({ at: spans[i].a, beats: 0.4 });
  // tempo factor per beat (>1 = faster)
  const lastMel = Math.max(...p.parts.flatMap((pt) => pt.notes.map((n) => n.t)));
  const ritBeats = Math.min(2 * bpb, 6, Math.max(1, 0.25 * (totalBeats + pick))), ritFrom = lastMel - ritBeats;
  const factor = (b: number) => {
    if (!o.expressive) return 1;
    const x = ((b + pick) % phraseB) / phraseB;
    const rub = plan.rubato ?? (plan.style === "nocturne" || plan.style === "cinematic" ? 1 : 0), w = plan.ritard ?? 0.55;
    let f = 1 + rub * (0.05 * arch(x) - 0.025);
    if (b > ritFrom && w < 1) { const u = clamp((b - ritFrom) / ritBeats, 0, 1), q = 2.5; f *= Math.pow(1 + (Math.pow(w, q) - 1) * u, 1 / q); }
    return f;
  };
  const step = 1 / 96, b0 = -pick - 1, b1 = totalBeats + 16, spb = 60 / tempo;
  const tab = new Float64Array(Math.ceil((b1 - b0) / step) + 2); let acc = 0;
  for (let i = 0; i < tab.length; i++) { tab[i] = acc; const b = b0 + i * step; acc += (spb / factor(b)) * step; for (const br of breaths) if (Math.abs(b - br.at) < step / 2) acc += br.beats * spb; }
  const lead = pick > 0 ? 0.25 : 0.0; // a hair of silence before the first note
  const secRaw = (b: number) => { const f = (b - b0) / step, i = Math.floor(f), u = f - i; const a = tab[clamp(i, 0, tab.length - 1)], c = tab[clamp(i + 1, 0, tab.length - 1)]; return a + (c - a) * u; };
  const start = secRaw(-pick);
  const sec = (b: number) => secRaw(b) - start + lead;
  const swing = plan.swing ?? 0.5;
  const sw = (b: number) => { if (swing === 0.5) return b; const fl = Math.floor(b), fr = b - fl; return fl + (fr <= 0.5 ? fr * (swing / 0.5) : swing + (fr - 0.5) * ((1 - swing) / 0.5)); };

  // sound v2: the style's FEEL (mixProfiles.ts). Legacy pieces (the shipped launch score) keep the old single AR(1) drift, bit for bit.
  const v2 = !p.legacy, feel = FEELS[mixProfile(plan.style, p.mix).feel];
  const RoleGain: Record<Role, number> = { melody: 1, inner: 0.55, bass: 0.68, accomp: 0.52, color: 0.7, drum: 1 }; // voicing: melody 6-10 dB over the rest
  let leadSum = 0, leadN = 0;
  const parts = p.parts.map((pt, pi) => {
    const hr = mkRng(p.seed * 131 + pi * 17 + 1), grid = pt.opts?.grid === true, isPiano = pt.inst === "piano";
    let tDev = 0, vDev = 0; // AR(1) states
    // v2: humanize (phrase-correlated drift) and jitter (per-note error) are separate, per lane, drums apart from pitched parts
    const lane = laneOf(pt.id, pt.inst, pt.role, pt.opts?.rim === true), drum = pt.role === "drum", hz = drum ? feel.drum : feel.pitched;
    const laneOff = v2 && !isPiano ? (feel.lanes[lane] ?? 0) / 1000 : 0, /* grid parts keep the programmed nudge, never the human drift */ vr = mkRng(p.seed * 977 + pi * 31 + 7), jr = mkRng(p.seed * 613 + pi * 43 + 3);
    let drift = 0, noteIdx = 0, vRel = 0;
    const notes = pt.notes.slice().sort((a, b) => a.t - b.t || a.p - b.p);
    // group simultaneous onsets (chords) for spread/roll
    const keys: Played[] = [];
    const melodyNext = (n: Note, i: number) => { for (let j = i + 1; j < notes.length; j++) if (notes[j].t > n.t + 1e-6) return notes[j].t; return Infinity; };
    let lastT = -1e9, chordIdx = 0;
    notes.forEach((n, i) => {
      if (Math.abs(n.t - lastT) > 1e-6) {
        chordIdx = 0; lastT = n.t;
        if (o.expressive && !grid) {
          if (!v2 || isPiano) { tDev = 0.85 * tDev + Math.sqrt(1 - 0.85 * 0.85) * gauss(hr) * 0.007; vDev = 0.7 * vDev + Math.sqrt(1 - 0.49) * gauss(hr) * 0.035; }
          else {
            const c = hz.corr; tDev = c * tDev + Math.sqrt(1 - c * c) * gauss(hr) * (hz.humanizeMs / 1000); vRel = 0.7 * vRel + Math.sqrt(1 - 0.49) * gauss(hr) * feel.velHumanize; // relative: a soft ghost moves as many dB as an accent
            if (lane === "hat" && feel.hatDriftMs) drift = 0.97 * drift + Math.sqrt(1 - 0.97 * 0.97) * gauss(hr) * (feel.hatDriftMs / 1000);
          }
        }
      } else chordIdx++;
      let t = sec(sw(n.t)), end = sec(sw(n.t + n.d));
      let v: number;
      if (!o.expressive) { v = o.flatVelocity ?? 0.6; }
      else {
        const x = ((n.t + pick) % phraseB) / phraseB, lv = level(n.t);
        const metric = Math.abs(n.t - Math.round(n.t / bpb) * bpb) < 1e-6 ? 1.06 : Math.abs(n.t - Math.round(n.t)) < 1e-6 ? 1 : 0.95;
        const hi = n.role === "melody" ? 1 + 0.06 * ((n.p - 72) / 12) : 1;
        // written v 0.7 = mezzo; section level 0..1 maps to 0.25..0.85 of full velocity
        v = (n.v / 0.7) * (0.25 + 0.6 * lv) * (0.92 + 0.16 * arch(x)) * (grid ? 1 : metric * hi) * (isPiano ? RoleGain[n.role] : 1 / (0.25 + 0.6 * 0.75)) + vDev;
        if (n.t > ritFrom && !plan.loop) v *= 1 - 0.18 * clamp((n.t - ritFrom) / ritBeats, 0, 1); // the cadence relaxes
        t += tDev;
        if (v2 && !isPiano) { t += laneOff; if (!grid) { t += drift + gauss(jr) * (hz.jitterMs / 1000); v *= 1 + vRel + gauss(jr) * feel.velJitter; } }
        if (n.role === "melody" && isPiano) { const ld = 0.012 + 0.016 * clamp(v, 0, 1); t -= ld; leadSum += ld; leadN++; }
        if (n.roll !== undefined) t += chordIdx * n.roll; else if (chordIdx > 0 && !grid) t += chordIdx * 0.004;
        // legato: melody keys overlap the next note by ~35 ms; accompaniment keys lift a little early (the pedal holds)
        if (n.role === "melody" && isPiano) { const nx = melodyNext(n, i); if (Number.isFinite(nx) && Math.abs(nx - (n.t + n.d)) < 1e-6) end = sec(sw(nx)) + 0.035; }
        else if (isPiano) end = t + (end - t) * 0.92;
      }
      const key: Played = { t: Math.max(0, t), off: Math.max(t + 0.03, end), p: n.p, v: clamp(v, 0.03, 1), role: n.role, kind: n.kind, w: n.v };
      if (v2) { key.tone = Math.pow(key.v, feel.toneGamma); key.lane = lane; key.vary = { cents: gauss(vr) * 3, db: gauss(vr) * 0.7, bright: 1 + gauss(vr) * 0.06, decay: 1 + gauss(vr) * 0.1, phase: vr(), seed: (p.seed * 7919 + pi * 104729 + noteIdx * 31) >>> 0 }; noteIdx++; }
      keys.push(key);
    });
    return { id: pt.id, keys };
  });
  // pedal: lift just after each harmony change, catch again ~110 ms later (legato pedalling)
  const pedal: PedalSpan[] = [];
  if (o.expressive && p.harmony.length) {
    const ch = p.harmony.slice().sort((a, b) => a.t - b.t);
    for (let i = 0; i < ch.length; i++) {
      const down = sec(sw(ch[i].t)) + 0.11, up = i + 1 < ch.length ? sec(sw(ch[i + 1].t)) + 0.03 : 1e9;
      pedal.push([down, up]);
    }
  }
  const lastOnset = Math.max(...parts.flatMap((pp) => pp.keys.map((k) => k.t)));
  return { parts, pedal, sec: (b) => sec(sw(b)), lastOnset, meanLeadMs: leadN ? (leadSum / leadN) * 1000 : 0 };
};
