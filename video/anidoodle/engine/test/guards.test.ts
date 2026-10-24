// GUARD TESTS. A declared breath section is authored silence: the ghost guard must not judge it, and
// guardReport must actually hand those spans to ghostCheck (it once did not, so every score with a
// breath failed on its own silence).
//   node tools/test.mjs guards
import { breathSpans, ghostCheck } from "../src/canvas-core/music/guards";
import type { Rendered } from "../src/canvas-core/music/render";

export const name = "guards";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const SR = 8000, bpm = 120, spb = 0.5;
  // 1. breathSpans reads breath sections only, in seconds at the piece's tempo
  const r = { piece: { arrangement: [{ kind: "groove", from: 0, bars: 2 }, { kind: "breath", from: 2, bars: 2 }, { kind: "drop", from: 4, bars: 1 }] }, perf: { sec: (beat: number) => beat * spb } } as unknown as Pick<Rendered, "piece" | "perf">;
  const sp = breathSpans(r, 4);
  ok(sp.length === 1 && Math.abs(sp[0][0] - 3.999) < 1e-9 && Math.abs(sp[0][1] - 8.001) < 1e-9, `one breath, bars 2-4 = 4 s to 8 s, padded 1 ms (${JSON.stringify(sp)})`);
  // 2. a held, onset-free pad is formless; inside a declared breath it is not judged
  const n = SR * 8, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.2 * Math.sin((2 * Math.PI * 220 * i) / SR);
  const bare = ghostCheck([x, x], SR, { bpm, beatsPerBar: 4 }), exempt = ghostCheck([x, x], SR, { bpm, beatsPerBar: 4, breaths: [[-0.001, 8.001]] });
  ok(!bare.pass, `a held pad with no onsets fails the ghost guard (${bare.failures} windows)`);
  ok(exempt.pass, "the same pad inside a declared breath passes");
};
