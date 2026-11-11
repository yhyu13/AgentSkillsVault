// "Measured physics" for the keys voices: small numeric tables fitted OFFLINE from CC0 recordings.
// Nothing recorded ships or plays: the engine synthesizes every sample; these are only numbers.
//
// PROVENANCE (all tables below unless a table says otherwise)
//   Source   VCSL, the Versilian Community Sample Library, github.com/sgossner/VCSL, CC0 1.0 Universal
//   Fitter   tools/keys-fit.py (numpy): comb search + least squares for (f0, B), per-partial Hann DFT
//            tracks for levels and two-stage decays, prominence peak picking + T60 slopes for bars
//   Date     2026-09-28, track S3 (keys)
// VCSL names its mallet/chime files an octave below the sounding pitch (marimba "C4" sounds 524 Hz);
// the ratios below are relative to the SOUNDING fundamental.

/** Half-octave band centres (Hz) for the piano spectral envelopes. */
export const PIANO_BANDS = [30, 42, 60, 85, 120, 170, 240, 339, 480, 679, 960, 1358, 1920, 2715, 3840, 5431, 7680, 10861, 15360];

/**
 * Steinway B grand, "NoSus Close" layers vl2 (p), vl3 (mf), vl4 (ff), files JHPiano_NoSus_Close_<note>_vl<k>_rr1.wav.
 * Row: [midi, inharmonicity B, { layer: attack level (dB re loudest partial) of the partials at each band }].
 * Envelope = per-partial attack levels (first 150 ms), local-max smoothed above partial 4 so the strike-point
 * notches of that one key do not bleed into its neighbours (the engine adds its own strike comb).
 */
export const GRAND_ENV: [number, number, Record<number, number[]>][] = [
  [24, 0.000218, { 2: [-32, -26, -15, -5, -6, -10, -13, -21, -28, -42, -39, -51, -75, -77, -83, -82, -84, -90, -90], 4: [-36, -26, -13, -3, -7, -7, -6, -6, -9, -7, -9, -13, -37, -53, -48, -58, -90, -90, -90] }],
  [30, 0.000126, { 2: [-29, -29, -18, -3, -5, -3, -2, -16, -20, -30, -37, -52, -61, -68, -74, -71, -74, -82, -90], 4: [-38, -38, -23, -4, -6, -3, 0, -11, -9, -14, -6, -8, -21, -35, -51, -67, -90, -90, -90] }],
  [36, 0.000151, { 2: [-2, -2, -2, -1, 0, -1, -5, -2, -3, -7, -8, -25, -28, -63, -73, -70, -73, -73, -84], 4: [-2, -2, -2, -2, -2, -2, -8, -1, -2, -3, -2, -10, -7, -34, -44, -62, -76, -88, -90] }],
  [42, 0.00016, { 2: [0, 0, 0, 0, 0, 0, -5, -3, -4, -18, -24, -39, -54, -59, -76, -76, -78, -74, -88], 4: [-2, -2, -2, -2, -2, -1, -4, -2, -2, -11, -10, -17, -23, -27, -29, -60, -84, -90, -90] }],
  [48, 0.000125, { 2: [-8, -8, -8, -8, -8, -13, -19, -7, -9, -14, -26, -35, -54, -65, -73, -76, -78, -77, -87], 3: [-10, -10, -10, -10, -10, -14, -18, -7, -9, -14, -19, -23, -28, -37, -49, -70, -90, -90, -90], 4: [-11, -11, -11, -11, -11, -15, -20, -7, -8, -13, -19, -19, -22, -29, -36, -45, -69, -90, -90] }],
  [54, 0.000209, { 2: [-8, -8, -8, -8, -8, -8, -5, -1, -9, -18, -20, -35, -44, -57, -69, -65, -78, -76, -89], 4: [-10, -10, -10, -10, -10, -10, -6, -1, -7, -13, -11, -10, -12, -20, -24, -37, -52, -84, -90] }],
  [60, 0.000353, { 2: [0, 0, 0, 0, 0, 0, 0, -4, -9, -15, -18, -22, -35, -60, -68, -78, -78, -76, -86], 3: [0, 0, 0, 0, 0, 0, 0, -2, -6, -10, -7, -6, -20, -32, -41, -56, -88, -88, -90], 4: [0, 0, 0, 0, 0, 0, 0, -2, -6, -12, -8, -5, -14, -20, -23, -29, -43, -55, -66] }],
  [66, 0.000726, { 2: [0, 0, 0, 0, 0, 0, 0, 0, -1, -3, -12, -26, -30, -33, -57, -53, -79, -78, -89], 4: [0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -6, -16, -18, -21, -25, -26, -53, -61, -70] }],
  [72, 0.0012, { 2: [0, 0, 0, 0, 0, 0, 0, 0, 0, -6, -13, -20, -32, -35, -47, -70, -70, -76, -85], 3: [0, 0, 0, 0, 0, 0, 0, 0, 0, -3, -7, -8, -16, -20, -27, -55, -64, -78, -90], 4: [0, 0, 0, 0, 0, 0, 0, 0, 0, -2, -5, -3, -8, -12, -18, -29, -41, -59, -76] }],
  [78, 0.00191, { 2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8, -19, -30, -46, -52, -61, -73, -74, -85], 4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -4, -10, -14, -22, -26, -32, -56, -69, -81] }],
  [84, 0.00351, { 2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -9, -21, -32, -45, -50, -69, -76, -88], 4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5, -11, -21, -28, -28, -36, -48, -60] }],
  [90, 0.00527, { 2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -12, -29, -40, -56, -64, -88, -90], 4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -13, -29, -38, -49, -54, -64, -78] }],
  [96, 0.011, { 2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -12, -29, -51, -71, -76, -83], 4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -6, -13, -29, -45, -49, -58] }],
];
/** VCSL layer -> our velocity 0..1 (vl1 is not in the Steinway set; vl2 plays like p, vl4 like ff). */
export const GRAND_LAYER_V: Record<number, number> = { 2: 0.35, 3: 0.62, 4: 0.92 };

