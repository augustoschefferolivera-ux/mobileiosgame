---
name: rigging-e-animacao-3d
description: >
  Coloca esqueleto, pesos de pele e animações em um personagem ou criatura 3D gerado por IA
  (auto-rig do Tripo/Meshy, UniRig → SkinTokens, Puppeteer, Mixamo), obtém movimento por
  vídeo/texto (Rokoko Create, DeepMotion, Cascadeur) ou áudio (Audio2Face-3D, bake de
  blendshapes), faz retarget (Blender ou SkeletonUtils do three.js) e comprime a animação
  para a web — ou entrega clipes nomeados para /sprites-pre-renderizados-de-3d. Use sempre que um
  modelo precisar andar, atacar, falar ou ser animado, mesmo que o usuário só diga "dá vida
  ao personagem". Não use para gerar a malha (/gerar-ativos-3d), reduzir polígonos
  (/otimizar-3d-para-mobile) nem para animação 2D/Spine (/animar-sprites).
license: MIT
compatibility: "Claude Code ou Codex; GPU NVIDIA (8–14 GB VRAM) para UniRig/SkinTokens/Puppeteer/Audio2Face; Blender para retarget e bake"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [6]
argument-hint: "[arquivo.glb|fbx] [humanoide|criatura] [--clips idle,walk,attack]"
disable-model-invocation: false
user-invocable: true
---

# Rigging e animação 3D

Entrega um personagem rigado (GLB/FBX com esqueleto e pesos) com clipes nomeados
(`idle`, `walk`, …) tocando **no jogo (Three.js, via Playwright/iPhone) ou renderizados em
sprites (Phaser)**, com screenshot e duração de cada clipe medida.

## Quando usar / quando não usar

- Use para: esqueleto + skinning em malha gerada; importar/retargetar animações; movimento a
  partir de vídeo ou texto; fala (blendshapes) a partir de áudio; comprimir animação.
- Não use para: malha nova; LODs/texturas; Spine/sprites (2D). Para a malha deformar bem,
  **faça retopo antes** (`/otimizar-3d-para-mobile`, passo 2): rig em malha densa e suja é a
  principal causa de pesos ruins.

## Pré-requisitos

| Rota | Ferramenta | Licença | Entrada → saída | Hardware |
|---|---|---|---|---|
| Auto-rig no gerador | Tripo Studio (avatares **e criaturas**, bípedes e multi-pernas segundo o fornecedor); Meshy (auto-rig; fontes contraditórias, fornecedor fala em bípedes) | Plano pago = comercial | malha → FBX/GLB rigado (+ animações prontas) | nuvem |
| Aberta, humanoide/criatura | **UniRig** (SIGGRAPH 2025, VAST) → **SkinTokens/TokenRig** (2026) | **MIT** / **MIT** | `.obj/.fbx/.glb/.vrm` → **FBX** (+ script para GLB); SkinTokens GLB→GLB | ≥8 GB / ≥14 GB VRAM |
| Aberta, não humanoide | **Puppeteer** (NeurIPS 2025, ByteDance Seed) | **Apache-2.0** | malha → esqueleto + pesos; **FBX desde 10/09/2025 (exige `bpy==4.2.0`)**; animação guiada por vídeo | GPU NVIDIA |
| Só esqueleto | MagicArticulate (CVPR 2025) | Apache-2.0 | malha → esqueleto (sem skinning dedicado) | GPU |
| Legado | **Mixamo** (Adobe) | grátis com conta Adobe; termos há ~5 anos sem mudança | FBX humanoide → auto-rig + biblioteca de clipes | navegador |
| Vídeo→movimento | **Rokoko Create** (Vision 3.0 absorvido em 16/07/2026; webcam/dual-cam aposentados 16/08/2026) | SaaS, créditos [preços não lidos] | vídeo → FBX/BVH | nuvem |
| Vídeo/texto→movimento | DeepMotion / SayMotion; Cinevva Prompt Animations (BVH/GLB, 1–10 s) | preços conflitantes [secundário] | — | nuvem |
| Keyframe assistido | Cascadeur (física); Move.ai (multi-câmera pro); Plask | Cascadeur Indie ≈ €12/mês [secundário] | — | desktop |
| Texto→movimento aberto | MotionGPT3 (pesos 17/10/2025) | MIT | texto → **juntas SMPL/.npy**, **sem BVH/FBX** | GPU |
| Facial por áudio | **Audio2Face-3D** (NVIDIA, set/2025) | SDK e plug-ins **MIT**; treino Apache; modelos "NVIDIA Open Model" | áudio → blendshapes/joints; **plug-ins só Unreal 5 e Maya** | GPU NVIDIA |
| Biblioteca de clipes | Quaternius Universal Animation Library (**CC0**); CMU mocap (>2.500 clipes, precisa limpeza) [reportado por fornecedor] | CC0 / livre | FBX/BVH | — |

