---
name: materiais-e-texturas-pbr
description: >
  Obtém, corrige e empacota materiais PBR e texturas para jogo mobile: aproveita o PBR dos
  geradores (Tripo, Meshy 7, TRELLIS.2), texturiza malhas sem textura (MV-Adapter, Material
  Anything), gera texturas sem costura com modelos de imagem e verifica o tiling, monta
  atlas, comprime (KTX2 → ASTC/PVRTC no iPhone, mipmaps), aplica decals e escolhe materiais
  leves do three.js (Lambert/Phong/Toon) ou o look toon do pré-render. Use sempre que o
  usuário pedir textura, material, "pintar o modelo",
  tileable, atlas, normal map, decal ou shader para o jogo. Não use para gerar a malha
  (/gerar-ativos-3d), para LODs (/otimizar-3d-para-mobile) nem para sprites/UI 2D.
license: MIT
compatibility: "Claude Code ou Codex; GPU NVIDIA (10–14 GB VRAM) só para MV-Adapter/Material Anything; Blender para bake; Node.js para glTF-Transform"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [4, 6, 8]
argument-hint: "[asset|textura] [pbr|tileable|atlas|decal|shader] [--tam 2048]"
disable-model-invocation: false
user-invocable: true
---

# Materiais e texturas PBR

Entrega o conjunto PBR (base color, normal, metallic-roughness, opcional occlusion/emissive)
de um asset ou uma textura tileable verificada, dentro do orçamento de memória, aplicada e
vista no jogo (screenshot do Playwright/iPhone no Three.js) ou no render de sprites (Phaser).

## Quando usar / quando não usar

- Use para: aceitar/corrigir o PBR do gerador; texturizar malha nua (TripoSG, retopo, scan);
  texturas de cenário sem costura; atlas por kit; compressão e mipmaps; decals; shader mobile.
- Não use para: gerar geometria; reduzir polígonos; arte 2D (sprites/UI têm skills próprias);
  pipelines Substance completos (fora do escopo IA-first).

## Pré-requisitos

- `python3` + Pillow para `scripts/verificar_tiling.py` (`pip install pillow`).
- glTF-Transform (`npm install -g @gltf-transform/cli`) para `resize`, `uastc`/`etc1s`
  (precisa de `toktx`, KTX-Software); gltfpack nativo para `-tc`.
- Blender via `/blender-automatizado` para bake, UV pack e religar mapas.
- Modelo de imagem do projeto para texturas tileable (`gpt-image-1.5` com `background`
  transparente para decals; Nano Banana Pro para variações com referência — rotas de
  `/gerar-sprites-2d`). **Nenhum** modelo de imagem lista "tileable garantido": sempre verifique.
- Opcional (GPU NVIDIA): **MV-Adapter** (Apache-2.0; texto/imagem → textura de malha; ~14 GB
  VRAM, variantes SD2.1 <10 GB; **sem PBR**), **Material Anything** (MIT; albedo, roughness,
  metallic, bump a partir de GLB; scripts miram Blender 3.2.2).
- Lista verde de `LICENCAS.md` (`/licencas-e-proveniencia`): Hunyuan3D 2.1 Paint-PBR está na
  vermelha (licença territorial). Tiles 2D em grade usam o `verificar_seamless.py` de
  `/cenarios-e-tilesets`; o `verificar_tiling.py` daqui cobre texturas 3D e panoramas.

## Entradas

- Asset (GLB) + spec + style card (paleta, nível de desgaste/realismo, escala de detalhe).
- Orçamento de textura: teto de **um conjunto 2048² por asset** (regra da Apple para AR Quick
  Look, reutilizada para o Safari por falta de número oficial; no pré-render só o atlas de
  sprites conta); por
  categoria (inferência do relatório): herói 2048², inimigo 1024–2048², prop 512–1024², kit de
  cenário um atlas 2048². Memória estimada (aritmética dos formatos, não medição):

| Textura | RGBA8 sem compressão (+33 % mipmaps) | ASTC 4×4 (8 bpp) | ASTC 6×6 (3,56 bpp) | ASTC 8×8 (2 bpp) |
|---|---|---|---|---|
| 2048² | 16 MB (21,3 MB) | 4 MB (5,3 MB) | 1,8 MB (2,4 MB) | 1 MB (1,3 MB) |
| 1024² | 4 MB (5,3 MB) | 1 MB (1,3 MB) | 0,44 MB (0,6 MB) | 0,25 MB (0,33 MB) |

Multiplique pelo número de mapas (base color, normal, MR, AO…) por asset e some a cena.

## Passos

1. **Inventariar o que já veio**: `inspecionar_glb.py asset.glb` lista `mapas_presentes` por
   material, `alphaMode`, dimensões. Geradores entregam PBR: TRELLIS.2 (base color, roughness,
   metallic, **opacity**, mas GLB opaco por padrão), Meshy 7 ("8K" [fornecedor]; Multiview),
   Tripo 3.0 (edição por "magic brush"). Regra do relatório: **aceite o PBR do gerador e
   reduza/comprima**; refaça só o que estiver errado.
