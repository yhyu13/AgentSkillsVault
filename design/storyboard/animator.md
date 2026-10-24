# The animator's brain — senior direction

You are not decorating slides. You are **directing motion** in service of a story told by a voice. Read this before you author a single `data-anim`. It is the difference between a deck that *has animations* and a film that *moves*.

> The junior asks "what preset goes here?" The senior asks "where is the viewer's eye, what does this beat make them feel, and what is the least motion that earns it?" Tools are listed in `animations.md`. This file is judgment.

---

## The five marks of a senior animator

A reviewer can tell senior work from junior work in ten seconds. Here is what they're seeing:

1. **Hierarchy** — at every instant, one thing is clearly the most important. The eye is *led*, never lost. Junior work animates everything equally, so nothing reads.
2. **Continuity** — motion flows *across* cuts. Energy, direction, and a recurring motif carry through. Junior work resets to zero every slide.
3. **Restraint** — most of the frame is calm so the one moving thing lands. Junior work moves constantly and exhausts the viewer.
4. **Timing as music** — motion sits *on* the narration's rhythm; pauses are used, not feared. Junior work is metronomic and ignores the voice.
5. **Weight** — things have mass: they anticipate, overshoot, settle, and follow through. Junior work uses linear fades that feel like PowerPoint.

Everything below serves these five.

---

## 1. Composition & staging — direct the eye

Before motion, **compose the still frame.** If a paused frame is unbalanced, no animation will save it.

### Focal hierarchy (the one rule)
Every beat has exactly **one** primary element, optionally one secondary, and everything else is context. Encode the hierarchy three ways at once:
- **Size**: the focal element is decisively bigger. No timid 1.2× — go 2–3× the secondary.
- **Contrast**: focal is brightest/most-saturated against a calm field. Dim or desaturate context (`defocus`, lower opacity, `cinematicGrade` to sink the edges).
- **Motion**: the focal element gets the richest entrance + the only loop. Context arrives quietly (`fadeIn`) or is already present.

If two things compete for attention, you have failed staging — pick one, demote the other.

### Lead the eye between beats
The viewer's eye has a position when a slide ends. **Start the next beat's focal element near where their eye just was**, then move it where you want them looking. `data-shared-id` (shared-element morph) is the literal tool; even without it, place the new hero where the old one died and let it travel.

### Depth — stage in planes (the multiplane camera)
Flat decks read as flat. Real scenes have foreground, midground, background. Use `data-plane` layers inside a `.camera`: background (`data-plane="0.3"`) drifts slowly, foreground (`data-plane="1.8"`) races — during any camera push/pan this manufactures genuine 3D depth (the Disney multiplane camera). Put atmosphere on the back plane, the subject on the neutral plane (≈1.0), a few accent particles on the front plane. The parallax does the rest.

### Negative space & the rule of thirds
Crowding kills impact. A single line of text in a sea of black out-performs a busy grid every time. Push the focal element off dead-center onto a thirds line when the composition allows; reserve true center for the most monumental, symmetrical moments (the final CTA, the one big number).

---

## 2. Micro-choreography — give motion weight

This is the craft that separates animation from transitions. Inside a single entrance:

### Anticipation → action → follow-through
Real motion winds up before it strikes and settles after it lands. The engine's `anticipate`, `overshoot`, `spring`, and `bounce` bake this in — *use them on the elements that matter* instead of `fadeUp` on everything. Tune the spring: premium/calm = `data-spring="120,18"` (gentle), playful = `data-spring="260,10"` (springy), urgent = stiff and fast.

### Overlapping action & follow-through (the anti-robot rule)
Parts of a thing do **not** move in lockstep. When a card flies in, its shadow, its label, and its icon should settle at *slightly* different times. Author this with `data-stagger` on groups (0.06–0.10s = energetic, 0.12–0.18s = deliberate) and with `data-then` chains so a secondary detail lands *after* the primary. Never reveal a container and its contents on the same frame.

