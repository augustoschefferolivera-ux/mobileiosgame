---
name: criar-ou-melhorar-skill
description: >
  Cria uma skill nova ou melhora uma existente neste banco seguindo playbook/CONVENCOES-DE-SKILLS.md: nome
  kebab-case sem acento, frontmatter completo (name, description "insistente", license, metadata grupo/alvo/fase),
  corpo ≤ 300 linhas com as seções obrigatórias, references/ e scripts/ com --help, fontes com URL e incertezas
  marcadas; valida com python3 scripts/check-skills.py, testa com 2–3 prompts realistas (com e sem a skill) e
  otimiza a description com os padrões do skill-creator da Anthropic. Use sempre que o usuário disser "criar uma
  skill", "nova skill", "a skill X não dispara", "melhorar a description", "a skill está grande", "adicionar
  comando /", ou quando notar um fluxo repetido que merece virar skill. Não use para criar subagentes
  (.claude/agents/) ou hooks (.claude/settings.json) — aponte para a documentação do Claude Code.
license: MIT
compatibility: "Claude Code (testes com subagentes e claude -p); Codex só para edição manual"
metadata:
  grupo: meta
  alvo: [2d, 3d, app, web]
  fase: [0]
argument-hint: "[nome-da-skill] [criar|melhorar|description]"
disable-model-invocation: false
user-invocable: true
---

# Criar ou melhorar skill

Entrega `.claude/skills/<nome>/SKILL.md` (mais `references/`, `scripts/` quando útil) que passa em `python3 scripts/check-skills.py` sem erros, foi testada com 2–3 prompts realistas contra a linha de base e tem uma `description` que dispara nos casos certos e não dispara nos vizinhos.

## Quando usar / quando não usar

- **Use** quando um fluxo se repetiu duas vezes com as mesmas ferramentas, quando um comando de outra skill falhou por falta de conhecimento específico, ou quando uma skill existente não dispara / dispara demais / passou de 300 linhas.
- **Não use** se já existe plug-in oficial ou MCP mantido para a tarefa (Unity, GPTK, Roblox, MCP for Unity, Godot AI, MobileBuildMCP, MCP for Blender): a convenção é instalar e usar, não reescrever. Não use para subagentes (`.claude/agents/*.md`) nem hooks — formatos diferentes, documentados no Claude Code.

## Pré-requisitos

- Leia `playbook/CONVENCOES-DE-SKILLS.md` inteiro antes de escrever (formato, frontmatter, estrutura, regra de evidência, checklist).
- `python3 scripts/check-skills.py --help` funciona (o script também regenera `playbook/06-indice-de-skills.md`; use `--no-index` se não deve tocar no playbook).
- Padrões de escrita da Anthropic (skill-creator em `anthropics/skills`): progressive disclosure, description "insistente", explicar o porquê em vez de MUST em caixa alta, exemplos, testes com e sem a skill.
- Regra deste repositório (`.claude/rules/skills.md`): não copiar texto de plug-ins com licença restritiva (Unity Companion License); creditar adaptações do Game Studios (MIT) e do GPTK (Apache 2.0) em `THIRD_PARTY_NOTICES.md`.

## Entradas

- O que a skill deve permitir fazer; quando deve disparar (frases reais do usuário); formato de saída; evidência de pronto.
- Skills vizinhas (para a frase "não use para…"); fontes (relatório, notas de pesquisa, páginas oficiais lidas).
- Se for melhoria: o problema observado (não disparou? disparou errado? instrução ignorada? longa demais?).

## Passos

1. **Confirme que precisa existir.** Procure skill parecida (`ls .claude/skills/`, `grep -ril "<termo>" .claude/skills/*/SKILL.md`) e ferramenta oficial que já cobre a tarefa. Se existir, melhore a skill ou documente só a lacuna (mobile, licença, loja).

