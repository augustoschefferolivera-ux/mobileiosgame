// A Fome (design/decisoes-F-009.md FM1 a FM3; F-009.4): 23:00 com o chefe vivo, o dreno de HP que só cresce, o corte do combate,
// o Frasco recusado, o fim sem APAGANDO e a Hora "A Fome" da mancha.
import { describe, expect, it } from 'vitest';
import { ARMA } from '../../../src/logica/armas/tabela';
import { almasNaMancha, HORA_A_FOME } from '../../../src/logica/mundo/mancha';
import { faseSemArmas, resultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { ACAO } from '../../../src/logica/nucleo/comandos';
import { CAB, CAUSA_DO_FIM, CENARIO, CHEFE_U16, CHEFE_U32, ETAPA, FASE, FOGUEIRA_U8, JOGADOR, JOGADOR2, JOGADOR3_U8, JOGADOR4_U8, MUNDO, PROGRESSAO, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ELMO } from '../progressao/apoio';
import { DADOS_BRUTOS, DADOS_SEM_OBSTACULOS, PARADO } from '../apoio';
import { eventosDe, fonteDeAcoes } from '../combate/apoio';
import { EVENTO, comChefe, vivos } from './apoio';

/** Com a Brasa Firme (×0,8 com a stamina acima do limiar) e sem obstáculos. */
const D = DADOS_SEM_OBSTACULOS;
const f = Math.fround;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;

/** O chefe vivo, o jogador mortal, Facas de Sal em campo e um Oco parado ao longe; o relógio em 82.799 (um passo antes das 23:00). */
function aUmPassoDaFome(extras: { passivas?: { codigo: number; nivel: number }[] } = {}): Estado {
  const { e } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado, armas: [{ codigo: ARMA.facas_de_sal, nivel: 8 }], inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 }], ...extras }, D, 29);
  e.cab[CAB.relogio] = 82_799;
  return e;
}

describe('A Fome: gatilho e corte (FM1, F-009.4)', () => {
  it('em 82.800 com o chefe vivo: etapa A_FOME, fase 3, sem armas; o evento 47 uma vez; mortes, Almas, inimigos e relógio parados', () => {
    const e = aUmPassoDaFome();
    const mortes = e.mundo[MUNDO.mortes];
    const almas = e.progresso[PROGRESSAO.almas];
    avancar(e, D, PARADO, 1);
    expect([e.fogueiraU8[FOGUEIRA_U8.etapa], e.jogador4U8[JOGADOR4_U8.fase], e.cab[CAB.relogio]]).toEqual([ETAPA.aFome, FASE.aFome, 82_800]);
    expect(faseSemArmas(e.jogador4U8[JOGADOR4_U8.fase]!)).toBe(true);
    expect(eventosDe(e, EVENTO.fomeDesceu)).toHaveLength(1);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(0);
    const parado = Array.from(e.inimigos.x.slice(0, 64));
    const posicao = [e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]];
    avancar(e, D, PARADO, 100);
    expect([e.mundo[MUNDO.mortes], e.progresso[PROGRESSAO.almas]]).toEqual([mortes, almas]);
    expect(Array.from(e.inimigos.x.slice(0, 64))).toEqual(parado);
    expect(e.cab[CAB.relogio]).toBe(82_800);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(0);
    expect(posicao).toEqual([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]);
    expect(eventosDe(e, EVENTO.fomeDesceu)).toHaveLength(1);
  });

  it('o corte zera os telegrafos, a zona, a cegueira e o Agarrar e o Frasco em curso, sem evento; o Frasco, a esquiva e o aparo são recusados', () => {
    const e = aUmPassoDaFome();
    e.chefeU16[CHEFE_U16.cegoPassos] = 50;
    e.chefeU16[CHEFE_U16.zonaTimer1] = 100;
    e.jogador4U8[JOGADOR4_U8.frascoPasso] = 30;
    e.jogador[JOGADOR.hp] = 50;
    avancar(e, D, PARADO, 1);
    expect([e.chefeU16[CHEFE_U16.cegoPassos], e.chefeU16[CHEFE_U16.zonaTimer1], e.jogador4U8[JOGADOR4_U8.frascoPasso]]).toEqual([0, 0, 0]);
    expect(e.inimigos.ataqueFase.every((x) => x === 0)).toBe(true);
    const cargas = e.jogador4U8[JOGADOR4_U8.frascoCargas];
    const eventos = eventosDe(e, EVENTO.frascoIniciado).length;
    avancar(e, D, fonteDeAcoes([{ passo: e.cab[CAB.passo]!, acoes: ACAO.frasco | ACAO.esquiva | ACAO.aparo }]), 5);
    expect([e.jogador4U8[JOGADOR4_U8.frascoCargas], eventosDe(e, EVENTO.frascoIniciado).length, e.jogador3U8[JOGADOR3_U8.esquivaPasso], e.jogador3U8[JOGADOR3_U8.aparoJanela]]).toEqual([cargas, eventos, 0, 0]);
  });

  it('a transição de fase em curso adia a Fome; com a flag semFome ela não desce', () => {
    const e = aUmPassoDaFome();
    e.chefeU16[CHEFE_U16.transicaoPassos] = 3;
    avancar(e, D, PARADO, 2);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.chefe);
    const g = aUmPassoDaFome();
    g.cab[CAB.cenario] = g.cab[CAB.cenario]! | CENARIO.semFome;
    avancar(g, D, PARADO, 5);
    expect([g.fogueiraU8[FOGUEIRA_U8.etapa], g.cab[CAB.relogio]]).toEqual([ETAPA.chefe, 82_804]);
  });
});

