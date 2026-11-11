# UE + RenderDoc Pitfalls (battle-tested, 2026-08-17 session)

## 1. rdc-cli shlex quoting mangles Windows paths

`rdc capture` joins app args with `shlex.join` (POSIX rules). Backslashes are POSIX-unsafe,
so `C:\Epic\...\TopDown27Chaos.uproject` becomes `'C:\Epic\...uproject'` — UE receives a
literal-single-quoted garbage path:

```
Failed to open descriptor file C:/Epic/UE_Engine/.../'C:/.../TopDown27Chaos.uproject'/'...'.uproject
```

**Fix**: pass every Windows path with forward slashes (`C:/Epic/...`). Forward slash and
colon are shlex-safe, and Windows accepts them.

**Corollary**: never pass an argument containing a space (e.g.
`-ExecCmds="r.Shadow.M4.PointLight 0"`) — it gets single-quoted and breaks. Use ini
`[ConsoleVariables]` injection instead (see `capture_rdc.ps1`).

## 2. renderdoc module / renderdoccmd version split

- python module: `renderdoc.pyd` **v1.41** (MSBuild, at
  `C:\Users\yuhang\AppData\Local\rdc\renderdoc\`)
- `renderdoccmd.exe`: **v1.45** (installed at `C:\Program Files\RenderDoc\`)

A v1.41 python client **cannot connect to or trigger** targets injected by the v1.45 DLL
(protocol mismatch: "cannot connect to target", enumeration finds nothing). Evidence:
`renderdoc.dll` WAS loaded in the UE process, yet no target was discoverable.

**Fix**: use `rdc capture --trigger` (v1.41 ExecuteAndInject) + `rdc capture-trigger` or
`wait_and_capture.py` (v1.41 TargetControl). Never mix renderdoccmd injection with python
triggering.

## 3. Stale ident reuse + NewCapture message replay

- ExecuteAndInject returns `ident=0` on success for this build → discover via
  `EnumerateRemoteTargets("localhost", ...)` (baked into `wait_and_capture.py`).
- Idents get **reused** across launches (same ident appeared for 4 different processes).
- A fresh TargetControl connection **replays the previous capture's NewCapture message**
  (identical path/frame/size). A naive script misattributes it as a new capture and copies
  a stale file (or hits a file lock if `rdc open` holds the same file).

**Fix** (built into `trigger_and_nudge.py`): drain ALL pending messages including type-4
before triggering; record pre-trigger time; accept a NewCapture only if its path is unseen
and its file mtime is after the trigger time. Also `rdc close` before overwriting a capture
that a daemon session has open (WinError 32).

## 4. Runtime injection crashes UE4Editor

`rd.InjectIntoProcess` into an already-running UE4.27 editor (D3D11) succeeded once
(`Success`, ident=0) and **killed the editor** (process vanished, no dump); the second
attempt failed outright. Runtime injection is unsupported for live D3D11 UE processes.

**Fix**: always inject at launch (ExecuteAndInject). If a capture is needed "right now" on
an existing editor, relaunch the editor injected instead.

## 5. `-game` mode + M4 crashes silently

Three independent launches of `UE4Editor.exe <uproject> <map> -game` with M4 enabled died
~20–110s after launch: frame 55 (bare), frame 105 (AV dump), frame 229 (silent). No
Windows event log, no TDR (4101), log just stops mid-frame. With
`r.Shadow.M4.PointLight=0` the same game ran 4+ minutes stable, and editor mode with M4
ran indefinitely. Root cause of the game-mode crash is NOT yet diagnosed (tracked as an
open issue in `RENDERDOC_ANALYSIS_TRY23.md`).

**Workaround**: capture in **editor mode** (map open in viewport, M4 verified stable).

## 6. Editor viewport is idle → captures never complete

The UE editor viewport renders **on-demand** (no realtime): after map load the swapchain
stops presenting, the log goes silent, CPU idles. A queued `TriggerCapture` waits forever.
Frames numbered 31/479/936 were all Slate-UI-only (~19MB, 130-140 events); the real scene
frame jumped to 81.6MB (657 events) only after activation.

**Fix** (in `trigger_and_nudge.py --click`): real cursor click at the upper-center of the
main window (focuses the viewport widget) + injected Ctrl+R (`FEditorViewportCommands::
ToggleRealTime`, chord Ctrl+R — verified in EditorViewportCommands.cpp line 121). Verify
content by size heuristic: UI-only frames ≈ 19MB, scene frames ≥ 60MB; or `rdc passes`
must show renderer passes (`StandardDeferredLighting`, shadow passes), not only `SlateUI`.

## 7. rdc-cli 1.41 API quirks (for probe scripts)

- `controller.GetTextureData(tex.resourceId, sub)` — sub is `rd.Subresource()` with
  `mip/slice/sample` fields set individually (no constructor args).
- Texture/Buffer lookup by int: use `state.tex_map.get(id)`, never `rd.ResourceId(int)`
  (SWIG ctor doesn't accept int).
- `rd.ResourceId()` with no args = null id.
- Cbuffer values: `pipe_state.GetConstantBlock(stage, idx, 0)` → `bound.descriptor.resource`
  + `controller.GetCBufferVariableContents(pipe, shader_id, stage, entry, idx, res, off, size)`.
  Passing a null buffer id silently returns **all zeros** — validate with a matrix that
  must be non-zero (e.g. ProjectionMatrix) before trusting the read.
- `DebugVertex(0,0,0,0)` works without shader debug source. Step to completion via
  `controller.ContinueDebug(trace.debugger)` loop; the last change per register is the
  final value. `DebugPixel(x, y, DebugPixelInputs)` needs correct `instancer`/`primitive`
  for instanced (VSL) draws, or inputs come back empty.
- `GetPostVSData(instance, view, rd.MeshDataStage.VSOut)` returns a flat MeshFormat
  (vertexResourceId/vertexByteOffset/vertexByteStride/vertexByteSize, no layout).
  D3D11 post-VS vertex layout = SV_Position(4) + per-register outputs in declaration order.
- `rdc script <file>` runs inside the daemon with `controller`, `rd`, `state`, `adapter`,
  `args` pre-injected. `result = <str>` is echoed back; stdout prints work too.
- The 1.41 pyd exposes `ReplayController` etc. — probe unknown APIs with
  `[n for n in dir(obj)]` via a throwaway `rdc script` file.
