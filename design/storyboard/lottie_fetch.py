#!/usr/bin/env python
"""
lottie_fetch.py
Search the curated animation index (lottie-library.json: 108 concepts) and
fetch a Lottie ON DEMAND into a project's assets/lottie/ (only what you use -
no repo bloat, no dead-link risk in renders, license recorded).

Each index entry maps a fun animation concept to:
  - an OWNED engine preset ("preset", optionally + "loop" / "attrs", or a full
    "markup" snippet when the preset needs host content: an SVG shape, a
    <canvas>, text, a sized box) - use it first: zero deps, render-safe,
    brand-colored. `search` / `show` print the ready-to-paste markup; and/or
  - a Lottie to fetch: "url" (a direct Lottie JSON URL) or, for SEARCH-ONLY
    entries ("url": null), a "search" term to look up on LottieFiles & co.

Usage (run from anywhere; paths below assume the default skill location):
  # browse the index
  python ~/.claude/skills/storyboard/lottie_fetch.py list
  python ~/.claude/skills/storyboard/lottie_fetch.py list celebration
  python ~/.claude/skills/storyboard/lottie_fetch.py search "success"     # fuzzy match on id/category/tags

  # show what one entry recommends (preset markup, or the search term)
  python ~/.claude/skills/storyboard/lottie_fetch.py show success-check

  # fetch a Lottie into a project -> <project>/assets/lottie/<id>.json + CREDITS.md
  python ~/.claude/skills/storyboard/lottie_fetch.py fetch <lottie-url> --out ./my-video --id confetti-burst
  python ~/.claude/skills/storyboard/lottie_fetch.py fetch ./downloaded.json --out ./my-video --id mascot-wave
      [--credit <page-url>]      # a downloaded file: record where it came from in CREDITS.md
  python ~/.claude/skills/storyboard/lottie_fetch.py fetch ./anim.lottie --out ./my-video --id rocket   # dotLottie zip

  The old flag forms still work: --list [CATEGORY], --search QUERY, --show ID.

Notes:
  - "free" Lottie licenses vary wildly. ALWAYS verify the source license before
    shipping. This tool writes the source + date to <project>/assets/lottie/CREDITS.md
    so you have a record; it does NOT assert the asset is license-clean.
  - Prefer the owned preset when the index lists one - it's the safe default.
  - To play a fetched Lottie in a deck (deck at the project root):
      <div class="anim" data-anim="lottie" data-src="assets/lottie/<id>.json"
           data-t-rel="0.5" data-dur="3"></div>
    (the engine lazy-loads lottie-web; the local file keeps renders offline-safe)
"""
import argparse
import datetime
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
INDEX = HERE / "lottie-library.json"
SELF = 'python "%s"' % Path(__file__).resolve().as_posix()   # for printed hints


def _q(s):
    """Quote an argument for a printed command line when it needs it (spaces etc.)."""
    s = str(s)
    return s if s and re.fullmatch(r"[\w@%+=:,./\\-]+", s) else '"%s"' % s

for _s in (sys.stdout, sys.stderr):
    try:   # never crash on a cp1252 console
        _s.reconfigure(errors="replace")
    except Exception:
        pass


def load_index():
    if not INDEX.exists():
        sys.exit(f"Index not found: {INDEX}")
    return json.loads(INDEX.read_text(encoding="utf-8"))["animations"]


# ---- entry accessors (accept the pre-0.8 field names too) --------------------
def preset_of(r):
    return r.get("preset", r.get("procedural"))


def search_of(r):
    return r.get("search", r.get("lottie_search"))


def url_of(r):
    return r.get("url") or r.get("lottie_url")


