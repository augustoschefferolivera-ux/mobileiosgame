// A Postura do Lanterneiro (design/decisoes-F-009.md PO1 a PO7; F-009.1, F-009.2, F-009.11, F-009.13).
import { describe, expect, it } from 'vitest';
import { ACERTO } from '../../../src/logica/armas/acerto';
import { acertarNoChefe } from '../../../src/logica/mundo/chefe';
import { BRUTO, ORIGEM_DO_DANO, resolverAcertoNoJogador } from '../../../src/logica/mundo/contato';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CAB, CENARIO, CHEFE_F32, CHEFE_U16, CHEFE_U8, JOGADOR3_U8, JOGADOR4_U32, hashEstado } from '../../../src/logica/nucleo/estado';
import { FLAG, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PARADO } from '../apoio';
import { ACAO, ARMA, ATQ, D, EVENTO, aparoNosPassos, comChefe, contar, jogadorA, prepararAtaque } from './apoio';
import { eventosDe } from '../combate/apoio';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';

const INVULNERAVEL = CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel;

describe('Postura por aparo (PO1, PO2, F-009.1)', () => {
  it('4 aparos da Vara (branca): 25, 50, 75, 100; no 4º, a Quebra de 180 passos, o evento 41 e o chefe parado; no passo seguinte ao último, 0', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL });
    const postura = (): number => e.chefeF32[CHEFE_F32.postura]!;
    const lidas: number[] = [];
    for (let i = 0; i < 4; i++) {
      jogadorA(e, s, 100);
      prepararAtaque(e, s, ATQ.vara, 6);
      const fonte = aparoNosPassos([e.cab[CAB.passo]!]);
      for (let k = 0; k < 12 && postura() === (lidas[i - 1] ?? 0); k++) avancar(e, D, fonte, 1);
      lidas.push(postura());
      // O aparo comum não atordoa: sem Quebra antes do 4º.
      if (i < 3) expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBe(0);
    }
    expect(lidas).toEqual([25, 50, 75, 100]);
    expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBe(180);
    expect(contar(e, EVENTO.quebraDoChefe)).toBe(1);
    expect(e.chefeU8[CHEFE_U8.quebras]).toBe(1);
    // Parado por 180 passos: nenhum telegrafo novo, a Postura em 100.
    const telegrafos = contar(e, EVENTO.telegrafo);
    // (o aparo congela 5 passos, que não contam: o `passo` é que anda.)
    const inicio = e.cab[CAB.passo]!;
    while (e.cab[CAB.passo]! < inicio + 180) {
      avancar(e, D, PARADO, 1);
      expect(postura(), `passo ${e.cab[CAB.passo]! - inicio}`).toBe(100);
    }
    expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBe(0);
    expect(contar(e, EVENTO.telegrafo)).toBe(telegrafos);
    avancar(e, D, PARADO, 1);
    expect(postura()).toBe(0);
    expect(contar(e, EVENTO.quebraAcabou)).toBe(1);
    // Volta livre depois de 30 passos de espera.
    expect([e.inimigos.ataqueFase[s], e.inimigos.ataqueTimer[s]]).toEqual([2, 29]);
  });

  it('sem ganho nem acerto por 60 passos, a Postura cai 20/s: 40 → 0 em 120 passos (± 0,01 por passo)', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL });
    jogadorA(e, s, 400);
    e.chefeF32[CHEFE_F32.postura] = 40;
    e.chefeU16[CHEFE_U16.posturaOciosa] = 0;
    // O chefe fica parado: sem gatilho (o jogador está longe e a espera inicial é de 120 passos).
    for (let k = 1; k <= 59; k++) {
      avancar(e, D, PARADO, 1);
      expect(e.chefeF32[CHEFE_F32.postura], `passo ${k}`).toBe(40);
    }
    let passos = 0;
    let anterior = 40;
    while (e.chefeF32[CHEFE_F32.postura]! > 0 && passos < 200) {
      avancar(e, D, PARADO, 1);
      passos++;
      const p = e.chefeF32[CHEFE_F32.postura]!;
      expect(anterior - p).toBeLessThanOrEqual(20 / 60 + 0.01);
      anterior = p;
    }
    expect(passos).toBeGreaterThanOrEqual(120);
    expect(passos).toBeLessThanOrEqual(121);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(0);
  });
});

describe('dano das armas no chefe (PO6, PO7, F-009.2)', () => {
  const golpe = (e: ReturnType<typeof comChefe>['e'], s: number, dano: number, flags = 0, forma: number = FORMA.ida, pq = 200): number => {
    ACERTO[0] = dano;
    ACERTO[1] = pq;
    const antes = e.inimigos.hp[s]!;
    acertarNoChefe(e, D, s, ARMA.espada_longa_do_juramento, forma, flags);
    return antes - e.inimigos.hp[s]!;
  };

  it('fora da Quebra um acerto de 100 tira 60; na Quebra, 200 com FLAG.critico; o Contra-ataque (já ×2) tira 120 e 400', () => {
    const { e, s } = comChefe();
    expect(golpe(e, s, 100)).toBe(60);
    expect(golpe(e, s, 200, FLAG.contra)).toBe(120);
    e.chefeU16[CHEFE_U16.quebraPassos] = 180;
    e.chefeF32[CHEFE_F32.postura] = 100;
    expect(golpe(e, s, 100)).toBe(200);
    expect(golpe(e, s, 200, FLAG.contra)).toBe(400);
    const ev = eventosDe(e, EVENTO.acerto);
    expect(ev.map((x) => x.flags & FLAG.critico)).toEqual([0, 0, FLAG.critico, FLAG.critico]);
  });

  it('o +50% do nv4 da Espada (pqFator 150 ou 200) não muda o dano na Quebra do chefe', () => {
    const { e, s } = comChefe();
    e.chefeU16[CHEFE_U16.quebraPassos] = 180;
    e.chefeF32[CHEFE_F32.postura] = 100;
    expect(golpe(e, s, 100, 0, FORMA.ida, 150)).toBe(200);
    expect(golpe(e, s, 100, 0, FORMA.ida, 300)).toBe(200);
  });

  it('em transição o acerto é consumido: 0 de dano, 0 de Postura, nenhum evento', () => {
    const { e, s } = comChefe();
    e.chefeU16[CHEFE_U16.transicaoPassos] = 90;
    const eventos = contar(e, EVENTO.acerto);
    expect(golpe(e, s, 5000)).toBe(0);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(0);
    expect(contar(e, EVENTO.acerto)).toBe(eventos);
  });

  it('o chefe não leva Sal: o acerto não grava salPct nem salPassos', () => {
    const { e, s } = comChefe();
    ACERTO[0] = 100;
    ACERTO[1] = 200;
    acertarNoChefe(e, D, s, ARMA.facas_de_sal, FORMA.faca, 0);
    expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]]).toEqual([0, 0]);
  });
});

