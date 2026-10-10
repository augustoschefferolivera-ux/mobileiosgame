# Testes: Vitest para lógica (e Phaser HEADLESS), Playwright para o jogo rodando

Três camadas, cada uma com um custo e uma pergunta:

| Camada | Ferramenta | Responde | Tempo | Onde |
|---|---|---|---|---|
| Lógica pura | Vitest 5, ambiente `node` | "a regra está certa?" | ms | `src/logic/*.test.ts` |
| Objetos Phaser sem pixels | Vitest + jsdom + `Phaser.HEADLESS` | "a cena/física/tween se comporta?" | ~8 s de boot do módulo | `tests/*.test.ts` |
| Jogo rodando | Playwright 1.56.1 (WebKit/Chromium emulando iPhone) via `scripts/verify.sh` | "o que o jogador vê e toca funciona?" | ~10–20 s | `production/evidencias/<data>-<id>/` |

Só a terceira é evidência para o crítico; as duas primeiras evitam que a terceira falhe por motivo bobo.

## Versões confirmadas (2026-10-10)

- **vitest 5.0.3** (2026-09-30): `peerDependencies.vite: '^6.4.0 || ^7.0.0 || ^8.0.0'`, `engines.node: '^22.12.0 || ^24.0.0 || >=26.0.0'` (`npm view vitest`); guia oficial: "Vitest requires Vite >=v6.4.0 and Node >=v22.12.0". Compatível com o Vite 8.3.4 deste projeto; instalado e rodando.
- **jsdom 29.1.1** (o 30.x exige Node ^22.22.2 e este ambiente tem 22.22.0; o Phaser usa `jsdom ^29`). Alternativa mais leve: `happy-dom` 20.x (não testada com Phaser).
- **playwright 1.56.1** (fixado; o último é 1.64.0 — descritores de dispositivo até **iPhone 15** nesta versão; iPhone 16/17 só em versões mais novas **[confirmar]**).
- Instalação feita: `npm install -D --save-exact vitest@5.0.3 jsdom@29.1.1`; `package.json` tem `"test": "vitest run"`; `vitest.config.ts` com `include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`, `environment: 'node'`, `setupFiles: ['tests/setup-phaser-headless.ts']`.

## 1. Teste de lógica pura (o caso comum)

```ts
// src/logic/pontuacao.test.ts
import { describe, expect, it } from 'vitest';
import { pontuacaoInicial, reduzirPontuacao } from './pontuacao';

describe('pontuacao', () => {
  it('AC-1: três acertos seguidos sobem o multiplicador para 2', () => {
    let e = pontuacaoInicial;
    for (let i = 0; i < 3; i++) e = reduzirPontuacao(e, { tipo: 'acerto', precisao: 1 });
    expect(e.multiplicador).toBe(2);
  });
  it('AC-2: erro zera o combo mas não os pontos', () => {
    const e = reduzirPontuacao({ pontos: 50, combo: 4, multiplicador: 2 }, { tipo: 'erro' });
    expect(e).toEqual({ pontos: 50, combo: 0, multiplicador: 1 });
  });
  it('é puro: não muta a entrada', () => {
    const antes = { ...pontuacaoInicial };
    reduzirPontuacao(pontuacaoInicial, { tipo: 'acerto', precisao: 1 });
    expect(pontuacaoInicial).toEqual(antes);
  });
});
```

Nomeie o teste pelo critério de aceite (`AC-n`) de `feature_list.json`: o crítico cruza os dois. Rode um arquivo: `npx vitest run src/logic/pontuacao.test.ts`; tudo: `npm test`. Determinismo: RNG injetado (`new Phaser.Math.RandomDataGenerator(['seed'])` ou uma função `() => number`), tempo como `dtMs`.

## 2. Phaser em modo HEADLESS no Node (quando precisa de objetos reais)

Funciona em 4.2.1 e está provado em `tests/phaser-headless.test.ts` (4 testes passando). Requisitos, iguais aos do próprio Phaser (`node_modules/phaser/tests/TESTING.md`):

1. Arquivo com `// @vitest-environment jsdom` no topo.
2. Setup **antes** do `import Phaser from 'phaser'` (por isso vai em `setupFiles`, não em `import` no teste — o módulo chama `canvas.getContext('2d')` ao carregar): `Image` que dispara `onload` e stub de `getContext('2d')`; `getContext('webgl')` devolve `null` (HEADLESS não renderiza).
3. `new Phaser.Game({ type: Phaser.HEADLESS, banner: false, audio: { noAudio: true }, parent, scene: { create() { resolve(this) } } })` e `game.destroy(true)` no `afterEach`.

