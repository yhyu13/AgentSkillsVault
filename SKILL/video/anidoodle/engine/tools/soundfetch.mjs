#!/usr/bin/env node
// Sound pack fetcher: puts the anidoodle-sounds-v1 release on a user's machine. The pack is too
// big for the plugin, so it lives as a separate download of one tar per instrument + rooms +
// an index JSON (built by `tools/soundpack.mjs dist`).
//
//   node tools/soundfetch.mjs list                      # what exists and what is installed, sizes
//   node tools/soundfetch.mjs get piano harp rooms      # download, verify, unpack (or: get all)
//   node tools/soundfetch.mjs where                     # print the sounds directory
//   node tools/soundfetch.mjs verify                    # re-hash everything installed
//   node tools/soundfetch.mjs remove <id>               # uninstall an instrument (or rooms)
//
// Source: ANIDOODLE_SOUNDS_URL or the default release URL below; a file:// URL or a bare local
// directory works too (that is how the unit test runs). The index is fetched first and refused
// unless its sha256 matches the release hash pinned in INDEX_SHA256
// (ANIDOODLE_SOUNDS_INDEX_SHA256 overrides, for testing a different dist), so a tampered index
// or archive never unpacks.
// Install dir: ANIDOODLE_SOUNDS if set, else ~/.anidoodle/sounds. It holds one merged
// manifest.json in the exact pack format of CONTRACT.md, the FLAC files and LICENSES.md.
//
// Ownership (security): this tool never deletes, renames or overwrites anything in a directory
// it does not own. A root that exists, holds entries other than this tool's own .anidoodle-*
// temp names, and has no manifest.json with pack "anidoodle-sounds" is refused by EVERY
// command - so pointing ANIDOODLE_SOUNDS at ~/Music can never eat it. Temp names carry the
// .anidoodle- prefix, so sweep can only ever match files this tool created.
//
// Safety: an archive downloads to a temp file inside the install dir, the stream is cut past
// the declared bytes, and size + sha256 are checked BEFORE unpacking. Every tar entry must be
// a regular file named <id>/<file>.flac (or manifest.json / LICENSES.md at the archive root):
// absolute names, "..", backslashes, links and declared sizes past the archive's real length
// are all refused. Unpack stages beside the instrument dir and swaps with rename; the merged
// manifest is rewritten after each instrument, atomically, so a failed or interrupted run
// leaves the previous state intact. Mutating commands hold an .anidoodle-lock mkdir lock, so
// two parallel gets cannot drop an instrument out of the manifest. Only `get` touches the
// network. Node built-ins only; the tar reader is below.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, statSync, copyFileSync, readdirSync, createWriteStream, openSync, closeSync, readSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const RELEASE = "anidoodle-sounds-v1";
const INDEX_FILE = `${RELEASE}.json`;
const DEFAULT_URL = "https://github.com/alexgreensh/anidoodle/releases/download/sounds-v1/";
// sha256 of anidoodle-sounds-v1.json for the release, produced by `soundpack.mjs dist` of
// pack-v1; a tampered index is refused before anything downloads.
const INDEX_SHA256 = "558d7fcb9138afa090ccf16b23355edbf8b98f63c26151646bf1721a6969840a";
// Download size of each v1 instrument archive, in MB: printed when a piece could play recordings
// that are not installed, so the user is asked with the real cost. Travels with the pin above.
export const PACK_MB = { piano: 233, "piano.upright": 56, harp: 31, vibes: 25, "bell.tubular": 20, timpani: 16, glockenspiel: 7, marimba: 3 };
// "No thanks" is remembered here, outside any pack directory, so the question is asked once.
const DECLINED = () => join(homedir(), ".anidoodle", "sounds-declined");
export const soundsDeclined = () => existsSync(DECLINED());
const MAX_INDEX_BYTES = 8 * 1024 * 1024; // the real index is ~100 KB; this is headroom, not fit
const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024 * 1024; // 8 GiB: a sane bound, far over the ~234 MB real

