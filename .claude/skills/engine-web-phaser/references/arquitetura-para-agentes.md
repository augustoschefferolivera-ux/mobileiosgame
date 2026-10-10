# Arquitetura de um jogo Phaser 4 + TypeScript que agentes mantêm bem

Objetivo: o agente (e o humano que revisa) nunca perder a "propriedade mental" do código. O único caso público de projeto 100% IA abandonado por motivo técnico foi um RTS em que o dev "não conseguia mais corrigir" a base gerada (relato citado em chierhu.medium.com, 2026, [secundário]). O remédio documentado é arquitetura pequena, módulos com interface explícita e verificação mecânica — não prompts maiores.

## 1. Regra de ouro: lógica pura fora do Phaser, cena fina dentro

| Camada | Pasta | Pode importar | Testada por | Tamanho-alvo |
|---|---|---|---|---|
| Lógica pura (regras, estado, balanceamento) | `src/logic/` | só `src/logic/**` e `src/data/*.json` | Vitest, ambiente `node`, milissegundos | ≤ ~200 linhas por arquivo |
| Dados de balanceamento | `src/data/*.json` | — | validados por teste de schema simples | um JSON por sistema |
| Cenas (Phaser) | `src/scenes/*Scene.ts` | `phaser`, `src/logic`, `src/debug` | Playwright (`scripts/verify.sh`), Phaser HEADLESS quando precisar | ≤ ~150 linhas por cena |
| Infra | `src/main.ts`, `src/debug.ts`, `src/pwa.ts` | tudo | `verify.sh` | não cresce com features |

Por que funciona com agentes: a lógica pura é "definida em texto", determinística e testável sem navegador — exatamente o perfil em que os relatos de 2025–2026 dizem que o Claude Code rende mais (2D, lógico, definido em código) [secundário]. A cena vira um adaptador: toque → ação → `reduzir()` → desenhar. Se a cena tem um `if` de regra de jogo, ele está no lugar errado.

```text
src/
  main.ts            GameConfig (390×844 retrato, FIT, DPR ≤ 2), lista de cenas, visibilitychange
  debug.ts           window.__GAME_DEBUG__ (scene, score, fps, frame, lastEvent, errors[]) — lido pelo Playwright
  logic/             funções puras: reduzir<Sistema>(estado, acao) → estado novo; máquinas de estado; RNG injetado
    pontuacao.ts  pontuacao.test.ts
    fase.ts       fase.test.ts
  data/              JSON de balanceamento: velocidades, pontos, tabelas de spawn, curvas de dificuldade
  scenes/            BootScene PreloadScene MenuScene GameScene HudScene PauseScene (uma responsabilidade cada)
  ui/                fábricas de botões/painéis Phaser reutilizáveis (sem regra de jogo)
public/assets/       atlases JSON hash (+ .png/.webp), áudio .m4a/.ogg, fontes bitmap, tilemaps Tiled JSON
tests/               setup-phaser-headless.ts + testes que precisam de objetos Phaser reais (jsdom + Phaser.HEADLESS)
```

Gerar o trio de uma vez: `bash .claude/skills/engine-web-phaser/scripts/novo-modulo.sh <nome>` (lógica + teste que falha + cena fina + JSON).

## 2. Padrão de módulo de lógica pura (reducer)

```ts
// src/logic/pontuacao.ts — sem import de 'phaser', sem DOM, sem timers, sem Math.random solto
import dados from '../data/pontuacao.json';

export interface PontuacaoEstado { readonly pontos: number; readonly combo: number; readonly multiplicador: number; }
export type PontuacaoAcao =
  | { tipo: 'acerto'; precisao: number }   // 0..1
  | { tipo: 'erro' }
  | { tipo: 'tick'; dtMs: number };

export const pontuacaoInicial: PontuacaoEstado = { pontos: 0, combo: 0, multiplicador: 1 };

export function reduzirPontuacao(e: PontuacaoEstado, a: PontuacaoAcao): PontuacaoEstado {
  switch (a.tipo) {
    case 'acerto': {
      const combo = e.combo + 1;
      const multiplicador = Math.min(dados.multiplicadorMax, 1 + Math.floor(combo / dados.acertosPorNivel));
      return { pontos: e.pontos + Math.round(dados.base * a.precisao * multiplicador), combo, multiplicador };
    }
    case 'erro':
      return { ...e, combo: 0, multiplicador: 1 };
    case 'tick':
      return e;
  }
}
```

