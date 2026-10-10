#!/usr/bin/env bash
# verify.sh — engine-web-phaser
# 1) instala dependências se faltarem, 2) 'npm run build' (tsc + vite build), 3) 'npm test' (Vitest:
# lógica pura e Phaser HEADLESS) se o package.json tiver script test, 4) sobe 'npx vite preview' em porta
# fixa, 5) roda scripts/playtest.mjs (Playwright, WebKit, viewport de iPhone): screenshot, console,
# erros de página e window.__GAME_DEBUG__. Evidências em production/evidencias/<data>-<feature>/.
#
# Roda em Linux/macOS/Windows (WSL) com Node 20+. Não exige Xcode. Precisa de 'playwright' instalado
# no projeto (npm i -D playwright && npx playwright install webkit). Nada é apagado fora da pasta de saída.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIR="."
PORT="${PORT:-4173}"
DEVICE="${PLAYTEST_DEVICE:-iPhone 15}"
BROWSER="${VERIFY_BROWSER:-webkit}"
FEATURE="verify"
OUT=""
NO_BUILD=0
NO_TESTS="${VERIFY_SKIP_TESTS:-0}"
WAIT_MS=4000
TAPS=""
TAPS_GAME=""
SEED=""
TIMEOUT_SECS=60

usage() {
  cat <<USAGE
Uso: $SCRIPT_NAME [opções]

  --dir <pasta>          Projeto web (package.json com scripts build; vite). Padrão: .
  --port <n>             Porta do 'vite preview' (padrão: \$PORT ou 4173)
  --device <nome>        Descritor de dispositivo do Playwright (padrão: "iPhone 15"; cai para "iPhone 13" se não existir)
  --browser <webkit|chromium>  Motor (padrão: webkit, o mais próximo do Safari)
  --feature <slug>       Slug da feature (padrão: verify)
  --out <dir>            Saída (padrão: production/evidencias/<data>-<feature>)
  --wait <ms>            Espera após carregar antes do screenshot (padrão: 4000)
  --taps "x,y;x,y"       Toques (em px CSS do viewport) antes do screenshot, ex.: "195,600;195,400"
  --taps-game "gx,gy;…"  Toques em coordenadas DO JOGO (ex.: "390,844" = centro de um canvas 780×1688), convertidas pelo canvas
  --seed <n>             Define window.__GAME_SEED__ antes de carregar (src/main.ts passa a seed ao Phaser.Math.RND)
  --no-build             Pula 'npm run build' (usa dist/ existente)
  --no-tests             Pula 'npm test' (também: VERIFY_SKIP_TESTS=1)
  -h, --help

Saída: 0 = build e testes ok, página carregou com canvas, sem pageerror, screenshot gravado.
       1 = build ou testes falharam  2 = playtest reprovou (erro de página/sem canvas)  3 = node/playwright ausente  4 = argumentos
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --browser) BROWSER="$2"; shift 2 ;;
    --feature) FEATURE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --wait) WAIT_MS="$2"; shift 2 ;;
    --taps) TAPS="$2"; shift 2 ;;
    --taps-game) TAPS_GAME="$2"; shift 2 ;;
    --seed) SEED="$2"; shift 2 ;;
    --no-build) NO_BUILD=1; shift ;;
    --no-tests) NO_TESTS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; usage >&2; exit 4 ;;
  esac
done

[[ -f "$DIR/package.json" ]] || { echo "package.json não encontrado em '$DIR'." >&2; exit 4; }
DIR="$(cd "$DIR" && pwd)"
command -v node >/dev/null && command -v npm >/dev/null || { echo "node/npm não encontrados (Node 20+)." >&2; exit 3; }

DATE="$(date +%Y-%m-%d)"
[[ -n "$OUT" ]] || OUT="production/evidencias/${DATE}-${FEATURE}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
echo "[$SCRIPT_NAME] projeto=$DIR porta=$PORT device=$DEVICE browser=$BROWSER saída=$OUT"

