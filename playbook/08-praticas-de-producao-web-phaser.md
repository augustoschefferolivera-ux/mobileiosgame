# Manual do especialista: produção de jogos web 2D mobile em Phaser 4 + TypeScript + Vite, 100 % por agentes

Este é o roteiro específico da pilha decidida em `docs/decisoes/ADR-0001-engine-e-alvo.md`. Ele não repete as fases genéricas de `01-roteiro-passo-a-passo.md`: diz o que muda quando a engine é o Phaser 4.2.1, o alvo é o Safari do iPhone e quem escreve todo o código é um agente. Versões fixadas e provadas em 2026-10-10: Phaser 4.2.1, Vite 8.3.4, TypeScript 5.9.3, Playwright 1.56.1, Vitest 5.0.3, jsdom 29.1.1, vite-plugin-pwa 2.0.0, Node 22.22.

## 1. Princípios (por que esta pilha e como mantê-la sob controle)

1. **O agente só vê o que está em texto ou no `verify.sh`.** Tudo aqui é texto (TS, JSON de atlas, Tiled JSON, manifest); o único binário são PNG/áudio, que o agente observa via screenshot e `state.json`. Não introduza ferramenta cujo formato de cena seja binário.
2. **Lógica pura fora do Phaser, cena fina dentro.** `src/logic/` é testado em milissegundos e é "definido em código" — o perfil onde os relatos de 2025–2026 dizem que agentes rendem mais; a cena só traduz toque → ação → desenho. É isto que preserva a propriedade mental do código (o único caso público abandonado foi um RTS cujo dono "não conseguia mais corrigir").
3. **Phaser 4 é novo (abril/2026) e o modelo sabe Phaser 3.** A API de cenas/loader/input é a mesma; renderer, filtros, tint, lighting, shaders, `Geom.Point`, `Math.TAU`, Spine mudaram. A fonte da verdade está em `node_modules/phaser/` (skills oficiais, migration guide, docs, types); o build e a execução são o árbitro, não a memória do modelo.
4. **Safari do iPhone é o dispositivo-alvo, não o Chrome do desktop.** Gesto para áudio, barras dinâmicas, DPR 3, memória curta, 1 textura por batch. O WebKit do Playwright aproxima; o iPhone real decide a cada milestone.
5. **Orçamentos numéricos antes da feature, medição depois.** FPS, bundle, texturas e memória têm número (seção 4); "está rápido" não é medição.
6. **Uma feature = 1 lógica + 1 teste + 1–2 cenas + 1 JSON, ≤ ~300 linhas de diff.** Passou disso era duas.

## 2. Pipeline por fase (o que é específico desta pilha)

| Fase | O que fazer aqui | Gate específico |
|---|---|---|
| 2 Esqueleto | `src/main.ts` (390×844·dpr, FIT, DPR ≤ 2), `index.html` (100dvh, touch-action), `src/debug.ts`, `vite.config.ts` (chunk do Phaser + PWA), `vitest.config.ts`, `tests/setup-phaser-headless.ts`. Pronto neste repositório. | `npm run build` e `npm test` verdes |
| 3 Loop | `scripts/verify.sh` → `engine-web-phaser/scripts/verify.sh`: build → `npm test` → `vite preview` → `playtest.mjs` (iPhone 15 emulado, toques, seed, screenshot, `state.json`). | F-000 com evidência (feito: fps 59, `errors: []`) |
| 4 Direção de arte/áudio | Art bible fixa resolução-base e fator @2x; sound bible fixa `.m4a` + `.ogg`, −18 LUFS. Fonte bitmap do HUD entra aqui. | 3 assets de teste renderizados no jogo via `verify.sh` |
| 5 Features | `novo-modulo.sh <nome>` → teste `AC-n` falhando → lógica → cena fina → campos no `__GAME_DEBUG__` → `verify.sh --taps-game --seed` → crítico ≥ 7 → `done`. | `tests.log` verde + `state.json` com os campos + screenshot do critério |
| 6 Assets | Atlases JSON hash ≤ 2048² (padding 2 px) por cena; tilemaps Tiled JSON (`TilemapGPULayer` para mapas grandes); áudio por `audioSprite`; `this.textures.remove` ao sair da fase; texturas ASTC só se estourar. | nenhum `requestfailed`; planilha de texturas por cena dentro do orçamento |
| 7 IA em runtime | Sem Foundation Models na web: backend mínimo → Claude (`/ia-runtime-nuvem-claude`), consentimento antes da 1ª transmissão, fallback offline escrito. Parâmetros estruturados → geradores determinísticos com `Phaser.Math.RND`. | latência/custo medidos; jogo funciona offline |
| 8 Polimento/perf | `engenheiro-de-performance` com a tabela da seção 4; tweens e partículas com pool; `BitmapText`; filtros só em uma câmera e medidos; ícones PWA; `registerType` para `prompt` quando houver UI de atualização. | 60 fps no iPhone de referência; Lighthouse Installable |
| 9 Legal | `LICENCAS.md` com Phaser/Vite/Vitest/Workbox (MIT), TS/Playwright (Apache 2.0), Spine (licença do Editor, se usado); `PROVENANCE.md` por asset; divulgação de IA na página. | revisor-de-loja-e-legal "pronto" |
| 10 Distribuição | PWA em hospedagem estática (`/publicar-jogo-web`): `index.html`/`sw.js` sem cache longo, `/assets/*` imutável, Brotli; itch.io com tags de IA. App Store só com `/empacotar-web-para-app` (Capacitor 8.5.3, RevenueCat 13.7.3, riscos 4.2/4.7/2.5.2). | checklist de release da seção 6 arquivado em `production/releases/<versao>/` |

