---
name: checkpoint-e-retomada
description: >
  Salva e repõe a memória do projeto entre sessões: ao encerrar, reescreve o bloco CHECKPOINT de progress.md
  (feature em andamento, próximo passo, último verify, bloqueios), anexa o histórico da sessão, mantém
  production/session-state/active.md para estado no meio de uma feature e faz o commit do checkpoint; ao retomar
  (nova sessão, /clear, compactação ou crash), lê progress.md, feature_list.json, git e a última evidência, e roda
  scripts/verify.sh antes de mudar qualquer coisa. Use sempre que o usuário disser "vamos parar por hoje",
  "salvar o estado", "continuar de onde paramos", "o que estávamos fazendo", "perdi o contexto", ou no início
  de toda sessão em projeto que já tem feature_list.json. Não use para inicializar (/iniciar-projeto) nem para
  implementar (/ciclo-de-feature).
license: MIT
compatibility: "Claude Code ou Codex"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [0, 5]
argument-hint: "[salvar | retomar]"
disable-model-invocation: false
user-invocable: true
---

# Checkpoint e retomada

Entrega um `progress.md` cujo bloco CHECKPOINT permite retomar frio em uma leitura, um commit `chore(checkpoint)` e — na retomada — o verify rodado antes de qualquer edição. A conversa é descartável; o arquivo é a memória.

## Quando usar / quando não usar

- **Salvar**: fim de toda sessão; antes de `/compact` ou `/clear`; ao atingir ~60–70% do contexto; ao mudar de feature; antes de qualquer operação longa que possa cair.
- **Retomar**: início de toda sessão em projeto existente; após compactação automática; após `/clear`; quando o agente parece ter "esquecido" o que decidiu.
- **Não use** para registrar decisões de arquitetura (ADR em `docs/decisoes/`) nem para fechar features (isso é `/ciclo-de-feature`; aqui só se registra o estado).

## Pré-requisitos

- `progress.md` e `feature_list.json` na raiz (de `/iniciar-projeto`); `templates/progress.md` e `templates/session-state.md` para recriar se faltarem.
- Hook `SessionStart` deste repositório (`.claude/hooks/session-start.sh`): injeta as primeiras 60 linhas de `progress.md` e o resumo de `feature_list.json` em toda sessão, inclusive após `/clear` e compactação. Isso define o contrato: **o que importa fica nas primeiras 60 linhas de `progress.md`**.
- Hook `Stop` (`stop-gate.sh`): não deixa encerrar com feature `in_progress` ou `done` sem evidência.

## Entradas

- Estado real: `git status`, `git log`, `feature_list.json`, última pasta em `production/evidencias/`, saída do último verify.
- O que ficou só na conversa e precisa sobreviver: decisões, descobertas sobre a engine, comandos que funcionaram, perguntas para o humano.

## Passos

### Salvar (fim de sessão)

1. **Deixe o estado consistente.** Uma feature `in_progress` só pode ficar assim se a sessão continua; para encerrar, ou ela fecha com evidência (`/ciclo-de-feature` passos 5–10) ou vira `blocked` com `motivo` concreto ("falta decidir X", "verify quebra em Y"). Confira:

```bash
python3 -I -c "import json;d=json.load(open('feature_list.json'));print([ (f['id'],f['status']) for f in d['features'] if f['status'] in ('in_progress','blocked')])"
git status --short
```

2. **Reescreva o bloco CHECKPOINT** de `progress.md` — sobrescreva, nunca anexe; ≤ 25 linhas; cada campo em uma linha:
   - `Atualizado`, `Branch`, `Feature em andamento` (ou "nenhuma"), `Próximo passo` (concreto: "rodar `/ciclo-de-feature F-004`; começar pelo teste de `colocarPeca` em coluna cheia"), `Último verify` (OK/FALHOU, data, comando), `Última evidência` (pasta), `Bloqueios`, `Arquivos em progresso`, `Perguntas abertas para o humano`.
   - Teste do leitor frio: alguém sem a conversa consegue continuar só com isso? "Corrigindo a coisa" não passa; "adicionando colisão da peça em `Tabuleiro.swift`, teste `testColunaCheia` ainda falha" passa.

3. **Anexe o bloco da sessão** ao fim de `progress.md` (Histórico): feature, feito, verify, evidência, commit, pendências. Mova para "Decisões recentes" tudo que foi decidido só na conversa (uma linha, com data). Ao passar de ~200 linhas de histórico, mova o antigo para `production/session-logs/<data>.md`.

4. **Estado no meio de uma feature** (opcional, útil quando a feature atravessa sessões): `production/session-state/active.md` a partir de `templates/session-state.md`, com o bloco CHECKPOINT mais detalhado (arquivos abertos, `Resultado da execução: OBSERVADO/NÃO VERIFICADO/N/A`). Não duplique o que já está em `progress.md`.

5. **Commit do checkpoint**:

```bash
git add progress.md feature_list.json production/session-state production/evidencias production/criticas
git commit -m "chore(checkpoint): <F-xxx estado> — próximo: <passo>"
```

   O hook de commit valida `feature_list.json`; se bloquear por `done` sem evidência, corrija o status.

