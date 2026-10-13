// ComandosDoPasso (ADR-0002 §12): a única entrada da simulação. O movimento
// é a intenção (mx, my) em Float32, com |v| ≤ 1, já com a zona morta, a curva e
// o limite aplicados pelo TradutorDeGestos, para o replay se reproduzir bit a
// bit (design/decisoes-F-002.md §4). Ao vivo, o driver repete em todos os
// passos de um frame o vetor lido naquele frame; em teste e em replay, os
// comandos vêm de um roteiro indexado pelo passo absoluto (§6). Na F-006
// (design/decisoes-F-006.md ET5), as ações (esquiva, aparo) são bordas: valem
// só no passo em que a fonte as entrega, uma vez.

/**
 * Bits de `ComandosDoPasso.acoes`. O Frasco (4) e `frascoCancelar` (8, emitido pelo tradutor ao segurar)
 * valem desde a F-007; `abandonar` (16, só da pausa) o `passo` consome antes de qualquer outra coisa (PE5, LY3);
 * `descansar` (32), `forjar` (64) e `partir` (128) são da Fogueira (F-008 FG3 a FG6) e só valem com a etapa FOGUEIRA e o modal fechado;
 * os códigos só crescem no fim.
 */
export const ACAO = { esquiva: 1, aparo: 2, frasco: 4, frascoCancelar: 8, abandonar: 16, descansar: 32, forjar: 64, partir: 128 } as const;
/** Os bits que um roteiro pode pedir hoje (o 16 só vale com a fase VIVA: em APAGANDO e FIM o `passo` o ignora). */
const ACOES_PERMITIDAS = ACAO.esquiva | ACAO.aparo | ACAO.frasco | ACAO.frascoCancelar | ACAO.abandonar | ACAO.descansar | ACAO.forjar | ACAO.partir;

export interface ComandosDoPasso {
  /** [mx, my]: intenção de movimento, |v| ≤ 1. */
  readonly movimento: Float32Array;
  /** Bits de ACAO pedidos neste passo (borda, não nível). */
  readonly acoes: Uint8Array;
  /** [x, y]: a direção da esquiva do passo, módulo ≤ 1; (0, 0) é "a última direção não nula do jogador" (toque duplo). */
  readonly mira: Float32Array;
  /**
   * Nível de degradação do passo, 0 a 3 (F-010 DG3). Só o 3 muda a simulação (TETO efetivo do diretor), então entra aqui, no
   * replay, e não no estado. É nível, não borda: a fonte repete o valor até mudar.
   */
  readonly degradacao: Uint8Array;
}

export function criarComandos(): ComandosDoPasso {
  return { movimento: new Float32Array(2), acoes: new Uint8Array(1), mira: new Float32Array(2), degradacao: new Uint8Array(1) };
}

export function copiarComandos(de: ComandosDoPasso, para: ComandosDoPasso): void {
  para.movimento[0] = de.movimento[0]!;
  para.movimento[1] = de.movimento[1]!;
  para.acoes[0] = de.acoes[0]!;
  para.mira[0] = de.mira[0]!;
  para.mira[1] = de.mira[1]!;
  para.degradacao[0] = de.degradacao[0]!;
}

/** De onde vêm os comandos de cada passo. */
export interface FonteDeComandos {
  /** Preenche `out` com os comandos do passo absoluto `passo` (o 1º passo da Vigília é o 0). */
  comandosDoPasso(passo: number, out: ComandosDoPasso): void;
  /**
   * Escolha do modal de ordem `ordem` (0 = o 1º da Vigília; decisoes-F-005 M2):
   * a carta (0 a 2; num baú, qualquer valor ≥ 0 fecha). Ausente ou −1: esperar o jogador.
   */
  escolhaDoModal?(ordem: number): number;
}

/** Escolhas dos modais de um roteiro: por ordem (a falta é a carta 0), ou sempre a 1ª carta. */
export type EscolhasDoRoteiro = readonly number[] | 'primeira';

function escolhaDe(escolhas: EscolhasDoRoteiro, ordem: number): number {
  return escolhas === 'primeira' ? 0 : (escolhas[ordem] ?? 0);
}

/**
 * A mesma intenção em todos os passos: ao vivo, o vetor que o tradutor leu no
 * frame (sem escolhas: espera). A borda das ações é consumida: vai para `out`
 * no 1º passo vivo que a lê e é zerada na origem (ET6), então a ação entra uma
 * vez só, e um quadro de 0 passos não a perde.
 */
export function fonteConstante(cmd: ComandosDoPasso, escolhas?: EscolhasDoRoteiro): FonteDeComandos {
  const fonte: FonteDeComandos = {
    comandosDoPasso: (_passo, out) => {
      copiarComandos(cmd, out);
      if (cmd.acoes[0] !== 0) {
        cmd.acoes[0] = 0;
        cmd.mira[0] = 0;
        cmd.mira[1] = 0;
      }
    },
  };
  if (escolhas !== undefined) fonte.escolhaDoModal = (ordem) => escolhaDe(escolhas, ordem);
  return fonte;
}

