// Build the deck from ppt/deck.json. One spec, one layout engine.
//
//   node build_deck.js <project>
//
// deck.json carries copy, theme.json carries colour and geometry. Both are real
// inputs: change a colour there and the pptx changes. The preview is generated
// from the pptx itself (deck_preview.py), so there is no second layout that can
// drift. Every slide carries its source timecode in the notes: a deck that
// cannot be traced back to a minute of the original is a slide of opinions.
const path = require("path");
const fs = require("fs");

function loadPptx() {
  const roots = [
    process.cwd(),
    path.join(process.env.APPDATA || "", "npm", "node_modules"),
    path.join(path.dirname(process.argv[1]), ".."),
  ];
  for (const root of roots) {
    try {
      return require(require.resolve("pptxgenjs", { paths: [root] }));
    } catch {
      /* next */
    }
  }
  throw new Error("pptxgenjs not found; npm i -g pptxgenjs");
}

const PptxGenJS = loadPptx();
const root = path.resolve(process.argv[2] || ".");
const spec = JSON.parse(fs.readFileSync(path.join(root, "ppt", "deck.json"), "utf8"));
const themePath = path.join(root, "ppt", "theme.json");
if (!fs.existsSync(themePath)) {
  throw new Error("missing ppt/theme.json — colours and geometry live there, not in code");
}
const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));

