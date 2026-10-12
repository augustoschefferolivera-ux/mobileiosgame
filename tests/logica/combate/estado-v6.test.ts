// Estado v6 (design/decisoes-F-006.md ET1 a ET3): versão, tamanho, cada
// deslocamento e o alinhamento, a lista canônica de campos, as constantes
// novas, o início da stamina e dos prompts, a seção `combate` do hash e a
// tabela de combate compilada dos JSON.
import { describe, expect, it } from 'vitest';
import { ACAO } from '../../../src/logica/nucleo/comandos';
import {
  BYTES_DO_LAYOUT_5,
  BYTES_ESTADO,
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CAPACIDADE_DE_PROJETEIS,
  CENARIO,
  JOGADOR3,
  JOGADOR3_U16,
  JOGADOR3_U8,
  LAYOUT,
  PROMPT,
  TIPO_DE_PROJETIL,
  TODOS_OS_TUTORIAIS,
  TUTORIAL,
  VERSAO_LAYOUT,
  VAGAS_DE_ARMA,
  criarEstado,
  hashPorSecao,
} from '../../../src/logica/nucleo/estado';
import { ORIGEM_DO_DANO } from '../../../src/logica/mundo/contato';
import { avancar } from '../../../src/logica/nucleo/passo';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import combate from '../../../src/dados/combate.json';
import { DADOS_DA_CHARNECA as D, DADOS_SEM_OBSTACULOS, PARADO, PRODUCAO } from '../apoio';

