#!/usr/bin/env bash
# scan_placeholders.sh — varre o projeto por texto de preenchimento, resíduos de
# assistente de IA, nomes de modelos, prompts esquecidos e segredos antes de
# submeter à App Store (Guideline 2.1(a); caso The Alters).
#
# Saída legível agrupada por padrão. Código de saída: 0 = nada encontrado,
# 1 = ocorrências encontradas, 2 = erro de uso.
#
# Uso:
#   scan_placeholders.sh [--root DIR] [--patterns ARQUIVO] [--exclude-dir NOME]...
#                        [--exclude-file GLOB]... [--max-per-pattern N] [--quiet]
#
# Backend: usa ripgrep (rg) se existir, senão grep -E (GNU ou BSD/macOS).

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="."
PATTERNS_FILE="$SCRIPT_DIR/placeholder-patterns.txt"
MAX_PER_PATTERN=40
QUIET=0

# Diretórios nunca vasculhados (build, dependências, caches, este banco de skills).
EXCLUDE_DIRS=(.git node_modules Library Temp Logs obj Build build DerivedData Pods
  .godot .import .build .venv venv __pycache__ .claude production research_notes reports playbook)
# Arquivos que legitimamente citam modelos e ferramentas.
EXCLUDE_FILES=(PROVENANCE.md LICENCAS.md THIRD_PARTY_NOTICES.md "*.lock" "*.min.js" "*.map" "placeholder-patterns.txt")

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  cat <<EOF

Opções:
  -r, --root DIR             raiz do projeto (padrão: .)
  -p, --patterns ARQUIVO     lista de regex ERE, uma por linha (padrão: placeholder-patterns.txt ao lado do script)
  -x, --exclude-dir NOME     diretório extra a ignorar (repetível)
  -X, --exclude-file GLOB    arquivo/glob extra a ignorar (repetível)
  -m, --max-per-pattern N    máximo de linhas exibidas por padrão (padrão: $MAX_PER_PATTERN)
  -q, --quiet                só o resumo
  -h, --help                 esta ajuda

Diretórios ignorados por padrão: ${EXCLUDE_DIRS[*]}
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -r|--root) ROOT="${2:-}"; shift 2 ;;
    -p|--patterns) PATTERNS_FILE="${2:-}"; shift 2 ;;
    -x|--exclude-dir) EXCLUDE_DIRS+=("${2:-}"); shift 2 ;;
    -X|--exclude-file) EXCLUDE_FILES+=("${2:-}"); shift 2 ;;
    -m|--max-per-pattern) MAX_PER_PATTERN="${2:-}"; shift 2 ;;
    -q|--quiet) QUIET=1; shift ;;
    *) echo "erro: argumento desconhecido: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -d "$ROOT" ]] || { echo "erro: raiz não encontrada: $ROOT" >&2; exit 2; }
[[ -r "$PATTERNS_FILE" ]] || { echo "erro: arquivo de padrões não encontrado: $PATTERNS_FILE" >&2; exit 2; }

# Lê padrões (ignora vazios e comentários).
PATTERNS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  PATTERNS+=("$line")
done < "$PATTERNS_FILE"
[[ ${#PATTERNS[@]} -gt 0 ]] || { echo "erro: nenhum padrão em $PATTERNS_FILE" >&2; exit 2; }

if command -v rg >/dev/null 2>&1; then BACKEND="rg"; else BACKEND="grep"; fi

buscar() { # $1 = padrão
  local pat="$1"
  if [[ "$BACKEND" == "rg" ]]; then
    local args=(--no-heading --with-filename --line-number --ignore-case --color never --no-ignore --hidden)
    local d f
    for d in "${EXCLUDE_DIRS[@]}"; do args+=(--glob "!**/$d/**" --glob "!$d/**"); done
    for f in "${EXCLUDE_FILES[@]}"; do args+=(--glob "!$f"); done
    rg "${args[@]}" -e "$pat" "$ROOT" 2>/dev/null
  else
    local args=(-rIinE)
    local d f
    for d in "${EXCLUDE_DIRS[@]}"; do args+=("--exclude-dir=$d"); done
    for f in "${EXCLUDE_FILES[@]}"; do args+=("--exclude=$f"); done
    grep "${args[@]}" -e "$pat" "$ROOT" 2>/dev/null
  fi
  return 0
}

TOTAL=0
PADROES_COM_HIT=0
ARQUIVOS_TMP="$(mktemp)"
trap 'rm -f "$ARQUIVOS_TMP"' EXIT

echo "scan_placeholders — raiz: $ROOT — backend: $BACKEND — padrões: ${#PATTERNS[@]} — $(date '+%Y-%m-%d %H:%M')"
echo

for pat in "${PATTERNS[@]}"; do
  hits="$(buscar "$pat")"
  [[ -z "$hits" ]] && continue
  n="$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
  TOTAL=$((TOTAL + n))
  PADROES_COM_HIT=$((PADROES_COM_HIT + 1))
  printf '%s\n' "$hits" | cut -d: -f1 >> "$ARQUIVOS_TMP"
  if [[ $QUIET -eq 0 ]]; then
    echo "## padrão: $pat  ($n ocorrência(s))"
    printf '%s\n' "$hits" | head -n "$MAX_PER_PATTERN" | sed 's/^/   /'
    if [[ "$n" -gt "$MAX_PER_PATTERN" ]]; then echo "   ... (+$((n - MAX_PER_PATTERN)) linhas omitidas; use --max-per-pattern)"; fi
    echo
  fi
done

ARQUIVOS="$(sort -u "$ARQUIVOS_TMP" | wc -l | tr -d ' ')"
echo "----"
echo "Resumo: $TOTAL ocorrências em $ARQUIVOS arquivo(s), $PADROES_COM_HIT de ${#PATTERNS[@]} padrões."
if [[ $TOTAL -gt 0 ]]; then
  echo "Resultado: FALHOU — corrija ou justifique cada ocorrência no checklist de submissão (Guideline 2.1(a))."
  exit 1
fi
echo "Resultado: OK — 0 ocorrências."
exit 0
