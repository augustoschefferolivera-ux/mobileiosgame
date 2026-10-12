// Os 3 sons placeholder (design/decisoes-F-006.md RE12 e FB4): duração, faixa [−1, 1], sem NaN, hash Float32 literal
// por som (a síntese usa Math.sin e exp, fora da simulação; o mesmo hash no Node e no Chromium, VT8), o limite de
// vozes e o intervalo mínimo por som.
import { describe, expect, it } from 'vitest';
import {
  DURACAO_DO_SFX,
  LIMITE_DE_SFX,
  LimiteDeVozes,
  SFX,
  TOTAL_DE_SFX,
  hashDoSfx,
  sintetizarAparo,
  sintetizarEsquivaPerfeita,
  sintetizarOsSfx,
  sintetizarQuebra,
} from '../../src/plataforma/sfx';

const HASH_A_44100 = ['fcaf7242', '649bae89', '3156cd4d'];
const HASH_A_48000 = ['4185cc21', '42525939', '88d6f25a'];

describe('síntese dos sons', () => {
  it.each([
    ['aparo', sintetizarAparo, 0.15],
    ['esquiva perfeita', sintetizarEsquivaPerfeita, 0.08],
    ['quebra', sintetizarQuebra, 0.25],
  ] as const)('%s: duração de %s s, valores em [−1, 1] e sem NaN', (_nome, sintetizar, segundos) => {
    for (const taxa of [44100, 48000]) {
      const a = sintetizar(taxa);
      expect(a).toBeInstanceOf(Float32Array);
      expect(a.length).toBe(Math.round(taxa * segundos));
      let max = 0;
      for (const v of a) {
        expect(Number.isFinite(v)).toBe(true);
        max = Math.max(max, Math.abs(v));
      }
      expect(max).toBeGreaterThan(0.3);
      expect(max).toBeLessThanOrEqual(1);
      // Começa e termina perto de zero: sem estalo.
      expect(Math.abs(a[0]!)).toBeLessThan(0.01);
      expect(Math.abs(a[a.length - 1]!)).toBeLessThan(0.05);
    }
  });

  it('as durações da tabela são as dos buffers', () => {
    expect(DURACAO_DO_SFX).toEqual([0.15, 0.08, 0.25]);
    expect(sintetizarOsSfx(44100).map((a) => a.length)).toEqual(DURACAO_DO_SFX.map((d) => Math.round(44100 * d)));
    expect(TOTAL_DE_SFX).toBe(3);
  });

  it('hash Float32 literal por som, a 44,1 e a 48 kHz', () => {
    expect(sintetizarOsSfx(44100).map(hashDoSfx)).toEqual(HASH_A_44100);
    expect(sintetizarOsSfx(48000).map(hashDoSfx)).toEqual(HASH_A_48000);
  });

  it('os três sons são distintos, e a síntese repetida dá o mesmo hash', () => {
    const [a, p, q] = sintetizarOsSfx(44100).map(hashDoSfx);
    expect(new Set([a, p, q]).size).toBe(3);
    expect(hashDoSfx(sintetizarQuebra(44100))).toBe(q);
  });
});

describe('limite de vozes e intervalo mínimo por som', () => {
  it('o 2º disparo do mesmo som a menos de 80 ms é recusado; a partir de 80 ms toca', () => {
    const l = new LimiteDeVozes();
    expect(l.tentar(SFX.aparo, 1000)).toBe(true);
    expect(l.tentar(SFX.aparo, 1000 + LIMITE_DE_SFX.intervaloMs - 1)).toBe(false);
    expect(l.tentar(SFX.aparo, 1000 + LIMITE_DE_SFX.intervaloMs)).toBe(true);
  });

  it('no máximo 2 vozes: a 3ª, com a 1ª ainda soando (aparo dura 150 ms), é recusada; depois que a 1ª acaba, toca', () => {
    const l = new LimiteDeVozes();
    expect(l.tentar(SFX.aparo, 0)).toBe(true);
    expect(l.tentar(SFX.aparo, 80)).toBe(true);
    expect(l.tentar(SFX.aparo, 149)).toBe(false);
    expect(l.tentar(SFX.aparo, 160)).toBe(true);
  });

  it('um aparo e uma esquiva perfeita no mesmo instante tocam os dois (o limite é por som)', () => {
    const l = new LimiteDeVozes();
    expect(l.tentar(SFX.aparo, 500)).toBe(true);
    expect(l.tentar(SFX.esquivaPerfeita, 500)).toBe(true);
    expect(l.tentar(SFX.quebra, 500)).toBe(true);
  });
});
