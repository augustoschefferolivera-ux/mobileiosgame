#!/usr/bin/env bash
# optimize_glb.sh — GLB bruto → LODs → texturas redimensionadas → (KTX2) → (compressão) para mobile.
# Ferramentas: glTF-Transform (MIT, @gltf-transform/cli) e gltfpack (MIT, zeux/meshoptimizer).
# Nada é baixado por este script; ele só verifica se as ferramentas existem e diz como instalar.
set -euo pipefail

usage() {
  cat <<'EOF'
Uso: optimize_glb.sh -i entrada.glb -o pasta-saida [opções]

Gera uma cadeia de LODs e otimiza um GLB para iPhone/web com glTF-Transform ou gltfpack.

Obrigatórios
  -i, --input ARQ        GLB/glTF de entrada
  -o, --outdir DIR       pasta de saída (criada se não existir)

Opções
  -n, --name NOME        prefixo dos arquivos (padrão: nome do arquivo de entrada)
      --lods R1,R2,...   razões de simplificação (padrão: 0.5,0.25,0.1). LOD0 = entrada após weld
      --error E          erro máximo do simplify, relativo ao raio da malha (padrão: 0.001)
      --tex N            lado máximo das texturas em px (padrão: 2048; 0 = não redimensionar)
      --target T         unity | godot | web | realitykit (padrão: unity)
                         realitykit → KTX2 e compressão desligados (USDZ espera PNG/JPEG) e
                         quantização desligada no gltfpack (-noq), por precaução
      --ktx2 MODO        none | uastc | etc1s (padrão: uastc, exceto realitykit = none)
                         engine=gltf-transform exige `toktx` (KTX-Software) no PATH;
                         engine=gltfpack usa -tc (ETC1S por padrão; -tu à mão para UASTC)
      --compress MODO    none | meshopt (padrão: meshopt só para --target web; outros = none,
                         porque o engine precisa do decodificador EXT_meshopt_compression)
      --engine E         gltf-transform (padrão) | gltfpack
      --dry-run          só imprime os comandos, sem executar nem exigir ferramentas
  -h, --help             esta ajuda

Saídas em DIR: <nome>-lod0.glb … <nome>-lodN.glb, <nome>-inspect-antes.txt,
<nome>-inspect-depois.txt e <nome>-relatorio.md (tris/texturas por LOD, via inspecionar_glb.py).

Códigos de saída: 0 ok · 1 falha em um passo · 2 ferramenta ausente ou argumento inválido

Instalação (confira as páginas oficiais; versões mudam):
  npm install -g @gltf-transform/cli        # https://github.com/donmccurdy/glTF-Transform
  npm install -g gltfpack                   # https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
                                            # (build node.js SEM BasisU: para -tc use o binário nativo das releases)
  toktx: KTX-Software                       # https://github.com/KhronosGroup/KTX-Software
Flags usadas aqui foram conferidas no README do gltfpack e na documentação do glTF-Transform
citadas na skill; se a sua versão divergir, rode `gltf-transform <cmd> --help` / `gltfpack -h`.
EOF
}

INPUT=""; OUTDIR=""; NAME=""; LODS="0.5,0.25,0.1"; ERR="0.001"; TEX="2048"
TARGET="unity"; KTX2=""; COMPRESS=""; ENGINE="gltf-transform"; DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input) INPUT="$2"; shift 2;;
    -o|--outdir) OUTDIR="$2"; shift 2;;
    -n|--name) NAME="$2"; shift 2;;
    --lods) LODS="$2"; shift 2;;
    --error) ERR="$2"; shift 2;;
    --tex) TEX="$2"; shift 2;;
    --target) TARGET="$2"; shift 2;;
    --ktx2) KTX2="$2"; shift 2;;
    --compress) COMPRESS="$2"; shift 2;;
    --engine) ENGINE="$2"; shift 2;;
    --dry-run) DRY=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "argumento desconhecido: $1" >&2; usage >&2; exit 2;;
  esac
done

