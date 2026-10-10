# Avisos de terceiros e créditos

Este framework compõe e adapta estruturas existentes. Nada dos itens abaixo é redistribuído
na íntegra; onde texto foi adaptado, a licença de origem permite e o crédito está aqui.

| Fonte | Licença | Como foi usado |
|---|---|---|
| Agent Skills (agentskills.io) e documentação do Claude Code (code.claude.com) | — | Formato de `SKILL.md`, frontmatter, subagentes, hooks, `.mcp.json`, regras por caminho |
| Anthropic, "Effective harnesses for long-running agents" (nov/2025) e "Claude Code best practices" | — | Padrão inicializador + `feature_list.json` + `progress.md` + `init.sh`; Stop hook como gate; revisor em contexto limpo |
| anthropics/skills (skill-creator, webapp-testing, template) | ver LICENSE de cada skill | Padrões de escrita (progressive disclosure, descrições "insistentes"), padrão Playwright |
| Donchitos/Claude-Code-Game-Studios | MIT © 2026 Donchitos | (ver também os THIRD_PARTY_NOTICES.md dentro de `.claude/skills/gerar-ativos-3d/` e `otimizar-3d-para-mobile/`)  Regra "a parse check is not a run" e evidência em QA; resolução de raiz nos hooks; regras por caminho; templates adaptados (game-brief, test-evidence, session-state, ADR, art-bible, sound-bible, release-checklist, launch-checklist → `templates/checklist-submissao-app-store.md`, post-mortem → `pos-lancamento-e-telemetria/references/post-mortem.md`); regras de escopo do day-one-patch e monitoramento pós-release do agente release-manager (skill `pos-lancamento-e-telemetria`); ideia de rigor `minimal` |
| Unity-Technologies/unity-agent-plugin | Unity Companion License | Apenas referenciado pelo nome das skills; nenhum texto copiado |
| apple/game-porting-toolkit (skills) | Apache 2.0 | Apenas referenciado pelo nome das skills; instalação via `/plugin marketplace add` |
| Roblox/roblox-studio-agent-plugin | ver repositório | Apenas referenciado |
| CoplayDev/unity-mcp, hi-godot/godot-ai, getsentry/MobileBuildMCP, joshuayoes/ios-simulator-mcp, ahujasid/mcp-for-blender | MIT | Configuração em `.mcp.json` e instruções de instalação; nenhum código incluído |
| Ferramentas MIT/Apache chamadas por scripts: meshoptimizer/gltfpack, glTF-Transform, pyloudnorm, PyMusicLooper, BiRefNet/rembg, c2pa-rs | MIT / Apache 2.0 | Chamadas por scripts das skills; instaladas pelo usuário |

Relatório e notas de pesquisa (`reports/`, `research_notes/`) citam todas as fontes
secundárias usadas, com URL e data de leitura (10/10/2026).

Créditos adicionais por skill estão em `.claude/skills/gerar-ativos-3d/THIRD_PARTY_NOTICES.md` e `.claude/skills/otimizar-3d-para-mobile/THIRD_PARTY_NOTICES.md`.
