// Mira automática da Espada (pedido do usuário, 2026-10-13; ADR-0012 §9): no golpe, o arco aponta para o inimigo vivo
// mais próximo do jogador (centro a centro, no toro), com desempate pelo menor slot. Nenhum RNG; só Float32 lido e
// aritmética em linha. Função à parte para não crescer `golpear` nem `rodarAura` (inlining; ADR-0005 §2).
import { JOGADOR, type Estado } from '../nucleo/estado';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { ACHADOS, MIRA } from './acerto';

/**
 * Entre os `m` primeiros candidatos de ACHADOS (a consulta do próprio golpe: alcance da forma + R_MAX, e os grandes
 * com a folga de 8 px, logo o chefe e os Coroados entram), escolhe o vivo de menor d² ao jogador (empate: menor slot).
 * Devolve 1 e deixa o vetor unitário em MIRA, ou 0 (MIRA intacta) se não há candidato vivo a distância > 0: aí vale a
 * última direção do jogador, como antes. Os doubles ficam em locais; só inteiros atravessam a chamada.
 */
export function mirarNoMaisProximo(e: Estado, m: number): number {
  const jx = e.jogador[JOGADOR.x]!;
  const jy = e.jogador[JOGADOR.y]!;
  const ini = e.inimigos;
  let melhor = -1;
  let melhorD2 = 0;
  let bx = 0;
  let by = 0;
  for (let k = 0; k < m; k++) {
    const s = ACHADOS[k]!;
    if (ini.hp[s]! <= 0) continue;
    let dx = ini.x[s]! - jx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - jy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d2 = dx * dx + dy * dy;
    if (d2 === 0) continue;
    if (melhor < 0 || d2 < melhorD2 || (d2 === melhorD2 && s < melhor)) {
      melhor = s;
      melhorD2 = d2;
      bx = dx;
      by = dy;
    }
  }
  if (melhor < 0) return 0;
  const d = Math.sqrt(melhorD2);
  MIRA[0] = bx / d;
  MIRA[1] = by / d;
  return 1;
}
