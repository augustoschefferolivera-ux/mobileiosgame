---
name: iniciar-projeto
description: >
  Inicializa um projeto de jogo do zero no padrão de agente inicializador da Anthropic adaptado a jogos:
  entrevista curta → brief de uma página → ADR de engine e alvo → gera init.sh, feature_list.json (JSON, com
  critério de aceite verificável e evidência exigida por feature), progress.md e production/evidencias/ →
  instala ferramentas → monta o loop de verificação ANTES da primeira feature → primeiro commit. Modo de rigor
  padrão `minimal` (um único documento de design). Use sempre que o usuário disser "novo jogo", "começar o
  projeto", "tenho uma ideia de jogo", "setup inicial", ou quando o repositório não tiver feature_list.json.
  Não use para retomar um projeto existente (/checkpoint-e-retomada) nem para implementar features
  (/ciclo-de-feature).
license: MIT
compatibility: "Claude Code aberto na RAIZ do repositório (hooks e .mcp.json só carregam ali); macOS para alvo iOS"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [0, 1, 2, 3]
argument-hint: "[ideia do jogo em uma frase]"
disable-model-invocation: false
user-invocable: true
---

# Iniciar projeto

Entrega um repositório inicializado — `design/game-brief.md`, `docs/decisoes/ADR-0001-engine-e-alvo.md`, `init.sh`, `feature_list.json`, `progress.md`, o despachante `./scripts/verify.sh` — com a feature F-000 ("o loop de verificação funciona") marcada `done` com screenshot em `production/evidencias/`, e um primeiro commit.

## Quando usar / quando não usar

- **Use** uma vez por projeto, na primeira sessão, antes de qualquer linha de gameplay.
- **Use** também para "re-inicializar" um protótipo solto que nunca teve harness (não tem `feature_list.json`): o fluxo é o mesmo, só pula o esqueleto da engine.
- **Não use** se `feature_list.json` já existe: rode `/checkpoint-e-retomada`. Não use para escrever GDDs longos (ver "Por que `minimal`" abaixo).

## Pré-requisitos

- Claude Code iniciado na raiz do repositório (`claude` na pasta com `CLAUDE.md`); em subpasta os hooks, as permissões e o `.mcp.json` não carregam.
- `git` inicializado. Para alvo iOS, um Mac com Xcode 26.3+ (ver `/instalar-ferramentas`).
- Os templates deste banco em `templates/` (`game-brief.md`, `feature_list.json`, `progress.md`, `init.sh`, `adr.md`, `test-evidence.md`, `session-state.md`).

## Entradas

- A ideia do jogo, em qualquer forma (uma frase basta).
- As respostas da entrevista do passo 1. Nada mais: este fluxo cria tudo o que as outras skills leem.

## Passos

