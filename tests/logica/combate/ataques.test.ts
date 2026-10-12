// Ataques dos inimigos (design/decisoes-F-006.md §5, ET4 fase 6; critério F-006.11): o golpe em arco do
// Oco Grande (OG1 a OG11), o projétil de Sal da Noviça (NV1 a NV6) e o Sal no jogador (NV7). Os testes de
// fronteira chamam `rodarAtaques` direto, com o inimigo já na distância a provar (a horda anda antes do
// passo: 1,68 px do Oco Grande e 1,92 px da Noviça); os de ciclo rodam `avancar`. A Postura Quebrada
// (OG10) e o aparo são da etapa seguinte.
import { describe, expect, it } from 'vitest';
import inimigosJson from '../../../src/dados/inimigos.json';
import { moverProjeteis } from '../../../src/logica/armas/projeteis';
import { rodarAtaques, FASE_DO_ATAQUE } from '../../../src/logica/mundo/ataques';
import { ORIGEM_DO_DANO } from '../../../src/logica/mundo/contato';
import { removerInimigo } from '../../../src/logica/mundo/inimigos';
import { RAIO_DO_JOGADOR } from '../../../src/logica/mundo/jogador';
import { LARGURA_DO_MAPA } from '../../../src/logica/mundo/toro';
import { CAB, CAPACIDADE_DE_PROJETEIS, CENARIO, JOGADOR, JOGADOR3_U16, JOGADOR3_U8, JOGADOR_U8, MUNDO, TIPO_DE_PROJETIL, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { alocar, quantosAtivos } from '../../../src/logica/nucleo/pool';
import { PARADO } from '../apoio';
import { D_LIVRE as D, TIPO, criar, esquivaEm, eventosDe, fonteDeAcoes, junto, posicionar, posJogador, slotsVivos } from './apoio';

const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const INV = ATQ | CENARIO.jogadorInvulneravel;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const u8 = (e: Estado, campo: keyof typeof JOGADOR3_U8): number => e.jogador3U8[JOGADOR3_U8[campo]]!;
const SEM_ATAQUE = { codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 };

/** Um passo de cada vez, `n` vezes (CAB.passo = o do evento). */
function rodar(e: Estado, n: number, fonte = PARADO): void {
  for (let i = 0; i < n; i++) avancar(e, D, fonte, 1);
}

/** O primeiro (e único) inimigo do estado. */
const slotUnico = (e: Estado): number => slotsVivos(e)[0]!;

/** Estado com um Oco Grande a (dx, dy) do jogador. */
function comGrande(dx: number, dy: number, cenario = ATQ): { e: Estado; s: number } {
  const e = criar({ cenario, inimigos: [{ codigo: TIPO.oco_grande, dx, dy }] });
  return { e, s: slotUnico(e) };
}

/** Estado com uma Noviça a (dx, dy) do jogador. */
function comNovica(dx: number, dy: number, cenario = ATQ): { e: Estado; s: number } {
  const e = criar({ cenario, inimigos: [{ codigo: TIPO.novica_de_sal, dx, dy }] });
  return { e, s: slotUnico(e) };
}

/** Põe o Oco Grande `s` de modo que o jogador fique a (ox, oy) do Oco, no último passo do telegrafo, com a mira dada. */
function prepararGolpe(e: Estado, s: number, ox: number, oy: number, mira: readonly [number, number]): void {
  const [jx, jy] = posJogador(e);
  posicionar(e, s, jx - ox, jy - oy);
  e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
  e.inimigos.ataqueTimer[s] = 1;
  e.inimigos.miraX[s] = mira[0];
  e.inimigos.miraY[s] = mira[1];
}

/** Desfecho do golpe (campo `b` do evento 12) com o jogador a (ox, oy) do Oco e a mira (1, 0) por padrão. */
function desfechoDoGolpe(ox: number, oy: number, mira: readonly [number, number] = [1, 0]): number {
  const { e, s } = comGrande(300, 300, ATQ);
  prepararGolpe(e, s, ox, oy, mira);
  rodarAtaques(e, D);
  const evs = eventosDe(e, EVENTO.golpeInimigo);
  expect(evs).toHaveLength(1);
  return evs[0]!.b;
}

describe('dados: os arrays por tipo batem com inimigos.json (OG11)', () => {
  it('36, 30, 90, 180, aparável nos dois, arco 64 px, tiro 192 px, projétil 1,6 px/passo, raio 8, vida 150', () => {
    const c = D.combate;
    expect([c.telegrafoPassos[TIPO.oco_grande], c.telegrafoPassos[TIPO.novica_de_sal]]).toEqual([36, 30]);
    expect([c.recuperacaoPassos[TIPO.oco_grande], c.intervaloPassos[TIPO.novica_de_sal]]).toEqual([90, 180]);
    expect([c.ataqueAparavel[TIPO.oco_grande], c.ataqueAparavel[TIPO.novica_de_sal]]).toEqual([1, 1]);
    expect(c.alcanceDoArco[TIPO.oco_grande]).toBe(64);
    expect(c.alcanceDeTiro[TIPO.novica_de_sal]).toBe(192);
    expect(c.projetilPorPasso[TIPO.novica_de_sal]).toBeCloseTo(1.6, 12);
    expect([c.projetilRaio[TIPO.novica_de_sal], c.projetilVida[TIPO.novica_de_sal]]).toEqual([8, 150]);
    expect([c.salPct[TIPO.novica_de_sal], c.salPassos[TIPO.novica_de_sal]]).toEqual([50, 180]);
    const grande = inimigosJson.inimigos.find((i) => i.id === 'oco_grande')!;
    expect(grande.ataques[0]!.telegrafo.duracao_s * 60).toBe(c.telegrafoPassos[TIPO.oco_grande]);
  });

  it('sem o bit `ataques` o Oco Grande só anda: nenhum telegrafo, golpe ou lançamento', () => {
    const { e, s } = comGrande(0, -79, CENARIO.diretorDesligado);
    rodar(e, 300);
    expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(0);
    expect(e.inimigos.ataqueFase[s]).toBe(0);
    expect(hp(e)).toBe(D.hpInicial);
  });
});

describe('F-006.11: ciclo do Oco Grande (OG1, OG2)', () => {
  it('telegrafo em T, golpe em T+36, próximo telegrafo em T+126; posição constante de T a T+125', () => {
    const { e, s } = comGrande(0, -79, INV);
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < 300; i++) {
      avancar(e, D, PARADO, 1);
      x.push(e.inimigos.x[s]!);
      y.push(e.inimigos.y[s]!);
    }
    const t = eventosDe(e, EVENTO.telegrafo).map((v) => v.passo);
    const g = eventosDe(e, EVENTO.golpeInimigo).map((v) => v.passo);
    const T = t[0]!;
    expect(T).toBe(1);
    expect(t).toEqual([T, T + 126, T + 252]);
    expect(g).toEqual([T + 36, T + 162, T + 288]);
    // Posição constante de T a T+125 (índice = passo - 1).
    for (let p = T; p <= T + 125; p++) {
      expect(x[p - 1]).toBe(x[T - 1]);
      expect(y[p - 1]).toBe(y[T - 1]);
    }
    expect(eventosDe(e, EVENTO.telegrafo)[0]).toMatchObject({ forma: FORMA.arcoInimigo, b: 64 });
    expect(eventosDe(e, EVENTO.telegrafo)[0]!.a).toBe(36);
  });

  it('o jogador sai do arco no telegrafo: o golpe sai em T+36 com desfecho "errou" e o próximo telegrafo é em T+126', () => {
    const { e } = comGrande(0, -79, INV);
    avancar(e, D, PARADO, 1);
    const [jx, jy] = posJogador(e);
    e.jogador[JOGADOR.y] = jy + 120;
    rodar(e, 36);
    const g = eventosDe(e, EVENTO.golpeInimigo);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ passo: 37, b: 4, a: 0 });
    e.jogador[JOGADOR.y] = jy;
    e.jogador[JOGADOR.x] = jx;
    rodar(e, 89);
    expect(eventosDe(e, EVENTO.telegrafo).map((v) => v.passo)).toEqual([1]);
    rodar(e, 1);
    expect(eventosDe(e, EVENTO.telegrafo).map((v) => v.passo)).toEqual([1, 127]);
  });

  it('gatilho: `rodarAtaques` direto telegrafa a 79,9 px e não a 80,1 px', () => {
    for (const [d, esperado] of [
      [79.9, 1],
      [80, 1],
      [80.1, 0],
    ] as const) {
      const { e, s } = comGrande(300, 300);
      const [jx, jy] = posJogador(e);
      posicionar(e, s, jx, jy - d);
      rodarAtaques(e, D);
      expect(eventosDe(e, EVENTO.telegrafo), `d=${d}`).toHaveLength(esperado);
    }
  });

  it('o convertido ataca como qualquer Oco Grande (OG8)', () => {
    const { e, s } = comGrande(300, 300);
    e.inimigos.convertido[s] = 1;
    const [jx, jy] = posJogador(e);
    posicionar(e, s, jx, jy - 79.9);
    rodarAtaques(e, D);
    expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(1);
    expect(e.inimigos.ataqueTimer[s]).toBe(36);
  });
});

