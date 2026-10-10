---
name: otimizar-3d-para-mobile
description: >
  Reduz um modelo 3D gerado por IA ao orçamento do Safari do iPhone (Three.js): retopo/low-poly
  quando preciso, LODs (0,5/0,25/0,1) ligados a THREE.LOD, texturas ≤2048² em KTX2
  (UASTC/ETC1S), meshopt/Draco, GLB final e medição no navegador do iPhone, com gltfpack e
  glTF-Transform. Use sempre que um GLB/FBX/OBJ precisar entrar em Three.js/Babylon.js no
  iPhone (ou em Unity, Godot ou USDZ, se outro ADR mandar), mesmo que o usuário só diga "está
  pesado", "trava no celular" ou "exporta para o iPhone". Não use para gerar a malha
  (/gerar-ativos-3d), rigar (/rigging-e-animacao-3d), para limpeza interativa no Blender
  (/blender-automatizado, que esta skill chama quando precisa de retopo ou bake) nem para
  pré-renderizar sprites (/sprites-pre-renderizados-de-3d — lá decimar é opcional, só acelera
  o render).
license: MIT
compatibility: "Claude Code ou Codex; Node.js 20+ para gltfpack/glTF-Transform; toktx (KTX-Software) para KTX2 via glTF-Transform; macOS só se o alvo for USDZ"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [6, 8]
argument-hint: "[arquivo.glb] [--target web|unity|godot|realitykit] [--lods 0.5,0.25,0.1]"
disable-model-invocation: false
user-invocable: true
---

# Otimizar 3D para mobile

Entrega `<asset>-lod0..N.glb` (KTX2 + meshopt para web) dentro do orçamento do spec, com
relatório antes/depois e screenshot + fps medidos **no navegador** (Playwright WebKit como
prévia; Safari do iPhone real por milestone).

## Quando usar / quando não usar

- Use depois de `/gerar-ativos-3d` (toda saída bruta estoura o orçamento: TRELLIS.2 mira 1 M
  faces; Tripo/Meshy entregam dezenas a centenas de milhares de triângulos).
- Use quando o perfil no device mostrar frame time alto por geometria/textura.
- Não use para: gerar malha; rig/animação (a compressão de animação está em
  `/rigging-e-animacao-3d`); texturização nova (`/materiais-e-texturas-pbr`); mundos/splats
  (`/ambientes-e-mundos-3d`).

## Pré-requisitos

```bash
npm install -g @gltf-transform/cli   # glTF-Transform (MIT) — testado aqui na 4.5.1
npm install -g gltfpack              # gltfpack (MIT, meshoptimizer) — testado aqui na 1.3
# KTX2 pelo glTF-Transform exige toktx (KTX-Software, Apache-2.0) no PATH; gltfpack -tc não exige
```

- `python3` para `../gerar-ativos-3d/scripts/inspecionar_glb.py` (medições). Instalação
  guiada das CLIs: `/instalar-ferramentas`.
- Retopologia (só quando necessária): Blender via `/blender-automatizado` (QuadriFlow
  embutido), Instant Meshes (BSD-3, binários Win/Mac/Linux), Quad Remesher (~US$ 79 perpétuo
  [secundário, confirmar]), QuadMend (envolve Instant Meshes + QuadriFlow [secundário]).
- Só com ADR de outro alvo — RealityKit: Reality Converter (macOS) ou `usdzconvert` (Apple USD
  Python tools) [confirmar na doc da Apple]. Unity: skill oficial `asset-transformer-toolkit` do
  `unity-agent-plugin` quando houver Asset Transformer Toolkit ≥4.0 (pacote com direito de
  uso; não instale sozinho) e Addressables para streaming. Godot: importador GLB nativo.

## Entradas

- GLB/glTF bruto + `PROVENANCE.md` + spec (`design/assets/specs/<asset>-3d.md`) com orçamento.
- Alvo (`CLAUDE.md` / ADR): **`web`** (Three.js/Babylon, padrão deste repositório); `unity`,
  `godot`, `realitykit` só com ADR próprio.
- Orçamento. Se o spec não fixou, use a tabela de `/gerar-ativos-3d` (herói 30–50K, prop
  5–10K; inferência) e o teto da Apple: **≤100K polígonos, 1 conjunto 2048², ≤10 s de
  animação** (AR Quick Look até iPhone 7; RealityKit tem "a bit more wiggle room").

## Passos

1. **Medir antes** (nunca otimize sem medir — regra do `perf-profile`, Game Studios MIT):
   ```bash
   python3 .claude/skills/gerar-ativos-3d/scripts/inspecionar_glb.py in.glb --max-tris 50000 --max-texture 2048
   gltf-transform inspect in.glb
   ```
   Anote tris na cena, nº de malhas/materiais (≈ draw calls), texturas e extensões.
