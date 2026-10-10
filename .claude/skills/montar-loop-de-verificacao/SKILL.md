---
name: montar-loop-de-verificacao
description: >
  Monta no dia 1 o loop construir → rodar → screenshot → ler log que o agente fecha sozinho: para a engine
  escolhida, define os comandos de build, execução, captura e leitura de log, instala o canal interno de
  depuração (estado do jogo em debug_state.json/log lido pelo agente), copia scripts/verify.sh para o projeto
  (despachante que detecta a engine e chama o verify da skill engine-*) e explica o contrato com o Stop hook
  (exit 0 = pode parar; exit 2 + mensagem = continue). Use sempre que o projeto não tiver scripts/verify.sh,
  quando o usuário disser "não consigo ver o jogo rodando", "como tirar screenshot do simulador", "o agente diz
  que funciona mas não roda", "automatizar o build", ou antes da primeira feature. Não use para implementar
  features (/ciclo-de-feature) nem para avaliar qualidade (/critico-independente).
license: MIT
compatibility: "Claude Code; macOS com Xcode para alvo iOS (simulador); bash 3.2+"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [3]
argument-hint: "[engine] [--feature F-000]"
disable-model-invocation: false
user-invocable: true
---

# Montar o loop de verificação

Entrega `scripts/verify.sh` instalado no projeto, o canal de depuração embutido no jogo e a feature F-000 fechada com `screenshot.png`, log e `verify.meta` (`exit: 0`) em `production/evidencias/<data>-F-000/`.

## Quando usar / quando não usar

- **Use** logo após o ADR de engine, antes de qualquer gameplay. A conclusão do relatório inverte a prioridade do dia 1: "gaste o primeiro dia montando o ciclo construir→rodar→screenshot→log, não escrevendo o GDD".
- **Use** quando o verify quebrar (nova versão da engine, novo simulador) ou ficar lento demais para o ciclo de feature.
- **Não use** para escrever o verificador completo de uma engine nova — isso pertence à skill `engine-<x>`; aqui você só garante que ele existe, obedece ao contrato e está ligado ao despachante.

## Pré-requisitos

- `production/engine.txt` (de `/escolher-engine-e-alvo`) e ferramentas instaladas (`/instalar-ferramentas`).
- A skill de engine com `scripts/verify.sh`: `engine-spritekit-swiftui`, `engine-realitykit-metal`, `engine-unity-mobile`, `engine-godot-mobile`, `engine-web-phaser`, `engine-web-threejs`.
- Para iOS: Xcode 26.3+ (MCP) ou 27 (agente controla o simulador); um simulador disponível (`xcrun simctl list devices available`).
- Detalhes por engine e o contrato do verificador: `references/comandos-por-engine.md`.

## Entradas

- Engine (nome canônico), orientação e dispositivo mínimo do brief (para escolher o simulador: ex. "iPhone 17" como padrão, o menor dispositivo suportado para legibilidade).
- `feature_list.json` com F-000 ("loop de verificação funciona com o projeto vazio").
- O esqueleto da engine já compilando.

## Passos

1. **Instale o despachante no projeto** e confirme que ele enxerga a engine e o verificador:

```bash
mkdir -p scripts && cp -n .claude/skills/montar-loop-de-verificacao/scripts/verify.sh scripts/verify.sh && chmod +x scripts/verify.sh
bash scripts/verify.sh --list      # verificadores de engine instalados neste banco
bash scripts/verify.sh --dry-run   # engine detectada + uso do verificador; não executa nada
```

   O despachante lê `production/engine.txt`, depois detecta por arquivos (`project.godot`, `ProjectSettings/ProjectVersion.txt`, `package.json`, `*.xcodeproj`), e chama `.claude/skills/engine-<x>/scripts/verify.sh --feature <id> --out <pasta>`. Ele não sabe construir jogo nenhum; o conhecimento fica na skill de engine.

2. **Se não houver verificador para a engine**, escreva-o dentro da skill `engine-<x>` seguindo o contrato de `references/comandos-por-engine.md` (interface `--feature`, `--out`, `--test`, `--no-run`, `--help`; saídas `screenshot.png`, `app.log`/`run.log`, `debug_state.json`, `resumo.md`; códigos 0 ok · 1 build/teste · 2 run/screenshot · 3 ambiente · 4 argumentos). Até ele existir, nenhuma feature visível pode ser `done`.

3. **Canal interno de depuração** (obrigatório). Cenas de jogo (SpriteKit, Metal, Unity, Godot) não expõem árvore de acessibilidade, então Maestro e `ui_describe_all` não enxergam o estado; o agente lê um arquivo. Instale o mecanismo da engine:

