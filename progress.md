# progress.md

## Sessão 1 — brief, arquitetura e lista de features

### Estado: etapa 1 aprovada; etapa 2 (ADRs) em andamento

- [x] GDD copiado de `docs/` (branch `claude/ecstatic-sagan-g9k3x6`, commit `62872cc`) para `design/gdd/`, sem alterações.
- [x] Leitura na ordem pedida: 18, 00, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13 §1.2; 01, 14 e 17 §4 para nomes e IDs. Os docs 09, 15 e 16 não foram lidos.
- [x] `design/game-brief.md` (v2) escrito e revisado: 5 revisores independentes (números, escopo, glossário, lacunas, features), cada um com um verificador cético; os achados confirmados foram aplicados.
- [x] Brief aprovado pelo usuário em 2026-10-10, com todas as recomendações da §11 (Q-00 a Q-35). Os itens da §11.3 continuam em aberto, por feature.
- [ ] Etapa 2: `docs/decisoes/ADR-0001-stack.md` (registra a decisão já tomada) e `docs/decisoes/ADR-0002-arquitetura-da-simulacao.md`. Depende das Q-00 a Q-11.
- [ ] Etapa 3: `feature_list.json` (critérios literais de B §4), `src/dados/schemas/`, `tests/dados.test.ts`.
- [ ] Etapa 4: F-001 (cria também `scripts/verify.sh` e `scripts/novo-modulo.sh`).

### Ambiente
- Não existem: `CLAUDE.md`, `playbook/`, os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature`, `/critico-independente`, `scripts/` e ADR-0001.
- Há um Stop hook do ambiente que exige commit e push; não há o hook de verify/evidência/crítico do doc 19.
- Versões conferidas no npm em 2026-10-10: phaser 4.2.1, vite 8.x, typescript 5.9.x; Node 22.22.

### Retomada
Ler este arquivo, depois `design/game-brief.md` §11 (questões) e a resposta do usuário. Não começar a etapa 3 sem a aprovação do ADR-0002.
