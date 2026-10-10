# Mapa de nomes da UI (`design/ui-mapa-de-nomes.md`) para Phaser 4

O mapa é o contrato entre quem gera a arte e quem carrega no engine: nomes previsíveis, estados obrigatórios,
nine-slice declarado e números de acessibilidade. Sem ele, o agente do engine inventa nomes e a UI quebra em silêncio.

## Convenção de arquivos (@2x: 1 pt = 2 px; sem sufixos @2x/@3x — o Phaser não os usa)

```
ui_<peça>_<variante>_<estado>.png     # raster @2x; vai para o atlas "ui"
icn_<conceito>.svg                     # vetor (Recraft V4 Vector) em masters/ui/; rasterizado para icn_<conceito>.png @2x no atlas
icon-192.png, icon-512.png, icon-*-maskable.png, apple-touch-icon-180.png   # public/icons/ (gerar_icones_pwa.py)
```
Estados de botão: `normal`, `pressed`, `disabled` (+ `focused` se houver controle físico). Peças sem estado omitem o sufixo.

## Modelo de tabela

| Elemento | Frame no atlas | Tamanho pt (px @2x) | Nine-slice l,t,r,b (px @2x) | Contraste | Alvo de toque | Observações |
|---|---|---|---|---|---|---|
| Painel principal | `ui_panel_main` | livre (min 96×96 → 192×192) | 48,48,48,48 | — | — | opacidade ≤ 65 % sobre o jogo |
| Botão primário | `ui_btn_primary_{normal,pressed,disabled}` | 160×48 (320×96) | 40,40,40,40 | texto 7,2:1 | 160×48 ≥ 44 | rótulo em `BitmapText` |
| Botão de ícone | `ui_btn_icon_{normal,pressed,disabled}` | 48×48 (96×96) | 24,24,24,24 | ícone 3,8:1 | 48×48 | |
| Slot de inventário | `ui_slot_item` | 56×56 (112×112) | — | — | 56×56 | |
| Barra de vida (moldura) | `ui_bar_hp_frame` | 200×20 (400×40) | 16,16,16,16 | — | — | |
| Barra de vida (preenchimento) | `ui_bar_hp_fill` | 184×12 (368×24) | 8,0,8,0 | — | — | cor Perigo < 25 % + ícone pulsando |
| Ícone moeda | `icn_coin` | 24×24 (48×48) | — | 4,6:1 | — | SVG master em `masters/ui/` |
| Toast | `ui_toast_bg` | 320×56 (640×112) | 32,32,32,32 | texto 4,9:1 | — | ≤ 3 simultâneos |

## Como o Phaser 4 lê

| Peça | Código | Observação |
|---|---|---|
| Atlas de UI | `this.load.atlas('ui', 'assets/atlas/ui.png', 'assets/atlas/ui.json')` | UI em atlas próprio (`empacotar_atlas.py --sem-trim`); `multiatlas` se passar de 2048² |
| Nine-slice | `this.add.nineslice(x, y, 'ui', 'ui_panel_main', w, h, 48, 48, 48, 48)`; com `scale9Borders` no JSON basta `(x, y, 'ui', 'ui_panel_main', w, h)` | não aceita frames aparados; sem rotação no atlas; `tileX/tileY` repetem o meio |
| 3-slice (barra) | `this.add.nineslice(x, y, 'ui', 'ui_bar_hp_frame', w, undefined, 16, 16)` | só largura variável |
| Botão com estados | `img.setFrame('ui_btn_primary_pressed')` em `pointerdown`, `normal` em `pointerup/out`; `setInteractive({ useHandCursor: false })` e hit area ≥ 88×88 px @2x | 44×44 pt mínimo (HIG) |
| Texto de HUD | `this.load.bitmapFont('hud', 'assets/fonts/hud.png', 'assets/fonts/hud.xml')` → `this.add.bitmapText(x, y, 'hud', '0', 34)` | fonte gerada @2x (tamanho 17 pt → 34 px) por BMFont/Snow BMF/msdf-bmfont-xml (XML .fnt); evita `Text` por frame |
| Texto dinâmico/localizado | `this.add.text(x, y, s, { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', resolution: 1 })` | fontes do sistema; sem Dynamic Type na web: ofereça escala de UI nas opções |
| Ícone SVG direto | `this.load.svg('icn_coin', 'assets/ui/icn_coin.svg', { scale: 2 })` | rasteriza no load; prefira o PNG @2x no atlas (1 draw call) |
| Safe area | CSS: `--sat: env(safe-area-inset-top)` etc. → leia `getComputedStyle(document.documentElement)` no boot e empurre o HUD (`this.scale`) | Dynamic Island/barra inferior cobrem 50–60 pt no topo e ~34 pt embaixo em iPhones recentes [confirmar por aparelho] |

## Acessibilidade mínima (anote os números na tabela)

- Contraste: texto ≥ 4,5:1; gráficos informativos ≥ 3:1 (WCAG AA) — `scripts/verificar_contraste.py --style-card design/style-card.md`.
- Alvo de toque ≥ 44×44 pt (HIG "Designing for games": padrão 44×44, mínimo 28×28) — `--toque WxH`.
- Texto: padrão 17 pt, mínimo 11 pt (HIG) → fontes bitmap de 34 px e 22 px @2x.
- Nenhuma informação só por cor: vida baixa = cor + ícone/pulso; item raro = cor + moldura.
- Movimento: toda animação de UI tem versão estática (opção "reduzir movimento"; respeite `prefers-reduced-motion`).
