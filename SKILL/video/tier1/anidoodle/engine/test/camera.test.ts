// CAMERA TESTS. The engine camera (src/canvas-core/camera.ts) is pure arithmetic, so it is held to
// exact numbers here, with no browser: node tools/test.mjs
import { Camera, dollyZoom, EASE, heroScale, monoPath, planeScale, projectCam, strokeWeight, unprojectCam, type Cam } from "../src/canvas-core/camera";
import { Gfx, type P } from "../src/canvas-core/core";

export const name = "camera";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const cam = new Camera([540, 540], [{ f: 0, look: [400, 300], zoom: 1 }, { f: 90, look: [900, 300], zoom: 2 }, { f: 150, look: [900, 300], zoom: 2 }, { f: 240, look: [400, 300], zoom: 0.5 }]);
  cam.shake({ from: 96, to: 126, amp: 14, seed: 7, rot: 0.05 });

  // a fake context that records the transform the Gfx stack sets
  let T: number[] = [];
  const ctx = { setTransform: (...a: number[]) => { T = a; } } as unknown as ConstructorParameters<typeof Gfx>[0];
  const env = { W: 1080, H: 1080, scale: 1, canvas: () => ({ ctx }), cache: new Map() } as unknown as ConstructorParameters<typeof Gfx>[1];
  const g = new (Gfx as unknown as new (...a: unknown[]) => Gfx)(ctx, env, 0, "screen");

  // 1. the transform path and the projector path are one camera
  let maxErr = 0, roundTrip = 0;
  for (const f of [0, 45, 97, 100, 110, 125, 200]) for (const z of [0, 0.7, -0.3]) {
    cam.begin(g, f, z); const [a, b, c, d, e, ff] = T; cam.end(g);
    for (const p of [[0, 0], [400, 300], [1234, -77]] as P[]) {
      const s = cam.toScreen(p, f, z), m = [a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + ff];
      maxErr = Math.max(maxErr, Math.hypot(s[0] - m[0], s[1] - m[1]));
      const w = cam.toWorld(s, f, z); roundTrip = Math.max(roundTrip, Math.hypot(w[0] - p[0], w[1] - p[1]));
    }
  }
  ok(maxErr < 1e-6, `begin() transform and toScreen() agree (max ${maxErr.toExponential(1)} px)`);
  ok(roundTrip < 1e-6, `toWorld(toScreen(p)) = p at every depth, shake and rotation included (max ${roundTrip.toExponential(1)})`);

  // 2. zoom is eased in stops: the middle of a 1 -> 2 inout segment is sqrt(2), not 1.5
  ok(near(cam.at(45).zoom, Math.SQRT2), "log2 midpoint of zoom 1 -> 2 is sqrt 2");
  ok(near(cam.at(45).look[0], 650), "look is eased linearly in world units (midpoint 650)");
  ok(near(cam.at(0).zoom, 1) && near(cam.at(90).zoom, 2) && near(cam.at(120).zoom, 2) && near(cam.at(999).zoom, 0.5), "keys are hit exactly; held between equal keys; clamped past the last");

  // 3. eases: ends pinned, inout symmetric
  for (const [n, e] of Object.entries(EASE)) ok(near(e(0), 0) && near(e(1), 1), `ease ${n} runs 0 -> 1`);
  ok(near(EASE.inout(0.5), 0.5) && near(EASE.inout(0.25) + EASE.inout(0.75), 1), "inout is symmetric");

  // 4. the dolly model
  const c2: Cam = { look: [0, 0], zoom: 2 };
  ok(near(planeScale(c2, 0), 2), "hero plane scales by zoom exactly");
  ok(near(planeScale(c2, 1), 1 / (0.5 + 1)), "a plane at depth z scales by 1/(D + z)");
  ok(planeScale(c2, 1) < planeScale(c2, 0) && planeScale(c2, -0.2) > planeScale(c2, 0), "far planes shrink, near planes grow");
  const p: P = [123, -45], s = projectCam([540, 540], c2, 0.4, p, 0.2), back = unprojectCam([540, 540], c2, 0.4, s, 0.2);
  ok(near(back[0], p[0], 1e-9) && near(back[1], p[1], 1e-9), "projectCam / unprojectCam invert each other");
  ok(near(strokeWeight({ look: [0, 0], zoom: 8 }), Math.pow(8, 0.35)), "stroke weight is zoom^0.35");

  // 5. shake: confined to its window, deterministic, rings down
  ok(cam.shakeAt(95).every((v) => v === 0) && cam.shakeAt(126).every((v) => v === 0), "no shake outside [from, to)");
  ok(JSON.stringify(cam.shakeAt(100)) === JSON.stringify(new Camera([540, 540], [{ f: 0, look: [0, 0], zoom: 1 }]).shake({ from: 96, to: 126, amp: 14, seed: 7, rot: 0.05 }).shakeAt(100)), "shake is a pure function of (seed, frame)");
  const early = Math.max(...[98, 99, 100, 101].map((f) => Math.hypot(...cam.shakeAt(f).slice(0, 2) as [number, number]))), late = Math.max(...[121, 122, 123, 124, 125].map((f) => Math.hypot(...cam.shakeAt(f).slice(0, 2) as [number, number])));
  ok(early > late, `shake decays (${early.toFixed(2)} px early vs ${late.toFixed(2)} px late)`);
  ok(Math.hypot(...cam.shakeAt(96).slice(0, 2) as [number, number]) <= 14 * 0.5 + 1e-9, "shake attacks over its ramp instead of starting at full amplitude");

  // 6. monotone path: never overshoots, never reverses, hits its keys
  const keys = [[0, 1], [30, 4], [60, 4.2], [90, 0.5]] as const, path = monoPath(keys, { log2: true });
  let prev = path(0), dir = 0, reversed = false, lo = Infinity, hi = -Infinity;
  for (let f = 0; f <= 90; f += 0.5) { const v = path(f); lo = Math.min(lo, v); hi = Math.max(hi, v); const d = Math.sign(v - prev); if (d && dir && d !== dir && f < 60) reversed = true; if (d) dir = d; prev = v; }
  ok(keys.every(([f, v]) => near(path(f), v, 1e-9)), "monoPath passes through every key");
  ok(lo >= 0.5 - 1e-9 && hi <= 4.2 + 1e-9, "monoPath never overshoots its keys");
  ok(!reversed, "monoPath never reverses inside a rising run");
  const mono = new Camera([540, 540], [{ f: 0, look: [0, 0], zoom: 1 }, { f: 30, zoom: 4 }, { f: 60, zoom: 4.2 }, { f: 90, zoom: 0.5 }], { monoZoom: true });
  ok([0, 13, 30, 47, 75, 90].every((f) => near(mono.at(f).zoom, path(f), 1e-12)), "Camera monoZoom uses the same path (built once, same answers every call)");

  // 7. the Gfx transform stack composes rotation into child translation
  g.push(10, 20, 2, 0.3); g.push(5, 0, 1, 0); const T1 = T; g.pop(); g.pop();
  ok(near(T1[4], 10 + 2 * Math.cos(0.3) * 5) && near(T1[5], 20 + 2 * Math.sin(0.3) * 5), "nested push: child translation is rotated and scaled by the parent");

  // 8. lens zoom is not a dolly: the lens scales every plane by one factor, the dolly changes parallax
  const base: Cam = { look: [0, 0], zoom: 1.5 }, lensed: Cam = { ...base, lens: 2 }, dollied: Cam = { look: [0, 0], zoom: 3 };
  ok(near(heroScale(lensed), 3) && near(heroScale(dollied), 3) && near(heroScale(base), 1.5), "hero-plane scale is dolly x lens (a lens of 2 and a dolly to 3 frame the hero the same)");
  ok([0.5, 1, 3, -0.2].every((z) => near(planeScale(lensed, z) / planeScale(base, z), 2)), "a lens zoom grows every depth by the same factor: the depth relationships do not change");
  ok(planeScale(dollied, 3) / planeScale(dollied, 0) < planeScale(base, 3) / planeScale(base, 0), "a dolly in to the same hero size shrinks the far plane relative to the hero: parallax changes");
  ok(near(strokeWeight(lensed), Math.pow(3, 0.35)), "stroke weight follows the screen scale, lens included");
  const lc = new Camera([540, 540], [{ f: 0, look: [0, 0], zoom: 1 }, { f: 60, lens: 1 }, { f: 120, lens: 4 }]);
  ok(near(lc.at(90).lens!, 2) && near(lc.at(90).zoom, 1) && near(lc.at(0).lens!, 1), "lens keys ease in log2 like the dolly (midpoint of 1 -> 4 is 2) and hold before their first key");
  ok(JSON.stringify(Object.keys(cam.at(45))) === JSON.stringify(["look", "zoom"]), "a camera that never sets a lens answers exactly as before (no lens field)");
  lc.shake({ from: 80, to: 110, amp: 10, seed: 3 }); // inside the lens move, so the lens is not 1 where the shake is measured
  let lensErr = 0, lensTrip = 0, shakePx = 0;
  for (const f of [5, 70, 85, 100]) for (const z of [0, 1.5, -0.25]) {
    lc.begin(g, f, z); const [a, b, c, d, e, ff] = T; lc.end(g);
    for (const q of [[0, 0], [300, -120]] as P[]) { const s = lc.toScreen(q, f, z), m = [a * q[0] + c * q[1] + e, b * q[0] + d * q[1] + ff]; lensErr = Math.max(lensErr, Math.hypot(s[0] - m[0], s[1] - m[1])); const w = lc.toWorld(s, f, z); lensTrip = Math.max(lensTrip, Math.hypot(w[0] - q[0], w[1] - q[1])); }
  }
  { const sh = lc.shaken(85), cl = lc.at(85), [dx, dy] = lc.shakeAt(85); shakePx = Math.hypot((cl.look[0] - sh.look[0]) * heroScale(sh) - dx, (cl.look[1] - sh.look[1]) * heroScale(sh) - dy); }
  ok(lensErr < 1e-6 && lensTrip < 1e-6, "with a lens, begin() and toScreen() still agree and toWorld inverts them");
  ok(lc.at(85).lens! > 1.2 && Math.hypot(...lc.shakeAt(85).slice(0, 2) as [number, number]) > 0.5 && shakePx < 1e-9 && lc.shaken(70).lens !== undefined, "shake stays in screen px under a lens, and the shaken camera keeps its lens");

  // 9. the dolly zoom: the hero plane holds its size while the depth stretches
  const dolly = new Camera([540, 540], [{ f: 0, look: [0, 0], zoom: 1 }, { f: 60, zoom: 3 }]), vz = dollyZoom((f) => dolly.at(f));
  ok([0, 15, 30, 45, 60].every((f) => near(heroScale(vz(f)), 1, 1e-12)), "dollyZoom holds the hero plane's screen scale on every frame");
  ok(planeScale(vz(60), 2) < planeScale(vz(0), 2) * 0.6, `dollying in, the far plane falls away behind the subject (${planeScale(vz(0), 2).toFixed(3)} -> ${planeScale(vz(60), 2).toFixed(3)})`);
  const out = new Camera([540, 540], [{ f: 0, look: [0, 0], zoom: 2 }, { f: 60, zoom: 0.8 }]), vo = dollyZoom((f) => out.at(f), { at: 0 });
  ok(near(heroScale(vo(60)), 2) && planeScale(vo(60), 2) > planeScale(vo(0), 2), "dollying out, the hero holds and the background looms");
  ok(near(heroScale(dollyZoom((f) => dolly.at(f), { hold: 2.5 })(30)), 2.5), "hold sets the size to keep");
  const asPath = new Camera([540, 540], [], { path: vz });
  ok(near(heroScale(asPath.shaken(40)), 1) && asPath.toScreen([0, 0], 40)[0] === 540, "a dolly zoom drives a Camera as a path, with shake and projections intact");

  // 10. bad input is refused, loudly
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  ok(throws(() => new Camera([0, 0], [{ f: 5, zoom: 1 }, { f: 5, zoom: 2 }])), "rejects duplicate key frames");
  ok(throws(() => new Camera([0, 0], [{ f: 1.5, zoom: 1 }])), "rejects a fractional key frame");
  ok(throws(() => new Camera([0, 0], [{ f: 0, zoom: 0 }])), "rejects zoom <= 0");
  ok(throws(() => new Camera([0, 0], [])), "rejects a camera with neither keys nor path");
  ok(throws(() => cam.shake({ from: 10, to: 10, amp: 1, seed: 1 })), "rejects an empty shake window");
  ok(throws(() => monoPath([[0, 1], [0, 2]])), "monoPath rejects non-increasing keys");
  { const extra = new Camera([0, 0], [], { path: () => ({ look: [0, 0], zoom: 1, extra: 1 } as unknown as Cam) }); ok(JSON.stringify(Object.keys(extra.shaken(0))) === JSON.stringify(["look", "zoom", "rot"]), "shaken() returns only the camera's own fields"); }
  ok(throws(() => new Camera([0, 0], [{ f: 0, zoom: Infinity }])), "rejects an endless zoom");
  ok(throws(() => new Camera([0, 0], [{ f: 0, zoom: 1, lens: 0 }])) && throws(() => new Camera([0, 0], [{ f: 0, zoom: 1, lens: NaN }])) && throws(() => new Camera([0, 0], [{ f: 0, zoom: NaN }])), "rejects a lens <= 0, or a lens or zoom that is not a number");
  ok(throws(() => dollyZoom((f) => dolly.at(f), { hold: 0 })) && throws(() => dollyZoom(() => ({ look: [0, 0], zoom: 0 }))), "dollyZoom refuses a size of 0 to hold, or a dolly at zoom 0");
};
