// CHEETAH, RUN. 27 s, looping. It is cheetahDusk with a run opened up in the middle of it, in one
// continuous shot with no cut and no wipe.
// The story in three sentences: She wakes at dusk. She stretches and runs across the whole country
// for the joy of it. She stops, turns back to us, and the night closes over, ready to begin again.
// The token: the low sun, which stays put through every move while everything nearer goes by.
// The two moves the film is for:
//   THE TURN. The camera pulls back from the face and comes round to her side in one move. The face
//   is the same drawing, wrapped on a head and turned in space (cheetahTurn); her body swings out
//   from behind it, edge-on at first, as the ground comes up under her feet. Back the same way.
//   THE RUN. She is held in frame and the country goes by in layers at their own speeds, and it
//   changes as she covers ground: thorn savanna, a kopje where the birds go up, a shallow pan she
//   goes through in spray, grass again (cheetahScenery).
// The picture is timed in frames on a 120 bpm grid (a beat is 15 frames, and so is a stride); the
// score is nine bars at 80 bpm, the same 27 s.
//   0-255     cheetahDusk 0-255: night, the sun, the face making itself, the eyes, alive, a blink
//   255-300   the turn: front to side, pulling back
//   300-390   the stretch: down into the bow (338), held and deepened, up again (390)
//   390-405   she gathers
//   405-575   the run: off the hind legs at 405, at speed by 450, a stride every 15 frames
//   575-630   forefeet braced, the slide, the dust goes past her, she stands
//   648-690   the turn back
//   690-810   cheetahDusk 262-360: the face, the camera into the eye, the night. 809 hands over to 0.
import { rng, type Ctx, type Env, type Layer, type P } from "./core";
import type { Film } from "./film";
import { mix } from "./gallery";
import { drawCheetah, headAnchor, type Pose } from "./cheetahBody";
import { camAt, drawDusk, DUSK_PALE, duskGrass, duskNight, FACE } from "./cheetahDusk";
import { logoCentred, setType } from "./kinetic";
import { cheetahRunScore, cheetahRunSignedScore } from "./music/pieces/cheetahRun";
import { renderLoop, renderPiece } from "./music/render";
import { BOW, CROUCH, fk, gallopRig, gallopY, lowest, mixRig, settle, SKID, STAND, type Rig } from "./cheetahRig";
import { country, drawBurst, drawFar, drawFlock, drawLens, drawPan, inPan, leaf, type Burst } from "./cheetahScenery";
import { HEAD_K, turnedHead, turnedNeck } from "./cheetahTurn";

const W = 1080, H = 1080, N = 810, GROUND = 852, FLOOR = GROUND + 24;
const NIGHT = "#0d1a22", TEAL = "#2a6a70", RUST = "#b8452a", PALE = "#fff5de", DARK = "#0a1216";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = (t: number) => { const c = clamp(t); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
const out3 = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };
const back = (t: number) => { const c = clamp(t) - 1; return 1 + 2.4 * c * c * c + 1.4 * c * c; };

// ---------------------------------------------------------------- the cue table (frames)
const CUE = { swing: 255, side: 300, bow: 338, hold: 362, up: 390, go: 405, speed: 450, brake: 575, slid: 606, stood: 630, swingBack: 648, face: 690, eye: 720 } as const;
const STRIDE = 15, PH0 = 0.82;               // a stride in frames; where in the stride she leaves the ground at CUE.go
const phase = (F: number) => PH0 + (F - CUE.go) / STRIDE;
// how fast the ground goes by (0-1), and how far it has gone. The far total is chosen so the near
// grass, which is cheetahDusk's own, is back exactly where that film left it when she stops.
const pace = (F: number) => smooth(ramp(F, CUE.go, CUE.speed)) * (1 - smooth(ramp(F, CUE.brake - 12, CUE.slid)));
const NEAR = 1.6, WRAP = 1400, TOP = 84;     // the near grass's depth factor and its wrap; her top speed in px of ground per frame
const TRAVEL = (() => { const sub = 8, acc = [0]; for (let i = 1; i <= N * sub; i++) acc.push(acc[i - 1] + pace((i - 0.5) / sub) / sub); const total = acc[acc.length - 1], want = (Math.round((total * TOP * NEAR) / WRAP) * WRAP) / NEAR, k = want / (total * TOP); return (F: number) => { const x = clamp(F, 0, N) * sub, i = Math.min(N * sub - 1, Math.floor(x)); return lerp(acc[i], acc[i + 1], x - i) * TOP * k; }; })(); // px of ground gone by
const LAND = country(TRAVEL(N));
const frameAt = (g: number) => { let a: number = CUE.go, b: number = CUE.slid; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (TRAVEL(m) < g) a = m; else b = m; } return b; };