| Engine | Onde o jogo grava | Como o agente lê | Pronto na skill de engine? |
|---|---|---|---|
| SpriteKit / RealityKit | `Documents/debug_state.json` + `os_log` | `xcrun simctl get_app_container <udid> <bundle> data` → copiar; `log show --predicate 'process == "App"'`; dispositivo: `xcrun devicectl device copy from` | sim: `assets/DebugChannel.swift` de `engine-spritekit-swiftui` |
| Godot | `user://debug_state.json` + `print()` | caminho `user://` do SO; stdout do processo; Godot AI `logs_read` | autoload de ~30 linhas (ver referência) |
| Unity | `Application.persistentDataPath/debug_state.json` + `Debug.Log` | pasta do player; `-logFile`; MCP for Unity console | `MonoBehaviour` de ~40 linhas (ver referência) |
| Phaser / Pixi / Three / Babylon | `window.__gameState` + `console.log(JSON)` | Playwright `page.evaluate` / `page.on('console')` | script de ~20 linhas (ver referência) |

   Campos mínimos: `scene`, `score`, `fps`, `frame`, `lastEvent`, `lastError`, `timestamp`. Acrescente argumentos de lançamento para alcançar estado (`--scene`, `--seed`, `--state`): "um screenshot da tela de título não verifica nada sobre a profundidade 2" (procedimento Run and Observe do Game Studios).

4. **Comandos por engine** (resumo; detalhes e fontes na referência):

| Engine | Construir | Rodar | Screenshot | Log |
|---|---|---|---|---|
| Xcode (SpriteKit/RealityKit) | `xcodebuild -scheme X -destination 'platform=iOS Simulator,id=<udid>' build` | `xcrun simctl boot/install/launch` | `xcrun simctl io <udid> screenshot out.png`; Xcode 27 MCP; ios-simulator-mcp | `xcrun simctl spawn <udid> log show --predicate …` |
| Godot 4.7 | `godot --headless --path . --import` | `godot --path . --windowed --resolution 390x844 cena.tscn` | `--write-movie out.png --quit-after 60` (CLI) ou Godot AI `editor_screenshot` | stdout; Godot AI `logs_read` |
| Unity 6.3 | Unity CLI / `-batchmode -executeMethod` (skills `/unity:…`) | player construído (não `-batchmode`) | `ScreenCapture.CaptureScreenshot` via argumento `--screenshot` | `-logFile`; console via MCP |
| Web | `npm run build` | `npm run dev` + Playwright viewport de iPhone | `page.screenshot()` | `page.on('console')` |

   Nunca use flags headless/batch/null-RHI para capturar: "those exist to *skip* rendering" (Game Studios).

5. **Feche F-000 com o loop completo:**

```bash
DATA=$(date +%F)
bash scripts/verify.sh --feature F-000 --out "production/evidencias/${DATA}-F-000"
ls "production/evidencias/${DATA}-F-000"     # screenshot.png, app.log/run.log, debug_state.json, verify.log, verify.meta
```

   Abra o PNG com a ferramenta Read e descreva o que vê em uma linha (`Run result: OBSERVADO — …`). Procure `error|crash|exception` no log. Só então marque F-000 `done` em `feature_list.json` com `evidencia` apontando para a pasta.

6. **Deixe o loop rápido.** Alvo: verify completo em < 3 min no projeto vazio. Para iterar compilação use o verificador com `--no-run` (ou `bash scripts/verify.sh --quick`); o fechamento da feature usa sempre o modo completo. Anote tempos em `progress.md`.

7. **Contrato com o Stop hook.** O hook já ativo neste repositório (`.claude/hooks/stop-gate.sh`, registrado em `.claude/settings.json`) lê `feature_list.json` ao fim de cada turno: feature `done` sem pasta de evidência não vazia, ou feature `in_progress`, → imprime o motivo em stderr e sai 2 → o Claude Code impede o fim do turno e entrega o motivo ao agente; sai 0 → pode parar. O Claude Code limita a 8 continuações seguidas e informa `stop_hook_active: true` no stdin do hook. Se o projeto quiser que o hook também **execute** `./scripts/verify.sh`, o contrato é: exit 0 do verify → hook sai 0; exit 2 (jogo falhou) → hook repassa a primeira linha de stderr e sai 2; exit 1 (configuração: engine não detectada, verificador ausente) → hook avisa e sai 0, para não prender o agente em um loop que ele não consegue resolver. Esboço na referência; o hook em si é mantido em `.claude/hooks/` por outro grupo.

8. **Registre e commite.** `progress.md`: comandos, tempos, simulador usado, limitações encontradas. Commit `chore(verify): instala loop de verificação para <engine> (F-000 com evidência)`.

## Critério de pronto e evidência

