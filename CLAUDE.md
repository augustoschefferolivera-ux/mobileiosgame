# Jogo 100% por IA — instruções do projeto

Este repositório é um framework para construir jogos 2D ou 3D, para mobile (iOS primeiro) e
web, com agentes de código fazendo código, arte, áudio e testes. Ele é composto por um
roteiro passo a passo (`playbook/`), um banco de skills (`.claude/skills/`), subagentes
(`.claude/agents/`), regras por caminho (`.claude/rules/`), hooks (`.claude/settings.json`)
e templates (`templates/`). Tudo foi construído sobre estruturas já validadas: o padrão
Agent Skills, o harness de longa duração da Anthropic, o template Claude-Code-Game-Studios
(MIT) e os plug-ins oficiais da Unity, da Apple e da Roblox. Na primeira sessão leia
`playbook/00-leia-primeiro.md`.

## Regras não negociáveis

1. **Um parse check não é uma execução.** "Pronto" significa: construído, executado,
   observado, com evidência (screenshot, log ou arquivo) gravada em
   `production/evidencias/<data>-<id>/`. Sem evidência, o status fica `in_progress`.
2. **Uma feature por sessão**, escolhida em `feature_list.json` (JSON, não Markdown).
   Critério de aceite verificável antes de codar. Nunca marque `done` sem evidência.
3. **`progress.md` é a memória, não a conversa.** Leia no início da sessão e após qualquer
   compactação; atualize antes de encerrar (`/checkpoint-e-retomada`).
4. **Quem constrói não avalia.** Toda feature visível passa pelo subagente `critico`
   (`/critico-independente`) com rubrica objetiva antes de fechar.
5. **Diff pequeno, arquitetura pequena.** O humano precisa conseguir explicar cada módulo.
   Se não consegue, pare e simplifique (`/escopo-e-anti-padroes`).
6. **Licença antes de gerar.** Só modelos/ferramentas com saída comercial global
   (MIT, Apache 2.0 ou plano comercial). Lista vermelha em `templates/LICENCAS.md`
   (ex.: Hunyuan3D exclui UE/UK/Coreia; FLUX.1 [dev] não pode ser servido; Suno/Udio em
   litígio). Cada asset gerado recebe uma linha em `PROVENANCE.md` (modelo, versão, seed,
   prompt, edição humana) — é a prova de intervenção humana que gera direito autoral.
7. **Loja e privacidade desde o início.** Nenhum dado pessoal vai para IA de terceiros sem
   consentimento explícito (App Store 5.1.2(i)). Nenhum placeholder, prompt ou nome de
   modelo no build (2.1(a)). Classificação etária decidida no brief (loot box = 18+ no Brasil).
8. **Não invente.** Ferramenta, versão, flag, preço ou regra que não veio de fonte lida é
   marcada "[confirmar]". Na dúvida, diga onde verificar.
9. **Git:** commit ao fim de cada feature com evidência, mensagem descritiva. Nunca
   `--force`, `reset --hard`, `rm -rf`. Branch por feature quando o repositório for compartilhado.
10. **Verificação é a feature mais importante.** No dia 1 monte o loop
    construir → rodar → screenshot → ler log (`/montar-loop-de-verificacao`) antes de
    qualquer gameplay. Sem esse loop o agente não vê o que faz.

## Como trabalhar

- Projeto novo: `/iniciar-projeto`. Sessão seguinte: `/checkpoint-e-retomada`.
- Ciclo: `/ciclo-de-feature` → `scripts/verify.sh` → evidência → `/critico-independente` → commit.
- Assets: só depois de `/direcao-de-arte-e-style-card` e `/direcao-de-audio-e-sound-bible`;
  então `/gerar-sprites-2d`, `/pixel-art-pipeline`, `/gerar-ativos-3d`, `/gerar-musica`,
  `/gerar-sfx`, `/voz-e-dialogo`; sempre com "Exportar para mobile" e linha no `PROVENANCE.md`.
