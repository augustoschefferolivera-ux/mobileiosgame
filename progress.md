# progress.md

## Sessão 1 — brief, arquitetura e lista de features

### Estado: etapa 3 aprovada; F-001 em andamento

- [x] GDD copiado de `docs/` (branch `claude/ecstatic-sagan-g9k3x6`, commit `62872cc`) para `design/gdd/`, sem alterações.
- [x] Leitura na ordem pedida: 18, 00, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13 §1.2; 01, 14 e 17 §4 para nomes e IDs. Os docs 09, 15 e 16 não foram lidos.
- [x] `design/game-brief.md` (v2) escrito e revisado: 5 revisores independentes (números, escopo, glossário, lacunas, features), cada um com um verificador cético; os achados confirmados foram aplicados.
- [x] Brief aprovado pelo usuário em 2026-10-10, com todas as recomendações da §11 (Q-00 a Q-35). Os itens da §11.3 continuam em aberto, por feature.
- [x] Etapa 2: `docs/decisoes/ADR-0001-stack.md` (registra a decisão já tomada) e `docs/decisoes/ADR-0002-arquitetura-da-simulacao.md` (v2). Antes, pesquisa técnica (4 investigações: render da horda, loop e escala, input e áudio, Worker/TETO/determinismo) e revisão adversarial (3 lentes + verificadores; 48 achados confirmados e aplicados).
- [x] ADR-0002 aprovado pelo usuário em 2026-10-10, com todas as recomendações da §15 (item 10: opção A).
- [x] Etapa 3: `feature_list.json` (escopo, critério e evidência literais de B §4 + 99 critérios verificáveis), `src/dados/schemas/` (10 schemas), dados do MVP em `src/dados/` (com `pendentes`/`pendencias` para cada número em aberto), `src/dados/textos/pt-BR.json` (147 textos) e `tests/dados.test.ts` (40 testes; verificado por mutação). Antes, revisão adversarial (3 lentes + verificadores; 39 achados confirmados e aplicados).
- [x] Etapa 3 aprovada pelo usuário em 2026-10-11, inclusive as [proposta de teste] e [proposta a aprovar] do feature_list.
- [ ] Etapa 4: F-001 (cria também `scripts/verify.sh` e `scripts/novo-modulo.sh`).

### Como rodar
- `npm install` e depois `npm test` (Vitest) e `npm run typecheck` (tsc).

### Ambiente
- Não existem: `CLAUDE.md`, `playbook/`, os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature`, `/critico-independente`, `scripts/` e ADR-0001.
- Há um Stop hook do ambiente que exige commit e push; não há o hook de verify/evidência/crítico do doc 19.
- Versões conferidas no npm em 2026-10-10: phaser 4.2.1, vite 8.x, typescript 5.9.x; Node 22.22.
- As skills oficiais do Phaser existem (`node_modules/phaser/skills/`, 28 assuntos). Para a etapa 2 foram lidas: game-setup-and-config, scale-and-responsive, scenes, time-and-timers, v4-new-features, v3-to-v4-migration, sprites-and-images, graphics-and-shapes, groups-and-containers, render-textures, particles, game-object-components, text-and-bitmaptext, cameras, input-keyboard-mouse-touch, audio-and-sound, geometry-and-math.

### Retomada
Ler este arquivo, depois `design/game-brief.md` §11 (questões) e a resposta do usuário. Não começar a F-002 nesta sessão (instrução da Sessão 1).
