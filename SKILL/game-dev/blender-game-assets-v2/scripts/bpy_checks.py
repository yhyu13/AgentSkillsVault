"""Blender 3.x/4.x 资产规格快检。用法：Blender Scripting 标签页打开本文件运行，
输出每个网格对象的 evaluated 三角面数、命名前缀、未 Apply Scale 标记，
以及贴图尺寸集合与总面数。适用于进引擎前的规格自检。"""

import bpy


def evaluated_tris(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ob = obj.evaluated_get(dg)
    me = ob.to_mesh()
    tri = sum(len(p.vertices) - 2 for p in me.polygons if len(p.vertices) >= 3)
    ob.to_mesh_clear()
    return tri


report = []
total = 0
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    tri = evaluated_tris(obj)
    total += tri
    flags = []
    if obj.scale != (1.0, 1.0, 1.0):
        flags.append("SCALE_NOT_APPLIED")
    if not obj.name.startswith(("SM_", "SK_", "T_", "COL_", "FP_")):
        flags.append("NO_PREFIX")
    report.append(f"{obj.name:40s} tris={tri:>8d} {' '.join(flags)}")

sizes = set()
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in mat.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            sizes.add(tuple(node.image.size))

print("\n".join(report) if report else "no mesh objects")
print(f"TOTAL tris={total}  mesh_objects={len(report)}")
print("texture sizes:", sorted(sizes) if sizes else "none")
