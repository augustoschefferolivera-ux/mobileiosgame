// Mancha das Cinzas Perdidas, parte pura (design/decisoes-F-007.md MC1, MC4, MC5): a divisão das Almas,
// o ponto livre mais próximo dos obstáculos e a Hora do relógio. Funções frias, chamadas uma vez por
// Vigília; todo número que sai daqui é pequeno (< 2^30) e as contas intermediárias ficam em linha.
import { CAUSA_DO_FIM } from '../nucleo/estado';
import { PASSOS_POR_SEGUNDO } from '../nucleo/passos';
import type { Obstaculos } from './obstaculos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

const PASSOS_POR_MINUTO = PASSOS_POR_SEGUNDO * 60;

/** Código da Hora "A Fome" (MC5): do relógio 20:00 em diante. */
export const HORA_A_FOME = 5;

/** `hora = min(4, ⌊minutos/5⌋ + 1)` antes de 20:00; depois, A Fome (5). O `passos` é o relógio da Vigília. */
export function horaDoRelogio(passos: number): number {
  const minutos = Math.floor(passos / PASSOS_POR_MINUTO);
  if (minutos >= 20) return HORA_A_FOME;
  return Math.min(4, Math.floor(minutos / 5) + 1);
}

/**
 * Almas que ficam na mancha (MC1): `⌊(pct × N + 50)/100⌋`, 30% ao mais próximo com o meio para cima, em
 * inteiro (0, 1, 2, 3, 4, 5, 15, 280, 1.100 dão 0, 0, 1, 1, 1, 2, 5, 84, 330). Só o Apagar (e A Fome, F-009) cria mancha.
 */
export function almasNaMancha(causa: number, almas: number, pct: number): number {
  if (causa !== CAUSA_DO_FIM.apagar && causa !== CAUSA_DO_FIM.aFome) return 0;
  return Math.floor((pct * almas + 50) / 100);
}

/** Almas que vão ao Santuário (PE6, MC1): Abandonar leva `⌊N/2⌋`; o Apagar, `N − mancha`; Amanhecer, todas. */
export function almasAoSantuario(causa: number, almas: number, naMancha: number): number {
  return causa === CAUSA_DO_FIM.abandonar ? Math.floor(almas / 2) : almas - naMancha;
}

/** Sobra de um pixel para a posição ficar fora da zona e não exatamente na borda (Float32). */
const FOLGA_DA_BORDA = 0.5;
const PASSADAS_DO_PONTO_LIVRE = 8;

/**
 * Ponto livre mais próximo de (x, y) (MC4): fora da zona de cada obstáculo, de raio `r + margem`, pelo delta
 * toroidal. Quem está dentro de uma zona sai pela normal centro a centro; se isso o põe na zona de outro,
 * repete (até 8 passadas). O resultado é normalizado no toro e em Float32 (como o meta o guarda). Entrada e saída vão
 * num rascunho Float64Array (regra do laço quente: nenhum double cruza a chamada): `io` = [x, y, margem] → [x, y, margem].
 */
export function pontoLivreMaisProximo(o: Obstaculos, io: Float64Array): void {
  const margem = io[2]!;
  let px = io[0]!;
  let py = io[1]!;
  for (let passada = 0; passada < PASSADAS_DO_PONTO_LIVRE; passada++) {
    let mexeu = false;
    for (let i = 0; i < o.n; i++) {
      let dx = px - o.x[i]!;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = py - o.y[i]!;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const zona = o.r[i]! + margem;
      const d2 = dx * dx + dy * dy;
      if (d2 >= zona * zona) continue;
      const d = Math.sqrt(d2);
      const nx = d > 0 ? dx / d : 1;
      const ny = d > 0 ? dy / d : 0;
      const alvo = zona + FOLGA_DA_BORDA;
      px += nx * (alvo - d);
      py += ny * (alvo - d);
      mexeu = true;
    }
    if (!mexeu) break;
  }
  px = Math.fround(px);
  py = Math.fround(py);
  if (px < 0) px = Math.fround(px + LARGURA_DO_MAPA);
  if (px >= LARGURA_DO_MAPA) px = Math.fround(px - LARGURA_DO_MAPA);
  if (py < 0) py = Math.fround(py + ALTURA_DO_MAPA);
  if (py >= ALTURA_DO_MAPA) py = Math.fround(py - ALTURA_DO_MAPA);
  io[0] = px;
  io[1] = py;
}
