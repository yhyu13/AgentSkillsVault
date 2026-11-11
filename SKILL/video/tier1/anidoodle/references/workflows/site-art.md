# Site art: a picture that works on someone's page

A hero beside a headline, a feature card, a row of icons, a link preview. The picture no longer owns
its canvas: the page's words, colour and brand come first, and the art is drawn to live among them.
Kit: `engine/src/canvas-core/assetKit.ts`. Worked example: `siteHero.ts` (a light page) and
`siteHeroDark.ts` (a dark one), both drawn by the same code.

## 1. Start from the page, not the picture

Before choosing a subject, write down what the page already decides:

1. **The slot:** which section, what sits beside or above the art, the size it is shown at.
2. **The page colour,** exactly, and whether the site also has a dark theme.
3. **The brand colour,** as one hex, and any material the brand is known for (walnut, brass, matte black).
4. **The sentence the art must back up:** usually the headline next to it.
5. **The style:** any of the 32. The page constrains placement and colour, never the medium.

## 2. Pick an object that does what the product does

Read the sentence from step 1 and ask what the product *does*, as a verb: sorts, connects, protects,
repeats, measures. Then find a made object that performs that verb visibly, and build it as a machine
(`machines.md`), so its working carries the message without a caption. Put two or three candidates
to the user, a line each, name the one you favour and the reason, and go ahead with it unless they
pick another. When the user has already named the object, skip straight to building it.

| What the page promises | A made thing that shows it |
|---|---|
| keeps everything findable | A post-office sorting frame, every letter in its slot, one being placed |
| sets up in minutes | A flat-pack chair half assembled, the last dowel going in |
| connects a team | A switchboard, one cable mid-plug, a lamp lit |
| keeps things private | A letterbox with a combination dial, its flap shut |
| automates a chain of steps | A marble run: one marble on the track, the next waiting at the gate |
| turns data into insight | A weather station: anemometer turning, barometer needle, a logbook |
| translates | A typewriter with two type baskets, one key mid-strike |
| grows savings | A coin sorter with tubes by size, one coin rolling down the ramp |
| teaches | A desk globe on a brass meridian, a pin in one city |
| makes music | A cylinder music box, the drum turning, the governor a blur |

Hold the object's outline up to the space it will fill. Art beside the words suits a broad shape,
art under the words suits a low, stretched one, and an icon wants a single tight thing.

## 3. One place for the eye

Choose the single part that shows the verb happening (the letter going into its slot, the dowel
going in) and give it the accent material (`accent: true`). `strongPoint(p)` gives a good spot for
it: a third of the way in, leaning toward the words, or centred when the words sit above.

## 4. Placement

`PLACEMENTS` holds a canvas, an art region and, where there are words, a headline zone for each slot:
heroSide, heroSideLeft, heroStack, art, card, icon, strip, social, slide. Fit the object into its
region with `Cam.fit(A, E, points, fitBox(p))`. Give it every point that could stick out, a raised
or exploded part included, or the fit will crop it. Swing the azimuth until the side where the work
happens looks toward the words. Nothing at all is drawn inside the headline zone, and that includes
a cast shadow or a soft highlight. Check it on a rendered still:
`node tools/placement.mjs still.png --W <meta.W> --safe x,y,w,h`.

## 5. The page's colour, light and dark

`setPalette(pagePalette({ paper, accent, colours, tint }))` carries every material over to the page,
so the machine belongs to it. On a light page each neutral shifts by however much lighter or darker
the page is than the kit's cream, and `tint` (0 to 1) decides how much of the page's hue the greys
pick up as well. On a dark page the parts rise only a little above the page: the lit tops are the
lightest thing, and lines are drawn lighter than the faces they edge. Paint the background in
`paper` and nothing else; a near miss draws a pale rim round every part. A site with a light and a
dark theme gets both pictures from the same code, through `heroOn(title, paper, accent)`.

## 6. The brand's colour

`accent: "#hex"` colours the part from step 3. `colours: { wood: "#7a5536" }` recolours any
material by name, which is also how a brand's signature material is made. Two modes:

- **solid** (default): the whole part takes the brand colour. Its five shades all keep that hue,
  and their lightness is held in a range where each shade is still told apart from the next and
  none of them burns too bright against a dark background;
- **lines**: the faces keep their neutral greys and the colour goes only into the strokes and dots,
  which suits a pointer, a gauge needle or an engraved mark.

Put the brand on the part from step 3, and at most once more somewhere small. A brand colour that
also covers the base and the large panels no longer tells the eye where to go.

## 7. Let it move the way it works

Loop one whole cycle of the machine so it repeats without a seam. Animate the parts the real thing
would move, and nothing else. A part that turns too fast to see clearly gets
`spin(angle, sweep, draw, { swept })`: fainter copies of the blades, each a little further back,
over a faint swept shape, so the eye reads speed rather than slow turning. Next to a headline,
quiet is better: when the real machine barely moves, say so with a `meta.holds` reason instead of
inventing movement. A visitor who asks for reduced motion sees frame 0 and nothing more, so build
frame 0 as a finished picture in its own right.

## 8. Families of pictures, and tiny ones

When several pictures will sit together (a row of cards, a strip of icons), build them all from the
same bin of parts: one screw, one foot, one edge bevel, one camera angle, one accent. Then they
look like siblings. Compare how busy each one is and bring the emptiest up to the others, not the
fullest down. At icon size, use fewer parts and make each one bigger, and leave out fine ticks
altogether. Render each picture at the size the page will actually show it, and again at phone
width (`placement.mjs --phone out.png`), and look at both.
