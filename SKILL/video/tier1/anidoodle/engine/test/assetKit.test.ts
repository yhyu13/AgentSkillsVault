// ASSET KIT TESTS. Site art's claims: the colour maths round-trips, a brand ramp steps light to dark in
// its own hue, a page palette keeps every material's light order on a light page and on a dark one, the
// brand lands only on the part to watch, and a placement's art region never overlaps its headline zone.
//   node tools/test.mjs assetKit
import { toLab, fromLab, rampFrom, pagePalette, isDark, PLACEMENTS, fitBox, strongPoint } from "../src/canvas-core/assetKit";
import type { Material } from "../src/canvas-core/mechanismKit";

export const name = "assetKit";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const L = (h: string) => toLab(h)[0], hue = (h: string) => { const [, a, b] = toLab(h); return Math.atan2(b, a); };
  const near = (a: string, b: string) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return [16, 8, 0].every((s) => Math.abs(((x >> s) & 255) - ((y >> s) & 255)) <= 1); };

  // 1. colour maths
  ok(["#000000", "#ffffff", "#e4572e", "#3d7bff", "#12151f", "#faf7f2"].every((h) => near(fromLab(toLab(h)), h)), "OKLab round-trips to the same hex");
  ok(Math.abs(L("#ffffff") - 1) < 1e-3 && L("#000000") < 1e-3, "white is lightness 1, black 0");
  ok(/^#[0-9a-f]{6}$/.test(fromLab([0.7, 0.4, 0.4])), "a colour outside sRGB gives up chroma and still comes back as a hex");
  ok(isDark("#12151f") && !isDark("#faf7f2"), "a navy page is dark, an off-white page is light");

  // 2. a brand ramp: five tones, dark to light, in the brand's own hue, in either theme
  for (const dark of [false, true]) for (const hex of ["#e4572e", "#3d7bff", "#2a9d5c"]) {
    const r = rampFrom(hex, dark), ls = r.ramp.map(L);
    ok(ls.every((v, i) => !i || v > ls[i - 1] + 0.03), `${hex} ${dark ? "dark" : "light"}: the ramp steps up in lightness (${ls.map((v) => v.toFixed(2)).join(" ")})`);
    ok(r.ramp.every((c) => Math.abs(hue(c) - hue(hex)) < 0.12), `${hex} ${dark ? "dark" : "light"}: every tone keeps the brand's hue`);
  }
  ok(L(rampFrom("#e4572e", true).ramp[4]) < 0.85, "on a dark page the brand's lit top does not glare");

  // 3. a page palette keeps light order and puts the brand only on the part to watch
  const zinc: Material = { name: "zinc", ramp: ["#a9a69f", "#bdbab3", "#cfccc4", "#dedbd3", "#f4f1ea"], ink: "#232227", seam: "#8a877f", pigment: "#8d8b86" };
  const watch: Material = { ...zinc, name: "accent", accent: true, pigment: "#d0502a" };
  for (const paper of ["#faf7f2", "#12151f", "#f0f4ff"]) {
    const p = pagePalette({ paper, accent: "#3d7bff" }), z = p(zinc), ls = z.ramp.map(L);
    ok(ls.every((v, i) => !i || v >= ls[i - 1]), `on ${paper}: zinc keeps its light order`);
    ok(isDark(paper) ? ls[0] > L(paper) : ls[4] <= L(paper) + 0.06, `on ${paper}: parts sit ${isDark(paper) ? "above" : "at or below"} the page`);
    ok(!near(p(watch).pigment!, z.pigment!) && Math.abs(hue(p(watch).pigment!) - hue("#3d7bff")) < 0.12, `on ${paper}: the part to watch takes the brand`);
    ok(near(p({ ...zinc }).ramp[2], z.ramp[2]), `on ${paper}: a plain part does not`);
  }
  const ink = pagePalette({ paper: "#faf7f2", colours: { zinc: { hex: "#e4572e", mode: "lines" } } })(zinc);
  ok(Math.abs(hue(ink.ink) - hue("#e4572e")) < 0.12 && near(ink.ramp[2], pagePalette({ paper: "#faf7f2" })(zinc).ramp[2]), "lines mode colours the lines and leaves the part neutral");
  ok(near(pagePalette({ paper: "#f3f0e8" })(zinc).ramp[2], zinc.ramp[2]), "on the kit's own paper nothing moves");

  // 4. placements
  for (const [id, p] of Object.entries(PLACEMENTS)) {
    const [x0, y0, x1, y1] = fitBox(p), s = p.safe;
    ok(x0 >= 0 && y0 >= 0 && x1 <= p.W && y1 <= p.H && x1 > x0 && y1 > y0, `${id}: the fit box lies inside the canvas`);
    if (s) ok(x1 <= s.x || x0 >= s.x + s.w || y1 <= s.y || y0 >= s.y + s.h, `${id}: the art never overlaps the headline zone`);
  }
  const st = PLACEMENTS.heroStack, [sx] = strongPoint(st), side = PLACEMENTS.heroSide, [hx] = strongPoint(side);
  ok(Math.abs(sx - (st.art.x + st.art.w / 2)) < 1e-9, "words above: the moment sits on the centre line");
  ok(Math.abs(hx - (side.art.x + side.art.w / 3)) < 1e-9, "words on the left: the moment leans a third toward them");
};
