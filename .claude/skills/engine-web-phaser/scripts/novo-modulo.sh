#!/usr/bin/env bash
# novo-modulo.sh — engine-web-phaser
# Cria o trio "lógica pura + teste + cena fina" que o agente deve manter para cada feature:
#   src/logic/<nome>.ts          lógica pura (sem import de 'phaser'), funções puras sobre um estado
#   src/logic/<nome>.test.ts     teste Vitest (ambiente node) da lógica, falhando até você implementar
#   src/scenes/<Nome>Scene.ts    cena fina: só input → chama a lógica → desenha; expõe estado em __GAME_DEBUG__
#   src/data/<nome>.json         dados de balanceamento (opcional, --sem-dados para pular)
# Nunca sobrescreve arquivo existente. Não roda git.
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
DIR="."
NOME=""
SEM_CENA=0
SEM_DADOS=0

usage() {
  cat <<USAGE
Uso: $SCRIPT_NAME <nome-kebab-case> [--dir <projeto>] [--sem-cena] [--sem-dados]

  <nome>        nome do módulo em kebab-case, sem acento (ex.: pontuacao, combo-de-ataque)
  --dir <p>     raiz do projeto Vite (padrão: .) — precisa ter src/
  --sem-cena    não cria src/scenes/<Nome>Scene.ts (feature só de lógica)
  --sem-dados   não cria src/data/<nome>.json
  -h, --help

Gera: src/logic/<nome>.ts, src/logic/<nome>.test.ts, src/scenes/<Nome>Scene.ts, src/data/<nome>.json
Depois: npx vitest run src/logic/<nome>.test.ts  (deve FALHAR até a lógica existir) → implemente →
        registre a cena em src/main.ts → bash scripts/verify.sh --feature F-xxx
Saída: 0 ok · 1 arquivo já existe ou src/ ausente · 4 argumentos inválidos
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --sem-cena) SEM_CENA=1; shift ;;
    --sem-dados) SEM_DADOS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Argumento desconhecido: $1" >&2; usage >&2; exit 4 ;;
    *) if [[ -z "$NOME" ]]; then NOME="$1"; shift; else echo "Só um nome por vez." >&2; exit 4; fi ;;
  esac
done

