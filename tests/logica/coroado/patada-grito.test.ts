// Patada e Grito do Coroado (design/decisoes-F-008.md CR2 a CR5, CR8; critério F-008.7): o cone de 120° a 112 px (96 + a
// hitbox de 16), aparável; o círculo de 112 px, não aparável, com dano de 50% e empurrão de 64 px em 8 passos; a esquiva
// evita os dois; o ciclo fixo Patada, Patada, Grito, sem sorteio. Os testes de fronteira chamam `rodarAtaques` direto,
// com o Coroado já no último passo do telegrafo; o ciclo roda `avancar`.
import { describe, expect, it } from 'vitest';
import { BRUTO } from '../../../src/logica/mundo/contato';
import { FASE_DO_ATAQUE, rodarAtaques } from '../../../src/logica/mundo/ataques';
import { CENARIO, FOGUEIRA_F32, FOGUEIRA_U8, JOGADOR, JOGADOR3_U16, JOGADOR3_U8, MUNDO, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ARMA } from '../../../src/logica/armas/tabela';
import { PARADO } from '../apoio';
import { D_LIVRE as D, TIPO, criar, eventosDe, posicionar, posJogador, slotsVivos } from '../combate/apoio';

const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;

/** Um Coroado longe, o único inimigo. O dano dele no minuto 0 é 25. */
function comCoroado(cenario = ATQ): { e: Estado; s: number } {
  const e = criar({ cenario, inimigos: [{ codigo: TIPO.oco_grande_coroado, dx: 300, dy: 300 }] });
  return { e, s: slotsVivos(e)[0]! };
}

/** O Coroado `s` a (ox, oy) do jogador, no último passo do telegrafo da Patada (id 0) ou do Grito (id 1), com a mira dada. */
function preparar(e: Estado, s: number, id: 0 | 1, ox: number, oy: number, mira: readonly [number, number] = [1, 0]): void {
  const [jx, jy] = posJogador(e);
  posicionar(e, s, jx - ox, jy - oy);
  e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
  e.inimigos.ataqueTimer[s] = 1;
  e.inimigos.ataqueId[s] = id;
  e.inimigos.ataqueSeq[s] = id === 1 ? 2 : 0;
  e.inimigos.miraX[s] = mira[0];
  e.inimigos.miraY[s] = mira[1];
}

/** Desfecho do golpe (campo `b` do evento 12) e a forma. */
function golpe(e: Estado): { desfecho: number; forma: number; dano: number } {
  rodarAtaques(e, D);
  const evs = eventosDe(e, EVENTO.golpeInimigo);
  expect(evs).toHaveLength(1);
  return { desfecho: evs[0]!.b, forma: evs[0]!.forma, dano: evs[0]!.a };
}

describe('dados do Coroado (CR1 a CR5)', () => {
  it('64 px, Patada de 36 passos e 96 px, Grito de 60 passos e 96 px, recuperações de 90, empurrão de 64 px em 8 passos', () => {
    const c = D.combate;
    const t = TIPO.oco_grande_coroado;
    expect(D.tipos.raio[t]).toBe(32);
    expect([c.telegrafoPassos[t], c.alcanceDoArco[t], c.recuperacaoPassos[t], c.ataqueAparavel[t]]).toEqual([36, 96, 90, 1]);
    expect([c.gritoTelegrafoPassos[t], c.gritoRaio[t], c.gritoRecuperacaoPassos[t], c.gritoDanoPct[t]]).toEqual([60, 96, 90, 50]);
    expect([c.gritoEmpurraoPx[t], c.gritoEmpurraoPassos[t]]).toEqual([64, 8]);
    expect([D.tipos.distancia[t], D.tipos.comportamento[t], D.tipos.grande[t]]).toEqual([80, 1, 1]);
    expect(D.tipos.velocidade[t]).toBeCloseTo(0.65 * 4.5 * 32 / 60, 12);
    expect([c.convocaPassos[t], c.convocaQuantidade[t], c.convocaAnel[t], c.convocaTipo[t]]).toEqual([600, 10, 80, TIPO.oco_das_lanternas]);
    expect([c.arenaRaio, c.fogueiraRaio, c.fogueiraDistancia]).toEqual([224, 64, 96]);
  });

  it('imune à Postura Quebrada; só o Coroado tem Grito e convocação', () => {
    const c = D.combate;
    expect(c.posturaQuebrada[TIPO.oco_grande_coroado]).toBe(0);
    for (const t of [TIPO.oco_das_lanternas, TIPO.oco_grande, TIPO.novica_de_sal]) {
      expect([c.gritoRaio[t], c.convocaPassos[t]], String(t)).toEqual([0, 0]);
    }
  });
});

