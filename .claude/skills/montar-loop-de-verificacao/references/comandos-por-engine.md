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

## 2. Engines removidas deste repositório

SpriteKit/RealityKit (Xcode), Godot e Unity foram removidos em favor do stack web (ADR-0001). Os comandos
deles estão no histórico do Git (commit `0977213`).

## 3. Web — Phaser / PixiJS / Three.js / Babylon.js

```bash
npm ci && npm run build                                     # build (Vite/esbuild conforme o projeto)
npm run dev -- --port 5173 &                                # servidor de desenvolvimento
npx playwright screenshot --device="iPhone 13" --wait-for-timeout=3000 http://localhost:5173 "$OUT/screenshot.png"   # [confirmar] flags
```

- Para console e estado, um script Node com Playwright: `page.on('console', m => log.push(m.text()))`, `await page.evaluate(() => JSON.stringify(window.__gameState))` → `run.log` e `debug_state.json`. Emule toque (`hasTouch: true`) e viewport de iPhone.
- Phaser Editor MCP (`scene-get-screenshot`) e PlayCanvas MCP (`launch_start`, `capture_runtime`, `inject_input`) quando o editor estiver em uso; o README do Phaser recomenda "training levels" rotulados porque só a imagem "may not always be sufficient for the LLM".
- Padrão da Anthropic: automação de navegador "as a human user would", com screenshots; limite: alerts nativos não são vistos pelo Puppeteer MCP.
- Capacitor: `npx cap sync ios && npx cap open ios` [confirmar] gera o projeto Xcode; daí a seção 2 (web view na App Store sob 4.7).

## 4. Esboço de Stop hook que executa o verify (opcional)

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