describe('layout v6 (ET1)', () => {
  it('versão 6, 74.636 bytes; o v5 (67.488) no mesmo lugar e as seções novas em ordem, cada deslocamento literal', () => {
    expect(VERSAO_LAYOUT).toBe(6);
    expect(BYTES_DO_LAYOUT_5).toBe(67_488);
    expect(BYTES_ESTADO).toBe(74_636);
    expect(BYTES_ESTADO - BYTES_DO_LAYOUT_5).toBe(36 + 12 + 5_500 + 1_600);
    expect({
      fimDoV5: LAYOUT.fimDoV5,
      jogador3: LAYOUT.jogador3,
      jogador3U8: LAYOUT.jogador3U8,
      jogador3U16: LAYOUT.jogador3U16,
      vagas3: LAYOUT.vagas3,
      inimigos3F32: LAYOUT.inimigos3F32,
      inimigos3U8: LAYOUT.inimigos3U8,
      projeteis3U16: LAYOUT.projeteis3U16,
      fim: LAYOUT.fim,
    }).toEqual({
      fimDoV5: 67_488,
      jogador3: 67_488,
      jogador3U8: 67_500,
      jogador3U16: 67_516,
      vagas3: 67_524,
      inimigos3F32: 67_536,
      inimigos3U8: 71_536,
      projeteis3U16: 73_036,
      fim: 74_636,
    });
    // Nenhuma seção do v5 mudou de lugar (os deslocamentos de antes da F-006).
    expect(LAYOUT.progressao).toBe(42_988);
    expect(LAYOUT.efeitosU8 + 2 * 64).toBe(BYTES_DO_LAYOUT_5);
    expect(Object.values(LAYOUT).every((o) => o % 4 === 0)).toBe(true);
  });

  it('cada view nova está alinhada à sua largura e termina onde a seguinte começa; nada vai nos bytes reservados', () => {
    const e = criarEstado(1, D);
    const views = [
      e.jogador3, e.jogador3U8, e.jogador3U16, e.build.caSeq, e.build.caEspera,
      e.inimigos.miraX, e.inimigos.miraY, e.inimigos.quebradaPassos, e.inimigos.ataqueFase, e.inimigos.ataqueTimer,
      e.projeteis.donoSlot, e.projeteis.donoGeracao,
    ];
    for (const v of views) expect(v.byteOffset % v.BYTES_PER_ELEMENT).toBe(0);
    for (const v of [e.jogador3, e.inimigos.miraX, e.inimigos.miraY]) expect(v.byteOffset % 4).toBe(0);
    for (const v of [e.jogador3U16, e.projeteis.donoSlot, e.projeteis.donoGeracao]) expect(v.byteOffset % 2).toBe(0);
    const fim = (v: ArrayBufferView): number => v.byteOffset + v.byteLength;
    expect(e.jogador3.byteOffset).toBe(BYTES_DO_LAYOUT_5);
    expect(fim(e.jogador3)).toBe(e.jogador3U8.byteOffset);
    expect(fim(e.jogador3U8)).toBe(e.jogador3U16.byteOffset);
    expect(fim(e.jogador3U16)).toBe(e.build.caSeq.byteOffset);
    expect(e.build.caEspera.byteOffset).toBe(e.build.caSeq.byteOffset + VAGAS_DE_ARMA);
    expect(e.inimigos.miraX.byteOffset).toBe(e.build.caSeq.byteOffset + 12);
    expect(e.inimigos.miraY.byteOffset).toBe(e.inimigos.miraX.byteOffset + CAPACIDADE_DE_INIMIGOS * 4);
    expect(fim(e.inimigos.miraY)).toBe(e.inimigos.quebradaPassos.byteOffset);
    expect(e.inimigos.ataqueFase.byteOffset).toBe(fim(e.inimigos.quebradaPassos));
    expect(e.inimigos.ataqueTimer.byteOffset).toBe(fim(e.inimigos.ataqueFase));
    expect(fim(e.inimigos.ataqueTimer)).toBe(e.projeteis.donoSlot.byteOffset);
    expect(e.projeteis.donoGeracao.byteOffset).toBe(fim(e.projeteis.donoSlot));
    expect(fim(e.projeteis.donoGeracao)).toBe(BYTES_ESTADO);
    expect(e.projeteis.donoSlot.length).toBe(CAPACIDADE_DE_PROJETEIS);
    // Os 2 bytes reservados do registro do jogador do v5 e as palavras 10 a 15 do cabeçalho seguem em zero.
    avancar(e, D, PARADO, 50);
    expect([e.jogadorU8[2], e.jogadorU8[3]]).toEqual([0, 0]);
    for (let w = 10; w < 16; w++) expect(e.cab[w]).toBe(0);
    // A folga dos três registros novos e das vagas.
    expect([...e.jogador3U8.subarray(14)]).toEqual([0, 0]);
    expect(e.bytes.subarray(e.jogador3U16.byteOffset + 6, e.jogador3U16.byteOffset + 8)).toEqual(new Uint8Array(2));
    expect(e.bytes.subarray(e.build.caSeq.byteOffset + 10, e.build.caSeq.byteOffset + 12)).toEqual(new Uint8Array(2));
  });

  it('a lista canônica de campos, nesta ordem', () => {
    expect(Object.keys(JOGADOR3)).toEqual(['stamina', 'esquivaDirX', 'esquivaDirY']);
    expect(Object.keys(JOGADOR3_U8)).toEqual([
      'esperaRegen', 'esquivaPasso', 'esquivaPerfeitaDada', 'poderPassos', 'aparoJanela', 'aparoLimite', 'aparoFalho',
      'congelamento', 'facaExtra', 'promptEsquiva', 'promptAparo', 'falhasDeAparo', 'salPct', 'salPassos',
    ]);
    expect(Object.keys(JOGADOR3_U16)).toEqual(['alvoAparadoSlot', 'alvoAparadoGeracao', 'ameacasAparaveis']);
    expect(Object.values(JOGADOR3_U8)).toEqual([...Array(14).keys()]);
    const e = criarEstado(1, D);
    expect(Object.keys(e.inimigos)).toEqual(expect.arrayContaining(['quebradaPassos', 'ataqueFase', 'ataqueTimer', 'miraX', 'miraY']));
    expect(Object.keys(e.projeteis)).toEqual(expect.arrayContaining(['donoSlot', 'donoGeracao']));
    expect(Object.keys(e.build)).toEqual(expect.arrayContaining(['caSeq', 'caEspera']));
    expect(e.jogador3.length).toBe(3);
    expect(e.jogador3U8.length).toBe(16);
    expect(e.jogador3U16.length).toBe(4);
  });

  it('um campo novo escrito só muda a seção `combate` do hash; as outras ficam', () => {
    const e = criarEstado(1, D);
    const antes = hashPorSecao(e);
    e.jogador3U8[JOGADOR3_U8.esperaRegen] = 7;
    e.projeteis.donoSlot[3] = 9;
    const depois = hashPorSecao(e);
    for (const k of Object.keys(antes) as (keyof typeof antes)[]) {
      if (k === 'combate') expect(depois[k], k).not.toBe(antes[k]);
      else expect(depois[k], k).toBe(antes[k]);
    }
  });

  it('`efeitos` termina em BYTES_DO_LAYOUT_5 e `combate` cobre o resto', () => {
    const e = criarEstado(1, D);
    const antes = hashPorSecao(e);
    e.efeitos.arma[63] = 1; // último byte do v5
    expect(hashPorSecao(e).efeitos).not.toBe(antes.efeitos);
    expect(hashPorSecao(e).combate).toBe(antes.combate);
    e.efeitos.arma[63] = 0;
    e.bytes[BYTES_ESTADO - 1] = 1; // último byte do v6
    expect(hashPorSecao(e).combate).not.toBe(antes.combate);
    expect(hashPorSecao(e).efeitos).toBe(antes.efeitos);
  });

  it('caSeq e caEspera nascem 0; a stamina nasce na capacidade e o resto do registro novo em zero', () => {
    const e = criarEstado(1, D);
    expect([...e.build.caSeq, ...e.build.caEspera]).toEqual(Array(10).fill(0));
    expect(e.jogador3[JOGADOR3.stamina]).toBe(100);
    expect([e.jogador3[JOGADOR3.esquivaDirX], e.jogador3[JOGADOR3.esquivaDirY]]).toEqual([0, 0]);
    expect(e.jogador3U8.subarray(0, 9)).toEqual(new Uint8Array(9));
    expect([...e.jogador3U16]).toEqual([0, 0, 0, 0]);
  });
});

