// Pool de slots (ADR-0002 §4): pilha de livres + lista densa de ativos, em
// O(1), e handles que deixam de valer quando o slot é liberado.
import { describe, expect, it } from 'vitest';
import {
  alocar,
  bytesDoPool,
  esvaziarPool,
  handleDe,
  liberar,
  quantosAtivos,
  slotDoHandle,
  viewsDoPool,
} from '../../src/logica/nucleo/pool';

function novoPool(capacidade: number) {
  const pool = viewsDoPool(new ArrayBuffer(bytesDoPool(capacidade)), 0, capacidade);
  esvaziarPool(pool);
  return pool;
}

describe('pool', () => {
  it('as views cabem nos bytes calculados, alinhados a 4', () => {
    for (const cap of [1, 3, 500]) {
      expect(bytesDoPool(cap) % 4).toBe(0);
      expect(() => viewsDoPool(new ArrayBuffer(bytesDoPool(cap)), 0, cap)).not.toThrow();
    }
  });

  it('aloca os slots em ordem crescente e recusa com o pool cheio', () => {
    const pool = novoPool(4);
    expect([alocar(pool), alocar(pool), alocar(pool), alocar(pool)]).toEqual([0, 1, 2, 3]);
    expect(alocar(pool)).toBe(-1);
    expect(quantosAtivos(pool)).toBe(4);
  });

  it('liberar troca o último ativo para o lugar do liberado e reaproveita o slot', () => {
    const pool = novoPool(5);
    for (let i = 0; i < 5; i++) alocar(pool);
    liberar(pool, 1);
    expect(Array.from(pool.ativos.subarray(0, quantosAtivos(pool)))).toEqual([0, 4, 2, 3]);
    expect(pool.posicao[4]).toBe(1);
    expect(pool.posicao[1]).toBe(-1);
    liberar(pool, 3);
    expect(Array.from(pool.ativos.subarray(0, quantosAtivos(pool)))).toEqual([0, 4, 2]);
    // O último liberado sai primeiro (pilha).
    expect(alocar(pool)).toBe(3);
    expect(alocar(pool)).toBe(1);
    expect(() => liberar(pool, 3)).not.toThrow();
    expect(() => liberar(pool, 3)).toThrow();
  });

  it('o handle deixa de valer quando o slot é liberado e reaproveitado', () => {
    const pool = novoPool(2);
    const s = alocar(pool);
    const h = handleDe(pool, s);
    expect(slotDoHandle(pool, h)).toBe(s);
    liberar(pool, s);
    expect(slotDoHandle(pool, h)).toBe(-1);
    expect(alocar(pool)).toBe(s);
    expect(slotDoHandle(pool, h)).toBe(-1);
    expect(slotDoHandle(pool, handleDe(pool, s))).toBe(s);
  });

  it('a geração dá a volta em 16 bits', () => {
    const pool = novoPool(1);
    for (let i = 0; i < 65536; i++) liberar(pool, alocar(pool));
    expect(pool.geracao[0]).toBe(0);
  });
});
