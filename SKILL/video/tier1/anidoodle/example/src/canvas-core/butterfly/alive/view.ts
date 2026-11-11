// THE CAMERA, spec section 4. A true dolly over depth planes: camera distance D, plane depth z,
// plane scale 1/(D + z). The hero plane is z = 0, so the hero scale S is 1/D, and S is SCREEN
// PIXELS PER SHEET UNIT: at S = 1 the creature (wingspan 780 units) is 780 px across.
//
// The machinery lives in the engine now (canvas-core/camera.ts): the dolly math, the monotone
// log2 zoom path, the stroke-weight rule. What stays here is this film's own choreography: the
// zoom path keyed on the bars, and the units the shots were written in.
//
// NOTE, one engine item: the finale world's projector (butterfly/finale/world.ts) normalises
// every plane by (1 + z) so that all planes are 1:1 on the last frame. That convention inverts
// parallax for D > 1, and movement 2 spends almost all of its time there (D runs 0.25 to 8.7).
// It is an authored end-frame framing, not the dolly model, and it stays with the finale.
import { type P } from "../../core";
import { monoPath, planeScale, projectCam, strokeWeight } from "../../camera";
import { S_KEYS } from "./cues";

export type Cam = { S: number; look: P };
export const distance = (S: number) => 1 / S;
const asEngine = (c: Cam) => ({ look: c.look, zoom: c.S });
export const scaleAt = (c: Cam, z: number) => planeScale(asEngine(c), z);
export const projector = (c: Cam, z: number) => { const k = scaleAt(c, z); return { k, at: (p: P) => projectCam([540, 540], asEngine(c), z, p) }; };
// A close shot must not fatten the line by the zoom: w = w_authored * S^0.35 (spec 4).
export const weight = (S: number) => strokeWeight({ look: [0, 0], zoom: S });
// The zoom path, keyed on the bars and read in stops: S is interpolated in log2, which is what
// "one stop of zoom" means, and the cubic is monotone so the dolly never overshoots into a scale
// it was not given, and never reverses.
export const scaleOf = monoPath(S_KEYS, { log2: true });
