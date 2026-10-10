#!/bin/bash
# PreToolUse (Bash): valida comandos git antes de rodar.
#   - git push com --force/-f          -> bloqueia
#   - git commit: arquivos staged com placeholders -> bloqueia
#   - git commit: feature_list.json staged com 'done' sem evidência -> bloqueia
. "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ROOT="$(resolve_root)"; cd "$ROOT" 2>/dev/null || exit 0
INPUT="$(cat 2>/dev/null)"
case "$INPUT" in *git*) ;; *) exit 0 ;; esac
CMD="$(json_field "$INPUT" 'tool_input.command')"
[ -n "$CMD" ] || exit 0

if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$)|\+[A-Za-z])'; then
  echo "validate-commit: push forçado bloqueado. Faça merge/commit normal; nunca reescreva histórico compartilhado." >&2
  exit 2
fi

printf '%s' "$CMD" | grep -qE 'git[[:space:]]+commit' || exit 0
command -v git >/dev/null 2>&1 || exit 0

STAGED="$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)"
[ -n "$STAGED" ] || exit 0

BAD=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  is_scannable_path "$f" || continue
  if command -v file >/dev/null 2>&1; then
    file -b --mime "$f" | grep -qi 'text\|json\|xml' || continue
  fi
  if LC_ALL=C grep -q -i -E "$PLACEHOLDER_PATTERNS" "$f" 2>/dev/null; then BAD="$BAD\n  $f"; fi
done <<< "$STAGED"
if [ -n "$BAD" ]; then
  printf 'validate-commit: placeholders/texto de IA em arquivos staged (2.1(a)):%b\nRemova antes de commitar (veja .claude/hooks/_common.sh para os padrões).\n' "$BAD" >&2
  exit 2
fi

if printf '%s\n' "$STAGED" | grep -qx 'feature_list.json' && command -v python3 >/dev/null 2>&1; then
  python3 -I - <<'PY' || exit 2
import json,os,glob,sys
try: data=json.load(open("feature_list.json"))
except Exception as e: print(f"validate-commit: feature_list.json inválido: {e}",file=sys.stderr); sys.exit(1)
feats=data.get("features",data if isinstance(data,list) else [])
bad=[]
for f in feats:
    if f.get("status")!="done": continue
    p=f.get("evidencia") or f.get("evidence")
    cands=([p] if p else [])+glob.glob(f"production/evidencias/*{f.get('id')}*")
    ok=any((os.path.isdir(c) and any(os.scandir(c))) or (os.path.isfile(c) and os.path.getsize(c)>0) for c in cands if c)
    if not ok: bad.append(str(f.get("id")))
if bad:
    print("validate-commit: features 'done' sem evidência: "+", ".join(bad)+". Grave evidência em production/evidencias/ ou volte o status.",file=sys.stderr); sys.exit(1)
PY
fi
exit 0
