// STYLE VOCABULARIES. A style is a vocabulary, never notes: the sound palette (a voice per slot,
// with levels and stem targets), the groove families that fit it, its harmony language, its melody
// rules, its arrangement grammar, and how five MOOD controls turn into real parameters. The composer
// (the model) writes every note: harmony, bass lines, motifs, form (compose.ts, references/music/compose.md).
// Nothing here is a melody, a progression or a riff, and nothing here should ever become one.
import type { InstId, Role, PieceFx, Meter } from "./plan";
import type { ModeId } from "./theory";
import type { MoodId, StyleId } from "./tables";
import type { GrooveFamily } from "./grooves";
import { VOCAB_MORE } from "./vocabMore";

/** Voice slots. Line slots (the composer writes them): chords, bass, lead, counter, arp. Drum slots are filled by a groove. */
export type Slot = "chords" | "lead" | "counter" | "bass" | "kick" | "snare" | "ghost" | "hat" | "arp" | "perc";
export const BASE_SLOTS: Slot[] = ["chords", "lead", "counter", "bass", "kick", "snare", "ghost", "hat"];
export const EXTRA_SLOTS: Slot[] = ["arp", "perc"];
/** opts values "beats:x" are resolved to x beats in seconds at the piece's tempo (delay times). */
export type Voice = { inst: InstId; role: Role; gainDb: number; opts?: Record<string, number | boolean | string>; send?: number; pan?: number };
/** Five mood controls, each 0..1, 0.5 = the calibrated palette unchanged. */
export type MoodControls = { energy?: number; warmth?: number; brightness?: number; tension?: number; space?: number };

export type SectionKind = "intro" | "verse" | "groove" | "hook" | "build" | "half" | "breakdown" | "drop" | "bridge" | "swell" | "breath" | "outro";
/** Arrangement grammar: which layers a section kind lets sound, and the groove it asks for by default. Lines sound only where written. */
export const KINDS: Record<SectionKind, { drums: "main" | "half" | "build" | null; bass: boolean; what: string }> = {
  intro: { drums: null, bass: false, what: "chords (and any line you write) without drums or bass: set the colour, state the key" },
  verse: { drums: "main", bass: true, what: "the groove under a lighter line: room for picture and words" },
  groove: { drums: "main", bass: true, what: "chords, bass, drums: the bed, no lead unless you write one" },
  hook: { drums: "main", bass: true, what: "full groove under the motif: the memorable part" },
  build: { drums: "build", bass: true, what: "rising density (snare 8ths to 16ths), rising line, lands on the next downbeat" },
  half: { drums: "half", bass: true, what: "half-time drums: the same tempo feels slower (a scene change, a breath with pulse)" },
  breakdown: { drums: null, bass: false, what: "drums and bass out, chords and a thin line: the held breath before a landing" },
  drop: { drums: "main", bass: true, what: "everything back on a strong chord: the landing, put it on the picture's key beat" },
  bridge: { drums: "main", bass: true, what: "new harmony away from home (a borrowed or relative area) before the return" },
  swell: { drums: null, bass: true, what: "long notes crescendo over 2-8 bars (orchestral swell), peaks on the downbeat after" },
  breath: { drums: null, bass: false, what: "near silence: one held chord or nothing, authored (max 2 bars)" },
  outro: { drums: null, bass: true, what: "home chord held, the motif's last word, then the tail" },
};

export type StyleVocab = {
  id: StyleId; name: string; atmosphere: string; tempo: [number, number]; meters: Meter[]; swing: [number, number];
  palette: Partial<Record<Slot, Voice>>; alternates: Partial<Record<Slot, Record<string, Voice>>>;
  fx: PieceFx; stemTargets: Record<string, number>; calibrated: boolean;
  grooves: GrooveFamily[]; moods: MoodId[];
  harmony: { modes: ModeId[]; qualities: string; tendencies: string; rhythm: string; voicing: string; tension: string };
  melody: { range: string; contour: string; density: string; motif: string };
  arrangement: { shape: string; transitions: string; endings: string };
  avoid: string;
};

