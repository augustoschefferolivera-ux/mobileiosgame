#!/usr/bin/env bash
# verify.sh — engine-unity-mobile
# 1) roda testes do Unity Test Framework em batchmode (EditMode/PlayMode),
# 2) gera o projeto Xcode iOS em batchmode (-executeMethod BuildScripts.BuildIOS),
# 3) em macOS: compila com xcodebuild para o iOS Simulator, instala, lança, screenshot, logs.
# Evidências em production/evidencias/<AAAA-MM-DD>-<feature>/.
#
# Passos 1–2 rodam em qualquer SO com o Editor Unity + iOS Build Support instalado.
# Passo 3 EXIGE macOS com Xcode (xcodebuild, xcrun simctl); fora do macOS ele é pulado com aviso.
# Comandos usados: Unity -batchmode -nographics -quit -projectPath -executeMethod -logFile -runTests
# -testPlatform -testResults; xcodebuild; xcrun simctl; plutil. Nada é apagado fora da pasta de saída.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="."
UNITY="${UNITY_PATH:-}"
FEATURE="verify"
OUT=""
TESTS="editmode"          # editmode | playmode | both | none
METHOD="BuildScripts.BuildIOS"
SIMULATOR="${SIMULATOR_NAME:-iPhone 17}"
XCODE_SCHEME="Unity-iPhone"
NO_XCODE=0
DEVICE_SDK=0
WAIT_SECS=8

usage() {
  cat <<USAGE
Uso: $SCRIPT_NAME [opções]

  --project <dir>            Pasta do projeto Unity (contém Assets/ e ProjectSettings/). Padrão: .
  --unity <binário>          Editor Unity (padrão: \$UNITY_PATH ou o mais novo em /Applications/Unity/Hub/Editor)
  --feature <slug>           Slug da feature (padrão: verify)
  --out <dir>                Saída (padrão: production/evidencias/<data>-<feature>)
  --tests <editmode|playmode|both|none>  Testes UTF a rodar (padrão: editmode)
  --method <Classe.Metodo>   Método estático de build (padrão: BuildScripts.BuildIOS; copie assets/BuildScripts.cs)
  --device-sdk               Gera projeto Xcode para dispositivo (sem simulador) e pula o passo 3
  --simulator <nome>         Simulador iOS (padrão: \$SIMULATOR_NAME ou "iPhone 17")
  --xcode-scheme <nome>      Scheme do projeto gerado (padrão: Unity-iPhone)
  --no-xcode                 Para após gerar o projeto Xcode
  --wait <segundos>          Espera antes do screenshot (padrão: 8)
  -h, --help

Saída: 0 = testes ok, projeto Xcode gerado e (em macOS, sem --no-xcode/--device-sdk) app lançou + screenshot.
       1 = testes/build Unity falharam  2 = xcodebuild/simulador falhou  3 = Editor/Xcode ausente  4 = argumentos
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --unity) UNITY="$2"; shift 2 ;;
    --feature) FEATURE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --tests) TESTS="$2"; shift 2 ;;
    --method) METHOD="$2"; shift 2 ;;
    --device-sdk) DEVICE_SDK=1; shift ;;
    --simulator) SIMULATOR="$2"; shift 2 ;;
    --xcode-scheme) XCODE_SCHEME="$2"; shift 2 ;;
    --no-xcode) NO_XCODE=1; shift ;;
    --wait) WAIT_SECS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; usage >&2; exit 4 ;;
  esac
done

[[ -d "$PROJECT/Assets" && -d "$PROJECT/ProjectSettings" ]] || { echo "Projeto Unity não encontrado em '$PROJECT' (precisa de Assets/ e ProjectSettings/)." >&2; exit 4; }
PROJECT="$(cd "$PROJECT" && pwd)"

