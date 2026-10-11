// Tabela das armas e fórmula de dano (design/decisoes-F-004.md §2 a §4).
import { describe, expect, it } from 'vitest';
import armas from '../../../src/dados/armas.json';
import vigilantes from '../../../src/dados/vigilantes.json';
import { danoPorAcerto } from '../../../src/logica/armas/dano';
import { ARMA, ARQUETIPO, GOLPES_MAXIMOS, IDS_DE_ARMA, criarTabelaDeArmas, indiceDoNivel, type ArmaDoJson } from '../../../src/logica/armas/tabela';
import { FORMA } from '../../../src/logica/nucleo/eventos';
import { DADOS_DA_CHARNECA as D } from '../apoio';

const t = D.armas;
const aldric = vigilantes.vigilantes[0]!;
const nv = (codigo: number, f: (i: number) => number): number[] => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => f(indiceDoNivel(codigo, n)));
const lista = armas.armas as unknown as ArmaDoJson[];

describe('tabela das armas', () => {
  it('todo id de armas.json tem código, e os códigos são fixos', () => {
    for (const a of armas.armas) expect(IDS_DE_ARMA.indexOf(a.id as never), a.id).toBeGreaterThan(0);
    expect(ARMA).toEqual({ vazia: 0, espada_longa_do_juramento: 1, facas_de_sal: 2, circulo_de_sal: 3, lamina_do_juramento_eterno: 4 });
  });

  it('as 3 armas compilam nos 8 níveis; a União fica fora até a F-005; a inicial de Aldric é a Espada', () => {
    expect([...t.nivelMax]).toEqual([0, 8, 8, 8, 0]);
    expect([...t.arquetipo]).toEqual([0, ARQUETIPO.direcaoMovimento, ARQUETIPO.maisProximo, ARQUETIPO.aura, 0]);
    expect(t.inicial).toBe(ARMA.espada_longa_do_juramento);
  });

  it('tempos em passos (ADR-0002 §3): Espada 72, Facas 54, tick 30, golpes a cada 12, pulso 300, Sal 180', () => {
    expect([t.periodo[1], t.periodo[2], t.periodo[3]]).toEqual([72, 54, 30]);
    expect(t.intervaloGolpes[1]).toBe(12);
    expect(t.periodoPulso[3]).toBe(300);
    expect(t.salPassos[indiceDoNivel(3, 1)]).toBe(180);
    expect([t.empurraoPorPasso, t.empurraoMaxPassos]).toEqual([8, 12]);
  });

  it('escala de Aldric (B §3.8): Espada 675, Facas 300, Círculo 375 milésimos', () => {
    expect([t.escalaMil[1], t.escalaMil[2], t.escalaMil[3]]).toEqual([675, 300, 375]);
  });

  it('Espada: golpes 1, 1, 2, 2, 2, 2, 3, 4; a estocada é o 3º a partir do nv7; o arco cresce 1,2× no nv5 (W5, W7, W8)', () => {
    const E = ARMA.espada_longa_do_juramento;
    expect(nv(E, (i) => t.golpes[i]!)).toEqual([1, 1, 2, 2, 2, 2, 3, 4]);
    const formas = nv(E, (i) => i).map((i) => [...t.formaDoGolpe.subarray(i * GOLPES_MAXIMOS, i * GOLPES_MAXIMOS + t.golpes[i]!)]);
    expect(formas[0]).toEqual([FORMA.ida]);
    expect(formas[2]).toEqual([FORMA.ida, FORMA.volta]);
    expect(formas[6]).toEqual([FORMA.ida, FORMA.volta, FORMA.estocada]);
    expect(formas[7]).toEqual([FORMA.ida, FORMA.volta, FORMA.estocada, FORMA.ida]);
    expect(nv(E, (i) => t.alcance[i]!)).toEqual([64, 64, 64, 64, 76.8, 76.8, 76.8, 76.8]);
    expect([t.estocadaL[indiceDoNivel(E, 7)], t.estocadaW[indiceDoNivel(E, 7)]]).toEqual([115.2, 19.2]);
    expect(nv(E, (i) => t.somaDanoPct[i]!)).toEqual([0, 20, 20, 20, 20, 40, 40, 40]);
  });

  it('Facas: 2, 3, 3, 3, 4, 4, 4, 5 por salva; 6,4 e 7,68 px por passo; vida 30 e 25; Sal no nv4; perfura no nv7 (W9, W12)', () => {
    const F = ARMA.facas_de_sal;
    expect(nv(F, (i) => t.projeteis[i]!)).toEqual([2, 3, 3, 3, 4, 4, 4, 5]);
    expect(nv(F, (i) => t.velocidade[i]!)).toEqual([6.4, 6.4, 6.4, 6.4, 6.4, 7.68, 7.68, 7.68]);
    expect(nv(F, (i) => t.vida[i]!)).toEqual([30, 30, 30, 30, 30, 25, 25, 25]);
    expect(nv(F, (i) => t.perfuracoes[i]!)).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
    expect(nv(F, (i) => t.salPct[i]!)).toEqual([0, 0, 0, 50, 50, 50, 50, 50]);
    expect([t.alcanceBusca[F], t.raioProjetil[F], t.espacamento[F]]).toEqual([192, 8, 8]);
  });

  it('Círculo: raios somados 64; 73,6; 73,6; 73,6; 83,2; 83,2; 83,2; 96 (W15); Sal 50 e 60 a partir do nv4; pulso no nv7', () => {
    const C = ARMA.circulo_de_sal;
    expect(nv(C, (i) => t.alcance[i]!)).toEqual([64, 73.6, 73.6, 73.6, 83.2, 83.2, 83.2, 96]);
    // A mutação "produto" daria 84,64 no nv5.
    expect(64 * 1.15 * 1.15).not.toBe(t.alcance[indiceDoNivel(C, 5)]);
    expect(nv(C, (i) => t.salPct[i]!)).toEqual([50, 50, 50, 60, 60, 60, 60, 60]);
    expect(nv(C, (i) => t.pulso[i]!)).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
    expect([t.numDano[C], t.denDano[C]]).toEqual([30, 60]);
  });

  it('um número pendente numa arma que entra na Vigília é erro no boot', () => {
    const copia = JSON.parse(JSON.stringify(armas.armas)) as { id: string; base: Record<string, unknown> }[];
    copia.find((a) => a.id === 'facas_de_sal')!.base['alcance_corpos'] = null;
    expect(() => criarTabelaDeArmas(copia as unknown as ArmaDoJson[], aldric.atributos, 'espada_longa_do_juramento')).toThrow(/alcance_corpos/);
  });

  it('a arma inicial precisa existir na Vigília (a União não serve)', () => {
    expect(() => criarTabelaDeArmas(lista, aldric.atributos, 'lamina_do_juramento_eterno')).toThrow(/fora desta Vigília/);
    expect(() => criarTabelaDeArmas(lista, aldric.atributos, 'nada')).toThrow(/desconhecida/);
  });

  it('o código não depende do id: uma arma sintética de cada arquétipo, com outros números, compila pelos dados', () => {
    // A Espada com o arquétipo e os números trocados vira uma aura de raio 3 corpos e 2 de dano por segundo.
    const copia = JSON.parse(JSON.stringify(armas.armas)) as Record<string, unknown>[];
    const espada = copia.find((a) => a['id'] === 'espada_longa_do_juramento')!;
    espada['arquetipo'] = 'aura';
    espada['base'] = { dano_por_s: 2, cooldown_s: null, raio_corpos: 3, intervalo_tick_s: 1, aplica: { status: 'sal', fator_pct: 30, duracao_s: 1 } };
    espada['niveis'] = (espada['niveis'] as { nivel: number }[]).map((n) => ({ ...n, efeitos: [] }));
    const tab = criarTabelaDeArmas(copia as unknown as ArmaDoJson[], aldric.atributos, 'facas_de_sal');
    const i = indiceDoNivel(1, 8);
    expect([tab.arquetipo[1], tab.alcance[i], tab.periodo[1], tab.numDano[1], tab.salPct[i], tab.salPassos[i]]).toEqual([ARQUETIPO.aura, 96, 60, 60, 30, 60]);
  });
});