describe('F-006.11: geometria do arco (OG3, OG4)', () => {
  it('80 px exatos acerta e 80 + 1/16 não (centro do jogador, não a borda)', () => {
    expect(desfechoDoGolpe(80, 0)).toBe(1);
    expect(desfechoDoGolpe(80 + 1 / 16, 0)).toBe(4);
  });

  it('a 60° do eixo: 59,9° acerta e 60,1° não; a 90° não; atrás (180°) a 48 px não', () => {
    const graus = (g: number, r: number): [number, number] => [r * Math.cos((g * Math.PI) / 180), r * Math.sin((g * Math.PI) / 180)];
    expect(desfechoDoGolpe(...graus(59.9, 48))).toBe(1);
    expect(desfechoDoGolpe(...graus(60.1, 48))).toBe(4);
    expect(desfechoDoGolpe(0, 48)).toBe(4);
    expect(desfechoDoGolpe(-48, 0)).toBe(4);
  });

  it('vale na costura do toro', () => {
    const { e, s } = comGrande(300, 300);
    e.jogador[JOGADOR.x] = 5;
    posicionar(e, s, LARGURA_DO_MAPA - 35, e.jogador[JOGADOR.y]!);
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 1;
    e.inimigos.miraX[s] = 1;
    e.inimigos.miraY[s] = 0;
    rodarAtaques(e, D);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.b).toBe(1);
  });

  it('a mira é a de T: o jogador a 90° da mira no golpe leva "errou", mesmo estando perto', () => {
    const { e, s } = comGrande(0, -79, INV);
    avancar(e, D, PARADO, 1);
    const mx = e.inimigos.miraX[s]!;
    const my = e.inimigos.miraY[s]!;
    expect([mx, my]).toEqual([0, 1]);
    const [jx, jy] = posJogador(e);
    e.jogador[JOGADOR.x] = e.inimigos.x[s]! + 60;
    e.jogador[JOGADOR.y] = e.inimigos.y[s]!;
    rodar(e, 36);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ passo: 37, b: 4 });
    expect([e.inimigos.miraX[s], e.inimigos.miraY[s]]).toEqual([mx, my]);
    expect([jx, jy]).not.toEqual(posJogador(e));
  });

  it('pulso (corpo deslocado) em T+12: o arco acompanha o vértice e a direção continua a de T', () => {
    const { e, s } = comGrande(0, -79, ATQ);
    rodar(e, 12);
    posicionar(e, s, e.inimigos.x[s]! + 10, e.inimigos.y[s]!);
    rodar(e, 25);
    const g = eventosDe(e, EVENTO.golpeInimigo);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ passo: 37, b: 1 });
    expect(e.inimigos.miraX[s]).toBe(0);
  });
});

