// Obstáculos da região (B §3.2; Q-04; ADR-0002 §6; design/decisoes-F-002.md
// §2 e §3): círculos estáticos, fixos no JSON, numa estrutura montada uma vez
// no início da Vigília, fora da grade dinâmica. A colisão é a mesma para o
// jogador e para os inimigos (a F-003 a usa nos Ocos): um círculo de raio r é
// empurrado para fora pela menor penetração, ao longo da normal centro a
// centro, medida pelo delta toroidal. Nada é alocado por passo, nem pelo
// empacotamento de doubles do V8 (a entrada e a saída vão por COLISAO).
import { FNV_BASE, fnv1aU32 } from '../nucleo/hash';
import { CELULAS, COLUNAS, LADO_DA_CELULA, LINHAS } from './grade';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA, deltaNoToro } from './toro';

/** Iterações por passo: a 2ª resolve o empurrão de um obstáculo para dentro de outro (junções). */
export const ITERACOES_DE_COLISAO = 2;
/**
 * Tangente "nula" do desempate, relativa ao comprimento do movimento. Com a
 * tangente exatamente nula como limite, uma reta 2:1 pelo centro deixava o
 * deslize por passo abaixo de meio ulp do Float32: o corpo ficava preso para
 * sempre (ADR-0004 §3).
 */
export const TOLERANCIA_DO_DESEMPATE = 1e-3;

export interface Obstaculos {
  readonly n: number;
  /** Centro, em px lógicos do toro. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Raio = metade de tamanho_px. */
  readonly r: Float32Array;
}

/** O que a estrutura lê de cada obstáculo do JSON da região (forma: só "circulo"). */
export interface ObstaculoDoJson {
  readonly x: number;
  readonly y: number;
  readonly tamanho_px: number;
}

export function criarObstaculos(lista: readonly ObstaculoDoJson[]): Obstaculos {
  const n = lista.length;
  const o = { n, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    const item = lista[i]!;
    o.x[i] = item.x;
    o.y[i] = item.y;
    o.r[i] = item.tamanho_px / 2;
  }
  return o;
}

const bitsF32 = new Float32Array(1);
const bitsU32 = new Uint32Array(bitsF32.buffer);

/**
 * Impressão da disposição (decisoes-F-002 §2): FNV-1a de n e dos bits Float32
 * de x, y e r de cada obstáculo, na ordem do JSON. Vai para o cabeçalho do
 * estado e entra no hash: um replay feito com outra disposição deixa de bater.
 */
export function impressaoDaDisposicao(o: Obstaculos): number {
  let h = fnv1aU32(FNV_BASE, o.n);
  for (let i = 0; i < o.n; i++) {
    h = misturarF32(h, o.x[i]!);
    h = misturarF32(h, o.y[i]!);
    h = misturarF32(h, o.r[i]!);
  }
  return h;
}

function misturarF32(h: number, v: number): number {
  bitsF32[0] = v;
  return fnv1aU32(h, bitsU32[0]!);
}

export interface Ponto {
  x: number;
  y: number;
}

/**
 * Entrada e saída da colisão, sem argumentos double: no V8, cada double
 * passado a uma chamada não inlinada vira um HeapNumber, e a colisão roda uma
 * vez por inimigo por passo (design/decisoes-F-003.md §2, laço quente). Quem
 * chama escreve x, y, raio, movX e movY; a colisão escreve a posição resolvida
 * em x e y, sem normalizar no toro (quem chama normaliza).
 */
export const COLISAO = new Float64Array(7);
/** `xAnt` e `yAnt` (F-008): a posição do começo do passo, de onde a borda da arena decide o lado do inimigo (AR2). */
export const ES = { x: 0, y: 1, raio: 2, movX: 3, movY: 4, xAnt: 5, yAnt: 6 } as const;

/**
 * Empurra o círculo de COLISAO para fora de todos os obstáculos, em ordem fixa
 * de índice, com ITERACOES_DE_COLISAO passadas (decisoes-F-002 §3, passo 3).
 * Centros coincidentes empurram para +x. O resto do movimento fica tangente,
 * e o corpo desliza junto à borda.
 *
 * `movX`/`movY` é o deslocamento do passo. Com `desempate` (inimigos), se a
 * componente tangente dele for nula (até TOLERANCIA_DO_DESEMPATE × |mov|) e ele
 * apontar para dentro do obstáculo, o corpo desliza ao longo da normal girada
 * +90° (−ny, nx), ou no sentido oposto se a tangente for negativa, pelo
 * comprimento da componente normal. O jogador não usa o desempate: andar de
 * frente para um obstáculo só para.
 *
 * `ativo` (F-008 AR3): o registro `obstaculoAtivo` do estado; o obstáculo com 0 não colide (a arena o tirou). Nulo = todos.
 *
 * Devolve quantos empurrões houve.
 */
export function colidirComTodos(o: Obstaculos, desempate: boolean, ativo: Uint8Array | null = null): number {
  return resolver(o, null, 0, o.n, desempate, ativo);
}

/** Como colidirComTodos, com os argumentos e a saída num Ponto (testes e chamadas fora do laço quente). */
export function colidirComObstaculos(
  o: Obstaculos,
  x: number,
  y: number,
  raio: number,
  movX: number,
  movY: number,
  desempate: boolean,
  out: Ponto,
  ativo: Uint8Array | null = null,
): number {
  escreverEntrada(x, y, raio, movX, movY);
  const n = colidirComTodos(o, desempate, ativo);
  out.x = COLISAO[ES.x]!;
  out.y = COLISAO[ES.y]!;
  return n;
}

