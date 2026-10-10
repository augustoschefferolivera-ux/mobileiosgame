---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
  - "**/*.mjs"
  - "index.html"
  - "vite.config.ts"
  - "vitest.config.ts"
---
# Regras para o código deste jogo (Phaser 4.2.1 + TypeScript 5.9 + Vite 8)

## Estrutura (quem pode importar o quê)
- `src/logic/` = regras puras: só importa `src/logic/**` e `src/data/*.json`. **Nunca** `phaser`, DOM, `window`, timers.
  Forma: `reduzir<Sistema>(estado, acao) → estado novo`, entradas `readonly`, união discriminada com `switch` exaustivo.
- `src/scenes/*Scene.ts` = adaptador fino: toque → ação → lógica → desenho. Um `if` de regra de jogo numa cena está no
  lugar errado. Reset de estado em `init()`; listeners removidos em `events.once(SHUTDOWN, …)`.
- `src/data/*.json` = balanceamento (números, tabelas) com `_sobre`; ajustar dificuldade é diff em JSON, não em código.
- `src/debug.ts` = contrato `window.__GAME_DEBUG__`; `src/main.ts` = `GameConfig` e lista de cenas; nada de gameplay neles.
- Novo módulo = `bash .claude/skills/engine-web-phaser/scripts/novo-modulo.sh <nome>` (lógica + teste + cena + JSON).
- Nomes: lógica/dados em kebab-case sem acento; classes `PascalCase` com sufixo (`GameScene`); chaves de cena snake_case;
  chave de asset = nome do arquivo sem extensão. Sem `index.ts` barrel.

## Proibições (o revisor-de-codigo bloqueia)
- `any`, `as unknown as` fora de `tests/setup-*`, `@ts-ignore`; `tsconfig` fica `strict` + `noUncheckedIndexedAccess`.
- `setInterval`/`setTimeout`/`Date.now()` para lógica de jogo: tempo entra como `delta` do `update(time, delta)`
  (pausa, `timeScale` e testes dependem disso). `Math.random()` em `src/logic/`: RNG injetado (`Phaser.Math.RND` ou função).
- Alocação em `update()`/`preUpdate()`: `new`, closures, `filter/map`, `new Phaser.Geom.*`, `new Vector2` por frame.
  Objetos de trabalho criados em `create()`; projéteis/inimigos em `Group` com `maxSize` + `get()`/`killAndHide()`.
- Eventos `mouse*`/`touch*` diretos, `click`: só `pointerdown/up/move` do Phaser; ações com gesto no `pointerup`.
- Número mágico de pixel: a resolução lógica é `390*dpr × 844*dpr` — posições derivam de `this.scale.width/height`.
- API do Phaser 3: `setPipeline`, `preFX/postFX`, `BitmapMask`, `setTintFill`, `Geom.Point`, `Math.PI2`, `Struct.Set/Map`,
  Spine embutido, `DynamicTexture` sem `render()`. Antes de filtros/máscaras/shader/lighting leia
  `.claude/skills/engine-web-phaser/references/phaser4-mudancas-e-armadilhas.md`.
- `Text` atualizado por frame (HUD, pontuação, timer): use `BitmapText`. Filtros (Blur/Glow/Bloom) no MVP mobile.
- `this.load.image` solto fora do `BootScene`: tudo em atlas (`atlas`/`multiatlas`, ≤ 2048², padding 2 px).
- Segundo gerenciador de áudio/pausa: o Phaser já desbloqueia o `AudioContext`, suspende em `blur` e pausa o loop em
  `hidden` (`Phaser.Core.Events.PAUSE/RESUME`). Ouça os eventos; não reimplemente.
- Versão com `^`/`~` em `package.json`; dependência nova sem linha de ADR em `docs/decisoes/`; segredos no bundle.

## Testes obrigatórios por tipo de feature
- Regra/balanceamento: `src/logic/<nome>.test.ts` (Vitest, ambiente `node`), um `it('AC-n: …')` por critério de aceite,
  escrito **antes** e visto falhando. JSON de dados tem teste de invariantes.
- Fluxo de cenas/entidade: tabela de transições testada (toda transição listada; inválida lança).
- Comportamento que precisa de objetos Phaser (Group, Arcade, tween): `tests/*.test.ts` com
  `// @vitest-environment jsdom` + `type: Phaser.HEADLESS` (setup em `tests/setup-phaser-headless.ts`).
- Tudo que o jogador vê ou toca: `bash scripts/verify.sh --feature F-xxx` com `--taps-game` nas posições reais e, se
  houver aleatoriedade, `--seed`. Screenshot em estado estável; comparação com `comparar-screenshots.py` quando houver
  referência. `npm test` roda dentro do `verify.sh`; teste vermelho = feature não fecha. Não pule nem apague testes.

## Canal `__GAME_DEBUG__`
- Toda feature acrescenta a `GameDebug` (`src/debug.ts`) os campos que o critério de aceite exige, serializáveis em JSON,
  atualizados no `update()` da cena ativa (`tick(game, chave)`) e nas ações (`event('cena:acao')`).
- `errors[]` recebe `window.onerror`/`unhandledrejection`; nunca engula exceção com `try {} catch {}` vazio.
- Estado que não aparece no canal não é verificável; o que não é verificável não vira `done`.

## Evidência
- `production/evidencias/<data>-F-xxx/` com `build.log`, `tests.log`, `screenshot.png`, `console.log` (sem `pageerror`/
  `requestfailed`), `state.json` (`scene`, `fps ≥ 50`, `errors: []`, campos da feature), `playtest.json` (toques).
- Chromium headless sem GPU imprime "software WebGL"/"GPU stall": ruído do CI, não erro do jogo; `pageerror` nunca é ruído.
- Safari real no iPhone a cada milestone (áudio, barras, memória): o WebKit do Playwright é aproximação.
