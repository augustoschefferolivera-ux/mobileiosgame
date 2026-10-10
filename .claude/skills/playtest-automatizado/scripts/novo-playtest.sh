#!/usr/bin/env bash
# novo-playtest.sh — cria production/playtests/<data>-<feature>.md a partir de assets/playtest-template.md.
# Não sobrescreve arquivo existente. Roda em qualquer SO com bash.
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
usage() { cat <<'USAGE'
Uso: novo-playtest.sh <feature> [--build <scheme|url>] [--device "iPhone 17"] [--camada <xcode27|mcp|maestro|web>] [--criterio "<texto>"] [--out <dir>]
Cria production/playtests/<AAAA-MM-DD>-<feature>.md preenchendo cabeçalho; imprime o caminho.
USAGE
}
[[ $# -ge 1 ]] || { usage; exit 4; }
[[ "$1" == "-h" || "$1" == "--help" ]] && { usage; exit 0; }
FEATURE="$1"; shift
BUILD="?"; DEVICE="iPhone 17"; CAMADA="xcode27"; CRITERIO="(copie de feature_list.json)"; OUTDIR="production/playtests"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --camada) CAMADA="$2"; shift 2 ;;
    --criterio) CRITERIO="$2"; shift 2 ;;
    --out) OUTDIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 4 ;;
  esac
done
DATE="$(date +%Y-%m-%d)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo sem-git)"
mkdir -p "$OUTDIR"
FILE="$OUTDIR/${DATE}-${FEATURE}.md"
[[ -e "$FILE" ]] && { echo "Já existe: $FILE (não sobrescrevo)." >&2; exit 2; }
python3 -I - "$SKILL_DIR/assets/playtest-template.md" "$FILE" "$FEATURE" "$DATE" "$COMMIT" "$BUILD" "$DEVICE" "$CAMADA" "$CRITERIO" <<'PY'
import sys
tpl, out, feature, date, commit, build, device, camada, criterio = sys.argv[1:10]
s = open(tpl, encoding="utf-8").read()
for k, v in {"FEATURE": feature, "DATA": date, "COMMIT": commit, "BUILD": build,
             "DISPOSITIVO": device, "CAMADA": camada, "CRITERIO": criterio}.items():
    s = s.replace("{{%s}}" % k, v)
open(out, "w", encoding="utf-8").write(s)
PY
echo "$FILE"
