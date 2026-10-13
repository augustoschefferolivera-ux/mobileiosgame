// As lacunas do crítico independente da F-009 (ADR-0011 §14): invariantes da D9 que nenhuma mutação do código reprovava. Cada caso aponta a
// regra (FS2, PO2/LN3, AT3, PO5, FM1/AN4, FM3/AN4, FU1) e a mutação que ele mata.
import { describe, expect, it } from 'vitest';
import { ARMA } from '../../../src/logica/armas/tabela';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { surgirChefe } from '../../../src/logica/mundo/chefe';
import { alocar, quantosAtivos } from '../../../src/logica/nucleo/pool';
import { CAUSA, FORMA } from '../../../src/logica/nucleo/eventos';
import { CAB, CENARIO, CHEFE_F32, CHEFE_U16, CHEFE_U8, JOGADOR, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, PROGRESSAO, TIPO_DE_CARTA, TIPO_DE_PROJETIL, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PARADO } from '../apoio';
import { eventosDe, fonteDeAcoes } from '../combate/apoio';
import { ATQ, D, EVENTO, aparoNosPassos, chefeEm, comChefe, estadoDoChefe, fixarCiclo, jogadorA, prepararAtaque } from './apoio';
import { DADOS_SEM_OBSTACULOS } from '../apoio';

const INVULNERAVEL = CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel;
const CX = 485;
const CY = 1266;

describe('o ciclo fixo de cada fase anda em sequência (FS2) — mata: remover `ataqueSeq + 1` do fim do telegrafo', () => {
  /** As formas dos telegrafos do ciclo (11 a 14 e 16) numa fase, com o jogador no gatilho de todos, sem Convocar nem Explosão nem zona acumulada. */
  function formasDoCiclo(fase: number, quantos: number): number[] {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, D, 29);
    chefeEm(e, s, CX, CY);
    fixarCiclo(e, fase, 0);
    jogadorA(e, s, 60, 1, 0);
    let formas: number[] = [];
    for (let k = 0; k < 20_000 && formas.length < quantos; k++) {
      // Sem Convocar nem Explosão, e a zona de Lanterna não acumula (o ciclo da D9 vale com as 3 zonas livres).
      e.chefeU16[CHEFE_U16.convocaEspera] = 600;
      e.chefeU16[CHEFE_U16.explosaoEspera] = 720;
      e.chefeU16[CHEFE_U16.zonaTimer0] = e.chefeU16[CHEFE_U16.zonaTimer1] = e.chefeU16[CHEFE_U16.zonaTimer2] = 0;
      // O jogador fica sempre no gatilho e intacto; o chefe parado onde está.
      jogadorA(e, s, 60, 1, 0);
      avancar(e, D, PARADO, 1);
      formas = eventosDe(e, EVENTO.telegrafo).map((x) => x.forma);
    }
    return formas.slice(0, quantos);
  }
  const { varaArco: vara, varaLinha, luzCega, lanternaZona, agarrar } = FORMA;
  it('fase 1: V B V L, duas voltas', () => {
    expect(formasDoCiclo(1, 8)).toEqual([vara, varaLinha, vara, luzCega, vara, varaLinha, vara, luzCega]);
  });
  it('fase 2: V A B A V L, duas voltas', () => {
    const v = [vara, lanternaZona, varaLinha, lanternaZona, vara, luzCega];
    expect(formasDoCiclo(2, 12)).toEqual([...v, ...v]);
  });
  it('fase 3: V G B A V L G B, duas voltas', () => {
    const v = [vara, agarrar, varaLinha, lanternaZona, vara, luzCega, agarrar, varaLinha];
    expect(formasDoCiclo(3, 16)).toEqual([...v, ...v]);
  });
});

describe('a Quebra não move o chefe (PO2, LN3) — mata: tirar `quebraPassos > 0` do enraizamento', () => {
  it('em 60 passos de Quebra com o jogador longe, o chefe não sai do lugar; livre, ele persegue', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, DADOS_SEM_OBSTACULOS, 29);
    chefeEm(e, s, CX, CY);
    jogadorA(e, s, 400, 1, 0);
    e.inimigos.ataqueFase[s] = 0;
    e.chefeU16[CHEFE_U16.quebraPassos] = 180;
    e.chefeF32[CHEFE_F32.postura] = 100;
    e.chefeU8[CHEFE_U8.quebraNova] = 0;
    avancar(e, DADOS_SEM_OBSTACULOS, PARADO, 60);
    expect([e.inimigos.x[s], e.inimigos.y[s]]).toEqual([CX, CY]);
    // Controle: sem a Quebra o mesmo chefe anda.
    const livre = comChefe({ cenario: INVULNERAVEL }, DADOS_SEM_OBSTACULOS, 29);
    chefeEm(livre.e, livre.s, CX, CY);
    jogadorA(livre.e, livre.s, 400, 1, 0);
    livre.e.chefeU16[CHEFE_U16.convocaEspera] = 600;
    avancar(livre.e, DADOS_SEM_OBSTACULOS, PARADO, 60);
    expect(livre.e.inimigos.x[livre.s]).not.toBe(CX);
  });
});