describe('F-006.11: golpe, ordem do passo e dano (OG5, OG6, OG7)', () => {
  /** Roda até o golpe de T+36 = 37 com uma esquiva em direção ao Oco (0, -1) pedida no passo `p`. */
  function golpeComEsquivaEm(p: number | null): { e: Estado; b: number } {
    const { e } = comGrande(0, -79, ATQ);
    const fonte = fonteDeAcoes(p === null ? [] : [esquivaEm(p, [0, -1])]);
    while (e.cab[CAB.passo]! < 37) avancar(e, D, fonte, 1);
    return { e, b: eventosDe(e, EVENTO.golpeInimigo)[0]!.b };
  }

  it('três golpes: parado (dano), esquiva com o passo 13 em T+36 (esquivado, perfeita) e com o passo 14 (dano)', () => {
    const parado = golpeComEsquivaEm(null);
    expect(parado.b).toBe(1);
    expect(hp(parado.e)).toBe(D.hpInicial - 20);

    const perfeita = golpeComEsquivaEm(24);
    expect(perfeita.b).toBe(2);
    expect(hp(perfeita.e)).toBe(D.hpInicial);
    const ev = eventosDe(perfeita.e, EVENTO.esquivaPerfeita);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ passo: 37, forma: ORIGEM_DO_DANO.golpe, slot: slotUnico(perfeita.e) });

    const tarde = golpeComEsquivaEm(23);
    expect(u8(tarde.e, 'esquivaPasso')).toBe(14);
    expect(tarde.b).toBe(1);
    expect(hp(tarde.e)).toBe(D.hpInicial - 20);
  });

  it('esquiva que começa no passo do golpe (passo 1) leva dano; a do passo 2 é esquivada', () => {
    expect(golpeComEsquivaEm(36).b).toBe(1);
    expect(golpeComEsquivaEm(35).b).toBe(2);
  });

  it('rolar para longe do Oco deixa o jogador fora do arco: "errou"', () => {
    const { e } = comGrande(0, -79, ATQ);
    const fonte = fonteDeAcoes([esquivaEm(24, [0, 1])]);
    while (e.cab[CAB.passo]! < 37) avancar(e, D, fonte, 1);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.b).toBe(4);
  });

  it('Oco morto no passo do golpe não golpeia', () => {
    const { e, s } = comGrande(0, -79, ATQ);
    rodar(e, 35);
    e.inimigos.hp[s] = 0;
    rodar(e, 2);
    expect(eventosDe(e, EVENTO.golpeInimigo)).toHaveLength(0);
    expect(hp(e)).toBe(D.hpInicial);
  });

  it('dano: o do spawn (21 no minuto 1), sem empurrão; o golpe ignora `invulContato` e não o liga', () => {
    const e = criar({ cenario: ATQ, linhaFixa: 1, inimigos: [{ codigo: TIPO.oco_grande, dx: 300, dy: 300 }] });
    const s = slotUnico(e);
    expect(e.inimigos.dano[s]).toBe(21);
    prepararGolpe(e, s, 70, 0, [1, 0]);
    e.jogadorU8[JOGADOR_U8.invulContato] = 18;
    const antes = posJogador(e);
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial - 21);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(18);
    expect(posJogador(e)).toEqual(antes);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ forma: FORMA.arcoInimigo, a: 21, b: 1 });
  });

  it('o golpe e o projétil, com `invulContato` = 0 antes, deixam 0 depois (OG7: só o contato liga o timer)', () => {
    const { e, s } = comGrande(300, 300, ATQ);
    prepararGolpe(e, s, 70, 0, [1, 0]);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial - e.inimigos.dano[s]!);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);

    const { e: f, s: n } = comNovica(300, 300, ATQ);
    const [jx, jy] = posJogador(f);
    posicionar(f, n, jx, jy - 150);
    f.inimigos.ataqueFase[n] = FASE_DO_ATAQUE.telegrafo;
    f.inimigos.ataqueTimer[n] = 1;
    f.inimigos.miraX[n] = 0;
    f.inimigos.miraY[n] = 1;
    rodarAtaques(f, D);
    const p = projeteisDeSal(f)[0]!;
    f.projeteis.x[p] = jx;
    f.projeteis.y[p] = jy - 10;
    f.projeteis.vx[p] = 0;
    f.projeteis.vy[p] = 0;
    expect(f.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
    rodarAtaques(f, D);
    expect(hp(f)).toBeLessThan(D.hpInicial);
    expect(f.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
  });

  it('com o jogador invulnerável do cenário o desfecho é 1 e o HP não muda', () => {
    const { e, s } = comGrande(300, 300, INV);
    prepararGolpe(e, s, 70, 0, [1, 0]);
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.b).toBe(1);
  });
});