Comandos de instalação: siga os READMEs (links em Fontes); fixe commit/versão no
`PROVENANCE.md`. Blender para retarget/bake (`/blender-automatizado`).

## Entradas

- Malha limpa (pós-retopo) em pose T/A, escala em metros, origem nos pés, eixos corretos.
- Lista de clipes do brief (`idle`, `walk`, `run`, `attack`, `hit`, `death`, …) com duração alvo.
- Destino (`CLAUDE.md`/ADR): **sprites pré-renderizados** (Phaser: clipes curtos em loop,
  qualquer esqueleto) ou **Three.js** (`AnimationMixer` com os clipes do GLB; retarget por
  `SkeletonUtils.retargetClip`). Unity/Godot/USDZ só com ADR.
- Orçamento de animação: Apple recomenda **≤10 s por clipe** para AR Quick Look; ossos e
  influências por vértice conforme `references/retarget-e-compressao.md`.

## Passos

1. **Escolher a rota** (`references/ferramentas-rigging.md`, árvore de decisão): humanoide →
   auto-rig do gerador (se o plano já paga) ou UniRig → SkinTokens; criatura/quadrúpede →
   Puppeteer ou UniRig; Mixamo só como fallback para humanoide (frágil). Registre no spec.
2. **Rigar**. Ex.: UniRig gera FBX (esqueleto + skin) e tem script de merge para GLB;
   SkinTokens recebe/devolve GLB (no Blender, remova o nó `glTF_not_exported` se aparecer).
   Puppeteer exporta FBX com `bpy==4.2.0`. Guarde o bruto em `assets/3d/src/<asset>/rig/`.
3. **Validar o rig** no Blender (MCP `look` em `angles`; `get_scene_info` com pesos): ossos
   nos lugares (cotovelo/joelho/pescoço; cauda/asas presentes — UniRig degrada o skinning
   quando faltam), pesos sem "candy wrapper", nenhuma parte flutuando, hierarquia nomeada.
   Pose de teste: rotacione ombro/quadril 60° e olhe a deformação. Corrija pesos à mão nos
   piores pontos (isso é edição humana: anote no `PROVENANCE.md`).
4. **Obter clipes**: (a) biblioteca CC0 (Quaternius) ou Mixamo (baixe e **arquive** os FBX:
   nunca dependa de re-baixar); (b) vídeo → Rokoko Create/DeepMotion → FBX/BVH; (c) texto →
   SaaS que exporte FBX/BVH (Cinevva, Rokoko Create) — MotionGPT3 só serve com conversão
   manual SMPL→rig no Blender; (d) auto-animação do Tripo/Meshy. Corte cada clipe ao essencial
   (≤10 s), faça loop limpo em `idle`/`walk`.
5. **Retarget** (`references/retarget-e-compressao.md`): no Blender (mesmo esqueleto para
   todos os personagens quando possível — evita retarget em runtime) ou, no three.js,
   `SkeletonUtils.retargetClip(alvo, fonte, clip, opcoes)` de
   `three/addons/utils/SkeletonUtils.js` (existe na r186; mapeamento de ossos a validar no seu
   rig). Unity/Godot só com ADR (Humanoid Avatar; `BoneMap`/`SkeletonProfileHumanoid`).
