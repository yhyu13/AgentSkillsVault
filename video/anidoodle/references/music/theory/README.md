# Music theory for the composer

These pages are the craft behind [../compose.md](../compose.md): what makes a line beautiful, a
progression move, a groove feel good and a mood read true. Each page cites its sources and ends in
rules you can apply. Examples use scale degrees and shapes, never tunes to copy.

| Page | Read it when |
|---|---|
| [melody.md](melody.md) | writing the motif and phrases: development, contour, climax, leaps, non-chord tones |
| [harmony.md](harmony.md) | writing chords and bass: function, cadences, voice leading, modal colour, tension |
| [rhythm.md](rhythm.md) | writing grooves and lines: metre, syncopation, swing, fills, density |
| [mood.md](mood.md) | choosing tempo, mode, register and density for a feeling (the research, and the 21-mood table) |
| [form.md](form.md) | laying out sections: song and cue forms, builds, orchestration slots, counterpoint |
| [sound.md](sound.md) | voicing and arranging for a clear mix: critical bands, masking, low limits, space |

`node tools/music.mjs craft <score.ts#export>` measures these rules in milliseconds, with no render,
and `check` prints the same report. Scores run from 0 to 1 and are advisory. Each `CRAFT` line names what
it saw, where, and a fix. Only a note an acoustic instrument cannot play is an error. The rest is
yours to judge: a rule broken on purpose is style, and one broken by accident is a fault.