describe('F-006.11: Sal, pulso e morte no ataque (OG9)', () => {
  it('o Sal do Oco não mexe nos relógios: telegrafo em T e golpe em T+36', () => {
    const { e, s } = comGrande(0, -79, INV);
    e.inimigos.salPct[s] = 50;
    e.inimigos.salPassos[s] = 200;
    rodar(e, 40);
    expect(eventosDe(e, EVENTO.telegrafo)[0]!.passo).toBe(1);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.passo).toBe(37);
  });

  it('a remoção zera os campos de ataque; o slot reaproveitado nasce em repouso', () => {
    const { e, s } = comGrande(0, -79, ATQ);
    rodar(e, 10);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.telegrafo);
    removerInimigo(e, s);
    expect([e.inimigos.ataqueFase[s], e.inimigos.ataqueTimer[s], e.inimigos.miraX[s], e.inimigos.miraY[s]]).toEqual([0, 0, 0, 0]);
    rodar(e, 40);
    expect(eventosDe(e, EVENTO.golpeInimigo)).toHaveLength(0);
  });
});

describe('F-006.11: ameaças aparáveis (OG11, AP5)', () => {
  const ameacas = (e: Estado): number => e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]!;

  it('Oco Grande em telegrafo conta +1 só com o jogador dentro do setor; é recontado a cada passo', () => {
    const { e, s } = comGrande(0, -79, INV);
    rodar(e, 1);
    expect(ameacas(e)).toBe(1);
    const [jx, jy] = posJogador(e);
    e.jogador[JOGADOR.y] = jy + 100;
    rodar(e, 1);
    expect(ameacas(e)).toBe(0);
    e.jogador[JOGADOR.y] = jy;
    e.jogador[JOGADOR.x] = jx;
    rodar(e, 1);
    expect(ameacas(e)).toBe(1);
    rodar(e, 40);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.recuperacao);
    expect(ameacas(e)).toBe(0);
  });

  it('Oco Grande em telegrafo com o jogador a 60 px atrás do eixo da mira (dentro do alcance, fora do arco) não conta', () => {
    const { e, s } = comGrande(300, 300, INV);
    prepararGolpe(e, s, -60, 0, [1, 0]);
    e.inimigos.ataqueTimer[s] = 5;
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(0);
    prepararGolpe(e, s, 60, 0, [1, 0]);
    e.inimigos.ataqueTimer[s] = 5;
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(1);
  });

  it('Noviça em telegrafo colada no jogador, sem projétil, não conta (só o Oco Grande tem ameaça de telegrafo)', () => {
    const { e, s } = comNovica(300, 300, INV);
    junto(e, s, 5, 0);
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 20;
    e.inimigos.miraX[s] = -1;
    e.inimigos.miraY[s] = 0;
    rodarAtaques(e, D);
    expect(projeteisDeSal(e)).toHaveLength(0);
    expect(ameacas(e)).toBe(0);
  });

  it('a Noviça em telegrafo não conta; o projétil conta quando o impacto é em até 36 passos e a linha pega o jogador', () => {
    const { e, s } = comNovica(0, -150, INV);
    rodar(e, 1);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.telegrafo);
    expect(ameacas(e)).toBe(0);
    // Sobe o telegrafo até o lançamento e põe o projétil em posições conhecidas.
    e.inimigos.ataqueTimer[s] = 1;
    rodarAtaques(e, D);
    const p = projeteisDeSal(e)[0]!;
    const [jx, jy] = posJogador(e);
    const ponha = (dist: number, lateral = 0): void => {
      e.projeteis.x[p] = jx + lateral;
      e.projeteis.y[p] = jy - dist;
      e.projeteis.vx[p] = 0;
      e.projeteis.vy[p] = 1.6;
    };
    ponha(1.6 * 36 + 24 + 1.4);
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(1);
    ponha(1.6 * 36 + 24 + 2.4);
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(0);
    ponha(60, 30);
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(0);
    ponha(60, 20);
    rodarAtaques(e, D);
    expect(ameacas(e)).toBe(1);
  });
});