describe('fórmula de dano (D1, D2)', () => {
  it('Espada de Aldric nv1: 6,75; Poder 8%: 7,29; FOR 14: 12,75; multStatus 150: 10,125', () => {
    expect(danoPorAcerto(10, 1, 1, 0, 0, 675, 100, 100)).toBe(6.75);
    expect(danoPorAcerto(10, 1, 1, 0, 8, 675, 100, 100)).toBeCloseTo(7.29, 12);
    expect(danoPorAcerto(10, 1, 1, 0, 0, 75 * 14 + 75 * 3, 100, 100)).toBe(12.75);
    expect(danoPorAcerto(10, 1, 1, 20, 0, 675, 150, 100)).toBeCloseTo(12.15, 12);
  });

  it('os bônus somam: nv6 da Espada 9,45 (o produto daria 9,72, +2,86%)', () => {
    expect(danoPorAcerto(10, 1, 1, 40, 0, 675, 100, 100)).toBeCloseTo(9.45, 12);
    expect(Math.abs(9.72 / 9.45 - 1)).toBeGreaterThan(0.01);
  });

  it('tick do Círculo: 4 × 30/60 × 0,375 = 0,75 exato', () => {
    expect(danoPorAcerto(4, 30, 60, 0, 0, 375, 100, 100)).toBe(0.75);
  });

  it('o numerador fica abaixo de 2⁵³ no pior caso do MVP, com folga para atributos e status das F-005 a F-009', () => {
    // Círculo nv8 (4 × 30, +40%), Poder 55%, FÉ A com atributo 34, multStatus 600 (×2 × 2 × 1,5), stamina 100.
    const circulo = 4 * 30 * 140 * 155 * 125 * 34 * 600 * 100;
    // União (21, sem níveis), FOR B 34 + DES C 3, o mesmo resto.
    const uniao = 21 * 1 * 100 * 155 * (100 * 34 + 75 * 3) * 600 * 100;
    expect(Math.max(circulo, uniao)).toBeLessThan(2 ** 53);
  });
});
