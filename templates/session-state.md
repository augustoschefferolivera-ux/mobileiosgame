<!--
Template: session-state.md — checkpoint de sessão, em production/session-state/active.md.
Adaptado de Claude-Code-Game-Studios (Donchitos, MIT), .claude/docs/templates/session-state.md
https://github.com/Donchitos/Claude-Code-Game-Studios

COMO ESTE ARQUIVO FUNCIONA (leia antes de editar):
  * O bloco CHECKPOINT é a parte que máquinas leem: um hook SessionStart pode mostrá-lo verbatim após
    /clear ou compactação. Por isso é LIMITADO POR CONSTRUÇÃO: ≤ 25 linhas, SOBRESCRITO a cada atualização.
  * Tudo depois de /CHECKPOINT é narrativa livre. Nenhum hook injeta; pode crescer. Ao passar de ~200
    linhas, mova para production/session-logs/AAAA-MM-DD.md e comece de novo.
  * Diferença para progress.md: progress.md é a memória do PROJETO (histórico, decisões); este arquivo é
    o estado da SESSÃO corrente (o que está no meio do caminho agora). Em projetos solo pode-se usar
    só progress.md; mantenha os dois sincronizados se usar ambos.
-->
# Estado da sessão — [projeto ou branch]

<!-- STATUS -->
Feature:
Tarefa:
<!-- /STATUS -->

<!-- CHECKPOINT -->
**Atualizado:** AAAA-MM-DD HH:MM
**Branch:** `[branch]`
**Tarefa atual:** [uma linha — o que está sendo feito agora; "corrigindo a coisa" não serve, "adicionando colisão da peça em Tabuleiro.swift" serve]
**Próximo passo:** [a próxima ação, concreta o bastante para retomar frio]
**Bloqueado em:** [uma linha, ou `nada`]
**Arquivos em progresso:** [caminhos, separados por vírgula, ou `nenhum`]
**Resultado da execução:** [OBSERVADO — o que apareceu na tela, com caminho do PNG | NÃO VERIFICADO — motivo | N/A — motivo]
**Perguntas abertas:** [uma por linha, ou `nenhuma`]
<!-- /CHECKPOINT -->

---

## Notas

[Livre. Decisões e motivos, o que foi tentado e rejeitado, contexto caro de reconstruir.
Escreva para a pessoa ou o agente que pegar isto frio.]

<!--
NOTAS DE CAMPO
  STATUS — alimenta uma status line, se houver. Campos opcionais; mantenha os marcadores mesmo vazios.
  CHECKPOINT — a carga de recuperação. Escreva de modo que um leitor frio retome sem abrir mais nada.
  Resultado da execução — vocabulário fixo (OBSERVADO / NÃO VERIFICADO / N/A) para que /ciclo-de-feature
  e o crítico leiam a mesma coisa. "NÃO VERIFICADO" é bloqueio para feature visível, não observação.
-->
