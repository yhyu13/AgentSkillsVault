// HANDS FOR THE MECHANISM KIT. The same machine, marked in a style's own medium. Each hand follows
// the recipe in references/styles/<id>.md: what the mark is, what an edge is, what tone is, and
// whether the medium has light at all. The kit says WHAT is there; a hand decides HOW it is drawn.
//
//   blueprint      white ink on cyanotype: no light, no shadow; outlines ruled, the part to watch
//                  section-lined, travel shown as chain lines
//   colouredPencil one dominant hatch diagonal in each material's pigment, darks cross-hatched,
//                  thin broken sepia-graphite contours heavier where the form turns from the lamp
//   stipple        one pen, dots only: tone is density, an edge is where density changes
//
// Patterns are anchored to the part (its exploded offset), never to the screen, so a part that
// moves carries its marks with it, and a still part's marks never boil.
import type { Ctx, Env, Layer, P } from "./core";
import { Gfx, rng, PENCIL, GRAPHITE } from "./core";
import { kit, sheet, border, WHITE, CYAN, DIM, DRAFT } from "./blueprintKit";
import { letter } from "./drafting";
import { isDark } from "./assetKit";
import { type Hand, type Material, type P2, type Role, offset, path, rawStroke, flatHand, reveal } from "./mechanismKit";

const hash = (...v: number[]) => { let h = 2166136261; for (const x of v) { h ^= Math.round(x * 8) | 0; h = Math.imul(h, 16777619); } return h >>> 0; };
const nameHash = (m: Material) => hash(...[...(m.name ?? "m")].map((c) => c.charCodeAt(0)));

/** the ground of a hand, drawn once into a device-size layer, then knocked back in as a pattern */
const groundLayer = (env: Env, key: string, paint: (L: Layer, g: Gfx) => void): Layer => {
  const DW = Math.round(env.W * env.scale), DH = Math.round(env.H * env.scale), k = `mechHand:${key}:${DW}x${DH}`;
  let L = env.cache.get(k) as Layer | undefined;
  if (!L) { L = env.canvas(DW, DH); L.ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); paint(L, new Gfx(L.ctx, env, 0, DRAFT)); env.cache.set(k, L); }
  return L;
};
const patternOf = (ctx: Ctx, L: Layer, scale: number) => { const p = ctx.createPattern(L.canvas as CanvasImageSource, "no-repeat")!; p.setTransform(new DOMMatrix().scale(1 / scale)); return p; };
const knockWith = (ctx: Ctx, L: Layer, scale: number, pts: P2[]) => { ctx.globalAlpha = 1; ctx.fillStyle = patternOf(ctx, L, scale); path(ctx, pts); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke(); };
const blit = (ctx: Ctx, L: Layer, env: Env) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.canvas as CanvasImageSource, 0, 0); ctx.restore(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); };

/** parallel lines at angle `ang`, `gap` apart, anchored at `anchor`, cut to a polygon: [a, b, lineIndex] */
export const hatchSegs = (pts: P2[], ang: number, gap: number, anchor: P2 = [0, 0]): [P2, P2, number][] => {
  const c = Math.cos(ang), s = Math.sin(ang), proj = pts.map(([x, y]) => -s * (x - anchor[0]) + c * (y - anchor[1]));
  const lo = Math.floor(Math.min(...proj) / gap), hi = Math.ceil(Math.max(...proj) / gap), out: [P2, P2, number][] = [];
  for (let n = lo; n <= hi; n++) {
    const off = n * gap, ox = anchor[0] - s * off, oy = anchor[1] + c * off, ts: number[] = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[j], b = pts[i], da = -s * (a[0] - ox) + c * (a[1] - oy), db = -s * (b[0] - ox) + c * (b[1] - oy);
      if ((da < 0) === (db < 0) || da === db) continue; const t = da / (da - db), px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t; ts.push(c * (px - ox) + s * (py - oy));
    }
    ts.sort((x, y) => x - y); for (let k = 0; k + 1 < ts.length; k += 2) out.push([[ox + c * ts[k], oy + s * ts[k]], [ox + c * ts[k + 1], oy + s * ts[k + 1]], n]);
  }
  return out;
};
/** points every `step` px along a polyline, the first `progress` of it */
const along = (pts: P2[], step: number, close: boolean, progress = 1): P2[] => {
  const q = close ? [...pts, pts[0]] : pts, out: P2[] = []; let L = 0; for (let i = 1; i < q.length; i++) L += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
  const end = L * progress; let d = 0, need = 0;
  for (let i = 1; i < q.length && need <= end; i++) { const a = q[i - 1], b = q[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); while (need <= d + l && need <= end) { const t = l ? (need - d) / l : 0; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); need += step; } d += l; }
  return out;
};

