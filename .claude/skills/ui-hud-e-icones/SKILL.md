---
name: ui-hud-e-icones
description: >
  Gera a UI do jogo com IA de forma governada: ícones em SVG com Recraft V4 Vector, arte com texto
  via Ideogram 3 (só quando o texto é arte, ex. logotipo), peças de HUD separadas em PNG transparente
  (moldura, slot, barra, botão em 3 estados) a partir do style card, mapa de nomes para o engine,
  SF Symbols/SwiftUI quando a UI é nativa, tamanhos @1x/@2x/@3x, ícone do app (1024², sem alfa) e
  screenshots de loja, com acessibilidade (contraste 4,5:1, alvo de toque 44 pt). Use sempre que o
  usuário pedir botão, menu, HUD, barra de vida, ícone, inventário, ícone do app ou "telas da loja".
  Não use para sprites de jogo (/gerar-sprites-2d) nem para empacotar atlases (/atlas-e-exportacao-2d-mobile).
license: MIT
compatibility: "Claude Code ou Codex; Xcode (macOS) para asset catalog, Icon Composer e screenshots"
metadata:
  grupo: arte-2d
  alvo: [2d, 3d, app, web]
  fase: [4, 6, 10]
argument-hint: "[peça|icone|hud|icone-do-app|screenshots] [nome]"
disable-model-invocation: false
user-invocable: true
---

# UI, HUD e ícones

Entrega peças de UI em `./assets/ui/` (PNG RGBA @1x/@2x/@3x e/ou SVG), o mapa de nomes `design/ui-mapa-de-nomes.md`, o ícone do app e as screenshots da loja, todos registrados em `PROVENANCE.md`; a evidência é a tela montada no simulador com contraste e alvos de toque verificados.

## Quando usar / quando não usar

- **Use** para HUD (vida, mana, moedas, timer), menus, botões, slots, molduras, toasts, ícones de item/habilidade, ícone do app e screenshots/preview da App Store.
- **Use** para decidir UI nativa (SwiftUI + SF Symbols) × UI desenhada (peças PNG/SVG no engine).
- **Não use** para texto dentro de imagem em UI de jogo (o engine renderiza texto; localização e Dynamic Type), para sprites (`/gerar-sprites-2d`) ou atlases (`/atlas-e-exportacao-2d-mobile`).

## Pré-requisitos

- `design/style-card.md` aprovado (template `templates/style-card-ui.md`), com paleta de UI, raio, traço, estados de botão e clutter proibido.
- Chaves: Recraft (API própria ou OpenRouter `recraft/recraft-v4-vector`) para SVG; `OPENAI_API_KEY` (gpt-image-1.5, alfa nativa) para peças raster; Ideogram só para arte tipográfica (logotipo do jogo).
- Ferramentas: `python3 -m pip install Pillow`; `svgo` (npm, otimizador de SVG) [secundário, confirmar licença]; Xcode para asset catalog/Icon Composer. Scripts reaproveitados: `../gerar-sprites-2d/scripts/contact_sheet.py`, `../gerar-sprites-2d/scripts/nomear_e_registrar.py`, `../gerar-sprites-2d/scripts/remove_bg.py`.
- Orçamento: 10–30 peças × 2–4 variações; SVG via Recraft custa por imagem (preço não capturado — confirme). **Licença de saída**: termos da Recraft/OpenAI/Ideogram não lidos → "confirmar" em `PROVENANCE.md`. SF Symbols só podem ser usados em apps para plataformas Apple [confirmar no acordo da Apple].

## Entradas

1. Lista de telas e elementos (`feature_list.json` + um "HUD design" curto: o que aparece, quando, prioridade — pode usar a seção 7 do `templates/art-bible.md`; o modelo completo de HUD do Claude-Code-Game-Studios é referência de rigor, não requisito).
2. Decisão nativa × desenhada por tela (menus/configurações tendem a nativo; HUD in-game tende a desenhado).
3. Resolução lógica de referência e tamanhos em pt (botão ≥ 44×44 pt; ícone 24/32 pt; texto ≥ 11 pt, ideal 17 pt corpo [HIG; confirmar]).

