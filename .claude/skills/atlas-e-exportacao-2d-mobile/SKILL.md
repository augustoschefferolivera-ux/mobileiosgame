---
name: atlas-e-exportacao-2d-mobile
description: >
  Empacota sprites, UI e tiles em atlases JSON hash/multi-atlas para Phaser 4 web mobile e exporta para o
  build: scripts próprios (empacotar_atlas.py com Pillow ou free-tex-packer-core, padding/extrusão/trim/
  nine-slice/pivot), PNG otimizado (oxipng) e WebP com alfa, texturas comprimidas ASTC/PVRTC via
  this.load.texture quando a VRAM estoura, estratégia @2x com DPR ≤ 2, orçamento de memória por cena
  (≤ 64 MB) medido no Safari e fontes bitmap. Use sempre que assets 2D estiverem prontos para entrar no
  build, quando a memória ou o download estourar, quando houver halos escuros ou sangramento entre sprites/
  tiles, ou quando o usuário disser "atlas", "sprite sheet para o engine", "WebP", "KB por tela".
  Não use para gerar os assets (/gerar-sprites-2d, /ui-hud-e-icones, /cenarios-e-tilesets).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; Node 20+ opcional (free-tex-packer-core); oxipng/pngquant/cwebp opcionais"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [6, 8]
argument-hint: "[pasta-de-assets] [cena]"
disable-model-invocation: false
user-invocable: true
---

# Atlas e exportação 2D para mobile (Phaser 4)

Entrega atlases por cena/tipo em `public/assets/atlas/` (PNG + WebP + JSON hash ou multi-atlas), um orçamento de textura por cena em `design/orcamento-texturas.md` e a prova de que o jogo roda dentro dele; a evidência é o `screenshot.png`/`state.json` do `bash scripts/verify.sh` (raiz do projeto) (fps ≥ 50), o relatório de pesos e a leitura de memória no Safari do iPhone na pasta de evidências.

## Quando usar / quando não usar

- **Use** ao fechar a fase 6 (todos os assets de uma cena prontos) e na fase 8 quando memória, tempo de carregamento ou tamanho do pré-cache do PWA estourarem.
- **Use** para corrigir halos nas bordas (recorte sujo/alfa pré-multiplicado) e linhas entre tiles (sem extrusão).
- **Não use** para criar arte, nem para o deploy em si (`/publicar-jogo-web`).

## Pré-requisitos

- Assets finais nomeados e registrados (`./assets/sprites`, `./assets/ui`, `./assets/tiles`, `./assets/backgrounds`), art bible seção 7 (@2x, DPR ≤ 2) e 13 (limites).
- `python3 -m pip install Pillow` para `scripts/empacotar_atlas.py`, `scripts/otimizar_imagens.py`, `scripts/estimar_memoria_atlas.py`. Opcionais: `npm i -D free-tex-packer-core` (MIT, 0.3.9) para `--backend ftp`; `oxipng` (MIT), `pngquant` (GPL v3 ou licença comercial; não afeta o PNG gerado), `cwebp` (libwebp, BSD). TexturePacker (CodeAndWeb, pago; exportador "Phaser 3" com multipack e nine-slice desde 7.1 [secundário]) é alternativa.
- Para texturas comprimidas: PVRTexTool ou `astcenc` para gerar `.pvr`/`.ktx` (nomes citados no changelog 3.60 do Phaser); **no Phaser 4 as texturas comprimidas precisam ser recomprimidas com o eixo Y a partir de baixo** (changelog 4.0).
- Sem custo de IA. **Licença**: nenhuma nova; herda a dos assets.

## Entradas

1. Lista de cenas e quais assets cada uma carrega (`feature_list.json`).
2. Orçamento: ≤ 64 MB de texturas residentes por cena (regra da `engine-web-phaser`; RGBA8: 2048² = 16 MB), download total de imagens ≤ 8 MB (pré-cache do PWA < 50 MB), DPR ≤ 2.
3. Estilo: pixel art (sem perda, `--sem-trim`, nearest) ou HD (WebP q85, trim).

## Passos

