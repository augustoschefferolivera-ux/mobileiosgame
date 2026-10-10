---
name: otimizar-3d-para-mobile
description: >
  Reduz um modelo 3D gerado por IA ao orçamento de iPhone: retopo/low-poly quando preciso,
  LODs (0,5/0,25/0,1), texturas ≤2048², KTX2/ASTC, exportação GLB/FBX/USDZ e medição no
  dispositivo, com gltfpack e glTF-Transform. Use sempre que um GLB/FBX/OBJ precisar entrar
  em Unity, Godot, RealityKit ou web mobile, mesmo que o usuário só diga "está pesado",
  "trava no celular" ou "exporta para o iPhone". Não use para gerar a malha
  (/gerar-ativos-3d), rigar (/rigging-e-animacao-3d) nem para limpeza interativa no Blender
  (/blender-automatizado, que esta skill chama quando precisa de retopo ou bake).
license: MIT
compatibility: "Claude Code ou Codex; Node.js para gltfpack/glTF-Transform; macOS para Reality Converter/Xcode"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [6, 8]
argument-hint: "[arquivo.glb] [--target unity|godot|realitykit|web] [--lods 0.5,0.25,0.1]"
disable-model-invocation: false
user-invocable: true
---

# Otimizar 3D para mobile

Entrega `<asset>-lod0..N.glb` (ou FBX/USDZ) dentro do orçamento do spec, com relatório
antes/depois e screenshot + frame time medidos **no dispositivo ou simulador**.

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
- RealityKit: Reality Converter (macOS) ou `usdzconvert` (Apple USD Python tools)
  [confirmar na doc da Apple]. Unity: skill oficial `asset-transformer-toolkit` do
  `unity-agent-plugin` quando houver Asset Transformer Toolkit ≥4.0 (pacote com direito de
  uso; não instale sozinho) e Addressables para streaming. Godot: importador GLB nativo.

## Entradas

- GLB/glTF bruto + `PROVENANCE.md` + spec (`design/assets/specs/<asset>-3d.md`) com orçamento.
- Alvo (`CLAUDE.md` / ADR de `/escolher-engine-e-alvo`): `unity`, `godot`, `realitykit` ou `web`.
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
     --target unity --lods 0.5,0.25,0.1 --error 0.001 --tex 2048 --ktx2 uastc
   # alternativa num só binário: --engine gltfpack (usa -si, -tl, -tc, -cc, -kn -km, -noq)
   # RealityKit/USDZ: --target realitykit  (desliga KTX2 e compressão; USDZ espera PNG/JPEG)
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
5. **Exportar por engine** (`references/orcamento-apple-e-usdz.md`):
   - **Unity**: importe os GLB/FBX; `LOD Group` com os 3 níveis; compressão de textura iOS =
     **ASTC** (regra `.claude/rules/unity-csharp.md`); Addressables para carregar sob demanda;
     Asset Transformer Toolkit só se o pacote existir no projeto.
   - **Godot**: importe o GLB; configure compressão de textura para mobile no import e use o
     renderer Mobile/Compatibility fixado no projeto [confirmar opções exatas na doc da versão].
   - **RealityKit**: GLB sem KTX2 → Reality Converter (ou `usdzconvert`) → `.usdz`
     (UsdPreviewSurface). Suporte a LOD em USDZ **não confirmado** (pergunta de 2024 sem
     resposta): gere **versões por classe de dispositivo** e troque por distância em código.
   - **Web**: GLB com KTX2 + meshopt (`--target web`); o loader precisa de decodificador
     (three.js r122+, Babylon 5.0+).
6. **Medir no dispositivo**: build, rode a cena com o asset, capture screenshot e frame time
   (Xcode Instruments/MetricKit, Unity Profiler no device, monitor do Godot). Repita o passo 3
   com `--lods` ou `--tex` menores até caber. Sem medição no device, o asset não está pronto.

## Critério de pronto e evidência

- `assets/3d/opt/<asset>/<asset>-lod0..N.glb` (+ `.usdz`/FBX quando o alvo exigir) **dentro do
  orçamento** segundo `inspecionar_glb.py` (código de saída 0 com `--max-tris`/`--max-texture`).
- `production/evidencias/<data>-<asset>-otimizacao/`: `inspect-antes.txt`, `inspect-depois.txt`,
  `<asset>-relatorio.md`, screenshots de cada LOD, screenshot do asset **rodando no
  simulador/dispositivo** e o número de frame time/FPS medido. Métrica sem orçamento fixado =
  `NÃO AVALIADO`, não "OK".
- `PROVENANCE.md` atualizado com ferramentas e versões (`gltf-transform --version`, `gltfpack`).

## Armadilhas conhecidas

- **Quantização**: gltfpack liga `KHR_mesh_quantization` por padrão; alguns importadores não a
  leem (Unity/Unreal não documentados no README do gltfpack). Use `-noq` se a importação falhar.
- **Compressão meshopt/Draco**: exige decodificador no loader; gltfpack **não suporta Draco**.
  Para Unity/Godot/RealityKit prefira sem compressão (`--compress none`, padrão do script).
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

## Exportar para mobile

Formato: **GLB** (Unity/Godot/web) ou **USDZ** via Reality Converter (RealityKit). LOD0 ≤
orçamento do spec; LOD1/2/3 a 0,5/0,25/0,1. Texturas ≤2048² (um atlas por asset), KTX2
UASTC/ETC1S para Unity/web, PNG/JPEG → ASTC na importação para RealityKit; mipmaps ligados.
Tamanho: registre KB por LOD no relatório. Carregamento: Addressables (Unity), `load()`/
`ResourceLoader` (Godot), `ModelEntity(named:)`/`Entity(contentsOf:)` (RealityKit) [confirmar
nomes exatos da API na doc da versão]. **Licença de saída**: a otimização não altera a licença
do asset — ela segue o `PROVENANCE.md` (gerador); gltfpack, glTF-Transform e toktx não impõem
termos sobre a saída.

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
- Adaptações do Claude-Code-Game-Studios (MIT): ver `THIRD_PARTY_NOTICES.md` nesta pasta.
