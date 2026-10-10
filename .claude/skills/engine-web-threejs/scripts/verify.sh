#!/usr/bin/env bash
# verify.sh — engine-web-threejs
# 1) instala dependências se faltarem, 2) 'npm run build' (vite build), 3) sobe 'npx vite preview'
# em porta fixa, 4) roda scripts/playtest.mjs (Playwright, WebKit, viewport de iPhone): screenshot,
# console, erros de página e window.__GAME_DEBUG__. Evidências em production/evidencias/<data>-<feature>/.
#
# Roda em Linux/macOS/Windows (WSL) com Node 20+. Não exige Xcode. Precisa de 'playwright' instalado
# no projeto (npm i -D playwright && npx playwright install webkit). Nada é apagado fora da pasta de saída.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIR="."
PORT="${PORT:-4173}"
DEVICE="${PLAYTEST_DEVICE:-iPhone 15}"
BROWSER="webkit"
FEATURE="verify"
OUT=""
NO_BUILD=0
WAIT_MS=4000
TAPS=""
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
  --taps "x,y;x,y"       Toques (em px CSS) a executar antes do screenshot, ex.: "195,600;195,400"
  --no-build             Pula 'npm run build' (usa dist/ existente)
  -h, --help

Saída: 0 = build ok, página carregou com canvas, sem pageerror, screenshot gravado.
       1 = build falhou  2 = playtest reprovou (erro de página/sem canvas)  3 = node/playwright ausente  4 = argumentos
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
    --no-build) NO_BUILD=1; shift ;;
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

S_BUILD="não executado"; S_PLAY="não executado"
SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then kill "$SERVER_PID" 2>/dev/null || true; fi
  cat > "$OUT/resumo.md" <<SUMMARY
# Evidência — $FEATURE ($DATE)

- Projeto web: $DIR
- Build (vite build): $S_BUILD
- Playtest ($BROWSER, $DEVICE): $S_PLAY
- Arquivos: build.log, preview.log, screenshot.png, console.log, state.json, playtest.json
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
  --browser "$BROWSER" --wait "$WAIT_MS" --taps "$TAPS" --timeout "$TIMEOUT_SECS"
RC=$?
set -e
if [[ $RC -eq 0 ]]; then S_PLAY="ok"; else S_PLAY="reprovado (rc=$RC)"; fi
echo "[$SCRIPT_NAME] evidência em $OUT (build=$S_BUILD playtest=$S_PLAY)"
[[ $RC -eq 0 ]] || exit 2
exit 0
