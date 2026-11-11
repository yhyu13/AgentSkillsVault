// The 18-note movement drawing itself, in the house isometric hand: each part traced, then filled, in assembly order.
import { mechanismIn } from "./mechanism";
import { isometricHand } from "./mechanismHands";

export const mechanismDraw = mechanismIn("isometric", () => isometricHand(), true);