[[ -z "$INPUT" || -z "$OUTDIR" ]] && { echo "faltam -i e/ou -o" >&2; usage >&2; exit 2; }
[[ $DRY -eq 0 && ! -f "$INPUT" ]] && { echo "entrada não existe: $INPUT" >&2; exit 2; }
case "$TARGET" in unity|godot|web|realitykit) ;; *) echo "--target inválido: $TARGET" >&2; exit 2;; esac
case "$ENGINE" in gltf-transform|gltfpack) ;; *) echo "--engine inválido: $ENGINE" >&2; exit 2;; esac

# padrões dependentes do alvo
if [[ -z "$KTX2" ]]; then KTX2="uastc"; [[ "$TARGET" == "realitykit" ]] && KTX2="none"; fi
if [[ -z "$COMPRESS" ]]; then COMPRESS="none"; [[ "$TARGET" == "web" ]] && COMPRESS="meshopt"; fi
if [[ "$TARGET" == "realitykit" && ( "$KTX2" != "none" || "$COMPRESS" != "none" ) ]]; then
  echo "aviso: --target realitykit força --ktx2 none e --compress none (USDZ espera PNG/JPEG)" >&2
  KTX2="none"; COMPRESS="none"
fi
case "$KTX2" in none|uastc|etc1s) ;; *) echo "--ktx2 inválido: $KTX2" >&2; exit 2;; esac
case "$COMPRESS" in none|meshopt) ;; *) echo "--compress inválido: $COMPRESS" >&2; exit 2;; esac

[[ -z "$NAME" ]] && { NAME="$(basename "$INPUT")"; NAME="${NAME%.*}"; }
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSPECT_PY="$SKILL_DIR/../gerar-ativos-3d/scripts/inspecionar_glb.py"

run() {  # imprime e executa (ou só imprime em dry-run)
  printf '+'; printf ' %q' "$@"; printf '\n'
  [[ $DRY -eq 1 ]] || "$@"
}

precisa() {  # verifica ferramenta no PATH
  local t="$1" dica="$2"
  if ! command -v "$t" >/dev/null 2>&1; then
    if [[ $DRY -eq 1 ]]; then echo "aviso (dry-run): '$t' não encontrado — $dica" >&2; return 0; fi
    echo "ferramenta ausente: '$t'. Instale com: $dica" >&2; exit 2
  fi
}

if [[ "$ENGINE" == "gltf-transform" ]]; then
  precisa gltf-transform "npm install -g @gltf-transform/cli"
  [[ "$KTX2" != "none" ]] && precisa toktx "KTX-Software (https://github.com/KhronosGroup/KTX-Software)"
else
  precisa gltfpack "npm install -g gltfpack (ou binário nativo de https://github.com/zeux/meshoptimizer/releases)"
  if [[ "$KTX2" != "none" && $DRY -eq 0 ]] && gltfpack 2>&1 | grep -qi "node"; then
    echo "aviso: o gltfpack do npm (build node.js) não tem BasisU: -tc falha. Use o binário nativo" \
         "das releases do meshoptimizer ou --engine gltf-transform (toktx) para KTX2." >&2
  fi
fi

WORK="$OUTDIR/.work"
[[ $DRY -eq 1 ]] || mkdir -p "$OUTDIR" "$WORK"
echo "== entrada: $INPUT | saída: $OUTDIR | nome: $NAME | alvo: $TARGET | engine: $ENGINE"
echo "== lods: $LODS | error: $ERR | tex: $TEX | ktx2: $KTX2 | compress: $COMPRESS"

# 1. medir antes
if command -v gltf-transform >/dev/null 2>&1; then
  [[ $DRY -eq 1 ]] && echo "+ gltf-transform inspect $INPUT > $OUTDIR/$NAME-inspect-antes.txt" || \
    gltf-transform inspect "$INPUT" > "$OUTDIR/$NAME-inspect-antes.txt" 2>&1 || true
fi

# 2. base: weld (+ resize)
BASE="$WORK/$NAME-base.glb"
if [[ "$ENGINE" == "gltf-transform" ]]; then
  run gltf-transform weld "$INPUT" "$BASE"
  if [[ "$TEX" != "0" ]]; then
    run gltf-transform resize "$BASE" "$BASE" --width "$TEX" --height "$TEX"
  fi
