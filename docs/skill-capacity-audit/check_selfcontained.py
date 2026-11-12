#!/usr/bin/env python3
"""
Self-containment checker for skill packages.

A skill is installed by copying (or junctioning) its OWN directory into a store,
so every path it names must resolve INSIDE that directory. The older
`_check_refs.py` in 个人成长 only tested os.path.exists() on the resolved path;
that passes for `../sibling/SKILL.md` whenever the siblings happen to be
installed side by side, which hides the defect instead of finding it.

What this flags, per skill:
  ESCAPE     a reference resolves outside the skill dir (`../x`, `../../x`)
  ABSOLUTE   a Windows drive path or a ~/ /home/ path baked into the text
  MISSING    a relative reference that does not exist inside the skill dir
  OUTSIDE-NAME  a bare `name/SKILL.md` that names another package

Usage:
  python -I check_selfcontained.py <skill-dir> [<skill-dir> ...]
  python -I check_selfcontained.py --root <skills-dir>     # every child with SKILL.md
Exit code 1 if any skill has a problem.
"""
import argparse
import os
import re
import sys

# `path/to/file.ext` in backticks, and [text](path/to/file.ext) links.
BACKTICK_RE = re.compile(r"`([^`\n]+?)`")
LINK_RE = re.compile(r"\]\(([^)\s]+)\)")
EXT = (".md", ".js", ".mjs", ".ts", ".tsx", ".html", ".css", ".mp3", ".wav",
       ".png", ".jpg", ".jpeg", ".svg", ".json", ".py", ".sh", ".ps1", ".mp4")
ABS_WIN_RE = re.compile(r"^[A-Za-z]:\\")
ABS_POSIX_RE = re.compile(r"^(/|~/|\\\\)")
# A bare relative path that looks like a file in the package.
REL_RE = re.compile(r"^(?:\./)?[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)*\.[A-Za-z0-9]+$")


def collect_refs(text):
    refs = []
    for m in BACKTICK_RE.finditer(text):
        refs.append(m.group(1).strip())
    for m in LINK_RE.finditer(text):
        refs.append(m.group(1).strip())
    return refs


PAYLOAD_PREFIXES = ("references/", "scripts/", "assets/", "templates/", "kit/",
                    "examples/", "teaching/", "shots/", "playground/", "./")


def _basenames(skill_dir):
    out = set()
    for root, dirs, files in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        out.update(files)
    return out


def classify(ref, skill_dir, bnames=None):
    """Return (kind, detail) or None when the ref is not a package path at all."""
    if not ref or ref.startswith("#") or ref.startswith("http://") or ref.startswith("https://"):
        return None
    if " " in ref and not REL_RE.match(ref):
        return None            # prose in backticks ("npm install -g foo")
    if ABS_WIN_RE.match(ref) or ABS_POSIX_RE.match(ref):
        return ("ABSOLUTE", ref)
    if not (ref.lower().endswith(EXT) or "/" in ref):
        return None
    if not REL_RE.match(ref):
        return None

    target = os.path.normpath(os.path.join(skill_dir, ref))
    root = os.path.normpath(skill_dir)
    inside = (target == root) or target.startswith(root + os.sep)
    if not inside:
        return ("ESCAPE", ref)          # the real self-containment defect
    if os.path.exists(target):
        return None

    # Not on disk under the named path. Decide whether it was meant to be payload:
    # a payload directory prefix, or a basename that really ships in the package.
    # Anything else is a project output / artifact name ("out/final.mp4",
    # "REHEARSAL.md beside the component") and is not a defect.
    lowered = ref.lower()
    has_payload_prefix = any(lowered.startswith(p) for p in PAYLOAD_PREFIXES) or "/" not in ref
    if "/" not in ref:
        if bnames is None:
            bnames = _basenames(skill_dir)
        if os.path.basename(ref) in bnames:
            return None                 # ships elsewhere in the package (e.g. kit/stageshow.css)
        return None                     # an output file the run creates
    if not has_payload_prefix:
        return None                     # e.g. reel/narration.json — project output
    # `name/SKILL.md` naming another package reads as a sibling reference.
    if ref.endswith("/SKILL.md") and not ref.startswith("."):
        return ("OUTSIDE-NAME", ref)
    return ("MISSING", ref)


def check(skill_dir):
    skill_dir = os.path.abspath(skill_dir)
    sk = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(sk):
        return None
    text = open(sk, encoding="utf-8").read()
    bnames = _basenames(skill_dir)
    problems = []
    seen = set()
    for ref in collect_refs(text):
        if ref in seen:
            continue
        seen.add(ref)
        try:
            r = classify(ref, skill_dir, bnames)
        except Exception:
            continue
        if r:
            problems.append(r)
    return {"skill": os.path.basename(skill_dir), "dir": skill_dir,
            "refs": len(seen), "problems": problems}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--root")
    args = ap.parse_args(argv)

    targets = list(args.paths)
    if args.root:
        root = args.root
        targets += [os.path.join(root, d) for d in sorted(os.listdir(root))
                    if os.path.isdir(os.path.join(root, d))]
    if not targets:
        ap.error("give at least one skill dir, or --root")

    bad = 0
    for t in targets:
        r = check(t)
        if r is None:
            print(f"SKIP\t{t}\t(no SKILL.md)")
            continue
        status = "OK" if not r["problems"] else "FAIL"
        if r["problems"]:
            bad += 1
        print(f"{status}\t{r['skill']}\t{r['refs']} refs")
        for kind, ref in r["problems"]:
            print(f"    {kind:<13} {ref}")
    print(f"\nskills={len([t for t in targets if check(t)])} with_problems={bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
