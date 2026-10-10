#!/usr/bin/env bash
# verificar-ambiente.sh — verifica a PRESENÇA das ferramentas do projeto e imprime o que falta.
# Só usa `command -v` e testes de existência de pasta. Não instala, não altera, não baixa nada.
# Compatível com bash 3.2 (macOS) — sem arrays associativos.
set -u

ENGINE=""
ALVO=""
STRICT=0
QUIET=0

usage() {
  cat <<'EOF'
Uso: verificar-ambiente.sh [--engine <nome>] [--alvo <app|web|ambos>] [--strict] [--quiet] [--help]

  --engine  spritekit | realitykit | unity | godot | phaser | pixijs | threejs | babylonjs | capacitor
            (se omitido, lê production/engine.txt; se não existir, verifica só a base)
  --alvo    app (iOS) | web | ambos   (padrão: app para engines nativas/Unity/Godot, web para engines web)
  --strict  exit 1 se faltar algo marcado como obrigatório para a engine/alvo escolhidos
  --quiet   imprime só as faltas e o resumo

Grupos verificados: base · claude · apple (se alvo app) · engine · mcp/cli de assets (opcionais).
Para instalar o que falta, use a skill /instalar-ferramentas (comando, smoke test, licença, custo).
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --engine) ENGINE="${2:-}"; shift 2 ;;
    --alvo) ALVO="${2:-}"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    --quiet) QUIET=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "argumento desconhecido: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -z "$ENGINE" ] && [ -f production/engine.txt ]; then
  ENGINE="$(head -1 production/engine.txt | tr -d '[:space:]')"
fi
if [ -z "$ALVO" ]; then
  case "$ENGINE" in
    phaser|pixijs|threejs|babylonjs) ALVO="web" ;;
    capacitor) ALVO="ambos" ;;
    *) ALVO="app" ;;
  esac
fi

OBRIG_FALTANDO=0
OPC_FALTANDO=0
TOTAL_OK=0
SO="$(uname -s 2>/dev/null || echo desconhecido)"

# check <rotulo> <comando> <obrigatorio|opcional> [dica]
check() {
  rotulo="$1"; cmd="$2"; nivel="$3"; dica="${4:-}"
  if command -v "$cmd" >/dev/null 2>&1; then
    TOTAL_OK=$((TOTAL_OK + 1))
    [ "$QUIET" -eq 1 ] || printf '  OK     %-22s %s\n' "$rotulo" "$(command -v "$cmd")"
  else
    if [ "$nivel" = "obrigatorio" ]; then OBRIG_FALTANDO=$((OBRIG_FALTANDO + 1)); tag="FALTA "; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); tag="falta?"; fi
    printf '  %s %-22s (%s) %s\n' "$tag" "$rotulo" "$nivel" "$dica"
  fi
}

# check_dir <rotulo> <pasta> <nivel> [dica]  — para apps macOS que não entram no PATH
check_dir() {
  rotulo="$1"; pasta="$2"; nivel="$3"; dica="${4:-}"
  if [ -d "$pasta" ]; then
    TOTAL_OK=$((TOTAL_OK + 1))
    [ "$QUIET" -eq 1 ] || printf '  OK     %-22s %s\n' "$rotulo" "$pasta"
  else
    if [ "$nivel" = "obrigatorio" ]; then OBRIG_FALTANDO=$((OBRIG_FALTANDO + 1)); tag="FALTA "; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); tag="falta?"; fi
    printf '  %s %-22s (%s) %s\n' "$tag" "$rotulo" "$nivel" "$dica"
  fi
}

