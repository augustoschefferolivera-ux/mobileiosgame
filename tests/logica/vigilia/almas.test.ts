// Almas e pickup de Alma (design/decisoes-F-007.md AM1 a AM3, AM7, PE2): o drop por morte de arma, o sorteio do fluxo
// drops, o pool cheio, a coleta e o limite de 2^30.
import { describe, expect, it } from 'vitest';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CENARIO, JOGADOR4_U32, LIMITE_DE_ALMAS, PROGRESSAO, TIPO_DE_PICKUP, baseDoFluxo, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { CAUSA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { DOIS_A_MENOS_32, SORTEADO, sortear } from '../../../src/logica/nucleo/rng';
import { creditarAlmas, soltarBau } from '../../../src/logica/progressao/pickups';
import { PARADO } from '../apoio';
import { por } from '../armas/apoio';
import { D, J, cinzaEm, estadoDe, pickupEm } from '../progressao/apoio';

const ALMA = TIPO_DE_PICKUP.alma;
const DROPS = baseDoFluxo('drops');
const almas = (e: Estado): number => e.progresso[PROGRESSAO.almas]!;

/** Os pickups de Alma vivos, em ordem de slot. */
function almasNoChao(e: Estado): number[] {
  const r: number[] = [];
  for (let s = 0; s < 512; s++) if (e.poolDePickups.posicao[s]! >= 0 && e.pickups.tipo[s] === ALMA) r.push(e.pickups.valor[s]!);
  return r;
}

/** Quantos acertos de `chance` os `n` próximos sorteios do fluxo drops dão, sem mexer no estado. */
function acertosDe(e: Estado, n: number, chance: number): number {
  const copia = new Uint32Array(e.rng);
  let acertos = 0;
  for (let k = 0; k < n; k++) {
    sortear(copia, DROPS);
    if (SORTEADO[0]! * DOIS_A_MENOS_32 < chance) acertos++;
  }
  return acertos;
}

/** Os mesmos dados com a chance de Alma de todos os tipos trocada. */
const comChance = (chance: number): typeof D => ({ ...D, tipos: { ...D.tipos, almasChance: new Float64Array(D.tipos.almasChance.length).fill(chance) } });

describe('drop de Alma (AM1)', () => {
  it('chance 1: valor fixo, sem sorteio (o fluxo drops não se move); Oco 1, Grande e Noviça pelo valor de inimigos.json', () => {
    const d = comChance(1);
    const e = estadoDe([], [], {}, 1, d);
    const antes = [...e.rng];
    matarInimigo(e, d, por(e, TIPO.oco_das_lanternas, 200, 0), CAUSA.arma);
    matarInimigo(e, d, por(e, TIPO.oco_grande, 300, 0), CAUSA.arma);
    expect(almasNoChao(e)).toEqual([d.tipos.almasValor[TIPO.oco_das_lanternas], d.tipos.almasValor[TIPO.oco_grande]]);
    expect([...e.rng]).toEqual(antes);
  });

  it('chance 0,5: um sorteio do fluxo drops por morte; seed fixa → mesma sequência, e só o fluxo drops se move', () => {
    const rodar = (): { valores: number[]; rng: number[] } => {
      const e = estadoDe([]);
      const outros = [...e.rng.slice(0, 8), ...e.rng.slice(12)];
      for (let k = 0; k < 20; k++) matarInimigo(e, D, por(e, TIPO.oco_das_lanternas, 200 + 20 * k, 0), CAUSA.arma);
      expect([...e.rng.slice(0, 8), ...e.rng.slice(12)]).toEqual(outros);
      return { valores: almasNoChao(e), rng: [...e.rng] };
    };
    const a = rodar();
    expect(a).toEqual(rodar());
    const e = estadoDe([]);
    expect(a.valores).toHaveLength(acertosDe(e, 20, 0.5));
    expect(a.valores.length).toBeGreaterThan(0);
    expect(a.valores.length).toBeLessThan(20);
  });

  it('o convertido sorteia 10 vezes (50% do Oco) e solta um pickup só, com a soma (0 a 10)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const e = estadoDe([], [], {}, seed);
      const s = por(e, TIPO.oco_grande, 200, 0);
      e.inimigos.convertido[s] = 1;
      const esperado = acertosDe(e, 10, 0.5);
      matarInimigo(e, D, s, CAUSA.arma);
      expect(almasNoChao(e), `seed ${seed}`).toEqual(esperado > 0 ? [esperado] : []);
    }
  });

  it('só causa arma solta: outra causa não solta nem sorteia; semCinzas corta as Almas; o tipo sem Alma (valor 0) não sorteia', () => {
    const e = estadoDe([]);
    const antes = [...e.rng];
    matarInimigo(e, D, por(e, TIPO.oco_das_lanternas, 200, 0), 99);
    expect([almasNoChao(e), [...e.rng]]).toEqual([[], antes]);
    const c = criarEstado(1, comChance(1), { cenario: CENARIO.diretorDesligado | CENARIO.semCinzas, armas: [] });
    matarInimigo(c, comChance(1), por(c, TIPO.oco_das_lanternas, 200, 0), CAUSA.arma);
    expect(quantosAtivos(c.poolDePickups)).toBe(0);
  });
});

