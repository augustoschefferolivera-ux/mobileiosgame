// F-001.9: xoshiro128** confere com os vetores de referência dos autores e os
// fluxos são independentes (ADR-0002 §5).
import { describe, expect, it } from 'vitest';
import {
  FLUXOS,
  proximoU32,
  proximoUnitario,
  semear,
  sementeDoFluxo,
  splitmix32,
} from '../../src/logica/nucleo/rng';
import { baseDoFluxo, criarEstado } from '../../src/logica/nucleo/estado';

describe('xoshiro128**', () => {
  it('reproduz os vetores do xoshiro128starstar.c 1.1 com estado {1, 2, 3, 4}', () => {
    // Vetores do teste `reference` do crate rand_xoshiro, "produced with the reference
    // implementation (v1.1)"; conferidos também com uma transcrição em C compilada com gcc.
    const esperado = [
      11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034, 3734860849, 3729100597,
      4258142804,
    ];
    const s = new Uint32Array([1, 2, 3, 4]);
    expect(esperado.map(() => proximoU32(s, 0))).toEqual(esperado);
  });

  it('respeita o deslocamento e não toca as palavras vizinhas', () => {
    const s = new Uint32Array([7, 1, 2, 3, 4, 9]);
    expect(proximoU32(s, 1)).toBe(11520);
    expect(s[0]).toBe(7);
    expect(s[5]).toBe(9);
  });

  it('proximoUnitario fica em [0, 1)', () => {
    const s = new Uint32Array([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
    for (let i = 0; i < 10_000; i++) {
      const u = proximoUnitario(s, 0);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});

describe('splitmix32 (semeadura)', () => {
  it('confere com a transcrição em C (gcc)', () => {
    const c = new Uint32Array([0]);
    expect([0, 0, 0, 0].map(() => splitmix32(c))).toEqual([
      1684164658, 3653269916, 2939563536, 2141751570,
    ]);
    c[0] = 0xdeadbeef;
    expect([0, 0, 0, 0].map(() => splitmix32(c))).toEqual([
      46217145, 304148291, 1711218402, 2692075039,
    ]);
  });
});

describe('fluxos', () => {
  it('cada fluxo, e cada subfluxo por índice, tem semente própria', () => {
    const sementes = new Set<number>();
    for (const f of FLUXOS) for (let i = 0; i < 40; i++) sementes.add(sementeDoFluxo(42, f, i));
    expect(sementes.size).toBe(FLUXOS.length * 40);
  });

  it('a mesma seed gera os mesmos estados; outra seed gera outros', () => {
    const a = criarEstado(42);
    const b = criarEstado(42);
    const c = criarEstado(43);
    expect(Array.from(a.rng)).toEqual(Array.from(b.rng));
    expect(Array.from(a.rng)).not.toEqual(Array.from(c.rng));
  });

  it('consumir um fluxo não desloca a sequência de outro', () => {
    const a = criarEstado(7);
    const b = criarEstado(7);
    for (let i = 0; i < 1000; i++) proximoU32(a.rng, baseDoFluxo('drops'));
    const seqA = [0, 0, 0, 0, 0].map(() => proximoU32(a.rng, baseDoFluxo('diretor')));
    const seqB = [0, 0, 0, 0, 0].map(() => proximoU32(b.rng, baseDoFluxo('diretor')));
    expect(seqA).toEqual(seqB);
    const lvA = proximoU32(a.rng, baseDoFluxo('levelup'));
    const lvB = proximoU32(b.rng, baseDoFluxo('levelup'));
    expect(lvA).toBe(lvB);
  });

  it('cada fluxo tem as suas 4 palavras, disjuntas e cobrindo o bloco', () => {
    const e = criarEstado(1);
    const usadas = FLUXOS.flatMap((f) => [0, 1, 2, 3].map((i) => baseDoFluxo(f) + i)).sort((a, b) => a - b);
    expect(usadas).toEqual(Array.from({ length: e.rng.length }, (_, i) => i));
  });

  it.each(FLUXOS)('consumir %s não mexe em nenhum outro fluxo', (fluxo) => {
    const e = criarEstado(77);
    const controle = criarEstado(77);
    for (let i = 0; i < 1000; i++) proximoU32(e.rng, baseDoFluxo(fluxo));
    for (const outro of FLUXOS) {
      if (outro === fluxo) continue;
      const b = baseDoFluxo(outro);
      expect(Array.from(e.rng.slice(b, b + 4)), outro).toEqual(Array.from(controle.rng.slice(b, b + 4)));
    }
  });

  it('fluxos diferentes não andam juntos', () => {
    const e = criarEstado(1);
    const primeiras = FLUXOS.map((f) => proximoU32(e.rng, baseDoFluxo(f)));
    expect(new Set(primeiras).size).toBe(FLUXOS.length);
  });

  it('o subfluxo de um nível independe do consumo do fluxo principal', () => {
    const s1 = new Uint32Array(4);
    const s2 = new Uint32Array(4);
    semear(s1, 0, 99, 'levelup', 12);
    semear(s2, 0, 99, 'levelup', 12);
    expect(Array.from(s1)).toEqual(Array.from(s2));
    semear(s2, 0, 99, 'levelup', 13);
    expect(Array.from(s1)).not.toEqual(Array.from(s2));
  });

  it('a distribuição é plausível (média e baldes)', () => {
    const e = criarEstado(2026);
    const base = baseDoFluxo('diretor');
    const baldes = new Array<number>(10).fill(0);
    let soma = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const u = proximoUnitario(e.rng, base);
      soma += u;
      baldes[Math.floor(u * 10)]!++;
    }
    expect(Math.abs(soma / n - 0.5)).toBeLessThan(0.01);
    for (const b of baldes) expect(Math.abs(b - n / 10)).toBeLessThan(n / 100);
  });
});
