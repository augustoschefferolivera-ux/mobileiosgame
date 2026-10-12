// Baú (design/decisoes-F-005.md §4, B1 a B5; F-005.3 e a parte do baú do F-005.5).
import { describe, expect, it } from 'vitest';
import { BAU, BYTES_POR_BAU, CAB, CATEGORIA_DE_ITEM, TIPO_DE_PICKUP, hashEstado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { avancar } from '../../../src/logica/nucleo/passo';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { abrirBau, quantidadeDoBau, uniaoDisponivel } from '../../../src/logica/progressao/bau';
import { confirmarModal } from '../../../src/logica/progressao/modal';
import { PARADO } from '../apoio';
import { eventos } from '../armas/apoio';
import { CIRCULO, D, ELMO, ESPADA, FACAS, LAMINA, LUVAS, P, estadoDe, pickupEm } from './apoio';

const DEZ_MINUTOS = 36000;
/** O menor u32 com ⌊u × 100 / 2³²⌋ = a. */
const uDe = (a: number): number => Math.ceil((a * 4294967296) / 100);

describe('quantidade de itens (B1)', () => {
  it('limiares exatos: a = 69 → 1, 70 → 3, 94 → 3, 95 → 5 (e as bordas de u)', () => {
    expect([69, 70, 94, 95].map((a) => quantidadeDoBau(uDe(a), D))).toEqual([1, 3, 3, 5]);
    expect([quantidadeDoBau(uDe(70) - 1, D), quantidadeDoBau(uDe(95) - 1, D), quantidadeDoBau(0xffffffff, D)]).toEqual([1, 3, 5]);
  });

  it('F-005.5: 10.000 baús dão 70% ± 1,5, 25% ± 1,5 e 5% ± 0,8 de 1, 3 e 5 itens', () => {
    const e = estadoDe(
      [
        [ESPADA, 1],
        [FACAS, 1],
        [CIRCULO, 1],
      ],
      [
        [ELMO, 1],
        [LUVAS, 1],
      ],
    );
    const conta: Record<number, number> = { 1: 0, 3: 0, 5: 0 };
    const N = 10000;
    for (let i = 1; i <= N; i++) {
      e.progresso[P.bausPorFechar] = 0;
      abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, i));
      conta[e.filaDeBaus[BAU.itens]!]!++;
      e.build.nivel.set([1, 1, 1, 0, 0]);
      e.passivas.nivel.set([1, 1, 0, 0, 0, 0]);
    }
    expect(Math.abs(conta[1]! / N - 0.7)).toBeLessThanOrEqual(0.015);
    expect(Math.abs(conta[3]! / N - 0.25)).toBeLessThanOrEqual(0.015);
    expect(Math.abs(conta[5]! / N - 0.05)).toBeLessThanOrEqual(0.008);
  });
});

describe('conteúdo (B1, B5)', () => {
  it('itens distintos, cada um com +1 nível; o que falta vira Bolsa (+50); nunca item novo', () => {
    for (let i = 1; i <= 400; i++) {
      const e = estadoDe([[ESPADA, 7]], [[ELMO, 4]]);
      abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, i));
      const f = e.filaDeBaus;
      const n = f[BAU.itens]!;
      const categorias = [...f.slice(BAU.categoria, BAU.categoria + n)];
      const itens = categorias.filter((c) => c !== CATEGORIA_DE_ITEM.bolsa).length;
      expect(itens).toBe(Math.min(n, 2));
      expect(e.progresso[P.almas]).toBe(50 * (n - itens));
      if (n >= 2) expect([e.build.nivel[0], e.passivas.nivel[0]]).toEqual([8, 5]);
      expect(e.build.codigo.filter((c) => c !== 0)).toHaveLength(1);
    }
  });

  it('o sorteio é pelo índice de queda: o mesmo índice dá o mesmo conteúdo, aberto em qualquer ordem', () => {
    const conteudo = (primeiro: number): string => {
      const e = estadoDe([[ESPADA, 1]], [[LUVAS, 1]]);
      const a = pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, 7);
      const b = pickupEm(e, 300, 0, TIPO_DE_PICKUP.bauComum, 8);
      abrirBau(e, D, primeiro === 7 ? a : b);
      return [...e.filaDeBaus.slice(0, BYTES_POR_BAU)].join(',');
    };
    expect(conteudo(7)).not.toBe(conteudo(8));
    expect(conteudo(7)).toBe(conteudo(7));
  });

  it('com tudo no máximo, 5 itens são 5 Bolsas: +250 Almas', () => {
    let achou = false;
    for (let i = 1; i <= 2000 && !achou; i++) {
      const e = estadoDe([[ESPADA, 8]], [[ELMO, 5]]);
      abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, i));
      if (e.filaDeBaus[BAU.itens] === 5) {
        expect(e.progresso[P.almas]).toBe(250);
        achou = true;
      }
    }
    expect(achou).toBe(true);
  });

  it('abre ao encostar (≤ 32 px de centro a centro), não antes; 2 baús no mesmo passo viram 2 modais em ordem de slot; a fila de 4 deixa o 5º no chão', () => {
    let e = estadoDe([[ESPADA, 1]]);
    pickupEm(e, 32.0625, 0, TIPO_DE_PICKUP.bauComum, 1);
    avancar(e, D, PARADO, 30);
    expect(quantosAtivos(e.poolDePickups)).toBe(1);
    e = estadoDe([[ESPADA, 1]]);
    pickupEm(e, 32, 0, TIPO_DE_PICKUP.bauComum, 1);
    expect(avancar(e, D, PARADO, 30)).toBe(1);
    expect(e.progresso[P.bausPorFechar]).toBe(1);
    e = estadoDe([[ESPADA, 1]]);
    for (let k = 0; k < 5; k++) pickupEm(e, k * 4, 0, TIPO_DE_PICKUP.bauDourado, k + 1);
    expect(avancar(e, D, PARADO, 30)).toBe(1);
    expect([e.progresso[P.bausPorFechar], quantosAtivos(e.poolDePickups)]).toEqual([4, 1]);
    const bausAbertos = eventos(e).filter((x) => x.tipo === EVENTO.bau).map((x) => x.f[2]);
    expect(bausAbertos).toEqual([1, 2, 3, 4]);
    confirmarModal(e, D, 0);
    expect(e.progresso[P.bausPorFechar]).toBe(3);
    // O 5º abre no passo seguinte à fila com vaga... só quando o passo volta a rodar (fila vazia).
    for (let k = 0; k < 3; k++) confirmarModal(e, D, 0);
    expect(avancar(e, D, PARADO, 30)).toBe(1);
    expect(e.progresso[P.bausPorFechar]).toBe(1);
  });
});

