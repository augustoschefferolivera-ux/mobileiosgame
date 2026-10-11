#!/usr/bin/env bash
# Verificação de "Pronto" de uma feature (doc 19; feature_list.json "pronto").
#
#   scripts/verify.sh --feature F-001 [--seed N]
#
# Roda, nesta ordem, e para no primeiro erro:
#   1. typecheck (tsc) e lint (ESLint: fronteiras, textos, glossário);
#   2. Vitest (grava o log de determinismo e o hash de referência);
#   3. build de produção (dist/) e build de debug (dist-debug/);
#   4. Playwright no projeto taps-game, com a mesma seed;
#   5. confere as evidências da feature listadas em feature_list.json.
# O crítico independente (nota ≥ 7) e o commit ficam fora do script.
set -euo pipefail

FEATURE=""
SEED=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --feature) FEATURE="${2:-}"; shift 2 ;;
    --seed) SEED="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "verify: argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done
[[ "$FEATURE" =~ ^F-[0-9]{3}$ ]] || { echo "verify: use --feature F-xxx" >&2; exit 2; }
[[ "$SEED" =~ ^[0-9]+$ ]] || { echo "verify: --seed precisa ser um inteiro ≥ 0" >&2; exit 2; }

cd "$(dirname "$0")/.."
node -e '
  const f = require("./feature_list.json").features.find((x) => x.id === process.argv[1]);
  if (!f) { console.error(`verify: ${process.argv[1]} não está em feature_list.json`); process.exit(2); }
  console.log(`verify: ${f.id} — ${f.nome} (${f.criterios.length} critérios), seed ${process.argv[2]}`);
' "$FEATURE" "$SEED"

export VDC_SEED="$SEED"
export VDC_EVIDENCIAS=1
INICIO=$(date +%s)
mkdir -p .verify

etapa() { printf '\n== %s\n' "$1"; }

etapa "typecheck"
npx tsc --noEmit

etapa "lint"
npx eslint . | tee .verify/lint.txt

etapa "Vitest"
npx vitest run

etapa "build de produção (dist/)"
npx vite build --logLevel warn

etapa "build de debug (dist-debug/)"
npx vite build --mode debug --outDir dist-debug --logLevel warn

etapa "Playwright --project=taps-game (seed $SEED)"
npx playwright test --project=taps-game

etapa "evidências de $FEATURE"
node -e '
  const fs = require("node:fs");
  const [id, inicio] = [process.argv[1], Number(process.argv[2])];
  const f = require("./feature_list.json").features.find((x) => x.id === id);
  let ok = true;
  for (const ev of f.evidencias) {
    const existe = fs.existsSync(ev.arquivo);
    const st = existe ? fs.statSync(ev.arquivo) : null;
    const nova = st !== null && st.size > 0 && st.mtimeMs / 1000 >= inicio - 1;
    console.log(`${nova ? "ok  " : "FALTA"} ${ev.arquivo} — ${ev.descricao}`);
    ok = ok && nova;
  }
  if (!ok) { console.error("verify: evidência ausente, vazia ou não gerada nesta execução"); process.exit(1); }
' "$FEATURE" "$INICIO"

printf '\nverify: %s verde (seed %s)\n' "$FEATURE" "$SEED"
