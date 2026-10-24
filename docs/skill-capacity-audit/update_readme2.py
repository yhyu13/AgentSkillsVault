"""Second README pass: remove retired skills that appear as standalone tokens
inside grouped rows/trees, where the first pass could not match them.

Only whole tokens are removed: a name must not be preceded/followed by a word
character or '-', so 'cs-product-strategist' and 'truth-seeking-research' are
left alone. Prose lines (no table pipe, no tree glyph) are never touched.
"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

plan = json.load(open("docs/skill-capacity-audit/2026-10-25-removal-plan.json",
                      encoding="utf-8"))
names = sorted(plan.keys(), key=len, reverse=True)

p = Path("README.md")
lines = p.read_bytes().split(b"\r\n")

# token pattern: exact name, not glued to word chars or '-'
tok = {n: re.compile(rb"(?<![\w-])" + re.escape(n.encode()) + rb"(?![\w-])")
       for n in names}

def strip_tokens(chunk: bytes, drop_slash: bool = True) -> bytes:
    out = chunk
    for n in names:
        if drop_slash:
            out = tok[n].sub(rb"", out)
            out = re.sub(rb"(?<![\w-])" + re.escape(n.encode()) + rb"/", b"", out)
        else:
            out = tok[n].sub(rb"", out)
    return out

rows_dropped = 0
tokens_dropped = 0
out = []
for l in lines:
    is_table = l.startswith(b"|")
    is_tree = b"\xe2\x94" in l[:12] or l.startswith(b"  ") or l.startswith(b"    ")
    if is_table:
        cells = l.split(b"|")
        if len(cells) > 2:
            path_cell = cells[1]
            new = strip_tokens(path_cell)
            if new != path_cell:
                tokens_dropped += 1
                if not new.strip(b" `*/"):
                    rows_dropped += 1
                    continue
                cells[1] = new
                l = b"|".join(cells)
    elif is_tree:
        new = strip_tokens(l)
        if new != l:
            tokens_dropped += 1
            l = new
    out.append(l)

p.write_bytes(b"\r\n".join(out))
print(f"README.md pass2: dropped {rows_dropped} rows, {tokens_dropped} tokens")
