// Esquiva perfeita (design/decisoes-F-006.md EP1 a EP4, FB1; critérios F-006.7 na parte da
// simulação e F-006.12): o ponto único do acerto no jogador, uma perfeita por esquiva, o Poder
// de +15% por 120 fases de armas com as duas tabelas de dano vivo, a faca extra e o
// congelamento de 5 passos. Os testes comparam CAB.passo, nunca `inicio + n`.
import { describe, expect, it } from 'vitest';
import combate from '../../../src/dados/combate.json';
import { ARMA, CODIGOS_DE_ARMA, NUMERO_DE_ATRIBUTOS, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { danoPorAcerto } from '../../../src/logica/armas/dano';
import { BRUTO, ORIGEM_DO_DANO, resolverAcertoNoJogador } from '../../../src/logica/mundo/contato';
import { CAB, CAPACIDADE_DE_PROJETEIS, JOGADOR, JOGADOR3_U8, JOGADOR_U8, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, SEM_ALVO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSIVA } from '../../../src/logica/progressao/tabela';
import { poderPct, recalcularDano } from '../../../src/logica/progressao/dano';
import { D_LIVRE, LONGE, criar, esquivaEm, eventosDe, fonteDeAcoes, junto, posicionar, posJogador, slotsVivos } from './apoio';
import type { FonteDeComandos } from '../../../src/logica/nucleo/comandos';

const u8 = (e: Estado, campo: keyof typeof JOGADOR3_U8): number => e.jogador3U8[JOGADOR3_U8[campo]]!;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const DEZ = Array.from({ length: 10 }, (_, i) => ({ ...LONGE, dx: 450 - i, dy: 450 }));

/**
 * Roda um passo de cada vez até `CAB.passo` = `alvo`. Antes de cada passo, os Ocos `slots` ficam
 * junto do jogador (5 px) se o passo seguinte é um i-frame da esquiva (2 a 13), e longe nos outros:
 * assim só os i-frames recebem contato (`perto` falso: nunca). `aoFim` vê o estado depois de cada passo vivo.
 */
function rodar(e: Estado, fonte: FonteDeComandos, slots: readonly number[], alvo: number, aoFim?: (passo: number) => void, perto = true): void {
  let guarda = 0;
  while (e.cab[CAB.passo]! < alvo) {
    const ep = u8(e, 'esquivaPasso');
    const [x, y] = posJogador(e);
    for (const s of slots) {
      if (perto && ep >= 1 && ep <= 12) junto(e, s, 5, 0);
      else posicionar(e, s, x + 450, y + 450);
    }
    const antes = e.cab[CAB.passo]!;
    avancar(e, D_LIVRE, fonte, 1);
    if (e.cab[CAB.passo]! !== antes) aoFim?.(e.cab[CAB.passo]!);
    if (++guarda > 100_000) throw new Error('rodar: o passo não chega');
  }
}

describe('F-006.12: contato nos i-frames é esquiva perfeita (EP1, EP2)', () => {
  it('10 Ocos nos passos 2 a 13: HP intacto, timer desligado, 1 evento, 1 congelamento, poderPassos 120', () => {
    const e = criar({ inimigos: DEZ });
    const slots = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const poder = new Map<number, number>();
    let congelamentos = 0;
    rodar(e, fonte, slots, 20, (p) => {
      poder.set(p, u8(e, 'poderPassos'));
      if (u8(e, 'congelamento') > 0 && !poder.has(-p)) congelamentos++;
    });
    const evs = eventosDe(e, EVENTO.esquivaPerfeita);
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ passo: 2, forma: ORIGEM_DO_DANO.contato, slot: Math.min(...slots) });
    expect(hp(e)).toBe(D_LIVRE.hpInicial);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
    expect(poder.get(2)).toBe(combate.poder_da_esquiva_perfeita.duracao_passos);
    expect(congelamentos).toBe(1);
  });

  it('o passo 14 é dano normal e liga o timer, mesmo depois da perfeita (sem novo evento)', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    rodar(e, fonte, [s!], 13, undefined, false);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
    junto(e, s!, 5, 0);
    avancar(e, D_LIVRE, fonte, 1);
    expect(u8(e, 'esquivaPasso')).toBe(14);
    expect(hp(e)).toBeLessThan(D_LIVRE.hpInicial);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(18);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
  });

  it('duas esquivas encadeadas dão 2 perfeitas; o Poder renova a 120 sem acumular', () => {
    const e = criar({ inimigos: DEZ });
    const slots = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1]), esquivaEm(21, [0, -1])]);
    const poder = new Map<number, number>();
    rodar(e, fonte, slots, 40, (p) => poder.set(p, u8(e, 'poderPassos')));
    const evs = eventosDe(e, EVENTO.esquivaPerfeita);
    expect(evs.map((x) => x.passo)).toEqual([2, 23]);
    expect(poder.get(22)).toBeGreaterThan(90);
    expect(poder.get(23)).toBe(120);
    expect(hp(e)).toBe(D_LIVRE.hpInicial);
  });

  it('o contato com invulContato > 0 não é perfeito; o golpe e o projétil são, mesmo com o timer ligado', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    rodar(e, fonte, [s!], 4, undefined, false);
    // O passo 5 (i-frame) tem um Oco encostado, mas o timer do contato ainda vale 5.
    e.jogadorU8[JOGADOR_U8.invulContato] = 5;
    junto(e, s!, 5, 0);
    avancar(e, D_LIVRE, fonte, 1);
    expect(u8(e, 'esquivaPasso')).toBe(5);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
    expect(hp(e)).toBe(D_LIVRE.hpInicial);

    for (const origem of [ORIGEM_DO_DANO.golpe, ORIGEM_DO_DANO.projetil]) {
      const f = criar();
      f.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
      f.jogadorU8[JOGADOR_U8.invulContato] = 5;
      BRUTO[0] = 10;
      expect(resolverAcertoNoJogador(f, D_LIVRE, origem, -1)).toBe(2);
      expect(hp(f)).toBe(D_LIVRE.hpInicial);
      expect(f.jogadorU8[JOGADOR_U8.invulContato]).toBe(5);
      const [ev] = eventosDe(f, EVENTO.esquivaPerfeita);
      expect(ev).toMatchObject({ forma: origem, alvo: SEM_ALVO });
      // A 2ª chamada na mesma esquiva não gera nada.
      expect(resolverAcertoNoJogador(f, D_LIVRE, origem, -1)).toBe(2);
      expect(eventosDe(f, EVENTO.esquivaPerfeita)).toHaveLength(1);
    }
  });

  it('fora dos i-frames o ponto único aplica o dano bruto e devolve "acertou"', () => {
    for (const ep of [0, 1, 14, 21]) {
      const e = criar();
      e.jogador3U8[JOGADOR3_U8.esquivaPasso] = ep;
      BRUTO[0] = 10;
      expect(resolverAcertoNoJogador(e, D_LIVRE, ORIGEM_DO_DANO.golpe, -1)).toBe(1);
      expect(hp(e)).toBe(D_LIVRE.hpInicial - 10);
      expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
    }
  });

  it('esquiva negada não gera perfeita nem congelamento', () => {
    const e = criar({ inimigos: [LONGE], staminaInicial: 24.5 });
    const [s] = slotsVivos(e);
    rodar(e, fonteDeAcoes([esquivaEm(0, [0, -1])]), [s!], 10);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
    expect(u8(e, 'congelamento')).toBe(0);
  });
});

