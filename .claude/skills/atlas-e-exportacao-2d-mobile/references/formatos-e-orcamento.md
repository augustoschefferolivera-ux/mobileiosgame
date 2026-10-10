# Phaser 4 (web mobile): atlas JSON, @2x, formatos, texturas comprimidas e orçamento de memória

Fonte primária: código e changelog do Phaser 4.2.1 (`phaserjs/phaser`, lidos em 2026-10-10): `JSONHash.js`,
`JSONArray.js`, `MultiAtlasFile.js`, `CompressedTextureFile.js`, `NineSlice.js`, `Config.js`, `ScaleManager.js`,
`changelog/v3/3.60/CompressedTextures.md`, `changelog/v4/4.0/CHANGELOG-v4.0.0.md`.

## 1. Estratégia de resolução (ADR-0001: 390×844 lógico, `Scale.FIT`, DPR ≤ 2)

- **Assets são desenhados @2x**: 1 pt lógico = 2 px de textura. Herói de 64 pt = 128 px; botão de 44 pt = 88 px;
  fundo de tela cheia = 780×1688 px (1560 de largura se fizer loop horizontal).
- **Canvas em DPR 2**: no Phaser a forma mais simples é `scale: { width: 390 * dpr, height: 844 * dpr, zoom: 1 / dpr, mode: Phaser.Scale.FIT }`
  com `dpr = Math.min(devicePixelRatio, 2)`; o `zoom` "multiplica o tamanho-base do jogo ao calcular o tamanho de
  exibição" (doc do `ScaleManager#zoom`), ou seja, o canvas tem 780×1688 pixels reais exibidos em 390×844 CSS px.
  Coordenadas de jogo passam a ser em px @2x; mantenha a lógica em pt multiplicando por `dpr` em um único lugar.
  **Valide com screenshot** (`scripts/verify.sh`) que texto e sprites saem nítidos; se preferir manter a lógica em
  390×844, o canvas fica 1× e os sprites @2x são exibidos reduzidos (nítidos em DPR 2 só se o navegador escalar o
  canvas; na prática ficam borrados) — por isso o canvas @2x.
- **DPR 3 nunca**: 3× o número de pixels do canvas e das texturas estoura a memória do Safari.
- Pixel art: lógica em grade inteira (ex.: 195×422 → zoom 2 → 390×844) e `pixelArt: true`; ver `/pixel-art-pipeline`.

## 2. Formatos de atlas que o Phaser lê

| Formato | Loader | Estrutura | Gerado por |
|---|---|---|---|
| JSON hash (TexturePacker "JSON (Hash)" / "Phaser 3") | `this.load.atlas(key, 'a.png', 'a.json')` | `frames: { "nome": { frame, rotated, trimmed, spriteSourceSize, sourceSize, pivot?, scale9Borders? } }` | `scripts/empacotar_atlas.py`, free-tex-packer (`JsonHash`/`Phaser3`), TexturePacker |
| JSON array | `this.load.atlas(...)` | `frames: [ { filename, frame, ... } ]` | `slice_spritesheet.py --formato array`, free-tex-packer `JsonArray` |
| Multi-atlas | `this.load.multiatlas(key, 'a.json', 'caminho/')` | `textures: [ { image, size, scale, frames: [...] } ]`; o Phaser carrega cada `image` | `empacotar_atlas.py` (quando passa de uma página), TexturePacker "Phaser 3" multipack |
| Sprite sheet em grade | `this.load.spritesheet(key, 'a.png', { frameWidth, frameHeight, margin, spacing })` | PNG em grade fixa | `slice_spritesheet.py montar`, Aseprite |
| Textura comprimida (+ atlas) | `this.load.texture(key, { ASTC: { type: 'PVR'|'KTX', textureURL, atlasURL }, IMG: { textureURL, atlasURL } })` | PVR/KTX; formatos ETC/ETC1/ATC/ASTC/BPTC/RGTC/PVRTC/S3TC; ordem = prioridade; `IMG` = fallback | PVRTexTool, `astcenc`, TexturePacker (3.60 doc); **Phaser 4 exige recompressão com eixo Y a partir de baixo** (changelog 4.0) |

Campos lidos pelo parser: `trimmed` → `Frame.setTrim(sourceSize.w, sourceSize.h, spriteSourceSize.x, y, w, h)`;
`rotated` → UVs invertidas; `anchor` ou `pivot` → `pivotX/pivotY`; `scale9Borders {x,y,w,h}` (retângulo central) →
`Frame.setScale9` usado pelo `NineSlice` (texturas aparadas não são suportadas pelo NineSlice).

## 3. Memória de GPU por textura (sem mipmaps; sprites 2D não usam)

