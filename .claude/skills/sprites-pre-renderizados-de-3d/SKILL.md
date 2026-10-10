---
name: sprites-pre-renderizados-de-3d
description: >
  Transforma um modelo 3D (gerado por IA ou CC0) em sprites 2D para Phaser: rig e clipes →
  render em lote no Blender headless com câmera ortográfica (top-down 3/4, isométrica ou
  lateral), 4/8 direções, N frames por ação, luz fixa, toon/contorno opcional e fundo
  transparente → pós (trim, pivot, alpha bleed, paleta/pixelização) → atlas JSON hash +
  anims.json → animação rodando no jogo com evidência. Use sempre que o usuário pedir
  personagem, inimigo ou prop "em 8 direções", "isométrico", "2.5D", "sprites a partir do
  modelo 3D", "renderizar o modelo em frames", "consistência de ângulo", ou quando a geração
  2D direta não mantém o personagem igual entre direções e ações. Não use para 3D em tempo
  real na web (engine-web-threejs), para gerar a malha (gerar-ativos-3d), para rigar
  (rigging-e-animacao-3d) nem para sprites desenhados/gerados em 2D (gerar-sprites-2d,
  animar-sprites, pixel-art-pipeline).
license: MIT
compatibility: "Claude Code ou Codex; Blender 4.2 LTS / 4.5 LTS / 5.0 (Arch ou estação GPU via gpu.sh); Python 3.10+ com Pillow (numpy opcional)"
metadata:
  grupo: 3d
  alvo: [2d, web, app]
  fase: [6]
argument-hint: "[personagem|prop] [modelo.glb|cena.blend] [--direcoes 8] [--acoes idle,walk] [--estilo toon|pbr|pixel]"
disable-model-invocation: false
user-invocable: true
---

# Sprites pré-renderizados a partir de 3D

Entrega `public/assets/atlas/<nome>.png|.json|.anims.json` (atlas JSON hash do Phaser, com pivot
nos pés e animações por direção) a partir de um modelo 3D, com `manifest.json`, preview do atlas
e **screenshot do sprite animando no jogo** em `production/evidencias/<data>-<nome>-sprites/`.

## Quando usar / quando não usar

- **Use** quando o jogo é 2D (Phaser, ADR-0001) e precisa de: personagem/inimigo em 4 ou 8
  direções; props e tiles isométricos/2.5D consistentes; muitas ações do mesmo personagem sem
  deriva de estilo; animação fluida (12–24 fps) que a rota imagem→vídeo não entrega alinhada.
- **Use** para reaproveitar um modelo que já existe (gerado para outro fim, CC0, ou do brief).
- **Não use** para: sprite único sem direções (`/gerar-sprites-2d` é mais barato); pixel art
  autoral 16–32 px com silhueta desenhada à mão (`/pixel-art-pipeline`); 3D em tempo real
  (`/engine-web-threejs`); cenário inteiro (`/cenarios-e-tilesets` + esta skill só para peças).
- Trade-off honesto: o pipeline custa modelo + rig + clipes (créditos/tempo) e o look "render"
  precisa de toon ou pós para não parecer 2005; em troca dá consistência de ângulo, escala e
  ritmo que nenhum gerador 2D garante entre 8 direções × N ações (relatório, seção 2D).

## Pré-requisitos

- **Blender** no Arch (`sudo pacman -S blender`) **ou** na estação GPU (`/estacao-gpu-remota`,
  `gpu.sh run`); `blender --version` registrado no `PROVENANCE.md`. IDs do EEVEE mudam por versão
  (4.2–4.5: `BLENDER_EEVEE_NEXT`; 5.0+: `BLENDER_EEVEE`) — o script detecta.
- `python3 -m pip install Pillow` (numpy opcional: acelera o alpha bleed).
- Modelo em GLB/FBX/`.blend` com clipes nomeados (`/gerar-ativos-3d` → `/rigging-e-animacao-3d`)
  ou prop estático; origem nos pés, metros, frente para -Y (seção 3 de `references/pipeline-blender.md`).
- Style card aprovado (`/direcao-de-arte-e-style-card`): câmera (lateral / top-down 3/4 /
  isométrica), paleta, contorno sim/não, luz. Licença do modelo e dos clipes na lista verde de
  `LICENCAS.md` — a lista vermelha (Hunyuan3D/HY-World, Roblox Cube) vale para sprites também:
  a restrição territorial é sobre a **saída**.