/** Slots dos projéteis de Sal vivos. */
function projeteisDeSal(e: Estado): number[] {
  const r: number[] = [];
  for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) {
    if (e.poolDeProjeteis.posicao[p]! >= 0 && e.projeteis.tipo[p] === TIPO_DE_PROJETIL.sal) r.push(p);
  }
  return r;
}

describe('F-006.11: ciclo da Noviça (NV1, NV2, NV3)', () => {
  it('telegrafo em T, projétil em T+30, segundo telegrafo em T+180, 3 lançamentos em 540 passos', () => {
    const { e, s } = comNovica(0, -190, INV);
    const x: number[] = [];
    for (let i = 0; i < 540; i++) {
      avancar(e, D, PARADO, 1);
      x.push(e.inimigos.y[s]!);
    }
    const t = eventosDe(e, EVENTO.telegrafo).map((v) => v.passo);
    const l = eventosDe(e, EVENTO.projetilLancado).map((v) => v.passo);
    const T = t[0]!;
    expect(t).toEqual([T, T + 180, T + 360]);
    expect(l).toEqual([T + 30, T + 210, T + 390]);
    expect(eventosDe(e, EVENTO.projetilLancado)[0]!.forma).toBe(FORMA.projetilSal);
    // Enraizada de T a T+29: a posição não muda.
    for (let p = T; p < T + 30; p++) expect(x[p - 1]).toBe(x[T - 1]);
  });

  it('jogador a 190 px em T e a 400 px em T+30: lança mesmo assim; Noviça removida em T+15 não lança', () => {
    const a = comNovica(0, -190, INV);
    rodar(a.e, 1);
    const [jx, jy] = posJogador(a.e);
    a.e.jogador[JOGADOR.y] = jy + 210;
    rodar(a.e, 30);
    expect(eventosDe(a.e, EVENTO.projetilLancado)).toHaveLength(1);
    expect(jx).toBe(posJogador(a.e)[0]);

    const b = comNovica(0, -190, INV);
    rodar(b.e, 15);
    removerInimigo(b.e, b.s);
    rodar(b.e, 40);
    expect(eventosDe(b.e, EVENTO.projetilLancado)).toHaveLength(0);
    expect(projeteisDeSal(b.e)).toHaveLength(0);
  });

  it('alcance de tiro: `rodarAtaques` direto telegrafa a 191,9 px e não a 192,1 px', () => {
    for (const [d, esperado] of [
      [191.9, 1],
      [192.1, 0],
    ] as const) {
      const { e, s } = comNovica(300, 300);
      const [jx, jy] = posJogador(e);
      posicionar(e, s, jx, jy - d);
      rodarAtaques(e, D);
      expect(eventosDe(e, EVENTO.telegrafo), `d=${d}`).toHaveLength(esperado);
    }
  });

  it('a espera acaba com o jogador fora de 192 px: espera pronta e telegrafa quando ele volta', () => {
    const { e, s } = comNovica(0, -150, INV);
    rodar(e, 1);
    const [, jy] = posJogador(e);
    e.jogador[JOGADOR.y] = jy + 400;
    rodar(e, 200);
    expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(1);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.livre);
    e.jogador[JOGADOR.y] = jy;
    posicionar(e, s, e.inimigos.x[s]!, jy - 150);
    rodar(e, 1);
    expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(2);
  });

  it('a mira é a de T: a velocidade do projétil é o vetor de T vezes 1,6, mesmo com o jogador em outro lugar', () => {
    const { e, s } = comNovica(0, -150, INV);
    rodar(e, 1);
    const mx = e.inimigos.miraX[s]!;
    const my = e.inimigos.miraY[s]!;
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.x]! + 100;
    rodar(e, 30);
    const p = projeteisDeSal(e)[0]!;
    expect(e.projeteis.vx[p]).toBe(Math.fround(mx * D.combate.projetilPorPasso[TIPO.novica_de_sal]!));
    expect(e.projeteis.vy[p]).toBe(Math.fround(my * D.combate.projetilPorPasso[TIPO.novica_de_sal]!));
  });
});

