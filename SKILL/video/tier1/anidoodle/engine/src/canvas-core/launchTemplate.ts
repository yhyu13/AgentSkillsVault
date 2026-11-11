// LAUNCH TEMPLATE. Your product's launch film from data: a product name, the asks a user would
// make, the answers, the words for the type frames, and the exact install lines. It is the launch
// film's grammar (references/workflows/launch-video-kit.md) with nothing of anidoodle's own left in it:
//
//   ask (plate): the prompt is already being typed at frame 0 (a silent-readable hook), the camera
//         eases out from the composer, the pointer presses Generate, an ink drop arcs into the thread
//         and blooms open into a card where the plate draws itself, live. Earlier answers stay and the
//         thread scrolls. The camera then leans in on the new card.
//   ask (ui): the product's own interface, drawn from data (productUI.ts): its before state, the
//         ask typed into its command bar (optional), the pointer presses its action, and every item
//         springs to the after state. `split` puts words in their own column beside it.
//   ask (film): any film of this engine (a webTour, a loop) played in a card, `split` as above.
//   type: a full-frame word page inside an ink bloom (launchCut.ts). Words never sit on the art.
//   end:  the motif relay: an ink drop lifts off Generate (or the product's action) and lands as
//         the dot of the end card's mark, and the page blooms open FROM it and stays: the name, one
//         line, the install lines in a dark panel, held for `endBeats` (3 s or more).
//
// One timeline, any shape (launchLayout.ts), 30 or 60 fps, two looks (preset "drawn" or "clean"),
// sound cues from the picture's own timing (launchSound.ts), captions from its words.
// Everything is timed on a beat grid (bpm from the brief). With `claimBar`, the last ask's length is
// solved so the end card lands on that bar's downbeat, or the build throws.
//
//   export const myLaunch = makeLaunchFilm({ title: "Tally", asks: [...], words: [...], ... });
//   (or: node tools/launch.mjs new myLaunch; then node tools/launch.mjs ship myLaunch --shapes 16x9,9x16)
import { probeRect, type Ctx, type Env, type P } from "./core";
import type { Film } from "./film";
import {
  C, SANS, MONO, camLerp, caretAt, charTimes, clamp, drawChatFrame, expo, inOut, inkCard, inkDrop,
  lerp, lerpP, out3, plateLayer, pointer, press, ramp, rr, spring, toScreen, typedAt, useCam, type Cam, type Drop, type ChatGeom, type Rect,
} from "./launchKit";
import { launchLayout, estWidth, installRows, wrapEst, SHAPES, type LaunchLayout, type Shape } from "./launchLayout";
import { chatGeom } from "./launchKit";
import { beatGrid, bloomFrame, bloomRadius, makeCut, pic, type, typeFrame, type Seg, type TypeLine } from "./launchCut";
import { measure, writeOn, setType } from "./kinetic";
import { drawProductUI, springLand, uiActionAt, uiCommandAt, uiSettles, uiWindow, type ProductUI, type UiTheme } from "./productUI";
import { relay, checkRelay, type MotifPose, type Seam } from "./motif";
import { launchAudio, type LaunchCue } from "./launchSound";
import { fitScore, limiter, renderPiece } from "./music/render";
import { loudness, truePeak } from "./music/meter";
import * as families from "./music/pieces/families";
import * as launchPieces from "./music/pieces/launch";
import * as nocturnePieces from "./music/pieces/nocturne";
import * as samplers from "./music/pieces/samplers";
import type { Piece } from "./music/plan";
import { composePiece, stretchIndex, withStretch, type Material } from "./music/compose";
import { perform } from "./music/perform";
import { beatsPerBar } from "./music/plan";
import { novelty } from "./music/novelty";

/** chat -> Generate -> a plate drawing itself in the answer card (the default kind) */
export type PlateAsk = {
  kind?: "plate";
  prompt: string;            // what the user types, in their words
  plate: Film;               // the answer: any film of this engine, drawn live into the card
  label: string;             // the card's byline ("marker comic", "your dashboard, redrawn")
  from?: number; to?: number; // the plate frames to play while the card is up (default: all of it)
  crop?: [number, number, number, number]; // a source rectangle of the plate, in plate pixels at 1080 across
};
/** the product's own UI from data: before -> (the ask typed, the action pressed) -> after */
export type UiAsk = { kind: "ui"; ui: ProductUI; prompt?: string; split?: TypeLine[] };
/** any film (a webTour, a loop, a plate) in a card */
export type FilmAsk = { kind: "film"; film: Film; from?: number; to?: number; split?: TypeLine[] };
export type LaunchAsk = PlateAsk | UiAsk | FilmAsk;
export type LaunchSpec = {
  title: string;             // the product name: the thread's name, the end card, the corner mark
  subtitle?: string;         // the thread's subline
  placeholder?: string;      // the empty composer
  genLabel?: string;         // the button's word (default "Generate")
  accent?: string;           // the button and caret colour (and the clean preset's one accent), hex
  asks: LaunchAsk[];         // 1 to 3 beats: prompt-to-plate, product UI, or any film
  words?: TypeLine[][];      // words[i] is a type frame after asks[i], for i < asks.length - 1
  tagline: string;           // the one line under the name on the end card
  install: string[];         // the exact lines a viewer copies; held on screen for the whole end card
  footer?: string;           // small print under the panel (where it runs, the repo)
  bpm: number;               // the beat grid: bpm comes from the brief (the score composed for it)
  fps?: 30 | 60;             // 60 for UI-heavy films (smoother scrolls and springs); the timing is the same
  askBeats?: number; typeBeats?: number; endBeats?: number; // default 6, 4, 8
  claimBar?: number;         // land the end card on this bar's downbeat, counting from bar 0 (solves the last ask)
  // The score: a piece COMPOSED for this product's brief (references/music/compose.md), or null for
  // a silent film. Required, so no film inherits a score by default. anidoodle's own pieces are
  // refused: every user's film gets its own music, never ours.
  // A Material (what compose.md writes) is composed here; a finished Piece is used as is.
  score: (() => Piece | Material) | null;
  audio?: Film["audio"];     // or your own finished mix; wins over score and sfx
  limit?: boolean;           // let a look-ahead limiter take the score's last peaks so it reaches -14 LUFS (default off: the peak ceiling wins)
  shape?: Shape;             // the frame: 16x9 (default), 1x1, 4x5, 9x16. Every shape is re-composed by launchLayout, never cropped; film.reshape(s) gives the same film in another shape
  preset?: "drawn" | "clean"; // the look: ink, blooms and hand lettering (default), or a quiet canvas, one accent and set type
  sfx?: boolean;             // sound cues from the picture's timing (default true; false = the score alone)
  motif?: boolean;           // the relay into the end card (default true): the drop becomes the mark's dot
  captions?: "sidecar" | "burn"; // .srt/.vtt only (default), or also burned into their own band (phone shapes)
  claims?: string[];         // any other on-screen or narrated claim (a number in the UI, a spoken line); the words, split words and tagline are claims already
};

// the clean preset: a quiet canvas, one accent, type as the design. Our own palette, drawn for it.
export const CLEAN = { bg: "#f3f2ef", card: "#ffffff", ink: "#15161a", soft: "#5b5f68", mute: "#9da1a9", line: "#e4e4e1", chip: "#efefec", accent: "#2f54eb", accentDeep: "#2442bf", paper: "#fbfbf9", shadow: "rgba(20,24,30,0.08)" };

// anidoodle's own pieces (the demos and our launch score) are examples of the composer, never a
// user's soundtrack. Refused by identity, by title and by content (the novelty gate), so a thin or
// retitled wrapper does not slip through. `audio` is the caller's own finished mix and is not checked.
const OURS: (() => Piece)[] = [...Object.values(families), ...Object.values(launchPieces), ...Object.values(nocturnePieces), ...Object.values(samplers)].filter((v): v is () => Piece => typeof v === "function");
const asPiece = (score: () => Piece | Material) => (): Piece => { const x = score(); return "plan" in x ? x : composePiece(x); };
const refuseOurs = (score: () => Piece | Material) => {
  const ours = () => new Set(OURS.map((f) => { try { return f().title; } catch { return null; } }).filter(Boolean));
  if ((OURS as unknown[]).includes(score) || ours().has(score().title)) throw new Error(`launchTemplate: "${score().title}" is one of anidoodle's own pieces; compose a score for this product's brief (references/music/compose.md) or pass score: null`);
  // by content too: a retitled copy, a transposition or a quoted line of ours fails the same novelty gate `music.mjs check` runs
  const corpus: Record<string, () => Piece> = {};
  OURS.forEach((f, i) => { try { const p = asPiece(f)(); corpus[`${p.title} #${i}`] = () => p; } catch { /* not a piece */ } });
  const v = novelty(asPiece(score)(), corpus);
  if (!v.pass) throw new Error(`launchTemplate: "${score().title}" is too close to anidoodle's own "${v.worst.name.replace(/ #\d+$/, "")}" (similarity ${v.worst.score}, ${v.worst.reusedFragments} reused 6-note fragments); compose a score for this product's brief (references/music/compose.md) or pass score: null`);
};
const TYPE_O = { lead: -4, stagger: 18 }; // the word starts as the bloom closes over the frame; lines run on without a gap
const TR = 16;   // a bloom-in: frames it takes to open over the previous scene (a seam between kinds, with no word page)
const DL = 14;   // the motif relay: the drop's flight into the end card, in frames (it lands ON the end card's first frame)
const LIFT = 6;  // ...after a bead of ink swells on its source for this many frames
const isChat = (a: LaunchAsk): a is PlateAsk => !a.kind || a.kind === "plate";