6. **Facial** (se houver fala): Audio2Face-3D offline em GPU NVIDIA (Maya/UE5 plug-in ou
   SDK) → exporte **curvas de blendshape**/joints → bake no GLB/USDZ como morph targets +
   animação. Compatibilidade com os 52 blendshapes do ARKit **não declarada** pela NVIDIA —
   mapeie à mão se o personagem usar esse padrão.
7. **Exportar e comprimir**: GLB com esqueleto, pesos e clipes nomeados; para a web
   `gltfpack -af 30 -c` (reamostra a 30 Hz; `-af 24` mais leve; `-c` meshopt) ou
   `gltf-transform resample`; o three.js toca os clipes com `AnimationMixer`. Para sprites,
   nada disso: `render_sprites.py` amostra N frames por clipe. Orçamento de ossos/influências
   na referência.
8. **Rodar**: Three.js — tocar cada clipe (`verify.sh` + iPhone real), screenshot por clipe,
   transições e loop, fps com o personagem animado. Sprites — render de teste 1 direção ×
   1 frame por clipe em `/sprites-pre-renderizados-de-3d`. Evidência em
   `production/evidencias/<data>-<asset>-rig/`.

## Critério de pronto e evidência

- `assets/3d/rig/<asset>/<asset>-rig.glb` (ou `.fbx`) com esqueleto, pesos e clipes
  nomeados; `inspecionar_glb.py` mostra `esqueletos ≥1`, `animacoes = N`, duração ≤10 s cada
  (`--max-anim-seconds 10`).
- Screenshots de pose de teste (ombro/quadril 60°) e de cada clipe rodando no jogo (Three.js)
  ou do render de teste (sprites); fps medido no iPhone com o personagem animado quando o
  destino é Three.js.
- `PROVENANCE.md`: ferramenta de rig (versão/commit), origem e licença de cada clipe
  (CC0/Mixamo/SaaS/gerado), edição humana de pesos.

## Armadilhas conhecidas

- **Mixamo em "maintenance mode"**: só bípedes; falhas de autenticação persistentes relatadas
  em mai/2026 [secundário]; sem anúncio de desligamento. Trate como dependência frágil —
  arquive tudo que baixar. FAQ oficial (via busca, página não aberta) [secundário]:
  royalty-free para uso comercial incluindo jogos; indisponível para Enterprise/Federated ID e
  para contas com país China; não redistribua os arquivos brutos como asset pack.
- **UniRig**: checkpoint publicado é o treinado em Articulation-XL2.0; Rig-XL/VRoid "planned";
  predição de rigidez "coming soon"; skinning piora se o esqueleto previsto omitir cauda/asas.
- **SkinTokens** ≥14 GB VRAM; **Puppeteer** fixa `bpy==4.2.0` para FBX (ambiente separado).
- **MotionGPT3** não exporta BVH/FBX: não é produção; use SaaS ou bibliotecas.
- **Audio2Face-3D**: nada para Unity/Metal; modelos Audio2Emotion "allowed with Audio2Face
  only"; inferência é offline e assada — não há lipsync em runtime no iPhone por esta rota.
- **Licença de clipes**: clipes de SaaS seguem o plano (confirme uso comercial); CMU mocap
  precisa limpeza; biblioteca `spine-animation-ai` (2D) é PolyForm Noncommercial — fora.
- **Rig em malha densa** (sem retopo) gera pesos ruins e arquivo pesado; rig antes do
  `simplify` quebra os pesos — ordem: retopo → rig → LODs (o `simplify` do glTF-Transform
  preserva `JOINTS/WEIGHTS`, mas valide visualmente cada LOD animado).
- **Escala/eixos**: FBX do Blender precisa de `apply_unit_scale`, eixo Y para cima no engine;
  esqueleto escalado 100× é o erro mais comum de importação.
- Sem benchmark independente de qualidade de rig (Tripo vs Meshy vs UniRig vs AccuRIG vs
  Mixamo): teste com o seu personagem.

## Exportar para web