describe('Patada (CR2)', () => {
  it('a 112 px no cone acerta com o dano do slot (25); a 112,1 px não', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 0, 112, 0);
    const g = golpe(e);
    expect([g.desfecho, g.forma, g.dano]).toEqual([1, FORMA.coneInimigo, 25]);
    expect(hp(e)).toBe(150 - 25);
    const fora = comCoroado();
    preparar(fora.e, fora.s, 0, 112.1, 0);
    expect(golpe(fora.e).desfecho).toBe(4);
    expect(hp(fora.e)).toBe(150);
  });

  it('fora do cone de 120° não acerta: a 60° da mira ainda; a 61° não (cos 0,5 literal, com o jogador a 100 px)', () => {
    for (const [graus, esperado] of [[59, 1], [61, 4]] as const) {
      const { e, s } = comCoroado();
      const r = (graus * Math.PI) / 180;
      preparar(e, s, 0, 100 * Math.cos(r), 100 * Math.sin(r));
      expect(golpe(e).desfecho, `${graus}°`).toBe(esperado);
    }
  });

  it('o aparo absorve a Patada: sem dano, stamina devolvida, Contra-ataque armado, e o Coroado não fica atordoado (CR8)', () => {
    const e = criar({ cenario: ATQ, armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }], inimigos: [{ codigo: TIPO.oco_grande_coroado, dx: 300, dy: 300 }] });
    const s = slotsVivos(e)[0]!;
    preparar(e, s, 0, 100, 0);
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
    e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
    e.jogador3[0] = 50;
    const g = golpe(e);
    expect(g.desfecho).toBe(3);
    expect(hp(e)).toBe(150);
    expect(e.jogador3[0]).toBe(80);
    expect(e.build.caSeq[0]).toBe(1);
    expect(e.inimigos.quebradaPassos[s]).toBe(0);
  });

  it('a esquiva (i-frames) evita a Patada', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 0, 100, 0);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    const g = golpe(e);
    expect([g.desfecho, g.dano]).toEqual([2, 0]);
    expect(hp(e)).toBe(150);
  });

  it('o gatilho fixa a mira (1, 0), a Patada e a duração de 36 passos no início do telegrafo', () => {
    const e = criar({ cenario: ATQ | CENARIO.jogadorInvulneravel, inimigos: [{ codigo: TIPO.oco_grande_coroado, dx: -100, dy: 0 }] });
    const s = slotsVivos(e)[0]!;
    avancar(e, D, PARADO, 1);
    expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.telegrafo);
    expect([e.inimigos.miraX[s], e.inimigos.miraY[s]]).toEqual([1, 0]);
    expect(e.inimigos.ataqueId[s]).toBe(0);
    expect(e.inimigos.ataqueTimer[s]).toBe(36);
  });
});