describe('F-006.11: projétil de Sal (NV4, NV5, NV6)', () => {
  /** Noviça lançando no próximo `rodarAtaques`, com o jogador a `dist` px acima; devolve o projétil. */
  function lancar(dist: number, cenario = ATQ): { e: Estado; s: number; p: number } {
    const { e, s } = comNovica(300, 300, cenario);
    const [jx, jy] = posJogador(e);
    posicionar(e, s, jx, jy - dist);
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 1;
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = 1;
    rodarAtaques(e, D);
    return { e, s, p: projeteisDeSal(e)[0]! };
  }

  it('nasce em T+30 com xAnt = x, anda 1,6 px a partir do passo seguinte e some em L+150', () => {
    const { e, s, p } = lancar(150);
    const y0 = e.projeteis.y[p]!;
    expect(e.projeteis.y[p]).toBe(e.inimigos.y[s]);
    expect(e.projeteis.yAnt[p]).toBe(y0);
    expect([e.projeteis.donoSlot[p], e.projeteis.donoGeracao[p]]).toEqual([s, e.pool.geracao[s]]);
    expect(e.projeteis.dano[p]).toBe(18);
    expect(e.projeteis.vida[p]).toBe(150);
    rodarAtaques(e, D);
    expect(e.projeteis.y[p]).toBe(Math.fround(y0 + e.projeteis.vy[p]!));
    expect(e.projeteis.y[p]! - y0).toBeCloseTo(1.6, 3);
    // Fora do caminho do jogador: para o projétil e conta a vida.
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    for (let i = 2; i < 150; i++) rodarAtaques(e, D);
    expect(e.poolDeProjeteis.posicao[p]).toBeGreaterThanOrEqual(0);
    rodarAtaques(e, D);
    expect(projeteisDeSal(e)).toHaveLength(0);
  });

  it('o toque a 24 px acerta e a 24 + 1/16 não', () => {
    for (const [d, toca] of [
      [24, true],
      [24 + 1 / 16, false],
    ] as const) {
      const { e, p } = lancar(150);
      const [jx, jy] = posJogador(e);
      e.projeteis.x[p] = jx;
      e.projeteis.y[p] = jy - d;
      e.projeteis.vx[p] = 0;
      e.projeteis.vy[p] = 0;
      rodarAtaques(e, D);
      expect(eventosDe(e, EVENTO.golpeInimigo), `d=${d}`).toHaveLength(toca ? 1 : 0);
      expect(projeteisDeSal(e)).toHaveLength(toca ? 0 : 1);
    }
  });

  it('acerto: HP cai 18, o projétil some no passo, o Sal liga 50/180 e a renovação fica no máximo', () => {
    const { e, p } = lancar(150);
    const [jx, jy] = posJogador(e);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 10;
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    e.jogador3U8[JOGADOR3_U8.salPct] = 30;
    e.jogador3U8[JOGADOR3_U8.salPassos] = 100;
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial - 18);
    expect(projeteisDeSal(e)).toHaveLength(0);
    expect([u8(e, 'salPct'), u8(e, 'salPassos')]).toEqual([50, 180]);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ forma: FORMA.projetilSal, a: 18, b: 1 });
  });

  it('esquiva (passos 2 a 13): some, sem dano nem Sal, esquiva perfeita de origem projétil', () => {
    const { e, s, p } = lancar(150);
    const [jx, jy] = posJogador(e);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 10;
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial);
    expect([u8(e, 'salPct'), u8(e, 'salPassos')]).toEqual([0, 0]);
    expect(projeteisDeSal(e)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.b).toBe(2);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)[0]).toMatchObject({ forma: ORIGEM_DO_DANO.projetil, slot: s });
  });

  it('jogador invulnerável: o projétil é consumido, desfecho 1, sem HP nem Sal', () => {
    const { e, p } = lancar(150, INV);
    const [jx, jy] = posJogador(e);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 10;
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial);
    expect(u8(e, 'salPassos')).toBe(0);
    expect(projeteisDeSal(e)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.b).toBe(1);
  });

  it('as armas não acertam o projétil: `moverProjeteis` o pula, sem mover nem gastar a vida', () => {
    const { e, p } = lancar(150);
    const antes = [e.projeteis.x[p], e.projeteis.y[p], e.projeteis.vida[p]];
    moverProjeteis(e, D);
    expect([e.projeteis.x[p], e.projeteis.y[p], e.projeteis.vida[p]]).toEqual(antes);
  });

  it('dono morto em T+40: o projétil lançado em T+30 continua e acerta, e o evento não leva o handle do dono', () => {
    const { e, s, p } = lancar(150);
    removerInimigo(e, s);
    const [jx, jy] = posJogador(e);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 10;
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    rodarAtaques(e, D);
    expect(hp(e)).toBe(D.hpInicial - 18);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.slot).toBe(-1);
  });

  it('dono com geração 20.000: lida em linha; o slot reaproveitado deixa o dono inválido', () => {
    const { e, s } = comNovica(300, 300);
    e.pool.geracao[s] = 20_000;
    const [jx, jy] = posJogador(e);
    posicionar(e, s, jx, jy - 150);
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 1;
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = 1;
    rodarAtaques(e, D);
    const p = projeteisDeSal(e)[0]!;
    expect(e.projeteis.donoGeracao[p]).toBe(20_000);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 10;
    e.projeteis.vx[p] = 0;
    e.projeteis.vy[p] = 0;
    rodarAtaques(e, D);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]!.slot).toBe(s);
  });

  it('pool no limite: a Noviça não inicia o telegrafo; cheio entre T e T+30, o lançamento é recusado e conta', () => {
    const { e, s } = comNovica(300, 300);
    const [jx, jy] = posJogador(e);
    posicionar(e, s, jx, jy - 150);
    const dummies: number[] = [];
    while (quantosAtivos(e.poolDeProjeteis) + quantosAtivos(e.poolDeEfeitos) < 200) dummies.push(alocar(e.poolDeProjeteis));
    rodarAtaques(e, D);
    expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(0);
    // Libera 1 vaga, inicia, enche de novo e lança.
    const livre = dummies.pop()!;
    e.projeteis.tipo[livre] = TIPO_DE_PROJETIL.faca;
    e.poolDeProjeteis.posicao[livre] = -1;
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 1;
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = 1;
    // Mesmo com a pilha intacta, o limite lógico (200) já está atingido pelos dummies restantes + 1 vaga: força cheio.
    alocar(e.poolDeProjeteis);
    const recusados = e.mundo[MUNDO.projeteisRecusados]!;
    rodarAtaques(e, D);
    expect(e.mundo[MUNDO.projeteisRecusados]).toBe(recusados + 1);
    expect(eventosDe(e, EVENTO.projetilLancado)).toHaveLength(0);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.recuperacao);
  });
});

