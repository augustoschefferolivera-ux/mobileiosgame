#!/usr/bin/env bash
# Verificação de "Pronto" de uma feature (doc 19; feature_list.json "pronto").
#
#   scripts/verify.sh --feature F-001 [--seed N] [--taps-game]
#
# --taps-game é o projeto da Playwright (o único hoje, e o padrão); --seed vai
# para o Vitest e para a Playwright (inteiro de 0 a 4294967295; padrão 1).
#
# Roda, nesta ordem, e para no primeiro erro:
#   1. typecheck (tsc) e lint (ESLint: fronteiras, textos, glossário);
#   2. Vitest (grava o log de determinismo e o hash de referência);
#   3. build de produção (dist/) e build de debug (dist-debug/);
#   4. Playwright no projeto taps-game, com a mesma seed;
#   5. confere as evidências da feature listadas em feature_list.json: geradas
#      nesta execução, PNG com as dimensões do nome, logs com iguais=true.
# O crítico independente (nota ≥ 7) e o commit ficam fora do script.
set -euo pipefail

FEATURE=""
SEED=1
PROJETO="taps-game"
valor() { [[ $# -ge 2 && "$2" != --* ]] || { echo "verify: $1 precisa de um valor" >&2; exit 2; }; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --feature) valor "$@"; FEATURE="$2"; shift 2 ;;
    --seed) valor "$@"; SEED="$2"; shift 2 ;;
    --taps-game) PROJETO="taps-game"; shift ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
    *) echo "verify: argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done
[[ "$FEATURE" =~ ^F-[0-9]{3}$ ]] || { echo "verify: use --feature F-xxx" >&2; exit 2; }
[[ "$SEED" =~ ^[0-9]{1,10}$ ]] && (( 10#$SEED <= 4294967295 )) || {
  echo "verify: --seed precisa ser um inteiro de 0 a 4294967295" >&2
  exit 2
}
SEED=$((10#$SEED))

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

etapa "typecheck (projeto inteiro e src/logica sem DOM nem Node)"
npx tsc --noEmit
npx tsc -p tsconfig.logica.json

etapa "lint"
npx eslint . | tee .verify/lint.txt

etapa "Vitest"
npx vitest run

etapa "build de produção (dist/)"
npx vite build --logLevel warn

etapa "build de debug (dist-debug/)"
npx vite build --mode debug --outDir dist-debug --logLevel warn

etapa "Playwright --project=$PROJETO (seed $SEED)"
npx playwright test --project="$PROJETO"

etapa "evidências de $FEATURE"
node -e '
  const fs = require("node:fs");
  const [id, inicio] = [process.argv[1], Number(process.argv[2])];
  const f = require("./feature_list.json").features.find((x) => x.id === id);
  let ok = true;
  const conteudo = (arquivo) => {
    const dims = arquivo.match(/-(\d+)x(\d+)\.png$/);
    if (dims) {
      const png = fs.readFileSync(arquivo);
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      return w === Number(dims[1]) && h === Number(dims[2]) ? "" : `PNG de ${w}×${h}`;
    }
    if (arquivo.endsWith(".log")) {
      const t = fs.readFileSync(arquivo, "utf-8");
      if (/iguais=false/.test(t)) return "há iguais=false";
      if (!/iguais=true/.test(t)) return "sem nenhum iguais=true";
    }
    return "";
  };
  for (const ev of f.evidencias) {
    const existe = fs.existsSync(ev.arquivo);
    const st = existe ? fs.statSync(ev.arquivo) : null;
    const nova = st !== null && st.size > 0 && st.mtimeMs / 1000 >= inicio - 1;
    const erro = nova ? conteudo(ev.arquivo) : "ausente, vazia ou antiga";
    console.log(`${erro ? "FALTA" : "ok  "} ${ev.arquivo} — ${ev.descricao}${erro ? ` (${erro})` : ""}`);
    ok = ok && !erro;
  }
  if (!ok) { console.error("verify: evidência com problema (veja acima)"); process.exit(1); }
' "$FEATURE" "$INICIO"

printf '\nverify: %s verde (seed %s)\n' "$FEATURE" "$SEED"
