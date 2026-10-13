// A Fúria do Lanterneiro (design/decisoes-F-009.md FU1; F-009.6): +5% do dano bruto a cada 10 s depois de 5 min de luta, com A Fome
// desligada pela flag `semFome`.
import { describe, expect, it } from 'vitest';
import { DADOS_BRUTOS } from '../apoio';
import { surgirChefe } from '../../../src/logica/mundo/chefe';
import { CAB, CENARIO, CHEFE_U16, ETAPA, FASE, FOGUEIRA_U8, JOGADOR4_U8, JOGADOR, type Estado } from '../../../src/logica/nucleo/estado';
import { FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PARADO } from '../apoio';
import { eventosDe } from '../combate/apoio';
import { ATQ, EVENTO, chefeEm, contar, estadoDoChefe, prepararAtaque } from './apoio';

const B = DADOS_BRUTOS;

/** O Vara no passo seguinte, com o relógio em `relogio` nele: devolve o dano bruto do golpe (o do evento). */
function danoDaVara(relogio: number): { dano: number; e: Estado } {
  const e = estadoDoChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.semFome }, B, 29);
  surgirChefe(e, B);
  const s = e.chefeU16[CHEFE_U16.slot]!;
  chefeEm(e, s, 485, 1266);
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 585;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 1266;
  prepararAtaque(e, s, ATQ.vara, 1, [1, 0]);
  e.cab[CAB.relogio] = relogio - 1;
  avancar(e, B, PARADO, 1);
  const golpes = eventosDe(e, EVENTO.golpeInimigo).filter((x) => x.forma === FORMA.varaArco);
  expect(golpes).toHaveLength(1);
  expect(e.cab[CAB.relogio]).toBe(relogio);
  return { dano: golpes[0]!.a, e };
}

describe('Fúria (FU1, F-009.6)', () => {
  it('antes de 90.000 a Vara é 55; em 90.000, 57,75 (n = 1); em 90.599, 57,75; em 90.600, 60,5; em 91.200, 63,25', () => {
    expect(danoDaVara(89_999).dano).toBe(55);
    expect(danoDaVara(90_000).dano).toBe(57.75);
    expect(danoDaVara(90_599).dano).toBe(57.75);
    expect(danoDaVara(90_600).dano).toBe(60.5);
    expect(danoDaVara(91_200).dano).toBe(63.25);
  });

  it('o evento 44 sai em cada mudança de n (90.000, 90.600, 91.200), com n e o fator', () => {
    const e = estadoDoChefe({ cenario: CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.semFome | CENARIO.jogadorInvulneravel }, B, 29);
    surgirChefe(e, B);
    e.cab[CAB.relogio] = 89_990;
    const s = e.chefeU16[CHEFE_U16.slot]!;
    chefeEm(e, s, 485, 1266);
    e.inimigos.ataqueFase[s] = 2;
    e.inimigos.ataqueTimer[s] = 255;
    avancar(e, B, PARADO, 1_300);
    const ev = eventosDe(e, EVENTO.furia);
    expect(ev.map((x) => x.a)).toEqual([1, 2, 3]);
    expect(ev.map((x) => Math.fround(x.b))).toEqual([Math.fround(1.05), Math.fround(1.1), Math.fround(1.15)]);
    expect(contar(e, EVENTO.furia)).toBe(3);
  });

  it('com a flag, A Fome não desce aos 23:00: a etapa segue em CHEFE e a fase em VIVA', () => {
    const { e } = danoDaVara(89_999);
    e.cab[CAB.relogio] = 82_790;
    avancar(e, B, PARADO, 20);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.chefe);
    expect(e.jogador4U8[JOGADOR4_U8.fase]).toBe(FASE.viva);
  });
});
