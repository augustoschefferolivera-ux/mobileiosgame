---
name: ciclo-de-feature
description: >
  Executa uma — e só uma — feature por sessão: lê progress.md e feature_list.json, escolhe a próxima, escreve o
  teste e o critério de aceite antes de codar, implementa com diff pequeno, roda scripts/verify.sh (construir,
  rodar, screenshot, log), grava a evidência em production/evidencias/<data>-<id>/, passa pelo subagente
  critico, marca status done no JSON só com evidência e faz um commit descritivo. Use sempre que o usuário
  pedir para "implementar", "fazer a próxima feature", "continuar o jogo", "adicionar <mecânica>" ou "corrigir
  <bug>" em um projeto que já tem feature_list.json. Não use para inicializar o projeto (/iniciar-projeto),
  para só salvar o estado da sessão (/checkpoint-e-retomada) nem para avaliar qualidade sem implementar
  (/critico-independente).
license: MIT
compatibility: "Claude Code ou Codex; a engine e o loop de verificação já instalados"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [5]
argument-hint: "[F-xxx | próxima]"
disable-model-invocation: false
user-invocable: true
---

# Ciclo de feature

Entrega uma feature com `status: "done"` em `feature_list.json`, apontando para `production/evidencias/<data>-<id>/` (screenshot, log, estado, teste, `evidencia.md`), crítica ≥ 7 em `production/criticas/`, e um commit descritivo — nada mais nesta sessão.

## Quando usar / quando não usar

- **Use** em toda sessão de produção (fase 5) depois de `/checkpoint-e-retomada` ter reposto o contexto.
- **Use** para bugs também: um bug é uma feature `F-xxx` com critério "o comportamento X não ocorre mais" e evidência igual.
- **Não use** para duas features "porque são pequenas": a Anthropic observou que agentes que tentam várias coisas declaram pronto cedo demais; uma por sessão é a regra, não uma sugestão. Não use para refatorações sem critério observável — crie uma feature de refatoração com teste de regressão.

## Pré-requisitos

