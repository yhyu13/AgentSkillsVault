// TEXT RULES TESTS. The reading-time rule and the 9:16 phone safe zones, held to known answers,
// including the failing cases: a cue that is too short, text under the platforms' buttons.
// @ts-ignore: a plain ES module shared with the tools
import { SAFE_ZONES, isPortrait916, readingNeed, readingTime, safeZoneHits, zoneRects } from "../tools/textrules.mjs";
import { PHONE_SAFE } from "../src/canvas-core/launchLayout";

export const name = "textrules";
export const run = (ok: (cond: boolean, label: string) => void) => {
  // one set of numbers: the layout composes inside PHONE_SAFE, framecheck checks against SAFE_ZONES
  ok(JSON.stringify(SAFE_ZONES) === JSON.stringify(PHONE_SAFE), `the checked safe zones are the ones the launch layout composes for (${JSON.stringify(SAFE_ZONES)})`);
  // ---- reading time: max(0.7 s, 0.3 s per word)
  ok(readingNeed("Hi") === 0.7 && readingNeed("one two") === 0.7, "one or two words need the 0.7 s floor");
  ok(Math.abs(readingNeed("one two three four five six") - 1.8) < 1e-9, "six words need 1.8 s (0.3 s each)");
  const fps = 30, cue = (text: string, s: number) => ({ from: 100, to: 100 + Math.round(s * fps), text });
  ok(readingTime([cue("IDEA IN.", 0.7), cue("one two three four five six", 1.8)], fps).status === "PASS", "cues exactly at their reading time pass");
  const short = readingTime([cue("IDEA IN.", 0.7), cue("one two three four five six", 1.5)], fps);
  ok(short.status === "FAIL" && short.bad.length === 1 && short.bad[0].need === 1.8 && short.bad[0].seconds === 1.5, `NEGATIVE: a 6-word cue up for 1.5 s fails (${JSON.stringify(short.bad[0])})`);
  ok(readingTime([cue("Yes", 0.6)], fps).status === "FAIL", "NEGATIVE: one word up for 0.6 s fails the 0.7 s floor");
  ok(readingTime([{ from: 0, to: 20, text: "Yes" }], 30).status === "FAIL" && readingTime([{ from: 0, to: 21, text: "Yes" }], 30).status === "PASS", "the floor is 21 frames at 30 fps, 20 fails");
  ok(readingTime([], fps).status === "N/A" && readingTime(undefined, fps).status === "N/A", "no declared cues is N/A, never a pass");
  ok(readingTime([{ from: 0, to: 5, text: "   " }], fps).status === "N/A", "a blank cue is not text: N/A");
  ok(readingTime([cue("IDEA IN.", 0.7)], fps).status !== "N/A", "declared text is judged");

  // ---- the 9:16 frame and its zones
  ok(isPortrait916(1080, 1920) && isPortrait916(720, 1280) && !isPortrait916(1920, 1080) && !isPortrait916(1080, 1350) && !isPortrait916(1080, 1080), "9:16 is detected by shape, not by name");
  const z = zoneRects(1080, 1920);
  ok(z.length === 3 && z[0].y1 === 1920 * SAFE_ZONES.top && z[1].y0 === 1920 * (1 - SAFE_ZONES.bottom) && z[2].x0 === 1080 * (1 - SAFE_ZONES.right), "three zones: top band, bottom band, right button column");
  ok(SAFE_ZONES.top >= 0.12 && SAFE_ZONES.bottom >= 0.2 && SAFE_ZONES.right >= 0.1, "the shares are the conservative ones, not the minimum");
  const text = (label: string, x0: number, y0: number, x1: number, y1: number, frame = 0) => ({ kind: "text", label, x0, y0, x1, y1, frame });
  const inside = text("whole", 200, 600, 800, 700), W = 1080, H = 1920;
  ok(safeZoneHits([inside], W, H).status === "PASS", "text in the middle of the frame passes");
  const top = safeZoneHits([text("TITLE", 100, 40, 900, 120)], W, H);
  ok(top.status === "FAIL" && top.hits[0].zone === "top band", "NEGATIVE: text in the top band fails");
  const bottom = safeZoneHits([text("npm i x", 100, 1600, 900, 1700)], W, H);
  ok(bottom.status === "FAIL" && bottom.hits[0].zone === "bottom band", "NEGATIVE: text in the bottom band fails");
  const right = safeZoneHits([text("CLAIM", 700, 800, 1060, 900)], W, H);
  ok(right.status === "FAIL" && right.hits[0].zone === "right button column", "NEGATIVE: text running into the right button column fails");
  ok(safeZoneHits([text("edge", 100, 270, 900, 280)], W, H).status === "PASS", "text that only touches a zone's border passes");
  const many = safeZoneHits([text("TITLE", 100, 40, 900, 120, 0), text("TITLE", 100, 40, 900, 120, 5), text("TITLE", 100, 40, 900, 120, 9)], W, H);
  ok(many.hits.length === 1 && many.hits[0].frames.join() === "0,5,9", "one row per text and zone, with every frame it was seen on");
  ok(safeZoneHits([{ kind: "box", label: "card", x0: 0, y0: 0, x1: 1080, y1: 1920, frame: 0 }], W, H).status === "PASS", "content boxes are not judged here, only text");
  ok(safeZoneHits([text("TITLE", 100, 40, 900, 120)], 1920, 1080).status === "N/A", "a 16:9 frame is N/A, never judged against phone zones");
};
