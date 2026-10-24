# Adapt a style from a picture someone brings

"Here is an image, draw in that style." The rule: **borrow the hand, never the picture.** A hand
is a way of making marks: what touches the paper, what the edge does, the order things go down,
the paper, the palette. The picture is the subject, the composition and the layout, and none of
that crosses over.

Numbers help you look; they do not decide. Every statistic of an image mixes subject, layout,
lighting and medium, so a mostly empty page reads "light, few edges" whatever hand drew it, and
lettering reads as "line". The verdict is a written recipe and a side-by-side of a DIFFERENT
subject drawn in that hand. (On the two proofs below, the statistical nearest plate was wrong
both times: charcoal and broken-colour for a watercolour, wren for a scrapbook.)

## The workflow

1. **Analyze.** `node tools/analyze-style.mjs <image> --json <dir>/profile.json` (from `engine/`).
   Exclude anything that is not the hand, UI above all: `--exclude x,y,w,h;x,y,w,h`, or
   `--crop x,y,w,h` to a clean region. It prints palette (OKLab k-means, paper and ink, area
   shares), value key and contrast, line presence and width, fill direction and coherence
   (structure tensor on the grain), stroke length, speckle, pooled rims, edge hardness shares,
   spectrum slope, a periodic lattice (halftone or regular ruling), and the nearest plates with
   the numbers that match and differ.
2. **Look.** Open the image at full size AND at a 3x crop of a busy region. Write what you see
   before trusting any number. Read the profile only for what the eye can miss: a stroke
   direction, a halftone pitch, whether edges pool.
3. **Write the MEDIUM RECIPE in words**, as the header comment of a new plate, before any code:
   - **MARK**: what touches the paper, how wet or dry, what one unit mark is.
   - **EDGE**: hard, soft, lost, pooled, torn, deckled; where the edge darkens or disappears.
   - **ORDER**: what goes down first and what last. The order is half the hand.
   - **PAPER**: colour, tooth, age; which tiles at what opacity.
   - **PALETTE**: the colours, and the value range they live in.
   Add what it is NOT: which plate it is nearest, and the one or two things that make it differ.
4. **Pick or grow the nearest plate.** Nearest by eye, with the profile as a tiebreak. Reuse its
   kit and change the MARK; a recolour is a failure (`references/styles.md`, "Your own style").
5. **Draw a DIFFERENT subject in that hand.** New subject, new composition, same recipe. The
   subject must still read: give it its own value step and temperature against the ground.
6. **Compare side by side**: `node tools/compare.mjs <reference> <new.png> --out compare.png
   [--exclude ...]`. Critique in writing: mark, edge, order, paper, palette, one line each,
   "matches" or "differs because". Re-run `analyze-style.mjs` on your still as a diagnostic.
7. **Iterate** on the recipe, not on the numbers. Two or three rounds is normal.
8. **Save it as a house style**: `styles/house/<name>.json` with the plate, the recipe, key
   params, the profile summary, and provenance: the reference's sha256, its filename, the date,
   who brought it, `embedded: false`, and a sentence on what was NOT taken from it. From then on
   every piece for that brand uses that hand.

## The no-copy rule

- Never trace, re-lay-out or re-stage the reference. Its subject, composition, characters,
  signature motifs and text are not material. A living artist's signature motifs are never
  reproduced; ids and labels use technique names.
- No reference pixel is ever drawn. The art core never reads the image; only the tools do.
- The user's own image may be EMBEDDED (as an asset) only when they ask for exactly that.
- SSIM or pHash distance cannot certify "not a copy", and a small style distance cannot
  certify "a convincing adaptation". The rule is kept by construction: new subject, new layout.
- Teach mode is the one sibling allowed to follow a picture closely: see `teach-drawing.md`.

## Proofs (2026-09-25)

| Reference | Hand, in one line | New plate | Proof |
|---|---|---|---|
| a pastel watercolour backdrop (terminal UI excluded) | jagged-coast puddles, pooled rims, bare-paper rests, spatter, gouache sparkles | `adaptAquarelle.ts`, a moon jellyfish | `styles/house/pastel-blotch.json` |
| an explainer frame (Ritwika, f_10) | tidy torn pastel cards with soft shadows, typewriter, thin pen diagrams, one engraving | `adaptScrapbook.ts`, why sourdough rises | `styles/house/quiet-scrapbook.json` |
| Van Gogh, *Almond Blossom* (1890, public domain) | short loaded oil strokes in turning patches, a broken blue-green contour laid last, thick ridged whites | `adaptAlmond.ts`, the launch film's koi in its pond | `styles/house/almond-blossom.json` |

## A MEDIUM RECIPE, filled in (the almond proof)

The analyzer's nearest plates were charcoal and storybook; by eye it was `paintedOil`, so the
plate reuses the painted-oil kit and changes the mark. The recipe, as written in the plate's
header before any code:

- **MARK**: opaque oil, a loaded bristle brush, strokes about a finger long. The ground is laid in
  small patches of strokes sharing a direction, the patches turning against each other. Forms are
  painted along their length. Lights are thick and ridged.
- **EDGE**: hard. A dark blue-green contour laid last with a small round brush, broken, heavier on
  the shadow side. Nothing blended across an edge.
- **ORDER**: the ground everywhere; forms in their mid tone; lights; the contour; the last whites.
- **PAPER**: primed linen, the weave showing through the thinner ground strokes.
- **PALETTE**: a narrow, high-key turquoise ground; sage for forms; cream and lead white; one
  vermilion; no black anywhere (the darkest note is the contour).
- **NOT**: `paintedOil` models form in depth; this hand keeps the ground flat and decorative with
  one step of shadow. The subject is the film's own koi, never the painting's branch.

The reference itself lives in the anidoodle repository at `engine/assets/refs/` (not in the installed plugin), the one image in
the repo not drawn by code: public domain (Van Gogh died in 1890; a faithful photograph of a 2D
public-domain work), downloaded from Wikimedia Commons and kept byte-identical, with its source,
licence and sha256 in `engine/assets/refs/PROVENANCE.json`. The launch films show it only as the
picture the user attaches in the chat; `adaptAlmond.ts` never reads it. Any reference you ship
this way gets the same record, and only a work that is actually public domain qualifies.
