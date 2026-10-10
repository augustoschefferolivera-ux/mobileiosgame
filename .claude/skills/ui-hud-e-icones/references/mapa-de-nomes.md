# Mapa de nomes da UI (`design/ui-mapa-de-nomes.md`)

O mapa é o contrato entre quem gera a arte e quem carrega no engine: nomes previsíveis, estados obrigatórios e nine-slice declarado. Sem ele, o agente do engine inventa nomes e a UI quebra em silêncio.

## Convenção

```
ui_<peça>_<variante>_<estado>.png     # raster, @1x/@2x/@3x com sufixo @2x/@3x em iOS; sem sufixo em atlas
icn_<conceito>.svg                     # vetor; rasterizações icn_<conceito>@1x.png ... quando o engine não lê SVG
app_icon_1024.png                      # ícone do app (sem alfa)
```

Estados de botão: `normal`, `pressed`, `disabled` (+ `focused` se houver controle físico). Peças sem estado omitem o sufixo.

## Modelo de tabela

| Elemento | Arquivo | Chave no engine | Tamanho @1x (pt) | Nine-slice (l,t,r,b) px @1x | Contraste | Alvo de toque | Observações |
|---|---|---|---|---|---|---|---|
| Painel principal | `ui_panel_main.png` | `ui_panel_main` | livre | 24,24,24,24 | — | — | opacidade 65% máx. sobre o jogo |
| Botão primário | `ui_btn_primary_{normal,pressed,disabled}.png` | `ui_btn_primary` | 160×48 | 20,20,20,20 | texto 7,2:1 | 160×48 ≥ 44 | rótulo renderizado pelo engine |
| Botão de ícone | `ui_btn_icon_{normal,pressed,disabled}.png` | `ui_btn_icon` | 48×48 | 12,12,12,12 | ícone 3,8:1 | 48×48 | |
| Slot de inventário | `ui_slot_item.png` | `ui_slot_item` | 56×56 | — | — | 56×56 | |
| Barra de vida (moldura) | `ui_bar_hp_frame.png` | `ui_bar_hp_frame` | 200×20 | 8,8,8,8 | — | — | |
| Barra de vida (preenchimento) | `ui_bar_hp_fill.png` | `ui_bar_hp_fill` | 184×12 | 4,0,4,0 | — | — | cor Perigo abaixo de 25% + ícone pulsando |
| Ícone moeda | `icn_coin.svg` | `icn_coin` | 24×24 | — | 4,6:1 | — | |
| Toast | `ui_toast_bg.png` | `ui_toast_bg` | 320×56 | 16,16,16,16 | texto 4,9:1 | — | ≤ 3 simultâneos |

## Como cada engine lê

| Engine | Onde | Nine-slice | Observação |
|---|---|---|---|
| SpriteKit / SwiftUI | Asset catalog (`Assets.xcassets`), image sets com @1x/@2x/@3x; "Slicing" no inspector; SVG/PDF com "Preserve Vector Data" [confirmar] | `SKSpriteNode.centerRect` / `Image(...).resizable(capInsets:)` | nomes sem extensão |
| Unity | Atlas de UI separado (skill oficial `manage-sprite-atlas`); bordas no Sprite Editor (skill `sprite-editor`); UI Toolkit ou UGUI (skills `ui-uitk`, `ui-ugui`) | `Image.Type.Sliced` | `Filter Mode: Point` só em pixel art |
| Godot 4 | `assets/ui/` importado; `NinePatchRect` / `StyleBoxTexture` via `theme_manage.set_stylebox_texture` (Godot AI) | `patch_margin_*` | `texture_filter` por nó |
| Phaser 3 | `this.load.atlas('ui', 'ui.png', 'ui.json')` | `this.add.nineslice(...)` (3.60+ [confirmar]) | sufixos @2x/@3x não existem: escolha escala por `devicePixelRatio` |

## Acessibilidade mínima (anote os números na tabela)

- Contraste: texto ≥ 4,5:1; gráficos informativos ≥ 3:1 (WCAG AA). Calcule com as cores hex do style card (fórmula de luminância relativa; qualquer calculadora WCAG).
- Alvo de toque ≥ 44×44 pt (HIG da Apple [confirmar versão]).
- Nenhuma informação só por cor: vida baixa = cor + ícone/pulso; item raro = cor + moldura diferente.
- Movimento: toda animação de UI tem versão estática para "Reduzir Movimento".
- Texto do engine: Dynamic Type em UI nativa; em UI desenhada, fonte escalável e teste a 125–150%.
