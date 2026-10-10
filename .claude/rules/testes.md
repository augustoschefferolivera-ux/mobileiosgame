---
paths:
  - "tests/**"
  - "**/*Tests/**"
  - "**/*.test.ts"
  - "**/*_test.gd"
  - "production/evidencias/**"
  - "scripts/verify.sh"
---
# Regras para testes e evidência

- Um parse check não é uma execução. A evidência de uma feature é: saída do teste + screenshot
  do jogo rodando + trecho de log, em `production/evidencias/<data>-<id>/`, referenciada em
  `feature_list.json` no campo `evidencia`.
- Teste o que o jogador vê: estado após a ação (posição, pontuação, cena), não só a função.
- Não desabilite, pule ou apague testes para ficar verde. Flake se investiga; se não reproduz,
  registre e mantenha o teste.
- Multiplayer e física: testes diferenciais (mesma entrada → mesmo estado) e replays gravados.
- `scripts/verify.sh` deve ser determinístico, terminar em menos de 10 minutos e sair ≠0 em
  qualquer falha; é ele que o Stop hook e o CI usam.
