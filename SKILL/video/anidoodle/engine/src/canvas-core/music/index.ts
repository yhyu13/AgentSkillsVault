// anidoodle music: notes as data, modeled voices and optional banks of real recordings.
export * from "./sampler";
export { registerRoom, roomFor, clearRooms } from "./mixReverb";
export * from "./theory";
export * from "./tables";
export * from "./plan";
export * from "./perform";
export * from "./piano";
export * from "./render";
export { kth } from "./mixDsp";
export * from "./meter";
export * from "./guards";
export * from "./score-text";
export * from "./grooves";
export * from "./vocab";
export * from "./vocabTrim";
export * from "./vocabVoices";
export * from "./compose";
export * from "./novelty";
export * from "./craft";
export * from "./arc";
export * from "./craftTables";
export * from "./calibration";
export * as instruments from "./instruments";
export * from "./sfx";
export * as orchestra from "./orchestra";
export * as lofiFx from "./lofiFx";
export { MIX_PROFILES, FEELS, mixProfile, describeMix, type MixProfile, type Feel } from "./mixProfiles";
export * as drums from "./drums";
import { nocturne, pianoPhrase8 } from "./pieces/nocturne";
import { launchLofi, launchLofi2, launchLofi3, launchLofi3Material } from "./pieces/launch";
import { musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic } from "./pieces/samplers";
import { marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm } from "./pieces/families";
import { ghostFixture } from "./pieces/fixtures";
import { daylightCopy, daylightCopyMaterial } from "./pieces/copyFixture";
export { launchLofi, launchLofi2, launchLofi3, launchLofi3Material, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm, ghostFixture, daylightCopy, daylightCopyMaterial };
/**
 * SHIPPED MUSIC: the demos (one per style/mood, written to prove the synth and the meters) and our own
 * film's scores. They are listening references and the novelty corpus, NEVER a film's score: a new
 * film composes its own (references/music/compose.md) and `novelty` fails it if it sounds like these.
 */
export const DEMOS = { launchLofi, launchLofi2, launchLofi3, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm };
/** Families: cuts of one score (compared to each other they are the same music, by design). */
export const DEMO_FAMILIES: Record<string, string[]> = { launch: ["launchLofi", "launchLofi2", "launchLofi3"], nocturne: ["nocturne", "pianoPhrase8"] };
/** Test fixtures, never scores: the ghost (must fail the ghost guard), the copy (must fail novelty). */
export const FIXTURES = { ghostFixture, daylightCopy };
export * from "./keys";
