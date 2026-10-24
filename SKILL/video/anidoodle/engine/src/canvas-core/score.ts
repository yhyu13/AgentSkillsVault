// The scaffold score: an EMPTY composition. A new film starts with no notes at all, only the shape
// of what you will write: the style vocabulary, the mood, the tempo and key you choose, your own
// chords, motifs and form. Nothing here plays until you compose it (composePiece throws on missing
// material). Workflow: references/music/compose.md. Vocabularies: music/vocab.ts.
//
// CHANGE NOTE: this file used to hold a full C-major music-box piece. Films copied it, so it has been
// removed. No shipped film imported it. The butterfly film keeps its own score (example/.../alive/score.ts).
import type { Material } from "./music/compose";
import { composePiece } from "./music/compose";
import { filmAudio } from "./music/render";

/** Fill every field for THIS film. Placeholders are written as <angle brackets> and are rejected. */
export const scoreSkeleton = (): Material => ({
  style: "lofiElectronic", // a key of VOCAB, chosen from the brief (node tools/music.mjs vocab)
  title: "<this film's score>", seed: 0, mood: "calm", // your seed; a mood row that matches the brief
  bpm: 0, key: "<tonic>", mode: "major",
  chords: {}, // "<name>": { voicing: "[<notes>]", bass: "<one bar>" }
  motifs: {}, // "<motif>": "<bars of notation>"
  grooves: {}, // main: { family: "<one of the style's grooves>", density: 0.5, variation: 0.4 }
  sections: [], // { kind, bars, harmony: [...], lead: [...] } ... land the home chord on the picture's key beat
});

/** A film's `audio`: your composition, fitted to exactly the film's length (it ends on its phrase). */
export const filmScore = (m: Material, fps: number, frames: number) => {
  if (!m.bpm || /<|>/.test(JSON.stringify(m))) throw new Error("score.ts: the score is still a skeleton. Compose it (references/music/compose.md).");
  return filmAudio(composePiece(m), frames / fps);
};