2. **Decidir retopologia**. Decimação (`simplify`) basta para props estáticos e cenário.
   Faça retopo (QuadriFlow/Instant Meshes/Quad Remesher, ou "smart low-poly" do Tripo /
   "Smart Topology" do Meshy / `remesh quad` do SPAR3D na geração) quando: o asset será
   **rigado e deformado**; tris > ~3× o orçamento; a malha tem cascas/ruído que o simplify
   só espalha. Retopo + bake ficam em `/blender-automatizado` (`bpy_cleanup_template.py` com
   `--remesh quadriflow --target-faces N --bake all`), que devolve um GLB limpo para o passo 3.
3. **LODs, texturas, compressão** com o script desta skill:
   ```bash
   .claude/skills/otimizar-3d-para-mobile/scripts/optimize_glb.sh -i in.glb -o assets/3d/opt/<asset> \
     --target web --lods 0.5,0.25,0.1 --error 0.001 --tex 2048 --ktx2 uastc    # web = KTX2 + meshopt
   # alternativa num só binário: --engine gltfpack (usa -si, -tl, -tc, -cc, -kn -km)
   # outros alvos (só com ADR): --target unity|godot (sem meshopt) · realitykit (sem KTX2/compressão; USDZ espera PNG/JPEG)
   ```
   O script faz `weld` → `resize` → `simplify --ratio R --error E` por LOD → `uastc|etc1s` →
   `meshopt` (só web) e grava `<asset>-relatorio.md` com tris/texturas por LOD. Parâmetros e
   flags em `references/gltfpack-e-gltf-transform.md`. Testado neste repositório numa esfera
   sintética de 20.000 tris: LODs 0,5/0,25/0,1 com `--error 0.001` → 9.999/5.000/4.509 tris
   (o LOD3 parou no limite de erro; `--error 0.01` deixa chegar perto de 0,1) e textura
   1024² → 512² com `--tex 512`. O gltfpack do npm (build node.js) **não tem BasisU**: para
   `-tc` use o binário nativo das releases do meshoptimizer.
4. **Verificar o resultado** com o inspetor (`--max-tris` do orçamento) e visualmente (Blender
   MCP `look` em `angles` para cada LOD, ou viewer do engine): silhueta preservada no LOD1,
   sem buracos no LOD2/3, UVs intactas, normais sem facetamento indevido.
5. **Exportar por destino**:
   - **Web (padrão)**: GLB com `KHR_texture_basisu` (KTX2) + `EXT_meshopt_compression`. No
     three.js r186: `GLTFLoader` + `setMeshoptDecoder(MeshoptDecoder)` (`three/addons/libs/
     meshopt_decoder.module.js`, ≈29 KB) + `setKTX2Loader(new KTX2Loader().setTranscoderPath(
     '/basis/').detectSupport(renderer))` (transcoder `basis_transcoder.js/.wasm` ≈0,6 MB,
     copiado de `three/examples/jsm/libs/basis/`); `detectSupport` transcodifica para ASTC/
     PVRTC/ETC2 conforme o iPhone. LODs: `new THREE.LOD().addLevel(mesh, distancia, histerese)`
     com `-lod0..3.glb`. Repetição: `InstancedMesh` ou `EXT_mesh_gpu_instancing` (`gltfpack -mi`).
     Babylon 9: `@babylonjs/loaders` + `KhronosTextureContainer2.URLConfig`.
   - **Unity / Godot / RealityKit** (só com ADR; `references/orcamento-apple-e-usdz.md`):
     GLB/FBX + `LOD Group` / importador nativo / Reality Converter → USDZ sem KTX2 e sem LOD
     confirmado (versões por classe de dispositivo).
6. **Medir no navegador**: `bash scripts/verify.sh --feature <id>` (Playwright WebKit:
   `state.json` com fps, `drawCalls` e `triangles` de `renderer.info`) e depois Safari no iPhone
   real (`vite preview --host`). Repita o passo 3 com `--lods`/`--tex` menores até caber. Sem
   medição no iPhone real por milestone, o asset não está pronto.

## Critério de pronto e evidência

- `assets/3d/opt/<asset>/<asset>-lod0..N.glb` (+ `.usdz`/FBX quando o alvo exigir) **dentro do
  orçamento** segundo `inspecionar_glb.py` (código de saída 0 com `--max-tris`/`--max-texture`).
- `production/evidencias/<data>-<asset>-otimizacao/`: `inspect-antes.txt`, `inspect-depois.txt`,
  `<asset>-relatorio.md`, screenshots de cada LOD, screenshot do asset **rodando no
  navegador** (Playwright) com fps/draw calls, e nota do teste no iPhone real por milestone.
  Métrica sem orçamento fixado = `NÃO AVALIADO`, não "OK".
- `PROVENANCE.md` atualizado com ferramentas e versões (`gltf-transform --version`, `gltfpack`).

## Armadilhas conhecidas

