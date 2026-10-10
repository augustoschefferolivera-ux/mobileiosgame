---
name: cenarios-e-tilesets
description: >
  Produz cenários 2D para Phaser 4 web mobile: tilesets em grade (tiles-base por bioma com IA, costura
  seamless verificada por script, extrusão para tilemaps, autotile/terrenos editados no Tiled ou Sprite
  Fusion e carregados com tilemapTiledJSON/TilemapGPULayer) e backgrounds em camadas para parallax com
  TileSprite (céu/meio/frente gerados separadamente com transparência, largura 1560 px @2x), com prompts por
  bioma a partir do style card e orçamento de VRAM dos fundos. Use sempre que o usuário pedir "cenário",
  "fundo", "fase", "mapa", "tiles", "chão/parede", "parallax", "bioma". Não use para sprites de
  personagem/prop (/gerar-sprites-2d) nem para o empacotamento final (/atlas-e-exportacao-2d-mobile).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; Tiled ou Sprite Fusion (navegador); ComfyUI na estação GPU opcional"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [5, 6]
argument-hint: "[bioma] [tileset|background|ambos] [grade]"
disable-model-invocation: false
user-invocable: true
---

# Cenários e tilesets

Entrega, por bioma, um tileset em grade extrudado (`./assets/tiles/tileset_<bioma>.png` + `_ext.png` + regras de terreno no Tiled) e/ou camadas de background (`./assets/backgrounds/bg_<bioma>_{ceu,meio,frente}.png`) com costura verificada; a evidência é o preview 3×3 de cada tile, a prévia do parallax e o `screenshot.png` do `bash scripts/verify.sh` (raiz do projeto) da fase rodando sem linhas entre tiles.

## Quando usar / quando não usar

- **Use** quando a fase/mapa precisa de chão, paredes, plataformas, decoração repetível (tiles) ou fundo em profundidade (parallax).
- **Use** para transformar um conceito de cenário em camadas separadas com transparência.
- **Não use** para props únicos (`/gerar-sprites-2d`), tiles pixel-native em si (`/pixel-art-pipeline` gera; esta skill costura, extruda e mapeia) ou empacotar (`/atlas-e-exportacao-2d-mobile`).

## Pré-requisitos

- `design/art-bible.md` seções 6 (câmera), 7 (grade/tile em px @2x), 9 (biomas); `design/style-card.md`; `design/paleta.txt`.
- Geração: gpt-image-1.5 (alfa nativa para meio/frente), Nano Banana Pro para coerência com o moodboard, FLUX.2 [klein] 4B na estação GPU para variações baratas (`../gerar-sprites-2d/references/comfyui-receitas.md`); tiles pixel: Retro Diffusion "tileset" (≈ US$ 0,10 [secundário]) ou PixelLab.
- Editor de mapa: **Tiled** (gratuito; editor GPL, `libtiled` BSD; os mapas são seus; export JSON lido pelo Phaser) ou **Sprite Fusion** (gratuito no navegador; autotiling; export para Phaser a confirmar).
- `python3 -m pip install Pillow` para `scripts/verificar_seamless.py` e `scripts/extrudir_tiles.py`.
- **Licença de saída**: geradores classe B com termos não lidos → "[confirmar]"; FLUX.2 [klein] 4B Apache 2.0.

## Entradas

1. Bioma(s): temperatura de cor, densidade de props, 3 elementos narrativos (bible seção 9).
2. Tamanho do tile (32 pt = 64 px @2x é o padrão; 16 pt = 32 px em pixel art), vista (lateral/top-down/isométrica) e lista mínima: chão, bordas (esq/dir/topo/base, cantos internos e externos = 13 tiles para autotile), parede, plataforma, 3–5 decorações.
3. Nº de camadas de parallax (2–3; mobile ≤ 4) e orçamento de VRAM (`references/phaser-tilemaps-e-parallax.md`: ≈ 19 MB para 3 camadas de 1560 px).

## Passos

