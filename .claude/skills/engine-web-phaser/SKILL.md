---
name: engine-web-phaser
description: >
  Monta, codifica e verifica um jogo web 2D para iPhone com Phaser 4.2.1 + TypeScript 5.9 + Vite 8
  feito por agentes: esqueleto (390×844 retrato, FIT, DPR ≤ 2), arquitetura lógica pura + cena fina
  (scripts/novo-modulo.sh), testes Vitest (lógica e Phaser HEADLESS no Node), toque, áudio no Safari
  iOS, atlases, performance, PWA com vite-plugin-pwa; verificação com Playwright emulando iPhone
  (scripts/verify.sh: build → npm test → vite preview → playtest com toques, seed e screenshot).
  Use sempre que o jogo for 2D para navegador/PWA, quando aparecer "Phaser", "cena", "sprite",
  "atlas", "toque não funciona", "áudio mudo no iPhone", "fps", "service worker", ou um protótipo web
  que depois vai para a App Store via empacotar-web-para-app. Não use para 3D web
  (engine-web-threejs) nem para o empacotamento/revisão da App Store em si (empacotar-web-para-app).
license: MIT
compatibility: "Claude Code ou Codex; Node 22.12+ e npm; Playwright 1.56.1 com WebKit (Arch) ou Chromium (CI); Safari real em iPhone para validação final"
metadata:
  grupo: engines
  alvo: [2d, web]
  fase: [2, 3, 5, 8]
argument-hint: "[feature] [--taps-game \"gx,gy;gx,gy\"] [--seed n]"
disable-model-invocation: false
user-invocable: true
---

# Engine web 2D: Phaser 4.2.1 + TypeScript + Vite 8

Entrega um jogo web 2D instalável como PWA que roda bem no Safari do iPhone, com lógica pura testada por Vitest, cenas finas em Phaser, canal de depuração `window.__GAME_DEBUG__` e evidência gerada por `scripts/verify.sh` (build → testes → `vite preview` → Playwright emulando iPhone → `screenshot.png`, `console.log`, `state.json`, `tests.log`) em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** para o jogo deste repositório (ADR-0001: Phaser 4.2.1, Vite 8.3.4, TS 5.9.3, Playwright 1.56.1, Node 22) e para qualquer 2D casual web: puzzle, arcade, runner, cartas, idle, roguelite leve — o perfil "2D, lógico, definido em código" em que os relatos de 2025–2026 dizem que agentes rendem mais.
- **Phaser 4** (não 3): 4.0.0 saiu em 2026-04-10, 4.2.1 "Giedi" em 2026-07-09 (npm). API de cenas/loader/input compatível com a 3, renderer novo. O modelo tende a escrever Phaser 3: leia `references/phaser4-mudancas-e-armadilhas.md` antes de usar filtros, máscaras, tint, shaders, lighting, `Geom.Point`, `Math.TAU` ou Spine.
- **Não use** se o produto exige Game Center/IAP nativos como núcleo ou 3D (`engine-web-threejs`); para levar à App Store, `/empacotar-web-para-app` (riscos 4.2/4.7).

## Pré-requisitos

- Node ≥ 22.12 (Vitest 5 exige; aqui 22.22.0), `npm ci`. Versões fixadas no `package.json`: `phaser 4.2.1`, `vite 8.3.4`, `typescript 5.9.3`, `playwright 1.56.1`, `vitest 5.0.3`, `jsdom 29.1.1`, `vite-plugin-pwa 2.0.0` (compatibilidade com Vite 8 confirmada por `peerDependencies` e por build/testes em 2026-10-10).
- Navegadores do Playwright: `npx playwright install webkit` (Arch; mais próximo do Safari) ou `chromium` (`VERIFY_BROWSER=chromium` onde não há WebKit, como neste CI).
- Documentação primária offline: `node_modules/phaser/skills/*/SKILL.md` (28 skills oficiais do Phaser 4 para agentes), `changelog/v4/4.0/MIGRATION-GUIDE.md`, `docs/` (Pixel Art, Rendering Concepts, Compressed Textures), `types/phaser.d.ts`. Online: https://docs.phaser.io (4.x).
- Opcionais: Phaser Editor v5 + `@phaserjs/editor-mcp-server` 1.0.6 (só se houver muitas fases desenhadas à mão); `@esotericsoftware/spine-phaser-v4` 4.3.13 (exige licença do Spine Editor); `phaser-box2d` 1.1.0 (MIT).

