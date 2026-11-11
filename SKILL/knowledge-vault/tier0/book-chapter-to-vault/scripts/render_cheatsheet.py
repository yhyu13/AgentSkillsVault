#!/usr/bin/env python3
"""Render the cheatsheet to a single A4 page (HTML → PDF if possible).

Optional helper for the `book-chapter-to-vault` skill. Two modes:

1. HTML mode (default, no dependencies):
   Produces a print-styled HTML at the same path with `.print.html` suffix.
   Open in browser → Cmd/Ctrl+P → print to A4.

2. PDF mode (requires `weasyprint` or `pdfkit`):
   Outputs a true PDF. The script tries weasyprint first, then pdfkit.

Usage:
    python render_cheatsheet.py <cheatsheet.md> [output_path]

The output file is named `<cheatsheet>.print.html` by default.
"""

from __future__ import annotations

import sys
from pathlib import Path


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  @page {{ size: A4; margin: 12mm; }}
  body {{
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1a1a1a;
    max-width: 100%;
  }}
  h1 {{ font-size: 16pt; margin: 0 0 4pt 0; border-bottom: 1.5pt solid #333; padding-bottom: 2pt; }}
  h2 {{ font-size: 12pt; margin: 8pt 0 3pt 0; color: #2a5db0; }}
  h3 {{ font-size: 10.5pt; margin: 4pt 0 2pt 0; color: #444; }}
  p, li {{ font-size: 9.5pt; margin: 1pt 0; }}
  ul {{ margin: 2pt 0 4pt 16pt; padding: 0; }}
  code {{ background: #f3f3f3; padding: 0 2pt; border-radius: 2pt; font-size: 9pt; }}
  pre {{ background: #f8f8f8; padding: 4pt; border-radius: 2pt; font-size: 8.5pt; overflow-x: auto; }}
  table {{ border-collapse: collapse; margin: 3pt 0; font-size: 8.5pt; }}
  th, td {{ border: 0.5pt solid #888; padding: 1pt 4pt; text-align: left; }}
  th {{ background: #eee; }}
  blockquote {{
    border-left: 2pt solid #888;
    margin: 3pt 0;
    padding: 1pt 6pt;
    color: #555;
    font-size: 9pt;
  }}
  hr {{ border: none; border-top: 0.5pt dashed #999; margin: 6pt 0; }}
  .footer {{ font-size: 8pt; color: #888; text-align: right; margin-top: 6pt; }}
</style>
</head>
<body>
{body}
</body>
</html>
"""


def _md_to_html(md_text: str) -> str:
    """Minimal Markdown to HTML converter (handles headers, lists, tables, code, blockquotes)."""
    import re

    lines = md_text.splitlines()
    out: list[str] = []
    i = 0
    in_code = False
    code_buf: list[str] = []
    in_table = False
    table_buf: list[str] = []

    def flush_table() -> None:
        if not table_buf:
            return
        # First row = header
        rows = [r.strip() for r in table_buf if r.strip()]
        if not rows:
            table_buf.clear()
            in_table = False
            return
        # Drop the markdown separator row (|---|---|)
        rows = [r for r in rows if not re.match(r"^\|?[\s:|-]+\|?$", r)]
        out.append("<table>")
        for idx, row in enumerate(rows):
            cells = [c.strip() for c in row.strip("|").split("|")]
            tag = "th" if idx == 0 else "td"
            out.append("<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>")
        out.append("</table>")
        table_buf.clear()
        in_table = False

    def flush_code() -> None:
        if not code_buf:
            return
        out.append("<pre><code>" + "\n".join(code_buf) + "</code></pre>")
        code_buf.clear()
        in_code = False

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Code block
        if stripped.startswith("```"):
            if in_code:
                flush_code()
                i += 1
                continue
            in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # Table
        if "|" in stripped and i + 1 < len(lines) and re.match(r"^\|?[\s:|-]+\|?$", lines[i + 1].strip()):
            in_table = True
            table_buf.append(stripped)
            i += 1
            # Peek next non-empty: could be more table rows
            continue
        if in_table and "|" in stripped:
            table_buf.append(stripped)
            i += 1
            continue
        if in_table and not stripped:
            flush_table()
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            out.append(f"<h{level}>{m.group(2)}</h{level}>")
            i += 1
            continue

        # Blockquote
        if stripped.startswith(">"):
            content = stripped.lstrip(">").strip()
            out.append(f"<blockquote>{content}</blockquote>")
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^---+$", stripped):
            out.append("<hr>")
            i += 1
            continue

        # Unordered list
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                item = re.sub(r"^[-*]\s+", "", lines[i].strip())
                items.append(item)
                i += 1
            out.append("<ul>" + "".join(f"<li>{it}</li>" for it in items) + "</ul>")
            continue

        # Checkbox list
        if re.match(r"^-\s+\[[ x]\]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^-\s+\[[ x]\]\s+", lines[i].strip()):
                item = re.sub(r"^-\s+\[[ x]\]\s+", "", lines[i].strip())
                checked = "x" in lines[i]
                mark = "☑" if checked else "☐"
                items.append(f"{mark} {item}")
                i += 1
            out.append(
                "<ul>" + "".join(f"<li>{it}</li>" for it in items) + "</ul>"
            )
            continue

        # Plain paragraph
        if stripped:
            para_lines = [stripped]
            i += 1
            while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{1,6}\s|>\s|[-*]\s|-\s\[|```|---|\|)", lines[i].strip()
            ):
                para_lines.append(lines[i].strip())
                i += 1
            out.append("<p>" + " ".join(para_lines) + "</p>")
            continue

        i += 1

    flush_table()
    flush_code()
    return "\n".join(out)


def render_html(md_path: Path, html_path: Path) -> None:
    md_text = md_path.read_text(encoding="utf-8")
    body = _md_to_html(md_text)
    title = md_path.stem
    html = HTML_TEMPLATE.format(title=title, body=body)
    html_path.write_text(html, encoding="utf-8")


def render_pdf(html_path: Path, pdf_path: Path) -> bool:
    """Try to render HTML to PDF using weasyprint or pdfkit. Returns True on success."""
    try:
        from weasyprint import HTML  # type: ignore

        HTML(string=html_path.read_text(encoding="utf-8")).write_pdf(pdf_path)
        return True
    except ImportError:
        pass
    try:
        import pdfkit  # type: ignore

        pdfkit.from_file(str(html_path), str(pdf_path))
        return True
    except ImportError:
        pass
    return False


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    md_path = Path(sys.argv[1])
    if not md_path.is_file():
        print(f"file not found: {md_path}", file=sys.stderr)
        return 1
    out_html = Path(sys.argv[2]) if len(sys.argv) >= 3 else md_path.with_suffix(".print.html")
    render_html(md_path, out_html)
    print(f"wrote {out_html}")
    pdf_path = out_html.with_suffix(".pdf")
    if render_pdf(out_html, pdf_path):
        print(f"wrote {pdf_path}")
    else:
        print(f"[note] install weasyprint or pdfkit for PDF output; HTML at {out_html}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