Regras do reducer: entrada imutável (`readonly`), saída nova, `switch` exaustivo sobre união discriminada (o TypeScript acusa caso esquecido), aleatoriedade recebida como função `rng: () => number` ou como `Phaser.Math.RandomDataGenerator` injetado — nunca `Math.random()` dentro da lógica (impede teste determinístico e screenshot reproduzível).

## 3. Cena fina (adaptador)

```ts
// src/scenes/GameScene.ts
export class GameScene extends Phaser.Scene {
  private estado = pontuacaoInicial;
  private hud!: Phaser.GameObjects.BitmapText;

  constructor() { super('game'); }
  init(): void { this.estado = pontuacaoInicial; }            // reset a cada start/restart (não no constructor)
  create(): void {
    debug.scene = 'game';
    this.hud = this.add.bitmapText(this.scale.width / 2, 96, 'hud', '0', 56).setOrigin(0.5);
    this.input.on('pointerdown', this.aoTocar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointerdown', this.aoTocar, this));
  }
  private aoTocar(p: Phaser.Input.Pointer): void { this.aplicar({ tipo: 'acerto', precisao: this.precisaoDe(p) }); }
  private aplicar(acao: PontuacaoAcao): void {
    this.estado = reduzirPontuacao(this.estado, acao);
    debug.score = this.estado.pontos;                          // Playwright lê window.__GAME_DEBUG__.score
    this.hud.setText(String(this.estado.pontos));
  }
  update(_t: number, dt: number): void { this.aplicar({ tipo: 'tick', dtMs: dt }); tick(this.game, 'game'); }
}
```

Coordenadas: **nunca número mágico em pixels**. `src/main.ts` cria o canvas em `390*dpr × 844*dpr` com `zoom: 1/dpr` (DPR 1 → 390×844; DPR ≥ 2 → 780×1688), logo `this.scale.width` muda por dispositivo. Posicione por fração (`width * 0.5`, `height - 160 * escala`) ou por constantes derivadas de `this.scale` em `create()`.

## 4. Máquina de estados explícita (fluxo do jogo e entidades)

```ts
// src/logic/fluxo.ts
export type Fase = 'boot' | 'menu' | 'jogando' | 'pausado' | 'fim';
export type EventoFluxo = 'iniciar' | 'pausar' | 'retomar' | 'morrer' | 'voltarAoMenu';

const transicoes: Record<Fase, Partial<Record<EventoFluxo, Fase>>> = {
  boot: { iniciar: 'menu' },
  menu: { iniciar: 'jogando' },
  jogando: { pausar: 'pausado', morrer: 'fim' },
  pausado: { retomar: 'jogando', voltarAoMenu: 'menu' },
  fim: { voltarAoMenu: 'menu', iniciar: 'jogando' },
};

export function transitar(fase: Fase, evento: EventoFluxo): Fase {
  const proxima = transicoes[fase][evento];
  if (!proxima) throw new Error(`transição inválida: ${fase} + ${evento}`);
  return proxima;
}
```

A tabela é dado (testável em 5 linhas: toda transição listada existe; eventos fora da tabela lançam). A cena só chama `this.scene.start(mapaDeCena[proxima])`. Para entidades (inimigo `patrulha → persegue → ataca`), mesmo padrão com `dtMs` no evento `tick`. Não use `setInterval`/`setTimeout` para lógica: tempo entra como `dtMs` do `update(time, delta)` do Phaser (pausa, `timeScale` e testes passam a funcionar).

## 5. Dados de balanceamento em JSON

- `src/data/<sistema>.json` com `_sobre` explicando cada campo; importado estaticamente (`import dados from '../data/x.json'` — o `tsconfig` com `moduleResolution: bundler` resolve JSON sem flag extra; confirmado com `tsc --noEmit` neste repositório em 2026-10-10).
- Um teste por JSON garante invariantes (valores positivos, tabelas somando 1, níveis em ordem). Ajustar dificuldade vira diff de 1 linha em JSON, não refatoração.
- Conteúdo grande (fases, ondas) fica em `public/assets/data/*.json` carregado por `this.load.json` no `PreloadScene` e validado por uma função pura `validarFase(json): Fase | Erro` antes de uso.

## 6. ECS leve ou não?

