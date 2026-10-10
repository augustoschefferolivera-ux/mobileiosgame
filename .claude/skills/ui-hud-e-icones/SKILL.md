---
name: ui-hud-e-icones
description: >
  Gera a UI do jogo Phaser 4 web mobile com IA de forma governada: ícones em SVG com Recraft V4 Vector
  (rasterizados @2x para o atlas), peças de HUD separadas em PNG transparente (moldura, slot, barra, botão
  em 3 estados) com cantos fixos para NineSlice, texto sempre renderizado pelo Phaser (BitmapText @2x ou
  fontes do sistema), mapa de nomes com nine-slice/contraste/alvo de toque, safe areas do iPhone em retrato,
  ícones do PWA (192/512/maskable/apple-touch-icon 180), ícone de app 1024 em camadas se houver Capacitor e
  screenshots de loja nos tamanhos vigentes. Use sempre que o usuário pedir botão, menu, HUD, barra de vida,
  ícone, inventário, ícone do app/PWA, "safe area" ou "telas da loja". Não use para sprites de jogo
  (/gerar-sprites-2d) nem para empacotar atlases (/atlas-e-exportacao-2d-mobile).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; Node para svgo e msdf-bmfont-xml opcionais"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [4, 6, 10]
argument-hint: "[peça|icone|hud|icone-pwa|screenshots] [nome]"
disable-model-invocation: false
user-invocable: true
---

# UI, HUD e ícones

Entrega peças de UI @2x em `./assets/ui/` (PNG RGBA e SVG masters), o mapa de nomes `design/ui-mapa-de-nomes.md` com contraste e alvos medidos, os ícones do PWA em `public/icons/` e as screenshots da loja, todos registrados em `PROVENANCE.md`; a evidência é a tela montada no `bash scripts/verify.sh` (raiz do projeto) (viewport de iPhone) com `acessibilidade.md` (saída de `verificar_contraste.py`).

## Quando usar / quando não usar

- **Use** para HUD (vida, mana, moedas, timer), menus, botões, slots, molduras, toasts, ícones de item/habilidade, ícones do PWA, ícone de app e screenshots/preview de loja.
- **Use** para decidir UI em Phaser (objetos de jogo, `BitmapText`, `NineSlice`) × DOM sobreposto (menus longos, formulários, consentimentos — HTML/CSS com `env(safe-area-inset-*)`).
- **Não use** para texto dentro de imagem (o Phaser renderiza texto: localização e tamanho mínimo), para sprites (`/gerar-sprites-2d`) ou atlases (`/atlas-e-exportacao-2d-mobile`).

## Pré-requisitos

- `design/style-card.md` aprovado (template `templates/style-card-ui.md`): paleta de UI com contrastes, raio, traço, estados de botão, fonte do HUD, clutter proibido.
- Chaves: Recraft (API própria ou OpenRouter `recraft/recraft-v4-vector`, ≈ US$ 0,08/imagem [secundário]) para SVG; `OPENAI_API_KEY` (gpt-image-1.5, alfa nativa, ≈ US$ 0,034 em `medium`) para peças raster; Ideogram 3 (US$ 0,06–0,09 [confirmar]) só para arte tipográfica (logotipo).
- Ferramentas: `python3 -m pip install Pillow`; `npx svgo` (MIT) para limpar SVG; fontes bitmap com BMFont (Windows), Snow BMF (web) ou `npx msdf-bmfont-xml -f xml` (gera `.fnt` XML AngelCode; **o Phaser 4 não tem renderizador MSDF embutido** — use o campo de distância só com shader próprio; para HUD, exporte bitmap comum @2x). Scripts: `scripts/verificar_contraste.py`, `scripts/gerar_icones_pwa.py`, `../gerar-sprites-2d/scripts/{contact_sheet,nomear_e_registrar,remove_bg}.py`.
- Orçamento: 10–30 peças × 2–4 candidatos ≈ US$ 2–8; ícones 15–30 × US$ 0,08. **Licença de saída**: Recraft/OpenAI/Ideogram classe B, termos não lidos → "[confirmar]"; fontes do HUD precisam de licença que permita embutir (OFL/Apache: ok).

## Entradas

1. Lista de telas e elementos (`feature_list.json` + "HUD design" curto: o que aparece, quando, prioridade; HUD ≤ ~12 % da tela em exploração — orientação do template de HUD do Game Studios).
2. Decisão Phaser × DOM por tela.
3. Resolução lógica 390×844 pt, assets @2x; safe areas (topo Dynamic Island/notch, base ~34 pt) lidas de `env(safe-area-inset-*)` no boot [valores por aparelho: confirmar com screenshot no iPhone]; botão ≥ 44×44 pt (padrão HIG; mínimo 28), texto padrão 17 pt, mínimo 11 pt (HIG "Designing for games").