describe('constantes novas (ET2)', () => {
  it('tabela literal dos bits e códigos', () => {
    expect(TUTORIAL).toEqual({ mover: 1, esquiva: 2, aparo: 4 });
    expect(TODOS_OS_TUTORIAIS).toBe(7);
    expect(CENARIO).toEqual({ jogadorInvulneravel: 1, diretorDesligado: 2, semCinzas: 4, ataques: 8 });
    expect(ACAO).toEqual({ esquiva: 1, aparo: 2, frasco: 4 });
    expect(TIPO_DE_PROJETIL).toEqual({ vazio: 0, faca: 1, sal: 2 });
    expect(PROMPT).toEqual({ aguardando: 0, visivel: 1, cumprido: 2 });
    expect(ORIGEM_DO_DANO).toEqual({ contato: 1, golpe: 2, projetil: 3 });
  });

  it('os ataques ficam desligados por padrão: criarEstado, as 7 receitas antigas e SEM_HORDA; a produção e as 3 receitas novas os ligam', () => {
    const bit = (p: { cenario?: number }): number => criarEstado(1, D, p).cab[CAB.cenario]! & CENARIO.ataques;
    expect(bit({})).toBe(0);
    for (const id of ['horda', 'horda_rotativa', 'tres_armas', 'bau_uniao', 'sem_horda', 'nivel_tres', 'vigilia_sem_cinzas']) {
      expect(parametrosDoCenario(id).cenario & CENARIO.ataques, id).toBe(0);
    }
    expect(bit(PRODUCAO)).toBe(CENARIO.ataques);
    for (const id of ['oco_grande_sozinho', 'novica_sozinha', 'horda_com_ataques']) {
      expect(parametrosDoCenario(id).cenario & CENARIO.ataques, id).toBe(CENARIO.ataques);
    }
  });

  it('as receitas antigas não emitem `inimigos` nem `staminaInicial` (toEqual não ignora [])', () => {
    for (const id of ['horda', 'horda_rotativa', 'tres_armas', 'bau_uniao', 'sem_horda', 'nivel_tres', 'vigilia_sem_cinzas']) {
      const p = parametrosDoCenario(id);
      expect('inimigos' in p, id).toBe(false);
      expect('staminaInicial' in p, id).toBe(false);
    }
  });
});

