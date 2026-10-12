// O surgimento do Lanterneiro (design/decisoes-F-009.md AB1, AB2, LN2, F-009.8, F-009.9): HP pelo nível, a arena de 224 px e o
// diretor sem spawn.
import { describe, expect, it } from 'vitest';
import { surgirChefe } from '../../../src/logica/mundo/chefe';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CAB, CHEFE_F32, CHEFE_U16, CHEFE_U8, FOGUEIRA_F32, FOGUEIRA_U8, JOGADOR, MUNDO, PROGRESSAO, SEM_CHEFE } from '../../../src/logica/nucleo/estado';
import { CAUSA, EVENTO, inicioDoEvento, eventosEscritos } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PARADO } from '../apoio';
import { D, comChefe, estadoDoChefe, vivos } from './apoio';

describe('HP do Lanterneiro (LN2, F-009.8)', () => {
  it('nível 29 dá 14.040; nível 1, 6.760; nível 29 com 1 pendente, 14.300', () => {
    const hp = (nivel: number, pendentes = 0): number => {
      const e = estadoDoChefe({}, D, nivel);
      e.progresso[PROGRESSAO.niveisPendentes] = pendentes;
      // Com nível pendente o modal está aberto e `avancar` não anda: o surgimento é chamado direto.
      const s = surgirChefe(e, D);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(e.inimigos.hp[s]).toBe(e.chefeF32[CHEFE_F32.hpMax]);
      return e.chefeF32[CHEFE_F32.hpMax]!;
    };
    expect(hp(29)).toBe(14_040);
    expect(hp(1)).toBe(6_760);
    expect(hp(29, 1)).toBe(14_300);
  });

  it('o nível que muda depois do surgimento não muda o hpMax', () => {
    const { e, s } = comChefe({}, D, 29);
    e.progresso[PROGRESSAO.nivel] = 40;
    avancar(e, D, PARADO, 30);
    expect(e.chefeF32[CHEFE_F32.hpMax]).toBe(14_040);
    expect(e.inimigos.hp[s]).toBe(14_040);
  });
});

describe('a arena do Lanterneiro (AB1, AB2, AB3, F-009.9)', () => {
  const OBSTACULOS_PERTO = 54;

  it('surge no passo em que o relógio chega a 72.000, com o evento 39, a fase 1, 120 passos de recuperação e a etapa CHEFE', () => {
    const e = estadoDoChefe({}, D, 29);
    expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
    avancar(e, D, PARADO, 1);
    const s = e.chefeU16[CHEFE_U16.slot]!;
    expect(e.cab[CAB.relogio]).toBe(72_000);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(3);
    expect(e.inimigos.tipo[s]).toBe(TIPO.o_lanterneiro);
    expect([e.chefeU8[CHEFE_U8.fase], e.chefeU8[CHEFE_U8.faseMax], e.chefeU8[CHEFE_U8.morto]]).toEqual([1, 1, 0]);
    expect([e.inimigos.ataqueFase[s], e.inimigos.ataqueTimer[s]]).toEqual([2, 120]);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(0);
    let achou = 0;
    for (let k = 0; k < eventosEscritos(e.eventos); k++) if ((e.eventos.u32[inicioDoEvento(k) + 1]! & 0xff) === EVENTO.chefeSurgiu) achou++;
    expect(achou).toBe(1);
  });

  it('o centro é a posição do jogador; o chefe nasce a 144,0 ± 0,01 px dele, na direção 0 da tabela', () => {
    const { e, s } = comChefe();
    const f = e.fogueiraF32;
    expect(f[FOGUEIRA_F32.arenaX]).toBe(e.jogador[JOGADOR.x]);
    expect(f[FOGUEIRA_F32.arenaY]).toBe(e.jogador[JOGADOR.y]);
    const d = Math.hypot(e.inimigos.x[s]! - f[FOGUEIRA_F32.arenaX]!, e.inimigos.y[s]! - f[FOGUEIRA_F32.arenaY]!);
    expect(Math.abs(d - 144)).toBeLessThan(0.01);
    expect(e.inimigos.x[s]! - f[FOGUEIRA_F32.arenaX]!).toBeGreaterThan(143);
  });

  it('os obstáculos com d ≤ 224 + r viram ativo 0 (contagem independente); massa e médios a < 224 morrem por arena, sem mortes', () => {
    const e = estadoDoChefe();
    // Junto de um grupo de obstáculos (o início do jogador não tem nenhum a menos de 224 px).
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 650;
    nascerInimigo(e, D, TIPO.oco_das_lanternas, 400, 650, false);
    nascerInimigo(e, D, TIPO.oco_grande, 150, 710, false);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, 600, 650, false);
    expect(vivos(e)).toBe(3);
    const cx = 300;
    const cy = 650;
    avancar(e, D, PARADO, 1);
    let esperados = 0;
    for (let i = 0; i < D.obstaculos.n; i++) {
      const d = Math.hypot(D.obstaculos.x[i]! - cx, D.obstaculos.y[i]! - cy);
      const dentro = d <= 224 + D.obstaculos.r[i]!;
      if (dentro) esperados++;
      expect(e.obstaculoAtivo[i], `obstáculo ${i}`).toBe(dentro ? 0 : 1);
    }
    expect(esperados).toBeGreaterThan(0);
    expect(OBSTACULOS_PERTO).toBe(D.obstaculos.n);
    // Sobraram o de 300 px e o chefe; os dois de dentro morreram por arena.
    expect(vivos(e)).toBe(2);
    expect(e.mundo[MUNDO.mortes]).toBe(0);
    let porArena = 0;
    for (let k = 0; k < eventosEscritos(e.eventos); k++) {
      const i = inicioDoEvento(k);
      if ((e.eventos.u32[i + 1]! & 0xff) === EVENTO.morte && e.eventos.u32[i + 3]! >>> 16 === CAUSA.arena) porArena++;
    }
    expect(porArena).toBe(2);
  });

  it('o diretor não solta spawn nenhum em 600 passos (AB3) e a Fogueira acesa se apaga', () => {
    const e = estadoDoChefe({ cenario: 8 });
    e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
    avancar(e, D, PARADO, 1);
    expect(e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa]).toBe(0);
    const spawns = e.mundo[MUNDO.spawns]!;
    avancar(e, D, PARADO, 600);
    expect(e.mundo[MUNDO.spawns]).toBe(spawns);
  });
});
