// Câmera do mundo (B §3.2; ADR-0002 §3; design/decisoes-F-002.md §1 e §5):
// rígida, centrada na posição interpolada do jogador pelo delta toroidal, sem
// atraso nem limites, arredondada para 0,5 pt (1 px do canvas a 2×) para as
// bordas das formas não tremerem. Sem Phaser: a cena só aplica o resultado.
import { JOGADOR, type Estado } from '../../logica/nucleo/estado';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, copiaMaisProxima, interpolarNoToro } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';

/** Arredonda para o pixel do canvas: 1/2 pt a 2×. */
export function arredondarParaOPixel(v: number): number {
  return Math.round(v * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
}

/** Centro da câmera em px lógicos, em [0, W) × [0, H). */
export function centroDaCamera(e: Estado, alfa: number, out: { x: number; y: number }): void {
  const j = e.jogador;
  const x = interpolarNoToro(j[JOGADOR.xAnt]!, j[JOGADOR.x]!, alfa, LARGURA_DO_MAPA);
  const y = interpolarNoToro(j[JOGADOR.yAnt]!, j[JOGADOR.y]!, alfa, ALTURA_DO_MAPA);
  out.x = copiaMaisProxima(arredondarParaOPixel(x), LARGURA_DO_MAPA / 2, LARGURA_DO_MAPA);
  out.y = copiaMaisProxima(arredondarParaOPixel(y), ALTURA_DO_MAPA / 2, ALTURA_DO_MAPA);
}
