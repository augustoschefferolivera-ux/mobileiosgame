// Grade espacial uniforme sobre o toro (B §2 e §4; ADR-0002 §6; F-003.1):
// células de 64 px, 19 colunas × 40 linhas, com a última coluna (18 px) e a
// última linha (36 px) mais estreitas. É refeita a cada passo por counting sort
// (contagem, início e índices ordenados em Int32Array) e não fica no estado:
// deriva das posições e não entra no hash. Nada é alocado depois de criarGrade().
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA } from './toro';

const MEIA_LARGURA = LARGURA_DO_MAPA / 2;
const MEIA_ALTURA = ALTURA_DO_MAPA / 2;

/** Lado da célula: 64 px = 2 corpos (ADR-0002 §6, aprovado na §15 item 2). */
export const LADO_DA_CELULA = 64;
export const COLUNAS = Math.ceil(LARGURA_DO_MAPA / LADO_DA_CELULA);
export const LINHAS = Math.ceil(ALTURA_DO_MAPA / LADO_DA_CELULA);
export const CELULAS = COLUNAS * LINHAS;

export interface Grade {
  /** Itens por célula; durante a reconstrução, serve de cursor de escrita. */
  readonly contagem: Int32Array;
  /** Início de cada célula em `indices`; `inicio[CELULAS]` é o total. */
  readonly inicio: Int32Array;
  /** Ids dos itens, agrupados por célula, na ordem em que foram dados dentro de cada célula. */
  readonly indices: Int32Array;
  /** Célula de cada item da última reconstrução, na ordem dada (rascunho). */
  readonly celulaDe: Int32Array;
}

export function criarGrade(capacidade: number): Grade {
  return {
    contagem: new Int32Array(CELULAS),
    inicio: new Int32Array(CELULAS + 1),
    indices: new Int32Array(capacidade),
    celulaDe: new Int32Array(capacidade),
  };
}

/** Coluna de um x já normalizado em [0, W); x = W cai na última coluna. */
function coluna(x: number): number {
  return Math.floor(x / LADO_DA_CELULA);
}

function linha(y: number): number {
  return Math.floor(y / LADO_DA_CELULA);
}

/** Leva um valor qualquer para [0, L], em double (só para achar a célula). */
function voltaNoToro(v: number, L: number): number {
  const m = v % L;
  return m < 0 ? m + L : m;
}

/** Célula de um ponto qualquer, levado ao toro (a posição pode ter saído de [0, W) × [0, H) no meio do passo). */
export function celulaDoPonto(x: number, y: number): number {
  return linha(voltaNoToro(y, ALTURA_DO_MAPA)) * COLUNAS + coluna(voltaNoToro(x, LARGURA_DO_MAPA));
}

/**
 * Refaz a grade com os itens `ids[0..n)`, nas posições `xs[id]`, `ys[id]`
 * (normalizadas no toro). Dentro de cada célula, os ids ficam na ordem dada.
 */
export function reconstruirGrade(g: Grade, xs: Float32Array, ys: Float32Array, ids: Int32Array, n: number): void {
  const { contagem, inicio, indices, celulaDe } = g;
  contagem.fill(0);
  for (let k = 0; k < n; k++) {
    const id = ids[k]!;
    const c = linha(ys[id]!) * COLUNAS + coluna(xs[id]!);
    celulaDe[k] = c;
    contagem[c] = contagem[c]! + 1;
  }
  inicio[0] = 0;
  for (let c = 0; c < CELULAS; c++) {
    inicio[c + 1] = inicio[c]! + contagem[c]!;
    contagem[c] = inicio[c]!;
  }
  for (let k = 0; k < n; k++) {
    const c = celulaDe[k]!;
    indices[contagem[c]!] = ids[k]!;
    contagem[c] = contagem[c]! + 1;
  }
  for (let c = 0; c < CELULAS; c++) contagem[c] = inicio[c + 1]! - inicio[c]!;
}

/**
 * Quantas células, a partir de `c0`, cobrem o intervalo [v − r, v + r] num
 * eixo de comprimento L com `n` células. O intervalo de células vem das
 * coordenadas em px, não de um número de anéis (ADR-0002 §6): com as células
 * finais mais estreitas, x = 10 com r = 30 precisa da coluna 17. Se o
 * intervalo for quase do tamanho do eixo, ele pode voltar à célula de partida,
 * e então vale o eixo inteiro.
 */
function celulasNoEixo(c0: number, c1: number, r: number, L: number, n: number): number {
  if (2 * r >= L - LADO_DA_CELULA) return n;
  return ((c1 - c0 + n) % n) + 1;
}

/**
 * Escreve em `out` os ids a distância no toro ≤ `r` de (x, y), e devolve
 * quantos. A ordem é a das células visitadas (colunas e linhas a partir da
 * borda de menor coordenada do intervalo, com wrap) e, dentro de cada célula,
 * a da reconstrução. Quem chama exclui o próprio item, se precisar.
 */
/**
 * Intervalo de células que cobre o disco de raio r em volta de (x, y), pelas
 * coordenadas em px (ADR-0002 §6): escreve em `out` a 1ª coluna, quantas
 * colunas, a 1ª linha e quantas linhas, avançando com wrap de índice.
 */
export function intervaloDeCelulas(x: number, y: number, r: number, out: Int32Array): void {
  const c0 = coluna(voltaNoToro(x - r, LARGURA_DO_MAPA));
  const c1 = coluna(voltaNoToro(x + r, LARGURA_DO_MAPA));
  const l0 = linha(voltaNoToro(y - r, ALTURA_DO_MAPA));
  const l1 = linha(voltaNoToro(y + r, ALTURA_DO_MAPA));
  out[0] = c0;
  out[1] = celulasNoEixo(c0, c1, r, LARGURA_DO_MAPA, COLUNAS);
  out[2] = l0;
  out[3] = celulasNoEixo(l0, l1, r, ALTURA_DO_MAPA, LINHAS);
}

const intervalo = new Int32Array(4);

export function consultarGrade(
  g: Grade,
  xs: Float32Array,
  ys: Float32Array,
  x: number,
  y: number,
  r: number,
  out: Int32Array,
): number {
  intervaloDeCelulas(x, y, r, intervalo);
  const c0 = intervalo[0]!;
  const nc = intervalo[1]!;
  const nl = intervalo[3]!;
  const r2 = r * r;
  const { inicio, indices } = g;
  let achados = 0;
  // O mesmo delta de deltaNoToro, escrito aqui por ser o laço mais quente da horda.
  let l = intervalo[2]!;
  for (let i = 0; i < nl; i++) {
    let c = c0;
    for (let j = 0; j < nc; j++) {
      const cel = l * COLUNAS + c;
      const fim = inicio[cel + 1]!;
      for (let k = inicio[cel]!; k < fim; k++) {
        const id = indices[k]!;
        let dx = xs[id]! - x;
        if (dx > MEIA_LARGURA) dx -= LARGURA_DO_MAPA;
        if (dx < -MEIA_LARGURA) dx += LARGURA_DO_MAPA;
        let dy = ys[id]! - y;
        if (dy > MEIA_ALTURA) dy -= ALTURA_DO_MAPA;
        if (dy < -MEIA_ALTURA) dy += ALTURA_DO_MAPA;
        if (dx * dx + dy * dy <= r2) out[achados++] = id;
      }
      if (++c === COLUNAS) c = 0;
    }
    if (++l === LINHAS) l = 0;
  }
  return achados;
}
