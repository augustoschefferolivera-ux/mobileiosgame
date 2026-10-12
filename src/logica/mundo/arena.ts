// Arena do marco (design/decisoes-F-008.md AR2 a AR4): um disco de 224 px centrado no jogador no passo em que o marco
// começa. Os obstáculos tocados pelo disco saem de vez (`obstaculoAtivo` = 0) e a massa e os médios dentro morrem ao
// formá-la; a borda que prende é de borda.ts. Formar e desfazer rodam uma vez por marco.
import { liberarProjetil } from '../armas/projeteis';
import { CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, FOGUEIRA_F32, FOGUEIRA_U8, JOGADOR, TIPO_DE_PROJETIL, type Estado } from '../nucleo/estado';
import { CAUSA } from '../nucleo/eventos';
import type { DadosDaVigilia } from './dados';
import { matarInimigo } from './inimigos';
import { LARGURA_DO_MAPA, ALTURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/**
 * Forma a arena no centro do jogador (AR2, AR3, AR4): grava o centro, liga a arena, tira os obstáculos tocados pelo
 * disco (`d ≤ R + r_o`, e nunca mais voltam), mata com `CAUSA.arena` todo inimigo que não é grande com o centro a
 * `d < R` e libera os projéteis de Sal inimigos dentro. Não nasce nem apaga nada além disso.
 */
export function formarArena(e: Estado, dados: DadosDaVigilia): void {
  const j = e.jogador;
  const f = e.fogueiraF32;
  f[FOGUEIRA_F32.arenaX] = j[JOGADOR.x]!;
  f[FOGUEIRA_F32.arenaY] = j[JOGADOR.y]!;
  e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] = 1;
  const cx = f[FOGUEIRA_F32.arenaX]!;
  const cy = f[FOGUEIRA_F32.arenaY]!;
  const raio = dados.combate.arenaRaio;
  const o = dados.obstaculos;
  for (let i = 0; i < o.n; i++) {
    let dx = o.x[i]! - cx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = o.y[i]! - cy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const lim = raio + o.r[i]!;
    if (dx * dx + dy * dy <= lim * lim) e.obstaculoAtivo[i] = 0;
  }
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  const grande = dados.tipos.grande;
  const raio2 = raio * raio;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0 || grande[ini.tipo[s]!] === 1) continue;
    let dx = ini.x[s]! - cx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - cy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    if (dx * dx + dy * dy < raio2) matarInimigo(e, dados, s, CAUSA.arena);
  }
  const pr = e.projeteis;
  const posP = e.poolDeProjeteis.posicao;
  for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) {
    if (posP[p]! < 0 || pr.tipo[p] !== TIPO_DE_PROJETIL.sal) continue;
    let dx = pr.x[p]! - cx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = pr.y[p]! - cy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    if (dx * dx + dy * dy < raio2) liberarProjetil(e, p);
  }
}

/** Desfaz a arena (AR6, AR7): a borda deixa de valer; os obstáculos tirados seguem inativos até o fim da Vigília. */
export function desfazerArena(e: Estado): void {
  e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] = 0;
}
