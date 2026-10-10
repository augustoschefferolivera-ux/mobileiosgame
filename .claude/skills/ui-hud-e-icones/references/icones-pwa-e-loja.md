# Ícones do jogo web (PWA, apple-touch-icon), ícone de app (Capacitor) e screenshots de loja

## Ícones do PWA e do Safari iOS

| Arquivo | Tamanho | Uso | Fonte |
|---|---|---|---|
| `icon-192.png`, `icon-512.png` | 192², 512² | `manifest.webmanifest` → `icons[]` com `purpose: "any"` | guia de ícones de PWA da MDN |
| `icon-192-maskable.png`, `icon-512-maskable.png` | idem, conteúdo na zona segura (círculo de 80 %), fundo opaco | `purpose: "maskable"` (Android aplica máscaras; sem isso o ícone sai pequeno sobre branco) | MDN |
| `apple-touch-icon-180.png` | 180², opaco, cantos retos (o iOS aplica a máscara) | `<link rel="apple-touch-icon" href=...>`; é o que o Safari usa em "Adicionar à Tela de Início" | prática comum [confirmar na doc da Apple para web apps] |
| `favicon-32.png` | 32² | `<link rel="icon">` | — |

`python3 .claude/skills/ui-hud-e-icones/scripts/gerar_icones_pwa.py design/icone_master_1024.png --fundo "#<cor do jogo>" --saida public/icons` gera todos e imprime o trecho do manifest e as tags. O master 1024² é gerado com `/gerar-sprites-2d` (prompt em `prompts-por-tipo-de-asset.md`) e recebe paintover humano: é a imagem mais vista do jogo. Busca reversa antes de usar.

## Ícone de app (só se o jogo for empacotado com Capacitor para a App Store)

HIG "App icons" (lida em 2026-10-10): iOS/iPadOS/macOS usam layout **1024×1024 px quadrado**, o sistema aplica a
máscara de cantos arredondados; ícones são **em camadas** (fundo + 1 ou mais camadas de frente) montadas no
**Icon Composer** (ferramenta do Xcode), com aparências default, dark, clear light/dark, tinted light/dark. Prepare
as camadas como PNGs separados com alfa (`/gerar-sprites-2d`), fundo opaco. A doc do Xcode "Creating your app icon
using Icon Composer" pede texto convertido em contorno (SVG não preserva fontes). Um relato de fórum (jul/2025)
cita rejeição por falta de PNG 120×120 legado — mantenha também o conjunto PNG clássico [confirmar]. Isso é tarefa
de `/empacotar-web-para-app`; aqui só produzimos a arte.

## Screenshots de loja

- **Capturas reais do jogo** (App Store Review Guidelines 2.3.3: screenshots mostram o app em uso). Nunca arte-conceito.
- Web/PWA e itch.io: capture no Playwright (`scripts/verify.sh` já gera `screenshot.png` em viewport de iPhone) e no
  iPhone real; itch.io aceita imagens de capa/screenshots em proporções livres [tamanhos recomendados: confirmar em itch.io].
- **App Store Connect — "Screenshot specifications" (lida em 2026-10-10)**: obrigatório pelo menos 1 screenshot
  para **iPhone com Dynamic Island (display médio)**: 1179×2556 ou 1206×2622 px (retrato); opcional display grande:
  1260×2736, 1290×2796 ou 1320×2868; **sem alfa/transparência**; JPEG ou PNG; App Store Connect reduz para os
  tamanhos menores se você só enviar o maior. iPad 13" (2064×2752 ou 2048×2732) só se o app suportar iPad.
- Molduras e legendas de marketing são opcionais; texto curto, localizado, sem prometer o que o jogo não faz.
- Guarde originais em `production/loja/screenshots/<locale>/` (pasta da skill de submissão).

## Checklist antes de publicar

- [ ] `public/icons/` completo; manifest com `any` + `maskable`; `apple-touch-icon` no `index.html`; Lighthouse "Installable" ok.
- [ ] Ícone master com busca reversa feita e registrado em `PROVENANCE.md` (`--categoria icn --nome app_icon`).
- [ ] Screenshots reais por idioma; sem placeholders, sem nomes de modelo de IA visíveis; sem logos de terceiros.
- [ ] Contrastes e alvos anotados em `design/ui-mapa-de-nomes.md` (saída de `verificar_contraste.py`).