else
  # gltfpack limita texturas com -tl N na própria chamada; a base é a entrada
  BASE="$INPUT"
fi

# 3. LODs
IFS=',' read -r -a RATIOS <<< "$LODS"
LOD_FILES=()
gerar_lod() {  # $1 = índice, $2 = razão (vazio = LOD0)
  local idx="$1" ratio="$2"
  local out="$OUTDIR/$NAME-lod$idx.glb" tmp="$WORK/$NAME-lod$idx.glb"
  if [[ "$ENGINE" == "gltf-transform" ]]; then
    if [[ -z "$ratio" ]]; then
      [[ $DRY -eq 1 ]] && echo "+ cp $BASE $tmp" || cp "$BASE" "$tmp"
    else
      run gltf-transform simplify "$BASE" "$tmp" --ratio "$ratio" --error "$ERR"
    fi
    case "$KTX2" in
      uastc) run gltf-transform uastc "$tmp" "$tmp";;
      etc1s) run gltf-transform etc1s "$tmp" "$tmp";;
    esac
    if [[ "$COMPRESS" == "meshopt" ]]; then
      run gltf-transform meshopt "$tmp" "$out"
    else
      [[ $DRY -eq 1 ]] && echo "+ cp $tmp $out" || cp "$tmp" "$out"
    fi
  else
    local args=(-i "$BASE" -o "$out" -kn -km)
    [[ "$TEX" != "0" ]] && args+=(-tl "$TEX")
    [[ -n "$ratio" ]] && args+=(-si "$ratio")
    [[ "$KTX2" != "none" ]] && args+=(-tc)
    [[ "$COMPRESS" == "meshopt" ]] && args+=(-cc)
    [[ "$TARGET" == "realitykit" ]] && args+=(-noq)
    run gltfpack "${args[@]}"
  fi
  LOD_FILES+=("$out")
}
gerar_lod 0 ""
i=1
for r in "${RATIOS[@]}"; do gerar_lod "$i" "$r"; i=$((i+1)); done

# 4. medir depois e relatório
[[ $DRY -eq 1 ]] && { echo "== dry-run concluído"; exit 0; }
if command -v gltf-transform >/dev/null 2>&1; then
  gltf-transform inspect "${LOD_FILES[0]}" > "$OUTDIR/$NAME-inspect-depois.txt" 2>&1 || true
fi
REL="$OUTDIR/$NAME-relatorio.md"
{
  echo "# Otimização — $NAME"
  echo
  echo "- Data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Entrada: \`$INPUT\` ($(stat -c %s "$INPUT" 2>/dev/null || stat -f %z "$INPUT") bytes)"
  echo "- Alvo: $TARGET · engine: $ENGINE · lods: $LODS · error: $ERR · tex: $TEX · ktx2: $KTX2 · compress: $COMPRESS"
  echo "- Versões: gltf-transform $(gltf-transform --version 2>/dev/null || echo 'ausente') · gltfpack $(gltfpack 2>&1 | head -1 || echo 'ausente')"
  echo
  echo "| Arquivo | Bytes | Tris na cena | Maior textura | Extensões |"
  echo "|---|---|---|---|---|"
  for f in "${LOD_FILES[@]}"; do
    linha=""
    if [[ -f "$INSPECT_PY" ]]; then
      linha="$(python3 -I "$INSPECT_PY" "$f" --tsv 2>/dev/null || true)"
    fi
    if [[ -n "$linha" ]]; then
      IFS=$'\t' read -r c_arq c_bytes c_tris c_tex c_ext <<< "$linha"
      echo "| \`$c_arq\` | $c_bytes | $c_tris | $c_tex | $c_ext |"
    else
      echo "| \`$(basename "$f")\` | $(stat -c %s "$f" 2>/dev/null || stat -f %z "$f") | NAO AVALIADO | NAO AVALIADO | NAO AVALIADO |"
    fi
  done
  echo
  echo "Próximo passo: importar no engine, rodar no dispositivo e gravar screenshot + frame time em production/evidencias/."
} > "$REL"
echo "== pronto. Relatório: $REL"
cat "$REL"
