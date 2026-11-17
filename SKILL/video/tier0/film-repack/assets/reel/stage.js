// stage.js — deterministic renderer for a narrated film repack.
// Contract: import TIMELINE from ./timeline.js, expose window.render(t) and window.READY.
// No timers, no randomness, no audio state: the same t always draws the same frame.
import { DUR, META, SEGMENTS, STILLS } from './timeline.js';

const W = 1920, H = 1080;
const M = 96;
const C = {
  ink: '#0E1013',
  ink2: '#171A1F',
  paper: '#F4EFE6',
  mute: '#9A938A',
  accent: '#FF5A1F',
  line: 'rgba(244,239,230,0.14)',
};
const FONT_CN = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
const FONT_NUM = '"Georgia", "Times New Roman", serif';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.textBaseline = 'alphabetic';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => (b > a ? clamp((t - a) / (b - a)) : (t >= a ? 1 : 0));
const outCubic = x => 1 - Math.pow(1 - x, 3);
const outQuint = x => 1 - Math.pow(1 - x, 5);
const inOutCubic = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;

function spring(x, freq = 2.4, damp = 0.78) {
  if (x <= 0) return 0;
  const w = Math.PI * 2 * freq;
  const e = Math.exp(-damp * w * x);
  return 1 - e * Math.cos(w * Math.sqrt(1 - damp * damp) * x);
}