// pptxgenjs wants bare hex; anything already prefixed is normalised once here so
// the same theme.json can also be read by CSS tooling.
const C = Object.fromEntries(
  Object.entries(theme.colors || {}).map(([k, v]) => [k, String(v).replace(/^#/, "").toUpperCase()])
);
if (!C.bg || !C.text || !C.accent) {
  throw new Error("theme.json needs at least colors.bg / colors.text / colors.accent");
}
const W = (theme.slide && theme.slide.width) || 13.333;
const H = (theme.slide && theme.slide.height) || 7.5;
const M = (theme.slide && theme.slide.margin) || 0.92;
const FONT = (theme.fonts && theme.fonts.cjk) || "Microsoft YaHei";
const FONT_EN = (theme.fonts && theme.fonts.latin) || "Georgia";

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "PREVIZ_16x9", width: W, height: H });
pptx.layout = "PREVIZ_16x9";
pptx.author = spec.author || "";
pptx.title = spec.title || "";

function bg(slide) {
  slide.background = { color: C.bg };
}

// A horizontal rule as a thin rectangle, not a line shape. pptxgenjs accepts
// ShapeType.line with h:0 and then draws nothing, silently: every rule in the
// deck disappears while check_deck.py and the JSON both look fine.
function rule(slide, x, y, w, color = C.line, width = 0.75) {
  const h = Math.max(0.014, width / 72);
  slide.addShape(pptx.ShapeType.rect, {
    x, y: y - h / 2, w, h, fill: { color }, line: { color, width: 0 },
  });
}

function text(slide, str, o) {
  slide.addText(str, Object.assign({ fontFace: FONT, color: C.text, valign: "top" }, o));
}

// 自动编号（01/02/…）是装饰，不是主张：给它一个 shape 名，check_deck 按名字豁免
function indexText(slide, label, opts) {
  text(slide, label, Object.assign({ objectName: "item-index" }, opts));
}

function capItems(s, limit, kind) {
  const n = (s.items || []).length;
  const cols = (s.columns || []).length;
  if (cols > 2) {
    throw new Error(`slide ${s.type}: ${cols} 栏，超过 2 栏上限。compare 版式只排两栏，`
      + "第三栏会画到页外，check_deck 的越界检查只能在事后追认。");
  }
  for (const col of s.columns || []) {
    if ((col.items || []).length > 4) {
      throw new Error(`slide ${s.type}: 一栏 ${col.items.length} 条，超过 4 条上限。`);
    }
  }
  if (n > limit) {
    throw new Error(`slide ${s.type}: ${n} 条，超过 ${limit} 条上限（${kind}）。` +
      "多出来的会挤成重叠行，check_deck.py 看不出来；拆页，不要挤。");
  }
}

function footer(slide, page, kicker) {
  rule(slide, M, H - 0.72, W - M * 2, C.line, 0.75);
  text(slide, kicker || spec.footer || "", {
    x: M, y: H - 0.62, w: 8.4, h: 0.3, fontSize: 10, color: C.dim, charSpacing: 0.6,
  });
  text(slide, String(page).padStart(2, "0"), {
    x: W - M - 1.2, y: H - 0.62, w: 1.2, h: 0.3, fontSize: 10, color: C.dim, align: "right",
    objectName: "pageno",
  });
}

function notes(slide, s) {
  const bits = [];
  if (s.source) bits.push("原片 " + s.source);
  if (s.caveat) bits.push("口径：" + s.caveat);
  if (s.note) bits.push(s.note);
  slide.addNotes(bits.join(" ｜ "));
}

function bullet(slide, str, x, y, w, size = 15, color = C.text) {
  text(slide, str, { x, y, w, h: 0.5, fontSize: size, color, breakLine: false });
}

const layouts = {
  cover(slide, s, page) {
    bg(slide);
    text(slide, s.kicker || "", {
      x: M, y: 1.55, w: W - M * 2, h: 0.4, fontSize: 11, color: C.accent, charSpacing: 2.2,
    });
    text(slide, s.title, {
      x: M, y: 2.05, w: W - M * 2 - 0.6, h: 1.9, fontSize: 40, bold: true, lineSpacingMultiple: 1.12,
    });
    if (s.subtitle) {
      text(slide, s.subtitle, {
        x: M, y: 4.05, w: 8.6, h: 1.0, fontSize: 15, color: C.dim, lineSpacingMultiple: 1.3,
      });
    }
    rule(slide, M, 5.35, 3.1, C.accent, 2);
    text(slide, s.meta || "", { x: M, y: 5.5, w: 9.5, h: 0.6, fontSize: 11, color: C.dim });
    footer(slide, page, "");
  },

  statement(slide, s, page) {
    bg(slide);
    const narrow = Boolean(s.stat);
    if (s.kicker) {
      text(slide, s.kicker, {
        x: M, y: 1.28, w: W - M * 2, h: 0.35, fontSize: 11, color: C.accent, charSpacing: 2,
      });
    }
    text(slide, s.title, {
      x: M, y: 1.72, w: narrow ? 8.6 : 11.2, h: 2.0, fontSize: 33, bold: true,
      lineSpacingMultiple: 1.22,
    });
    if (s.body) {
      text(slide, s.body, {
        x: M, y: 3.62, w: narrow ? 8.2 : 10.4, h: 1.5, fontSize: 15, color: C.dim,
        lineSpacingMultiple: 1.5,
      });
    }
    if (s.stat) {
      text(slide, s.stat.value, {
        x: W - M - 3.1, y: 3.3, w: 3.1, h: 1.05, fontSize: 44, bold: true, color: C.cool,
        fontFace: FONT_EN, align: "right",
      });
      text(slide, s.stat.label, {
        x: W - M - 3.1, y: 4.36, w: 3.1, h: 0.5, fontSize: 10, color: C.dim, align: "right",
      });
    }
    footer(slide, page);
  },

  points(slide, s, page) {
    bg(slide);
    text(slide, s.kicker || "", {
      x: M, y: 0.85, w: W - M * 2, h: 0.3, fontSize: 10, color: C.accent, charSpacing: 2,
    });
    text(slide, s.title, { x: M, y: 1.2, w: 8.8, h: 1.0, fontSize: 26, bold: true });
    if (s.lead) {
      text(slide, s.lead, { x: M, y: 2.2, w: 8.6, h: 0.7, fontSize: 13, color: C.dim });
    }
    const top = s.lead ? 3.0 : 2.55;
    const rowH = Math.min(0.95, (H - 1.2 - top) / (s.items.length || 1));
    s.items.forEach((item, i) => {
      const y = top + i * rowH;
      indexText(slide, String(i + 1).padStart(2, "0"), {
        x: M, y: y + 0.06, w: 0.7, h: 0.4, fontSize: 12, color: C.accent, fontFace: FONT_EN,
      });
      text(slide, item.head, {
        x: M + 0.75, y, w: 7.5, h: 0.42, fontSize: 17, bold: true,
      });
      if (item.detail) {
        text(slide, item.detail, {
          x: M + 0.75, y: y + 0.4, w: 7.6, h: 0.5, fontSize: 11.5, color: C.dim,
        });
      }
      if (i < s.items.length - 1) rule(slide, M + 0.75, y + rowH - 0.16, 7.6, C.line, 0.5);
    });
    if (s.aside) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.55, y: 2.42, w: 2.9, h: 2.42, fill: { color: C.panel },
        line: { color: C.line, width: 1 }, rectRadius: 0.08,
      });
      text(slide, s.aside.label, {
        x: 9.8, y: 2.66, w: 2.4, h: 0.3, fontSize: 10, color: C.dim, charSpacing: 1.5,
      });
      text(slide, s.aside.value, {
        x: 9.8, y: 2.98, w: 2.4, h: 0.9, fontSize: 26, bold: true, color: C.cool, fontFace: FONT_EN,
      });
      text(slide, s.aside.note, {
        x: 9.8, y: 3.86, w: 2.4, h: 0.9, fontSize: 10.5, color: C.dim, lineSpacingMultiple: 1.4,
      });
    }
    footer(slide, page);
  },

  steps(slide, s, page) {
    bg(slide);
    text(slide, s.kicker || "", {
      x: M, y: 0.85, w: W - M * 2, h: 0.3, fontSize: 10, color: C.accent, charSpacing: 2,
    });
    text(slide, s.title, { x: M, y: 1.2, w: 10.5, h: 1.0, fontSize: 26, bold: true });
    const n = s.items.length;
    const gap = 0.34;
    const cardW = (W - M * 2 - gap * (n - 1)) / n;
    s.items.forEach((item, i) => {
      const x = M + i * (cardW + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y: 2.62, w: cardW, h: 2.08, fill: { color: C.panel },
        line: { color: i === 0 ? C.accent : C.line, width: i === 0 ? 1.75 : 1 },
        rectRadius: 0.06,
      });
      text(slide, item.tag || String(i + 1), {
        x: x + 0.24, y: 2.82, w: cardW - 0.5, h: 0.3, fontSize: 10, color: C.accent,
        fontFace: FONT_EN, charSpacing: 1,
        // a caller-supplied tag is copy (checked); a generated number is decoration
        objectName: item.tag ? undefined : "item-index",
      });
      text(slide, item.head, {
        x: x + 0.24, y: 3.14, w: cardW - 0.45, h: 0.6, fontSize: 15, bold: true,
        lineSpacingMultiple: 1.15,
      });
      text(slide, item.detail, {
        x: x + 0.24, y: 3.7, w: cardW - 0.45, h: 0.9, fontSize: 10.5, color: C.dim,
        lineSpacingMultiple: 1.35,
      });
      if (i < n - 1) {
        text(slide, "›", {
          x: x + cardW - 0.02, y: 3.35, w: 0.34, h: 0.5, fontSize: 20, color: C.line, bold: true,
        });
      }
    });
    if (s.body) {
      text(slide, s.body, { x: M, y: 5.05, w: 11.2, h: 0.7, fontSize: 11.5, color: C.dim });
    }
    footer(slide, page);
  },

  compare(slide, s, page) {
    bg(slide);
    text(slide, s.kicker || "", {
      x: M, y: 0.85, w: W - M * 2, h: 0.3, fontSize: 10, color: C.accent, charSpacing: 2,
    });
    text(slide, s.title, { x: M, y: 1.2, w: 11, h: 0.9, fontSize: 25, bold: true });
    const colW = (W - M * 2 - 0.5) / 2;
    s.columns.forEach((col, i) => {
      const x = M + i * (colW + 0.5);
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y: 2.4, w: colW, h: 3.55, fill: { color: C.panel },
        line: { color: col.tone === "bad" ? C.warn : C.cool, width: 1.25 }, rectRadius: 0.06,
      });
      text(slide, col.label, {
        x: x + 0.3, y: 2.6, w: colW - 0.6, h: 0.35, fontSize: 11.5, bold: true,
        color: col.tone === "bad" ? C.warn : C.cool, charSpacing: 1.2,
      });
      text(slide, col.head, {
        x: x + 0.3, y: 2.98, w: colW - 0.6, h: 0.55, fontSize: 15, bold: true,
      });
      col.items.forEach((item, k) => {
        text(slide, "— " + item, {
          x: x + 0.3, y: 3.6 + k * 0.52, w: colW - 0.62, h: 0.48, fontSize: 11.5, color: C.dim,
          lineSpacingMultiple: 1.25,
        });
      });
    });
    if (s.body) {
      text(slide, s.body, { x: M, y: 6.15, w: 11.2, h: 0.5, fontSize: 11, color: C.dim });
    }
    footer(slide, page);
  },

  quote(slide, s, page) {
    bg(slide);
    // accent bar: a filled sliver, not a zero-height line (a line shape with a
    // tiny width renders as a stray dash in every viewer)
    slide.addShape(pptx.ShapeType.rect, {
      x: M, y: 2.2, w: 0.055, h: 1.72, fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    text(slide, s.quote, {
      x: M + 0.55, y: 2.18, w: 10.3, h: 1.9, fontSize: 26, lineSpacingMultiple: 1.45,
    });
    text(slide, s.attribution || "", {
      x: M + 0.55, y: 4.3, w: 9, h: 0.4, fontSize: 11.5, color: C.accent,
    });
    if (s.body) {
      text(slide, s.body, {
        x: M + 0.55, y: 4.8, w: 9.8, h: 1.2, fontSize: 12.5, color: C.dim,
        lineSpacingMultiple: 1.45,
      });
    }
    footer(slide, page);
  },

  closing(slide, s, page) {
    bg(slide);
    text(slide, s.kicker || "", {
      x: M, y: 1.0, w: W - M * 2, h: 0.3, fontSize: 10, color: C.accent, charSpacing: 2,
    });
    text(slide, s.title, { x: M, y: 1.4, w: 11.3, h: 1.2, fontSize: 30, bold: true });
    s.items.forEach((item, i) => {
      const y = 2.95 + i * 0.78;
      text(slide, "→", { x: M, y, w: 0.4, h: 0.4, fontSize: 14, color: C.accent });
      text(slide, item, {
        x: M + 0.55, y: y - 0.02, w: 10.6, h: 0.62, fontSize: 15, lineSpacingMultiple: 1.25,
      });
    });
    if (s.body) {
      rule(slide, M, 6.1, 11.4, C.line, 0.75);
      text(slide, s.body, { x: M, y: 6.2, w: 11.2, h: 0.6, fontSize: 11, color: C.dim });
    }
    footer(slide, page);
  },
};

spec.slides.forEach((s, i) => {
  const slide = pptx.addSlide();
  const fn = layouts[s.type];
  if (!fn) throw new Error(`slide ${i + 1}: unknown type "${s.type}"`);
  // 上限按版面实测给：一页最多 5 条并排内容，再多行会互相压住而越界检查看不出来
  capItems(s, s.type === "compare" ? 4 : 5, s.type);
  fn(slide, s, i + 1);
  // Provenance on the slide itself, not only in the notes: a reader who never
  // opens the speaker notes can still find the minute this claim came from.
  // Two boxes, deliberately: the first is pure provenance (so the checker can
  // exempt it), the second carries the caveat sentence and stays checked like
  // body copy. Merging them let an unchecked caveat ride in on a footer line.
  if (s.source) {
    // objectName is the contract with check_deck.py (pptxgenjs: objectName, not shapeName): "provenance" is exempt from
    // the number gate, "caveat" is not. Content sniffing was too easy to fool.
    text(slide, "原片 " + s.source, {
      x: M, y: H - 1.02, w: 4.6, h: 0.32,
      fontSize: 10, color: C.faint || C.dim, charSpacing: 0.4, objectName: "provenance",
    });
    if (s.caveat) {
      text(slide, "口径：" + s.caveat, {
        x: M + 4.7, y: H - 1.02, w: W - M * 2 - 4.7, h: 0.32,
        fontSize: 10, color: C.faint || C.dim, charSpacing: 0.4, align: "right",
        objectName: "caveat",
      });
    }
  }
  notes(slide, s);
});

const outDir = path.join(root, "ppt");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "deck.pptx");
pptx.writeFile({ fileName: out }).then(() => {
  console.log(`OK ${out} slides=${spec.slides.length}`);
});
