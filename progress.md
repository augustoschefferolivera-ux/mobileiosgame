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
# Progresso — jogo web (nome definitivo no brief)

<!-- CHECKPOINT -->
**Atualizado:** 2026-10-10
**Branch:** `claude/pesquisa-criacao-jogos-ia`
**Feature em andamento:** nenhuma (F-000 done)
**Próximo passo:** `/brief-do-jogo` com a ideia do usuário → MVP vira features em feature_list.json → `/direcao-de-arte-e-style-card`
**Último verify:** OK — `VERIFY_BROWSER=chromium bash scripts/verify.sh --feature F-000` em 2026-10-10 15:25 (10 s)
**Última evidência:** production/evidencias/2026-10-10-F-000/ (screenshot menu, fps 57, sem erros)
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
- 2026-10-10 — ADR-0001: web em código puro, Phaser 4.2.1 + TypeScript + Vite 8, PWA primeiro; premissa 2D a confirmar no brief — motivo: menor atrito para o agente (ciclo 100% local no Arch, tudo texto, mais dados de treino); App Store via Capacitor só depois (4.2/4.7).
- 2026-10-10 — Perfil de máquina: Arch Linux + estação GPU remota (Windows/RTX via Tailscale) + macOS só na nuvem (playbook/07).

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
