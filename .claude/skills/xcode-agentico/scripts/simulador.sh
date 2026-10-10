#!/usr/bin/env bash
# simulador.sh — atalhos documentados do xcrun simctl para o loop do agente (sem MCP).
# EXIGE macOS + Xcode. Nunca apaga simuladores nem dados; só boota, instala, lança, captura e copia.
set -euo pipefail

usage() {
  cat <<'USAGE'
Uso: simulador.sh <comando> [args]

  boot <nome|udid>                    Boota o simulador (ex.: "iPhone 17") e espera ficar pronto
  udid [nome]                         Imprime o UDID do simulador bootado (ou do nome dado)
  install <caminho.app>               Instala o .app no simulador bootado
  launch <bundle-id> [ENV=VAL ...]    Lança o app (variáveis vão como SIMCTL_CHILD_<ENV>); ex.: GAME_DEBUG=1
  terminate <bundle-id>               Encerra o app
  screenshot <saida.png>              Captura a tela
  record <saida.mov> <segundos>       Grava vídeo por N segundos
  log <process-name> [minutos]        Mostra o log do processo (padrão: últimos 2 minutos)
  pull-debug <bundle-id> <dir-saida>  Copia Documents/debug_state.json do container do app
  openurl <url>                       Abre uma URL no Safari do simulador (jogos web)
  -h, --help

Todos os comandos usam o simulador bootado (xcrun simctl … booted), salvo 'boot' e 'udid <nome>'.
USAGE
}

[[ $# -ge 1 ]] || { usage; exit 4; }
CMD="$1"; shift || true
[[ "$CMD" == "-h" || "$CMD" == "--help" ]] && { usage; exit 0; }
[[ "$(uname -s)" == "Darwin" ]] || { echo "Exige macOS com Xcode (xcrun simctl)." >&2; exit 3; }

udid_by_name() {
  xcrun simctl list devices available -j | python3 -I -c '
import json, sys
name = sys.argv[1]
for runtime, devs in json.load(sys.stdin).get("devices", {}).items():
    if "iOS" in runtime:
        for d in devs:
            if d.get("name") == name or d.get("udid") == name:
                print(d["udid"]); sys.exit(0)
sys.exit(1)' "$1"
}

case "$CMD" in
  boot)
    [[ $# -ge 1 ]] || { echo "boot <nome|udid>" >&2; exit 4; }
    UDID="$(udid_by_name "$1")" || { echo "Simulador '$1' não encontrado." >&2; xcrun simctl list devices available | grep -E "iPhone|iPad" >&2; exit 4; }
    xcrun simctl boot "$UDID" 2>/dev/null || true
    xcrun simctl bootstatus "$UDID" -b >/dev/null
    echo "$UDID" ;;
  udid)
    if [[ $# -ge 1 ]]; then udid_by_name "$1"; else
      xcrun simctl list devices booted -j | python3 -I -c 'import json,sys
d=json.load(sys.stdin)["devices"]; u=[x["udid"] for v in d.values() for x in v]
print(u[0]) if u else sys.exit(1)'; fi ;;
  install) [[ $# -ge 1 ]] || { echo "install <app>" >&2; exit 4; }; xcrun simctl install booted "$1" ;;
  launch)
    [[ $# -ge 1 ]] || { echo "launch <bundle-id> [ENV=VAL...]" >&2; exit 4; }
    BUNDLE="$1"; shift
    ENVS=(); for kv in "$@"; do ENVS+=("SIMCTL_CHILD_$kv"); done
    xcrun simctl terminate booted "$BUNDLE" 2>/dev/null || true
    if [[ ${#ENVS[@]} -gt 0 ]]; then env "${ENVS[@]}" xcrun simctl launch booted "$BUNDLE"; else xcrun simctl launch booted "$BUNDLE"; fi ;;
  terminate) [[ $# -ge 1 ]] || exit 4; xcrun simctl terminate booted "$1" ;;
  screenshot) [[ $# -ge 1 ]] || exit 4; mkdir -p "$(dirname "$1")"; xcrun simctl io booted screenshot "$1"; echo "$1" ;;
  record)
    [[ $# -ge 2 ]] || { echo "record <saida.mov> <segundos>" >&2; exit 4; }
    mkdir -p "$(dirname "$1")"
    xcrun simctl io booted recordVideo --codec h264 "$1" & PID=$!
    sleep "$2"; kill -INT "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; echo "$1" ;;
  log)
    [[ $# -ge 1 ]] || exit 4
    xcrun simctl spawn booted log show --last "${2:-2}m" --style compact --predicate "process == \"$1\"" ;;
  pull-debug)
    [[ $# -ge 2 ]] || { echo "pull-debug <bundle-id> <dir>" >&2; exit 4; }
    CONTAINER="$(xcrun simctl get_app_container booted "$1" data)"
    mkdir -p "$2"
    if [[ -f "$CONTAINER/Documents/debug_state.json" ]]; then cp "$CONTAINER/Documents/debug_state.json" "$2/"; cat "$2/debug_state.json"; else echo "Sem debug_state.json em $CONTAINER/Documents" >&2; exit 2; fi ;;
  openurl) [[ $# -ge 1 ]] || exit 4; xcrun simctl openurl booted "$1" ;;
  *) echo "Comando desconhecido: $CMD" >&2; usage >&2; exit 4 ;;
esac
