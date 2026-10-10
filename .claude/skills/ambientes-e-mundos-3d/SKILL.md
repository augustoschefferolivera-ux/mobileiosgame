---
name: ambientes-e-mundos-3d
description: >
  Cria cenários, níveis e mundos 3D para jogo mobile com IA: geração de mundo (World Labs
  Marble), splats e a rota segura "exportar malha + bake", montagem de cena no Blender com
  assets CC0, skybox/HDRI gerados e níveis procedurais com parâmetros estruturados. Use sempre
  que o usuário pedir fase, mapa, arena, cenário, ambiente, céu, terreno ou "mundo", mesmo sem
  dizer "3D". Não use para um prop isolado (/gerar-ativos-3d), para reduzir polígonos de um
  cenário pronto (/otimizar-3d-para-mobile) nem para a lógica de geração procedural em
  runtime (/geracao-procedural-com-llm).
license: MIT
compatibility: "Claude Code ou Codex; Blender + Blender MCP para montagem; Three.js + Spark para splats na web"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [5, 6]
argument-hint: "[nome-do-nivel] [mundo|kit-modular|skybox|procedural|pre-render] [--alvo web|sprites]"
disable-model-invocation: false
user-invocable: true
---

# Ambientes e mundos 3D

Entrega um nível jogável (kit modular ou malha assada + skybox em Three.js, ou peças
pré-renderizadas para o tilemap do Phaser) dentro do orçamento de frame, com screenshot no
navegador e fps medido.

## Quando usar / quando não usar

- Use para: layout de nível, kit modular de cenário, mundo gerado (Marble) convertido em malha,
  skybox/HDRI, iluminação assada, montagem de cena no Blender, parâmetros de nível procedural.
- Não use para: props isolados; otimização de malha (chame `/otimizar-3d-para-mobile` para
  cada peça); código de PCG em runtime (ponte abaixo); world models interativos (Genie 3,
  WorldPlay) como asset — eles **não exportam**.

## Pré-requisitos

- `/blender-automatizado` (Blender MCP) com **Poly Haven** ligado (CC0, sem chave) e, se quiser,
  Poly Pizza (chave grátis; ~69 % do catálogo é CC-BY → atribuição) e Sketchfab (chave).
- Para mundos gerados: conta **World Labs Marble** (GA 12/11/2025; tiers do grátis a
  US$ 95/mês "Max" [secundário, confirmar]; **licença dos mundos gerados não lida** — confirme
  antes de usar comercialmente).
- Splats (opcional, arriscado): **Spark** 2.3.1 (World Labs, MIT, three.js ≥ 0.180; PLY/SPZ/
  SPLAT/KSPLAT/SOG; "renders fast on low-powered mobile devices" — README); formato **SPZ**
  (Niantic, MIT, ~10× menor que PLY). MetalSplatter (MIT, Swift/Metal) só para app nativo com ADR.
- Modelo de imagem do projeto (`gpt-image-1.5`, Nano Banana Pro — rotas de `/gerar-sprites-2d`
  e `/cenarios-e-tilesets`) para panoramas/skybox; `verificar_tiling.py` (em
  `.claude/skills/materiais-e-texturas-pbr/scripts/`; `--eixo horizontal` para panoramas).
- Lista verde de `LICENCAS.md` (`/licencas-e-proveniencia`): **HunyuanWorld 1.0 / HY-World 2.0
  estão na lista vermelha** (licença exclui UE/UK/Coreia e proíbe saídas fora do Território).

## Entradas

- Brief do nível: gênero, câmera (top-down, 3ª pessoa, lateral), tamanho jogável, pontos de
  interesse, fluxo do jogador, hora do dia/clima (style card de `/direcao-de-arte-e-style-card`).
- Orçamento por frame (teto Apple ≤100K polígonos no device mais antigo; 1 conjunto 2048² por
  asset; inferência do relatório: cenário modular 2–10K tris por peça, atlas 2048² por kit).
