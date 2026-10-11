// Verificação de NaN do build de debug (ADR-0002 §5, com ?debug=1): a
// codificação de NaN em Float32Array não é padronizada entre motores, e um NaN
// no estado tornaria o hash dependente da máquina. Varre o jogador e os slots
// vivos ao fim de cada quadro, depois dos passos dele, e lança erro com o slot e
// o último passo do quadro (o NaN apareceu nele ou num dos k − 1 anteriores;
// design/decisoes-F-003.md §8). Não aloca: os campos são lidos um a um.
import { CAB, CAPACIDADE_DE_INIMIGOS, type Estado } from './estado';

export function verificarNaN(e: Estado, passosDoQuadro: number): void {
  const j = e.jogador;
  for (let i = 0; i < j.length; i++) {
    if (Number.isNaN(j[i])) throw new Error(`NaN no jogador (campo ${i}) no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
  }
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) continue;
    if (
      Number.isNaN(ini.x[s]) ||
      Number.isNaN(ini.y[s]) ||
      Number.isNaN(ini.xAnt[s]) ||
      Number.isNaN(ini.yAnt[s]) ||
      Number.isNaN(ini.hp[s]) ||
      Number.isNaN(ini.dano[s])
    ) {
      throw new Error(`NaN no inimigo ${s} no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
    }
  }
}
