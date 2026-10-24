// FACTS TESTS. Every claim a film declares must be listed in facts.json with its source, or labelled
// generated; nothing invented. Held to known answers, with the failing cases.
// @ts-ignore: a plain ES module shared with the tools
import { checkFacts, entryProblems, normClaim, EMPTY_FACTS } from "../tools/factsrules.mjs";
import { makeLaunchFilm } from "../src/canvas-core/launchTemplate";
import type { Film } from "../src/canvas-core/film";
import exampleLedger from "../facts/launchExample.json";
import cleanLedger from "../facts/launchExampleClean.json";
import { launchExample } from "../src/canvas-core/launchExample";
import { launchExampleClean } from "../src/canvas-core/launchExampleClean";

export const name = "facts";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const src = { sentence: "Setup takes about 40 minutes.", url: "https://example.com/docs" };
  const good = { claim: "Ships in 40 minutes.", where: "on-screen", source: src };
  const slogan = { claim: "IDEA IN.", where: "on-screen", generated: true, note: "slogan written for this film" };
  const facts = { version: 1, claims: [good, slogan] };
  ok(normClaim("  Ships  IN 40 minutes! ") === normClaim("ships in 40 minutes."), "claims match ignoring case, spacing and end punctuation");
  ok(checkFacts(["Ships in 40 minutes.", "IDEA IN."], facts).status === "PASS", "every claim listed with a source or labelled generated passes");
  ok(checkFacts([], facts).status === "N/A" && checkFacts(undefined, facts).status === "N/A", "a film that declares no claims is N/A, never a pass");

  const missing = checkFacts(["Ships in 40 minutes.", "Loved by 10,000 teams."], facts);
  ok(missing.status === "FAIL" && missing.problems.length === 1 && /not listed/.test(missing.problems[0].why), "NEGATIVE: a claim missing from facts.json fails");
  ok(checkFacts(["IDEA IN."], null).status === "FAIL", "NEGATIVE: claims with no facts.json fail");
  ok(checkFacts(["IDEA IN."], EMPTY_FACTS).status === "FAIL", "NEGATIVE: the empty scaffold fails until the claims are listed");
  ok(checkFacts(["TODO CLAIM."], { claims: [{ claim: "TODO CLAIM.", generated: true, note: "x" }] }).status === "FAIL", "NEGATIVE: a TODO is not a claim");

  const bad = (e: object) => entryProblems(e).join("; ");
  ok(/source.sentence/.test(bad({ claim: "c", source: { url: "https://a.b" } })), "NEGATIVE: a sourced claim needs the exact sentence");
  ok(/source.url or source.file/.test(bad({ claim: "c", source: { sentence: "c" } })), "NEGATIVE: a sourced claim needs a URL or a file");
  ok(bad({ claim: "c", source: { sentence: "c", file: "notes/brief.md#2" } }) === "", "a file is a source too");
  ok(/not an http/.test(bad({ claim: "c", source: { sentence: "c", url: "ftp://x" } })), "NEGATIVE: a source URL is http(s)");
  ok(/no note/.test(bad({ claim: "c", generated: true })), "NEGATIVE: generated content must say what it is");
  ok(/states a number/.test(bad({ claim: "5 stars", generated: true, note: "n" })), "NEGATIVE: a generated claim cannot state a number (no invented ratings or prices)");
  ok(/states 99/.test(bad({ claim: "Saves 99% of time", source: src })), "NEGATIVE: a number the source sentence does not contain is caught");
  ok(bad({ claim: "Takes 40 minutes", source: src }) === "", "a number that is in the source passes");
  ok(checkFacts(["Ships in 40 minutes."], { claims: [{ ...good, source: { ...src, sentence: "" } }] }).status === "FAIL", "an entry with an empty sentence fails");
  ok(checkFacts(["IDEA IN."], { claims: [slogan, { claim: "Narrated: best in class", where: "narration" }] }).status === "FAIL", "NEGATIVE: a narrated claim listed with no source fails too");

  // the launch template declares its claims: the type-frame words, the split words and the tagline
  const plate: Film = { meta: { title: "plate", W: 1080, H: 1080, fps: 30, bpm: 120, durationFrames: 60 }, assets: { images: {} }, shots: [{ id: "p", start: 0, end: 60, draw: () => {} }] };
  const film = makeLaunchFilm({ title: "Tally", asks: [{ prompt: "draw it", plate, label: "l" }, { prompt: "again", plate, label: "l" }], words: [[{ text: "ONE.", style: "ink", color: "#111" }, { text: "TWO.", style: "ink", color: "#111" }]], tagline: "Counts things.", install: ["npm i tally"], bpm: 120, askBeats: 8, endBeats: 12, sfx: false, score: null, claims: ["Fast.", "ONE."] });
  ok(film.claims.join("|") === "ONE.|TWO.|Counts things.|Fast.", `a launch film declares its words, tagline and extra claims once each (${film.claims.join("|")})`);
  ok(film.reshape("9x16").claims.join("|") === film.claims.join("|"), "the claims are the same in every shape");
  ok(!film.claims.includes("draw it") && !film.claims.includes("npm i tally"), "prompts and install lines are not claims");
  // the shipped examples carry their own ledgers (facts/<film>.json), so launch.mjs ship passes for them
  for (const [nm, f, ledger] of [["launchExample", launchExample, exampleLedger], ["launchExampleClean", launchExampleClean, cleanLedger]] as const) {
    const r = checkFacts(f.claims, ledger);
    ok(r.status === "PASS" && ledger.claims.every((e: { generated?: boolean }) => e.generated === true), `${nm}: its ${r.checked} claims are all in facts/${nm}.json, labelled generated (${r.problems.map((p: { why: string }) => p.why).join("; ") || "no problems"})`);
  }
};