- Destino: **Three.js** (luz assada; cena leve) ou **cenário 2D pré-renderizado** (peças/tiles
  isométricos do kit renderizados em sprites por `/sprites-pre-renderizados-de-3d` e montados
  em `/cenarios-e-tilesets`).

## Rotas (detalhes e licenças em `references/mundos-e-splats.md`)

| Rota | Quando | Saída | Risco |
|---|---|---|---|
| **A. Kit modular + montagem no Blender** (padrão) | quase sempre; nível autoral e leve | peças GLB (`/gerar-ativos-3d` + Poly Haven/Poly Pizza) montadas em `.blend` → GLB/USDZ | baixo; licenças CC0/CC-BY controladas |
| **B. Mundo gerado → malha → bake** | cenário de fundo, vista panorâmica, protótipo rápido | Marble exporta **malha** (ou splats); Blender decima/assa; engine recebe GLB | médio: malha densa, licença do Marble a confirmar |
| **C. Splats na web** | demos, fundos estáticos | PLY/SPZ via Spark (`SplatMesh`, three.js) | alto: sem colisão; memória no Safari; proveniência do PLY (treino 3DGS da INRIA é não comercial) |
| **F. Kit pré-renderizado (Phaser)** | jogo 2D isométrico/top-down com cenário "3D" | peças do kit (A) → `/sprites-pre-renderizados-de-3d` (`--acoes static`, mesmo `--ppm` dos personagens, elevação 30°/45°) → tiles/props do tilemap | baixo; zero custo de GPU 3D no jogo |
| **D. Skybox/HDRI** | sempre, junto de A ou B | HDRI CC0 (Poly Haven) ou panorama 2:1 gerado por IA → cubemap | baixo; checar costura |
| **E. Nível procedural** | muitos níveis/arenas, roguelike | parâmetros JSON validados → gerador determinístico monta o kit | baixo se o LLM só emite parâmetros |

## Passos

1. **Brief e blocking**: escreva `design/levels/<nivel>.md` (fluxo, métricas de gameplay,
   lista de peças). Faça o **blocking em primitivas** pelo Blender MCP (`execute_blender_code`
   cria cubos/planos na escala real; `look` em `angles`) e valide a escala do jogador antes de
   gerar qualquer asset.
2. **Escolher rota** (tabela). Jogo global → nada da família Hunyuan World. Registre em spec.
3. **Produzir as peças**:
   - Rota A: liste o kit (chão, parede, canto, porta, props); gere cada peça com
     `/gerar-ativos-3d` (PartCrafter para kits segmentados) ou importe CC0 do Poly Haven /
     CC-BY do Poly Pizza (`search_assets` → `import_asset`; a atribuição é gravada como
     propriedade `polypizza_attribution` — copie para os créditos do jogo).
   - Rota B: gere no Marble (texto/imagem/vídeo/layout), **exporte malha**, importe no Blender,
     separe chão/paredes/props em objetos, remova geometria invisível, decime
     (`/blender-automatizado` → `bpy_cleanup_template.py --decimate 0.25,0.1`) e asse luz/AO
     em textura (`--bake all`).
   - Rota C: converta PLY→SPZ (`npm run assets:compress` do Spark), teste `SplatMesh` no Safari
     do iPhone real; se o fps não fechar, volte para B.
   - Rota F: renderize cada peça com o mesmo `--ppm`/elevação dos personagens e monte o
     tilemap em `/cenarios-e-tilesets`.
4. **Skybox/HDRI**: Poly Haven HDRI (1k–2k; 4k só se visível) via `import_asset`, ou panorama
   equiretangular 2:1 gerado por IA → `verificar_tiling.py --eixo horizontal` → cubemap no
   engine. Sol/sombra do skybox devem bater com a luz assada.
5. **Montar e assar**: posicione o kit no Blender (coleções por tipo), aplique transforms,
   nomes previsíveis (`cen-<nivel>-<peca>-01`), **bake de iluminação/AO** em atlas por kit,
   colisores simples (caixas/cápsulas; nenhum gerador cria colisão — modele à mão), exporte
   GLB por kit com `use_selection` e `export_apply`.