// ---------------------------------------------------------------- blueprint: white ink on cyanotype
export const blueprintHand = (ctx0: Ctx, env: Env, frame: number): Hand => {
  const g = new Gfx(ctx0, env, frame, DRAFT), k = kit(g), L = groundLayer(env, "blueprint", (_, lg) => sheet(kit(lg)));
  const seedOf = (pts: P2[]) => hash(pts[0][0] - offset()[0], pts[0][1] - offset()[1], pts.length);
  const W: Partial<Record<Role, [number, string, number]>> = { out: [1.7, WHITE, 0.95], lit: [2.2, WHITE, 1], in: [1.05, WHITE, 0.85], crease: [0.9, CYAN, 0.8], seam: [0.75, CYAN, 0.7], hair: [0.75, CYAN, 0.8] };
  return {
    id: "blueprint",
    knock: (ctx, pts) => knockWith(ctx, L, env.scale, pts),
    // no light on a drawing: the only tone is section lining, and only the part to watch is cut
    region: (_ctx, pts, _q, m) => { if (!m.accent) return; const o = offset(); for (const [a, b, n] of hatchSegs(pts, Math.PI / 4, 5.5, o)) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 2.5) continue; k.ln(a, b, 0.8, { seed: hash(n, nameHash(m)), color: CYAN, opacity: 0.8, taper: 0.7 }); } },
    line: (ctx, pts, role, _m, close, a, prog) => {
      if (role === "light") return;
      if (role === "chain") { const [p0, p1] = [pts[0], pts[pts.length - 1]]; k.chain(p0 as P, p1 as P, 0.8, { color: DIM, opacity: 0.85 * a, progress: prog }); return; }
      const [w, col, op] = W[role]!; k.pen(pts as P[], w, { color: col, opacity: op * a, closed: close, seed: seedOf(pts), progress: prog, wobble: 0.35 });
      void ctx;
    },
    dot: (ctx, at, r, _m, a) => { ctx.globalAlpha = a; ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(at[0], at[1], r * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    sheet: (ctx) => blit(ctx, L, env),
    frame: (_ctx, _W, _H, p) => border(k, p),
    text: (_ctx, t, x, y, o) => k.text(t, x, y, { cap: o.cap, align: o.align, color: o.soft ? CYAN : WHITE, w: Math.max(1, o.cap * 0.1), opacity: o.alpha ?? 1, seed: hash(x, y) }),
  };
};

