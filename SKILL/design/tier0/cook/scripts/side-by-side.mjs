#!/usr/bin/env node
// Builds one comparison image: each reference/render pair becomes a row
// (reference left, render right), rows stacked top to bottom.
// Every cell is fitted into the same box (letterboxed, never stretched),
// so references and renders with different sizes still line up.
//
// Usage: node side-by-side.mjs --out compare.jpg ref1.png render1.png [ref2.png render2.png ...]
// Options: --height <px> per cell (default 540), --aspect <w:h> per cell (default 16:9)
// Needs ffmpeg on PATH.

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const USAGE = 'usage: node side-by-side.mjs --out compare.jpg ref1.png render1.png [ref2.png render2.png ...] [--height 540] [--aspect 16:9]';

function fail(msg) {
  console.error(`side-by-side: ${msg}`);
  console.error(USAGE);
  process.exit(1);
}

const args = process.argv.slice(2);
let out = null;
let height = 540;
let aspect = '16:9';
const inputs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') out = args[++i];
  else if (a === '--height') height = Number(args[++i]);
  else if (a === '--aspect') aspect = args[++i];
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else inputs.push(a);
}

if (!out) fail('missing --out');
if (!Number.isInteger(height) || height < 64) fail('--height must be an integer of at least 64');
const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect || '');
if (!m) fail('--aspect must look like 16:9');
if (inputs.length < 2 || inputs.length % 2 !== 0) fail('give images in pairs: reference first, then render');
for (const f of inputs) {
  if (!existsSync(f) || !statSync(f).isFile()) fail(`not a file: ${f}`);
}

const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) fail('ffmpeg not found on PATH');

const h = height - (height % 2);
const w = Math.round((h * Number(m[1])) / Number(m[2]) / 2) * 2;
const rows = inputs.length / 2;

const graph = [];
for (let i = 0; i < inputs.length; i++) {
  graph.push(
    `[${i}:v]scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[c${i}]`
  );
}
for (let r = 0; r < rows; r++) {
  graph.push(`[c${2 * r}][c${2 * r + 1}]hstack=inputs=2[row${r}]`);
}
if (rows === 1) {
  graph.push('[row0]null[outv]');
} else {
  const all = Array.from({ length: rows }, (_, r) => `[row${r}]`).join('');
  graph.push(`${all}vstack=inputs=${rows}[outv]`);
}

const ffArgs = ['-hide_banner', '-loglevel', 'error', '-y'];
for (const f of inputs) ffArgs.push('-i', f);
ffArgs.push('-filter_complex', graph.join(';'), '-map', '[outv]', '-frames:v', '1', '-q:v', '2', out);

const run = spawnSync('ffmpeg', ffArgs, { encoding: 'utf8' });
if (run.status !== 0) fail(`ffmpeg failed:\n${run.stderr}`);
console.log(`wrote ${out}: ${rows} row${rows > 1 ? 's' : ''} of ${w}x${h} cells, reference left, render right`);
