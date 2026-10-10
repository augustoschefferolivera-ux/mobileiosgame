---
name: empacotar-web-para-app
description: >
  Decide se e como levar um jogo web (Phaser, PixiJS, Three.js, Babylon) à App Store via
  Capacitor (WKWebView) ou mantê-lo como PWA, cobrindo os riscos de revisão 4.2 (funcionalidade
  mínima), 4.7 (HTML5 games), 2.5.2 (código remoto) e 4.3(b), IAP via RevenueCat/StoreKit,
  haptics e performance em WKWebView, com verificação no simulador. Use sempre que alguém pedir
  para "publicar o jogo web na App Store", "transformar em app" ou citar Capacitor/Cordova/
  FlutterFlow/web view. Não use para jogos nativos (engine-spritekit-swiftui) nem para a submissão
  em si (skill de submissão da fase 10).
license: MIT
compatibility: "Claude Code ou Codex; Node.js 20+; macOS com Xcode para o projeto iOS gerado"
metadata:
  grupo: engines
  alvo: [2d, 3d, web, app]
  fase: [2, 10]
argument-hint: "[pasta-do-jogo-web]"
disable-model-invocation: false
user-invocable: true
---

# Empacotar jogo web para a App Store (Capacitor) — ou não

Entrega uma decisão documentada (`production/decisoes/empacotamento.md`) e, se for empacotar, um projeto Capacitor iOS com assets locais, IAP e haptics nativos, verificado no simulador com a mesma receita das skills nativas. A evidência é o screenshot do app (não do navegador) em `production/evidencias/<data>-empacotamento/`.

## Quando usar / quando não usar

- **Use** quando o jogo web já existe, tem conteúdo e progressão próprios, e a meta é distribuição na App Store com IAP; o Capacitor embute o jogo no binário (WKWebView) e expõe plug-ins nativos.
- **Mantenha PWA** quando o público vem por link, não há IAP e o jogo cabe nos limites do Safari: zero revisão, atualizações instantâneas. A Apple não lista PWAs na loja.
- **Não empacote** quando: (a) o app seria só um "site num app" (reprova 4.2: "If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store"); (b) o código do jogo é carregado de um servidor (2.5.2; em março de 2026 a Apple teria barrado atualizações do Replit e do Vibecode citando 2.5.2 — fonte secundária — e depois disse não ter regra específica contra "vibe coding"); (c) o jogo precisa de performance/Game Center/controles nativos — reescreva em SpriteKit/Unity; (d) é variante genérica de algo já comum (4.3(b), spam). O caminho documentado da Rosebud (web view via FlutterFlow) tem exatamente esses riscos.

## Pré-requisitos

- Jogo web passando em `.claude/skills/engine-web-phaser/scripts/verify.sh` (ou o de `engine-web-threejs`) (build limpo, sem erros, fps ok).
- Node 20+; macOS com Xcode; Apple Developer Program (bundle id, Team).
- Capacitor: `npm i @capacitor/core @capacitor/cli @capacitor/ios` **[comandos não lidos nesta pesquisa; confirme em capacitorjs.com/docs]**.
- IAP: RevenueCat (`@revenuecat/purchases-capacitor`) **[confirme]** ou plug-in StoreKit da comunidade; produtos criados em App Store Connect.

## Entradas

- `dist/` do jogo (Vite), brief com modelo de monetização, lista de plug-ins nativos necessários (haptics, status bar, splash, IAP, Game Center?).

## Passos

1. **Decidir** com o checklist de `references/guidelines-app-store.md`; escreva `production/decisoes/empacotamento.md` (opção escolhida, riscos, mitigação). Se a resposta for "PWA" ou "reescrever nativo", pare aqui e registre.
2. **Inicializar Capacitor** (fase 2/10) com `webDir: "dist"`: `npx cap init "Meu Jogo" com.exemplo.meujogo --web-dir dist`, `npx cap add ios`, `npm run build && npx cap sync ios`. Confirme que **todo** o jogo (JS, atlases, áudio) está em `dist/` — nada carregado de URL remota além de serviços (ranking, IAP). `server.url` do `capacitor.config` fica **vazio** em produção.
3. **Tornar "app-like"**: splash e ícone próprios (`@capacitor/splash-screen`), status bar oculta ou integrada, orientação travada no `Info.plist`, `@capacitor/haptics` nos acertos, `@capacitor/app` para pausar no background, Game Center via plug-in se existir — e funcionalidade que o site não tem (progresso local, modo offline, IAP). Reprovas 4.2 vêm de "wrapper sem valor".
4. **WKWebView**: mesmas limitações do Safari (DPR ≤ 2, áudio por gesto, memória); habilite `allowsInlineMediaPlayback`; mantenha `limitsNavigationsToAppBoundDomains` quando usar service worker; não dependa de `localStorage` para progresso (use plug-in `Preferences`/Filesystem). Receitas em `references/guidelines-app-store.md`.
5. **IAP**: bens digitais **só** por IAP da Apple (3.1.1) — nada de Stripe/Apple Pay web dentro do app. RevenueCat Capacitor: configure a API key, `purchasePackage`, `restorePurchases` visível, preços vindos do StoreKit; teste com conta sandbox e StoreKit Testing no Xcode.
6. **Privacidade e metadados**: privacy manifest (`PrivacyInfo.xcprivacy`) com reasons de `UserDefaults`/File timestamp se plug-ins usarem; rótulos de privacidade coerentes (RevenueCat/analytics são "third-party partners"); se houver IA em nuvem, 5.1.2(i): divulgar e pedir permissão antes de enviar dados pessoais.
7. **Verificar** no simulador reutilizando a receita nativa (o Capacitor gera `ios/App/App.xcworkspace`, scheme `App`):

