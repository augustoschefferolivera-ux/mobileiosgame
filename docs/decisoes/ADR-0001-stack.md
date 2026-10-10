# ADR-0001 — Stack: Phaser 4.2.1 + TypeScript 5.9 + Vite 8

- **Status:** aceito (decisão do usuário, registrada em 2026-10-10)
- **Contexto da decisão:** Sessão 1. O ADR é escrito depois do fato, porque o prompt da sessão (doc 19) cita o ADR-0001 como já decidido, mas o arquivo não existia no repositório.

## Contexto

O doc 12 §3 recomenda **PixiJS 8 + simulação própria em TypeScript** e aceita **Phaser 4** "se a equipe priorizar velocidade de desenvolvimento e aceitar um teto um pouco menor de inimigos". O jogo é web por definição: PWA para iPhone em retrato, Safari iOS 17+. O orçamento é de 300 inimigos (iPhone 11/12) ou 500 (iPhone 14+), ≤ 150 draw calls e < 150 MB.

## Decisão

| Peça | Versão | Observação |
|---|---|---|
| Engine | **Phaser 4.2.1** (fixada, sem `^`) | Usada como renderer, carregador de assets, cenas, input e áudio. A simulação **não** depende do Phaser (ADR-0002). |
| Linguagem | **TypeScript 5.9** | `strict` ligado. |
| Build | **Vite 8** | Dev server e build de produção. |
| Testes | Vitest + Playwright | Exigidos pela definição de Pronto (B §4). As versões serão fixadas na F-001. |

As três versões foram conferidas no npm em 2026-10-10 (phaser 4.2.1; vite 8.x; typescript 5.9.x). O ambiente tem Node 22.22.

**Não se discute engine** nas próximas sessões. O ADR-0001 prevalece sobre a recomendação de PixiJS do doc 12.

## Consequências

- **Custo por objeto.** O Phaser tem mais overhead por objeto que um renderer puro (doc 12 §3: "~2× de vantagem ao Pixi em cenas com muitos sprites"). A mitigação está no ADR-0002: simulação em arrays tipados fora do Phaser, render da horda em lote a partir de pools e medição desde a F-003, com CPU 4× mais lenta.
- **Skills oficiais.** O Phaser 4.2.1 traz skills oficiais em `node_modules/phaser/skills/<assunto>/SKILL.md` (37 assuntos, conferido em 2026-10-10). Antes de codar qualquer subsistema do Phaser, a skill do assunto é lida, e o que ela cobre não é reinventado.
- **Isolamento da engine.** Toda dependência do Phaser fica em `src/cenas/` (e em `src/plataforma/`, se for preciso). `src/logica/` não importa `phaser`, e isso é verificado por lint (ADR-0002).