## Passos

1. **Mapa de nomes primeiro.** Copie a tabela da seção 11 do style card para `design/ui-mapa-de-nomes.md` (modelo em `references/mapa-de-nomes.md`): elemento → frame no atlas (`ui_<peça>_<variante>_<estado>`) → tamanho pt/px @2x → nine-slice (l,t,r,b em px @2x) → contraste → alvo. É o contrato com o código.
2. **Ícones em SVG** (Recraft V4 Vector): prompt = prefixo do style card + "single flat icon of <conceito>, centered, <traço>, one accent color <#hex>, no text, no background, consistent stroke weight with the set"; gere o conjunto na mesma sessão. `npx svgo` (remove fundos, grupos vazios); masters em `masters/ui/icn_<conceito>.svg`; rasterize @2x (48/64 px) com `python3 -c` + `cairosvg` ou `rsvg-convert` se instalados [opcional], ou deixe o Phaser rasterizar (`this.load.svg(key, url, { scale: 2 })`) só em protótipo — no build final, PNG no atlas (1 draw call).
3. **Peças raster** com gpt-image-1.5 (`background: "transparent"`): uma peça por imagem ("single UI element, isolated, centered"), nunca kit completo. Botões em **3 estados** (normal, pressionado, desabilitado) pela regra do style card; molduras/barras com cantos de tamanho fixo e meio liso (nine-slice); barra = moldura + preenchimento separados. Gere 1024² e reduza para o tamanho @2x (botão 44 pt = 88 px de altura).
4. **Texto como arte** (só logotipo/título): Ideogram 3 ou gpt-image-1.5; nunca para rótulos, números, menus — esses são `BitmapText` (fonte @2x gerada do `.ttf` com licença embutível) ou `Text` com `fontFamily: 'system-ui, -apple-system'`.
5. **DOM sobreposto** para menus/consentimentos: HTML com `padding: env(safe-area-inset-*)`, `font-size ≥ 17px`, botões ≥ 44 px; a arte do jogo entra como fundo/moldura PNG.
6. **Curadoria** com folha de contato sobre a cor do painel (`contact_sheet.py --fundo "#<fundo do painel>"`) e sobre xadrez; `verificar_legibilidade.py --fundo <painel> --alvo-px 24` nos ícones; o humano aprova o conjunto inteiro de uma vez (coerência).
7. **Acessibilidade mensurável**:
   ```bash
   python3 .claude/skills/ui-hud-e-icones/scripts/verificar_contraste.py --style-card design/style-card.md --texto "#<texto>,#<painel>" --grafico "#<perigo>,#<painel>" --toque 160x48 --toque 48x48 > production/evidencias/<data>-ui-<tela>/acessibilidade.md
   ```
   Texto ≥ 4,5:1, gráficos ≥ 3:1, toque ≥ 44 pt, nenhum estado só por cor, versão estática para `prefers-reduced-motion`. Anote no mapa de nomes.
8. **Ícones do PWA / Safari**: master 1024² (`/gerar-sprites-2d`, prompt de ícone) com paintover humano →
   ```bash
   python3 .claude/skills/ui-hud-e-icones/scripts/gerar_icones_pwa.py design/icone_master_1024.png --fundo "#<cor do jogo>" --saida public/icons
   ```
   gera 192/512 (`any` + `maskable`), `apple-touch-icon-180.png`, `favicon-32.png` e imprime manifest + `<link>`. Busca reversa de imagem antes de usar. Ícone de app em camadas (Icon Composer) só se houver Capacitor (`references/icones-pwa-e-loja.md`).
9. **Screenshots de loja**: capturas reais (Playwright/iPhone), sem alfa; App Store Connect exige pelo menos 1 para iPhone com Dynamic Island (display médio): 1179×2556 ou 1206×2622; itch.io/PWA sem tamanho fixo [confirmar]. Detalhes em `references/icones-pwa-e-loja.md`.
10. **Nomear, empacotar e ver no jogo**: `nomear_e_registrar.py --categoria ui|icn`; atlas de UI separado (`empacotar_atlas.py assets/ui --nome ui --sem-trim --nineslice ui_panel_main=48,48,48,48 ...`); `this.add.nineslice(...)`, `this.add.bitmapText(...)`; `bash scripts/verify.sh --feature <id>` → `production/evidencias/<data>-ui-<tela>/no-jogo.png`.

## Critério de pronto e evidência

