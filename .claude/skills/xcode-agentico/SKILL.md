---
name: xcode-agentico
description: >
  Conecta o agente ao Xcode 26.3/27 como servidor MCP (xcrun mcpbridge), configura agentes que
  bootam simulador, tocam, digitam e tiram screenshot (Xcode 27), lldb-mcp, Device Hub, insights
  do Organizer, modo sem supervisão (xcrun mcp-server) e os MCPs complementares MobileBuildMCP e
  ios-simulator-mcp; define a estratégia para testar cenas de jogo sem árvore de acessibilidade
  (toque por coordenada + screenshot + canal de debug). Use sempre que precisar que o Claude Code
  compile, rode, toque ou inspecione um app iOS no simulador/dispositivo, ou ao configurar o
  ambiente de desenvolvimento iOS para IA. Não use para escrever o jogo em si (skills engine-*)
  nem para CI (ci-xcode-cloud-fastlane).
license: MIT
compatibility: "macOS; Xcode 26.3+ (MCP) ou Xcode 27 (simulador por agentes; macOS Tahoe 26.6+, Apple silicon); Node 18+ para MobileBuildMCP/ios-simulator-mcp"
metadata:
  grupo: engines
  alvo: [2d, 3d, app]
  fase: [0, 3]
argument-hint: "[nome-do-projeto]"
disable-model-invocation: false
user-invocable: true
---

# Xcode agêntico: MCP, simulador e canal de depuração

Entrega um ambiente em que o agente constrói, roda e observa o jogo iOS sem intervenção humana: Xcode exposto por MCP, simulador controlável, logs e estado do jogo legíveis. Evidência: `claude mcp list` mostra `xcode` (e opcionais) conectados e um ciclo build → launch → screenshot → leitura de `debug_state.json` gravado em `production/evidencias/<data>-ambiente-xcode/`.

## Quando usar / quando não usar

- **Use** na fase 0 (preparação) e sempre que o loop de verificação (fase 3) quebrar: MCP desconectado, simulador que não boota, screenshot preto, app que não loga.
- **Use** para escolher a camada certa: Xcode 27 nativo → MobileBuildMCP/ios-simulator-mcp → Claude Code computer use (nessa ordem; a doc do Claude Code prioriza MCP > Bash > navegador > computer use).
- **Não use** para automação de CI (sem Xcode aberto): `/ci-xcode-cloud-fastlane`. Não use para Unity/Godot antes do export (`engine-unity-mobile`, `engine-godot-mobile` cuidam da parte do engine; a parte Xcode gerada volta para aqui).

## Pré-requisitos

- Xcode 26.3+ instalado e aberto no projeto; macOS Sequoia 15.6+ para 26.3; **Xcode 27 exige macOS Tahoe 26.6+ e Apple silicon**.
- Em Xcode → Settings → Intelligence: ative "Allow external agents to use Xcode tools".
- Claude Code (Pro/Max para computer use), Node 18+ (MobileBuildMCP exige macOS 14.5+ e Xcode 16+), Git.

## Entradas

- Projeto Xcode (nativo, Capacitor, Unity-iPhone ou export do Godot), nome do scheme, bundle id, simulador alvo.

## Passos

1. **Xcode como MCP** (Xcode 26.3+):

```bash
claude mcp add --transport stdio xcode -- xcrun mcpbridge
claude mcp list   # esperado: xcode ✔ Connected (projeto precisa estar aberto no Xcode)
```

   Codex: `codex mcp add xcode -- xcrun mcpbridge`. Ferramentas incluem build, testes, preview SwiftUI e (Xcode 27) debug/run state, trocar scheme/destino, editar build settings/entitlements/Info.plist, insights do Organizer. Permissões por ferramenta ficam no Xcode; **negar acesso a um projeto em Desktop/Downloads/Documents no 26.3 é irreversível** sem ir em Ajustes do Sistema → Privacidade.
2. **Simulador por agentes** (Xcode 27): "Agents can now boot simulators, install and launch apps, synthesize touch events, and capture screenshots". Peça ao agente: "boot iPhone 17, instale e lance o scheme X, toque em (195, 600), capture screenshot". Limites documentados: Device Hub não envia toque de dois dedos; game controller só no simulador de visionOS. Device Hub salva screenshots em resolução total e vídeos no Desktop.
3. **Depuração**: `lldb-mcp` (Xcode 27) para breakpoints/variáveis; insights (crashes, hangs, energia, disk writes, launch) do Organizer via MCP — "pull up the top crashes from the latest release" e corrigir com o log simbolizado.
4. **MCPs complementares** (Xcode 16–26.x ou automação mais rica), ver `references/mcp-servidores.md`:

```bash
claude mcp add --transport stdio mobilebuild -- npx -y mobilebuildmcp@latest mcp
claude mcp add --transport stdio ios-simulator -- npx -y ios-simulator-mcp   # ≥ 1.3.3; confirme comando no README
```

   MobileBuildMCP: build/test de simulador, produtos de teste portáveis, automação de UI por AXe, LLDB, dispositivo físico (exige assinatura), proxy das ferramentas do MCP do Xcode 26.3, Device Hub do Xcode 27 (≥ 2.7.0); skills para o agente com `npx -y mobilebuildmcp@latest init`. ios-simulator-mcp: `ui_tap`, `ui_swipe`, `ui_type` (só ASCII), `ui_describe_all`, `screenshot`, `record_video`, `install_app`, `launch_app` (depende do IDB da Meta).