## Passos

1. **Mapa de nomes primeiro.** Copie a tabela da seção 11 do style card para `design/ui-mapa-de-nomes.md` e liste cada peça: elemento → arquivo (`ui_<peça>_<variante>_<estado>.png`, `icn_<conceito>.svg`) → chave no engine → nine-slice (l,t,r,b) → tamanhos. Esse arquivo é o contrato com a skill de UI do engine (leia `references/mapa-de-nomes.md`).
2. **Ícones em SVG** (Recraft V4 Vector, único mainstream com SVG editável): prompt = prefixo do style card + "single flat icon of <conceito>, centered, <traço>, no text, no background, consistent stroke weight with the set". Gere o conjunto na mesma sessão/estilo; abra os SVGs, remova fundos e grupos vazios (`svgo`), confira que cada ícone tem **uma** cor de acento e lê em 24 pt. Rasterize @1x/@2x/@3x para engines que não leem SVG; no Xcode, importe o SVG no asset catalog com "Preserve Vector Data" [confirmar].
3. **Peças raster** com gpt-image-1.5 (`background: "transparent"`): uma peça por imagem ("single UI element, isolated, centered"), nunca "um kit completo" — kits saem desalinhados. Botões em **3 estados** (normal, pressionado, desabilitado) com a regra do style card; molduras e barras com cantos de tamanho fixo e meio liso para nine-slice; barra = moldura + preenchimento em arquivos separados. Gere @3x (ex.: 132×132 px para 44 pt) e reduza para @2x/@1x com Lanczos.
4. **Texto como arte** (só logotipo/título): Ideogram 3 (raster, ~82% de legibilidade em um benchmark [secundário]); nunca para rótulos de botão, números ou menus — esses são fontes no engine.
5. **UI nativa** (SwiftUI): use `Image(systemName:)` com SF Symbols e `Text` com Dynamic Type; a arte do jogo entra só como fundo/moldura. Leia `references/ios-nativo-e-loja.md` para o que é nativo, ícone do app e screenshots.
6. **Curadoria** com folha de contato sobre a cor de fundo da tela (`contact_sheet.py --fundo "#<fundo do painel>"`) e sobre xadrez; o humano aprova o conjunto inteiro de uma vez (coerência), não peça a peça.
7. **Acessibilidade mensurável**: contraste texto/fundo ≥ 4,5:1 e gráficos ≥ 3:1 (calcule com as cores hex do style card), alvo ≥ 44×44 pt, nenhum estado comunicado só por cor (ícone/forma junto), HUD ≤ ~12% da tela em exploração (orientação do template de HUD do Game Studios). Anote os números em `design/ui-mapa-de-nomes.md`.
8. **Ícone do app**: arte gerada @1024 (gpt-image-1.5 ou GPT Image 2 opaco), sem texto pequeno, sem cantos arredondados (a Apple aplica a máscara), **PNG sem alfa** [confirmar em App Store Connect Help]; no Xcode 26+, monte camadas no Icon Composer para o ícone em vidro [confirmar]. Busca reversa de imagem antes de usar (5.2.1).
9. **Screenshots da loja**: capturas reais do jogo no simulador nos tamanhos exigidos pela App Store Connect (confira as dimensões vigentes lá; 2.3.3 exige que reflitam o app em uso); molduras e textos de marketing opcionais, sem prometer o que o jogo não faz. Salve originais em `production/loja/screenshots/`.
10. **Nomear e registrar** cada arquivo com `nomear_e_registrar.py --categoria ui|icn`; **ver no simulador** e salvar `production/evidencias/<data>-ui-<tela>/no-jogo.png` (tela montada) — a peça só está pronta quando aparece no jogo.