## Entradas

- `design/game-brief.md` (orientação, loop, dispositivo mínimo), `feature_list.json` (critério de aceite por feature), `design/art-bible.md`, atlases JSON hash em `public/assets/` (`/atlas-e-exportacao-2d-mobile`), áudio `.m4a` + `.ogg`, mapas Tiled JSON.

## Passos

1. **Esqueleto** (fase 2, já existe aqui): `src/main.ts` com `Phaser.AUTO`, `scale: { mode: FIT, autoCenter: CENTER_BOTH, width: 390*dpr, height: 844*dpr, zoom: 1/dpr }`, `dpr = min(devicePixelRatio, 2)`, `input.activePointers: 3`, cenas `Boot → Preload → Menu → Game`; `index.html` com `viewport-fit=cover`, `100dvh`, `touch-action: none`. Detalhes e porquês em `references/ios-safari-armadilhas.md`. Projeto novo fora deste repo: `npm create @phaserjs/game@latest` (template Vite + TS oficial) e copie `src/debug.ts`, `vite.config.ts`, `vitest.config.ts`, `tests/` daqui.
2. **Arquitetura por feature** (fase 5): lógica em `src/logic/<nome>.ts` (reducer puro, sem `phaser`), teste em `src/logic/<nome>.test.ts`, dados em `src/data/<nome>.json`, cena fina em `src/scenes/<Nome>Scene.ts`. Gere o trio:

```bash
bash .claude/skills/engine-web-phaser/scripts/novo-modulo.sh combo-de-ataque   # --sem-cena, --sem-dados, --dir
npx vitest run src/logic/combo-de-ataque.test.ts                                # deve FALHAR antes de implementar
```

   Padrões (máquina de estados em tabela, RNG injetado, nada de `setInterval`, coordenadas por `this.scale`) em `references/arquitetura-para-agentes.md`.
3. **Canal de depuração**: cada feature declara no critério de aceite quais campos expõe em `window.__GAME_DEBUG__` (`src/debug.ts`: `scene, score, fps, frame, lastEvent, errors[]` + os seus). Sem campo, sem prova.
4. **Testes** (`npm test`): lógica pura no ambiente `node`; objetos Phaser reais (Group, Arcade, tweens, fluxo de cenas) com `// @vitest-environment jsdom` e `type: Phaser.HEADLESS` (setup já em `tests/setup-phaser-headless.ts`; prova em `tests/phaser-headless.test.ts`). Receitas e limites em `references/testes-vitest-e-playwright.md`.
5. **Toque e áudio** (fase 5): só `pointerdown/up/move`; gestos que exigem interação (fullscreen, primeiro `play`) no `pointerup`; tela "toque para começar" + `this.sound.unlock()`; `this.load.audio('k', ['k.m4a', 'k.ogg'])`; HUD em `BitmapText`.
6. **Assets** (fase 6): `this.load.atlas`/`multiatlas` (≤ 2048² cada, padding 2 px); tilemaps Tiled JSON com `createLayer(..., true)` (`TilemapGPULayer`) para mapas grandes; `this.textures.remove`/`cache.audio.remove` ao sair da fase; texturas comprimidas ASTC (`this.load.texture`) só se a memória estourar.
7. **Verificar** a cada iteração e ao fechar a feature:

```bash
bash scripts/verify.sh --quick --feature F-003 --out production/evidencias/_ultima     # iteração
bash scripts/verify.sh --feature F-003                                                 # fecha a feature (pasta datada)
.claude/skills/engine-web-phaser/scripts/verify.sh --feature F-003 --taps-game "390,300;390,844" --seed 42 --device "iPhone 15"
```

   `--taps-game` usa coordenadas do jogo (convertidas pelo `getBoundingClientRect` do canvas); `--seed` injeta `window.__GAME_SEED__` para `Phaser.Math.RND` determinístico (contrato em `src/main.ts`: `seed: window.__GAME_SEED__ ? [window.__GAME_SEED__] : undefined`); `--no-tests`/`--no-build` para iteração rápida. Abra `screenshot.png` com Read e compare com cada critério; leia `state.json` (`scene`, `fps`, `errors`, campos da feature) e `console.log`.
8. **Performance** (fase 8): orçamentos (60 fps; bundle do jogo em dezenas de KB além do chunk do Phaser de 1.374 kB/357 kB gzip; texturas ≤ 64 MB por cena; DPR ≤ 2) e checklist em `references/performance-e-memoria-mobile.md`; registre medições em `production/perf/<data>.md`.
9. **PWA e release web** (fase 8/10): `vite-plugin-pwa` já configurado (`autoUpdate`, manifest manual, precache de js/html/json/png/webp/m4a/ogg); ícones 192/512/180, `description`, cache headers e checklist em `references/pwa-e-distribuicao.md`; deploy e itch.io em `/publicar-jogo-web`; App Store em `/empacotar-web-para-app`.
10. **Safari real** ao fechar cada milestone: `npx vite preview --host` → iPhone na mesma rede → playtest humano (áudio, barras, memória, "Adicionar à Tela de Início"); o WebKit do Playwright é aproximação.

## Critério de pronto e evidência

- `scripts/verify.sh` saiu 0: `build.log` sem erro de TypeScript/Vite, `tests.log` com todos os testes passando, `console.log` sem `pageerror`/`requestfailed`, `screenshot.png` mostrando o critério visual, `state.json` com `scene` esperado, `fps ≥ 50`, `errors: []` e os campos da feature nos valores esperados após os toques (`playtest.json.taps` lista o que foi tocado).
- Feature de lógica: teste `AC-n` em `src/logic/*.test.ts` passando (nomeado pelo critério de aceite). Feature visível: além disso, crítico (`/critico-independente`) ≥ 7.
- Um `tsc --noEmit` verde não é execução; um teste Vitest verde não é screenshot.

## Verificar no simulador/dispositivo

- Emulador: `--device "iPhone 15"` (último descritor na 1.56.1; viewport 393×659, DPR 3, touch) com WebKit no Arch; `--browser chromium` onde não houver WebKit (ruído "software WebGL" no console é do ambiente).
- iPhone real: `npx vite preview --host` e abra `http://<ip>:4173`; Web Inspector pelo Safari do Mac (remoto, `/build-ios-sem-mac`) quando precisar de console/memória reais.
- Simulador iOS (macOS): `xcrun simctl openurl booted http://<ip>:4173` e `xcrun simctl io booted screenshot` — Safari de verdade.

## Armadilhas conhecidas