const bassDelay = (x: number) => `beats:${x}`;
export const VOCAB: Partial<Record<StyleId, StyleVocab>> = {
  lofiElectronic: {
    id: "lofiElectronic", name: "lo-fi electronic", atmosphere: "warm, chill but upbeat, clean: a breathing pad, a plucked hook through ping-pong echoes, a round sub, a bouncy kit",
    tempo: [80, 100], meters: ["4/4"], swing: [0.52, 0.56],
    palette: {
      chords: { inst: "warmPad", role: "accomp", gainDb: -3, opts: { cut: 2600, attack: 0.5, release: 1.4, spread: 0.55 }, send: 0.35 },
      lead: { inst: "softPluck", role: "melody", gainDb: 6, opts: { decay: 0.42, bright: 6000, delay: bassDelay(0.75), feedback: 0.28, delayMix: 0.24 }, send: 0.25 },
      counter: { inst: "softPluck", role: "color", gainDb: 8, opts: { decay: 0.35, bright: 5200, pan: 0.35, delay: bassDelay(0.75), feedback: 0.3, delayMix: 0.35 }, send: 0.6 },
      bass: { inst: "sub", role: "bass", gainDb: -6, opts: { cut: 150 } },
      kick: { inst: "kick", role: "drum", gainDb: 0.5, send: 0.1 },
      snare: { inst: "snare", role: "drum", gainDb: 8, send: 0.3 },
      ghost: { inst: "snare", role: "drum", gainDb: 4, opts: { rim: true }, send: 0.2 },
      hat: { inst: "hat", role: "drum", gainDb: 20, opts: { pan: 0.25 }, send: 0.1 },
      arp: { inst: "softPluck", role: "accomp", gainDb: 4, opts: { decay: 0.22, bright: 3800, pan: -0.3, delay: bassDelay(0.5), feedback: 0.2, delayMix: 0.2 }, send: 0.3 },
      perc: { inst: "hat", role: "drum", gainDb: 14, opts: { pan: -0.3 }, send: 0.2 },
    },
    alternates: {
      lead: { bell: { inst: "fmBell", role: "melody", gainDb: 0, opts: { ratio: 3.5 }, send: 0.3 }, mallet: { inst: "marimba", role: "melody", gainDb: 2, send: 0.25 }, guitar: { inst: "guitar", role: "melody", gainDb: 2, send: 0.25 } },
      chords: { strings: { inst: "strings", role: "accomp", gainDb: -6, opts: { attack: 0.35, release: 1.0, bright: 0.8 }, send: 0.35 }, piano: { inst: "piano", role: "accomp", gainDb: -4, send: 0.3 } },
      bass: { warm: { inst: "bass", role: "bass", gainDb: -2, opts: { drive: 1.4 } } },
    },
    fx: { clean: true, duck: { by: "kick", parts: ["chords", "counter"], depth: 0.38, release: 0.24 }, tape: { wowCents: 2.5, wowHz: 0.4, flutterCents: 0, flutterHz: 6, drive: 1.02 } },
    stemTargets: { kick: -14.5, snare: -19, hat: -24.5, bass: -18.5, chords: -22, lead: -15.5, counter: -20 }, calibrated: true,
    grooves: ["bounce", "halfTime", "broken", "skip", "pulse", "build"], moods: ["calm", "joy", "hopeful", "nostalgic", "wistful", "curious"],
    harmony: { modes: ["major", "dorian", "lydian", "aeolian", "mixolydian"], qualities: "7ths, 9ths, 11ths and 13ths; add9; sus2/sus4 for air; avoid bare triads except on the landing",
      tendencies: "loops of 2, 4 or 8 bars; ii-V motion, IV-iii-vi drifts, modal vamps (i-IV in dorian, I-II in lydian), borrowed iv or bVII for a wistful turn; the home chord arrives on a structural beat",
      rhythm: "one chord per bar or two per bar; the change can anticipate the bar by an eighth", voicing: "rootless 3-4 note voicings between E3 and E4 moving by step (common tones held); the bass owns the root",
      tension: "sus4 and 13ths lean, maj7#11 floats, a dominant 7b9 or a borrowed iv aches; release by resolving the lean voice down a step" },
    melody: { range: "C4-A5 for the lead, the octave above for counter lines", contour: "short arches; the high point in the second half of a phrase; answer phrases end lower", density: "1-3 notes per beat; leave rests so the echo answers",
      motif: "a 2-5 note cell with its own rhythm; repeat it, then vary it (shift it up a step, invert the last interval, displace it by an eighth); call and response between lead and counter" },
    arrangement: { shape: "intro -> groove -> hook -> (half-time or breakdown) -> drop on home -> outro; add or remove one layer at a time", transitions: "a fill bar, a half-time bar, drums out for a breakdown, then everything back on a downbeat", endings: "home chord held with the motif's last note, or a clean button on 1" },
    avoid: "synth ePiano, vinyl crackle, bit-crush, a dark master low-pass: that is dusty lo-fi hip-hop, not clean electronic",
  },
  drive: {
    id: "drive", name: "driving electronic", atmosphere: "forward, bright, confident: four-on-the-floor, a pumping supersaw bed, a gritty bass line, a plucked arp",
    tempo: [110, 140], meters: ["4/4"], swing: [0.5, 0.52],
    palette: {
      chords: { inst: "strings", role: "accomp", gainDb: -8, opts: { attack: 0.25, release: 0.5, bright: 1.3, width: 0.95, grid: true }, send: 0.3 },
      lead: { inst: "strings", role: "melody", gainDb: -2, opts: { attack: 0.012, release: 0.15, bright: 1.8, width: 0.4, grid: true }, send: 0.25 },
      counter: { inst: "fmBell", role: "color", gainDb: -6, opts: { ratio: 3.5 }, send: 0.4 },
      bass: { inst: "bass", role: "bass", gainDb: -3, opts: { kind: "synth", drive: 2.4, grid: true } },
      kick: { inst: "kick", role: "drum", gainDb: 2, opts: { soft: 0.3, grid: true }, send: 0 },
      snare: { inst: "snare", role: "drum", gainDb: 2, opts: { grid: true }, send: 0.4 },
      ghost: { inst: "snare", role: "drum", gainDb: -2, opts: { rim: true, grid: true }, send: 0.2 },
      hat: { inst: "hat", role: "drum", gainDb: 12, opts: { pan: 0.2, grid: true }, send: 0.1 },
      arp: { inst: "softPluck", role: "accomp", gainDb: 3, opts: { decay: 0.2, bright: 5000, delay: bassDelay(0.75), feedback: 0.3, delayMix: 0.25, grid: true }, send: 0.25 },
      perc: { inst: "hat", role: "drum", gainDb: 10, opts: { pan: -0.2, grid: true }, send: 0.15 },
    },
    alternates: { lead: { pluck: { inst: "softPluck", role: "melody", gainDb: 5, opts: { decay: 0.3, bright: 7000, delay: bassDelay(0.75), feedback: 0.3, delayMix: 0.25 }, send: 0.25 } }, bass: { sub: { inst: "sub", role: "bass", gainDb: -5, opts: { cut: 160 } } } },
    fx: { clean: true, duck: { by: "kick", parts: ["chords", "arp", "counter"], depth: 0.55, release: 0.2 } },
    stemTargets: { kick: -12.5, snare: -17, hat: -26, perc: -26, bass: -16, chords: -23, lead: -16, arp: -20.5, counter: -19.5 }, calibrated: false,
    grooves: ["fourFloor", "broken", "build", "halfTime", "tension"], moods: ["drive", "triumph", "tension", "joy", "awe"],
    harmony: { modes: ["aeolian", "dorian", "mixolydian", "major"], qualities: "triads and power voicings, sus2, add9; minor with a major IV (dorian) for lift", tendencies: "i-VI-III-VII, i-v-VI-IV, bVI-bVII-i climbs; long pedal tones under changing chords; a key lift of a step for the last chorus",
      rhythm: "one chord per bar or per two bars; stabs on off-beats", voicing: "wide: root-fifth-octave low, tight triads above C4; the bass line is 8ths or offbeat", tension: "a pedal under a moving chord, a build that withholds the kick, a riser into a drop; release on the downbeat with everything" },
    melody: { range: "A3-E6", contour: "repeated cells climbing by step; big leaps at the drop", density: "8ths and 16ths; arps in 3-note cells across 4/4 (hemiola)", motif: "a rhythmic riff of 3-6 notes, repeated with the last note changed; sequence it up the scale in the build" },
    arrangement: { shape: "intro (filtered) -> build -> drop -> breakdown -> build -> bigger drop -> outro", transitions: "builds of 4-8 bars, a one-beat breath before the drop", endings: "a button on 1 or a filtered fade of the groove" },
    avoid: "swing, soft attacks on the lead, more than 4 layers in the breakdown",
  },
  cinematic: {
    id: "cinematic", name: "cinematic / orchestral", atmosphere: "wide and emotional: string swells, low ostinatos for tension, harp and bell colour, a low boom on the arrival",
    tempo: [60, 120], meters: ["4/4", "3/4", "6/8"], swing: [0.5, 0.5],
    palette: {
      chords: { inst: "strings", role: "accomp", gainDb: -4, opts: { attack: 1.1, release: 1.6, bright: 0.9 }, send: 0.5 },
      lead: { inst: "strings", role: "melody", gainDb: 0, opts: { attack: 0.18, release: 0.9, bright: 1.1, width: 0.4 }, send: 0.45 },
      counter: { inst: "harp", role: "color", gainDb: 0, send: 0.5 },
      bass: { inst: "strings", role: "bass", gainDb: -3, opts: { attack: 0.6, release: 1.4, bass: true, bright: 0.6 }, send: 0.35 },
      arp: { inst: "strings", role: "accomp", gainDb: -4, opts: { attack: 0.01, release: 0.12, bright: 1.2, width: 0.6 }, send: 0.3 },
      kick: { inst: "kick", role: "drum", gainDb: 2, opts: { soft: 1 }, send: 0.6 },
      snare: { inst: "snare", role: "drum", gainDb: -2, send: 0.6 },
      ghost: { inst: "snare", role: "drum", gainDb: -4, opts: { rim: true }, send: 0.5 },
      hat: { inst: "hat", role: "drum", gainDb: 6, send: 0.4 },
      perc: { inst: "fmBell", role: "color", gainDb: -8, opts: { ratio: 2.4 }, send: 0.6 },
    },
    alternates: { lead: { piano: { inst: "piano", role: "melody", gainDb: 0, send: 0.4 }, bell: { inst: "fmBell", role: "melody", gainDb: -4, send: 0.5 }, celesta: { inst: "celesta", role: "melody", gainDb: 0, send: 0.5 } }, counter: { piano: { inst: "piano", role: "color", gainDb: -3, send: 0.4 } } },
    fx: {},
    stemTargets: { chords: -18.5, bass: -19.5, lead: -17, counter: -7.5, arp: -21.5, kick: -16.5, snare: -24, hat: -32 }, calibrated: false,
    grooves: ["pulse", "tension", "build", "halfTime"], moods: ["awe", "triumph", "tension", "melancholy", "hopeful", "dread"],
    harmony: { modes: ["aeolian", "harmonicMinor", "lydian", "major", "phrygian", "dorian"], qualities: "open fifths, add9, sus2/sus4, minor with a major IV; chromatic mediants (C to E, C to Ab) for awe",
      tendencies: "slow harmonic rhythm (1-2 bars per chord); i-bVI-bVII-i for epic, i-iv-V for drama, lydian II for wonder, a pedal bass under moving chords for tension; big arrivals on chromatic mediants",
      rhythm: "one chord per 1-2 bars; tension sections hold one chord over an ostinato", voicing: "spread wide: bass octaves below C3, open fifths, the melody doubled an octave on the climax (stagger the bass to keep peaks musical)",
      tension: "minor seconds against a pedal, a b6 leaning to 5, suspended 4ths held long, harmonic minor's raised 7th; release to a major chord or a picardy third" },
    melody: { range: "G3-C6 (strings), harp and bell above", contour: "long arcs over 4-8 bars, a big leap (6th, octave) then stepwise fall", density: "0.5-2 notes per beat; tension ostinatos 2-4 per beat", motif: "a 3-4 note idea that returns transformed: augmented (slower) at the climax, in the bass for menace, in the harp for tenderness" },
    arrangement: { shape: "intro (a colour, a drone) -> theme -> swell/build -> climax on the key picture beat -> release -> quiet coda", transitions: "crescendo over 4-8 bars; a breath of silence before the arrival; a low boom on the downbeat", endings: "a held chord ringing into the tail, or a hard-out on the cut" },
    avoid: "more than four families at once outside the climax; fast drums under a tender theme",
  },
  ambient: {
    id: "ambient", name: "airy ambient", atmosphere: "floating, spacious, luminous: long pads, bells and plucks with space around them, a soft heartbeat at most",
    tempo: [50, 80], meters: ["4/4", "3/4"], swing: [0.5, 0.5],
    palette: {
      chords: { inst: "warmPad", role: "accomp", gainDb: -1, opts: { cut: 3400, attack: 1.6, release: 3.0, spread: 1.0, width: 1 }, send: 0.7 },
      lead: { inst: "fmBell", role: "melody", gainDb: 0, opts: { ratio: 3.5, width: 0.6 }, send: 0.7 },
      counter: { inst: "softPluck", role: "color", gainDb: 6, opts: { decay: 0.6, bright: 4200, pan: -0.35, delay: bassDelay(1.5), feedback: 0.4, delayMix: 0.4 }, send: 0.8 },
      bass: { inst: "sub", role: "bass", gainDb: -8, opts: { cut: 120 } },
      arp: { inst: "celesta", role: "accomp", gainDb: -4, send: 0.7 },
      kick: { inst: "kick", role: "drum", gainDb: -4, opts: { soft: 1 }, send: 0.3 },
      ghost: { inst: "snare", role: "drum", gainDb: -6, opts: { rim: true }, send: 0.6 },
      hat: { inst: "hat", role: "drum", gainDb: 6, send: 0.5 },
      perc: { inst: "hat", role: "drum", gainDb: 4, opts: { pan: -0.4 }, send: 0.6 },
    },
    alternates: { lead: { pluck: { inst: "softPluck", role: "melody", gainDb: 5, opts: { decay: 0.8, bright: 3800, delay: bassDelay(1.5), feedback: 0.4, delayMix: 0.4 }, send: 0.7 }, vibes: { inst: "vibes", role: "melody", gainDb: 0, send: 0.6 } } },
    fx: { clean: true, tape: { wowCents: 4, wowHz: 0.25, flutterCents: 0, flutterHz: 6, drive: 1.0 } },
    stemTargets: { chords: -20, bass: -22, lead: -17.5, counter: -26.5, arp: -23.5, kick: -20.5, hat: -32 }, calibrated: false,
    grooves: ["pulse", "brushes"], moods: ["awe", "calm", "hopeful", "tender", "dread"],
    harmony: { modes: ["lydian", "major", "dorian", "majorPentatonic", "aeolian"], qualities: "maj7, add9, maj7#11, sus2, quartal stacks (4ths)", tendencies: "two-chord oscillations (I-II lydian, i-IV dorian), planing (the same shape moved by step), a pedal note held through changes",
      rhythm: "slow: one chord per 2-4 bars", voicing: "wide and open, high register, no thirds low; let voices ring", tension: "a #11 or a 9 against the root; release by the melody settling on the fifth or the root" },
    melody: { range: "C5-C7 bells, pluck echoes above", contour: "sparse, falling phrases of 2-5 notes; rests as long as the notes", density: "0.25-1 note per beat, but a motif at least every 8 bars (the ghost guard)", motif: "a 3-note bell figure that returns, echoed by the pluck at a new register" },
    arrangement: { shape: "slow evolution: add one layer every 4-8 bars, take one away before the end", transitions: "crossfades; a pad change on a bar line", endings: "the motif once more, alone, into the tail" },
    avoid: "formlessness: sustained pads with no onsets and no cadence (the ghost failure); run the guards",
  },
  folk: {
    id: "folk", name: "tender acoustic", atmosphere: "intimate and warm: fingerpicked guitar, soft piano, a harp or celesta line, brushes",
    tempo: [60, 110], meters: ["6/8", "3/4", "4/4"], swing: [0.5, 0.54],
    palette: {
      chords: { inst: "piano", role: "accomp", gainDb: -5, send: 0.35 },
      arp: { inst: "guitar", role: "accomp", gainDb: -4, send: 0.3 },
      lead: { inst: "harp", role: "melody", gainDb: 2, send: 0.35 },
      counter: { inst: "celesta", role: "color", gainDb: -3, send: 0.4 },
      bass: { inst: "bass", role: "bass", gainDb: -6, opts: { kind: "upright", drive: 1.1 } },
      kick: { inst: "kick", role: "drum", gainDb: -4, opts: { soft: 1 }, send: 0.2 },
      snare: { inst: "snare", role: "drum", gainDb: -6, opts: { rim: true }, send: 0.4 },
      ghost: { inst: "snare", role: "drum", gainDb: -6, opts: { rim: true }, send: 0.4 },
      hat: { inst: "hat", role: "drum", gainDb: 2, send: 0.3 },
      perc: { inst: "hat", role: "drum", gainDb: 2, opts: { pan: -0.3 }, send: 0.3 },
    },
    alternates: { lead: { piano: { inst: "piano", role: "melody", gainDb: 0, send: 0.3 }, guitar: { inst: "guitar", role: "melody", gainDb: 2, send: 0.3 }, strings: { inst: "strings", role: "melody", gainDb: -2, opts: { attack: 0.2, release: 0.8 }, send: 0.4 } }, chords: { strings: { inst: "strings", role: "accomp", gainDb: -8, opts: { attack: 0.8, release: 1.2, bright: 0.7 }, send: 0.4 } } },
    fx: {},
    stemTargets: { chords: -19.5, arp: -20.5, lead: -13, counter: -19.5, bass: -21, kick: -20.5, snare: -26, ghost: -24.5, hat: -30, perc: -30 }, calibrated: false,
    grooves: ["brushes", "pulse", "shuffle"], moods: ["tender", "calm", "wistful", "nostalgic", "hopeful", "romantic"],
    harmony: { modes: ["major", "mixolydian", "dorian", "majorPentatonic", "aeolian"], qualities: "triads, add9, sus2, slash chords with a walking bass (I - V/7 - vi)", tendencies: "I-V/7-vi-IV descents, bVII-IV-I (mixolydian), plagal IV-I endings, a relative minor detour",
      rhythm: "one chord per bar in 6/8 or 3/4; two per bar in 4/4", voicing: "guitar-shaped: root-fifth-tenth, open strings ringing; piano in the middle, melody on top", tension: "a suspended 4th resolving, a IV minor (iv) borrowed for the ache; release plagal (IV-I)" },
    melody: { range: "D4-G5, singable (a 10th at most)", contour: "stepwise with one leap per phrase, rising question, falling answer", density: "1-2 notes per beat, a held note at each phrase end", motif: "a singable 4-bar phrase; the answer repeats its start and changes its end" },
    arrangement: { shape: "guitar alone -> + melody -> + piano and bass -> + counter line -> thin to guitar and melody for the end", transitions: "a pickup note into each phrase; a bar of guitar alone between verses", endings: "plagal cadence, a rolled final chord" },
    avoid: "four-on-the-floor, heavy drums, synth pads, fast arpeggios that bury the melody",
  },
  playful: {
    id: "playful", name: "playful / bouncy", atmosphere: "light, cheeky, springy: marimba and pizzicato-like plucks, a bouncy bass, a skipping kit",
    tempo: [100, 150], meters: ["4/4", "6/8"], swing: [0.5, 0.6],
    palette: {
      lead: { inst: "marimba", role: "melody", gainDb: 2, send: 0.25 },
      chords: { inst: "vibes", role: "accomp", gainDb: -6, opts: { trem: 4.5 }, send: 0.3 },
      arp: { inst: "harp", role: "accomp", gainDb: -4, send: 0.25 },
      counter: { inst: "celesta", role: "color", gainDb: -2, send: 0.35 },
      bass: { inst: "bass", role: "bass", gainDb: -3, opts: { drive: 1.8 } },
      kick: { inst: "kick", role: "drum", gainDb: 0, opts: { soft: 0.6 }, send: 0.1 },
      snare: { inst: "snare", role: "drum", gainDb: 3, send: 0.25 },
      ghost: { inst: "snare", role: "drum", gainDb: 0, opts: { rim: true }, send: 0.2 },
      hat: { inst: "hat", role: "drum", gainDb: 12, send: 0.1 },
      perc: { inst: "hat", role: "drum", gainDb: 10, opts: { pan: -0.35 }, send: 0.15 },
    },
    alternates: { lead: { chip: { inst: "pulse", role: "melody", gainDb: -4, opts: { duty: 0.25 } }, pluck: { inst: "softPluck", role: "melody", gainDb: 5, opts: { decay: 0.2, bright: 6000 } }, bell: { inst: "fmBell", role: "melody", gainDb: -2 } }, bass: { tuba: { inst: "sub", role: "bass", gainDb: -4, opts: { cut: 220 } } } },
    fx: { clean: true },
    stemTargets: { lead: -13, chords: -21, arp: -20, counter: -18.5, bass: -18, kick: -15.5, snare: -20, ghost: -26, hat: -24, perc: -29.5 }, calibrated: false,
    grooves: ["skip", "shuffle", "bounce", "fourFloor"], moods: ["playful", "joy", "curious"],
    harmony: { modes: ["major", "mixolydian", "majorPentatonic", "lydian", "blues"], qualities: "triads and 6ths, dominant 7ths, chromatic passing chords (a diminished between I and ii)", tendencies: "fast harmonic rhythm (2 chords a bar), I-vi-ii-V turnarounds, secondary dominants (V/V), a surprise bVI",
      rhythm: "two chords per bar, on-beat stabs", voicing: "close, mid-high; the bass bounces root-fifth (oom-pah) or walks", tension: "a chromatic approach note, a held dominant with a pause; release with a cheeky button" },
    melody: { range: "C4-C7 (mallets love the top)", contour: "leaps and staccato repeated notes; zig-zags; grace-note slides", density: "2-4 notes per beat, with sudden rests (comic timing)", motif: "a 3-note staccato cell with a leap; answer it lower, then sequence it" },
    arrangement: { shape: "short sections (4-8 bars), stop-time breaks, call and response between lead and counter", transitions: "a stop (all out for a beat), a drum fill, a key lift", endings: "a button: a short tutti hit on 1, sometimes after a comic pause" },
    avoid: "long pads, slow tempo, minor-key sustained melodies",
  },
};