def preset_markup(r):
    """Ready-to-paste markup for an entry's owned preset: its "markup" when the preset
    needs host content or structure (an SVG shape, a <canvas>, text, a sized box - a
    bare <div> would draw nothing), else a <div> with the preset (+ attrs / loop)."""
    if r.get("markup"):
        return r["markup"]
    attrs = [f'data-anim="{preset_of(r)}"']
    for k, v in (r.get("attrs") or {}).items():
        attrs.append(f'{k}="{v}"')
    if r.get("loop"):
        attrs.append(f'data-loop="{r["loop"]}"')
    return '<div class="anim" %s></div>' % " ".join(attrs)


def tag_of(r):
    p = preset_of(r)
    if p:
        t = f"[preset:{p}" + (f" +loop:{r['loop']}" if r.get("loop") else "") + "]"
        if url_of(r):
            t += " [+url]"
        elif search_of(r):
            t += " [+search]"
        return t
    if url_of(r):
        return "[url]"
    return f'[search-only: "{search_of(r) or "?"}"]'


# ---- commands ---------------------------------------------------------------
def cmd_list(category=None):
    rows = load_index()
    if category:
        rows = [r for r in rows if r["category"] == category]
        if not rows:
            cats = sorted({r["category"] for r in load_index()})
            sys.exit(f"No category '{category}'. Categories: {', '.join(cats)}")
    cats = {}
    for r in rows:
        cats.setdefault(r["category"], []).append(r)
    for cat, items in sorted(cats.items()):
        print(f"\n== {cat} ==")
        for r in items:
            print(f"  {r['id']:<22} {tag_of(r)}")
    allrows = load_index()
    n_pre = sum(1 for r in allrows if preset_of(r))
    n_url = sum(1 for r in allrows if url_of(r))
    n_so = sum(1 for r in allrows if not preset_of(r) and not url_of(r))
    print(f"\n{len(rows)} shown / {len(allrows)} concepts total: {n_pre} with an owned preset, "
          f"{n_url} with a direct URL, {n_so} search-only (no URL - find one, verify its license, then fetch).")
    print("Prefer [preset:*] - owned + render-safe.")


def cmd_search(q):
    words = q.lower().split()
    hits = []
    for r in load_index():
        hay = (r["id"] + " " + r["category"] + " " + " ".join(r.get("tags", []))).lower()
        score = sum(1 for w in words if w in hay)
        if score:
            hits.append((score, r))
    hits.sort(key=lambda x: (-x[0], x[1]["id"]))
    if not hits:
        print("No matches. Try a broader word, or `list` to browse.")
        return
    for _, r in hits[:12]:
        if preset_of(r):
            alt = ""
            if url_of(r):
                alt = f"   (or Lottie url: {url_of(r)})"
            elif search_of(r):
                alt = f'   (or Lottie search: "{search_of(r)}")'
            print(f"  {r['id']:<22} -> USE PRESET   {preset_markup(r)}{alt}")
        elif url_of(r):
            print(f"  {r['id']:<22} -> FETCH URL    {url_of(r)}")
        else:
            print(f"  {r['id']:<22} -> SEARCH-ONLY  no URL; search: \"{search_of(r)}\"  "
                  f"(license: {r.get('license_note', 'verify at source')})")
    if any(not preset_of(r) and not url_of(r) for _, r in hits[:12]):
        print(f"\nSearch-only: find the animation (e.g. lottiefiles.com/free), verify its license, then\n"
              f"  {SELF} fetch <url-or-downloaded-file> --out <project-dir> --id <id>")


def cmd_show(entry_id):
    for r in load_index():
        if r["id"] == entry_id:
            print(json.dumps(r, indent=2, ensure_ascii=False))
            if preset_of(r):
                print(f"\nRecommended: use the owned preset - no fetch needed:\n  {preset_markup(r)}")
                if r.get("note"):
                    print(f"  ({r['note']})")
                if url_of(r) or search_of(r):
                    print("\nRicher alternative: a fetched Lottie (" +
                          (f"url: {url_of(r)}" if url_of(r) else f"search: \"{search_of(r)}\"") + ").")
            elif url_of(r):
                print(f"\nNo owned preset. Verify the license at {url_of(r)}, then:")
                print(f"  {SELF} fetch {entry_id} --out <project-dir>")
            else:
                print(f"\nNo owned preset and no URL (search-only). Search a free Lottie for "
                      f"\"{search_of(r)}\", verify its license, then:")
                print(f"  {SELF} fetch <url-or-downloaded-file> --out <project-dir> --id {entry_id}")
            return
    sys.exit(f"No index entry '{entry_id}'. Try `list` or `search <words>`.")


