// Dano líquido ao jogador (design/decisoes-F-007.md DM1 a DM4, DM6, DM7): bruto → armadura 20/(A+20) → Brasa Firme ×0,8
// (stamina estritamente acima de 50), cada passo em Float32, sem arredondar o dano; o HP efetivamente perdido soma
// em `danoRecebido`; o evento `danoAoJogador` leva o líquido e o HP depois.
import { describe, expect, it } from 'vitest';
import inimigos from '../../../src/dados/inimigos.json';
import { BRUTO, LIQUIDO, ORIGEM_DO_DANO, REDUCAO, danoAoJogador, reducaoDeArmadura } from '../../../src/logica/mundo/contato';
import { CENARIO, JOGADOR, JOGADOR3, JOGADOR4, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { armadura } from '../../../src/logica/progressao/dano';
import { ELMO } from '../progressao/apoio';
import { D, D_LIVRE, D_LIVRE_COM_BRASA_FIRME as DREAL, criar, eventosDe } from './apoio';

const f = Math.fround;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;

/** Um estado com o Elmo no nível `n` (armadura 4 × n) e a stamina dada. */
function comElmo(n: number, stamina: number, dados = DREAL): Estado {
  const e = criar(n > 0 ? { passivas: [{ codigo: ELMO, nivel: n }] } : {}, dados);
  e.jogador3[JOGADOR3.stamina] = stamina;
  return e;
}

/** Aplica o dano bruto pelo único caminho e devolve o líquido. */
function bater(e: Estado, bruto: number, dados = DREAL, origem: number = ORIGEM_DO_DANO.golpe): number {
  BRUTO[0] = bruto;
  danoAoJogador(e, dados, origem);
  return LIQUIDO[0]!;
}

describe('curva da armadura (DM1)', () => {
  it('A = 0, 4, 20, 59, 60, 61 e 100: redução min(0,75, A/(A+20)) e multiplicador 20/(A+20) com piso de 0,25', () => {
    const casos: [number, number, number][] = [
      [0, 0, 1],
      [4, 4 / 24, 20 / 24],
      [20, 0.5, 0.5],
      [59, 59 / 79, 20 / 79],
      [60, 0.75, 0.25],
      [61, 0.75, 0.25],
      [100, 0.75, 0.25],
    ];
    for (const [a, reducao, mult] of casos) {
      reducaoDeArmadura(a);
      expect([a, REDUCAO[0]]).toEqual([a, reducao]);
      expect([a, REDUCAO[1]]).toEqual([a, mult]);
    }
  });

  it('A negativa, NaN ou infinita é erro (a armadura vem das passivas, inteira e ≥ 0)', () => {
    for (const a of [-1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => reducaoDeArmadura(a)).toThrow(/armadura/);
  });

  it('o Elmo dá A = 4 por nível, até 20 no nível 5', () => {
    expect([0, 1, 5].map((n) => armadura(comElmo(n, 0), DREAL))).toEqual([0, 4, 20]);
  });
});

describe('tabela armadura × Brasa Firme para bruto 20 (DM1): multiplicativo', () => {
  const tabela: [number, number, number][] = [
    // [nível do Elmo, sem Brasa Firme, com Brasa Firme]
    [0, 20, 16],
    [1, f(20 * (20 / 24)), f(f(20 * (20 / 24)) * 0.8)],
    [5, 10, 8],
  ];
  for (const [nivel, sem, com] of tabela) {
    it(`Elmo ${nivel}: stamina 50 → ${sem}; stamina 50,5 → ${com}`, () => {
      expect(bater(comElmo(nivel, 50), 20)).toBe(sem);
      expect(bater(comElmo(nivel, 50.5), 20)).toBe(com);
    });
  }

  it('os valores da D7: 16,667 e 13,333 com A = 4; 10 e 8 com A = 20; o aditivo daria 6 com A = 20 e Brasa Firme', () => {
    expect(bater(comElmo(1, 50), 20)).toBeCloseTo(16.667, 3);
    expect(bater(comElmo(1, 100), 20)).toBeCloseTo(13.333, 3);
    expect(bater(comElmo(5, 100), 20)).toBe(8);
    // Aditivo: 1 − (0,5 + 0,2) = 0,3 → 6; multiplicativo: 0,5 × 0,8 = 0,4 → 8.
    expect(bater(comElmo(5, 100), 20)).not.toBe(f(20 * 0.3));
  });

  it('o HP cai o líquido, em Float32: 150 − 16,667 e 150 − 13,333 (Brasa Firme)', () => {
    const e = comElmo(1, 100);
    const liquido = bater(e, 20);
    expect(hp(e)).toBe(f(150 - liquido));
    expect(150 - hp(e)).toBeCloseTo(13.333, 3);
  });
});

describe('Brasa Firme (DM2): stamina estritamente acima de 50% da máxima', () => {
  it('50,5 → ×0,8 (16); 50 → ×1,0 (20); 100 → ×0,8; 0 → ×1,0', () => {
    expect(bater(comElmo(0, 50.5), 20)).toBe(16);
    expect(bater(comElmo(0, 50), 20)).toBe(20);
    expect(bater(comElmo(0, 100), 20)).toBe(16);
    expect(bater(comElmo(0, 0), 20)).toBe(20);
  });

  it('o limiar e o fator vêm do dado, tabelados na carga: 50 e 0,8', () => {
    expect(D.combate.brasaFirmeLimiar).toBe(50);
    expect(D.combate.brasaFirmeFator).toBe(0.8);
    expect(DREAL.combate.brasaFirmeFator).toBe(0.8);
    expect(D_LIVRE.combate.brasaFirmeFator).toBe(1);
  });

  it('o 39 bruto com Brasa Firme dá 31,2 (Float32), sem arredondar', () => {
    expect(bater(comElmo(0, 100), 39)).toBe(f(31.2));
  });
});

describe('HP, contador e evento (DM4, DM5, DM6)', () => {
  it('100 acertos de contato de 1,5 com HP 150 e Brasa Firme desligada somam exatamente 150: o 100º zera, e danoRecebido = 150', () => {
    const e = comElmo(0, 50);
    for (let k = 1; k <= 100; k++) {
      bater(e, 1.5);
      expect(hp(e)).toBe(f(150 - 1.5 * k));
    }
    expect(hp(e)).toBe(0);
    expect(e.jogador4[JOGADOR4.danoRecebido]).toBe(150);
  });

  it('danoRecebido soma o HP efetivamente perdido, limitado ao HP restante', () => {
    const e = comElmo(0, 50);
    e.jogador[JOGADOR.hp] = 5;
    bater(e, 20);
    expect(hp(e)).toBe(0);
    expect(e.jogador4[JOGADOR4.danoRecebido]).toBe(5);
    bater(e, 20);
    expect(e.jogador4[JOGADOR4.danoRecebido]).toBe(5);
  });

  it('o BRUTO[0] fica intacto (o evento do golpe o lê depois) e o líquido vai a LIQUIDO[0], ao evento e à origem na forma', () => {
    const e = comElmo(5, 100);
    BRUTO[0] = 20;
    danoAoJogador(e, DREAL, ORIGEM_DO_DANO.projetil);
    expect(BRUTO[0]).toBe(20);
    expect(LIQUIDO[0]).toBe(8);
    const ev = eventosDe(e, EVENTO.danoAoJogador);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ forma: ORIGEM_DO_DANO.projetil, a: 8, b: 142 });
    expect([ev[0]!.x, ev[0]!.y]).toEqual([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]);
  });

  it('com o jogador invulnerável do cenário: nem HP, nem contador, nem evento', () => {
    const e = criar({ cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel }, DREAL);
    expect(bater(e, 20)).toBe(0);
    expect(hp(e)).toBe(150);
    expect(e.jogador4[JOGADOR4.danoRecebido]).toBe(0);
    expect(eventosDe(e, EVENTO.danoAoJogador)).toHaveLength(0);
  });

  it('dano zero não emite evento', () => {
    const e = comElmo(0, 0);
    bater(e, 0);
    expect(eventosDe(e, EVENTO.danoAoJogador)).toHaveLength(0);
  });
});

describe('contato (DM3, DM7): o maior contato nunca interrompe o Frasco', () => {
  it('maiorDano × 0,3 de inimigos.json fica abaixo de 15% do menor hpMax (19,5 com 130)', () => {
    const contato = inimigos.inimigos.filter((i) => i.dano_tipo === 'contato_por_s').map((i) => i.dano_base);
    const maior = Math.max(...contato) * 0.3;
    expect(maior).toBe(1.5);
    expect(maior).toBeLessThan((130 * D.combate.frascoInterrompePct) / 100);
    expect(D.combate.frascoInterrompePct).toBe(15);
  });
});
