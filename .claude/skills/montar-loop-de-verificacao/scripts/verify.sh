#!/usr/bin/env bash
# verify.sh — despachante do loop de verificação (construir → rodar → screenshot → ler log).
#
# Detecta a engine do projeto e chama o verificador específico em
#   .claude/skills/engine-<engine>/scripts/verify.sh
# Se ele não existir, falha explicando o que falta. Este arquivo NÃO sabe construir jogo nenhum:
# o conhecimento de cada engine fica na skill engine-<x> (outro grupo do banco de skills).
#
# Copiado para scripts/verify.sh do projeto por /montar-loop-de-verificacao.
#
# CONTRATO DE SAÍDA (usado pelo Stop hook em .claude/settings.json e por /ciclo-de-feature):
#   exit 0  -> verificado: o jogo construiu, rodou, screenshot e log foram gravados em $VERIFY_OUT
#   exit 2  -> verificação FALHOU: motivo em stderr (uma linha primeiro); o hook faz o agente continuar
#   exit 1  -> erro de CONFIGURAÇÃO (engine não detectada, verificador ausente, --help): não é falha do jogo;
#              o hook deve avisar e permitir parar, para não travar o agente em um loop sem saída
#
# Variáveis repassadas ao verificador da engine (contrato que engine-<x>/scripts/verify.sh deve honrar):
#   VERIFY_OUT      pasta onde gravar screenshot(s), run.log e verify.log  (padrão: production/evidencias/_ultima)
#   VERIFY_FEATURE  id da feature em verificação (ex.: F-003) ou vazio
#   VERIFY_MODE     full | quick   (quick = sem build limpo, para iteração rápida)
#   VERIFY_DRYRUN   1 = só confirmar que o verificador existe e imprimir o que faria; nada é executado
set -u

OUT_DEFAULT="production/evidencias/_ultima"
VERIFY_OUT="${VERIFY_OUT:-$OUT_DEFAULT}"
VERIFY_FEATURE="${VERIFY_FEATURE:-}"
VERIFY_MODE="${VERIFY_MODE:-full}"
VERIFY_DRYRUN=0
ENGINE_OVERRIDE=""
LIST=0

usage() {
  cat <<'EOF'
Uso: bash scripts/verify.sh [--feature F-xxx] [--out <pasta>] [--quick] [--engine <nome>] [--dry-run] [--list] [--help]

  --feature  id da feature (vai para o nome da pasta de evidência e para o verificador)
  --out      pasta de saída (padrão production/evidencias/_ultima; /ciclo-de-feature passa a pasta datada)
  --quick    modo rápido (sem build limpo) — para iteração; o fechamento da feature usa o modo full
  --engine   força a engine (senão: production/engine.txt, depois detecção por arquivos do projeto)
  --dry-run  só mostra engine detectada e verificador que seria chamado; não executa nada
  --list     lista os verificadores de engine instalados em .claude/skills/engine-*/scripts/verify.sh

Exit 0 = verificado · 2 = falhou (motivo em stderr) · 1 = erro de configuração
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --feature) VERIFY_FEATURE="${2:-}"; shift 2 ;;
    --out) VERIFY_OUT="${2:-}"; shift 2 ;;
    --quick) VERIFY_MODE="quick"; shift ;;
    --engine) ENGINE_OVERRIDE="${2:-}"; shift 2 ;;
    --dry-run) VERIFY_DRYRUN=1; shift ;;
    --list) LIST=1; shift ;;
    --help|-h) usage; exit 1 ;;
    *) echo "verify.sh: argumento desconhecido: $1" >&2; usage; exit 1 ;;
  esac
done

# Trabalhe a partir da raiz do projeto (onde está .claude/), não de onde o hook foi chamado.
ROOT="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT/.claude" ]; then
  ROOT="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)"
fi
[ -d "$ROOT/.claude" ] || ROOT="$PWD"
cd "$ROOT" || { echo "verify.sh: não consegui entrar em $ROOT" >&2; exit 1; }