1. **Agrupar por cena e por tipo**: um atlas junta o que é carregado junto; UI separada de sprites de jogo; pixel art separada de HD; fundos de tela cheia fora de atlas (texturas próprias); frames de animação no atlas do personagem. Leia `references/formatos-e-orcamento.md`.
2. **Estimar antes de empacotar**:
   ```bash
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/estimar_memoria_atlas.py --pasta assets/sprites/cena_floresta --formato rgba32 --atlas 2048
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/estimar_memoria_atlas.py --largura 1560 --altura 1688 --formatos rgba32,astc6x6,astc8x8
   ```
   Escreva o total por cena em `design/orcamento-texturas.md` (modelo na referência). Lembre: peso do PNG/WebP ≠ VRAM.
3. **Empacotar**:
   ```bash
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/empacotar_atlas.py assets/sprites/cena_floresta --nome cena_floresta --saida public/assets/atlas --padding 2 --extrude 1
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/empacotar_atlas.py assets/ui --nome ui --saida public/assets/atlas --sem-trim --nineslice ui_panel_main=48,48,48,48 --nineslice ui_btn_primary_normal=40,40,40,40 --pivot chr_heroi_idle=0.5,1
   ```
   Saída: `<nome>.png` + `<nome>.json` (hash) ou `<nome>-0.png`, `<nome>-1.png` + `<nome>.json` (`textures[]`, multi-atlas) quando passa de 2048². `--backend ftp` usa free-tex-packer-core (exporter `JsonHash`; sem `scale9Borders`). Nunca rotação; trim só em sprites (o Phaser restaura por `spriteSourceSize`).
4. **Tiles**: `python3 .claude/skills/cenarios-e-tilesets/scripts/extrudir_tiles.py <tileset.png> --tile 64 --extrude 1 --saida public/assets/tiles/<nome>_ext.png` e `addTilesetImage(..., 64, 64, 1, 2)`.
5. **Otimizar e gerar WebP**:
   ```bash
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/otimizar_imagens.py public/assets/atlas public/assets/backgrounds --webp --relatorio production/evidencias/<data>-atlas-<cena>/pesos.json
   ```
   Pixel art: `--sem-perda`. No `preload`, carregue `.webp` quando o navegador suportar (teste de `<img>` ou `createImageBitmap` em WebP no boot) e `.png` como fallback; Safari 14–15.6 tem suporte parcial e 16+ completo [caniuse, secundário].
6. **Carregar no Phaser**: `this.load.atlas('cena_floresta', 'assets/atlas/cena_floresta.webp', 'assets/atlas/cena_floresta.json')` ou `this.load.multiatlas('cena_floresta', 'assets/atlas/cena_floresta.json', 'assets/atlas/')`; `this.add.nineslice(x, y, 'ui', 'ui_panel_main', w, h)`; descarregue ao sair da cena: `this.textures.remove('cena_floresta')`.
7. **Texturas comprimidas (só se a VRAM estourar)**: gere `.pvr`/`.ktx` ASTC 4×4 (UI) / 6×6 (sprites) / 8×8 (fundos) com PVRTexTool/`astcenc` (eixo Y de baixo para cima no Phaser 4) e carregue com `this.load.texture('k', { ASTC: { type: 'PVR', textureURL: 'k-astc.pvr', atlasURL: 'k.json' }, IMG: { textureURL: 'k.png', atlasURL: 'k.json' } })` (WebGL only; ordem = prioridade; `IMG` é o fallback). Valide no iPhone real: o WebKit do Playwright pode não expor o mesmo suporte [confirmar].
8. **Medir no dispositivo**: `bash scripts/verify.sh --feature <id>` (fps, console) e, no iPhone, Safari → Web Inspector (Mac) → Memory/Timelines; ou registre `game.textures.list` com dimensões em `window.__GAME_DEBUG__` e some. Compare com `design/orcamento-texturas.md`; screenshot + leitura + `pesos.json` em `production/evidencias/<data>-atlas-<cena>/`. Estourou: reduza fundos (largura 780, menos camadas), divida a cena, ASTC.
9. **Registrar**: cada atlas ganha seção em `PROVENANCE.md` (`--ferramenta "humano (empacotar_atlas.py)" --versao "1.0" --licenca <id do projeto> --pos "atlas Phaser hash; padding 2; extrude 1; fontes: <lista>"`) — é derivado, mas o build o distribui.

## Critério de pronto e evidência

