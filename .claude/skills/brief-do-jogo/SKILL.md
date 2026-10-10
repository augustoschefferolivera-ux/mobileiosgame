---
name: brief-do-jogo
description: >
  Escreve o brief de UMA página do jogo em design/game-brief.md a partir de uma ideia solta ou das respostas
  da entrevista: pitch, loop central, objetivo e estado de falha, até 3 pilares, MVP (≤ 7 itens verificáveis),
  fora de escopo, ordem de construção, público, dispositivo mínimo, orientação, sessão média, intenção de
  monetização e classificação etária (loot box = A18 no Brasil; chat com IA conta na classificação) e a checagem
  de escopo compatível com IA (2D/lógico/definido em texto; sem multiplayer em tempo real, 3D pesado ou Unreal;
  testável headless). Use sempre que o usuário descrever uma ideia de jogo ou pedir "GDD", "documento de design",
  "conceito", "pitch" ou "escopo inicial", mesmo sem dizer "brief" — e redirecione pedidos de GDD longo para este
  formato. Não use para escolher engine (/escolher-engine-e-alvo) nem para cortar escopo de projeto em andamento
  (/escopo-e-anti-padroes).
license: MIT
compatibility: "Claude Code ou Codex"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [1]
argument-hint: "[ideia em uma frase] [jogo de referência]"
disable-model-invocation: false
user-invocable: true
---

# Brief do jogo

Entrega `design/game-brief.md` com no máximo ~80 linhas, MVP de ≤ 7 itens com observáveis, e todas as caixas da checagem de escopo marcadas ou justificadas — o único documento de design do projeto no rigor `minimal`.

## Quando usar / quando não usar

- **Use** na fase 1, antes de escolher engine; sempre que a ideia mudar de forma relevante (reescreva o brief, não acrescente um segundo documento).
- **Não use** para engine/alvo (o brief não cita engine), para arquitetura (ADR) nem para arte (`/direcao-de-arte-e-style-card` lê o brief, não o contrário).
- **Redirecione** pedidos de "GDD completo": no único teste controlado disponível, 29 documentos a mais não compraram um jogo melhor; se o projeto crescer, suba o rigor depois.

## Pré-requisitos

- `templates/game-brief.md` deste banco (adaptado do Game Studios, MIT).
- Nenhuma ferramenta externa. Se faltar informação, pergunte (≤ 6 perguntas, uma rodada).

## Entradas

- A ideia do usuário e, se houver, respostas da entrevista de `/iniciar-projeto`.
- Um jogo de referência (facilita o corte de MVP: "os ~10% que o MVP mantém").
- Restrições conhecidas: Mac disponível? orçamento? prazo? público infantil?

## Passos

1. **Copie o template** sem sobrescrever o que já existe:

```bash
mkdir -p design && cp -n templates/game-brief.md design/game-brief.md
```

2. **Pitch, loop central, objetivo/estado de falha.** Uma frase de pitch; 2–4 bullets de loop (faz → ganha → por que repete); uma ou duas linhas dizendo como se vence/pontua e como a partida termina. O "estado de falha" é de onde saem os critérios de aceite verificáveis: "a partida termina quando o tabuleiro 4×4 não tem jogada" é testável; "o jogador se diverte" não é.

3. **Pilares (≤ 3)** como adjetivos que decidem empates de design ("legível com uma mão", "uma decisão por segundo", "nunca pune o toque errado"). O crítico usa os pilares como critério de consistência.

4. **MVP ≤ 7 itens.** Cada item tem verbo + observável e vira uma feature `F-00N` em `feature_list.json`. Teste de cada item: "qual screenshot, teste ou linha de log prova que existe?". Se a resposta for "nenhum", o item é vago; reescreva. Se passar de 7, não é MVP: mova para "fora de escopo (versão 2)".

5. **Fora de escopo** — lista explícita e específica ("sem multiplayer", "sem save na nuvem", "um modo só", "sem meta-progressão"). Lista vazia é sinal de brief incompleto.

6. **Ordem de construção**: o mais arriscado ou o núcleo da diversão primeiro; polimento e menus por último. F-000 (loop de verificação) sempre vem antes de F-001.

7. **Público, dispositivo e sessão.** Preencha a tabela. Dispositivo mínimo define o orçamento de performance e dita decisões de engine: plug-ins Apple para Unity exigem iOS 15.6+; exports Metal do Godot (4.5.2+) restringem a A12+ por padrão; o Xcode 27 traz o SDK do iOS 27. Orientação e entrada (um dedo?) condicionam o playtest por agente — o Device Hub do Xcode 27 não envia toque de dois dedos.

8. **Monetização e classificação etária** — decisões de design, não de lançamento:
   - Desde 24/07/2025 a App Store tem faixas 13+, 16+ e 18+; as respostas do questionário eram obrigatórias até 31/01/2026 e ele manda considerar "AI assistants and chatbot functionality" como fonte de conteúdo sensível.
   - Para o Brasil, a tabela da Apple fixa **loot boxes em A18** e apostas simuladas em A12 (infrequente) ou A18 (frequente); apostas de quota fixa só com licença da Secretaria de Prêmios e Apostas desde 08/05/2026. Desde 09/07/2026 as perguntas sobre "social media capabilities" valem também para jogos.
   - Chat com LLM visível ao jogador exige filtro, denúncia e bloqueio (1.2, 4.7.1) e consentimento antes de enviar dados a "third-party AI" (5.1.2(i)). Se não for central, deixe fora do MVP.
   - Expectativa: fly.pieter.com oscilou de US$ 1 M ARR autodeclarado a US$ 144 K ARR; Spell Cascade fez US$ 4,99 em 30 dias. Monetização leve (ads + IAP de conveniência ou premium) e o primeiro título como validação.

