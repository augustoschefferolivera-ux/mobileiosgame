// F-010.2 e F-010.7 (design/decisoes-F-010.md FD2, FD8, FD9): compra e reembolso da Fundação em funções puras, as recusas
// sem débito e sem gravação, os nós bloqueados fora de `G`.
import { describe, expect, it } from 'vitest';
import { NO, NOS_DA_FUNDACAO, comprar, custoDaCompra, custoDoRank, foiRecusado, reembolsar, somaDeRanks } from '../../../src/logica/progressao/fundacao';
import { lerMeta, metaPadrao, serializarMeta, type Meta } from '../../../src/logica/save/meta';

const comAlmas = (almas: number): Meta => ({ ...metaPadrao(), almas });
function comprarOuFalhar(m: Meta, idx: number): Meta {
  const r = comprar(m, idx);
  if (foiRecusado(r)) throw new Error(`recusado: ${r.recusa}`);
  return r;
}

describe('comprar e reembolsar (F-010.2)', () => {
  it('Fôlego ×3 e Casco ×1 com 3.000 Almas; reembolsar devolve tudo e zera os 8 ranks, o gasto e G', () => {
    let m = comAlmas(3000);
    const custos: number[] = [];
    for (const idx of [NO.folego, NO.folego, NO.folego, NO.casco]) {
      custos.push(custoDaCompra(m, idx)!);
      m = comprarOuFalhar(m, idx);
    }
    // G = 0, 1, 2, 3: 300; 341 (rank 2, G 1); 388 (rank 3, G 2); 300 × 1,045 = 313,5 → 314 (rank 1 do Casco, G 3).
    expect(custos).toEqual([300, 341, 388, custoDoRank(300, 1, 3)]);
    expect(custoDoRank(300, 1, 3)).toBe(314);
    const gasto = custos.reduce((s, c) => s + c, 0);
    expect(m.fundacao.ranks).toEqual([0, 0, 3, 0, 1, 0, 0, 0]);
    expect([m.fundacao.gasto, m.almas, somaDeRanks(m.fundacao.ranks), m.seq]).toEqual([gasto, 3000 - gasto, 4, 4]);

    const r = reembolsar(m);
    if (foiRecusado(r)) throw new Error(r.recusa);
    expect(r.fundacao).toEqual({ ranks: [0, 0, 0, 0, 0, 0, 0, 0], gasto: 0 });
    expect([r.almas, somaDeRanks(r.fundacao.ranks), r.seq]).toEqual([3000, 0, m.seq + 1]);
    // Reembolsar de novo é recusado, e o custo da próxima compra volta a 300.
    expect(reembolsar(r)).toEqual({ recusa: 'nada_a_reembolsar' });
    expect(custoDaCompra(r, NO.folego)).toBe(300);
    expect(custoDaCompra(r, NO.pele)).toBe(300);
  });

  it('a compra não muda o meta de entrada (funções puras) e grava os campos que a D10 manda', () => {
    const antes = comAlmas(1000);
    const copia = JSON.stringify(antes);
    const depois = comprarOuFalhar(antes, NO.pele);
    expect(JSON.stringify(antes)).toBe(copia);
    expect(depois).toMatchObject({ almas: 700, seq: 1, soma: '', fundacao: { ranks: [0, 1, 0, 0, 0, 0, 0, 0], gasto: 300 } });
  });

  it('o custo cresce com G e com o rank (FD3), e o meta comprado é um meta válido ida e volta', () => {
    let m = comAlmas(10_000);
    m = comprarOuFalhar(m, NO.pele); // 300 (G 0)
    m = comprarOuFalhar(m, NO.folego); // 305 (G 1)
    expect(m.almas).toBe(10_000 - 300 - 305);
    expect(custoDaCompra(m, NO.pele)).toBe(custoDoRank(300, 2, 2));
    expect(lerMeta(serializarMeta(m)).fundacao).toEqual(m.fundacao);
  });

  it('recusa com Almas abaixo do custo (sem_almas), sem débito e sem seq', () => {
    const m = comAlmas(299);
    expect(comprar(m, NO.pele)).toEqual({ recusa: 'sem_almas' });
    expect(comprar(comAlmas(300), NO.pele)).toMatchObject({ almas: 0 });
  });

  it('recusa o rank máximo (maximo): 5 ranks do Fôlego e depois nada', () => {
    let m = comAlmas(100_000);
    for (let i = 0; i < 5; i++) m = comprarOuFalhar(m, NO.folego);
    expect(m.fundacao.ranks[NO.folego]).toBe(5);
    expect(comprar(m, NO.folego)).toEqual({ recusa: 'maximo' });
    expect(custoDaCompra(m, NO.folego)).toBeNull();
    for (let i = 0; i < 3; i++) m = comprarOuFalhar(m, NO.casco);
    expect(comprar(m, NO.casco)).toEqual({ recusa: 'maximo' });
  });

  it('um nó que não existe é recusado como bloqueado', () => {
    expect(comprar(comAlmas(9999), 8)).toEqual({ recusa: 'bloqueado' });
    expect(comprar(comAlmas(9999), -1)).toEqual({ recusa: 'bloqueado' });
  });

  it('o reembolso respeita o teto de Almas do meta (2^30 − 1)', () => {
    const m: Meta = { ...comAlmas(2 ** 30 - 100), fundacao: { ranks: [0, 1, 0, 0, 0, 0, 0, 0], gasto: 300 } };
    const r = reembolsar(m);
    if (foiRecusado(r)) throw new Error(r.recusa);
    expect(r.almas).toBe(2 ** 30 - 1);
  });
});

describe('nós bloqueados (F-010.7, FD8)', () => {
  it('o martelo, Pés plantados e Ferro frio recusam a compra com Almas de sobra, sem gravar, e não somam em G', () => {
    const m = comAlmas(1_000_000);
    for (const idx of [NO.martelo, NO.pes, NO.ferro]) {
      expect(NOS_DA_FUNDACAO[idx]!.ativo, String(idx)).toBe(false);
      expect(comprar(m, idx), String(idx)).toEqual({ recusa: 'bloqueado' });
      expect(custoDaCompra(m, idx)).toBeNull();
    }
    expect(m).toEqual(comAlmas(1_000_000));
    expect(m.seq).toBe(0);
    // Comprar os ativos não envolve os bloqueados em G: a soma só tem os ranks dos ativos.
    let c = m;
    for (const idx of [NO.pele, NO.folego, NO.casco, NO.bigorna, NO.maos]) c = comprarOuFalhar(c, idx);
    expect(somaDeRanks(c.fundacao.ranks)).toBe(5);
    expect([NO.martelo, NO.pes, NO.ferro].map((i) => c.fundacao.ranks[i])).toEqual([0, 0, 0]);
  });
});