- `feature_list.json`, `progress.md`, `./scripts/verify.sh` (de `/montar-loop-de-verificacao`), `templates/test-evidence.md`.
- Regras de código da engine em `.claude/rules/` (Swift, GDScript, C#, TypeScript) e a skill `engine-<x>`.
- Subagente `critico` disponível (`.claude/agents/critico.md`).

## Entradas

- `progress.md` (CHECKPOINT) e `feature_list.json` (qual é a próxima: menor `prioridade` com todas as `depende_de` em `done`).
- `design/game-brief.md` (pilares e estado de falha, para critérios ambíguos).
- Última pasta de evidência (para comparar antes/depois).

## Passos

1. **Ler o estado, sem codar.** `progress.md` inteiro; depois:

```bash
python3 -I -c "import json;d=json.load(open('feature_list.json'));[print(f['id'],f['status'],'-',f['titulo']) for f in d['features']]"
git status --short && git log --oneline -5
```

   Se houver uma feature `in_progress`, ela é a desta sessão (retome). Se houver duas, pare e pergunte ao humano qual continua; a outra vira `blocked` com `motivo`.

2. **Escolher a próxima** (ou a passada em `$ARGUMENTS`): menor `prioridade` com dependências `done`. Mude só o `status` dela para `in_progress`; atualize o CHECKPOINT de `progress.md` com "Feature em andamento" e "Próximo passo". Nunca edite `titulo`/`criterio_de_aceite` de outras features nesta sessão.

3. **Critério e teste antes do código.** Releia `criterio_de_aceite`. Para cada critério, decida como será provado: teste automatizado (lógica), screenshot (visual), `debug_state.json` (estado), log (ausência de erro). Se um critério não tiver prova possível, reescreva-o agora (anote em `progress.md` → Decisões). Escreva o teste de lógica primeiro e veja-o falhar (raiz de testes da engine: `Tests/` no Xcode, `tests/` no Godot, `Assets/Tests/` na Unity, `tests/` ou `src/**/*.test.ts` na web). Defina quais campos o canal de depuração precisa expor para esta feature.

4. **Implementar com diff pequeno.** Lógica de jogo em tipos puros testáveis, separada da cena; valores de balanceamento em dados (JSON/`.tres`/ScriptableObject), não hardcoded; nenhuma dependência nova sem uma linha de ADR. Itere com o verificador em modo rápido:

```bash
bash scripts/verify.sh --quick --feature F-003 --out production/evidencias/_ultima
```

   Alvo de tamanho: até ~300 linhas alteradas e ~10 arquivos [heurística deste banco]. Passou disso, a feature era duas: divida (`F-003a`/`F-003b`) e registre.

5. **Verificação completa** na pasta datada:

```bash
DATA=$(date +%F); OUT="production/evidencias/${DATA}-F-003"
bash scripts/verify.sh --feature F-003 --out "$OUT"
```

6. **Observar de verdade.** Abra `screenshot.png` com Read e compare com cada critério visual: texto cortado, elemento fora da safe area, cor errada — "a passing test says nothing about a menu drawn off-screen". Leia `debug_state.json` e procure `error|crash|exception` em `app.log`/`run.log`. Escreva uma linha `Run result: OBSERVADO — …` (ou `NÃO VERIFICADO — motivo`, que é bloqueio, não observação). Falhou? Volte ao passo 4. Após 3 ciclos sem progresso, marque `blocked` com `motivo` e pergunte ao humano.

7. **Montar a evidência.** Copie `templates/test-evidence.md` para `"$OUT/evidencia.md"` e preencha: critério por critério (PASSOU/FALHOU + arquivo que prova), screenshots nomeados `NN-descricao.png`, condições (simulador, orientação, FPS do canal), observações. Os arquivos citados têm de estar na pasta — o hook de commit e o Stop hook procuram a pasta não vazia, não a linha.

8. **Crítico independente.** Invoque `/critico-independente F-003` (ele chama o subagente `critico` em contexto limpo com brief, critérios, pasta de evidência e métricas). Nota final < 7 ou defeito crítico → corrija e volte ao passo 5 (nova rodada). Limite de rodadas e registro de notas estão naquela skill. Para feature sem nada visível (pura migração de dados), registre `N/A — motivo` em vez de pular em silêncio.

9. **Marcar `done` só com evidência.** Edite a feature: `status: "done"`, `evidencia: "production/evidencias/<data>-F-003"`, `evidencia_data`; `evidencia_commit` vem depois do commit. Valide o JSON (`python3 -I -c "import json;json.load(open('feature_list.json'))"`).

10. **Commit descritivo**, só com os arquivos da feature, evidência e `feature_list.json`/`progress.md`:

```bash
git add <arquivos da feature> "production/evidencias/${DATA}-F-003" production/criticas feature_list.json progress.md
git commit -m "feat(F-003): <título curto> — evidência em production/evidencias/${DATA}-F-003 (crítica 8/10)"
```

    O hook `PreToolUse` bloqueia commit com placeholder/texto de IA em arquivo staged ou com `done` sem evidência. Depois do commit, preencha `evidencia_commit` com `git rev-parse --short HEAD` (pode ir no commit do checkpoint).

11. **Checkpoint.** `/checkpoint-e-retomada`: CHECKPOINT reescrito (próxima feature), bloco de sessão anexado, nenhuma feature `in_progress`. Encerre a sessão; comece a próxima feature em uma sessão nova (contexto limpo, menos custo).

### Regras do ciclo

- **JSON, não Markdown**, para a lista: o modelo altera JSON indevidamente com menos frequência (Anthropic, nov/2025).
- **Nunca `done` sem evidência**; nunca "deveria funcionar"; um parse check não é uma execução.
- **Nunca duas features por sessão**; nunca "aproveitar" para mexer em outra.
- **Diff pequeno**; quem constrói não avalia (crítico separado).
- **Pausa legítima** = `blocked` + `motivo` (o Stop hook aceita); `in_progress` ao encerrar é bloqueado.

## Critério de pronto e evidência

- Feature `done` em `feature_list.json` com `evidencia`, `evidencia_data` e (após o commit) `evidencia_commit`.
- `production/evidencias/<data>-<id>/` com `screenshot.png` (ou `NN-*.png`), log, `debug_state.json`, saída de teste quando houver, `verify.meta` com `exit: 0` e `evidencia.md` preenchido.
- `production/criticas/<data>-<id>*.md` com nota final ≥ 7 (ou `N/A` justificado para feature sem superfície).
- Commit `feat(<id>)` no histórico; `progress.md` atualizado; nenhuma `in_progress`.

## Verificar no simulador/dispositivo

- Toda feature fecha no simulador pelo verify. A cada marco (ou quando a feature mexe em toque, haptics, áudio ou performance), repita em dispositivo físico (`xcrun devicectl …`) e anexe FPS do MetricKit/canal de depuração à evidência. Haptics não existem no simulador.

## Armadilhas conhecidas

- **Declarar pronto cedo** e **one-shot** (Anthropic); **"you have to know what the issue is in order for claude to fix it"** (relato Reddit) — por isso o critério vem antes do código.
- **Reescrever a lista**: títulos/critérios só mudam por decisão registrada; `cut` em vez de apagar.
- **Screenshot da tela errada** (título em vez da feature): lance direto no estado (`--scene`, `--seed`).
- **Placeholders** ("lorem", "as an AI", nome de modelo) nos arquivos: o hook `PostToolUse` avisa e o de commit bloqueia (App Store 2.1(a); caso The Alters).
- **Flakiness do verify**: waits fixos; corrija o verificador, não desabilite o gate.
- **Unity**: "not every change is logged or can be undone from the Editor" — commit antes de deixar o agente dirigir o Editor.
- **Perder a propriedade mental**: se não consegue explicar o diff em duas frases, não commite; rode `/escopo-e-anti-padroes`.
- **Custo**: iterações com screenshot custam tempo, não tokens; iterações com o modelo custam tokens — use `--quick`/`--no-run` enquanto compila e o verify completo só ao fechar.

## Fontes

- Anthropic — Effective harnesses for long-running agents (uma feature por sessão, JSON, commits descritivos, verificação ponta a ponta): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic — Claude Code best practices (evidência em vez de afirmação; subagente revisor; Stop hook): https://www.anthropic.com/engineering/claude-code-best-practices
- Donchitos/Claude-Code-Game-Studios — `dev-story`/`story-done`, `run-and-observe.md`, template `test-evidence.md` (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Claude Code — Hooks (Stop, PreToolUse, exit 2): https://code.claude.com/docs/en/hooks
- Reddit (snapshot abr/2026) — "you have to know what the issue is…": https://reddit.sentinel-team.org/posts/1sggzzw/snapshots/2026-04-09T16%3A41%3A00.47446Z
- ScreenHub — The Alters (prompt esquecido no build): https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ · Apple — App Store Review Guidelines 2.1(a): https://developer.apple.com/app-store/review/guidelines/
- Unity-Technologies/unity-agent-plugin (aviso sobre undo): https://github.com/Unity-Technologies/unity-agent-plugin
- Relatório interno `reports/Criação de jogos totalmente por IA.md` (seção "O teto hoje…", "Checklist de riscos").
