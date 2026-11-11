// DECK. Left to choose, a film reaches for the first move it remembers: the same push-in, the same
// bloom, the same end card. This deals from references/motion-deck.json instead, weighted toward
// what fits the film (its kind, its energy) and toward the quiet workhorses, and prints each card
// with its numbers. The seed is printed, so a deal can be repeated and written into the brief.
// A card is a prompt, never an order: keep it, adapt it to the subject and medium, or drop it and
// say why. Styles and motion are a grammar to compose from (references/motion-grammar.md).
//   node tools/deck.mjs deal --kind story --energy high --seconds 27 [--seed 7] [--avoid id,id] [--json]
//   node tools/deck.mjs deal --cat seam --n 3 --kind launch       # three seams only
//   node tools/deck.mjs list [--cat camera]                        # every card, one line each
//   node tools/deck.mjs find "whip pan" [--json]                   # an everyday name -> its card, engine call, or why we refuse it
//   node tools/deck.mjs test                                       # the deck and the dealer hold their own rules
// Weights: role (workhorse 3, accent 2, signature 1) x energy fit (same 1, "any" 0.7, other 0.25).
// A deal has one opening, one close, at most one signature card, and no card twice.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./is-main.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), DECK = JSON.parse(readFileSync(join(ROOT, "references", "motion-deck.json"), "utf8"));
const CATS = ["open", "seam", "camera", "reveal", "type", "acting", "emphasis", "close"], MIDDLE = CATS.filter((c) => c !== "open" && c !== "close");
const KINDS = ["story", "drawing", "loop", "explainer", "infographic", "launch", "interactive"], ENERGY = ["calm", "medium", "high"], ROLE_W = { workhorse: 3, accent: 2, signature: 1 };
// mulberry32: the deal is a pure function of the seed
const rand = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

export const fits = (m, kind) => !kind || m.kinds.includes("any") || m.kinds.includes(kind);
export const weight = (m, energy) => ROLE_W[m.role] * (!energy || m.energy === energy ? 1 : m.energy === "any" ? 0.7 : 0.25);
export const count = (seconds) => Math.max(4, Math.min(12, Math.round(seconds / 4))); // a short film still gets an opening, a close and two more to choose from
/** A deal: one opening, one close, the rest spread over the middle categories in a shuffled order. */
export const deal = ({ kind, energy, seconds = 20, seed = 1, n, cat, avoid = [] } = {}) => {
  const r = rand(seed), skip = new Set(avoid), picked = [];
  const pool = (c) => DECK.moves.filter((m) => m.cat === c && fits(m, kind) && !skip.has(m.id) && !picked.includes(m) && !(m.role === "signature" && picked.some((p) => p.role === "signature")));
  const draw = (c) => { const p = pool(c); if (!p.length) return false; let x = r() * p.reduce((s, m) => s + weight(m, energy), 0); for (const m of p) { x -= weight(m, energy); if (x <= 0) { picked.push(m); return true; } } picked.push(p[p.length - 1]); return true; };
  if (cat) { for (let i = 0; i < (n ?? 3); i++) if (!draw(cat)) break; return picked; }
  const total = n ?? count(seconds), order = MIDDLE.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  draw("open");
  for (let i = 0, dry = 0; picked.length < total - 1 && dry < order.length; i++) dry = draw(order[i % order.length]) ? 0 : dry + 1;
  draw("close");
  return picked.sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));
};

