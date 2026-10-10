#!/usr/bin/env bash
# find_loops.sh — wrapper do PyMusicLooper (MIT) para achar pontos de loop e separar intro/loop/outro.
#
# Dependência: pymusiclooper >= 3.x (pip install pymusiclooper). Para MP3/M4A/AAC o PyMusicLooper
# usa ffmpeg no PATH. Documentação: https://github.com/arkrow/PyMusicLooper
#
# Uso:
#   find_loops.sh [opções] ARQUIVO [ARQUIVO...]
#
# Opções:
#   -o, --out DIR          Pasta de saída (padrão: ./loops). Cria DIR/<nome>/ com intro/loop/outro .wav
#                          e DIR/<nome>/loop_points.txt (posições em samples e segundos).
#   --min-loop SEG         Duração mínima do loop em segundos (passa --min-loop-duration).
#   --max-loop SEG         Duração máxima do loop em segundos (passa --max-loop-duration).
#   --approx INI FIM       Posição aproximada desejada de início e fim, em segundos (±2 s de busca).
#   --brute-force          Procura em todo o áudio, não só nos beats detectados (lento).
#   --points-only          Só exporta os pontos; não divide o áudio.
#   --format wav|flac|ogg|mp3   Formato dos arquivos divididos (padrão: wav).
#   --dry-run              Mostra os comandos sem executar.
#   -h, --help             Esta ajuda.
#
# Saída: para cada arquivo, imprime "ARQUIVO: loop_start=<samples> loop_end=<samples>" e grava
# loop_points.txt. Registre os valores em samples no PROVENANCE.md e no engine (AVAudioPlayerNode /
# AudioStreamOggVorbis.loop_offset / Howler sprite), não confie em marcadores dentro do container.
set -euo pipefail

OUT="./loops"; MIN=""; MAX=""; APPROX=(); BRUTE=""; POINTS_ONLY=0; FORMAT="wav"; DRY=0
FILES=()

usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -o|--out) OUT="$2"; shift 2 ;;
    --min-loop) MIN="$2"; shift 2 ;;
    --max-loop) MAX="$2"; shift 2 ;;
    --approx) APPROX=("$2" "$3"); shift 3 ;;
    --brute-force) BRUTE="--brute-force"; shift ;;
    --points-only) POINTS_ONLY=1; shift ;;
    --format) FORMAT="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -*) echo "Opção desconhecida: $1" >&2; usage; exit 2 ;;
    *) FILES+=("$1"); shift ;;
  esac
done

if [[ ${#FILES[@]} -eq 0 ]]; then echo "Erro: informe ao menos um arquivo de áudio." >&2; usage; exit 2; fi
if ! command -v pymusiclooper >/dev/null 2>&1; then
  echo "Erro: 'pymusiclooper' não encontrado no PATH. Instale com: pip install pymusiclooper" >&2
  echo "(ou ative o venv do projeto). Docs: https://github.com/arkrow/PyMusicLooper" >&2
  exit 127
fi

ADV=()
[[ -n "$MIN" ]] && ADV+=(--min-loop-duration "$MIN")
[[ -n "$MAX" ]] && ADV+=(--max-loop-duration "$MAX")
[[ ${#APPROX[@]} -eq 2 ]] && ADV+=(--approx-loop-position "${APPROX[0]}" "${APPROX[1]}")
[[ -n "$BRUTE" ]] && ADV+=("$BRUTE")

run() { if [[ $DRY -eq 1 ]]; then printf '%q ' "$@"; echo; else "$@"; fi; }

status=0
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then echo "Aviso: arquivo não existe: $f" >&2; status=1; continue; fi
  name="$(basename "${f%.*}")"
  dest="$OUT/$name"
  mkdir -p "$dest"

  echo "== $f"
  # 1) pontos de loop em samples (STDOUT) e em segundos, gravados em loop_points.txt
  if [[ $DRY -eq 1 ]]; then
    run pymusiclooper export-points --path "$f" --export-to stdout --fmt samples "${ADV[@]}"
    run pymusiclooper export-points --path "$f" --export-to stdout --fmt seconds "${ADV[@]}"
  else
    samples_out="$(pymusiclooper export-points --path "$f" --export-to stdout --fmt samples "${ADV[@]}" 2>&1 | tail -n 5)" || { echo "$samples_out" >&2; echo "Falha ao achar loop em $f (áudio sem beats detectáveis? tente --brute-force ou --approx)." >&2; status=1; continue; }
    seconds_out="$(pymusiclooper export-points --path "$f" --export-to stdout --fmt seconds "${ADV[@]}" 2>&1 | tail -n 5)" || true
    {
      echo "arquivo: $f"
      echo "gerado_em: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "ferramenta: $(pymusiclooper --version 2>/dev/null | tr -d '\n')"
      echo "pontos_em_samples:"; echo "$samples_out"
      echo "pontos_em_segundos:"; echo "$seconds_out"
    } > "$dest/loop_points.txt"
    echo "$samples_out" | sed "s|^|$name: |"
  fi

  # 2) intro / loop / outro
  if [[ $POINTS_ONLY -eq 0 ]]; then
    run pymusiclooper split-audio --path "$f" --output-dir "$dest" --format "$FORMAT" "${ADV[@]}" || { echo "Falha ao dividir $f" >&2; status=1; }
  fi
done

[[ $DRY -eq 0 ]] && echo "Saída em: $OUT"
exit $status
