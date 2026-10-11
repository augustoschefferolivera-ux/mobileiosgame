#!/usr/bin/env bash
# Cria um módulo da simulação com o seu teste e, se pedido, a cena fina que o
# desenha (doc 19: "módulo pequeno, scripts/novo-modulo.sh").
#
#   scripts/novo-modulo.sh <area>/<nome> [--cena NomeDaCena]
#
# Exemplo: scripts/novo-modulo.sh mundo/grade --cena Vigilia
#   src/logica/mundo/grade.ts        lógica pura (sem Phaser, DOM, relógio)
#   tests/logica/mundo/grade.test.ts teste Vitest com it.todo
#   src/cenas/Vigilia.ts             só se ainda não existir
# Nunca sobrescreve um arquivo. Nomes em português, sem acento, camelCase (Q-33),
# e sem palavras proibidas do glossário (Q-31).
set -euo pipefail

ALVO="${1:-}"
CENA=""
if [[ "${2:-}" == "--cena" ]]; then
  CENA="${3:-}"
  [[ -n "$CENA" ]] || { echo "novo-modulo: --cena precisa do nome da cena" >&2; exit 2; }
elif [[ -n "${2:-}" ]]; then
  echo "novo-modulo: argumento desconhecido: $2" >&2
  exit 2
fi
[[ "$ALVO" =~ ^([a-z][a-zA-Z0-9]*)/([a-z][a-zA-Z0-9]*)$ ]] || {
  echo "uso: scripts/novo-modulo.sh <area>/<nome> [--cena NomeDaCena]  (camelCase, sem acento)" >&2
  exit 2
}
AREA="${BASH_REMATCH[1]}"
NOME="${BASH_REMATCH[2]}"
case "$AREA" in
  cenas|entrada|plataforma|dados) echo "novo-modulo: '$AREA' não é área de src/logica (ADR-0002 §2)" >&2; exit 2 ;;
esac
if [[ -n "$CENA" && ! "$CENA" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
  echo "novo-modulo: a cena precisa ser PascalCase sem acento (ex.: Vigilia)" >&2
  exit 2
fi

cd "$(dirname "$0")/.."
node --input-type=module -e '
  import { proibidasEm } from "./eslint/glossario.js";
  const achadas = process.argv.slice(1).flatMap((n) => proibidasEm(n));
  if (achadas.length) { console.error(`novo-modulo: palavra proibida (Q-31): ${achadas.join(", ")}`); process.exit(2); }
' "$AREA" "$NOME" "$CENA"

LOGICA="src/logica/$AREA/$NOME.ts"
TESTE="tests/logica/$AREA/$NOME.test.ts"
for f in "$LOGICA" "$TESTE"; do
  [[ ! -e "$f" ]] || { echo "novo-modulo: $f já existe" >&2; exit 1; }
done
if [[ "$AREA" == "nucleo" ]]; then IMPORT_ESTADO="./estado"; else IMPORT_ESTADO="../nucleo/estado"; fi
FUNCAO="atualizar${NOME^}"

mkdir -p "$(dirname "$LOGICA")" "$(dirname "$TESTE")"
cat > "$LOGICA" <<EOF
// $NOME: descreva o sistema e cite a fonte (B §x, brief §y, ADR-0002 §z).
// Simulação pura: sem Phaser, DOM, relógio nem Math.random (ADR-0002 §2);
// nada é alocado por passo.
import type { Estado } from '$IMPORT_ESTADO';

export function $FUNCAO(_e: Estado): void {
  // a implementar, guiado pelo teste
}
EOF

cat > "$TESTE" <<EOF
// Teste de $LOGICA: um caso por critério da feature (feature_list.json).
import { describe, it } from 'vitest';
import { $FUNCAO } from '../../../${LOGICA%.ts}';

describe('$NOME', () => {
  it.todo('primeiro critério da feature');
  void $FUNCAO;
});
EOF
echo "criado: $LOGICA"
echo "criado: $TESTE"

if [[ -n "$CENA" ]]; then
  ARQ_CENA="src/cenas/$CENA.ts"
  if [[ -e "$ARQ_CENA" ]]; then
    echo "mantido: $ARQ_CENA já existe; ligue $FUNCAO lá"
  else
    cat > "$ARQ_CENA" <<EOF
// Cena $CENA: fina, só lê o estado da simulação e desenha (ADR-0002 §11.1).
// Textos só por t(id) (src/cenas/textos.ts).
import Phaser from 'phaser';
import type { ContextoDoJogo } from './contexto';
import { cameraLogica } from './estilo';

export class $CENA extends Phaser.Scene {
  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: '$CENA' });
  }

  create(): void {
    cameraLogica(this);
    void this.ctx;
  }
}
EOF
    echo "criado: $ARQ_CENA (registre a cena em src/cenas/jogo.ts)"
  fi
fi
