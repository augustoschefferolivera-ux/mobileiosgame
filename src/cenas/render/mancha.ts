// Marcador e seta da mancha das Cinzas Perdidas (design/decisoes-F-007.md MC9), sem Phaser: onde desenhar o anel (na cópia
// mais próxima da câmera) e, com a mancha fora da vista, o ângulo e o ponto da seta no limite da tela. A mesma conta serve
// à seta da Fogueira da F-008. Escreve em `out`; nada é alocado.
import { ALTURA_DA_TELA, ALTURA_DO_MAPA, LARGURA_DA_TELA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';

/** Folga da seta até a borda da tela, em pt (a ponta fica dentro da vista). */
export const MARGEM_DA_SETA = 28;
/** Raio do anel da mancha, em pt (o encosto é a 32). */
export const RAIO_DO_ANEL_DA_MANCHA = 22;

export interface MarcadorDaMancha {
  /** O anel está dentro da vista (centro a menos de meia tela da câmera, com o raio do anel)? */
  dentro: boolean;
  /** Posição do anel na cópia mais próxima da câmera, em px do mundo. */
  x: number;
  y: number;
  /** Ângulo do delta toroidal câmera → mancha (0 = direita, π/2 = baixo). */
  angulo: number;
  /** Ponto da seta no limite da tela (só vale com `dentro` falso), em px do mundo. */
  setaX: number;
  setaY: number;
}

export function criarMarcador(): MarcadorDaMancha {
  return { dentro: true, x: 0, y: 0, angulo: 0, setaX: 0, setaY: 0 };
}

/** Calcula o marcador para a mancha em (mx, my) com a câmera em (camX, camY). */
export function marcadorDaMancha(mx: number, my: number, camX: number, camY: number, out: MarcadorDaMancha): MarcadorDaMancha {
  let dx = mx - camX;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = my - camY;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  out.x = camX + dx;
  out.y = camY + dy;
  out.angulo = Math.atan2(dy, dx);
  const meiaL = LARGURA_DA_TELA / 2;
  const meiaA = ALTURA_DA_TELA / 2;
  out.dentro = Math.abs(dx) <= meiaL + RAIO_DO_ANEL_DA_MANCHA && Math.abs(dy) <= meiaA + RAIO_DO_ANEL_DA_MANCHA;
  // A seta: o ponto do segmento câmera → mancha que toca o retângulo da vista encolhido pela margem.
  const limL = meiaL - MARGEM_DA_SETA;
  const limA = meiaA - MARGEM_DA_SETA;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const k = ax * limA > ay * limL ? limL / ax : ay > 0 ? limA / ay : 1;
  const t = k < 1 ? k : 1;
  out.setaX = camX + dx * t;
  out.setaY = camY + dy * t;
  return out;
}