2. **Avaliar qualidade** (Blender MCP `look` em `material` e albedo isolado): luz/sombra
   assadas no base color (erro comum — repinte ou rebaixe contraste), costuras, metallic
   "sujo" (plástico brilhando como metal), normal invertido (eixo Y: glTF é +Y/OpenGL; DirectX
   inverte), roughness plana. Anote no checklist (`references/texturas-e-compressao.md`).
3. **Texturizar malha nua** (quando preciso): (a) re-gerar no gerador pago com a malha como
   referência; (b) MV-Adapter texto/imagem→textura (albedo apenas) + roughness/metallic
   manuais; (c) Material Anything para o conjunto PBR; (d) projeção manual no Blender
   (Stable Projectorz é de 2024 e sem confirmação de PBR — [background]). Resultado: bake no
   UV final (`/blender-automatizado --bake all`).
4. **Textura sem costura** (cenário): prompt "seamless tileable texture, top-down, flat
   even lighting, no shadows, no vignette, no text", quadrada, potência de 2; depois:
   ```bash
   python3 .claude/skills/materiais-e-texturas-pbr/scripts/verificar_tiling.py tex.png --preview tex-2x2.png
   ```
   Razão borda/interior ≤1,5 e inspeção do mosaico 2×2 (padrões repetidos óbvios são tão ruins
   quanto costuras). Corrija no Blender/editor (offset + clone) e gere normal/roughness por
   bake de altura ou ferramenta do projeto; registre no `PROVENANCE.md`.
5. **Atlas**: um material por asset; kits de cenário num atlas 2048² (Blender `pack_islands`
   com margem 0,02 + bake; `gltf-transform optimize --palette` funde materiais de cor sólida).
   Nenhuma ferramenta de IA faz atlas.
6. **Compressão e mipmaps**: `gltf-transform resize --width 2048 --height 2048` → `uastc`
   (normais, hero) ou `etc1s` (albedo de props, menor) → KTX2 dentro do GLB; no three.js o
   `KTX2Loader.detectSupport(renderer)` transcodifica para **ASTC/PVRTC/ETC2** conforme a
   extensão WebGL do iPhone (ou `hasFeature` no WebGPU), sem descomprimir na CPU; mipmaps
   ligados (`--mipmaps`); normal map em espaço linear (`colorSpace = NoColorSpace`). Sprites: a
   textura fica no Blender — o que entra no jogo é o atlas PNG. Unity/Godot/USDZ só com ADR
   (ASTC na importação). Meça MB com `inspecionar_glb.py`.
7. **Decals** (sujeira, logos do próprio jogo, dano): PNG com alfa (`gpt-image-1.5`
   `background: "transparent"`) → no three.js, quad com `MeshBasicMaterial({ map, transparent:
   true, depthWrite: false, polygonOffset: true })` apoiado na superfície, ou `DecalGeometry`
   de `three/addons/geometries/DecalGeometry.js` (existe na r186); no pré-render, pinte no
   Blender. Limite a quantidade (overdraw).
8. **Material leve** (three.js r186): `MeshLambertMaterial`/`MeshPhongMaterial` para props e
   cenário, `MeshStandardMaterial` só em hero/metais, `MeshBasicMaterial` + lightmap para
   cenário assado, `MeshToonMaterial` (`gradientMap`) para look chapado que esconde malha e
   textura de gerador; evite `MeshPhysicalMaterial` e extensões `KHR_materials_*` avançadas
   (transmission, volume, iridescence — o GLTFLoader as lê, mas custam fill-rate no iPhone).
   Pré-render: toon por Shader to RGB no Blender (`/sprites-pre-renderizados-de-3d --toon`).
   Unity/Godot (`references/texturas-e-compressao.md`) só com ADR.
9. **Ver no jogo**: aplique, rode `verify.sh` (Playwright) e o Safari do iPhone, screenshot sob
   a iluminação do jogo, compare com o style card; some os KTX2 carregados. Evidência em
   `production/evidencias/<data>-<asset>-material/`.

## Critério de pronto e evidência

- Mapas finais em `assets/3d/<asset>/tex/` com nomes `<asset>-basecolor.png|.ktx2`,
  `<asset>-normal`, `<asset>-mr` (metallic no B, roughness no G — padrão glTF), tamanhos ≤
  orçamento; GLB atualizado passa em `inspecionar_glb.py --max-texture 2048`.
- Texturas tileable: saída do `verificar_tiling.py` (JSON) + `*-2x2.png` inspecionado.
- Screenshot do asset no navegador (Playwright/iPhone) com a iluminação do jogo; total de MB de
  texturas da cena registrado; `PROVENANCE.md` com modelo de imagem/versão/prompt/seed.

## Armadilhas conhecidas

- **Licenças**: Hunyuan3D 2.1 (PBR) — territorial; Substance 3D Sampler Text to Texture
  (Firefly, beta 2024) — créditos e termos Adobe, sem novidades 2026 encontradas; MV-Adapter
  (Apache-2.0) e Material Anything (MIT) são código — a saída é sua, mas os modelos base (SD)
  têm licenças próprias.