- **Quantização**: gltfpack liga `KHR_mesh_quantization` por padrão; alguns importadores não a
  leem (Unity/Unreal não documentados no README do gltfpack). Use `-noq` se a importação falhar.
- **Compressão meshopt/Draco**: exige decodificador no loader; gltfpack **não suporta Draco**.
  Para Unity/Godot/RealityKit prefira sem compressão (`--compress none`, padrão do script fora
  de `--target web`).
- **KTX2 e USDZ**: USDZ espera PNG/JPEG; a compressão ASTC acontece na importação da Apple,
  não no arquivo. Não gere KTX2 para RealityKit.
- **`simplify` solda antes** ("split vertices will limit the simplifier"); UVs com muitas ilhas
  reduzem o ganho — reduza `--error` ou faça retopo. `--lock-border` para terreno em chunks.
- **TRELLIS.2** exporta opaco; reconecte alpha antes de otimizar se o asset tem transparência.
- **Draw calls**: 1 material por asset (atlas) importa tanto quanto tris; `gltf-transform
  optimize --join` funde malhas (pode quebrar culling e nomes — não use em peças animadas).
- **Apple não publica números novos** (2024: "iterar de low-poly para cima"); o WWDC24
  "Optimize your 3D assets for spatial computing" tem tabela de triângulos não lida aqui.
- **Instant Meshes** tem 93 issues abertas e é de 2015; funciona, mas sem manutenção ativa.
- **Mesh LOD automático do Unity 6.x** não pôde ser verificado; use `LOD Group` manual.

## Exportar para web

Formato: **GLB** com KTX2 (UASTC para normais/hero, ETC1S para albedo de props) + meshopt;
LOD0 ≤ orçamento do spec; LOD1/2/3 a 0,5/0,25/0,1; texturas ≤2048² (um atlas por asset);
mipmaps ligados. Tamanhos de referência: prop 100–300 KB, herói ≤2 MB, decoders 29 KB
(meshopt) + ≈0,6 MB (basis) uma vez por jogo; total antes do primeiro frame <10 MB
(inferência). Carregamento: `GLTFLoader` com `MeshoptDecoder` + `KTX2Loader` (three.js r186),
`import()` por fase, `dispose()` ao sair. USDZ (via Reality Converter, sem KTX2) ou FBX só com
ADR de app nativo/Unity/Godot. **Licença de saída**: a otimização não altera a licença do asset
— ela segue o `PROVENANCE.md` (gerador); gltfpack, glTF-Transform e toktx não impõem termos.

## Pré-render para Phaser

Se o destino é sprite 2D, esta skill é opcional: use só `--lods 0.5` (ou o `--decimate` do
`bpy_cleanup_template.py`) para acelerar o render de malhas de 1 M faces (TRELLIS.2) e **não**
gere KTX2 (o Blender não lê). Siga para `/sprites-pre-renderizados-de-3d`; o orçamento passa a
ser o do atlas (páginas 2048² × 16 MB de GPU), não o de triângulos.

## Fontes

- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ5, KQ6).
- Relatório: `reports/Criação de jogos totalmente por IA.md` (seções "Ativos 3D", "Stack").
- gltfpack README: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md ; meshoptimizer: https://github.com/zeux/meshoptimizer
- glTF-Transform: https://github.com/donmccurdy/glTF-Transform ; `simplify.ts`: https://github.com/donmccurdy/glTF-Transform/blob/main/packages/functions/src/simplify.ts
- Apple, orçamento AR Quick Look/RealityKit: https://developer.apple.com/forums/thread/693867 ; DTS 2024: https://developer.apple.com/forums/thread/751764 ; LOD em USDZ sem resposta: https://developer.apple.com/forums/thread/757297
- Apple, USD para dispositivos Apple: https://developer.apple.com/documentation/realitykit/creating-usd-files-for-apple-devices
- Instant Meshes: https://github.com/wjakob/instant-meshes ; Quad Remesher [secundário]: https://superrendersfarm.com/article/quad-remesher-blender-retopology ; QuadMend [secundário]: https://superhivemarket.com/products/quadmend
- SPZ/MetalSplatter (splats, ver `/ambientes-e-mundos-3d`): https://github.com/nianticlabs/spz ; https://github.com/scier/MetalSplatter
- Unity `asset-transformer-toolkit` (só citada): Unity-Technologies/unity-agent-plugin, `skills/asset-transformer-toolkit/SKILL.md`.
- three.js r186 (código lido em 10/10/2026): `examples/jsm/loaders/KTX2Loader.js` (`detectSupport`), `GLTFLoader.js` (`setMeshoptDecoder`, `setKTX2Loader`, `EXT_mesh_gpu_instancing`), `src/objects/LOD.js` (`addLevel(object, distance, hysteresis)`) — https://github.com/mrdoob/three.js ; versão: https://registry.npmjs.org/three/latest
- Adaptações do Claude-Code-Game-Studios (MIT): ver `THIRD_PARTY_NOTICES.md` nesta pasta.
