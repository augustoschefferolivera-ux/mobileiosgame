# PWA e distribuição web do jogo (Vite 8 + vite-plugin-pwa 2), com os limites do iOS

Substitui o antigo `pwa.md`. Estado deste repositório em 2026-10-10: `vite-plugin-pwa@2.0.0` instalado e configurado em `vite.config.ts`; `npm run build` gera `dist/sw.js`, `dist/workbox-<hash>.js`, `dist/registerSW.js` e injeta `<script src="/registerSW.js">` no `index.html` (precache de 5 entradas, 1.345 KiB); `scripts/verify.sh` passou com o service worker ativo (Chromium, fps 59, sem erros).

## 1. Versões e compatibilidade (confirmadas no npm em 2026-10-10)

- **vite-plugin-pwa 2.0.0** (2026-10-03): `peerDependencies.vite: '^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0'`, `engines.node >= 20.19.0`, depende de `workbox-build`/`workbox-window` ^7.4.1 (MIT). README: "From v2.0.0, vite-plugin-pwa requires Node 20.19.0 or above".
- Vite 8.3.4, Node 22.22.0 neste ambiente.
- Alternativa sem plug-in: service worker manual em `public/sw.js` (install → precache de `index.html` + chunks + atlases; fetch → cache-first para `/assets/`, network-first para `index.html`; activate → apaga caches antigos). Só compensa se você precisar de controle fino; o Workbox já faz isso com `cleanupOutdatedCaches`.

## 2. Configuração adotada (`vite.config.ts`)

```ts
VitePWA({
  registerType: 'autoUpdate',   // SW novo assume e recarrega quando pronto; no iOS standalone só ao reabrir o app
  injectRegister: 'script',     // gera /registerSW.js e injeta no <head>; 'auto' faria o mesmo sem virtual module
  manifest: false,              // mantém public/manifest.webmanifest escrito à mão (evita duplicar)
  workbox: {
    globPatterns: ['**/*.{js,css,html,json,webmanifest,png,webp,jpg,svg,woff2,m4a,mp3,ogg}'], // padrão é só js/css/html
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // padrão 2 MiB; atlas 2048² ou música longa podem passar
    cleanupOutdatedCaches: true,
  },
})
```

Decisões: (a) `autoUpdate` em vez de `prompt` enquanto não houver UI de "nova versão" — quando houver, troque para `registerType: 'prompt'` e use `import { registerSW } from 'virtual:pwa-register'` com `onNeedRefresh()` mostrando um botão "Atualizar" (doc "Prompt for new content"); (b) tudo que a fase 1 precisa entra no precache; fases grandes ficam fora do precache e usam `runtimeCaching` (CacheFirst para `/assets/fases/**`) para não baixar 50 MB na instalação; (c) `maximumFileSizeToCacheInBytes` acompanha o maior asset — se o build avisar que um arquivo foi ignorado, é isso.

Verificação: `npm run build` → `ls dist/sw.js`; `npx vite preview` → DevTools do Chrome → Application → Service Workers/Manifest; Lighthouse "Installable". No iPhone: Safari → Compartilhar → "Adicionar à Tela de Início" → abrir pelo ícone → modo avião → o jogo abre.

## 3. Manifest e `index.html` (requisitos mínimos do vite-pwa + iOS)

`public/manifest.webmanifest` (existente) precisa de: `name`, `short_name`, `description`, `start_url: '/'`, `display: 'standalone'`, `orientation: 'portrait'`, `theme_color` **igual** ao `<meta name="theme-color">`, `background_color`, `icons` 192×192 e 512×512 (o segundo com `purpose: 'any maskable'`). Hoje `icons: []` — gerar ícones é pré-requisito do release (`/ui-hud-e-icones`).

`index.html` precisa de (já tem os três primeiros): `viewport` com `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, mais `<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">`, `<meta name="description">`, `<link rel="icon">`. iOS ignora `display: fullscreen` e usa `standalone`; usa o `apple-touch-icon`, não o `icons` do manifest, para o ícone da tela inicial **[confirmar]**.

