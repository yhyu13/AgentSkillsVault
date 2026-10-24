// FACTS RULES. The pure half of facts.mjs (no files, no browser), so it is unit-tested: what makes a
// claim's entry well formed, and whether every claim a film declares is listed. See facts.mjs for the
// file format and the command.
export const normClaim = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/^[\s"'“”]+|[\s.!?:;"'“”]+$/g, "");
const numbers = (s) => (String(s).match(/\d[\d.,]*\d|\d/g) ?? []).map((n) => n.replace(/[.,]+$/, ""));
export const EMPTY_FACTS = { version: 1, about: "Every claim the film makes, on screen or narrated. Sourced: { claim, where, source: { sentence, url or file } }. Generated: { claim, where, generated: true, note }. Nothing invented.", claims: [] };

/** One entry's own problems (shape only). */
export const entryProblems = (e) => {
  const out = [], claim = String(e?.claim ?? "").trim();
  if (!claim) return ["has no claim text"];
  if (/^todo\b/i.test(claim)) out.push("is still a TODO");
  if (e.generated === true) {
    if (!String(e.note ?? "").trim()) out.push("is generated but has no note saying what it is");
    if (numbers(claim).length) out.push("is generated but states a number (a number needs a source)");
    return out;
  }
  const src = e.source ?? {}, sentence = String(src.sentence ?? "").trim();
  if (!sentence) out.push("has no source.sentence (the exact sentence it comes from)");
  if (!String(src.url ?? "").trim() && !String(src.file ?? "").trim()) out.push("has no source.url or source.file");
  else if (src.url && !/^https?:\/\/\S+$/i.test(String(src.url).trim())) out.push(`source.url '${src.url}' is not an http(s) link`);
  if (sentence) { const have = new Set(numbers(sentence).map((n) => n.replace(/,/g, ""))); for (const n of numbers(claim)) if (!have.has(n.replace(/,/g, ""))) out.push(`states ${n}, which the source sentence does not`); }
  return out;
};

/**
 * claims: the strings a film declares (or undefined/empty). facts: the parsed facts.json, or null when absent.
 * -> { status: "PASS" | "FAIL" | "N/A", checked, problems: [{ claim, why }] }
 */
export const checkFacts = (claims, facts) => {
  const declared = [...new Set((Array.isArray(claims) ? claims : []).map((c) => String(c).trim()).filter(Boolean))];
  if (!declared.length) return { status: "N/A", checked: 0, problems: [], reason: "the film declares no claims (film.claims), so nothing was checked" };
  if (!facts) return { status: "FAIL", checked: declared.length, problems: declared.map((c) => ({ claim: c, why: "has no facts.json to be listed in (node tools/facts.mjs init)" })) };
  const entries = Array.isArray(facts.claims) ? facts.claims : [], problems = [];
  if (!Array.isArray(facts.claims)) problems.push({ claim: "(facts.json)", why: "has no claims array" });
  const by = new Map(); for (const e of entries) { const k = normClaim(e?.claim); if (k && !by.has(k)) by.set(k, e); }
  for (const c of declared) {
    if (/^todo\b/i.test(c)) { problems.push({ claim: c, why: "is still a TODO in the film" }); continue; }
    const e = by.get(normClaim(c));
    if (!e) { problems.push({ claim: c, why: "is on screen but not listed in facts.json" }); continue; }
    for (const why of entryProblems(e)) problems.push({ claim: c, why });
  }
  const declaredKeys = new Set(declared.map(normClaim));
  for (const e of entries) if (!declaredKeys.has(normClaim(e?.claim))) for (const why of entryProblems(e)) problems.push({ claim: String(e?.claim ?? "(no claim)"), why }); // narrated and other listed claims are held to the same shape
  return { status: problems.length ? "FAIL" : "PASS", checked: declared.length, problems };
};

/** The film's declared claims (a launch film: film.claims; any film may set film.claims or meta.claims). */
export const claimsOf = (film) => film?.claims ?? film?.meta?.claims;

