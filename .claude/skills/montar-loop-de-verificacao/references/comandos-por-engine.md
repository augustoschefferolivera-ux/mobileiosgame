# Comandos por engine e contrato do verificador

Leia quando for escrever ou revisar o `scripts/verify.sh` de uma skill `engine-*`, ou quando o despachante disser que não há verificador. "[confirmar]" marca flag/sintaxe que não foi lida em página oficial durante a pesquisa — confira na documentação da versão fixada no ADR antes de depender.

## 1. Contrato do verificador de engine (`.claude/skills/engine-<x>/scripts/verify.sh`)

O despachante do projeto chama `bash <verificador> --feature <id> --out <pasta>` e exporta `VERIFY_OUT`, `VERIFY_FEATURE`, `VERIFY_MODE` (`full|quick`) e `VERIFY_DRYRUN`.

| Item | Contrato |
|---|---|
| Argumentos | `--feature <slug>` · `--out <dir>` · `--test` (roda a suíte) · `--no-run` (só compila) · `--help` · extras da engine (`--project`, `--scheme`, `--simulator`, `--scene`…) |
| Saída em `--out` | `screenshot.png` (obrigatório salvo `--no-run`), `app.log` ou `run.log`, `debug_state.json` (se o jogo gravou), `resumo.md` (status de build/teste/execução/screenshot), logs de build |
| Códigos | `0` build OK e, salvo `--no-run`, app rodou e screenshot gravado · `1` build/testes falharam · `2` app não ficou em execução ou screenshot falhou · `3` ambiente sem SO/engine · `4` argumentos inválidos |
| Nunca | apagar fora da pasta `--out`; usar flags headless para capturar; declarar sucesso sem verificar que o processo continua vivo |
| Idempotência | pode rodar várias vezes; cria a pasta `--out`; boot de simulador já ligado não é erro |

O despachante converte 1 e 2 em "falhou" (exit 2, o agente continua corrigindo) e 3 e 4 em "configuração" (exit 1, avisar e permitir parar). Referência de implementação: `.claude/skills/engine-spritekit-swiftui/scripts/verify.sh` (xcodebuild + simctl, só comandos documentados pela Apple).

## 2. Xcode — SpriteKit e RealityKit

```bash
# UDID do simulador pelo nome
xcrun simctl list devices available -j        # parse com python3 -I (sem jq)
# Build para simulador, com log e result bundle
xcodebuild -project Jogo.xcodeproj -scheme Jogo -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$OUT/DerivedData" \
  -resultBundlePath "$OUT/build.xcresult" build | tee "$OUT/xcodebuild.log"
# Testes (Swift Testing / XCTest)
xcodebuild -project Jogo.xcodeproj -scheme Jogo -destination "platform=iOS Simulator,id=$UDID" test
# Rodar
xcrun simctl boot "$UDID"; xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"; SIMCTL_CHILD_GAME_DEBUG=1 xcrun simctl launch "$UDID" "$BUNDLE_ID"
# Vivo? Screenshot. Log. Estado.
xcrun simctl spawn "$UDID" launchctl list | grep "$BUNDLE_ID"
xcrun simctl io "$UDID" screenshot "$OUT/screenshot.png"
xcrun simctl spawn "$UDID" log show --start "$LAUNCH_AT" --style compact --predicate "process == \"$APP_NAME\"" > "$OUT/app.log"
cp "$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)/Documents/debug_state.json" "$OUT/"
```

- Alternativas: MobileBuildMCP (`mobilebuildmcp simulator build --scheme Jogo --project-path ./Jogo.xcodeproj --simulator-name "iPhone 17"`; UI automation por AXe, LLDB, logs), MCP do Xcode 27 (boot, install, launch, toque, screenshot), ios-simulator-mcp (`ui_tap`, `ui_swipe`, `screenshot`, `record_video`).
- Toques em cena de jogo: por coordenada (ios-simulator-mcp ou Xcode 27); a árvore de acessibilidade não cobre `SKScene`/`RealityView`.
- Dispositivo físico: `xcrun devicectl device install app`, `… process launch`, `… info files --domain-type systemCrashLogs`, `… copy from`; sempre `--json-output`.
- Canal de depuração: `DebugChannel.swift` (asset de `engine-spritekit-swiftui`) grava `Documents/debug_state.json` e `os_log`; ativado por `GAME_DEBUG=1` (via `SIMCTL_CHILD_GAME_DEBUG=1`) ou em builds DEBUG.
- Métrica: MetricKit do iOS 27 (API Swift-first, taxa de quadros Metal, `StateReporting`); no simulador use o `fps` do próprio canal.

