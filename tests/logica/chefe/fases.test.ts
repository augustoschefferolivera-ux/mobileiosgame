// As fases do Lanterneiro (design/decisoes-F-009.md FS1, PO7, LN5; F-009.3): os limiares de 60% e 25%, a transição de 90 passos
// com o relógio parado e a morte do chefe.
import { describe, expect, it } from 'vitest';
import { ACERTO } from '../../../src/logica/armas/acerto';
import { acertarNoChefe } from '../../../src/logica/mundo/chefe';
import { CAB, CHEFE_F32, CHEFE_U16, CHEFE_U8, MUNDO, PROGRESSAO, SEM_CHEFE } from '../../../src/logica/nucleo/estado';
import { CAUSA, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { PARADO } from '../apoio';
import { eventosDe } from '../combate/apoio';
import { ARMA, D, EVENTO, comChefe, contar, jogadorA } from './apoio';

function bater(e: ReturnType<typeof comChefe>['e'], s: number, dano: number): void {
  ACERTO[0] = dano;
  ACERTO[1] = 200;
  acertarNoChefe(e, D, s, ARMA.espada_longa_do_juramento, FORMA.ida, 0);
}

describe('transição de fase (FS1, PO7, F-009.3)', () => {
  it('um acerto que passaria do limiar deixa o HP em 8.424 e abre a transição de 90 passos; o relógio para, o chefe não age nem leva dano', () => {
    const { e, s } = comChefe();
    jogadorA(e, s, 400);
    expect(e.chefeF32[CHEFE_F32.hpMax]).toBe(14_040);
    bater(e, s, 20_000);
    expect(e.inimigos.hp[s]).toBe(8_424);
    avancar(e, D, PARADO, 1);
    expect(e.chefeU16[CHEFE_U16.transicaoPassos]).toBe(90);
    expect(e.chefeU8[CHEFE_U8.fase]).toBe(1);
    expect(e.chefeU8[CHEFE_U8.faseMax]).toBe(2);
    expect(contar(e, EVENTO.chefeFase)).toBe(1);
    const relogio = e.cab[CAB.relogio]!;
    const passo = e.cab[CAB.passo]!;
    const telegrafos = contar(e, EVENTO.telegrafo);
    for (let k = 1; k <= 90; k++) {
      bater(e, s, 20_000);
      avancar(e, D, PARADO, 1);
      expect(e.cab[CAB.relogio], `passo ${k}`).toBe(relogio);
      expect(e.inimigos.hp[s]).toBe(8_424);
    }
    expect(e.cab[CAB.passo]).toBe(passo + 90);
    expect(contar(e, EVENTO.telegrafo)).toBe(telegrafos);
    expect(e.chefeU8[CHEFE_U8.fase]).toBe(2);
    expect(e.chefeU16[CHEFE_U16.transicaoPassos]).toBe(0);
    expect(e.chefeU16[CHEFE_U16.convocaEspera]).toBe(180);
    expect(eventosDe(e, EVENTO.chefeFase).map((x) => x.forma)).toEqual([1, 2]);
    // No passo seguinte o relógio volta a andar.
    avancar(e, D, PARADO, 1);
    expect(e.cab[CAB.relogio]).toBe(relogio + 1);
  });

  it('na fase 2 o limiar é 3.510 (25%); a Quebra e a Postura zeram na transição', () => {
    const { e, s } = comChefe();
    jogadorA(e, s, 400);
    bater(e, s, 20_000);
    avancar(e, D, PARADO, 91);
    expect(e.chefeU8[CHEFE_U8.fase]).toBe(2);
    e.chefeU16[CHEFE_U16.quebraPassos] = 100;
    e.chefeF32[CHEFE_F32.postura] = 100;
    bater(e, s, 20_000);
    expect(e.inimigos.hp[s]).toBe(3_510);
    avancar(e, D, PARADO, 1);
    expect(e.chefeU16[CHEFE_U16.transicaoPassos]).toBe(90);
    expect([e.chefeU16[CHEFE_U16.quebraPassos], e.chefeF32[CHEFE_F32.postura]]).toEqual([0, 0]);
    avancar(e, D, PARADO, 90);
    expect(e.chefeU8[CHEFE_U8.fase]).toBe(3);
    expect(e.chefeU16[CHEFE_U16.explosaoEspera]).toBe(360);
  });

  it('nunca se pula uma fase: um acerto imenso na fase 1 só chega ao limiar da 2', () => {
    const { e, s } = comChefe();
    jogadorA(e, s, 400);
    bater(e, s, 1_000_000);
    expect(e.inimigos.hp[s]).toBe(8_424);
  });
});

describe('morte do Lanterneiro (LN5)', () => {
  it('na fase 3 o acerto letal chega a 0: mortes + 1, 200 Almas direto, sem Cinza nem baú, evento 45 e o slot solto', () => {
    const { e, s } = comChefe();
    jogadorA(e, s, 400);
    e.chefeU8[CHEFE_U8.fase] = 3;
    const almas = e.progresso[PROGRESSAO.almas]!;
    bater(e, s, 1_000_000);
    expect(e.inimigos.hp[s]).toBe(0);
    avancar(e, D, PARADO, 1);
    expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
    expect(e.chefeU8[CHEFE_U8.morto]).toBe(1);
    expect(e.mundo[MUNDO.mortes]).toBe(1);
    expect(e.progresso[PROGRESSAO.almas]).toBe(almas + 200);
    expect(contar(e, EVENTO.chefeMorreu)).toBe(1);
    const morte = eventosDe(e, EVENTO.morte).filter((x) => x.slot === s);
    expect(morte).toHaveLength(1);
    expect(e.pool.posicao[s]).toBeLessThan(0);
    expect(quantosAtivos(e.poolDePickups)).toBe(0);
    expect(CAUSA.lanterneiro).toBe(4);
  });
});