```bash
.claude/skills/engine-spritekit-swiftui/scripts/verify.sh --project ios/App/App.xcworkspace --scheme App --feature empacotamento --simulator "iPhone 17"
```

   Compare `screenshot.png` com o do navegador; confira `app.log` por erros de WKWebView (`Failed to load`, `WebContent process crashed`).
8. **Playtest e revisão interna** (fase 10): `/playtest-automatizado` em dispositivo real (haptics, IAP sandbox); checklist de revisão da Apple antes de enviar; a submissão em si é a skill de submissão.

## Critério de pronto e evidência

- `production/decisoes/empacotamento.md` existe com a decisão e os riscos 4.2/4.7/2.5.2/4.3(b) avaliados.
- Se empacotou: `verify.sh` saiu 0 com `screenshot.png` do app no simulador mostrando o jogo (não tela branca), IAP testado em sandbox (screenshot da compra), haptics confirmados em dispositivo (contador no canal de debug), `app.log` sem crash de WebContent.
- Rodar no navegador não é evidência do app.

## Verificar no simulador/dispositivo

- Simulador: receita acima. Dispositivo: Xcode → Run; `xcrun devicectl device copy from` para puxar o arquivo de progresso; Web Inspector do Safari conecta na WKWebView do app em builds de desenvolvimento.
- TestFlight interno antes da revisão: `/ci-xcode-cloud-fastlane`.

## Armadilhas conhecidas

- **4.2 / 4.3(b)**: wrappers e variantes genéricas são as rejeições mais citadas para apps gerados por IA (fontes secundárias); não há taxa oficial.
- **2.5.2**: carregar o jogo de um CDN/servidor é o risco; empacotar em `dist/` é o caminho. Hot-updates de JS (Capgo etc.) exigem cautela: só correções, nunca mudar funcionalidade (texto da guideline).
- **4.7**: permite "HTML5 and JavaScript mini apps and mini games" não embutidos sob condições (4.7.1–4.7.5, incl. restrição por idade em 4.7.5) — isso é para plataformas de mini-jogos, não para o seu jogo único; não se apoie nela.
- **Tela branca no primeiro launch**: `webDir` errado ou assets com caminho absoluto `/assets` (use `base: './'` no Vite).
- **Áudio**: WKWebView também exige gesto; mantenha a tela "toque para começar".
- **Classificação etária**: questionário obrigatório (faixas 4+/9+/13+/16+/18+); loot boxes = A18 no Brasil; responda honestamente (2.3.6).
- **Licenças**: Capacitor MIT; RevenueCat SDK MIT com serviço pago acima do free tier **[confirme]**; conteúdo gerado por IA segue as skills de arte/áudio.
- **Custo**: Apple Developer Program (anual); RevenueCat cobra percentual acima de certo faturamento **[confirme na página oficial]**; Xcode Cloud 25 h/mês incluídas.

## Fontes

- App Store Review Guidelines (4.2, 4.3(b), 4.7, 2.5.2, 3.1.1, 5.1.2(i), 2.3.6): https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News 13/11/2025 (4.7 esclarecida, 4.7.5, 5.1.2(i)): https://developer.apple.com/news/?id=ey6d8onl
- Rosebud — publicar jogo web em app via FlutterFlow (web view): https://lab.rosebud.ai/blog/publish-mobile-game-with-ai
- Replit/Vibecode e 2.5.2 (março/2026) [secundário]: https://modall.ca/blog/apple-rejecting-vibe-coded-apps
- RevenueCat — "building the app is the actual easy part": https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps
- Classificação etária (valores e Brasil): https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Capacitor docs [não lidos nesta pesquisa; confirme comandos e plug-ins]: https://capacitorjs.com/docs ; RevenueCat Capacitor [confirme]: https://www.revenuecat.com/docs
