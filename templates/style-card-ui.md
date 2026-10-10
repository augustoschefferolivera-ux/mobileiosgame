# Style Card — [Título do jogo] (1 página; vira prefixo de todo prompt de imagem)

> **Derivado de**: `design/art-bible.md` (seções 1, 2, 4, 5, 7, 10, 11) · **Status**: Rascunho | Aprovado AAAA-MM-DD por [nome]
> **Regra**: nenhum prompt de sprite, UI, ícone, tile ou cenário sai sem o bloco "Prefixo de prompt" abaixo.
> Mudou o style card? Regenere o teste de consistência (3 assets aleatórios + `verificar_legibilidade.py`) antes de seguir.
> Alvo: Phaser 4 web, retrato 390×844 pt, assets @2x (1 pt = 2 px). Padrão "style card + peças separadas + mapa de nomes"
> inspirado em guias de produção de HUD com IA (ver fontes em `/ui-hud-e-icones`).

## 1. Identidade em uma frase
[A definir — copie a seção 1 da art bible, encurtada para ≤ 20 palavras]

## 2. Paleta de UI (hex) — pode divergir da paleta do mundo; registre a divergência

| Papel | Hex | Contraste sobre fundo de painel (`verificar_contraste.py`) | Observação |
|---|---|---|---|
| Fundo de painel | `#` | — | opacidade máx. 65 % sobre o jogo |
| Borda / moldura | `#` | — | |
| Texto primário | `#` | ≥ 4,5:1 | |
| Texto secundário | `#` | ≥ 4,5:1 | |
| Acento (botão primário) | `#` | ≥ 3:1 (elemento gráfico) | |
| Perigo | `#` | ≥ 3:1 | nunca só cor: ícone/forma junto |
| Sucesso / recompensa | `#` | ≥ 3:1 | |
| Desabilitado | `#` | — | 40 % de opacidade do acento |

Comando: `python3 .claude/skills/ui-hud-e-icones/scripts/verificar_contraste.py --style-card design/style-card.md` (o 1º hex da tabela é o fundo).

## 3. Forma
- Raio de canto: `__ pt` (`__ px` @2x) em painéis; `__ pt` em botões; slots quadrados com raio `__`.
- Traço/contorno: `__ px` @2x; cor `#`; interno/externo. Mesma espessura em todo o conjunto.
- Sombra: [nenhuma | dura deslocada (x, y) | suave] — a mesma em todas as peças.
- Grade: múltiplos de 8 pt; margens internas `__ pt`; safe areas: HUD a ≥ `env(safe-area-inset-top)` do topo e ≥ `env(safe-area-inset-bottom)` da base.
- Nine-slice: molduras e botões gerados com cantos de `__ px` @2x e meio liso "esticável"; bordas (l,t,r,b) no mapa de nomes.

## 4. Tipografia (texto é renderizado pelo Phaser, nunca "pintado" na imagem)
- HUD/números: fonte bitmap `__` (de `.ttf` [nome, licença embutível: OFL/Apache]) gerada @2x em `assets/fonts/<nome>.png/.xml`
  (BMFont, Snow BMF ou `msdf-bmfont-xml -f xml`), tamanhos 17 pt → 34 px e 11 pt → 22 px (mínimo HIG).
- Texto dinâmico/localizado: `Text` com `fontFamily: 'system-ui, -apple-system, sans-serif'`, `fontSize ≥ 34px` (@2x).
- Menus longos/consentimentos: DOM sobreposto com `font-size ≥ 17px`; opção "tamanho da UI" nas configurações (não há Dynamic Type na web).

## 5. Ícones
- Estilo: [flat chapado | contorno `__ px` | ilustrado com 2 tons]. Grade: 24/32 pt (48/64 px @2x). Sem gradiente fotográfico.
- Fonte: Recraft V4 Vector (SVG master em `masters/ui/`) rasterizado @2x para o atlas `ui`. Sem SF Symbols (só plataformas Apple).
- Cada ícone = um conceito, silhueta legível a 24 pt (`verificar_legibilidade.py --alvo-px 24`), mesma espessura de traço no conjunto.

