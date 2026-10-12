// Geometria de apoio dos testes das armas.
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';

/** Distância do ponto (x, y) ao centro do obstáculo mais próximo, menos o raio dele (negativa = dentro). */
export function distanciaAoObstaculoMaisProximo(dados: DadosDaVigilia, x: number, y: number): number {
  const o = dados.obstaculos;
  let menor = Infinity;
  for (let i = 0; i < o.n; i++) {
    const d = Math.hypot(deltaNoToro(o.x[i]!, x, W), deltaNoToro(o.y[i]!, y, H)) - o.r[i]!;
    if (d < menor) menor = d;
  }
  return menor;
}
