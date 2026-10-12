// A Fogueira (design/decisoes-F-008.md FG1 a FG9; critérios F-008.4e e F-008.4f): dentro do raio de 64 px o tempo da Vigília
// para; Descansar e Forjar valem uma vez; Partir, sair do raio e a Fogueira ignorada; a sombra é o último passo dentro do raio.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import {
  CAB,
  ETAPA,
  FOGUEIRA_F32,
  FOGUEIRA_U8,
  JOGADOR,
  JOGADOR2,
  JOGADOR4,
  JOGADOR4_U32,
  JOGADOR4_U8,
  MUNDO,
  PROGRESSAO,
  hashEstado,
  type Estado,
} from '../../../src/logica/nucleo/estado';
import { alocar, quantosAtivos } from '../../../src/logica/nucleo/pool';
import { TIPO_DE_PROJETIL } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { FNV_BASE, fnv1aBytes } from '../../../src/logica/nucleo/hash';
import { sombraDaFogueira } from '../../../src/logica/mundo/fogueira';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { PARADO } from '../apoio';
import { eventosDe } from '../combate/apoio';
import { D, ELMO, ESPADA, estadoDe, J } from '../progressao/apoio';

const HORA = [18000, 36000, 54000];
const u = (e: Estado, campo: keyof typeof FOGUEIRA_U8): number => e.fogueiraU8[FOGUEIRA_U8[campo]]!;

/** Vigília parada na Fogueira da hora `h` (1 a 3), a `dx` px do jogador; o 1º passo abre se `dx ≤ 64`. */
function comFogueira(dx: number, h = 1, extra: Parameters<typeof estadoDe>[2] = {}): Estado {
  const e = estadoDe([[ESPADA, 8]], [[ELMO, 1]], {
    relogioInicial: HORA[h - 1],
    inicioLivre: true,
    almasIniciais: 400,
    ...extra,
  });
  e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
  e.fogueiraU8[FOGUEIRA_U8.fogueiraHora] = h;
  e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = J.x + dx;
  e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = J.y;
  return e;
}

const acoesEm = (acoes: readonly AcaoDeRoteiro[]) => fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoes);