- **Modelos de imagem não garantem tiling**: verifique sempre; panoramas precisam de checagem
  só horizontal (`--eixo horizontal`) e dos polos.
- **Texturas 8K/4K dos geradores** não cabem: reduza para 2048² antes de importar; 4 mapas
  2048² RGBA8 sem compressão = 64 MB (+ mipmaps) num asset só.
- **ETC1S em normal maps** gera artefatos; use UASTC (ou ASTC de bloco pequeno) para normais.
- **Alpha**: TRELLIS.2 exporta OPAQUE; `MASK` é mais barato que `BLEND` no mobile (sem ordenação).
- **Decals e overdraw**: cada decal é um quad transparente a mais; conte-os no orçamento.
- **Benchmarks de material** (Hi3DEval mede albedo/saturação/metallicness) não têm placar
  lido; avalie no device com a luz do jogo.
- **Sem fontes 2025–26** sobre texto→PBR tileable (MatFuse/Material Palette) nem sobre decals
  por IA; as rotas acima usam modelos de imagem genéricos + verificação.

## Exportar para web

Conjunto por asset: base color (sRGB), normal (linear, +Y), metallic-roughness empacotado
(B=metallic, G=roughness), opcional occlusion/emissive; ≤2048² hero, ≤1024² prop, um atlas
por kit; KTX2 UASTC (normais/hero) ou ETC1S (albedo) dentro do GLB (`gltf-transform
uastc|etc1s`, gltfpack nativo `-tc`), lido por `KTX2Loader` → ASTC/PVRTC/ETC2 na GPU do iPhone;
mipmaps ligados; MB por asset no relatório (2048² ETC1S ≈ 0,5–1 MB em disco; na GPU ASTC 4×4 =
4 MB). Material: Lambert/Phong/Toon; Standard só em hero. PNG/JPEG → USDZ só com ADR nativo.
**Licença de saída**: PBR do gerador segue o plano (Tripo/Meshy pagos; TRELLIS.2 MIT);
texturas geradas por modelo de imagem seguem os termos desse modelo (confira na skill de arte
2D); Poly Haven CC0; MV-Adapter/Material Anything: código aberto, saída sua — registre tudo
no `PROVENANCE.md`.

## Pré-render para Phaser

No pré-render a textura só precisa ficar boa **sob a câmera e a luz fixas do render**: albedo
sem luz assada (sombras pintadas não giram com as 8 direções), contraste moderado, sem
metallic "sujo" (brilha errado em toon). Com `--toon` o `render_sprites.py` liga `Diffuse →
Shader to RGB → Color Ramp × Base Color`, então roughness/metallic/normal são ignorados — gaste
créditos só no albedo. Texturas tileable servem para tiles isométricos renderizados do Blender
com o mesmo `--ppm` dos personagens; o `verificar_tiling.py` continua valendo antes do render.

## Fontes

- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ3, KQ5).
- Relatório: `reports/Criação de jogos totalmente por IA.md` (seção "Ativos 3D"; stack).
- TRELLIS.2 (PBR, opacidade, GLB opaco): https://github.com/microsoft/TRELLIS.2
- Meshy 7 PBR/8K: https://docs.comfy.org/tutorials/partner-nodes/meshy/meshy-7 ; https://prtimes.jp/main/html/rd/p/000000006.000186154.html
- Tripo 3.0 (magic brush): https://www.businesswire.com/news/home/20250820723593/en/Tripo-the-Frontrunner-of-3D-AI-Boom-Supercharges-New-Era-in-Content-Creation-with-3.0-Upgrade
- Hunyuan3D 2.1 e LICENSE: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 ; https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE
- MV-Adapter: https://github.com/huanngzh/MV-Adapter ; Material Anything: https://github.com/3DTopia/MaterialAnything ; Hi3DEval: https://github.com/3DTopia/Hi3DEval
- Stable Projectorz [background]: https://cgpress.org/archives/stable-projectorz-an-ai-tool-for-3d-texture-generation.html ; Substance 3D Sampler Firefly [background]: https://blog.adobe.com/en/publish/2024/03/18/adobe-announces-firefly-powered-features-substance-3d-apps
- glTF-Transform (resize, uastc/etc1s, optimize --palette): https://github.com/donmccurdy/glTF-Transform ; gltfpack `-tc/-tu`: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
- Apple (1 conjunto 2048²): https://developer.apple.com/forums/thread/693867
- ASTC no iOS (inferência a partir de Unity/Spine; sem confirmação Apple): `research_notes/.../arte_2d_sprites_ui.md` e https://esotericsoftware.com/forum/d/9684
- Blender MCP (Poly Haven texturas CC0): https://github.com/ahujasid/blender-mcp
- three.js r186 (código lido 10/10/2026): `src/materials/MeshToonMaterial.js` (`gradientMap`), `examples/jsm/loaders/KTX2Loader.js` (`detectSupport`), `examples/jsm/geometries/DecalGeometry.js` — https://github.com/mrdoob/three.js
