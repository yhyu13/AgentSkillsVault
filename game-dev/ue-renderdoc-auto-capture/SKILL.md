---
name: ue-renderdoc-auto-capture
description: Fully automated GPU frame capture and analysis for UE4/UE5 source-build editor via RenderDoc plus rdc-cli. Covers injecting RenderDoc at launch, waiting for the viewport to present frames, activating an idle editor viewport (click + Ctrl+R), triggering captures, and GPU-level verification probes (cubemap float analysis, vertex/pixel debug, cbuffer reads, VS/PS signature comparison). Use when the user asks to capture a UE frame with RenderDoc, debug UE shadows or shader output with RenderDoc, verify what a GPU texture or shader actually received, or analyze .rdc captures of Unreal projects. Battle-tested against UE4.27 Chaos source build plus TopDown27Chaos on Windows (RenderDoc pyd 1.41, rdc-cli 0.5.4, AMD RDNA2). DO NOT use for non-Unreal apps or RenderDoc UI-driven workflows.
---

# UE RenderDoc Auto-Capture & GPU Verification

## Purpose

Capture GPU frames from a UE editor/game **without touching the RenderDoc UI**, then verify
exactly what the GPU computed (shader inputs/outputs, cbuffer values, texture contents) with
headless probes. Proven workflow for the M4 point-light shadow debug loop: capture ? probe ?
diagnose ? fix ? recapture.

## Prerequisites (verify once)

```powershell
rdc doctor            # rdc-cli installed, renderdoc.pyd found (v1.41 at
                      # C:\Users\yuhang\AppData\Local\rdc\renderdoc\renderdoc.pyd)
python --version      # must match the pyd (3.13 here)
```

All scripts live in `scripts/` of this skill. Copy them into the project's capture output
directory before use (they are self-contained; the capture scripts write .rdc files next to
themselves).

## Workflow 1: Automatic capture (launch + wait + capture + kill)

```
capture_rdc.ps1 -Name <output-basename> [-M4Value 0|1] [-KeepOpen]
```

1. Edits the target project's `Saved\Config\Windows\Engine.ini` `[ConsoleVariables]`
   section to set `r.Shadow.M4.PointLight=<M4Value>` (restored afterwards). For other CVars,
   extend the same mechanism ? **never pass `-ExecCmds` with spaces through rdc capture**
   (see pitfalls).
2. `rdc capture --trigger -o <out.rdc>` launches the editor injected (ExecuteAndInject,
   same-version pyd ? same-version trigger works).
3. `wait_and_capture.py <out> <pid> 360` waits for the `CapturableWindowCount>0` message
   (swapchain presenting), graces 10s, triggers 1 frame, copies the capture to `<out>`.
4. `-KeepOpen` leaves the editor running for interactive re-capture (user adjusts the
   camera, then trigger again with `trigger_and_nudge.py`).

The capture lands at `<output-dir>\<Name>.rdc`; RenderDoc also writes a
`<Name>_frame<NN>.rdc` copy ? delete the redundant one after analysis.

## Workflow 2: Interactive capture on a running editor (user adjusts camera/angle)

```
trigger_and_nudge.py <out.rdc> <ue_pid> [--ctrlr|--click]
```

- The editor viewport is idle (no realtime) ? it does **not** present frames ? a queued
  capture never completes. This script fixes that.
- `--click`: moves the real cursor to the upper-center of the editor window (the viewport
  area in the default layout), clicks to focus, then injects Ctrl+R (toggle viewport
  realtime). Frames flow continuously after that.
- Queues the capture, then sweeps synthetic `WM_MOUSEMOVE` across the client area as a
  fallback invalidation, and accepts only **fresh** NewCapture messages (stale-message
  replay guard ? see pitfalls).
- After the first capture, the editor keeps running: the user can reposition the viewport
  camera and the next trigger captures the new angle immediately.

## Workflow 3: Verify what the GPU actually computed

Open the capture with `rdc open <file>`, then run probes via `rdc script` (executes in the
daemon with `controller`/`rd`/`state` pre-injected). Probes must have their hardcoded
EID/texture IDs adapted to the current capture (fetch them with `rdc passes` /
`rdc draws --pass ...` / `rdc resources --json`).

| Question | Probe | Key output |
|----------|-------|-----------|
| Does texture X contain real data? | `rdc script analyze_tex_script.py --arg tex_id=<id>` | per-face float min/max/unique counts |
| What value did a cbuffer uniform really have? | `rdc script probe_final.py` | e.g. `LightPositionAndInvRadius=(730,-150,180,0.001)` |
| Do VS outputs link to PS inputs? | `rdc script probe_sig.py` | semantic/regIndex/mask per side |
| What did the VS output per vertex? | `rdc script probe_vsstep.py` | final value per output register |
| What did the rasterizer receive? | `rdc script probe_postvs2.py` | post-VS vertex buffer floats |

Order of suspicion when a shader consumes wrong data: cbuffer ? VS math (DXBC via
`rdc shader <eid> vs --target DXBC`) ? VS actual output (probe_vsstep) ? post-VS buffer
(probe_postvs2) ? signature link (probe_sig) ? PS math (DXBC) ? texture result
(analyze_tex_script).

## Critical pitfalls (all encountered, all cost time)

**Read `references/ue-renderdoc-pitfalls.md` before the first capture.** The top five:

1. `rdc capture` mangles Windows backslash paths (shlex.join single-quotes them) ? pass
   **forward-slash paths** (`C:/...`) for the exe/uproject.
2. renderdoccmd.exe (v1.45) targets cannot be controlled by the v1.41 python module ?
   use **rdc-cli only** end-to-end.
3. RenderDoc idents are reused and stale NewCapture messages get replayed ? guard with
   file-mtime freshness checks (already built into `trigger_and_nudge.py`).
4. `InjectIntoProcess` into a running UE4Editor **crashes it** ? always inject at launch.
5. `-game` mode + M4 enabled crashes the game silently (~20?110s) ? use **editor mode**
   for capture; investigate the game-mode crash separately.