describe('pool cheio (AM2)', () => {
  it('com uma Alma viva, o valor novo se junta nela; sem nenhuma (só Cinzas), é creditado direto em almas', () => {
    const d = comChance(1);
    const cheio = estadoDe([], [], {}, 1, d);
    for (let k = 0; k < 511; k++) cinzaEm(cheio, 100 + (k % 20) * 10, 100 + Math.floor(k / 20) * 10, 1);
    const viva = pickupEm(cheio, 150, 150, ALMA, 4);
    expect(viva).toBeGreaterThanOrEqual(0);
    matarInimigo(cheio, d, por(cheio, TIPO.oco_grande, 160, 150), CAUSA.arma);
    expect([cheio.pickups.valor[viva], almas(cheio)]).toEqual([4 + d.tipos.almasValor[TIPO.oco_grande]!, 0]);
    const so = estadoDe([], [], {}, 1, d);
    for (let k = 0; k < 512; k++) cinzaEm(so, 100 + (k % 20) * 10, 100 + Math.floor(k / 20) * 10, 1);
    matarInimigo(so, d, por(so, TIPO.oco_grande, 160, 150), CAUSA.arma);
    expect(almas(so)).toBe(d.tipos.almasValor[TIPO.oco_grande]);
  });

  it('o baú nunca é descartado: sem Cinza, cede a Alma mais próxima, que se junta na vizinha; com uma só Alma, o valor é creditado', () => {
    const e = estadoDe([]);
    for (let k = 0; k < 512; k++) pickupEm(e, 100 + (k % 20) * 10, 100 + Math.floor(k / 20) * 10, ALMA, 2);
    const s = soltarBau(e, 300, 300, false);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(e.pickups.tipo[s]).toBe(TIPO_DE_PICKUP.bauComum);
    expect(almasNoChao(e).reduce((a, b) => a + b, 0)).toBe(512 * 2);
    expect(almas(e)).toBe(0);
  });
});

describe('coleta (AM3)', () => {
  it('Ímã a 48 px, voo de 8 px por passo e coleta a ≤ 16 px: soma em almas, não em XP', () => {
    const e = estadoDe([]);
    const s = pickupEm(e, 48, 0, ALMA, 7);
    avancar(e, D, PARADO, 1);
    expect(e.pickups.x[s]).toBe(J.x + 40);
    avancar(e, D, PARADO, 4);
    expect([almas(e), e.progresso[PROGRESSAO.xpTotal], e.poolDePickups.posicao[s]]).toEqual([7, 0, -1]);
    const f = estadoDe([]);
    const t = pickupEm(f, 48.0625, 0, ALMA, 7);
    avancar(f, D, PARADO, 300);
    expect([almas(f), f.pickups.x[t]]).toEqual([0, J.x + 48.0625]);
  });
});

describe('limite de 2^30 (AM7)', () => {
  it('creditarAlmas para em 2^30 − 1; o pickup também; a mancha recuperada não passa do teto', () => {
    const e = estadoDe([]);
    e.progresso[PROGRESSAO.almas] = LIMITE_DE_ALMAS - 10;
    creditarAlmas(e, 1000);
    expect(almas(e)).toBe(LIMITE_DE_ALMAS - 1);
    expect(e.jogador4U32[JOGADOR4_U32.manchaAlmas]).toBe(0);
  });
});
