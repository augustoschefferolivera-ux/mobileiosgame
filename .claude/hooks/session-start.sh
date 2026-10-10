#!/bin/bash
# SessionStart: injeta no contexto o estado do projeto (progress.md + próxima feature).
# Também roda após compactação e /clear, o que repõe a memória da sessão.
# Não lê stdin de forma bloqueante (o harness pode deixá-lo aberto).
. "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ROOT="$(resolve_root)"; cd "$ROOT" 2>/dev/null || exit 0

echo "=== Estado do projeto (hook SessionStart) ==="
if [ -f progress.md ]; then
  echo "--- progress.md (primeiras 60 linhas) ---"
  head -60 progress.md
else
  echo "progress.md ausente: projeto ainda não inicializado. Rode /iniciar-projeto."
fi

if [ -f feature_list.json ] && command -v python3 >/dev/null 2>&1; then
  python3 -I - <<'PY'
import json
try:
    data=json.load(open("feature_list.json"))
except Exception as e:
    print(f"feature_list.json inválido: {e}"); raise SystemExit
feats=data.get("features",data if isinstance(data,list) else [])
tot=len(feats); done=sum(1 for f in feats if f.get("status")=="done")
inprog=[f for f in feats if f.get("status")=="in_progress"]
blocked=[f for f in feats if f.get("status")=="blocked"]
nxt=next((f for f in feats if f.get("status") in ("todo","in_progress")),None)
print(f"--- feature_list.json: {done}/{tot} done, {len(inprog)} in_progress, {len(blocked)} blocked ---")
for f in inprog: print(f"  EM ANDAMENTO: {f.get('id')} — {f.get('titulo') or f.get('title')}")
for f in blocked: print(f"  BLOQUEADA: {f.get('id')} — {f.get('motivo','sem motivo registrado')}")
if nxt: print(f"  PRÓXIMA: {nxt.get('id')} — {nxt.get('titulo') or nxt.get('title')}")
PY
fi

echo "--- Lembretes ---"
echo "1. Uma feature por sessão. 2. 'Pronto' = rodou + evidência em production/evidencias/. 3. Atualize progress.md antes de encerrar."
exit 0