6. **Otimizar e importar**: cada GLB passa por `/otimizar-3d-para-mobile --target web` (LODs,
   atlas ≤2048², KTX2 + meshopt). No three.js: `InstancedMesh`/`EXT_mesh_gpu_instancing`
   (gltfpack `-mi`) para peças repetidas, frustum culling (padrão), luz assada
   (`MeshBasicMaterial`/`MeshLambertMaterial` com lightmap), um skybox (`scene.background`
   cubemap ≤1024 por face).
7. **Procedural (rota E)**: defina um **JSON Schema** de parâmetros do nível (tamanho, salas,
   densidade de props, seed, bioma) que o LLM preenche; o gerador determinístico monta o kit
   e **valida** (conectividade, spawn alcançável, orçamento de tris por frame). A geração em
   runtime no iPhone (Foundation Models `@Generable` → parâmetros) é da skill
   `geracao-procedural-com-llm`; aqui você entrega o kit, o schema e o validador offline.
8. **Rodar e medir**: `verify.sh` (Playwright WebKit: screenshots dos pontos de interesse,
   `renderer.info` em `state.json`), depois iPhone real (fps, memória). Evidência em
   `production/evidencias/<data>-<nivel>/`.

## Critério de pronto e evidência

- `assets/3d/levels/<nivel>/` com GLB(s) do kit otimizados, skybox/HDRI, colisores, `.blend`
  fonte e `PROVENANCE.md` (origem e licença de **cada** peça; texto de atribuição CC-BY).
- `design/levels/<nivel>.md` + (rota E) `schema-nivel.json` e validador com teste rodando.
- Evidência: screenshots do blocking, do nível montado no Blender e **rodando no navegador**
  (Playwright) + nota do iPhone real; fps medido; tris por frame
  (`renderer.info.render.triangles`) ≤ orçamento. Sem medição no iPhone por milestone = não pronto.

## Armadilhas conhecidas

- **HunyuanWorld 1.0 / HY-World 2.0**: malha + 3DGS importáveis em Unity/Unreal/Blender, mas a
  licença (lida) exclui UE/UK/Coreia e proíbe uso das saídas fora do Território; >1 M MAU
  exige licença. Fora para App Store global.
- **Genie 3 / Project Genie**: só assinantes AI Ultra nos EUA (18+), sessões de 60 s, sem
  export; DeepMind na GDC 2026: "not at all in a stage where we can just... make a game with
  it". **WorldPlay/HY-World 1.5**: vídeo a 24 fps, 28–72 GB VRAM, sem asset. Use só como previs.
- **Splats em Unity**: o renderer de Aras Pranckevičius diz que mobile "may or may not work",
  que alguns iOS definitivamente não funcionam e que não planeja desenvolvimento; o código de
  treino 3DGS da INRIA é **não comercial** — a proveniência do PLY importa (Marble/FlashWorld/
  Scaniverse têm termos próprios). Mobile-GS (ICLR 2026): alpha blending/ordenação é o gargalo.
- **Marble**: datas do 1.1/1.1 Plus conflitam (2 vs 8/04/2026); preços abaixo do Max, licença
  dos mundos, qualidade/polycount da malha e colisores não foram lidos. FlashWorld
  (Apache-2.0) gera 3DGS em ~7 s, mas pede 51 GB VRAM (9 GB com offloading, 10 min).
- **Poly Haven** congela o Blender durante o download (thread principal); peça 1k/2k.
  **Poly Pizza** bloqueia IPs de datacenter/VPN (Cloudflare) — baixe de conexão normal.
