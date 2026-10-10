#!/bin/bash
# gpu.sh — wrapper SSH para a estação GPU remota (Windows + NVIDIA via Tailscale).
# Configuração: ~/.config/mobileiosgame/gpu.env (ver assets/gpu.env.exemplo) ou variáveis de ambiente
#   GPU_SSH_HOST (alias ssh), GPU_MODE (windows|wsl), GPU_WORKDIR, GPU_COMFY_PORT, GPU_RSYNC.
# Uso:
#   gpu.sh status                      nvidia-smi, disco, python/uv na estação
#   gpu.sh run "<comando>"             executa na estação (modo wsl: dentro do Ubuntu do WSL2)
#   gpu.sh push <local> <remoto>       copia arquivo/pasta para a estação (scp -r, ou rsync se GPU_RSYNC=1)
#   gpu.sh pull <remoto> <local>       traz arquivo/pasta da estação
#   gpu.sh tunnel [porta]              túnel local: http://localhost:<porta> -> estação (padrão GPU_COMFY_PORT)
#   gpu.sh shell                       sessão interativa
#   gpu.sh --help
# Códigos: 0 ok; 1 uso/configuração; 2 falha remota (ssh/scp). Nunca apaga nada no destino.
set -euo pipefail

CONF="${GPU_ENV_FILE:-$HOME/.config/mobileiosgame/gpu.env}"
# shellcheck disable=SC1090
[ -f "$CONF" ] && . "$CONF"
GPU_SSH_HOST="${GPU_SSH_HOST:-gpu}"
GPU_MODE="${GPU_MODE:-windows}"
GPU_WORKDIR="${GPU_WORKDIR:-}"
GPU_COMFY_PORT="${GPU_COMFY_PORT:-8188}"
GPU_RSYNC="${GPU_RSYNC:-0}"

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; }

need() { command -v "$1" >/dev/null 2>&1 || { echo "gpu.sh: falta '$1' no Linux (pacman -S openssh rsync)" >&2; exit 1; }; }

remote() {
  # Executa um comando na estação; em modo wsl, dentro do Ubuntu do WSL2.
  local cmd="$1"
  need ssh
  if [ "$GPU_MODE" = "wsl" ]; then
    ssh -o BatchMode=yes "$GPU_SSH_HOST" "wsl -e bash -lc $(printf '%q' "$cmd")"
  else
    ssh -o BatchMode=yes "$GPU_SSH_HOST" "$cmd"
  fi
}

case "${1:-}" in
  -h|--help|"") usage; [ -n "${1:-}" ] && exit 0 || exit 1 ;;
  status)
    echo "== estação: $GPU_SSH_HOST (modo $GPU_MODE) =="
    remote "nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version,temperature.gpu --format=csv" || { echo "gpu.sh: nvidia-smi falhou (driver? ssh?)" >&2; exit 2; }
    if [ "$GPU_MODE" = "wsl" ]; then
      remote "df -h / | tail -1; python3 --version 2>/dev/null || true; uv --version 2>/dev/null || echo 'uv ausente'"
    else
      remote "powershell -NoProfile -Command \"Get-PSDrive C | Select-Object Used,Free | Format-Table -HideTableHeaders; python --version; uv --version\"" || true
    fi
    if [ -n "$GPU_WORKDIR" ]; then echo "workdir: $GPU_WORKDIR"; fi
    ;;
  run)
    [ -n "${2:-}" ] || { echo "gpu.sh run: informe o comando entre aspas" >&2; exit 1; }
    remote "$2" || exit 2
    ;;
  push)
    [ -n "${3:-}" ] || { echo "gpu.sh push <local> <remoto>" >&2; exit 1; }
    [ -e "$2" ] || { echo "gpu.sh push: '$2' não existe" >&2; exit 1; }
    if [ "$GPU_RSYNC" = "1" ]; then need rsync; rsync -az --info=progress2 "$2" "$GPU_SSH_HOST:$3" || exit 2
    else need scp; scp -r "$2" "$GPU_SSH_HOST:$3" || exit 2; fi
    ;;
  pull)
    [ -n "${3:-}" ] || { echo "gpu.sh pull <remoto> <local>" >&2; exit 1; }
    mkdir -p "$(dirname "$3")"
    if [ "$GPU_RSYNC" = "1" ]; then need rsync; rsync -az --info=progress2 "$GPU_SSH_HOST:$2" "$3" || exit 2
    else need scp; scp -r "$GPU_SSH_HOST:$2" "$3" || exit 2; fi
    echo "gpu.sh: salvo em $3"
    ;;
  tunnel)
    need ssh
    PORT="${2:-$GPU_COMFY_PORT}"
    echo "gpu.sh: http://localhost:$PORT -> $GPU_SSH_HOST:$PORT (Ctrl+C encerra)"
    ssh -N -L "$PORT:127.0.0.1:$PORT" "$GPU_SSH_HOST" || exit 2
    ;;
  shell)
    need ssh; exec ssh "$GPU_SSH_HOST"
    ;;
  *) echo "gpu.sh: subcomando desconhecido '$1'" >&2; usage; exit 1 ;;
esac
