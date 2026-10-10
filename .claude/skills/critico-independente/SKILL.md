---
name: critico-independente
description: >
  Invoca o subagente `critico` (.claude/agents/critico.md) em contexto limpo para avaliar uma feature, build ou
  asset ANTES de fechá-lo: entrega brief, critério de aceite, screenshots/vídeo, logs e métricas; recebe nota 0–10
  por critério e lista de defeitos reproduzíveis; roda o "Gauntlet Loop" (construir → criticar → corrigir) com
  limite de rodadas e registra as notas em production/criticas/. Rubrica objetiva: crash, FPS (MetricKit/log),
  checklist de aceite, legibilidade, consistência com o style card, game feel, placeholders, comparação cega com
  referência. Use sempre que uma feature visível estiver prestes a virar done, quando o usuário pedir "revisar",
  "avaliar", "está bom?", "nota", "QA", "playtest crítico" ou "comparar com o jogo X". Não use para implementar
  (/ciclo-de-feature) nem para revisar só código (subagente revisor-de-codigo).
license: MIT
compatibility: "Claude Code (subagentes); funciona em Codex apenas de forma manual, colando o pacote de evidência"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [5, 8]
argument-hint: "[F-xxx] [--referencia caminho/da/imagem] [--rodadas 3]"
disable-model-invocation: false
user-invocable: true
---

# Crítico independente

Entrega `production/criticas/<data>-<id>-rodada-<n>.md` com nota 0–10 por critério, nota final, defeitos reproduzíveis e veredito; a feature só fecha com nota final ≥ 7 e sem defeito crítico aberto, e cada rodada fica registrada em `production/criticas/notas.csv`.

## Quando usar / quando não usar

- **Use** no passo 8 de `/ciclo-de-feature` para toda feature visível, antes de `done`; em marcos (vertical slice, build de TestFlight); ao comparar com um jogo de referência; e antes de submeter à loja (com `revisor-de-loja-e-legal` em paralelo).
- **Não use** para feature sem superfície observável (registre `N/A — motivo` na evidência), nem como substituto do humano: no experimento de Shumer o crítico automatizado levou o FPS de 3,59/10 para "pouco acima de 5", ainda abaixo do jogo de referência — o loop eleva o piso, não entrega o teto.
- **Não deixe o construtor se avaliar**: a sessão que escreveu o código não dá a nota; o subagente parte de contexto novo e só vê disco e jogo rodando.

## Pré-requisitos

- `.claude/agents/critico.md` (mantido por outro grupo). Contrato atual: `tools: Read, Glob, Grep, Bash`; `model: inherit`; `maxTurns: 25`; `memory: project`; não edita nada; nota final = mínimo entre a média e a pior nota crítica; abaixo de 7 a feature não fecha; grava em `production/criticas/<data>-<id>.md` quando o chamador pede.
- Subagentes começam com contexto limpo: só o prompt do agente, a mensagem de delegação, os `CLAUDE.md` e o git status — nada da conversa. Por isso o pacote do passo 2 vai por caminhos explícitos.
- Pasta de evidência completa da feature (`/ciclo-de-feature` passos 5–7) e, se houver, imagem/vídeo de referência.
- Rubrica detalhada, âncoras de nota e modelo do relatório: `references/rubrica.md`.

## Entradas

- `id` da feature e sua entrada em `feature_list.json` (critérios de aceite).
- `design/game-brief.md` (pilares), style card/art bible se existirem (`design/`).
- `production/evidencias/<data>-<id>/` (screenshots, `app.log`, `debug_state.json`, testes, `evidencia.md`).
- Métricas objetivas disponíveis: FPS do canal de depuração ou MetricKit, memória, tempo de carga, tamanho do build.
- Opcional: referência para comparação cega (screenshot de jogo comercial, mockup, frame do art bible).

## Passos

1. **Confira o pacote antes de chamar** (um crítico sem evidência devolve "evidência insuficiente", e isso custa uma rodada): `screenshot.png` da tela da feature (não a de launch), log sem truncar, `debug_state.json`, saída de teste, `evidencia.md` preenchido, e a lista exata de critérios.

2. **Monte a delegação** com caminhos explícitos e pedido de gravação. Modelo:

> Use o subagente `critico` para avaliar a feature F-003 ("<título>"). Leia `design/game-brief.md`, a entrada F-003 em `feature_list.json`, tudo em `production/evidencias/2026-10-10-F-003/` e o style card em `design/style-card.md`. Métricas: FPS médio 58 (debug_state.json), sem crash no app.log. Referência para comparação cega: `design/referencias/threes-tabuleiro.png`. Dê nota 0–10 em cada critério da rubrica (a–g), liste defeitos reproduzíveis com passos, esperado, observado e arquivo, calcule a nota final e grave em `production/criticas/2026-10-10-F-003-rodada-1.md`. Não edite código nem assets.

   Também funciona `@critico` seguido do mesmo texto. Comparação cega: nomeie as imagens `A.png` e `B.png` sem dizer qual é a sua; peça "qual está mais perto de publicável e por quê".

3. **Leia a crítica e faça a triagem.** Cada defeito: reproduzível? (tem passos e arquivo) · severidade (crítico = crash, critério de aceite falho, placeholder/texto de IA, alvo de toque < 44 pt; alto = legibilidade/FPS abaixo do alvo; médio/baixo = polimento). Defeito sem passos de reprodução volta ao crítico com pedido de reprodução, não ao construtor.