/** Resolve a voice: "beats:x" opts to seconds at this tempo. */
export const resolveVoice = (v: Voice, bpm: number): Voice => {
  if (!v.opts) return v;
  const o: Record<string, number | boolean | string> = {};
  for (const [k, x] of Object.entries(v.opts)) o[k] = typeof x === "string" && x.startsWith("beats:") ? (60 / bpm) * Number(x.slice(6)) : x;
  return { ...v, opts: o };
};

/**
 * The mood controls as real parameters. 0.5 on every control = the palette as calibrated (exactly).
 *   energy     groove density, drum level, duck depth, section dynamics
 *   warmth     filters darker, tape drive and wow up, bass up a little
 *   brightness filters and pluck brightness open, hats up
 *   tension    pad detune wider, strings attack shorter, lead decay shorter (the harmony is yours to tense)
 *   space      reverb sends, delay mix and pad release longer
 */
export const moodVoice = (slot: Slot, v: Voice, m: Required<MoodControls>): { voice: Voice; dGain: number } => {
  const o = { ...(v.opts ?? {}) }, e = m.energy - 0.5, w = m.warmth - 0.5, b = m.brightness - 0.5, t = m.tension - 0.5, s = m.space - 0.5;
  const tone = Math.pow(2, b * 1.2 - w * 0.8);
  const mul = (k: string, f: number) => { if (typeof o[k] === "number") o[k] = (o[k] as number) * f; };
  mul("cut", tone); mul("bright", tone); mul("spread", 1 + t * 1.2); mul("release", 1 + s * 0.8); mul("delayMix", 1 + s * 0.8);
  if (v.inst === "strings") mul("attack", 1 - t * 0.8);
  if (slot === "lead" || slot === "counter") mul("decay", 1 - t * 0.5);
  let dGain = 0;
  if (["kick", "snare", "ghost", "hat", "perc"].includes(slot)) dGain += e * 4;
  if (slot === "hat" || slot === "perc") dGain += b * 4;
  if (slot === "bass") dGain += w * 2;
  const send = v.send === undefined ? undefined : Math.min(1.2, v.send * Math.pow(2, s * 2));
  return { voice: { ...v, opts: o, send, gainDb: v.gainDb + dGain }, dGain };
};
export const moodFx = (fx: PieceFx, m: Required<MoodControls>): PieceFx => {
  const e = m.energy - 0.5, w = m.warmth - 0.5, t = m.tension - 0.5;
  return { ...fx, duck: fx.duck && { ...fx.duck, depth: Math.min(0.8, (fx.duck.depth ?? 0.4) * (1 + e * 0.6)) }, tape: fx.tape ? { ...fx.tape, drive: (fx.tape.drive ?? 1.25) + w * 0.3, wowCents: (fx.tape.wowCents ?? 7) * (1 + w + t * 0.5) } : undefined };
};
export const fullMood = (m: MoodControls): Required<MoodControls> => ({ energy: m.energy ?? 0.5, warmth: m.warmth ?? 0.5, brightness: m.brightness ?? 0.5, tension: m.tension ?? 0.5, space: m.space ?? 0.5 });

for (const v of VOCAB_MORE) VOCAB[v.id] = v;