// the timing inside one chat ask, from its prompt and its length (`a0` delays the typing past a bloom-in)
const askTiming = (prompt: string, i: number, ASK: number, a0 = 0) => {
  const raw = charTimes(prompt, 0, 1, 7 + i * 4), last = raw[raw.length - 1] || 1;
  const b = Math.round(ASK * 0.25) + a0, a = i === 0 ? -Math.round(b * 1.2) : 4 + a0; // the first prompt is under way at frame 0
  const times = raw.map((t) => a + (t / last) * (b - a));
  const down = b + 16, up = down + 5, drop: Drop = { t0: up + 5, land: up + 19, full: up + 40 };
  return { times, b, down, up, drop };
};
// a UI ask: the ask typed into the product's command bar (if it has a prompt), then its action pressed
const uiTiming = (prompt: string | undefined, i: number, ASK: number, a0: number, split = false) => {
  const b = Math.round(ASK * (prompt ? 0.3 : split ? 0.13 : 0.2)) + a0; // a split beat's words are the wait: its press follows them
  let times: number[] = [];
  if (prompt) { const raw = charTimes(prompt, 0, 1, 11 + i * 4), last = raw[raw.length - 1] || 1, a = i === 0 ? -Math.round(b * 0.8) : 6 + a0; times = raw.map((t) => a + (t / last) * (b - a)); }
  const down = b + 14, up = down + 5;
  return { times, b, down, up, drop: { t0: up + 2, land: up + 2, full: up + 2 } as Drop };
};

