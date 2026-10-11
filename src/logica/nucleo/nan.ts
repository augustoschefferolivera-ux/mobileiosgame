// Verificação de NaN do build de debug (ADR-0002 §5, com ?debug=1): a
// codificação de NaN em Float32Array não é padronizada entre motores, e um NaN
// no estado tornaria o hash dependente da máquina. Varre o jogador e os slots
// vivos ao fim do passo e lança erro com o passo e o slot.
import { CAB, CAPACIDADE_DE_INIMIGOS, type Estado } from './estado';

export function verificarNaN(e: Estado): void {
  const passo = e.cab[CAB.passo];
  for (let i = 0; i < e.jogador.length; i++) {
    if (Number.isNaN(e.jogador[i])) throw new Error(`NaN no jogador (campo ${i}) no passo ${passo}`);
  }
  const ini = e.inimigos;
  const campos = [ini.x, ini.y, ini.xAnt, ini.yAnt, ini.hp, ini.dano];
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (e.pool.posicao[s]! < 0) continue;
    for (const c of campos) if (Number.isNaN(c[s])) throw new Error(`NaN no inimigo ${s} no passo ${passo}`);
  }
}