[[ -n "$NOME" ]] || { usage >&2; exit 4; }
[[ "$NOME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]] || { echo "Nome inválido '$NOME': use kebab-case sem acento (ex.: combo-de-ataque)." >&2; exit 4; }
[[ -d "$DIR/src" ]] || { echo "Não achei '$DIR/src' — rode na raiz do projeto Vite ou passe --dir." >&2; exit 1; }

# pontuacao -> Pontuacao ; combo-de-ataque -> ComboDeAtaque ; comboDeAtaque para identificadores
PASCAL="$(echo "$NOME" | awk -F- '{for(i=1;i<=NF;i++){printf "%s%s", toupper(substr($i,1,1)), substr($i,2)}}')"
CAMEL="$(echo "${PASCAL:0:1}" | tr '[:upper:]' '[:lower:]')${PASCAL:1}"
SNAKE="$(echo "$NOME" | tr '-' '_')"

LOGICA="$DIR/src/logic/$NOME.ts"
TESTE="$DIR/src/logic/$NOME.test.ts"
CENA="$DIR/src/scenes/${PASCAL}Scene.ts"
DADOS="$DIR/src/data/$NOME.json"

for f in "$LOGICA" "$TESTE"; do [[ -e "$f" ]] && { echo "Já existe: $f (não sobrescrevo)." >&2; exit 1; }; done
[[ $SEM_CENA -eq 0 && -e "$CENA" ]] && { echo "Já existe: $CENA (não sobrescrevo)." >&2; exit 1; }
[[ $SEM_DADOS -eq 0 && -e "$DADOS" ]] && { echo "Já existe: $DADOS (não sobrescrevo)." >&2; exit 1; }

mkdir -p "$DIR/src/logic"
cat > "$LOGICA" <<TS
// Lógica pura de "$NOME": sem Phaser, sem DOM, sem timers. Entra estado + ação, sai estado novo.
// Testada em $NOME.test.ts (Vitest, ambiente node). A cena (${PASCAL}Scene) só traduz toque → ação → desenho.
$( [[ $SEM_DADOS -eq 0 ]] && echo "import dados from '../data/$NOME.json';" )

export interface ${PASCAL}Estado {
  readonly pontos: number;
  readonly vivo: boolean;
}

export type ${PASCAL}Acao = { tipo: 'toque'; x: number; y: number } | { tipo: 'tick'; dtMs: number };

export const ${CAMEL}Inicial: ${PASCAL}Estado = { pontos: 0, vivo: true };

/** Reduz uma ação sobre o estado. Pura: mesma entrada → mesma saída; nunca muta o argumento. */
export function reduzir${PASCAL}(estado: ${PASCAL}Estado, acao: ${PASCAL}Acao): ${PASCAL}Estado {
  switch (acao.tipo) {
    case 'toque':
      return { ...estado, pontos: estado.pontos + $( [[ $SEM_DADOS -eq 0 ]] && echo "dados.pontosPorToque" || echo "1" ) };
    case 'tick':
      return estado;
  }
}
TS

cat > "$TESTE" <<TS
import { describe, expect, it } from 'vitest';
import { ${CAMEL}Inicial, reduzir${PASCAL} } from './$NOME';

// Critério de aceite da feature em feature_list.json vira caso de teste aqui, ANTES da implementação.
describe('$NOME', () => {
  it('toque soma pontos sem mutar o estado anterior', () => {
    const depois = reduzir${PASCAL}(${CAMEL}Inicial, { tipo: 'toque', x: 10, y: 10 });
    expect(depois.pontos).toBeGreaterThan(${CAMEL}Inicial.pontos);
    expect(${CAMEL}Inicial.pontos).toBe(0);
  });

  it('TODO-CRITERIO: substitua por um critério de aceite real da feature', () => {
    expect.fail('escreva o teste do critério de aceite antes de implementar');
  });
});
TS

if [[ $SEM_DADOS -eq 0 ]]; then
  mkdir -p "$DIR/src/data"
  cat > "$DADOS" <<JSON
{
  "_sobre": "Balanceamento de $NOME. Só números e nomes; a lógica em src/logic/$NOME.ts lê daqui. Mude valores sem tocar em código.",
  "pontosPorToque": 1
}
JSON
fi

if [[ $SEM_CENA -eq 0 ]]; then
  mkdir -p "$DIR/src/scenes"
  cat > "$CENA" <<TS
import Phaser from 'phaser';
import { debug, event, tick } from '../debug';
import { ${CAMEL}Inicial, reduzir${PASCAL}, type ${PASCAL}Estado } from '../logic/$NOME';

// Cena FINA: guarda o estado, traduz input em ação, chama a lógica pura e redesenha.
// Nada de regra de jogo aqui; se precisar de um if de gameplay, ele vai para src/logic/$NOME.ts.
export class ${PASCAL}Scene extends Phaser.Scene {
  private estado: ${PASCAL}Estado = ${CAMEL}Inicial;
  private pontosTexto!: Phaser.GameObjects.Text;

  constructor() {
    super('$SNAKE');
  }

  init(): void {
    this.estado = ${CAMEL}Inicial; // reset aqui, não no constructor (roda a cada start/restart)
  }

  create(): void {
    debug.scene = '$SNAKE';
    const { width } = this.scale;
    this.pontosTexto = this.add
      .text(width / 2, 96, '0', { fontFamily: 'system-ui, sans-serif', fontSize: '56px', color: '#e8eef4' })
      .setOrigin(0.5);

    this.input.on('pointerdown', this.aoTocar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off('pointerdown', this.aoTocar, this));
  }

  private aoTocar(p: Phaser.Input.Pointer): void {
    this.aplicar({ tipo: 'toque', x: p.x, y: p.y });
    event('$SNAKE:toque');
  }

  private aplicar(acao: Parameters<typeof reduzir${PASCAL}>[1]): void {
    this.estado = reduzir${PASCAL}(this.estado, acao);
    debug.score = this.estado.pontos; // o Playwright lê daqui (window.__GAME_DEBUG__)
    this.pontosTexto.setText(String(this.estado.pontos));
  }

  update(_time: number, delta: number): void {
    this.aplicar({ tipo: 'tick', dtMs: delta });
    tick(this.game, '$SNAKE');
  }
}
TS
fi

echo "Criado:"
echo "  $LOGICA"
echo "  $TESTE"
[[ $SEM_DADOS -eq 0 ]] && echo "  $DADOS"
[[ $SEM_CENA -eq 0 ]] && echo "  $CENA  (registre em src/main.ts: scene: [..., ${PASCAL}Scene])"
echo "Próximo: npx vitest run src/logic/$NOME.test.ts  → implemente até passar → bash scripts/verify.sh --feature F-xxx"