// FIND. People ask for a move by the name they know ("a whip pan", "do the Vertigo thing"). Each card's
// aka, the deck's calls and its refused names hold those names; find routes the words to what anidoodle
// builds, or to the reason it will not and what it makes instead, so nothing is improvised from a word.
const STOP = new Set(["a", "an", "the", "please", "do", "make", "me", "some", "use", "add", "like", "effect", "shot", "move", "thing", "in", "out", "up", "to", "on", "of", "into", "at", "can", "you"]);
const KIND_ORDER = { card: 0, call: 1, refused: 2 };
export const norm = (x) => ` ${String(x).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const entries = () => [
  ...DECK.moves.map((m) => ({ kind: "card", id: m.id, names: [m.id, ...(m.aka ?? [])], item: m })),
  ...(DECK.calls ?? []).map((c) => ({ kind: "call", id: c.id, names: [c.id, ...c.aka], item: c })),
  ...(DECK.refused ?? []).map((r) => ({ kind: "refused", id: r.name, names: [r.name, ...r.aka], item: r })),
];
/** Every entry whose names match the words, best first: an exact name, a name inside the words, the words inside a name, then shared
 *  words (scored on the share of both the asked words and the name's words, so a long name does not win on one common word).
 *  Ties go to the longer matched name, then card before engine call before refusal. Ids match exactly or inside the words only. */
export const find = (query) => {
  const q = norm(query), words = q.trim().split(" ").filter((w) => w && !STOP.has(w)), out = [];
  if (!q.trim()) return out;
  for (const e of entries()) {
    let best = 0, via = "";
    for (const [i, n] of e.names.entries()) {
      const a = norm(n), aw = a.trim().split(" ").filter((w) => !STOP.has(w)), hit = words.filter((w) => aw.includes(w)).length;
      const score = a === q ? 100 : q.includes(a) ? 50 + aw.length : a.includes(q) ? 30 : i > 0 && words.length && aw.length ? 5 * (hit / words.length + hit / aw.length) : 0;
      if (score > best || (score === best && score > 0 && n.length > via.length)) { best = score; via = n; }
    }
    if (best >= 5) out.push({ kind: e.kind, id: e.id, score: best, via, item: e.item });
  }
  return out.sort((a, b) => b.score - a.score || b.via.length - a.via.length || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id));
};
const showFound = (r) => r.kind === "card" ? `${card(r.item)}\n    (matched "${r.via}")`
  : r.kind === "call" ? `  ${r.id}   [engine call · ${r.item.where}]\n    ${r.item.call}\n    ${r.item.use}\n    (matched "${r.via}")`
  : `  REFUSED: ${r.id}   (matched "${r.via}")\n    why: ${r.item.why}\n    make instead: ${r.item.instead}`;

const card = (m) => `  ${m.id}   [${m.cat} · ${m.role} · ${m.energy}]\n    ${m.move}\n    build: ${m.build}\n    not when: ${m.not}`;
const selfTest = () => {
  let fails = 0; const say = (ok, label) => { if (!ok) fails++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`); };
  const M = DECK.moves, ids = M.map((m) => m.id);
  say(new Set(ids).size === ids.length, `${ids.length} cards, every id unique`);
  say(M.every((m) => CATS.includes(m.cat) && ROLE_W[m.role] && [...ENERGY, "any"].includes(m.energy) && m.kinds.length && m.kinds.every((k) => k === "any" || KINDS.includes(k))), "every card has a known category, role, energy and kind");
  say(M.every((m) => m.move.length > 40 && m.build.length > 20 && m.not.length > 15), "every card says what happens, how it is built, and when not to use it");
  say(CATS.every((c) => M.filter((m) => m.cat === c).length >= 3), "every category has at least three cards to choose between");
  // every file a card cites exists: a card that points at nothing is a rumour
  const have = new Set(); const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === "node_modules" || e.name.startsWith(".")) continue; if (e.isDirectory()) walk(join(d, e.name)); else have.add(e.name); } };
  walk(join(ROOT, "references")); walk(join(ROOT, "engine", "src")); walk(join(ROOT, "engine", "tools"));
  const cited = [...new Set([...M.map((m) => `${m.build} ${m.not} ${m.move}`), ...(DECK.calls ?? []).map((c) => `${c.where} ${c.call} ${c.use}`), ...(DECK.refused ?? []).map((r) => `${r.why} ${r.instead}`)].flatMap((t) => t.match(/[A-Za-z0-9-]+\.(?:ts|mjs|md)\b/g) ?? []))], missing = cited.filter((f) => !have.has(f));
  say(!missing.length, `all ${cited.length} files the cards cite exist${missing.length ? `   missing: ${missing.join(", ")}` : ""}`);
  say(!/\u2014/.test(JSON.stringify(DECK)), "no em dashes in the deck");
  // names: every card has everyday names, every name leads to one place, and the common ones resolve
  const C = DECK.calls ?? [], R = DECK.refused ?? [];
  say(M.every((m) => Array.isArray(m.aka) && m.aka.length >= 1 && m.aka.every((a) => typeof a === "string" && a.trim())), "every card lists at least one everyday name (aka)");
  say(C.length >= 3 && C.every((c) => c.id && c.where && c.call && c.use && c.aka?.length) && R.length >= 6 && R.every((r) => r.name && r.why?.length > 20 && r.instead && r.aka?.length), "every engine call says where and how, every refused name says why and what to make instead");
  { const seen = new Map(), dup = []; for (const e of entries()) for (const n of new Set(e.names.map(norm))) { if (seen.has(n) && seen.get(n) !== e.id) dup.push(`${n.trim()} (${seen.get(n)}, ${e.id})`); seen.set(n, e.id); }
    say(!dup.length, `no name leads to two places${dup.length ? `   ${dup.slice(0, 4).join("; ")}` : ""}`); }
  { const grammar = readFileSync(join(ROOT, "references", "motion-grammar.md"), "utf8"), table = grammar.slice(grammar.indexOf("## Names we refuse")), missing = R.filter((r) => !table.includes(`| ${r.name} |`));
    say(grammar.includes("## Names we refuse") && !missing.length, `motion-grammar.md's "Names we refuse" table holds every refused name${missing.length ? `   missing: ${missing.map((r) => r.name).join(", ")}` : ""}`); }
  { const named = R.flatMap((r) => r.instead.match(/\b(?:open|seam|cam|reveal|type|act|emph|close)-[a-z-]+[a-z]/g) ?? []), bad = named.filter((id) => !ids.includes(id));
    say(named.length >= 6 && !bad.length, `every card a refused name points to exists (${named.length})${bad.length ? `   missing: ${bad.join(", ")}` : ""}`); }
  const ROUTES = [["whip pan", "cam-whip-to-rest"], ["mask reveal", "reveal-from-behind"], ["Vertigo", "cam-vertigo-realisation"], ["a dolly zoom", "cam-vertigo-realisation"], ["the vertigo effect", "cam-vertigo-realisation"],
    ["speed ramp", "emph-time-ramp"], ["slow-mo", "emph-time-ramp"], ["freeze frame", "type-freeze-and-name"], ["J-cut", "seam-sound-leads"], ["l cut", "seam-sound-leads"], ["rack focus", "cam-rack-of-attention"],
    ["count-up", "reveal-count-during"], ["zoom in", "call-lens"], ["crash zoom", "call-lens"], ["dolly in", "cam-slow-push"], ["circle wipe", "call-iris"], ["smash cut", "seam-cut-on-beat"], ["flash cut", "call-flash-cut"],
    ["typewriter", "call-typewriter"], ["can you do a whip pan to the cat", "cam-whip-to-rest"], ["glitch", "glitch"], ["Lens Flare", "lens flare"], ["fade in", "fade-in"], ["cross-fade", "cross dissolve"], ["dolly zoom in", "cam-vertigo-realisation"], ["slow zoom", "cam-slow-push"], ["masked reveal", "reveal-from-behind"], ["cut", "seam-cut-on-beat"], ["fade out", "fade-in"], ["fade to black", "fade-in"], ["pop-in", "fade-in"], ["time lapse", "reveal-drawn-on"], ["slow pan across the city", "cam-parallax-travel"], ["tilt up", "cam-parallax-travel"], ["fast motion", "call-time-remap"], ["rewind", "call-time-remap"], ["on twos", "call-on-twos"], ["bloom", "call-gentle-move"], ["jcut", "seam-sound-leads"], ["depth of field", "cam-rack-of-attention"], ["bokeh", "lens flare"], ["zoom out to reveal the city", "cam-pull-back-reveal"], ["confetti", "particle burst"], ["shine", "light sweep"]];
  const wrong = ROUTES.filter(([q, id]) => find(q)[0]?.id !== id).map(([q, id]) => `"${q}" -> ${find(q)[0]?.id ?? "nothing"} (want ${id})`);
  say(!wrong.length, `${ROUTES.length} everyday names resolve to the right card, call or refusal${wrong.length ? `   ${wrong.join("; ")}` : ""}`);
  say(find("zzqx plorb").length === 0 && find("   ").length === 0, "a name nobody uses finds nothing, and says so");
  const key = (d) => d.map((m) => m.id).join(",");
  say(key(deal({ kind: "story", energy: "high", seconds: 27, seed: 7 })) === key(deal({ kind: "story", energy: "high", seconds: 27, seed: 7 })), "the same seed deals the same hand");
  say(new Set(Array.from({ length: 40 }, (_, s) => key(deal({ kind: "story", energy: "high", seconds: 27, seed: s + 1 })))).size >= 30, "forty seeds deal at least thirty different hands");
  let rules = true, kinds = true, avoided = true, sizes = true;
  for (let s = 1; s <= 300; s++) for (const kind of KINDS) {
    const energy = ENERGY[s % 3], seconds = 6 + (s % 9) * 7, d = deal({ kind, energy, seconds, seed: s, avoid: ["cam-slow-push"] });
    if (d.filter((m) => m.cat === "open").length !== 1 || d.filter((m) => m.cat === "close").length !== 1 || d.filter((m) => m.role === "signature").length > 1 || new Set(d).size !== d.length) rules = false;
    if (!d.every((m) => fits(m, kind))) kinds = false; if (d.some((m) => m.id === "cam-slow-push")) avoided = false; if (d.length > 12 || d.length > count(seconds) || d.length < 3) sizes = false;
  }
  say(rules, "2100 deals: exactly one opening, exactly one close, at most one signature card, no card twice");
  say(kinds, "no deal holds a card its kind of film cannot use"); say(avoided, "an avoided card is never dealt"); say(sizes, "a deal is a card every four seconds, never fewer than three and never more than twelve");
  const tally = (energy) => { let hi = 0, n = 0; for (let s = 1; s <= 400; s++) for (const m of deal({ kind: "story", energy, seconds: 30, seed: s })) { n++; if (m.energy === "high") hi++; } return hi / n; };
  say(tally("high") > tally("calm") * 1.5, `a high-energy film is dealt more high-energy cards than a calm one (${(tally("high") * 100).toFixed(0)}% against ${(tally("calm") * 100).toFixed(0)}%)`);
  say(deal({ cat: "seam", n: 3, kind: "launch", seed: 3 }).every((m) => m.cat === "seam") && deal({ cat: "seam", n: 3, seed: 3 }).length === 3, "--cat deals from one category only");
  // run through a link, as an installed skill is: the tool must still know it is the one being run
  { const dir = mkdtempSync(join(tmpdir(), "deck-")), link = join(dir, "engine"); let out = "";
    const quiet = [];
    try { symlinkSync(join(ROOT, "engine"), link, "dir"); out = execFileSync(process.execPath, [join(link, "tools", "deck.mjs"), "deal", "--seed", "3", "--kind", "story"], { encoding: "utf8" });
      // every tool that can also be imported by another must still answer when it is the one being run
      for (const t of ["registry", "popscan", "captions", "audio", "build-page", "soundpack"]) { const r = spawnSync(process.execPath, [join(link, "tools", `${t}.mjs`)], { encoding: "utf8", cwd: link }); if (!`${r.stdout}${r.stderr}`.trim()) quiet.push(t); }
    } catch (e) { out = `failed: ${e.message}`; } finally { rmSync(dir, { recursive: true, force: true }); }
    say(out.startsWith("DECK   seed 3") && out.includes("build:"), "run through a symlinked folder, it still deals");
    say(!quiet.length, `six other tools answer through the link too${quiet.length ? `   silent: ${quiet.join(", ")}` : ""}`); }
  console.log(`\nDECK: ${fails ? "FAIL" : "PASS"}`); process.exit(fails ? 1 : 0);
};