### Moving holds — never let a frame die
A senior animator's secret: **nothing is ever perfectly still.** After an element settles, it keeps breathing imperceptibly. Add `data-hold="breathe"` (or `float`/`sway`) to hero elements — a 2–4px / 2–3% idle that the viewer never consciously notices but feels. A held frame with zero motion reads as "the video froze." Apply moving holds to every hero that stays on screen >4s.

### Secondary action
The main action gets support from a smaller, non-competing motion: a glow pulse under a CTA, particles drifting behind a title, a back-plane parallax. Secondary action enriches; it must never out-shout the primary.

### Slow in / slow out, always
Linear motion is the mark of the amateur. Every preset eases by default; when you override with `data-ease`, reach for `outQuint`/`outBack`/`spring`, almost never `linear` (linear is only for a mechanical readout like a stopwatch).

---

## 3. Timing as music — sit on the voice

The narration is the rhythm track. Motion that ignores it feels pasted on; motion locked to it feels *scored*.

- **Land the hit on the word.** When the VO stresses the key word, the visual accent fires on that exact syllable — pull the time from the word-timestamps and put a `highlight`, `circleScribble`, or `shake` there. This lockstep is the single biggest "this is professional" tell.
- **Phrase the entrances.** `wordReveal` and `wordSwap` should reveal at the narrator's actual pace, not a generic stagger. Three phrases said over 3 seconds = a 3-second `wordSwap`.
- **Use the rest.** Silence is a frame. After a heavy beat (a problem stated, a number landed), give one beat with almost no motion — a `breathe`-held title and nothing else. The pause makes the next hit land. A reel with no rests is a reel with no peaks.
- **Match duration to weight.** Big moment = slow (1.4–2.0s). Connective = medium (0.8–1.2s). Accent = fast (0.3–0.5s). A 2.5s counter on a throwaway number is as wrong as a 0.4s reveal on the hero line.

### The energy arc
The concept's `emotional_arc` (energy 1–5 per beat) is your spend plan. **Peaks** (5): signature emphasis + a non-cut transition in + maybe beat-sync + the loud text FX. **Valleys** (1–2): the breath — one quiet entrance, no transition, no loud loop. If every beat is a 4–5 it flattens to noise; the valleys are what *make* the peaks. Audit your build: no value ≤2 means no breath; all 4–5 means nothing peaks.

---

## 4. Continuity & through-lines — make it one film

Junior decks are 15 unrelated slides. Senior decks are one continuous piece.

- **Signature motion.** Pick ONE emphasis preset (e.g. `spring`) and reuse it on your 3 biggest moments. The viewer's brain learns "this motion = this matters." Introducing a new flashy preset every slide reads as a sampler, not a style.
- **Signature ease.** Drive ~80% of motion with one curve. Coherence of *timing* is as important as coherence of color.
- **One transition family.** Most slides `cut`/`crossDissolve`; reserve the showy transitions for the 2–3 pivots that earn them (problem→solution, the reveal, the CTA). Pick the pair your style prescribes (see `styles.md`) and stay in it.
- **A recurring visual motif.** A shape, a color accent, a particle, a piece of the brand that appears across beats and pays off at the end. The breathing circle that opens and closes the Help Me Breathe deck; the gradient word that returns on the CTA.
- **Motion hand-off.** Exit a beat in the direction the next enters. If slide N's element `slideOutLeft`s, slide N+1's hero comes from the right — the eye tracks the momentum across the cut. Use `data-exit` + the matching transition direction.

---

## 5. The grade — make it look like film, not a webpage

A senior never ships an ungraded frame. Two cheap, universal lifts:
- **`cinematicGrade`** — a full-bleed overlay (vignette + corner falloff + multiply) that sinks the edges and focuses the center. Drop it on top of any bright or photographic slide and it instantly looks color-graded instead of web-flat.
- **`filmGrain`** — a whisper of animated grain (opacity 0.05–0.10) over the whole deck unifies disparate slides into one texture and kills the "clean vector" sterility. Add once, low.
- **Depth of field** — `rackFocus` to pull focus onto an arriving subject; `defocus` to push context back a plane. Sharpness *is* hierarchy: the sharp thing is the important thing.

