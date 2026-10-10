# Leia primeiro

Este repositório é um **framework de produção**, não um tutorial. Ele transforma o que a
pesquisa de outubro de 2026 mostrou funcionar em um conjunto de instruções que um agente de
código executa e um humano supervisiona. O relatório completo que o fundamenta está em
`reports/Criação de jogos totalmente por IA.md`; as notas, em `research_notes/`.

## A ideia em três frases

1. **Gerar ficou fácil; verificar e licenciar é o gargalo.** O único experimento controlado
   disponível (quatro jogos do mesmo briefing com níveis diferentes de documentação) colocou o
   modo com 30 documentos em último lugar. O que elevou a qualidade no melhor caso público
   (FPS de Matt Shumer com Claude Opus 5, jul/2026) foi um crítico separado do construtor
   julgando com métrica objetiva.
2. **O agente precisa ver o jogo rodando.** Tudo que importa aqui — Stop hook, `scripts/verify.sh`,
   MCP do Xcode 27, Godot AI, MobileBuildMCP — existe para fechar o ciclo
   construir → rodar → screenshot → ler log sem um humano no meio.
3. **Licença e loja decidem onde o jogo pode existir.** Modelos com cláusula territorial
   (Hunyuan3D), músicas em litígio (Suno/Udio), dados pessoais enviados a IA sem consentimento
   (App Store 5.1.2(i)) e placeholders esquecidos (2.1(a)) derrubam um jogo bom.

## Para quem é

Desenvolvedor solo ou equipe pequena, no Brasil, construindo um jogo 2D ou 3D para iOS
(prioridade) ou web, com Claude Code ou Codex. Requisitos práticos: Linux (este repositório assume Arch; ver `07-perfil-arch-linux-e-gpu-remota.md`)
ou macOS; Node 18+, `uv` (para MCPs Python), Python 3.10+, Git; para iOS, um Mac local com Xcode
26.3+ **ou** macOS remoto (Xcode Cloud / GitHub Actions) via `/build-ios-sem-mac`; opcionalmente uma
estação com GPU NVIDIA acessível por SSH (`/estacao-gpu-remota`); contas conforme as ferramentas
(`playbook/04-ferramentas-e-mcps.md`).

## Ordem de leitura

| Quando | Leia |
|---|---|
| Agora (10 min) | este arquivo; `CLAUDE.md` (as 10 regras) |
| Antes de começar o projeto (30 min) | `01-roteiro-passo-a-passo.md` (fases 0–3 com atenção); `03-stack-por-alvo.md` |
| Ao configurar a máquina | `04-ferramentas-e-mcps.md`; em Linux com GPU remota, `07-perfil-arch-linux-e-gpu-remota.md` |
| Antes de gerar qualquer asset | `05-riscos-e-licencas.md`; `templates/LICENCAS.md` |
| Sempre que uma skill for necessária | `06-indice-de-skills.md` (gerado) → `.claude/skills/<nome>/SKILL.md` |
| Quando algo sair do controle | `02-regras-e-habitos.md`; `/escopo-e-anti-padroes` |

## O que fazer na primeira sessão

```text
/iniciar-projeto
```

A skill conduz: entrevista curta → `design/game-brief.md` (uma página) →
`docs/decisoes/ADR-0001-engine-e-alvo.md` → `feature_list.json`, `progress.md`, `init.sh` →
`/instalar-ferramentas` → `/montar-loop-de-verificacao` → primeiro commit. Só depois disso a
primeira feature de gameplay começa. Isso é deliberado: sem o loop de verificação o agente
"declara pronto" sem ver.

## Como este framework evolui

As ferramentas mudam a cada trimestre (três modelos de vídeo trocaram de nome em 2026; o
Mixamo entrou em manutenção; o Sora 2 foi encerrado). Preços, datas e licenças marcados
"[confirmar]" vieram de fontes secundárias porque as páginas oficiais estavam bloqueadas no
ambiente de pesquisa: valide antes de depender. Para adicionar ou corrigir uma skill use
`/criar-ou-melhorar-skill` e rode `python3 scripts/check-skills.py`.