# Localiza o Editor
if [[ -z "$UNITY" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    UNITY="$(ls -d /Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity 2>/dev/null | sort -V | tail -1 || true)"
  else
    UNITY="$(ls -d "$HOME"/Unity/Hub/Editor/*/Editor/Unity 2>/dev/null | sort -V | tail -1 || true)"
  fi
fi
[[ -n "$UNITY" && -x "$UNITY" ]] || { echo "Editor Unity não encontrado; use --unity ou UNITY_PATH." >&2; exit 3; }
PROJECT_VERSION="$(grep -m1 m_EditorVersion "$PROJECT/ProjectSettings/ProjectVersion.txt" | awk '{print $2}')"
echo "[$SCRIPT_NAME] projeto=$PROJECT versão-do-projeto=$PROJECT_VERSION editor=$UNITY"

DATE="$(date +%Y-%m-%d)"
[[ -n "$OUT" ]] || OUT="production/evidencias/${DATE}-${FEATURE}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
XCODE_DIR="$OUT/ios-xcode"

S_TESTS="não executado"; S_BUILD="não executado"; S_XCODE="não executado"; S_RUN="não executado"; S_SHOT="não executado"
write_summary() {
  cat > "$OUT/resumo.md" <<SUMMARY
# Evidência — $FEATURE ($DATE)

- Projeto Unity: $PROJECT (versão $PROJECT_VERSION)
- Testes UTF ($TESTS): $S_TESTS
- Build Unity → Xcode ($METHOD, $([[ $DEVICE_SDK -eq 1 ]] && echo DeviceSDK || echo SimulatorSDK)): $S_BUILD
- xcodebuild: $S_XCODE
- Execução no simulador ($SIMULATOR): $S_RUN
- Screenshot: $S_SHOT
- Arquivos: editmode.xml / playmode.xml, unity-tests-*.log, unity-build.log, ios-xcode/, xcodebuild.log, app.log, screenshot.png, debug_state.json
SUMMARY
}
trap write_summary EXIT

# Conta falhas no XML NUnit3 do UTF
count_failures() { python3 -I -c '
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
print(root.get("failed", "0"), root.get("total", "0"))' "$1"; }

run_tests() {
  local platform="$1" name
  name="$(echo "$platform" | tr '[:upper:]' '[:lower:]')"
  echo "[$SCRIPT_NAME] testes $platform…"
  "$UNITY" -batchmode -projectPath "$PROJECT" -runTests -testPlatform "$platform" \
    -testResults "$OUT/$name.xml" -logFile "$OUT/unity-tests-$name.log" || true
  [[ -f "$OUT/$name.xml" ]] || { echo "Sem resultados em $OUT/$name.xml (veja unity-tests-$name.log)" >&2; return 1; }
  read -r failed total < <(count_failures "$OUT/$name.xml")
  echo "[$SCRIPT_NAME] $platform: $total testes, $failed falhas"
  [[ "$failed" == "0" ]]
}

# 1) Testes
case "$TESTS" in
  none) S_TESTS="pulado" ;;
  editmode) if run_tests EditMode; then S_TESTS="ok"; else S_TESTS="falhou"; exit 1; fi ;;
  playmode) if run_tests PlayMode; then S_TESTS="ok"; else S_TESTS="falhou"; exit 1; fi ;;
  both) if run_tests EditMode && run_tests PlayMode; then S_TESTS="ok"; else S_TESTS="falhou"; exit 1; fi ;;
  *) echo "--tests inválido: $TESTS" >&2; exit 4 ;;
esac

# 2) Build do projeto Xcode
echo "[$SCRIPT_NAME] build iOS ($METHOD)…"
SIM_FLAG=(-simulator); [[ $DEVICE_SDK -eq 1 ]] && SIM_FLAG=()
if "$UNITY" -batchmode -nographics -quit -projectPath "$PROJECT" -executeMethod "$METHOD" \
     "${SIM_FLAG[@]}" -buildOutput "$XCODE_DIR" -logFile "$OUT/unity-build.log"; then
  S_BUILD="ok"
else
  S_BUILD="falhou"
fi
if grep -q "error CS" "$OUT/unity-build.log" 2>/dev/null; then S_BUILD="falhou (error CS)"; fi
[[ "$S_BUILD" == "ok" ]] || { echo "[$SCRIPT_NAME] build Unity falhou — veja $OUT/unity-build.log" >&2; grep -m5 "error" "$OUT/unity-build.log" >&2 || true; exit 1; }
XCPROJ="$(ls -d "$XCODE_DIR"/*.xcworkspace 2>/dev/null | head -1 || true)"
[[ -n "$XCPROJ" ]] || XCPROJ="$(ls -d "$XCODE_DIR"/*.xcodeproj 2>/dev/null | head -1 || true)"
[[ -n "$XCPROJ" ]] || { echo "Projeto Xcode não encontrado em $XCODE_DIR" >&2; exit 1; }
echo "[$SCRIPT_NAME] projeto Xcode: $XCPROJ"

