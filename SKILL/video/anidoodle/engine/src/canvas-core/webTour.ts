// WEB TOUR. A 12 s walk through a real-feeling website built with anidoodle's interactive pieces,
// driven by a visible cursor, for the launch film. Three sections on one long page:
//   1 a scroll hero: the storybook plate draws itself as the page scrolls (it is pinned, sticky,
//     while it draws), the scrollHero piece fed the page's own scroll progress;
//   2 Bit's hero: he watches the cursor, points at "Get started" on hover, cheers on the click;
//   3 a sign-up form: Bit reads along as each field is typed, covers his eyes for the password,
//     thinks, and cheers when the form goes through.
// The pieces are the REAL pieces (mascotHero, formMascot, scrollHero), each driven through a
// synthetic input log in its own coordinates, exactly what a browser host would log (the form logs
// only lengths and caret positions, never text). The camera punches in on every click and every
// field so the viewer always sees what was done. Everything is a pure function of the frame.
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { C, SANS, camLerp, clamp, inOut, lerp, lerpP, out3, pointer, rr, selfLayer, softShadow, useCam, type Cam } from "./launchKit";
import { stateAt, type InputLog, type Piece } from "./input";
import { scrollHero } from "./scrollHero";
import { mascotHero } from "./mascotHero";
import { formMascot } from "./formMascot";

const W = 1920, H = 1080, N = 360, TICK = 2; // input ticks are 60 Hz: two per frame

// ---------------------------------------------------------------- the page
const VP = { x: 120, y: 104, w: 1680, h: 936 };          // the browser's viewport on screen
const NAV = 76;                                          // the sticky nav bar's height
const S2 = 1500, S3 = 2500;                              // section tops, page px
const HERO_STICK = 900;                                  // the hero stays pinned while the page scrolls this far
const PIECE = 640;
const heroTop = (scroll: number) => 150 + Math.min(scroll, HERO_STICK); // page y of the pinned hero
const BIT = { x: 930, y: S2 + 120, s: 640 }, START = { x: 120, y: S2 + 470, w: 270, h: 78 };
const FORM = { x: 930, y: S3 + 120, s: 640 };
const FIELD = (i: number) => ({ x: 120, y: S3 + 270 + i * 112, w: 580, h: 74 });
const SUBMIT = { x: 120, y: S3 + 270 + 3 * 112 + 12, w: 580, h: 80 };
const TYPED = ["Sam Rivera", "sam@rivera.studio", "*********"];

