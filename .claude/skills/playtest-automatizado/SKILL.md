---
name: playtest-automatizado
description: >
  Executa o loop de playtest por agente em um jogo iOS/web: três camadas (agentes nativos do
  Xcode 27; MobileBuildMCP + ios-simulator-mcp; Maestro YAML para menus), computer use no
  Simulator, roteiro em production/playtests/<data>.md, captura de FPS (MetricKit do iOS 27,
  canal de debug), comparação de screenshots por visão e por diff de pixels, com crítico separado
  do construtor. Use sempre que uma feature visível ao jogador for declarada pronta, quando o
  usuário pedir "teste o jogo", "jogue", "QA", "regressão" ou "compare com a referência".
  Não use para configurar o ambiente (xcode-agentico) nem para testes unitários (skills engine-*).
license: MIT
compatibility: "macOS com Xcode 26.3+/27 para simulador; Node 18+ para MCPs; Java para Maestro; Python 3 (+Pillow opcional) para comparar screenshots; web: Playwright em qualquer SO"
metadata:
  grupo: engines
  alvo: [2d, 3d, app, web]
  fase: [3, 5, 8]
argument-hint: "[feature] [simulador]"
disable-model-invocation: false
user-invocable: true
---

# Playtest automatizado por agente

Entrega um relatório `production/playtests/<data>-<feature>.md` com passos executados, screenshots antes/depois, estado do jogo (`debug_state.json`), FPS medido, bugs e veredito de um **crítico em contexto limpo** — e a evidência copiada para `production/evidencias/<data>-<feature>/`. Sem relatório e screenshots, a feature não fecha.

## Quando usar / quando não usar

- **Use** ao fim de cada feature (fase 5), em regressão antes de TestFlight (fase 8) e sempre que o construtor disser "pronto": o padrão que funcionou em público (Anthropic, Claude-Code-Game-Studios, "Gauntlet Loop" de Shumer) separa quem constrói de quem avalia.
- **Não use** como substituto de playtest humano: o melhor caso público de jogo construído por agente parou "pouco acima de 5/10" no próprio crítico automatizado; não há benchmark publicado de agentes jogando jogos mobile. O agente encontra crashes, softlocks, telas quebradas e regressões — não diz se o jogo é divertido.

## Pré-requisitos

- Ambiente de `/xcode-agentico` (Xcode MCP; opcional MobileBuildMCP, ios-simulator-mcp ≥ 1.3.3) ou, para web, Playwright (`engine-web-*`).
- Canal de debug no jogo (`debug_state.json`/`__GAME_DEBUG__`) — sem ele o agente só vê pixels.
- Maestro (Apache 2.0) só para menus com acessibilidade: `curl -Ls "https://get.maestro.mobile.dev" | bash` [confirme no README], `maestro mcp` para o agente; flows em `.maestro/*.yaml`. Não suporta iPhone físico.
- Opcional: Pillow (`pip install pillow`) para `scripts/comparar-screenshots.py`.

## Entradas

- Feature e critério de aceite (de `feature_list.json`), build (scheme/simulador ou URL), screenshots de referência (mockups da direção de arte) em `production/referencias/`, roteiro anterior se for regressão.

## Passos

1. **Criar o roteiro**: `scripts/novo-playtest.sh <feature>` gera `production/playtests/<data>-<feature>.md` a partir de `assets/playtest-template.md` (objetivo, build, dispositivo, passos com coordenadas, esperado/observado, métricas, bugs, veredito). Estrutura em `references/roteiro-playtest.md`.
2. **Escolher a camada**:
   - **Xcode 27** (macOS 26.6+, Apple silicon): o agente boota, instala, lança, "tap, swipe, and type", captura screenshot e lê crashes/hangs do Organizer. Primeira opção.
   - **MobileBuildMCP + ios-simulator-mcp** (Xcode 16–26.x): build/log/LLDB + `ui_tap`/`ui_swipe`/`screenshot`/`record_video`.
   - **Maestro**: flows YAML (`launchApp`, `tapOn: id`, `assertVisible`) para menus SwiftUI/UIKit com `accessibilityIdentifier`; roda no CI; cego para canvas.
   - **Computer use** do Claude Code: diálogos do sistema e Simulator.app; último recurso (caro).
   - **Web**: `engine-web-*/scripts/playtest.mjs --taps "x,y;x,y"`.
