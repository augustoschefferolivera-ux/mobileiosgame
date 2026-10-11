// Sorteio do level up e fila de modais (design/decisoes-F-005.md §3; F-005.2 e
// a Bolsa de Almas do F-005.5). As ofertas são geradas direto, com a seed
// trocada no cabeçalho, sem passar pelo diretor nem pelas Cinzas (LV4).
import { describe, expect, it } from 'vitest';
import { CAB, PROGRESSAO, baseDoFluxo, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { semear, sortear } from '../../../src/logica/nucleo/rng';
import { categoriaDaCarta, gerarOferta, indiceUniforme, limparOferta, passivaForcada } from '../../../src/logica/progressao/oferta';
import { confirmarModal, modalAberto } from '../../../src/logica/progressao/modal';
import vigilantes from '../../../src/dados/vigilantes.json';
import { VAGAS_DE_ARMA, VAGAS_DE_PASSIVA } from '../../../src/logica/nucleo/estado';
import { eventos } from '../armas/apoio';
import { CARTA, CIRCULO, D, ELMO, ESPADA, FACAS, LAMINA, LUVAS, P, estadoDe, oferta, pickupEm } from './apoio';
import { TIPO_DE_PICKUP } from '../../../src/logica/nucleo/estado';

const MIN_12 = 12 * 3600;
const LIMIAR_60 = 2576980378;
const LIMIAR_35 = 1503238554;

/** Uma oferta do nível 2 na seed dada, com o estado e o relógio dados. */
function ofertaNaSeed(e: Estado, seed: number): [number, number][] {
  e.cab[CAB.seed] = seed;
  e.progresso[PROGRESSAO.nivel] = 2;
  e.progresso[PROGRESSAO.niveisPendentes] = 1;
  limparOferta(e);
  gerarOferta(e, D);
  return oferta(e);
}

const melhoria = (t: number): boolean => t === CARTA.melhoriaDeArma || t === CARTA.melhoriaDePassiva;

describe('limiares e escolha uniforme (L2, L3)', () => {
  it('os limiares de 60% e 35% são ⌈pct × 2³² / 100⌉, testados por valor injetado', () => {
    expect([D.progressao.limiarMelhoria, D.progressao.limiarUniao]).toEqual([LIMIAR_60, LIMIAR_35]);
    expect([categoriaDaCarta(LIMIAR_60 - 1, LIMIAR_60), categoriaDaCarta(LIMIAR_60, LIMIAR_60)]).toEqual([true, false]);
    expect([passivaForcada(LIMIAR_35 - 1, LIMIAR_35), passivaForcada(LIMIAR_35, LIMIAR_35)]).toEqual([true, false]);
    expect([indiceUniforme(0, 3), indiceUniforme(0xffffffff, 3), indiceUniforme(0x55555555, 3), indiceUniforme(0x55555556, 3)]).toEqual([0, 2, 0, 1]);
  });

  it('as vagas do layout são as de vigilantes.json (5 armas e 6 passivas)', () => {
    expect([VAGAS_DE_ARMA, VAGAS_DE_PASSIVA]).toEqual([vigilantes.vigilantes[0]!.vagas.armas, vigilantes.vigilantes[0]!.vagas.passivas]);
  });

  it('toda oferta consome 7 u32 do subfluxo do nível, com o Elmo forçado ou não', () => {
    for (const relogio of [0, MIN_12 + 60]) {
      const e = estadoDe([[ESPADA, 8]]);
      e.cab[CAB.relogio] = relogio;
      for (let s = 1; s <= 50; s++) {
        ofertaNaSeed(e, s);
        const r = new Uint32Array(4);
        semear(r, 0, s, 'levelup', 2);
        for (let k = 0; k < 7; k++) sortear(r, 0);
        const b = baseDoFluxo('levelup');
        expect([...e.rng.slice(b, b + 4)], `seed ${s}`).toEqual([...r]);
      }
    }
  });
});

describe('F-005.2: o sorteio respeita vagas e 60%', () => {
  it('(a, b) build de 3 melhoráveis e 2 novos: 60% ± 1,5 nas cartas 1 e 2, 66,4% ± 2 na 3, nenhum item repetido', () => {
    const e = estadoDe(
      [
        [ESPADA, 2],
        [FACAS, 1],
      ],
      [[LUVAS, 1]],
    );
    const m = [0, 0, 0];
    const N = 10000;
    for (let s = 1; s <= N; s++) {
      const o = ofertaNaSeed(e, s);
      o.forEach(([t], k) => {
        if (melhoria(t)) m[k]!++;
      });
      const itens = o.map(([t, i]) => `${t === CARTA.armaNova || t === CARTA.melhoriaDeArma ? 'a' : 'p'}${i}`);
      expect(new Set(itens).size, `seed ${s}`).toBe(3);
    }
    expect(Math.abs(m[0]! / N - 0.6)).toBeLessThanOrEqual(0.015);
    expect(Math.abs(m[1]! / N - 0.6)).toBeLessThanOrEqual(0.015);
    expect(Math.abs(m[2]! / N - 0.664)).toBeLessThanOrEqual(0.02);
  });

  it('(c) arma nova só com vaga: com as vagas de arma cheias, nenhuma carta de arma nova em 1.000 ofertas', () => {
    const e = estadoDe([
      [ESPADA, 2],
      [FACAS, 1],
    ]);
    for (let v = 2; v < VAGAS_DE_ARMA; v++) e.build.codigo[v] = 0xfe;
    for (let s = 1; s <= 1000; s++) expect(ofertaNaSeed(e, s).some(([t]) => t === CARTA.armaNova), `seed ${s}`).toBe(false);
  });

  it('(d) a ajuda dos 35% como piso: às 13:00 com a Espada nv8, o Elmo na carta 1 em 35% + 65% × 1/4 ± 2; às 11:59 a oferta é a da regra desligada; sem vaga de passiva, nunca forçado', () => {
    const e = estadoDe([[ESPADA, 8]]);
    e.cab[CAB.relogio] = 13 * 3600;
    let elmo = 0;
    const N = 10000;
    for (let s = 1; s <= N; s++) {
      const o = ofertaNaSeed(e, s);
      if (o[0]![0] === CARTA.passivaNova && o[0]![1] === ELMO) elmo++;
    }
    expect(elmo / N).toBeGreaterThanOrEqual(0.35);
    expect(Math.abs(elmo / N - (0.35 + 0.65 * 0.25))).toBeLessThanOrEqual(0.02);
    const antes = estadoDe([[ESPADA, 8]]);
    const desligada = estadoDe([[ESPADA, 8]]);
    antes.cab[CAB.relogio] = MIN_12 - 1;
    for (let s = 1; s <= 500; s++) expect(ofertaNaSeed(antes, s)).toEqual(ofertaNaSeed(desligada, s));
    const cheia = estadoDe([[ESPADA, 8]]);
    cheia.cab[CAB.relogio] = 13 * 3600;
    for (let v = 0; v < VAGAS_DE_PASSIVA; v++) cheia.passivas.codigo[v] = 0xfe;
    for (let s = 1; s <= 1000; s++) expect(ofertaNaSeed(cheia, s).some(([t, i]) => t === CARTA.passivaNova && i === ELMO)).toBe(false);
  });

  it('a Espada abaixo do nv8, o Elmo já na build ou a União formada não ativam a ajuda', () => {
    for (const [armas, passivas] of [
      [[[ESPADA, 7]], []],
      [[[ESPADA, 8]], [[ELMO, 1]]],
      [[[LAMINA, 1]], []],
    ] as const) {
      const ajudada = estadoDe(armas, passivas);
      const sem = estadoDe(armas, passivas);
      ajudada.cab[CAB.relogio] = 13 * 3600;
      for (let s = 1; s <= 300; s++) expect(ofertaNaSeed(ajudada, s)).toEqual(ofertaNaSeed(sem, s));
    }
  });
});

describe('Bolsa de Almas (Q-22 (3); F-005.5) e a União fora do sorteio (L1)', () => {
  it('com tudo no máximo, a oferta é [Bolsa, Bolsa, Bolsa] em 1.000 seeds; escolher dá +50 Almas exatos', () => {
    const e = estadoDe(
      [
        [ESPADA, 8],
        [FACAS, 8],
        [CIRCULO, 8],
      ],
      [
        [ELMO, 5],
        [LUVAS, 5],
      ],
    );
    for (let s = 1; s <= 1000; s++) expect(ofertaNaSeed(e, s).map(([t]) => t)).toEqual([CARTA.bolsa, CARTA.bolsa, CARTA.bolsa]);
    const build = [...e.build.nivel];
    confirmarModal(e, D, 1);
    expect([e.progresso[P.almas], e.progresso[P.niveisPendentes]]).toEqual([50, 0]);
    expect([...e.build.nivel]).toEqual(build);
  });

  it('com só o Círculo nv7 restando, a carta 1 é o Círculo nv8 e as outras duas são Bolsa', () => {
    const e = estadoDe(
      [
        [ESPADA, 8],
        [FACAS, 8],
        [CIRCULO, 7],
      ],
      [
        [ELMO, 5],
        [LUVAS, 5],
      ],
    );
    for (let s = 1; s <= 300; s++) expect(ofertaNaSeed(e, s)).toEqual([[CARTA.melhoriaDeArma, CIRCULO], [CARTA.bolsa, 0], [CARTA.bolsa, 0]]);
  });

  it('com a União e o resto no máximo, 3 Bolsas: a Espada não volta como arma nova', () => {
    const e = estadoDe(
      [
        [LAMINA, 1],
        [FACAS, 8],
        [CIRCULO, 8],
      ],
      [
        [ELMO, 5],
        [LUVAS, 5],
      ],
    );
    for (let s = 1; s <= 300; s++) expect(ofertaNaSeed(e, s).map(([t]) => t)).toEqual([CARTA.bolsa, CARTA.bolsa, CARTA.bolsa]);
  });

  it('a oferta seguinte nasce sobre a build atualizada: escolhida Facas nova, a 2ª nunca traz Facas nova e às vezes Facas nv2', () => {
    let viuFacas2 = 0;
    for (let s = 1; s <= 1000; s++) {
      const e = estadoDe([[ESPADA, 1]], [], {}, s);
      e.progresso[P.nivel] = 3;
      e.progresso[P.niveisPendentes] = 2;
      gerarOferta(e, D);
      const k = oferta(e).findIndex(([t, i]) => t === CARTA.armaNova && i === FACAS);
      if (k < 0) continue;
      confirmarModal(e, D, k);
      const o2 = oferta(e);
      expect(o2.some(([t, i]) => t === CARTA.armaNova && i === FACAS)).toBe(false);
      if (o2.some(([t, i]) => t === CARTA.melhoriaDeArma && i === FACAS)) viuFacas2++;
    }
    expect(viuFacas2).toBeGreaterThan(50);
  });
});

describe('fila de modais e confirmarModal (M1 a M3)', () => {
  it('sem modal, ou com a carta fora de 0 a 2, lança', () => {
    const e = estadoDe([[ESPADA, 1]]);
    expect(() => confirmarModal(e, D, 0)).toThrow(/nenhum modal/);
    e.progresso[P.niveisPendentes] = 1;
    gerarOferta(e, D);
    expect(() => confirmarModal(e, D, 3)).toThrow(/fora de 0 a 2/);
    expect(() => confirmarModal(e, D, -1)).toThrow(/fora de 0 a 2/);
  });

  it('baú e cruzamento no mesmo passo: o baú vem primeiro; fechá-lo abre a oferta; o hash é igual com 1 e 5 passos por chamada', () => {
    const roteiro = [{ passo: 0, mx: 0, my: 0 }];
    const montar = (): Estado => {
      const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 10 });
      pickupEm(e, 0, 0, TIPO_DE_PICKUP.bauComum, 1);
      return e;
    };
    const e = montar();
    expect(avancar(e, D, fonteDoRoteiro(roteiro), 10)).toBe(1);
    expect([e.progresso[P.bausPorFechar], e.progresso[P.niveisPendentes], e.oferta.tipo[0]]).toEqual([1, 1, 0]);
    confirmarModal(e, D, 0);
    expect(e.oferta.tipo[0]).not.toBe(0);
    expect(modalAberto(e)).toBe(true);
    confirmarModal(e, D, 2);
    expect(modalAberto(e)).toBe(false);
    expect(e.progresso[P.modaisConfirmados]).toBe(2);
    const a = montar();
    const b = montar();
    avancar(a, D, fonteDoRoteiro(roteiro, [0, 2]), 60);
    for (let k = 0; k < 12; k++) avancar(b, D, fonteDoRoteiro(roteiro, [0, 2]), 5);
    expect(hashEstado(a)).toBe(hashEstado(b));
    expect(a.cab[CAB.passo]).toBe(60);
    const cartas = eventos(a).filter((x) => x.tipo === EVENTO.carta);
    expect(cartas).toHaveLength(1);
  });

  it('dois níveis seguidos aplicam as duas cartas na ordem; sem escolha, avancar para e devolve os passos rodados', () => {
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    expect(avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }]), 100)).toBe(1);
    expect(e.cab[CAB.passo]).toBe(1);
    const o1 = oferta(e)[0]!;
    confirmarModal(e, D, 0);
    const o2 = oferta(e)[0]!;
    confirmarModal(e, D, 0);
    const cartas = eventos(e).filter((x) => x.tipo === EVENTO.carta);
    expect(cartas.map((x) => [x.forma, x.arma])).toEqual([o1, o2]);
    expect(avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }]), 10)).toBe(10);
  });
});
