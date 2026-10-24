import struct
controller.SetFrameEvent(559, True)
mf = controller.GetPostVSData(0, 0, rd.MeshDataStage.VSOut)
stride = mf.vertexByteStride
size = mf.vertexByteSize
data = controller.GetBufferData(mf.vertexResourceId, mf.vertexByteOffset, size)
print(f"post-VS: stride={stride} byteSize={size} verts={size//stride}")
nv = size // stride
for v in range(min(3, nv)):
    base = v * stride
    floats = struct.unpack_from(f"{stride//4}f", data, base)
    print(f"  vert {v}: {[round(x,4) for x in floats]}")