1. **Prompts por bioma** (`references/prompts-por-bioma.md`): tiles em vista ortográfica, sem perspectiva, iluminação plana (tiles repetem), "seamless tileable, edges match exactly"; camadas de fundo com "horizontally seamless" e `meio`/`frente` em transparência.
2. **Tiles-base.** HD: gpt-image-1.5 em 512–1024 px por tile e redução Lanczos para 64 px @2x; estação GPU: `comfyui_lote.py --workflow ../gerar-sprites-2d/assets/flux2_klein_4b_t2i_api.json --seeds 1,2,3,4`; pixel: Retro Diffusion/PixelLab na grade. 2–4 variações do mesmo tile. Brutos em `./assets/brutos/<data>/tiles_<bioma>/`.
3. **Verificar costura** (todo tile que repete; fundos só no eixo h):
   ```bash
   python3 .claude/skills/cenarios-e-tilesets/scripts/verificar_seamless.py assets/brutos/<data>/tiles_<bioma>/grama_00.png --eixos hv --max-diff 12 --preview production/evidencias/<data>-tiles-<bioma>/grama_00_3x3.png
   python3 .claude/skills/cenarios-e-tilesets/scripts/verificar_seamless.py assets/backgrounds/bg_<bioma>_meio.png --eixos h --preview production/evidencias/<data>-bg-<bioma>/meio_3x1.png
   ```
   Falhou (código 2)? (a) edite com máscara: desloque meia largura com wrap e peça "continue the texture seamlessly" (edição com máscara do gpt-image-1.5 ou FLUX.2 [klein] edit local), (b) espelhe (só decoração), (c) retoque no Aseprite/Krita. Olhe o preview: a métrica não vê "efeito azulejo".
4. **Montar o tileset** em grade regular (`../animar-sprites/scripts/slice_spritesheet.py montar --celula 64x64 --espaco 0` ou Pillow), tiles de borda em ordem fixa documentada em `./assets/tiles/tileset_<bioma>.md`, e **extrudar**:
   ```bash
   python3 .claude/skills/cenarios-e-tilesets/scripts/extrudir_tiles.py assets/tiles/tileset_<bioma>.png --tile 64 --extrude 1 --saida public/assets/tiles/tileset_<bioma>_ext.png
   ```
   O script imprime `addTilesetImage(nome, chave, 64, 64, 1, 2)`. Pixel art: `verificar_paleta.py --tolerancia 0` antes.
5. **Terrenos/autotile e mapa**: no Tiled, tileset com `margin 1`/`spacing 2` apontando para o `_ext.png`, terrain set com os 13+ tiles, camadas visuais e de colisão separadas; pinte um mapa de teste 12×26 tiles com todas as transições; exporte JSON para `public/assets/mapas/`; projeto em `design/mapas/`. Sprite Fusion: só se o export carregar no Phaser [confirmar].
6. **Backgrounds em camadas.** `ceu` (opaco, 1560×1688 ou 780×1688 sem loop), `meio` (alfa, 1560×~800), `frente` (alfa, 1560×~600): mesma luz/paleta, `meio` mais dessaturado (profundidade). Verifique costura em h; `verificar_legibilidade.py` no herói sobre a cor média do fundo (contraste ≥ 3:1).
7. **Ver no jogo**: `this.load.tilemapTiledJSON` + `map.addTilesetImage(..., 64, 64, 1, 2)` + `createLayer` (ou `TilemapGPULayer` para mapas grandes); parallax com `TileSprite` por camada e `tilePositionX = scrollX * fator` (0,1–0,2 / 0,4–0,6 / 0,8–1,0) — código em `references/phaser-tilemaps-e-parallax.md`. `bash scripts/verify.sh --feature <id>` com 3 posições de câmera (`--taps`) + vídeo curto → `production/evidencias/<data>-cenario-<bioma>/`.
8. **Registrar** tileset, cada camada e o mapa em `PROVENANCE.md` (`--categoria tile|bg`, modelo, seed, prompt, `--pos "seamless: wrap+edit; extrudir_tiles 1px"`, edição humana).

