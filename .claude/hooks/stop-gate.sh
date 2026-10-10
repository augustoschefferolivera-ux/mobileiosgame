#!/bin/bash
# Stop: impede encerrar o turno com trabalho declarado e não evidenciado.
# Regras (de feature_list.json):
#   - status "done" sem pasta de evidência não vazia  -> bloqueia
#   - status "in_progress"                            -> bloqueia (termine com evidência,
#     ou mude para "blocked" com "motivo", ou volte para "todo")
# Saída: exit 2 + motivo no stderr => Claude continua trabalhando. exit 0 => pode parar.
# O Claude Code limita a 8 continuações seguidas, então não há loop infinito.
. "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ROOT="$(resolve_root)"; cd "$ROOT" 2>/dev/null || exit 0
[ -f feature_list.json ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

INPUT="$(cat 2>/dev/null)"
python3 -I - "$INPUT" <<'PY'
import json,sys,os,glob
raw=sys.argv[1] if len(sys.argv)>1 else ""
try:
    inp=json.loads(raw) if raw else {}
except Exception:
    inp={}
try:
    data=json.load(open("feature_list.json"))
except Exception as e:
    print(f"feature_list.json inválido ({e}). Corrija antes de encerrar.",file=sys.stderr); sys.exit(2)
feats=data.get("features",data if isinstance(data,list) else [])
problems=[]
def has_evidence(f):
    p=f.get("evidencia") or f.get("evidence")
    cands=[p] if p else []
    cands+=glob.glob(f"production/evidencias/*-{f.get('id')}") + glob.glob(f"production/evidencias/*{f.get('id')}*")
    for c in cands:
        if c and os.path.isdir(c) and any(os.scandir(c)): return True
        if c and os.path.isfile(c) and os.path.getsize(c)>0: return True
    return False
for f in feats:
    st=f.get("status")
    if st=="done" and not has_evidence(f):
        problems.append(f"{f.get('id')} está 'done' sem evidência em production/evidencias/. Rode scripts/verify.sh, grave screenshot/log, ou volte o status para in_progress.")
    elif st=="in_progress":
        problems.append(f"{f.get('id')} está 'in_progress'. Termine com evidência e marque done, ou marque 'blocked' com campo 'motivo', ou volte para 'todo'. Atualize progress.md.")
if problems:
    print("Stop hook (stop-gate): trabalho sem evidência.\n- "+"\n- ".join(problems),file=sys.stderr)
    sys.exit(2)
sys.exit(0)
PY