// ---------------------------------------------------------------- keyframes
type Key<T> = [number, T];
const track = <T>(keys: Key<T>[], mix: (a: T, b: T, u: number) => T) => (f: number): T => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const [f0, a] = keys[i - 1], [f1, b] = keys[i]; return mix(a, b, inOut((f - f0) / (f1 - f0))); }
  return keys[keys.length - 1][1];
};
// the page's scroll: a wheel's flicks, eased by the browser
const scrollAt = track<number>([[0, 60], [92, HERO_STICK + 40], [104, HERO_STICK + 40], [124, S2], [196, S2], [214, S3], [N, S3]], (a, b, u) => lerp(a, b, u));
const click = { start: 170, name: 222, email: 256, password: 290, submit: 320 };
const screenOf = (px: number, py: number, scroll: number): P => [VP.x + px, VP.y + py - scroll];
const centerOf = (r: { x: number; y: number; w: number; h: number }, page: number): P => [VP.x + r.x + r.w / 2, VP.y + r.y + r.h / 2 - page];
// the cursor, on screen: it rests while the wheel turns, then travels to each target
const cursorAt = track<P>([
  [0, [1560, 720]], [100, [1520, 780]], [128, [1640, 860]], [150, [1300, 470]], [166, centerOf(START, S2)], [180, centerOf(START, S2)],
  [200, [860, 820]], [218, centerOf(FIELD(0), S3)], [248, centerOf(FIELD(0), S3)], [254, centerOf(FIELD(1), S3)], [284, centerOf(FIELD(1), S3)],
  [288, centerOf(FIELD(2), S3)], [314, centerOf(FIELD(2), S3)], [319, centerOf(SUBMIT, S3)], [340, centerOf(SUBMIT, S3)], [N, [900, 900]],
], (a, b, u) => lerpP(a, b, u));
// the camera: close on the drawing hero, wide for the scroll, punching in on every click and field
const HOMEC: P = [W / 2, H / 2];
const camKeys: Key<Cam>[] = [
  [0, { c: [1060, 590], z: 1.1 }], [92, { c: [1200, 560], z: 1.16 }], [118, { c: HOMEC, z: 1.0 }], [150, { c: [1080, 560], z: 1.12 }],
  [168, { c: [560, 620], z: 1.85 }], [186, { c: [980, 560], z: 1.18 }], [206, { c: HOMEC, z: 1.0 }], [222, { c: [560, 420], z: 1.75 }],
  [250, { c: [580, 470], z: 1.6 }], [286, { c: [640, 560], z: 1.45 }], [298, { c: [1330, 480], z: 1.85 }], [314, { c: [1150, 520], z: 1.3 }],
  [322, { c: [620, 720], z: 1.7 }], [334, { c: [1150, 540], z: 1.2 }], [352, { c: HOMEC, z: 0.94 }], [N, { c: HOMEC, z: 0.94 }],
];
const camTrack = track<Cam>(camKeys, (a, b, u) => camLerp(a, b, u));
// never still: a breath of drift on top of the moves
const camAt = (f: number): Cam => { const c = camTrack(f), d = Math.sin(f / 23) * 4; return { c: [c.c[0] + d, c.c[1] + Math.cos(f / 29) * 3], z: c.z * (1 + 0.006 * Math.sin(f / 17)) }; };
const charsAt = (f: number, i: number) => { const t0 = [click.name, click.email, click.password][i] + 5, t1 = [250, 284, 312][i]; return Math.max(0, Math.min(TYPED[i].length, Math.floor(((f - t0) / (t1 - t0)) * TYPED[i].length))); };

// ---------------------------------------------------------------- input logs, in each piece's own coordinates
type Box = { x: number; y: number; s: number };
const toPiece = (b: Box, screen: P, scroll: number): P => { const px = screen[0] - VP.x, py = screen[1] - VP.y + scroll; return [((px - b.x) * 560) / b.s, ((py - b.y) * 560) / b.s]; };
const rectIn = (b: Box, r: { x: number; y: number; w: number; h: number }) => ({ x: ((r.x - b.x) * 560) / b.s, y: ((r.y - b.y) * 560) / b.s, w: (r.w * 560) / b.s, h: (r.h * 560) / b.s });
const moves = (b: Box): InputLog => Array.from({ length: N }, (_, f) => { const [x, y] = toPiece(b, cursorAt(f), scrollAt(f)); return { tick: f * TICK, type: "move" as const, x, y, value: "mouse" }; });
let LOGS: { hero: InputLog; bit: InputLog; form: InputLog } | null = null;
const logs = () => {
  if (LOGS) return LOGS;
  const hero: InputLog = Array.from({ length: N }, (_, f) => ({ tick: f * TICK, type: "scroll" as const, value: clamp(scrollAt(f) / HERO_STICK) }));
  const bit: InputLog = [{ tick: 0, type: "rect", target: "start", ...rectIn(BIT, START) }, ...moves(BIT),
    { tick: 160 * TICK, type: "enter", target: "start" }, { tick: click.start * TICK, type: "down", target: "start" }, { tick: (click.start + 4) * TICK, type: "up", target: "start" }, { tick: 196 * TICK, type: "exit", target: "start" }];
  const ids = ["name", "email", "password"], form: InputLog = [...ids.map((id, i) => ({ tick: 0, type: "rect" as const, target: id, ...rectIn(FORM, FIELD(i)) })), { tick: 0, type: "rect", target: "submit", ...rectIn(FORM, SUBMIT) }, ...moves(FORM)];
  ids.forEach((id, i) => {
    const at = [click.name, click.email, click.password][i];
    form.push({ tick: at * TICK, type: "focus", target: id });
    let last = 0;
    for (let f = at; f <= at + 34; f++) { const n = charsAt(f, i); if (n !== last) { last = n; const r = FIELD(i), [x, y] = toPiece(FORM, [VP.x + r.x + 22 + n * 17, VP.y + r.y + r.h / 2 - S3], S3); form.push({ tick: f * TICK, type: "key", target: id, value: n, x, y }); } }
  });
  form.push({ tick: click.submit * TICK, type: "focus", target: "submit" }, { tick: click.submit * TICK, type: "down", target: "submit" }, { tick: (click.submit + 4) * TICK, type: "up", target: "submit" },
    { tick: (click.submit + 5) * TICK, type: "state", value: "busy" }, { tick: (click.submit + 14) * TICK, type: "state", value: "success" });
  const bytick = (a: { tick: number }, b: { tick: number }) => a.tick - b.tick;
  return (LOGS = { hero: hero.sort(bytick), bit: bit.sort(bytick), form: form.sort(bytick) });
};