describe('ganhos de Postura por arma (PO1, F-009.13)', () => {
  it('Espada (ida, volta, estocada) +2, onda +2, Faca +0,5, Círculo +0 que zera a espera da regeneração', () => {
    const { e, s } = comChefe();
    const postura = (): number => e.chefeF32[CHEFE_F32.postura]!;
    const acerto = (forma: number, arma: number): number => {
      const antes = postura();
      ACERTO[0] = 10;
      ACERTO[1] = 200;
      acertarNoChefe(e, D, s, arma, forma, 0);
      return postura() - antes;
    };
    expect(acerto(FORMA.ida, ARMA.espada_longa_do_juramento)).toBe(2);
    expect(acerto(FORMA.volta, ARMA.espada_longa_do_juramento)).toBe(2);
    expect(acerto(FORMA.estocada, ARMA.espada_longa_do_juramento)).toBe(2);
    expect(acerto(FORMA.onda, ARMA.espada_longa_do_juramento)).toBe(2);
    expect(acerto(FORMA.faca, ARMA.facas_de_sal)).toBe(0.5);
    e.chefeU16[CHEFE_U16.posturaOciosa] = 40;
    expect(acerto(FORMA.tick, ARMA.circulo_de_sal)).toBe(0);
    expect(e.chefeU16[CHEFE_U16.posturaOciosa]).toBe(0);
  });

  it('50 acertos de Espada enchem a barra e abrem a Quebra, e nenhum ganho soma durante ela', () => {
    const { e, s } = comChefe();
    for (let i = 0; i < 50; i++) {
      ACERTO[0] = 10;
      ACERTO[1] = 200;
      acertarNoChefe(e, D, s, ARMA.espada_longa_do_juramento, FORMA.ida, 0);
    }
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(100);
    expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBe(180);
    ACERTO[0] = 10;
    acertarNoChefe(e, D, s, ARMA.espada_longa_do_juramento, FORMA.ida, 0);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(100);
    expect(contar(e, EVENTO.quebraDoChefe)).toBe(1);
  });

  it('um ciclo de 1.000 passos com a Espada e o Círculo contra o chefe é reproduzível pelo hash', () => {
    const rodar = (): number => {
      const { e } = comChefe({ cenario: INVULNERAVEL, armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 8 }, { codigo: ARMA.circulo_de_sal, nivel: 8 }] });
      const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }, { passo: 300, mx: -1, my: 0 }, { passo: 600, mx: 0, my: 1 }]);
      avancar(e, D, fonte, 1000);
      return hashEstado(e);
    };
    expect(rodar()).toBe(rodar());
  });
});

describe('Postura por esquiva perfeita (PO1, AT4, Q-15, F-009.11)', () => {
  it('a esquiva perfeita da Vara soma 10; do golpe de um Oco convocado, 0', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL });
    jogadorA(e, s, 100);
    prepararAtaque(e, s, ATQ.vara, 6);
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, [{ passo: e.cab[CAB.passo]!, acoes: ACAO.esquiva, mira: [0, 1] }]);
    avancar(e, D, fonte, 8);
    expect(e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]).toBe(1);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(10);
    // Um Oco: o golpe evitado nos i-frames dá a esquiva perfeita (Poder), mas nenhuma Postura.
    const { e: f, s: sf } = comChefe({ cenario: INVULNERAVEL });
    const oco = nascerInimigo(f, D, TIPO.oco_grande, 300, 300, false);
    f.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    BRUTO[0] = 10;
    resolverAcertoNoJogador(f, D, ORIGEM_DO_DANO.golpe, oco);
    expect(f.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]).toBe(1);
    expect(f.chefeF32[CHEFE_F32.postura]).toBe(0);
    expect(sf).toBeGreaterThanOrEqual(0);
  });

  it('o tick (origem efeito) é evitado pelos i-frames mas não dá Poder, faca extra nem Postura', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL, armas: [{ codigo: ARMA.facas_de_sal, nivel: 1 }] });
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    BRUTO[0] = 1;
    const desfecho = resolverAcertoNoJogador(e, D, ORIGEM_DO_DANO.efeito, s);
    expect(desfecho).toBe(2);
    expect(e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]).toBe(0);
    expect(e.jogador3U8[JOGADOR3_U8.poderPassos]).toBe(0);
    expect(e.jogador3U8[JOGADOR3_U8.facaExtra]).toBe(0);
    expect(e.jogador3U8[JOGADOR3_U8.esquivaPerfeitaDada]).toBe(0);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(0);
  });
});
