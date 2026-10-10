# Prompt inicial — Vigília das Cinzas (cole em uma nova conversa do Claude Code aberta na raiz deste repositório)

Pré-requisito: os arquivos do Documento de Design (`00-visao-geral.md` … `14-live-ops-retencao-e-comunidade.md`)
devem estar em `design/gdd/`. Sem eles o agente deve parar e pedir.

---

Leia, nesta ordem: `CLAUDE.md`, `playbook/00-leia-primeiro.md`, `design/vigilia-das-cinzas/briefing-tecnico.md`
e `playbook/08-praticas-de-producao-web-phaser.md`. Depois rode `/checkpoint-e-retomada`.

## O jogo

Vigília das Cinzas (Ashen Vigil): survivor-like com combate soulslike para iPhone em retrato.
Vigílias de 20 minutos em 4 Horas, Fogueiras, Apagar/Amanhecer, hub Santuário das Brasas, 12 Vigilantes,
38 armas, 18 passivas, 34 Uniões, 20 Relíquias, 32 inimigos, 13 chefes, 6 regiões, árvore de 112 nós,
Ciclos e Pactos. Classificação alvo 12+. Monetização: nenhuma no primeiro lançamento (PWA; App Store depois).
O GDD está em `design/gdd/`: leia `00`, `02`, `03`, `04`, `05`, `06`, `07`, `08` e `11` antes de qualquer
código; `01` e `14` só para nomes e glossário. Se `design/gdd/` não existir, pare e me peça os arquivos.
Use sempre o glossário oficial (Vigília, Amanhecer, Apagar, Fogueira, Oco, Brasa, Alma, Cinzas, Ciclo, Pacto,
União); "run", "checkpoint", "zumbi" e "roguelike" nunca aparecem em código, dados ou tela.

## Como trabalhar (vale para toda sessão)

- Stack decidido: Phaser 4.2.1 + TypeScript 5.9 + Vite 8 (ADR-0001). Não discuta engine.
- Antes de escrever código de qualquer subsistema do Phaser, leia a skill oficial correspondente em
  `node_modules/phaser/skills/<assunto>/SKILL.md`. Não reinvente o que ela cobre.
- Arquitetura obrigatória: simulação pura em `src/logica/` (sem Phaser, passo fixo 60 Hz, RNG com seed,
  entidades em arrays tipados, grade espacial própria para hordas) e cenas finas em `src/cenas/`.
  Conteúdo (armas, inimigos, chefes, regiões, nós, textos) só em `src/dados/*.json` com JSON Schema
  e teste de integridade referencial. Nenhuma string visível no código: tudo em `src/dados/textos/pt-BR.json` por id.
- Orçamento: 60 fps em iPhone 12 com 300 inimigos + 200 projéteis; ≤ 150 draw calls; atlases ≤ 2048² @2x;
  zero alocação por frame no caminho quente; `window.__GAME_DEBUG__` expõe fps, entidades vivas e passo.
- Uma feature por sessão, em `feature_list.json`. "Pronto" = `scripts/verify.sh --feature F-xxx` verde
  (build, Vitest, Playwright com `--taps-game` e `--seed`), evidência em `production/evidencias/`,
  `/critico-independente` ≥ 7, commit descritivo. O Stop hook não deixa encerrar sem isso.
- Diff pequeno (≤ ~300 linhas), módulo pequeno, `scripts/novo-modulo.sh` para criar lógica + teste + cena.
- Decisão de design que não está no GDD nem no briefing: pare e pergunte. Registre decisões técnicas em
  `docs/decisoes/ADR-000N-*.md` e em `progress.md`.
- Ao final de cada sessão: commit e `/checkpoint-e-retomada`.

## Sessão 1 (esta): brief, arquitetura e lista de features — pare para eu aprovar em cada etapa

1. `/brief-do-jogo` a partir do GDD, com o MVP fixado como a fatia vertical "Primeira Vigília" do briefing
   técnico (seção 4): 1 Vigilante (Aldric), 1 região (Charneca das Lanternas), 3 inimigos, 1 chefe
   (O Lanterneiro), 3 armas + 2 passivas + 1 União, Fogueira, Apagar, Amanhecer, Santuário mínimo.
   Escreva `design/game-brief.md` e PARE para eu aprovar.
2. `docs/decisoes/ADR-0002-arquitetura-da-simulacao.md`: passo fixo, SoA, grade espacial, arquétipos de arma,
   diretor por timeline, máquina de estados da Vigília, save versionado — com os números do briefing.
   PARE para eu aprovar.
3. `feature_list.json` com F-001 a F-010 exatamente como a tabela do briefing técnico, cada uma com
   critério de aceite verificável por teste, screenshot ou `__GAME_DEBUG__`, e evidência exigida.
   Crie também `src/dados/schemas/` com os JSON Schemas de arma, inimigo, chefe, região/timeline, nó da
   árvore e texto, e o teste de integridade em `tests/dados.test.ts`. PARE para eu aprovar.
4. Só então comece F-001 com `/ciclo-de-feature`. Não comece F-002 nesta sessão.

## Sessões seguintes

```text
/checkpoint-e-retomada
/ciclo-de-feature na próxima feature de feature_list.json
Leia a skill oficial do Phaser do assunto antes de codar. Só feche com verify verde, evidência e crítico ≥ 7.
Decisão fora do GDD/briefing: pare e pergunte. Ao final: commit e /checkpoint-e-retomada.
```

Arte, áudio e textos finais só depois de F-010 (fatia vertical jogável em iPhone real), começando por
`/direcao-de-arte-e-style-card` e `/direcao-de-audio-e-sound-bible`, com aprovação minha antes de gerar
qualquer asset. Até lá, use formas geométricas e cores da paleta provisória (cinza-azulado e brasa).