1. **Entrevista curta** (uma rodada, ≤ 8 perguntas; use `AskUserQuestion` quando disponível; aceite "não sei" e proponha um padrão):
   1. O jogo em uma frase e um jogo de referência.
   2. 2D ou 3D? Alvo: app iOS, web, ou ambos? Android depois?
   3. Dispositivo mínimo e orientação (retrato/paisagem).
   4. Sessão média (minutos) e se joga offline.
   5. Monetização pretendida (premium / anúncios / IAP leve) e faixa etária (loot box = A18 no Brasil; chat com IA conta na classificação).
   6. O que já existe (repositório, assets, protótipo) e o que o usuário sabe fazer sozinho (Swift? C#? nada?).
   7. Orçamento: horas por semana, US$/mês em APIs de geração, limite de tokens.
   8. Há algo que o usuário NÃO quer no jogo (multiplayer, save na nuvem, texto gerado em runtime)?

2. **Brief de uma página.** Invoque `/brief-do-jogo` com as respostas; resultado: `design/game-brief.md` (≤ ~80 linhas) com MVP de ≤ 7 itens, cada um com um observável. É o único documento de design do projeto neste modo.

3. **Engine e alvo.** Invoque `/escolher-engine-e-alvo`; resultado: `docs/decisoes/ADR-0001-engine-e-alvo.md` (status `Proposto` até o usuário dizer "aceito") e `production/engine.txt` com o nome canônico (`spritekit`, `realitykit`, `unity`, `godot`, `phaser`, `threejs`, `capacitor`). Peça a aceitação explícita antes de seguir: features que dependem de ADR `Proposto` ficam `blocked`.

4. **Esqueleto do harness** (nunca sobrescreva o que já existe):

```bash
mkdir -p production/evidencias production/criticas production/session-state production/session-logs docs/decisoes design scripts
cp -n templates/feature_list.json feature_list.json
cp -n templates/progress.md progress.md
cp -n templates/init.sh init.sh && chmod +x init.sh
```

   Edite `feature_list.json`: mantenha `F-000` como está; transforme cada item do MVP em uma feature `F-00N` com `titulo`, `descricao`, `criterio_de_aceite` (2–4 itens, cada um verificável por teste, screenshot, `debug_state.json` ou log), `evidencia_exigida`, `depende_de` e `status: "todo"`. Vocabulário de status que os hooks leem: `todo`, `in_progress`, `done`, `blocked` (com `motivo`), `cut`. Valide:

```bash
python3 -I -c "import json; d=json.load(open('feature_list.json')); print(len(d['features']), 'features')"
```

   Preencha o cabeçalho de `progress.md` (nome, branch) e o `PROJETO` em `init.sh`.

5. **Esqueleto da engine.** Invoque a skill de engine indicada pelo ADR (`engine-web-phaser`, `engine-web-threejs`; as demais engines foram removidas deste repositório — ADR-0001) só no passo "esqueleto do projeto": um app vazio que compila e mostra uma tela inicial com o nome do jogo. Nenhuma mecânica ainda.

6. **Ferramentas.** Invoque `/instalar-ferramentas` para a engine/alvo; resultado: `docs/ambiente.md` e o verificador de ambiente saindo 0.

7. **Loop de verificação — antes da primeira feature.** Invoque `/montar-loop-de-verificacao`; resultado: `./scripts/verify.sh` (despachante) e o canal de depuração instalados. Depois feche F-000 de verdade:

```bash
DATA=$(date +%F)
bash scripts/verify.sh --feature F-000 --out "production/evidencias/${DATA}-F-000"
```

   Olhe o `screenshot.png` com a ferramenta Read. Se for a tela inicial esperada, em `feature_list.json` ponha `F-000` como `done`, `evidencia: "production/evidencias/<data>-F-000"`, `evidencia_commit` (preencha após o commit) e `evidencia_data`. Um parse check não é uma execução: sem o PNG, F-000 continua `todo`.

8. **Smoke do init.** `bash init.sh --check` deve sair 0. Se reclamar de ferramenta, volte ao passo 6.

9. **CLAUDE.md do jogo.** Na seção "Stack deste projeto" do `CLAUDE.md`, preencha engine, versão fixada, alvo e orientação a partir do ADR (três a cinco linhas; o resto do arquivo não muda).

10. **Primeiro commit.** Adicione só o que criou (pastas `design`, `docs`, `scripts`, `production`, mais `feature_list.json`, `progress.md`, `init.sh`, `CLAUDE.md` e a pasta da engine) e faça um commit com mensagem no formato `chore(init): inicializa <nome do jogo> — brief, ADR-0001 (<engine>/<alvo>), harness e loop de verificação (F-000 com evidência)`. O hook `PreToolUse` deste repositório bloqueia commit com placeholder nos arquivos ou com feature `done` sem evidência; se bloquear, corrija em vez de contornar.

11. **Checkpoint.** Preencha o bloco CHECKPOINT de `progress.md` (próximo passo: `/ciclo-de-feature F-001`) e anexe a "sessão 1" ao histórico. Com nenhuma feature `in_progress`, o Stop hook deixa a sessão encerrar.

### Por que o rigor padrão é `minimal`

O template Claude-Code-Game-Studios construiu quatro jogos do mesmo brief em níveis diferentes de rigor documental. O modo `minimal` escreveu 1 documento (o brief) antes da primeira linha de código; o `standard`, 30 documentos e 58 minutos. Todos produziram um jogo rodando e testado; dois revisores cegos e um playtest humano classificaram o build `standard` em **último** — "the extra 29 documents bought traceability, not a better game". A Anthropic relata o mesmo padrão em agentes de longa duração: o que falha é "one-shot the app" e declarar pronto cedo demais, e o que resolve é inicializador + lista de features em JSON + uma feature por sessão + verificação ponta a ponta — não documentação. Suba o rigor (GDD por sistema, ADR por decisão, revisão em dupla) quando houver sinal: mais de uma pessoa editando, publisher pedindo rastreabilidade, > 30 features, ou exigência regulatória.

## Critério de pronto e evidência

- Existem: `design/game-brief.md`, `docs/decisoes/ADR-0001-engine-e-alvo.md` (status `Aceito`), `production/engine.txt`, `feature_list.json` válido, `progress.md` com CHECKPOINT preenchido, `init.sh` executável, `./scripts/verify.sh`, `docs/ambiente.md`.
- `production/evidencias/<data>-F-000/` contém `screenshot.png` da tela inicial, log de execução e `verify.meta` com `exit: 0`; `F-000` está `done` apontando para essa pasta.
- `bash init.sh --check` sai 0; `git log --oneline -1` mostra o commit `chore(init)`.
- Nenhuma feature `in_progress` ao encerrar (o Stop hook `stop-gate.sh` confirma).

## Armadilhas conhecidas

- **Tentar o jogo inteiro de uma vez** ("one-shot the app") e **declarar pronto cedo** são os dois modos de falha que a Anthropic documentou; a lista em JSON e uma feature por sessão existem para isso.
- **GDD antes do loop**: a prioridade do dia 1 é o ciclo construir→rodar→screenshot→log, não o documento (conclusão do relatório e do teste cego do Game Studios).
- **Escolher engine antes do brief**: o brief decide 2D/3D, IAP, offline e dispositivo mínimo, que são exatamente os critérios da matriz de engine.
- **Claude Code em subpasta**: hooks, deny rules e `.mcp.json` só carregam quando a sessão começa na raiz (README do Game Studios; `CLAUDE.md` deste repositório).
- **Deixar feature `in_progress` ao encerrar**: o Stop hook bloqueia o fim do turno (até o limite de 8 continuações do Claude Code); pause com `blocked` + `motivo`.
- **Instruções só na conversa** se perdem na compactação; o que importa vai para `progress.md`, `CLAUDE.md` ou um ADR.
- **Segredos** (API keys) nunca entram em arquivo versionado; `.gitignore` já ignora `.env*`.
- **iOS sem Mac** não existe: export iOS do Godot, Unity e Xcode exigem macOS; sem Mac, comece pelo alvo web e empacote depois.
- **Expectativa de receita**: fly.pieter.com caiu de US$ 1 M ARR autodeclarado para US$ 144 K ARR em dois meses; Spell Cascade (Godot, "100% Claude Code") faturou US$ 4,99 em 30 dias. Trate o primeiro título como validação.

## Fontes

- Anthropic — Effective harnesses for long-running agents (inicializador, `init.sh`, lista em JSON, uma feature por sessão): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic — Claude Code best practices (verificação, Stop hook, subagente revisor): https://www.anthropic.com/engineering/claude-code-best-practices
- Donchitos/Claude-Code-Game-Studios — "Does it produce games, or documents?" e rigor `minimal` (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Claude Code — Hooks (Stop, cap de 8 continuações): https://code.claude.com/docs/en/hooks
- Claude Code — Memória e CLAUDE.md: https://code.claude.com/docs/en/memory
- Medium (chierhu) — Spell Cascade e padrão dos fracassos: https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992
- Indie Hackers — fly.pieter.com US$ 144 K ARR (mai/2025): https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9
- Relatório interno `reports/Criação de jogos totalmente por IA.md` (seções "O teto hoje…" e "Conclusão").