def _read_source(src):
    """Bytes of a Lottie from an http(s) URL, a file:// URL or a local path."""
    if re.match(r"^https?://", src, re.I):
        print(f"[..] Fetching {src}")
        req = urllib.request.Request(src, headers={"User-Agent": "storyboard-lottie-fetch"})
        return urllib.request.urlopen(req, timeout=30).read()
    if src.lower().startswith("file://"):
        p = unquote(urlparse(src).path)
        if re.match(r"^/[A-Za-z]:", p):   # file:///C:/...
            p = p[1:]
        return Path(p).read_bytes()
    p = Path(src)
    if p.is_file():
        print(f"[..] Reading {p}")
        return p.read_bytes()
    raise FileNotFoundError(f"not a URL and no such file: {src}")


def _source_name(src):
    """File name of a source: the URL path's last segment, percent-decoded
    (http://host/my%20anim.json?x=1 -> 'my anim.json'), or a local file's name."""
    if re.match(r"^(https?|file)://", src, re.I):
        return unquote(urlparse(src).path.rstrip("/").split("/")[-1])
    return src.replace("\\", "/").rstrip("/").split("/")[-1]


def _lottie_json(data):
    """Parse Lottie JSON bytes; a .lottie (dotLottie zip) yields its first animation."""
    if data[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names = sorted(n for n in z.namelist() if n.lower().endswith(".json")
                           and n.lower().startswith("animations/"))
            if not names:
                raise ValueError("dotLottie archive has no animations/*.json")
            if len(names) > 1:
                print(f"[..] dotLottie holds {len(names)} animations; using {names[0]}")
            data = z.read(names[0])
    return json.loads(data.decode("utf-8-sig"))


def cmd_fetch(src, out_dir, entry_id, credit=None):
    # `fetch <index-id>` uses the entry's url when it has one
    if not re.match(r"^(https?|file)://", src, re.I) and not Path(src).exists():
        entry = next((r for r in load_index() if r["id"] == src), None)
        if entry is not None:
            if not url_of(entry):
                then = (f"pass its URL or the downloaded file:\n  {SELF} fetch <url-or-file> "
                        f"--out {_q(out_dir)} --id {_q(src)}")
                if preset_of(entry):
                    # nothing to download: the concept is covered by an owned engine preset
                    msg = (f"'{src}' has no Lottie URL - it maps to the owned preset "
                           f"{preset_of(entry)}, which needs no fetch (zero deps, render-safe):\n"
                           f"  {preset_markup(entry)}")
                    if entry.get("note"):
                        msg += f"\n  ({entry['note']})"
                    if search_of(entry):
                        msg += (f"\nFor a richer Lottie instead, search one for \"{search_of(entry)}\", "
                                f"verify its license, then {then}")
                    sys.exit(msg)
                sys.exit(f"'{src}' is a search-only entry (no URL). Search a Lottie for "
                         f"\"{search_of(entry) or src}\", verify its license, then {then}")
            entry_id = entry_id or src
            src = url_of(entry)
    try:
        data = _read_source(src)
    except Exception as e:
        sys.exit(f"Download failed: {e}")
    try:
        obj = _lottie_json(data)
    except Exception as e:
        sys.exit(f"Not a Lottie JSON ({e}). If it's a .lottie (dotLottie zip) make sure it is "
                 "the real file, or unzip it and point at the inner animations/*.json.")
    if not (isinstance(obj, dict) and "layers" in obj and ("v" in obj or "fr" in obj)):
        sys.exit("JSON doesn't look like a Lottie animation (missing 'layers'/'v'/'fr'). Double-check the source.")

    stem = entry_id or re.sub(r"\.(json|lottie)$", "", _source_name(src), flags=re.I)
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-.") or "animation"
    name = stem + ".json"
    dest_dir = Path(out_dir) / "assets" / "lottie"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / name
    replaced = dest.exists()
    dest.write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")

    # record attribution (one line per file; re-fetching the same file updates its line)
    credits = dest_dir / "CREDITS.md"
    if credit:
        source = credit
    elif re.match(r"^(https?|file)://", src, re.I):
        source = src
    else:
        source = f"local file {Path(src).resolve().as_posix()} (original URL unknown - add it here)"
    line = (f"- `{name}` - source: {source} - fetched {datetime.date.today().isoformat()} - "
            f"LICENSE: VERIFY at source before shipping\n")
    head = "# Lottie credits & licenses\n\nVerify each source's license before publishing this video.\n\n"
    old = credits.read_text(encoding="utf-8") if credits.exists() else ""
    kept = [ln for ln in old.splitlines(keepends=True) if not ln.startswith(f"- `{name}` ")]
    body = "".join(kept) if old.strip() else head
    if body and not body.endswith("\n"):
        body += "\n"
    credits.write_text(body + line, encoding="utf-8")

    kb = dest.stat().st_size / 1024
    fps = obj.get("fr") or 30
    frames = max(0, (obj.get("op") or 0) - (obj.get("ip") or 0))
    dur = f", {frames / fps:.1f}s @ {fps:g} fps" if frames else ""
    print(f"[ok] {'Replaced' if replaced else 'Saved'} {dest}  ({kb:.0f} KB{dur})")
    print(f"[ok] Recorded attribution in {credits}")
    print("\nUse it in the deck (deck at the project root):")
    print(f'  <div class="anim" data-anim="lottie" data-src="assets/lottie/{name}" data-t-rel="0.5" data-dur="3"></div>')
    print("\nReminder: confirm the source's license permits your use (commercial? attribution?).")
    return dest


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")
    ap.add_argument("--list", nargs="?", const="__all__", metavar="CATEGORY", help="List the index (optionally one category)")
    ap.add_argument("--search", metavar="QUERY", help="Fuzzy-search the index by keyword")
    ap.add_argument("--show", metavar="ID", help="Show one entry's recommendation")
    sl = sub.add_parser("list", help="List the index (optionally one category)")
    sl.add_argument("category", nargs="?")
    ss = sub.add_parser("search", help="Fuzzy-search the index by keyword")
    ss.add_argument("query", nargs="+")
    sh = sub.add_parser("show", help="Show one entry's recommendation")
    sh.add_argument("id")
    f = sub.add_parser("fetch", help="Download a Lottie (URL, local .json/.lottie file, or index id with a url) into a project")
    f.add_argument("src", metavar="url-or-file")
    f.add_argument("--out", required=True, help="Project directory (assets/lottie/ is created inside)")
    f.add_argument("--id", help="Entry id / filename stem")
    f.add_argument("--credit", metavar="URL", help="Original page/URL to record in CREDITS.md "
                   "(use it when fetching a downloaded local file)")
    args = ap.parse_args(argv)

    if args.cmd == "fetch":
        cmd_fetch(args.src, args.out, args.id, args.credit)
    elif args.cmd == "list":
        cmd_list(args.category)
    elif args.cmd == "search":
        cmd_search(" ".join(args.query))
    elif args.cmd == "show":
        cmd_show(args.id)
    elif args.show:
        cmd_show(args.show)
    elif args.search:
        cmd_search(args.search)
    elif args.list:
        cmd_list(None if args.list == "__all__" else args.list)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
