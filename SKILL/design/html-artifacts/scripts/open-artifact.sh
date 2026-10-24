#!/usr/bin/env bash
# open-artifact.sh — save a self-contained HTML artifact into ~/.claude/artifacts
# and pop it open in the default browser. Part of the `html-artifacts` skill.
#
# Usage:
#   open-artifact.sh <slug> <source.html>     # copy an existing file
#   ... | open-artifact.sh <slug>             # read HTML from stdin
#
# <slug> may omit the .html extension. Output: ~/.claude/artifacts/<slug>.html
# Prints the absolute path on success.
set -euo pipefail

ART_DIR="${HOME}/.claude/artifacts"

if [[ $# -lt 1 || -z "${1:-}" ]]; then
  echo "usage: open-artifact.sh <slug> [source.html]   (or pipe HTML via stdin)" >&2
  exit 2
fi

slug="$1"; src="${2:-}"
# normalize: strip any path, force a single .html extension
slug="$(basename "$slug")"
slug="${slug%.html}"
[[ -n "$slug" ]] || { echo "error: empty slug" >&2; exit 2; }

mkdir -p "$ART_DIR"
dest="${ART_DIR}/${slug}.html"

if [[ -n "$src" ]]; then
  [[ -f "$src" ]] || { echo "error: source not found: $src" >&2; exit 1; }
  cp "$src" "$dest"
elif [[ ! -t 0 ]]; then
  cat > "$dest"
else
  echo "error: no source file and nothing on stdin" >&2
  exit 2
fi

[[ -s "$dest" ]] || { echo "error: wrote empty file: $dest" >&2; exit 1; }

# Pop it open for the user to look at (macOS `open`; fall back to xdg-open).
if command -v open >/dev/null 2>&1; then
  open "$dest"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$dest" >/dev/null 2>&1 || true
else
  echo "note: no opener found (open/xdg-open); file saved but not popped open" >&2
fi

echo "$dest"