## 3. Arquitetura mínima (resumo; detalhe em `.claude/skills/engine-web-phaser/references/arquitetura-para-agentes.md`)

```text
src/main.ts  src/debug.ts  src/logic/*.ts (+ *.test.ts)  src/data/*.json  src/scenes/*Scene.ts  src/ui/*.ts
tests/ (Phaser HEADLESS)  public/assets/ (atlases, áudio, mapas)  vite.config.ts  vitest.config.ts
```

- Reducer puro por sistema (`reduzirPontuacao(estado, acao)`), máquina de estados em tabela, RNG e tempo injetados.
- Cena: `init()` reseta, `create()` monta e registra listeners (com `off` no `SHUTDOWN`), `update(t, dt)` despacha `tick` e chama `tick(game, chave)` do debug.
- ECS só com > ~5 tipos de entidade combináveis; nunca biblioteca nova sem ADR.
- `progress.md` mantém o mapa de módulos (uma linha por arquivo de `src/logic/`): se o humano não explica um módulo em uma linha, ele é grande demais.

## 4. Orçamentos numéricos (referência; o brief pode apertar)

| Item | Orçamento | Medido em 2026-10-10 |
|---|---|---|
| FPS | 60 estáveis no iPhone de ~4 anos; ≥ 50 no Playwright | 59 (Chromium, iPhone 15 emulado) |
| JS do jogo (`index-*.js`) | ≤ 200 KB gzip | 2,7 KB (esqueleto) |
| Chunk do Phaser | 1.374 KB / 357 KB gzip, separado e com hash estável | idem |
| Precache do SW | ≤ 15 MB na instalação; fases grandes em `runtimeCaching` | 1.345 KiB (5 entradas) |
| Texturas residentes por cena | ≤ 64 MB (4 MB/megapixel RGBA; 2048² = 16 MB) | — |
| Atlas | ≤ 2048² cada; padding 2 px; 1 textura por batch no mobile | — |
| Heap JS | < ~300 MB no Safari | — |
| DPR do canvas | ≤ 2 (780×1688) | 780×1688 |
| Primeiro frame | < 3 s em 4G; algo na tela em < 1 s | — |
| `verify.sh` | < 3 min; `npm test` < 30 s | ~25 s no total (build 1,5 s, testes 8 s, playtest ~10 s) |
| Diff por feature | ≤ ~300 linhas, ≤ ~10 arquivos | — |

## 5. Checklist de feature (o que o `ciclo-de-feature` cobra nesta pilha)

- [ ] Critério de aceite reescrito como `it('AC-n: …')` em `src/logic/<nome>.test.ts` e visto falhando
- [ ] Lógica em `src/logic/`, sem `phaser`/DOM/timers/`Math.random`; dados em `src/data/<nome>.json`
- [ ] Cena fina; reset em `init()`; `off` no `SHUTDOWN`; posições por `this.scale`; HUD em `BitmapText`
- [ ] Campos novos em `__GAME_DEBUG__` listados no critério e atualizados
- [ ] `bash scripts/verify.sh --feature F-xxx` (com `--taps-game` e `--seed` quando aplicável) saiu 0; screenshot aberto e comparado critério a critério; `state.json` e `console.log` lidos
- [ ] Sem API do Phaser 3; sem alocação em `update`; sem `Text` por frame; sem filtro novo sem medição
- [ ] Assets novos em atlas, com linha no `PROVENANCE.md`; nenhum placeholder
- [ ] Crítico ≥ 7; `feature_list.json` → `done` com `evidencia`; `progress.md` com o mapa de módulos atualizado

## 6. Checklist de release web