if (isMain(import.meta.url)) {
  const die = (m) => { console.error(`deck: ${m}`); process.exit(2); };
  const [cmd, ...args] = process.argv.slice(2), val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const num = (k, least, whole) => { if (!args.includes(k)) return undefined; const x = Number(val(k)); if (val(k) === undefined || !Number.isFinite(x) || x < least || (whole && !Number.isInteger(x))) die(`${k} takes ${whole ? "a whole number" : "a number"} of ${least} or more (got ${val(k)})`); return x; };
  if (cmd === "test") selfTest();
  else if (cmd === "list") { const c = val("--cat"); if (c && !CATS.includes(c)) die(`--cat is one of ${CATS.join(", ")}`); for (const m of DECK.moves.filter((m) => !c || m.cat === c)) console.log(`${m.id.padEnd(30)} ${m.cat.padEnd(9)} ${m.role.padEnd(10)} ${m.energy.padEnd(7)} ${m.kinds.join(",")}`); }
  else if (cmd === "deal") {
    const kind = val("--kind"), energy = val("--energy"), c = val("--cat");
    if (kind && !KINDS.includes(kind)) die(`--kind is one of ${KINDS.join(", ")}`); if (energy && !ENERGY.includes(energy)) die(`--energy is one of ${ENERGY.join(", ")}`); if (c && !CATS.includes(c)) die(`--cat is one of ${CATS.join(", ")}`);
    const seed = num("--seed", 0, true) ?? (Date.now() % 100000), o = { kind, energy, seconds: num("--seconds", 1) ?? 20, seed, n: num("--n", c ? 1 : 3, true), cat: c, avoid: (val("--avoid") ?? "").split(",").filter(Boolean) }, d = deal(o);
    if (args.includes("--json")) console.log(JSON.stringify({ ...o, cards: d }, null, 1));
    else { console.log(`DECK   seed ${seed}${kind ? ` · ${kind}` : ""}${energy ? ` · ${energy}` : ""}${c ? ` · ${c} only` : ` · ${o.seconds} s`} · ${d.length} cards\n`); console.log(d.map(card).join("\n\n")); console.log(`\nKeep, adapt or drop each card, and say why in the brief. To repeat this deal: --seed ${seed}. To deal the next film a different hand: --avoid ${d.map((m) => m.id).join(",")}`); }
  } else if (cmd === "find") {
    const q = args.filter((a) => a !== "--json").join(" ").trim(); if (!q) die('find takes a name: deck.mjs find "whip pan"');
    const all = find(q), top = all[0], hits = all.filter((r) => r.score >= Math.max(5, (top?.score ?? 0) / 2)).slice(0, 5);
    if (args.includes("--json")) console.log(JSON.stringify({ query: q, found: hits.map(({ kind, id, via, item }) => ({ kind, id, via, ...item })) }, null, 1));
    else if (!hits.length) console.log(`FIND   "${q}": no card, call or refused name goes by that. List the deck with deck.mjs list, or describe the move in plain words in the brief.`);
    else { console.log(`FIND   "${q}" · ${hits.length} ${hits.length === 1 ? "match" : "matches"}, best first\n`); console.log(hits.map(showFound).join("\n\n")); if (hits.some((r) => r.kind === "card")) console.log(`\nA card is a prompt, never an order: its numbers are the default unless the person named their own (workflows/start-here.md).`); }
    if (!hits.length) process.exit(1);
  } else die("usage: deck.mjs deal|list|find|test (see the header of this file)");
}
