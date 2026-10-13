// O Amanhecer (design/decisoes-F-009.md AN1 a AN4; F-009.7): a morte do chefe, as Almas do chão, o descarte do que está pendente, os
// 10 s de céu, o fim com as Almas ×1,5 e a Brasa.
import { describe, expect, it } from 'vitest';
import { ARMA } from '../../../src/logica/armas/tabela';
import { iniciarAmanhecer } from '../../../src/logica/mundo/amanhecer';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { almasAoSantuario } from '../../../src/logica/mundo/mancha';
import { faseSemArmas, resultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { aplicarFimDeVigilia, metaPadrao } from '../../../src/logica/save/meta';
import { ACAO } from '../../../src/logica/nucleo/comandos';
import { CAB, CAUSA_DO_FIM, CENARIO, CHEFE_U16, CHEFE_U8, ETAPA, FASE, FOGUEIRA_U8, JOGADOR, JOGADOR4_U8, MUNDO, PROGRESSAO, SEM_CHEFE, hashEstado, TIPO_DE_PICKUP, type Estado } from '../../../src/logica/nucleo/estado';
import { CAUSA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { alocar, quantosAtivos } from '../../../src/logica/nucleo/pool';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS, PARADO } from '../apoio';
import { eventosDe, fonteDeAcoes } from '../combate/apoio';
import { EVENTO, comChefe, vivos } from './apoio';

const D = DADOS_SEM_OBSTACULOS;

/** Um pickup no chão (Alma ou Cinza) longe do jogador. */
function pickup(e: Estado, tipo: number, valor: number): void {
  const s = alocar(e.poolDePickups);
  const p = e.pickups;
  p.x[s] = p.xAnt[s] = e.jogador[JOGADOR.x]! + 600;
  p.y[s] = p.yAnt[s] = e.jogador[JOGADOR.y]! + 600;
  p.valor[s] = valor;
  p.tipo[s] = tipo;
}

/** O chefe vivo, N Almas, uma Alma de 3 e uma Cinza no chão e um Oco parado ao longe; o chefe morre por arma e o passo corre. */
function aposAMorte(almas = 1000): { e: Estado; s: number } {
  const { e, s } = comChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado, armas: [{ codigo: ARMA.facas_de_sal, nivel: 8 }], inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 }] }, D, 29);
  e.progresso[PROGRESSAO.almas] = almas;
  pickup(e, TIPO_DE_PICKUP.alma, 3);
  pickup(e, TIPO_DE_PICKUP.cinza, 7);
  matarInimigo(e, D, s, CAUSA.arma);
  return { e, s };
}

describe('Amanhecer: a morte do chefe (AN1, AN2, F-009.7)', () => {
  it('N = 1.000: o chefe cai (+200, mortes + 1), a Alma do chão entra (1.203); etapa AMANHECER, fase 4, arena desfeita, evento 46', () => {
    const { e } = aposAMorte();
    expect([e.progresso[PROGRESSAO.almas], e.mundo[MUNDO.mortes], e.chefeU8[CHEFE_U8.morto]]).toEqual([1200, 1, 1]);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    avancar(e, D, PARADO, 1);
    expect([e.progresso[PROGRESSAO.almas], e.mundo[MUNDO.mortes]]).toEqual([1203, 1]);
    expect([e.fogueiraU8[FOGUEIRA_U8.etapa], e.jogador4U8[JOGADOR4_U8.fase], e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]]).toEqual([ETAPA.amanhecer, FASE.amanhecer, 0]);
    expect(faseSemArmas(e.jogador4U8[JOGADOR4_U8.fase]!)).toBe(true);
    expect(eventosDe(e, EVENTO.amanhecerIniciado)).toHaveLength(1);
    expect(quantosAtivos(e.poolDePickups)).toBe(0);
    expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
  });

  it('níveis pendentes, baús por fechar e a oferta são descartados', () => {
    // Com um modal aberto o passo não roda (M1), então o descarte é chamado direto, como o fim do passo da morte o faz.
    const { e } = aposAMorte();
    e.progresso[PROGRESSAO.niveisPendentes] = 2;
    e.progresso[PROGRESSAO.bausPorFechar] = 1;
    e.filaDeBaus[0] = 1;
    iniciarAmanhecer(e);
    expect(e.filaDeBaus[0]).toBe(0);
    expect([e.progresso[PROGRESSAO.niveisPendentes], e.progresso[PROGRESSAO.bausPorFechar]]).toEqual([0, 0]);
  });

  it('a morte no passo das 23:00 vale (Amanhecer, não A Fome); o jogador morto no mesmo passo vale o Apagar, e as 200 já entraram', () => {
    const { e } = aposAMorte();
    e.cab[CAB.relogio] = 82_799;
    avancar(e, D, PARADO, 1);
    expect([e.fogueiraU8[FOGUEIRA_U8.etapa], e.jogador4U8[JOGADOR4_U8.fase]]).toEqual([ETAPA.amanhecer, FASE.amanhecer]);
    const { e: m } = aposAMorte();
    m.jogador[JOGADOR.hp] = 0;
    avancar(m, D, PARADO, 1);
    expect([m.jogador4U8[JOGADOR4_U8.fase], m.fogueiraU8[FOGUEIRA_U8.etapa], m.progresso[PROGRESSAO.almas]]).toEqual([FASE.apagando, ETAPA.chefe, 1200]);
  });
});

