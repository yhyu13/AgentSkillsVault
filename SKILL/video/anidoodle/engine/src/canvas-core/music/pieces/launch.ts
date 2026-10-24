// THE LAUNCH TRACK, v4: the v3 sound (Alex: "more upbeat, clearer, less noisy") laid out bar for
// bar against the launch film. 90 bpm, so a bar is 80 frames at 30 fps and every section change
// below lands on a scene change in launch.ts. Upbeat chill electronic on the lo-fi electronic kit
// (lofiKit.ts): no electric piano, no vinyl, no bit-crush, a clean master, a tight detuned-saw pad
// pumping under the kick, a bright pluck lead through a dotted-eighth ping-pong delay, high sparkle
// plucks, a sine sub, a bouncy kick, a snare on 2 and 4 with rim ghosts, 16th hats. Levels were set
// by measuring each part (node tools/music.mjs stems) against published targets.
// Harmony: the ii-V-I-vi loop Dm9 G13 Cmaj9 Am9 from bar 2, every 4 bars, so bar 36 (the film's
// "All in pure code.") lands on Cmaj9, home, and the last bar holds it.
//
// BARS [film scene]: 0-1 intro pad [typing] · 2-6 groove [Generate, the koi draws] · 7-10 hook
// [it swims] · 11-13 hook + sparkle [the circle run] · 14-18 groove + hook [bricks, it flies] ·
// 19-22 B: half-time drums, no hook [Van Gogh] · 23-25 sparkle [the embroidery loop] · 26-29 groove
// [the live page] · 30-33 hook + sparkle [the film] · 34-35 breakdown, drums out [the reveal] ·
// 36 everything back [All in pure code.] · 37-38 outro, Cmaj9 held [the end card].
import { line, type Note, type Piece, type Role } from "../plan";
import { composePiece, type Material } from "../compose";

export const LAUNCH_BPM = 90, LAUNCH_BARS = 39;
const L = (t: number, s: string, role: Role, v = 0.7, extra: { roll?: number } = {}) => line(t, s, { role, v, bpb: 4, ...extra });
const DOTTED_EIGHTH = (60 / LAUNCH_BPM) * 0.75;
const inRanges = (b: number, rs: [number, number][]) => rs.some(([a, z]) => b >= a && b <= z);
// one part written a bar at a time: fn(bar, chord index in the loop, -1 in the intro) -> notation or null
const byBar = (role: Role, v: number, fn: (b: number, ci: number) => string | null, extra: { roll?: number } = {}): Note[] => {
  const out: Note[] = [];
  for (let b = 0; b < LAUNCH_BARS; b++) { const s = fn(b, b < 2 ? -1 : (b - 2) % 4); if (s) out.push(...L(b * 4, s, role, v, extra)); }
  return out;
};

const PAD = ["[F3 A3 C4 E4]", "[F3 B3 E4]", "[E3 G3 B3 D4]", "[E3 G3 B3 C4]"], PAD_INTRO = ["[E3 G3 B3 D4]", "[E3 G3 B3 C4]"];
const SUB = ["D2:3 r:.5 A1:.5", "G1:3 r:.5 D2:.5", "C2:3 r:.5 G1:.5", "A1:3 r:.5 E2:.5"], SUB_HOLD = ["D2:4", "G1:4", "C2:4", "A1:4"];
const HOOK = ["r:.5 A4:.5 C5:.5 E5:1 D5:.5 C5:1", "r:.5 B4:.5 D5:.5 E5:.5 D5:1 B4:1", "r:.5 G4:.5 B4:.5 D5:1 E5:.5 G5:1", "E5:1.5 D5:.5 C5:1 r:1"];
const SPARK = ["r:1 E6:.5 D6:.5 C6:2", "r:1 B5:.5 D6:.5 E6:2", "r:1 G5:.5 B5:.5 D6:2", "E6:1 D6:1 C6:2"];
const KICK = ["C4:1.5 C4:1@.75 C4:1.5@.9", "C4:1.5 C4:.5@.6 C4:.5@.7 C4:1.25@.9 C4:.25@.5"];
const HATS = Array.from({ length: 16 }, (_, i) => `C4:.25@${[0.85, 0.35, 0.6, 0.4][i % 4]}`).join(" ");