// Every temp name this tool ever creates carries the .anidoodle- prefix, so sweep and the
// ownership check below can recognise exactly what is ours and nothing else.
const tmpName = (kind, f) => `.anidoodle-${kind}-${f}-${process.pid}`;
const LOCK_DIR = ".anidoodle-lock";
const OWN_TEMP = /^\.anidoodle-(lock|dl|unpack|old|tmp)(-|$)/; // ours even when stale
const SWEEP_RE = /^\.anidoodle-(dl|unpack|old|tmp)-/; // stale temps only - NEVER the live lock

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const sha256File = (f) => sha256(readFileSync(f));

// ---------------------------------------------------------------- paths
export const installRoot = () =>
  process.env.ANIDOODLE_SOUNDS ? resolve(process.env.ANIDOODLE_SOUNDS) : join(homedir(), ".anidoodle", "sounds");
// The resolved install directory, or null when nothing is installed (for tools/sounds.mjs
// callers deciding whether a pack exists at all).
export const soundsDir = () => {
  const d = installRoot();
  try {
    return JSON.parse(readFileSync(join(d, "manifest.json"), "utf8")).pack === "anidoodle-sounds" ? d : null;
  } catch {
    return null;
  }
};
const source = () => process.env.ANIDOODLE_SOUNDS_URL || DEFAULT_URL;
const isLocalSrc = (s) => !/^https?:\/\//i.test(s);
const srcFile = (s, name) => (s.startsWith("file://") ? join(fileURLToPath(s), name) : join(s, name));
const srcUrl = (s, name) => `${s.replace(/\/*$/, "")}/${name}`;

// Ownership gate, run by every command before anything else: a directory we do not own is
// never deleted from, renamed in or written to. "Ours" means: does not exist, contains only
// this tool's own temp names (stale or live), or has a manifest.json with
// pack "anidoodle-sounds". Anything else - a stray file, a foreign manifest, LICENSES.md alone
// - makes the root off-limits.
const claimRoot = (root) => {
  if (!existsSync(root)) return;
  const foreign = readdirSync(root).filter((e) => !OWN_TEMP.test(e));
  if (!foreign.length) return;
  let pack = null;
  try {
    pack = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).pack;
  } catch { /* unreadable or foreign JSON: not ours */ }
  if (pack === "anidoodle-sounds") return;
  throw new Error(`refusing to touch ${root}: not empty and no manifest.json with pack "anidoodle-sounds". Point ANIDOODLE_SOUNDS at a dedicated directory.`);
};