## Critério de pronto e evidência

- [ ] Todo tile repetível passa em `verificar_seamless.py` (h e v; HD ≤ 12, pixel ≤ 4) com preview 3×3 aprovado por humano.
- [ ] `tileset_<bioma>.png` em grade + `_ext.png` extrudado + `tileset_<bioma>.md` com a ordem; terreno/autotile no Tiled com mapa de teste exportado em JSON.
- [ ] Camadas `bg_<bioma>_{ceu,meio,frente}.png` com alfa correto, costura h verificada, ≤ 2048 px de largura, VRAM somada em `design/orcamento-texturas.md`.
- [ ] `production/evidencias/<data>-cenario-<bioma>/` com previews, 3 screenshots sem linhas entre tiles, vídeo do parallax sem salto e `state.json` com fps ≥ 50.
- [ ] `PROVENANCE.md` atualizado para tiles, camadas e mapa.

## Armadilhas conhecidas

- **"Seamless" no prompt não garante costura**: meça sempre e corrija por edição com máscara ou retoque.
- **Luz direcional em tile** cria padrão visível ao repetir; luz plana nos tiles, luz da bible nos sprites.
- **Linhas entre tiles** com câmera em posição fracionária ou DPR 2: extrusão + `margin/spacing` corretos; `TilemapGPULayer` resolve por construção (changelog 4.0), `TilemapLayer` não.
- **Fundo de tela cheia é o maior gasto de VRAM**: 1560×1688 RGBA8 = 10,5 MB; 3 camadas ≈ 19 MB dos 64 MB da cena. Céu em 780 px ou cor sólida + textura pequena quando der.
- **Mais de 3 camadas de tela cheia** custa fill-rate no iPhone; camadas estreitas/esparsas na frente.
- **Tiles de borda em ordem aleatória** inviabilizam o autotile: fixe a ordem no `.md` e no nome.
- **Sprite Fusion → Phaser**: anúncio de ago/2026 na Phaser News, formato de export não verificado; Tiled JSON é o caminho garantido.
- **Isométrico** exige grade 2:1 e tiles em losango (`ParseJSONTiled` lê isométrico/staggered/hexagonal); não misture com ortogonal.

## Exportar para Phaser (web mobile)

Tileset extrudado como textura própria (`this.load.image`, ≤ 2048², `margin 1`/`spacing 2`), mapas em JSON do Tiled em `public/assets/mapas/` versionados; backgrounds como texturas separadas ou atlas de fundos por bioma (`empacotar_atlas.py assets/backgrounds --nome bg_<bioma> --sem-trim`), `TileSprite` com frame do atlas (suportado no Phaser 4), WebP via `otimizar_imagens.py`; carregue por fase e `this.textures.remove` ao sair; ASTC 8×8 via `this.load.texture` só se a medição exigir. **Licença de saída**: por asset no `PROVENANCE.md`; Tiled não restringe seus mapas; Sprite Fusion [confirmar termos].

## Fontes

- Phaser 4 (fonte, 2026-10-10): `TilemapJSONFile.js` (`tilemapTiledJSON`), `ParseJSONTiled.js` (ortogonal/isométrico/staggered/hexagonal), `TileSprite.js` + changelog 4.0 (frames de atlas; `TilemapGPULayer` sem seams) — https://github.com/phaserjs/phaser
- Tiled (editor GPL; `libtiled` BSD; export JSON) — https://github.com/mapeditor/tiled (README/COPYING lidos em 2026-10-10)
- Sprite Fusion (gratuito, autotiling, exports; modelo de pixel art WIP) — https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser ; https://hugo-dz.itch.io/sprite-fusion [secundário]
- Retro Diffusion tilesets ≈ US$ 0,10 — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp [secundário]
- gpt-image-1.5 alfa nativa — https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 [secundário]; FLUX.2 [klein] 4B local — guia do ComfyUI (Comfy-Org/docs, 2026-10-10)
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ2, KQ7); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
