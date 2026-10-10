#!/usr/bin/env bash
# verify.sh — engine-godot-mobile
# 1) importa o projeto em headless (godot --headless --import),
# 2) roda a suíte de testes (GUT ou gdUnit4, detectados em addons/), em headless,
# 3) executa o jogo com uma janela de iPhone (390x844) e salva screenshot via scripts/screenshot_probe.gd,
#    coletando stdout/stderr em godot-run.log e user://debug_state.json se o jogo gravar.
# Evidências em production/evidencias/<AAAA-MM-DD>-<feature>/.
#
# Passos 1–2 rodam em Linux/macOS/Windows com o binário 'godot' 4.7.x. Passo 3 precisa de janela:
# macOS roda direto; Linux usa xvfb-run se existir, senão pula com aviso. --headless NÃO renderiza.
# O export iOS (xcodebuild/simulador) está em references/export-ios.md e exige macOS; use --export-ios para gerá-lo.
# Flags do Godot usadas: --headless, --path, --import, --check-only, -s, --resolution, --export-release, --version.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="."
GODOT_BIN="${GODOT:-godot}"
FEATURE="verify"
OUT=""
TESTS="auto"          # auto | gut | gdunit | none
FRAMES=120
RESOLUTION="390x844"
NO_RUN=0
EXPORT_IOS=0
PRESET="iOS"

usage() {
  cat <<USAGE
Uso: $SCRIPT_NAME [opções]

  --project <dir>          Pasta com project.godot (padrão: .)
  --godot <binário>        Executável do Godot 4.7.x (padrão: \$GODOT ou 'godot' no PATH)
  --feature <slug>         Slug da feature (padrão: verify)
  --out <dir>              Saída (padrão: production/evidencias/<data>-<feature>)
  --tests <auto|gut|gdunit|none>  Framework de testes (padrão: auto-detecta addons/gut ou addons/gdUnit4)
  --frames <n>             Frames a esperar antes do screenshot (padrão: 120)
  --resolution <WxH>       Janela do jogo (padrão: 390x844 ~ iPhone em pontos)
  --no-run                 Só importa e testa (sem janela/screenshot)
  --export-ios             Também exporta o projeto Xcode com o preset "iOS" (export_project_only) para <out>/ios-xcode
  --preset <nome>          Nome do preset de export (padrão: iOS)
  -h, --help

Saída: 0 = import ok, testes ok e (salvo --no-run/sem display) screenshot gravado.
       1 = import/testes falharam  2 = jogo não rodou/screenshot falhou  3 = godot ausente  4 = argumentos
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --godot) GODOT_BIN="$2"; shift 2 ;;
    --feature) FEATURE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --tests) TESTS="$2"; shift 2 ;;
    --frames) FRAMES="$2"; shift 2 ;;
    --resolution) RESOLUTION="$2"; shift 2 ;;
    --no-run) NO_RUN=1; shift ;;
    --export-ios) EXPORT_IOS=1; shift ;;
    --preset) PRESET="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; usage >&2; exit 4 ;;
  esac
done

[[ -f "$PROJECT/project.godot" ]] || { echo "project.godot não encontrado em '$PROJECT'." >&2; exit 4; }
PROJECT="$(cd "$PROJECT" && pwd)"
command -v "$GODOT_BIN" >/dev/null || { echo "Godot não encontrado ('$GODOT_BIN'); instale 4.7.x e use --godot ou GODOT." >&2; exit 3; }
GODOT_VERSION="$("$GODOT_BIN" --version 2>/dev/null | head -1 || echo desconhecida)"
case "$GODOT_VERSION" in 4.7.*) ;; *) echo "[$SCRIPT_NAME] AVISO: versão do Godot é '$GODOT_VERSION'; esta skill fixa 4.7.x." >&2 ;; esac

DATE="$(date +%Y-%m-%d)"
[[ -n "$OUT" ]] || OUT="production/evidencias/${DATE}-${FEATURE}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
echo "[$SCRIPT_NAME] projeto=$PROJECT godot=$GODOT_VERSION saída=$OUT"

S_IMPORT="não executado"; S_TESTS="não executado"; S_RUN="não executado"; S_SHOT="não executado"; S_EXPORT="não executado"
write_summary() {
  cat > "$OUT/resumo.md" <<SUMMARY
# Evidência — $FEATURE ($DATE)

- Projeto Godot: $PROJECT (Godot $GODOT_VERSION)
- Import headless: $S_IMPORT
- Testes ($TESTS): $S_TESTS
- Execução ($RESOLUTION, $FRAMES frames): $S_RUN
- Screenshot: $S_SHOT
- Export iOS (preset $PRESET): $S_EXPORT
- Arquivos: import.log, tests.log, godot-run.log, screenshot.png, debug_state.json (se o jogo gravou), ios-xcode/
SUMMARY
}
trap write_summary EXIT

# 1) Import
echo "[$SCRIPT_NAME] import headless…"
if "$GODOT_BIN" --headless --path "$PROJECT" --import > "$OUT/import.log" 2>&1; then S_IMPORT="ok"; else S_IMPORT="falhou"; fi
if grep -qE "SCRIPT ERROR|ERROR: Failed to load" "$OUT/import.log"; then S_IMPORT="falhou (erros no log)"; fi
[[ "$S_IMPORT" == "ok" ]] || { echo "[$SCRIPT_NAME] import falhou — veja $OUT/import.log" >&2; grep -m10 -E "ERROR" "$OUT/import.log" >&2 || true; exit 1; }

