// ASSET KIT. Art that lives on someone's page: a hero beside a headline, a feature tile, a row of spots,
// a social card. Three things change when a picture leaves its own card and sits on a site:
//   1. placement: the art has a region, and the headline has a zone the art must never enter;
//   2. ground: the paper IS the page colour, so every neutral moves to suit it, light or dark;
//   3. brand: one hex colours a whole part (solid) or just its strokes and dots (lines), light theme or dark.
// Placement is plain numbers. Ground and brand are a palette: `setPalette(pagePalette(...))` and every
// material the kit paints is moved through it, so a machine is restyled without touching its parts.
import type { Material } from "./mechanismKit";

export type Rect = { x: number; y: number; w: number; h: number };
export type Placement = { W: number; H: number; art: Rect; safe?: Rect; pad: number; note: string };

/** canvases by where the art sits, in logical units near CSS pixels at the size the art is shown */
export const PLACEMENTS: Record<string, Placement> = {
  heroSide: { W: 1600, H: 900, art: { x: 700, y: 60, w: 840, h: 780 }, safe: { x: 0, y: 0, w: 640, h: 900 }, pad: 32, note: "words on the left, the object on the right, its moment turned toward the words" },
  heroSideLeft: { W: 1600, H: 900, art: { x: 60, y: 60, w: 840, h: 780 }, safe: { x: 960, y: 0, w: 640, h: 900 }, pad: 32, note: "heroSide mirrored" },
  heroStack: { W: 1600, H: 900, art: { x: 200, y: 330, w: 1200, h: 540 }, safe: { x: 0, y: 0, w: 1600, h: 300 }, pad: 32, note: "words above, a long low object under them" },
  art: { W: 1200, H: 900, art: { x: 0, y: 0, w: 1200, h: 900 }, pad: 36, note: "the page sets its own words" },
  card: { W: 800, H: 600, art: { x: 0, y: 0, w: 800, h: 600 }, pad: 36, note: "a feature card" },
  icon: { W: 480, H: 480, art: { x: 0, y: 0, w: 480, h: 480 }, pad: 28, note: "a small single object; simplify the parts rather than shrink them" },
  strip: { W: 1920, H: 480, art: { x: 0, y: 28, w: 1920, h: 424 }, pad: 28, note: "a band between sections; the art may be cropped by a single side of the band, no more" },
  social: { W: 1200, H: 630, art: { x: 600, y: 45, w: 560, h: 540 }, safe: { x: 0, y: 0, w: 560, h: 630 }, pad: 28, note: "a link preview: words left, object right, its own ground" },
  slide: { W: 1920, H: 1080, art: { x: 860, y: 90, w: 1000, h: 900 }, safe: { x: 0, y: 0, w: 800, h: 1080 }, pad: 36, note: "a deck slide" },
};
/** the art region shrunk by its pad, as the corner box [x0, y0, x1, y1] `Cam.fit` takes */
export const fitBox = (p: Placement): [number, number, number, number] => [p.art.x + p.pad, p.art.y + p.pad, p.art.x + p.art.w - p.pad, p.art.y + p.art.h - p.pad];
/** where the eye should land: a third of the way into the art region, on the side nearest the text */
export const strongPoint = (p: Placement): [number, number] => {
  const s = p.safe, above = s !== undefined && s.w >= p.W, cx = s ? s.x + s.w / 2 : 0, ax = p.art.x + p.art.w / 2;
  const fx = !s || above ? 1 / 2 : cx < ax ? 1 / 3 : 2 / 3; // words beside: lean toward them; words above or none: centre
  return [p.art.x + p.art.w * fx, p.art.y + p.art.h * (above ? 1 / 3 : 0.45)];
};