# check_py <rotulo> <modulo> <nivel> — biblioteca Python sem binário próprio
check_py() {
  rotulo="$1"; mod="$2"; nivel="$3"
  if command -v python3 >/dev/null 2>&1 && python3 -I -c "import $mod" >/dev/null 2>&1; then
    TOTAL_OK=$((TOTAL_OK + 1))
    [ "$QUIET" -eq 1 ] || printf '  OK     %-22s módulo python %s\n' "$rotulo" "$mod"
  else
    if [ "$nivel" = "obrigatorio" ]; then OBRIG_FALTANDO=$((OBRIG_FALTANDO + 1)); tag="FALTA "; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); tag="falta?"; fi
    printf '  %s %-22s (%s) pip/uv: %s\n' "$tag" "$rotulo" "$nivel" "$mod"
  fi
}

echo "== verificar-ambiente — SO: $SO · engine: ${ENGINE:-nenhuma} · alvo: $ALVO =="

echo "-- base"
check "git" git obrigatorio
check "python3" python3 obrigatorio
check "node" node obrigatorio "Node 18+ (MobileBuildMCP) / 22+ (instalar Claude Code via npm)"
check "npm" npm obrigatorio
check "npx" npx obrigatorio
check "uv" uv obrigatorio "instalador oficial: curl -LsSf https://astral.sh/uv/install.sh | sh"
check "uvx" uvx obrigatorio "vem com uv; não use pip install uv"
check "jq" jq opcional "usado por hooks e pelo despachante verify.sh"

echo "-- claude"
check "claude (Claude Code)" claude obrigatorio

if [ "$ALVO" = "app" ] || [ "$ALVO" = "ambos" ]; then
  echo "-- apple (alvo app)"
  if [ "$SO" = "Darwin" ]; then
    check "xcodebuild" xcodebuild obrigatorio "instale o Xcode (26.3+ para MCP; 27 para o agente controlar o simulador)"
    check "xcrun" xcrun obrigatorio
    if command -v xcrun >/dev/null 2>&1; then
      if xcrun --find simctl >/dev/null 2>&1; then TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     xcrun simctl"; else OBRIG_FALTANDO=$((OBRIG_FALTANDO + 1)); echo "  FALTA  xcrun simctl           (obrigatorio) selecione o Xcode: sudo xcode-select -s /Applications/Xcode.app"; fi
      if xcrun --find mcpbridge >/dev/null 2>&1; then TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     xcrun mcpbridge (Xcode MCP)"; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); echo "  falta? xcrun mcpbridge        (opcional) exige Xcode 26.3+"; fi
      if xcrun --find devicectl >/dev/null 2>&1; then TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     xcrun devicectl"; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); echo "  falta? xcrun devicectl        (opcional) dispositivos físicos"; fi
    fi
    check "mobilebuildmcp (CLI)" mobilebuildmcp opcional "ou sem instalar: npx -y mobilebuildmcp@latest mcp"
    check "idb_companion" idb_companion opcional "exigido pelo ios-simulator-mcp"
    check "maestro" maestro opcional "testes de UI de menus (árvore de acessibilidade)"
  else
    echo "  info   macOS ausente           build, assinatura e simulador iOS serão remotos: Xcode Cloud ou runner macOS (/build-ios-sem-mac)"
    check "ssh" ssh obrigatorio "openssh: usado pelo build remoto e pela estação GPU"
    check "fastlane" fastlane opcional "metadados/TestFlight via App Store Connect API; o upload do .ipa roda no runner macOS"
  fi
fi

if [ "$SO" = "Linux" ]; then
  echo "-- linux (estação de desenvolvimento)"
  check "ssh" ssh obrigatorio "pacman -S openssh"
  check "scp" scp opcional "cópia de arquivos para/da estação GPU (gpu.sh push/pull)"
  check "rsync" rsync opcional "só se a estação GPU tiver rsync (WSL2)"
  check "tailscale" tailscale opcional "rede privada até a estação GPU e o Mac remoto"
  check "xvfb-run" xvfb-run opcional "screenshot do Godot sem tela: pacman -S xorg-server-xvfb"
  if [ -n "${GPU_SSH_HOST:-}" ] || [ -f "$HOME/.config/mobileiosgame/gpu.env" ]; then
    if command -v ssh >/dev/null 2>&1 && bash "$(dirname "$0")/../../estacao-gpu-remota/scripts/gpu.sh" status >/dev/null 2>&1; then
      TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     estação GPU remota (gpu.sh status)"
    else
      OPC_FALTANDO=$((OPC_FALTANDO + 1)); echo "  falta? estação GPU remota      (opcional) gpu.sh status falhou: ver /estacao-gpu-remota"
    fi
  else
    echo "  info   estação GPU remota      não configurada (opcional): /estacao-gpu-remota"
  fi