describe('Amanhecer: os 10 s de céu (AN4, F-009.7)', () => {
  it('no 1º passo todo inimigo vivo some sem Cinza, Alma nem mortes; armas e pickups parados; relógio parado; o jogador anda', () => {
    const { e } = aposAMorte();
    avancar(e, D, PARADO, 1);
    expect(vivos(e)).toBe(1);
    const relogio = e.cab[CAB.relogio];
    const x = e.jogador[JOGADOR.x]!;
    avancar(e, D, fonteDeAcoes([], { mx: 1, my: 0 }), 1);
    expect([vivos(e), e.mundo[MUNDO.mortes], quantosAtivos(e.poolDePickups), quantosAtivos(e.poolDeProjeteis)]).toEqual([0, 1, 0, 0]);
    avancar(e, D, fonteDeAcoes([], { mx: 1, my: 0 }), 100);
    expect(e.cab[CAB.relogio]).toBe(relogio);
    expect(e.jogador[JOGADOR.x]! - x).toBeGreaterThan(30);
    expect([vivos(e), e.mundo[MUNDO.mortes], e.progresso[PROGRESSAO.almas]]).toEqual([0, 1, 1203]);
  });

  it('o FIM vem exatamente no passo 600: Santuário = ⌊(3N + 1)/2⌋ (N = 1.203 dá 1.805; N ímpar 1.201 dá 1.802); Brasa 1; sem mancha', () => {
    const { e } = aposAMorte();
    avancar(e, D, PARADO, 1);
    avancar(e, D, PARADO, 599);
    expect([e.chefeU16[CHEFE_U16.amanhecerPassos], e.jogador4U8[JOGADOR4_U8.fase]]).toEqual([599, FASE.amanhecer]);
    avancar(e, D, PARADO, 1);
    expect([e.chefeU16[CHEFE_U16.amanhecerPassos], e.jogador4U8[JOGADOR4_U8.fase], e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([600, FASE.fim, CAUSA_DO_FIM.amanhecer]);
    const r = resultadoDaVigilia(e, D);
    expect([r.almas, r.almasAoSantuario, r.brasas, r.mancha, r.chefeDerrotado, r.chefeFase]).toEqual([1203, 1805, 1, null, true, 1]);
    // Em FIM nada mais anda.
    avancar(e, D, PARADO, 5);
    expect(e.chefeU16[CHEFE_U16.amanhecerPassos]).toBe(600);
    const { e: impar } = aposAMorte(998);
    avancar(impar, D, PARADO, 601);
    expect(resultadoDaVigilia(impar, D).almasAoSantuario).toBe(1802);
    expect([0, 1, 2, 3, 1200, 1201].map((n) => almasAoSantuario(CAUSA_DO_FIM.amanhecer, n, 0))).toEqual([0, 2, 3, 5, 1800, 1802]);
  });

  it('o meta: 0 → 1 Brasa, as Almas do Santuário somam as ×1,5 e a mancha antiga fica (D7 MC3)', () => {
    const { e } = aposAMorte();
    avancar(e, D, PARADO, 601);
    const antiga = { x: 5, y: 6, hora: 1, rotulo: null, almas: 40 } as const;
    const m = aplicarFimDeVigilia({ ...metaPadrao(), mancha: antiga }, resultadoDaVigilia(e, D));
    expect([m.brasas, m.almas, m.mancha, m.primeiroApagarFeito]).toEqual([1, 1805, antiga, false]);
  });

  it('o Abandonar vale também no Amanhecer; o chefe morto não ressurge nem a Fome desce depois dele', () => {
    const { e } = aposAMorte();
    e.cab[CAB.relogio] = 82_799;
    avancar(e, D, PARADO, 50);
    expect(eventosDe(e, EVENTO.fomeDesceu)).toHaveLength(0);
    expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
    avancar(e, D, fonteDeAcoes([{ passo: e.cab[CAB.passo]!, acoes: ACAO.abandonar }]), 1);
    expect(e.jogador4U8[JOGADOR4_U8.causaDoFim]).toBe(CAUSA_DO_FIM.abandonar);
  });

  it('é determinístico: duas execuções iguais (morte, Amanhecer inteiro e FIM) dão o mesmo hash; a Fome idem', () => {
    const rodar = (fome: boolean): number => {
      const { e } = aposAMorte();
      if (fome) {
        e.chefeU8[CHEFE_U8.morto] = 0;
        e.cab[CAB.relogio] = 82_799;
      }
      avancar(e, D, fonteDeAcoes([], { mx: 1, my: 0 }), fome ? 700 : 650);
      return hashEstado(e);
    };
    expect(rodar(false)).toBe(rodar(false));
    expect(rodar(true)).toBe(rodar(true));
    expect(rodar(false)).not.toBe(rodar(true));
  });
});
