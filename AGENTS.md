# Instruções para agentes (Codex e outros)

Este arquivo espelha `CLAUDE.md` para agentes que leem `AGENTS.md`. As skills seguem o
padrão aberto Agent Skills e ficam em `.claude/skills/` (também acessíveis via o link
`.agents/skills`). Leia `CLAUDE.md` na íntegra: as dez regras não negociáveis, o fluxo de
trabalho e o mapa do repositório valem para qualquer agente.

Resumo operacional:

1. Comece por `playbook/00-leia-primeiro.md`; depois `playbook/01-roteiro-passo-a-passo.md`.
2. Leia `progress.md` e `feature_list.json` antes de agir; uma feature por sessão.
3. "Pronto" exige evidência em `production/evidencias/` (screenshot, log, arquivo).
4. Licença de saída e `PROVENANCE.md` para todo asset gerado; lista vermelha em `templates/LICENCAS.md`.
5. Nunca `git push --force`, `git reset --hard`, `rm -rf`; nunca segredos no repositório.
6. Plug-ins oficiais a instalar conforme a engine: `Unity-Technologies/unity-agent-plugin`,
   `apple/game-porting-toolkit`, `Roblox/roblox-studio-agent-plugin` (todos publicam versões para Codex).
