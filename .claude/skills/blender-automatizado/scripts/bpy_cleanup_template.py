#!/usr/bin/env python3
"""Limpeza headless de um asset 3D no Blender: importar → unir/aplicar transforms → merge by
distance → (remesh) → (UV) → (bake PBR high→low) → decimate em LODs → renomear → exportar
GLB/FBX + relatório JSON.

Uso (dentro do Blender, modo background; os argumentos vêm depois de `--`):
  blender -b --python bpy_cleanup_template.py -- --input in.glb --outdir out/ [opções]

Fora do Blender, `python3 bpy_cleanup_template.py --help` só mostra esta ajuda.

Observação: `blender -b arquivo.glb` NÃO abre GLB (o Blender só abre .blend pela linha de
comando); por isso a entrada é passada em `--input` e importada pelo script.

Este template não foi executado no ambiente em que foi escrito (sem Blender instalado);
valide num Blender 4.x LTS antes de usar em lote e registre a versão no PROVENANCE.md.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    elif len(argv) > 0 and argv[0].endswith(".py"):
        argv = argv[1:]
    else:
        argv = []
    ap = argparse.ArgumentParser(
        prog="blender -b --python bpy_cleanup_template.py --",
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", required=True, help="arquivo .glb/.gltf/.fbx/.obj a limpar")
    ap.add_argument("--outdir", required=True, help="pasta de saída")
    ap.add_argument("--name", help="nome base em kebab-case (padrão: nome do arquivo)")
    ap.add_argument("--join", action="store_true", help="une todas as malhas em um objeto (props estáticos)")
    ap.add_argument("--no-apply-transforms", action="store_true", help="não aplica location/rotation/scale")
    ap.add_argument("--merge-distance", type=float, default=0.0001,
                    help="limiar do merge by distance em metros (0 desliga; padrão 0.0001)")
    ap.add_argument("--remesh", choices=["none", "voxel", "quadriflow"], default="none",
                    help="retopologia: voxel (Remesh modifier) ou quadriflow (quads); destrói UVs → força --uv smart")
    ap.add_argument("--voxel-size", type=float, default=0.01, help="tamanho do voxel para --remesh voxel (m)")
    ap.add_argument("--target-faces", type=int, default=10000, help="faces alvo para --remesh quadriflow")
    ap.add_argument("--uv", choices=["keep", "smart"], default="keep", help="manter UVs ou refazer com Smart UV Project")
    ap.add_argument("--uv-margin", type=float, default=0.02, help="margem entre ilhas UV (0–1)")
    ap.add_argument("--bake", choices=["none", "diffuse", "all"], default="none",
                    help="bake do original (high) para a malha limpa (low): diffuse ou all (diffuse+normal+roughness)")
    ap.add_argument("--bake-size", type=int, default=2048, help="lado da textura assada em px (padrão 2048)")
    ap.add_argument("--bake-samples", type=int, default=16, help="amostras do Cycles no bake")
    ap.add_argument("--decimate", default="0.5,0.25,0.1",
                    help="razões do Decimate (Collapse) para LOD1..N (padrão 0.5,0.25,0.1; vazio = só LOD0)")
    ap.add_argument("--export", default="glb", help="formatos separados por vírgula: glb,fbx (padrão glb)")
    ap.add_argument("--save-blend", action="store_true", help="salva <name>.blend na pasta de saída")
    return ap.parse_args(argv)


def kebab(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "asset"


def main():
    args = parse_args()
    try:
        import bpy  # noqa: F401
    except ImportError:
        print("Este script precisa rodar dentro do Blender:\n"
              "  blender -b --python bpy_cleanup_template.py -- --input in.glb --outdir out/", file=sys.stderr)
        return 2

    import bpy

    t0 = time.time()
    os.makedirs(args.outdir, exist_ok=True)
    name = kebab(args.name or os.path.splitext(os.path.basename(args.input))[0])
    rel = {"input": os.path.abspath(args.input), "outdir": os.path.abspath(args.outdir), "name": name,
           "blender": bpy.app.version_string, "args": vars(args), "passos": [], "avisos": [],
           "antes": {}, "depois": {}, "lods": [], "texturas": [], "exportados": []}

    def log(passo, **kw):
        rel["passos"].append({"passo": passo, **kw})
        print(f"[bpy_cleanup] {passo} {kw if kw else ''}")

    def aviso(msg):
        rel["avisos"].append(msg)
        print(f"[bpy_cleanup] AVISO: {msg}")

    def tris(obj):
        me = obj.data
        me.calc_loop_triangles()
        return len(me.loop_triangles)

    def selecionar(objs, ativo=None):
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = ativo or (objs[0] if objs else None)

    # 0. cena vazia
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # 1. importar
    ext = os.path.splitext(args.input)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=args.input)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=args.input)
    elif ext == ".obj":
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=args.input)
        else:
            bpy.ops.import_scene.obj(filepath=args.input)
    else:
        print(f"extensão não suportada: {ext}", file=sys.stderr)
        return 2
    log("importar", arquivo=args.input)

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    armaduras = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if not meshes:
        print("nenhuma malha importada", file=sys.stderr)
        return 1
    rel["antes"] = {"objetos": len(meshes), "triangulos": sum(tris(o) for o in meshes),
                    "materiais": len(bpy.data.materials), "imagens": len(bpy.data.images),
                    "armaduras": len(armaduras)}
    tem_rig = any(m.type == "ARMATURE" for o in meshes for m in o.modifiers)

    # 2. unir
    if args.join and len(meshes) > 1:
        if tem_rig:
            aviso("--join ignorado: malha tem Armature modifier (uniria pesos de rigs diferentes)")
        else:
            selecionar(meshes, meshes[0])
            bpy.ops.object.join()
            meshes = [bpy.context.view_layer.objects.active]
            log("join", objetos=1)

    # 3. aplicar transforms
    if not args.no_apply_transforms:
        if tem_rig:
            aviso("transforms não aplicados: objeto rigado (aplique no armature antes do rig)")
        else:
            selecionar(meshes, meshes[0])
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            log("transform_apply")

    # 4. merge by distance + limpeza
    if args.merge_distance > 0:
        for o in meshes:
            selecionar([o], o)
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.mesh.remove_doubles(threshold=args.merge_distance)
            bpy.ops.mesh.delete_loose()
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode="OBJECT")
        log("remove_doubles", threshold=args.merge_distance, triangulos=sum(tris(o) for o in meshes))

    # 5. remesh (guarda cópia high para bake)
    highs = []
    if args.remesh != "none":
        if args.uv == "keep":
            aviso("remesh destrói UVs: --uv forçado para smart")
            args.uv = "smart"
        if args.bake == "none":
            aviso("remesh sem --bake: a malha limpa ficará sem textura; considere --bake all")
        for o in list(meshes):
            selecionar([o], o)
            bpy.ops.object.duplicate()
            high = bpy.context.view_layer.objects.active
            high.name = f"{o.name}-high"
            high.hide_render = True
            highs.append((o, high))
            selecionar([o], o)
            if args.remesh == "voxel":
                mod = o.modifiers.new("Remesh", "REMESH")
                mod.mode = "VOXEL"
                mod.voxel_size = args.voxel_size
                bpy.ops.object.modifier_apply(modifier=mod.name)
            else:
                bpy.ops.object.quadriflow_remesh(target_faces=args.target_faces, mode="FACES")
        log("remesh", modo=args.remesh, triangulos=sum(tris(o) for o in meshes))

    # 6. UV
    if args.uv == "smart":
        for o in meshes:
            selecionar([o], o)
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=args.uv_margin)
            bpy.ops.object.mode_set(mode="OBJECT")
        log("smart_uv_project", margem=args.uv_margin)

    # 7. bake high → low (Cycles)
    if args.bake != "none":
        if not highs:  # sem remesh: assa do próprio objeto (útil para unificar materiais em um atlas)
            for o in list(meshes):
                selecionar([o], o)
                bpy.ops.object.duplicate()
                high = bpy.context.view_layer.objects.active
                high.name = f"{o.name}-high"
                high.hide_render = True
                highs.append((o, high))
        scene = bpy.context.scene
        scene.render.engine = "CYCLES"
        scene.cycles.samples = args.bake_samples
        scene.render.bake.use_selected_to_active = True
        scene.render.bake.cage_extrusion = 0.02
        scene.render.bake.margin = 8
        passes = ["DIFFUSE"] if args.bake == "diffuse" else ["DIFFUSE", "NORMAL", "ROUGHNESS"]
        for low, high in highs:
            mat = bpy.data.materials.new(f"{name}-mat")
            mat.use_nodes = True
            low.data.materials.clear()
            low.data.materials.append(mat)
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            bsdf = nodes.get("Principled BSDF")
            imagens = {}
            for p in passes:
                img = bpy.data.images.new(f"{name}-{p.lower()}", args.bake_size, args.bake_size,
                                          alpha=False, float_buffer=False)
                if p != "DIFFUSE":
                    img.colorspace_settings.name = "Non-Color"
                tex = nodes.new("ShaderNodeTexImage")
                tex.image = img
                nodes.active = tex
                selecionar([high, low], low)
                kw = {"type": p, "use_selected_to_active": True, "cage_extrusion": 0.02, "margin": 8}
                if p == "DIFFUSE":
                    kw["pass_filter"] = {"COLOR"}
                if p == "NORMAL":
                    kw["normal_space"] = "TANGENT"
                bpy.ops.object.bake(**kw)
                caminho = os.path.join(args.outdir, f"{name}-{p.lower()}.png")
                img.filepath_raw = caminho
                img.file_format = "PNG"
                img.save()
                imagens[p] = tex
                rel["texturas"].append({"passe": p, "arquivo": caminho, "tamanho": args.bake_size})
            if bsdf:
                if "DIFFUSE" in imagens:
                    links.new(imagens["DIFFUSE"].outputs["Color"], bsdf.inputs["Base Color"])
                if "ROUGHNESS" in imagens:
                    links.new(imagens["ROUGHNESS"].outputs["Color"], bsdf.inputs["Roughness"])
                if "NORMAL" in imagens:
                    nm = nodes.new("ShaderNodeNormalMap")
                    links.new(imagens["NORMAL"].outputs["Color"], nm.inputs["Color"])
                    links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        log("bake", passes=passes, tamanho=args.bake_size)
        for _, high in highs:
            bpy.data.objects.remove(high, do_unlink=True)

    # 8. renomear (kebab-case previsível)
    for i, o in enumerate(meshes):
        o.name = name if len(meshes) == 1 else f"{name}-{i+1:02d}"
        o.data.name = o.name
    for i, m in enumerate(bpy.data.materials):
        if not m.name.startswith(name):
            m.name = f"{name}-mat-{i+1:02d}"
    log("renomear", base=name)

    # 9. LODs por decimate
    ratios = [float(r) for r in args.decimate.split(",") if r.strip()]
    lod_sets = [(0, meshes)]
    for i, r in enumerate(ratios, start=1):
        novos = []
        for o in meshes:
            selecionar([o], o)
            bpy.ops.object.duplicate()
            d = bpy.context.view_layer.objects.active
            d.name = f"{o.name}-lod{i}"
            d.data.name = d.name
            mod = d.modifiers.new("Decimate", "DECIMATE")
            mod.decimate_type = "COLLAPSE"
            mod.ratio = r
            bpy.ops.object.modifier_apply(modifier=mod.name)
            novos.append(d)
        lod_sets.append((i, novos))
    for i, objs in lod_sets:
        rel["lods"].append({"lod": i, "ratio": 1.0 if i == 0 else ratios[i - 1],
                            "triangulos": sum(tris(o) for o in objs), "objetos": [o.name for o in objs]})
    log("decimate", lods=[(l["lod"], l["triangulos"]) for l in rel["lods"]])

    # 10. exportar
    formatos = [f.strip().lower() for f in args.export.split(",") if f.strip()]
    tem_anim = bool(bpy.data.actions)
    for i, objs in lod_sets:
        selecionar(objs + armaduras, objs[0])
        base = os.path.join(args.outdir, f"{name}-lod{i}")
        if "glb" in formatos:
            bpy.ops.export_scene.gltf(
                filepath=base + ".glb", export_format="GLB", use_selection=True,
                export_apply=True, export_yup=True, export_texcoords=True, export_normals=True,
                export_materials="EXPORT", export_image_format="AUTO",
                export_animations=tem_anim, export_skins=bool(armaduras))
            rel["exportados"].append(base + ".glb")
        if "fbx" in formatos:
            bpy.ops.export_scene.fbx(
                filepath=base + ".fbx", use_selection=True, apply_unit_scale=True,
                apply_scale_options="FBX_SCALE_ALL", axis_forward="-Z", axis_up="Y",
                object_types={"MESH", "ARMATURE"}, use_mesh_modifiers=True, mesh_smooth_type="FACE",
                add_leaf_bones=False, use_armature_deform_only=True, bake_anim=tem_anim,
                path_mode="COPY", embed_textures=True)
            rel["exportados"].append(base + ".fbx")
    log("exportar", arquivos=rel["exportados"])

    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.outdir, f"{name}.blend"))

    rel["depois"] = {"objetos": len(meshes), "triangulos_lod0": rel["lods"][0]["triangulos"],
                     "materiais": len(bpy.data.materials), "imagens": len(bpy.data.images)}
    rel["segundos"] = round(time.time() - t0, 1)
    caminho_rel = os.path.join(args.outdir, f"{name}-relatorio.json")
    with open(caminho_rel, "w", encoding="utf-8") as f:
        json.dump(rel, f, ensure_ascii=False, indent=2)
    print(f"[bpy_cleanup] relatório: {caminho_rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