6. **Libere contexto** se for continuar na mesma sessão: `/compact Foco: F-004 em andamento; decisões já estão em progress.md e docs/decisoes/` — a instrução de foco preserva o que importa. Entre features, prefira `/clear` (ou nova sessão): o `SessionStart` repõe o checkpoint.

### Retomar (início de sessão, pós-compactação, pós-`/clear`)

7. **Leia, nesta ordem, antes de qualquer edição**: o que o hook `SessionStart` injetou; `progress.md` inteiro; `feature_list.json` (qual está `in_progress`/`blocked`); `git status --short && git log --oneline -5`; a última pasta de evidência (`ls -t production/evidencias | head -1`) e seu `evidencia.md`; `production/session-state/active.md` se existir. Se o git contradiz o checkpoint, o git está certo e o checkpoint é reescrito.

8. **Verifique antes de mudar**:

```bash
bash scripts/verify.sh --quick --feature "$(python3 -I -c "import json;d=json.load(open('feature_list.json'));print(next((f['id'] for f in d['features'] if f['status']=='in_progress'),'F-000'))")" --out production/evidencias/_ultima
```

   Registre o resultado no CHECKPOINT ("Último verify"). Um verify que falha ao retomar é a primeira tarefa da sessão, não um detalhe.

9. **Recupere o que não está em arquivo**: `CLAUDE.md` da raiz é reinjetado automaticamente após compactação; o que foi dito só na conversa não é. Se notar instrução perdida, escreva-a agora em `progress.md` (Decisões) ou, se for regra permanente, proponha ao humano uma linha em `CLAUDE.md`.

10. **Siga para a feature**: `/ciclo-de-feature` com a feature `in_progress` ou a próxima `todo`.

### O que vai em cada arquivo

| Arquivo | Conteúdo | Quem lê |
|---|---|---|
| `progress.md` (CHECKPOINT) | estado do projeto em ≤ 25 linhas | hook `SessionStart`, humano, agente frio |
| `progress.md` (histórico/decisões) | o que foi feito e decidido, por data | humano; agente quando precisa de detalhe |
| `feature_list.json` | status e evidência por feature | hooks `Stop` e `PreToolUse`, `/ciclo-de-feature` |
| `production/session-state/active.md` | detalhe do meio de uma feature | `/ciclo-de-feature` ao retomar |
| `docs/decisoes/ADR-*.md` | decisões de arquitetura/engine | todas as skills de engine |
| `CLAUDE.md` | regras permanentes do projeto | todas as sessões (reinjetado pós-compactação) |

## Critério de pronto e evidência

- Salvar: CHECKPOINT reescrito (≤ 25 linhas, todos os campos), bloco de sessão anexado, nenhuma feature `in_progress` (ou `blocked` com `motivo`), commit `chore(checkpoint)` no log.
- Retomar: `progress.md`, `feature_list.json`, git e última evidência lidos; verify rodado e resultado anotado no CHECKPOINT antes da primeira edição de código.

## Armadilhas conhecidas

- **Anexar ao CHECKPOINT** em vez de sobrescrever: o bloco cresce sem limite e o hook (cap de 10.000 caracteres de saída, prévia de 2.000) passa a mostrar o começo errado. O Game Studios separou as duas regiões exatamente por isso.
- **Confiar na conversa**: "Instructions seem lost after /compact" — só CLAUDE.md da raiz sobrevive automaticamente; regras por caminho e CLAUDE.md aninhados recarregam sob demanda.
- **Encerrar com `in_progress`**: o Stop hook bloqueia (8 continuações no máximo); use `blocked` + `motivo`.
- **Checkpoint sem verify**: retomar e começar a editar com o build quebrado desperdiça a sessão; verify primeiro.
- **Subagentes não veem a conversa**: o crítico e o playtester partem de arquivos; o que não está em `progress.md`/evidência não existe para eles.
- **Segredos e dados pessoais** não entram em `progress.md` (vai para o git).
- **`production/session-state/*.local.md`** está no `.gitignore`: use para notas pessoais; o `active.md` versionado é o compartilhado.
- **Histórico reescrito**: nunca edite blocos antigos do histórico; corrija com uma linha nova e data.

## Fontes

- Claude Code — Memória (CLAUDE.md, compactação, "Instructions seem lost after /compact"): https://code.claude.com/docs/en/memory
- Claude Code — Hooks (SessionStart com `source` startup/resume/clear/compact; Stop; cap de saída): https://code.claude.com/docs/en/hooks
- Claude Code — Subagents (contexto limpo): https://code.claude.com/docs/en/sub-agents
- Anthropic — Effective harnesses for long-running agents (arquivo de progresso, commits, retomada): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Donchitos/Claude-Code-Game-Studios — `session-state.md`, `context-management.md`, `session-start.sh` (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Hooks deste repositório: `.claude/hooks/session-start.sh`, `.claude/hooks/stop-gate.sh` (contrato lido em 10/10/2026).
