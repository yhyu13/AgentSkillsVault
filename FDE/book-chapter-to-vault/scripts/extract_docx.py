#!/usr/bin/env python3
"""Extract chapter text from .docx files into plain Markdown.

This is the first step of the `book-chapter-to-vault` skill. It converts each
.docx in a source directory into a .md scratch file under the output directory.

Usage:
    python extract_docx.py <source_dir> <output_dir>

Dependencies:
    python-docx  (pip install python-docx)  -- primary path
    The script also has a fallback that reads word/document.xml from the .docx
    ZIP directly, so it works on minimal Python installs.

Output:
    For each `<src>/<chapter>.docx`, writes `<out>/<chapter-stem>.md`
    with H1 = chapter title, H2 = heading 2, etc.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def _has_python_docx() -> bool:
    try:
        import docx  # noqa: F401
        return True
    except ImportError:
        return False


# ----- Primary path: python-docx -----
def extract_with_python_docx(src: Path) -> str:
    from docx import Document

    doc = Document(src)
    lines: list[str] = []
    title = src.stem
    lines.append(f"# {title}")
    lines.append("")

    for para in doc.paragraphs:
        text = para.text.rstrip()
        if not text:
            lines.append("")
            continue
        style = (para.style.name or "").lower() if para.style else ""
        if "heading 1" in style or "标题 1" in style:
            lines.append(f"## {text}")
        elif "heading 2" in style or "标题 2" in style:
            lines.append(f"### {text}")
        elif "heading 3" in style or "标题 3" in style:
            lines.append(f"#### {text}")
        elif "heading 4" in style or "标题 4" in style:
            lines.append(f"##### {text}")
        else:
            lines.append(text)

    return "\n".join(lines)


# ----- Fallback path: parse word/document.xml directly -----
NS_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _para_text(p: ET.Element) -> str:
    parts: list[str] = []
    for t in p.iter(f"{NS_W}t"):
        if t.text:
            parts.append(t.text)
    return "".join(parts)


def _para_style(p: ET.Element) -> str:
    pPr = p.find(f"{NS_W}pPr")
    if pPr is None:
        return ""
    pStyle = pPr.find(f"{NS_W}pStyle")
    if pStyle is None:
        return ""
    return pStyle.get(f"{NS_W}val", "")


def extract_with_xml(src: Path) -> str:
    with zipfile.ZipFile(src) as z:
        try:
            xml_bytes = z.read("word/document.xml")
        except KeyError as e:
            raise RuntimeError(f"{src} has no word/document.xml — not a valid .docx?") from e

    root = ET.fromstring(xml_bytes)
    body = root.find(f"{NS_W}body")
    if body is None:
        return ""

    lines: list[str] = [f"# {src.stem}", ""]
    for p in body.findall(f"{NS_W}p"):
        text = _para_text(p).rstrip()
        if not text:
            lines.append("")
            continue
        style = _para_style(p)
        # Map style IDs to markdown headings
        m = re.match(r"^Heading([1-6])$", style)
        if m:
            level = int(m.group(1)) + 1  # H1 is the file title
            lines.append("#" * min(level, 6) + " " + text)
        elif style in {"Title", "标题"}:
            lines.append(f"## {text}")
        else:
            lines.append(text)

    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2

    src_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])

    if not src_dir.is_dir():
        print(f"source dir not found: {src_dir}", file=sys.stderr)
        return 1
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(src_dir.glob("*.docx"))
    if not files:
        print(f"no .docx files in {src_dir}", file=sys.stderr)
        return 1

    use_pydocx = _has_python_docx()
    if not use_pydocx:
        print("[note] python-docx not available, using XML fallback", file=sys.stderr)

    for src in files:
        try:
            content = extract_with_python_docx(src) if use_pydocx else extract_with_xml(src)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {src.name}: {e}", file=sys.stderr)
            continue

        out = out_dir / (src.stem + ".md")
        out.write_text(content, encoding="utf-8")
        print(f"wrote {out} ({len(content)} bytes)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