- [ ] `npm run build`: sem erro; `dist/sw.js`, `dist/manifest.webmanifest`; `phaser-*.js` com o mesmo hash do release anterior se a engine não mudou
- [ ] `npm test` verde; `verify.sh` verde em WebKit (Arch) e Chromium; playtest humano no iPhone (áudio após 1º toque, sem scroll por baixo, safe areas, "Adicionar à Tela de Início", offline)
- [ ] Manifest completo (name, short_name, description, theme_color igual ao meta, ícones 192/512 maskable), `apple-touch-icon` 180, `<meta name="description">`
- [ ] Orçamentos da seção 4 dentro do limite; `production/perf/<data>.md` com antes/depois
- [ ] Cabeçalhos: `index.html`/`sw.js` `no-cache`, `/assets/*` `immutable`; Brotli; `vite:preloadError` tratado
- [ ] `LICENCAS.md`, `PROVENANCE.md`, divulgação de IA, política de privacidade e classificação etária prontos (`/licencas-e-proveniencia`, `/divulgacao-de-uso-de-ia`, `/privacidade-lgpd-e-eca-digital`, `/classificacao-etaria`)
- [ ] URL pública gravada em `production/releases/web.md`; evidência no iPhone em `production/evidencias/<data>-web/`

## 7. Erros comuns de agentes em Phaser e como o harness os pega

| Erro | Como aparece | Quem pega |
|---|---|---|
| Código Phaser 3 (`setPipeline`, `preFX`, `BitmapMask`, `setTintFill`, `Geom.Point`, `Math.PI2`) | erro em runtime ou efeito ausente | `tsc` (tipos v4) no `build.log`; `pageerror` no `console.log`; regra `web-typescript.md` |
| Regra de jogo dentro da cena | não há teste; bug só no playtest | revisor-de-codigo (regra de camadas); crítico pede o `AC-n` |
| `Math.random`/`Date.now` na lógica | screenshot nunca bate; teste flaky | `--seed` não reproduz → rejeitado; grep pelo revisor |
| Número mágico de pixel | layout quebra entre DPR 1 e 2 | screenshot no iPhone 15 emulado (780×1688) vs desktop |
| `Text` por frame, PNG solto, filtro por objeto | fps < 50 no `state.json` | `playtest.mjs` marca "fps baixo"; engenheiro-de-performance |
| Listeners acumulados em `restart()` | ações duplas, `errors[]` cresce | `state.json.errors`; teste HEADLESS de restart |
| "Deveria funcionar" sem rodar | `in_progress` sem pasta de evidência | Stop hook e hook de commit |
| Placeholder/texto de IA no build | string suspeita | `scan-placeholders.sh` (PostToolUse) e `validate-commit.sh` |
| Áudio reimplementado / segundo pausador | dessincronia ao voltar do background | revisão; playtest humano no iPhone |
| Dependência nova "para resolver rápido" (ECS, UI lib, SW manual) | `package.json` muda sem ADR | revisor-de-codigo; `/escopo-e-anti-padroes` |
| Aumentar `--wait` ou pular teste para ficar verde | flakiness escondida | regra `testes.md`; crítico compara `frame` entre leituras |

## 8. Fontes

- Phaser 4.2.1 (pacote npm, 2026-10-10): README, CHANGELOG 4.0–4.2.1, `changelog/v4/4.0/MIGRATION-GUIDE.md`, `skills/` (28 skills oficiais para agentes), `docs/` (Pixel Art Guide, Rendering Concepts, Compressed Textures), `tests/TESTING.md` — https://github.com/phaserjs/phaser
- npm: `phaser` (4.0.0 em 2026-04-10, 4.2.1 em 2026-07-09), `vitest@5.0.3` (peer vite ^6.4||^7||^8), `vite-plugin-pwa@2.0.0` (peer vite ^8), `jsdom`, `@capacitor/ios@8.5.3`, `@revenuecat/purchases-capacitor@13.7.3`, `@esotericsoftware/spine-phaser-v4@4.3.13`, `phaser-box2d@1.1.0`, `@phaserjs/editor-mcp-server@1.0.6`
- Vite 8 build/chunking: https://github.com/vitejs/vite/blob/main/docs/guide/build.md ; vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa/tree/main/docs/guide ; Playwright (emulation, screenshots, clock): https://github.com/microsoft/playwright/tree/main/docs/src ; Vitest: https://github.com/vitest-dev/vitest/tree/main/docs/guide
- Anthropic, Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents ; Claude Code best practices: https://www.anthropic.com/engineering/claude-code-best-practices
- Claude-Code-Game-Studios (MIT; "a parse check is not a run"; mais documentos ≠ jogo melhor): https://github.com/Donchitos/Claude-Code-Game-Studios
- Relatos [secundários]: RTS abandonado e "2D lógico definido em código" — https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992 ; Gauntlet Loop (crítico separado) — https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design
- Phaser Editor MCP ("training levels"): https://github.com/phaserjs/editor-mcp-server ; template oficial: https://github.com/phaserjs/template-vite-ts
- App Store Review Guidelines (4.2, 4.7, 2.5.2, 3.1.1): https://developer.apple.com/app-store/review/guidelines/
- Medições deste repositório: `production/evidencias/2026-10-10-F-000/` e a execução de `verify.sh` com testes e PWA em 2026-10-10 (fps 59, 4 testes, `sw.js` gerado)
- Não lidos nesta sessão (confirmar): docs.phaser.io (incl. existência de `llms.txt`), capacitorjs.com, webkit.org, playwright.dev, vitest.dev, vite.dev
