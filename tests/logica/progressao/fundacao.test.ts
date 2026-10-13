// F-010.1 (design/decisoes-F-010.md §3, FD1, FD3): os vetores de custo em Float32, a potência iterativa, o nó de 5 ranks
// (1.969) e o preço total dos 19 ranks (7.852 pelo próximo mais barato; ADR-0012 §9). F-010.2 e F-010.7 (compra e reembolso) vivem em fundacao-compra.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NOS_DA_FUNDACAO, NO, NUMERO_DE_NOS, custoDoRank, somaDeRanks } from '../../../src/logica/progressao/fundacao';

describe('custoDoRank (FD3)', () => {
  it('os vetores da D10 §3, em Float32', () => {
    expect(custoDoRank(300, 1, 0)).toBe(300);
    expect(custoDoRank(300, 1, 1)).toBe(305); // 304,5 sobe (meio para cima)
    expect(custoDoRank(300, 2, 1)).toBe(341); // 341,04
    expect(custoDoRank(300, 1, 2)).toBe(309);
    expect(custoDoRank(300, 3, 40)).toBe(602); // 602,11
    expect(custoDoRank(300, 5, 18)).toBe(600); // 599,51
    expect(custoDoRank(300, 5, 0)).toBe(472); // 472,06
  });

  it('um nó de 5 ranks comprado em sequência (G = rank − 1): 300, 341, 388, 440, 500 → 1.969', () => {
    const custos = [1, 2, 3, 4, 5].map((r) => custoDoRank(300, r, r - 1));
    expect(custos).toEqual([300, 341, 388, 440, 500]);
    expect(custos.reduce((s, c) => s + c, 0)).toBe(1969);
  });

  it('um nó de 3 ranks em sequência soma 1.029', () => {
    expect([1, 2, 3].reduce((s, r) => s + custoDoRank(300, r, r - 1), 0)).toBe(1029);
  });

  it('os 19 ranks ativos, sempre o próximo mais barato, custam 7.852 (a D10 R10-2 dizia 7.851; ADR-0012 §9)', () => {
    const ativos = NOS_DA_FUNDACAO.filter((n) => n.ativo);
    let g = 0;
    let total = 0;
    const comprados = new Array<number>(NUMERO_DE_NOS).fill(0);
    for (let k = 0; k < ativos.length * 5; k++) {
      let melhor = -1;
      let custo = Infinity;
      for (let i = 0; i < NUMERO_DE_NOS; i++) {
        const n = NOS_DA_FUNDACAO[i]!;
        if (!n.ativo || comprados[i]! >= n.ranks) continue;
        const c = custoDoRank(n.custoBase, comprados[i]! + 1, g);
        if (c < custo) {
          custo = c;
          melhor = i;
        }
      }
      if (melhor < 0) break;
      comprados[melhor]!++;
      total += custo;
      g++;
    }
    expect(g).toBe(19);
    expect(total).toBe(7852);
  });

  it('rank inválido ou G negativo lançam', () => {
    expect(() => custoDoRank(300, 0, 0)).toThrow();
    expect(() => custoDoRank(300, 1, -1)).toThrow();
    expect(() => custoDoRank(300, 1.5, 0)).toThrow();
  });

  it('não usa Math.pow nem ** (potência iterativa, ADR-0002 §5)', () => {
    const fonte = readFileSync('src/logica/progressao/fundacao.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(fonte).not.toMatch(/Math\.pow|\*\*/);
  });
});

describe('os 8 nós (FD1, FD8)', () => {
  it('na ordem do doc 08 §4.1, com 4 efeitos ativos de 300 Almas base e 3 bloqueados', () => {
    expect(NOS_DA_FUNDACAO.map((n) => n.id)).toEqual([
      'o_peso_do_martelo_do_seu_pai', 'pele_que_esqueceu_de_sangrar', 'folego_de_forja', 'pes_plantados',
      'casco', 'bigorna_no_peito', 'ferro_frio', 'maos_de_aprendiz',
    ]);
    expect(NOS_DA_FUNDACAO.map((n) => n.ranks)).toEqual([5, 5, 5, 3, 3, 3, 3, 3]);
    expect(NOS_DA_FUNDACAO.every((n) => n.custoBase === 300)).toBe(true);
    expect(NOS_DA_FUNDACAO.map((n) => n.ativo)).toEqual([false, true, true, false, true, true, false, true]);
    expect(NOS_DA_FUNDACAO[NO.pele]!.efeito).toBe('armadura');
    expect(NOS_DA_FUNDACAO[NO.folego]!.efeito).toBe('hp_max_pct');
    expect(NOS_DA_FUNDACAO[NO.casco]!.efeito).toBe('invulnerabilidade_pos_acerto_s');
    expect(NOS_DA_FUNDACAO[NO.bigorna]!.efeito).toBe('reducao_dano_contato_pct');
    expect(NOS_DA_FUNDACAO[NO.maos]!.efeito).toBe('nivel_inicial_armas_orun');
  });

  it('G é a soma dos ranks', () => {
    expect(somaDeRanks([0, 2, 3, 0, 1, 0, 0, 0])).toBe(6);
    expect(somaDeRanks([])).toBe(0);
  });
});
