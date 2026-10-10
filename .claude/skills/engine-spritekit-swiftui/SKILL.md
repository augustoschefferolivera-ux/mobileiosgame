---
name: engine-spritekit-swiftui
description: >
  Monta e verifica um jogo 2D nativo para iOS com SwiftUI + SpriteKit (SKScene dentro de
  SpriteView), Swift 6.x, atlases .spriteatlas, SKAction, física, CoreHaptics e Game Center,
  com build por xcodebuild e execução/screenshot no simulador via xcrun simctl. Use sempre que
  o jogo-alvo for 2D nativo iOS (App Store, sem engine externa), mesmo que o usuário diga só
  "jogo em Swift" ou "jogo iPhone". Não use para 3D (veja engine-realitykit-metal), para Unity
  ou Godot (engine-unity-mobile, engine-godot-mobile) nem para jogos web (engine-web-phaser).
license: MIT
compatibility: "Claude Code ou Codex; macOS com Xcode 26.3+ (ideal Xcode 27, Apple silicon) para build, simulador e screenshots"
metadata:
  grupo: engines
  alvo: [2d, app]
  fase: [2, 3, 5, 8]
argument-hint: "[nome-do-projeto] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine nativa 2D: SwiftUI + SpriteKit

Entrega um projeto Xcode jogável (shell SwiftUI, uma ou mais `SKScene`, canal de depuração) e prova que terminou com `scripts/verify.sh`: build sem erros, app lançado no simulador, screenshot e log gravados em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** quando o alvo é iOS 2D nativo: plataforma, puzzle, runner, arcade, jogo de cartas. SpriteKit não está deprecado (metadados da Apple: introduzido no iOS 7, sem `deprecatedAt`) e é a stack mais verificável pelo MCP do Xcode, porque todo o ciclo é `xcodebuild` + `simctl`.
- **Use** quando IAP/Game Center/haptics nativos importam mais que portabilidade Android.
- **Não use** para 3D: **SceneKit está deprecado em todas as plataformas desde o Xcode 26** (Apple recomenda RealityKit) — vá para `engine-realitykit-metal`.
- **Não use** se o jogo precisa de Android no mesmo código (Unity/Godot) ou se já existe um protótipo web (empacote com `empacotar-web-para-app` ou reescreva aqui).

## Pré-requisitos

- macOS com Xcode 26.3 ou posterior (Xcode 27 exige macOS Tahoe 26.6+ e Apple silicon). Confirme:

```bash
xcodebuild -version && xcrun simctl list devices available | head -20
```

- Xcode como servidor MCP para o agente (projeto aberto no Xcode; ative "Allow external agents to use Xcode tools" em Settings → Intelligence):

```bash
claude mcp add --transport stdio xcode -- xcrun mcpbridge
```

- Opcional: MobileBuildMCP para logs/LLDB/UI (`npx -y mobilebuildmcp@latest mcp`). Detalhes em `/xcode-agentico`.
- Repositório Git iniciado (o Xcode só faz rollback das alterações do agente com Git).

## Entradas

- `design/game-brief.md`: gênero, orientação (retrato/paisagem), dispositivos mínimos, se usa Game Center/IAP.
- `feature_list.json`: feature atual marcada como `in_progress`; uma feature por sessão.
- Art bible/atlases já exportados em `@2x/@3x` (skills de arte) — ou placeholders coloridos gerados por código (`SKShapeNode`) até os assets chegarem.

## Passos

1. **Esqueleto do projeto** (fase 2). Crie um app iOS SwiftUI (`App` → `ContentView` → `SpriteView(scene:)`) com uma `GameScene: SKScene`. Estrutura recomendada e armadilhas de Swift 6 em `references/estrutura-projeto.md`. Resultado observável: `xcodebuild build` sai 0.
2. **Canal de depuração** (fase 3, obrigatório antes de qualquer feature). Copie `assets/DebugChannel.swift` para o projeto: ele grava o estado do jogo (cena, pontuação, FPS médio, último erro) em `Documents/debug_state.json` e em `os_log` com subsystem do bundle. É o que o agente lê depois do playtest, já que cenas SpriteKit não expõem árvore de acessibilidade.
3. **Primeira verificação**:

```bash
.claude/skills/engine-spritekit-swiftui/scripts/verify.sh --feature esqueleto --simulator "iPhone 17"
```

   Resultado: `production/evidencias/<data>-esqueleto/{screenshot.png,app.log,debug_state.json,resumo.md}`.
4. **Implementar a feature** (fase 5). Regras de código:
   - Lógica de jogo em tipos puros (`struct`/`enum`) testáveis sem SpriteKit; a cena só desenha. Testes com Swift Testing (`@Test`) ou XCTest.
   - Animações com `SKAction` (sequence/group/repeatForever) em vez de contadores manuais em `update(_:)`.
   - Física: `SKPhysicsBody`, `categoryBitMask`/`contactTestBitMask`, `SKPhysicsContactDelegate`; defina as máscaras como `enum` com `UInt32` fixos.
   - Texturas por `SKTextureAtlas(named:)` apontando para pastas `.spriteatlas` no Asset Catalog; nunca `SKTexture(imageNamed:)` solto em loops.
   - Orientação e safe area: fixe a orientação em Info.plist; use `scene.scaleMode = .resizeFill` ou `.aspectFill` e posicione HUD a partir de `view.safeAreaInsets` (detalhes em `references/estrutura-projeto.md`).
