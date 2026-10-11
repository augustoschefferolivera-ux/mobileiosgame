// F-002.2: wrap de posição. Posição normalizada no toro 1.170 × 2.532 em
// Float32, interpolação com delta toroidal na costura em x e em y (ADR-0002 §3)
// e cópia mais próxima da câmera com o % corrigido (ADR-0002 §11).
import { describe, expect, it } from 'vitest';
import {
  ALTURA_DO_MAPA as H,
  LARGURA_DO_MAPA as W,
  copiaMaisProxima,
  deltaNoToro,
  interpolarNoToro,
  normalizarNoToro,
} from '../../../src/logica/mundo/toro';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../../../src/plataforma/safeArea';

describe('mapa', () => {
  it('3 × 3 telas de 390 × 844 dão o toro 1.170 × 2.532 (B §3.2)', () => {
    expect([W, H]).toEqual([1170, 2532]);
    expect([W / 3, H / 3]).toEqual([LARGURA_LOGICA, ALTURA_LOGICA]);
  });
});

describe('normalizarNoToro (Float32)', () => {
  it.each([
    [0, 0],
    [585, 585],
    [-2.4, Math.fround(W - 2.4)],
    [W, 0],
    // fround(1.172,4) perde precisão: o resultado é fround(fround(W + 2,4) − W).
    [W + 2.4, Math.fround(Math.fround(W + 2.4) - W)],
  ])('x = %s → %s', (v, esperado) => {
    expect(normalizarNoToro(v, W)).toBe(esperado);
  });

  it.each([
    ['x', W],
    ['y', H],
  ])('%s = −1e-5 e %s = L − 1e-5 caem em [0, L): x + L arredonda para L e vira 0', (_eixo, L) => {
    for (const v of [-1e-5, L - 1e-5]) {
      const n = normalizarNoToro(v, L);
      expect(n, `v = ${v}`).toBeGreaterThanOrEqual(0);
      expect(n, `v = ${v}`).toBeLessThan(L);
      expect(n, `v = ${v}`).toBe(Math.fround(n));
    }
    expect(normalizarNoToro(-1e-5, L)).toBe(0);
    expect(normalizarNoToro(L - 1e-5, L)).toBe(0);
  });

  it('o resultado é sempre um Float32 em [0, L) para v em [−L, 1,5 L]', () => {
    for (let i = 0; i <= 2500; i++) {
      const v = -W + (i * 2.5 * W) / 2500;
      const n = normalizarNoToro(v, W);
      expect(n >= 0 && n < W && n === Math.fround(n), `v = ${v}`).toBe(true);
    }
  });
});

describe('deltaNoToro (ADR-0002 §6)', () => {
  it.each([
    [10, 20, 10],
    [1168, 2, 4],
    [2, 1168, -4],
    [0, W / 2, W / 2],
    [0, W / 2 + 1, -(W / 2 - 1)],
  ])('de %s para %s = %s', (de, para, d) => {
    expect(deltaNoToro(de, para, W)).toBe(d);
  });

  it('em y, pela costura de 2.532', () => {
    expect(deltaNoToro(2530, 3, H)).toBe(5);
    expect(deltaNoToro(3, 2530, H)).toBe(-5);
  });
});

describe('interpolação na costura (ADR-0002 §3)', () => {
  const PASSO = 2.4;
  it.each([
    ['x', W],
    ['y', H],
  ])('cruzando a costura em %s com alfa = 0,5, a posição fica a menos de um passo de ant', (_eixo, L) => {
    const ant = Math.fround(L - 1.2);
    const atual = normalizarNoToro(ant + PASSO, L);
    expect(atual).toBeLessThan(PASSO);
    const meio = interpolarNoToro(ant, atual, 0.5, L);
    expect(Math.abs(meio - ant)).toBeLessThan(PASSO);
    expect(meio).toBeCloseTo(L, 3);
    // Sem o delta toroidal, o valor iria para o meio do mapa.
    expect(Math.abs(ant + (atual - ant) * 0.5 - ant)).toBeGreaterThan(L / 3);
  });

  it('o exemplo do ADR: ant = 1.168 e x = 2 com alfa = 0,5 dão 1.170, não 585', () => {
    expect(interpolarNoToro(1168, 2, 0.5, W)).toBe(1170);
  });

  it('alfa 0 e 1 dão ant e atual (a menos de L)', () => {
    expect(interpolarNoToro(1168, 2, 0, W)).toBe(1168);
    expect(interpolarNoToro(1168, 2, 1, W)).toBe(1172);
    expect(copiaMaisProxima(interpolarNoToro(1168, 2, 1, W), 2, W)).toBe(2);
  });
});

describe('cópia mais próxima da câmera (ADR-0002 §11)', () => {
  it('o exemplo do ADR: camX = 1.100 e x = 50 dão 1.220 (sem a correção do %, 50)', () => {
    expect(copiaMaisProxima(50, 1100, W)).toBe(1220);
    expect((50 - 1100 + W / 2) % W).toBeLessThan(0);
  });

  it('câmera perto de 0 com objeto perto de W, e o mesmo em y', () => {
    expect(copiaMaisProxima(1160, 5, W)).toBe(-10);
    expect(copiaMaisProxima(2520, 30, H)).toBe(-12);
    expect(copiaMaisProxima(10, 2500, H)).toBe(2542);
  });

  it('a cópia fica sempre a no máximo L/2 da câmera e difere de x por múltiplo de L', () => {
    for (let cam = 0; cam < W; cam += 37) {
      for (let x = 0; x < W; x += 41) {
        const c = copiaMaisProxima(x, cam, W);
        expect(c - cam).toBeGreaterThanOrEqual(-W / 2);
        expect(c - cam).toBeLessThan(W / 2);
        expect(Math.abs((c - x) / W - Math.round((c - x) / W))).toBeLessThan(1e-9);
      }
    }
  });
});
