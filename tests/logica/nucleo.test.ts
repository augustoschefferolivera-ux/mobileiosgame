// Hash, conversão de segundos em passos (F-001.12) e acumulador (F-001.5).
import { describe, expect, it } from 'vitest';
import { FNV_BASE, fnv1aBytes, fnv1aTexto, fnv1aU32, hex8 } from '../../src/logica/nucleo/hash';
import {
  MAX_PASSOS_POR_FRAME,
  PASSO_MS,
  PASSOS_POR_SEGUNDO,
  segundosEmPassos,
} from '../../src/logica/nucleo/passos';
import { alfa, avancarAcumulador, criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { fonteDoRoteiro } from '../../src/logica/nucleo/comandos';
import { rodarFrame, rodarFrameComPausas } from '../../src/logica/nucleo/driver';
import { CAB, criarEstado, hashEstado } from '../../src/logica/nucleo/estado';
import { ROTEIRO_REFERENCIA } from '../../src/logica/nucleo/referencia';
import { DADOS_DA_CHARNECA as D, PARADO } from './apoio';

const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('FNV-1a 32', () => {
  it('confere com os vetores públicos', () => {
    expect(hex8(fnv1aBytes(FNV_BASE, bytes('')))).toBe('811c9dc5');
    expect(hex8(fnv1aBytes(FNV_BASE, bytes('a')))).toBe('e40c292c');
    expect(hex8(fnv1aBytes(FNV_BASE, bytes('foobar')))).toBe('bf9cf968');
  });

  it('fnv1aTexto e fnv1aU32 equivalem aos bytes', () => {
    expect(fnv1aTexto(FNV_BASE, 'foobar')).toBe(fnv1aBytes(FNV_BASE, bytes('foobar')));
    expect(fnv1aU32(FNV_BASE, 0x04030201)).toBe(fnv1aBytes(FNV_BASE, new Uint8Array([1, 2, 3, 4])));
    expect(() => fnv1aTexto(FNV_BASE, 'ç')).toThrow();
  });
});

describe('segundos em passos (ADR-0002 §3)', () => {
  it('passo de 60 Hz e teto de 5 por frame (B §3.1)', () => {
    expect(PASSOS_POR_SEGUNDO).toBe(60);
    expect(PASSO_MS).toBeCloseTo(16.667, 3);
    expect(MAX_PASSOS_POR_FRAME).toBe(5);
  });

  it.each([
    [0.5, 30],
    [2, 120],
    [0.6, 36],
    [1.5, 90],
    [0.08, 5], // congelamento de 80 ms (brief §11.3 F-006)
    [0.07, 4], // 4,2: arredonda para baixo (descarta Math.ceil)
    [0.025, 2], // 1,5: meio passo arredonda para cima (Math.round)
    [1.2, 72],
    [0.9, 54],
    [3, 180],
    [1, 60],
    [10, 600],
  ])('%s s = %i passos', (s, p) => {
    expect(segundosEmPassos(s)).toBe(p);
  });
});

describe('acumulador', () => {
  it('1 frame de 16,67 ms = 1 passo; o resto vira alfa', () => {
    const acc = criarAcumulador();
    expect(avancarAcumulador(acc, PASSO_MS)).toBe(1);
    expect(avancarAcumulador(acc, PASSO_MS / 2)).toBe(0);
    expect(alfa(acc)).toBeCloseTo(0.5, 9);
    expect(avancarAcumulador(acc, PASSO_MS / 2)).toBe(1);
  });

  it('30 fps dá 2 passos por frame', () => {
    const acc = criarAcumulador();
    let total = 0;
    for (let i = 0; i < 30; i++) total += avancarAcumulador(acc, 1000 / 30);
    expect(total).toBe(60);
  });

  it('fronteira do teto: 5 passos num frame não perdem nada; 6 perdem 1', () => {
    const a5 = criarAcumulador();
    expect(avancarAcumulador(a5, 5 * PASSO_MS)).toBe(5);
    expect(a5.passosPerdidos).toBe(0);
    const a6 = criarAcumulador();
    expect(avancarAcumulador(a6, 6 * PASSO_MS)).toBe(5);
    expect(a6.passosPerdidos).toBe(1);
  });

  it('roda no máximo 5 passos e soma o excedente em passosPerdidos', () => {
    const acc = criarAcumulador();
    expect(avancarAcumulador(acc, 8 * PASSO_MS)).toBe(5);
    expect(acc.passosPerdidos).toBe(3);
    expect(avancarAcumulador(acc, 1000)).toBe(5);
    expect(acc.passosPerdidos).toBe(3 + 55);
  });

  it('5 × PASSO_MS por frame dá 5 passos, sem perder nenhum por arredondamento', () => {
    const acc = criarAcumulador();
    let total = 0;
    for (let i = 0; i < 200; i++) total += avancarAcumulador(acc, 5 * PASSO_MS);
    expect(total).toBe(1000);
    expect(acc.passosPerdidos).toBe(0);
  });

  it('delta zero, negativo ou NaN não roda passo', () => {
    const acc = criarAcumulador();
    expect(avancarAcumulador(acc, 0)).toBe(0);
    expect(avancarAcumulador(acc, -5)).toBe(0);
    expect(avancarAcumulador(acc, Number.NaN)).toBe(0);
    expect(acc.restoMs).toBe(0);
  });

  it('alfa fica em [0, 1) com deltas irregulares', () => {
    const acc = criarAcumulador();
    for (let i = 0; i < 5000; i++) {
      avancarAcumulador(acc, 3 + ((i * 7919) % 41));
      const a = alfa(acc);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
  });
});

describe('driver de produção (rodarFrame)', () => {
  it('roda exatamente os passos do acumulador, no máximo 5, e conta os perdidos', () => {
    const e = criarEstado(1, D);
    const acc = criarAcumulador();
    expect(rodarFrame(e, D, acc, PASSO_MS, PARADO)).toBe(1);
    expect(e.cab[CAB.passo]).toBe(1);
    expect(rodarFrame(e, D, acc, PASSO_MS / 2, PARADO)).toBe(0);
    expect(rodarFrame(e, D, acc, PASSO_MS / 2, PARADO)).toBe(1);
    expect(rodarFrame(e, D, acc, 8 * PASSO_MS, PARADO)).toBe(5);
    expect(e.cab[CAB.passo]).toBe(7);
    expect(acc.passosPerdidos).toBe(3);
  });

  it('1 s de frames a 60 Hz e a 30 Hz dá 60 passos', () => {
    for (const fps of [60, 30]) {
      const e = criarEstado(1, D);
      const acc = criarAcumulador();
      for (let i = 0; i < fps; i++) rodarFrame(e, D, acc, 1000 / fps, PARADO);
      expect(e.cab[CAB.passo], `${fps} fps`).toBe(60);
    }
  });
});

describe('portão das pausas do driver (design/decisoes-F-004.md P4)', () => {
  it('N quadros com K pausados no meio dão o mesmo passo e o mesmo hash que N − K sem pausa, sem passos perdidos', () => {
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    const a = criarEstado(1, D);
    const accA = criarAcumulador();
    for (let q = 0; q < 300; q++) rodarFrameComPausas(a, D, accA, 1000 / 60, fonte, false, false);
    const b = criarEstado(1, D);
    const accB = criarAcumulador();
    for (let q = 0; q < 500; q++) {
      const pausada = q >= 100 && q < 300;
      // Quadros longos na pausa (a 8 fps): sem portão no acumulador, virariam passos perdidos ou rajada.
      rodarFrameComPausas(b, D, accB, pausada ? 125 : 1000 / 60, fonte, pausada && q % 2 === 0, pausada && q % 2 === 1);
    }
    expect(b.cab[CAB.passo]).toBe(a.cab[CAB.passo]);
    expect(hashEstado(b)).toBe(hashEstado(a));
    expect(accB.passosPerdidos).toBe(0);
  });
});
