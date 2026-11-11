# Mood mapping: from a feeling to numbers

Listeners agree on the emotion a piece *expresses* well above chance, and they agree because of a
small set of structural cues. Those cues combine additively and redundantly: no single cue decides,
and several pointing the same way make the emotion unmistakable (Juslin 2001, the lens model;
Gabrielsson & Lindström 2010; Juslin & Laukka 2003). Composing a mood means aligning the cues.
`craft`'s **mood** line checks tempo, mode family, melody register, note density, harmonic rhythm and
(in `check`) brightness against the row for your declared mood (`tables.ts` `MOODS`).

## 1. The cues, strongest first (Gabrielsson & Lindström 2010, summary of ~100 studies)

| Cue | Toward happy / energetic | Toward sad / calm | Toward fear / anger |
|---|---|---|---|
| Tempo | fast | slow | fast (anger) or irregular (fear) |
| Mode | major | minor | minor, chromatic, atonal |
| Loudness | loud-moderate | soft | loud (anger), soft with big swings (fear) |
| Register (pitch height) | high | low | low rumble or extreme high |
| Harmony | simple, consonant | consonant or mildly dissonant | dissonant, clusters, tritones |
| Articulation | staccato, detached | legato | sharp attacks (anger), tremolo (fear) |
| Rhythm | regular, flowing, dotted and bouncy | regular, slow, sparse | complex, irregular, ostinato |
| Timbre | bright, few low partials | dark, soft attacks | sharp, harsh, rough |
| Intervals and contour | large, rising | small, falling | large jumps, chromatic steps |

Also useful:

- Mode and tempo alone swing happy/sad judgments strongly, with tempo usually the stronger
  (Hevner 1935, 1937; Gagnon & Peretz 2003).
- Arousal (calm to excited) follows tempo, loudness and density. Valence (negative to positive)
  follows mode and consonance (Russell 1980; Schubert 2004; Eerola & Vuoskoski 2011, on film music).
- Minor-key themes also use lower pitch and smaller intervals, like sad speech (Huron 2008).

## 2. Mood table (the engine's 21 moods)