function escreverEntrada(x: number, y: number, raio: number, movX: number, movY: number): void {
  COLISAO[ES.x] = x;
  COLISAO[ES.y] = y;
  COLISAO[ES.raio] = raio;
  COLISAO[ES.movX] = movX;
  COLISAO[ES.movY] = movY;
}

/**
 * Lista estática de obstáculos por célula da grade de 64 px (design/decisoes-F-003.md §2):
 * cada célula lista, em ordem crescente de índice, os obstáculos cuja distância no
 * toro ao retângulo da célula é menor que r + `alcance` + 1 px. Montada uma vez.
 */
export interface ObstaculosPorCelula {
  /** [inicio[c], inicio[c + 1]) em `indices` são os obstáculos da célula c. */
  readonly inicio: Int32Array;
  readonly indices: Int32Array;
}

/** Distância no toro de um ponto a um intervalo [a, b] de um eixo de comprimento L. */
function distanciaAoIntervalo(v: number, a: number, b: number, L: number): number {
  const centro = (a + b) / 2;
  const d = Math.abs(deltaNoToro(centro, v, L));
  return Math.max(0, d - (b - a) / 2);
}

export function criarObstaculosPorCelula(o: Obstaculos, alcance: number): ObstaculosPorCelula {
  const inicio = new Int32Array(CELULAS + 1);
  const lista: number[] = [];
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      inicio[l * COLUNAS + c] = lista.length;
      const x0 = c * LADO_DA_CELULA;
      const y0 = l * LADO_DA_CELULA;
      const x1 = Math.min(x0 + LADO_DA_CELULA, LARGURA_DO_MAPA);
      const y1 = Math.min(y0 + LADO_DA_CELULA, ALTURA_DO_MAPA);
      for (let i = 0; i < o.n; i++) {
        const dx = distanciaAoIntervalo(o.x[i]!, x0, x1, LARGURA_DO_MAPA);
        const dy = distanciaAoIntervalo(o.y[i]!, y0, y1, ALTURA_DO_MAPA);
        const limite = o.r[i]! + alcance + 1;
        if (dx * dx + dy * dy < limite * limite) lista.push(i);
      }
    }
  }
  inicio[CELULAS] = lista.length;
  return { inicio, indices: Int32Array.from(lista) };
}

/**
 * Como colidirComTodos, mas só contra os obstáculos da célula da posição de
 * COLISAO, levada ao toro. Com a folga mínima entre obstáculos maior que 2 × o
 * maior raio + o deslocamento do passo, nenhum corpo toca dois obstáculos de uma
 * vez, e o resultado é bit a bit o da lista inteira (teste de equivalência).
 */
export function colidirNaCelula(o: Obstaculos, porCelula: ObstaculosPorCelula, desempate: boolean, ativo: Uint8Array | null = null): number {
  // A célula do ponto levado ao toro (voltaNoToro e coluna/linha da grade), escrita aqui para não passar doubles.
  let vx = COLISAO[ES.x]! % LARGURA_DO_MAPA;
  if (vx < 0) vx += LARGURA_DO_MAPA;
  let vy = COLISAO[ES.y]! % ALTURA_DO_MAPA;
  if (vy < 0) vy += ALTURA_DO_MAPA;
  const c = Math.floor(vy / LADO_DA_CELULA) * COLUNAS + Math.floor(vx / LADO_DA_CELULA);
  return resolver(o, porCelula.indices, porCelula.inicio[c]!, porCelula.inicio[c + 1]!, desempate, ativo);
}

/** Como colidirNaCelula, com os argumentos e a saída num Ponto (testes). */
export function colidirComObstaculosDaCelula(
  o: Obstaculos,
  porCelula: ObstaculosPorCelula,
  x: number,
  y: number,
  raio: number,
  movX: number,
  movY: number,
  desempate: boolean,
  out: Ponto,
  ativo: Uint8Array | null = null,
): number {
  escreverEntrada(x, y, raio, movX, movY);
  const n = colidirNaCelula(o, porCelula, desempate, ativo);
  out.x = COLISAO[ES.x]!;
  out.y = COLISAO[ES.y]!;
  return n;
}

function resolver(o: Obstaculos, indices: Int32Array | null, ini: number, fim: number, desempate: boolean, ativo: Uint8Array | null): number {
  let px = COLISAO[ES.x]!;
  let py = COLISAO[ES.y]!;
  const raio = COLISAO[ES.raio]!;
  const movX = COLISAO[ES.movX]!;
  const movY = COLISAO[ES.movY]!;
  let empurroes = 0;
  const tangenteNula = desempate ? TOLERANCIA_DO_DESEMPATE * Math.sqrt(movX * movX + movY * movY) : 0;
  for (let it = 0; it < ITERACOES_DE_COLISAO; it++) {
    for (let k = ini; k < fim; k++) {
      const i = indices === null ? k : indices[k]!;
      if (ativo !== null && ativo[i] === 0) continue;
      // O delta de deltaNoToro, em linha.
      let dx = px - o.x[i]!;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = py - o.y[i]!;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const minimo = o.r[i]! + raio;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minimo * minimo) continue;
      empurroes++;
      let nx = 1;
      let ny = 0;
      let d = 0;
      if (d2 > 0) {
        d = Math.sqrt(d2);
        nx = dx / d;
        ny = dy / d;
      }
      px += nx * (minimo - d);
      py += ny * (minimo - d);
      if (desempate) {
        const tangente = -ny * movX + nx * movY;
        const normal = nx * movX + ny * movY;
        if (normal < 0 && Math.abs(tangente) <= tangenteNula) {
          const sentido = tangente < 0 ? normal : -normal;
          px += -ny * sentido;
          py += nx * sentido;
        }
      }
    }
  }
  COLISAO[ES.x] = px;
  COLISAO[ES.y] = py;
  return empurroes;
}