// v5: cut 2 (Alex: "very slow... it can be pretty much around a minute"). 26 bars, 69.3 s.
// BARS [scene]: 0-1 intro pad [the logo, typing] · 2-3 groove [Generate, the koi draws] · 4-6 hook
// [make it swim] · 7-9 hook + sparkle [the 31-style wall] · 10-12 hook [bricks, it flies] · 13-14
// half-time [Van Gogh] · 15 sparkle [the embroidery loop] · 16-20 groove, hook from 18 [the website] ·
// 21 sparkle [the film] · 22-23 breakdown, drums out [the five words] · 24 everything back, Cmaj9
// [All in pure code.] · 25 held home [the end card].
export const LAUNCH2_BARS = 26;
export const launchLofi2 = (): Piece => shipped(launchLofi2Raw());
const launchLofi2Raw = (): Piece => {
  const B = LAUNCH2_BARS, last = B - 1, ci = (b: number) => (b < 2 ? -1 : (b - 2) % 4);
  const bars = (fn: (b: number, c: number) => string | null, role: Role, v: number, extra: { roll?: number } = {}): Note[] => { const out: Note[] = []; for (let b = 0; b < B; b++) { const x = fn(b, ci(b)); if (x) out.push(...L(b * 4, x, role, v, extra)); } return out; };
  const full: [number, number][] = [[2, 12], [15, 21], [24, 24]], half: [number, number][] = [[13, 14]];
  const pad = bars((b, c) => (b === last ? `${PAD[2]}:4@.75` : c < 0 ? `${PAD_INTRO[b]}:4@.8` : `${PAD[c]}:4`), "accomp", 0.62, { roll: 0.03 });
  const sub = bars((b, c) => (c < 0 || inRanges(b, [[22, 23]]) ? null : b === last ? "C2:4" : SUB[c]), "bass", 0.85);
  const kick = bars((b) => (inRanges(b, full) ? KICK[b % 2] : inRanges(b, half) ? "C4:2 r:2" : null), "drum", 0.85);
  const snare = bars((b) => (inRanges(b, full) ? "r:1 C4:2 C4:1" : inRanges(b, half) ? "r:2 C4:2" : null), "drum", 0.7);
  const ghost = bars((b) => (inRanges(b, full) ? (b % 2 ? "r:1.75 C4:.25@.45 r:2" : "r:3.75 C4:.25@.5") : null), "drum", 0.5);
  const hats = bars((b) => (inRanges(b, full) ? HATS : inRanges(b, half) ? "C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35" : null), "drum", 0.5);
  const lead = bars((b, c) => (inRanges(b, [[4, 12], [18, 20], [24, 24]]) ? HOOK[c] : b === last ? "C5:4" : null), "melody", 0.72);
  const sparkle = bars((b, c) => (inRanges(b, [[7, 9], [15, 15], [21, 23]]) ? SPARK[c] : null), "color", 0.5);
  const harmony = Array.from({ length: B }, (_, b) => ({ t: b * 4, name: b < 2 ? ["Cmaj9", "Am9"][b] : b === last ? "Cmaj9" : ["Dm9", "G13", "Cmaj9", "Am9"][(b - 2) % 4] }));
  const base = launchLofi();
  return { ...base, title: "anidoodle launch, cut 2", harmony, plan: { ...base.plan, sections: [{ ...base.plan.sections[0], bars: B }] },
    parts: base.parts.map((pt) => ({ ...pt, notes: ({ pad, lead, sparkle, sub, kick, snare, ghost, hat: hats } as Record<string, Note[]>)[pt.id] })) };
};