4. **Corrija** (sessão construtora) os críticos e altos; polimento vai para uma feature de fase 8. Não discuta com o crítico no relatório; discorde por evidência nova (um screenshot, um log).

5. **Nova rodada** = novo verify completo + novo subagente (contexto limpo automático). Registre cada rodada em `production/criticas/notas.csv`:

```bash
mkdir -p production/criticas; [ -f production/criticas/notas.csv ] || echo "data,feature,rodada,aceite,crash,fps,legibilidade,consistencia,feel,placeholders,final,veredito" > production/criticas/notas.csv
echo "2026-10-10,F-003,1,6,10,8,7,8,6,10,6,corrigir" >> production/criticas/notas.csv
```

6. **Gauntlet Loop com limite.** Padrão: até 3 rodadas por feature (`--rodadas`). Pare antes se: nota final ≥ 7 e nenhum defeito crítico aberto (fecha); ou duas rodadas sem a nota final subir (marque `blocked` com `motivo: "crítico estagnado em X/10 — decisão humana"` e peça ao humano para jogar). O limite existe porque o loop converge devagar e custa tokens: Shumer precisou de ~55 mil linhas e muitas rodadas para ir de 3,59 a ~5.

7. **Feche a feature** só quando a última crítica tiver nota ≥ 7: anote o caminho da crítica em `evidencia.md` (seção Observações) e siga para `done` em `/ciclo-de-feature`. Em marcos, peça também ao humano um playtest de 10 minutos e registre a diferença entre a nota do crítico e a impressão humana — é o dado que calibra a rubrica.

## Critério de pronto e evidência

- `production/criticas/<data>-<id>-rodada-<n>.md` existe para cada rodada, com tabela de notas (a–g), defeitos com reprodução, comparação cega (se houver) e nota final.
- `production/criticas/notas.csv` tem uma linha por rodada.
- Última rodada: nota final ≥ 7, nenhum defeito crítico aberto — ou a feature está `blocked` com `motivo` e o humano foi chamado.
- A sessão construtora não escreveu nenhuma nota; o arquivo da crítica foi escrito pelo subagente.

## Armadilhas conhecidas

- **Revisor sempre acha algo**: a Anthropic avisa que um revisor "will usually report some [gaps], even when the work is sound"; por isso a triagem por severidade e o limite de rodadas.
- **Crítico sem evidência inventa**: passe caminhos; se faltar screenshot, ele deve dizer qual evidência falta, não chutar.
- **Agentes de visão pontuam baixo em jogos**: benchmarks de 2026 com jogos da App Store reportam "frontier VLMs score low"; prefira métricas objetivas (crash, FPS, checklist) a impressões, e mantenha o humano no marco.
- **Nota alta ≠ jogo bom**: o teto observado em pipelines zero-humano é "protótipo jogável mediano" (Shumer ~5/10; Keywords precisou de sete estúdios).
- **Custo**: cada rodada relê a pasta de evidência; `model: inherit` usa o modelo da sessão. Para QA em massa (dezenas de screenshots), peça um subagente com Haiku 5.5 (US$ 0,10/0,50 por MTok) — ajuste em `.claude/agents/` com o grupo que mantém os agentes.
- **Placeholder/texto de IA** no screenshot é reprovação automática (App Store 2.1(a); The Alters); marcas de terceiros também (5.2.1, 4.1(c)).
- **Alvos de toque**: a HIG da Apple pede mínimo de 44×44 pt; o crítico mede no screenshot do menor dispositivo suportado [HIG, confirmar valor na versão atual].
- **Memória do agente** (`memory: project`): o crítico pode acumular padrões do projeto; se ele começar a repetir notas sem olhar a evidência, limpe a memória e reforce "julgue só o que está em disco".

## Fontes

- Decrypt — FPS de Shumer, Gauntlet Loop, 3,59 → ~5/10: https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design · cópia edgeX: https://pro.edgex.exchange/en-US/news/article/claude-opus-5-one-shots-fps-game-gauntlet-loop
- Anthropic — Claude Code best practices (subagente verificador em contexto limpo; revisores reportam gaps): https://www.anthropic.com/engineering/claude-code-best-practices
- Claude Code — Subagents (contexto limpo, `memory`, `maxTurns`, invocação por nome/@): https://code.claude.com/docs/en/sub-agents
- Apple — WWDC26 sessão 222 MetricKit (frame rate Metal): https://developer.apple.com/videos/play/wwdc2026/222/ · App Store Review Guidelines (2.1(a), 4.1(c), 5.2.1): https://developer.apple.com/app-store/review/guidelines/
- Apple — Human Interface Guidelines (alvos de toque): https://developer.apple.com/design/human-interface-guidelines/
- imclab/awesome-game-gen — benchmarks 2026 "frontier VLMs score low": https://github.com/imclab/awesome-game-gen
- PCGamesInsider — Keywords/Project Ava: https://www.pcgamesinsider.biz/news/74358/keywords-tried-making-game-with-generative-ai-failed
- Anthropic — Models overview (preço Haiku 5.5): https://docs.claude.com/en/docs/about-claude/models/overview
- Donchitos/Claude-Code-Game-Studios — `test-evidence-review` (ADEQUATE/INCOMPLETE/MISSING/NOT ASSESSED) e `playtest-report` (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Relatório interno `reports/Criação de jogos totalmente por IA.md` ("O teto hoje…", "Checklist de riscos").
