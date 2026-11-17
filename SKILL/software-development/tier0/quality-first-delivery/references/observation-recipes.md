# Observation recipes

Concrete ways to produce the evidence a contract row needs. Every command records raw data; none of them decides that the result is good. Keep the JSON and image in the deliverable workspace and cite them from the record.

## Visual and interaction (web)

```bash
python scripts/capture_web_observation.py --target http://127.0.0.1:8000/ \
  --out observations/desktop.json --screenshot observations/desktop.png \
  --width 1440 --height 900 --wait-ms 1500

python scripts/capture_web_observation.py --target http://127.0.0.1:8000/ \
  --out observations/mobile.json --screenshot observations/mobile.png \
  --width 375 --height 812 --wait-ms 1500
```

Then open the PNG and describe what is visible: layout, clipping, contrast, loading overlays, whether the requested element is actually on screen. A viewport resize is not a phone test; label it as emulation.

To capture a state after a scripted interaction, pass `--eval` with an expression that performs the interaction and returns JSON:

```bash
--eval "(() => { document.querySelector('#open').click(); return {open: !!document.querySelector('[role=dialog]')}; })()"
```

Scripted clicks are synthetic. A real-device or real-pointer pass must be recorded separately when the requirement depends on feel or pointer lock.

## Accessibility spot checks

Run in the page console or through `--eval`:

```js
[...document.querySelectorAll('button,a,[role=button],input,select,textarea')]
  .map(el => { const r = el.getBoundingClientRect();
    return {label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
            w: Math.round(r.width), h: Math.round(r.height)}; })
  .filter(x => x.w < 44 || x.h < 44)
```

Also tab through the page and record: focus visible, order, trapped focus, and whether the task can be completed by keyboard. These are observations, not a compliance grade.

## Audio

Play the build and listen on a named output. Record who listened, device, which events were triggered, relative loudness, clipping, dropouts and whether the mix is intelligible. File existence, a waveform or a trigger firing is not a listening test.

## Performance

Sample frame times in the page and record device, build, scenario and duration:

```js
await new Promise(resolve => {
  const t = []; let last = performance.now();
  function tick(now) { t.push(now - last); last = now;
    if (t.length < 600) requestAnimationFrame(tick);
    else { t.sort((a, b) => a - b);
      resolve({frames: t.length, p50: +t[300].toFixed(2), p95: +t[570].toFixed(2)}); } }
  requestAnimationFrame(tick);
})
```

Headless Chromium and a software renderer are not a representative GPU measurement. Report the environment and the numbers; do not convert one run into "smooth".

## Record what was not observed

If Playwright or a browser is unavailable, save the command's error and mark the row `unverified` with the missing dependency. If the only available evidence is a screenshot supplied by someone else, say who supplied it and that you did not observe the running build.