// ---------------------------------------------------------------- her performance
const S = { stand: settle(STAND), bow: settle(BOW), crouch: settle(CROUCH), skid: settle(SKID) };
const HIND_X = 400, TRACK_X = 548;           // where her hind foot stands on screen; where the camera holds her waist as she runs
const idle = (r: Rig, F: number): Rig => ({ ...r, headH: r.headH + Math.sin(F * (Math.PI / 45)) * 2.5, tail: r.tail.map((a, i) => a + Math.sin(F * (Math.PI / 30) - i * 0.7) * (2 + i * 2.2)) });
const held = (F: number): Rig => {            // every pose she holds, and the moves between them
  if (F < CUE.side) return S.stand.rig;
  if (F < CUE.bow) return mixRig(S.stand.rig, S.bow.rig, inOut(ramp(F, CUE.side, CUE.bow)));
  if (F < CUE.hold) { const d = Math.sin(ramp(F, CUE.bow, CUE.hold) * Math.PI), q = Math.sin(F * 1.9) * d; return { ...S.bow.rig, lumb: S.bow.rig.lumb - 7 * d, headH: S.bow.rig.headH + 14 * d, head: S.bow.rig.head - 6 * d, tail: S.bow.rig.tail.map((a, i) => a + q * i * 1.6 + d * i * 3) }; }
  if (F < CUE.up) return mixRig(S.bow.rig, S.stand.rig, back(ramp(F, CUE.hold, CUE.up)));
  if (F < CUE.go) return mixRig(S.stand.rig, S.crouch.rig, inOut(ramp(F, CUE.up, CUE.go)));
  return mixRig(S.skid.rig, S.stand.rig, back(ramp(F, CUE.slid, CUE.stood)));
};
const standing = (F: number) => { const s = settle(idle(held(F), F)), q = fk(s.rig, 0, s.y, 0); return { rig: s.rig, y: s.y, x: HIND_X - q.hindN[4][0] }; };
const lead = (F: number) => 46 * Math.sin(ramp(F, CUE.go, CUE.speed + 30) * Math.PI) - 40 * Math.sin(ramp(F, CUE.brake - 6, CUE.stood) * Math.PI);
const poseAt = (F: number): Pose => {
  if (F < CUE.go || F >= CUE.slid) { const s = standing(F); return fk(s.rig, s.x + (F >= CUE.slid ? lerp(60, 0, smooth(ramp(F, CUE.slid, CUE.stood + 20))) + lead(F) : 0), s.y + FLOOR, FLOOR); }
  // running: the stride, taken up out of the crouch and given back to the braced stop
  const ph = phase(F), g = gallopRig(ph), a = standing(CUE.go - 0.001), b = standing(CUE.slid), wIn = out3(ramp(F, CUE.go, CUE.go + 9)), wOut = inOut(ramp(F, CUE.brake, CUE.brake + 13));
  let rig = mixRig(a.rig, g, wIn), y = lerp(a.y, gallopY(ph, g), wIn), x = lerp(a.x, TRACK_X, smooth(ramp(F, CUE.go, CUE.go + 24)));
  if (wOut > 0) { rig = mixRig(rig, b.rig, wOut); y = lerp(y, b.y, wOut); x = lerp(x, b.x + 60, wOut); }
  const l = lowest(fk(rig, 0, y, 0)), sink = Math.max(l.fore, l.hind); if (sink > 0) y -= sink; // never through the ground
  return fk(rig, x + lead(F), y + FLOOR, FLOOR);
};
// what her feet throw up, each where it was made on the ground: a kick at every footfall, a long cloud from the braced stop
const BURSTS = (() => {
  const out: (Burst & { born: number; g: number })[] = [];
  const add = (born: number, x: number, big: number, seed: number) => { const g = TRAVEL(born) + (x - 540); out.push({ born, g, x, y: FLOOR, age: 0, seed, wet: inPan(LAND, g), big }); };
  for (let n = 0; n < 13; n++) for (const [ph, fore] of [[0.2, true], [0.68, false]] as const) { const born = CUE.go + (n + ph - PH0) * STRIDE; if (born < CUE.go + 2 || born > CUE.brake + 2) continue; const q = poseAt(born); add(born, fore ? q.foreN[4][0] : q.hindN[4][0], fore ? 0.85 : 1.25, 300 + n * 2 + (fore ? 1 : 0)); }
  for (let i = 0; i < 9; i++) { const born = CUE.brake + 3 + i * 3.5, q = poseAt(born); add(born, q.foreN[4][0] + 10, 1.9 - i * 0.08, 500 + i); }
  return out;
})();
const bursts = (c: Ctx, F: number, wet: boolean) => { const X = TRAVEL(F); for (const b of BURSTS) if (b.wet === wet && F >= b.born && F < b.born + 20) drawBurst(c, { ...b, x: b.x - (X - TRAVEL(b.born)) * (wet ? 1 : 0.92), age: F - b.born }); };
// the frame takes a small knock as each pair of feet comes down
const knock = (F: number) => { if (F < CUE.go || F > CUE.brake + 20) return 0; const ph = (((phase(F) % 1) + 1) % 1), since = Math.min((ph - 0.2 + 1) % 1, (ph - 0.68 + 1) % 1) * STRIDE; return 4.5 * pace(F) * Math.exp(-since / 2.4) * Math.cos(since * 1.9); };