/**
 * Steinway B decay, fitted per note (median of partials 1-3 over the three layers) and smoothed across
 * neighbours: [midi, prompt T60 s, aftersound T60 s, aftersound level dB re attack]. The prompt sound is
 * the unison strings in phase (energy leaves fast through the bridge); the aftersound is what is left
 * once they drift out of phase (Weinreich 1977). Raw fits: C1 10.5/30, F#1 9.6/39, C2 5.6/67, F#2 2.3/35,
 * C3 6.7/30, F#3 4.6/24, C4 2.1/15, F#4 2.8/15, C5 1.1/14, F#5 0.75/12.5, C6 0.79/6.8, F#6 0.89/5.8, C7 -/4.0.
 */
export const GRAND_DECAY: [number, number, number, number][] = [
  [21, 10, 30, -12], [24, 9.5, 32, -12], [30, 8, 36, -14], [36, 6, 40, -20], [42, 4.6, 34, -21], [48, 4.8, 30, -19],
  [54, 3.8, 24, -21], [60, 2.3, 16, -18], [66, 2.1, 15, -22], [72, 1.2, 13.5, -19], [78, 0.9, 11, -22], [84, 0.8, 7, -23],
  [90, 0.7, 5.5, -25], [96, 0.5, 3.8, -25], [108, 0.35, 2.2, -25],
];

/** Tuned bars and tubes: [ratio to the sounding fundamental, level dB re fundamental, T60 s at the measured pitch]. */
export type ModeRow = [number, number, number];
/** Marimba (rosewood, tuned 1:4:10), Marimba_hit_Outrigger_C2_loud_01 (sounds C3 130.9 Hz): 4.007x -20.4 dB T60 2.5 s, 10.08x -28.8 dB 0.47 s; fundamental T60 8.6 s at 131 Hz, 2.2 s at 525 Hz (C4_med), 0.51 s at 2094 Hz (C6_med). */
export const MARIMBA: ModeRow[] = [[1, 0, 8.6], [4.007, -20.4, 2.5], [10.08, -28.8, 0.47]];
export const MARIMBA_T60_REF_HZ = 131;
/** Vibraphone (aluminium, tuned 1:4:10.4), Vibes_hard_C3_v2 (sounds C4 261.4 Hz): 3.998x -25.6 dB T60 2.9 s, 10.41x -29.2 dB 0.65 s, fundamental 8.5 s. */
export const VIBES: ModeRow[] = [[1, 0, 8.5], [3.998, -25.6, 2.9], [10.41, -29.2, 0.65]];
export const VIBES_T60_REF_HZ = 261;
/** Glockenspiel (steel bars, hard mallets), glock_medium_G4 / glock_loud_C5 / glock_loud_C6, ratios re the sounding fundamental (two octaves over the label). */
export const GLOCK: ModeRow[] = [[1, 0, 8.7], [2.94, -23, 1.3], [3.93, -30, 5.5], [5.62, -20, 1.0], [8.94, -21, 1.6], [11.1, -36, 0.6]];
export const GLOCK_T60_REF_HZ = 1053;
/** Tubular bells, chimes_C4_ff_rr2 (strike note C5 525 Hz is the virtual pitch of modes 3-5, ~2:3:4). */
export const CHIME: ModeRow[] = [[0.632, -14.7, 25], [1.227, 0, 60], [2.0, -15.9, 15], [2.921, 0, 7], [3.977, -5.5, 3.05], [5.142, -14.6, 1.6]];
export const CHIME_T60_REF_HZ = 525;
/**
 * Pipe organ, VCSL "Pipe Organ" (harmonic levels dB re the loudest, from the peak-picked spectrum of the steady tone):
 *   PLENUM  Rode_Man3Open_C4 (open principal chorus with mixture): harmonics 1-16
 *   FLUTE   NT5_Man3Quiet_C4 (stopped flute: odd harmonics lead, 3rd at -10 dB)
 */
export const PIPE_PLENUM: [number, number][] = [[1, -6.7], [2, -2.7], [3, -3.5], [4, 0], [5, -17.2], [6, -4.5], [7, -15.7], [8, -6.2], [10, -17.5], [12, -14.2], [16, -13.5]];
export const PIPE_FLUTE: [number, number][] = [[1, 0], [2, -23.3], [3, -10.2], [4, -26.5], [5, -45.3], [6, -38.3]];