9. **Checagem de escopo compatível com IA** — marque cada caixa ou escreva a justificativa ao lado:
   - 2D ou 3D leve, lógica definível em texto/código: é onde os relatos convergem que o Claude Code rende mais; Unity e Unreal foram descritos como "mais difíceis", e Unreal "the worst fit" por `.uasset` binário.
   - Sem multiplayer em tempo real: um dev de Unity + Photon Fusion relatou "useless results" e gasto excessivo de tokens; o único caso de sucesso multiplayer (fly.pieter.com) foi feito por um desenvolvedor experiente em Three.js.
   - Ciclo construir→rodar→ver→ler log fechável pelo agente: critério central de `/escolher-engine-e-alvo`.
   - Sem formato binário opaco no caminho crítico.
   - Assets planejados com licença de saída comercial global (nada de Hunyuan3D para um jogo vendido na UE/UK/Coreia).
   Qualquer caixa não marcada sem justificativa é motivo para voltar ao MVP e cortar.

10. **Direção de arte/áudio em uma linha e jogo de referência** com os ~10% que o MVP mantém. Não detalhe: `/direcao-de-arte-e-style-card` e `/direcao-de-audio-e-sound-bible` fazem isso depois.

11. **Lint do brief** antes de entregar:

```bash
wc -l design/game-brief.md                       # alvo ≤ ~80 linhas
grep -c "^- \[ \] F-" design/game-brief.md       # MVP: 1 a 7 itens
grep -n -i "unity\|godot\|spritekit\|phaser\|unreal" design/game-brief.md   # engine NÃO entra no brief
```

12. **Entregue** mostrando o brief inteiro e perguntando: "algo aqui está errado ou faltando?". Em seguida `/escolher-engine-e-alvo`.

## Critério de pronto e evidência

- `design/game-brief.md` existe, cabe em uma tela (~80 linhas), sem seções vazias obrigatórias (pitch, loop, objetivo/falha, MVP, fora de escopo, ordem).
- MVP com 1–7 itens, cada um com um observável nomeado (screenshot, teste, log, estado).
- Tabelas de público/dispositivo e monetização/classificação preenchidas; nenhuma menção a engine.
- Checagem de escopo: todas as caixas marcadas ou justificadas por escrito.
- O usuário confirmou o brief na conversa (anote a data em `progress.md`, "Decisões recentes").

## Armadilhas conhecidas

- **Genericidade** é motivo de rejeição na App Store (4.3(b): "indistinguishable from what's already widely available"; 4.2 funcionalidade mínima). Se o pitch for "mais um 2048", o brief precisa dizer o que o diferencia.
- **Keywords Studios (Project Ava)** avaliou 400+ ferramentas para fazer um jogo 2D só com IA e precisou de equipes de sete estúdios: o escopo pequeno e a curadoria humana não são opcionais.
- **Loot boxes/gacha** colocam o jogo em A18 no Brasil; **apostas simuladas** mudam a faixa; decida agora, não na submissão.
- **Chat com IA** como feature "fácil" arrasta classificação etária, moderação (1.2/4.7.1) e consentimento (5.1.2(i)); Ubisoft Teammates teve recepção "pretty negative" e um ensaio de 2026 resume "Name a game that you play because of its 'AI NPCs'. You can't".
- **Vozes TTS centrais**: o ARC Raiders regravou linhas com atores após críticas de voz "flat". Se o brief prevê voz, limite-a a linhas periféricas.
- **Brief com engine dentro**: a engine é uma decisão com ADR próprio; misturar os dois impede reavaliar a engine sem reescrever o conceito.
- **Segundo documento de design**: se sentir necessidade de um GDD, primeiro pergunte se o sinal é real (mais de uma pessoa, publisher, > 30 features); senão, reescreva o brief.

## Fontes

- Donchitos/Claude-Code-Game-Studios — template `game-brief.md` e medição de rigor (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Apple — App Store Review Guidelines (1.2, 4.2, 4.3(b), 4.7.1, 5.1.2(i)): https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News — novas faixas etárias (24/07/2025): https://developer.apple.com/news/?id=ks775ehf
- Apple — Age ratings values and definitions (loot boxes A18 no Brasil): https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- Apple Developer News — apostas no Brasil (08/05/2026): https://developer.apple.com/news/?id=x4eyetnp · social features em jogos (09/07/2026): https://developer.apple.com/news/?id=tlur8uvi
- Apple — HIG, Generative AI (divulgação de IA): https://developer.apple.com/design/human-interface-guidelines/generative-ai
- apple/unityplugins (iOS 15.6 mínimo): https://github.com/apple/unityplugins · Godot 4.5.2 (A12+ em exports Metal) [secundário]: https://godotengine.org/article/maintenance-release-godot-4-5-2/
- Medium (chierhu) — 2D/lógico rende mais; Unreal "worst fit"; Spell Cascade: https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992
- Reddit (snapshot abr/2026) — Unity + Photon Fusion "useless results": https://reddit.sentinel-team.org/posts/1sggzzw/snapshots/2026-04-09T16%3A41%3A00.47446Z
- PCGamesInsider — Keywords/Project Ava: https://www.pcgamesinsider.biz/news/74358/keywords-tried-making-game-with-generative-ai-failed
- PCGamesN — ARC Raiders regravou vozes TTS: https://www.pcgamesn.com/arc-raiders/ai-voices-replaced · Frisson Labs — "AI NPCs" (2026): https://www.frisson-labs.com/ai-npcs-2026
- Relatório interno `reports/Criação de jogos totalmente por IA.md` (seções "O teto hoje…", "Riscos legais e de loja", "Checklist de riscos").