// ---------------------------------------------------------------- the world
// cheetahDusk's blade, mark for mark, so the grass is one grass across both seams
const blade = (c: Ctx, o: P, a: number, len: number, w: number, col: string) => {
  if (len < 1.5 || w < 0.6) return;
  const ca = Math.cos(a), sa = Math.sin(a), t: P = [o[0] + ca * len, o[1] + sa * len], m = len * 0.42, mx = o[0] + ca * m, my = o[1] + sa * m;
  const g = c.createLinearGradient(o[0], o[1], t[0], t[1]); g.addColorStop(0, mix(col, DARK, 0.6)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, "#ffffff", 0.16));
  c.fillStyle = g; c.beginPath(); c.moveTo(o[0], o[1]); c.quadraticCurveTo(mx - sa * w, my + ca * w, t[0], t[1]); c.quadraticCurveTo(mx + sa * w, my - ca * w, o[0], o[1]); c.fill();
};
const wrap = (x: number, span: number, lo: number) => ((((x - lo) % span) + span) % span) + lo;
const SCENE = (() => {
  const q = rng(3);
  // the near grass: cheetahDusk's seventy blades where that film has them, and more beyond its frame for when the camera is further back
  const more = rng(43), near = [...duskGrass, ...Array.from({ length: 22 }, (_, i) => ({ x: i % 2 ? -160 + more() * 160 : W + more() * 160, h: 90 + more() * 220, a: (more() - 0.5) * 0.5, w: 9 + more() * 8, col: more() < 0.15 ? TEAL : mix(NIGHT, TEAL, more() * 0.5), ph: more() * 6.28 }))];
  const far = Array.from({ length: 150 }, () => ({ x: q() * 1320, h: 26 + q() * 60, w: 5 + q() * 5, col: mix(NIGHT, TEAL, q() * 0.55), dy: q() * 10, a: (q() - 0.5) * 0.5, ph: q() * 6.28 }));
  const streaks = Array.from({ length: 34 }, () => ({ x: q() * 2200, y: 700 + q() * 150, len: 140 + q() * 420, w: 2.2 + q() * 4.5, col: mix(RUST, NIGHT, 0.35 + q() * 0.5), al: 0.3 + q() * 0.3 }));
  const flecks = Array.from({ length: 14 }, () => ({ x: q() * 2600, y: 880 + q() * 180, len: 200 + q() * 300, w: 1.4 + q() * 1.6, al: 0.1 + q() * 0.14 }));
  return { near, far, streaks, flecks };
})();
const SIDE_CAM = { z: 410 / 470, look: [540, 430 - 8 / (410 / 470)] as P };   // the sun where the look still has it: (540, 548), radius 410
const PIVOT: P = [540, FLOOR - 130];
// a camera of its own for the side: in on her for the stretch, back out to give the run its room, in a little as she flies
const push = (F: number) => 1 + 0.26 * inOut(ramp(F, CUE.side, CUE.bow)) * (1 - inOut(ramp(F, CUE.up - 6, CUE.go + 22))) + 0.07 * smooth(ramp(F, CUE.speed, CUE.speed + 45)) * (1 - smooth(ramp(F, CUE.brake - 30, CUE.brake))) + 0.12 * inOut(ramp(F, CUE.slid, CUE.stood + 6)) * (1 - inOut(ramp(F, CUE.swingBack - 18, CUE.swingBack)));

