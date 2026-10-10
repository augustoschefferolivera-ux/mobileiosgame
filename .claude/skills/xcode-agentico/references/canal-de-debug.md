# Testar um canvas de jogo sem árvore de acessibilidade

Problema: SpriteKit, Metal, Unity e Godot desenham num único `view`; `ui_describe_all`, AXe e Maestro só veem "uma imagem". Solução em três partes.

## 1. O jogo expõe estado (canal de debug)

- Nativo: `DebugChannel.swift` (em `engine-spritekit-swiftui/assets/`) grava `Documents/debug_state.json` a cada 0,5 s e `os_log` (`subsystem = bundle id`, `category = debug`). Ativo em DEBUG ou com `GAME_DEBUG=1`.
- Unity: `Application.persistentDataPath/debug_state.json` + `Debug.Log("[GAME] …")`.
- Godot: `user://debug_state.json` + `print("[GAME] …")`.
- Web/Capacitor: `window.__GAME_DEBUG__` (Playwright) e, no app, espelhe em arquivo via plug-in Filesystem.

Campos mínimos: `scene`, `score`, `lives`, `fps`, `frame`, `lastEvent`, `lastError`, `timestamp`. Adicione os que a feature exige (ex.: `enemiesAlive`, `levelId`).

## 2. O agente age por coordenadas e vê por screenshot

- Padronize um simulador (ex.: iPhone 17, retrato) e documente coordenadas em pontos CSS/UIKit no roteiro de playtest (`production/playtests/<data>.md`).
- Xcode 27: "synthesize touch events" + "capture screenshots". ios-simulator-mcp: `ui_tap x y`, `ui_swipe`, `screenshot`, `record_video`. Playwright (web): `page.touchscreen.tap(x, y)`.
- Para controles, prefira botões grandes e fixos (≥ 44 pt) em posições estáveis; para o mundo do jogo, grave as coordenadas lógicas no `debug_state.json` (`playerX/Y`) para o agente calcular onde tocar.

## 3. O agente lê o estado e os logs

Simulador:

```bash
UDID=$(xcrun simctl list devices booted -j | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for v in d.values() for x in v))')
CONTAINER=$(xcrun simctl get_app_container "$UDID" com.exemplo.meujogo data)
cat "$CONTAINER/Documents/debug_state.json"
xcrun simctl spawn "$UDID" log show --last 2m --style compact --predicate 'subsystem == "com.exemplo.meujogo"'
```

Dispositivo (sempre `--json-output`):

```bash
xcrun devicectl list devices --json-output devices.json
xcrun devicectl device copy from --device <id> --domain-type appDataContainer --domain-identifier com.exemplo.meujogo \
  --source Documents/debug_state.json --destination ./debug_state.json --json-output copy.json
xcrun devicectl device info files --device <id> --domain-type systemCrashLogs --json-output crashes.json
```

MobileBuildMCP: ferramentas de log do simulador (daemon por workspace) e LLDB para inspecionar variáveis quando o estado não basta.

## 4. Menus com acessibilidade (para Maestro/AXe)

- Faça HUD, pausa, loja e menus em SwiftUI/UIKit (ou Unity UI Toolkit/uGUI, Godot Control) com `accessibilityIdentifier`/`accessibilityLabel` estáveis (`btn_play`, `btn_pause`). Assim Maestro cobre navegação e o canvas fica para coordenadas.
- SpriteKit: é possível expor elementos via `accessibilityElements` na `SKView` [não verificado nesta pesquisa; confirme na doc de UIAccessibility] — custo alto; use só para botões críticos.

## 5. Regra de evidência

Uma rodada = screenshot antes + ação + screenshot depois + `debug_state.json` antes/depois + trecho de log. Sem os quatro, a feature não fecha. Comparação de screenshots: por visão (o agente descreve diferenças) e, quando houver referência, por diff de pixels (`playtest-automatizado/scripts/comparar-screenshots.py`).

Fontes: Xcode 27 Release Notes; Interacting with devices using the command line (devicectl/simctl); MobileBuildMCP README; relatório interno (seção Testes e publicação).
