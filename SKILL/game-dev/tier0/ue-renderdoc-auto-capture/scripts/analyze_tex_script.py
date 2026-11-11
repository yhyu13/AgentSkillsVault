import numpy as np

tex_id = int(args.get("tex_id", "3623"))
tex = state.tex_map.get(tex_id)
if tex is None:
    print(f"FAILED: texture {tex_id} not found")
    raise SystemExit(1)

tex_attrs = [n for n in dir(tex) if not n.startswith("_")]
print("tex attrs:", tex_attrs)
fmt = getattr(tex, "format", None)
print("fmt attrs:", [n for n in dir(fmt) if not n.startswith("_")] if fmt else None)

w = getattr(tex, "width", "?")
h = getattr(tex, "height", "?")
d = getattr(tex, "depth", "?")
m = getattr(tex, "mips", "?")
cube = bool(getattr(tex, "cubemap", 0))
print(f"texture {tex_id}: {w}x{h}x{d} mips={m} cubemap={cube}")

nfaces = 6 if cube else 1
lines = []
for face in range(nfaces):
    sub = rd.Subresource()
    sub.mip = 0
    sub.slice = face
    sub.sample = 0
    data = controller.GetTextureData(tex.resourceId, sub)
    if not data:
        lines.append(f"face {face}: no data")
        continue
    arr = np.frombuffer(bytes(data), dtype=np.float32)
    n = arr.size // 4
    px = arr[: n * 4].reshape(n, 4)
    parts = []
    for ch, cname in enumerate("RGBA"):
        c = px[:, ch]
        uniq = np.unique(np.round(c, 6))
        parts.append(f"{cname}[{c.min():.5f},{c.max():.5f}]u{len(uniq)}")
    nz_g = int((px[:, 1] > 1e-6).sum())
    nz_b = int((px[:, 2] > 1e-6).sum())
    nz_a = int((px[:, 3] > 1e-6).sum())
    lines.append(f"face {face}: {' '.join(parts)} | G>{'1e-6'}:{nz_g} B:1e-6:{nz_b} A:1e-6:{nz_a} of {n}")

result = "\n".join(lines)
print(result)