const grainLayer = (env: Env): Layer => { // the paper's tooth and the dusk settling at the edges: cheetahDusk's, grain for grain
  const key = "cheetahRun:grain"; let L = env.cache.get(key) as Layer | undefined; if (L) return L;
  L = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale)); env.cache.set(key, L);
  const c = L.ctx, q = rng(77); c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = 0; i < 200000; i++) { const x = q() * W, y = q() * H, d = Math.hypot(x - 540, y - 520) / 740; if (q() > d * d * d * 1.1) continue; c.fillStyle = DARK; c.globalAlpha = 0.42; c.fillRect(x, y, 1.1, 1.1); }
  for (let i = 0; i < 30000; i++) { const x = q() * W, y = q() * H, lt = q() < 0.5; c.fillStyle = lt ? "#fff5de" : "#000000"; c.globalAlpha = lt ? 0.06 : 0.08; c.fillRect(x, y, 1.1, 1.1); }
  return L;
};

const side = (ctx: Ctx, F: number, env: Env) => {
  const c = ctx, s = env.scale, out = F < CUE.swingBack, w = out ? ramp(F, CUE.swing, CUE.side) : 1 - ramp(F, CUE.swingBack, CUE.face), e = inOut(w), turning = w < 1;
  // cheetahDusk's world through a camera that pulls back as it comes round: its sun stays, far off
  const tau = out ? lerp(255, 262, ramp(F, CUE.swing, CUE.side)) : 262, d = camAt(tau), Z = push(F), zz = Math.exp(lerp(Math.log(d.z), Math.log(SIDE_CAM.z), e)) * Z;
  const cam = { z: zz, look: [lerp(d.look[0], SIDE_CAM.look[0], e) + ((PIVOT[0] - 540) * (Z - 1)) / zz, lerp(d.look[1], SIDE_CAM.look[1], e) + ((PIVOT[1] - 540) * (Z - 1)) / zz] as P };
  drawDusk(c, tau, env, { cam, world: F, face: false, grass: false, grain: false });
  // her, and how the turn places her: the head's centre on screen, its size, how far round we are
  const pose = poseAt(F), anchor = headAnchor(pose), yaw = (Math.PI / 2) * e, k0 = d.z, k = Math.exp(lerp(Math.log(k0), Math.log(HEAD_K), e)), kb = k / HEAD_K, sx = Math.sin(yaw);
  const P0: P = [(FACE[0] - d.look[0]) * d.z + 540, (FACE[1] - d.look[1]) * d.z + 540], hc: P = [lerp(P0[0], anchor[0], e), lerp(P0[1], anchor[1], e)];
  // the ground comes up under her as the camera pulls back: everything that stands on it rides on this line
  const drop = turning ? hc[1] + (FLOOR - anchor[1]) * kb - FLOOR : 0, shake = knock(F);
  const screen = () => c.setTransform(s * Z, 0, 0, s * Z, s * PIVOT[0] * (1 - Z), s * (PIVOT[1] * (1 - Z) + drop + shake));
  const v = pace(F), X = TRAVEL(F), lean = smooth(v);
  if (drop < 1400) {
    screen();
    drawFar(c, LAND, X, F, GROUND, lean);
    drawFlock(c, LAND, X, F, GROUND, frameAt);
    for (const g of SCENE.streaks) leaf(c, wrap(g.x - X * 0.8, 2200, -500) + g.len, g.y, Math.PI, g.len * (0.4 + 0.6 * v), g.w, g.col, g.al * v);
    c.fillStyle = mix(NIGHT, DARK, 0.35); c.fillRect(-40, GROUND, W + 80, H - GROUND + 400);
    for (const g of SCENE.far) leaf(c, wrap(g.x - X, 1320, -120), GROUND + 6 + g.dy, -Math.PI / 2 + g.a * (1 - lean) + Math.sin(F * (Math.PI / 45) + g.ph) * 0.06 * (1 - lean) - lean * 1.1, g.h * (1 + lean * 0.35), g.w, g.col);
    drawPan(c, LAND, X, F, GROUND, v);
  }
  const SWAP = 0.64; // past this point of the turn the head is small and nearly side-on, and the profile head takes over
  // the chest under the face goes first: it is a front, and a front narrows away and sinks behind her as we come round
  if (turning && yaw < 0.36) { c.save(); c.setTransform(s, 0, 0, s, 0, 0); c.beginPath(); c.rect(-10, -10, hc[0] + 240 * k * Math.cos(yaw) + 10, H + 20); c.clip(); turnedNeck(c, env, out ? 255 : 262, yaw, hc[0], hc[1] + (1 - Math.cos(yaw)) * 1500 * k, k); c.restore(); }
  if (sx > 0.03) {
    // her body: edge-on behind the face at first, its full length by the time we are beside her
    if (turning) c.setTransform(s * kb * sx, 0, 0, s * kb, s * (hc[0] - anchor[0] * kb * sx), s * (hc[1] - anchor[1] * kb)); else screen();
    const l = lowest(pose), air = clamp((FLOOR - Math.max(l.fore, l.hind)) / 60), x0 = pose.spine[0][0], x1 = pose.spine[9][0];
    for (let i = 0; i < 5; i++) { c.fillStyle = DARK; c.globalAlpha = 0.2 * (1 - air * 0.45); c.beginPath(); c.ellipse((x0 + x1) / 2 + 20, FLOOR + 8, ((x1 - x0) * 0.62 + 40) * (1 - i * 0.11) * (1 - air * 0.12), 15 - i * 2.1, 0, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    bursts(c, F, false);
    drawCheetah(c, pose, turning && w < SWAP ? { head: false } : {});
    bursts(c, F, true);
  }
  if (turning && w < SWAP) turnedHead(c, env, out ? 255 : 262, yaw, hc[0], hc[1], k);
  // the near grass, in cheetahDusk's own camera: its blades, swept over and streaming while she runs
  c.setTransform(s * cam.z, 0, 0, s * cam.z, s * (540 - cam.look[0] * cam.z), s * (540 - cam.look[1] * cam.z));
  for (const g of SCENE.near) blade(c, [wrap(g.x - X * NEAR, WRAP, -160), H + 20], -Math.PI / 2 + g.a * (1 - lean * 0.8) + Math.sin(F * (Math.PI / 45) + g.ph) * 0.07 - lean * 1.02, g.h * (1 + lean * 0.45), g.w, g.col);
  screen();
  drawLens(c, LAND, X, H);
  for (const g of SCENE.flecks) leaf(c, wrap(g.x - X * 2.1, 2600, -600) + g.len, g.y, Math.PI, g.len, g.w, PALE, g.al * v);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(grainLayer(env).canvas, 0, 0);
};

const draw = (ctx: Ctx, F: number, env: Env) => {
  if (F < CUE.swing) return drawDusk(ctx, F, env);
  if (F < CUE.face) return side(ctx, F, env);
  drawDusk(ctx, F < CUE.eye ? lerp(262, 270, ramp(F, CUE.face, CUE.eye)) : F - 450, env, { world: F });
};

// the score: nine bars at 80 bpm are the film's 27 s exactly, so the loop is the music's own
const audio = (sr: number): [Float32Array, Float32Array] => {
  const n = Math.round((N / 30) * sr), L = new Float32Array(n), R = new Float32Array(n), m = renderLoop(cheetahRunScore(), sr); // its tail folded back onto its start: no cut at the seam
  for (let i = 0; i < n && i < m.L.length; i++) { L[i] = m.L[i]; R[i] = m.R[i]; }
  return [L, R];
};

export const cheetahRun: Film = {
  meta: { title: "Cheetah, run", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu", kind: "loop", poster: 500, score: { tempo: 80, form: "9 bars of 12/8, looping: drone and cell, the cycle enters, one long note, held breath and go, the cell in her stride, the stop, home" }, sync: [{ frame: 405, label: "she goes" }, { frame: 575, label: "forefeet braced" }] },
  assets: { images: {} },
  shots: [{ id: "run", start: 0, end: N, draw }],
  audio: Object.assign(audio, { scores: [cheetahRunScore()] }),
};

// ---------------------------------------------------------------- the signed cut, for posting
// The loop played once, then four seconds on the night it ends in: the wordmark is written in the
// sky in the moon's own white, its dot landing on the score's last note, and the address is set
// under it. The stars and the grass keep moving; nothing else is added to the picture.
const END = N + 120, SIGN = { write: N + 10, dot: N + 38, url: N + 48, set: N + 66 };
const signed = (ctx: Ctx, F: number, env: Env) => {
  if (F < N) return draw(ctx, F, env);
  duskNight(ctx, F - 450, env);
  logoCentred(ctx, env, 540, 452, 92, ramp(F, SIGN.write, SIGN.write + (SIGN.dot - SIGN.write) / 0.9), { color: DUSK_PALE, pen: false });
  setType(ctx, env, "github.com/alexgreensh/anidoodle", 540, 628, 34, ramp(F, SIGN.url, SIGN.set), { color: DUSK_PALE, align: "center", weight: 600, track: 0.01 });
};
const signedAudio = (sr: number): [Float32Array, Float32Array] => {
  const n = Math.round((END / 30) * sr), L = new Float32Array(n), R = new Float32Array(n), m = renderPiece(cheetahRunSignedScore(), sr);
  for (let i = 0; i < n && i < m.L.length; i++) { L[i] = m.L[i]; R[i] = m.R[i]; }
  return [L, R];
};
export const cheetahRunSigned: Film = {
  meta: { title: "Cheetah, run (signed)", W, H, fps: 30, bpm: 120, durationFrames: END, raster: "cpu", kind: "story", poster: 500, score: { tempo: 80, form: "the nine bars once, then a tenth that closes them: the cell lands on the tonic and rings" }, sync: [{ frame: 405, label: "she goes" }, { frame: 575, label: "forefeet braced" }] },
  assets: { images: {} },
  shots: [{ id: "run", start: 0, end: END, draw: signed }],
  audio: Object.assign(signedAudio, { scores: [cheetahRunSignedScore()] }),
};
