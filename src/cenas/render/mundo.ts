// Render do mundo da Vigília (ADR-0002 §3 e §11; design/decisoes-F-002.md §5).
// A interface nasce com a implementação por Image (o plano B do ADR-0002); o
// SpriteGPULayer, caminho principal, entra na F-003 atrás da mesma interface,
// junto com a horda. Na F-002 há 55 objetos: 54 obstáculos e o jogador. Cada um
// é desenhado na cópia mais próxima da câmera; o jogador, na posição
// interpolada pelo delta toroidal, arredondada para o pixel do canvas como a
// câmera. Camadas: chão (vazio no MVP), obstáculos e jogador. Nada é alocado
// por frame.
import type Phaser from 'phaser';
import { JOGADOR, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, copiaMaisProxima, interpolarNoToro } from '../../logica/mundo/toro';
import { COR } from '../estilo';
import { CHAVE_DO_ATLAS, escalaPara } from './atlas';
import { arredondarParaOPixel } from './camera';

export interface RenderDoMundo {
  /** Desenha o estado interpolado por `alfa`, com a câmera centrada em (camX, camY), em px lógicos. */
  sincronizar(e: Estado, alfa: number, camX: number, camY: number): void;
}

/** Triângulo do jogador: base e altura de 48 px (design/decisoes-F-002.md §5). */
const BASE_DO_TRIANGULO = 48;
const ALTURA_DO_TRIANGULO = 48;
/** Incentro: r = área ÷ semiperímetro ≈ 14,83 px acima da base; é a posição (x, y) e o pivô da rotação (§3). */
const LADO_DO_TRIANGULO = Math.sqrt((BASE_DO_TRIANGULO / 2) ** 2 + ALTURA_DO_TRIANGULO ** 2);
const INRAIO = (BASE_DO_TRIANGULO * ALTURA_DO_TRIANGULO) / (BASE_DO_TRIANGULO + 2 * LADO_DO_TRIANGULO);
/** Origem do sprite com a ponta para cima: (0,5; ≈ 0,691). */
export const ORIGEM_Y_DO_JOGADOR = (ALTURA_DO_TRIANGULO - INRAIO) / ALTURA_DO_TRIANGULO;

/** Ângulo do triângulo para a direção (dirX, dirY): 0 aponta para cima. */
export function anguloDoJogador(dirX: number, dirY: number): number {
  return Math.atan2(dirY, dirX) + Math.PI / 2;
}

export class RenderPorImagem implements RenderDoMundo {
  private readonly obstaculos: Phaser.GameObjects.Image[] = [];
  private readonly jogador: Phaser.GameObjects.Image;

  constructor(
    cena: Phaser.Scene,
    private readonly dados: DadosDaVigilia,
  ) {
    cena.add.layer(); // chão: vazio até a arte (§5, C1)
    const camadaDosObstaculos = cena.add.layer();
    const o = dados.obstaculos;
    for (let i = 0; i < o.n; i++) {
      const img = cena.add
        .image(o.x[i]!, o.y[i]!, CHAVE_DO_ATLAS, 'circulo')
        .setTint(COR.cinzaFrio)
        .setScale(escalaPara('circulo', o.r[i]! * 2));
      camadaDosObstaculos.add(img);
      this.obstaculos.push(img);
    }
    this.jogador = cena.add
      .image(dados.inicioX, dados.inicioY, CHAVE_DO_ATLAS, 'triangulo')
      .setTint(COR.brasa)
      .setOrigin(0.5, ORIGEM_Y_DO_JOGADOR)
      .setScale(escalaPara('triangulo', BASE_DO_TRIANGULO));
    cena.add.layer([this.jogador]);
  }

  sincronizar(e: Estado, alfa: number, camX: number, camY: number): void {
    const o = this.dados.obstaculos;
    for (let i = 0; i < o.n; i++) {
      this.obstaculos[i]!.setPosition(copiaMaisProxima(o.x[i]!, camX, LARGURA_DO_MAPA), copiaMaisProxima(o.y[i]!, camY, ALTURA_DO_MAPA));
    }
    const j = e.jogador;
    // Arredondado como a câmera (C2): o triângulo fica no mesmo pixel, sem tremor sub-pixel no centro da tela.
    const x = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.xAnt]!, j[JOGADOR.x]!, alfa, LARGURA_DO_MAPA));
    const y = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.yAnt]!, j[JOGADOR.y]!, alfa, ALTURA_DO_MAPA));
    this.jogador.setPosition(copiaMaisProxima(x, camX, LARGURA_DO_MAPA), copiaMaisProxima(y, camY, ALTURA_DO_MAPA));
    this.jogador.setRotation(anguloDoJogador(j[JOGADOR.dirX]!, j[JOGADOR.dirY]!));
  }
}