describe('A Fome: o dreno (FM2, FM3, F-009.4)', () => {
  it('sem armadura e com Brasa Firme: o 1º tick no passo 10 é hpMax × 18/1800 × 0,8; o HP zera no 52º tick (passo 520) e a Vigília termina em a_fome', () => {
    const e = aUmPassoDaFome();
    e.progresso[PROGRESSAO.almas] = 1000;
    const hpMax = e.jogador2[JOGADOR2.hpMax]!;
    avancar(e, D, PARADO, 1);
    avancar(e, D, PARADO, 9);
    expect(hp(e)).toBe(hpMax);
    avancar(e, D, PARADO, 1);
    expect(e.chefeU32[CHEFE_U32.fomePassos]).toBe(10);
    expect(hpMax - hp(e)).toBeCloseTo((hpMax * 18 * 0.8) / 1800, 4);
    // O tick k (0, 1, …) fere hpMax × (18 + k)/1800 × 0,8; o HP zera no 52º.
    let passos = 10;
    let ticks = 1;
    while (e.jogador4U8[JOGADOR4_U8.fase] === FASE.aFome) {
      avancar(e, D, PARADO, 1);
      passos++;
      if (passos % 10 === 0) ticks++;
      if (passos > 2_000) throw new Error('a fome não terminou');
    }
    expect([passos, ticks]).toEqual([520, 52]);
    expect([e.jogador4U8[JOGADOR4_U8.fase], e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([FASE.fim, CAUSA_DO_FIM.aFome]);
    expect(hp(e)).toBe(0);
    const r = resultadoDaVigilia(e, D);
    expect([r.mancha?.almas, r.mancha?.hora, r.almasAoSantuario]).toEqual([Math.floor((3 * 1000 + 5) / 10), HORA_A_FOME, 1000 - Math.floor((3 * 1000 + 5) / 10)]);
    expect(r.mancha!.almas).toBe(almasNaMancha(CAUSA_DO_FIM.aFome, 1000, 30));
    expect([r.brasas, r.chefeFase, r.chefeDerrotado]).toEqual([0, 1, false]);
  });

  it('o dano cresce a cada tick (+2% do hpMax/s por tick) e passa pela armadura: com A = 20 também termina, mais tarde que sem ela e antes de 1.500 passos', () => {
    const e = aUmPassoDaFome({ passivas: [{ codigo: ELMO, nivel: 5 }] });
    avancar(e, D, PARADO, 1);
    const antes: number[] = [];
    let ultimo = hp(e);
    let passos = 0;
    while (e.jogador4U8[JOGADOR4_U8.fase] === FASE.aFome) {
      avancar(e, D, PARADO, 1);
      passos++;
      if (passos % 10 === 0) {
        antes.push(f(ultimo - hp(e)));
        ultimo = hp(e);
      }
      if (passos > 2_000) throw new Error('a fome não terminou');
    }
    expect(passos).toBeGreaterThan(520);
    expect(passos).toBeLessThan(1500);
    expect(antes.slice(0, -1).every((d, k) => k === 0 || d > antes[k - 1]!)).toBe(true);
    expect(e.jogador4U8[JOGADOR4_U8.causaDoFim]).toBe(CAUSA_DO_FIM.aFome);
  });

  it('o tick fere pelo evento danoAoJogador com a origem fome (5)', () => {
    const e = aUmPassoDaFome();
    avancar(e, D, PARADO, 11);
    expect(hp(e)).toBeLessThan(e.jogador2[JOGADOR2.hpMax]!);
    const danos = eventosDe(e, EVENTO.danoAoJogador);
    expect(danos.at(-1)!.forma).toBe(5);
  });

  it('o jogador anda durante a fome (só a caminhada vale)', () => {
    const e = aUmPassoDaFome();
    avancar(e, DADOS_BRUTOS, PARADO, 1);
    const x = e.jogador[JOGADOR.x]!;
    avancar(e, DADOS_BRUTOS, fonteDeAcoes([], { mx: 1, my: 0 }), 20);
    expect(e.jogador[JOGADOR.x]! - x).toBeGreaterThan(10);
  });

  it('o Abandonar da pausa vale em A Fome (causa abandonar, sem mancha)', () => {
    const e = aUmPassoDaFome();
    avancar(e, D, PARADO, 1);
    avancar(e, D, fonteDeAcoes([{ passo: e.cab[CAB.passo]!, acoes: ACAO.abandonar }]), 1);
    expect([e.jogador4U8[JOGADOR4_U8.fase], e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([FASE.fim, CAUSA_DO_FIM.abandonar]);
  });

  it('vivos: o chefe e o Oco seguem vivos durante a fome (nada morre de fome)', () => {
    const e = aUmPassoDaFome();
    avancar(e, D, PARADO, 200);
    expect(vivos(e)).toBe(2);
  });
});
