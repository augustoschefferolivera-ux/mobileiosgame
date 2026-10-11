// F-002.1: vetor do joystick com zona morta 0,15 e raio 60 pt (B §3.5): nulo
// abaixo de 0,15 × 60 pt, saturado em 1 no raio, linear entre os dois
// (design/decisoes-F-002.md §4). Também o pino preso no raio e o teclado de debug.
import { describe, expect, it } from 'vitest';
import { RAIO_DO_JOYSTICK_PT, ZONA_MORTA, pinoDoJoystick, vetorDoJoystick } from '../../src/entrada/joystick';
import { vetorDoTeclado } from '../../src/entrada/teclado';

const v = (dx: number, dy: number) => vetorDoJoystick(dx, dy, { x: 0, y: 0 });
const modulo = (p: { x: number; y: number }) => Math.sqrt(p.x * p.x + p.y * p.y);

describe('vetor do joystick (F-002.1)', () => {
  it('raio de 60 pt e zona morta de 0,15 (9 pt), de B §3.5', () => {
    expect([RAIO_DO_JOYSTICK_PT, ZONA_MORTA]).toEqual([60, 0.15]);
  });

  it.each([0, 1, 5, 8.99, 9])('nulo com o dedo a %s pt da base (até 0,15 × 60 = 9 pt)', (d) => {
    expect(v(d, 0)).toEqual({ x: 0, y: 0 });
    expect(v(0, -d)).toEqual({ x: 0, y: 0 });
    expect(v((d * 3) / 5, (d * 4) / 5)).toEqual({ x: 0, y: 0 });
  });

  it('a zona morta é radial: 8,9 pt na diagonal ainda é nulo, mesmo com cada eixo acima de 6 pt', () => {
    expect(v(6.3, 6.29)).toEqual({ x: 0, y: 0 });
  });

  it('logo depois da zona morta o vetor começa de 0, sem salto', () => {
    expect(modulo(v(9.01, 0))).toBeGreaterThan(0);
    expect(modulo(v(9.01, 0))).toBeLessThan(0.001);
  });

  it.each([
    [34.5, 0.5],
    [60, 1],
    [61, 1],
    [120, 1],
    [600, 1],
  ])('a %s pt, |v| = %s (linear depois da zona morta, saturado no raio)', (d, m) => {
    expect(modulo(v(d, 0))).toBeCloseTo(m, 12);
    expect(modulo(v(-(d * 0.6), d * 0.8))).toBeCloseTo(m, 12);
  });

  it('a direção é a do dedo, e |v| nunca passa de 1', () => {
    const p = v(-30, 40);
    expect(p.x / modulo(p)).toBeCloseTo(-0.6, 12);
    expect(p.y / modulo(p)).toBeCloseTo(0.8, 12);
    for (let a = 0; a < 360; a += 7) {
      for (const d of [9, 20, 59.9, 60, 90]) {
        const rad = (a * Math.PI) / 180;
        expect(modulo(v(Math.cos(rad) * d, Math.sin(rad) * d))).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });
});

describe('pino do joystick', () => {
  it('acompanha o dedo dentro do raio e fica preso na borda fora dele', () => {
    expect(pinoDoJoystick(20, -10, { x: 0, y: 0 })).toEqual({ x: 20, y: -10 });
    const p = pinoDoJoystick(300, 400, { x: 0, y: 0 });
    expect(p.x).toBeCloseTo(36, 12);
    expect(p.y).toBeCloseTo(48, 12);
  });
});

describe('teclado de debug', () => {
  const t = (c: boolean, b: boolean, e: boolean, d: boolean) => vetorDoTeclado(c, b, e, d, { x: 0, y: 0 });
  it('8 direções com |v| = 1; a diagonal usa 1/√2 literal; opostas se anulam', () => {
    expect(t(true, false, false, false)).toEqual({ x: 0, y: -1 });
    expect(t(false, false, false, true)).toEqual({ x: 1, y: 0 });
    expect(t(false, true, true, false)).toEqual({ x: -0.7071067811865476, y: 0.7071067811865476 });
    expect(t(true, true, false, false)).toEqual({ x: 0, y: 0 });
    expect(t(true, true, true, true)).toEqual({ x: 0, y: 0 });
    expect(t(false, false, false, false)).toEqual({ x: 0, y: 0 });
  });
});
