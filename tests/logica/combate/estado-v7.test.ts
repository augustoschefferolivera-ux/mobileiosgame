// Estado v7 (design/decisoes-F-007.md LY1, LY3, LY4, MC6, AG4): versão, tamanho, cada deslocamento e o
// alinhamento, a lista canônica de campos, as constantes novas, o início da fase, do Frasco e da mancha, a seção
// `vigilia` do hash, os parâmetros novos (`mancha`, `almasIniciais`) e a tabela de combate com as constantes da F-007.
// Nenhum comportamento novo ainda: o bloco v7 fica como nasceu enquanto a Vigília roda.
import { describe, expect, it } from 'vitest';
import { ACAO } from '../../../src/logica/nucleo/comandos';
import {
  BYTES_DO_LAYOUT_6,
  BYTES_ESTADO,
  CAUSA_DO_FIM,
  CENARIO,
  FASE,
  JOGADOR4,
  JOGADOR4_U32,
  JOGADOR4_U8,
  LAYOUT,
  LIMITE_DE_ALMAS,
  PROGRESSAO,
  TIPO_DE_PICKUP,
  VERSAO_LAYOUT,
  criarEstado,
  hashEstado,
  hashPorSecao,
} from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { DADOS_DA_CHARNECA as D, PARADO, PRODUCAO } from '../apoio';

