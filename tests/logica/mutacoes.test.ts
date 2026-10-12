// Testes do núcleo que matam mutações sobreviventes da revisão da F-005: a
// escolha padrão dos roteiros (A13), o driver com modal aberto (A13, N04) e a
// capacidade do bitset das ondas (A17).
import { describe, expect, it } from 'vitest';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../../src/logica/nucleo/comandos';
import { criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { rodarFrame, rodarFrameComPausas } from '../../src/logica/nucleo/driver';
import { CAB, CAPACIDADE_DE_INIMIGOS, PALAVRAS_DO_BITSET } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { PASSO_MS } from '../../src/logica/nucleo/passos';
import { modalAberto } from '../../src/logica/progressao/modal';
import { PARADO } from './apoio';
import { D, ESPADA, P, estadoDe } from './progressao/apoio';

describe('escolha padrão dos roteiros (A13)', () => {
  it("'primeira' dá sempre a carta 0; o vetor dá a escolha da ordem e, na falta dela, a carta 0 (nunca −1, que pararia)", () => {
    const cmd = criarComandos();
    for (const fonte of [fonteConstante(cmd, 'primeira'), fonteDoRoteiro([], 'primeira')]) {
      expect([0, 1, 7, 100].map((o) => fonte.escolhaDoModal!(o))).toEqual([0, 0, 0, 0]);
    }
    for (const fonte of [fonteConstante(cmd, [2, 1]), fonteDoRoteiro([], [2, 1])]) {
      expect([0, 1, 2, 3, 100].map((o) => fonte.escolhaDoModal!(o))).toEqual([2, 1, 0, 0, 0]);
    }
    for (const fonte of [fonteConstante(cmd, []), fonteDoRoteiro([], [])]) expect(fonte.escolhaDoModal!(0)).toBe(0);
  });

  it('sem escolhas a fonte não confirma (ao vivo, espera o jogador); com a lista curta, o roteiro segue com a carta 0', () => {
    expect(fonteConstante(criarComandos()).escolhaDoModal).toBeUndefined();
    expect(fonteDoRoteiro([]).escolhaDoModal).toBeUndefined();
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    expect(avancar(e, D, fonteDoRoteiro([], []), 5)).toBe(5);
    expect([e.progresso[P.niveisPendentes], e.progresso[P.modaisConfirmados]]).toEqual([0, 2]);
    const parada = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    expect(avancar(parada, D, PARADO, 5)).toBe(1);
    expect(modalAberto(parada)).toBe(true);
  });
});

describe('driver com modal aberto (A13, N04)', () => {
  it('rodarFrame: o modal abre no meio do frame, o resto é descartado, o acumulador zera e passosPerdidos não soma', () => {
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    const acc = criarAcumulador();
    // 5 passos pedidos (com resto de 0,5 passo), mas o modal abre no 1º.
    expect(rodarFrame(e, D, acc, 5.5 * PASSO_MS, PARADO)).toBe(1);
    expect(modalAberto(e)).toBe(true);
    expect([acc.restoMs, acc.passosPerdidos]).toEqual([0, 0]);
  });

  it('rodarFrameComPausas: com o modal aberto, nenhum passo roda, o delta não entra e nada é perdido', () => {
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    const acc = criarAcumulador();
    rodarFrame(e, D, acc, PASSO_MS, PARADO);
    expect(modalAberto(e)).toBe(true);
    const passo = e.cab[CAB.passo]!;
    for (const delta of [PASSO_MS, 1000, 0.4 * PASSO_MS]) expect(rodarFrameComPausas(e, D, acc, delta, PARADO, false, false)).toBe(0);
    expect([acc.restoMs, acc.passosPerdidos, e.cab[CAB.passo]]).toEqual([0, 0, passo]);
  });
});

describe('capacidade do bitset das ondas (A17)', () => {
  it('cada onda marca no máximo 32 × PALAVRAS_DO_BITSET inimigos: CAPACIDADE_DE_INIMIGOS ≤ 512', () => {
    expect(CAPACIDADE_DE_INIMIGOS).toBeLessThanOrEqual(32 * PALAVRAS_DO_BITSET);
  });
});
