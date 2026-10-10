# Servidores MCP para iOS: o que cada um faz e quando usar

| Camada | Servidor | Requisitos | Força | Limite |
|---|---|---|---|---|
| 1 | **Xcode MCP** (`xcrun mcpbridge`, Xcode 26.3+) | Xcode aberto no projeto; 26.3: macOS 15.6+; 27: macOS 26.6+ Apple silicon | Build, testes, previews; no 27: simulador (boot/instalar/tocar/screenshot), debug state, schemes, build settings, Organizer insights, `lldb-mcp` | Projeto aberto (até `xcrun mcp-server` do 27); sem dois dedos; controller só visionOS |
| 2 | **MobileBuildMCP** (getsentry, MIT) | macOS 14.5+, Xcode 16+, Node 18+ | `simulator build/test`, produtos de teste portáveis, logs com daemon por workspace, UI por AXe, LLDB, dispositivo físico (assinatura), proxy do MCP do Xcode 26.3, Device Hub 27 | Telemetria Sentry (opt-out); renomeado na 2.7.1 |
| 2 | **ios-simulator-mcp** (joshuayoes, MIT) | IDB (Meta), simulador | `ui_tap`, `ui_swipe`, `ui_type` (ASCII), `ui_describe_all`, `screenshot`, `record_video`, `install_app`, `launch_app` | Só simulador; ≥ 1.3.3 |
| 3 | **Maestro** (`maestro mcp`, Apache 2.0) | Java; simulador | Flows YAML determinísticos (`launchApp`, `tapOn`, `assertVisible`) para menus com acessibilidade | Não vê canvas; sem iPhone físico |
| 4 | **Claude Code computer use** (preview) | macOS, Pro/Max | Qualquer UI, inclusive diálogos do sistema e Simulator.app | Caro em tokens; não com `-p`; não Team/Enterprise |

## Instalação (escopo local por padrão; `--scope project` grava em `.mcp.json`, que é gerido por outra skill)

```bash
claude mcp add --transport stdio xcode -- xcrun mcpbridge
claude mcp add --transport stdio mobilebuild -- npx -y mobilebuildmcp@latest mcp
claude mcp add --transport stdio ios-simulator -- npx -y ios-simulator-mcp      # confirme no README
claude mcp get xcode   # status/“Issue:” em caso de falha
```

- Alternativa Homebrew para MobileBuildMCP: `brew tap getsentry/xcodebuildmcp && brew install mobilebuildmcp`; CLI direto: `mobilebuildmcp simulator build --scheme MeuJogo --project-path ./MeuJogo.xcodeproj --simulator-name "iPhone 17"`.
- Skills do MobileBuildMCP para o agente: `npx -y mobilebuildmcp@latest init` (instala skill MCP e skill CLI).
- IDB para o ios-simulator-mcp: `brew tap facebook/fb && brew install idb-companion` [confirme no README do servidor].
- Nomes reservados pelo Claude Code: não chame um servidor de `computer-use`, `workspace`, `claude-in-chrome`.

## Ordem de preferência no loop de jogo

1. Xcode 27 MCP: build → launch → tap/swipe → screenshot → ler crashes.
2. Se Xcode 26.x/16: MobileBuildMCP para build/log/LLDB + ios-simulator-mcp para toque/screenshot/vídeo.
3. Maestro só para menus SwiftUI/UIKit com `accessibilityIdentifier`.
4. Computer use para o que sobrar (diálogos de permissão, Simulator.app).

## Sem supervisão (CI, Xcode 27 Beta 5+, preview)

```bash
sudo xcrun mcp-server enable                                   # MCP sem workspace aberto
sudo xcrun mcp-server enable --unsafe-always-allow-all-agents  # SÓ em máquina de CI isolada
```

A Apple: "not a recommended configuration for at-desk use".

## Ferramentas de linha de comando (sempre válidas)

- `xcrun simctl list devices available -j`, `boot`, `bootstatus -b`, `install`, `launch`, `terminate`, `io <udid> screenshot|recordVideo`, `get_app_container <udid> <bundle> data`, `spawn <udid> log show --predicate …`, `openurl`, `reboot` (27).
- `xcrun devicectl … --json-output` para dispositivos (install, process launch, copy from, info files --domain-type systemCrashLogs, reboot no 27).
- `xcodebuild build|test|build-for-testing|test-without-building -resultBundlePath …`; Xcode 26: detecção de runtime issues em Swift Testing/XCTest também via xcodebuild.

Fontes: ver SKILL.md (release notes do Xcode 26.3/27; MobileBuildMCP README/CHANGELOG; ios-simulator-mcp; maestro; docs do Claude Code).
