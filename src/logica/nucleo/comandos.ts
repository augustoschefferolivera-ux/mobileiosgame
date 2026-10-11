// ComandosDoPasso (ADR-0002 §12): a única entrada da simulação. Na F-002 só
// há o movimento: a intenção (mx, my) em Float32, com |v| ≤ 1, já com a zona
// morta, a curva e o limite aplicados pelo TradutorDeGestos, para o replay se
// reproduzir bit a bit (design/decisoes-F-002.md §4). Ao vivo, o driver repete
// em todos os passos de um frame o vetor lido naquele frame; em teste e em
// replay, os comandos vêm de um roteiro indexado pelo passo absoluto (§6).

export interface ComandosDoPasso {
  /** [mx, my]: intenção de movimento, |v| ≤ 1. */
  readonly movimento: Float32Array;
}

export function criarComandos(): ComandosDoPasso {
  return { movimento: new Float32Array(2) };
}

export function copiarComandos(de: ComandosDoPasso, para: ComandosDoPasso): void {
  para.movimento[0] = de.movimento[0]!;
  para.movimento[1] = de.movimento[1]!;
}

/** De onde vêm os comandos de cada passo. */
export interface FonteDeComandos {
  /** Preenche `out` com os comandos do passo absoluto `passo` (o 1º passo da Vigília é o 0). */
  comandosDoPasso(passo: number, out: ComandosDoPasso): void;
}

/** A mesma intenção em todos os passos: ao vivo, o vetor que o tradutor leu no frame. */
export function fonteConstante(cmd: ComandosDoPasso): FonteDeComandos {
  return { comandosDoPasso: (_passo, out) => copiarComandos(cmd, out) };
}

/** Trecho de roteiro: do passo `passo` em diante, a intenção (mx, my), até o trecho seguinte. */
export interface TrechoDeRoteiro {
  readonly passo: number;
  readonly mx: number;
  readonly my: number;
}
export type Roteiro = readonly TrechoDeRoteiro[];

/** Tolerância do |v| ≤ 1: 1/√2 em Float32 é um pouco maior que o real. */
const FOLGA_DO_MODULO = 1e-6;

/** Lança erro se os passos não crescerem estritamente a partir de 0 ou algum |v| passar de 1. */
export function validarRoteiro(roteiro: Roteiro): void {
  let anterior = -1;
  for (const t of roteiro) {
    if (!Number.isInteger(t.passo) || t.passo <= anterior) throw new Error(`roteiro: passo ${t.passo} fora de ordem`);
    if (!Number.isFinite(t.mx) || !Number.isFinite(t.my) || t.mx * t.mx + t.my * t.my > 1 + FOLGA_DO_MODULO) {
      throw new Error(`roteiro: intenção inválida no passo ${t.passo}`);
    }
    anterior = t.passo;
  }
}

/** Comandos por passo absoluto: vale o último trecho com `passo` ≤ o pedido; antes do 1º, parado. */
export function fonteDoRoteiro(roteiro: Roteiro): FonteDeComandos {
  validarRoteiro(roteiro);
  return {
    comandosDoPasso(passo, out) {
      let lo = 0;
      let hi = roteiro.length - 1;
      let achado = -1;
      while (lo <= hi) {
        const meio = (lo + hi) >>> 1;
        if (roteiro[meio]!.passo <= passo) {
          achado = meio;
          lo = meio + 1;
        } else {
          hi = meio - 1;
        }
      }
      out.movimento[0] = achado < 0 ? 0 : roteiro[achado]!.mx;
      out.movimento[1] = achado < 0 ? 0 : roteiro[achado]!.my;
    },
  };
}