## 3. Godot 4.7

```bash
godot --headless --path . --import                                 # importa recursos sem GUI (nunca para screenshot)
godot --headless --path . --check-only --script res://scripts/x.gd  # [confirmar] parse de um script
# Rodar com janela em proporção de iPhone e gravar frames; o último PNG é o screenshot
godot --path . --windowed --resolution 390x844 --write-movie "$OUT/shot.png" --quit-after 60 res://scenes/main.tscn
ls "$OUT"/shot*.png | tail -1                                      # nomes com 8 dígitos: shot00000059.png
# iOS (exige macOS + Xcode; preset "iOS" configurado no projeto)
godot --headless --path . --export-release "iOS" build/ios/Jogo.xcodeproj   # [confirmar] sintaxe do preset/caminho na versão
```

- `--write-movie` + `--quit-after` foi verificado pelo Game Studios em Godot 4.6.1 (Windows); `--fixed-fps` entra automaticamente. Para estado não alcançável por cena, um autoload faz `await RenderingServer.frame_post_draw`, `get_viewport().get_texture().get_image().save_png(path)`, `get_tree().quit()`.
- Godot AI (MCP): `project_run` devolve `game_status` (`live`/`not_live`) e `recent_errors`; `test_run` roda suítes GDScript no editor; `logs_read`; `editor_screenshot` do framebuffer do jogo. C# é só texto — para C# construa com `dotnet build` e leia o terminal.
- Simulador iOS só com renderer Compatibility; Macs Apple silicon rodam o `.ipa` nativamente. `export_project_only` gera só o projeto Xcode (fastlane).
- Canal de depuração (autoload `DebugChannel.gd`, ~30 linhas): a cada N frames grava `user://debug_state.json` com `scene`, `score`, `fps` (`Engine.get_frames_per_second()`), `frame`, `last_event`, `last_error`, `timestamp`; `print()` espelha em stdout. `user://` no macOS fica em `~/Library/Application Support/Godot/app_userdata/<Nome>/` [confirmar].
- Fixe a versão (4.6 → 4.7 trouxe 1.265 correções) e forneça a documentação daquela versão ao agente.

## 4. Unity 6.3 LTS

```bash
# Testes em batch (não renderiza): Unity Test Framework
Unity -batchmode -nographics -quit -projectPath . -runTests -testPlatform PlayMode -testResults "$OUT/tests.xml" -logFile "$OUT/unity-tests.log"   # [confirmar] caminho do binário e flags na 6.3
# Build do player (método estático do projeto) — iOS gera projeto Xcode, depois o fluxo da seção 2
Unity -batchmode -quit -projectPath . -executeMethod Build.iOS -logFile "$OUT/unity-build.log"   # [confirmar]
# Screenshot: player construído (não -batchmode) com bootstrap que lê argumentos próprios
./Builds/Jogo.app/Contents/MacOS/Jogo -screen-width 390 -screen-height 844 -screen-fullscreen 0 --scene Jogo --screenshot "$OUT/screenshot.png" --after 60
```

- Preferência: Unity CLI e skills do plug-in oficial (`/unity:unity-cli`, `/unity:build-live-game`, `/unity:new-unity-project`): instalam Editor, criam/abrem projeto, rodam builds e testes; a Unity avisa "not every change is logged or can be undone from the Editor, so keep your project under version control".
- `-batchmode` não renderiza; o Game Studios usa um `MonoBehaviour` com `[RuntimeInitializeOnLoadMethod]` que, se `--screenshot` estiver nos argumentos, carrega `--scene`, espera `--after` frames, chama `ScreenCapture.CaptureScreenshot(caminho absoluto)` e `Application.Quit()` (padrão em `.claude/docs/run-and-observe.md` do Game Studios, MIT). No simulador iOS, construa o projeto Xcode e use a seção 2.
- MCP for Unity (CoplayDev): `run tests`, console, validação Roslyn antes de o script chegar ao Editor; AnkleBreaker/Funplay trazem play mode + input simulado [s].
- Canal de depuração: `MonoBehaviour` que grava `Application.persistentDataPath/debug_state.json` e `Debug.Log` com prefixo `[DEBUG_STATE]`; `-logFile` captura; `Asset Serialization = Force Text` para o agente ler cenas.