CSS que importa: `html, body { height: 100dvh; overflow: hidden; overscroll-behavior: none }`, `#game { touch-action: none; user-select: none; -webkit-touch-callout: none }`, safe areas via `env(safe-area-inset-*)` para HUD que encosta nas bordas (em `standalone` a barra de status fica sobre o canvas com `black-translucent`).

## 4. Limites do iOS que mudam o design (o que não vem de fonte lida está marcado)

| Tema | Comportamento | Fonte |
|---|---|---|
| Áudio | só após gesto; `AudioContext` suspenso em background; Phaser já trata `unlock`, `suspend/resume` | código do Phaser (`WebAudioSoundManager.js`) |
| Altura da viewport | `innerHeight` errado com barras do Safari; Phaser mede `100vh` num `div` | `src/dom/GetInnerHeight.js` |
| Fullscreen API | ausente no iPhone; "tela cheia" = PWA standalone | **[confirmar em webkit.org]** |
| Vibração | `navigator.vibrate` inexistente no Safari; haptics só via Capacitor | **[confirmar]** |
| Armazenamento | `localStorage`/IndexedDB podem ser apagados após dias sem uso (ITP) em sites não instalados | **[confirmar em webkit.org]** |
| Atualização do SW | app standalone só pega SW novo ao ser fechado e reaberto | doc vite-pwa (comportamento geral) + prática **[confirmar no iPhone]** |
| Web Push | só para PWA instalado na tela inicial (iOS 16.4+) | **[confirmar]** |
| Pagamentos | só Apple Pay/Stripe na web; IAP da Apple só em app (3.1.1) | App Store Review Guidelines |
| WebGL2 | disponível no Safari moderno; Phaser 4 aceita canvas WebGL2 | CHANGELOG 4.0 ("WebGL2 canvases are now compatible") |

Consequências: progresso salvo também na nuvem se for importante (ou aviso ao jogador); botão de mute na UI (o botão físico não silencia Web Audio); sem haptics no PWA; "Adicionar à Tela de Início" ensinado na primeira sessão.

## 5. Visibilidade, orientação e telas de carregamento

- `visibilitychange`: o Phaser pausa o loop em `hidden` (`Game#onHidden` → `loop.pause()`, evento `PAUSE`) e retoma em `visible`; sua lógica deve ouvir `this.game.events.on(Phaser.Core.Events.PAUSE/RESUME)` para pausar cronômetros de gameplay e mostrar a tela de pausa ao voltar (o `src/main.ts` também chama `loop.sleep()/wake()`; é redundante, não conflita).
- Orientação: `manifest.orientation: 'portrait'` só vale em standalone; no Safari normal, mostre uma tela "gire o aparelho" ouvindo `this.scale.on('orientationchange')` (`Phaser.Scale.Events.ORIENTATION_CHANGE`); `scale.lockOrientation()` tem suporte limitado.
- Loading: `BootScene` sem assets externos (desenha barra com `Graphics` ou cor), `PreloadScene` com `this.load.on('progress', v => …)` e texto de porcentagem; mostre algo em < 1 s. Dividir por fase: `this.load.pack('fase-2', 'assets/data/fase-2.pack.json')`.
- `vite:preloadError` (Vite): após um deploy, chunks antigos podem sumir; ouça `window.addEventListener('vite:preloadError', () => location.reload())` e sirva `index.html` com `Cache-Control: no-cache` (doc Vite "Load Error Handling").

## 6. Hospedagem

Qualquer estático com HTTPS serve: Cloudflare Pages, Vercel, GitHub Pages (detalhes de deploy e cabeçalhos em `/publicar-jogo-web`, `references/hospedagem-pwa-analytics.md`). Regras: `index.html` e `sw.js` com `Cache-Control: no-cache`; `/assets/*` (com hash) com `max-age=31536000, immutable`; Brotli ligado; `base: '/'` quando o jogo está na raiz do domínio, `base: './'` (como no template oficial) se for subpasta ou Capacitor. Mesmo build serve ao itch.io (zip com `index.html` na raiz; o SW não funciona dentro do iframe do itch — aceitável).

## 7. Checklist de release web

