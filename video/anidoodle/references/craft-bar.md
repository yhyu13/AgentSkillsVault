# The craft bar

The test: would a proud human illustrator ship this, or is it mechanical shape-assembly?

| The tell | What passes |
|---|---|
| A subject built from ellipses and capsules | Hand-placed control points over real anatomy |
| One style recoloured to look like another | The mark, the edge and the order of marks all change |
| Boxes and arrows standing for an idea | A real machine that does what the idea describes while you watch, built from many small parts that each have a job (`machines.md`) |
| A line that stops in the air; a texture cut dead mid-surface | Lines meet another line or an edge; a row of ribs or pins thins out where the surface turns away |
| Parts floating off or sunk into each other | Parts touch the way real ones do (bolted, resting, butted against), each held by something; zoom to 3x on the joints |
| Flat colour fields | Wash, then pattern wet-on-damp, then line; one named light; cast shadows |
| Every stroke the same weight and speed | Long strokes fast, fiddly ones slow, thick-thin, tapered |
| Even scatter, one flower stamped 200 times | Hand-placed drifts with bare rests; 4-5 authored views per species |
| Gradient sky, disc sun, oval bokeh | Granulating wash, sun as paper left light, lost edges |
| Decoration | Every element has a one-line reason or it is not drawn |
| A row of style vignettes (film) | One arc. The medium changes only when the STORY changes state |
| Things fade or scale in | Marks are MADE, in the order a hand makes them |
| Both sides do the same thing at once | One side leads, by a few frames, never half a cycle |
| A hold | The camera may creep. The subject never stops |
| People with rubber joints, mitten hands, floating feet | A canon (heads tall for the age), joints within their limits, five fingers where seen, weight over the feet (`anatomy.md`) |
| The same character drawn differently shot to shot | One character module; shots pose it, never redraw it (`workflows/character-consistency.md`) |
| A silhouette filled with texture, no mouth line, no toes | Interior contours: mouth, eyelids, nostrils, toes, joins between forms (the detail pass below) |
| A drawing film where the finished picture fades in | Marks made in the medium's order; the last frames are the still (`workflows/drawing-process.md`) |
| Words laid over busy art, a face or the UI | Type gets its own frame by default; over the picture only as a composed label or kinetic line on a calm area (`workflows/launch-video.md`, Type) |
| A loop playing in place and called "alive" | Real travel through a world that changes as the subject moves |
| An unmatched hard cut or a sharp swoosh between scenes | A gentle move (a bloom, a flip, a push, the card grows into the frame), or a cut matched on shape, position or beat |
| Site art that brings its own background, so a pale box shows on a page of a different colour | `paper` is set to the page's exact colour and every neutral shifts to suit it; a light and a dark theme come out of the same code (`workflows/site-art.md`) |
| A part, a cast shadow or a highlight straying into the headline's space | Nothing is drawn in the headline zone, and `tools/placement.mjs` proves it |
| A spinner drawn as still blades turning slowly | Fainter copies of the blades, each a little further back, over a faint swept shape (`spin`), so it reads as speed |

**No dead air** in anything that moves: something visibly changes in every second, from frame 0.
Check it with the tool AND by eye: a creeping camera changes every pixel and satisfies the tool
while the eye sees a still.


**Words get time to be read, and a quiet ground.** A text stays on screen at least
`max(0.7 s, 0.3 s per word)`: "ART OUT." needs 0.7 s, a six-word line 1.8 s. Count from the frame
the last word is whole, and give a slower audience (children, a second language) more. Text is
never set over a busy picture without a plate under it: a solid or softly tinted panel, a scrim, or
a clear patch of the drawing, so every letter has a ground it can be read against. Squint at the
frame; if a letter disappears, the plate is missing. `framecheck.mjs` holds the first rule on every
declared text cue (`meta.captions`) and reports N/A for a film that declares none; the second is a
review finding (`workflows/review.md`), because only an eye can judge busy.

**Judge the design, not only the collisions.** A review still can have nothing overlapping and
still fail: no hierarchy, cramped spacing, a frame that would not pass as a poster. Look at each
review frame as a designer first, a checker second.

**Preview options before full renders.** When a choice is open (a transition, a lettering
medium, a palette), show a cheap still sheet of the options side by side and let the person
pick. A full render per option spends the most expensive resource on the cheapest question.

## The detail pass (run it on every piece before showing it)

A silhouette filled with texture is not a drawing. Before any still, recreation or character is
shown, crop into it at full size and check the interior, because that is where a viewer looks:

- **Faces**: the mouth line and the split of the upper lip, the chin, the nose's outline and
  nostrils, both eyelids and the inner corner of the eye, brow markings, the ear's inner rim.
- **Hands, paws and feet**: every finger or toe separated, knuckles and pads where they show, nails
  or claws, the way the foot meets the ground (contact shadow, weight).
- **Joins between forms**: where a leg meets the body, where an arm crosses the chest, where cloth
  folds at a joint. These are contour lines inside the silhouette, thinner than the outline and
  broken where light hits.
- **Markings and pattern**: stripes, spots, seams and patches follow the form's surface, not the
  picture plane.
- **Recreations from a photo**: trace each of the above from the photo and overlay-check it; tone
  alone never supplies interior lines.

Each medium says it in its own way (a carved keyblock line, a scratched cut, a pencil accent, a darker
brick), but none of them may leave it out.