describe('Grito (CR3)', () => {
  it('a 111 px acerta com 50% do dano do slot (12,5) e a 112,1 px não; o aparo não o absorve', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 1, 111, 0);
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
    e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
    const g = golpe(e);
    expect([g.desfecho, g.forma, g.dano]).toEqual([1, FORMA.gritoInimigo, 12.5]);
    expect(hp(e)).toBe(150 - 12.5);
    expect(e.jogador3U8[JOGADOR3_U8.aparoJanela]).toBe(5);
    const fora = comCoroado();
    preparar(fora.e, fora.s, 1, 112.1, 0);
    BRUTO[0] = 99; // resto de uma conta anterior: o evento do Grito que erra não pode levá-lo
    const errou = golpe(fora.e);
    // O dano do evento é 0 quando o Grito erra (e não o resto da conta anterior em BRUTO).
    expect([errou.desfecho, errou.dano]).toEqual([4, 0]);
    expect(e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]).toBe(8);
    expect(fora.e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]).toBe(0);
  });

  it('acerta em volta inteira, sem cone: o jogador atrás do Coroado também leva', () => {
    for (const [ox, oy] of [[-100, 0], [0, 100], [0, -100]] as const) {
      const { e, s } = comCoroado();
      preparar(e, s, 1, ox, oy);
      expect(golpe(e).desfecho, `${ox},${oy}`).toBe(1);
    }
  });

  it('empurra 64 px em 8 passos de 8 px, do Coroado para o jogador, só no jogador', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 1, 100, 0);
    golpe(e);
    expect(e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]).toBe(8);
    expect([e.fogueiraF32[FOGUEIRA_F32.empurraoX], e.fogueiraF32[FOGUEIRA_F32.empurraoY]]).toEqual([8, 0]);
    const x0 = posJogador(e)[0];
    const inimigo0 = e.inimigos.x[s]!;
    let anterior = x0;
    for (let k = 1; k <= 8; k++) {
      avancar(e, D, PARADO, 1);
      const x = posJogador(e)[0];
      expect(x - anterior, `passo ${k}`).toBeCloseTo(8, 4);
      expect(x - anterior).toBeLessThanOrEqual(8 + 1e-4);
      anterior = x;
    }
    expect(anterior - x0).toBeCloseTo(64, 4);
    expect(e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]).toBe(0);
    avancar(e, D, PARADO, 1);
    expect(posJogador(e)[0]).toBe(anterior);
    // O Coroado enraizado na recuperação não se mexe.
    expect(e.inimigos.x[s]).toBe(inimigo0);
  });

  it('com d = 0 o empurrão segue a mira do Coroado', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 1, 0, 0, [0, -1]);
    golpe(e);
    expect([e.fogueiraF32[FOGUEIRA_F32.empurraoX], e.fogueiraF32[FOGUEIRA_F32.empurraoY]]).toEqual([0, -8]);
  });

  it('a esquiva (i-frames) evita o dano e o empurrão', () => {
    const { e, s } = comCoroado();
    preparar(e, s, 1, 100, 0);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    expect(golpe(e).desfecho).toBe(2);
    expect(hp(e)).toBe(150);
    expect(e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]).toBe(0);
  });
});

describe('ameaça aparável (OG11) e o Grito', () => {
  it('a Patada em telegrafo com o jogador no cone conta como ameaça; o Grito, que não é aparável, não', () => {
    for (const [id, esperado] of [[0, 1], [1, 0]] as const) {
      const { e, s } = comCoroado();
      preparar(e, s, id, 50, 0);
      e.inimigos.ataqueTimer[s] = 10;
      rodarAtaques(e, D);
      expect(e.inimigos.ataqueFase[s]).toBe(FASE_DO_ATAQUE.telegrafo);
      expect(e.jogador3U16[JOGADOR3_U16.ameacasAparaveis], `ataqueId ${id}`).toBe(esperado);
    }
  });
});

describe('ciclo Patada, Patada, Grito (CR4)', () => {
  it('as formas dos telegrafos seguem 9, 9, 10; os intervalos são 126, 126 e, depois do Grito, no mínimo 150; sem RNG', () => {
    const e = criar({ cenario: ATQ | CENARIO.jogadorInvulneravel, inimigos: [{ codigo: TIPO.oco_grande_coroado, dx: -90, dy: 0 }] });
    const rng = Array.from(e.rng);
    avancar(e, D, PARADO, 1500);
    const telegrafos = eventosDe(e, EVENTO.telegrafo);
    expect(telegrafos.length).toBeGreaterThanOrEqual(8);
    const esperado = [FORMA.coneInimigo, FORMA.coneInimigo, FORMA.gritoInimigo];
    telegrafos.forEach((t, k) => expect(t.forma, `telegrafo ${k}`).toBe(esperado[k % 3]));
    for (let k = 1; k < telegrafos.length; k++) {
      const antes = telegrafos[k - 1]!;
      const dt = telegrafos[k]!.passo - antes.passo;
      // Depois do Grito o jogador foi empurrado 64 px: o Coroado anda até o gatilho de novo, e o intervalo passa de 150.
      if (antes.forma === FORMA.gritoInimigo) expect(dt, `intervalo ${k}`).toBeGreaterThanOrEqual(150);
      else expect(dt, `intervalo ${k}`).toBe(126);
    }
    // O telegrafo leva a duração (36 ou 60) e o alcance (96).
    expect(telegrafos.map((t) => [t.a, t.b]).slice(0, 3)).toEqual([[36, 96], [36, 96], [60, 96]]);
    // Os sorteios de RNG da horda não existem aqui: nenhum fluxo se moveu (nem o `ia`).
    expect(Array.from(e.rng)).toEqual(rng);
    expect(e.mundo[MUNDO.mortes]).toBe(0);
  });
});
