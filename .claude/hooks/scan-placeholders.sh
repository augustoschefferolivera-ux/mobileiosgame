#!/bin/bash
# PostToolUse (Write|Edit): avisa se o arquivo escrito contém placeholders ou texto de IA.
# exit 2 mostra o aviso ao Claude (a escrita já aconteceu; cabe a ele corrigir).
. "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ROOT="$(resolve_root)"; cd "$ROOT" 2>/dev/null || exit 0
INPUT="$(cat 2>/dev/null)"
FILE="$(json_field "$INPUT" 'tool_input.file_path')"
[ -n "$FILE" ] && [ -f "$FILE" ] || exit 0
is_scannable_path "$FILE" || exit 0
# só arquivos de texto (evita binários de imagem/áudio)
if command -v file >/dev/null 2>&1; then
  file -b --mime "$FILE" | grep -qi 'text\|json\|xml\|empty' || exit 0
fi
HITS="$(LC_ALL=C grep -n -i -E "$PLACEHOLDER_PATTERNS" "$FILE" 2>/dev/null | head -5)"
if [ -n "$HITS" ]; then
  echo "scan-placeholders: possível placeholder/texto de IA em $FILE (App Store 2.1(a) — caso The Alters). Revise:" >&2
  echo "$HITS" >&2
  exit 2
fi
exit 0
