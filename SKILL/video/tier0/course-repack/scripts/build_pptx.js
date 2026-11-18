/* eslint-disable */
/**
 * content.json -> PPTX (Karpathy Explain Better: 1 hero number / slide, big type, no small print)
 *
 * Geometry comes from design/layout.json (design px, 1920x1080).
 * Font sizes come from content.json `sizes` (written by scripts/fit_text.py,
 * measured against the real fonts), so the deck and the video render the same type.
 *
 * Units: 1in = 144px, 1px = 0.5pt.
 *
 * Usage: node build_pptx.js <content.json> <out.pptx>
 */
const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const ROOT = path.join(__dirname, "..");
const pick = (rel) => { const a = path.join(ROOT, rel); if (fs.existsSync(a)) return a;
  return path.join(ROOT, "templates", rel); };
const DESIGN = JSON.parse(fs.readFileSync(pick("design/design.json"), "utf8"));
const LAYOUT = JSON.parse(fs.readFileSync(pick("design/layout.json"), "utf8"));
const C = DESIGN.colors;
const F = DESIGN.fonts;

const content = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const outPath = process.argv[3];

const px2in = (v) => v / 144;
const px2pt = (v) => v * 0.5;
const CW_PX = 1318;
const M_PX = 108;

const pres = new PptxGenJS();
pres.layout = DESIGN.pptx.layout;
pres.author = content.meta.author || "MCode";
pres.title = content.meta.title;
pres.theme = { headFontFace: F.cjk, bodyFontFace: F.cjk, lang: "zh-CN" };

const DARK = new Set(["cover", "chapter", "hero", "takeaway"]);

/* ---------- motif: a network cluster, right of the content column ---------- */
function motif(slide, dark) {
  const nodes = [
    [10.15, 1.05, 0.30, "maize"], [11.55, 0.85, 0.18, "slate"], [12.45, 1.75, 0.24, "maize"],
    [10.60, 2.45, 0.22, "slate"], [12.10, 2.95, 0.32, "maize"], [10.90, 3.55, 0.18, "slate"],
    [12.55, 4.35, 0.20, "slate"], [10.25, 4.85, 0.28, "maize"], [11.40, 5.25, 0.22, "slate"],
    [12.60, 5.95, 0.26, "maize"],
  ];
  const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [3, 5], [4, 5], [5, 7], [4, 6], [6, 9], [7, 8], [8, 9]];
  const col = (k) => (k === "maize" ? C.maize : (dark ? C.slate : C.slateSoft));
  edges.forEach(([a, b]) => {
    const A = nodes[a], B = nodes[b];
    slide.addShape(pres.ShapeType.line, {
      x: A[0] + A[2] / 2, y: A[1] + A[2] / 2,
      w: (B[0] + B[2] / 2) - (A[0] + A[2] / 2),
      h: (B[1] + B[2] / 2) - (A[1] + A[2] / 2),
      line: { color: dark ? C.slate : C.slateSoft, width: 1 },
    });
  });
  nodes.forEach(([x, y, r, kind]) => {
    slide.addShape(pres.ShapeType.ellipse, {
      x, y, w: r, h: r,
      fill: { color: col(kind) },
      line: { color: col(kind), width: 0 },
    });
  });
}

