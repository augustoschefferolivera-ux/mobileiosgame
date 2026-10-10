---
paths:
  - ".claude/skills/**"
  - ".claude/agents/**"
  - "playbook/**"
  - "templates/**"
---
# Regras para editar o framework (skills, agentes, playbook, templates)

- Siga `playbook/CONVENCOES-DE-SKILLS.md`: frontmatter com `name` igual ao diretório,
  `description` que diz o que faz e quando usar, corpo ≤ 300 linhas, seções obrigatórias,
  fontes com URL, incertezas marcadas "[confirmar]".
- Não copie texto de plug-ins com licença restritiva (Unity Companion License); cite o nome da
  skill oficial e quando invocá-la. Conteúdo adaptado do Claude-Code-Game-Studios (MIT) ou do
  Game Porting Toolkit (Apache 2.0) recebe crédito em `THIRD_PARTY_NOTICES.md`.
- Depois de qualquer mudança rode `python3 scripts/check-skills.py` (valida e regenera
  `playbook/06-indice-de-skills.md`).
- Nunca invente ferramenta, flag, versão ou preço. Na dúvida, aponte a URL onde verificar.
