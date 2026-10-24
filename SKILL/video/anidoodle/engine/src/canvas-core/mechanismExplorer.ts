// MECHANISM EXPLORER. The 18-note movement as a piece on a web page, in the isometric hand.
// Untouched, it plays its tune forever (the drum's turn is the loop). Hover it, focus it, or the
// page's button, and it comes apart: each assembly on its own slightly underdamped spring, the outer
// ones quicker, so it opens outside-in and lands with a little weight. Point at a part and it lights;
// the readout says what that part does. Leave and it folds home and plays on.
// Web profile: the camera is fixed (fit to the exploded machine), so the card and the bench never
// change; they are drawn once per device scale into a cached layer and the machine is drawn over it.
import type { Piece, Discrete } from "./input";
import { HZ, attentionOf } from "./input";
import type { Layer } from "./core";
import { parts, play, camApart, PLAN, MOVE, ABOUT, REV, FIG_W as W, FIG_H as H, type State } from "./mechanism";
import { setHand, flatHand, add, mul, paintAll, card, freshPen, rrect, type V3, type P2 } from "./mechanismKit";
import { isometricHand } from "./mechanismHands";

const LOOP = Math.round(REV * HZ), ART = { x0: 120, y0: 110, x1: 960, y1: 950 };
const HOME: Record<string, V3> = { governor: [60, 12, 25], crank: [72, 22, 10], housing: [60, 22, 10], screws: [30, 33.5, 9], comb: [30, 26, 8], bridgeL: [10, 17, 12], bridgeR: [50.7, 17, 12], drum: [30, 17.5, 16] };
const BENCH = (id: string) => id === "plinth" || id === "ruler" || id === "label" || id === "bedplate" || id.startsWith("pscrew") || id.startsWith("post"); // never move, and every moving part paints after them
const inside = (p: Discrete["pointer"]) => !!p && p[0] >= ART.x0 && p[0] <= ART.x1 && p[1] >= ART.y0 && p[1] <= ART.y1;
const springs = Object.fromEntries(PLAN.order.map((id, i) => [id, { omega: 0.17 - i * 0.008, zeta: 0.82, target: (d: Discrete) => (inside(d.pointer) || attentionOf(d) === "apart" || d.focus === "self" ? 1 : 0) }]));
const HAND = isometricHand(), CAM = camApart, TITLE = { fig: "FIG 1", title: "18-NOTE MOVEMENT" };
const hintOf = (reduced: boolean) => (reduced ? "FOCUS TO TAKE IT APART" : "HOVER TO TAKE IT APART");
const REST: State = { rot: 0, shares: {}, lit: "", read: "", bend: [], fan: 0, crank: 0 };

/** the card and the bench, which never move: drawn once per device scale */
const benchLayer = (env: Parameters<Piece["draw"]>[2], reduced: boolean): Layer => {
  const DW = Math.round(W * env.scale), DH = Math.round(H * env.scale), key = `mechExplorer:bench:${DW}x${DH}:${reduced}`;
  let L = env.cache.get(key) as Layer | undefined; if (L) return L;
  L = env.canvas(DW, DH); const c = L.ctx; c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  setHand(HAND);
  try {
    card(c, W, H, { ...TITLE, hint: hintOf(reduced), read: "" });
    HAND.shadow?.(c, rrect(-3, 4.5, 76, 44.5, 3).map(([x, y]) => CAM.p([x, y, -9])), 1);
    paintAll(c, CAM, parts(CAM, { ...REST, bend: play(0).bend }).filter((it) => BENCH(it.id)));
  } finally { setHand(flatHand()); }
  env.cache.set(key, L); return L;
};

export const mechanismExplorer: Piece = {
  meta: { title: "Mechanism explorer", W, H, loop: LOOP, alt: "An 18-note music box movement drawn in flat isometric planes, playing. Hover or focus it to take it apart; point at a part to read what it does." },
  input: { springs: springs as Piece["input"]["springs"] },
  draw: (ctx, tick, env, s) => {
    const L = benchLayer(env, s.reduced);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); freshPen(ctx); ctx.drawImage(L.canvas as CanvasImageSource, 0, 0); ctx.restore();
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); freshPen(ctx);
    const shares = Object.fromEntries(PLAN.order.map((id) => [id, Math.max(0, s.spring[id] as number)])), mean = PLAN.order.reduce((a, id) => a + shares[id], 0) / PLAN.order.length;
    const rot = s.reduced ? 0.4 : ((tick % LOOP) / LOOP) * 2 * Math.PI, pl = play(rot, Math.min(1, mean * 3));
    const state: State = { rot, shares, lit: "drum", read: pl.read, bend: pl.bend, fan: pl.fan, crank: pl.crank };
    if (mean > 0.02 && mean < 0.9) state.read = (s.spring[PLAN.order[0]] as number) > 0.5 ? "EXPLODING" : "REASSEMBLING";
    if (mean >= 0.9 && s.pointer) { // the part under the pointer: the nearest assembly, where it is now
      let best = Infinity;
      for (const id of PLAN.order) { const q: P2 = CAM.p(add(HOME[id], mul(MOVE[id], shares[id]))), d = Math.hypot(q[0] - s.pointer[0], q[1] - s.pointer[1]); if (d < best) { best = d; state.lit = id; } }
      state.read = `${PLAN.order.indexOf(state.lit) + 1}/${PLAN.order.length} · ${ABOUT[state.lit]}`;
    }
    setHand(HAND);
    try {
      HAND.text(ctx, state.read, W - 96, H - 34 - 20 - 13, { cap: 13, align: "right" }); // clear of the host's pause button in the corner
      paintAll(ctx, CAM, parts(CAM, state).filter((it) => !BENCH(it.id)), MOVE, shares);
    } finally { setHand(flatHand()); }
  },
};