export type LaunchFilm = Omit<Film, "reshape"> & {
  cut: ReturnType<typeof makeCut>; layout: LaunchLayout; reshape: (shape: string) => LaunchFilm;
  cues: LaunchCue[];     // the sound cues the picture emits (frames of this film)
  heroPx: number | null; // the hook's prompt size (px at the delivered size), when the film opens on a chat ask
  seams: Seam[];         // the motif's seams, each checked (checkRelay)
  timing: { base: number; len: number; tin: number; b: number; down: number; up: number; drop: Drop; times: number[] }[]; // each ask's own timing, content frames at 30 fps
  captions: { from: number; to: number; text: string }[]; // = meta.captions
  claims: string[];      // every claim the film makes, each to be listed in facts.json with its source (tools/facts.mjs)
};
export const makeLaunchFilm = (spec: LaunchSpec): LaunchFilm => {
  const fps = spec.fps ?? 30, m = fps / 30, n = spec.asks.length, shape = spec.shape ?? "16x9", clean = spec.preset === "clean";
  if (fps !== 30 && fps !== 60) throw new Error(`launchTemplate: fps ${fps}; a launch film runs at 30, or 60 for a UI-heavy film`);
  if (!(shape in SHAPES)) throw new Error(`launchTemplate: shape '${shape}' is not one of ${Object.keys(SHAPES).join(", ")}`);
  if (spec.preset !== undefined && spec.preset !== "drawn" && spec.preset !== "clean") throw new Error(`launchTemplate: preset '${spec.preset}' is not "drawn" or "clean"`);
  if (!(spec.bpm > 0)) throw new Error("launchTemplate: set bpm from the brief (the tempo of the score composed for this film)");
  if (spec.score === undefined && !spec.audio) throw new Error("launchTemplate: `score` is required: a piece composed for this product (references/music/compose.md), or null for silence");
  if (n < 1 || n > 3) throw new Error("launchTemplate: 1 to 3 asks; more is a feature list, not a story");
  if (spec.score) refuseOurs(spec.score);
  const chatIdx = spec.asks.map((a, i) => (isChat(a) ? i : -1)).filter((i) => i >= 0), chatOrd = (i: number) => chatIdx.indexOf(i);
  const burn = spec.captions === "burn" && shape !== "16x9";
  const L = launchLayout(shape, { prompts: chatIdx.map((i) => (spec.asks[i] as PlateAsk).prompt), install: spec.install, tagline: spec.tagline, title: spec.title, band: burn });
  const PAL = clean ? { ...CLEAN, ...(spec.accent ? { accent: spec.accent } : {}) } : C;
  const ACC = spec.accent ?? (clean ? CLEAN.accent : undefined), INK = clean ? PAL.accent : PAL.ink; // the drop, the motif: ink, or the one accent
  const G: ChatGeom = clean ? { ...L.chat, theme: CLEAN, drop: INK, iris: true } : L.chat;
  const W = L.W, H = L.stage.h, TH = L.thread, CAM = L.cam, CARD = TH.card, VIEW_BOTTOM = TH.viewBottom, k = G.k, minPx = L.phone ? 32 : 18;
  const GEN_C: P = [G.GEN.x + G.GEN.w / 2, G.GEN.y + G.GEN.h / 2];
  const UI_FULL: Rect = L.uiFull;
  // 9x16: text stays inside the platforms' safe rectangle SAFE (launchLayout.PHONE_SAFE). The camera's
  // close-ups zoom about a point that stays put, and whatever a move carries toward a zone fades first.
  const ZONES = L.zones, SAFE = L.safe, SC: P = [SAFE.x + SAFE.w / 2, SAFE.y + SAFE.h / 2];
  const about = (p: P, z: number): P => [p[0] - (p[0] - W / 2) / z, p[1] - (p[1] - H / 2) / z]; // a camera at zoom z that leaves world point p where it is on screen
  const THEME: UiTheme = { bg: PAL.bg, card: PAL.card, ink: PAL.ink, soft: PAL.soft, mute: PAL.mute, line: PAL.line, chip: PAL.chip, accent: ACC ?? PAL.accent, paper: PAL.paper };

  // ---------------------------------------------------------------- the beat grid and the asks' lengths (30 fps units; 60 fps draws between them)
  const grid = beatGrid(spec.bpm, 30);
  const ASK = Math.round((spec.askBeats ?? 6) * grid.beat), TYPE = Math.round((spec.typeBeats ?? 4) * grid.beat), END0_HOLD = Math.round((spec.endBeats ?? 8) * grid.beat);
  let END = END0_HOLD; // the end card is a hold: a scored film sets it so the film is whole bars of its score
  if (ASK < 100) throw new Error(`launchTemplate: an ask beat needs 100 frames or more (it has ${ASK}); raise askBeats`);
  if (END < MIN_END(30)) throw new Error("launchTemplate: the end card must hold the install lines 3 s or more; raise endBeats");
  const words = spec.words ?? [];
  // claimBar solves the last ask's length. A longer ask is really longer (the card holds, the plate
  // draws over the extra time); it is never the same ask slowed down, which would repeat frames.
  const typeCount = spec.asks.slice(0, -1).filter((_, i) => words[i]?.length).length;
  const SOLVED = spec.claimBar !== undefined ? grid.solve(spec.claimBar, (n - 1) * ASK + typeCount * TYPE, 60) : ASK;
  const LEN = spec.asks.map((_, i) => (i === n - 1 ? Math.max(ASK, SOLVED) : ASK)); // content frames per ask
  const BASE = LEN.map((_, i) => LEN.slice(0, i).reduce((a, b) => a + b, 0));
  // a seam between two kinds (or into a UI or a film) with no word page on it opens with a bloom-in
  const TIN = spec.asks.map((a, i) => (i > 0 && !(isChat(a) && isChat(spec.asks[i - 1])) && !words[i - 1]?.length ? TR : 0));
  const T = spec.asks.map((a, i) => ({ ...(isChat(a) ? askTiming(a.prompt, i, ASK, TIN[i]) : a.kind === "ui" ? uiTiming(a.prompt, i, ASK, TIN[i], !!a.split?.length) : { times: [], b: 0, down: 0, up: 0, drop: { t0: 0, land: 0, full: 0 } }), base: BASE[i], len: LEN[i], tin: TIN[i] }));
  const END0 = BASE[n - 1] + LEN[n - 1]; // content frame where the end card starts
  const askOf = (f: number) => { let i = n - 1; while (i > 0 && T[i].base > f) i--; return i; };

  // ---------------------------------------------------------------- the thread (the chat asks share one)
  type Item = { at: number; h: number; user?: string; lines?: string[]; card?: number };
  const items: Item[] = [];
  chatIdx.forEach((i) => { const t = T[i], o = chatOrd(i); items.push({ at: t.base + t.up, h: TH.bubbleH + (TH.bubbles[o].length - 1) * TH.bubbleLineH, user: (spec.asks[i] as PlateAsk).prompt, lines: TH.bubbles[o] }); items.push({ at: t.base + t.drop.land, h: CARD + TH.cardDy, card: i }); });
  const ys = (() => { let y = TH.top; return items.map((it) => { const r = y; y += it.h + TH.gap; return r; }); })();
  const scrollAt = (f: number) => { let s = 0; items.forEach((it, k) => { const want = Math.max(0, ys[k] + it.h - VIEW_BOTTOM); if (want > s) s += (want - s) * expo(ramp(f, it.at - 2, it.at + 16)); }); return s; };
  const cardY = (i: number, f: number) => ys[items.findIndex((it) => it.card === i)] + TH.cardDy - scrollAt(f);
  const plateFrame = (i: number, f: number) => { const a = spec.asks[i] as PlateAsk, t = T[i], from = a.from ?? 0, to = a.to ?? a.plate.meta.durationFrames - 1; return lerp(from, to, ramp(f, t.base + t.drop.land, t.base + t.len - 8)); };
  // the card opens on a spring and lands on its first arrival (its sound sits on that frame)
  const OMEGA = 4.163 / 21, ZETA = 0.8, arrive = (i: number) => springLand(T[i].base + T[i].drop.land, OMEGA, ZETA);
  const growAt = (i: number) => (f: number) => (f >= arrive(i) ? 1 : spring(f, T[i].base + T[i].drop.land, OMEGA, ZETA));

  const bug = (c: Ctx, env: Env) => {
    if (clean) { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.font = SANS(600, L.bug.px * 0.8); c.fillStyle = PAL.soft; c.textAlign = "right"; c.textBaseline = "alphabetic"; c.fillText(spec.title, L.bug.x, L.bug.y); c.textAlign = "left"; return; }
    writeOn(c, env, spec.title, L.bug.x, L.bug.y, L.bug.px, 1, "ink", { color: C.soft, align: "right", seed: 3 });
  };
  // focus: while the camera is close on the composer the thread recedes (it would be cut by the frame's
  // edge), and while it leans on a card everything but that card does; nothing is ever half off-frame
  // And whatever the camera's edge is about to cut fades before it does: an element's opacity is how
  // far inside the view it sits (full at 24 px in, none at the edge), so nothing shows half off-frame.
  type Focus = { macro: number; lean: number; keep: number; cam: Cam };
  // (on 9x16 the edge that counts is the safe rectangle's, so text fades before it reaches a zone; the fade
  // is short, ZONE_FADE px, because the hook's composer spans the window and a zone's line is not a visible edge)
  const ZONE_FADE = 8;
  const seenSafe = (cam: Cam, x0: number, y0: number, x1: number, y1: number) => { const [a, b] = toScreen(cam, [x0, y0], W, H), [c, d] = toScreen(cam, [x1, y1], W, H); return clamp(Math.min(a - SAFE.x, SAFE.x + SAFE.w - c, b - SAFE.y, SAFE.y + SAFE.h - d) / ZONE_FADE); };
  const seen = ZONES ? seenSafe : (cam: Cam, x0: number, y0: number, x1: number, y1: number) => { const hw = W / 2 / cam.z, hh = H / 2 / cam.z, d = Math.min(x0 - (cam.c[0] - hw), cam.c[0] + hw - x1, y0 - (cam.c[1] - hh), cam.c[1] + hh - y1) * cam.z; return clamp(d / (24 * k)); };
  // (on a phone the close-up is nearly the whole window, so the header and thread stay, cut only by `seen`)
  // a card's width with its byline, which can run past the card (an estimate that errs wide)
  const cardSpan = (i: number) => Math.max(CARD, 26 * k + estWidth((spec.asks[i] as PlateAsk).label, G.px.label));
  const chat = (ctx: Ctx, env: Env, f: number, typed: string, caret: boolean, pr: number, hot: number, fo: Focus = { macro: 0, lean: 0, keep: -1, cam: CAM.home }, Gc: ChatGeom = G) => {
    const C0 = G.CHAT, mf = L.phone || Gc !== G ? 0 : fo.macro, headA = Math.min(1 - mf, seen(fo.cam, C0.x + 40 * k, C0.y + 30 * k, C0.x + C0.w - 40 * k, C0.y + 76 * k)), compA = seen(fo.cam, Gc.INPUT.x, Gc.INPUT.y, Gc.INPUT.x + Gc.INPUT.w, Gc.INPUT.y + Gc.INPUT.h);
    drawChatFrame(ctx, { typed, caret, placeholder: spec.placeholder ?? "Describe what you want…", genPress: pr, genHot: hot, title: spec.title, subtitle: spec.subtitle ?? "", genLabel: spec.genLabel, accent: ACC, head: headA, composer: compA, composerGeom: Gc === G ? undefined : Gc }, G);
    const sc = scrollAt(f), rest = (1 - mf) * (1 - fo.lean), [, cyT, , chH] = TH.clip;
    ctx.save(); ctx.beginPath(); ctx.rect(...TH.clip); ctx.clip();
    items.forEach((it, k) => {
      if (f < it.at) return;
      const y = ys[k] - sc; if (y > VIEW_BOTTOM || y + it.h < (ZONES ? cyT : 100)) return; // (on 9x16 an item scrolled wholly under the window's top is not drawn)
      // what of it the thread's window shows, and whether the camera shows all of that
      const vy0 = Math.max(y, cyT), vy1 = Math.min(y + it.h, cyT + chH), x0 = it.card !== undefined ? TH.cardX : TH.bubbleR - TH.bubbleMaxW, x1 = it.card !== undefined ? TH.cardX + (ZONES ? cardSpan(it.card) : CARD) : TH.bubbleR;
      const A = (it.card === fo.keep ? 1 - mf : rest) * (vy1 > vy0 ? seen(fo.cam, x0, vy0, x1, vy1) : 1); if (A < 0.01) return;
      if (it.user !== undefined) {
        ctx.globalAlpha = A * ramp(f, it.at, it.at + 8); ctx.font = SANS(500, G.px.bubble);
        const bw = Math.max(...it.lines!.map((l) => ctx.measureText(l).width)) + 2 * TH.bubblePad; ctx.fillStyle = PAL.chip; rr(ctx, TH.bubbleR - bw, y, bw, it.h - 2, TH.bubbleRad); ctx.fill();
        ctx.fillStyle = PAL.ink; ctx.textBaseline = "middle"; it.lines!.forEach((l, j) => ctx.fillText(l, TH.bubbleR - bw + TH.bubblePad, y + TH.bubbleH / 2 + j * TH.bubbleLineH)); ctx.globalAlpha = 1;
      } else {
        const i = it.card!, a = spec.asks[i] as PlateAsk;
        const d = T[i].drop, b = T[i].base;
        { const py0 = Math.max(y + TH.cardDy, cyT), py1 = Math.min(y + TH.cardDy + CARD, cyT + chH); ctx.globalAlpha = A; if (py1 > py0) probeRect(ctx, env, TH.cardX, py0, CARD, py1 - py0, `answer card ${i}`); } // the part the thread's window shows
        inkCard(ctx, TH.cardX, y + TH.cardDy, CARD, f, { t0: b + d.t0, land: b + d.land, full: b + d.full }, plateLayer(env, `ask${i}`, a.plate, plateFrame(i, f), 1080), y + TH.cardDy - 30 * k > cyT ? a.label : "", a.crop, G, growAt(i)); // a byline scrolled under the window's top is not drawn at all
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
    chatIdx.forEach((i) => { const t = T[i]; inkDrop(ctx, f, { t0: t.base + t.drop.t0, land: t.base + t.drop.land }, [TH.cardX + CARD / 2, cardY(i, t.base + t.drop.land) + CARD / 2], G); });
  };
  // the camera: close on the composer while typing (the WHOLE composer in frame, so the typed words
  // never leave it), out to the room for the press, then a lean onto the new card, which stays whole
  // with a margin on every side
  const HOME = CAM.home;
  const inView = (c: P, z: number): P => { const hw = W / 2 / z, hh = H / 2 / z; return [clamp(c[0], Math.min(hw, W - hw), Math.max(hw, W - hw)), clamp(c[1], Math.min(hh, H - hh), Math.max(hh, H - hh))]; };
  // (a phone composer is nearly the frame's width, so there the close-up IS the window: the empty state, creeping 3 %)
  const MZ = L.phone ? 1 : Math.max(1, Math.min(CAM.macroZ, (0.9 * W) / (G.INPUT.w + 48 * k), (0.8 * H) / (G.INPUT.h + 48 * k)) / 1.03);
  const leanOn = (i: number): Cam => {
    const cy = cardY(i, T[i].base + T[i].len), lab = 44 * k, box = { x: TH.cardX, y: cy - lab, w: ZONES ? cardSpan(i) : CARD, h: CARD + lab }, m = 36 * k;
    if (ZONES) {
      // 9x16: the card and its byline centred in the safe rectangle, as large as it allows up to leanZ
      const S = SAFE, z = Math.max(1, Math.min(CAM.leanZ, (0.86 * S.w) / box.w, (0.86 * S.h) / box.h)), bc: P = [box.x + box.w / 2, box.y + box.h / 2];
      const c: P = [bc[0] - (SC[0] - W / 2) / z, bc[1] - (SC[1] - H / 2) / z];
      return { c: [clamp(c[0], box.x + box.w - (S.x + S.w - m - W / 2) / z, box.x - (S.x + m - W / 2) / z), clamp(c[1], box.y + box.h - (S.y + S.h - m - H / 2) / z, box.y - (S.y + m - H / 2) / z)], z };
    }
    const z = Math.max(1, Math.min(CAM.leanZ, (0.86 * W) / box.w, (0.86 * H) / box.h)), hw = W / 2 / z, hh = H / 2 / z;
    const c = lerpP(HOME.c, [box.x + box.w / 2, box.y + box.h / 2], 0.55);
    return { c: [clamp(c[0], box.x + box.w + m - hw, box.x - m + hw), clamp(c[1], box.y + box.h + m - hh, box.y - m + hh)], z };
  };
  type CaretFn = (typed: string) => P;
  const prevChat = (i: number) => i > 0 && isChat(spec.asks[i - 1]) && T[i].tin === 0;
  // the empty state: on a phone the first ask's composer starts in the middle of the empty thread (the
  // way a chat app opens) and docks at the bottom as Generate is pressed; the hook is the prompt, centred
  // THE HOOK: the first prompt is the hero. It is typed in a big composer in the middle of the frame
  // (at least 64 px type on a phone frame, 56 px on 16x9, wrapping to 2-3 lines, never clipped),
  // which shrinks and docks at the bottom of the chat as Generate is pressed.
  const HERO = (() => {
    if (!isChat(spec.asks[0])) return null;
    const prompt = spec.asks[0].prompt, min = L.phone ? 64 : 56, inW = ZONES ? G.CHAT.w - 24 : Math.min(L.phone ? W * 0.9 : W * 0.72, G.CHAT.w - 60 * k); // most of the width, inside the chat window (on 9x16 all of it: the window is narrower there)
    for (let px = L.phone ? 76 : 68; px >= min; px -= 2) {
      const kh = px / 34, genW = 166 * kh, textW = inW - 44 * kh - genW - 44 * kh, lines = wrapEst(prompt, px, textW).length;
      if (lines > 3 && px > min) continue;
      if (lines > 3) throw new Error(`launchTemplate ${shape}: the first prompt "${prompt}" needs ${lines} lines at the hook's ${min} px; shorten it (the hook must read muted in the first 2 s)`);
      // centred in the frame, or on 9x16 in the chat window (which is centred in the safe rectangle)
      const h = 104 * kh + (lines - 1) * Math.round(px * 1.3), fake = ZONES
        ? { x: G.CHAT.x + (G.CHAT.w - inW) / 2 - 60 * kh, y: G.CHAT.y + G.CHAT.h / 2 - H * 0.5, w: inW + 120 * kh, h: H * 0.5 + h / 2 + 36 * kh }
        : { x: (W - inW) / 2 - 60 * kh, y: 0, w: inW + 120 * kh, h: H * 0.5 + h / 2 + 36 * kh };
      const g = chatGeom(fake, kh, { ...G.px, gen: 24 * kh }, px, lines, genW);
      return { ...g, CHAT: G.CHAT, theme: G.theme, drop: G.drop, iris: G.iris } as ChatGeom;
    }
    return null;
  })();
  const heroAt = (i: number, l: number): ChatGeom => {
    if (!HERO || i !== 0) return G;
    const u = expo(ramp(l, T[i].b - 4, T[i].down)); if (u >= 1) return G;
    const mix = (a: number, b: number) => a + (b - a) * u, R = <T extends Record<string, number>>(a: T, b: T) => Object.fromEntries(Object.keys(a).map((key) => [key, mix(a[key], b[key])])) as T;
    const dockLines = Math.max(1, G.wrap);
    return { ...G, INPUT: R(HERO.INPUT, G.INPUT), GEN: R(HERO.GEN, G.GEN), TEXT: R(HERO.TEXT, G.TEXT), k: mix(HERO.k, G.k), px: R(HERO.px, G.px), lineH: mix(HERO.lineH, G.lineH), wrap: u < 0.5 ? HERO.wrap : dockLines };
  };
  // `lean` (0..1) is how far the camera leans in, `macro` how close it is on the composer; the corner
  // mark steps aside while it leans, since the lean carries the composer under the corner
  const camAt = (_caret: CaretFn, f: number, i: number): { cam: Cam; lean: number; macro: number; keep: number } => {
    const t = T[i], l = f - t.base;
    // the close-up creeps in while the words arrive: the frame is never a still
    // (the hero hook is its own close-up: the camera holds the whole frame, creeping 2 %)
    const hero = !!HERO && i === 0, mz = hero ? 1 + 0.02 * ramp(l, -20, t.b) : MZ * (1 + 0.03 * ramp(l, -20, t.b));
    // (9x16: the creep is about the window's centre for the hook, the composer's otherwise, so neither moves toward a zone)
    const macro: Cam = ZONES ? { c: inView(about(hero ? [G.CHAT.x + G.CHAT.w / 2, G.CHAT.y + G.CHAT.h / 2] : [G.INPUT.x + G.INPUT.w / 2, G.INPUT.y + G.INPUT.h / 2], mz), mz), z: mz } : { c: inView(hero ? HOME.c : [G.INPUT.x + G.INPUT.w / 2, G.INPUT.y + G.INPUT.h / 2], mz), z: mz };
    if (prevChat(i) && l < 16) { const q = inOut(ramp(l, 0, 16)); return { cam: camLerp(leanOn(i - 1), macro, q), lean: 1 - q, macro: q, keep: i - 1 }; }
    if (l > t.drop.full - 10) { const q = inOut(ramp(l, t.drop.full - 10, t.len)); return { cam: camLerp(HOME, leanOn(i), q), lean: q, macro: 0, keep: i }; }
    const w = l < t.b - 4 ? 1 : 1 - expo(ramp(l, t.b - 4, t.down));
    return { cam: l < t.b - 4 ? macro : camLerp(macro, HOME, expo(ramp(l, t.b - 4, t.down))), lean: 0, macro: w, keep: -1 };
  };
  // the same camera without a canvas (for the sound's pan): the caret from the build-time width estimate
  const caretEst: CaretFn = (typed) => {
    if (G.wrap > 0) { const ls = wrapEst(typed, G.TEXT.px, G.GEN.x - 20 * k - G.TEXT.x); return [G.TEXT.x + estWidth(ls[ls.length - 1], G.TEXT.px), G.TEXT.base + (ls.length - 1) * G.lineH - 0.35 * G.TEXT.px]; }
    return [G.TEXT.x + estWidth(typed, G.TEXT.px), G.TEXT.base - 12];
  };
  const pointerPath = (ctx: Ctx, l: number, t: { b: number; down: number; up: number }, on: P, pr: number) => {
    const off: P = CAM.pointerOff;
    if (l >= t.b - 4 && l < t.up + 24) pointer(ctx, l < t.up + 4 ? lerpP(off, on, out3(ramp(l, t.b - 4, t.down))) : lerpP(on, off, inOut(ramp(l, t.up + 4, t.up + 24))), pr * 0.8, CAM.pointerS);
  };
  const chatScene = (ctx: Ctx, env: Env, f: number, i: number) => {
    const t = T[i], l = f - t.base, Gc = heroAt(i, l), caret: CaretFn = (s) => caretAt(ctx, s, Gc);
    const { cam, lean, macro, keep } = camAt(caret, f, i);
    useCam(ctx, env, cam);
    const typed = typedAt((spec.asks[i] as PlateAsk).prompt, l, t.times), pr = press(l, t.down, t.up);
    chat(ctx, env, f, l < t.up ? typed : "", l < t.up, pr, ramp(l, t.down - 10, t.down - 2), { macro, lean, keep, cam }, Gc);
    // the pointer comes in for the press and glides back out; it never pops
    pointerPath(ctx, l, t, [Gc.GEN.x + Gc.GEN.w / 2 + 18 * Gc.k, Gc.GEN.y + Gc.GEN.h / 2 + 6 * Gc.k], pr);
    // the mark is gone BEFORE the lean moves the composer under it, and back only once the camera has left
    const show = lean > 0 && l > ASK / 2 ? 1 - ramp(l, t.drop.full - 18, t.drop.full - 10) : prevChat(i) && l < 24 ? ramp(l, 16, 24) : 1;
    if (show > 0) { ctx.globalAlpha = show; bug(ctx, env); ctx.globalAlpha = 1; }
  };
  // ---------------------------------------------------------------- the product UI, a film in a card, and a split beat's words
  const panelOf = (i: number): Rect => ((spec.asks[i] as UiAsk | FilmAsk).split?.length ? L.split.ui : UI_FULL);
  // never a still: a panel beside its words creeps closer about its own centre all through the ask
  // (8 %) and leans 4 % more once its items land (it never grows into the words' column)
  const pushZ = (l: number, len: number, t0: number) => 1 + 0.08 * ramp(l, 0, len) + 0.04 * inOut(ramp(l, t0, len + 30));
  const push = (ctx: Ctx, env: Env, r: Rect, l: number, len: number, t0 = 0) => { const z = pushZ(l, len, t0 || len), cx = r.x + r.w / 2, cy = r.y + r.h / 2; ctx.setTransform(env.scale * z, 0, 0, env.scale * z, env.scale * cx * (1 - z), env.scale * cy * (1 - z)); };
  // a full-frame UI ask has the chat's camera grammar: close on the command bar while the ask is typed
  // (creeping in), out to the whole window for the press, then a lean onto the items as they land
  const uiCam = (i: number, l: number): Cam => {
    // the window stays whole in frame on every frame: the camera creeps toward it, eases back for the
    // press, then leans in as the items land, never closer than the window's own fit
    const a = spec.asks[i] as UiAsk, t = T[i], win = uiWindow(panelOf(i), a.ui, minPx), wc: P = [win.x + win.w / 2, win.y + win.h / 2];
    // (9x16: fitted to the safe rectangle, and zooming about the window's centre, which never moves)
    const fit = ZONES ? Math.max(1, Math.min((0.94 * SAFE.w) / win.w, (0.92 * SAFE.h) / win.h)) : Math.max(1, Math.min((0.94 * W) / win.w, (0.92 * H) / win.h));
    const toward = (z: number): Cam => (ZONES ? { c: inView(about(wc, z), z), z } : { c: inView(lerpP(HOME.c, wc, clamp((z - 1) / (fit - 1 || 1))), z), z });
    if (l >= t.down) return toward(1 + (fit - 1) * 0.9 * inOut(ramp(l, t.down, t.len + 40))); // from the press on, never resting; still moving when the ask ends
    const open = toward(1 + (fit - 1) * 0.5 * ramp(l, -20, t.b)); // already creeping on frame 0
    return camLerp(open, HOME, expo(ramp(l, t.b - 4, t.down)));
  };
  const ground = (ctx: Ctx, env: Env) => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H); };
  const uiScene = (ctx: Ctx, env: Env, f: number, i: number) => {
    const a = spec.asks[i] as UiAsk, t = T[i], l = f - t.base, r = panelOf(i), pr = press(l, t.down, t.up);
    ground(ctx, env); if (a.split?.length) push(ctx, env, r, l, t.len, t.drop.t0); else useCam(ctx, env, uiCam(i, l));
    const typed = a.prompt ? typedAt(a.prompt, l, t.times) : "";
    { const w = uiWindow(r, a.ui, minPx); probeRect(ctx, env, w.x, w.y, w.w, w.h, "product window"); }
    drawProductUI(ctx, r, a.ui, { f: l, t0: t.drop.t0 }, THEME, { minPx, typed, caret: !!a.prompt && l < t.down, press: pr, hot: ramp(l, t.down - 10, t.down - 2), accent: ACC });
    pointerPath(ctx, l, t, (([x, y]) => [x + 14 * k, y + 8 * k] as P)(uiActionAt(r, a.ui, minPx)), pr);
    if (a.split?.length) splitWords(ctx, env, a.split, l, t.tin);
    bug(ctx, env);
  };
  const filmCard = (i: number): Rect => { const a = spec.asks[i] as FilmAsk, r = panelOf(i), s = Math.min(r.w / a.film.meta.W, r.h / a.film.meta.H), w = a.film.meta.W * s, h = a.film.meta.H * s; return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h }; };
  const filmScene = (ctx: Ctx, env: Env, f: number, i: number) => {
    const a = spec.asks[i] as FilmAsk, t = T[i], l = f - t.base, c = filmCard(i), from = a.from ?? 0, to = a.to ?? a.film.meta.durationFrames - 1;
    ground(ctx, env); push(ctx, env, c, l, t.len);
    for (let q = 5; q >= 1; q--) { ctx.fillStyle = `rgba(40,30,20,${0.022})`; rr(ctx, c.x - q * 2, c.y + q * 3, c.w + q * 4, c.h + q * 3, 22 * k + q * 2); ctx.fill(); }
    ctx.save(); rr(ctx, c.x, c.y, c.w, c.h, 22 * k); ctx.clip();
    ctx.drawImage(plateLayer(env, `film${i}`, a.film, lerp(from, to, ramp(l, 0, t.len - 1)), Math.round(c.w * env.scale)).canvas, c.x, c.y, c.w, c.h);
    ctx.restore();
    if (a.split?.length) splitWords(ctx, env, a.split, l, t.tin);
    bug(ctx, env);
  };
  // words in their own column beside the live UI (stacked above it on a phone): sized to the column, written or set on
  // the words are the design of the beat: as large as their column allows (set type is wider than it is tall, so its cap is higher)
  const wordsCap = clean ? L.split.wordsPx * 1.6 : L.split.wordsPx, wOf = (t: string, sz: number) => (clean ? estWidth(t, sz) * 1.12 : measure(t, sz));
  const splitLines = (lines: TypeLine[]) => { const col = L.split.words, out: TypeLine[] = []; for (const ln of lines) { const size = Math.min(wordsCap, (col.w / wOf(ln.text, 100)) * 100); if (size >= wordsCap * 0.62 || !ln.text.includes(" ")) out.push(ln); else wrapEst(ln.text, wordsCap, col.w * 1.05).forEach((t) => out.push({ ...ln, text: t })); } return out; };
  const splitWords = (ctx: Ctx, env: Env, lines0: TypeLine[], l: number, tin: number) => {
    const col = L.split.words, lines = splitLines(lines0), size = Math.min(wordsCap, ...lines.map((x) => (col.w / wOf(x.text, 100)) * 100)), gap = size * (clean ? 1.08 : 1.3);
    const y0 = L.split.vertical ? col.y + size : col.y + col.h / 2 - ((lines.length - 1) * gap) / 2 + size * 0.35;
    lines.forEach((x, j) => {
      const p = ramp(l, tin + j * 12, tin + 18 + j * 12);
      if (clean) setType(ctx, env, x.text, col.x, y0 + j * gap, size, p, { color: x.color === C.accent ? THEME.accent : x.color ?? PAL.ink, weight: 800 });
      else writeOn(ctx, env, x.text, col.x, y0 + j * gap, size, p, x.style, { color: x.color, align: "left", seed: 21 + j });
    });
  };
  // where a UI ask's world point is on screen at content frame f (its camera, or the split panel's push)
  const uiScreen = (i: number, f: number, p: P): P => { const a = spec.asks[i] as UiAsk, l = f - T[i].base; if (!a.split?.length) return toScreen(uiCam(i, l), p, W, H); const r = panelOf(i), t = T[i], z = pushZ(l, t.len, t.drop.t0), cx = r.x + r.w / 2, cy = r.y + r.h / 2; return [cx + (p[0] - cx) * z, cy + (p[1] - cy) * z]; };
  const sceneOf = (ctx: Ctx, env: Env, f: number, i: number) => { const a = spec.asks[i]; if (isChat(a)) chatScene(ctx, env, f, i); else if (a.kind === "ui") uiScene(ctx, env, f, i); else filmScene(ctx, env, f, i); };
  const bloomOpts = clean ? { shape: "circle" as const, rim: 0, bg: PAL.bg } : {};
  const CLEAN_ST = 12; // a clean word page's lines follow each other closer: set type settles sooner than a brush

  // ---------------------------------------------------------------- the motif: the drop that becomes the mark's dot
  const MOTIF = spec.motif !== false;
  const titleSize = clean ? Math.min(L.end.titleMax * 1.6, (L.end.titleW / (estWidth(spec.title, 100) * 1.1)) * 100) : Math.min(L.end.titleMax, (L.end.titleW / measure(spec.title, 100)) * 100);
  // the clean end card is ONE centred group with presence: the wordmark large, the line under it,
  // the install block, the footer, stacked and centred in the frame (the drawn one keeps its layout)
  const END_L = (() => {
    if (!clean) return L.end;
    // (9x16: measured on the safe rectangle's width and centred on its height)
    const AW = ZONES ? SAFE.w - 24 : W, E = L.end, tp = E.taglinePx * 1.5, tl = wrapEst(spec.tagline, tp, AW * (ZONES ? 0.9 : 0.8)), tLH = Math.round(tp * 1.3);
    const inst = installRows(spec.install, AW * 0.86 - 2 * E.padX, minPx, E.monoPx * 1.35), mono = inst.px, rowH = Math.round(mono * 2), ph = rowH * inst.rows.length + 50 * k;
    if (mono < minPx - 1e-9) throw new Error(`launchTemplate ${shape}: the install lines would be ${mono.toFixed(1)} px on the clean end card (phone-safe minimum ${minPx} px). Shorten the install line, or ship this shape without it`);
    const g1 = titleSize * 0.42, g2 = tLH * 0.9, g3 = spec.footer ? 44 * k : 0, block = titleSize * 0.74 + g1 + tl.length * tLH + g2 + ph + g3 + (spec.footer ? E.footerPx : 0);
    const titleY = (ZONES ? SAFE.y * 2 + SAFE.h - block : H - block) / 2 + titleSize * 0.74, taglineY = titleY + g1 + tLH / 2, panelY = taglineY + (tl.length - 0.5) * tLH + g2;
    return { ...E, titleY, tagline: tl, taglinePx: tp, taglineLH: tLH, taglineY, panelY, monoPx: mono, rows: inst.rows, wrapped: inst.wrapped, rowH, lineY0: panelY + 25 * k + rowH / 2, footerY: panelY + ph + g3 + E.footerPx / 2, caret: [Math.round(mono * 0.53), Math.round(mono * 1.13)] as [number, number] };
  })();
  const titleW = clean ? estWidth(spec.title, titleSize) * 1.08 : measure(spec.title, titleSize);
  const dotR = titleSize * (clean ? 0.1 : 0.085), dotGap = titleSize * 0.1;
  const P1: P = [END_L.cx + titleW / 2 - (dotGap + 2 * dotR) / 2 + dotGap + dotR, END_L.titleY - dotR * 1.05];
  const coverFrom = (p: P) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - p[0], y - p[1])));
  const RAD = coverFrom(P1) * 1.14, R0 = bloomRadius(2, 1e6, { inF: 16, close: false, radius: RAD }), RIM = Math.max(1, dotR - R0);
  // where the drop lifts off: Generate as the viewer sees it on the last chat ask (the card's centre if the lean hid it), the product's action, or the film's card
  const liftAt = (f: number): P => {
    const i = n - 1, a = spec.asks[i];
    if (!isChat(a)) return a.kind === "ui" ? uiScreen(i, f, uiActionAt(panelOf(i), a.ui, minPx)) : ((c) => [c.x + c.w / 2, c.y + c.h / 2] as P)(filmCard(i));
    const cam = camAt(caretEst, f, i).cam, g = toScreen(cam, GEN_C, W, H), inFrame = g[0] > 60 && g[0] < W - 60 && g[1] > 60 && g[1] < H - 60;
    return inFrame ? g : toScreen(cam, [TH.cardX + CARD / 2, cardY(i, f) + CARD / 2], W, H);
  };
  const S0 = liftAt(END0 - DL), camZ = isChat(spec.asks[n - 1]) ? camAt(caretEst, END0 - DL, n - 1).cam.z : 1;
  const path = relay([{ at: END0 - DL, p: S0, r: 30 * k * camZ }, { at: END0, p: P1, r: R0 + RIM, arc: 140 * k }]);
  const motifDrop = (ctx: Ctx, env: Env, f: number) => {
    if (!MOTIF || f < END0 - DL - LIFT || f >= END0) return;
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = INK;
    if (f < END0 - DL) { const w = out3(ramp(f, END0 - DL - LIFT, END0 - DL)); ctx.beginPath(); ctx.arc(S0[0], S0[1], 30 * k * camZ * (0.2 + 0.8 * w), 0, Math.PI * 2); ctx.fill(); return; }
    for (let j = 24; j >= 0; j--) { const q = path(Math.max(END0 - DL, f - j * 0.1)); if (!q) continue; ctx.globalAlpha = j === 0 ? 1 : 0.22 * (1 - j / 25); ctx.beginPath(); ctx.arc(q.p[0], q.p[1], q.r * (1 - j * 0.02), 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  // the seam, checked: the drop's pose as it lands (the ask's side) is the ink the end card blooms from
  const seams: Seam[] = MOTIF ? [{ frame: END0, label: "last ask -> end card", out: path(END0) as MotifPose, into: { p: P1, r: R0 + RIM } }] : [];
  checkRelay(seams);

  const askScene = (ctx: Ctx, env: Env, f: number, withDrop = true) => {
    const i = askOf(f), t = T[i], l = f - t.base;
    // a seam between kinds: the new scene blooms open over the last frame of the one before
    // (+4: a bloom's first frames open by less than a pixel)
    if (t.tin && l < t.tin) bloomFrame(ctx, env, l + 4, 1e6, () => sceneOf(ctx, env, t.base - 1, i - 1), (c) => sceneOf(c, env, f, i), { close: false, inF: 14, W, H, ...bloomOpts });
    else sceneOf(ctx, env, f, i);
    if (withDrop) motifDrop(ctx, env, f);
  };
  // ---------------------------------------------------------------- the end card
  const endPage = (c: Ctx, env: Env, e: number) => {
    const E = END_L, cx = E.cx, size = titleSize;
    // (with the motif the page blooms from the dot, wider and sooner: the name starts as it opens, so no frame waits)
    if (MOTIF) { const tx = P1[0] - dotR - dotGap; if (clean) setType(c, env, spec.title, tx, E.titleY, size, ramp(e, 4, 26), { align: "right", color: PAL.ink, weight: 800 }); else writeOn(c, env, spec.title, tx, E.titleY, size, ramp(e, 4, 40), "ink", { color: C.ink, align: "right", seed: 11 }); c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.fillStyle = INK; c.beginPath(); c.arc(P1[0], P1[1], dotR, 0, Math.PI * 2); c.fill(); }
    else if (clean) setType(c, env, spec.title, cx, E.titleY, size, ramp(e, 8, 30), { align: "center", color: PAL.ink, weight: 800 });
    else writeOn(c, env, spec.title, cx, E.titleY, size, ramp(e, 10, 44), "ink", { color: C.ink, align: "center", seed: 11 });
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.textAlign = "center"; c.textBaseline = "middle";
    const Q = clean && MOTIF ? -14 : 0; // the clean name is set in 22 frames, not written in 36: the rest follows it closer
    // the clean look's lines rise into place as they appear, like its type (the drawn look's fade in under the written name)
    const rise = (a: number) => (clean ? (1 - out3(ramp(e, a, a + 12))) * 22 * L.k : 0);
    c.globalAlpha = ramp(e, 34 + Q, 46 + Q); c.fillStyle = PAL.soft; c.font = SANS(500, E.taglinePx); E.tagline.forEach((t, j) => c.fillText(t, cx, E.taglineY + j * E.taglineLH + rise(34 + Q)));
    c.translate(0, rise(40 + Q));
    c.globalAlpha = ramp(e, 40 + Q, 52 + Q); c.font = MONO(E.monoPx);
    // one row per install line, centred; a wrapped line's rows are set left in the panel, its continuation indented
    const rows = E.rows, nI = rows.length, cw = c.measureText("0").width, rowW = (r: { text: string; indent: number }) => c.measureText(r.text).width + r.indent * cw;
    const pw = (E.wrapped ? Math.max(...rows.map(rowW)) : Math.max(...spec.install.map((s) => c.measureText(s).width))) + 2 * E.padX, ph = E.rowH * nI + 2 * (E.lineY0 - E.panelY) - E.rowH, py = E.panelY, x0 = cx - pw / 2 + E.padX;
    c.fillStyle = clean ? PAL.ink : "#1f1c18"; rr(c, cx - pw / 2, py, pw, ph, 22 * L.k); c.fill();
    c.fillStyle = clean ? "#ffffff" : "#ece4d6";
    if (E.wrapped) { c.textAlign = "left"; rows.forEach((r, j) => c.fillText(r.text, x0 + r.indent * cw, E.lineY0 + j * E.rowH)); c.textAlign = "center"; }
    else spec.install.forEach((s, j) => c.fillText(s, cx, E.lineY0 + j * E.rowH));
    // a terminal caret blinks after the last row: the hold reads as live, never as a freeze
    const lastW = c.measureText(rows[nI - 1].text).width, caretX = E.wrapped ? x0 + rowW(rows[nI - 1]) + 8 * (E.monoPx / 30) : cx + lastW / 2 + 8 * (E.monoPx / 30);
    if (Math.floor((e - 40 - Q) / 15) % 2 === 0) { if (clean) c.fillStyle = THEME.accent; c.fillRect(caretX, E.lineY0 + (nI - 1) * E.rowH - E.caret[1] / 2, E.caret[0], E.caret[1]); }
    if (spec.footer) { c.fillStyle = PAL.soft; c.font = SANS(500, E.footerPx); c.fillText(spec.footer, cx, E.footerY); }
    c.globalAlpha = 1; c.textAlign = "left"; c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  };
  const content = (ctx: Ctx, env: Env, f: number, exact: boolean) => {
    const g = clamp(exact ? Math.round(f) : f, 0, END0 + END - 1);
    if (g < END0) return askScene(ctx, env, g);
    const e = g - END0;
    bloomFrame(ctx, env, e + 2, END + 2, () => askScene(ctx, env, END0 - 1, false), (c) => endPage(c, env, e), { close: false, inF: 16, W, H, ...bloomOpts, ...(MOTIF ? { center: P1, radius: RAD, rim: lerp(RIM, clean ? 0 : 26, out3(ramp(e, 0, 7))), ink: INK } : {}) });
  };

  // ---------------------------------------------------------------- the cut, as data
  const segs: Seg[] = [];
  spec.asks.forEach((_, i) => {
    const last = i === n - 1;
    const b = BASE[i], e = b + LEN[i];
    segs.push(last && spec.claimBar !== undefined ? pic(b, e, SOLVED) : pic(b, e)); // SOLVED < ASK plays the ask faster; never slower
    if (!last && words[i]?.length) segs.push(type(fitWords(words[i], L), TYPE, e - 1, e));
  });
  // the score plays at the film's bpm, exactly: the cuts sit on this grid. Sync wins over length, so
  // the end-card hold (not the tempo) takes up the difference: the film becomes whole bars of the score.
  const bed = !spec.audio && spec.score ? gridScore(spec.score, spec.bpm, 30, segs.reduce((a, x) => a + x.len, 0), END) : null;
  if (bed) END = bed.end;
  segs.push(pic(END0, END0 + END));
  const cut = makeCut(segs);
  // a clean word page: a round iris, the lines SET (heavy sans, left-aligned at the margin, each rising into place)
  const cleanType = (ctx: Ctx, env: Env, lines: TypeLine[], local: number, len: number, under: (first: boolean) => void) => bloomFrame(ctx, env, local, len, under, (c) => {
    const nL = lines.length, maxW = L.type.maxW, at = L.type.at, x0 = at ? at[0] - maxW / 2 : (W - maxW) / 2;
    const size = Math.min(nL === 1 ? 220 : 170, ...lines.map((l) => (maxW / (estWidth(l.text, 100) * 1.12)) * 100)), gap = size * 1.12, y0 = (at ? at[1] : H / 2) - ((nL - 1) * gap) / 2 + size * 0.36;
    lines.forEach((l, i) => setType(c, env, l.text, x0, y0 + i * gap, size, ramp(local, 14 + TYPE_O.lead + i * CLEAN_ST, 14 + TYPE_O.lead + 18 + i * CLEAN_ST), { color: l.color === C.accent ? THEME.accent : l.color ?? PAL.ink, weight: 800 }));
    bug(c, env);
  }, { W, H, ...bloomOpts, rim: 4, ink: THEME.accent, radius: TYPE_R, ...(L.type.at ? { center: L.type.at } : {}) });
  // a word page's bloom is sized to the frame it covers (the desktop's 1250 px over a 1110 px cover):
  // on a smaller frame a fixed bloom would cover it before the words start, and two frames would match
  const TYPE_R = L.shape === "16x9" ? undefined : Math.round((1250 * L.type.cover) / 1110);
  // (9x16: the page blooms from the words' centre, so its first drop lands where the words will be)
  const TYPE_OPTS = L.shape === "16x9" ? TYPE_O : { ...TYPE_O, W, H, maxW: L.type.maxW, radius: TYPE_R, ...(L.type.at ? { text: L.type.at, center: L.type.at } : {}) };
  const drawStage = (ctx: Ctx, env: Env, t: number) => {
    const { s, local } = cut.at(t), exact = Number.isInteger(t);
    if (s.kind === "pic") content(ctx, env, cut.contentOf(s, local), exact);
    // offset by 2 frames at each end so the bloom is already moving on the first and last frame
    else if (clean) cleanType(ctx, env, s.lines, local + 2, s.len + 4, (first) => content(ctx, env, first ? s.before : s.after, true));
    else typeFrame(ctx, env, s.lines, local + 2, s.len + 4, (first) => content(ctx, env, first ? s.before : s.after, true), (c) => bug(c, env), TYPE_OPTS);
  };

  // ---------------------------------------------------------------- captions: the words a viewer reads, in cut frames
  const cutAt = (c: number) => cut.cutOf(c);
  const caps: { from: number; to: number; text: string }[] = [];
  spec.asks.forEach((a, i) => {
    const t = T[i], lo = cut.STARTS[cut.SEGS.findIndex((sg) => sg.kind === "pic" && sg.from === t.base)] ?? 0;
    if (isChat(a) || (a.kind === "ui" && a.prompt)) { const from = Math.max(lo, cutAt(t.base + Math.max(t.tin, t.times[0] ?? 0))), to = cutAt(t.base + Math.min(t.len - 1, isChat(a) ? t.drop.full : t.drop.t0 + 24)); if (from >= 0 && to > from) caps.push({ from, to, text: isChat(a) ? a.prompt : a.prompt! }); }
    const split = !isChat(a) ? a.split : undefined;
    if (split?.length) { const from = cutAt(t.base + t.tin + 4), to = cutAt(t.base + t.len - 1) + 1; caps.push({ from, to, text: split.map((x) => x.text).join(" ") }); }
  });
  cut.SEGS.forEach((sg, k) => { if (sg.kind === "type") caps.push({ from: cut.STARTS[k] + 12, to: cut.STARTS[k] + sg.len, text: sg.lines.map((x) => x.text).join(" ") }); });
  const endAt = cut.STARTS[cut.SEGS.length - 1];
  caps.push({ from: endAt + 10, to: cut.N, text: `${spec.title}. ${spec.tagline}` });
  caps.sort((a, b) => a.from - b.from);
  for (let j = 0; j + 1 < caps.length; j++) caps[j].to = Math.min(caps[j].to, caps[j + 1].from); // one caption at a time
  const capAt = (t: number) => caps.find((c) => t >= c.from && t < c.to);
  const band = (ctx: Ctx, env: Env, t: number) => {
    const B = L.band!; ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    if (B.y + B.h < L.H) { ctx.fillStyle = PAL.bg; ctx.fillRect(0, B.y + B.h, W, L.H - B.y - B.h); } // 9x16: under the band, the platforms' bottom zone: background only
    ctx.fillStyle = PAL.card; ctx.fillRect(B.x, B.y, B.w, B.h); ctx.fillStyle = PAL.line; ctx.fillRect(B.x, B.y, B.w, 2);
    const c = capAt(t); if (!c) return;
    const TX = ZONES ? { x: SAFE.x, w: SAFE.w } : B; // the caption's own column: on 9x16 clear of the right-hand buttons
    const px = Math.max(36, Math.round(B.h * 0.2)), lines = wrapEst(c.text, px, TX.w - 120).slice(0, 2), a = Math.min(ramp(t, c.from, c.from + 6), 1 - ramp(t, c.to - 6, c.to));
    ctx.globalAlpha = a; ctx.fillStyle = PAL.ink; ctx.font = SANS(600, px); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((l, j) => ctx.fillText(l, TX.x + TX.w / 2, B.y + B.h / 2 + (j - (lines.length - 1) / 2) * px * 1.25)); ctx.globalAlpha = 1; ctx.textAlign = "left";
  };
  const draw = (ctx: Ctx, F: number, env: Env) => {
    const t = F / m;
    if (!L.band) return drawStage(ctx, env, t);
    const stage = { ...env, H }; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    drawStage(ctx, stage, t); ctx.restore(); band(ctx, env, t);
  };

  // declared holds: the words' reading time on each type frame, and the end card once it is all on
  const holds: [number, number][] = [];
  cut.SEGS.forEach((s, k) => {
    if (s.kind !== "type") return;
    const written = 14 + TYPE_O.lead + 18 + (s.lines.length - 1) * (clean ? CLEAN_ST : TYPE_O.stagger) - (clean ? 9 : 2); // local frame the last line is done (set type's out-cubic settles to the pixel sooner)
    // last frame the page still fills the frame (a round iris only clips the corners for its first closing frames: still a still)
    const cover = clean ? (L.type.at ? (L.type.cover - 9) * 0.9 : Math.hypot(W, H) / 2 * 0.9) : L.type.cover;
    let open = s.len - 1; while (open > written && bloomRadius(open + 2, s.len + 4, { radius: TYPE_R }) < cover) open--;
    holds.push([cut.STARTS[k] + written + 1, cut.STARTS[k] + open + 1]);
  });
  // a solved ask longer than the grid's: the finished card rests on screen until the end card blooms
  // (with the motif the drop is in flight over those frames, so they are not a hold)
  if (LEN[n - 1] > ASK && isChat(spec.asks[n - 1]) && !MOTIF) { const S = cut.STARTS[cut.SEGS.length - 2]; holds.push([S + LEN[n - 1] - 18, S + LEN[n - 1] + 6]); }
  holds.push([cut.N - END + (clean && MOTIF ? 39 : 53), cut.N]); // the end card, all on: read it, screenshot it
  // a UI ask's action button bottoms out: the press lands before the items move (a stationary point by
  // design, one or two frames; at 60 fps and in small shapes the gate reads it as a still)
  spec.asks.forEach((a, i) => { if (isChat(a) || a.kind !== "ui") return; const F = cut.cutOf(T[i].base + T[i].up); if (F > 0) holds.push([F - 1, F + 2]); });

  // ---------------------------------------------------------------- sound: the picture's own cues
  const cues: LaunchCue[] = [];
  const at = (c: number) => { const F = cut.cutOf(c); return F < 0 ? -1 : Math.round(F * m); };
  const add = (c: number | { F: number }, cue: Omit<LaunchCue, "frame">) => { const fr = typeof c === "number" ? at(c) : Math.round(c.F * m); if (fr >= 0 && fr < cut.N * m) cues.push({ ...cue, frame: fr } as LaunchCue); };
  const screenX = (i: number, c: number, p: P) => toScreen(camAt(caretEst, c, i).cam, p, W, H)[0];
  if (!spec.audio && spec.sfx !== false) {
    spec.asks.forEach((a, i) => {
      const t = T[i], b = t.base;
      const prompt = isChat(a) ? a.prompt : a.kind === "ui" ? a.prompt : undefined;
      // a key for every character typed, a word's first key a touch firmer, the space bar its own sound
      if (prompt) t.times.forEach((tm, j) => { if (tm < Math.max(0, t.tin)) return; const ch = prompt[j], first = j === 0 || prompt[j - 1] === " ";
        const x = isChat(a) ? screenX(i, b + tm, caretEst(prompt.slice(0, j + 1))) : ((r) => (r ? r.x + 26 * k + estWidth(prompt.slice(0, j + 1), 26) : W / 2))(uiCommandAt(panelOf(i), (a as UiAsk).ui, minPx));
        add(b + tm, { kind: "tick", variant: ch === " " ? "space" : "key", gainDb: first && ch !== " " ? 1.5 : 0, x, role: "key", label: `key ${JSON.stringify(ch)}` }); });
      if (isChat(a)) {
        const card = (c: number): P => [TH.cardX + CARD / 2, cardY(i, c) + CARD / 2];
        add(b + t.down, { kind: "press", variant: "thock", x: screenX(i, b + t.down, GEN_C), role: "press", label: "Generate" });
        add(b + t.drop.t0, { kind: "ink", variant: "plip", x: screenX(i, b + t.drop.t0, GEN_C), role: "drop", label: "the drop lifts" });
        add(b + t.drop.land, { kind: "ink", variant: "bloom", x: screenX(i, b + t.drop.land, card(b + t.drop.land)), role: "bloom", label: "it blooms into the card" });
        add(arrive(i), { kind: "pop", variant: "cork", x: screenX(i, arrive(i), card(arrive(i))), role: "land", label: "the card lands (spring)" });
      } else if (a.kind === "ui") {
        const r = panelOf(i);
        add(b + t.down, { kind: "press", variant: "thock", x: uiScreen(i, b + t.down, uiActionAt(r, a.ui, minPx))[0], role: "press", label: a.ui.action });
        // the items land on their springs: one cue per landing, never two within 4 frames, at most 4
        let last = -99, count = 0;
        for (const s of uiSettles(a.ui, { t0: b + t.drop.t0 }).sort((x, y) => x.frame - y.frame)) { if (s.kind === "out" || s.frame - last < 4 || count >= 4) continue; last = s.frame; count++; add(s.frame, { kind: "pop", variant: s.kind === "in" ? "tiny" : "cork", x: r.x + r.w / 2, role: s.kind === "in" ? "arrive" : "land", label: `${s.id} lands` }); }
      }
    });
    // the big reveal, once: a riser that ends as the drop lands on the end card, and one impact there
    const reveal = { F: endAt }, withKey = !!bed;
    add(reveal, { kind: "riser", variant: withKey ? "soft" : "air", beats: 4, ...(withKey ? {} : { lengthS: (4 * 60) / spec.bpm }), x: P1[0], role: "riser", label: "into the reveal" });
    add(reveal, { kind: "impact", variant: withKey ? "bloom" : "boom", x: P1[0], role: "impact", label: "the reveal" });
  }
  const plan = { fps, frames: cut.N * m, W, cues, bpm: spec.bpm, seed: 7, ...(bed ? { score: { piece: bed.piece, tempo: spec.bpm } } : {}) };
  const scoreBed = bed ? musicBed(() => bed.piece, cut.N, 30, -14, { limit: spec.limit, tempo: spec.bpm }) : null;
  const audio = spec.audio ?? (cues.length ? launchAudio(scoreBed, plan) : scoreBed ?? undefined);
  const sync = cues.filter((c) => c.role === "press" || c.role === "impact").map((c) => ({ frame: c.frame, label: c.label ?? c.role }));

  let memo: Map<string, LaunchFilm> | null = null;
  const self: LaunchFilm = {
    meta: { title: `${spec.title} · launch${shape === "16x9" ? "" : ` · ${shape}`}`, W, H: L.H, fps, bpm: spec.bpm, durationFrames: cut.N * m, raster: "cpu", kind: "launch", holds: holds.map(([a, b]) => [a * m - (m - 1), b * m] as [number, number]), ...(bed ? { score: { tempo: spec.bpm, form: bed.form, grid: true } } : {}),
      sync, captions: caps.map((c) => ({ from: Math.round(c.from * m), to: Math.round(c.to * m), text: c.text })), poster: Math.round((cut.N - END + 60) * m) },
    assets: { images: {} },
    shots: [{ id: "cut", start: 0, end: cut.N * m, draw }],
    audio,
    claims: [...new Set([...words.flat().map((x) => x.text), ...spec.asks.flatMap((a) => (isChat(a) ? [] : (a.split ?? []).map((x) => x.text))), spec.tagline, ...(spec.claims ?? [])].map((x) => x.trim()).filter(Boolean))],
    cut, layout: L, cues, seams, heroPx: HERO ? HERO.TEXT.px : null, timing: T, captions: caps.map((c) => ({ from: Math.round(c.from * m), to: Math.round(c.to * m), text: c.text })),
    // the same film composed for another frame shape (one timeline: the cut, the timing and the sound do not change)
    reshape: (s: string) => { if (s === shape) return self; memo ??= new Map(); let f = memo.get(s); if (!f) { f = makeLaunchFilm({ ...spec, shape: s as Shape }); memo.set(s, f); } return f; },
  };
  return self;
};

// Words sized for the frame: a line that would come out under the phone-safe type size is broken at
// its middle space (a word page holds at most three lines); one that still cannot is an error.
export const fitWords = (lines: TypeLine[], L: LaunchLayout): TypeLine[] => {
  const sizeOf = (ls: TypeLine[]) => Math.min(ls.length === 1 ? 190 : 130, ...ls.map((l) => (L.type.maxW / measure(l.text, 100)) * 100));
  let out = lines;
  while (sizeOf(out) < L.type.minPx && out.length < 3) {
    const k = out.reduce((b, l, i) => (measure(l.text, 100) > measure(out[b].text, 100) ? i : b), 0), words = out[k].text.split(" ");
    if (words.length < 2) break;
    let best = 1, bw = Infinity; for (let j = 1; j < words.length; j++) { const w = Math.max(measure(words.slice(0, j).join(" "), 100), measure(words.slice(j).join(" "), 100)); if (w < bw) { bw = w; best = j; } }
    out = [...out.slice(0, k), { ...out[k], text: words.slice(0, best).join(" ") }, { ...out[k], text: words.slice(best).join(" ") }, ...out.slice(k + 1)];
  }
  if (sizeOf(out) < L.type.minPx) throw new Error(`launchTemplate ${L.shape}: the words "${lines.map((l) => l.text).join(" / ")}" would be ${sizeOf(out).toFixed(0)} px on a word page (phone-safe minimum ${L.type.minPx} px): use fewer words`);
  return out;
};

type Fit = ReturnType<typeof fitScore>;
const MIN_END = (fps: number) => 3 * fps + 40; // the install lines held 3 s or more, after the card writes on

/**
 * The score for a beat-grid film: played at the film's bpm exactly (the cuts sit on that grid), and
 * the film made whole bars of it. A Material's stretch section is repeated 0..n times; each form is
 * `bars` long plus whole bars for its tail to ring out, and the form whose length puts the end-card
 * hold nearest the one asked for wins (the hold stays between 3 s and the asked hold + 4 bars).
 * No tempo is changed; if no form fits, it throws. Bars before the final ritard are checked against
 * the grid to half a frame, so a rubato or a breath can never pull a downbeat off a cut.
 */
export const gridScore = (score: () => Piece | Material, bpm: number, fps: number, before: number, hold: number) => {
  const x = score(), barF = (4 * 60 * fps) / bpm, lo = MIN_END(fps), hi = hold + 4 * barF;
  const forms: (() => Piece)[] = "plan" in x ? [() => x] : stretchIndex(x) < 0 ? [() => composePiece(x)] : Array.from({ length: 33 }, (_, r) => () => composePiece(withStretch(x, r)));
  let best: { piece: Piece; end: number; bars: number; ring: number } | null = null, tried: string[] = [];
  for (const make of forms) {
    const p = make(), bpb = beatsPerBar(p.plan.meter);
    if (bpb !== 4) throw new Error(`launchTemplate: the score is in ${p.plan.meter}; a launch film's cuts sit on 4-beat bars, so compose it in 4/4`);
    if (p.plan.pickupBeats) throw new Error(`launchTemplate: the score opens with a ${p.plan.pickupBeats}-beat pickup; frame 0 is a downbeat, so start the score on the bar`);
    const bars = p.plan.sections.reduce((a, q) => a + q.bars, 0), ring = Math.ceil((p.tail * bpm) / 60 / 4 - 1e-9), end = Math.round((bars + ring) * barF) - before;
    tried.push(`${bars}+${ring} bars -> hold ${(end / fps).toFixed(1)} s`);
    if (end >= lo && end <= hi && (!best || Math.abs(end - hold) < Math.abs(best.end - hold))) best = { piece: p, end, bars, ring };
    if (end > hi) break; // more repeats only make it longer
  }
  if (!best) throw new Error(`launchTemplate: the score cannot end on a bar of this film at ${bpm} bpm without changing its tempo. The cut before the end card is ${(before / fps).toFixed(1)} s and the end-card hold must be ${(lo / fps).toFixed(1)}-${(hi / fps).toFixed(1)} s; the score's forms give ${tried.join(", ")}. Compose a 1-bar stretch section (stretch: true), or change askBeats/endBeats/claimBar.`);
  const piece: Piece = { ...best.piece, plan: { ...best.piece.plan, tempo: bpm, rubato: 0 } }, perf = perform(piece, bpm, { expressive: true }), spb = 60 / bpm;
  const lastBar = Math.floor((perf.lastOnset / spb - 6) / 4); // the final ritard lives in the last 6 beats, inside the end card
  for (let k = 0; k <= lastBar; k++) { const drift = perf.sec(4 * k) - 4 * k * spb; if (Math.abs(drift) > 0.5 / fps) throw new Error(`launchTemplate: the score's bar ${k} lands ${(drift * 1000).toFixed(0)} ms off the film's grid (a breath or a caesura in the score); a launch film's cuts need every downbeat on the grid: even out the section dynamics there`); }
  return { piece, end: best.end, bars: best.bars, form: `${best.bars} bars + ${best.ring} to ring, at the film's ${bpm} bpm` };
};

// A music bed: the piece FITTED to the film, never cut and faded. With `tempo` (a beat-grid film, as
// the launch template passes it) the piece plays at exactly that tempo and the film is already whole
// bars of it (gridScore); without, fitScore fits it as filmAudio does (its stretch section repeated or
// dropped, the tempo trimmed so the tail rings out on the last frame). Then it is set to `lufs` integrated (default -14, the one published
// cross-platform target) with the true peak held at or under -1 dBTP. A dynamic piece stops at the
// peak ceiling first (render prints how far short); `limit: true` lets a look-ahead limiter take
// those few peaks instead so the bed reaches the target. Compose the piece for this film at the
// film's bpm, so the cuts sit on its downbeats. `piece` may return a Piece or a fitScore result.
export const musicBed = (piece: () => Piece | Fit, frames: number, fps = 30, lufs = -14, o: { limit?: boolean; tempo?: number } = {}) => {
  const source = piece(), score = "order" in source ? source.piece : o.tempo ? source : fitScore(source, frames / fps).piece;
  return Object.assign((sr: number): [Float32Array, Float32Array] => {
  const seconds = frames / fps, x = piece(), fit = "order" in x ? x : o.tempo ? { piece: x, tempo: o.tempo } : fitScore(x, seconds);
  const m = renderPiece(fit.piece, sr, { seconds, tempo: fit.tempo }), n = Math.round(seconds * sr);
  const L = new Float32Array(n), R = new Float32Array(n); L.set(m.L.subarray(0, n)); R.set(m.R.subarray(0, n));
  const gain = (dB: number) => { const g = Math.pow(10, dB / 20); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } };
  const now = loudness([L, R], sr).integrated, peak = truePeak([L, R]).dbtp;
  if (!o.limit || lufs - now <= -1 - peak) { gain(Math.min(lufs - now, -1 - peak)); return [L, R]; } // loudness first, never past -1 dBTP
  gain(lufs - now); limiter(L, R, sr, Math.pow(10, -1.3 / 20));                                     // the limiter takes the peaks
  const again = lufs - loudness([L, R], sr).integrated; if (again > 0) { gain(Math.min(again, 1)); limiter(L, R, sr, Math.pow(10, -1.3 / 20)); }
  const tp = truePeak([L, R]).dbtp; if (tp > -1) gain(-1.05 - tp);                                    // an inter-sample overshoot: a last static trim
  return [L, R];
  }, { scores: [score] });
};
