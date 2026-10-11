// Paleta provisória (brief §5.15: fundo #1a1f2b e brasa #ffb347; base do
// doc 13 §1.3 pela Q-27) e helpers de desenho das cenas. Formas geométricas
// até a arte, depois da F-010.
import Phaser from 'phaser';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import { t, type Parametros } from './textos';

/** As cores em uso; as demais da base do doc 13 entram com o que as usar. */
export const COR = {
  fundo: 0x1a1f2b,
  cinzaFrio: 0x2b3340,
  brasa: 0xffb347,
  laranjaQueimado: 0xe2652b,
  osso: 0xe8dcc4,
  sal: 0xdfe8ea,
} as const;

export const FONTE = 'system-ui, -apple-system, sans-serif';

/** Hex CSS de uma cor da paleta. */
export function css(cor: number): string {
  return `#${cor.toString(16).padStart(6, '0')}`;
}

/** Pontos lógicos por pixel do canvas: 390 × 844 @2× (B §3.2; ADR-0002 §11). */
export const ESCALA_DO_CANVAS = 2;

/** Câmera em pt lógicos: o canvas de 780 × 1688 com zoom 2 mostra 390 × 844. */
export function cameraLogica(cena: Phaser.Scene): void {
  cena.cameras.main.setZoom(ESCALA_DO_CANVAS).centerOn(LARGURA_LOGICA / 2, ALTURA_LOGICA / 2);
}

/**
 * Texto da tela a partir de um id de pt-BR.json, com resolução 2 para a
 * câmera em zoom 2. O id fica no objeto para __GAME_DEBUG__.textoAtivo.
 */
export function texto(
  cena: Phaser.Scene,
  x: number,
  y: number,
  id: string,
  tamanho: number,
  cor: number,
  params?: Parametros,
): Phaser.GameObjects.Text {
  const obj = cena.add.text(x, y, t(id, params), {
    fontFamily: FONTE,
    fontSize: `${tamanho}px`,
    color: css(cor),
    align: 'center',
    resolution: 2,
  });
  obj.setData('idTexto', id);
  return obj;
}
