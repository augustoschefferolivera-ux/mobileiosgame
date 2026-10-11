// Render do mundo e câmera sem Phaser (design/decisoes-F-002.md §3 e §5): origem
// do triângulo no incentro, ângulo pela direção, molduras do atlas e câmera
// arredondada para 0,5 pt, contínua na costura.
import { describe, expect, it } from 'vitest';
import { MOLDURA, escalaPara, type NomeDaMoldura } from '../../src/cenas/render/atlas';
import { arredondarParaOPixel, centroDaCamera } from '../../src/cenas/render/camera';
import { ORIGEM_Y_DO_JOGADOR, RenderPorImagem, anguloDoJogador } from '../../src/cenas/render/mundo';
import type Phaser from 'phaser';
import { criarDadosDaVigilia } from '../../src/logica/mundo/dados';
import { JOGADOR as J, criarEstado } from '../../src/logica/nucleo/estado';
import { LARGURA_DO_MAPA as W, deltaNoToro } from '../../src/logica/mundo/toro';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('triângulo do jogador', () => {
  it('a origem é o incentro: (0,5; ≈ 0,691), ≈ 14,83 px acima da base', () => {
    expect(ORIGEM_Y_DO_JOGADOR).toBeCloseTo(0.691, 3);
    expect(48 * (1 - ORIGEM_Y_DO_JOGADOR)).toBeCloseTo(14.83, 2);
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
      expect(m.x + m.lado).toBeLessThanOrEqual(512);
      expect(m.y + m.lado).toBeLessThanOrEqual(512);
      for (const b of nomes) {
        if (a === b) continue;
        const n = MOLDURA[b];
        const separadas = m.x + m.lado <= n.x || n.x + n.lado <= m.x || m.y + m.lado <= n.y || n.y + n.lado <= m.y;
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

describe('render por Image (cópia mais próxima da câmera)', () => {
  /** Cena falsa: só o que o RenderPorImagem usa (add.image, add.layer e os setters). */
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
          setPosition: (nx: number, ny: number) => Object.assign(img, { x: nx, y: ny }),
        };
        imagens.push(img);
        return img;
      },
    };
    return { cena: { add } as unknown as Phaser.Scene, imagens };
  }

  it('um obstáculo em x = 40 com a câmera em 1.150 é desenhado em 1.210; o jogador, no pixel da câmera', () => {
    const dados = criarDadosDaVigilia(
      { inicio_jogador: { x: 1150, y: 2520 }, obstaculos: [{ x: 40, y: 10, tamanho_px: 64 }] },
      { velocidade: 1 },
    );
    const { cena, imagens } = cenaFalsa();
    const render = new RenderPorImagem(cena, dados);
    const e = criarEstado(1, dados);
    e.jogador[J.x] = e.jogador[J.xAnt] = 1150.2;
    render.sincronizar(e, 0, 1150, 2520);
    expect(imagens[0]).toMatchObject({ x: 1210, y: 2542 });
    expect(imagens[1]).toMatchObject({ x: 1150, y: 2520 });
  });
});
