# Demo forensics

Record what the pinned file actually does when loaded. Forensics is observation, not interpretation: keep raw values and defer mechanism claims to the domain dumps.

## Inputs

- The pinned HTML and its modules, with hashes matching the intake manifest.
- A local static server on a free port, and a browser session dedicated to this task.
- The runtime schemas and output paths agreed with the user.
- Only the debug interfaces the source actually exposes.

## Outputs

- `reports/evidence/<demo_id>-runtime-initial.json`: requests, WebGL, canvas, debug keys, initial state.
- `reports/evidence/<demo_id>-runtime-step.json`: state before and after a controlled step sequence.
- Console output, server log, environment description and screenshots, each with a SHA-256.

## Executable capture

Where Python Playwright and Chromium are available, one command records the startup evidence instead of hand-driving a browser:

```bash
python scripts/capture_runtime.py --demo <project>/demos/raw/<demo_id>/index.html \
  --out <project>/reports/evidence/<demo_id>-runtime-initial.json \
  --screenshot <project>/reports/evidence/<demo_id>-initial.png \
  --eval "window.__dbg ? {keys: Object.keys(window.__dbg)} : null"
```

It serves the file's directory on a free port, opens it headless, and records the served URL, status, requests, failed requests, console, page errors, WebGL vendor/renderer/version, evaluated state and screenshot hash. It refuses to overwrite an existing output. If Playwright or Chromium is missing, the command fails with a dependency message; record that failure and keep the stage `unverified` rather than inventing runtime data. The capture is one load on one machine: it does not prove playability, input, audio, progression or sustained performance.

## Procedure

1. **Serve the pinned file.** Confirm the served byte length and SHA-256 equal the analyzed file. If they differ, discard that port and find out why before continuing.
2. **Open the documented mode.** Use only parameters the source supports. Record the full URL, document title and `readyState`.
3. **Capture requests.** Read PerformanceResourceTiming and the server log. Keep failed requests, favicon noise and any unexpected origin. An empty XHR view is not proof that no requests occurred.
4. **Capture the renderer.** Record GPU string, software-rendering flag, WebGL and GLSL versions, drawing-buffer size and program count as raw values. A program count is not a mapping to shader units.
5. **Confirm the first frame.** Screenshot, then reopen the file and look at it. A tool reporting success with a blank or loading image is a failure, not a pass.
6. **Step deterministically.** Use the source's own start/step entry points if present. Save state before and after a fixed number of steps, plus the input method used. If no such entry point exists, drive real input and say so.
7. **Reload once.** Compare the initial state and the request set across the two loads. Claim only the fields that actually matched.
8. **Preserve anomalies.** Console errors, shader warnings and 404s stay in the record even when the scene still renders.
9. **Clean up.** Close the tab and stop the server you started; leave other services untouched.

## Evidence rules

- `renderer.info` values describe one frame of the current pass, not the whole scene or the whole session.
- An in-app luminance helper is not PSNR/SSIM and not a performance measurement.
- Entering play through a debug hook is not evidence that real pointer-lock or touch input works.
- Screenshot presence is not a quality verdict; a human or a recorded rubric must inspect the image.
- Repeated identical state supports "this state repeated", not cross-browser bitwise determinism.

## Acceptance

- [ ] Served bytes and hash match the analyzed file.
- [ ] Requests, failures, GPU, WebGL, canvas and debug entry points are recorded with raw values.
- [ ] Initial state, stepped state and a reload comparison exist.
- [ ] The screenshot was reopened and described.
- [ ] Untested input, audio, progression and sustained performance remain marked as unknown.