## Critério de pronto e evidência

- [ ] `design/ui-mapa-de-nomes.md` completo (arquivo, chave, nine-slice, tamanhos, contraste, alvo de toque).
- [ ] Todas as peças em `./assets/ui/` com @1x/@2x/@3x (ou SVG + rasterizações), botões com 3 estados, alfa limpo.
- [ ] `production/evidencias/<data>-ui-<tela>/` com contact sheets, `no-jogo.png` e `acessibilidade.md` (contrastes calculados, alvos medidos).
- [ ] Ícone do app 1024×1024 sem alfa e screenshots nos tamanhos exigidos, com busca reversa feita.
- [ ] `PROVENANCE.md` com modelo, prompt e edição humana por peça; licença "confirmar" quando não lida.

## Armadilhas conhecidas

- **Texto gerado na imagem** quebra localização, Dynamic Type e vira "placeholder esquecido" (App Store 2.1(a)); proíba no prefixo.
- **Kits completos em uma imagem** saem desalinhados; peça peças isoladas (padrão "separate transparent PNGs + style card + naming map").
- **Ícones genéricos** (loja, engrenagem, coração iguais a todo jogo) alimentam a leitura 4.3(b); dê um traço do style card a cada um.
- **Marcas/ícones de terceiros** (5.2.1): nunca "estilo iOS/Apple/Nintendo" no prompt; nada de logos reais em screenshots.
- **SF Symbols fora de apps Apple** (versão web) viola o acordo [confirmar]; use os SVGs do Recraft na web.
- **Midjourney para UI**: sem vetor e tipografia "unreliable" — não use para ícones [secundário].
- **Peças @1x ampliadas** ficam borradas: gere sempre @3x e reduza.

## Exportar para mobile

iOS nativo/SpriteKit: asset catalog com `nome.png`, `nome@2x.png`, `nome@3x.png` (ou SVG/PDF com vector data), "Slicing" do catalog para nine-slice, ícone do app via Icon Composer/AppIcon set; Unity: sprites de UI em atlas próprio (skill oficial `manage-sprite-atlas`, UI separada dos sprites de jogo), bordas via `sprite-editor`; Godot: `NinePatchRect`/`StyleBoxTexture` (a tool `theme_manage` do Godot AI aplica `set_stylebox_texture`); Phaser: `NineSlice` (3.60+ [confirmar]) e atlas de UI. Compressão: UI quer nitidez — RGBA32 ou ASTC 4x4 (não 6x6/8x8) para molduras pequenas; ícones vetoriais pesam KB. Orçamento típico de UI: ≤ 1 atlas 2048² por tela. **Licença de saída**: registrar por peça; SF Symbols só em plataformas Apple.

## Fontes

- Recraft V4 Vector = SVG editável — https://openrouter.ai/models/recraft/recraft-v4-vector ; https://www.recraft.ai/blog/recraft-vs-ideogram [secundário]
- Ideogram raster, texto ~82% legível; Midjourney sem vetor — https://rangy.ai/blog/ideogram-vs-recraft-for-logos ; https://framia.converge.ai/blog/midjourney-v8-review/ [secundário]
- Peças separadas + style card + mapa de nomes — https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 ; estilo transferido em conjuntos de ícones — https://morphic.com/resources/images/game-ui-icon-images [secundário]
- gpt-image-1.5 alfa nativa para ícones/botões — https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 [secundário]
- Template de HUD (orçamento visual, contraste 4,5:1, 40 px ícones mínimos) — Claude-Code-Game-Studios `hud-design.md` (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- App Store Review Guidelines (2.1(a), 2.3.3, 4.3(b), 5.2.1) — https://developer.apple.com/app-store/review/guidelines/ ; HIG e App Store Connect Help — https://developer.apple.com/design/human-interface-guidelines/ ; https://developer.apple.com/help/app-store-connect/ [texto vigente a confirmar]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ5).
