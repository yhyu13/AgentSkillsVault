// TIME REMAP TESTS. src/canvas-core/timeRemap.ts is arithmetic, so its claims (time is continuous and
// never runs backwards, a ramp has no kick, a freeze says what keeps moving, a sound can be cued on a
// remapped event) are held to numbers here.   node tools/test.mjs timeRemap
import { timeRemap, type TimeKey } from "../src/canvas-core/timeRemap";

export const name = "timeRemap";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

  // 1. no keys is real time; a key at speed 1 changes nothing
  const id = timeRemap([]);
  ok([-5, 0, 0.5, 37, 900].every((f) => id.at(f) === f && id.speedAt(f) === 1), "no keys: scene frame = film frame, speed 1");
  ok([0, 12, 300].every((f) => timeRemap([{ f: 10, speed: 1 }]).at(f) === f), "a key at speed 1 is real time");

  // 2. exact numbers: a hard change to slow motion, then a smooth ramp back
  const slow = timeRemap([{ f: 30, speed: 0.25 }, { f: 70, speed: 1, ramp: 10 }]);
  ok(near(slow.at(30), 30) && near(slow.at(70), 40) && near(slow.at(50), 35), "speed 0.25 from frame 30: 40 film frames show 10 scene frames");
  ok(near(slow.at(80), 40 + 10 * (0.25 + 1) / 2) && near(slow.at(100), 46.25 + 20), "a ramp covers the mean of its two speeds, then real time resumes");
  ok(near(slow.speedAt(75), 0.25 + 0.75 * 0.5) && near(slow.speedAt(70), 0.25) && near(slow.speedAt(80), 1), "the speed glides from 0.25 to 1 over the ramp, half way at its middle");

  // 3. a full ramp-freeze-release: continuous, never backwards, speed continuous, no kick at the ramp ends
  const keys: TimeKey[] = [{ f: 60, speed: 0.3, ramp: 8 }, { f: 90, speed: 0, ramp: 4, keepsMoving: "the name writes itself" }, { f: 126, speed: 1, ramp: 12 }];
  const t = timeRemap(keys);
  let back = false, jump = 0, sjump = 0;
  for (let f = -10; f <= 300; f += 0.125) { const a = t.at(f), b = t.at(f + 0.125); if (b < a - 1e-12) back = true; jump = Math.max(jump, b - a); sjump = Math.max(sjump, Math.abs(t.speedAt(f + 0.125) - t.speedAt(f))); }
  ok(!back, "scene time never runs backwards");
  ok(jump <= 0.125 + 1e-9, `scene time never jumps (largest step ${jump.toFixed(4)} for 0.125 film frames, at most real time here)`);
  ok(sjump < 0.1, `the speed never steps on a smooth ramp (largest change ${sjump.toFixed(4)} per eighth of a frame)`);
  const e = 1e-4, kick = (f: number) => Math.abs(t.speedAt(f + e) - t.speedAt(f)) / e;
  ok([60, 68, 90, 94, 126, 138].every((f) => kick(f) < 1e-2), "smoothstep ramps start and end with no kick (speed flat at both ends)");
  ok(t.freezes.length === 1 && t.freezes[0].from === 94 && t.freezes[0].to === 126 && t.freezes[0].keepsMoving === "the name writes itself", "the freeze is listed from where the speed reaches 0 to the next key, with what keeps moving");
  ok([94, 100, 110.5, 125.99].every((f) => near(t.at(f), t.at(94))), "inside the freeze the scene stands still");
  ok(t.at(127) > t.at(126), "it releases at the next key");

  // 4. a linear ramp covers the same area as a smooth one; fast motion runs ahead of real time
  const lin = timeRemap([{ f: 0, speed: 0.5, ramp: 10, curve: "linear" }]), smo = timeRemap([{ f: 0, speed: 0.5, ramp: 10 }]);
  ok(near(lin.at(10), smo.at(10)) && near(lin.at(10), 7.5) && near(lin.speedAt(2.5), 0.875), "linear and smooth ramps cover the same area by their end; linear glides in a straight line");
  ok(near(timeRemap([{ f: 20, speed: 2 }]).at(50), 80), "speed 2 shows two scene frames per film frame");

  // 5. cueing a sound on a remapped event: the first film frame that shows it
  for (const target of [10, 61.3, 75, t.at(94), t.at(94) + 0.5, 140, 400]) {
    const f = t.filmFrameOf(target);
    ok(Number.isInteger(f) && t.at(f) >= target - 1e-9 && t.at(f - 1) < target, `scene frame ${target.toFixed(2)} is first shown on film frame ${f}`);
  }
  ok(t.filmFrameOf(t.at(100)) <= 94, "an event at the frozen moment is cued where the freeze begins, not later");
  ok(throws(() => timeRemap([{ f: 10, speed: 0, keepsMoving: "camera creeps" }]).filmFrameOf(50)), "a scene frame past a freeze that never releases is never shown, and says so");
  ok(timeRemap([{ f: 0, speed: 0.01 }]).filmFrameOf(5) === 500, "a very slow remap still finds its frame");

  // 6. pure: the same keys give the same numbers in any order of asking
  const a = timeRemap(keys), b = timeRemap(keys), order1 = [200, 5, 100, 61].map((f) => a.at(f)), order2 = [61, 100, 5, 200].map((f) => b.at(f)).reverse();
  ok(JSON.stringify(order1) === JSON.stringify(order2), "the same keys answer the same, whatever order frames are asked in");

  // 7. bad input is refused, loudly
  ok(throws(() => timeRemap([{ f: 30, speed: 0 }])) && throws(() => timeRemap([{ f: 30, speed: 0, keepsMoving: "  " }])), "a freeze that does not say what keeps moving is refused (dead air)");
  ok(throws(() => timeRemap([{ f: 30, speed: -1 }])) && throws(() => timeRemap([{ f: 30, speed: NaN }])), "a negative or non-number speed is refused: time never runs backwards");
  ok(throws(() => timeRemap([{ f: 30, speed: 1 }, { f: 30, speed: 2 }])) && throws(() => timeRemap([{ f: 3.5, speed: 1 }])) && throws(() => timeRemap([{ f: -1, speed: 1 }])), "keys on repeated, fractional or negative frames are refused");
  ok(throws(() => timeRemap([{ f: 30, speed: 0.5, ramp: 20 }, { f: 40, speed: 1 }])) && throws(() => timeRemap([{ f: 30, speed: 0.5, ramp: -2 }])), "a ramp that runs past the next key, or a negative ramp, is refused");
  ok(throws(() => timeRemap([{ f: 30, speed: 0.5, curve: "bounce" as "smooth" }])), "an unknown ramp curve is refused");
  ok(throws(() => timeRemap([{ f: 30, speed: 1e-9 }])) && throws(() => timeRemap([{ f: 30, speed: 0.005 }])), "a speed so slow it looks frozen is refused: declare a freeze instead");
  ok(timeRemap([{ f: 0, speed: 0, ramp: 10, keepsMoving: "dust" }, { f: 10, speed: 1 }]).freezes.length === 0, "a ramp that fills the gap to the next key lists no empty freeze");
  { let msg = ""; try { timeRemap([{ f: 5, speed: 1 }, { f: 3, speed: 2 }]); } catch (e) { msg = String(e); } ok(msg.includes("must increase"), "keys out of order are reported as out of order"); }
  ok(throws(() => t.at(Infinity)) && throws(() => t.at(NaN)) && throws(() => t.speedAt(NaN)), "a frame that is not a number is refused");
};