Para o MVP típico (puzzle, arcade, runner, idle, cards) **não**: `Phaser.GameObjects.Group` para pooling, `Container` para UI composta e reducers por sistema bastam e são o que o modelo mais acertou. Considere um ECS mínimo (arrays de componentes + funções `sistemaX(entidades, dt)`) só quando houver > ~5 tipos de entidade com comportamentos combináveis; mesmo assim mantenha os sistemas em `src/logic/` e o Phaser só como "view". Nunca introduza biblioteca de ECS sem uma linha de ADR.

## 7. Convenções que reduzem erro do agente

- Nomes: pastas e arquivos de lógica/dados em kebab-case pt-BR sem acento (`combo-de-ataque.ts`); classes Phaser em PascalCase com sufixo (`GameScene`, `BotaoPrimario`); chaves de cena em snake_case (`'game'`, `'pause_overlay'`); chaves de asset iguais ao nome do arquivo sem extensão.
- Interfaces explícitas na fronteira: toda função exportada tem tipos de entrada/saída nomeados; `any` proibido; `noUncheckedIndexedAccess` ligado (já está no `tsconfig.json`).
- Um `index.ts` por pasta de lógica **não**: imports diretos tornam o grafo visível ao `grep`.
- Eventos entre cenas via `this.registry`/`this.events` com nomes em constante (`EVENTOS.pontuou`), nunca string solta duplicada.
- Cada feature acrescenta no máximo: 1 módulo de lógica + 1 teste + alterações em 1–2 cenas + 1 JSON. Passou disso, a feature era duas (`/ciclo-de-feature`, ~300 linhas de diff).
- `progress.md` mantém um "mapa de módulos" de uma linha por arquivo de `src/logic/` — é o que o humano lê para saber se ainda entende o jogo.

## 8. Canal de depuração como contrato

`window.__GAME_DEBUG__` (`src/debug.ts`) é a API que o Playwright, o crítico e o humano leem. Toda feature declara, no critério de aceite, quais campos expõe (ex.: `combo`, `fase`, `inimigosVivos`). Regras: só valores serializáveis (JSON), atualizados no `update()` da cena ativa, `errors[]` alimentado por `window.onerror`/`unhandledrejection`. Um estado que não aparece ali não é verificável, e o que não é verificável não fecha.

## 9. Onde o modelo mais erra em Phaser (e a arquitetura evita)

| Erro frequente | Sintoma | Prevenção estrutural |
|---|---|---|
| Regra de jogo dentro de `update()` da cena | impossível testar; bugs só no playtest | reducer puro + `update` que só despacha `tick` |
| `Math.random()`/`Date.now()` espalhados | screenshot nunca bate; flakiness | RNG injetado (`Phaser.Math.RND` com `seed` da config) e tempo via `dt` |
| Listeners acumulados a cada `scene.restart()` | ações duplicadas, memória | `events.once(SHUTDOWN, …off…)` em toda cena (gotcha oficial do Phaser) |
| API do Phaser 3 em projeto Phaser 4 (`setPipeline`, `preFX`, `BitmapMask`, `Geom.Point`) | erro em runtime ou efeito ausente | `references/phaser4-mudancas-e-armadilhas.md`; `node_modules/phaser/skills/v3-to-v4-migration/SKILL.md` |
| Texto `Text` atualizado por frame | FPS cai no iPhone | HUD em `BitmapText` (fonte bitmap no atlas) |
| Números mágicos de pixel | layout quebra em DPR 1 vs 2 | tudo relativo a `this.scale` |

## Fontes

- Phaser 4.2.1 — skills oficiais embutidas no pacote npm (lidas em 2026-10-10): `node_modules/phaser/skills/scenes/SKILL.md` (gotchas 13–16: reset em `init`, limpeza em `shutdown`), `events-system` (vazamento de listeners), `groups-and-containers` (pooling com `maxSize`/`get`), `text-and-bitmaptext` (gotcha 14), `data-manager` (`registry`). Espelho público: https://github.com/phaserjs/phaser/tree/master/skills
- Anthropic, Effective harnesses for long-running agents (feature list em JSON, uma feature por sessão, verificação end-to-end): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Relato do RTS abandonado e "Claude Code rende mais em jogos 2D lógicos definidos em código" [secundário]: https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992
- Claude-Code-Game-Studios (MIT): mais documentos não produziram jogo melhor; evidência obrigatória: https://github.com/Donchitos/Claude-Code-Game-Studios
- Template oficial Phaser + Vite + TS (estrutura `src/game/scenes`, `public/assets`, `base: './'`): https://github.com/phaserjs/template-vite-ts (package.json lido em 2026-10-10: phaser 4.0.0, vite ^6.3.1)