5. **Canal de depuração do jogo** (obrigatório): cenas SpriteKit/Metal/Unity/Godot **não expõem árvore de acessibilidade**, então `ui_describe_all`/Maestro não veem o jogo. Estratégia em `references/canal-de-debug.md`: (a) o jogo grava `Documents/debug_state.json` + `os_log`; (b) o agente toca por coordenada e tira screenshot; (c) lê o estado via `xcrun simctl get_app_container <udid> <bundle> data` ou `xcrun devicectl device copy from` (dispositivo) e os logs via `log show`/MobileBuildMCP; (d) HUD/menus em SwiftUI com `accessibilityIdentifier` para que Maestro/AXe cubram a navegação.
6. **Ciclo manual de referência** (sem MCP, útil para hooks e CI local):

```bash
.claude/skills/xcode-agentico/scripts/simulador.sh boot "iPhone 17"
.claude/skills/xcode-agentico/scripts/simulador.sh install build/MeuJogo.app
.claude/skills/xcode-agentico/scripts/simulador.sh launch com.exemplo.meujogo
.claude/skills/xcode-agentico/scripts/simulador.sh screenshot production/evidencias/$(date +%F)-ambiente-xcode/screenshot.png
.claude/skills/xcode-agentico/scripts/simulador.sh pull-debug com.exemplo.meujogo production/evidencias/$(date +%F)-ambiente-xcode/
```

7. **Sem supervisão** (CI/Mac dedicado, Xcode 27 Beta 5+, preview): `sudo xcrun mcp-server enable` habilita o MCP sem workspace aberto; `sudo xcrun mcp-server enable --unsafe-always-allow-all-agents` aprova todas as permissões — a Apple diz que **não é recomendado para uso de mesa**; use só em máquina de CI isolada.
8. **Computer use do Claude Code** (preview, macOS, Pro/Max): servidor embutido `computer-use` desligado por padrão — habilite em `enabledMcpServers` nas settings (o arquivo é escrito pela skill de configuração, não aqui). Serve para "compile a Swift app, launch it, click through every button, and screenshot the result" e simuladores; não funciona com `-p` nem em Team/Enterprise. Use quando MCP/Bash não alcançam (ex.: diálogo do sistema).
9. **Evidência do ambiente**: rode um ciclo completo e grave `claude mcp list` + screenshot em `production/evidencias/<data>-ambiente-xcode/`.

## Critério de pronto e evidência

- `claude mcp list` com `xcode ✔ Connected` (e `mobilebuild`/`ios-simulator` se instalados) salvo em `mcp-list.txt`.
- `screenshot.png` do app rodando no simulador obtido pelo agente (MCP ou script) e `debug_state.json` lido com `scene` coerente.
- Conseguir compilar sem rodar não é pronto.

## Verificar no simulador/dispositivo

- Simulador: ciclo acima. Dispositivo: `xcrun devicectl list devices`, `devicectl device install app --device <id> <app>`, `devicectl device process launch --device <id> <bundle>`, `devicectl device copy from --device <id> --domain-type appDataContainer --domain-identifier <bundle> --source Documents/debug_state.json --destination .`; crash logs em `devicectl device info files --domain-type systemCrashLogs` → `copy from`. Sempre `--json-output` (a Apple pede para não parsear o texto).

## Armadilhas conhecidas

- **MCP do Xcode só com projeto aberto** (26.3); `xcrun mcp-server` (27) resolve para CI.
- **Skills no Xcode 26.3**: `/skill` pode ser rejeitado; peça "use the {skill-name} skill".
- **MobileBuildMCP 2.7.1 renomeou** pacote npm, binários e variáveis de ambiente (ex-XcodeBuildMCP); configs antigas quebram. Telemetria de erros via Sentry (opt-out na doc).
- **ios-simulator-mcp < 1.3.3** tinha injeção de comando; fixe ≥ 1.3.3.
- **Acessibilidade**: Maestro e AXe não veem canvas de jogo; coordenadas mudam com o dispositivo — padronize um simulador (ex.: iPhone 17) e registre as coordenadas no roteiro de playtest.
- **Dois dedos** indisponíveis no Device Hub; gamepad só visionOS.
- **Config por agente** em `~/Library/Developer/Xcode/CodingAssistant/{ClaudeAgentConfig,codex,gemini}`; MDM pode desligar com `CodingAssistantAllowExternalIntegrations=false`.
- **Privacidade**: o agente/modelo configurado "may access your project files" — leia "About Intelligence in Xcode & Privacy".
- **Custo**: tudo local; computer use gasta muitos tokens por screenshot — prefira MCP.

## Fontes

- Xcode 26.3 Release Notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes
- Giving external agents access to Xcode: https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode
- Setting up coding intelligence / Extending and customizing agents: https://developer.apple.com/documentation/xcode/setting-up-coding-intelligence ; https://developer.apple.com/documentation/xcode/extending-and-customizing-agents
- Xcode 27 Release Notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- WWDC26 Platforms State of the Union: https://developer.apple.com/videos/play/wwdc2026/102/
- Interacting with devices using the command line: https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- Capturing screenshots and videos from devices (Device Hub): https://developer.apple.com/documentation/xcode/capturing-screenshots-and-videos-from-devices
- getsentry/MobileBuildMCP README e CHANGELOG: https://github.com/getsentry/MobileBuildMCP ; https://github.com/getsentry/MobileBuildMCP/blob/main/CHANGELOG.md
- joshuayoes/ios-simulator-mcp: https://github.com/joshuayoes/ios-simulator-mcp
- Claude Code — MCP (`claude mcp add`, `enabledMcpServers`): https://code.claude.com/docs/en/mcp ; computer use: https://code.claude.com/docs/en/computer-use
