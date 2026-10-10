# mobileiosgame — framework para criar jogos 100% com IA

Um roteiro passo a passo, um banco de skills, hooks e subagentes para construir **um jogo web
mobile em Phaser 4 + TypeScript (Three.js se 3D), PWA primeiro e App Store via Capacitor depois**,
usando agentes de código (Claude Code, Codex) para código, arte 2D/3D, áudio, testes e publicação.
Decisão de engine: `docs/decisoes/ADR-0001-engine-e-alvo.md`; engines nativas, Unity e Godot foram
removidas do repositório para reduzir ruído (histórico no Git). Nada aqui foi inventado do zero: o framework compõe
estruturas já validadas em outubro de 2026 e as adapta ao caso mobile + assets gerados por IA.

| Peça | Onde | Baseado em |
|---|---|---|
| Roteiro passo a passo (fases 0–10) | `playbook/01-roteiro-passo-a-passo.md` | harness de longa duração da Anthropic; Claude-Code-Game-Studios (MIT) |
| Regras e hábitos | `CLAUDE.md`, `playbook/02-regras-e-habitos.md`, `.claude/rules/` | Claude Code best practices; relatos de produção 2025–2026 |
| Banco de skills (`/nome`) | `.claude/skills/` (índice em `playbook/06-indice-de-skills.md`) | padrão Agent Skills; plug-ins oficiais Unity, Apple GPTK, Roblox |
| Subagentes (crítico, playtester, diretores) | `.claude/agents/` | "Gauntlet Loop"; subagentes do Claude Code |
| Hooks (evidência obrigatória, placeholders, commits) | `.claude/settings.json`, `.claude/hooks/` | Stop hook como gate determinístico |
| MCPs (Xcode, MobileBuildMCP, simulador, Blender, ElevenLabs) | `.mcp.json`, `playbook/04-ferramentas-e-mcps.md` | servidores mantidos pela comunidade/fabricantes |
| Templates (brief, feature_list.json, art/sound bible, PROVENANCE, LICENCAS) | `templates/` | Anthropic; Game Studios (MIT) |
| Perfil Arch Linux + GPU remota + Mac na nuvem | `playbook/07-perfil-arch-linux-e-gpu-remota.md`, `/estacao-gpu-remota`, `/build-ios-sem-mac` | OpenSSH/Tailscale, ComfyUI API, Xcode Cloud, GitHub Actions macOS |
| Pesquisa que fundamenta tudo | `reports/`, `research_notes/` | 7 frentes, 200+ fontes, out/2026 |

## Começar em 15 minutos

```bash
# 1. Abra o Claude Code (ou Codex) na raiz deste repositório
claude

# 2. Na primeira sessão
/iniciar-projeto          # entrevista curta → brief → engine/alvo → esqueleto → loop de verificação

# 3. Nas sessões seguintes
/checkpoint-e-retomada    # lê progress.md e a próxima feature
/ciclo-de-feature         # uma feature por sessão, com evidência e crítico
```

Leia `playbook/00-leia-primeiro.md` antes. A regra central, extraída do único experimento
controlado disponível: **o agente precisa ver o jogo rodando**; documentação em excesso não
compra qualidade, verificação compra.

## Idioma e escopo

Documentação em português do Brasil; nomes de produtos exatamente como os fabricantes
escrevem. Preços, datas e termos de licença marcados "[confirmar]" vieram de fontes
secundárias (as páginas oficiais estavam bloqueadas no ambiente de pesquisa). Valide-os
antes de depender deles.