2. **Nome, grupo, alvo, fase.** Diretório em kebab-case, português, sem acento/cedilha (vira comando `/nome`); `name` igual ao diretório; `metadata.grupo` ∈ {processo, engines, arte-2d, 3d, audio, ia-runtime, publicacao, meta}; `alvo` ⊆ {2d, 3d, app, web}; `fase` como lista de inteiros 0–10 do roteiro.

3. **Esqueleto.** Frontmatter + seções obrigatórias (`# Título` · uma frase com a evidência de pronto · Quando usar / quando não usar · Pré-requisitos · Entradas · Passos · Critério de pronto e evidência · Armadilhas conhecidas · Fontes). Skills de asset terminam com "Exportar para mobile"; skills de código, com "Verificar no simulador/dispositivo". Crie `references/` para o que não cabe em 300 linhas e `scripts/` para o que é determinístico e repetitivo (POSIX/bash simples, `--help`, nunca destrutivo, `chmod +x`).

4. **Description que dispara.** ≤ 1.000 caracteres (o Claude Code trunca a listagem em 1.536); começa pelo caso de uso principal; inclui frases que o usuário realmente diz ("não consigo ver o jogo rodando", "qual engine"); termina com "Não use para … (/skill-vizinha)". O skill-creator recomenda descrições um pouco "insistentes" porque o modelo tende a *não* usar skills que ajudariam. Opcional: `when_to_use` para gatilhos extras (conta no mesmo limite).

5. **Corpo que explica o porquê.** Imperativo; cada passo com comando em bloco de código e resultado observável; nada de MUST em caixa alta — diga por que importa. Fatos com data e fonte; o que não veio de página oficial recebe "[secundário, confirmar]"; nunca invente ferramenta, flag, versão ou preço. Caminhos entre crases que começam com references/, scripts/ ou assets/ precisam existir dentro da pasta da skill (o checker os verifica); para arquivos de outras skills use o caminho completo `.claude/skills/...`.

6. **Valide:**

```bash
python3 scripts/check-skills.py --no-index          # ERRO/AVISO por skill; exit 1 se houver ERRO
wc -l .claude/skills/<nome>/SKILL.md                # ≤ ~310 linhas com frontmatter
```

   O checker exige: frontmatter legível, `name` = diretório, `description` presente e ≤ 1.536 caracteres, arquivos citados existentes; avisa corpo > 300 linhas, seções ausentes, `metadata.grupo` ausente, scripts sem `+x`.

7. **Teste com 2–3 prompts realistas** (padrão skill-creator): escreva prompts como um usuário escreveria — com caminho, contexto, erro de digitação, pedido indireto — e rode cada um duas vezes em subagentes paralelos: um com a skill carregada (`skills:` do agente ou invocação explícita), outro sem (linha de base). Salve saídas e transcrições fora do repositório (ex.: `/tmp/<nome>-workspace/iteracao-1/eval-N/{com,sem}/`), nunca em `.claude/skills/`. Compare: a skill economizou passos? evitou erro? gerou a evidência pedida? Se os dois subagentes escreveram o mesmo script auxiliar, ele pertence a `scripts/` da skill. Se houver o skill-creator da Anthropic disponível (`/skill-creator`), use o fluxo dele para evals e visualização.

8. **Otimize a description com gatilhos** (quando a skill não dispara ou dispara demais): escreva ~20 consultas realistas, 8–10 que devem disparar (formais, casuais, sem citar o nome da skill, casos raros, disputas com skill vizinha que esta deve vencer) e 8–10 que **não** devem (quase-acertos: mesmas palavras, intenção diferente; nunca irrelevantes óbvios). Avalie manualmente ou, com o skill-creator, rode o loop de otimização com `claude -p` e aplique a melhor description medida no conjunto de teste, não no de treino.

9. **Crédito e índice.** Se adaptou template ou texto do Game Studios/GPTK, acrescente a linha em `THIRD_PARTY_NOTICES.md` (com o grupo responsável). Rode `python3 scripts/check-skills.py` (sem `--no-index`) quando tiver permissão de regenerar `playbook/06-indice-de-skills.md`.