describe('União no baú (B2; F-005.3)', () => {
  it('F-005.3: 1.000 baús com seeds diferentes, relógio ≥ 10:00, Espada nv8 e Elmo: a União em 100%; a 35.999 passos, nunca', () => {
    for (let s = 1; s <= 1000; s++) {
      for (const relogio of [DEZ_MINUTOS, DEZ_MINUTOS - 1]) {
        const e = estadoDe([[ESPADA, 8]], [[ELMO, 1]], {}, s);
        e.cab[CAB.relogio] = relogio;
        abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauDourado, 1 + (s % 3)));
        expect(e.build.codigo[0] === LAMINA, `seed ${s} relógio ${relogio}`).toBe(relogio >= DEZ_MINUTOS);
        if (relogio >= DEZ_MINUTOS) {
          expect([e.filaDeBaus[BAU.uniao], e.filaDeBaus[BAU.itens], e.passivas.codigo[0], e.passivas.nivel[0]]).toEqual([1, 0, ELMO, 1]);
        }
      }
    }
  });

  it('um baú solto em 18.000 passos e aberto em 36.001 dá a União; dos 2 baús no mesmo passo, só o 1º a leva', () => {
    const e = estadoDe([[ESPADA, 8]], [[ELMO, 2]]);
    e.cab[CAB.relogio] = 18000;
    pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, 1);
    e.cab[CAB.relogio] = 36001;
    expect(uniaoDisponivel(e, D)).toBe(0);
    pickupEm(e, 0, 0, TIPO_DE_PICKUP.bauComum, 2);
    pickupEm(e, 0, 4, TIPO_DE_PICKUP.bauComum, 3);
    avancar(e, D, PARADO, 1);
    expect(e.build.codigo[0]).toBe(LAMINA);
    expect(e.filaDeBaus[BAU.uniao]).toBe(1);
    expect(e.filaDeBaus[BYTES_POR_BAU + BAU.uniao]).toBe(0);
    expect(eventos(e).filter((x) => x.tipo === EVENTO.uniao)).toHaveLength(1);
  });

  it('o mesmo roteiro com o baú dá o mesmo hash com 1 e 5 passos por chamada', () => {
    const montar = () => {
      const e = estadoDe([[ESPADA, 8]], [[ELMO, 1]]);
      e.cab[CAB.relogio] = DEZ_MINUTOS;
      pickupEm(e, 0, -60, TIPO_DE_PICKUP.bauDourado, 1);
      return e;
    };
    const roteiro = [{ passo: 0, mx: 0, my: -1 }];
    const a = montar();
    const b = montar();
    avancar(a, D, fonteDoRoteiro(roteiro, [0]), 120);
    for (let k = 0; k < 24; k++) avancar(b, D, fonteDoRoteiro(roteiro, [0]), 5);
    expect(hashEstado(a)).toBe(hashEstado(b));
    expect(a.build.codigo[0]).toBe(LAMINA);
  });
});