describe('layout v7 (LY1)', () => {
  it('versão 7, 74.680 bytes; o v6 (74.636) no mesmo lugar e o bloco novo em ordem, cada deslocamento literal', () => {
    expect(VERSAO_LAYOUT).toBe(7);
    expect(BYTES_DO_LAYOUT_6).toBe(74_636);
    expect(BYTES_ESTADO).toBe(74_680);
    expect(BYTES_ESTADO - BYTES_DO_LAYOUT_6).toBe(5 * 4 + 4 * 4 + 8);
    expect({
      fimDoV6: LAYOUT.fimDoV6,
      jogador4: LAYOUT.jogador4,
      jogador4U32: LAYOUT.jogador4U32,
      jogador4U8: LAYOUT.jogador4U8,
      fim: LAYOUT.fim,
    }).toEqual({ fimDoV6: 74_636, jogador4: 74_636, jogador4U32: 74_656, jogador4U8: 74_672, fim: 74_680 });
    expect(LAYOUT.projeteis3U16 + 2 * 400 * 2).toBe(BYTES_DO_LAYOUT_6);
    expect(Object.values(LAYOUT).every((o) => o % 4 === 0)).toBe(true);
  });

  it('as três views novas estão alinhadas, contíguas e terminam no fim do buffer; a folga de 2 bytes fica em zero', () => {
    const e = criarEstado(1, D);
    const fim = (v: ArrayBufferView): number => v.byteOffset + v.byteLength;
    expect(e.jogador4.byteOffset).toBe(BYTES_DO_LAYOUT_6);
    expect(e.jogador4.byteOffset % 4).toBe(0);
    expect(fim(e.jogador4)).toBe(e.jogador4U32.byteOffset);
    expect(fim(e.jogador4U32)).toBe(e.jogador4U8.byteOffset);
    expect(fim(e.jogador4U8)).toBe(BYTES_ESTADO);
    expect(e.bytes.length).toBe(BYTES_ESTADO);
    expect(e.jogador4.length).toBe(5);
    expect(e.jogador4U32.length).toBe(4);
    expect(e.jogador4U8.length).toBe(8);
    avancar(e, D, PARADO, 100);
    expect([...e.jogador4U8.subarray(6)]).toEqual([0, 0]);
  });

  it('a lista canônica de campos, nesta ordem', () => {
    expect(Object.keys(JOGADOR4)).toEqual(['frascoPorPasso', 'frascoRestante', 'danoRecebido', 'manchaX', 'manchaY']);
    expect(Object.keys(JOGADOR4_U32)).toEqual(['aparos', 'esquivasPerfeitas', 'frascosUsados', 'manchaAlmas']);
    expect(Object.keys(JOGADOR4_U8)).toEqual(['fase', 'causaDoFim', 'apagandoPassos', 'frascoCargas', 'frascoPasso', 'manchaAtiva']);
    expect(Object.values(JOGADOR4_U8)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('um campo do v7 escrito só muda a seção `vigilia` do hash; as outras ficam', () => {
    const e = criarEstado(1, D);
    const antes = hashPorSecao(e);
    const h0 = hashEstado(e);
    e.jogador4U8[JOGADOR4_U8.fase] = FASE.apagando;
    const depois = hashPorSecao(e);
    for (const k of Object.keys(antes) as (keyof typeof antes)[]) {
      if (k === 'vigilia') expect(depois[k], k).not.toBe(antes[k]);
      else expect(depois[k], k).toBe(antes[k]);
    }
    expect(hashEstado(e)).not.toBe(h0);
    // O último byte do buffer (a folga) também entra no hash.
    e.jogador4U8[JOGADOR4_U8.fase] = FASE.viva;
    e.bytes[BYTES_ESTADO - 1] = 1;
    expect(hashPorSecao(e).vigilia).not.toBe(antes.vigilia);
    expect(hashPorSecao(e).combate).toBe(antes.combate);
  });
});

describe('constantes novas (LY3, LY4, AG4)', () => {
  it('tabela literal das fases, das causas do fim, dos bits de ACAO e do pickup', () => {
    expect(FASE).toEqual({ viva: 0, apagando: 1, fim: 2 });
    expect(CAUSA_DO_FIM).toEqual({ nenhuma: 0, apagar: 1, abandonar: 2, aFome: 3, amanhecer: 4 });
    expect(ACAO).toEqual({ esquiva: 1, aparo: 2, frasco: 4, frascoCancelar: 8, abandonar: 16 });
    expect(TIPO_DE_PICKUP).toEqual({ vazio: 0, cinza: 1, bauComum: 2, bauDourado: 3, alma: 4 });
    expect(LIMITE_DE_ALMAS).toBe(2 ** 30);
  });
});

describe('o bloco v7 ao nascer e sem comportamento novo', () => {
  it('nasce VIVA, com as cargas de vigilantes.json e o resto em zero', () => {
    const e = criarEstado(1, D);
    expect([...e.jogador4U8]).toEqual([FASE.viva, CAUSA_DO_FIM.nenhuma, 0, 3, 0, 0, 0, 0]);
    expect([...e.jogador4]).toEqual([0, 0, 0, 0, 0]);
    expect([...e.jogador4U32]).toEqual([0, 0, 0, 0]);
    expect(e.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(D.combate.frascoCargas);
  });

  it('1.000 passos da Vigília de produção, parada e invulnerável, não mexem no bloco v7 (o dano e o Frasco são da F-007 3b)', () => {
    const e = criarEstado(1, D, { ...PRODUCAO, cenario: (PRODUCAO.cenario ?? 0) | CENARIO.jogadorInvulneravel });
    const antes = e.bytes.slice(BYTES_DO_LAYOUT_6);
    avancar(e, D, PARADO, 1000);
    expect(e.bytes.slice(BYTES_DO_LAYOUT_6)).toEqual(antes);
  });
});

describe('parâmetros novos: mancha e almasIniciais (MC6, MC12)', () => {
  it('a mancha nasce ativa no passo 0, em Float32, e entra no hash; o padrão não muda nada', () => {
    const base = criarEstado(1, D);
    const m = criarEstado(1, D, { mancha: { x: 934.5, y: 987.25, almas: 60 } });
    expect(m.jogador4U8[JOGADOR4_U8.manchaAtiva]).toBe(1);
    expect(m.jogador4[JOGADOR4.manchaX]).toBe(934.5);
    expect(m.jogador4[JOGADOR4.manchaY]).toBe(987.25);
    expect(m.jogador4U32[JOGADOR4_U32.manchaAlmas]).toBe(60);
    expect(hashEstado(m)).not.toBe(hashEstado(base));
    expect(criarEstado(1, D, { mancha: null, almasIniciais: 0 }).bytes).toEqual(base.bytes);
    // Só o bloco v7 muda, e nenhum fluxo de RNG é tocado (MC6).
    expect(m.bytes.subarray(0, BYTES_DO_LAYOUT_6)).toEqual(base.bytes.subarray(0, BYTES_DO_LAYOUT_6));
    avancar(m, D, PARADO, 200);
    avancar(base, D, PARADO, 200);
    expect(m.rng).toEqual(base.rng);
  });

  it('almasIniciais grava o saldo de Almas e entra no hash; os dois limites recusam', () => {
    const base = criarEstado(1, D);
    const e = criarEstado(1, D, { almasIniciais: 1000 });
    expect(e.progresso[PROGRESSAO.almas]).toBe(1000);
    expect(hashEstado(e)).not.toBe(hashEstado(base));
    expect(criarEstado(1, D, { almasIniciais: LIMITE_DE_ALMAS - 1 }).progresso[PROGRESSAO.almas]).toBe(LIMITE_DE_ALMAS - 1);
    for (const almas of [-1, 1.5, Number.NaN, LIMITE_DE_ALMAS]) expect(() => criarEstado(1, D, { almasIniciais: almas })).toThrow(/Almas iniciais/);
    for (const almas of [0, 1.5, -3, Number.NaN, LIMITE_DE_ALMAS]) {
      expect(() => criarEstado(1, D, { mancha: { x: 10, y: 10, almas } })).toThrow(/mancha/);
    }
    expect(criarEstado(1, D, { mancha: { x: 10, y: 10, almas: LIMITE_DE_ALMAS - 1 } }).jogador4U32[JOGADOR4_U32.manchaAlmas]).toBe(LIMITE_DE_ALMAS - 1);
    expect(() => criarEstado(1, D, { mancha: { x: -1, y: 10, almas: 5 } })).toThrow(/mancha/);
    expect(() => criarEstado(1, D, { mancha: { x: 10, y: Number.NaN, almas: 5 } })).toThrow(/mancha/);
  });
});

describe('tabela de combate com as constantes da F-007', () => {
  const c = D.combate;
  it('o Frasco, a Brasa Firme, o Apagar, a mancha e a telemetria, em passos e px', () => {
    expect([c.frascoCargas, c.frascoCuraPct, c.frascoPassos, c.frascoInterrompePct, c.frascoEsperaRegen, c.frascoCancelarPassos]).toEqual([3, 40, 120, 15, 120, 18]);
    expect([c.brasaFirmeReducaoPct, c.brasaFirmeStaminaPct]).toEqual([20, 50]);
    expect([c.apagarPassos, c.apagarFator]).toEqual([30, 0.5]);
    expect([c.manchaPct, c.manchaRaio, c.manchaMargem]).toEqual([30, 32, 16]);
    expect([c.telemetriaAgregacaoPassos, c.telemetriaTeto]).toEqual([300, 128]);
  });
});
