# Phaser 4: tilemaps (Tiled JSON), tilesets com extrusão, parallax com TileSprite e orçamento de fundos

Fonte: código do Phaser 4.2.1 (`TilemapJSONFile.js`, `ParseJSONTiled.js`, `TileSprite.js`, changelog 4.0) e
README/COPYING do Tiled, lidos em 2026-10-10.

## Tiled → Phaser

- Editor **Tiled** (GPL para o editor; `libtiled` BSD; os mapas são seus) exporta `.json` (orientação ortogonal,
  isométrica, staggered ou hexagonal — todas lidas por `ParseJSONTiled`). Salve o projeto em `design/mapas/` e o
  export em `public/assets/mapas/`.
- Loader: `this.load.tilemapTiledJSON('fase1', 'assets/mapas/fase1.json')` + `this.load.image('tiles_floresta', 'assets/tiles/tileset_floresta_ext.png')`.
- Criação: `const map = this.make.tilemap({ key: 'fase1' }); const ts = map.addTilesetImage('<nome do tileset no Tiled>', 'tiles_floresta', 32, 32, 1, 2); const chao = map.createLayer('chao', ts, 0, 0);`
  — os dois últimos argumentos são `margin` e `spacing`, que casam com `extrudir_tiles.py --extrude 1` (margin 1, spacing 2).
- `TilemapGPULayer` (novo no Phaser 4): renderiza a camada inteira em um quad, "perfect texture filtering with no
  seams or bleeding" (changelog 4.0); a skill `engine-web-phaser` usa `createLayer(..., true)` para mapas grandes.
  Para `TilemapLayer` clássico, a extrusão continua obrigatória.
- Sprite Fusion: editor gratuito no navegador com autotiling e exports "Unity, Godot, GB Studio, PNG, JSON"
  (anúncio na Phaser News, ago/2026); carregue no Phaser como JSON do Tiled **só se** o export for compatível
  [confirmar no editor; senão use o PNG do mapa + colisão própria, ou Tiled].

## Tiles @2x e tamanho da grade

Tile lógico de 32 pt = 64 px @2x; tela 390×844 pt mostra ≈ 12,2 × 26,4 tiles de 32 pt. Autotile ortogonal
precisa de 13–47 tiles de transição por terreno; comece por 13 (blob mínimo: cheio, 4 bordas, 4 cantos externos,
4 cantos internos) e gere as transições por edição com máscara a partir do tile cheio e do vazio.

## Parallax com TileSprite (Phaser 4 aceita frames de atlas)

```ts
const ceu   = this.add.tileSprite(0, 0, W, H, 'bg_floresta', 'bg_floresta_ceu').setOrigin(0).setScrollFactor(0);
const meio  = this.add.tileSprite(0, H - hMeio, W, hMeio, 'bg_floresta', 'bg_floresta_meio').setOrigin(0).setScrollFactor(0);
const frente= this.add.tileSprite(0, H - hFrente, W, hFrente, 'bg_floresta', 'bg_floresta_frente').setOrigin(0).setScrollFactor(0);
update() { ceu.tilePositionX = cam.scrollX * 0.15; meio.tilePositionX = cam.scrollX * 0.5; frente.tilePositionX = cam.scrollX * 0.9; }
```
O changelog 4.0 diz que `TileSprite` agora "can use frames within that texture, enabling texture atlas and
spritesheet support" (no v3 só repetia a textura inteira). A textura de cada camada precisa ser horizontalmente
seamless (`verificar_seamless.py --eixos h`). Largura de camada = 1560 px (2× 780) cabe em uma página 2048².

## Orçamento de fundos (o maior gasto de VRAM do jogo)

| Camada | Tamanho @2x | RGBA8 na GPU | Observação |
|---|---|---|---|
| Céu opaco | 1560×1688 (ou 780×1688 sem loop) | 10,5 MB (5,3 MB) | gradiente simples pode ser `Graphics`/cor de fundo + 1 textura pequena |
| Meio (alfa) | 1560×800 | 5 MB | silhuetas distantes, dessaturadas |
| Frente (alfa) | 1560×600 | 3,7 MB | elementos esparsos |
| Total | | ≈ 19 MB | dentro dos ≤ 64 MB/cena com 2–3 atlases de sprites |

Reduza: céu em 780 px de largura com `tilePositionX` (loop de 1 tela), camadas de altura menor (só a faixa que
aparece), 2 camadas em vez de 4 em fases pesadas, texturas comprimidas ASTC 8×8 via `this.load.texture` se estourar.
Descarregue ao sair da fase: `this.textures.remove('bg_floresta')`.

## Checklist de cenário no Phaser

- [ ] Tileset extrudado (`extrudir_tiles.py`) e `addTilesetImage` com `margin/spacing` corretos; sem linhas entre tiles em 3 screenshots com a câmera em posições fracionárias.
- [ ] Camadas de colisão separadas das visuais no Tiled; propriedades custom lidas por `map.setCollisionByProperty`.
- [ ] Parallax sem "salto" no loop (vídeo curto de 10 s); fatores 0,1–0,2 / 0,4–0,6 / 0,8–1,0.
- [ ] `design/orcamento-texturas.md` atualizado com as camadas; `verify.sh` com `fps ≥ 50`.