describe('stamina e prompts ao nascer (ET1, ET2)', () => {
  it('a stamina nasce na capacidade de vigilantes.json, ou na do cenário; fora de 0 a 100 é erro', () => {
    expect(criarEstado(1, D).jogador3[JOGADOR3.stamina]).toBe(D.combate.staminaMax);
    expect(criarEstado(1, D, { staminaInicial: 60 }).jogador3[JOGADOR3.stamina]).toBe(60);
    expect(criarEstado(1, D, { staminaInicial: 0 }).jogador3[JOGADOR3.stamina]).toBe(0);
    expect(() => criarEstado(1, D, { staminaInicial: 100.5 })).toThrow(/stamina/);
    expect(() => criarEstado(1, D, { staminaInicial: -1 })).toThrow(/stamina/);
    expect(() => criarEstado(1, D, { staminaInicial: Number.NaN })).toThrow(/stamina/);
  });

  it('cada prompt nasce cumprido se o bit está em tutoriaisVistos; ?tutorial=0 marca os três', () => {
    const prompts = (v: number): number[] => {
      const e = criarEstado(1, D, { tutoriaisVistos: v });
      return [e.jogadorU8[0]!, e.jogador3U8[JOGADOR3_U8.promptEsquiva]!, e.jogador3U8[JOGADOR3_U8.promptAparo]!];
    };
    const [a, c] = [PROMPT.aguardando, PROMPT.cumprido];
    expect(prompts(0)).toEqual([a, a, a]);
    expect(prompts(TUTORIAL.mover)).toEqual([c, a, a]);
    expect(prompts(TUTORIAL.esquiva)).toEqual([a, c, a]);
    expect(prompts(TUTORIAL.aparo)).toEqual([a, a, c]);
    expect(prompts(TODOS_OS_TUTORIAIS)).toEqual([c, c, c]);
    expect(criarEstado(1, D, { tutoriaisVistos: TODOS_OS_TUTORIAIS }).cab[CAB.tutoriaisVistos]).toBe(7);
  });
});

describe('inimigos postos pela receita (VT1)', () => {
  it('oco_grande_sozinho põe 1 Oco Grande a 160 px acima do jogador, e novica_sozinha 1 Noviça a 128 px', () => {
    for (const [id, tipo, dy] of [['oco_grande_sozinho', TIPO.oco_grande, 160], ['novica_sozinha', TIPO.novica_de_sal, 128]] as const) {
      const e = criarEstado(1, DADOS_SEM_OBSTACULOS, { ...parametrosDoCenario(id), teto: 300 });
      const vivos = e.pool.posicao.reduce((n, p) => n + (p >= 0 ? 1 : 0), 0);
      expect(vivos, id).toBe(1);
      const s = e.pool.posicao.findIndex((p) => p >= 0);
      expect(e.inimigos.tipo[s], id).toBe(tipo);
      expect(e.inimigos.x[s]).toBe(Math.fround(DADOS_SEM_OBSTACULOS.inicioX));
      expect(e.jogador[1]! - e.inimigos.y[s]!, id).toBeCloseTo(dy, 3);
      expect(e.inimigos.ataqueFase[s], id).toBe(0);
      expect(e.mundo[3], 'spawns do diretor').toBe(0);
    }
  });

  it('as receitas novas nascem com tutoriais vistos, sem diretor (salvo a horda) e com o jogador vulnerável nas duas sozinhas', () => {
    const g = parametrosDoCenario('oco_grande_sozinho');
    expect(g.tutoriaisVistos).toBe(7);
    expect(g.cenario & CENARIO.jogadorInvulneravel).toBe(0);
    expect(g.cenario & CENARIO.diretorDesligado).toBe(CENARIO.diretorDesligado);
    expect(g.armas).toHaveLength(1);
    expect(parametrosDoCenario('horda_com_ataques').cenario).toBe(parametrosDoCenario('horda').cenario | CENARIO.ataques);
  });
});

