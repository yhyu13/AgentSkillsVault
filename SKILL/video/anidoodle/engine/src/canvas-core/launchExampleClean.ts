// LAUNCH EXAMPLE, CLEAN. The same template in its second look (preset "clean": a quiet canvas, one
// accent, type as the design) for a UI-first product, at 60 fps. Three asks of the other kinds:
//   1 the product's own UI from data: the ask typed into its command bar, its action pressed, every
//     row springing from the before state to the after state;
//   2 a split feature beat: words in their own column, the live UI beside them (above them on a phone);
//   3 another of the product's own screens, its reports, with its words beside it: every ask shows
//     THIS product (a film ask, kind "film", plays any film in a card the same way).
// Everything here is a PLACEHOLDER for a made-up product; your film's UI data comes from YOUR
// product (its real screens, its real states), and its score is composed for its brief.
//   node tools/launch.mjs ship launchExampleClean --shapes 16x9,9x16
import { makeLaunchFilm } from "./launchTemplate";
import type { ProductUI } from "./productUI";

const inbox: ProductUI = {
  title: "Tally", nav: ["Inbox", "Books", "Reports"], action: "Match all", command: "Ask Tally…",
  before: {
    stats: [{ label: "Unmatched", value: 14 }, { label: "Matched", value: 32 }],
    items: [
      { id: "a", label: "Design tool, Sep", value: "$144", tag: "no receipt" },
      { id: "b", label: "Cloud hosting, Sep", value: "$1,208", tag: "no receipt" },
      { id: "c", label: "Team lunch, Thu", value: "$86", tag: "no receipt" },
      { id: "d", label: "Train to Leeds", value: "$42", tag: "no receipt" },
    ],
  },
  after: {
    stats: [{ label: "Unmatched", value: 0 }, { label: "Matched", value: 46 }],
    items: [
      { id: "b", label: "Cloud hosting, Sep", value: "$1,208", tag: "matched", done: true, accent: true },
      { id: "a", label: "Design tool, Sep", value: "$144", tag: "matched", done: true },
      { id: "c", label: "Team lunch, Thu", value: "$86", tag: "matched", done: true },
      { id: "d", label: "Train to Leeds", value: "$42", tag: "matched", done: true },
    ],
  },
};
const books: ProductUI = {
  title: "Tally", nav: ["Books", "Reports"], action: "Close month", layout: "cards",
  before: { items: [
    { id: "r", label: "Revenue", value: 61, unit: "%", bar: 0.61 }, { id: "c", label: "Costs", value: 48, unit: "%", bar: 0.48 },
    { id: "p", label: "Payroll", value: 70, unit: "%", bar: 0.7 }, { id: "t", label: "Tax", value: 12, unit: "%", bar: 0.12 },
  ] },
  after: { items: [
    { id: "r", label: "Revenue", value: 100, unit: "%", bar: 1, accent: true }, { id: "c", label: "Costs", value: 100, unit: "%", bar: 1 },
    { id: "p", label: "Payroll", value: 100, unit: "%", bar: 1 }, { id: "t", label: "Tax", value: 100, unit: "%", bar: 1 },
  ] },
};

const reports: ProductUI = {
  title: "Tally", nav: ["Reports", "Books"], action: "Explain",
  before: { items: [
    { id: "p", label: "Payroll", value: "$48,200", bar: 0.62 }, { id: "h", label: "Cloud hosting", value: "$1,208", bar: 0.31 },
    { id: "t", label: "Travel", value: "$640", bar: 0.18 }, { id: "d", label: "Design tools", value: "$144", bar: 0.08 },
  ] },
  after: { items: [
    { id: "h", label: "Cloud hosting", value: "$1,208", bar: 0.31, tag: "up 18 %", accent: true }, { id: "p", label: "Payroll", value: "$48,200", bar: 0.62, tag: "as planned" },
    { id: "t", label: "Travel", value: "$640", bar: 0.18 }, { id: "d", label: "Design tools", value: "$144", bar: 0.08 },
  ] },
};

export const launchExampleClean = makeLaunchFilm({
  title: "Tally", preset: "clean", fps: 60,
  asks: [
    { kind: "ui", ui: inbox, prompt: "match every receipt from September" },
    { kind: "ui", ui: books, split: [{ text: "Books close", style: "ink", color: "#15161a" }, { text: "themselves.", style: "ink", color: "#2f54eb" }] },
    { kind: "ui", ui: reports, split: [{ text: "And it shows", style: "ink", color: "#15161a" }, { text: "you where.", style: "ink", color: "#2f54eb" }] },
  ],
  words: [[{ text: "ASK ONCE.", style: "ink", color: "#15161a" }, { text: "DONE.", style: "ink", color: "#2f54eb" }]],
  tagline: "Bookkeeping that does itself",
  install: ["npm install tally", "tally init"],
  footer: "tally.example",
  bpm: 90, askBeats: 6, typeBeats: 4, endBeats: 8, claimBar: 6,
  score: null, // silent here: compose this product's own score and pass it
});