```ts
// tests/fase.test.ts
// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import Phaser from 'phaser';
let game: Phaser.Game | null = null;
const boot = (cfg: Partial<Phaser.Types.Core.GameConfig> = {}) => new Promise<Phaser.Scene>((resolve) => {
  game = new Phaser.Game({ type: Phaser.HEADLESS, width: 390, height: 844, banner: false, audio: { noAudio: true },
    scene: { key: 't', create(this: Phaser.Scene) { resolve(this); } }, ...cfg });
});
afterEach(() => { game?.destroy(true); game = null; });

it('inimigo em Group volta ao pool ao morrer', async () => {
  const scene = await boot();
  const pool = scene.add.group({ classType: Phaser.GameObjects.Sprite, defaultKey: '__DEFAULT', maxSize: 5 });
  const a = pool.get(0, 0) as Phaser.GameObjects.Sprite;
  pool.killAndHide(a);
  expect(pool.countActive(true)).toBe(0);
  expect(pool.get(1, 1)).toBe(a); // reuso, não new
});
```

Limites: nada de pixels, nem `Text` medido de verdade (o `measureText` é stub), nem WebGL; `__DEFAULT` é a textura 32×32 embutida. Teste aqui física Arcade (`scene.physics.world.step(1/60)`), tweens (`scene.tweens`), timers, máquinas de cena, pooling — não layout.

## 3. Playwright: o olho do agente

`scripts/verify.sh` (desta skill) faz: `npm run build` → `npm test` → `vite preview --port 4173 --strictPort --host 127.0.0.1` → `scripts/playtest.mjs`. O playtest abre `pw[browser].launch({ headless: true })`, `browser.newContext({ ...devices['iPhone 15'] })` (viewport 393×659, `deviceScaleFactor: 3`, `hasTouch: true`, `isMobile: true`, `defaultBrowserType: 'webkit'`), coleta `console`, `pageerror`, `requestfailed`, executa toques, tira `screenshot.png`, lê `window.__GAME_DEBUG__` → `state.json`, e devolve 0/2.

Comandos:

```bash
bash scripts/verify.sh --feature F-003                       # despachante → engine-web-phaser/scripts/verify.sh
VERIFY_BROWSER=chromium bash scripts/verify.sh --feature F-003   # onde não há WebKit (este CI); no Arch use webkit
.claude/skills/engine-web-phaser/scripts/verify.sh --dir . --feature F-003 --taps "196,330;196,330" --seed 42
node .claude/skills/engine-web-phaser/scripts/playtest.mjs --url http://127.0.0.1:4173/ --out /tmp/x --taps-game "390,844" --seed 42
```

### Toques por coordenada

- `--taps "x,y;…"` usa **px CSS do viewport** (`page.touchscreen.tap(x, y)`). O canvas FIT fica centralizado (no iPhone 15 emulado: 305×659 CSS para 780×1688 de jogo), então coordenadas de jogo precisam de conversão.
- `--taps-game "gx,gy;…"` (playtest.mjs) converte coordenada **do jogo** para CSS lendo `canvas.getBoundingClientRect()` e `canvas.width/height`: `css = rect.left + gx * rect.width / canvas.width`. Prefira esta forma: ela não depende do dispositivo emulado.
- Entre toques o script espera 400 ms; aumente `--wait` se a cena anima a entrada. Confirme no `state.json` que `frame` cresceu entre duas leituras (frame congelado parece vivo).

### Screenshot determinístico

1. **Seed**: `--seed 42` injeta `window.__GAME_SEED__` via `context.addInitScript` antes de qualquer script. Contrato para `src/main.ts`: `seed: window.__GAME_SEED__ ? [window.__GAME_SEED__] : undefined` no `GameConfig` (3 linhas; `Phaser.Math.RND` passa a ser reproduzível; teste em `tests/phaser-headless.test.ts`). Toda aleatoriedade do jogo deve vir de `Phaser.Math.RND` ou de um RNG derivado dela.
2. **Tempo**: tweens/partículas mudam a cada frame. Opções, da mais simples à mais forte: (a) tirar o screenshot em estado estável (menu, pausa, fim de fase) e comparar só regiões fixas (HUD); (b) `page.screenshot({ animations: 'disabled' })` congela animações CSS (não afeta o canvas); (c) `page.clock.install()` + `page.clock.runFor(ms)` — a doc do Playwright lista que `Page.clock` substitui `Date`, `setTimeout`, **`requestAnimationFrame`** e `performance`, logo o loop do Phaser (`TimeStep` usa `performance.now()` + rAF) passa a avançar só quando você manda; **não validado neste repositório — teste antes de depender**.
3. **Fonte**: `Text` com `system-ui` muda entre WebKit e Chromium; HUD em `BitmapText` deixa o pixel igual nos dois.
4. **Comparação**: `python3 .claude/skills/playtest-automatizado/scripts/comparar-screenshots.py ref.png atual.png --limiar 2.0` (já existe; gera diff e percentual). Referências ficam em `production/referencias/`. Sem `@playwright/test`, não há `toHaveScreenshot` — o script Python cumpre o papel.

