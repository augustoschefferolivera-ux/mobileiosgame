// Degradação nos níveis 1 e 2 (design/decisoes-F-010.md DG2, DG4): só render, fora do hash. O nível 1 encolhe o pool de mortes a 150
// e o anel de partículas à metade; o nível 0 devolve os limites; o TETO 500 rebaixa a 300 no nível 3 (menos com ?teto).
import { describe, expect, it } from 'vitest';
import { CAPACIDADE_DE_MORTES, CAPACIDADE_DE_PARTICULAS, EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { ARMA } from '../../src/logica/armas/tabela';
import { CAB, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { CAUSA, EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../../src/logica/nucleo/eventos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { POOL_DE_MORTES_DEGRADADO, luzLigada } from '../../src/plataforma/degradacao';
import { tetoRebaixado } from '../../src/plataforma/teto';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

function consumirEm(ef: EfeitosDaVigilia, e: Estado, passo: number): void {
  e.cab[CAB.passo] = passo;
  ef.consumir(e, true);
}

function mortes(e: Estado, n: number): void {
  for (let k = 0; k < n; k++) {
    FLOATS_DO_EVENTO[0] = FLOATS_DO_EVENTO[1] = 10;
    gravarEvento(e.eventos, 5, EVENTO.morte, 0, 0, k % 500, 0, TIPO.oco_das_lanternas, 0, CAUSA.arma);
  }
}

function acertos(e: Estado, n: number): void {
  for (let k = 0; k < n; k++) {
    FLOATS_DO_EVENTO[0] = 600;
    FLOATS_DO_EVENTO[1] = 1200;
    FLOATS_DO_EVENTO[2] = 5;
    gravarEvento(e.eventos, 10, EVENTO.acerto, ARMA.espada_longa_do_juramento, 0, k % 300, 0, TIPO.oco_das_lanternas, 0, CAUSA.arma);
  }
}

const soma = (a: Uint8Array): number => a.reduce((x, y) => x + y, 0);

describe('níveis 1 e 2 no render (DG2)', () => {
  it('nível 0: pool de mortes de 300 e anel de 256; nível 1: 150 e 128', () => {
    const ef = new EfeitosDaVigilia(D.tipos);
    expect(ef.limites).toEqual({ mortes: CAPACIDADE_DE_MORTES, particulas: CAPACIDADE_DE_PARTICULAS });
    ef.limitarPorDegradacao(1);
    expect(ef.limites).toEqual({ mortes: POOL_DE_MORTES_DEGRADADO, particulas: CAPACIDADE_DE_PARTICULAS / 2 });
    ef.limitarPorDegradacao(0);
    expect(ef.limites).toEqual({ mortes: CAPACIDADE_DE_MORTES, particulas: CAPACIDADE_DE_PARTICULAS });
  });

  it('nível 1: 152 mortes viram 150 efeitos e 2 recusas; nível 0: todas as 152 cabem', () => {
    const a = criarEstado(1, D);
    const ef1 = new EfeitosDaVigilia(D.tipos);
    ef1.limitarPorDegradacao(1);
    mortes(a, 152);
    consumirEm(ef1, a, 5);
    expect([soma(ef1.mortes.ativo), ef1.recusados.mortes]).toEqual([150, 2]);
    const b = criarEstado(1, D);
    const ef0 = new EfeitosDaVigilia(D.tipos);
    mortes(b, 152);
    consumirEm(ef0, b, 5);
    expect([soma(ef0.mortes.ativo), ef0.recusados.mortes]).toEqual([152, 0]);
  });

  it('nível 1: o anel de partículas enche em 128 (recusa o resto); nível 0, em 256', () => {
    const vivas = (nivel: number): number[] => {
      const e = criarEstado(1, D);
      const ef = new EfeitosDaVigilia(D.tipos);
      ef.limitarPorDegradacao(nivel);
      acertos(e, 120);
      consumirEm(ef, e, 10);
      return [soma(ef.particulas.ativo), ef.particulasRecusadas];
    };
    expect(vivas(1)).toEqual([128, 360 - 128]);
    expect(vivas(0)).toEqual([256, 360 - 256]);
  });

  it('a luz (brasa e aurora, aditivas) só se apaga do nível 2 em diante', () => {
    expect([0, 1, 2, 3].map(luzLigada)).toEqual([true, true, false, false]);
  });
});

describe('rebaixamento do TETO (DG4)', () => {
  it('TETO 500 do cache, da tela ou da sonda vira 300 (origem cache); 300 não muda; ?teto não mexe', () => {
    for (const origem of ['cache', 'tela', 'sonda'] as const) expect(tetoRebaixado({ valor: 500, origem, sondaMs: 1.2 })).toEqual({ valor: 300, origem: 'cache', sondaMs: 1.2 });
    expect(tetoRebaixado({ valor: 300, origem: 'sonda', sondaMs: 1.9 })).toBeNull();
    expect(tetoRebaixado({ valor: 500, origem: 'override', sondaMs: null })).toBeNull();
  });
});
