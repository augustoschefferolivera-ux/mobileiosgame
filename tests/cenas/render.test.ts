// Render do mundo e câmera sem Phaser (design/decisoes-F-002.md §3 e §5; F-011):
// o quadro do Aldric pelo estado, o ângulo da direção em 16 passos, as molduras
// do atlas e a câmera arredondada para 0,5 pt, contínua na costura.
import { describe, expect, it } from 'vitest';
import { MOLDURA, escalaPara, type NomeDaMoldura } from '../../src/cenas/render/atlas';
import { arredondarParaOPixel, centroDaCamera } from '../../src/cenas/render/camera';
import { RenderDaVigilia, anguloDoJogador } from '../../src/cenas/render/mundo';
import { QUADROS_DO_ALDRIC, aldricEspelhado, quadroDoAldric } from '../../src/cenas/render/aldric';
import { direcao16 } from '../../src/cenas/render/arte';
import type Phaser from 'phaser';
import { CAB, FASE, JOGADOR as J, JOGADOR3, JOGADOR3_U8, JOGADOR4_U8, criarEstado } from '../../src/logica/nucleo/estado';
import { LARGURA_DO_MAPA as W, deltaNoToro } from '../../src/logica/mundo/toro';
import { DADOS_SEM_OBSTACULOS as D, dadosDe } from '../logica/apoio';

describe('Aldric (F-011)', () => {
  it('o quadro pelo estado: parado, andar, esquiva, aparo, Frasco e Apagar', () => {
    const e = criarEstado(1, D);
    e.cab[CAB.passo] = 0;
    expect(quadroDoAldric(e)).toBe(QUADROS_DO_ALDRIC.parado[0]);
    e.cab[CAB.passo] = 32;
    expect(quadroDoAldric(e)).toBe(QUADROS_DO_ALDRIC.parado[1]);
    e.jogador[J.x] = e.jogador[J.xAnt]! + 2;
    e.cab[CAB.passo] = 8;
    expect(quadroDoAldric(e)).toBe(QUADROS_DO_ALDRIC.andar[1]);
    e.jogador4U8[JOGADOR4_U8.frascoPasso] = 5;
    expect(quadroDoAldric(e)).toBe(QUADROS_DO_ALDRIC.frasco[0]);
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 12;
    expect(QUADROS_DO_ALDRIC.aparo).toContain(quadroDoAldric(e));
    for (const [passo, quadro] of [[1, QUADROS_DO_ALDRIC.agachado], [10, QUADROS_DO_ALDRIC.rolando], [21, QUADROS_DO_ALDRIC.agachado]] as const) {
      e.jogador3U8[JOGADOR3_U8.esquivaPasso] = passo;
      expect(quadroDoAldric(e)).toBe(quadro);
    }
    e.jogador4U8[JOGADOR4_U8.fase] = FASE.apagando;
    for (const [p, q] of [[0, 0], [12, 1], [20, 2], [29, 3]] as const) {
      e.jogador4U8[JOGADOR4_U8.apagandoPassos] = p;
      expect(quadroDoAldric(e)).toBe(QUADROS_DO_ALDRIC.apagar[q]);
    }
  });

  it('espelhado para a esquerda pela última direção, ou pela direção da esquiva em curso', () => {
    const e = criarEstado(1, D);
    e.jogador[J.dirX] = -1;
    expect(aldricEspelhado(e)).toBe(true);
    e.jogador[J.dirX] = 0;
    expect(aldricEspelhado(e)).toBe(false);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 3;
    e.jogador3[JOGADOR3.esquivaDirX] = -0.7;
    expect(aldricEspelhado(e)).toBe(true);
  });

  it('a direção em 16 passos: o desenho de 0 a 3 e o giro em múltiplos de 90°', () => {
    const d = { base: 0, rotacao: 0 };
    for (const [ang, base, quartos] of [[0, 0, 0], [Math.PI / 8, 1, 0], [Math.PI / 2, 0, 1], [(3 * Math.PI) / 4 + 0.01, 2, 1], [-Math.PI / 8, 3, 3], [Math.PI, 0, 2]] as const) {
      direcao16(ang, d);
      expect([d.base, d.rotacao], `${ang}`).toEqual([base, (quartos * Math.PI) / 2]);
    }
  });

  it.each([
    [0, -1, 0],
    [1, 0, Math.PI / 2],
    [0, 1, Math.PI],
    [-1, 0, -Math.PI / 2],
  ])('direção (%s, %s) → %s rad (0 = ponta para cima)', (x, y, a) => {
    const d = anguloDoJogador(x, y) - a;
    expect(Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))).toBeLessThan(1e-12);
  });
});