## 5. Web — Phaser / PixiJS / Three.js / Babylon.js

```bash
npm ci && npm run build                                     # build (Vite/esbuild conforme o projeto)
npm run dev -- --port 5173 &                                # servidor de desenvolvimento
npx playwright screenshot --device="iPhone 13" --wait-for-timeout=3000 http://localhost:5173 "$OUT/screenshot.png"   # [confirmar] flags
```

- Para console e estado, um script Node com Playwright: `page.on('console', m => log.push(m.text()))`, `await page.evaluate(() => JSON.stringify(window.__gameState))` → `run.log` e `debug_state.json`. Emule toque (`hasTouch: true`) e viewport de iPhone.
- Phaser Editor MCP (`scene-get-screenshot`) e PlayCanvas MCP (`launch_start`, `capture_runtime`, `inject_input`) quando o editor estiver em uso; o README do Phaser recomenda "training levels" rotulados porque só a imagem "may not always be sufficient for the LLM".
- Padrão da Anthropic: automação de navegador "as a human user would", com screenshots; limite: alerts nativos não são vistos pelo Puppeteer MCP.
- Capacitor: `npx cap sync ios && npx cap open ios` [confirmar] gera o projeto Xcode; daí a seção 2 (web view na App Store sob 4.7).

## 6. Esboço de Stop hook que executa o verify (opcional)

O hook ativo (`.claude/hooks/stop-gate.sh`) valida status e evidência em `feature_list.json`. Um gate que também executa o jogo segue este esqueleto (bash; lê o JSON do stdin):

```bash
INPUT="$(cat)"
echo "$INPUT" | grep -q '"stop_hook_active": *true' && exit 0            # já continuou uma vez: não insistir
ID="$(python3 -I -c 'import json;d=json.load(open("feature_list.json"));print(next((f["id"] for f in d["features"] if f.get("status")=="in_progress"),""))')"
[ -n "$ID" ] || exit 0                                                   # nada em andamento: pode parar
bash scripts/verify.sh --quick --feature "$ID" --out "production/evidencias/_ultima" >/dev/null 2>"$TMPDIR/verify.err"
case $? in
  0) exit 0 ;;
  2) echo "Stop hook: verify falhou para $ID — $(head -1 "$TMPDIR/verify.err")" >&2; exit 2 ;;   # continue
  *) echo "Stop hook: verify sem configuração ($(head -1 "$TMPDIR/verify.err")); encerrando sem bloquear" >&2; exit 0 ;;
esac
```

Regras do Claude Code que o esboço respeita: exit 2 bloqueia o fim do turno e entrega stderr ao agente; exit 0 permite parar; `stop_hook_active` evita loop; o cap é de 8 continuações consecutivas; `onFailure: "block"` não se aplica a `Stop`. Hooks são deterministas, ao contrário de instruções em `CLAUDE.md`, que são "advisory".

## Fontes

Apple: Xcode 27 Release Notes; Interacting with devices using the command line; WWDC26 sessão 222. getsentry/MobileBuildMCP README. joshuayoes/ios-simulator-mcp. hi-godot/godot-ai (README, TOOLS.md). godot-docs Exporting for iOS; EditorExportPlatformIOS.xml. Donchitos/Claude-Code-Game-Studios `.claude/docs/run-and-observe.md` (MIT). Unity-Technologies/unity-agent-plugin README. CoplayDev/unity-mcp. phaserjs/editor-mcp-server; playcanvas/editor-mcp-server. Anthropic, Effective harnesses e Claude Code best practices. Claude Code docs — Hooks (https://code.claude.com/docs/en/hooks). URLs completas no `SKILL.md`.