10. **Commit** `docs(skills): cria/melhora /<nome> — <o que mudou e por quê>`; no corpo, os 2–3 prompts de teste e o resultado contra a linha de base.

### Checklist antes de salvar (das convenções)

- [ ] `name` igual ao nome do diretório; kebab-case sem acento
- [ ] `description` diz o que faz, quando usar e quando não usar; ≤ 1.000 caracteres
- [ ] ≤ 300 linhas de corpo; conteúdo longo em `references/` com ponteiro "Leia … quando …"
- [ ] Nenhuma ferramenta/versão/preço inventado; incertezas marcadas
- [ ] "Critério de pronto e evidência" e "Fontes" com URLs presentes
- [ ] Scripts com `--help`, não destrutivos, executáveis
- [ ] `python3 scripts/check-skills.py` sem erros; 2–3 prompts testados

## Critério de pronto e evidência

- `python3 scripts/check-skills.py --no-index` sai 0 e não lista AVISO para a skill nova/alterada.
- Pasta de testes fora do repositório com saídas com/sem skill para 2–3 prompts e uma nota de uma linha por prompt dizendo o que a skill melhorou.
- Para melhoria de description: lista das ~20 consultas e a taxa de acerto antes/depois (manual ou do loop do skill-creator).
- Commit `docs(skills)` com o resumo dos testes.

## Armadilhas conhecidas

- **Undertriggering** é o modo de falha padrão: descrições tímidas não disparam; descrições sem "não use para…" disparam nas vizinhas.
- **Overfitting aos prompts de teste**: a skill vai ser usada milhares de vezes com prompts diferentes; generalize em vez de adicionar regras para cada caso que falhou.
- **MUST/NUNCA em caixa alta e estruturas rígidas** são sinal amarelo (skill-creator): reformule explicando o motivo.
- **SKILL.md gigante**: contexto caro e adesão menor; mova para `references/` e aponte quando ler.
- **Copiar texto do plug-in da Unity** (Unity Companion License): cite o nome da skill oficial e quando invocá-la; o mesmo cuidado com docs proprietárias.
- **Frontmatter inválido** carrega a skill sem campos (YAML quebrado) ou é ignorado (`---` não na primeira linha; campo com nome errado é ignorado em silêncio pelo Claude Code).
- **`allowed-tools` para comandos destrutivos** e **`disable-model-invocation: false` em fluxos caros/perigosos** (submissão à loja, gastos de créditos) violam as convenções.
- **Fora do Claude Code** (claude.ai, Skills API, `package_skill.py`) só valem os seis campos do padrão Agent Skills (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`); `argument-hint` etc. fazem o upload falhar — mantenha-os só se a skill for do Claude Code.
- **Testar na mesma sessão que escreveu a skill** não é teste: use subagentes (contexto limpo) ou `claude -p`.

## Fontes

- `playbook/CONVENCOES-DE-SKILLS.md` e `.claude/rules/skills.md` (deste repositório).
- Claude Code — Skills (frontmatter, limite de 1.536 caracteres, `when_to_use`, `paths`, troubleshooting "Skill not triggering"): https://code.claude.com/docs/en/skills
- anthropics/skills — skill-creator (progressive disclosure, descrições insistentes, testes com/sem skill, otimização de description): https://github.com/anthropics/skills/tree/main/skills/skill-creator
- Agent Skills — padrão aberto (seis campos de frontmatter): https://agentskills.io
- Claude Code — Subagents (testes em contexto limpo): https://code.claude.com/docs/en/sub-agents · Hooks (para apontar quando o pedido é hook, não skill): https://code.claude.com/docs/en/hooks
- Donchitos/Claude-Code-Game-Studios — `skill-test`/`skill-improve` (linter estrutural e loop testar-corrigir, MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- `./scripts/check-skills.py` (deste repositório; regras verificadas no docstring).
