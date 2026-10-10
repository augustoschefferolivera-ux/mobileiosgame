# Prompts por bioma: tiles e camadas de fundo

Todo prompt começa com o **prefixo literal do style card**. Troque só o bloco `<BIOMA>` (da seção 9 da art bible: temperatura de cor, densidade, 3 elementos narrativos). Luz plana em tiles; a luz direcional da bible fica para personagens e para a cena.

## Bloco de bioma (exemplo: floresta temperada)

```
BIOMA floresta: cool-green palette (#2F5D3A, #5E8C4A, #A3B86C, #3B2F2F), damp moss, old roots,
scattered mushrooms; sparse props; story details: broken wooden signposts, overgrown stone path, hanging lanterns.
```

## Tiles (vista ortográfica, repetíveis)

| Tile | Prompt (após prefixo + bloco de bioma) |
|---|---|
| Chão base | `seamless tileable ground texture tile, top-down orthographic, flat even lighting, no shadows, no perspective, edges match exactly, mossy forest floor, square tile, no border` |
| Chão-borda (topo) | `platformer ground tile with grass top edge and dirt below, side view, flat lighting, horizontally seamless (left and right edges match exactly), square tile, no background` |
| Parede | `seamless tileable stone wall tile, side view, flat lighting, edges match exactly, mossy cobblestone, square tile` |
| Plataforma | `single floating platform segment, side view, flat lighting, horizontally seamless, mossy wooden plank with roots, transparent background` |
| Decoração | `small forest decoration prop for a tile set: <cogumelo|lanterna|placa>, isolated, transparent background, flat lighting, fits a <N>px tile` |
| Transições (top-down autotile) | gere **um** tile cheio e **um** vazio por par de terrenos; as transições saem melhor por edição (máscara) a partir desses dois do que por prompt livre |

Negativo: `no text, no watermark, no characters, no strong directional light, no vignette, no perspective, no frame`.

Pixel art: adicione `pixel art, <N>px tile, <K>-color palette, no anti-aliasing` e gere com ferramenta pixel-native; requantize se vier de generalista (`/pixel-art-pipeline`).

Tamanhos para Phaser @2x: tile de 32 pt = 64 px (gere 512–1024 px e reduza com Lanczos); tileset ≤ 2048² e extrudado com `scripts/extrudir_tiles.py` antes de ir para o Tiled. Rota local sem custo: FLUX.2 [klein] 4B na estação GPU (`../gerar-sprites-2d/references/comfyui-receitas.md`).

## Camadas de fundo (parallax)

| Camada | Prompt | Saída |
|---|---|---|
| `ceu` | `wide panoramic sky background for a 2D portrait game, horizontally seamless (left and right edges match exactly), soft gradient, distant clouds, flat lighting, no ground, no text` | opaco, 1560×1688 px @2x (2× a largura de 780) ou 780×1688 sem loop |
| `meio` | `distant forest treeline silhouettes layer for parallax, horizontally seamless, isolated on transparent background, bottom-anchored, muted desaturated colors (atmospheric depth), no sky, no ground` | alfa nativo (gpt-image-1.5); 1560×~800 px @2x |
| `frente` | `foreground forest elements for parallax: sparse tree trunks, hanging vines, a lantern, isolated on transparent background, bottom-anchored, horizontally seamless, full saturation, no sky, no ground` | alfa nativo; 1560×~600 px @2x |

Regras:
- Mesma paleta e mesma hora do dia nas três camadas; o `meio` mais dessaturado/claro que o `frente` (profundidade atmosférica).
- Elementos na borda esquerda e direita devem ser raros (facilita costura) — peça "empty margins near the left and right edges" se a costura falhar.
- Sem personagens, sem texto, sem placas legíveis.

## Verificação e correção da costura

1. `verificar_seamless.py <arquivo> --eixos h` (fundo) ou `--eixos hv` (tile). Limiar 12 (HD) / 0–4 (pixel art).
2. Correção por edição: desloque a imagem em meia largura com wrap (Pillow: `ImageChops.offset`), gere uma máscara cobrindo a faixa central (a antiga emenda) e peça ao modelo de edição com máscara para "continue the texture seamlessly" (API de edição da OpenAI: confirme parâmetros); desloque de volta.
3. Correção por espelho (só decoração/céu): metade esquerda espelhada na direita cria simetria visível; use com parcimônia.
4. Sempre olhe o preview 3×3: a métrica mede só a emenda, não padrões repetitivos óbvios ("efeito azulejo"). Para quebrar repetição, 2–4 variações do mesmo tile misturadas no mapa.

## Prompts por outros biomas (blocos prontos para adaptar)

- **Deserto**: `warm sand palette (#E3C27A, #C98B3A, #7A4A24, #2E6F8E), dunes, cracked clay, bleached bones; very sparse props; story: half-buried statues, dry wells, caravan flags.`
- **Caverna**: `cool dark palette (#1B1F2A, #2E3A4F, #5C7A99, #B9F2FF glow), wet rock, crystals, stalactites; medium density; story: abandoned mining carts, rope bridges, glowing fungi.`
- **Cidade noturna**: `neon palette (#0D0F1A, #2B2F55, #FF3C8E, #30E3CA), wet asphalt, signage without readable text, fire escapes; dense props; story: shuttered shops, flickering lamps, posters (no text).`
- **Neve**: `cold palette (#EAF2F8, #B7CFE0, #5A7A99, #3B2F2F), packed snow, ice edges, pine stumps; sparse; story: frozen signposts, broken sleds, smoke from distant chimneys.`
