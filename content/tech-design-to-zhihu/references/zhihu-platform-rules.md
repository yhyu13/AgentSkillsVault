# Zhihu column platform rules

Last checked: 2026-08-23.

This file is a baseline. Refresh official Zhihu editor behavior when browsing is available — limits and paste quirks change.

## What Zhihu renders

Supported in a 专栏 / 回答 paste:

- Headings: at most **four** levels (`#` … `####`). Deeper headings flatten or look broken.
- Paragraphs, bold, italic, inline code, fenced code blocks
- Ordered / unordered lists, blockquotes, thematic breaks
- Tables (alignment attributes are ignored)
- Images: PNG / JPG / GIF / WebP. **SVG is not supported** and will not display.
- Links
- LaTeX via Zhihu's equation image endpoint if the editor accepts it; do not rely on `$...$` surviving a raw Markdown paste

Not supported (will show as raw text or vanish):

- **Mermaid** fenced blocks — Zhihu does not render them
- SVG files and inline SVG
- GitHub-flavored admonitions (`> [!NOTE]`, `> [!TIP]`)
- Strikethrough (`~~`)
- HTML widgets, iframes, custom CSS
- Footnote syntax that is not converted to 参考文献 links

## Images

- Prefer **PNG** for diagrams. JPG for photographs. Never SVG.
- Local `![alt](images/foo.png)` is for the author's pack. Zhihu will not fetch a local path; the human uploads each PNG in the editor (or via a 图床 URL).
- Put a one-line alt that states the claim of the figure, not "diagram 1".
- Keep diagrams ≤ ~1600 px on the long edge so mobile does not pinch-zoom a wall of text-in-image.
- QR codes and some dense screenshots may be filtered; do not depend on them.

## Length and shape

- 专栏: 2 000–6 000 汉字 is the readable band for a technical design rewrite. Past 8 000, cut or split.
- 回答 under a question: 800–2 500 汉字 unless the user asked for a 专栏.
- Short paragraphs. One idea per paragraph. Walls of 是什么 / 不是什么 / 证据 bullets are a design doc, not a Zhihu article — rewrite as prose, keep at most one compact table.
- Title is the feed hook. Do not start with 「本文介绍」 or the source filename.

## Voice

- Original Chinese public copy. Do not translate the design doc sentence-by-sentence.
- One thesis. File-path indexes, ADR lists, and package inventories stay in an optional trailing 「想对照源码」 section of ≤ 8 lines, or are omitted.
- Facts from the source stay facts. Do not invent personal anecdotes, production incidents, or benchmark numbers.
- Name the product / repo when the source does. Do not imply affiliation Zhihu readers cannot verify.

## Paste checklist

Before handing the pack to the user:

1. No ` ```mermaid ` fences remain in `article.md`.
2. No `.svg` references in image links.
3. Every figure is a PNG (or JPG) in `images/`.
4. Headings stop at `####`.
5. A `PUBLISH.md` (or the article header comment) says: upload each PNG in order, then paste the body.