fi

echo "-- engine: ${ENGINE:-nenhuma}"
case "$ENGINE" in
  spritekit|realitykit|swift)
    check "swift" swift obrigatorio
    ;;
  godot)
    if command -v godot >/dev/null 2>&1; then check "godot" godot obrigatorio; else check_dir "Godot.app" "/Applications/Godot.app" obrigatorio "ou crie um link: ln -s /Applications/Godot.app/Contents/MacOS/Godot /usr/local/bin/godot"; fi
    ;;
  unity)
    if [ "$SO" = "Darwin" ]; then
      check_dir "Unity Hub" "/Applications/Unity Hub.app" obrigatorio "a Unity CLI vem com o Hub; ver docs.unity.com/en-us/unity-cli"
    else
      if command -v unityhub >/dev/null 2>&1 || [ -d "$HOME/Unity/Hub" ]; then TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     Unity Hub (Linux)"; else OBRIG_FALTANDO=$((OBRIG_FALTANDO + 1)); echo "  FALTA  Unity Hub (Linux)       (obrigatorio) AUR: unityhub; o build iOS final roda no runner macOS"; fi
    fi
    check "unity (CLI)" unity opcional "nome do binário: confirme em docs.unity.com/en-us/unity-cli"
    ;;
  phaser|pixijs|threejs|babylonjs|capacitor)
    check "node" node obrigatorio
    if [ -f package.json ] && [ -d node_modules ]; then TOTAL_OK=$((TOTAL_OK + 1)); [ "$QUIET" -eq 1 ] || echo "  OK     node_modules/"; else OPC_FALTANDO=$((OPC_FALTANDO + 1)); echo "  falta? node_modules/           (opcional) rode npm ci"; fi
    ;;
  "") echo "  (sem engine definida: rode /escolher-engine-e-alvo; ele grava production/engine.txt)" ;;
  *) echo "  (engine '$ENGINE' desconhecida deste verificador)" ;;
esac

echo "-- assets e pós-processamento (opcionais; instale só o que o projeto usar)"
check "blender" blender opcional "3D: limpeza/LOD via MCP for Blender"
check_dir "Blender.app" "/Applications/Blender.app" opcional
check "aseprite" aseprite opcional "pixel art"
check "ffmpeg" ffmpeg opcional "vídeo→frames, conversão de áudio"
check "gltfpack" gltfpack opcional "npm i -g gltfpack (meshoptimizer, MIT)"
check "gltf-transform" gltf-transform opcional "npm i -g @gltf-transform/cli (MIT)"
check "pymusiclooper" pymusiclooper opcional "uv tool install pymusiclooper (MIT)"
check_py "pyloudnorm" pyloudnorm opcional
check "rembg" rembg opcional "recorte de fundo (BiRefNet é MIT)"
check "c2patool" c2patool opcional "proveniência C2PA (contentauth/c2pa-rs)"

echo "== resumo: $TOTAL_OK ok · $OBRIG_FALTANDO obrigatórias faltando · $OPC_FALTANDO opcionais faltando =="
if [ "$STRICT" -eq 1 ] && [ "$OBRIG_FALTANDO" -gt 0 ]; then
  echo "   -> rode /instalar-ferramentas para cada item FALTA" >&2
  exit 1
fi
exit 0