if [[ $NO_XCODE -eq 1 || $DEVICE_SDK -eq 1 ]]; then S_XCODE="pulado"; S_RUN="pulado"; S_SHOT="pulado"; exit 0; fi
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[$SCRIPT_NAME] Passo 3 (xcodebuild + simulador) exige macOS; projeto Xcode gerado, pare aqui ou copie para um Mac." >&2
  S_XCODE="pulado (não é macOS)"; S_RUN="pulado"; S_SHOT="pulado"; exit 0
fi

# 3) xcodebuild + simulador (mesma receita de engine-spritekit-swiftui/scripts/verify.sh)
UDID="$(xcrun simctl list devices available -j | python3 -I -c '
import json, sys
name = sys.argv[1]
for runtime, devices in json.load(sys.stdin).get("devices", {}).items():
    if "iOS" in runtime:
        for d in devices:
            if d.get("name") == name and d.get("isAvailable", True):
                print(d["udid"]); sys.exit(0)
sys.exit(1)' "$SIMULATOR" || true)"
[[ -n "$UDID" ]] || { echo "Simulador '$SIMULATOR' não encontrado (xcrun simctl list devices available)." >&2; exit 4; }
if [[ "$XCPROJ" == *.xcworkspace ]]; then PF=(-workspace "$XCPROJ"); else PF=(-project "$XCPROJ"); fi
DERIVED="$OUT/DerivedData"
if xcodebuild "${PF[@]}" -scheme "$XCODE_SCHEME" -configuration Debug \
     -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$DERIVED" build 2>&1 | tee "$OUT/xcodebuild.log" | grep -E "error:|BUILD"; then :; fi
grep -q "BUILD SUCCEEDED" "$OUT/xcodebuild.log" || { S_XCODE="falhou"; echo "xcodebuild falhou — $OUT/xcodebuild.log" >&2; exit 2; }
S_XCODE="ok"
APP="$(find "$DERIVED/Build/Products" -maxdepth 3 -name '*.app' -path '*iphonesimulator*' | head -1 || true)"
[[ -n "$APP" ]] || { echo "Nenhum .app para iphonesimulator" >&2; exit 2; }
BUNDLE_ID="$(plutil -extract CFBundleIdentifier raw "$APP/Info.plist")"
APP_NAME="$(basename "$APP" .app)"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
xcrun simctl install "$UDID" "$APP"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
LAUNCH_AT="$(date '+%Y-%m-%d %H:%M:%S')"
xcrun simctl launch "$UDID" "$BUNDLE_ID" | tee "$OUT/launch.txt"
sleep "$WAIT_SECS"
if xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"; then S_RUN="em execução após ${WAIT_SECS}s"; else S_RUN="ENCERROU antes de ${WAIT_SECS}s"; fi
if xcrun simctl io "$UDID" screenshot "$OUT/screenshot.png" >/dev/null 2>&1; then S_SHOT="ok"; else S_SHOT="falhou"; fi
xcrun simctl spawn "$UDID" log show --start "$LAUNCH_AT" --style compact --predicate "process == \"$APP_NAME\"" > "$OUT/app.log" 2>/dev/null || true
CONTAINER="$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)"
[[ -n "$CONTAINER" && -f "$CONTAINER/Documents/debug_state.json" ]] && cp "$CONTAINER/Documents/debug_state.json" "$OUT/debug_state.json" || echo "[$SCRIPT_NAME] (sem debug_state.json)"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
echo "[$SCRIPT_NAME] evidência em $OUT (testes=$S_TESTS build=$S_BUILD xcode=$S_XCODE run=$S_RUN screenshot=$S_SHOT)"
[[ "$S_RUN" == ENCERROU* || "$S_SHOT" != "ok" ]] && exit 2
exit 0
