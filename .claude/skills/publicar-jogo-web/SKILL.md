---
name: publicar-jogo-web
description: >
  Publica a versão web de um jogo feito com IA (HTML5/WebGL de Godot, Unity, Phaser ou
  PixiJS) em hospedagem estática (Cloudflare Pages, Vercel, GitHub Pages) como PWA
  instalável, no itch.io com as tags "AI Generated" obrigatórias, em portais (Poki,
  CrazyGames, Newgrounds) e, se houver versão desktop, na Steam com a divulgação de IA
  do content survey; cobre analytics leve com LGPD e monetização web (anúncios de
  portal, Stripe) em contraste com a App Store. Use quando o usuário disser "colocar
  online", "link para testar", "itch.io", "PWA", "jogar no navegador", "Steam" ou
  "página do jogo". Não use para a App Store (submissao-app-store) nem para escrever
  o texto de divulgação de IA em si (divulgacao-de-uso-de-ia).
license: MIT
compatibility: "Claude Code ou Codex; Node 18+ para ferramentas de deploy; export web da engine escolhida"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, web]
  fase: [3, 10]
argument-hint: "[destino: estatico|itch|portal|steam] [--pwa]"
disable-model-invocation: false
user-invocable: true
---

# Publicar jogo na web

Entrega uma URL pública (HTTPS) do jogo rodando no navegador de um iPhone real, com PWA instalável quando pedido, página do itch.io com tags corretas e evidências em `production/evidencias/<data>-web/`.

## Quando usar / quando não usar

Use (a) na fase 3 para distribuir builds de teste por link antes de ter TestFlight; (b) na fase 10 para a versão web pública, itch.io, portais e Steam. Use também quando a estratégia for "web primeiro, App Store depois" (todos os casos de tração de jogos vibe coded em 2025–2026 foram web/HTML5: fly.pieter.com, demos Three.js).

Não use para: submissão à App Store (`/submissao-app-store`); redigir a divulgação de IA (`/divulgacao-de-uso-de-ia`, esta skill só diz onde colocar); hospedar backend multiplayer (fora do escopo deste banco).

## Pré-requisitos

- Export web da engine: Godot 4.x (template Web; renderer Compatibility para alcance em iOS; threads exigem cabeçalhos COOP/COEP no servidor [docs do Godot não lidas nesta pesquisa; confirmar em docs.godotengine.org "Exporting for the Web"]); Unity 6 (invoque a skill oficial `optimize-web` do unity-agent-plugin para o build WebGL); Phaser/PixiJS (bundle estático).
- Conta no provedor estático escolhido (Cloudflare Pages, Vercel ou GitHub Pages). Limites dos planos gratuitos mudam: verifique na página de preços de cada um [não lidas nesta pesquisa].
- Conta itch.io; conta Steamworks (taxa de inscrição) só se houver versão desktop.
- Textos prontos de `/divulgacao-de-uso-de-ia` e `/privacidade-lgpd-e-eca-digital` (política de privacidade em pt-BR).

## Entradas

- Build web exportado em `build/web/` (index.html, wasm, pck/data, assets).
- `design/brief.md` (público, países) e `LICENCAS.md` (tudo que vai para a página).
- Lista do que foi gerado por IA, por categoria (gráficos, som, texto/diálogo, código) para as tags do itch.io.

## Passos

1. **Preparar o build**: exportar para `build/web/`; conferir tamanho total (jogos web pesados abandonam no celular); testar localmente com servidor HTTP (não `file://`). Para Godot com threads, configurar no host os cabeçalhos `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` (arquivo `_headers` no Cloudflare Pages / `vercel.json` na Vercel; GitHub Pages não permite cabeçalhos customizados [confirmar]).
2. **Hospedar** (passos por provedor em `references/hospedagem-pwa-analytics.md`): deploy via CLI ou integração Git; HTTPS ativo; domínio próprio opcional. Gravar URL em `production/releases/web.md`.
3. **PWA** (`--pwa`): adicionar `manifest.webmanifest` (nome, ícones 192/512, `display: standalone`, `orientation`), service worker com cache dos assets versionados, `<meta name="apple-mobile-web-app-capable">` e ícone `apple-touch-icon`. Testar "Adicionar à Tela de Início" no Safari do iPhone. Um PWA fora da App Store não paga comissão, mas não aparece na loja nem usa StoreKit.
4. **itch.io**: criar projeto HTML5, enviar o zip com `index.html` na raiz, marcar viewport mobile. **Responder o campo "Generative AI Disclosure"**: "sim" aplica a tag "AI Generated" com subtags Graphics, Sound, Text & Dialog, Code; "não" aplica "No AI". Assets de IA não marcados (mesmo editados depois) saem das páginas de browse. Algoritmos autocontidos (pathfinding, geração procedural clássica) não exigem tag. Colar o texto de divulgação específico na descrição.
5. **Portais (Poki, CrazyGames, Newgrounds)**: cada um tem SDK próprio (anúncios, save, pausa) e processo de curadoria. As políticas sobre conteúdo gerado por IA de cada portal **não foram verificadas** neste banco; leia a página de submissão de cada um antes de enviar e declare a IA onde houver campo. Detalhes conhecidos em `references/portais-e-lojas.md`.
6. **Steam (se houver build desktop)**: no content survey, preencher a divulgação de IA com texto específico (o que foi gerado, o que foi revisado por humano; divulgação separada para IA ao vivo). Regra estreitada em 16/01/2026: isenta ferramentas de código (ex.: Copilot) e arte conceitual não embarcada [secundário]. Contexto: 30,8% dos lançamentos de 2026 (até julho) declaram IA; jogos comparáveis com divulgação têm ~52,6% menos reviews e nota 84,6% vs 88,3% (correlação, não causalidade) [secundário].
7. **Analytics e LGPD**: preferir métrica sem cookies e sem identificador persistente (contagem de sessões, nível alcançado, FPS médio) enviada ao seu endpoint ou a um serviço que não rastreie entre sites. Se usar cookies não essenciais ou SDK de anúncio, exibir aviso e política de privacidade; não coletar dados de menores sem base legal (`/privacidade-lgpd-e-eca-digital`).
8. **Monetização web** (comparativo em `references/portais-e-lojas.md`): anúncios via SDK do portal (receita compartilhada) ou rede própria; venda direta via Stripe só na web; no app iOS, bens digitais passam pelo IAP da Apple (seção 3.1 das Guidelines). Unity IAP v5.4+ tem D2C via Stripe/Coda (skill oficial `implement-in-app-purchases`).
9. **Testar no iPhone real**: Safari e Chrome iOS; retrato e paisagem; toque, áudio após primeiro gesto (autoplay bloqueado), tela cheia, PWA instalado. Gravar `web-iphone.mov` e Lighthouse/Performance do Safari se possível.
10. **Registrar**: `production/releases/web.md` (URLs, data, versão), `LICENCAS.md` (SDKs de portal/analytics), `feature_list.json`.