- Scripts desta skill (`--help` funciona sem Blender):
  `scripts/render_sprites.py` (Blender headless) e `scripts/montar_atlas_phaser.py` (Pillow).

## Entradas

1. Spec do sprite em `design/assets/specs/<nome>-sprites.md`: direções (4/8), ações com
   frames e fps, tamanho do frame, `ppm` da família, elevação/azimute, luz, estilo
   (pbr/toon/pixel), orçamento de memória. Tabela de partida (inferência; ajuste ao brief):

| Asset | Direções | Ações × frames | Frame (@2x) | Páginas 2048² |
|---|---|---|---|---|
| Herói | 8 | idle 6, walk 8, attack 8, hit 4, death 8 (= 34 × 8 = 272) | 192–256 px | 2–4 |
| Inimigo comum | 8 (ou 4) | idle 4, walk 6, attack 6, death 6 (= 22 × 8 = 176) | 128 px | 1 |
| Prop/parede isométrica | 1–4 | 1 | 128–256 px | compartilhada |
| Veículo/nave | 16 | 1–2 | 96–128 px | 1 |

2. `manifest.json` do render (pivot, `pixels_por_metro`, duração das ações) — gerado no passo 5.
3. `feature_list.json`: a feature que vai usar o sprite (a evidência final é no jogo).

## Rotas para obter o modelo animado

| Rota | Quando | Como | Licença da saída |
|---|---|---|---|
| **A. Gerador com auto-rig + animação** (Tripo Studio, Meshy) | personagem novo, sem GPU | `/gerar-ativos-3d` → auto-rig e clipes do fornecedor → GLB com animações nomeadas | comercial só em plano pago (Meshy grátis = CC BY 4.0) |
| **B. Base CC0 já animada** (Quaternius, Kenney) | protótipo, inimigos genéricos, validar o pipeline antes de pagar | baixar GLB/FBX com clipes; retexturizar se preciso (`/materiais-e-texturas-pbr`) | CC0 [secundário, confirmar na página do pack] |
| **C. Aberto + rig aberto** (TRELLIS.2/TripoSG → UniRig → Mixamo/Quaternius) | GPU disponível, sem assinatura | `/rigging-e-animacao-3d` (UniRig MIT; clipes Mixamo royalty-free com Adobe ID [secundário] ou Quaternius CC0) → `.blend` | sua / Adobe / CC0 |
| **D. Prop estático** | caixas, árvores, paredes, ícones 3D | GLB sem rig → `--acoes static --direcoes 4` (ou 1 para tile isométrico) | segue o gerador |

## Passos

1. **Spec e confirmação** (entrada 1). Decida direções, ações, frames, fps, tamanho e `ppm`
   com a tabela de `references/direcoes-e-camera.md`. Some as páginas 2048² da cena; se passar
   de ~4 (64 MB de GPU), corte frames/direções, não resolução. Confirme com o usuário antes de
   gastar créditos. Resultado: spec em disco.
2. **Modelo + rig + clipes** pela rota escolhida. Linha no `PROVENANCE.md` para o modelo e
   para **cada clipe** (origem/licença). Clipes curtos, em loop (`walk` 0,6–1 s).
3. **Preparar e listar**:
   ```bash
   S=.claude/skills/sprites-pre-renderizados-de-3d/scripts
   blender -b --python $S/render_sprites.py -- --input assets/3d/rig/<nome>/<nome>-rig.glb --lista
   ```
   Confira nomes das ações (NLA tracks do importador glTF) e malhas. Se vier de FBX do Mixamo,
   monte um `.blend` com as actions renomeadas (`references/pipeline-blender.md`, seção 4).
4. **Render de teste** (1 direção × 1 frame por ação) e ajuste de câmera/luz/estilo:
   ```bash
   blender -b --python $S/render_sprites.py -- --input <modelo> --acoes idle,walk --direcoes 1 --frames 1 \
     --tamanho 256 --elevacao 45 --luz-azimute -35 --toon --contorno 1.5 --saida assets/_render/teste
   ```
   Olhe o PNG: enquadramento (nada cortado), frente correta (senão `--frente +y`), pivot nos
   pés, look compatível com o style card (toon/`--engine workbench` esconde ruído de malha e
   textura de gerador; `--sem-aa --pixelizar` depois, para pixel art). Para a família inteira,
   fixe `--ppm` (o `manifest.json` do teste mostra o valor automático).