describe('entrar no raio e o tempo parado (FG2, FG3; F-008.4e)', () => {
  it('a 64 px abre; a 65 px não', () => {
    const a = comFogueira(64);
    avancar(a, D, PARADO, 1);
    expect(u(a, 'etapa')).toBe(ETAPA.fogueira);
    expect(eventosDe(a, EVENTO.fogueiraAberta)).toHaveLength(1);
    const b = comFogueira(65);
    avancar(b, D, PARADO, 1);
    expect(u(b, 'etapa')).toBe(ETAPA.hora);
  });

  it('em 120 passos: relógio, posições, HP dos inimigos, timers das armas e HP do jogador não mudam; sem acerto', () => {
    const e = comFogueira(30);
    const slot = nascer(e, 10);
    avancar(e, D, PARADO, 1);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
    const acertosAntes = eventosDe(e, EVENTO.acerto).length;
    const antes = {
      relogio: e.cab[CAB.relogio],
      x: e.inimigos.x[slot],
      y: e.inimigos.y[slot],
      hp: e.inimigos.hp[slot],
      armas: [...e.build.recarga, ...e.build.golpe, ...e.build.esperaGolpe, ...e.build.esperaPulso, ...e.build.caSeq, ...e.build.caEspera],
      hpJogador: e.jogador[JOGADOR.hp],
      passo: e.cab[CAB.passo],
    };
    avancar(e, D, PARADO, 120);
    expect(e.cab[CAB.relogio]).toBe(antes.relogio);
    expect(e.cab[CAB.passo]).toBe(antes.passo! + 120);
    expect([e.inimigos.x[slot], e.inimigos.y[slot], e.inimigos.hp[slot]]).toEqual([antes.x, antes.y, antes.hp]);
    expect([...e.build.recarga, ...e.build.golpe, ...e.build.esperaGolpe, ...e.build.esperaPulso, ...e.build.caSeq, ...e.build.caEspera]).toEqual(antes.armas);
    expect(e.jogador[JOGADOR.hp]).toBe(antes.hpJogador);
    expect(eventosDe(e, EVENTO.acerto)).toHaveLength(acertosAntes);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
  });

  it('os telegrafos em curso são cancelados ao entrar', () => {
    const e = comFogueira(30);
    const slot = nascer(e, 200);
    e.inimigos.ataqueFase[slot] = 1;
    e.inimigos.ataqueTimer[slot] = 20;
    avancar(e, D, PARADO, 1);
    expect([e.inimigos.ataqueFase[slot], e.inimigos.ataqueTimer[slot]]).toEqual([0, 0]);
  });

  it('ao abrir, todo Sal inimigo é liberado (perto e longe); a faca do jogador fica (FG3)', () => {
    const e = comFogueira(30);
    const pôr = (dx: number, tipo: number): number => {
      const p = alocar(e.poolDeProjeteis);
      e.projeteis.x[p] = e.projeteis.xAnt[p] = J.x + dx;
      e.projeteis.y[p] = e.projeteis.yAnt[p] = J.y + 150;
      e.projeteis.vida[p] = 100;
      e.projeteis.tipo[p] = tipo;
      return p;
    };
    const salPerto = pôr(20, TIPO_DE_PROJETIL.sal);
    const salLonge = pôr(300, TIPO_DE_PROJETIL.sal);
    const faca = pôr(60, TIPO_DE_PROJETIL.faca);
    avancar(e, D, PARADO, 1);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
    expect(e.poolDeProjeteis.posicao[salPerto]!).toBeLessThan(0);
    expect(e.poolDeProjeteis.posicao[salLonge]!).toBeLessThan(0);
    expect(e.poolDeProjeteis.posicao[faca]!).toBeGreaterThanOrEqual(0);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(1);
  });

  it('a mancha segue valendo na Fogueira: encostar nela devolve as Almas (D8: a mancha roda em FOGUEIRA)', () => {
    const e = comFogueira(30);
    avancar(e, D, PARADO, 1);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
    e.jogador4U8[JOGADOR4_U8.manchaAtiva] = 1;
    e.jogador4[JOGADOR4.manchaX] = e.jogador[JOGADOR.x]! + 20;
    e.jogador4[JOGADOR4.manchaY] = e.jogador[JOGADOR.y]!;
    e.jogador4U32[JOGADOR4_U32.manchaAlmas] = 84;
    const almas = e.progresso[PROGRESSAO.almas]!;
    avancar(e, D, PARADO, 1);
    expect(e.jogador4U8[JOGADOR4_U8.manchaAtiva]).toBe(0);
    expect(e.progresso[PROGRESSAO.almas]).toBe(almas + 84);
    expect(eventosDe(e, EVENTO.manchaRecuperada)).toHaveLength(1);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
  });

  it('esquiva e aparo são ignorados sem custo; o jogador anda', () => {
    const e = comFogueira(30);
    avancar(e, D, PARADO, 1);
    const stamina = e.jogador3[0]!;
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }], undefined, [{ passo: e.cab[CAB.passo]!, acoes: ACAO.esquiva | ACAO.aparo }]);
    const x = e.jogador[JOGADOR.x]!;
    avancar(e, D, fonte, 1);
    expect(e.jogador3[0]).toBe(stamina);
    expect(e.jogador[JOGADOR.x]!).toBeGreaterThan(x);
    expect(eventosDe(e, EVENTO.esquiva)).toHaveLength(0);
  });
});

/** Nasce um Oco das Lanternas a `dx` px do jogador e devolve o slot. */
function nascer(e: Estado, dx: number): number {
  const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, J.x + dx, J.y, false);
  if (s < 0) throw new Error('pool cheio');
  return s;
}

