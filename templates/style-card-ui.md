# Style Card — [Título do jogo] (1 página; vira prefixo de todo prompt de imagem)

> **Derivado de**: `design/art-bible.md` (seções 1, 2, 4, 5, 7, 10, 11) · **Status**: Rascunho | Aprovado AAAA-MM-DD por [nome]
> **Regra**: nenhum prompt de sprite, UI, ícone, tile ou cenário sai sem o bloco "Prefixo de prompt" abaixo.
> Mudou o style card? Regenere o teste de consistência (3 assets aleatórios) antes de seguir.
> Padrão de "style card + peças separadas + mapa de nomes" inspirado em guias de produção de HUD com IA (ver fontes em `/ui-hud-e-icones`).

## 1. Identidade em uma frase
[A definir — copie a seção 1 da art bible, encurtada para ≤ 20 palavras]

## 2. Paleta de UI (hex) — pode divergir da paleta do mundo; registre a divergência

| Papel | Hex | Contraste sobre fundo de painel | Observação |
|---|---|---|---|
| Fundo de painel | `#` | — | opacidade máx. 65% sobre o jogo |
| Borda / moldura | `#` | — | |
| Texto primário | `#` | ≥ 4,5:1 | |
| Texto secundário | `#` | ≥ 4,5:1 | |
| Acento (botão primário) | `#` | ≥ 3:1 (elemento gráfico) | |
| Perigo | `#` | ≥ 3:1 | nunca só cor: ícone/forma junto |
| Sucesso / recompensa | `#` | ≥ 3:1 | |
| Desabilitado | `#` | — | 40% de opacidade do acento |

## 3. Forma
- Raio de canto: `__ pt` (@1x) em painéis; `__ pt` em botões; slots quadrados com raio `__`.
- Traço/contorno: `__ px` @3x; cor `#`; interno/externo.
- Sombra: [nenhuma | dura deslocada (x, y) | suave] — a mesma em todas as peças.
- Grade: múltiplos de 8 pt; margens internas `__ pt`.
- Nine-slice: molduras e botões são gerados com cantos de `__ px` e meio "esticável" liso.

## 4. Tipografia (texto é renderizado pelo engine, nunca "pintado" na imagem — localização)
- Fonte de títulos: [nome, licença] · Fonte de corpo: [nome, licença] · Fallback nativo: SF Pro (iOS).
- Tamanhos mínimos: corpo `__ pt`, HUD `__ pt`, legenda `__ pt`. Respeita Dynamic Type quando a UI é nativa.

## 5. Ícones
- Estilo: [flat chapado | contorno `__ px` | ilustrado com 2 tons]. Grade: `24`/`32` px @1x. Sem gradiente fotográfico.
- Fonte: Recraft V4 Vector (SVG) para o conjunto do jogo; SF Symbols apenas em UI nativa (SwiftUI) e só dentro de apps Apple.
- Cada ícone = um conceito, silhueta legível em 24 pt, mesma espessura de traço em todo o conjunto.

## 6. Botões (3 estados obrigatórios + foco opcional)
| Estado | Mudança visual | Arquivo |
|---|---|---|
| normal | base | `ui_btn_<nome>_normal.png` |
| pressionado | escurece 12%, desloca 2 pt para baixo | `ui_btn_<nome>_pressed.png` |
| desabilitado | dessaturado, 40% opacidade | `ui_btn_<nome>_disabled.png` |
Alvo mínimo de toque: 44×44 pt (HIG da Apple; confirme a versão vigente).

## 7. Peças separadas (PNG RGBA, fundo transparente, geradas isoladas)
Moldura de painel · slot de inventário · botão primário · botão secundário · botão de ícone · barra (moldura + preenchimento separados) · caixa de diálogo · toast · badge numérico · seta/indicador.

## 8. Clutter proibido (entra em todo prompt como negativo)
"sem texto, sem letras, sem números, sem marca d'água, sem fundo, sem cena atrás, sem reflexos fotográficos,
sem partículas soltas, sem ornamentos extras, sem múltiplas peças na mesma imagem, sem logos ou marcas, sem personagens de terceiros".

## 9. Prefixo de prompt (copie literalmente no início de cada prompt; ≤ 60 palavras)
```
[Estilo em 1 frase]. Paleta exata: #____, #____, #____, #____, #____. Contorno [espessura/cor ou nenhum].
Sombra [regra]. Luz vinda de [direção]. Cantos [raio]. Peça única, centralizada, isolada, fundo transparente,
vista [frontal/ortográfica]. Estilo de jogo mobile 2D, legível em tela pequena.
```
Negativo (modelos que aceitam): `[cole o item 8]`.

## 10. Tamanhos e exportação
- Gere em @3x (ex.: botão 132×132 px para 44 pt) e derive @2x e @1x por redução Lanczos (nunca ampliar).
- Ícone do app: 1024×1024 px, PNG **sem alfa**, sem cantos arredondados (a Apple aplica a máscara) — confirme em App Store Connect Help.
- Nomes: `ui_<peça>_<variante>_<estado>.png` · ícones `icn_<conceito>.svg` + PNG @1x/@2x/@3x.

## 11. Mapa de nomes (elemento → arquivo → chave no engine)
| Elemento | Arquivo | Chave/asset no engine | Nine-slice (l, t, r, b) |
|---|---|---|---|
| Painel principal | `ui_panel_main.png` | `ui_panel_main` | 24, 24, 24, 24 |
| Botão primário | `ui_btn_primary_{normal,pressed,disabled}.png` | `ui_btn_primary` | 20, 20, 20, 20 |
| Slot | `ui_slot_item.png` | `ui_slot_item` | — |

## 12. Aprovação
Contact sheet de todas as peças em `production/evidencias/<data>-ui-style-card/contact-sheet.png`; aprovado por [nome] em AAAA-MM-DD; registrado por asset em `PROVENANCE.md`.