describe('o aparo e o Agarrar (AT3, PO5) — mata: aparar também o vermelho; o Agarrar aparado somar 25', () => {
  it('a Luz Cega (vermelha) não é aparável: o aparo no telegrafo não conta, não soma Postura e a cegueira entra', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, D, 29);
    chefeEm(e, s, CX, CY);
    jogadorA(e, s, 100, 1, 0);
    prepararAtaque(e, s, ATQ.luzCega, 6, [1, 0]);
    avancar(e, D, aparoNosPassos([e.cab[CAB.passo]!]), 12);
    expect(e.jogador4U32[JOGADOR4_U32.aparos]).toBe(0);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(0);
    expect(e.chefeU16[CHEFE_U16.cegoPassos]).toBeGreaterThan(0);
  });
  it('o Agarrar aparado abre a Quebra direto (forma 2 do evento 41) sem somar os 25 do aparo, mesmo com a Postura em 75', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, D, 29);
    chefeEm(e, s, CX, CY);
    jogadorA(e, s, 60, 1, 0);
    e.chefeF32[CHEFE_F32.postura] = 75;
    prepararAtaque(e, s, ATQ.agarrar, 6, [1, 0]);
    avancar(e, D, aparoNosPassos([e.cab[CAB.passo]!]), 12);
    expect(e.jogador4U32[JOGADOR4_U32.aparos]).toBe(1);
    const quebras = eventosDe(e, EVENTO.quebraDoChefe);
    expect(quebras).toHaveLength(1);
    expect(quebras[0]!.forma).toBe(2);
    expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBeGreaterThan(0);
  });
});

describe('o corte do combate em A Fome e no Amanhecer (FM1, AN4) — mata: tirar `presoPassos = 0`, `liberarOnda`, `limparOferta` ou a chamada no Amanhecer', () => {
  function aUmPassoDaFome(): Estado {
    const { e } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado, armas: [{ codigo: ARMA.facas_de_sal, nivel: 8 }] }, DADOS_SEM_OBSTACULOS, 29);
    e.cab[CAB.relogio] = 82_799;
    return e;
  }
  function aposAMorte(): Estado {
    const { e, s } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado, armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }] }, DADOS_SEM_OBSTACULOS, 29);
    matarInimigo(e, DADOS_SEM_OBSTACULOS, s, CAUSA.arma);
    return e;
  }
  /** Uma onda e uma faca vivas, o Agarrar em curso, a cegueira e uma oferta de cartas aberta. */
  function comCombateEmCurso(e: Estado): void {
    const o = alocar(e.poolDeEfeitos);
    // Uma arma com onda de chão (vida > 0): senão a própria onda expiraria no passo e o corte não faria diferença.
    e.efeitos.arma[o] = D.armas.ondaVida.findIndex((v) => v > 0);
    e.efeitos.x[o] = e.jogador[JOGADOR.x]! + 300;
    e.efeitos.y[o] = e.jogador[JOGADOR.y]! + 300;
    const p = alocar(e.poolDeProjeteis);
    e.projeteis.x[p] = e.projeteis.xAnt[p] = e.jogador[JOGADOR.x]! + 300;
    e.projeteis.y[p] = e.projeteis.yAnt[p] = e.jogador[JOGADOR.y]! + 300;
    e.projeteis.tipo[p] = TIPO_DE_PROJETIL.faca;
    e.projeteis.vida[p] = 100;
    e.chefeU8[CHEFE_U8.presoPassos] = 50;
    e.chefeU16[CHEFE_U16.cegoPassos] = 50;
    e.oferta.tipo[0] = TIPO_DE_CARTA.melhoriaDeArma;
    e.oferta.item[0] = 1;
  }
  it('em A Fome: onda, faca, Agarrar, cegueira e a oferta somem; o jogador preso anda no passo seguinte', () => {
    const e = aUmPassoDaFome();
    comCombateEmCurso(e);
    avancar(e, DADOS_SEM_OBSTACULOS, PARADO, 1);
    expect([quantosAtivos(e.poolDeEfeitos), quantosAtivos(e.poolDeProjeteis), e.chefeU8[CHEFE_U8.presoPassos], e.chefeU16[CHEFE_U16.cegoPassos]]).toEqual([0, 0, 0, 0]);
    const x = e.jogador[JOGADOR.x]!;
    avancar(e, DADOS_SEM_OBSTACULOS, fonteDeAcoes([], { mx: 1, my: 0 }), 20);
    expect(e.jogador[JOGADOR.x]! - x).toBeGreaterThan(10);
  });
  it('no Amanhecer: onda, faca, Agarrar, cegueira e a oferta somem; o jogador preso anda no passo seguinte', () => {
    const e = aposAMorte();
    comCombateEmCurso(e);
    avancar(e, DADOS_SEM_OBSTACULOS, PARADO, 1);
    expect([quantosAtivos(e.poolDeEfeitos), quantosAtivos(e.poolDeProjeteis), e.chefeU8[CHEFE_U8.presoPassos], e.chefeU16[CHEFE_U16.cegoPassos]]).toEqual([0, 0, 0, 0]);
    expect(Array.from(e.oferta.tipo).every((t) => t === 0)).toBe(true);
    expect(Array.from(e.oferta.item).every((t) => t === 0)).toBe(true);
    const x = e.jogador[JOGADOR.x]!;
    avancar(e, DADOS_SEM_OBSTACULOS, fonteDeAcoes([], { mx: 1, my: 0 }), 20);
    expect(e.jogador[JOGADOR.x]! - x).toBeGreaterThan(10);
  });
});