3. **Executar o roteiro**: para cada passo, screenshot antes → ação (coordenada ou id) → espera → screenshot depois → `debug_state.json` → trecho de log. Coordenadas em pontos do simulador padrão (ex.: iPhone 17 retrato); registre no roteiro. Gravação de vídeo (`record_video`/Device Hub) para bugs intermitentes.
4. **Medir FPS**: (a) `debug_state.json.fps` (média móvel do próprio jogo); (b) Metal Performance HUD (Xcode 26+) para leitura visual; (c) em dispositivo, **MetricKit do iOS 27** (API Swift-first `MetricManager`, taxa de quadros Metal, `StateReporting` por tela) — integre o recebimento e grave em `Documents/metrics/`; (d) Instruments via `xcrun xctrace record` quando precisar de perfil completo. Alvo e dispositivo mínimo vêm do brief.
5. **Comparar screenshots**: por **visão** (o crítico descreve diferenças entre `depois.png` e a referência: layout, cores, elementos faltando, texto cortado, safe area) e por **pixels** quando houver referência exata (`scripts/comparar-screenshots.py ref.png atual.png --limiar 2.0` → percentual de pixels diferentes + imagem de diff). Texturas/partículas aleatórias tornam o diff ruidoso: compare regiões fixas (HUD) ou use seed fixo no modo debug.
6. **Crítico separado**: lance um subagente em contexto limpo (sem o histórico do construtor) com o roteiro, as screenshots e o critério de aceite; ele preenche "observado", lista bugs com reprodução e dá veredito `aprovado | reprovado | bloqueado`. Nunca deixe o construtor avaliar o próprio trabalho; espere que o crítico aponte lacunas mesmo em trabalho bom (a doc do Claude Code avisa isso) e exija que cada bug tenha screenshot.
7. **Fechar**: copie screenshots, `debug_state.json`, logs, diffs e o relatório para `production/evidencias/<data>-<feature>/`; só então `feature_list.json` muda para `passing`. Bugs viram features `failing` novas.
8. **Regressão** (fase 8): reexecute os roteiros anteriores (Maestro para menus no CI; scripts de toque para gameplay) antes de cada build TestFlight.

## Critério de pronto e evidência

- `production/playtests/<data>-<feature>.md` completo, com veredito do crítico e pelo menos um par antes/depois por passo.
- `production/evidencias/<data>-<feature>/` com screenshots, `debug_state.json`, log, `fps.txt` (ou saída MetricKit) e `diff-*.png` quando houve referência.
- Reprovado ou bloqueado → feature continua `in_progress`. "Rodou sem crash" não é aprovação sem conferir o critério de aceite.

## Verificar no simulador/dispositivo

- Simulador: fluxo acima. **Haptics, Game Center real, performance térmica e MetricKit só em dispositivo**: instale o build TestFlight (`/ci-xcode-cloud-fastlane`), jogue o roteiro manualmente ou com Xcode 27 (Device Hub também controla dispositivos; sem dois dedos), puxe `debug_state.json`/métricas com `xcrun devicectl device copy from`.

## Armadilhas conhecidas

- **Árvore de acessibilidade ausente** no canvas: Maestro/AXe/`ui_describe_all` não servem para gameplay; coordenadas + canal de debug sim.
- **Coordenadas frágeis**: mudam com dispositivo/orientação; fixe o simulador padrão e exporte posições lógicas no `debug_state.json`.
- **Screenshots enganosas**: frame congelado parece vivo (a skill `unity-cli` da Unity alerta para isso); confirme `frame` crescendo no `debug_state.json` entre duas leituras.
- **Diálogos do sistema** (permissões, Game Center) bloqueiam o toque por coordenada; trate com computer use ou configure o simulador antes.
- **VLMs e jogos**: avaliação visual de qualidade por modelos é pouco confiável e sem benchmark para mobile; use-a para detectar quebras, não para notas de "diversão".
- **Dois dedos** (pinch) não disponíveis no Device Hub; gamepad só visionOS.
- **Custo**: cada screenshot lida pelo modelo custa tokens; limite a 2 por passo e use `max_resolution`/redimensione antes de enviar ao crítico.
- **Licenças**: Maestro Apache 2.0 (Studio gratuito não é open source; Cloud pago); MCPs MIT; Pillow HPND.

## Fontes

- Xcode 27 Release Notes (agentes no simulador; Device Hub; limites): https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- getsentry/MobileBuildMCP: https://github.com/getsentry/MobileBuildMCP ; joshuayoes/ios-simulator-mcp: https://github.com/joshuayoes/ios-simulator-mcp
- mobile-dev-inc/maestro (Apache 2.0; `maestro mcp`; sem iPhone físico): https://github.com/mobile-dev-inc/maestro
- Claude Code computer use (ordem MCP > Bash > navegador > computer use; simuladores): https://code.claude.com/docs/en/computer-use
- WWDC26 sessão 222 "Meet the new MetricKit": https://developer.apple.com/videos/play/wwdc2026/222/
- Anthropic — Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents ; Claude Code best practices (verificação, subagente revisor): https://www.anthropic.com/engineering/claude-code-best-practices
- Claude-Code-Game-Studios (evidência obrigatória; `/playtest-report`): https://github.com/Donchitos/Claude-Code-Game-Studios
- FPS de Shumer / Gauntlet Loop (crítico separado, ~5/10): https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design
- Interacting with devices using the command line: https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- Relatório interno, seção "Testes e publicação": `reports/Criação de jogos totalmente por IA.md`
