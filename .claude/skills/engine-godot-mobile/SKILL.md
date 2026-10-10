---
name: engine-godot-mobile
description: >
  Configura, codifica e verifica um jogo mobile em Godot 4.7.x (versão fixada) com GDScript,
  Godot AI MCP (project_run, test_run, logs_read, editor_screenshot), testes GUT ou gdUnit4,
  CLI headless para CI e export iOS (export_project_only + fastlane, Team ID, privacy manifest,
  A12+/Metal). Use sempre que o jogo for em Godot, inclusive quando o usuário disser só "GDScript"
  ou "engine open source". Não use para Unity (engine-unity-mobile), nativo SwiftUI
  (engine-spritekit-swiftui/engine-realitykit-metal) ou web (engine-web-phaser).
license: MIT
compatibility: "Claude Code ou Codex; Godot 4.7.x (binário 'godot' no PATH); macOS com Xcode para export iOS e simulador; Linux só para headless/testes"
metadata:
  grupo: engines
  alvo: [2d, 3d, app]
  fase: [2, 3, 5, 8]
argument-hint: "[caminho-do-projeto] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine Godot 4.7 para iOS

Entrega um projeto Godot com cenas `.tscn` em texto, GDScript tipado, suíte de testes e export iOS reproduzível; `scripts/verify.sh` importa o projeto em headless, roda os testes, captura screenshot do jogo rodando e grava tudo em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** quando o time quer engine aberta (MIT), arquivos de projeto 100% texto (`.tscn`, `.tres`, `project.godot`, `.gd`) que o agente lê e difere, e um export iOS controlado por linha de comando.
- **Use GDScript**. C# no iOS é "experimental... some limitations apply" (docs do Godot) e no Godot AI é "text-only" (sem build .NET nem erros de compilação reportados).
- **Não use** se o brief depende de SDKs de anúncios/IAP com suporte oficial (Unity) ou de Game Center/haptics nativos sem plug-in (SpriteKit). Plug-ins iOS do Godot existem, mas são comunitários.
- **Não contribua código de IA ao engine**: desde 30/06/2026 a Godot Foundation proíbe PRs feitos por agentes autônomos/"vibe coding" no repositório do engine (fonte secundária). A regra não governa o seu jogo.

## Pré-requisitos

- **Godot 4.7.x fixado** (4.7 saiu em 18/06/2026; 4.7.2 em 18/08/2026). Entre 4.6 e 4.7 houve 1.265 correções: **dê ao agente a documentação da versão exata** (`godot --doctool docs/godot-api` gera a referência XML da classe para a pasta; ou aponte `docs.godotengine.org/en/4.7/`). Export templates devem ter exatamente a mesma versão do editor.

```bash
godot --version            # esperado: 4.7.x.stable
```

- **Godot AI** (hi-godot/godot-ai, MIT; exige Godot 4.7+ e `uv`/`uvx`): instale o add-on de uma release do GitHub em `addons/godot_ai/` (com `plugin.cfg` dentro), ative em `Project → Project Settings → Plugins`, e no dock **Godot AI** clique **Configure** para o Claude Code (gera `godot-ai attach` via stdio; aprovação única com `claude` dentro do projeto). Telemetria opcional: `GODOT_AI_DISABLE_TELEMETRY=true`.
- Testes: **GUT** (`addons/gut/`) ou **gdUnit4** (`addons/gdUnit4/`), via AssetLib/Asset Store. `test_run` do Godot AI roda suítes GDScript no próprio formato dele (`McpTestSuite`); use um ou outro como fonte de verdade em CI.
- Export iOS: macOS com Xcode; Apple Developer Team ID; export templates 4.7.x instalados (`Editor → Manage Export Templates`).

## Entradas

- Brief; `feature_list.json`; art bible; decisão 2D/3D e renderer (Mobile ou Compatibility — ver armadilhas).

## Passos

1. **Projeto** (fase 2): crie com o editor ou `godot --headless --path game --quit` após copiar um `project.godot` mínimo. Estrutura: `scenes/`, `scripts/`, `assets/`, `tests/`, `export_presets.cfg` versionado (sem segredos). Renderer: **Mobile** para dispositivos; o simulador iOS **só suporta Compatibility**. Pixel art: `Project Settings → Rendering → Textures → Default Texture Filter = Nearest`.
2. **Regras de GDScript**: tipagem estática em tudo, `class_name`, `@export`, sinais para cima e chamadas para baixo, `@onready`, `await` (nunca `yield`), nada de alocação em `_process`/`_physics_process`. Peça ao agente para validar APIs na doc 4.7 (risco alto de alucinar nomes do Godot 3).
3. **Canal de depuração**: autoload `DebugChannel.gd` que grava `user://debug_state.json` (cena, score, fps via `Engine.get_frames_per_second()`, último erro) a cada 0,5 s e imprime `[GAME] evento=…`. No iOS `user://` fica em `Documents` do app (recupere com `xcrun simctl get_app_container`/`devicectl device copy from`); no desktop, em `~/Library/Application Support/Godot/app_userdata/<nome>/` (macOS) ou `~/.local/share/godot/app_userdata/<nome>/` (Linux).
4. **Primeira verificação**:

```bash
.claude/skills/engine-godot-mobile/scripts/verify.sh --project game --feature esqueleto
```

   Resultado: `import.log`, `tests.log`, `godot-run.log`, `screenshot.png` (jogo rodando em janela 390×844), `debug_state.json`, `resumo.md`.