- **Phaser 3 na cabeça do modelo**: `setPipeline`, `preFX/postFX`, `BitmapMask`, `setTintFill`, `Geom.Point`, `Math.TAU` (= 2π agora), `Struct.Set/Map`, `DynamicTexture` sem `render()`, Spine embutido — tudo mudou (`references/phaser4-mudancas-e-armadilhas.md`).
- **Resolução lógica muda com o DPR** (780×1688 vs 390×844): número mágico em pixel quebra em outro aparelho; derive de `this.scale`.
- **`roundPixels` agora é `false`**; pixel art borrada → `pixelArt: true` (sem escala/rotação) ou `smoothPixelArt: true`.
- **1 textura por batch em mobile** (`autoMobileTextures`): PNG solto = draw call; tudo em atlas.
- **`Text` por frame** mata o FPS no iPhone; `BitmapText` no HUD.
- **Listeners acumulam** em `scene.restart()`; limpe em `SHUTDOWN`; reset de estado em `init()`, não no constructor.
- **`scene.start` é enfileirado**, `pause()` ainda renderiza, `fps.target` não impõe nada.
- **Áudio**: o Phaser já desbloqueia e já suspende/retoma; não escreva outro gerenciador; sem pan no iOS; botão de mute na UI.
- **Pausa**: `Game#onHidden` já pausa o loop (evento `PAUSE`); o `visibilitychange` de `src/main.ts` é redundante.
- **Service worker**: `autoUpdate` só aplica no iOS standalone ao reabrir; `index.html`/`sw.js` sem cache longo; `vite:preloadError` → reload.
- **Vite 8 é Rolldown**: `rollupOptions`/`manualChunks` são alias deprecado; use `build.rolldownOptions.output.codeSplitting` (já feito); minificador padrão `oxc`.
- **Playwright 1.56.1**: só até "iPhone 15"; `toHaveScreenshot` é do `@playwright/test` (não instalado) — compare com `comparar-screenshots.py` de `playtest-automatizado`.
- **jsdom 30.x exige Node ≥ 22.22.2**; fique no 29.1.1 ou atualize o Node.
- **Licenças**: Phaser, Vite, vite-plugin-pwa, Workbox, jsdom, Vitest MIT; TypeScript e Playwright Apache 2.0; Spine runtimes exigem licença do Editor; Editor MCP ISC. **Custo**: zero em serviços.

## Fontes

- Phaser 4.2.1 (pacote npm, lido em 2026-10-10): `README.md`, `CHANGELOG.md`, `changelog/v4/{4.0,4.1,4.2,4.2.1}`, `changelog/v4/4.0/MIGRATION-GUIDE.md`, `skills/*/SKILL.md`, `docs/*`, `tests/TESTING.md`, `types/phaser.d.ts`, `src/core/Game.js`, `src/sound/webaudio/WebAudioSoundManager.js` — https://github.com/phaserjs/phaser
- npm (2026-10-10): `npm view phaser time` (4.0.0 = 2026-04-10; 4.2.1 = 2026-07-09); `vitest@5.0.3` peerDependencies/engines; `vite-plugin-pwa@2.0.0` peerDependencies/engines; `jsdom` engines; `@esotericsoftware/spine-phaser-v4`; `phaser-box2d`; `@phaserjs/editor-mcp-server`; `@phaserjs/create-game`
- Template oficial Phaser + Vite + TS: https://github.com/phaserjs/template-vite-ts ; create-game: https://github.com/phaserjs/create-game ; Editor MCP ("training levels"): https://github.com/phaserjs/editor-mcp-server
- Vite 8.3.4: `npx vite build --help`, `node_modules/vite/dist/node/index.d.ts`, https://github.com/vitejs/vite/blob/main/docs/guide/build.md
- vite-plugin-pwa docs (raw): https://github.com/vite-pwa/vite-plugin-pwa/tree/main/docs/guide
- Playwright 1.56.1: `require('playwright').devices`, `node_modules/playwright-core/types/types.d.ts`; docs https://github.com/microsoft/playwright/tree/main/docs/src (emulation, screenshots, clock)
- Vitest: https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md , `docs/guide/environment.md`
- Spine Runtimes License: https://github.com/EsotericSoftware/spine-runtimes/blob/4.3/LICENSE ; Phaser Box2D: https://github.com/phaserjs/phaser-box2d
- Anthropic, Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents ; Claude-Code-Game-Studios: https://github.com/Donchitos/Claude-Code-Game-Studios
- App Store Review Guidelines §4.2/§4.7/§2.5.2: https://developer.apple.com/app-store/review/guidelines/
- Medições deste repositório (2026-10-10): `vite build` (phaser-*.js 1.374,10 kB / 357,33 kB gzip; index-*.js 2,73 kB; sw.js gerado), `npm test` (4 testes HEADLESS, ~8 s), `verify.sh` Chromium iPhone 15 (`fps: 59`, `errors: []`)
- Não lidos (bloqueados nesta sessão; confirmar quando possível): https://docs.phaser.io , https://capacitorjs.com/docs , https://webkit.org/blog/ , https://playwright.dev , https://vitest.dev , https://vite.dev