5. **Lote** (local ou `gpu.sh push/run/pull` na estação):
   ```bash
   blender -b --python $S/render_sprites.py -- --input <modelo> --acoes idle,walk,attack --direcoes 8 --frames 8 \
     --tamanho 256 --ppm 110 --elevacao 45 --toon --contorno 1.5 --saida assets/_render/
   ```
   Saída: `assets/_render/<nome>/<nome>_<acao>_d<d>_f<ff>.png` + `manifest.json` (pivot,
   `pixels_por_metro`, duração por ação, versão do Blender, args, tempo). Ações sem loop
   (`attack`, `death`): rode à parte com `--incluir-ultimo`.
6. **Atlas** (trim, pivot, bleed, extrude, multi-atlas, preview, memória):
   ```bash
   python3 $S/montar_atlas_phaser.py assets/_render/<nome> --manifest assets/_render/<nome>/manifest.json \
     --saida public/assets/atlas/<nome> --max 2048 --padding 2 --extrude 1 --bleed \
     --preview production/evidencias/<data>-<nome>-sprites/atlas-preview.png
   ```
   O script imprime páginas e **MB de GPU** (RGBA8) e grava `<nome>.anims.json` com
   `prefix/start/end/zeroPad/frameRate/repeat` por `acao-dN`. Pixel art: `--pixelizar 4
   --paleta 32 --paleta-de <paleta-do-style-card.png>`. Testado neste repositório com 128
   frames sintéticos: 1 página 2003×827 (6,3 MB), multi-atlas em `--max 512` (7 páginas) e
   fallback sem numpy.
7. **Phaser**: `this.load.atlas` (ou `multiatlas`), `anims.create` a partir do `anims.json`
   com `generateFrameNames({prefix,start,end,zeroPad})`, direção por `atan2` (função em
   `references/direcoes-e-camera.md`), `setDepth(y)`; o pivot do frame vira origem
   automaticamente (`setFrame` → `customPivot` → `setOrigin`). Exponha em
   `window.__GAME_DEBUG__` a animação atual e o frame para o playtest ler.
8. **Verificar**: `bash scripts/verify.sh --feature F-xxx` → `screenshot.png` com o sprite em
   cena, `state.json` com a anim tocando, `console.log` sem erro de textura; no iPhone real,
   trocar as 8 direções em loop e olhar halo em fundo claro. Copie o `preview` e o manifest para
   a pasta de evidência; `/critico-independente` compara d0..d7 lado a lado com o style card.
9. **Registrar**: `PROVENANCE.md` (modelo, rig, clipes, Blender `version_string`, args do
   render, versão dos scripts, edição humana — ex.: pesos corrigidos, frames descartados);
   spec com status `Sprites prontos — em uso em F-xxx`. Guarde o `.blend`/GLB e o manifest;
   a pasta `_render` pode ser regenerada.

## Critério de pronto e evidência

- `public/assets/atlas/<nome>.png` (≤ 2048² por página) + `.json` (hash ou `textures`) +
  `.anims.json`; `manifest.json` e `.blend`/GLB fonte guardados.
- `production/evidencias/<data>-<nome>-sprites/`: `atlas-preview.png`, `manifest.json`,
  saída do `montar_atlas_phaser.py` (páginas, MB), `screenshot.png`/`state.json` do
  `verify.sh` com a animação tocando, nota de teste no iPhone (direções, halo, fps).
- Métricas: MB de GPU somados da cena ≤ orçamento do spec; nenhum frame cortado; pivot
  estável entre ações (checklist de `references/direcoes-e-camera.md`). Sem o screenshot no
  jogo o status fica `in_progress` — "renderizou" não é "pronto".

## Armadilhas conhecidas

- **`blender -b modelo.glb` não abre GLB**: o Blender só abre `.blend` pela CLI; o script
  acha o GLB nos argumentos e importa (ou use `--input`). Valide num frame antes do lote.
- **Script não executado em Blender real** neste repositório (sem Blender no ambiente):
  nomes de propriedades conferidos no código-fonte (`rna_*.cc`, 10/10/2026); lista de
  validação na seção 12 de `references/pipeline-blender.md`.
- **Luz assada no albedo** do gerador não gira com o personagem → toon/flat ou retexturizar.
- **AgX/Filmic** muda a paleta; o script força `view_transform = Standard`.
- **Espelhar direções** (`flipX`) só com luz simétrica (`--luz-azimute 0`) e personagem simétrico.
- **Halo escuro** em fundo claro: `--bleed` + `--padding 2 --extrude 1`; não use mipmaps em
  atlas sem potência de 2 (`--pot` se precisar).
