---
name: engine-web-phaser
description: >
  Monta e verifica um jogo web 2D para iPhone com Phaser (ou PixiJS) + TypeScript + Vite:
  input por toque, devicePixelRatio, desbloqueio de áudio no Safari iOS, PWA offline, atlases
  e performance em Safari mobile; verificação com Playwright em viewport de iPhone
  (scripts/verify.sh sobe 'vite preview' e roda o playtest). Use sempre que o jogo for 2D para
  navegador/PWA ou um protótipo web que depois vai para a App Store via empacotar-web-para-app.
  Não use para 3D web (engine-web-threejs) nem para apps nativos (engine-spritekit-swiftui).
license: MIT
compatibility: "Claude Code ou Codex; Node.js 20+ e npm; Playwright com WebKit (qualquer SO); Safari real em iPhone para validação final"
metadata:
  grupo: engines
  alvo: [2d, web]
  fase: [2, 3, 5, 8]
argument-hint: "[pasta-do-jogo] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine web 2D: Phaser/PixiJS + TypeScript + Vite

Entrega um jogo web 2D instalável como PWA que roda bem no Safari do iPhone, com canal de depuração em `window.__GAME_DEBUG__`; `scripts/verify.sh` faz `vite build`, sobe `vite preview`, abre em WebKit emulando iPhone com Playwright, captura screenshot/console/estado e grava em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** para jogos 2D casuais que precisam de link compartilhável, PWA ou protótipo rápido antes de decidir engine; TypeScript é a linguagem que os modelos mais acertam e não há passo de export.
- **Phaser** quando quer engine completa (cenas, física Arcade, tilemaps, input, áudio). **PixiJS** quando só precisa de renderização 2D rápida e vai escrever o loop/física (jogos de cartas, puzzles). Versões: use a release estável atual publicada em phaser.io e npm (`npm view phaser version`); fontes de fornecedor falam em "Phaser 4" como engine de 2026 **[secundário, confirmar]**.
- **Não use** se o produto final é App Store com IAP/Game Center nativos — o caminho web view é frágil na revisão (ver `/empacotar-web-para-app`); prefira SpriteKit ou Unity.

## Pré-requisitos

- Node.js 20+ e npm. Projeto Vite + TypeScript (`npm create vite@latest meu-jogo -- --template vanilla-ts`), `npm i phaser` (ou `pixi.js`).
- Playwright no projeto: `npm i -D playwright && npx playwright install webkit chromium` (WebKit é o motor mais próximo do Safari que roda fora do macOS).
- Opcional: Phaser Editor v5 + seu MCP oficial (`phaserjs/editor-mcp-server`, 36 estrelas) para edição de cenas; o README recomenda criar "training levels" rotulados, pois screenshots sozinhos "may not always be sufficient for the LLM".

## Entradas

- Brief (orientação, resolução lógica, alvo de fps), `feature_list.json`, atlases exportados (TexturePacker/free-tex-packer JSON Hash) em `public/assets/`.

## Passos

1. **Esqueleto** (fase 2): `src/main.ts` cria o `Phaser.Game` com `type: Phaser.AUTO`, `scale: { mode: Phaser.Scale.FIT, autoCenter: CENTER_BOTH, width: 390, height: 844 }`, DPR limitado a `Math.min(devicePixelRatio, 2)` (memória de GPU), `input: { activePointers: 3 }`; cenas `Boot → Preload → Menu → Game`. Detalhes em `references/ios-safari-armadilhas.md`.
2. **Canal de depuração**: `src/debug.ts` expõe `window.__GAME_DEBUG__ = { scene, score, fps, frame, lastEvent, errors[] }` atualizado por frame (`game.loop.actualFps`) e registra `window.onerror`/`unhandledrejection`. É o que o Playwright lê.
3. **Primeira verificação**:

```bash
.claude/skills/engine-web-phaser/scripts/verify.sh --dir . --feature esqueleto
```

   Resultado: `build.log`, `screenshot.png` (WebKit, iPhone), `console.log`, `state.json`, `resumo.md`.
