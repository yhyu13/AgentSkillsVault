"""Verify the post-removal state of the four harness skill stores."""
import os, sys, hashlib
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

home = Path(os.path.expanduser("~"))
stores = {n: home / f".{n}/skills" for n in ("claude", "kilo", "agents", "codex")}
vault = Path(".").resolve()

removed = [l.strip() for l in
           (vault / ".kilo/removed-skills.txt").read_text(encoding="utf-8").splitlines()
           if l.strip() and not l.startswith("#")]

def dirs(root):
    return sorted(p.name for p in root.iterdir() if p.is_dir()) if root.is_dir() else []

def digest(path):
    h = hashlib.sha256()
    for f in sorted(path.rglob("*")):
        if f.is_file():
            h.update(str(f.relative_to(path)).encode())
            h.update(f.read_bytes())
    return h.hexdigest()[:12]

print("== store sizes ==")
sets = {}
for n, r in stores.items():
    sets[n] = dirs(r)
    print(f"  {n:8s} {len(sets[n])} skills")

print("\n== identical skill sets across harnesses ==")
base = sets["claude"]
for n in ("kilo", "agents", "codex"):
    print(f"  claude vs {n:8s}: {'IDENTICAL' if sets[n] == base else 'DIFFERS'}")

print("\n== byte-identical content (sampled) ==")
sample = base[::max(1, len(base)//12)][:12]
bad = []
for s in sample:
    d = {n: digest(stores[n] / s) for n in stores if (stores[n] / s).exists()}
    if len(set(d.values())) != 1:
        bad.append((s, d))
print(f"  sampled {len(sample)} skills: {'ALL IDENTICAL' if not bad else bad}")

print("\n== removed skills still present anywhere? ==")
for n, r in stores.items():
    left = [s for s in removed if (r / s).exists()]
    print(f"  {n:8s} leftover: {len(left)} {left if left else ''}")

print("\n== every installed skill has a source in the vault ==")
missing = []
for s in base:
    src = [p for p in vault.rglob(s)
           if p.is_dir() and (p / "SKILL.md").is_file()
           and ".git" not in p.parts and "node_modules" not in p.parts]
    if not src:
        missing.append(s)
print(f"  orphaned installs: {len(missing)} {missing if missing else ''}")

print("\n== agent store entries are junctions onto .claude ==")
ag = stores["agents"]
links = sum(1 for p in ag.iterdir()
            if p.is_dir() and os.path.islink(str(p)))
print(f"  link-typed entries: {links}/{len(dirs(ag))}")