5. **Haptics e Game Center** (fase 5, quando o brief pedir): `CoreHaptics` (`CHHapticEngine`, verifique `supportsHaptics`) e GameKit (`GKLocalPlayer.local.authenticateHandler`, `GKAccessPoint`, leaderboards). Receita em `references/game-center-haptics.md`. Adicione a capability Game Center no target.
6. **Verificar de novo** com `--test` para rodar a suíte e capturar screenshot da feature; anexe o caminho da evidência à feature em `feature_list.json` antes de marcar `passing`.
7. **Playtest por agente** (fase 3/8): siga `/playtest-automatizado` — toques por coordenada (Xcode 27 ou ios-simulator-mcp) + screenshot + leitura de `debug_state.json`.
8. **Performance** (fase 8): ative "Metal Performance HUD"/Instruments; alvo 60 fps estável em iPhone antigo suportado; reduza `SKNode` filhos, use `SKSpriteNode` em atlas, evite `SKShapeNode` dinâmico em massa; `MetricKit` do iOS 27 traz taxa de quadros Metal para medir no dispositivo.

## Critério de pronto e evidência

- `scripts/verify.sh --feature <slug> --test` saiu 0 **nesta sessão**.
- Em `production/evidencias/<data>-<feature>/` existem: `xcodebuild.log`, `screenshot.png` (a tela esperada, não a de launch), `app.log`, `debug_state.json` com `scene` igual ao esperado, `resumo.md`.
- Testes de lógica passaram (`test.xcresult` presente quando `--test`).
- Um parse check (só compilar) não é uma execução: sem screenshot do simulador, a feature continua `in_progress`.

## Verificar no simulador/dispositivo

- Simulador: coberto por `verify.sh` (boot → install → launch → screenshot → log).
- Dispositivo físico (performance real, haptics, Game Center): `xcrun devicectl device install app`, `xcrun devicectl device process launch`, e `xcrun devicectl device copy from` para puxar `debug_state.json` e crash logs (`devicectl device info files --domain-type systemCrashLogs`). Use `--json-output` no devicectl (a Apple diz para não parsear o texto do terminal).
- Haptics não existem no simulador: valide só em dispositivo.

## Armadilhas conhecidas

- **SceneKit deprecado** (Xcode 26 RN) — não aceite código gerado que importe SceneKit para efeitos 3D.
- **Swift 6 strict concurrency**: `SKScene`/`SKView` são de UI; código gerado costuma chamar a cena de `Task` desanexado ou de closures de `Timer` fora do ator principal. Mantenha a cena `@MainActor`; mande eventos para a lógica via tipos `Sendable`. Lista em `references/estrutura-projeto.md`.
- **`update(_:)` com `Date()`/`Timer`**: use `currentTime` do próprio `update` para delta.
- **Atlas fora do catálogo**: `.spriteatlas` só vira atlas se estiver dentro do `.xcassets`; fora dele são PNGs soltos (memória e draw calls altas).
- **Game Center sem capability** compila e falha silenciosamente em runtime; teste com conta sandbox. **Haptics** só em dispositivo.
- **Xcode 26.3**: negar acesso do agente a um projeto em Desktop/Downloads/Documents é irreversível sem ir em Ajustes do Sistema (release notes).
- **Device Hub do Xcode 27** não envia toque de dois dedos (pinch) a simulador/dispositivo; projete controles de um dedo ou teste pinch manualmente.
- **Custo**: build + simulador é local (zero API); o que custa são tokens de iteração. Rode `verify.sh` com `--no-run` em iterações de compilação e com screenshot só ao fechar a feature.
- **Licença de saída**: código gerado é seu para distribuir; registre prompts/sessões em `PROVENANCE.md` (ver skill de proveniência) — nos EUA e no Brasil só a intervenção humana gera direito autoral.

## Fontes

- Xcode 26 Release Notes (SceneKit deprecado; SpriteKit sem deprecação): https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes
- SpriteKit (Apple Developer Documentation): https://developer.apple.com/documentation/spritekit
- SceneKit (metadados `deprecatedAt: 26.0`): https://developer.apple.com/documentation/scenekit
- Xcode 26.3 Release Notes (agentic coding, MCP, acesso irreversível): https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes
- Giving external agents access to Xcode (`xcrun mcpbridge`): https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode
- Xcode 27 Release Notes (simulador por agentes, Device Hub, limitações): https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- Interacting with devices using the command line (`devicectl`, `simctl`): https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- WWDC26 sessão 222 "Meet the new MetricKit" (frame rate Metal): https://developer.apple.com/videos/play/wwdc2026/222/
- Claude-Code-Game-Studios (regra "a parse check is not a run"): https://github.com/Donchitos/Claude-Code-Game-Studios
- Relatório interno: `reports/Criação de jogos totalmente por IA.md` (seções Unity/Xcode 27/Godot e Stack recomendado).