- `./scripts/verify.sh` existe, é executável, `--dry-run` identifica engine e verificador, `--help` sai 1 com o uso.
- `production/evidencias/<data>-F-000/` contém `screenshot.png` (tela inicial real, não a de launch), log de execução, `debug_state.json` (ou equivalente), `verify.log` e `verify.meta` com `exit: 0`.
- F-000 `done` em `feature_list.json` apontando para a pasta; `stop-gate.sh` não reclama ao encerrar.
- `progress.md` registra comandos e tempo do verify.

## Verificar no simulador/dispositivo

- Simulador é o padrão do loop (rápido, sem assinatura). Haptics, desempenho real, Game Center e Metal em GPU real só em dispositivo: `xcrun devicectl device install app`, `… process launch`, `… copy from` (use `--json-output`; a Apple diz para não parsear o texto do terminal). Godot no simulador só com renderer Compatibility; em Mac Apple silicon o `.ipa` roda nativamente.
- Feche cada feature no simulador; rode no dispositivo ao menos a cada marco (fase 8) e registre FPS via MetricKit (iOS 27 inclui taxa de quadros Metal).

## Armadilhas conhecidas

- **Headless não renderiza**: `--headless` (Godot), `-batchmode`/`-nographics` (Unity), `-nullrhi` (Unreal) pulam o render; use-os só para importar/testar lógica.
- **Árvore de acessibilidade ausente** em cenas de jogo: toques por coordenada + screenshot + canal de depuração; Maestro só para menus nativos.
- **Alerts nativos**: no padrão da Anthropic com Puppeteer, "Claude can't see browser-native alert modals"; evite `alert()` em jogos web e diálogos de sistema inesperados no simulador.
- **Screenshot da tela de título** prova pouco: lance direto na cena/estado (`--scene`, `--seed`) ou a feature será sempre "NÃO VERIFICADO".
- **Waits fixos** geram flakiness: espere `game_status: live` (Godot AI), `launchctl list` com o bundle (simctl) ou um campo `ready` no `debug_state.json`.
- **Stop hook sem `stop_hook_active`** vira loop até o cap de 8; **bloquear por erro de configuração** prende o agente em algo que ele não resolve.
- **Xcode 26.3**: negar acesso do agente ao projeto é irreversível sem Ajustes do Sistema. **Xcode 27**: Device Hub não envia toque de dois dedos; controle de jogo só no simulador de visionOS.
- **MobileBuildMCP** mudou nome/pacote/variáveis na 2.7.1; **ios-simulator-mcp** < 1.3.3 tinha injeção de comando.
- **Evidência pesada**: PNG pequeno (recorte, 1×) e sem vídeo no git (`.gitignore` já exclui `.mov`/`.mp4`).
- **Unity**: "not every change is logged or can be undone from the Editor" — commit antes de deixar o agente dirigir o Editor.

## Fontes

- Anthropic — Claude Code best practices (três níveis de verificação; Stop hook como gate; evidência em vez de afirmação): https://www.anthropic.com/engineering/claude-code-best-practices
- Anthropic — Effective harnesses for long-running agents (automação de navegador com screenshots; limite dos alerts): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Claude Code — Hooks (Stop, `stop_hook_active`, cap de 8, exit 2): https://code.claude.com/docs/en/hooks
- Donchitos/Claude-Code-Game-Studios — `run-and-observe.md` e "a parse check is not a run" (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Apple — Xcode 27 Release Notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes · Xcode 26.3: https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes
- Apple — Interacting with devices using the command line (`simctl`, `devicectl`): https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- Apple — WWDC26 sessão 222, MetricKit (frame rate Metal): https://developer.apple.com/videos/play/wwdc2026/222/
- getsentry/MobileBuildMCP: https://github.com/getsentry/MobileBuildMCP · joshuayoes/ios-simulator-mcp: https://github.com/joshuayoes/ios-simulator-mcp · mobile-dev-inc/maestro: https://github.com/mobile-dev-inc/maestro
- hi-godot/godot-ai (`project_run`, `logs_read`, `editor_screenshot`): https://github.com/hi-godot/godot-ai · godot-docs Exporting for iOS: https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_ios.rst
- Unity-Technologies/unity-agent-plugin (Unity CLI, aviso de undo): https://github.com/Unity-Technologies/unity-agent-plugin · CoplayDev/unity-mcp: https://github.com/CoplayDev/unity-mcp
- phaserjs/editor-mcp-server: https://github.com/phaserjs/editor-mcp-server · playcanvas/editor-mcp-server: https://github.com/playcanvas/editor-mcp-server
- Relatório interno `reports/Criação de jogos totalmente por IA.md` ("Testes e publicação", "Conclusão") e `research_notes/.../pipeline_ios_e_aspectos_legais.md` (Pergunta 4).