// Latin words and numbers stay whole; CJK breaks per character. Breaking "SpaceX"
// into "Spac / eX" is the tell of a naive wrapper.
function tokens(text) {
  const out = [];
  let buffer = '';
  for (const ch of text) {
    if (/[A-Za-z0-9@#$%&*+/=._'-]/.test(ch)) {
      buffer += ch;
    } else {
      if (buffer) { out.push(buffer); buffer = ''; }
      out.push(ch);
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

function wrap(text, maxWidth, font) {
  ctx.font = font;
  const lines = [];
  let line = '';
  for (const token of tokens(text)) {
    const next = line + token;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line.replace(/\s+$/, ''));
      line = /^[，。、；：）】」？！,.;:!?]/.test(token) ? '' : token;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(text, x, y, maxWidth, font, color, lineHeight, maxLines, alpha = 1) {
  if (alpha <= 0.001) return y;
  const lines = wrap(text, maxWidth, font);
  const shown = maxLines ? lines.slice(0, maxLines) : lines;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  shown.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
  ctx.restore();
  return y + shown.length * lineHeight;
}

function shotAt(t) {
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    if (t >= SEGMENTS[i].start && t < SEGMENTS[i].end) return [SEGMENTS[i], i];
  }
  return [SEGMENTS[SEGMENTS.length - 1], SEGMENTS.length - 1];
}

function drawBed(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.ink2);
  g.addColorStop(1, C.ink);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // slow horizontal light band: one full sweep per 26 s, continuous across cuts
  const sweep = ((t / 26) % 1) * (W + 900) - 450;
  const band = ctx.createLinearGradient(sweep - 260, 0, sweep + 260, 0);
  band.addColorStop(0, 'rgba(255,90,31,0)');
  band.addColorStop(0.5, 'rgba(255,90,31,0.05)');
  band.addColorStop(1, 'rgba(255,90,31,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(244,239,230,0.07)';
  for (let x = M; x < W - M; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 150);
    ctx.lineTo(x + 0.5, H - 330);
    ctx.stroke();
  }
}

function drawHeader(t, shot, index) {
  ctx.save();
  ctx.font = `600 20px ${FONT_CN}`;
  ctx.fillStyle = C.accent;
  ctx.letterSpacing = '3px';
  ctx.fillText('FILM REPACK', M, 74);
  ctx.letterSpacing = '0px';
  ctx.font = `400 20px ${FONT_CN}`;
  ctx.fillStyle = C.mute;
  const source = META.source || '';
  const dur = Math.floor(META.total / 60) + ':' + String(Math.round(META.total % 60)).padStart(2, '0');
  ctx.fillText(`${source ? source + ' · ' : ''}${dur} · ${String(index + 1).padStart(2, '0')}/${SEGMENTS.length}`, M + 190, 74);

  if (shot.timecode) {
    const label = `原片 ${shot.timecode}`;
    ctx.font = `400 19px ${FONT_CN}`;
    const w = ctx.measureText(label).width + 34;
    ctx.strokeStyle = 'rgba(244,239,230,0.22)';
    ctx.beginPath();
    ctx.roundRect(W - M - w, 52, w, 36, 18);
    ctx.stroke();
    ctx.fillStyle = C.paper;
    ctx.fillText(label, W - M - w + 17, 77);
  }
  ctx.restore();
}

function drawChapter(t, shot, index, local, dur) {
  const enter = spring(local, 2.2, 0.82);
  const fade = clamp(local / 0.34);
  ctx.save();
  ctx.globalAlpha = fade;

  // ghost numeral drifts back as the chapter settles
  const numAlpha = 0.10 * enter;
  ctx.font = `700 320px ${FONT_NUM}`;
  ctx.fillStyle = C.accent;
  ctx.globalAlpha = numAlpha;
  const drift = (1 - enter) * 40;
  ctx.fillText(String(index + 1).padStart(2, '0'), W - M - 560 + drift, 660);

  ctx.globalAlpha = fade;
  const titleFont = `700 66px ${FONT_CN}`;
  const y = 168 + (1 - outQuint(clamp(local / 0.55))) * 26;
  textBlock(shot.chapter || '', M, y, 1180, titleFont, C.paper, 82, 2, fade);

  const progress = clamp((t - shot.start) / Math.max(0.001, dur));
  const lineW = 132 * outCubic(clamp(local / 0.6));
  ctx.fillStyle = C.accent;
  ctx.fillRect(M, 300, lineW, 5);
  ctx.fillStyle = 'rgba(244,239,230,0.18)';
  ctx.fillRect(M + lineW + 14, 301.5, 700 * progress, 2);
  ctx.restore();
}

// One frame from the film per chapter, duotoned and slowly zoomed. Without it the
// cut is fifteen identical cards, which is the tell of a narrated slideshow.
const IMG = {};
let pending = 0;

function drawStill(shot, local) {
  const im = IMG[shot.id];
  if (!im || !im.complete || !im.naturalWidth) return false;
  const w = 520, h = 293, x = W - M - 96 - w, y = 336;
  const progress = clamp(local / Math.max(0.001, shot.end - shot.start));
  const zoom = 1.04 + 0.06 * progress;
  const dw = w * zoom, dh = h * zoom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(im, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(20,22,26,0.36)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,90,31,0.07)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(244,239,230,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = C.accent;
  ctx.fillRect(x, y, 3, 42);
  return true;
}

function drawBeats(t, shot, local, dur) {
  const beats = shot.beats || [];
  if (!beats.length) return;
  const gap = 0.30;
  const startBeat = 0.45;
  const rowH = beats.length >= 4 ? 150 : 168;
  const top = 356;
  ctx.save();
  beats.forEach((beat, i) => {
    const at = startBeat + i * gap;
    const k = spring(local - at, 2.6, 0.85);
    if (k <= 0.001) return;
    const y = top + i * rowH;
    ctx.globalAlpha = clamp((local - at) / 0.22);
    ctx.save();
    ctx.translate(0, (1 - k) * 26);
    ctx.font = `700 28px ${FONT_NUM}`;
    ctx.fillStyle = C.accent;
    ctx.fillText(String(i + 1).padStart(2, '0'), M, y + 26);

    ctx.fillStyle = 'rgba(244,239,230,0.16)';
    ctx.fillRect(M + 62, y + 4, 2, rowH - 46);

    textBlock(beat[0], M + 92, y + 30, 1000, `700 36px ${FONT_CN}`, C.paper, 46, 1, 1);
    textBlock(beat[1], M + 92, y + 76, 1010, `400 26px ${FONT_CN}`, C.mute, 38, 2, 1);
    ctx.restore();
  });
  ctx.restore();
}

function drawCaption(t, shot, local) {
  if (!shot.text) return;
  const appear = clamp((local - 0.1) / 0.45);
  ctx.save();
  ctx.globalAlpha = appear;
  const g = ctx.createLinearGradient(0, H - 330, 0, H);
  g.addColorStop(0, 'rgba(14,16,19,0)');
  g.addColorStop(0.5, 'rgba(14,16,19,0.90)');
  g.addColorStop(1, 'rgba(14,16,19,0.97)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 330, W, 330);

  // Caption auto-fits: three lines at 30 px, then 27, then 24. A sentence cut
  // mid-word is worse than slightly smaller type.
  const width = 1580;
  let size = 30, lead = 44, lines = wrap(shot.text, width, `400 ${size}px ${FONT_CN}`);
  if (lines.length > 3) { size = 27; lead = 40; lines = wrap(shot.text, width, `400 ${size}px ${FONT_CN}`); }
  if (lines.length > 3) { size = 24; lead = 36; lines = wrap(shot.text, width, `400 ${size}px ${FONT_CN}`); }
  const shown = lines.slice(0, 3);
  const blockH = shown.length * lead;
  ctx.fillStyle = C.accent;
  ctx.fillRect(M, H - 208 - blockH + lead - 10, 4, blockH - lead + 26);
  ctx.font = `400 ${size}px ${FONT_CN}`;
  ctx.fillStyle = C.paper;
  shown.forEach((line, i) => ctx.fillText(line, M + 26, H - 208 + i * lead));
  ctx.restore();
}

// The chapter rail is the "where am I" cue: 15 numbers, current one lit.
function drawChapterRail(t, index) {
  const x = W - 138;
  const top = 320;
  const step = Math.min(38, 540 / Math.max(SEGMENTS.length, 1));
  ctx.save();
  ctx.font = `400 17px ${FONT_NUM}`;
  SEGMENTS.forEach((s, i) => {
    const y = top + i * step;
    const current = i === index;
    ctx.fillStyle = current ? C.accent : 'rgba(244,239,230,0.20)';
    ctx.fillText(String(i + 1).padStart(2, '0'), x, y);
    if (current) {
      ctx.fillStyle = C.accent;
      ctx.fillRect(x + 30, y - 7, 34, 2);
    }
  });
  ctx.restore();
}

function drawProgress(t) {
  const y = H - 58;
  ctx.save();
  ctx.fillStyle = 'rgba(244,239,230,0.16)';
  ctx.fillRect(M, y, W - 2 * M, 4);
  ctx.fillStyle = C.accent;
  ctx.fillRect(M, y, (W - 2 * M) * clamp(t / DUR), 4);
  SEGMENTS.forEach(s => {
    const x = M + (W - 2 * M) * clamp(s.start / DUR);
    ctx.fillStyle = t >= s.start ? 'rgba(255,90,31,0.9)' : 'rgba(244,239,230,0.35)';
    ctx.fillRect(x, y - 4, 1.5, 11);
  });
  ctx.restore();
}

window.render = t => {
  const [shot, index] = shotAt(t);
  const local = Math.max(0, t - shot.start);
  const dur = Math.max(0.001, shot.end - shot.start);

  drawBed(t);
  // cut: a thin accent bar wipes across in the first 0.3 s of each chapter
  drawHeader(t, shot, index);
  drawChapter(t, shot, index, local, dur);
  drawStill(shot, local);
  drawBeats(t, shot, local, dur);
  drawChapterRail(t, index);
  drawCaption(t, shot, local);
  drawProgress(t);

  const wipe = seg(t, shot.start, shot.start + 0.3);
  if (wipe < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - wipe) * 0.9;
    ctx.fillStyle = C.accent;
    ctx.fillRect(0, 0, W * (1 - inOutCubic(wipe)), H);
    ctx.restore();
  }
};

window.DUR = DUR;
window.READY = false;   // the renderer treats undefined as ready; stills are still loading
Object.entries(STILLS || {}).forEach(([id, src]) => {
  const im = new Image();
  pending += 1;
  const done = () => { pending -= 1; if (pending === 0) window.READY = true; };
  im.onload = done;
  im.onerror = done;
  im.src = src;
  IMG[id] = im;
});
if (pending === 0) window.READY = true;