- [ ] `npm run build` sem erro; `dist/sw.js` e `dist/manifest.webmanifest` presentes; `index-*.js` (seu código) em dezenas de KB; `phaser-*.js` com hash igual ao release anterior se a versão não mudou
- [ ] `bash scripts/verify.sh --feature release-x.y` verde com WebKit (Arch) e Chromium
- [ ] Ícones 192/512/180 reais (sem placeholder); `theme_color` igual nos dois lugares; `description` preenchida
- [ ] Lighthouse PWA "Installable" no Chrome; instalação real no iPhone; abre offline; áudio após o 1º toque; sem scroll por baixo do canvas; safe areas respeitadas
- [ ] Cabeçalhos de cache corretos (`curl -I`); HTTPS; `vite:preloadError` tratado
- [ ] Divulgação de IA, política de privacidade e créditos linkados (`/divulgacao-de-uso-de-ia`, `/privacidade-lgpd-e-eca-digital`)

## 8. Capacitor (fase 10, só o essencial — o resto está em `/empacotar-web-para-app`)

- Versões (npm, 2026-10-10): `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` **8.5.3**; `@capacitor/haptics` 8.0.2; `@revenuecat/purchases-capacitor` 13.7.3 (`peerDependencies: @capacitor/core >= 8.0.0`; API: `configure`, `getOfferings`, `purchasePackage`, `restorePurchases`).
- Comandos do README oficial: `npm install @capacitor/core @capacitor/cli && npx cap init`; `npm install @capacitor/ios && npx cap add ios`; `npm run build && npx cap sync ios`. O projeto Xcode gerado compila no macOS remoto (`/build-ios-sem-mac`).
- O jogo roda em WKWebView com as mesmas regras do Safari (gesto para áudio, DPR, memória); `base: './'` no Vite; o Loader do Phaser trata `capacitor://` como esquema local (sem CORS). Service worker dentro do app: desnecessário (assets já estão no bundle) — desligue o plug-in nesse build (`disable: true`) ou condicione por `process.env`.
- Riscos de revisão 4.2 (funcionalidade mínima), 4.7 (mini-games HTML5), 2.5.2 (código remoto) e 4.3(b) (variantes genéricas): avaliados em `/empacotar-web-para-app` antes de prometer App Store; IAP só pela Apple no app (3.1.1).

## Fontes

- vite-plugin-pwa 2.0.0: `npm view vite-plugin-pwa@2.0.0 peerDependencies engines`; README https://github.com/vite-pwa/vite-plugin-pwa ; guias (raw, 2026-10-10): `docs/guide/index.md`, `register-service-worker.md`, `prompt-for-update.md`, `pwa-minimal-requirements.md`, `service-worker-precache.md` em https://github.com/vite-pwa/vite-plugin-pwa/tree/main/docs/guide
- Build deste repositório (2026-10-10): saída do `vite build` ("PWA v2.0.0 mode generateSW precache 5 entries (1345.88 KiB)") e `dist/index.html` com `registerSW.js`
- Vite 8: https://github.com/vitejs/vite/blob/main/docs/guide/build.md (`vite:preloadError`, `codeSplitting`)
- Phaser 4.2.1: `src/core/Game.js` (`onHidden`/`onVisible`), `src/sound/webaudio/WebAudioSoundManager.js`, `src/dom/GetInnerHeight.js`, `src/scale/ScaleManager.js`; skill `loading-assets` (`localSchemes` com `capacitor://`); CHANGELOG 4.0 (WebGL2)
- Capacitor README (comandos): https://github.com/ionic-team/capacitor ; RevenueCat Capacitor README: https://github.com/RevenueCat/purchases-capacitor ; `npm view @capacitor/ios`, `npm view @revenuecat/purchases-capacitor`
- App Store Review Guidelines (3.1.1, 4.2, 4.7, 2.5.2, 4.3(b)): https://developer.apple.com/app-store/review/guidelines/
- Safari/WebKit: comportamentos marcados [confirmar] devem ser validados em https://webkit.org/blog/ e https://developer.apple.com/documentation/safari-release-notes (bloqueados nesta sessão)