// v6: cut 3, the words in their own frames (Alex: "text must be a frame: white, big animated text,
// then the show"). 29 bars, 77.3 s. The loop is re-phased so bar 26, the claim, is Cmaj9.
// BARS [scene]: 0-1 intro [logo, typing] · 2-5 groove [Generate, the koi and its code] · 6-7 hook
// [NO IMAGE MODEL, make it swim, ANIMATIONS, it swims] · 8-10 hook + sparkle [31 STYLES, the wall] ·
// 11-13 hook [bricks] · 14-15 half-time [Van Gogh] · 16 sparkle [LOOPS] · 17-21 groove, hook from
// 19 [INTERACTIVE, the site] · 22-23 sparkle [FILMS, the film] · 24-25 breakdown [the five words] ·
// 26 everything back [All in pure code.] · 27-28 home [the end card].
// Written as composed material on the lo-fi electronic vocabulary (compose.ts); its audio is
// bit-identical to the hand-written v6 (md5 of renderPiece at 48 kHz d20789f2344e6fff0d2a380c7c7825d2,
// guarded by tools/music-unit.mjs). This is OUR film's score: a demo, never a template (the novelty
// gate fails any film that reuses it).
export const LAUNCH3_BARS = 29;
export const launchLofi3Material = (): Material => {
  const hk = (i: number) => `hook${i}`, sp = (i: number) => `spark${i}`;
  return {
    style: "lofiElectronic", title: "anidoodle launch, cut 3", seed: 2027, legacy: true, mood: "calm", bpm: LAUNCH_BPM, key: "C", mode: "major", swing: 0.54, tail: 3.2,
    chords: { Dm9: { voicing: PAD[0], bass: SUB[0] }, G13: { voicing: PAD[1], bass: SUB[1] }, Cmaj9: { voicing: PAD[2], bass: SUB[2] }, Am9: { voicing: PAD[3], bass: SUB[3] } },
    motifs: Object.fromEntries([...HOOK.map((h, i) => [hk(i), h]), ...SPARK.map((x, i) => [sp(i), x])]),
    grooves: {
      main: { kick: [KICK[0], KICK[1]], snare: ["r:1 C4:2 C4:1"], ghost: ["r:3.75 C4:.25@.5", "r:1.75 C4:.25@.45 r:2"], hat: [HATS], cycle: "piece" },
      half: { kick: ["C4:2 r:2"], snare: ["r:2 C4:2"], hat: ["C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35"], cycle: "piece" },
    },
    sections: [
      { kind: "intro", bars: 2, harmony: ["Cmaj9", "Am9"], chordVel: 0.8 },
      { kind: "groove", bars: 4, harmony: ["Cmaj9", "Am9", "Dm9", "G13"] },
      { kind: "hook", bars: 2, harmony: ["Cmaj9", "Am9"], lead: [hk(2), hk(3)] },
      { kind: "hook", bars: 3, harmony: ["Dm9", "G13", "Cmaj9"], lead: [hk(0), hk(1), hk(2)], counter: [sp(0), sp(1), sp(2)] },
      { kind: "hook", bars: 3, harmony: ["Am9", "Dm9", "G13"], lead: [hk(3), hk(0), hk(1)] },
      { kind: "half", bars: 2, harmony: ["Cmaj9", "Am9"] },
      { kind: "groove", bars: 1, harmony: ["Dm9"], counter: [sp(0)] },
      { kind: "groove", bars: 2, harmony: ["G13", "Cmaj9"] },
      { kind: "hook", bars: 3, harmony: ["Am9", "Dm9", "G13"], lead: [hk(3), hk(0), hk(1)] },
      { kind: "groove", bars: 2, harmony: ["Cmaj9", "Am9"], counter: [sp(2), sp(3)] },
      { kind: "breakdown", bars: 2, harmony: ["Dm9", "G13"], counter: [sp(0), sp(1)] },
      { kind: "drop", bars: 1, id: "claim", harmony: ["Cmaj9"], lead: [hk(2)] },
      { kind: "outro", bars: 2, harmony: ["Cmaj9"], chordVel: 0.75, bass: "C2:4", lead: ["r:4", "C5:4"] },
    ],
  };
};
/** The shipped launch films render with the pre-rebuild voices, bit-for-bit (SOUND-BRIEF legacy freeze); refits and short forms keep the flag. */
const shipped = (p: Piece): Piece => ({ ...p, legacy: true, refit: p.refit && ((s: number) => shipped(p.refit!(s))), shortForm: p.shortForm && (() => shipped(p.shortForm!())) });
export const launchLofi3 = (): Piece => shipped(composePiece(launchLofi3Material()));