describe('F-006.7: congelamento de 5 passos (FB1) disparado pela perfeita', () => {
  it('5 passos com passo, relogio, posições e hash (salvo o contador) iguais; o 6º anda', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    rodar(e, fonte, [s!], 2);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(1);
    expect(u8(e, 'congelamento')).toBe(combate.congelamento_passos);
    const antes = e.bytes.slice();
    const passo = e.cab[CAB.passo]!;
    const relogio = e.cab[CAB.relogio]!;
    expect(avancar(e, D_LIVRE, fonte, 5)).toBe(5);
    expect([e.cab[CAB.passo], e.cab[CAB.relogio]]).toEqual([passo, relogio]);
    const depois = e.bytes.slice();
    const i = e.jogador3U8.byteOffset + JOGADOR3_U8.congelamento;
    expect(depois[i]).toBe(0);
    depois[i] = antes[i]!;
    expect(depois).toEqual(antes);
    avancar(e, D_LIVRE, fonte, 1);
    expect(e.cab[CAB.passo]).toBe(passo + 1);
  });

  it('o Poder: 120 no passo N da perfeita, 119 em N+1, 1 em N+119 e 0 em N+120 (o congelamento não o gasta)', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const poder = new Map<number, number>();
    rodar(e, fonte, [s!], 130, (p) => poder.set(p, u8(e, 'poderPassos')));
    const N = 2;
    expect(poder.get(N)).toBe(120);
    expect(poder.get(N + 1)).toBe(119);
    expect(poder.get(N + 119)).toBe(1);
    expect(poder.get(N + 120)).toBe(0);
    expect(poder.get(N + 121)).toBe(0);
  });
});

