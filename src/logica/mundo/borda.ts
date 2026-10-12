// Borda da arena do marco (design/decisoes-F-008.md AR2, §3 "Borda"): a colisão circular que prende o jogador e os
// inimigos que nasceram dentro do disco e barra os de fora. Módulo à parte (só estado, colisão e toro) para o jogador e
// a horda o importarem sem puxar a formação da arena. Regra do laço quente: lê e escreve COLISAO, sem double nas chamadas.
import { FOGUEIRA_F32, type Estado } from '../nucleo/estado';
import type { DadosDaVigilia } from './dados';
import { COLISAO, ES } from './obstaculos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/** Folga, em px, da borda para quem está fora: o corpo para um pouco além do disco, e não encostado nele (§3). */
export const FOLGA_DA_BORDA = 0.01;

/**
 * A borda da arena sobre o corpo de COLISAO (x, y, raio, xAnt, yAnt). `dentroFixo` (o jogador) trata o corpo como de
 * dentro; senão o lado vem do centro da posição anterior (`xAnt`, `yAnt`): dentro do disco, o corpo fica a ≤ R − r do
 * centro; fora dele, a ≥ R + r + 0,01. O resultado sai em COLISAO[x, y], em Float32, sem normalizar no toro (quem chama
 * normaliza). Chamada só com `arenaAtiva` = 1.
 */
export function limitarPelaArena(e: Estado, dados: DadosDaVigilia, dentroFixo: boolean): void {
  const f = e.fogueiraF32;
  const cx = f[FOGUEIRA_F32.arenaX]!;
  const cy = f[FOGUEIRA_F32.arenaY]!;
  const raio = dados.combate.arenaRaio;
  const r = COLISAO[ES.raio]!;
  let dx = COLISAO[ES.x]! - cx;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = COLISAO[ES.y]! - cy;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  const d2 = dx * dx + dy * dy;
  let dentro = dentroFixo;
  if (!dentro) {
    let ax = COLISAO[ES.xAnt]! - cx;
    if (ax > MEIA_LARGURA_DO_MAPA) ax -= LARGURA_DO_MAPA;
    if (ax < -MEIA_LARGURA_DO_MAPA) ax += LARGURA_DO_MAPA;
    let ay = COLISAO[ES.yAnt]! - cy;
    if (ay > MEIA_ALTURA_DO_MAPA) ay -= ALTURA_DO_MAPA;
    if (ay < -MEIA_ALTURA_DO_MAPA) ay += ALTURA_DO_MAPA;
    dentro = ax * ax + ay * ay < raio * raio;
  }
  if (dentro) {
    const lim = raio - r;
    if (d2 > lim * lim) {
      const k = Math.fround(lim / Math.sqrt(d2));
      COLISAO[ES.x] = Math.fround(cx + Math.fround(dx * k));
      COLISAO[ES.y] = Math.fround(cy + Math.fround(dy * k));
    }
    return;
  }
  const lim = raio + r + FOLGA_DA_BORDA;
  if (d2 < lim * lim) {
    // No centro exato (impossível para quem estava fora) a saída é por +x.
    const k = d2 > 0 ? Math.fround(lim / Math.sqrt(d2)) : 0;
    COLISAO[ES.x] = Math.fround(cx + (d2 > 0 ? Math.fround(dx * k) : lim));
    COLISAO[ES.y] = Math.fround(cy + (d2 > 0 ? Math.fround(dy * k) : 0));
  }
}
