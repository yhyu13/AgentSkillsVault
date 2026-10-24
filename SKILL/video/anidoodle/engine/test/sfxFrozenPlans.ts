// Launch-template cue sequences (launchTemplate.ts): typing, Generate/drop/card, reveal.
import { launchLofi3 } from "../src/canvas-core/music/index";
import { renderPiece } from "../src/canvas-core/music/render";
import type { SfxPlan } from "../src/canvas-core/music/sfxMix";
export const frozenPlans = (sr: number) => {
  const piece = launchLofi3(), r = renderPiece(piece, sr), music: [Float32Array, Float32Array] = [r.L, r.R];
  const base = { fps: 30, frames: 240, seed: 7, score: { piece } };
  const plans: SfxPlan[] = [
    { ...base, cues: [
      { frame: 12, kind: "tick", variant: "key", gainDb: 1.5, label: 'key "m"' },
      { frame: 16, kind: "tick", variant: "key" }, { frame: 19, kind: "tick", variant: "space" },
      { frame: 24, kind: "tick", variant: "key" }, { frame: 28, kind: "tick", variant: "key" },
    ] },
    { ...base, cues: [
      { frame: 30, kind: "press", variant: "thock", label: "Generate" },
      { frame: 37, kind: "ink", variant: "plip", label: "the drop lifts" },
      { frame: 48, kind: "ink", variant: "bloom", label: "it blooms into the card" },
      { frame: 54, kind: "pop", variant: "cork", label: "the card lands (spring)" },
    ] },
    { ...base, cues: [
      { frame: 120, kind: "riser", variant: "soft", beats: 4, label: "into the reveal" },
      { frame: 120, kind: "impact", variant: "bloom", label: "the reveal" },
    ] },
  ];
  return { plans, music };
};