describe('F-006.7: as duas tabelas do dano vivo (EP3)', () => {
  /** O dano de (arma, nível) recalculado do zero, com o Poder dado. */
  function forcaBruta(e: Estado, poder: number): { vivo: number[]; onda: number[] } {
    const t = D_LIVRE.armas;
    const vivo: number[] = [];
    const onda: number[] = [];
    for (let c = 1; c < CODIGOS_DE_ARMA; c++) {
      let escala = 0;
      for (let k = 0; k < NUMERO_DE_ATRIBUTOS; k++) escala += t.grauPorAtributo[c * NUMERO_DE_ATRIBUTOS + k]! * e.atributos[k]!;
      for (let n = 1; n <= t.nivelMax[c]!; n++) {
        const i = indiceDoNivel(c, n);
        vivo[i] = danoPorAcerto(t.danoBase[c]!, t.numDano[c]!, t.denDano[c]!, t.somaDanoPct[i]!, poder, escala, 100, 100);
      }
      if (t.ondaVida[c]! > 0) onda[c] = danoPorAcerto(t.ondaDanoBase[c]!, 1, 1, 0, poder, escala, 100, 100);
    }
    return { vivo, onda };
  }

  for (const passivas of [[], [{ codigo: PASSIVA.luvas_de_fole, nivel: 1 }], [{ codigo: PASSIVA.luvas_de_fole, nivel: 3 }]]) {
    it(`cada entrada é igual ao recálculo por força bruta (Luvas: ${passivas[0]?.nivel ?? 0})`, () => {
      const e = criar({ passivas });
      const base = poderPct(e, D_LIVRE);
      const sem = forcaBruta(e, base);
      const com = forcaBruta(e, base + combate.poder_da_esquiva_perfeita.pct);
      for (const i of Object.keys(sem.vivo).map(Number)) {
        expect(e.derivados.danoVivo[i]).toBe(sem.vivo[i]);
        expect(e.derivados.danoVivoPoder[i]).toBe(com.vivo[i]);
        expect(com.vivo[i]!).toBeGreaterThan(sem.vivo[i]!);
      }
      for (const c of Object.keys(sem.onda).map(Number)) {
        expect(e.derivados.danoOnda[c]).toBe(sem.onda[c]);
        expect(e.derivados.danoOndaPoder[c]).toBe(com.onda[c]);
      }
      // Recalcular de novo (carta, baú, cópia do buffer) mantém as duas.
      recalcularDano(e, D_LIVRE);
      expect(e.derivados.danoVivoPoder[indiceDoNivel(ARMA.espada_longa_do_juramento, 1)]).toBe(com.vivo[indiceDoNivel(ARMA.espada_longa_do_juramento, 1)]);
    });
  }

  it('o Poder soma com as Luvas: nível 1 (8%) vira 23%, e não 8% × 1,15', () => {
    const e = criar({ passivas: [{ codigo: PASSIVA.luvas_de_fole, nivel: 1 }] });
    const i = indiceDoNivel(ARMA.espada_longa_do_juramento, 1);
    expect(poderPct(e, D_LIVRE)).toBe(8);
    expect(e.derivados.danoVivoPoder[i]! / e.derivados.danoVivo[i]!).toBeCloseTo(123 / 108, 12);
  });

  it('o golpe da Espada lê a tabela do Poder enquanto poderPassos > 0 e a comum depois', () => {
    const lerAcerto = (poderPassos: number): number => {
      const e = criar({ armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }], inimigos: [{ ...LONGE, dx: 0, dy: -40 }] });
      e.jogador3U8[JOGADOR3_U8.poderPassos] = poderPassos;
      e.inimigos.hp[slotsVivos(e)[0]!] = 1e6;
      for (let k = 0; k < 120 && eventosDe(e, EVENTO.acerto).length === 0; k++) avancar(e, D_LIVRE, fonteDeAcoes([]), 1);
      return eventosDe(e, EVENTO.acerto)[0]!.a;
    };
    const i = indiceDoNivel(ARMA.espada_longa_do_juramento, 1);
    const e = criar();
    expect(lerAcerto(0)).toBeCloseTo(Math.fround(e.derivados.danoVivo[i]!), 5);
    expect(lerAcerto(60)).toBeCloseTo(Math.fround(e.derivados.danoVivoPoder[i]!), 5);
  });

  it('a faca disparada antes da entrada do Poder mantém o dano; a de depois usa o novo', () => {
    const faca = (poderPassos: number): number => {
      const e = criar({ armas: [{ codigo: ARMA.facas_de_sal, nivel: 1 }], inimigos: [{ ...LONGE, dx: 100, dy: 0 }] });
      const s = slotsVivos(e)[0]!;
      e.inimigos.hp[s] = 1e6;
      junto(e, s, 100, 0);
      e.jogador3U8[JOGADOR3_U8.poderPassos] = poderPassos;
      avancar(e, D_LIVRE, fonteDeAcoes([]), 1);
      for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) return e.projeteis.dano[p]!;
      throw new Error('sem faca');
    };
    const i = indiceDoNivel(ARMA.facas_de_sal, 1);
    const e = criar();
    expect(faca(0)).toBe(Math.fround(e.derivados.danoVivo[i]!));
    expect(faca(30)).toBe(Math.fround(e.derivados.danoVivoPoder[i]!));
  });
});

