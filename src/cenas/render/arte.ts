// Auxiliares da arte no render (F-011, style card §6), sem Phaser: a origem de
// cada moldura (o vértice nos efeitos girados) e a direção em 16 passos (os 4
// ângulos desenhados e o giro em múltiplos de 90°, o único que o NEAREST
// desenha sem perder a grade).
import { CATALOGO } from '../../arte/catalogo';
import { NOMES_DAS_MOLDURAS } from './atlas';

/** Origem (fração) de cada moldura, por índice em NOMES_DAS_MOLDURAS; as formas ficam no centro. */
export const ORIGEM_X = new Float64Array(NOMES_DAS_MOLDURAS.length).fill(0.5);
export const ORIGEM_Y = new Float64Array(NOMES_DAS_MOLDURAS.length).fill(0.5);
for (const e of CATALOGO) {
  const i = NOMES_DAS_MOLDURAS.indexOf(e.nome);
  ORIGEM_X[i] = e.origemX;
  ORIGEM_Y[i] = e.origemY;
}

const PASSO = Math.PI / 8;

/**
 * Direção de um ângulo de tela (0 = para cima, positivo no sentido horário) em 16 passos de 22,5°: `base` é o
 * desenho (0 a 3: 0°, 22,5°, 45°, 67,5°) e `rotacao` o giro de k × 90° em rad.
 */
export function direcao16(angulo: number, out: { base: number; rotacao: number }): void {
  let k = Math.round(angulo / PASSO) % 16;
  if (k < 0) k += 16;
  out.base = k & 3;
  out.rotacao = (k >> 2) * (Math.PI / 2);
}