5. **Loop interativo com Godot AI** (fase 3/5): editor aberto → `editor_state` → `project_run(mode="current")` (espera o jogo ficar "live" e devolve `game_status` e `recent_errors`) → `editor_screenshot(source="game")` → `logs_read(source="game")`/`logs_read(source="editor")` para erros de parse e do Debugger → corrigir com `script_patch` (GDScript é validado e hot-reloaded) → `project_manage(op="stop")`. Receita de screenshot e pré-checagens em `references/testes-gut-gdunit.md`.
6. **Features** (fase 5): uma por sessão; cada regra de jogo em script puro (sem nós) testado por GUT/gdUnit4; cenas montadas em `.tscn` texto ou via Godot AI (`node_*`, `batch_execute`). Para 3D: GLB otimizado (gltfpack/glTF-Transform) importado pelo Godot; texturas com compressão ASTC para iOS nas opções de importação.
7. **Export iOS** (fase 8/10): preset `iOS` em `export_presets.cfg` com `application/export_project_only=true`, Team ID e bundle id; `godot --headless --path game --export-release "iOS" build/ios/Game.xcodeproj` gera o projeto Xcode, que entra em `/ci-xcode-cloud-fastlane`. Campos de privacy manifest (`privacy/collected_data/*`, `privacy/tracking_domains`, access reasons) ficam no próprio preset. Detalhes em `references/export-ios.md`.
8. **Performance** (fase 8): `--print-fps`, Profiler do editor, `Engine.max_fps`; `capabilities/performance_a12=true` para ter Metal/Forward+/Mobile com A12+; teste em Mac Apple silicon (roda o .ipa nativamente) e em iPhone real.

## Critério de pronto e evidência

- `verify.sh` saiu 0 nesta sessão; `tests.log` sem falhas; `screenshot.png` mostra a cena esperada; `godot-run.log` sem `ERROR`/`SCRIPT ERROR`.
- Para features visuais no iOS: screenshot do simulador (Compatibility) **ou** de dispositivo/Mac Apple silicon (Mobile) anexado à feature.
- Rodar `--check-only` ou importar sem erro não é execução.

## Verificar no simulador/dispositivo

- Simulador: `export_project_only` → `xcodebuild` + `xcrun simctl` (receita em `references/export-ios.md`); lembre do renderer Compatibility.
- Dispositivo/Mac Apple silicon: Xcode com Team configurado; one-click deploy do editor para iOS foi corrigido para Xcode 26 na 4.7.
- Debug remoto: `godot --remote-debug tcp://<ip>:6007` na export com `debug`; logs via `logs_read` do Godot AI ou console do Xcode.

## Armadilhas conhecidas

- **Versão errada na cabeça do agente**: Godot 3 vs 4 (`yield`→`await`, `export`→`@export`, `connect` com `Callable`). Forneça a doc 4.7 e revise APIs.
- **Export templates ≠ versão do editor** falham; **C# no iOS experimental** e sem build pelo Godot AI.
- **Simulador = Compatibility** (GLES3); Mobile/Forward+ (Metal) só em dispositivo/Mac. Não compare performance no simulador.
- **A12+**: exports Metal (Forward+/Mobile) restringem a A12 ou mais novo desde a 4.5.2; defina o mínimo no App Store Connect coerente.
- **Godot AI e F5**: `editor_screenshot(source="game")` só funciona para runs iniciados por `project_run` (não F5) e exige o autoload `_mcp_game_helper` que o plug-in instala.
- **Headless não renderiza**: `--headless` serve para import/tests/export; screenshot precisa de janela (macOS) ou `xvfb-run` (Linux) — `verify.sh` detecta.
- **MCP comunitário desatualizado**: Coding-Solo/godot-mcp (6k estrelas) parou em 16/04/2026 e não tira screenshots; prefira Godot AI (push em 10/10/2026).
- **Licenças**: Godot MIT; GUT MIT; gdUnit4 MIT; Godot AI MIT com telemetria opt-out; godot-mcp-pro/GDAI são pagos (não necessários).
- **Custo**: zero em ferramentas; export iOS leva minutos. Use `--no-run` em iterações.

## Fontes

- Releases e CHANGELOG do Godot (datas 4.6/4.7/4.7.2; itens iOS/Metal/Xcode 26): https://github.com/godotengine/godot/releases ; https://github.com/godotengine/godot/blob/master/CHANGELOG.md
- Exporting for iOS (macOS+Xcode, Team ID, C# experimental, simulador Compatibility, variáveis de CI): https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_ios.rst
- EditorExportPlatformIOS (`export_project_only`, `performance_a12`, privacy manifest): https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- hi-godot/godot-ai (requisitos 4.7+, C# text-only, instalação, telemetria) e TOOLS.md (`project_run`, `test_run`, `logs_read`, `editor_screenshot`): https://github.com/hi-godot/godot-ai ; https://raw.githubusercontent.com/hi-godot/godot-ai/main/docs/TOOLS.md
- Coding-Solo/godot-mcp (último push 16/04/2026): https://github.com/Coding-Solo/godot-mcp
- Política da Godot Foundation sobre contribuições de IA (30/06/2026) [secundário]: https://letsdatascience.com/news/godot-tightens-rules-on-ai-contributed-code-8f3a9630
- Godot 4.5.2 (A12+ padrão) [secundário]: https://godotengine.org/article/maintenance-release-godot-4-5-2/
- CLI do Godot (`--headless`, `--import`, `--export-release`, `--doctool`, `--check-only`, `-s`): https://docs.godotengine.org/en/4.7/tutorials/editor/command_line_tutorial.html [página não lida nesta pesquisa; confirme flags]
- GUT: https://github.com/bitwes/Gut ; gdUnit4: https://github.com/MikeSchulze/gdUnit4 [READMEs não lidos nesta pesquisa; confirme a linha de comando]