describe('a mancha é recuperável em A Fome e no Amanhecer (FM3, AN4) — mata: tirar `rodarMancha` de `andarSemAcoes`', () => {
  function comMancha(e: Estado): void {
    e.jogador4U8[JOGADOR4_U8.manchaAtiva] = 1;
    e.jogador4[JOGADOR4.manchaX] = e.jogador[JOGADOR.x]! + 30;
    e.jogador4[JOGADOR4.manchaY] = e.jogador[JOGADOR.y]!;
    e.jogador4U32[JOGADOR4_U32.manchaAlmas] = 500;
  }
  it('em A Fome', () => {
    const { e } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado }, DADOS_SEM_OBSTACULOS, 29);
    e.cab[CAB.relogio] = 82_799;
    avancar(e, DADOS_SEM_OBSTACULOS, PARADO, 2);
    comMancha(e);
    const almas = e.progresso[PROGRESSAO.almas]!;
    avancar(e, DADOS_SEM_OBSTACULOS, fonteDeAcoes([], { mx: 1, my: 0 }), 30);
    expect(e.jogador4U8[JOGADOR4_U8.manchaAtiva]).toBe(0);
    expect(e.progresso[PROGRESSAO.almas]).toBe(almas + 500);
    expect(eventosDe(e, EVENTO.manchaRecuperada)).toHaveLength(1);
  });
  it('no Amanhecer', () => {
    const { e, s } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado }, DADOS_SEM_OBSTACULOS, 29);
    matarInimigo(e, DADOS_SEM_OBSTACULOS, s, CAUSA.arma);
    avancar(e, DADOS_SEM_OBSTACULOS, PARADO, 2);
    comMancha(e);
    const almas = e.progresso[PROGRESSAO.almas]!;
    avancar(e, DADOS_SEM_OBSTACULOS, fonteDeAcoes([], { mx: 1, my: 0 }), 30);
    expect(e.jogador4U8[JOGADOR4_U8.manchaAtiva]).toBe(0);
    expect(e.progresso[PROGRESSAO.almas]).toBe(almas + 500);
  });
});

describe('a Fúria não repete o evento 44 na transição de fase (FU1) — mata: tirar `transicaoPassos > 0` de `emitirFuria`', () => {
  it('com o relógio parado em 90.000 pela transição de 40 passos, o evento sai uma vez (no passo em que ela termina)', () => {
    const e = estadoDoChefe({ cenario: INVULNERAVEL | CENARIO.semFome }, D, 29);
    surgirChefe(e, D);
    const s = e.chefeU16[CHEFE_U16.slot]!;
    chefeEm(e, s, CX, CY);
    jogadorA(e, s, 600, 1, 0);
    e.cab[CAB.relogio] = 90_000;
    e.chefeU16[CHEFE_U16.transicaoPassos] = 40;
    e.chefeU16[CHEFE_U16.convocaEspera] = 600;
    avancar(e, D, PARADO, 40);
    expect(e.cab[CAB.relogio]).toBe(90_000);
    expect(eventosDe(e, EVENTO.furia)).toHaveLength(1);
  });
});

