controller.SetFrameEvent(559, True)
d3d = controller.GetD3D11PipelineState()
vs_refl = d3d.vertexShader.reflection
ps_refl = d3d.pixelShader.reflection

def sig_entries(sig):
    out = []
    if sig is None:
        return out
    for s in sig:
        out.append((s.semanticName, s.semanticIndex, s.regIndex,
                    getattr(s, "systemValue", "?"), [n for n in dir(s) if not n.startswith("_")]))
    return out

print("=== VS outputSignature ===")
for e in sig_entries(vs_refl.outputSignature):
    print(e)
print("=== PS inputSignature ===")
for e in sig_entries(ps_refl.inputSignature):
    print(e)