describe('Descansar (FG4, FG7)', () => {
  it('HP no máximo, 3 cargas, I = 1,1; a 2ª vez é negada', () => {
    const e = comFogueira(30);
    e.jogador[JOGADOR.hp] = 10;
    e.jogador4U8[JOGADOR4_U8.frascoCargas] = 0;
    avancar(e, D, acoesEm([{ passo: 1, acoes: ACAO.descansar }]), 3);
    expect(e.jogador[JOGADOR.hp]).toBe(e.jogador2[JOGADOR2.hpMax]);
    expect(e.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(D.combate.frascoCargas);
    expect(e.mundo[MUNDO.intensidade10]).toBe(11);
    expect(eventosDe(e, EVENTO.descansou)).toHaveLength(1);
    avancar(e, D, acoesEm([{ passo: e.cab[CAB.passo]!, acoes: ACAO.descansar }]), 1);
    expect(eventosDe(e, EVENTO.descansou)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.acaoNegada).some((x) => x.forma === ACAO.descansar)).toBe(true);
  });

  it('zera a cura do Frasco em curso sem devolver a carga', () => {
    const e = comFogueira(30);
    e.jogador[JOGADOR.hp] = 10;
    e.jogador4U8[JOGADOR4_U8.frascoCargas] = 2;
    avancar(e, D, acoesEm([{ passo: 1, acoes: ACAO.frasco }]), 3);
    expect(e.jogador4U8[JOGADOR4_U8.frascoPasso]).toBeGreaterThan(0);
    avancar(e, D, acoesEm([{ passo: e.cab[CAB.passo]!, acoes: ACAO.descansar }]), 1);
    expect(e.jogador4U8[JOGADOR4_U8.frascoPasso]).toBe(0);
    expect(e.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(D.combate.frascoCargas);
  });
});

describe('Forjar União (FG5)', () => {
  const casos = [
    { hora: 1, custo: 150 },
    { hora: 2, custo: 250 },
    { hora: 3, custo: 400 },
  ];
  for (const { hora, custo } of casos) {
    it(`hora ${hora}: ${custo - 1} Almas negado; ${custo} debita e a Espada vira a União nv1`, () => {
      const pobre = comFogueira(30, hora, { almasIniciais: custo - 1 });
      avancar(pobre, D, acoesEm([{ passo: 1, acoes: ACAO.forjar }]), 3);
      expect(pobre.progresso[PROGRESSAO.almas]).toBe(custo - 1);
      expect(pobre.build.codigo[0]).toBe(ESPADA);
      expect(eventosDe(pobre, EVENTO.forjou)).toHaveLength(0);
      expect(eventosDe(pobre, EVENTO.acaoNegada).some((x) => x.forma === ACAO.forjar)).toBe(true);

      const e = comFogueira(30, hora, { almasIniciais: custo });
      avancar(e, D, acoesEm([{ passo: 1, acoes: ACAO.forjar }]), 3);
      expect(e.progresso[PROGRESSAO.almas]).toBe(0);
      expect(e.build.codigo[0]).not.toBe(ESPADA);
      expect(e.build.nivel[0]).toBe(1);
      const ev = eventosDe(e, EVENTO.forjou);
      expect(ev).toHaveLength(1);
      expect([ev[0]!.a, ev[0]!.b]).toEqual([custo, hora]);
      expect(u(e, 'fogueiraAcoes') & 2).toBe(2);
      // Uma vez por Fogueira.
      e.progresso[PROGRESSAO.almas] = 1000;
      avancar(e, D, acoesEm([{ passo: e.cab[CAB.passo]!, acoes: ACAO.forjar }]), 1);
      expect(e.progresso[PROGRESSAO.almas]).toBe(1000);
    });
  }

  it('sem a Espada nv8 e o Elmo, a Forja é negada mesmo com Almas', () => {
    const e = comFogueira(30, 1, {});
    e.build.nivel[0] = 7;
    avancar(e, D, acoesEm([{ passo: 1, acoes: ACAO.forjar }]), 3);
    expect(e.progresso[PROGRESSAO.almas]).toBe(400);
    expect(eventosDe(e, EVENTO.forjou)).toHaveLength(0);
  });

  it('o relógio < 10:00 não impede (sem o gate do baú)', () => {
    const e = comFogueira(30, 1);
    expect(e.cab[CAB.relogio]!).toBeLessThan(36000);
    avancar(e, D, acoesEm([{ passo: 1, acoes: ACAO.forjar }]), 3);
    expect(eventosDe(e, EVENTO.forjou)).toHaveLength(1);
  });
});

describe('Partir, sair do raio e a Fogueira ignorada (FG6, FG9; F-008.4f)', () => {
  it('o bit Partir apaga a Fogueira, volta a HORA e guarda a sombra do estado anterior', () => {
    const e = comFogueira(30);
    avancar(e, D, PARADO, 5);
    const hashAntes = hashEstado(e);
    const passoAntes = e.cab[CAB.passo]!;
    avancar(e, D, acoesEm([{ passo: passoAntes, acoes: ACAO.partir }]), 1);
    expect(u(e, 'etapa')).toBe(ETAPA.hora);
    expect(u(e, 'fogueiraAcesa')).toBe(0);
    expect(e.cab[CAB.passo]).toBe(passoAntes + 1);
    const p = eventosDe(e, EVENTO.fogueiraPartiu);
    expect(p).toHaveLength(1);
    expect(p[0]!.forma).toBe(1);
    expect(eventosDe(e, EVENTO.fogueiraApagada)).toHaveLength(1);
    const s = sombraDaFogueira(e)!;
    expect(s.length).toBe(e.bytes.length);
    expect(fnv1aBytes(FNV_BASE, s)).toBe(hashAntes);
  });

  it('Descansar e Forjar no mesmo passo do Partir entram na sombra (divergência 15)', () => {
    const e = comFogueira(30);
    avancar(e, D, PARADO, 3);
    e.jogador[JOGADOR.hp] = 10;
    e.jogador4U8[JOGADOR4_U8.frascoCargas] = 0;
    avancar(e, D, acoesEm([{ passo: e.cab[CAB.passo]!, acoes: ACAO.descansar | ACAO.forjar | ACAO.partir }]), 1);
    expect(u(e, 'etapa')).toBe(ETAPA.hora);
    const s = sombraDaFogueira(e)!;
    const lido = estadoDe([[ESPADA, 8]], [[ELMO, 1]], { relogioInicial: HORA[0], inicioLivre: true });
    lido.bytes.set(s);
    expect(lido.jogador[JOGADOR.hp]).toBe(lido.jogador2[JOGADOR2.hpMax]);
    expect(lido.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(D.combate.frascoCargas);
    expect(lido.mundo[MUNDO.intensidade10]).toBe(11);
    expect(lido.build.codigo[0]).not.toBe(ESPADA);
    expect(lido.progresso[PROGRESSAO.almas]).toBe(400 - 150);
    expect(lido.fogueiraU8[FOGUEIRA_U8.fogueiraAcoes]).toBe(3);
    expect(lido.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.fogueira);
    // Telemetria: o evento 36 leva a Fogueira, a hora (1) e os bits das ações usadas (Descansar 1 + Forjar 2); o 34, o HP máximo e a hora.
    const partiu = eventosDe(e, EVENTO.fogueiraPartiu)[0]!;
    expect([partiu.x, partiu.y, partiu.a, partiu.b, partiu.forma]).toEqual([J.x + 30, J.y, 1, 3, 1]);
    const desc = eventosDe(e, EVENTO.descansou)[0]!;
    expect([desc.a, desc.b]).toEqual([lido.jogador2[JOGADOR2.hpMax], 1]);
  });

  it('sair a 65 px é Partir (forma 2); a sombra tem o hash do estado de antes do passo', () => {
    const e = comFogueira(60);
    avancar(e, D, PARADO, 3);
    expect(u(e, 'etapa')).toBe(ETAPA.fogueira);
    // Anda para longe da Fogueira (para a esquerda, +) até sair.
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }]);
    let n = 0;
    while (u(e, 'etapa') === ETAPA.fogueira && n++ < 200) {
      const antes = hashEstado(e);
      avancar(e, D, fonte, 1);
      if (u(e, 'etapa') !== ETAPA.fogueira) {
        const s = sombraDaFogueira(e)!;
        expect(fnv1aBytes(FNV_BASE, s)).toBe(antes);
      }
    }
    expect(u(e, 'etapa')).toBe(ETAPA.hora);
    expect(u(e, 'fogueiraAcesa')).toBe(0);
    expect(eventosDe(e, EVENTO.fogueiraPartiu)[0]!.forma).toBe(2);
  });

  it('Fogueira ignorada fica acesa até o marco seguinte (36.000) e some no início dele', () => {
    const e = comFogueira(300, 1);
    avancar(e, D, PARADO, 100);
    expect(u(e, 'fogueiraAcesa')).toBe(1);
    e.cab[CAB.relogio] = 35990;
    avancar(e, D, PARADO, 5);
    expect(u(e, 'fogueiraAcesa')).toBe(1);
    avancar(e, D, PARADO, 10);
    expect(u(e, 'fogueiraAcesa')).toBe(0);
    expect(u(e, 'etapa')).toBe(ETAPA.marco);
    expect(eventosDe(e, EVENTO.fogueiraApagada)).toHaveLength(1);
  });

  it('a da Hora III some às 20:00 e a etapa vira CHEFE', () => {
    const e = comFogueira(300, 3);
    e.cab[CAB.relogio] = 71995;
    avancar(e, D, PARADO, 10);
    expect(u(e, 'fogueiraAcesa')).toBe(0);
    expect(u(e, 'etapa')).toBe(ETAPA.chefe);
  });
});