S_BUILD="não executado"; S_TEST="não executado"; S_PLAY="não executado"
SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then kill "$SERVER_PID" 2>/dev/null || true; fi
  cat > "$OUT/resumo.md" <<SUMMARY
# Evidência — $FEATURE ($DATE)

- Projeto web: $DIR
- Build (tsc + vite build): $S_BUILD
- Testes (npm test / Vitest): $S_TEST
- Playtest ($BROWSER, $DEVICE${SEED:+, seed=$SEED}): $S_PLAY
- Arquivos: build.log, tests.log, preview.log, screenshot.png, console.log, state.json, playtest.json
SUMMARY
}
trap cleanup EXIT

cd "$DIR"
if [[ ! -d node_modules ]]; then
  echo "[$SCRIPT_NAME] instalando dependências…"
  if [[ -f package-lock.json ]]; then npm ci > "$OUT/npm-install.log" 2>&1; else npm install > "$OUT/npm-install.log" 2>&1; fi
fi
node -e "require.resolve('playwright')" 2>/dev/null || { echo "playwright não instalado no projeto: npm i -D playwright && npx playwright install $BROWSER" >&2; exit 3; }

# 1) Build
if [[ $NO_BUILD -eq 1 ]]; then
  S_BUILD="pulado (--no-build)"
else
  echo "[$SCRIPT_NAME] npm run build…"
  if npm run build > "$OUT/build.log" 2>&1; then S_BUILD="ok"; else S_BUILD="falhou"; echo "[$SCRIPT_NAME] build falhou — veja $OUT/build.log" >&2; tail -n 30 "$OUT/build.log" >&2; exit 1; fi
fi
[[ -d dist ]] || { echo "dist/ não existe após o build." >&2; exit 1; }

# 1b) Testes (Vitest): lógica pura + Phaser HEADLESS. Só se package.json tiver script "test".
if [[ "$NO_TESTS" == "1" ]]; then
  S_TEST="pulado (--no-tests)"
elif node -e "const s=require('./package.json').scripts||{};process.exit(s.test?0:1)" 2>/dev/null; then
  echo "[$SCRIPT_NAME] npm test…"
  if npm test > "$OUT/tests.log" 2>&1; then
    S_TEST="ok ($(grep -oE 'Tests +[0-9]+ passed' "$OUT/tests.log" | tail -1 || echo 'ver tests.log'))"
  else
    S_TEST="falhou"; echo "[$SCRIPT_NAME] testes falharam — veja $OUT/tests.log" >&2; tail -n 40 "$OUT/tests.log" >&2; exit 1
  fi
else
  S_TEST="sem script test no package.json"
fi

# 2) Servidor de preview
echo "[$SCRIPT_NAME] vite preview na porta $PORT…"
npx vite preview --port "$PORT" --strictPort --host 127.0.0.1 > "$OUT/preview.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then exec 3>&- 2>/dev/null || true; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then echo "vite preview encerrou — veja $OUT/preview.log" >&2; exit 1; fi
  sleep 0.5
done

# 3) Playtest
set +e
node "$SKILL_DIR/scripts/playtest.mjs" --url "http://127.0.0.1:$PORT/" --out "$OUT" --device "$DEVICE" \
  --browser "$BROWSER" --wait "$WAIT_MS" --taps "$TAPS" --timeout "$TIMEOUT_SECS" ${TAPS_GAME:+--taps-game "$TAPS_GAME"} ${SEED:+--seed "$SEED"}
RC=$?
set -e
if [[ $RC -eq 0 ]]; then S_PLAY="ok"; else S_PLAY="reprovado (rc=$RC)"; fi
echo "[$SCRIPT_NAME] evidência em $OUT (build=$S_BUILD testes=$S_TEST playtest=$S_PLAY)"
[[ $RC -eq 0 ]] || exit 2
exit 0