GLB com **um esqueleto compartilhado por família de personagens**, **≤4 influências por
vértice** (um conjunto `JOINTS_0/WEIGHTS_0`), clipes ≤10 s, reamostrados a 24–30 Hz
(`gltfpack -af`), meshopt (`-c`) e KTX2 pela `/otimizar-3d-para-mobile --target web`, LODs
animados validados (o `simplify` preserva `JOINTS/WEIGHTS`). Tamanho em KB por clipe no
relatório. Carregamento no three.js: `GLTFLoader` → `gltf.animations` → `AnimationMixer`
(`clipAction(clip).play()`); retarget por `SkeletonUtils.retargetClip`. USDZ/FBX só com ADR.
**Licença de saída**: o rig gerado por UniRig/SkinTokens (MIT) e Puppeteer (Apache-2.0) é
seu; auto-rig Tripo/Meshy segue o plano pago; clipes Mixamo seguem os termos da Adobe;
Quaternius é CC0; Audio2Face-3D: SDK MIT, modelos sob NVIDIA Open Model License (leia antes
de distribuir curvas geradas).

## Pré-render para Phaser

Para sprites, exporte o GLB com os clipes **nomeados exatamente como as ações do jogo**
(`idle`, `walk`, `attack`, `hit`, `death`); o importador glTF do Blender cria uma NLA track por
clipe com esse nome e `render_sprites.py --acoes idle,walk` as encontra. Clipes curtos, em loop
limpo (`walk` 0,6–1 s), pose "in place" (sem deslocamento de raiz, senão o personagem sai do
enquadramento), mesmo esqueleto por família para o ritmo bater entre personagens. Rig de
Mixamo (FBX) → monte um `.blend` com as actions renomeadas (seção 4 de
`.claude/skills/sprites-pre-renderizados-de-3d/references/pipeline-blender.md`). Facial e
blendshapes só importam se a câmera for próxima (lateral/close-up).

## Fontes

- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ2, KQ6).
- Relatório: `reports/Criação de jogos totalmente por IA.md` (parágrafo "Rigging migrou do Mixamo…").
- UniRig: https://github.com/VAST-AI-Research/UniRig ; SkinTokens: https://github.com/VAST-AI-Research/SkinTokens
- Puppeteer: https://github.com/Seed3D/Puppeteer ; MagicArticulate: https://github.com/Seed3D/MagicArticulate
- Mixamo status [secundário]: https://app.cinevva.com/guides/free-character-animations-rigging
- Rokoko Vision 3.0 → Create: https://www.rokoko.com/insights/introducing-rokoko-vision-3-0 ; https://support.rokoko.com/hc/en-us/articles/48823033216017-Rokoko-Vision-and-Rokoko-Create-What-you-need-to-know
- DeepMotion/Cascadeur/Plask/Move.ai (preços conflitantes) [secundário]: https://fast.io/resources/best-ai-animation-tools-2026/ ; https://app.cinevva.com/guides/ai-animation-generators-3d
- MotionGPT3: https://github.com/OpenMotionLab/MotionGPT3
- Audio2Face-3D: https://github.com/NVIDIA/Audio2Face-3D ; ACE: https://github.com/NVIDIA/ACE
- Tripo vs Meshy rigging (páginas de fornecedor): https://www.tripo3d.ai/vi/compare/tripo-vs-meshy ; https://www.meshy.ai/de/compare
- Orçamento Apple (≤10 s animação): https://developer.apple.com/forums/thread/693867
- gltfpack `-af`: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md ; glTF-Transform `resample`: https://github.com/donmccurdy/glTF-Transform
- three.js r186 (código lido 10/10/2026): `examples/jsm/utils/SkeletonUtils.js` (`retarget`, `retargetClip`, `clone`), `src/animation/AnimationMixer.js` — https://github.com/mrdoob/three.js
- Mixamo FAQ (oficial; via busca) [secundário]: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Pré-render: `.claude/skills/sprites-pre-renderizados-de-3d/SKILL.md`; importador glTF (NLA por clipe): https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/addons/io_scene_gltf2/blender/imp/animation_utils.py