describe('atlas', () => {
  it('as molduras estão a 2× e cabem em 512 × 512 sem se sobrepor', () => {
    expect([escalaPara('circulo', 96), escalaPara('triangulo', 48), escalaPara('disco', 120), escalaPara('disco', 48)]).toEqual([
      0.5, 0.5, 0.5, 0.2,
    ]);
    const nomes = Object.keys(MOLDURA) as NomeDaMoldura[];
    for (const a of nomes) {
      const m = MOLDURA[a];
      expect(m.x + m.largura).toBeLessThanOrEqual(512);
      expect(m.y + m.altura).toBeLessThanOrEqual(512);
      for (const b of nomes) {
        if (a === b) continue;
        const n = MOLDURA[b];
        const separadas = m.x + m.largura <= n.x || n.x + n.largura <= m.x || m.y + m.altura <= n.y || n.y + n.altura <= m.y;
        expect(separadas, `${a} × ${b}`).toBe(true);
      }
    }
  });
});

describe('câmera (§5)', () => {
  it('arredonda para 0,5 pt (1 px do canvas)', () => {
    expect([0.24, 0.26, 0.74, 585.3, 585.2].map(arredondarParaOPixel)).toEqual([0, 0.5, 0.5, 585.5, 585]);
  });

  it('o centro da câmera sai arredondado: jogador em (585,3; 1.266,2) dá (585,5; 1.266)', () => {
    const e = criarEstado(1, D);
    e.jogador[J.x] = e.jogador[J.xAnt] = 585.3;
    e.jogador[J.y] = e.jogador[J.yAnt] = 1266.2;
    const c = { x: 0, y: 0 };
    centroDaCamera(e, 0, c);
    expect(c).toEqual({ x: 585.5, y: 1266 });
  });

  it('centra no jogador interpolado; na costura fica contínua e em [0, W)', () => {
    const e = criarEstado(1, D);
    const c = { x: 0, y: 0 };
    centroDaCamera(e, 0.5, c);
    expect(c).toEqual({ x: D.inicioX, y: D.inicioY });
    e.jogador[J.xAnt] = W - 1.2;
    e.jogador[J.x] = 1.2;
    const vistos: number[] = [];
    for (const a of [0, 0.25, 0.5, 0.75, 0.99]) {
      centroDaCamera(e, a, c);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(W);
      vistos.push(c.x);
    }
    for (let i = 1; i < vistos.length; i++) expect(Math.abs(deltaNoToro(vistos[i - 1]!, vistos[i]!, W))).toBeLessThanOrEqual(1);
  });
});

describe('render do mundo: obstáculos e jogador (cópia mais próxima da câmera)', () => {
  /** Cena falsa: só o que o RenderDaVigilia usa (add.image, add.layer e os setters). */
  function cenaFalsa(): { cena: Phaser.Scene; imagens: { x: number; y: number }[] } {
    const imagens: { x: number; y: number }[] = [];
    const add = {
      layer: () => ({ add: () => undefined }),
      image: (x: number, y: number) => {
        const img = {
          x,
          y,
          setTint: () => img,
          setScale: () => img,
          setOrigin: () => img,
          setRotation: () => img,
          setFrame: () => img,
          setAlpha: () => img,
          setVisible: () => img,
          setBlendMode: () => img,
          setPosition: (nx: number, ny: number) => Object.assign(img, { x: nx, y: ny }),
        };
        imagens.push(img);
        return img;
      },
      tileSprite: () => {
        const t = { setScale: () => t, setPosition: () => t, setTilePosition: () => t };
        return t;
      },
    };
    return { cena: { add } as unknown as Phaser.Scene, imagens };
  }

  it('um obstáculo em x = 40 com a câmera em 1.150 é desenhado em 1.210; o jogador, no pixel da câmera', () => {
    const dados = dadosDe({ inicio_jogador: { x: 1150, y: 2520 }, obstaculos: [{ x: 40, y: 10, tamanho_px: 64 }] });
    const { cena, imagens } = cenaFalsa();
    const render = new RenderDaVigilia(cena, dados, null);
    const e = criarEstado(1, dados);
    e.jogador[J.x] = e.jogador[J.xAnt] = 1150.2;
    render.sincronizar(e, 0, 1150, 2520);
    expect(imagens[0]).toMatchObject({ x: 1210, y: 2542 });
    // Depois dos obstáculos: a luz da brasa, o marcador, os 2 rastros e o corpo do Aldric, no pixel da câmera.
    expect(imagens[1]).toMatchObject({ x: 1150, y: 2520 });
    expect(imagens[5]).toMatchObject({ x: 1150, y: 2520 });
  });
});
