// Verificação de NaN do build de debug (ADR-0002 §5, com ?debug=1): a
// codificação de NaN em Float32Array não é padronizada entre motores, e um NaN
// no estado tornaria o hash dependente da máquina. Varre o jogador (com a stamina e a direção da esquiva) e os slots
// vivos (com a mira do ataque) e os projéteis vivos (design/decisoes-F-004.md §4) ao fim de cada
// quadro, depois dos passos dele, e lança erro com o slot e o último passo do
// quadro (o NaN apareceu nele ou num dos k − 1 anteriores; design/decisoes-F-003.md
// §8). Não aloca: os campos são lidos um a um.
import { CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, type Estado } from './estado';

export function verificarNaN(e: Estado, passosDoQuadro: number): void {
  const j = e.jogador;
  for (let i = 0; i < j.length; i++) {
    if (Number.isNaN(j[i])) throw new Error(`NaN no jogador (campo ${i}) no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
  }
  const j3 = e.jogador3;
  for (let i = 0; i < j3.length; i++) {
    if (Number.isNaN(j3[i])) throw new Error(`NaN no jogador (stamina ou esquiva, campo ${i}) no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
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
      Number.isNaN(ini.dano[s]) ||
      Number.isNaN(ini.miraX[s]) ||
      Number.isNaN(ini.miraY[s])
    ) {
      throw new Error(`NaN no inimigo ${s} no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
    }
  }
  const p = e.projeteis;
  const vivo = e.poolDeProjeteis.posicao;
  for (let s = 0; s < CAPACIDADE_DE_PROJETEIS; s++) {
    if (vivo[s]! < 0) continue;
    if (
      Number.isNaN(p.x[s]) ||
      Number.isNaN(p.y[s]) ||
      Number.isNaN(p.xAnt[s]) ||
      Number.isNaN(p.yAnt[s]) ||
      Number.isNaN(p.vx[s]) ||
      Number.isNaN(p.vy[s]) ||
      Number.isNaN(p.dano[s])
    ) {
      throw new Error(`NaN no projétil ${s} no passo ${e.cab[CAB.passo]} ou antes (quadro de ${passosDoQuadro} passos)`);
    }
  }
}