---

## How to direct a single beat (senior workflow)

For each beat, decide in this order — composition first, motion last:

1. **Intent.** One sentence: what does this beat make the viewer understand or feel? If you can't say it, the beat has no reason to move.
2. **Focal element.** What is the one thing? Stage it: biggest, brightest, off-thirds or centered by weight.
3. **Depth.** What's on the back plane (atmosphere), the subject plane, the front plane (accents)? Is there a camera move to motivate parallax?
4. **Entrance choreography.** Focal gets anticipation→settle (signature emphasis if it's a peak). Context arrives quiet and earlier. Stagger groups; chain secondary details.
5. **The hit.** Is there a word in the VO this beat should land on? Put the accent there.
6. **The hold.** Add a moving hold to anything staying >4s. Decide the breath if this is a valley.
7. **The exit & hand-off.** How does this beat leave, and does it set up the next one's entrance direction?
8. **The grade.** Vignette/grain/DOF as needed so the frame reads as film.
9. **Math check.** Last entrance finishes ≥0.4s before the next cue. Nothing dead, nothing clipped.

If a beat takes more than a minute to direct, you're overworking it — most beats are 3–6 authored elements.

---

## Anti-patterns (the junior tells)

- **Everything `fadeUp`, staggered.** The default-deck smell. Vary by intent.
- **No focal hierarchy** — three things the same size animating at once. Pick one.
- **Constant motion, no rests.** Exhausting. Build valleys.
- **A new flashy preset every slide.** Sampler, not style. Commit to a signature.
- **Frozen held frames.** Add moving holds.
- **Flat, ungraded, centered-everything.** Add depth planes, a grade, and use the thirds.
- **Motion that ignores the voice.** Land hits on words; use the pauses.
- **Linear easing.** Never, except mechanical readouts.
- **Animations finishing after the cut.** The payoff is never seen. Do the math.

---

## The senior self-review (run this before declaring done)

Watch it back (or scrub the frames) and ask:
1. At every instant, is it obvious where to look? (hierarchy)
2. Does it feel like one film or 15 slides? (continuity — signature motion, motif, hand-offs)
3. Is there at least one true breath? (restraint)
4. Do the accents land on the narrated words? (timing)
5. Does anything sit dead-still on screen? (moving holds)
6. Does any frame look like an un-graded webpage? (the grade)
7. Could I remove 20% of the motion and make it *better*? (almost always yes — do it)

If any answer is "no," it's not done. Senior work is iterated, not one-shot.


---

# v0.7 dazzle craft — fun, not gimmicky

The fun pack makes videos *delightful* — but loud effects are seasoning, not the meal.

- **One celebration per payoff.** `confettiBurst`/`fireworks`/`partyPopper`/`badgeUnlock` land on the win (the result, the CTA success, the "we did it" beat). Two in a row cancel each other out.
- **Loaders & status are functional dazzle** — `spinner`, `dotsLoader`, `checkDraw`, `crossDraw`, `waveform` make process/UI beats feel alive and are safe to use freely (they read as "the product working," not confetti).
- **Ambient loops fill, don't shout** — `sparkle`, `floatEmojis`, `confettiRain`, `pulseRings` behind content on energetic beats. Keep them low-contrast so they don't fight the message.
- **Emoji presets are cheap delight** — `emojiPop`/`heartBeat`/`thumbsUp`/`rocketLaunch` are colorful, universal, zero-asset. Great for social/hype cuts; use `data-emoji` to fit the topic.
- **Match dazzle to the style's energy** (see styles.md): `playful-pop`/`kurzgesagt`/`neon-tech` lean in; `apple-keynote`/`documentary`/`data-journalism` stay restrained (a single `checkDraw` or `counter`, not confetti).
- **Extended quality ladder:** transitions → living bg → kinetic type + annotations → data/flows/demos/code → **payoff dazzle (fun pack) on the win**. The dazzle is the last 5%; it shines only because the 95% beneath it is solid.
