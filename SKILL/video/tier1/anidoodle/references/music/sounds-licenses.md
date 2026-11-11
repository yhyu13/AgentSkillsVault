# Sound pack licenses

The sound pack is a separate download, installed by `engine/tools/soundfetch.mjs`. Nothing in this
repository is licensed here; this page is what you need to carry if you redistribute the pack or a
film made with it. The short version also lives in the repository's `NOTICE`.

Two sources, two licenses. The instruments need nothing. The rooms need a line of credit.

## Instruments: CC0

All recordings from the Versilian Community Sample Library (VCSL).

- Source: https://github.com/sgossner/VCSL
- License: CC0 1.0 Universal (public domain)

CC0 asks for nothing: no attribution, no licence notice, no share-alike, no restriction. Attribution
is still welcome and the anidoodle page names the library.

Eight instruments are taken from it:

| Instrument id | Recording | VCSL folder |
|---|---|---|
| `piano` | Grand Piano, Steinway B | `Chordophones/Zithers/Grand Piano, Steinway B` |
| `piano.upright` | Upright Piano, Knight | `Chordophones/Zithers/Upright Piano, Knight` |
| `harp` | Concert Harp | `Chordophones/Composite Chordophones/Concert Harp` |
| `marimba` | Marimba | `Idiophones/Struck Idiophones/Marimba` |
| `vibes` | Vibraphone | `Idiophones/Struck Idiophones/Vibraphone` |
| `glockenspiel` | Glockenspiel | `Idiophones/Struck Idiophones/Glockenspiel` |
| `bell.tubular` | Tubular Bells 1 | `Idiophones/Struck Idiophones/Tubular Bells 1` |
| `timpani` | Timpani | `Membranophones/Struck Membranophones/Timpani 2` |

The exact WAV taken from each folder, and its sha256, are in the pack's own `LICENSES.md` next to
`manifest.json`. That file is the authority; this table is the map.

## Rooms: CC BY 4.0

Recorded impulse responses from OpenAIR, the Open Acoustic Impulse Response library, Audio Lab,
University of York: https://www.openair.hosted.york.ac.uk/

- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- The B-format (W X Y Z) recordings were decoded to stereo as L = W + Y, R = W - Y

CC BY 4.0 requires attribution. Anyone redistributing the pack, or a film rendered with one of these
rooms, must carry this credit:

> Recorded impulse responses from OpenAIR, the Open Acoustic Impulse Response library, Audio Lab,
> University of York (https://www.openair.hosted.york.ac.uk/), licensed CC BY 4.0.

Credit each room where you can:

| Room id | Room | URL |
|---|---|---|
| `small-room` | Arthur Sykes Rymer Auditorium, University of York | https://www.openair.hosted.york.ac.uk/?page_id=425 |
| `recital-hall` | Jack Lyons Concert Hall, University of York | https://www.openair.hosted.york.ac.uk/?page_id=571 |
| `live-room` | Genesis 6 Studio live room, University of York | https://www.openair.hosted.york.ac.uk/?page_id=483 |

The other three things CC BY 4.0 allows are worth knowing: commercial use, modification (so
processing the impulse response does not break it), and distribution. The one condition is the
credit above.

## Where this comes from

`anidoodle-research/sound-pack/CONTRACT.md` sets the rules for version 1: FLAC, 48 kHz, 24-bit, the
pack under 200 MB, and CC0 or public domain only. The three OpenAIR rooms are the exception the
amendment of 2026-10-04 (b) authorized once the microphone was heard to sell the recordings. They
are the only CC BY material the skill ships, and they are the only part that needs a credit line.

Reproduce the pack and the licences with `node tools/soundpack.mjs`, which writes the per-file
`LICENSES.md` from the same manifest the engine reads.