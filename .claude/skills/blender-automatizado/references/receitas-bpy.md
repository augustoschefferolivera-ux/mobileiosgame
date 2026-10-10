# Receitas `bpy` para limpeza e exportação (Blender 4.x; use via `execute_blender_code` ou headless)

Cada bloco é independente: selecione o objeto alvo antes (`obj`). Confira o resultado com
`look` (modo `wireframe`/`material`) e `get_scene_info`. Nomes de operadores vêm da API do
Blender 3.x/4.x; se algum não existir na sua versão, o Blender avisa — não invente.

## Seleção e utilidades

```python
import bpy
def sel(objs, ativo=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = ativo or objs[0]
def tris(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print({o.name: tris(o) for o in meshes})
```

## Importar / exportar

```python
bpy.ops.import_scene.gltf(filepath='/caminho/in.glb')            # GLB/glTF
bpy.ops.import_scene.fbx(filepath='/caminho/in.fbx')             # FBX
bpy.ops.wm.obj_import(filepath='/caminho/in.obj')                # OBJ (3.3+); antes: import_scene.obj

sel(meshes, meshes[0])
bpy.ops.export_scene.gltf(filepath='/caminho/asset-lod0.glb', export_format='GLB',
    use_selection=True, export_apply=True, export_yup=True, export_texcoords=True,
    export_normals=True, export_materials='EXPORT', export_image_format='AUTO',
    export_animations=False, export_skins=False)
bpy.ops.export_scene.fbx(filepath='/caminho/asset-lod0.fbx', use_selection=True,
    apply_unit_scale=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
    object_types={'MESH','ARMATURE'}, use_mesh_modifiers=True, mesh_smooth_type='FACE',
    add_leaf_bones=False, use_armature_deform_only=True, bake_anim=False,
    path_mode='COPY', embed_textures=True)
```

Para personagem rigado: `export_skins=True, export_animations=True` (GLB) / `bake_anim=True`
(FBX) e selecione malha **e** armature. `export_apply=True` aplica modificadores (não combine
com shape keys que precisam ficar vivas).

## Aplicar transforms, unir, limpar

```python
sel(meshes, meshes[0])
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)   # não em malha rigada
bpy.ops.object.join()                                                        # props estáticos
obj = bpy.context.view_layer.objects.active
sel([obj], obj); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0001)      # merge by distance (m)
bpy.ops.mesh.delete_loose()                        # vértices/arestas soltos
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.mesh.dissolve_degenerate()
bpy.ops.object.mode_set(mode='OBJECT')
```

Cascas internas/flutuantes: `bpy.ops.mesh.separate(type='LOOSE')` e apague as peças com
poucos tris (`tris(o) < 50`) depois de olhar no `look` em `xray`.

## Remesh / retopologia

```python
# voxel (fecha buracos; perde detalhe fino; destrói UVs)
mod = obj.modifiers.new('Remesh', 'REMESH'); mod.mode = 'VOXEL'; mod.voxel_size = 0.01
bpy.ops.object.modifier_apply(modifier=mod.name)
# QuadriFlow (quads; precisa malha razoavelmente manifold; destrói UVs)
sel([obj], obj)
bpy.ops.object.quadriflow_remesh(target_faces=8000, mode='FACES', use_preserve_sharp=True)
```

Quad Remesher (pago) e Instant Meshes (BSD-3, externo) são alternativas quando o QuadriFlow
falha; veja `/otimizar-3d-para-mobile`.

## UV

```python
sel([obj], obj); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.02)   # 66°
bpy.ops.uv.pack_islands(margin=0.02)                                 # compacta no 0–1 (atlas)
bpy.ops.object.mode_set(mode='OBJECT')
```

Para atlas de kit: una as peças temporariamente (`join`), faça `pack_islands`, asse, depois
`separate(type='LOOSE')` ou mantenha unido se forem estáticas.

## Bake high → low (Cycles)

```python
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.samples = 16
mat = bpy.data.materials.new('asset-mat'); mat.use_nodes = True
low.data.materials.clear(); low.data.materials.append(mat)
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes.get('Principled BSDF')
def bake(passe, nome, noncolor, **kw):
    img = bpy.data.images.new(nome, 2048, 2048)
    if noncolor: img.colorspace_settings.name = 'Non-Color'
    tex = nodes.new('ShaderNodeTexImage'); tex.image = img; nodes.active = tex
    sel([high, low], low)
    bpy.ops.object.bake(type=passe, use_selected_to_active=True, cage_extrusion=0.02, margin=8, **kw)
    img.filepath_raw = f'/caminho/{nome}.png'; img.file_format = 'PNG'; img.save(); return tex
t_d = bake('DIFFUSE', 'asset-diffuse', False, pass_filter={'COLOR'})
t_n = bake('NORMAL', 'asset-normal', True, normal_space='TANGENT')
t_r = bake('ROUGHNESS', 'asset-roughness', True)
links.new(t_d.outputs['Color'], bsdf.inputs['Base Color'])
links.new(t_r.outputs['Color'], bsdf.inputs['Roughness'])
nm = nodes.new('ShaderNodeNormalMap'); links.new(t_n.outputs['Color'], nm.inputs['Color'])
links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
```

`AO` (`type='AO'`) é lento; asse só para cenário estático. Luz assada (`COMBINED` com luzes
na cena) só para kits de cenário com iluminação fixa.

## LODs por decimate

```python
for i, r in enumerate([0.5, 0.25, 0.1], start=1):
    sel([obj], obj); bpy.ops.object.duplicate(); d = bpy.context.view_layer.objects.active
    d.name = f'{obj.name}-lod{i}'; d.data.name = d.name
    m = d.modifiers.new('Decimate', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = r
    bpy.ops.object.modifier_apply(modifier=m.name); print(d.name, tris(d))
```

Em malha rigada, o Decimate preserva grupos de vértices, mas valide a deformação em cada LOD.

## Nomes previsíveis

```python
import re
def kebab(s): return re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').lower()
for o in meshes: o.name = kebab(o.name); o.data.name = o.name
for m in bpy.data.materials: m.name = kebab(m.name)
for im in bpy.data.images: im.name = kebab(im.name)
```

## Retarget offline (esqueleto comum)

```python
# para cada osso do alvo com nome igual no fonte:
for pb in alvo.pose.bones:
    if pb.name in fonte.pose.bones:
        c = pb.constraints.new('COPY_ROTATION'); c.target = fonte; c.subtarget = pb.name
sel([alvo], alvo)
bpy.ops.nla.bake(frame_start=1, frame_end=60, only_selected=True, visual_keying=True,
                 clear_constraints=True, bake_types={'POSE'})
```

Mapeie nomes diferentes com um dicionário antes; corrija pose de repouso (T/A) e escala.

## Cena com Poly Haven (via MCP, não `bpy`)

`search_assets(source="polyhaven", query="overcast afternoon", asset_type="hdris", previews=3)`
→ `import_asset(source="polyhaven", id="...", asset_type="hdris")`; texturas:
`import_asset(..., asset_type="textures", apply_to=["Wall"])`. Propriedades `polyhaven_*` ficam
gravadas nos objetos/materiais importados (fonte e licença CC0).