### Medir FPS e memória

- FPS: `window.__GAME_DEBUG__.fps` = `Math.round(game.loop.actualFps)`, lido em `state.json`; o playtest marca falha abaixo de 30 no emulador. Para uma série, leia o canal N vezes com `page.evaluate` e grave `fps.json`.
- Memória: **Chromium** apenas — `const cdp = await page.context().newCDPSession(page); const { metrics } = await cdp.send('Performance.getMetrics')` traz `JSHeapUsedSize` **[confirmar nomes das métricas]**; `performance.measureUserAgentSpecificMemory()` exige contexto cross-origin isolated (COOP/COEP) e também é só Chromium **[confirmar]**. No WebKit não há API: use o Safari real (Web Inspector → Timelines → Memory) a cada milestone. Memória de GPU não é observável pelo navegador (Rendering Concepts: "figures for system resources are not available in WebGL") — estime: 4 MB por megapixel de textura RGBA.
- Vídeo: `browser.newContext({ recordVideo: { dir } })` para bugs intermitentes (Playwright 1.56.1 suporta).

## 4. O que cada tipo de feature precisa provar

| Feature | Vitest | HEADLESS | Playwright (evidência) |
|---|---|---|---|
| Regra/balanceamento | obrigatório (AC-n) | — | screenshot do HUD refletindo + `state.json` |
| Cena/fluxo (menu, pausa, fim) | tabela de transições | opcional (`scene.start` enfileirado) | sequência de `--taps-game` + `state.json.scene` por passo |
| Input/toque | — | — | `--taps-game` nas posições dos controles; `lastEvent` |
| Física/colisão | reducer de dano etc. | Arcade `world.step` | screenshot do momento + contador no debug |
| Áudio | — | — | `state.json` com `soundUnlocked: true` após o 1º toque (exponha no debug) + playtest humano no iPhone |
| Performance | — | — | `fps ≥ 50` no emulador por 10 s; Safari real por milestone |
| Assets/atlas | teste de que todo frame referenciado existe no JSON do atlas | — | screenshot sem `requestfailed`/textura `__MISSING` |

## 5. Flakiness: regras

- Nunca aumente `--wait` para "passar"; descubra o que ainda não estava pronto (`load.on('complete')`, `scene.events.once('create')`) e exponha no debug (`debug.ready = true`).
- Teste reprovado no emulador e aprovado no iPhone (ou vice-versa) é registrado em `progress.md` → "Problemas conhecidos", nunca apagado.
- Chromium sem GPU avisa "Automatic fallback to software WebGL" e "GPU stall due to ReadPixels" (vistos em `console.log` deste CI): ruído de ambiente, não erro do jogo; não filtre `[error]` nem `pageerror`.

## Fontes

- Vitest: `npm view vitest@5.0.3` (peerDependencies, engines); guia "Getting Started" e "Test Environment" (`@vitest-environment`, `setupFiles`): https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md , https://github.com/vitest-dev/vitest/blob/main/docs/guide/environment.md (lidos via raw em 2026-10-10; vitest.dev bloqueado)
- Phaser 4.2.1 testes próprios: `node_modules/phaser/tests/TESTING.md`, `tests/setup.js`, `tests/helper.js`; `vitest.config.js` (`environment: 'jsdom'`); `package.json` (`vitest ^4.1.4`, `jsdom ^29.0.2`) — https://github.com/phaserjs/phaser/tree/master/tests
- Playwright 1.56.1 instalado: `node -e "require('playwright').devices"` (lista de iPhones até 15; `iPhone 15` = 393×659, DPR 3); `node_modules/playwright-core/types/types.d.ts` (`touchscreen.tap`, `screenshot({ animations })`, `clock`, `newCDPSession`, `recordVideo`)
- Playwright docs (raw, 2026-10-10): emulation https://github.com/microsoft/playwright/blob/main/docs/src/emulation.md ; screenshots https://github.com/microsoft/playwright/blob/main/docs/src/screenshots.md ; clock (lista do que `Page.clock` substitui, inclui `requestAnimationFrame`) https://github.com/microsoft/playwright/blob/main/docs/src/clock.md
- jsdom engines: `npm view jsdom@29.1.1 engines` / `jsdom@30.1.2 engines`
- Skill `playtest-automatizado` deste banco (comparar-screenshots.py, roteiro, crítico separado)