export const launchLofi = (): Piece => shipped(launchLofiRaw());
const launchLofiRaw = (): Piece => {
  const full: [number, number][] = [[2, 18], [23, 33], [36, 36]], half: [number, number][] = [[19, 22]], last = LAUNCH_BARS - 1;
  const pad = byBar("accomp", 0.62, (b, ci) => (b === last ? `${PAD[2]}:4@.75` : ci < 0 ? `${PAD_INTRO[b]}:4@.8` : `${PAD[ci]}:4`), { roll: 0.03 });
  const sub = byBar("bass", 0.85, (b, ci) => (ci < 0 || inRanges(b, [[34, 35]]) ? null : b === last ? "C2:4" : b >= 37 ? SUB_HOLD[ci] : SUB[ci]));
  const kick = byBar("drum", 0.85, (b) => (inRanges(b, full) ? KICK[b % 2] : inRanges(b, half) ? "C4:2 r:2" : null));
  const snare = byBar("drum", 0.7, (b) => (inRanges(b, full) ? "r:1 C4:2 C4:1" : inRanges(b, half) ? "r:2 C4:2" : null));
  const ghost = byBar("drum", 0.5, (b) => (inRanges(b, full) ? (b % 2 ? "r:1.75 C4:.25@.45 r:2" : "r:3.75 C4:.25@.5") : null));
  const hats = byBar("drum", 0.5, (b) => (inRanges(b, full) ? HATS : inRanges(b, half) ? "C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35" : null));
  const lead = byBar("melody", 0.72, (b, ci) => (inRanges(b, [[7, 18], [30, 33], [36, 36]]) ? HOOK[ci] : b === last ? "C5:4" : b === 37 ? "E5:2 D5:2" : null));
  const sparkle = byBar("color", 0.5, (b, ci) => (inRanges(b, [[11, 13], [23, 25], [30, 35]]) ? SPARK[ci] : null));
  const harmony = Array.from({ length: LAUNCH_BARS }, (_, b) => ({ t: b * 4, name: b < 2 ? ["Cmaj9", "Am9"][b] : b === last ? "Cmaj9" : ["Dm9", "G13", "Cmaj9", "Am9"][(b - 2) % 4] }));
  return {
    title: "anidoodle launch, upbeat chill electronic", seed: 2027, tail: 3.2, harmony,
    plan: { style: "lofi", tempo: LAUNCH_BPM, meter: "4/4", swing: 0.54, ritard: 0.92, sections: [{ id: "a", bars: LAUNCH_BARS, mood: "calm", key: "C", mode: "major", melody: ["stepwise", "hook"], dyn: [0.62, 0.66], ending: "tail", repeatable: false }] },
    parts: [
      { id: "pad", inst: "warmPad", role: "accomp", notes: pad, gainDb: -3, opts: { cut: 2600, attack: 0.5, release: 1.4, spread: 0.55 }, send: 0.35 },
      { id: "lead", inst: "softPluck", role: "melody", notes: lead, gainDb: 6, opts: { decay: 0.42, bright: 6000, delay: DOTTED_EIGHTH, feedback: 0.28, delayMix: 0.24 }, send: 0.25 },
      { id: "sparkle", inst: "softPluck", role: "color", notes: sparkle, gainDb: 8, opts: { decay: 0.35, bright: 5200, pan: 0.35, delay: DOTTED_EIGHTH, feedback: 0.3, delayMix: 0.35 }, send: 0.6 },
      { id: "sub", inst: "sub", role: "bass", notes: sub, gainDb: -6, opts: { cut: 150 } },
      { id: "kick", inst: "kick", role: "drum", notes: kick, gainDb: 0.5, send: 0.1 },
      { id: "snare", inst: "snare", role: "drum", notes: snare, gainDb: 8, send: 0.3 },
      { id: "ghost", inst: "snare", role: "drum", notes: ghost, opts: { rim: true }, gainDb: 4, send: 0.2 },
      { id: "hat", inst: "hat", role: "drum", notes: hats, opts: { pan: 0.25 }, gainDb: 20, send: 0.1 },
    ],
    fx: { clean: true, duck: { by: "kick", parts: ["pad", "sparkle"], depth: 0.38, release: 0.24 }, tape: { wowCents: 2.5, wowHz: 0.4, flutterCents: 0, flutterHz: 6, drive: 1.02 } },
  };
};