// ---------------------------------------------------------------- drawing a piece into the page
const subEnv = (env: Env, key: string, px: number): Env => { const k = `tour:${key}:${px}`; let e = env.cache.get(k) as Env | undefined; if (!e) { e = { W: 560, H: 560, scale: px / 560, cache: new Map(), canvas: env.canvas, image: env.image }; env.cache.set(k, e); } return e; };
const drawPiece = (ctx: Ctx, env: Env, key: string, piece: Piece, log: InputLog, f: number, x: number, y: number, s: number) => {
  if (y > VP.y + VP.h || y + s < VP.y) return; // off the viewport
  const px = Math.round(s * 2), L = selfLayer(env, `tour:${key}`, px, px), e = subEnv(env, key, px), t = f * TICK;
  piece.draw(L.ctx, t, e, stateAt(t, log, piece.input));
  softShadow(ctx, x, y, s, s, 26, 1.1);
  ctx.save(); rr(ctx, x, y, s, s, 26); ctx.clip(); ctx.drawImage(L.canvas, x, y, s, s); ctx.restore();
};

// ---------------------------------------------------------------- the frame
const text = (ctx: Ctx, s: string, x: number, y: number, w: number, px: number, col: string) => { ctx.font = SANS(w, px); ctx.fillStyle = col; ctx.textBaseline = "alphabetic"; ctx.fillText(s, x, y); };
const bodyLines = (ctx: Ctx, x: number, y: number, widths: number[]) => widths.forEach((w, i) => { ctx.fillStyle = C.line; rr(ctx, x, y + i * 30, w, 12, 6); ctx.fill(); });
const button = (ctx: Ctx, r: { x: number; y: number; w: number; h: number }, label: string, hot: number, down: number) => {
  const k = 1 - 0.05 * down, cx = r.x + r.w / 2, cy = r.y + r.h / 2, w = r.w * k, h = r.h * k;
  ctx.fillStyle = hot > 0 ? C.accentDeep : C.accent; rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = SANS(600, 28 * k); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, cx, cy + 1); ctx.textAlign = "left";
};
const pressAt = (f: number, at: number) => (f < at ? 0 : f < at + 4 ? out3((f - at) / 4) : Math.max(0, 1 - (f - at - 4) / 6));
const ripple = (ctx: Ctx, p: P, f: number, at: number) => { const u = (f - at) / 16; if (u < 0 || u > 1) return; ctx.strokeStyle = C.accent; ctx.globalAlpha = 1 - u; ctx.lineWidth = 5 * (1 - u) + 1; ctx.beginPath(); ctx.arc(p[0], p[1], 14 + 70 * out3(u), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; };

const drawTour = (ctx: Ctx, env: Env, f: number) => {
  useCam(ctx, env, camAt(f));
  ctx.fillStyle = C.bg; ctx.fillRect(-1000, -1000, W + 2000, H + 2000);
  const sc = scrollAt(f), L = logs();
  // the browser
  softShadow(ctx, VP.x, VP.y - 64, VP.w, VP.h + 64, 26, 1.5);
  ctx.fillStyle = "#fff"; rr(ctx, VP.x, VP.y - 64, VP.w, VP.h + 64, 26); ctx.fill();
  ctx.save(); rr(ctx, VP.x, VP.y - 64, VP.w, VP.h + 64, 26); ctx.clip();
  ctx.fillStyle = "#f4f1ea"; ctx.fillRect(VP.x, VP.y - 64, VP.w, 64);
  ["#e8715a", "#e9b949", "#7cbf6b"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(VP.x + 34 + i * 26, VP.y - 32, 8, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#fff"; rr(ctx, VP.x + 150, VP.y - 50, 560, 36, 18); ctx.fill(); text(ctx, "your-site.com", VP.x + 176, VP.y - 24, 500, 19, C.soft);
  // the page, scrolled
  ctx.save(); ctx.beginPath(); ctx.rect(VP.x, VP.y, VP.w, VP.h); ctx.clip();
  ctx.fillStyle = C.card; ctx.fillRect(VP.x, VP.y, VP.w, VP.h);
  const X = VP.x, Y = (py: number) => VP.y + py - sc;
  // 1: the scroll hero
  text(ctx, "Stories that draw", X + 120, Y(360), 800, 78, C.ink); text(ctx, "themselves.", X + 120, Y(448), 800, 78, C.accent);
  bodyLines(ctx, X + 120, Y(500), [520, 560, 430]);
  text(ctx, "Scroll, and watch the page being made.", X + 120, Y(640), 500, 26, C.soft);
  const ht = heroTop(sc);
  drawPiece(ctx, env, "hero", scrollHero, L.hero, f, X + 930, Y(ht), PIECE);
  text(ctx, "pencil · paint · line", X + 930, Y(ht + PIECE + 44), 500, 20, C.mute);
  // 2: Bit's hero
  ctx.fillStyle = "#f7f2e8"; ctx.fillRect(X, Y(S2 - 40), VP.w, 1000);
  text(ctx, "A mascot that", X + 120, Y(S2 + 250), 800, 66, C.ink); text(ctx, "watches your visitors.", X + 120, Y(S2 + 326), 800, 66, C.accent);
  text(ctx, "Drawn in code. It follows the cursor,", X + 120, Y(S2 + 390), 500, 28, C.soft); text(ctx, "points at buttons, and cheers on a click.", X + 120, Y(S2 + 428), 500, 28, C.soft);
  button(ctx, { x: X + START.x, y: Y(START.y), w: START.w, h: START.h }, "Click me", f >= 160 && f < 196 ? 1 : 0, pressAt(f, click.start));
  drawPiece(ctx, env, "bit", mascotHero, L.bit, f, X + BIT.x, Y(BIT.y), BIT.s);
  // 3: the form
  ctx.fillStyle = C.card; ctx.fillRect(X, Y(S3 - 40), VP.w, 1200);
  text(ctx, "It reads along as you type", X + 120, Y(S3 + 150), 800, 56, C.ink); text(ctx, "…and looks away for your password.", X + 120, Y(S3 + 205), 500, 30, C.soft);
  ["Name", "Email", "Password"].forEach((lab, i) => {
    const r = FIELD(i), at = [click.name, click.email, click.password][i], focused = f >= at && f < ([click.email, click.password, click.submit][i]), n = charsAt(f, i);
    text(ctx, lab, X + r.x, Y(r.y - 10), 600, 20, C.soft);
    ctx.fillStyle = C.paper; rr(ctx, X + r.x, Y(r.y), r.w, r.h, 16); ctx.fill(); ctx.lineWidth = focused ? 3 : 2; ctx.strokeStyle = focused ? C.accent : C.line; ctx.stroke();
    const shown = i === 2 ? "•".repeat(n) : TYPED[i].slice(0, n); text(ctx, shown, X + r.x + 22, Y(r.y + r.h / 2 + 11), 500, 30, C.ink);
    if (focused && Math.floor(f / 6) % 2 === 0) { ctx.font = SANS(500, 30); ctx.fillStyle = C.accent; ctx.fillRect(X + r.x + 24 + ctx.measureText(shown).width, Y(r.y + 18), 3, 38); }
  });
  const done = f >= click.submit + 14;
  button(ctx, { x: X + SUBMIT.x, y: Y(SUBMIT.y), w: SUBMIT.w, h: SUBMIT.h }, done ? "You're in!" : f >= click.submit + 5 ? "Signing up…" : "Sign up", f >= 316 ? 1 : 0, pressAt(f, click.submit));
  drawPiece(ctx, env, "form", formMascot, L.form, f, X + FORM.x, Y(FORM.y), FORM.s);
  // the sticky nav, over the page
  ctx.fillStyle = "rgba(255,253,248,0.94)"; ctx.fillRect(VP.x, VP.y, VP.w, NAV); ctx.fillStyle = C.line; ctx.fillRect(VP.x, VP.y + NAV - 1.5, VP.w, 1.5);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + 60, VP.y + NAV / 2, 10, 0, Math.PI * 2); ctx.fill(); text(ctx, "your site", X + 82, VP.y + NAV / 2 + 9, 700, 26, C.ink);
  ["Home", "Mascot", "Form"].forEach((s, i) => text(ctx, s, X + VP.w - 420 + i * 130, VP.y + NAV / 2 + 8, 500, 22, i === Math.min(2, Math.floor(sc / 1000)) ? C.ink : C.soft));
  // the scroll bar
  const trackH = VP.h - NAV - 20, thumb = trackH * (VP.h / 3500), ty = VP.y + NAV + 10 + (trackH - thumb) * clamp(sc / (3500 - VP.h));
  ctx.fillStyle = "rgba(0,0,0,0.18)"; rr(ctx, VP.x + VP.w - 14, ty, 7, thumb, 4); ctx.fill();
  ctx.restore(); ctx.restore();
  // the cursor and the click it makes
  const cur = cursorAt(f);
  [click.start, click.name, click.email, click.password, click.submit].forEach((a) => ripple(ctx, cur, f, a));
  const down = [click.start, click.name, click.email, click.password, click.submit].some((a) => f >= a && f < a + 4) ? 1 : 0;
  pointer(ctx, cur, down, 1.5);
  // the wheel: while the page scrolls under a still cursor, a small scroll glyph shows the hand is on the wheel
  const v = Math.abs(scrollAt(f + 1) - scrollAt(f - 1));
  if (v > 4) { ctx.globalAlpha = clamp(v / 40); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(ctx, cur[0] + 30, cur[1] + 24, 22, 34, 11); ctx.stroke(); ctx.fillStyle = C.ink; rr(ctx, cur[0] + 39, cur[1] + 30 + ((f * 3) % 12), 4, 8, 2); ctx.fill(); ctx.globalAlpha = 1; }
};

export const webTour: Film = {
  meta: { title: "Web tour · a page built with anidoodle's interactive pieces", W, H, fps: 30, bpm: 90, durationFrames: N, kind: "interactive" },
  assets: { images: {} },
  shots: [{ id: "tour", start: 0, end: N, draw: (ctx, f, env) => drawTour(ctx, env, f) }],
};