// ---------------------------------------------------------------- colour in a perceptual space (OKLab)
type Lab = [number, number, number];
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]; };
export const toLab = (hex: string): Lab => {
  const [r, g, b] = hexRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const labRgb = ([L, a, b]: Lab): [number, number, number] => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(toSrgb) as [number, number, number];
};
/** back to hex; a colour outside sRGB keeps its lightness and hue and gives up chroma until it fits */
export const fromLab = (lab: Lab): string => {
  let [L, a, b] = lab; L = Math.max(0, Math.min(1, L));
  for (let k = 0; k < 24; k++) { const rgb = labRgb([L, a, b]); if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) break; a *= 0.88; b *= 0.88; }
  return "#" + labRgb([L, a, b]).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
};
/** a page is dark when white text would read better on it than black: its relative luminance under about 0.18 */
export const isDark = (paper: string) => { const [r, g, b] = hexRgb(paper).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18; };

// ---------------------------------------------------------------- the page palette
export type Colour = string | { hex: string; mode?: "solid" | "lines" };
export type PageOpts = {
  paper: string;              // the exact colour of the page the art sits on
  kitPaper?: string;          // the paper the materials were designed on (the kit's cream)
  tint?: number;              // how much of the page's hue the greys pick up: 0 none, 1 all of it, 0.5 by default
  accent?: Colour;            // the brand colour of the part to watch (materials with accent: true)
  colours?: Record<string, Colour>; // per material name: a brand or material colour (brass, walnut, ebony)
};

/** one hex as a five-step material ramp in a theme: the hue and chroma stay, and the lightness sits where every step stays distinct from its neighbour */
export const rampFrom = (hex: string, dark: boolean): { ramp: Material["ramp"]; seam: string; pigment: string } => {
  const [L0, a, b] = toLab(hex), c = dark ? Math.max(0.32, Math.min(0.64, L0 * 0.78)) : Math.max(0.36, Math.min(0.8, L0));
  const at = (L: number) => fromLab([L, a, b]);
  return { ramp: [at(c - 0.17), at(c - 0.09), at(c - 0.02), at(c + 0.06), at(Math.min(0.97, c + 0.15))], seam: at(c - (dark ? -0.12 : 0.26)), pigment: at(c) };
};

/** a palette for `setPalette`: every material moved onto the page, brand colours put in, light or dark */
export const pagePalette = (o: PageOpts): ((m: Material) => Material) => {
  const dark = isDark(o.paper), P = toLab(o.paper), K = toLab(o.kitPaper ?? "#f3f0e8"), tint = o.tint ?? 0.5;
  const da = (P[1] - K[1]) * tint, db = (P[2] - K[2]) * tint;
  // light page: each colour shifts by how far the page's lightness is from the kit's cream, and picks up
  // a `tint` share of the page's hue. dark page: parts rise just above the page, lit tops brightest, and
  // lines are drawn lighter than the faces they edge.
  const move = (hex: string, base: number) => {
    const [L, a, b] = toLab(hex);
    if (!dark) return fromLab([L + (P[0] - K[0]), a + da, b + db]);
    return fromLab([P[0] + 0.07 + Math.max(0, L - base) * 0.85, a * 0.85 + da, b * 0.85 + db]);
  };
  const cache = new Map<string, Material>();
  return (m) => {
    const key = (m.name ?? "") + m.ramp.join("") + m.ink; let out = cache.get(key); if (out) return out;
    const base = toLab(m.ramp[0])[0] - 0.02;
    out = { ...m, ramp: m.ramp.map((c) => move(c, base)) as Material["ramp"], seam: dark ? fromLab([P[0] + 0.2, da, db]) : move(m.seam, base), ink: dark ? fromLab([Math.min(0.93, P[0] + 0.62), da, db]) : move(m.ink, base), pigment: m.pigment ? move(m.pigment, base - 0.25) : m.pigment };
    const want = (m.accent ? o.accent : undefined) ?? (m.name ? o.colours?.[m.name] : undefined);
    if (want) {
      const { hex, mode = "solid" } = typeof want === "string" ? { hex: want } : want, r = rampFrom(hex, dark);
      // solid: the whole part takes the colour. lines: the faces keep their greys and only strokes and dots change.
      out = mode === "solid" ? { ...out, ramp: r.ramp, seam: r.seam, pigment: r.pigment } : { ...out, ink: r.pigment, seam: r.pigment };
    }
    cache.set(key, out); return out;
  };
};