if [ "$LIST" -eq 1 ]; then
  echo "verificadores de engine instalados:"
  found=0
  for f in .claude/skills/engine-*/scripts/verify.sh; do
    [ -f "$f" ] && { echo "  $f"; found=1; }
  done
  [ "$found" -eq 1 ] || echo "  (nenhum — as skills engine-<x> ainda não trazem scripts/verify.sh)"
  exit 0
fi

detect_engine() {
  if [ -n "$ENGINE_OVERRIDE" ]; then echo "$ENGINE_OVERRIDE"; return; fi
  if [ -f production/engine.txt ]; then head -1 production/engine.txt | tr -d '[:space:]'; return; fi
  [ -f project.godot ] && { echo godot; return; }
  [ -f ProjectSettings/ProjectVersion.txt ] && { echo unity; return; }
  if [ -f package.json ]; then
    grep -q '"@capacitor/core"' package.json 2>/dev/null && { echo capacitor; return; }
    grep -q '"phaser"' package.json 2>/dev/null && { echo phaser; return; }
    grep -q '"pixi.js"' package.json 2>/dev/null && { echo pixijs; return; }
    grep -q '"@babylonjs/core"' package.json 2>/dev/null && { echo babylonjs; return; }
    grep -q '"three"' package.json 2>/dev/null && { echo threejs; return; }
  fi
  if ls -d ./*.xcodeproj ./*.xcworkspace >/dev/null 2>&1 || [ -f Package.swift ]; then
    # Projeto Xcode: SpriteKit ou RealityKit? Só production/engine.txt sabe.
    echo xcode; return
  fi
  echo ""
}

ENGINE="$(detect_engine)"
if [ -z "$ENGINE" ]; then
  echo "verify.sh: engine não detectada. Rode /escolher-engine-e-alvo (grava production/engine.txt) ou passe --engine." >&2
  exit 1
fi

# Candidatos de verificador, na ordem. O nome em production/engine.txt é o contrato preferido.
# Nomes reais das skills de engine deste banco (grupo "engines"): engine-spritekit-swiftui,
# engine-realitykit-metal, engine-unity-mobile, engine-godot-mobile, engine-web-phaser, engine-web-threejs.
case "$ENGINE" in
  spritekit|spritekit-swiftui|swiftui-spritekit) CANDIDATOS="engine-spritekit-swiftui" ;;
  realitykit|realitykit-metal|metal)            CANDIDATOS="engine-realitykit-metal" ;;
  xcode|swift)                                   CANDIDATOS="engine-spritekit-swiftui engine-realitykit-metal" ;;
  unity|unity-mobile)                            CANDIDATOS="engine-unity-mobile" ;;
  godot|godot-mobile)                            CANDIDATOS="engine-godot-mobile" ;;
  phaser|pixijs|web-phaser)                      CANDIDATOS="engine-web-phaser" ;;
  threejs|babylonjs|web-threejs)                 CANDIDATOS="engine-web-threejs" ;;
  capacitor|pwa|web)                             CANDIDATOS="engine-web-phaser engine-web-threejs" ;;
  *)                                             CANDIDATOS="engine-$ENGINE" ;;
esac

VERIFICADOR=""
for c in $CANDIDATOS; do
  if [ -f ".claude/skills/$c/scripts/verify.sh" ]; then
    if [ -n "$VERIFICADOR" ]; then
      echo "verify.sh: mais de um verificador possível para '$ENGINE' ($VERIFICADOR e .claude/skills/$c/scripts/verify.sh). Grave o nome exato em production/engine.txt (ex.: spritekit, realitykit, phaser, threejs)." >&2
      exit 1
    fi
    VERIFICADOR=".claude/skills/$c/scripts/verify.sh"
  fi
done

if [ -z "$VERIFICADOR" ]; then
  cat >&2 <<EOF
verify.sh: nenhum verificador para a engine '$ENGINE'.
  Procurei: $(for c in $CANDIDATOS; do printf '.claude/skills/%s/scripts/verify.sh ' "$c"; done)
  O que fazer:
    1. Confirme que a skill engine-$ENGINE está instalada neste banco de skills (ls .claude/skills/).
    2. Se a skill existe mas não traz scripts/verify.sh, escreva-o seguindo o contrato em
       .claude/skills/montar-loop-de-verificacao/references/comandos-por-engine.md
       (ler VERIFY_OUT/VERIFY_FEATURE/VERIFY_MODE; construir, rodar, screenshot, log; exit 0/2).
    3. Enquanto não existir, nenhuma feature visível pode ser marcada done — um parse check não é uma execução.
EOF
  exit 1
fi

export VERIFY_OUT VERIFY_FEATURE VERIFY_MODE VERIFY_DRYRUN
if [ "$VERIFY_DRYRUN" -eq 1 ]; then
  echo "verify.sh --dry-run: engine=$ENGINE verificador=$VERIFICADOR out=$VERIFY_OUT feature=${VERIFY_FEATURE:-} modo=$VERIFY_MODE"
  echo "--- uso do verificador da engine ($VERIFICADOR --help):"
  bash "$VERIFICADOR" --help 2>&1 | sed 's/^/    /' || true
  exit 0
fi

mkdir -p "$VERIFY_OUT"
INICIO="$(date '+%Y-%m-%d %H:%M:%S')"
echo "verify.sh: engine=$ENGINE verificador=$VERIFICADOR out=$VERIFY_OUT feature=${VERIFY_FEATURE:-} modo=$VERIFY_MODE início=$INICIO"

# O verificador da engine recebe os mesmos argumentos; sua saída vai para o terminal E para verify.log.
bash "$VERIFICADOR" ${VERIFY_FEATURE:+--feature "$VERIFY_FEATURE"} --out "$VERIFY_OUT" 2>&1 | tee "$VERIFY_OUT/verify.log"
RC=${PIPESTATUS[0]}

{
  echo "engine: $ENGINE"
  echo "verificador: $VERIFICADOR"
  echo "feature: ${VERIFY_FEATURE:-}"
  echo "modo: $VERIFY_MODE"
  echo "inicio: $INICIO"
  echo "fim: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "commit: $(git rev-parse --short HEAD 2>/dev/null || echo sem-git)"
  echo "exit: $RC"
} > "$VERIFY_OUT/verify.meta"

# Códigos dos verificadores de engine deste banco: 0 ok · 1 build/teste falhou · 2 app não rodou ou
# screenshot falhou · 3 ambiente sem a engine/SO · 4 argumentos inválidos. Aqui 1 e 2 viram "falhou"
# (exit 2: o agente deve continuar corrigindo); 3 e 4 viram "configuração" (exit 1: avisar e permitir parar).
case "$RC" in
  0)
    if ls "$VERIFY_OUT"/*.png >/dev/null 2>&1; then
      echo "verify.sh: OK — screenshot(s) em $VERIFY_OUT"; exit 0
    else
      echo "verify.sh: o verificador devolveu 0 mas não há PNG em $VERIFY_OUT — sem screenshot não há evidência visual." >&2
      exit 2
    fi ;;
  1) echo "verify.sh: FALHOU — build ou testes (veja $VERIFY_OUT/verify.log)" >&2; exit 2 ;;
  2) echo "verify.sh: FALHOU — o jogo não ficou rodando ou o screenshot falhou (veja $VERIFY_OUT/verify.log)" >&2; exit 2 ;;
  3) echo "verify.sh: ambiente sem a engine/SO exigidos (código 3 do verificador) — rode /instalar-ferramentas" >&2; exit 1 ;;
  4) echo "verify.sh: argumentos inválidos para o verificador (código 4) — veja $VERIFICADOR --help" >&2; exit 1 ;;
  *) echo "verify.sh: o verificador terminou com código inesperado $RC (tratado como erro de configuração)" >&2; exit 1 ;;
esac