- [ ] `public/assets/atlas/` com atlases ≤ 2048² por cena/tipo (multi-atlas quando necessário), UI com `scale9Borders` e sem trim, pixel art sem perda; `.webp` ao lado de cada `.png`.
- [ ] `design/orcamento-texturas.md` com estimativa por cena, medição real e diferença explicada (≤ 64 MB residentes).
- [ ] `production/evidencias/<data>-atlas-<cena>/` com `screenshot.png`, `state.json` (fps ≥ 50), `pesos.json`, leitura de memória e teste de halo (xadrez/preto).
- [ ] Nenhum sangramento entre tiles em 3 screenshots com a câmera em posições fracionárias.

## Armadilhas conhecidas

- **Peso do arquivo ≠ VRAM**: WebP/oxipng reduzem download; só ASTC reduz memória de GPU. Um atlas 2048² ocupa 16 MB mesmo com 300 KB em disco.
- **Trim em UI/tiles** desloca nine-slice e grade: `--sem-trim`; NineSlice do Phaser não aceita frames aparados.
- **Rotação no atlas**: desligada por padrão nos scripts; TexturePacker/ftp podem ligar — não ligue.
- **Halo**: PNG já pré-multiplicado por outra ferramenta, ou recorte sujo; corrija na origem (o Phaser converte alfa reto ao subir a textura; `premultipliedAlpha: true` é o padrão da config).
- **WebP com perda em pixel art** quebra a paleta: `--sem-perda`.
- **pngquant** é GPL/comercial para a ferramenta (o PNG gerado não herda a licença); se a política do projeto proibir GPL no toolchain, use só oxipng.
- **`MAX_TEXTURE_SIZE` alto não é desculpa**: iPhones atuais reportam 16384 [web3dsurvey, secundário], mas a memória do Safari é curta; mantenha 2048.
- **Nomes de frame duplicados** entre pastas: o script aborta; prefixos de categoria (`chr_`, `ui_`) evitam isso.

## Exportar para Phaser (web mobile)

Esta skill **é** a exportação: PNG RGBA @2x → `empacotar_atlas.py` (hash/multi-atlas, padding 2, extrusão 1, `scale9Borders`, `pivot`) → `otimizar_imagens.py --webp` → `this.load.atlas/multiatlas`, `this.add.nineslice`, `this.anims.generateFrameNames`; tiles extrudados com `margin/spacing`; fundos como texturas próprias (≤ 1560×1688); ASTC via `this.load.texture` só quando medido como necessário; orçamento ≤ 64 MB por cena medido no iPhone; pré-cache do PWA via `vite-plugin-pwa` (já configurado na `engine-web-phaser`). **Licença de saída**: herdada dos assets registrados.

## Fontes

- Phaser 4 (fonte, 2026-10-10): `JSONHash.js`/`JSONArray.js` (`trimmed`, `pivot`, `scale9Borders`, `textures[]`), `MultiAtlasFile.js`, `CompressedTextureFile.js` (`this.load.texture`, formatos e `IMG` fallback), `NineSlice.js`, `Config.js` (`premultipliedAlpha`, `maxTextureSize`), `ScaleManager.js` (`zoom`) — https://github.com/phaserjs/phaser
- Phaser 3.60 "Compressed Texture Support" (KTX/PVR; PVRTexTool, ASTC Encoder, TexturePacker) — https://github.com/phaserjs/phaser/blob/master/changelog/v3/3.60/CompressedTextures.md ; Phaser 4.0 changelog (recompressão com eixo Y a partir de baixo; Canvas deprecado) — https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md
- free-tex-packer-core 0.3.9 (MIT; opções `padding`, `extrude`, `allowRotation`, `allowTrim`, `powerOfTwo`, exporters `JsonHash`/`Phaser3`) — https://github.com/odrick/free-tex-packer-core ; https://www.npmjs.com/package/free-tex-packer-core
- oxipng (MIT; `-o 4 --strip safe --alpha`) — https://github.com/oxipng/oxipng ; pngquant (GPL v3 ou comercial) — https://github.com/kornelski/pngquant ; libwebp — https://github.com/webmproject/libwebp
- WebP/AVIF em navegadores (MDN "Image file type and format guide") — https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types ; Safari 14–15.6 parcial/16+ — https://caniuse.com/webp [via busca, secundário]
- TexturePacker: exportador Phaser 3 (pivot, multipack, normal maps), 9-slice desde 7.1.0 — https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser3 [secundário]
- `MAX_TEXTURE_SIZE` em iOS — https://web3dsurvey.com/webgl/parameters/MAX_TEXTURE_SIZE [secundário]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ7); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
