// LAUNCH EXAMPLE. A 16-second launch film for a made-up product, built only from the template: two
// prompts answered by two plates drawing themselves, one type frame, the end card on bar 4.
// Copying it: everything here is a PLACEHOLDER. The lighthouse and fox are stock style plates
// standing in; your film's plates are drawn fresh for YOUR product's subject, in the style recipe
// the brief chose (references/styles.md). The film is silent because a score is composed per
// product (references/music/compose.md); pass that piece as `score`. bpm comes from the brief.
//   node tools/still.mjs launchExample --frame 0      the first frame is the thumbnail: check it
//   node tools/render.mjs launchExample
import { C } from "./launchKit";
import { makeLaunchFilm } from "./launchTemplate";
import { lighthouseDraw } from "./lighthouseDraw";
import { foxDraw } from "./foxDraw";

export const launchExample = makeLaunchFilm({
  title: "Your Product",
  subtitle: "the one line it lives by",
  placeholder: "Ask for anything…",
  asks: [
    { prompt: "a lighthouse at sunset, as a print", plate: lighthouseDraw, label: "print · drawn in code" },
    { prompt: "now a fox at dusk", plate: foxDraw, label: "a second answer, same thread" },
  ],
  words: [[{ text: "IDEA IN.", style: "ink", color: C.ink }, { text: "ART OUT.", style: "ink", color: C.accent }]],
  tagline: "One sentence that says what it is",
  install: ["npm install your-product", "your-product init"],
  footer: "yourproduct.example",
  bpm: 90, askBeats: 6, typeBeats: 4, endBeats: 8, claimBar: 4,
  score: null, // silent: compose this product's own score and pass it here
});