- IA no jogo: `/ia-runtime-foundation-models` primeiro (on-device grátis), nuvem só com motivo.
- Publicar: `/licencas-e-proveniencia` → `/divulgacao-de-uso-de-ia` → `/classificacao-etaria`
  → `/submissao-app-store` ou `/publicar-jogo-web`.
- Índice de todas as skills, por fase e por alvo: `playbook/06-indice-de-skills.md`.

## Perfil de máquina (ver `playbook/07-perfil-arch-linux-e-gpu-remota.md`)

- Desenvolvimento em **Arch Linux**: agente, código, Godot/Phaser e `scripts/verify.sh` rodam aqui.
- **Estação GPU remota** (Windows + RTX via SSH/Tailscale): geração local de áudio, voz, recorte e
  Blender por `.claude/skills/estacao-gpu-remota/scripts/gpu.sh` (`status|run|push|pull|tunnel`).
  Com 8 GB de VRAM, imagem HD e 3D ficam nas APIs comerciais.
- **macOS só remoto** (Xcode Cloud / GitHub Actions / Mac na nuvem) para compilar, assinar e enviar
  ao TestFlight: `/build-ios-sem-mac`. Nunca macOS em VM em hardware não Apple (EULA).
- `.mcp.json` traz só servidores que rodam em Linux; os de macOS estão em `.mcp.macos.json`.

## Stack deste projeto

Preencha ao rodar `/escolher-engine-e-alvo` (gera `docs/decisoes/ADR-0001-engine-e-alvo.md`):

- Engine: _a definir_ (SwiftUI+SpriteKit · RealityKit · Unity 6.3 LTS · Godot 4.7 · Phaser/PixiJS · Three.js/Babylon.js)
- Alvo: _2D ou 3D_ × _app iOS ou web (PWA/Capacitor)_
- Versões fixadas e documentação da versão: `docs/decisoes/`
- Idioma do jogo: pt-BR (+ en), orientação, dispositivo mínimo: ver `design/game-brief.md`

## Mapa do repositório

```
CLAUDE.md / AGENTS.md      instruções (Claude Code / Codex)
playbook/                  roteiro passo a passo, regras, stack, ferramentas, riscos, índice, perfil Arch+GPU remota
.claude/skills/            banco de skills (/nome)
.claude/agents/            subagentes: critico, playtester, revisor-de-codigo, diretor-de-arte,
                           diretor-de-audio, revisor-de-loja-e-legal, engenheiro-de-performance
.claude/rules/             regras por caminho (Swift, GDScript, C#, TypeScript, assets, testes)
.claude/hooks/             scripts dos hooks (SessionStart, PreToolUse, PostToolUse, Stop)
.mcp.json / .mcp.macos.json  MCPs que rodam em Linux (Blender, ElevenLabs) / só em macOS (Xcode, MobileBuildMCP, simulador)
templates/                 brief, feature_list.json, progress.md, art/sound bible, PROVENANCE, LICENCAS
scripts/                   verify.sh (despachante), check-skills.py
design/ docs/ production/  artefatos do jogo em construção (brief, ADRs, evidências, críticas)
reports/ research_notes/   pesquisa que fundamenta tudo (out/2026)
```

## Hooks ativos

- `SessionStart`: injeta `progress.md` e a próxima feature de `feature_list.json`.
- `PreToolUse (Bash)`: bloqueia `git commit` com placeholders nos arquivos staged ou com
  feature `done` sem evidência; bloqueia push forçado.
- `PostToolUse (Write|Edit)`: avisa quando um arquivo de código/asset recebe placeholder,
  texto de IA ou nome de modelo.
- `Stop`: impede encerrar o turno com feature `in_progress` sem evidência ou `done` sem
  pasta de evidência. Para pausar legitimamente, mude o status para `blocked` com `motivo`.

Regras detalhadas e hábitos: `playbook/02-regras-e-habitos.md`.
