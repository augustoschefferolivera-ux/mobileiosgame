# Retarget no engine e compressão de animação para mobile

## Princípio: um esqueleto por família

Retarget em runtime custa CPU e introduz deslizamento de pés. Quando possível, rigue **todos
os humanoides com o mesmo esqueleto** (mesma hierarquia e nomes) no Blender e compartilhe os
clipes; faça retarget **uma vez, offline**, para qualquer clipe externo (Mixamo, Rokoko,
CC0). O engine só reproduz.

## Blender (offline)

- Importe o clipe fonte (FBX/BVH) e o personagem rigado; alinhe pose de repouso (T/A) e
  escala (metros); aplique transforms (`bpy.ops.object.transform_apply`).
- Retarget: use o add-on de retarget que o projeto fixar (não há ferramenta única citada nas
  fontes; registre nome/versão no `PROVENANCE.md`) ou constraints `COPY_ROTATION` por osso +
  bake (`bpy.ops.nla.bake`) — receita em `/blender-automatizado` (`references/receitas-bpy.md`).
- Exporte GLB com `export_animations=True`, `export_skins=True`, clipes como ações nomeadas
  (NLA), ou FBX com `bake_anim=True`, `add_leaf_bones=False`, `apply_unit_scale=True`.

## Unity

- Importer: Rig → **Humanoid** (cria Avatar; retarget automático entre humanoides) ou
  **Generic** (criaturas; sem retarget). Verifique o mapeamento de ossos no Avatar.
- Animation tab: **Anim. Compression** (Off / Keyframe Reduction / Optimal) e tolerâncias de
  rotação/posição/escala; **Optimize Game Objects** remove transforms de ossos não expostos.
  Nomes exatos podem variar por versão: confira a doc do Unity 6.3 LTS fixado.
- Clipes: um `AnimationClip` por ação, `Loop Time` em `idle`/`walk`; Animator Controller
  simples (poucas camadas) para mobile.

## Godot 4.x

- `Skeleton3D` por personagem; no import do GLB, **Retarget** com `BoneMap` e
  `SkeletonProfileHumanoid` para converter o esqueleto fonte ao perfil humanoide padrão
  [confirmar nomes exatos na doc da versão fixada].
- `AnimationPlayer` + `AnimationLibrary` para compartilhar clipes; opção de **compressão de
  animação** no import (perde precisão em troca de memória) [confirmar nome exato].

## RealityKit (iOS)

- Animação esquelética e blendshapes viajam dentro do **USDZ**; carregue o `Entity` e toque
  as `AnimationResource`s disponíveis [confirmar API na doc da versão].
- **Retarget automático não documentado** nas fontes lidas: exporte cada personagem já com os
  seus clipes no esqueleto final.
- Teto Apple: ≤10 s por animação (AR Quick Look), "wiggle room" em RealityKit.

## Compressão e orçamento (o que medir)

| Item | Alvo sugerido | Como |
|---|---|---|
| Duração por clipe | ≤10 s (Apple) | `inspecionar_glb.py --max-anim-seconds 10` |
| Taxa de amostragem | 24–30 Hz | `gltfpack -af 30` (padrão 30; 0 desliga) ou `gltf-transform resample --tolerance` |
| Quantização de curvas | translação 16 bits, rotação 12 bits (padrões do gltfpack `-at/-ar`) | `gltfpack -at 16 -ar 12` |
| Influências por vértice | ≤4 (um conjunto `JOINTS_0/WEIGHTS_0`) | verificar no Blender (Limit Total = 4) antes de exportar |
| Ossos | poucas dezenas; sem ossos de controle (IK targets) exportados | remover ossos "deform=False" no export (`use_armature_deform_only=True` no FBX) |
| Keyframes | só o necessário; curvas constantes removidas | `resample`/importer |
| Ordem do pipeline | retopo → rig → pesos → LODs (validar LOD animado) → export | — |

Tudo isso é prática de pipeline; os únicos números com fonte são os da Apple (10 s) e os
padrões documentados do gltfpack. Métrica sem orçamento fixado no brief = `NÃO AVALIADO`.
