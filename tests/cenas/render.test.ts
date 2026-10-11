// Render do mundo e câmera sem Phaser (design/decisoes-F-002.md §3 e §5): origem
// do triângulo no incentro, ângulo pela direção, molduras do atlas e câmera
// arredondada para 0,5 pt, contínua na costura.
import { describe, expect, it } from 'vitest';
import { MOLDURA, escalaPara, type NomeDaMoldura } from '../../src/cenas/render/atlas';
import { arredondarParaOPixel, centroDaCamera } from '../../src/cenas/render/camera';
import { ORIGEM_Y_DO_JOGADOR, anguloDoJogador } from '../../src/cenas/render/mundo';
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