describe('F-006.12: +1 faca na próxima salva só com Facas na build (EP4)', () => {
  const facas = (nivel: number) => ({ armas: [{ codigo: ARMA.facas_de_sal, nivel }] });
  const vivas = (e: Estado): number => {
    let n = 0;
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) n++;
    return n;
  };

  /** Facas disparadas na 1ª salva com um alvo a 100 px, com a flag posta (ou não). */
  function salva(nivel: number, flag: number): { facas: number; flagDepois: number } {
    const e = criar({ ...facas(nivel), inimigos: [{ ...LONGE, dx: 100, dy: 0 }] });
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = 1e6;
    junto(e, s, 100, 0);
    e.jogador3U8[JOGADOR3_U8.facaExtra] = flag;
    avancar(e, D_LIVRE, fonteDeAcoes([]), 1);
    return { facas: vivas(e), flagDepois: u8(e, 'facaExtra') };
  }

  it('nv1 dispara 3 (2 + 1) e a flag zera; nv8 dispara 6; sem a flag, 2 e 5', () => {
    expect(salva(1, 1)).toEqual({ facas: 3, flagDepois: 0 });
    expect(salva(8, 1)).toEqual({ facas: 6, flagDepois: 0 });
    expect(salva(1, 0)).toEqual({ facas: 2, flagDepois: 0 });
    expect(salva(8, 0)).toEqual({ facas: 5, flagDepois: 0 });
  });

  it('a salva sem alvo não consome a flag, que não expira', () => {
    const e = criar(facas(1));
    e.jogador3U8[JOGADOR3_U8.facaExtra] = 1;
    avancar(e, D_LIVRE, fonteDeAcoes([]), 300);
    expect(u8(e, 'facaExtra')).toBe(1);
    expect(vivas(e)).toBe(0);
  });

  it('a perfeita liga a flag só com Facas na build, e duas seguidas dão 1 só', () => {
    const fluxo = (armas: { codigo: number; nivel: number }[]): number => {
      const e = criar({ armas, inimigos: [LONGE] });
      const [s] = slotsVivos(e);
      rodar(e, fonteDeAcoes([esquivaEm(0, [0, -1]), esquivaEm(21, [0, -1])]), [s!], 24);
      expect(eventosDe(e, EVENTO.esquivaPerfeita).length).toBeGreaterThan(0);
      return u8(e, 'facaExtra');
    };
    expect(fluxo([{ codigo: ARMA.facas_de_sal, nivel: 1 }])).toBe(1);
    expect(fluxo([{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }])).toBe(0);
    expect(fluxo([])).toBe(0);
  });

  it('a perfeita seguida da salva dá 3 facas no nv1 (fluxo inteiro)', () => {
    const e = criar({ ...facas(1), inimigos: [LONGE, { ...LONGE, dx: 449 }] });
    const [contato, alvo] = slotsVivos(e);
    e.inimigos.hp[alvo!] = 1e6;
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const periodo = D_LIVRE.armas.periodo[ARMA.facas_de_sal]!;
    const salvas: { passo: number; vivas: number }[] = [];
    for (let guarda = 0; e.cab[CAB.passo]! < 70 && guarda < 1000; guarda++) {
      const ep = u8(e, 'esquivaPasso');
      if (ep >= 1 && ep <= 12) junto(e, contato!, 5, 0);
      else posicionar(e, contato!, 1e3, 1e3);
      junto(e, alvo!, 100, 0);
      const passoAntes = e.cab[CAB.passo]!;
      const antesDaSalva = vivas(e);
      avancar(e, D_LIVRE, fonte, 1);
      if (e.cab[CAB.passo]! !== passoAntes && e.build.recarga[0] === periodo) salvas.push({ passo: e.cab[CAB.passo]!, vivas: vivas(e) - antesDaSalva });
    }
    expect(salvas).toHaveLength(2);
    expect(salvas[0]!.vivas).toBe(2);
    expect(salvas[1]!.vivas).toBe(3);
    expect(u8(e, 'facaExtra')).toBe(0);
  });
});