// Stale temp cleanup. Only ever runs while holding the lock (a live process's temps are never
// swept from under it) and only ever matches the exact .anidoodle-* names this tool creates.
const sweep = (root) => {
  for (const e of readdirSync(root))
    if (SWEEP_RE.test(e)) rmSync(join(root, e), { recursive: true, force: true });
};
const atomicWrite = (file, data) => {
  const tmp = join(dirname(file), tmpName("tmp", basename(file)));
  writeFileSync(tmp, data);
  renameSync(tmp, file);
};
const readMerged = (root) => {
  const f = join(root, "manifest.json");
  if (!existsSync(f)) return null;
  try {
    const m = JSON.parse(readFileSync(f, "utf8"));
    return m?.pack === "anidoodle-sounds" ? m : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- the lock
// Mutating commands (get, remove) hold an exclusive mkdir lock: two parallel gets can no
// longer sweep each other's temps or lose a manifest merge. A dead holder's lock is stolen
// (its recorded pid is gone); a live one is waited out.
const acquireLock = async (root) => {
  const dir = join(root, LOCK_DIR);
  for (let i = 0; i < 200; i++) {
    try {
      mkdirSync(dir);
      writeFileSync(join(dir, "pid"), `${process.pid} ${Date.now()}`);
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    let pid = NaN;
    try {
      pid = Number(readFileSync(join(dir, "pid"), "utf8").split(" ")[0]);
    } catch { /* pid file not written yet - the creator had a microsecond to do it */ }
    if (pid > 0) {
      let alive = true;
      try {
        process.kill(pid, 0);
      } catch (e) {
        alive = e.code === "EPERM"; // exists but not ours
      }
      if (!alive) { rmSync(dir, { recursive: true, force: true }); continue; } // dead holder: steal
    } else if (i > 20) {
      rmSync(dir, { recursive: true, force: true }); // no pid for ~2 s: stale, steal
      continue;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`${root} is still locked by another soundfetch after 20 s`);
};
const releaseLock = (root) => rmSync(join(root, LOCK_DIR), { recursive: true, force: true });

// ---------------------------------------------------------------- the index
// Every field that ends up in a path, a size or a manifest merge is shape-checked here - the
// pin makes tampering unprofitable, but an overridden pin must not become a path escape.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/; // engine ids (piano.upright) and tar suffixes
const FORBIDDEN_ID = new Set(["__proto__", "constructor", "prototype", "manifest.json", "LICENSES.md", "rooms", "all"]);
const okId = (s) => typeof s === "string" && ID_RE.test(s) && !s.includes("..") && !FORBIDDEN_ID.has(s);
const SHA_RE = /^[0-9a-f]{64}$/;
const ZONE_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9#_+.-]+\.flac$/; // <id>/<name>.flac, two segments
const loadIndex = async () => {
  const src = source(), pin = process.env.ANIDOODLE_SOUNDS_INDEX_SHA256 || INDEX_SHA256;
  if (!pin) throw new Error("no index sha256 is pinned for this release (ANIDOODLE_SOUNDS_INDEX_SHA256 overrides for a test dist)");
  let buf;
  if (isLocalSrc(src)) {
    const f = srcFile(src, INDEX_FILE);
    if (!existsSync(f)) throw new Error(`${INDEX_FILE} not found in ${src}`);
    if (statSync(f).size > MAX_INDEX_BYTES) throw new Error(`${INDEX_FILE} exceeds the ${MAX_INDEX_BYTES}-byte index cap`);
    buf = readFileSync(f);
  } else {
    const res = await fetch(srcUrl(src, INDEX_FILE));
    if (!res.ok || !res.body) throw new Error(`index fetch failed: HTTP ${res.status}`);
    const chunks = [];
    let n = 0;
    for await (const c of Readable.fromWeb(res.body)) {
      n += c.length;
      if (n > MAX_INDEX_BYTES) throw new Error(`${INDEX_FILE} exceeds the ${MAX_INDEX_BYTES}-byte index cap`);
      chunks.push(c);
    }
    buf = Buffer.concat(chunks);
  }
  const sha = sha256(buf);
  if (sha !== pin) throw new Error(`refusing a tampered index: sha256 ${sha}, pinned ${pin}`);
  const index = JSON.parse(buf.toString("utf8"));
  const bad = (w) => { throw new Error(`${INDEX_FILE}: ${w}`); };
  if (index.release !== RELEASE || index.pack !== "anidoodle-sounds" || index.version !== 1 || !Array.isArray(index.archives))
    bad("not an anidoodle-sounds-v1 index");
  if (typeof index.licenses !== "string") bad("missing licenses text");
  for (const a of index.archives) {
    if (!a || typeof a !== "object") bad("malformed archive entry");
    if (!Array.isArray(a.instruments) || !Array.isArray(a.rooms)) bad(`${a.file}: malformed id lists`);
    if (a.instruments.length > 1) bad(`${a.file}: one archive holds one instrument`);
    for (const id of [...a.instruments, ...a.rooms]) if (!okId(id)) bad(`unsafe id ${JSON.stringify(id)}`);
    const top = a.instruments[0] ?? (a.rooms.length ? "rooms" : null);
    if (!top || typeof a.file !== "string" || a.file !== `${RELEASE}-${top}.tar`) bad(`unsafe archive name ${JSON.stringify(a.file)}`);
    if (!Number.isSafeInteger(a.bytes) || a.bytes < 1 || a.bytes > MAX_ARCHIVE_BYTES) bad(`${a.file}: implausible bytes ${a.bytes}`);
    if (typeof a.sha256 !== "string" || !SHA_RE.test(a.sha256)) bad(`${a.file}: malformed sha256`);
    const frag = a.manifest;
    if (!frag || typeof frag !== "object") bad(`${a.file}: no manifest fragment`);
    const sameKeys = (o, ids) => Object.keys(o ?? {}).sort().join("") === [...ids].sort().join("");
    if (!sameKeys(frag.instruments, a.instruments) || !sameKeys(frag.rooms, a.rooms)) bad(`${a.file}: fragment does not match its id list`);
    for (const id of a.instruments) {
      const inst = frag.instruments[id];
      if (!Array.isArray(inst.zones)) bad(`${a.file}: ${id} has no zones`);
      for (const z of inst.zones)
        if (typeof z.file !== "string" || !ZONE_FILE_RE.test(z.file) || z.file.split("/")[0] !== id || typeof z.sha256 !== "string" || !SHA_RE.test(z.sha256))
          bad(`${a.file}: unsafe zone ${JSON.stringify(z.file)}`);
    }
    for (const rid of a.rooms) {
      const r = frag.rooms[rid];
      if (typeof r.file !== "string" || !ZONE_FILE_RE.test(r.file) || r.file.split("/")[0] !== "rooms" || typeof r.sha256 !== "string" || !SHA_RE.test(r.sha256))
        bad(`${a.file}: unsafe room file ${JSON.stringify(r.file)}`);
    }
  }
  return index;
};

// ---------------------------------------------------------------- download
const download = async (src, a, tmp) => {
  if (isLocalSrc(src)) {
    const f = srcFile(src, a.file);
    if (!existsSync(f)) throw new Error(`${a.file}: not in ${src}`);
    if (statSync(f).size !== a.bytes) throw new Error(`${a.file}: ${statSync(f).size} bytes, index says ${a.bytes} - refusing`);
    copyFileSync(f, tmp);
    return;
  }
  const res = await fetch(srcUrl(src, a.file));
  if (!res.ok || !res.body) throw new Error(`${a.file}: download failed, HTTP ${res.status}`);
  let seen = 0;
  // the declared size bounds the stream: a server that keeps sending is cut, not believed
  const cap = new Transform({
    transform(c, _e, cb) {
      seen += c.length;
      cb(seen > a.bytes ? new Error(`${a.file}: more than the declared ${a.bytes} bytes`) : null, c);
    },
  });
  await pipeline(Readable.fromWeb(res.body), cap, createWriteStream(tmp));
};

// ---------------------------------------------------------------- tar reader
// Minimal ustar reader: our dist writes regular files only, mtime 0, no links - anything else
// is refused. Entry names must be <top>/<file>.flac two segments deep, or manifest.json /
// LICENSES.md at the root: no absolute paths, no "..", no backslashes, no empty segments. A
// declared size is trusted only inside the archive's real length, never enough to allocate on.
const octal = (h, at, len) => {
  const s = h.subarray(at, at + len).toString("latin1").replace(/\0[\s\S]*$/, "").trim();
  if (!/^[0-7]+$/.test(s)) throw new Error("tar: malformed numeric field");
  return parseInt(s, 8);
};
const cstr = (h, at, len) => h.subarray(at, at + len).toString("latin1").replace(/\0[\s\S]*$/, "");
const safeEntry = (name, top) => {
  const seg = name.split("/");
  if (!name || name.length > 255 || name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.includes("\\")) return false;
  if (seg.some((s) => s === "" || s === "." || s === "..")) return false;
  if (seg.length === 1) return name === "manifest.json" || name === "LICENSES.md";
  return seg.length === 2 && seg[0] === top && seg[1].length > 0 && seg[1].endsWith(".flac");
};
const untar = (file, stage, top) => {
  const fileSize = statSync(file).size;
  const fd = openSync(file, "r");
  try {
    const hdr = Buffer.alloc(512);
    let pos = 0;
    for (;;) {
      let got = 0;
      while (got < 512) {
        const n = readSync(fd, hdr, got, 512 - got, pos + got);
        if (n === 0) break;
        got += n;
      }
      if (got === 0) break;
      if (got < 512) throw new Error(`${file}: truncated tar header at ${pos}`);
      if (hdr.every((b) => b === 0)) break; // end-of-archive zero block
      if (cstr(hdr, 257, 6) !== "ustar") throw new Error(`${file}: not a ustar archive at ${pos}`);
      const name = (() => { const p = cstr(hdr, 345, 155), n = cstr(hdr, 0, 100); return p ? `${p}/${n}` : n; })();
      const size = octal(hdr, 124, 12);
      const type = hdr[156];
      if (type !== 0x30 && type !== 0) throw new Error(`${file}: entry ${name} is a link or non-file (type ${String.fromCharCode(type || 0x30)})`);
      if (!safeEntry(name, top)) throw new Error(`${file}: refusing unsafe entry name ${JSON.stringify(name)}`);
      if (pos + 512 + size > fileSize) throw new Error(`${file}: entry ${name} declares ${size} bytes past the archive's real length`);
      const data = Buffer.alloc(size);
      let dgot = 0;
      while (dgot < size) {
        const n = readSync(fd, data, dgot, size - dgot, pos + 512 + dgot);
        if (n === 0) throw new Error(`${file}: truncated entry ${name}`);
        dgot += n;
      }
      const out = join(stage, ...name.split("/"));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, data);
      pos += 512 + size + ((512 - (size % 512)) % 512);
    }
  } finally {
    closeSync(fd);
  }
};

// ---------------------------------------------------------------- install
// The staged tree must be exactly the fragment's declared files, each hashing to the manifest's
// sha256; the archive's own manifest.json must be the same fragment the index carries, and its
// LICENSES.md the index's text. A mismatch means dist and index disagree - refuse.
const checkStage = (stage, top, frag, licenses) => {
  for (const e of readdirSync(stage)) if (e !== top && e !== "manifest.json" && e !== "LICENSES.md") throw new Error(`unexpected archive entry ${e}`);
  const sm = join(stage, "manifest.json"), sl = join(stage, "LICENSES.md");
  if (!existsSync(sm) || readFileSync(sm, "utf8") !== JSON.stringify(frag, null, 2) + "\n") throw new Error("archive manifest.json does not match the index fragment");
  if (!existsSync(sl) || readFileSync(sl, "utf8") !== licenses) throw new Error("archive LICENSES.md does not match the index");
  const want = new Map();
  for (const inst of Object.values(frag.instruments ?? {})) for (const z of inst.zones) want.set(z.file, z.sha256);
  for (const r of Object.values(frag.rooms ?? {})) want.set(r.file, r.sha256);
  const topDir = join(stage, top);
  const staged = existsSync(topDir) ? readdirSync(topDir).map((f) => `${top}/${f}`) : [];
  for (const f of staged) if (!want.has(f)) throw new Error(`${f}: not declared in the manifest fragment`);
  for (const [f, sha] of want) {
    const p = join(stage, ...f.split("/"));
    if (!existsSync(p)) throw new Error(`${f}: missing from the archive`);
    if (sha256File(p) !== sha) throw new Error(`${f}: sha256 mismatch inside the archive`);
  }
};
// Stage sits beside the destination; swap by rename. A crash mid-swap can strand the old dir as
// .anidoodle-old-* (swept next run) but never leaves a half-written instrument under its name.
const swap = (root, stage, top) => {
  const dest = join(root, top), aside = join(root, tmpName("old", top));
  if (existsSync(dest)) renameSync(dest, aside);
  try {
    renameSync(join(stage, top), dest);
  } catch (e) {
    if (existsSync(aside) && !existsSync(dest)) renameSync(aside, dest);
    throw e;
  }
  if (existsSync(aside)) rmSync(aside, { recursive: true, force: true });
};
const mergeManifest = (root, frag) => {
  const m = readMerged(root) ?? { pack: "anidoodle-sounds", version: 1, sampleRate: 48000, instruments: {}, rooms: {} };
  // keys are validated against the id denylist in loadIndex before this ever runs
  for (const [k, v] of Object.entries(frag.instruments ?? {})) m.instruments[k] = v;
  for (const [k, v] of Object.entries(frag.rooms ?? {})) m.rooms[k] = v;
  atomicWrite(join(root, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
};
const archiveInstalled = (m, a) =>
  !!m && a.instruments.every((i) => Object.hasOwn(m.instruments ?? {}, i)) && (!a.rooms.length || Object.keys(m.rooms ?? {}).length > 0);

const installArchive = async (a, root, index) => {
  const src = source();
  const tmp = join(root, tmpName("dl", a.file));
  const stage = join(root, tmpName("unpack", a.file));
  const top = a.instruments[0] ?? "rooms";
  try {
    process.stdout.write(`${a.file}: downloading ${(a.bytes / 1e6).toFixed(1)} MB... `);
    await download(src, a, tmp);
    const sz = statSync(tmp).size;
    if (sz !== a.bytes) throw new Error(`\n${a.file}: ${sz} bytes, index says ${a.bytes} - refusing`);
    if (sha256File(tmp) !== a.sha256) throw new Error(`\n${a.file}: sha256 mismatch - refusing a tampered archive`);
    mkdirSync(stage);
    untar(tmp, stage, top);
    checkStage(stage, top, a.manifest, index.licenses);
    swap(root, stage, top);
    mergeManifest(root, a.manifest);
    console.log("installed");
    rmSync(DECLINED(), { force: true }); // they said yes after all
  } finally {
    rmSync(tmp, { force: true });
    rmSync(stage, { recursive: true, force: true });
  }
};

// ---------------------------------------------------------------- commands
const cmdGet = async (ids) => {
  const root = installRoot();
  claimRoot(root); // before mkdir, before the lock, before a single byte moves
  mkdirSync(root, { recursive: true });
  await acquireLock(root);
  try {
    sweep(root);
    const index = await loadIndex();
    const byId = new Map();
    for (const a of index.archives) {
      for (const id of a.instruments) byId.set(id, a);
      if (a.rooms.length) byId.set("rooms", a);
    }
    const wanted = ids.length === 1 && ids[0] === "all" ? [...byId.keys()] : ids;
    const unknown = wanted.filter((w) => !byId.has(w));
    if (unknown.length) throw new Error(`unknown sound id ${unknown.join(", ")} (the index has: ${[...byId.keys()].join(", ")})`);
    // claim the directory in its own format first: even a first get that fails leaves a valid,
    // owned install (and its licence) instead of ambiguous debris
    if (!readMerged(root)) mergeManifest(root, {});
    atomicWrite(join(root, "LICENSES.md"), index.licenses);
    const m = readMerged(root);
    for (const a of new Set(wanted.map((w) => byId.get(w)))) {
      if (archiveInstalled(m, a)) { console.log(`${a.file}: already installed (remove first to reinstall)`); continue; }
      await installArchive(a, root, index);
    }
  } finally {
    releaseLock(root);
  }
};

const sizeOf = (root, files) => files.reduce((s, rel) => { try { return s + statSync(join(root, ...rel.split("/"))).size; } catch { return s; } }, 0);
const printInstalled = (m, root) => {
  console.log(`${"id".padEnd(20)} ${"zones".padStart(5)} ${"MB".padStart(8)}`);
  for (const [id, inst] of Object.entries(m.instruments ?? {}))
    console.log(`${id.padEnd(20)} ${String(inst.zones.length).padStart(5)} ${(sizeOf(root, inst.zones.map((z) => z.file)) / 1e6).toFixed(1).padStart(8)}`);
  const rooms = Object.entries(m.rooms ?? {});
  if (rooms.length)
    console.log(`${"rooms".padEnd(20)} ${String(rooms.length).padStart(5)} ${(sizeOf(root, rooms.map(([, r]) => r.file)) / 1e6).toFixed(1).padStart(8)}`);
};

const cmdList = async () => {
  const root = installRoot();
  claimRoot(root);
  const m = readMerged(root);
  const src = source();
  console.log(`install: ${root}${m ? "" : " (nothing installed)"}`);
  if (soundsDeclined()) console.log("recordings: declined by the user. Do not ask again; `get` still installs them.");
  else if (!m) console.log(`recordings: not installed and not yet offered. ASK THE USER whether they want real recorded instruments: ${Object.entries(PACK_MB).map(([id, mb]) => `${id} ${mb} MB`).join(", ")}, rooms 0.4 MB. Yes: get <ids> rooms. No: decline.`);
  if (isLocalSrc(src)) {
    // a local or file:// source is read from disk - no network involved - so the index's
    // available set can be shown beside the installed state
    const index = await loadIndex();
    console.log(`source:  ${src}\n`);
    console.log(`${"archive".padEnd(44)} ${"MB".padStart(8)}  ${"holds".padEnd(22)} status`);
    for (const a of index.archives) {
      const holds = a.instruments.concat(a.rooms.length ? ["rooms"] : []).join(", ");
      console.log(`${a.file.padEnd(44)} ${(a.bytes / 1e6).toFixed(1).padStart(8)}  ${holds.padEnd(22)} ${archiveInstalled(m, a) ? "installed" : "available"}`);
    }
  } else {
    // never downloads without being asked: only get touches the network, so a remote source
    // reports the installed set from the merged manifest alone
    console.log(`source:  ${src} (remote index is fetched by get only)`);
    if (m) { console.log(); printInstalled(m, root); }
  }
};

const cmdVerify = () => {
  const root = installRoot();
  claimRoot(root);
  const m = readMerged(root);
  if (!m) { console.error("nothing installed"); process.exit(1); }
  const bad = [];
  let n = 0;
  const check = (rel, want) => {
    const f = join(root, ...rel.split("/"));
    if (!existsSync(f)) { bad.push(`${rel}: missing`); return; }
    n++;
    if (sha256File(f) !== want) bad.push(`${rel}: sha256 mismatch`);
  };
  for (const inst of Object.values(m.instruments ?? {})) for (const z of inst.zones) check(z.file, z.sha256);
  for (const r of Object.values(m.rooms ?? {})) check(r.file, r.sha256);
  if (!existsSync(join(root, "LICENSES.md"))) bad.push("LICENSES.md missing");
  if (bad.length) { for (const b of bad) console.error(`FAIL ${b}`); console.error(`verify: ${bad.length} failure${bad.length > 1 ? "s" : ""}`); process.exit(1); }
  console.log(`verify: ${n} installed files, all sha256 match`);
};

const cmdRemove = async (id) => {
  const root = installRoot();
  claimRoot(root);
  await acquireLock(root);
  try {
    sweep(root);
    // read the manifest inside the lock: a parallel get's merge must not be read over and lost
    const m = readMerged(root);
    if (!m) { console.error("nothing installed"); process.exit(1); }
    let top = null;
    if (id === "rooms" && Object.keys(m.rooms ?? {}).length) { m.rooms = {}; top = "rooms"; }
    else if (Object.hasOwn(m.instruments ?? {}, id)) { delete m.instruments[id]; top = id; }
    if (!top) { console.error(`${id}: not installed`); process.exit(1); }
    // manifest first: it must never claim files that are already gone; a leftover dir is just
    // unclaimed disk a later get overwrites
    atomicWrite(join(root, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
    rmSync(join(root, top), { recursive: true, force: true });
    console.log(`removed ${id}`);
  } finally {
    releaseLock(root);
  }
};

// ---------------------------------------------------------------- main
const isMain = () => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
};
if (isMain()) (async () => {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "list" && !args.length) await cmdList();
  else if (cmd === "get" && args.length) await cmdGet(args);
  else if (cmd === "where" && !args.length) { claimRoot(installRoot()); console.log(installRoot()); }
  else if (cmd === "verify" && !args.length) cmdVerify();
  else if (cmd === "remove" && args.length === 1) await cmdRemove(args[0]);
  else if (cmd === "decline" && !args.length) { mkdirSync(dirname(DECLINED()), { recursive: true }); writeFileSync(DECLINED(), new Date().toISOString() + "\n"); console.log("noted: films keep the code-built instruments and nobody is asked again. `get` installs recordings any time."); }
  else {
    console.error("usage: node tools/soundfetch.mjs list | get <id...|all> | where | verify | remove <id> | decline");
    process.exit(2);
  }
})().catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
