#!/usr/bin/env bash
# init.sh — prepara o ambiente deste projeto de jogo para uma sessão do agente.
#
# Padrão do agente inicializador da Anthropic ("Effective harnesses for long-running agents", 2025-11):
# o inicializador escreve init.sh + progress.md + feature_list.json e faz o primeiro commit; cada sessão
# seguinte roda init.sh antes de tocar em código. Gerado por /iniciar-projeto; edite à vontade.
#
# Regras deste script:
#   * Idempotente: pode rodar quantas vezes quiser.
#   * Nunca apaga, move ou sobrescreve arquivos do projeto. Só cria pastas vazias (mkdir -p).
#   * Não instala nada sem --install. Por padrão só VERIFICA e explica o que falta.
#   * Termina com um smoke test do loop de verificação (scripts/verify.sh --dry-run).
set -u

PROJETO="[nome do jogo]"            # <- preencha
ENGINE_FILE="production/engine.txt" # escrito por /escolher-engine-e-alvo; uma linha, ex.: godot
INSTALL=0
CHECK_ONLY=0

usage() {
  cat <<'EOF'
Uso: bash init.sh [--check] [--install] [--help]

  --check    só verifica ferramentas e estrutura; não roda o smoke test
  --install  permite os passos de instalação de dependências DO PROJETO (npm ci, godot --import, ...)
             Ferramentas de sistema (Xcode, Godot, Unity, uv, Node) NÃO são instaladas aqui:
             use /instalar-ferramentas, que explica licença, requisito e custo de cada uma.
  --help     esta mensagem

Exit: 0 tudo pronto · 1 faltam ferramentas/arquivos (lista impressa) · 2 smoke test do verify falhou
EOF
}

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --install) INSTALL=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "argumento desconhecido: $arg" >&2; usage; exit 1 ;;
  esac
done

cd "$(dirname "$0")" || exit 1
echo "== init.sh — $PROJETO =="

# ---------------------------------------------------------------------------
# 1. Engine e alvo (decididos no ADR; sem eles não há loop de verificação)
# ---------------------------------------------------------------------------
if [ -f "$ENGINE_FILE" ]; then
  ENGINE="$(head -1 "$ENGINE_FILE" | tr -d '[:space:]')"
  echo "engine: $ENGINE  (de $ENGINE_FILE)"
else
  ENGINE=""
  echo "[!] $ENGINE_FILE ausente — rode /escolher-engine-e-alvo (gera o ADR e este arquivo)."
fi

# ---------------------------------------------------------------------------
# 2. Ferramentas de sistema: só verificação (command -v). Instalação é da skill /instalar-ferramentas.
# ---------------------------------------------------------------------------
VERIFICADOR=".claude/skills/instalar-ferramentas/scripts/verificar-ambiente.sh"
FALTAS=0
if [ -f "$VERIFICADOR" ]; then
  if [ -n "$ENGINE" ]; then
    bash "$VERIFICADOR" --engine "$ENGINE" --strict || FALTAS=1
  else
    bash "$VERIFICADOR" --strict || FALTAS=1
  fi
else
  echo "[!] $VERIFICADOR não encontrado; verificação mínima:"
  for t in git python3 node; do
    if command -v "$t" >/dev/null 2>&1; then echo "  OK    $t"; else echo "  FALTA $t"; FALTAS=1; fi
  done
fi

# ---------------------------------------------------------------------------
# 3. Estrutura do harness (só cria o que não existe; nunca sobrescreve)
# ---------------------------------------------------------------------------
for d in production/evidencias production/criticas production/session-state production/session-logs docs/decisoes scripts; do
  [ -d "$d" ] || { mkdir -p "$d" && echo "criado: $d/"; }
done
for f in feature_list.json progress.md design/game-brief.md scripts/verify.sh; do
  if [ -f "$f" ]; then echo "  OK    $f"; else echo "  FALTA $f  (templates/ e /iniciar-projeto criam)"; FALTAS=1; fi
done

# ---------------------------------------------------------------------------
# 4. Dependências DO PROJETO (só com --install). Descomente o bloco da sua engine.
#    Todos os comandos abaixo são aditivos; nenhum apaga arquivos.
# ---------------------------------------------------------------------------
if [ "$INSTALL" -eq 1 ]; then
  case "$ENGINE" in
    phaser|pixijs|threejs|babylonjs|capacitor)
      [ -f package-lock.json ] && npm ci || npm install
      ;;
    godot)
      # Importa recursos sem abrir o editor (necessário antes do primeiro run headless).
      command -v godot >/dev/null 2>&1 && godot --headless --path . --import
      ;;
    unity)
      # A Unity CLI (instalada com o Unity Hub) resolve pacotes ao abrir o projeto; o plug-in oficial
      # da Unity (/unity:...) cuida disso. Nada a fazer aqui.
      ;;
    spritekit|realitykit|swift)
      # Resolve pacotes Swift do projeto Xcode (ajuste o nome do .xcodeproj/.xcworkspace).
      # xcodebuild -resolvePackageDependencies -project "$PROJETO.xcodeproj"
      ;;
    *) echo "engine '$ENGINE' sem passo de instalação definido" ;;
  esac
fi

# ---------------------------------------------------------------------------
# 5. Smoke test do loop de verificação
# ---------------------------------------------------------------------------
if [ "$FALTAS" -ne 0 ]; then
  echo "== init.sh: faltam itens (acima). Resolva antes da primeira feature. =="
  exit 1
fi
if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "== init.sh --check: estrutura e ferramentas OK =="
  exit 0
fi
if bash scripts/verify.sh --dry-run; then
  echo "== init.sh: pronto. Leia progress.md e feature_list.json; depois /ciclo-de-feature. =="
  exit 0
else
  echo "== init.sh: scripts/verify.sh --dry-run falhou — rode /montar-loop-de-verificacao ==" >&2
  exit 2
fi