## Verificar no simulador/dispositivo

- Safari no iPhone real: jogo carrega em < 10 s em 4G, toque responde, áudio toca após o primeiro toque, sem scroll da página por baixo do canvas.
- PWA: ícone na tela inicial, abre em `standalone`, funciona offline no segundo acesso.
- itch.io: a página mostra a tag "AI Generated" com as subtags corretas.

## Critério de pronto e evidência

Pronto quando `production/evidencias/<data>-web/` contiver: `url.txt`, `web-iphone.mov` (ou screenshots), `pwa-instalado.png` (se `--pwa`), `itch-tags.png` (se itch.io), `steam-survey.png` (se Steam), `headers.txt` (saída de `curl -I` mostrando HTTPS e COOP/COEP quando aplicável). Um deploy que só abre no desktop não está pronto: a evidência é no iPhone.

## Armadilhas conhecidas

- **Assets de IA sem tag no itch.io** perdem indexação (política desde nov/2024). Fontes divergem se a regra cobre jogos ou só assets; marque sempre.
- **Divulgação vaga na Steam** (Call of Duty: "help develop some in game assets") gerou backlash; Embark e 11 bit, que explicaram e corrigiram, saíram menos arranhadas.
- **Capsule art gerada sem retoque** é lida como "low-effort churn" (PC Gamer, 2026) e piora a descoberta.
- **Wrapper web na App Store**: 4.2 ("app-like") e 4.7 (mini games HTML5/JS) — publicar o PWA não substitui a submissão nativa.
- **Áudio no iOS Safari** só inicia após gesto do usuário; implemente tela "toque para começar".
- **Godot web**: fixe a versão do engine e o renderer; threads exigem COOP/COEP; sem isso o jogo não abre no Safari [confirmar nas docs].
- **Políticas de IA dos portais** não verificadas: trate como risco de rejeição e pergunte antes de investir na integração do SDK.
- **Receita web**: fly.pieter.com teve maior parte da receita em anúncios segundo uma cobertura [secundário], mas caiu de US$ 1 M ARR declarado para US$ 144 K ARR em dois meses.
- **Licença de saída**: a página do itch.io e a Steam exigem que você tenha direitos sobre tudo; consulte `LICENCAS.md` (Hunyuan3D/HY-World não podem ter saídas distribuídas na UE/UK/Coreia).

## Fontes

- itch.io, divulgação de IA generativa: https://itch.io/post/16187566 ; https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/ ; https://www.pcgamesinsider.biz/news/74828/devs-need-to-disclose-if-game-uses-genai-on-itchio/ [secundário]
- Steam, regra estreitada 16/01/2026: https://hitmarker.net/news/valve-has-relaxed-its-rules-for-disclosing-generative-ai-use-in-steam-games-1623888 [secundário]; content survey oficial: https://partner.steamgames.com/doc/gettingstarted/contentsurvey [host bloqueado]
- Steam, 30,8% dos lançamentos de 2026: https://games.gg/news/steam-ai-disclosure-games-2028-trend/ [secundário]
- Penalidade de reviews (~52,6%; 84,6% vs 88,3%): https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/ [secundário]
- Call of Duty disclosure vaga: https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7 [secundário]
- Capsule art: https://pcgamer.com/gaming-industry/steam-week-in-review-spammy-ai-generated-capsule-art-is-a-pox-and-it-makes-browsing-steam-less-fun/ [secundário]
- fly.pieter.com: https://levels.io/full-multiplayer-python-websockets-game-ai ; https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9 ; https://www.xatakamovil.com/futuro/este-juego-ridiculamente-simple-le-esta-dando-a-su-creador-50-000-dolares-al-mes-se-hizo-ia-30-minutos [secundário]
- App Store Review Guidelines (4.2, 4.7, 3.1): https://developer.apple.com/app-store/review/guidelines/
- Unity Agent Plugin (skills `optimize-web`, `implement-in-app-purchases`): https://github.com/Unity-Technologies/unity-agent-plugin
- Godot export iOS/Web (classe de export): https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
