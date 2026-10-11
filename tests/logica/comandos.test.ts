// ComandosDoPasso e fontes de comandos (ADR-0002 §12; design/decisoes-F-002.md
// §4 e §6): ao vivo, a mesma intenção em todos os passos do frame; em teste e
// replay, um roteiro por passo absoluto, em Float32.
import { describe, expect, it } from 'vitest';
import {
  criarComandos,
  fonteConstante,
  fonteDoRoteiro,
  validarRoteiro,
  type Roteiro,
} from '../../src/logica/nucleo/comandos';

const ler = (r: Roteiro, passo: number): [number, number] => {
  const c = criarComandos();
  fonteDoRoteiro(r).comandosDoPasso(passo, c);
  return [c.movimento[0]!, c.movimento[1]!];
};

describe('fonteDoRoteiro', () => {
  const r: Roteiro = [
    { passo: 3, mx: 1, my: 0 },
    { passo: 10, mx: 0, my: -0.5 },
    { passo: 11, mx: 0.1, my: 0.2 },
  ];

  it('vale o último trecho com passo ≤ o pedido; antes do 1º, parado', () => {
    expect(ler(r, 0)).toEqual([0, 0]);
    expect(ler(r, 2)).toEqual([0, 0]);
    expect(ler(r, 3)).toEqual([1, 0]);
    expect(ler(r, 9)).toEqual([1, 0]);
    expect(ler(r, 10)).toEqual([0, -0.5]);
    expect(ler(r, 5000)).toEqual([Math.fround(0.1), Math.fround(0.2)]);
  });

  it('serve qualquer ordem de consulta (o resultado só depende do passo)', () => {
    const f = fonteDoRoteiro(r);
    const c = criarComandos();
    const vistos = [11, 0, 10, 3, 2, 11].map((p) => {
      f.comandosDoPasso(p, c);
      return c.movimento[1];
    });
    expect(vistos).toEqual([Math.fround(0.2), 0, -0.5, 0, 0, Math.fround(0.2)]);
  });

  it('roteiro vazio é parado', () => {
    expect(ler([], 42)).toEqual([0, 0]);
  });

  it.each([
    ['passo repetido', [{ passo: 1, mx: 0, my: 0 }, { passo: 1, mx: 1, my: 0 }]],
    ['passo decrescente', [{ passo: 5, mx: 0, my: 0 }, { passo: 4, mx: 1, my: 0 }]],
    ['passo negativo', [{ passo: -1, mx: 0, my: 0 }]],
    ['passo fracionário', [{ passo: 1.5, mx: 0, my: 0 }]],
    ['|v| > 1', [{ passo: 0, mx: 0.8, my: 0.8 }]],
    ['NaN', [{ passo: 0, mx: Number.NaN, my: 0 }]],
  ])('%s é erro', (_nome, roteiro) => {
    expect(() => validarRoteiro(roteiro)).toThrow();
    expect(() => fonteDoRoteiro(roteiro)).toThrow();
  });

  it('a diagonal literal 1/√2 em Float32 cabe em |v| ≤ 1', () => {
    const r2 = Math.fround(0.7071067811865476);
    expect(() => validarRoteiro([{ passo: 0, mx: r2, my: r2 }])).not.toThrow();
  });
});

describe('fonteConstante', () => {
  it('copia a intenção do frame em todos os passos', () => {
    const doFrame = criarComandos();
    doFrame.movimento[0] = 0.25;
    const f = fonteConstante(doFrame);
    const c = criarComandos();
    for (const p of [0, 1, 99]) {
      f.comandosDoPasso(p, c);
      expect([c.movimento[0], c.movimento[1]]).toEqual([0.25, 0]);
    }
    doFrame.movimento[0] = -1;
    f.comandosDoPasso(100, c);
    expect(c.movimento[0]).toBe(-1);
  });
});
