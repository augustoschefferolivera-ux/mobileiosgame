#!/usr/bin/env bash
# verify.sh — engine-realitykit-metal
# Constrói o projeto Xcode, instala e lança no iOS Simulator, captura screenshot,
# coleta log e o arquivo de depuração (Documents/debug_state.json) e grava tudo em
# production/evidencias/<AAAA-MM-DD>-<feature>/.
#
# EXIGE macOS com Xcode (xcodebuild, xcrun simctl, plutil). Em outro SO sai com 3.
# Só usa comandos documentados pela Apple: xcodebuild, xcrun simctl (list/boot/bootstatus/
# install/launch/io screenshot/get_app_container/spawn/terminate), plutil, log.
# Nunca apaga nada fora do diretório de saída que ele mesmo criou.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
PROJECT=""
SCHEME=""
SIMULATOR="${SIMULATOR_NAME:-iPhone 17}"
FEATURE="verify"
OUT=""
RUN_TESTS=0
METAL_VALIDATION=0
NO_RUN=0
WAIT_SECS=6
CONFIGURATION="Debug"

usage() {
  cat <<USAGE
Uso: $SCRIPT_NAME [opções]

  --project <.xcodeproj|.xcworkspace>  Projeto (padrão: primeiro *.xcworkspace, senão *.xcodeproj do cwd)
  --scheme <nome>                      Scheme (padrão: nome do projeto sem extensão)
  --simulator <nome>                   Nome do simulador (padrão: \$SIMULATOR_NAME ou "iPhone 17")
  --feature <slug>                     Slug da feature para a pasta de evidência (padrão: verify)
  --out <dir>                          Pasta de saída (padrão: production/evidencias/<data>-<feature>)
  --configuration <Debug|Release>      (padrão: Debug)
  --test                               Também roda 'xcodebuild test' (gera test.xcresult)
  --metal-validation                   Lança o app com MTL_DEBUG_LAYER=1 (validação da API Metal; erros vão para app.log)
  --wait <segundos>                    Espera entre launch e screenshot (padrão: 6)
  --no-run                             Só compila; não boota simulador nem tira screenshot
  -h, --help                           Esta ajuda

Saída: 0 = build OK e, salvo --no-run, app lançou e screenshot.png foi gravado.
       1 = build/teste falhou   2 = app não ficou em execução ou screenshot falhou
       3 = ambiente sem macOS/Xcode   4 = argumentos inválidos
Variáveis passadas ao app: SIMCTL_CHILD_GAME_DEBUG=1 (liga o DebugChannel em Release).
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --simulator) SIMULATOR="$2"; shift 2 ;;
    --feature) FEATURE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --configuration) CONFIGURATION="$2"; shift 2 ;;
    --test) RUN_TESTS=1; shift ;;
    --metal-validation) METAL_VALIDATION=1; shift ;;
    --wait) WAIT_SECS="$2"; shift 2 ;;
    --no-run) NO_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; usage >&2; exit 4 ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[$SCRIPT_NAME] Este script exige macOS com Xcode (xcodebuild/xcrun simctl). SO atual: $(uname -s)." >&2
  echo "[$SCRIPT_NAME] Rode em um Mac, no Xcode Cloud ou em um runner macOS do GitHub Actions." >&2
  exit 3
fi
command -v xcodebuild >/dev/null || { echo "xcodebuild não encontrado; instale o Xcode e rode 'xcode-select -s'." >&2; exit 3; }

# Descobre projeto/scheme
if [[ -z "$PROJECT" ]]; then
  PROJECT="$(ls -d ./*.xcworkspace 2>/dev/null | grep -v '/project.xcworkspace$' | head -1 || true)"
  [[ -n "$PROJECT" ]] || PROJECT="$(ls -d ./*.xcodeproj 2>/dev/null | head -1 || true)"
fi
[[ -n "$PROJECT" && -e "$PROJECT" ]] || { echo "Nenhum .xcworkspace/.xcodeproj encontrado; use --project." >&2; exit 4; }
PROJECT_BASENAME="$(basename "$PROJECT")"
[[ -n "$SCHEME" ]] || SCHEME="${PROJECT_BASENAME%.*}"
if [[ "$PROJECT" == *.xcworkspace ]]; then PROJ_FLAG=(-workspace "$PROJECT"); else PROJ_FLAG=(-project "$PROJECT"); fi

DATE="$(date +%Y-%m-%d)"
[[ -n "$OUT" ]] || OUT="production/evidencias/${DATE}-${FEATURE}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
DERIVED="$OUT/DerivedData"
echo "[$SCRIPT_NAME] projeto=$PROJECT scheme=$SCHEME simulador=$SIMULATOR saída=$OUT"

# Escolhe UDID do simulador pelo nome (JSON do simctl parseado com python -I, sem jq)
pick_udid() {
  xcrun simctl list devices available -j | python3 -I -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for runtime, devices in data.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    for d in devices:
        if d.get("name") == name and d.get("isAvailable", True):
            print(d["udid"]); sys.exit(0)
sys.exit(1)' "$1"
}

UDID="$(pick_udid "$SIMULATOR" || true)"
if [[ -z "$UDID" ]]; then
  echo "[$SCRIPT_NAME] Simulador '$SIMULATOR' não encontrado. Disponíveis:" >&2
  xcrun simctl list devices available | grep -E "iPhone|iPad" >&2 || true
  exit 4
fi
DEST="platform=iOS Simulator,id=$UDID"