- **Memória**: cada página 2048² = 16 MB RGBA8 na GPU (Phaser não comprime); 3 personagens
  em 256 px × 8 dir × 30 frames estouram 64 MB. Reduza frames/direções, não resolução; descarregue
  atlases por fase (`this.textures.remove`).
- **Mixamo** em "maintenance mode" com falhas de login relatadas em 2026 [secundário]; só
  bípedes; arquive os FBX. **Meshy grátis** exige atribuição; **Tripo grátis** não é comercial.
- **Topologia densa** (TRELLIS.2: 1 M faces) não estraga o sprite, mas multiplica o tempo de
  render; decime para ~50–100 K antes (`/otimizar-3d-para-mobile` ou `bpy_cleanup_template.py`).
- **Freestyle** é lento em malhas densas; para pixel art prefira o outline do Workbench.
- **Direito autoral**: sprite de saída pura de IA não tem proteção; a seleção de ângulo/luz,
  frames descartados e retoques no Aseprite são a intervenção humana — registre-os.
- **Sem dado oficial** de limite de textura do Safari iOS; o repositório fixa 2048² e DPR ≤ 2.

## Exportar para mobile

Atlas PNG RGBA com alfa real (sem halo), páginas ≤ 2048², um atlas por personagem (ou por
família com o mesmo `ppm`), frames @2x (DPR ≤ 2 em `CLAUDE.md`; `--escala 0.5` gera @1x se
precisar), `padding 2`/`extrude 1`, JSON hash + `anims.json`. Tamanho: anote páginas × 16 MB
(GPU) e KB do PNG (download) na evidência. Opcional: ASTC em contêiner PVR/KTX via
`this.load.texture` (Phaser lê ASTC/PVRTC/ETC; encoder `astcenc`; "aparece mais escuro" sem
ajuste sRGB — JSDoc do Phaser) [validar no Phaser 4.2]. Carregamento: `this.load.atlas` /
`multiatlas` na cena de preload; descarregue por fase. **Licença de saída**: segue o modelo e os
clipes (`PROVENANCE.md`); Blender (GPL) e os scripts (MIT) não impõem termos sobre os PNGs.

## Fontes

- Phaser 4.2.1 (código lido em 10/10/2026): `src/textures/parsers/JSONHash.js`, `JSONArray.js`, `src/loader/filetypes/AtlasJSONFile.js`, `MultiAtlasFile.js`, `CompressedTextureFile.js`, `src/animations/AnimationManager.js`, `src/gameobjects/components/Texture.js` — https://github.com/phaserjs/phaser ; versão: https://registry.npmjs.org/phaser/latest
- Blender (código lido; propriedades e IDs de engine): https://github.com/blender/blender (`source/blender/makesrna/intern/rna_scene.cc`, `rna_camera.cc`, `rna_space.cc`, `rna_color.cc`, `rna_animation.cc`, `rna_nla.cc`, `editors/render/render_internal.cc`, `makesdna/DNA_scene_types.h`; branches 4.2/4.5/5.0/main)
- Importador glTF (NLA por animação): https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/addons/io_scene_gltf2/blender/imp/animation_utils.py
- Add-ons de referência: https://github.com/Mattline1/SpriteAtlasAddon (MIT) ; https://github.com/RubielGames/BlenderSpriteGenerator (MIT) ; https://github.com/chronicleroflegends/DirectionalSpriteBatchRender (GPL-3)
- Casos: Dead Cells (3D → pixel art com ferramenta própria, 2018) [secundário]: https://80.lv/articles/case-study-dead-cells-character-art-pipeline/ ; Factorio FFF-146 (Blender → render layers → sprites) [secundário]: https://factorio.com/blog/post/fff-146 ; relato Tripo → Mixamo → Blender sprite sheet (r/aigamedev, set/2026) [secundário]: https://red.applefritter.com/r/aigamedev/s/ZjZbUwPkVL
- Mixamo FAQ (royalty-free, inclusive jogos; sem Enterprise/Federated ID) [secundário, via busca]: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Geradores, rig e licenças: `.claude/skills/gerar-ativos-3d/references/matriz-geradores.md`; `.claude/skills/rigging-e-animacao-3d/references/ferramentas-rigging.md`; nota `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md`
- Poly Haven ToS (CC0): https://github.com/Poly-Haven/Public-API/blob/master/ToS.md ; Kenney/Quaternius CC0 [secundário]: https://gamefromscratch.com/?p=27165
- Playbook: `playbook/10-praticas-de-3d-para-jogo-web.md`