describe('tabela de combate (ET9)', () => {
  const c = D.combate;
  it('os números de combate.json em passos e px', () => {
    expect([c.custoEsquiva, c.custoAparo, c.regeneracaoPorPasso, c.esperaDoGasto, c.devolucaoDoAparo]).toEqual([25, 15, 0.5, 30, 30]);
    expect([c.esquivaDuracao, c.esquivaIframesDe, c.esquivaIframesAte, c.esquivaRecuperacao, c.esquivaDistancia]).toEqual([21, 2, 13, 3, 80]);
    expect(c.esquivaPorPasso).toBeCloseTo(80 / 21, 12);
    expect([c.aparoLimite, c.aparoLimiteEstendido, c.aparoFalho, c.congelamento]).toEqual([11, 17, 24, 5]);
    expect([c.poderPct, c.poderPassos, c.posturaPassos, c.posturaRaio, c.contraAtaquePassos]).toEqual([15, 120, 120, 64, 90]);
    expect(c.staminaMax).toBe(100);
    expect(combate.congelamento_passos).toBe(c.congelamento);
  });

  it('os ataques por tipo vêm de inimigos.json: telegrafo 36 e 30, recuperação 90, intervalo 180, arco 64 px, projétil 1,6 px/passo, 8 px, 150 passos, Sal 50% por 180', () => {
    const t = TIPO;
    expect([c.telegrafoPassos[t.oco_grande], c.telegrafoPassos[t.novica_de_sal], c.telegrafoPassos[t.oco_das_lanternas]]).toEqual([36, 30, 0]);
    expect([c.recuperacaoPassos[t.oco_grande], c.intervaloPassos[t.novica_de_sal]]).toEqual([90, 180]);
    expect([c.alcanceDoArco[t.oco_grande], c.danoDoAtaque[t.oco_grande], c.danoDoAtaque[t.novica_de_sal]]).toEqual([64, 20, 18]);
    expect(c.projetilPorPasso[t.novica_de_sal]).toBeCloseTo(1.6, 12);
    expect([c.projetilRaio[t.novica_de_sal], c.projetilVida[t.novica_de_sal], c.salPct[t.novica_de_sal], c.salPassos[t.novica_de_sal]]).toEqual([8, 150, 50, 180]);
    expect([c.ataqueAparavel[t.oco_grande], c.ataqueAparavel[t.novica_de_sal], c.ataqueAparavel[t.oco_das_lanternas]]).toEqual([1, 1, 0]);
    // O Coroado (números pendentes da F-008) fica sem ataque compilado e imune.
    expect([c.telegrafoPassos[t.oco_grande_coroado], c.posturaQuebrada[t.oco_grande_coroado]]).toEqual([0, 0]);
    expect([c.posturaQuebrada[t.oco_das_lanternas], c.posturaQuebrada[t.oco_grande], c.posturaQuebrada[t.novica_de_sal]]).toEqual([1, 1, 1]);
  });
});

describe('inimigo inicial e nascerInimigo gravam os mesmos bytes', () => {
  it('o inimigo da receita é idêntico ao nascido por nascerInimigo, no mesmo ponto', async () => {
    const { nascerInimigo } = await import('../../../src/logica/mundo/inimigos');
    const a = criarEstado(1, DADOS_SEM_OBSTACULOS, { ...parametrosDoCenario('oco_grande_sozinho'), teto: 300 });
    const b = criarEstado(1, DADOS_SEM_OBSTACULOS, { ...parametrosDoCenario('oco_grande_sozinho'), inimigos: [], teto: 300 });
    nascerInimigo(b, DADOS_SEM_OBSTACULOS, TIPO.oco_grande, Math.fround(DADOS_SEM_OBSTACULOS.inicioX), Math.fround(DADOS_SEM_OBSTACULOS.inicioY - 160), false);
    expect(a.bytes).toEqual(b.bytes);
  });
});