/* ---------- text helpers ---------- */
const CJK_RE = /[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/;
const isCJK = (c) => CJK_RE.test(c);

function splitRuns(text, face, sizePx, bold) {
  const pt = px2pt(sizePx);
  if (face === "cjk") {
    return [{ text, options: { fontFace: F.cjk, fontSize: pt, bold } }];
  }
  const out = [];
  let buf = "", cur = null;
  for (const ch of text) {
    const c = isCJK(ch);
    if (cur === null) cur = c;
    if (c !== cur) {
      out.push({ text: buf, options: { fontFace: cur ? F.cjk : F.num, fontSize: pt, bold } });
      buf = ""; cur = c;
    }
    buf += ch;
  }
  if (buf) out.push({ text: buf, options: { fontFace: cur ? F.cjk : F.num, fontSize: pt, bold } });
  return out.length ? out : [{ text, options: { fontFace: F.num, fontSize: pt, bold } }];
}

function roleColor(role, dark) {
  switch (role) {
    case "label": return dark ? C.maize : C.maizeDim;
    case "kicker": return C.maize;
    case "head": case "title": return dark ? C.textOnDark : C.inkOnLight;
    case "hero": case "id": case "n": return C.maize;
    case "support": case "foot": case "source": return dark ? C.mutedOnDark : C.mutedOnLight;
    case "hero_label": return dark ? C.mutedOnDark : C.mutedOnLight;
    case "subtitle": return C.mutedOnDark;
    default: return dark ? C.textOnDark : C.inkOnLight;
  }
}

function putText(slide, box, text, sizePx, dark, opts) {
  if (!text || !String(text).trim()) return;
  const o = opts || {};
  slide.addText(splitRuns(String(text), box.face, sizePx, !!o.bold), {
    x: px2in(box.x), y: px2in(box.y), w: px2in(box.w), h: px2in(box.h),
    fontSize: px2pt(sizePx),
    color: o.color || roleColor(box.role, dark),
    bold: !!o.bold,
    align: o.align || "left",
    valign: o.valign || "top",
    margin: 0,
    lineSpacing: px2pt(sizePx * (box.lh || 1.14)),
  });
}

function getSrc(obj, src) {
  if (src === "id") return String(obj.id).padStart(2, "0");
  if (src.startsWith("hero.")) return (obj.hero || {})[src.split(".")[1]] || "";
  return obj[src] || "";
}

function sizeOf(sizes, role, box) {
  const s = sizes && sizes[role];
  return typeof s === "number" ? s : box.base;
}

function addBoxes(slide, obj, spec, sizes, dark) {
  spec.boxes.forEach((box) => {
    const text = getSrc(obj, box.src);
    if (!text || !String(text).trim()) return;
    const bold = ["label", "head", "hero", "id", "title"].includes(box.role);
    putText(slide, box, text, sizeOf(sizes, box.role, box), dark, {
      bold,
      valign: box.valign || (box.role === "hero" ? "middle" : "top"),
    });
  });
}

/* ---------- slide builders ---------- */
function addSteps(slide, sl, spec, sizes) {
  const c = spec.cards;
  const cols = (sizes && sizes.cols) || sl.steps.length;
  const rows = (sizes && sizes.rows) || 1;
  const cs = rows === 1 ? c.rows1 : c.rows2;
  const cw = (CW_PX - c.gap * (cols - 1)) / cols;
  const tw = cw - c.pad * 2;
  sl.steps.forEach((st, i) => {
    const r = Math.floor(i / cols), cc = i % cols;
    const x = M_PX + cc * (cw + c.gap);
    const y = c.top + r * (cs.cardH + c.rowGap);
    const sz = (sizes && sizes.cards && sizes.cards[i]) || {};

    slide.addShape(pres.ShapeType.roundRect, {
      x: px2in(x), y: px2in(y), w: px2in(cw), h: px2in(cs.cardH),
      fill: { color: C.paperAlt }, line: { color: C.paperAlt, width: 0 }, rectRadius: 0.12,
    });
    slide.addShape(pres.ShapeType.ellipse, {
      x: px2in(x + c.pad), y: px2in(y + cs.chipY), w: px2in(cs.chipW), h: px2in(cs.chipH),
      fill: { color: C.maize }, line: { color: C.maize, width: 0 },
    });
    slide.addText(String(st.n || i + 1), {
      x: px2in(x + c.pad), y: px2in(y + cs.chipY), w: px2in(cs.chipW), h: px2in(cs.chipH),
      fontFace: F.num, fontSize: px2pt(sz.n || cs.chipSize), color: C.ink, bold: true,
      align: "center", valign: "middle", margin: 0,
    });
    putText(slide,
      { ...c.title, role: "title", x: x + c.pad, y: y + cs.titleY, w: tw, h: cs.titleH, lh: c.title.lh },
      st.t || "", sz.t || c.title.size, false, { bold: true });
    putText(slide,
      { ...c.desc, role: "support", x: x + c.pad, y: y + cs.descY, w: tw, h: cs.descH, lh: c.desc.lh },
      st.d || "", sz.d || c.desc.size, false, { bold: false, color: C.mutedOnLight });
  });
}

function addRows(slide, items, spec, sizes, dark) {
  const r = spec.rows;
  items.forEach((b, i) => {
    const text = typeof b === "string" ? b : (b.t || "");
    const y = r.top + i * (r.rowH + r.gap);
    const s = (sizes && sizes.rows && sizes.rows[i]) || r.textSize;
    slide.addShape(pres.ShapeType.ellipse, {
      x: px2in(M_PX), y: px2in(y + (r.chipY || 14)), w: px2in(r.chipW), h: px2in(r.chipH),
      fill: { color: C.maize }, line: { color: C.maize, width: 0 },
    });
    slide.addText(String(i + 1), {
      x: px2in(M_PX), y: px2in(y + (r.chipY || 14)), w: px2in(r.chipW), h: px2in(r.chipH),
      fontFace: F.num, fontSize: px2pt(r.chipSize), color: C.ink, bold: true,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(text, {
      x: px2in(r.textX), y: px2in(y), w: px2in(r.textW), h: px2in(r.rowH),
      fontFace: F.cjk, fontSize: px2pt(s), color: dark ? C.textOnDark : C.inkOnLight,
      margin: 0, valign: "middle", lineSpacing: px2pt(s * r.lh),
    });
  });
}

function addSlide(slide, obj, typeName, spec, sizes) {
  const dark = DARK.has(typeName);
  slide.background = { color: dark ? C.ink : (typeName === "try" ? C.paperAlt : C.paper) };
  motif(slide, dark);
  addBoxes(slide, obj, spec, sizes, dark);
  if (typeName === "steps") addSteps(slide, obj, spec, sizes);
  if (typeName === "review") addRows(slide, obj.bullets || [], spec, sizes, dark);
}

function addNotes(slide, obj) {
  if (!obj) return;
  // 对外分享用：备注 = 演讲提示 + 该页完整口播稿
  const parts = [];
  if (obj.note && String(obj.note).trim()) parts.push(String(obj.note).trim());
  if (obj.narration && String(obj.narration).trim()) {
    parts.push("【讲稿】" + String(obj.narration).trim());
  }
  if (parts.length) slide.addNotes(parts.join("\n\n"));
}

/* ---------- build ---------- */
let built = 0;

if (content.course_cover) {
  const s = pres.addSlide();
  const spec = LAYOUT.pptxOnly.course_cover;
  s.background = { color: C.ink };
  motif(s, true);
  addBoxes(s, content.meta, spec, content.course_cover.sizes, true);
  addNotes(s, content.course_cover);
  built++;
}

if (content.agenda) {
  const s = pres.addSlide();
  const spec = LAYOUT.pptxOnly.agenda;
  s.background = { color: C.paper };
  motif(s, false);
  addBoxes(s, content.agenda, spec, content.agenda.sizes, false);
  const c = spec.cards;
  const cols = 3;
  const cw = (CW_PX - c.gap * (cols - 1)) / cols;
  const tw = cw - c.pad * 2;
  (content.agenda.items || []).forEach((it, i) => {
    const r = Math.floor(i / cols), cc = i % cols;
    const x = M_PX + cc * (cw + c.gap);
    const y = c.top + r * (c.cardH + c.rowGap);
    const sz = (content.agenda.sizes && content.agenda.sizes.cards && content.agenda.sizes.cards[i]) || {};
    s.addShape(pres.ShapeType.roundRect, {
      x: px2in(x), y: px2in(y), w: px2in(cw), h: px2in(c.cardH),
      fill: { color: C.paperAlt }, line: { color: C.paperAlt, width: 0 }, rectRadius: 0.12,
    });
    s.addText(String(it.n), {
      x: px2in(x + c.pad), y: px2in(y + c.num.y), w: px2in(c.num.w), h: px2in(c.num.h),
      fontFace: F.num, fontSize: px2pt(sz.n || c.num.size), color: C.maize, bold: true,
      margin: 0, valign: "middle",
    });
    putText(s, { ...c.title, role: "title", x: x + c.pad, y: y + c.title.y, w: tw, h: c.title.h, lh: c.title.lh },
      it.t || "", sz.t || c.title.size, false, { bold: true });
    putText(s, { ...c.desc, role: "support", x: x + c.pad, y: y + c.desc.y, w: tw, h: c.desc.h, lh: c.desc.lh },
      it.d || "", sz.d || c.desc.size, false, { bold: false, color: C.mutedOnLight });
  });
  addNotes(s, content.agenda);
  built++;
}

content.episodes.forEach((ep) => {
  ep.slides.forEach((sl) => {
    const slide = pres.addSlide();
    const spec = LAYOUT.types[sl.type];
    if (!spec) throw new Error("未知 slide type: " + sl.type);
    if (sl.type === "try") {
      slide.background = { color: C.paperAlt };
      motif(slide, false);
      slide.addShape(pres.ShapeType.roundRect, {
        x: px2in(spec.rect.x), y: px2in(spec.rect.y), w: px2in(spec.rect.w), h: px2in(spec.rect.h),
        fill: { color: C.ink }, line: { color: C.ink, width: 0 }, rectRadius: 0.14,
      });
      addBoxes(slide, sl, spec, sl.sizes, true);
    } else {
      addSlide(slide, sl, sl.type, spec, sl.sizes);
    }
    addNotes(slide, sl);
    built++;
  });
});

if (content.summary) {
  const s = pres.addSlide();
  const spec = LAYOUT.pptxOnly.summary;
  s.background = { color: C.ink };
  motif(s, true);
  addBoxes(s, content.summary, spec, content.summary.sizes, true);
  addRows(s, content.summary.bullets || [], spec, content.summary.sizes, true);
  addNotes(s, content.summary);
  built++;
}

pres.writeFile({ fileName: outPath }).then(() => {
  console.log(`OK ${built} slides -> ${outPath}`);
});
