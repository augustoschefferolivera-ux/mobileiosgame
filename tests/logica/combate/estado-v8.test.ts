// Estado v8 (design/decisoes-F-008.md §1, LY1, LY2, AR1, AR3): versão, tamanho, cada deslocamento, o alinhamento, a
// lista canônica de campos, as constantes novas, a seção `fogueira` do hash, o `obstaculoAtivo` (54 usados de 64) e a etapa
// de partida. O bloco v8 nasce zerado (menos o que a Vigília põe) e a regressão v7 está em regressao-v7.test.ts.
import { describe, expect, it } from 'vitest';
import {
  BYTES_DO_LAYOUT_6,
  BYTES_DO_LAYOUT_7,
  BYTES_DO_LAYOUT_8,
  CAPACIDADE_DE_INIMIGOS,
  ETAPA,
  FOGUEIRA_F32,
  FOGUEIRA_U32,
  FOGUEIRA_U8,
  LAYOUT,
  OBSTACULOS_MAXIMOS,
  VERSAO_LAYOUT,
  criarEstado,
  hashEstado,
  hashPorSecao,
} from '../../../src/logica/nucleo/estado';
import { CAUSA, EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { DADOS_DA_CHARNECA as D, PARADO, dadosDe } from '../apoio';

describe('layout v8 (LY1)', () => {
  it('o v8 de 76.788 bytes; o v7 (74.680) no mesmo lugar e o bloco novo em ordem, cada deslocamento literal', () => {
    expect(VERSAO_LAYOUT).toBe(9);
    expect(BYTES_DO_LAYOUT_7).toBe(74_680);
    expect(BYTES_DO_LAYOUT_8).toBe(76_788);
    expect(BYTES_DO_LAYOUT_8 - BYTES_DO_LAYOUT_7).toBe(6 * 4 + 2 * 4 + 12 + 64 + 2 * 500 + 2 * 500);
    expect({
      fimDoV7: LAYOUT.fimDoV7,
      fogueira: LAYOUT.fogueira,
      fogueiraU32: LAYOUT.fogueiraU32,
      fogueiraU8: LAYOUT.fogueiraU8,
      obstaculoAtivo: LAYOUT.obstaculoAtivo,
      inimigos8U8: LAYOUT.inimigos8U8,
      inimigos8U16: LAYOUT.inimigos8U16,
      fim: LAYOUT.fim,
    }).toEqual({
      fimDoV7: 74_680,
      fogueira: 74_680,
      fogueiraU32: 74_704,
      fogueiraU8: 74_712,
      obstaculoAtivo: 74_724,
      inimigos8U8: 74_788,
      inimigos8U16: 75_788,
      fim: 76_868,
    });
    expect(LAYOUT.jogador4U8 + 8).toBe(BYTES_DO_LAYOUT_7);
    expect(BYTES_DO_LAYOUT_6).toBe(74_636);
    expect(Object.values(LAYOUT).every((o) => o % 4 === 0)).toBe(true);
  });

  it('as views novas estão alinhadas, contíguas e terminam no fim do buffer; as 4 folgas ficam em zero', () => {
    const e = criarEstado(1, D);
    const fim = (v: ArrayBufferView): number => v.byteOffset + v.byteLength;
    expect(e.fogueiraF32.byteOffset).toBe(BYTES_DO_LAYOUT_7);
    expect(fim(e.fogueiraF32)).toBe(e.fogueiraU32.byteOffset);
    expect(fim(e.fogueiraU32)).toBe(e.fogueiraU8.byteOffset);
    expect(fim(e.fogueiraU8)).toBe(e.obstaculoAtivo.byteOffset);
    expect(fim(e.obstaculoAtivo)).toBe(e.inimigos.ataqueId.byteOffset);
    expect(fim(e.inimigos.ataqueId)).toBe(e.inimigos.ataqueSeq.byteOffset);
    expect(fim(e.inimigos.ataqueSeq)).toBe(e.inimigos.convocaEspera.byteOffset);
    expect(fim(e.inimigos.convocaEspera)).toBe(BYTES_DO_LAYOUT_8);
    expect(e.inimigos.convocaEspera.byteOffset % 2).toBe(0);
    expect([e.fogueiraF32.length, e.fogueiraU32.length, e.fogueiraU8.length, e.obstaculoAtivo.length]).toEqual([6, 2, 12, OBSTACULOS_MAXIMOS]);
    avancar(e, D, PARADO, 100);
    expect([...e.fogueiraU8.subarray(8)]).toEqual([0, 0, 0, 0]);
  });

  it('a lista canônica de campos, nesta ordem', () => {
    expect(Object.keys(FOGUEIRA_F32)).toEqual(['fogueiraX', 'fogueiraY', 'arenaX', 'arenaY', 'empurraoX', 'empurraoY']);
    expect(Object.keys(FOGUEIRA_U32)).toEqual(['idVigilia', 'convocacoes']);
    expect(Object.keys(FOGUEIRA_U8)).toEqual(['etapa', 'marcosIniciados', 'arenaAtiva', 'coroadosVivos', 'fogueiraAcesa', 'fogueiraHora', 'fogueiraAcoes', 'empurraoPassos']);
    expect(Object.values(FOGUEIRA_U8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ETAPA).toEqual({ hora: 0, marco: 1, fogueira: 2, chefe: 3, aFome: 4, amanhecer: 5 });
  });

  it('um campo do v8 escrito só muda a seção `fogueira` do hash; as outras ficam (a `chefe` é o bloco do v9)', () => {
    const e = criarEstado(1, D);
    const antes = hashPorSecao(e);
    const h0 = hashEstado(e);
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.marco;
    const depois = hashPorSecao(e);
    for (const k of Object.keys(antes) as (keyof typeof antes)[]) {
      if (k === 'fogueira') expect(depois[k], k).not.toBe(antes[k]);
      else expect(depois[k], k).toBe(antes[k]);
    }
    expect(hashEstado(e)).not.toBe(h0);
    // O último byte do v8 (o fim de `convocaEspera`) também entra no hash.
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.hora;
    e.bytes[BYTES_DO_LAYOUT_8 - 1] = 1;
    expect(hashPorSecao(e).fogueira).not.toBe(antes.fogueira);
    expect(hashPorSecao(e).vigilia).toBe(antes.vigilia);
  });
});

describe('constantes novas (LY2)', () => {
  it('eventos 29 a 38, formas 9 e 10 e causas 2 e 3, só no fim (a F-009 acrescenta as suas depois)', () => {
    expect(EVENTO.danoAoJogador).toBe(28);
    expect(EVENTO.marcoIniciado).toBe(29);
    expect(EVENTO.marcoVencido).toBe(30);
    expect(EVENTO.marcoConcluido).toBe(31);
    expect(EVENTO.fogueiraAcesa).toBe(32);
    expect(EVENTO.fogueiraAberta).toBe(33);
    expect(EVENTO.descansou).toBe(34);
    expect(EVENTO.forjou).toBe(35);
    expect(EVENTO.fogueiraPartiu).toBe(36);
    expect(EVENTO.fogueiraApagada).toBe(37);
    expect(EVENTO.convocacao).toBe(38);
    expect(FORMA.projetilSal).toBe(8);
    expect(FORMA.coneInimigo).toBe(9);
    expect(FORMA.gritoInimigo).toBe(10);
    expect(CAUSA).toMatchObject({ arma: 1, arena: 2, cinza: 3 });
  });
});

describe('o bloco v8 ao nascer (AR1, AR3)', () => {
  it('nasce em HORA, sem marco iniciado, com os 54 obstáculos ativos e o resto em zero', () => {
    const e = criarEstado(1, D);
    expect(D.obstaculos.n).toBe(54);
    expect([...e.fogueiraU8]).toEqual([ETAPA.hora, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect([...e.fogueiraF32]).toEqual([0, 0, 0, 0, 0, 0]);
    expect([...e.fogueiraU32]).toEqual([0, 0]);
    expect([...e.obstaculoAtivo]).toEqual([...new Array(54).fill(1), ...new Array(10).fill(0)]);
    expect(e.inimigos.ataqueId.every((v) => v === 0) && e.inimigos.ataqueSeq.every((v) => v === 0) && e.inimigos.convocaEspera.every((v) => v === 0)).toBe(true);
    expect(e.inimigos.convocaEspera.length).toBe(CAPACIDADE_DE_INIMIGOS);
  });

  it('mais de 64 obstáculos é erro no boot', () => {
    const muitos = dadosDe({ obstaculos: Array.from({ length: 65 }, (_, i) => ({ x: 100 + 100 * i, y: 100, tamanho_px: 32 })) });
    expect(() => criarEstado(1, muitos)).toThrow(/obstáculos demais/);
  });

  it('a tabela de marcos vem da região: 5, 10 e 15 min, 1/1/2 Coroados, hp_base 600/1.000/600, dourado só no 2º; 20:00 e 23:00', () => {
    const m = D.marcos;
    expect(m.n).toBe(3);
    expect([...m.limiar]).toEqual([18_000, 36_000, 54_000]);
    expect([...m.coroados]).toEqual([1, 1, 2]);
    expect([...m.hpBase]).toEqual([600, 1000, 600]);
    expect([...m.dourado]).toEqual([0, 1, 0]);
    expect([m.chefeEm, m.aFomeEm]).toEqual([72_000, 82_800]);
  });

  it('o relógio inicial já conta os marcos passados como iniciados e, de 20:00 em diante, a etapa é CHEFE', () => {
    const marcos = (relogio: number): [number, number] => {
      const e = criarEstado(1, D, { relogioInicial: relogio, inicioLivre: true });
      return [e.fogueiraU8[FOGUEIRA_U8.marcosIniciados]!, e.fogueiraU8[FOGUEIRA_U8.etapa]!];
    };
    expect(marcos(0)).toEqual([0, ETAPA.hora]);
    expect(marcos(17_970)).toEqual([0, ETAPA.hora]);
    expect(marcos(18_000)).toEqual([1, ETAPA.hora]);
    expect(marcos(68_400)).toEqual([3, ETAPA.hora]);
    expect(marcos(72_000)).toEqual([3, ETAPA.chefe]);
  });
});

describe('hash e idVigilia (ADR-0010 §9, 34)', () => {
  it('o id da Vigília não entra no hash, e um byte vizinho entra', () => {
    const a = criarEstado(1, D);
    const h0 = hashEstado(a);
    a.fogueiraU32[FOGUEIRA_U32.idVigilia] = 7;
    expect(hashEstado(a)).toBe(h0);
    a.fogueiraU32[FOGUEIRA_U32.convocacoes] = 1;
    expect(hashEstado(a)).not.toBe(h0);
  });
});