Tempo, mode and register (the melody's median, MIDI note name) are the rows `craft` measures. The
other columns are the craft to apply. "Density" is pitched note onsets per beat.

| Mood | Tempo | Mode / harmony | Register | Density | Articulation | Orchestration | Dynamics |
|---|---|---|---|---|---|---|---|
| joy | 110-150 | major, mixolydian, pentatonic; triads, I-IV-V, bright 6ths | C5-C7 | 2-4 | staccato, bouncy dotted rhythms | mallets, plucks, music box, piano high | mf-f, steady |
| playful | 120-160 | major, blues; quick chord changes, chromatic passing | C4-F#6 | 2-4 | staccato, rests, stops | pizzicato, mallets, woodwinds, bass hops | mf, sudden p/f |
| tender | 60-80 | major, lydian; add9, suspensions resolving | E4-C6 | 1-2 | legato, soft attacks | piano, harp, strings, warm pad | p-mp, small swells |
| wistful | 70-95 | dorian, major with borrowed iv | E4-D6 | 1.5-3 | legato, sighing appoggiaturas | piano, strings, music box | p-mf |
| melancholy | 50-72 | aeolian, harmonic minor; descending bass, iv, VI | G3-G#5 | 0.75-1.5 | legato, long notes | piano low-mid, cello, strings | p-mp, long swells |
| hopeful | 80-110 | major, melodic minor; rising sequences, IV-V-vi-I lift | C4-E6 | 1.5-3 | legato to detached | piano, strings, bells | mp rising to f |
| curious | 80-110 | dorian, lydian, whole-tone colour | C4-C6 | 1-2 | light staccato, pizzicato | plucks, celesta, bells | p-mp |
| tension | 90-130 | harmonic minor, phrygian; pedals, clusters, b2 | C3-C5 | 2-4 | ostinato, short, tremolo | low strings, pulse, drums | build p to f |
| dread | 50-80 | phrygian, aeolian, locrian colour; drones, tritones | C2-C4 | 0.5-1.5 | long, slow attacks | low bowed, sub, dark piano | pp-mp, sudden f |
| awe | 60-90 | lydian, major; chromatic mediants, open 5ths | C5-E7 | 1-3 | long, legato, swells | strings high, choir, bells, harp | p to ff over 4-8 bars |
| triumph | 100-140 | major (or minor turning major); bVI-bVII-I | C4-F#6 | 3-6 | marcato, accents | brass, strings, drums, organ | f-ff |
| drive | 110-140 | aeolian, dorian, mixolydian; riff harmony, pedal | C4-D6 | 4-8 | short, tight, 16ths | drums, bass, plucks, arps | f, compressed |
| calm | 60-90 | mixolydian, pentatonic, major; slow harmonic rhythm | C4-C6 | 1-2 | legato, soft | guitar, pad, bells | p-mp, flat |
| nostalgic | 70-95 | major with maj7 and borrowed iv | C4-C6 | 1.5-3 | relaxed, swung | e-piano, soft drums, bass | mp |
| romantic | 60-85 | major, aeolian; suspensions, secondary dominants | C4-E6 | 1-2.5 | legato, rubato | piano, strings | p-f waves |
| anger | 120-170 | phrygian, aeolian; power chords, dissonance | E2-C5 | 3-8 | hard accents | drums, distorted bass, brass | ff |
| eerie | 50-90 | whole-tone, locrian, phrygian; clusters, no cadence | C3-C7 | 0.25-1 | tremolo, harmonics, glissandi | bowed, choir, celesta | pp, sudden |
| mischief | 100-150 | blues, dorian, whole-tone; chromatic neighbours | G3-F#6 | 1.5-3 | staccato, rests, slides | woodwinds, pizzicato, mallets | p-mf, sneaky |
| heroic | 90-130 | major, mixolydian, dorian; I-bVII-IV, rising 4ths and 5ths | G3-C6 | 1-3 | marcato, dotted | brass, strings, timpani, choir | f |
| sensual | 65-95 | dorian, aeolian; 9ths and 11ths | G3-G#5 | 0.75-2 | legato, laid back | e-piano, bass, sax-like woodwind | mp |
| grief | 40-62 | aeolian, harmonic minor; slow descending lines, suspensions | C3-E5 | 0.5-1 | long, legato | solo bowed, strings, piano, choir | pp-mf |

Tempo and register numbers are the engine's starting rows, set from the research above and from
listening. Where you disagree with a row for a brief, **write the brief's mood** and say why. `craft`
only advises. The mode check passes any mode of the right family (major-third or minor-third modes),
because the family is the emotional cue and the exact mode is colour.

## 3. Use cases

| Use | Length | Form | Notes |
|---|---|---|---|
| Product launch film | 30-60 s | intro, build, drop on the reveal, button | one motif, the climax on the logo or claim, a clean ending |
| Explainer | 60-120 s | a steady groove bed, low melody density | leave the voice's band free (1-4 kHz): lead sparse and low-mid |
| Site / app loop | 20-60 s | 4 or 8 bar loop, no cadence home at the end | low arousal, no sharp accents, seamless (`craft` does not ask a loop for a tension arc) |
| Game menu / trailer | 15-60 s | ostinato + motif, stingers on hits | heroic or playful, strong hook in 2 bars |
| Ad (15-30 s) | 15-30 s | hook in the first 2-4 s, button ending | high arousal, bright, the brand beat on the last downbeat |
| Meditation / sleep | 45 s+ | drone + sparse motif, slow harmonic rhythm | 50-70 bpm, legato, no percussion, open ending allowed |
| Suspense cue | any | drone + pulse, stingers, withheld resolution | irregular accents, low register, an open end |

Sources: Juslin & Sloboda (eds.), *Handbook of Music and Emotion* (2010), especially Gabrielsson &
Lindström, "The role of structure in the musical expression of emotions", pp. 367-400; Juslin & Laukka,
"Communication of emotions in vocal expression and music performance", *Psychological Bulletin* 129
(2003); Juslin, "Communicating emotion in music performance" (the lens model), in Juslin & Sloboda
(eds.), *Music and Emotion* (2001); Hevner, "The affective character of the major and minor modes",
*American Journal of Psychology* 47 (1935), and "The affective value of pitch and tempo" 49 (1937);
Gagnon & Peretz, "Mode and tempo relative contributions to happy-sad judgements", *Cognition and
Emotion* 17 (2003); Russell, "A circumplex model of affect", *JPSP* 39 (1980); Schubert, "Modeling
perceived emotion with continuous musical features", *Music Perception* 21 (2004); Eerola & Vuoskoski,
"A comparison of the discrete and dimensional models of emotion in music", *Psychology of Music* 39
(2011); Huron, *Empirical Musicology Review* 3 (2008).