4. **Toque e áudio** (fase 5): só `pointerdown/up/move` (nunca `mouse*`); `touch-action: none` e `user-select: none` no canvas; desbloqueie áudio no primeiro gesto (`this.sound.unlock()`/`AudioContext.resume()`) com uma tela "toque para começar"; Web Audio sempre (`audio: { disableWebAudio: false }`); formatos `.m4a`/`.mp3` + `.ogg`.
5. **Assets** (fase 6): atlas JSON (`this.load.atlas`) e `multiatlas` para mais de 2048²; texturas ≤2048² (Safari antigo limita 4096² e memória de GPU é curta); comprimir PNG (oxipng/pngquant) ou usar WebP com fallback; áudio curto em `.m4a`.
6. **PWA** (fase 8): `manifest.webmanifest` (`display: standalone`, ícones 180/192/512, `orientation`), `apple-touch-icon`, meta `viewport-fit=cover` e `apple-mobile-web-app-capable`, service worker com cache de assets (plugin `vite-plugin-pwa` ou SW manual). Receita e limites do iOS em `references/pwa.md`.
7. **Performance** (fase 8): alvo 60 fps em iPhone de 4 anos; medir `game.loop.actualFps` no canal de debug; `roundPixels`, pooling de sprites, `Phaser.Scale.FIT` em vez de `RESIZE` contínuo, nada de filtros/shaders pesados no Safari; evitar `setInterval` para lógica.
8. **Verificar** a cada feature com `verify.sh --feature <slug>`; para fluxos com toque, estenda `scripts/playtest.mjs` com `page.tap(x, y)` em coordenadas da feature (ou passe `--taps "x,y;x,y"`); anexe a evidência.
9. **Safari real**: ao fechar a fase, abra no iPhone (`npx vite preview --host`) e faça o playtest humano; Safari iOS tem bugs que o WebKit do Playwright não reproduz (áudio, visibilidade, barra inferior).

## Critério de pronto e evidência

- `verify.sh` saiu 0: `build.log` sem erros TypeScript, `console.log` sem `pageerror`, `screenshot.png` mostra a cena esperada e `state.json` tem `scene` esperado e `fps ≥ 50` no WebKit.
- Lighthouse/PWA: `manifest` e SW válidos (checar em Chrome DevTools uma vez por release).
- Compilar com `tsc` não é execução.

## Verificar no simulador/dispositivo

- Simulador iOS do Xcode (macOS): `xcrun simctl openurl booted http://<ip-do-mac>:4173` após `npx vite preview --host`; screenshot com `xcrun simctl io booted screenshot`. É o Safari real do iOS (WebKit do sistema).
- Dispositivo: Safari → "Adicionar à Tela de Início" para testar PWA standalone; Web Inspector via Mac (Safari → Develop) para console remoto.

## Armadilhas conhecidas

- **Áudio mudo no iOS** até um gesto do usuário; `AudioContext` suspenso após troca de aba — reative em `visibilitychange`.
- **100vh e barras do Safari**: use `100dvh`/`svh` e `viewport-fit=cover` + `env(safe-area-inset-*)`.
- **DPR 3 em iPhones**: canvas em DPR 3 estoura memória; limite `Math.min(devicePixelRatio, 2)`.
- **Scroll/zoom**: `touch-action: none`, `-webkit-user-select: none`, bloqueie duplo toque; `overscroll-behavior: none`.
- **Service worker em cache velho**: versione o nome do cache e mostre "nova versão disponível".
- **Memória**: Safari recarrega abas pesadas; mantenha heap < ~300 MB e libere texturas ao trocar de cena.
- **Loja**: web view para a App Store expõe 4.2 (funcionalidade mínima) e 4.7 (HTML5 games); leia `/empacotar-web-para-app` antes de prometer "publicar na App Store".
- **Licenças**: Phaser e PixiJS são MIT; Playwright Apache 2.0; atlases/fontes gerados seguem as licenças das skills de arte.
- **Custo**: zero em serviços; Playwright roda local.

## Fontes

- Phaser (site/news, versão atual e Sprite Fusion): https://phaser.io ; https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser
- phaserjs/editor-mcp-server (MCP oficial do Phaser Editor; "training levels"): https://github.com/phaserjs/editor-mcp-server
- anthropics/skills — webapp-testing (padrão Playwright + `with_server.py`, inspiração): https://github.com/anthropics/skills
- App Store Review Guidelines §4.2 e §4.7: https://developer.apple.com/app-store/review/guidelines/
- Playwright (emulação de dispositivos, WebKit): https://playwright.dev/docs/emulation [não lida nesta pesquisa; confirme nomes de dispositivos]
- Vite CLI (`vite build`, `vite preview --port --strictPort --host`): https://vite.dev/guide/cli [não lida nesta pesquisa; confirme flags]
- Comparativos de engines web 2026 [secundário, fornecedor]: https://app.cinevva.com/guides/web-game-engines-comparison