| Formato | bpp | 1024² | 2048² | Uso |
|---|---|---|---|---|
| RGBA8 (PNG/WebP descomprimido na GPU) | 32 | 4 MB | 16 MB | padrão do Phaser com `this.load.image/atlas` |
| ASTC 4×4 | 8 | 1 MB | 4 MB | UI, texto-like (via `this.load.texture`) |
| ASTC 6×6 | ≈ 3,56 | ≈ 455 KB | ≈ 1,8 MB | sprites HD |
| ASTC 8×8 | 2 | 256 KB | 1 MB | fundos |
| PVRTC 4 bpp | 4 | 512 KB | 2 MB | só iPhones antigos; quadrado e potência de 2 |

`scripts/estimar_memoria_atlas.py --pasta <dir> --formato rgba32` soma os PNGs e estima quantas páginas 2048² ocupam.
**Importante:** o peso do arquivo PNG/WebP no disco não é o peso na GPU: um atlas 2048² RGBA8 ocupa 16 MB de VRAM
mesmo que o PNG tenha 400 KB. WebP/oxipng reduzem download e cache do PWA, não memória de GPU; só texturas
comprimidas (ASTC) reduzem VRAM.

## 4. Orçamento por cena (modelo para `design/orcamento-texturas.md`)

Não há número oficial da Apple para WebGL em Safari; a skill `engine-web-phaser` adota heap < ~300 MB como regra
prática. Teto inicial deste repositório (inferência; valide no iPhone com Web Inspector → Timelines/Memory):

| Item | Teto | Como medir |
|---|---|---|
| Atlases carregados por cena | ≤ 4 páginas 2048² RGBA8 (64 MB) ou ≤ 8 com ASTC | soma do `estimar_memoria_atlas.py` |
| Fundos de parallax | ≤ 3 camadas de 1560×1688 (≈ 10,5 MB cada em RGBA8) → ≈ 32 MB | idem |
| Total de texturas residentes | ≤ 100 MB RGBA8-equivalente | `game.textures.list` + dimensões em `__GAME_DEBUG__` |
| Texturas por draw call | `maxTextures` = unidades do GPU (`gl.MAX_TEXTURE_IMAGE_UNITS`) | — |
| Lado máximo de textura | 2048 (regra do projeto; `gl.MAX_TEXTURE_SIZE` costuma ser 16384 em iOS atual [web3dsurvey, secundário]) | `game.renderer.getMaxTextureSize()` |

Troca de cena: `this.textures.remove(key)` para atlases que não voltam; preload por cena, não global.

## 5. Alfa pré-multiplicado e halos

PNG guarda alfa reto; o Phaser cria o contexto WebGL com `premultipliedAlpha: true` (config padrão) e faz a conversão
ao subir a textura, então PNGs normais não geram halo. Halo escuro = PNG já pré-multiplicado por outra ferramenta
ou recorte com borda suja; halo claro = borda semitransparente com cor de fundo residual (recorte). Corrija na
origem (`remove_bg.py`, `chroma_para_alfa.py --despill`), nunca pintando a borda.

## 6. Nine-slice e UI

`this.add.nineslice(x, y, 'ui', 'ui_panel_main', 300, 200, 24, 24, 24, 24)` (leftWidth, rightWidth, topHeight,
bottomHeight; só os dois primeiros = 3-slice). Com `scale9Borders` no atlas (`empacotar_atlas.py --nineslice`),
basta `this.add.nineslice(x, y, 'ui', 'ui_panel_main', 300, 200)`. Peças nine-slice: `--sem-trim`, sem rotação,
centro liso; `tileX/tileY` (novo no 4.0) repetem em vez de esticar (textura central precisa ser seamless).

## 7. Formato de arquivo: PNG vs WebP

- PNG RGBA 8 bits é o master; `otimizar_imagens.py` roda `oxipng` (sem perda) e opcionalmente `pngquant`
  (paleta, com perda; GPL/comercial para a ferramenta) e gera `.webp` (q 85, alfa sem perda).
- WebP com alfa: suportado em Chrome/Edge/Firefox/Safari (MDN); Safari 14–15.6 "parcial", 16+ completo
  [caniuse via busca, secundário]. Carregue WebP quando `this.sys.game.device`/teste de `<img>` indicar suporte;
  senão PNG. Pixel art: só sem perda.
- Download típico de um jogo casual: 3–8 MB de imagens (atlases WebP) cabe no pré-cache do service worker (< 50 MB).

## 8. Checklist de exportação

- [ ] Todo sprite/UI/tile em um atlas por cena e por tipo (UI separado de sprites; pixel art separado de HD).
- [ ] `empacotar_atlas.py --padding 2 --extrude 1`; UI com `--sem-trim` e `--nineslice`; tiles com `extrudir_tiles.py`.
- [ ] Páginas ≤ 2048²; multi-atlas quando passar; `--pot` só se for usar texturas comprimidas.
- [ ] `otimizar_imagens.py --webp` e relatório de pesos na pasta de evidências.
- [ ] `design/orcamento-texturas.md` com estimativa e medição real; `verify.sh` com screenshot + `fps ≥ 50`.
