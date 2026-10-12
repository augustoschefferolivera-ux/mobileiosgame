// Tabela literal das direções do anel de spawn (ADR-0002 §5; design/decisoes-F-003.md §4, R4).
import { describe, expect, it } from 'vitest';
import { DIRECAO_X as X, DIRECAO_Y as Y, DIRECOES } from '../../../src/logica/mundo/direcoes';

/** cos(360°/256), literal, para o passo entre vizinhas. */
const COS_DO_PASSO = 0.9996988186962042;

describe('direções do anel', () => {
  it('256 vetores unitários, com |v|² a até 4e-16 de 1', () => {
    expect(DIRECOES).toBe(256);
    for (let k = 0; k < DIRECOES; k++) expect(Math.abs(X[k]! * X[k]! + Y[k]! * Y[k]! - 1), `k = ${k}`).toBeLessThanOrEqual(4e-16);
  });

  it('antipodal e rotação de 90° bit a bit: v[k + 128] = −v[k] e v[k + 64] = (−y, x)', () => {
    for (let k = 0; k < DIRECOES; k++) {
      expect([X[(k + 128) % 256], Y[(k + 128) % 256]]).toEqual([-X[k]!, -Y[k]!]);
      expect([X[(k + 64) % 256], Y[(k + 64) % 256]]).toEqual([-Y[k]!, X[k]!]);
    }
  });

  it('giram no sentido crescente, com o passo de 360°/256 entre vizinhas', () => {
    for (let k = 0; k < DIRECOES; k++) {
      const j = (k + 1) % DIRECOES;
      expect(X[k]! * Y[j]! - Y[k]! * X[j]!, `k = ${k}`).toBeGreaterThan(0);
      expect(X[k]! * X[j]! + Y[k]! * Y[j]!).toBeCloseTo(COS_DO_PASSO, 12);
    }
    // A 1ª entrada fica a meio passo do eixo +x.
    expect(Math.abs(Y[0]! / X[0]! - Math.tan(Math.PI / 256))).toBeLessThan(1e-15);
  });

  it('nenhuma entrada é perpendicular a uma das 8 direções do teclado (nem tem componente 0)', () => {
    const R2 = 0.7071067811865476;
    const teclado = [[1, 0], [0, 1], [-1, 0], [0, -1], [R2, R2], [-R2, R2], [R2, -R2], [-R2, -R2]] as const;
    for (let k = 0; k < DIRECOES; k++) {
      expect(X[k]).not.toBe(0);
      expect(Y[k]).not.toBe(0);
      for (const [dx, dy] of teclado) expect(Math.abs(X[k]! * dx + Y[k]! * dy)).toBeGreaterThan(1e-3);
    }
  });
});
