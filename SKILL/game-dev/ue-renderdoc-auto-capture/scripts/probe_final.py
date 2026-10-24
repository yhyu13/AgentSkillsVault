controller.SetFrameEvent(559, True)
pipe_state = controller.GetPipelineState()
stage = rd.ShaderStage.Vertex
refl = pipe_state.GetShaderReflection(stage)
shader_id = pipe_state.GetShader(stage)
entry = pipe_state.GetShaderEntryPoint(stage)

# pipeline resource for cbuffer read (D3D11: no PSO, use what rdc uses)
pipe_attrs = [n for n in dir(pipe_state) if not n.startswith("_")]
print("pipe_state attrs:", pipe_attrs)

# get_pipeline_for_stage equivalent: try to find a method returning pipeline id
pipe = None
for cand in ("GetGraphicsPipelineObject", "GetComputePipelineObject"):
    if hasattr(pipe_state, cand):
        pipe = getattr(pipe_state, cand)()
        print(f"pipeline from {cand}: {pipe}")
        break
if pipe is None:
    pipe = rd.ResourceId()
    print("pipeline: null ResourceId (D3D11)")

for idx, cb_def in enumerate(refl.constantBlocks):
    if "ShadowDepthPass" not in str(cb_def.name):
        continue
    bound = pipe_state.GetConstantBlock(stage, idx, 0)
    desc = bound.descriptor
    print(f"cb[{idx}] {cb_def.name}: buffer={desc.resource} offset={desc.byteOffset} size={desc.byteSize}")
    try:
        vars_ = controller.GetCBufferVariableContents(
            pipe, shader_id, stage, entry, idx,
            desc.resource, desc.byteOffset, desc.byteSize)
        for v in vars_:
            if str(v.name) in (
                "ShadowDepthPass_LightPositionAndInvRadius",
                "ShadowDepthPass_ProjectionMatrix",
            ):
                f = tuple(v.value.f32v[: max(v.rows * v.columns, 4)])
                print(f"  {v.name} -> {f}")
    except Exception as e:
        print(f"  contents err: {e}")