/** Trecho de roteiro: do passo `passo` em diante, a intenção (mx, my), até o trecho seguinte. */
export interface TrechoDeRoteiro {
  readonly passo: number;
  readonly mx: number;
  readonly my: number;
}
export type Roteiro = readonly TrechoDeRoteiro[];

/** Ação de roteiro: vale só no passo exato `passo` (a lista é paralela aos trechos; ET5). */
export interface AcaoDeRoteiro {
  readonly passo: number;
  /** Bits de ACAO (esquiva, aparo, Frasco, cancelar e abandonar). */
  readonly acoes: number;
  /** Direção da esquiva, |mira| ≤ 1; ausente ou (0, 0): a última direção do jogador. */
  readonly mira?: readonly [number, number];
}

/** Trecho de degradação: do passo `passo` em diante vale o `nivel` (0 a 3), até o trecho seguinte (F-010 DG3, replay). */
export interface TrechoDeDegradacao {
  readonly passo: number;
  readonly nivel: number;
}

/** Lança erro se os passos não crescerem estritamente a partir de 0 ou algum nível sair de 0 a 3. */
export function validarDegradacoes(trechos: readonly TrechoDeDegradacao[]): void {
  let anterior = -1;
  for (const t of trechos) {
    if (!Number.isInteger(t.passo) || t.passo <= anterior) throw new Error(`degradação: passo ${t.passo} fora de ordem`);
    if (!Number.isInteger(t.nivel) || t.nivel < 0 || t.nivel > 3) throw new Error(`degradação: nível ${t.nivel} inválido`);
    anterior = t.passo;
  }
}

function nivelDeDegradacao(trechos: readonly TrechoDeDegradacao[], passo: number): number {
  let achado = 0;
  for (let i = 0; i < trechos.length && trechos[i]!.passo <= passo; i++) achado = trechos[i]!.nivel;
  return achado;
}

/** Tolerância do |v| ≤ 1: com o literal 1/√2 em double, 2 × r² dá 1,0000000000000002. */
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

/** Lança erro se os passos das ações não crescerem estritamente a partir de 0, se houver bit não permitido ou se a mira não for finita com |mira| ≤ 1. */
export function validarAcoes(acoes: readonly AcaoDeRoteiro[]): void {
  let anterior = -1;
  for (const a of acoes) {
    if (!Number.isInteger(a.passo) || a.passo <= anterior) throw new Error(`ações: passo ${a.passo} fora de ordem`);
    if (!Number.isInteger(a.acoes) || a.acoes < 0 || (a.acoes & ~ACOES_PERMITIDAS) !== 0) throw new Error(`ações: bits inválidos no passo ${a.passo}`);
    const [mx, my] = a.mira ?? [0, 0];
    if (!Number.isFinite(mx) || !Number.isFinite(my) || mx * mx + my * my > 1 + FOLGA_DO_MODULO) {
      throw new Error(`ações: mira inválida no passo ${a.passo}`);
    }
    anterior = a.passo;
  }
}

/**
 * Comandos por passo absoluto: vale o último trecho com `passo` ≤ o pedido;
 * antes do 1º, parado. Com `escolhas`, os modais se confirmam por elas; sem,
 * o roteiro para no 1º modal. As `acoes` (lista paralela) valem só no passo
 * exato; fora delas a fonte entrega `acoes` = 0 e `mira` = (0, 0).
 */
export function fonteDoRoteiro(roteiro: Roteiro, escolhas?: EscolhasDoRoteiro, acoes?: readonly AcaoDeRoteiro[], degradacoes?: readonly TrechoDeDegradacao[]): FonteDeComandos {
  validarRoteiro(roteiro);
  if (acoes) validarAcoes(acoes);
  if (degradacoes) validarDegradacoes(degradacoes);
  const fonte: FonteDeComandos = {
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
      out.acoes[0] = 0;
      out.mira[0] = 0;
      out.mira[1] = 0;
      out.degradacao[0] = degradacoes ? nivelDeDegradacao(degradacoes, passo) : 0;
      if (!acoes) return;
      lo = 0;
      hi = acoes.length - 1;
      while (lo <= hi) {
        const meio = (lo + hi) >>> 1;
        const a = acoes[meio]!;
        if (a.passo === passo) {
          out.acoes[0] = a.acoes;
          if (a.mira) {
            out.mira[0] = a.mira[0];
            out.mira[1] = a.mira[1];
          }
          return;
        }
        if (a.passo < passo) lo = meio + 1;
        else hi = meio - 1;
      }
    },
  };
  if (escolhas !== undefined) fonte.escolhaDoModal = (ordem) => escolhaDe(escolhas, ordem);
  return fonte;
}