// ---------------------------------------------------------------- coloured pencil: hatched in one diagonal
const ANG = -1.02, X2 = ANG + 1.25, CREAM = "#f3ecdc", SEPIA = "#4a3d36";
export const colouredPencilHand = (ctx0: Ctx, env: Env, frame: number): Hand => {
  const g = new Gfx(ctx0, env, frame, PENCIL), L = groundLayer(env, "pencil", (lay, lg) => { lay.ctx.fillStyle = CREAM; lay.ctx.fillRect(0, 0, env.W, env.H); lg.paper("paper", 0.34); lg.paper("coldpress", 0.2); });
  const strokes = (ctx: Ctx, pts: P2[], ang: number, gap: number, col: string, alpha: number, seed: number, w = 1.25) => {
    const o = offset(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
    for (const [a, b, n] of hatchSegs(pts, ang, gap, o)) {
      const r = rng(hash(n, seed)), l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1.5) continue;
      // a hatch stroke: lands fast, lifts in a flick, and breaks where the lead skips the paper's valleys
      const s0 = (r() - 0.35) * 2.2, s1 = (r() - 0.6) * 2.2, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
      ctx.globalAlpha = alpha * (0.75 + r() * 0.4); ctx.setLineDash([3 + r() * 9, 0.8 + r() * 1.6]); ctx.lineDashOffset = r() * 10;
      ctx.beginPath(); ctx.moveTo(a[0] - ux * s0, a[1] - uy * s0); ctx.lineTo(b[0] + ux * s1, b[1] + uy * s1); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  };
  const W: Partial<Record<Role, [number, number]>> = { out: [1.5, 0.8], lit: [1.9, 0.95], in: [1, 0.6], crease: [0.85, 0.45], seam: [0.7, 0.4], hair: [0.7, 0.55] };
  return {
    id: "colouredPencil",
    knock: (ctx, pts) => knockWith(ctx, L, env.scale, pts),
    region: (ctx, pts, q, m) => {
      const d = Math.max(0, Math.min(1, 1 - q / 4)), pig = m.pigment ?? "#8a8a8a", sd = nameHash(m);
      strokes(ctx, pts, ANG, 3.1, pig, (m.accent ? 0.55 : 0.32) + 0.4 * d, sd);                 // local colour, light to dark by pressure
      if (d > 0.35) strokes(ctx, pts, ANG, 3.1, pig, 0.25 + 0.3 * d, sd + 7, 1.1);              // a second pass, offset by the hand
      if (d > 0.6) strokes(ctx, pts, X2, 3.6, m.accent ? "#5a1e14" : "#3b3550", 0.18 + 0.35 * (d - 0.6), sd + 13, 1);  // darks cross-hatched, never filled
    },
    line: (ctx, pts, role, m, close, a, prog) => {
      if (role === "light") return;
      if (role === "chain") { ctx.save(); ctx.setLineDash([7, 4]); rawStroke(ctx, pts, SEPIA, 0.8, false, 0.55 * a, prog); ctx.restore(); return; }
      const [w, op] = W[role]!; g.pen(pts as P[], { w, color: m.accent && role === "lit" ? "#6b2414" : SEPIA, opacity: op * a, closed: close, seed: hash(pts[0][0] - offset()[0], pts[0][1] - offset()[1]), boil: 0, wobble: 0.45, taper: 0.9, progress: prog });
      void ctx;
    },
    dot: (ctx, at, r, _m, a) => { ctx.globalAlpha = 0.85 * a; ctx.fillStyle = GRAPHITE; ctx.beginPath(); ctx.arc(at[0], at[1], r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    sheet: (ctx) => blit(ctx, L, env),
    frame: (ctx, W0, H0, p) => { const pad = 34, edges: [P2, P2][] = [[[pad, pad], [W0 - pad, pad]], [[W0 - pad, pad], [W0 - pad, H0 - pad]], [[W0 - pad, H0 - pad], [pad, H0 - pad]], [[pad, H0 - pad], [pad, pad]]]; edges.forEach(([a, b], i) => g.pen([a, b] as P[], { w: 0.9, color: SEPIA, opacity: 0.55, seed: 40 + i, boil: 0, wobble: 0.8, progress: Math.max(0, Math.min(1, p * 4 - i)) })); void ctx; },
    text: (_ctx, t, x, y, o) => letter(g, t, x, y, { cap: o.cap, align: o.align, color: o.soft ? "#7a6a5e" : SEPIA, opacity: (o.alpha ?? 1) * 0.9, seed: hash(x, y), slant: 0.12 }),
    shadow: (ctx, pts, s) => { const off = pts.map(([x, y]) => [x + 2, y + 8] as P2); strokes(ctx, off, X2, 3.4, "#5a5260", 0.22 * s, 99, 1); },
  };
};

// ---------------------------------------------------------------- stipple: one pen, dots only
const CARBON = "#15120e", BRISTOL = "#fbfaf5";
export const stippleHand = (ctx0: Ctx, env: Env, frame: number): Hand => {
  const g = new Gfx(ctx0, env, frame, { ...PENCIL, wobble: 0.3 }), L = groundLayer(env, "stipple", (lay, lg) => { lay.ctx.fillStyle = BRISTOL; lay.ctx.fillRect(0, 0, env.W, env.H); lg.paper("paper", 0.05); });
  // dot fields come from tiles, one per density step, drawn once: a dot is in a step's tile when its draw is
  // under that density, so a darker step only adds dots. A whole region is then one patterned fill, cheap
  // enough for a close-up, and the pattern is anchored to the part so its dots travel with it.
  const CELL = 2, SPAN = 64, STEPS = 24, TILE = CELL * SPAN;
  const tile = (seed: number, step: number) => {
    const k = `mechHand:stipple:${seed}:${step}:${env.scale}`; let T = env.cache.get(k) as Layer | undefined;
    if (!T) {
      const D = Math.round(TILE * env.scale); T = env.canvas(D, D); const c = T.ctx; c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.fillStyle = CARBON; c.beginPath();
      for (let j = 0; j < SPAN; j++) for (let i = 0; i < SPAN; i++) {
        const r = rng(hash(i, j, seed)); if (r() > step / STEPS) continue;
        const x = (i + r()) * CELL, y = (j + r()) * CELL, rad = 0.62 + r() * 0.18;
        // a dot near the tile edge is drawn again across it, so tiles meet without a seam
        for (const dx of [0, x < 1 ? TILE : x > TILE - 1 ? -TILE : 0]) for (const dy of [0, y < 1 ? TILE : y > TILE - 1 ? -TILE : 0]) { c.moveTo(x + dx + rad, y + dy); c.ellipse(x + dx, y + dy, rad * 1.08, rad, 0.4, 0, Math.PI * 2); }
      }
      c.fill(); env.cache.set(k, T);
    }
    return T;
  };
  const dots = (ctx: Ctx, pts: P2[], density: number, seed: number) => {
    const step = Math.min(STEPS, Math.round(density * STEPS)); if (step <= 0) return; const o = offset();
    const pat = ctx.createPattern(tile(seed % 4, step).canvas as CanvasImageSource, "repeat")!; pat.setTransform(new DOMMatrix().translate(o[0], o[1]).scale(1 / env.scale));
    ctx.fillStyle = pat; path(ctx, pts); ctx.fill();
  };
  const SPACE: Partial<Record<Role, [number, number]>> = { out: [1.5, 0.8], lit: [1.15, 0.95], in: [2.6, 0.72], crease: [3.2, 0.7], seam: [3.8, 0.66], hair: [3.2, 0.7], chain: [5.5, 0.66] };
  return {
    id: "stipple",
    knock: (ctx, pts) => knockWith(ctx, L, env.scale, pts),
    region: (ctx, pts, q, m) => { const d = Math.max(0, Math.min(1, 1 - q / 4)); dots(ctx, pts, Math.min(0.95, 0.04 + 0.78 * d ** 1.25 + (m.accent ? 0.22 : 0)), nameHash(m)); },
    // no contours in this medium: an outline is a denser row of the same dots
    line: (ctx, pts, role, _m, close, a, prog) => {
      if (role === "light") return; const [step, r] = SPACE[role]!, o = offset(), pa = along(pts, step, close, prog);
      ctx.globalAlpha = a; ctx.fillStyle = CARBON; ctx.beginPath();
      pa.forEach(([x, y], i) => { const rr = rng(hash(x - o[0], y - o[1], i)); const jx = (rr() - 0.5) * 0.5, jy = (rr() - 0.5) * 0.5; ctx.moveTo(x + jx + r, y + jy); ctx.arc(x + jx, y + jy, r * (0.85 + rr() * 0.3), 0, Math.PI * 2); });
      ctx.fill(); ctx.globalAlpha = 1;
    },
    dot: (ctx, at, r, _m, a) => { ctx.globalAlpha = a; ctx.fillStyle = CARBON; ctx.beginPath(); ctx.arc(at[0], at[1], Math.max(0.8, r * 0.7), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    sheet: (ctx) => blit(ctx, L, env),
    frame: (ctx, W0, H0, p) => { const pad = 34; const ring: P2[] = [[pad, pad], [W0 - pad, pad], [W0 - pad, H0 - pad], [pad, H0 - pad]]; const pa = along(ring, 3, true, p); ctx.fillStyle = CARBON; ctx.globalAlpha = 0.55; ctx.beginPath(); pa.forEach(([x, y]) => { ctx.moveTo(x + 0.6, y); ctx.arc(x, y, 0.6, 0, Math.PI * 2); }); ctx.fill(); ctx.globalAlpha = 1; },
    text: (_ctx, t, x, y, o) => letter(g, t, x, y, { cap: o.cap, align: o.align, color: o.soft ? "#6b665e" : CARBON, opacity: o.alpha ?? 1, seed: hash(x, y), slant: 0, w: Math.max(0.9, o.cap * 0.085) }),
    shadow: (ctx, pts, s) => dots(ctx, pts.map(([x, y]) => [x + 2, y + 7] as P2), 0.22 * s, 7),
  };
};

// ---------------------------------------------------------------- isometric: flat planes, three tones, no line
// The house iso medium (references/styles/isometric.md): every plane ONE flat colour, exactly three
// tones per material (top lightest, the lamp-side face middle, the far face darkest), tone meets tone
// with no contour, details as hairlines, cast shadows one flat shape. Fills only, so it is fast
// enough for an interactive page.
const mixHex = (a: string, b: string, t: number) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
export const isometricHand = (paper = "#efe8dc", ink = "#2b2a33"): Hand => {
  const tones = new Map<string, [string, string, string]>();
  // on a dark page a top lifted halfway to white glares, so the lit top steps up less and the far face sinks more
  const dark = isDark(paper), up = dark ? 0.26 : 0.5, down = dark ? 0.38 : 0.3;
  const three = (m: Material) => { const k = m.pigment ?? "#9a9a9a"; let t = tones.get(k); if (!t) { t = [mixHex(k, "#1d1a2a", down), k, mixHex(k, "#ffffff", up)]; tones.set(k, t); } return t; };
  const flat = (ctx: Ctx, pts: P2[], col: string, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; path(ctx, pts); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.lineJoin = "round"; ctx.stroke(); ctx.globalAlpha = 1; };
  const base = flatHand(paper, "#7a7280", "#b9b0a3");
  return {
    ...base, id: "isometric", coarse: 3.4,
    knock: (ctx, pts) => flat(ctx, pts, paper),
    region: (ctx, pts, q, m, a) => { const [far, side, top] = three(m); flat(ctx, pts, q >= 3.6 ? top : q >= 1.8 ? side : far, a); },
    step: (q) => (q >= 3.6 ? 2 : q >= 1.8 ? 1 : 0), opaque: true,
    line: (ctx, pts, role, m, close, a, prog) => {
      // a plane is pen-traced before it is filled; once filled, tone meets tone and the trace is gone
      if ((role === "out" || role === "lit" || role === "in" || role === "crease") && reveal().tone < 1) { rawStroke(ctx, pts, "#6f8cc4", 1.6, close, 0.9 * a, prog); return; }
      if (role === "seam" || role === "hair") rawStroke(ctx, pts, three(m)[0], 0.7, close, 0.8 * a, prog);
      else if (role === "chain") { ctx.save(); ctx.setLineDash([6, 4]); rawStroke(ctx, pts, ink, 0.8, false, 0.35 * a, prog); ctx.restore(); }
    },
    dot: (ctx, at, r, m, a) => { ctx.globalAlpha = a; ctx.fillStyle = three(m)[0]; ctx.beginPath(); ctx.arc(at[0], at[1], r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    shadow: (ctx, pts, s) => flat(ctx, pts.map(([x, y]) => [x + 6, y + 9] as P2), dark ? "#000000" : "#3a3346", (dark ? 0.32 : 0.13) * s),
  };
};

/** every hand, by the id of the style whose medium it follows ("flat" is the kit's plain reference hand) */
export const HANDS: Record<string, (ctx: Ctx, env: Env, frame: number) => Hand> = {
  flat: () => flatHand(),
  blueprint: blueprintHand,
  colouredPencil: colouredPencilHand,
  stipple: stippleHand,
  isometric: () => isometricHand(),
};
