// THUMBNAIL GUARD. Platforms show a video's first frame as its thumbnail, so a delivery that opens
// on a blank page, a flat colour or a fade from black shows up as an empty rectangle in the feed.
// This reads decoded frame 0 of a file (what the platform will actually show) at thumbnail size
// and calls it near-blank when it is one flat tone: tiny spread of luma, or almost every pixel
// within a few levels of the median. A small logo or a line of text on a blank ground still
// counts as blank on purpose: that is not a thumbnail anyone can read at feed size.
import { spawnSync } from "node:child_process";

const W = 96, H = 54;
export const firstFrameBlank = (file, { frame = 0 } = {}) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `select=eq(n\\,${frame}),scale=${W}:${H}:flags=area`, "-vsync", "0", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 20 });
  if (r.status !== 0 || r.stdout.length !== W * H) return { blank: false, unknown: true, detail: `could not decode frame ${frame}: ${r.stderr?.toString().trim() || "short read"}` };
  const px = [...r.stdout], n = px.length, mean = px.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(px.reduce((a, b) => a + (b - mean) ** 2, 0) / n), med = [...px].sort((a, b) => a - b)[n >> 1];
  const flat = px.filter((v) => Math.abs(v - med) <= 6).length / n;
  return { blank: sd < 3 || flat >= 0.985, sd, flat, mean, detail: `luma spread ${sd.toFixed(1)}, ${(flat * 100).toFixed(1)}% of pixels within 6 levels of ${med}` };
};