STATUS_BUILD="falhou"; STATUS_TEST="não executado"; STATUS_RUN="não executado"; STATUS_SHOT="não executado"
write_summary() {
  cat > "$OUT/resumo.md" <<SUMMARY
# Evidência — $FEATURE ($DATE)

- Projeto: $PROJECT (scheme $SCHEME, $CONFIGURATION)
- Simulador: $SIMULATOR ($UDID)
- Build: $STATUS_BUILD
- Testes: $STATUS_TEST
- Execução: $STATUS_RUN
- Screenshot: $STATUS_SHOT
- Validação Metal: $([[ $METAL_VALIDATION -eq 1 ]] && echo ligada || echo desligada)
- Arquivos: xcodebuild.log, app.log, screenshot.png, debug_state.json (se o app gravou), build.xcresult
SUMMARY
}
trap write_summary EXIT

# 1) Build
echo "[$SCRIPT_NAME] xcodebuild build…"
if xcodebuild "${PROJ_FLAG[@]}" -scheme "$SCHEME" -configuration "$CONFIGURATION" \
     -destination "$DEST" -derivedDataPath "$DERIVED" \
     -resultBundlePath "$OUT/build.xcresult" build 2>&1 | tee "$OUT/xcodebuild.log" | grep -E "error:|warning: .*deprecated|BUILD" ; then :; fi
if ! grep -q "BUILD SUCCEEDED" "$OUT/xcodebuild.log"; then
  echo "[$SCRIPT_NAME] BUILD FALHOU — veja $OUT/xcodebuild.log" >&2
  exit 1
fi
STATUS_BUILD="ok"

# 2) Testes (opcional)
if [[ $RUN_TESTS -eq 1 ]]; then
  echo "[$SCRIPT_NAME] xcodebuild test…"
  if xcodebuild "${PROJ_FLAG[@]}" -scheme "$SCHEME" -destination "$DEST" -derivedDataPath "$DERIVED" \
       -resultBundlePath "$OUT/test.xcresult" test 2>&1 | tee "$OUT/xcodebuild-test.log" | grep -E "Test Suite|passed|failed|error:" ; then :; fi
  if grep -q "TEST SUCCEEDED" "$OUT/xcodebuild-test.log"; then STATUS_TEST="ok"; else STATUS_TEST="falhou"; echo "[$SCRIPT_NAME] TESTES FALHARAM" >&2; exit 1; fi
fi

if [[ $NO_RUN -eq 1 ]]; then STATUS_RUN="pulado (--no-run)"; STATUS_SHOT="pulado"; echo "[$SCRIPT_NAME] --no-run: fim."; exit 0; fi

# 3) Localiza .app e bundle id
APP="$(find "$DERIVED/Build/Products" -maxdepth 3 -name '*.app' -path '*iphonesimulator*' | head -1 || true)"
[[ -n "$APP" ]] || { echo "Nenhum .app para iphonesimulator em $DERIVED/Build/Products" >&2; exit 2; }
BUNDLE_ID="$(plutil -extract CFBundleIdentifier raw "$APP/Info.plist")"
APP_NAME="$(basename "$APP" .app)"

# 4) Boot, install, launch
echo "[$SCRIPT_NAME] boot $SIMULATOR…"
xcrun simctl boot "$UDID" 2>/dev/null || true          # erro se já estiver ligado: ignorar
xcrun simctl bootstatus "$UDID" -b >/dev/null
xcrun simctl install "$UDID" "$APP"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
LAUNCH_AT="$(date '+%Y-%m-%d %H:%M:%S')"
LAUNCH_ENV=(env SIMCTL_CHILD_GAME_DEBUG=1)
if [[ $METAL_VALIDATION -eq 1 ]]; then LAUNCH_ENV+=(SIMCTL_CHILD_MTL_DEBUG_LAYER=1); fi
"${LAUNCH_ENV[@]}" xcrun simctl launch "$UDID" "$BUNDLE_ID" | tee "$OUT/launch.txt"
sleep "$WAIT_SECS"

# 5) App continua em execução? (launchctl lista o job UIKitApplication:<bundle>)
if xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"; then
  STATUS_RUN="em execução após ${WAIT_SECS}s"
else
  STATUS_RUN="ENCERROU antes de ${WAIT_SECS}s (crash?)"
fi

# 6) Screenshot + logs + arquivo de depuração
if xcrun simctl io "$UDID" screenshot "$OUT/screenshot.png" >/dev/null 2>&1; then STATUS_SHOT="ok"; else STATUS_SHOT="falhou"; fi
xcrun simctl spawn "$UDID" log show --start "$LAUNCH_AT" --style compact \
  --predicate "process == \"$APP_NAME\"" > "$OUT/app.log" 2>/dev/null || true
CONTAINER="$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -n "$CONTAINER" && -f "$CONTAINER/Documents/debug_state.json" ]]; then
  cp "$CONTAINER/Documents/debug_state.json" "$OUT/debug_state.json"
  echo "[$SCRIPT_NAME] debug_state.json:"; cat "$OUT/debug_state.json"
else
  echo "[$SCRIPT_NAME] (sem debug_state.json — o app ainda não usa DebugChannel?)"
fi
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true

echo "[$SCRIPT_NAME] evidência em $OUT (build=$STATUS_BUILD run=$STATUS_RUN screenshot=$STATUS_SHOT)"
if [[ "$STATUS_RUN" == ENCERROU* || "$STATUS_SHOT" != "ok" ]]; then exit 2; fi
exit 0
