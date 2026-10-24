#!/usr/bin/env node
// Loader regression: ffprobe can close stdin early on a large FLAC. No real pack required.
//   node tools/sounds-unit.mjs <durable-test-dir>
import { build } from "esbuild";
import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, symlinkSync, chmodSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadBanks } from "./sounds.mjs";

const dir = process.argv[2]; if (!dir) throw new Error("name a durable test directory");
const root = resolve(dir); mkdirSync(root, { recursive: true });
const frames = 48000 * 12, pcm = Buffer.alloc(frames * 8); let seed = 7;
for (let i = 0; i < frames * 2; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pcm.writeFloatLE(((seed >>> 0) / 4294967296 - 0.5) * 0.5, i * 4); }
const file = join(root, "large.flac");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", "48000", "-ac", "2", "-i", "pipe:0", "-c:a", "flac", "-sample_fmt", "s32", "-bits_per_raw_sample", "24", file], { input: pcm });
const bytes = readFileSync(file); assert(bytes.length > 2 * 1024 * 1024, "fixture must exceed the stdin pipe buffer by megabytes");
const zone = { file: "large.flac", midi: 60, layer: 1, rr: 1, frames, channels: 2, peakDb: -12, rmsDb: -17, sha256: createHash("sha256").update(bytes).digest("hex") };
const entry = { title: "Synthetic stereo", source: "test", license: "CC0-1.0", kind: "struck", range: [60, 60], layers: 1, normalized: true, damped: false, zones: [zone] };
const manifest = { pack: "anidoodle-sounds", version: 1, sampleRate: 48000, instruments: { piano: entry } };
manifest.rooms = { test: { title: "Synthetic IR", source: "test", license: "CC0-1.0", file: "large.flac", channels: 2, frames, rt60: 0.5, sha256: zone.sha256 } };
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
const js = (await build({ entryPoints: [join(import.meta.dirname, "../src/canvas-core/music/index.ts")], bundle: true, write: false, platform: "neutral", format: "esm" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
loadBanks(M, root, ["piano"]);
const bank = M.bankFor("piano"); assert(bank); assert.equal(bank.zones[0].channels.length, 2);
for (const c of bank.zones[0].channels) { assert.equal(c.length, frames); assert(c.every(Number.isFinite)); }
console.log(`PASS large FLAC: ${bytes.length} bytes, ${frames} stereo frames loaded without EPIPE`);
assert.equal(M.roomFor("test").L.length, frames); assert.equal(M.roomFor("test").R.length, frames); assert.equal(M.roomFor("test").sha256, zone.sha256);
M.clearBanks(); M.clearRooms(); loadBanks(M, root, []); assert(M.roomFor("test")); assert.equal(M.bankFor("piano"), undefined);
console.log("PASS rooms load as stereo float even when no sampled instrument is requested");
M.clearRooms(); const originalRoom = { ...manifest.rooms.test };
for (const [field, value, re] of [["sha256", "0".repeat(64), /sha256 mismatch/], ["frames", frames - 1, /frame count mismatch/], ["channels", 1, /expected 48 kHz/], ["file", file, /invalid FLAC path/]]) {
  manifest.rooms.test = { ...originalRoom, [field]: value }; writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
  assert.throws(() => loadBanks(M, root, []), re); assert.equal(M.roomFor("test"), undefined);
}
console.log("PASS corrupt room hash, frame count, channels and absolute path rejected before registration");
manifest.rooms = {};
M.clearBanks(); zone.sha256 = "0".repeat(64); writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
assert.throws(() => loadBanks(M, root, ["piano"]), /sha256 mismatch/); assert.equal(M.bankFor("piano"), undefined);
console.log("PASS corrupt large FLAC hash: rejected before registration");
let failures = 0;
const check = (label, fn) => { if (process.env.ANIDOODLE_TEST_CASE && !label.includes(process.env.ANIDOODLE_TEST_CASE)) return; try { fn(); console.log(`PASS ${label}`); } catch (e) { failures++; console.error(`FAIL ${label}: ${e.message}`); } };
zone.sha256 = originalRoom.sha256; manifest.rooms = {}; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
check('inherited constructor never becomes a sample-bank lookup', () => {
  M.clearBanks(); loadBanks(M, root, ['constructor']); assert.equal(M.bankFor('constructor'), undefined);
});
check('symlink outside the pack is rejected before decode', () => {
  const outside = join(root, '..', 'outside-loader.flac'); writeFileSync(outside, bytes);
  const linked = join(root, 'escaped.flac'); symlinkSync(outside, linked);
  zone.file = 'escaped.flac'; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  try { assert.throws(() => loadBanks(M, root, ['piano']), /zone escapes pack/); } finally { zone.file = 'large.flac'; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest)); }
});
check('forced FLAC demuxers decode the exact hashed bytes even after the path changes', () => {
  const wrappers = join(root, 'decoder-wrappers'); mkdirSync(wrappers, { recursive: true });
  const oldPath = process.env.PATH;
  for (const command of ['ffprobe', 'ffmpeg']) {
    const real = execFileSync('which', [command], { encoding: 'utf8' }).trim();
    const shim = `#!/usr/bin/env node\nimport {readFileSync,writeFileSync} from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nconst args=process.argv.slice(2), src=args[args.indexOf('-i')+1];\nif(args[args.indexOf('-f')+1]!=='flac'||args.includes('pipe:0')||src.startsWith(${JSON.stringify(root)}))throw Error('decoder must force FLAC on a private copy, never a pipe or the pack path');\nif(createHash('sha256').update(readFileSync(src)).digest('hex')!==${JSON.stringify(zone.sha256)})throw Error('decoder did not receive hashed bytes');\n${command === 'ffprobe' ? `writeFileSync(${JSON.stringify(file)},'#EXTM3U\\nhttps://invalid.example/external.flac\\n');` : ''}\nexecFileSync(${JSON.stringify(real)},args,{stdio:['ignore','inherit','inherit']});\n`;
    const path = join(wrappers, command); writeFileSync(path, shim); chmodSync(path, 0o755);
  }
  try { process.env.PATH = wrappers + ':' + oldPath; M.clearBanks(); loadBanks(M, root, ['piano']); assert.equal(M.bankFor('piano').zones[0].channels[0].length, frames); }
  finally { process.env.PATH = oldPath; writeFileSync(file, bytes); }
});
check('a wedged decoder is killed and retried', () => {
  const wrappers = join(root, 'wedge-wrappers'), marker = join(root, 'wedged-once'); mkdirSync(wrappers, { recursive: true });
  const oldPath = process.env.PATH, real = execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim();
  writeFileSync(join(wrappers, 'ffmpeg'), `#!/usr/bin/env node\nimport {writeFileSync,existsSync} from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nif(!existsSync(${JSON.stringify(marker)})){writeFileSync(${JSON.stringify(marker)},'x');setInterval(()=>{},1000);}\nelse execFileSync(${JSON.stringify(real)},process.argv.slice(2),{stdio:['ignore','inherit','inherit']});\n`); chmodSync(join(wrappers, 'ffmpeg'), 0o755);
  try { process.env.PATH = wrappers + ':' + oldPath; process.env.ANIDOODLE_DECODE_TIMEOUT_MS = '3000'; M.clearBanks(); loadBanks(M, root, ['piano']); assert.equal(M.bankFor('piano').zones[0].channels[0].length, frames); assert.ok(existsSync(marker)); }
  finally { process.env.PATH = oldPath; delete process.env.ANIDOODLE_DECODE_TIMEOUT_MS; }
});
check('room directFrames is loaded and participates in reload identity', () => {
  manifest.rooms = { test: { ...originalRoom, directFrames: 120 } }; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  M.clearRooms(); loadBanks(M, root, []); assert.equal(M.roomFor('test').directFrames, 120);
  manifest.rooms.test.directFrames = 121; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  loadBanks(M, root, []); assert.equal(M.roomFor('test').directFrames, 121);
});
const isolatedHome = join(root, 'default-home'), install = join(isolatedHome, '.anidoodle', 'sounds'); mkdirSync(install, { recursive: true });
writeFileSync(join(install, 'large.flac'), bytes);
writeFileSync(join(install, 'manifest.json'), JSON.stringify({ ...manifest, rooms: {}, instruments: { piano: { ...entry, range: [21, 108] } } }));
const preload = join(root, 'home.cjs');
writeFileSync(preload, "require('node:os').homedir=()=>process.env.ANIDOODLE_TEST_HOME; require('node:module').syncBuiltinESMExports();");
const env = { ...process.env, ANIDOODLE_TEST_HOME: isolatedHome }; delete env.ANIDOODLE_SOUNDS;
check('music CLI discovers a default install with env and --sounds unset', () => {
  const result = spawnSync(process.execPath, ['--require', preload, 'tools/music.mjs', 'check', 'nocturne', '--seconds', '1'], { env: { ...env, ANIDOODLE_THREADS: '1' }, encoding: 'utf8', maxBuffer: 1<<24 });
  assert.notEqual(result.status, null, result.stderr); assert.match(result.stdout, /calibration piano:/);
});
check('film audio discovers and plays a default install with env unset', () => {
  const script = join(root, 'default-film.mjs');
  const audioUrl = new URL('./audio.mjs', import.meta.url).href;
  writeFileSync(script, `import assert from 'node:assert/strict'; import {prepareFilmSounds,filmFloat32} from ${JSON.stringify(audioUrl)}; const M=await import(${JSON.stringify('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}); const film={audio:M.filmAudio(M.nocturne(),1)}; assert.equal(prepareFilmSounds(film,M),true); assert.equal(filmFloat32(film).frames,48000); console.log('DEFAULT FILM RECORDINGS PASS');`);
  const out = execFileSync(process.execPath, ['--require', preload, script], { env, encoding: 'utf8', maxBuffer: 1<<24 });
  assert.match(out, /DEFAULT FILM RECORDINGS PASS/);
});
check('Windows decoder selection uses absolute PATH binaries, not implicit current-directory lookup', () => {
  const windowsPath = join(root, 'windows-path'); mkdirSync(windowsPath, { recursive: true });
  const marker = join(root, 'windows-decoder-marker');
  for (const command of ['ffprobe', 'ffmpeg']) {
    const real = execFileSync('which', [command], { encoding: 'utf8' }).trim();
    const shim = join(windowsPath, command + '.mjs');
    writeFileSync(shim, `import {readFileSync,writeFileSync} from 'node:fs'; import {execFileSync} from 'node:child_process'; writeFileSync(${JSON.stringify(marker)},'PATH binary'); execFileSync(${JSON.stringify(real)},process.argv.slice(2),{stdio:['ignore','inherit','inherit']});`);
    const quote = s => "'" + s.replaceAll("'", "'\"'\"'") + "'";
    writeFileSync(join(windowsPath, command + '.exe'), `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(shim)} \"$@\"\n`);
    chmodSync(join(windowsPath, command + '.exe'), 0o755);
  }
  const script = join(root, 'windows-loader.mjs');
  writeFileSync(script, `import {loadBanks} from ${JSON.stringify(new URL('./sounds.mjs', import.meta.url).href)}; const M=await import(${JSON.stringify('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}); Object.defineProperty(process,'platform',{value:'win32'}); loadBanks(M,${JSON.stringify(root)},['piano']);`);
  execFileSync(process.execPath, [script], { env: { ...process.env, PATH: windowsPath, PATHEXT: '.exe' }, maxBuffer: 1<<24 });
  assert.equal(readFileSync(marker, 'utf8'), 'PATH binary');
});
if (failures) process.exitCode = 1;
else console.log('SOUNDS LOADER REVIEW PASS');