# 2) Testes
if [[ "$TESTS" == "auto" ]]; then
  if [[ -d "$PROJECT/addons/gut" ]]; then TESTS="gut"; elif [[ -d "$PROJECT/addons/gdUnit4" ]]; then TESTS="gdunit"; else TESTS="none"; fi
fi
case "$TESTS" in
  gut)
    echo "[$SCRIPT_NAME] testes GUT…"
    # Flags do GUT: confirme no README da versão instalada (bitwes/Gut).
    if "$GODOT_BIN" --headless --path "$PROJECT" -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit > "$OUT/tests.log" 2>&1; then S_TESTS="ok"; else S_TESTS="falhou"; fi ;;
  gdunit)
    echo "[$SCRIPT_NAME] testes gdUnit4…"
    # Flags do gdUnit4: confirme no README (MikeSchulze/gdUnit4); runtest.sh embrulha este comando.
    if "$GODOT_BIN" --headless --path "$PROJECT" -s res://addons/gdUnit4/bin/GdUnitCmdTool.gd --add res://tests --ignoreHeadlessMode > "$OUT/tests.log" 2>&1; then S_TESTS="ok"; else S_TESTS="falhou"; fi ;;
  none) S_TESTS="pulado (nenhum framework)"; echo "[$SCRIPT_NAME] sem GUT/gdUnit4 em addons/: testes pulados." ;;
  *) echo "--tests inválido: $TESTS" >&2; exit 4 ;;
esac
[[ "$S_TESTS" != "falhou" ]] || { echo "[$SCRIPT_NAME] testes falharam — veja $OUT/tests.log" >&2; tail -n 30 "$OUT/tests.log" >&2; exit 1; }

# 3) Execução com janela + screenshot
if [[ $NO_RUN -eq 1 ]]; then
  S_RUN="pulado (--no-run)"; S_SHOT="pulado"
else
  RUNNER=()
  if [[ "$(uname -s)" == "Darwin" ]]; then
    :
  elif [[ -n "${DISPLAY:-}" ]]; then
    :
  elif command -v xvfb-run >/dev/null; then
    RUNNER=(xvfb-run -a -s "-screen 0 1280x1024x24")
  else
    echo "[$SCRIPT_NAME] sem display e sem xvfb-run: screenshot pulado (instale xvfb ou rode em macOS)." >&2
    S_RUN="pulado (sem display)"; S_SHOT="pulado"
  fi
  if [[ "$S_RUN" == "não executado" ]]; then
    echo "[$SCRIPT_NAME] executando jogo ($RESOLUTION, $FRAMES frames)…"
    set +e
    "${RUNNER[@]}" "$GODOT_BIN" --path "$PROJECT" --resolution "$RESOLUTION" \
      -s "$SKILL_DIR/scripts/screenshot_probe.gd" -- "--out=$OUT/screenshot.png" "--frames=$FRAMES" > "$OUT/godot-run.log" 2>&1
    RC=$?
    set -e
    if [[ $RC -eq 0 && -f "$OUT/screenshot.png" ]]; then S_RUN="ok"; S_SHOT="ok"; else S_RUN="falhou (rc=$RC)"; S_SHOT="falhou"; fi
    if grep -qE "SCRIPT ERROR|^ERROR:" "$OUT/godot-run.log"; then S_RUN="$S_RUN + erros em godot-run.log"; fi
    # debug_state.json gravado pelo jogo em user://
    PROJECT_NAME="$(grep -m1 '^config/name=' "$PROJECT/project.godot" | sed -E 's/^config\/name="(.*)"$/\1/')"
    for cand in "$HOME/Library/Application Support/Godot/app_userdata/$PROJECT_NAME/debug_state.json" \
                "$HOME/.local/share/godot/app_userdata/$PROJECT_NAME/debug_state.json"; do
      [[ -f "$cand" ]] && cp "$cand" "$OUT/debug_state.json" && echo "[$SCRIPT_NAME] debug_state.json copiado" && break
    done
  fi
fi

# 4) Export iOS (projeto Xcode) — exige templates 4.7.x; só gera, não compila
if [[ $EXPORT_IOS -eq 1 ]]; then
  echo "[$SCRIPT_NAME] export iOS (preset '$PRESET')…"
  mkdir -p "$OUT/ios-xcode"
  if "$GODOT_BIN" --headless --path "$PROJECT" --export-release "$PRESET" "$OUT/ios-xcode/Game.xcodeproj" > "$OUT/export-ios.log" 2>&1 \
     && ls "$OUT/ios-xcode"/*.xcodeproj >/dev/null 2>&1; then
    S_EXPORT="ok ($OUT/ios-xcode) — compile com xcodebuild em macOS (references/export-ios.md)"
  else
    S_EXPORT="falhou (veja export-ios.log; templates 4.7.x instalados? preset existe?)"
  fi
else
  S_EXPORT="pulado"
fi

echo "[$SCRIPT_NAME] evidência em $OUT (import=$S_IMPORT testes=$S_TESTS run=$S_RUN screenshot=$S_SHOT export=$S_EXPORT)"
[[ "$S_RUN" == falhou* || "$S_RUN" == *erros* ]] && exit 2
[[ "$S_EXPORT" == falhou* ]] && exit 2
exit 0