## 6. Botões (3 estados obrigatórios + foco opcional)
| Estado | Mudança visual | Frame no atlas |
|---|---|---|
| normal | base | `ui_btn_<nome>_normal` |
| pressionado | escurece 12 %, desloca 2 pt para baixo | `ui_btn_<nome>_pressed` |
| desabilitado | dessaturado, 40 % opacidade | `ui_btn_<nome>_disabled` |
Alvo mínimo de toque: 44×44 pt (HIG "Designing for games": padrão 44, mínimo 28); hit area ≥ 88×88 px @2x.

## 7. Peças separadas (PNG RGBA @2x, fundo transparente, geradas isoladas — nunca "kit completo")
Moldura de painel · slot de inventário · botão primário · botão secundário · botão de ícone · barra (moldura + preenchimento
separados) · caixa de diálogo · toast · badge numérico · seta/indicador · ícone master 1024² (PWA/app).

## 8. Clutter proibido (entra em todo prompt como negativo)
"sem texto, sem letras, sem números, sem marca d'água, sem fundo, sem cena atrás, sem reflexos fotográficos, sem brilhos ou
partículas soltas, sem ornamentos extras, sem múltiplas peças na mesma imagem, sem logos ou marcas, sem personagens de terceiros".

## 9. Prefixo de prompt (copie literalmente no início de cada prompt; ≤ 60 palavras)
```
[Estilo em 1 frase]. Paleta exata: #____, #____, #____, #____, #____. Contorno [espessura/cor ou nenhum].
Sombra [regra]. Luz vinda de [direção]. Cantos [raio]. Peça única, centralizada, isolada, fundo transparente,
vista [frontal/ortográfica]. Estilo de jogo mobile 2D, legível em tela pequena.
```
Negativo (modelos que aceitam): `[cole o item 8]`.

## 10. Tamanhos e exportação (Phaser, @2x)
- Gere em ≥ 2× o tamanho final (1024² para peças até 512 px) e reduza com Lanczos; nunca ampliar. Botão 44 pt = 88 px de altura.
- Sem sufixos @2x/@3x: a escala é a do canvas (`zoom: 1/dpr`). Atlas `ui` separado dos sprites, `--sem-trim`, `scale9Borders` por peça.
- Ícones do PWA: `gerar_icones_pwa.py` → 192/512 (`any` + `maskable`), `apple-touch-icon-180.png`, `favicon-32.png`. Ícone de app
  1024² em camadas (Icon Composer) só com Capacitor.
- Nomes: `ui_<peça>_<variante>_<estado>` · `icn_<conceito>` (SVG master + PNG @2x).

## 11. Mapa de nomes (elemento → frame → nine-slice em px @2x) — copie para `design/ui-mapa-de-nomes.md`
| Elemento | Frame no atlas `ui` | Tamanho pt (px @2x) | Nine-slice (l, t, r, b) px @2x | Contraste | Alvo de toque |
|---|---|---|---|---|---|
| Painel principal | `ui_panel_main` | livre | 48, 48, 48, 48 | — | — |
| Botão primário | `ui_btn_primary_{normal,pressed,disabled}` | 160×48 (320×96) | 40, 40, 40, 40 | texto __:1 | ≥ 44 |
| Slot | `ui_slot_item` | 56×56 (112×112) | — | — | 56 |

Phaser: `this.add.nineslice(x, y, 'ui', 'ui_panel_main', w, h)` (bordas do JSON), `img.setFrame('ui_btn_primary_pressed')`, `this.add.bitmapText(x, y, 'hud', '0', 34)`.

## 12. Aprovação
Contact sheet de todas as peças em `production/evidencias/<data>-ui-style-card/contact-sheet.png`, `acessibilidade.md`
(saída de `verificar_contraste.py`, sem FALHA) e `legibilidade.png` dos ícones; aprovado por [nome] em AAAA-MM-DD;
registrado por asset em `PROVENANCE.md`.