describe('F-006.11: Sal no jogador (NV7)', () => {
  /** Quanto o jogador anda para o leste em cada um dos `n` passos, com a intenção (1, 0). */
  function passosAndados(e: Estado, n: number): number[] {
    const fonte = fonteDeAcoes([], { mx: 1, my: 0 });
    const r: number[] = [];
    for (let i = 0; i < n; i++) {
      const x0 = e.jogador[JOGADOR.x]!;
      avancar(e, D, fonte, 1);
      r.push(e.jogador[JOGADOR.x]! - x0);
    }
    return r;
  }

  it('1,2 px por passo com Sal e 2,4 sem; ativo em H+1 a H+180 e no H+181 volta a 2,4', () => {
    const e = criar({ cenario: ATQ, inimigos: [SEM_ATAQUE] });
    const livre = passosAndados(e, 1)[0]!;
    expect(livre).toBeCloseTo(2.4, 3);
    e.jogador3U8[JOGADOR3_U8.salPct] = 50;
    e.jogador3U8[JOGADOR3_U8.salPassos] = 180;
    const r = passosAndados(e, 181);
    for (let i = 0; i < 180; i++) expect(r[i], `passo H+${i + 1}`).toBeCloseTo(1.2, 3);
    expect(r[180]).toBeCloseTo(2.4, 3);
    expect(u8(e, 'salPassos')).toBe(0);
    expect(u8(e, 'salPct')).toBe(0);
  });

  it('a esquiva sob Sal desloca os mesmos 80 px em 21 passos', () => {
    const e = criar({ cenario: ATQ, inimigos: [SEM_ATAQUE] });
    e.jogador3U8[JOGADOR3_U8.salPct] = 50;
    e.jogador3U8[JOGADOR3_U8.salPassos] = 180;
    const x0 = e.jogador[JOGADOR.x]!;
    const fonte = fonteDeAcoes([esquivaEm(0, [1, 0])]);
    for (let i = 0; i < 21; i++) avancar(e, D, fonte, 1);
    expect(e.jogador[JOGADOR.x]! - x0).toBeCloseTo(80, 3);
    expect(u8(e, 'salPassos')).toBe(180 - 21);
  });

  it('o acerto do projétil da Noviça no jogo inteiro liga o Sal e a caminhada seguinte é de 1,2 px', () => {
    const { e, s } = comNovica(0, -150, ATQ);
    junto(e, s, 0, -150);
    rodar(e, 200);
    expect(eventosDe(e, EVENTO.projetilLancado).length).toBeGreaterThan(0);
    const acertos = eventosDe(e, EVENTO.golpeInimigo).filter((v) => v.b === 1);
    expect(acertos.length).toBeGreaterThan(0);
    expect(hp(e)).toBeLessThan(D.hpInicial);
    expect(e.jogador[JOGADOR.hp]).toBe(Math.fround(D.hpInicial - 18 * acertos.length));
    expect(RAIO_DO_JOGADOR).toBe(16);
  });
});
