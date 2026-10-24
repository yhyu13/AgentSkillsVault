/* narration-script.js — narration text, one line per animation step.
 * ─────────────────────────────────────────────────────────────────────────
 * This is the ONLY file you edit by hand to write narration. The Audio Studio
 * reads it, generates one audio clip per non-empty line, and keys each clip to
 * its slide + step. Edit a line and re-generate to update just that clip.
 *
 * STRUCTURE
 *   slides[i]          → the i-th <section> in the deck (0-based, in DOM order)
 *   slides[i].lines[k] → narration for that slide at step k:
 *       lines[0] = spoken when the slide first appears (before any reveal)
 *       lines[1] = spoken when reveal step 1 (data-step="1") is shown
 *       lines[2] = spoken at data-step="2", and so on
 *
 *   • A slide with no animation steps only needs lines[0].
 *   • Leave a line as "" to play nothing for that step (it's skipped silently).
 *   • The number of slides here should match the number of <section>s; extra
 *     slides/steps with no line simply stay silent.
 *
 * WRITING TIPS (for natural narration)
 *   • One idea per sentence; short sentences read better than long ones.
 *   • Spell out acronyms with periods so the voice says letters, not a word:
 *       "A.I."  "G.L.M."  "U.X."   (write "AI" and some voices say "ay")
 *   • Numbers: write "twenty twenty-six" if a voice mis-reads "2026", etc.
 *   • Keep each line to what fits the time that step is on screen.
 *
 *   ⚠ These respellings are SPOKEN-ONLY — they live here, never in the slide
 *     text. The slide <section> keeps the readable form ("HR", "AI", "2026");
 *     only the narration line below carries the pronunciation hint ("H.R.",
 *     "A.I.", "twenty twenty-six"). The engine never shows these lines on
 *     screen, so they can't "leak" unless you also type them into the markup.
 *
 * CONFIG (optional)
 *   voiceId     pre-fills the Voice ID field in the Audio Studio (you can also
 *               just paste it in the panel). Leave "" to enter it each time.
 *   modelId     ElevenLabs model. eleven_multilingual_v2 is a good default.
 *   gapSeconds  pause inserted between a clip ending and the next step during
 *               auto-play.
 */
window.__NARRATION = {
  voiceId: "",
  modelId: "eleven_multilingual_v2",
  gapSeconds: 0.5,

  slides: [
    // ── Slide 1 (no reveal steps — intro line only) ──────────────────────
    { lines: [
      "" // e.g. "Welcome. Here is our plan for the coming quarter."
    ] },

    // ── Slide 2 (one intro line + three reveal steps) ────────────────────
    { lines: [
      "",   // step 0 — on slide entry
      "",   // step 1 — data-step="1"
      "",   // step 2 — data-step="2"
      ""    // step 3 — data-step="3"
    ] },

    // ── Slide 3 (closing — intro line only) ──────────────────────────────
    { lines: [
      "" // e.g. "Thank you. Questions?"
    ] },

    // ── Add one { lines: [...] } block per <section>, in order ───────────
  ]
};