- **Colisão e navmesh**: nenhum gerador cria; modele colisores simples e gere navmesh no engine.
- **Atlas**: nenhuma ferramenta de IA faz atlas; faça no Blender (UV pack) ou no engine.
- **Ambientes pesados** são o caso em que agentes mais falham (relatório: "escopo errado para
  IA: 3D pesado"); prefira kits modulares pequenos e câmera controlada.

## Exportar para web

GLB por kit com KTX2 (UASTC) + meshopt, peças instanciadas (`EXT_mesh_gpu_instancing`), LODs
0,5/0,25 nas peças grandes, **um atlas ≤2048² por kit**, luz/AO assadas, skybox como cubemap
≤1024 por face (ou HDRI 2k), colisores separados sem textura (ou caixas no código), splats só
em SPZ via Spark e só após teste no iPhone. Orçamento por cena: <500K tris visíveis, <100 draw
calls, <256 MB de texturas descomprimidas (inferência). Registre KB por kit e tris por frame.
USDZ só com ADR nativo. **Licença de saída**: peças próprias seguem o gerador
(`/gerar-ativos-3d`); Poly Haven CC0 (sem atribuição; ToS da API lido); Poly Pizza CC-BY exige
crédito no jogo; Marble: **confirmar termos**; Hunyuan World: não usar; Spark/SPZ são MIT
(código), não licenciam o conteúdo do splat.

## Pré-render para Phaser

Cenário 2D "com cara de 3D": monte o kit (rota A) no Blender, renderize cada peça com
`/sprites-pre-renderizados-de-3d` usando **o mesmo `--ppm`, elevação e azimute dos
personagens** (2 : 1 isométrico = 30°/45°; top-down 3/4 = 45–60°/0°), `--acoes static`,
`--direcoes 1` (tiles) ou `4` (props com frente), luz fixa no mundo (`--luz-fixa mundo`) para o
sol bater em todas as peças; depois `/cenarios-e-tilesets` monta o tilemap (Tiled/Sprite
Fusion → Phaser; suporte a tilemap isométrico no Phaser 4 [confirmar]). Fundo distante: um
render panorâmico do Blender em camadas para parallax. Não há custo de GPU 3D no jogo.

## Fontes

- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ4, KQ5, KQ6); `ia_em_runtime_e_world_models.md` (KQ4, PCG com LLM).
- Relatório: `reports/Criação de jogos totalmente por IA.md` (parágrafo "Mundos inteiros…"; checklist de riscos).
- Marble: https://www.worldlabs.ai/blog/marble-world-model ; https://siliconangle.com/2025/11/12/world-labs-launches-marble-commercial-world-model-generating-entire-virtual-environments/ ; Marble 1.1: https://rits.shanghai.nyu.edu/ai/world-labs-releases-marble-1-1-auto-expanding-3d-world-generation ; Spark: https://github.com/sparkjsdev/spark
- Genie 3: https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie/ ; https://www.tweaktown.com/news/110471/genie-3s-ai-generated-worlds-fall-apart-after-a-few-minutes-google-admits/index.html
- HunyuanWorld-1.0 e licença: https://github.com/Tencent-Hunyuan/HunyuanWorld-1.0 ; https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanWorld-1.0/main/LICENSE ; HY-World 2.0: https://github.com/Tencent-Hunyuan/HY-World-2.0 ; https://raw.githubusercontent.com/Tencent-Hunyuan/HY-World-2.0/main/License.txt
- FlashWorld: https://github.com/imlixinyang/FlashWorld
- Splats: https://github.com/aras-p/UnityGaussianSplatting ; https://github.com/scier/MetalSplatter ; https://github.com/nianticlabs/spz ; Mobile-GS: https://mlanthology.org/iclr/2026/du2026iclr-mobilegs/ ; Spark 2.3.1 (npm, lido 10/10/2026): https://registry.npmjs.org/@sparkjsdev/spark/latest
- Pré-render de cenário: `.claude/skills/sprites-pre-renderizados-de-3d/references/direcoes-e-camera.md`; `playbook/10-praticas-de-3d-para-jogo-web.md`
- Blender MCP (Poly Haven/Poly Pizza): https://github.com/ahujasid/blender-mcp
- Orçamento Apple: https://developer.apple.com/forums/thread/693867
- PCG com LLM (parâmetros estruturados + validadores): https://arxiv.org/html/2604.25482 ; https://arxiv.org/html/2508.18533v1 ; https://arxiv.org/pdf/2503.21474
