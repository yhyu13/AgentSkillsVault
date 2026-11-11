import { spawn } from "node:child_process";

// Read one small grayscale frame at a time. A ten-minute film must not need a gigabyte buffer.
// stride: each frame is compared with the frame `stride` back (the first frames with frame 0), so a
// 60 fps film can be measured over the same 1/30 s a 30 fps film is (the gate's motion floor).
export const changedArea = async (file, width, height, threshold = 4, stride = 1) => {
  const px = width * height, changed = [0];
  const ff = spawn("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${width}:${height}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"]);
  let pending = Buffer.alloc(0), error = ""; const back = [];
  ff.stderr.on("data", (chunk) => { error += chunk.toString(); });
  const closed = new Promise((resolve, reject) => { ff.on("error", reject); ff.on("close", (code) => code ? reject(new Error(error || `ffmpeg exited ${code}`)) : resolve()); });
  for await (const chunk of ff.stdout) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (pending.length >= px) {
      const frame = pending.subarray(0, px);
      if (back.length) { const previous = back[0]; let count = 0; for (let i = 0; i < px; i++) if (Math.abs(frame[i] - previous[i]) > threshold) count++; changed.push(count / px); }
      back.push(Buffer.from(frame)); if (back.length > stride) back.shift();
      pending = pending.subarray(px);
    }
  }
  await closed;
  if (pending.length) throw new Error(`incomplete decoded frame: ${pending.length} bytes`);
  return changed;
};

// The frames themselves, one at a time, same small grey decode as changedArea: a Buffer of
// width*height luma bytes per frame. Tools that need pixel neighbourhoods (popscan's triple
// diff) rather than a pairwise summary consume this stream. `frames` caps the decode; a
// consumer that stops early kills the encoder instead of buffering the rest of the film.
export const greyFrames = async function* (file, width, height, frames = Infinity) {
  const px = width * height;
  const args = ["-v", "error", "-i", file, "-vf", `scale=${width}:${height}`];
  if (Number.isFinite(frames)) args.push("-frames:v", String(frames));
  args.push("-pix_fmt", "gray", "-f", "rawvideo", "-");
  const ff = spawn("ffmpeg", args);
  let pending = Buffer.alloc(0), error = "";
  ff.stderr.on("data", (chunk) => { error += chunk.toString(); });
  const closed = new Promise((resolve, reject) => { ff.on("error", reject); ff.on("close", (code) => code ? reject(new Error(error || `ffmpeg exited ${code}`)) : resolve()); });
  closed.catch(() => {}); // a consumer that breaks early leaves ffmpeg to the kill below, not an unhandled rejection
  try {
    for await (const chunk of ff.stdout) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      while (pending.length >= px) {
        yield Buffer.from(pending.subarray(0, px));
        pending = pending.subarray(px);
      }
    }
    await closed;
    if (pending.length) throw new Error(`incomplete decoded frame: ${pending.length} bytes`);
  } finally {
    if (ff.exitCode === null) ff.kill("SIGKILL");
  }
};
