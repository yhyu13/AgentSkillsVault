controller.SetFrameEvent(559, True)
trace = controller.DebugVertex(0, 0, 0, 0)
last = {}
while True:
    states = controller.ContinueDebug(trace.debugger)
    if not states:
        break
    for s in states:
        for ch in s.changes:
            a = ch.after
            last[str(a.name)] = (a, s.stepIndex)
print(f"total changed vars: {len(last)}")
for nm, (a, step) in sorted(last.items(), key=lambda kv: kv[1][1]):
    f = tuple(a.value.f32v[: max(a.rows * a.columns, 4)])
    fstr = "(" + ", ".join(f"{x:.4f}" for x in f[:4]) + ")"
    print(f"  step{step:>3} {nm} = {fstr}")
controller.FreeTrace(trace)
