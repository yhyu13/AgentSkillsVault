// Recorded responses change the room, never the dry mix. Missing packs retain the old spaces.
import { registerRoom, roomFor, clearRooms, reverb, type Space } from "../src/canvas-core/music/mixReverb";
import { renderPiece, voiceJobs, voiceJobKey, runVoiceJob } from "../src/canvas-core/music/render";
import { nocturne } from "../src/canvas-core/music/pieces/nocturne";
import { rng } from "../src/canvas-core/core";
import { MIX_PROFILES } from '../src/canvas-core/music/mixProfiles';
import { musicBoxJoy, chiptunePlayful } from '../src/canvas-core/music/pieces/samplers';
import { Biquad } from '../src/canvas-core/music/dsp';
const fsModule = 'node:fs', { readFileSync } = await import(fsModule);
export const name = "recorded rooms";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const same = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((v, i) => v === b[i]);
  const throws = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  clearRooms();
  try {
    const builder = readFileSync('tools/soundpack.mjs', 'utf8').match(/const ROOMS = \[([\s\S]*?)\n\];/)[1];
    const roomIds = new Set([...builder.matchAll(/id: "([^"]+)"/g)].map((m: any) => m[1]));
    ok(Object.values(MIX_PROFILES).every(p => [p.space?.room, p.drumRoom?.room].every(id => !id || roomIds.has(id))), 'every profile room is present in the pack builder room list');
    const L = new Float32Array(9600), R = new Float32Array(9600); L[0] = 0.6; R[0] = 0.5; L[3840] = 0.4; R[4320] = -0.4;
    const p = nocturne(), roomPiece = { ...p, plan: { ...p.plan, space: { ...p.plan.space, room: "test" } } }, o = { seconds: 0.7, master: "none" as const, stems: true }, before = renderPiece(p, 48000, o), missing = renderPiece(roomPiece, 48000, o), jobs = voiceJobs(roomPiece, 48000, o);
    ok(same(before.L, missing.L) && same(before.R, missing.R), "unregistered room falls back bit for bit");
    registerRoom("test", { L, R, rt60: 0.2, sha256: "a".repeat(64) });
    const recorded = renderPiece(roomPiece, 48000, o), again = renderPiece(roomPiece, 48000, o);
    ok(same(before.dry[0], recorded.dry[0]) && same(before.dry[1], recorded.dry[1]) && Object.keys(before.stems).every((id) => same(before.stems[id][0], recorded.stems[id][0])), "registered room leaves dry mix and stems untouched");
    ok(!same(before.wet[0], recorded.wet[0]) && same(recorded.L, again.L) && same(recorded.R, again.R), "recorded wet signal changes and is deterministic");
    const registeredJobs = voiceJobs(roomPiece, 48000, o);
    ok(registeredJobs.every((j, i) => voiceJobKey(j) !== voiceJobKey(jobs[i]) && j.roomHashes?.[0][1] === "a".repeat(64)), "room sha256 pins voice and guard job keys");
    const cache = new Map(), cached = renderPiece(roomPiece, 48000, { ...o, cache });
    ok(same(cached.L, recorded.L) && same(renderPiece(roomPiece, 48000, { ...o, cache }).L, recorded.L), "room renders are identical through cache hits");
    const low = renderPiece(roomPiece, 24000, o);
    ok(low.L.length === 16800 && low.L.every(Number.isFinite) && low.R.every(Number.isFinite) && same(low.L, renderPiece(roomPiece, 24000, o).L), "24 kHz recorded room renders finite and deterministically");
    const s: Space = { kind: "conv", room: "test", rt60: 1, er: 0.4, late: 0.2, hp: 100, lp: 7000, predelayMs: 20 }, impulse = new Float32Array(24000); impulse[0] = 1;
    const wet = reverb(impulse, impulse, 48000, s, rng(1)), lateOnly = reverb(impulse, impulse, 48000, { ...s, er: 0 }, rng(1)), earlyOnly = reverb(impulse, impulse, 48000, { ...s, late: 0 }, rng(1));
    ok(wet[0].slice(0, 960).every((x) => Math.abs(x) < 1e-7) && wet[2].slice(0, 960 + 1920).every((x) => Math.abs(x) < 1e-7), "predelay and 40 ms early/late split keep their timing");
    ok(same(wet[2], lateOnly[2]) && earlyOnly[2].every((x) => x === 0) && !same(earlyOnly[0], wet[0]), "er and late independently control the recorded reflections and tail");
    registerRoom("test", { L: Float32Array.from(L, (x) => -x), R, rt60: 0.2, sha256: "b".repeat(64) });
    ok(voiceJobKey(voiceJobs(roomPiece, 48000, o)[0]) !== voiceJobKey(registeredJobs[0]) && throws(() => runVoiceJob(registeredJobs[0])) && !same(renderPiece(roomPiece, 48000, { ...o, cache }).L, cached.L), "replacing a room invalidates jobs and cache identity");
    ok(throws(() => registerRoom("bad", { L, R: new Float32Array(1), rt60: 0.2, sha256: "c".repeat(64) })) && !roomFor("bad"), "invalid room PCM is rejected before registration");
    clearRooms();
    for (const kind of ["conv", "plate", "fdn"] as const) {
      const a = reverb(impulse, impulse, 48000, { ...s, kind, room: undefined }, rng(3)), b = reverb(impulse, impulse, 48000, { ...s, kind }, rng(3));
      ok(a.every((c, i) => same(c, b[i])), `${kind}: missing room preserves every wet channel bit for bit`);
    }
    for (const make of [musicBoxJoy, chiptunePlayful]) {
      const p = make(), before = renderPiece(p, 24000, o), unknown = renderPiece({ ...p, plan: { ...p.plan, space: { room: 'not-installed' } } }, 24000, o);
      ok(same(before.L, unknown.L) && same(before.R, unknown.R), `${make.name}: an unavailable room-only override retains the original no-pack recipe`);
    }
    const ir = new Float32Array(4800); ir[0] = 0.8; ir[119] = 0.2; ir[240] = 0.1; ir[2400] = 0.01;
    const recordedRoom = { L: ir, R: Float32Array.from(ir), rt60: 0.1, sha256: 'd'.repeat(64), directFrames: 120 };
    registerRoom('trimmed', recordedRoom);
    const roomSpace = { ...s, room: 'trimmed', predelayMs: 0, er: 1, late: 1 };
    for (const rate of [48000, 24000]) {
      const input = new Float32Array(rate / 2); input[0] = 1;
      const a = reverb(input, input, rate, roomSpace, rng(1));
      ok(a[0].slice(0, Math.round(120 * rate / 48000)).every(x => Math.abs(x) < 1e-7), `${rate} Hz: directFrames is removed before the wet reflections`);
    }
    const a = reverb(impulse, impulse, 48000, roomSpace, rng(1));
    const filtered = Float32Array.from(impulse); Biquad.make(48000, 'hp', s.hp, 0.7071).run(filtered); Biquad.make(48000, 'lp', s.lp, 0.7071).run(filtered);
    const energy = (x: Float32Array) => x.reduce((sum, v) => sum + v * v, 0);
    const early = reverb(impulse, impulse, 48000, { ...roomSpace, late: 0 }, rng(1));
    ok(Math.abs(energy(a[2]) / energy(filtered) - (1.5 * 0.36) ** 2) < 1e-6 && Math.abs(energy(early[0]) / energy(filtered) - 0.51 ** 2) < 1e-6, 'recorded early and late each use synthIR unit-per-channel energy');
    registerRoom('trimmed', { ...recordedRoom, directFrames: 121 });
    const named = { ...p, plan: { ...p.plan, space: { room: 'trimmed' } } }, oldJobs = voiceJobs(named, 48000, o);
    registerRoom('trimmed', { ...recordedRoom, directFrames: 122 });
    ok(voiceJobKey(oldJobs[0]) !== voiceJobKey(voiceJobs(named, 48000, o)[0]) && throws(() => runVoiceJob(oldJobs[0])), 'directFrames participates in room cache identity and stale-job rejection');
    ok(throws(() => registerRoom('bad-direct', { ...recordedRoom, directFrames: -1 })), 'invalid directFrames is rejected');
  } finally { clearRooms(); }
};
