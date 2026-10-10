<!--
Template: progress.md — a memória do projeto entre sessões.
Padrão do agente inicializador da Anthropic ("Effective harnesses for long-running agents", 2025-11:
init.sh + arquivo de progresso + lista de features em JSON), com o bloco CHECKPOINT bounded
adaptado de Claude-Code-Game-Studios (Donchitos, MIT), .claude/docs/templates/session-state.md.

Duas regiões, e a diferença importa:
  1. CHECKPOINT (≤ 25 linhas) — é o que um hook SessionStart pode imprimir e o que uma retomada fria lê
     primeiro. SOBRESCREVER a cada atualização, nunca anexar.
  2. Tudo depois de /CHECKPOINT — narrativa para humanos e para o agente que quer detalhe. Pode crescer;
     ao passar de ~200 linhas, mova o histórico para production/session-logs/AAAA-MM-DD.md.
A conversa é descartável; o arquivo é a memória.
-->
# Progresso — [nome do jogo]

<!-- CHECKPOINT -->
**Atualizado:** AAAA-MM-DD HH:MM
**Branch:** `main`
**Feature em andamento:** F-xxx — [título] (status em feature_list.json: in_progress)
**Próximo passo:** [uma linha concreta o bastante para retomar sem ler mais nada]
**Último verify:** [OK | FALHOU — motivo] — `bash scripts/verify.sh` em AAAA-MM-DD HH:MM
**Última evidência:** production/evidencias/AAAA-MM-DD-F-xxx/
**Bloqueios:** nenhum
**Arquivos em progresso:** nenhum
**Perguntas abertas para o humano:** nenhuma
<!-- /CHECKPOINT -->

## Como retomar (leia após `/clear`, compactação, crash ou nova sessão)
1. Leia o CHECKPOINT acima. Se estiver desatualizado em relação ao git, confie no git.
2. `git status --short && git log --oneline -5`
3. Abra `feature_list.json`; confirme qual feature está `in_progress` (deve ser no máximo uma).
4. Rode `bash scripts/verify.sh` ANTES de alterar qualquer coisa; registre o resultado aqui.
5. Só então continue a feature. Não comece outra.

## Decisões recentes
<!-- Uma linha por decisão, com data. Decisões de arquitetura/engine viram ADR em docs/decisoes/. -->
- AAAA-MM-DD — [decisão] — motivo: [...]

## Problemas conhecidos
<!-- Bugs aceitos por enquanto, flakiness do verify, limitações do simulador. Um por linha, com data. -->
-

## Histórico de sessões
<!-- Anexe um bloco ao FIM de cada sessão. Não reescreva blocos antigos. -->
### AAAA-MM-DD — sessão 1
- **Feature:** F-000
- **Feito:** [o que foi implementado, em uma ou duas linhas]
- **Verify:** [OK/FALHOU] — [comando]
- **Evidência:** production/evidencias/AAAA-MM-DD-F-000/
- **Commit:** [hash curto] — [mensagem]
- **Pendências para a próxima sessão:** [...]
