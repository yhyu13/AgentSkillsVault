// TEXT RULES. Two rules about words on screen, as pure functions (no browser, no ffmpeg) so they are
// unit-tested and framecheck.mjs only has to feed them.
//   1. Reading time. A text cue stays up for at least max(0.7 s, 0.3 s per word). Judged on the cues a
//      film declares (meta.captions: { from, to, text } in frames). A film that declares none is N/A,
//      never a pass: the tool cannot see words it was not told about.
//   2. Phone safe zones. On a 9:16 frame the platforms lay their own buttons, names and captions over
//      the top band, the bottom band and a right-hand column of buttons. Text under them is lost.
//      The shares below are conservative: the most cautious end of the creator safe-area guidance the
//      big short-video apps publish for vertical video, rounded up. Their layouts change, so treat the
//      numbers as a floor to re-check, not as a spec.
export const MIN_READ_S = 0.7, READ_S_PER_WORD = 0.3;
export const SAFE_ZONES = { top: 0.14, bottom: 0.25, right: 0.14 }; // shares of the frame: top and bottom of its height, right of its width

export const wordCount = (text) => String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
/** Seconds a text needs on screen to be read. */
export const readingNeed = (text) => Math.max(MIN_READ_S, READ_S_PER_WORD * wordCount(text));

/** cues: [{ from, to, text }] in frames. -> { status: "PASS" | "FAIL" | "N/A", checked, bad: [{ text, from, seconds, need }] } */
export const readingTime = (cues, fps) => {
  const list = (Array.isArray(cues) ? cues : []).filter((c) => c && String(c.text ?? "").trim());
  if (!list.length || !(fps > 0)) return { status: "N/A", checked: 0, bad: [], reason: "the film declares no text cues (meta.captions), so nothing was checked" };
  const bad = [];
  for (const c of list) {
    const need = readingNeed(c.text), frames = c.to - c.from;
    if (frames < Math.ceil(need * fps - 1e-9)) bad.push({ text: String(c.text), from: c.from, seconds: Math.round((frames / fps) * 100) / 100, need: Math.round(need * 100) / 100 });
  }
  return { status: bad.length ? "FAIL" : "PASS", checked: list.length, bad };
};

/** True for a 9:16 frame (1080x1920 and anything that shape). */
export const isPortrait916 = (W, H) => W > 0 && H > 0 && Math.abs(W / H - 9 / 16) < 0.02;

/** The three platform-UI rectangles of a W x H frame. The right column sits between the two bands. */
export const zoneRects = (W, H, z = SAFE_ZONES) => [
  { name: "top band", x0: 0, y0: 0, x1: W, y1: H * z.top },
  { name: "bottom band", x0: 0, y0: H * (1 - z.bottom), x1: W, y1: H },
  { name: "right button column", x0: W * (1 - z.right), y0: H * z.top, x1: W, y1: H * (1 - z.bottom) },
];

/**
 * recs: text boxes in device pixels [{ kind, label, frame, x0, y0, x1, y1 }] (the frame probe).
 * Returns [{ zone, label, frames: [..] }], one row per (zone, text), for text that overlaps a zone by
 * more than `tol` px on both axes. A 9:16 frame is the only one judged: any other shape is N/A.
 */
export const safeZoneHits = (recs, W, H, { zones = SAFE_ZONES, tol = 2 } = {}) => {
  if (!isPortrait916(W, H)) return { status: "N/A", hits: [], reason: `${W}x${H} is not a 9:16 frame` };
  const rects = zoneRects(W, H, zones), rows = new Map();
  for (const r of recs ?? []) {
    if (r.kind !== "text") continue;
    for (const z of rects) {
      if (Math.min(r.x1, z.x1) - Math.max(r.x0, z.x0) <= tol || Math.min(r.y1, z.y1) - Math.max(r.y0, z.y0) <= tol) continue;
      const k = `${z.name}\u0000${r.label}`, row = rows.get(k) ?? { zone: z.name, label: r.label, frames: [] };
      row.frames.push(r.frame); rows.set(k, row);
    }
  }
  const hits = [...rows.values()];
  return { status: hits.length ? "FAIL" : "PASS", hits };
};