- [ ] `design/ui-mapa-de-nomes.md` completo (frame, tamanho pt/px, nine-slice, contraste, alvo de toque) e coerente com o atlas `ui`.
- [ ] Peças @2x em `./assets/ui/` (SVG masters em `masters/ui/`), botões com 3 estados, alfa limpo; fonte bitmap do HUD com licença registrada.
- [ ] `production/evidencias/<data>-ui-<tela>/` com contact sheets, `legibilidade.png` dos ícones, `acessibilidade.md` (sem FALHA) e `no-jogo.png` em viewport de iPhone com safe areas respeitadas.
- [ ] `public/icons/` completo e manifest atualizado; screenshots reais nos tamanhos exigidos, sem alfa.
- [ ] `PROVENANCE.md` com modelo, prompt e edição humana por peça; licença "[confirmar]" quando não lida.

## Armadilhas conhecidas

- **Texto gerado na imagem** quebra localização e vira placeholder esquecido; proíba no prefixo.
- **Kits completos em uma imagem** saem desalinhados; peça peças isoladas.
- **NineSlice com frame aparado**: o Phaser não suporta trim em NineSlice; empacote UI com `--sem-trim` e sem rotação.
- **`Text` redesenhado por frame** derruba o FPS no iPhone; HUD em `BitmapText` (fonte @2x; mipmaps desligados por padrão → gere no tamanho exato de uso).
- **Safe area ignorada**: HUD sob a Dynamic Island ou a barra do Safari; teste em `verify.sh` e no iPhone real (`viewport-fit=cover`).
- **Ícones genéricos** (loja, engrenagem, coração iguais a todo jogo) alimentam a leitura "genérico"; dê um traço do style card a cada um.
- **Marcas/ícones de terceiros**: nunca "estilo iOS/Apple/Nintendo" no prompt; nada de logos reais em screenshots; SF Symbols não se usam na web (acordo da Apple restringe a plataformas Apple [confirmar]).
- **Midjourney para UI**: sem vetor e tipografia "unreliable" [secundário].
- **Ícone maskable sem zona segura**: cortado no Android; `gerar_icones_pwa.py` já reduz para 80 % com fundo opaco.

## Exportar para Phaser (web mobile)

Atlas `ui` próprio (`empacotar_atlas.py assets/ui --nome ui --saida public/assets/atlas --sem-trim --nineslice ...`, ≤ 2048², `otimizar_imagens.py --webp`); `this.load.atlas('ui', ...)`; `this.add.nineslice(x, y, 'ui', 'ui_panel_main', w, h)` (bordas vêm de `scale9Borders`); estados de botão por `setFrame`; `this.load.bitmapFont('hud', 'hud.png', 'hud.xml')` + `bitmapText(..., 34)` para 17 pt; HUD posicionado a partir de `this.scale` e das safe areas; ícones PNG @2x no atlas (SVG só como master). PWA: `public/icons/*` + manifest (`any` e `maskable`) + `apple-touch-icon`. Orçamento típico: 1 atlas de UI ≤ 1024² por tela (4 MB RGBA8). **Licença de saída**: por peça em `PROVENANCE.md`; fontes com licença embutível.

## Fontes

- Phaser 4: `NineSlice.js` (layout 9/3-slice, `scale9Borders` do atlas, sem trim, `tileX/tileY`), `BitmapText.js`/`BitmapFontFile.js` (BMFont/Snow BMF/Glyph Designer/Littera, XML), `SVGFile.js` (`scale`), `Config.js` — https://github.com/phaserjs/phaser (fonte, 2026-10-10)
- HIG "Designing for games" (botão 44×44 pt padrão/28 mínimo; texto 17/11 pt), "App icons" (1024², camadas, Icon Composer), "Images" (@2x/@3x, PNG, PDF/SVG) — https://developer.apple.com/design/human-interface-guidelines/ (JSON lido em 2026-10-10)
- App Store Connect "Screenshot specifications" (1179×2556/1206×2622 obrigatório; sem alfa) — https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications (lida em 2026-10-10)
- Ícones de PWA (192/512, `maskable`, zona segura) — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons (fonte MDN lida em 2026-10-10)
- Recraft V4 Vector (SVG) e preço — https://openrouter.ai/recraft/recraft-v4-vector [secundário]; Ideogram API pricing — https://ideogram.ai/features/api-pricing [via busca, confirmar]
- msdf-bmfont-xml (gera BMFont XML/JSON de `.ttf`) — https://github.com/soimy/msdf-bmfont-xml
- Peças separadas + style card + mapa de nomes — https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 [secundário]; template de HUD (orçamento visual, contraste) — Claude-Code-Game-Studios (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- App Store Review Guidelines (2.1(a), 2.3.3, 5.2.1) — https://developer.apple.com/app-store/review/guidelines/
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ5); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
