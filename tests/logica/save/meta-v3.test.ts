// F-010.9 e GA1 (design/decisoes-F-010.md MT1, MT2, ST1, GA1): o meta v3 (Fundação, marcos, convite), as migrações 1 → 2 → 3
// e 2 → 3 com um meta gravado pelo código antigo como entrada, `vdc.meta.anterior`, as recusas (soma, NaN, `gasto` incoerente,
// versão futura) e a garantia das 300 Almas no 1º Apagar ou A Fome.
import { describe, expect, it } from 'vitest';
import { CAUSA_DO_FIM } from '../../../src/logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import {
  ALMAS_GARANTIDAS, MARCO, VERSAO_DO_META, aplicarFimDeVigilia, examinarMeta, lerMeta, metaPadrao, serializarMeta, somaDoTexto, type Meta,
} from '../../../src/logica/save/meta';
import { MIGRACOES_DO_META, migrarMeta } from '../../../src/logica/save/migracoes';
import { ArmazenamentoDoMeta, CHAVE_DO_META, CHAVE_DO_META_ANTERIOR } from '../../../src/plataforma/armazenamento';

const resultado = (parcial: Partial<ResultadoDaVigilia>): ResultadoDaVigilia => ({
  causa: CAUSA_DO_FIM.apagar, segundos: 100, nivel: 3, mortes: 10, danoRecebido: 50, aparos: 1, almas: 100, almasAoSantuario: 70,
  mancha: null, recuperouMancha: false, brasas: 0, chefeFase: 0, chefeDerrotado: false, chefeQuebras: 0, ...parcial,
});

/** O que o código da F-008 gravava (versão 1, sem `brasas`), com a soma da versão. */
const corpoV1 = { versao: 1, seq: 7, almas: 123, mancha: null, tutoriais: 3, primeiroApagarFeito: true, opcoes: { som: false, flashes: true, numerosDeDano: true }, vigiliasConcluidas: 4, proximaIdVigilia: 5, ultimaEncerrada: 4 };
const textoV1 = (): string => JSON.stringify({ ...corpoV1, soma: somaDoTexto(JSON.stringify(corpoV1)) });
/** O que o código da F-009 gravava (versão 2: `brasas` depois de `almas`). */
const corpoV2 = { versao: 2, seq: 9, almas: 450, brasas: 3, mancha: null, tutoriais: 7, primeiroApagarFeito: true, opcoes: { som: true, flashes: true, numerosDeDano: false }, vigiliasConcluidas: 6, proximaIdVigilia: 8, ultimaEncerrada: 7 };
const textoV2 = (): string => JSON.stringify({ ...corpoV2, soma: somaDoTexto(JSON.stringify(corpoV2)) });

const v3 = (parcial: Partial<Meta>): Meta => ({ ...metaPadrao(), ...parcial });
const comRanks = (ranks: number[], gasto: number): Meta => v3({ fundacao: { ranks, gasto } });

describe('meta v3 (MT1)', () => {
  it('a versão é a 3, o padrão traz a Fundação zerada, marcos 0 e convite sem recusa', () => {
    expect(VERSAO_DO_META).toBe(3);
    expect(metaPadrao()).toMatchObject({ versao: 3, fundacao: { ranks: [0, 0, 0, 0, 0, 0, 0, 0], gasto: 0 }, marcos: 0, conviteRecusadoEm: null });
  });

  it('ida e volta com Fundação, marcos e convite; versão, seq e soma de 8 caracteres hex', () => {
    const m = v3({ seq: 12, almas: 700, fundacao: { ranks: [0, 2, 3, 0, 1, 0, 0, 0], gasto: 1500 }, marcos: MARCO.balaoCinzas | MARCO.iselda, conviteRecusadoEm: 4 });
    const texto = serializarMeta(m);
    const o = JSON.parse(texto);
    expect([o.versao, o.seq]).toEqual([3, 12]);
    expect(o.soma).toMatch(/^[0-9a-f]{8}$/);
    const lido = lerMeta(texto);
    expect(lido).toMatchObject({ versao: 3, seq: 12, fundacao: { ranks: [0, 2, 3, 0, 1, 0, 0, 0], gasto: 1500 }, marcos: 3, conviteRecusadoEm: 4 });
    expect(serializarMeta(lido)).toBe(texto);
  });

  it('a soma cobre a Fundação, os marcos e o convite (alterar à mão derruba o meta)', () => {
    const texto = serializarMeta(comRanks([0, 1, 0, 0, 0, 0, 0, 0], 300));
    expect(lerMeta(texto).fundacao.ranks[1]).toBe(1);
    expect(lerMeta(texto.replace('"gasto":300', '"gasto":1'))).toEqual(metaPadrao());
    expect(lerMeta(texto.replace('"marcos":0', '"marcos":1'))).toEqual(metaPadrao());
    expect(lerMeta(texto.replace('"conviteRecusadoEm":null', '"conviteRecusadoEm":2'))).toEqual(metaPadrao());
  });
});

describe('validação da Fundação (F-010.9, F-010.7)', () => {
  /** Um meta com o campo quebrado e a soma CERTA: só a validação de campo o recusa. */
  const comSomaCerta = (m: unknown): string => {
    const o = { ...(m as Record<string, unknown>) };
    delete o.soma;
    return JSON.stringify({ ...o, soma: somaDoTexto(JSON.stringify(o)) });
  };
  const corpo = (parcial: Partial<Meta>): Record<string, unknown> => JSON.parse(serializarMeta(v3(parcial)));

  it('ranks acima do máximo, negativos, fracionários, NaN e de tamanho errado caem nos padrões', () => {
    const casos: unknown[][] = [
      [0, 6, 0, 0, 0, 0, 0, 0], [0, 4, 4, 0, 0, 0, 0, 0].map((x, i) => (i === 4 ? 4 : x)), [0, -1, 0, 0, 0, 0, 0, 0],
      [0, 1.5, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, '1', 0, 0, 0, 0, 0, 0],
    ];
    for (const ranks of casos) {
      const c = { ...corpo({}), fundacao: { ranks, gasto: 5000 } };
      expect(lerMeta(comSomaCerta(c)), JSON.stringify(ranks)).toEqual(metaPadrao());
    }
    // NaN vira null no JSON.
    expect(lerMeta(comSomaCerta({ ...corpo({}), fundacao: { ranks: [0, Number.NaN, 0, 0, 0, 0, 0, 0], gasto: 300 } }))).toEqual(metaPadrao());
  });

  it('os 3 nós bloqueados só valem 0 (martelo, Pés plantados, Ferro frio) e invalidam o meta (F-010.7)', () => {
    for (const i of [0, 3, 6]) {
      const ranks = [0, 0, 0, 0, 0, 0, 0, 0];
      ranks[i] = 1;
      expect(lerMeta(comSomaCerta({ ...corpo({}), fundacao: { ranks, gasto: 300 } })), `nó ${i}`).toEqual(metaPadrao());
    }
  });

  it('`gasto` incoerente: ranks > 0 com `gasto` 0, negativo, fracionário ou fora de [0, 2^30)', () => {
    const ranks = [0, 1, 0, 0, 0, 0, 0, 0];
    for (const gasto of [0, -1, 300.5, 2 ** 30, 'x']) {
      expect(lerMeta(comSomaCerta({ ...corpo({}), fundacao: { ranks, gasto } })), String(gasto)).toEqual(metaPadrao());
    }
    // `gasto` > 0 sem rank é aceito (o reembolso zera ambos).
    expect(lerMeta(comSomaCerta({ ...corpo({}), fundacao: { ranks: [0, 0, 0, 0, 0, 0, 0, 0], gasto: 10 } })).fundacao.gasto).toBe(10);
  });

  it('marcos fora de 0 a 3 e convite negativo ou fracionário caem nos padrões', () => {
    for (const parcial of [{ marcos: 4 }, { marcos: -1 }, { marcos: 1.5 }, { conviteRecusadoEm: -1 }, { conviteRecusadoEm: 1.5 }]) {
      expect(lerMeta(comSomaCerta({ ...corpo({}), ...parcial })), JSON.stringify(parcial)).toEqual(metaPadrao());
    }
  });

  it('a versão maior que a do código e a versão 0 dão os padrões, sem lançar', () => {
    const futuro = { ...corpo({ almas: 99 }), versao: 4 };
    expect(lerMeta(comSomaCerta(futuro))).toEqual(metaPadrao());
    expect(examinarMeta(comSomaCerta(futuro)).valido).toBe(false);
    expect(lerMeta(comSomaCerta({ ...corpo({}), versao: 0 }))).toEqual(metaPadrao());
  });
});

describe('migrações do meta (MT2)', () => {
  it('v1 → v2 → v3: o meta gravado pela F-008 migra com brasas 0, Fundação zerada, marcos 0 e convite null; o resto intacto', () => {
    const r = examinarMeta(textoV1());
    expect(r).toMatchObject({ valido: true, versaoLida: 1 });
    expect(r.meta).toMatchObject({ versao: 3, seq: 7, almas: 123, brasas: 0, tutoriais: 3, primeiroApagarFeito: true, vigiliasConcluidas: 4, proximaIdVigilia: 5, ultimaEncerrada: 4, marcos: 0, conviteRecusadoEm: null });
    expect(r.meta.opcoes.som).toBe(false);
    expect(r.meta.fundacao).toEqual({ ranks: [0, 0, 0, 0, 0, 0, 0, 0], gasto: 0 });
    expect(JSON.parse(serializarMeta(r.meta)).versao).toBe(3);
  });

  it('v2 → v3: o meta gravado pela F-009 mantém as Brasas e o saldo, e ganha a Fundação zerada', () => {
    const r = examinarMeta(textoV2());
    expect(r).toMatchObject({ valido: true, versaoLida: 2 });
    expect(r.meta).toMatchObject({ versao: 3, seq: 9, almas: 450, brasas: 3, tutoriais: 7, vigiliasConcluidas: 6, marcos: 0, conviteRecusadoEm: null });
    expect(r.meta.opcoes.numerosDeDano).toBe(false);
    expect(r.meta.fundacao.gasto).toBe(0);
  });

  it('as funções da cadeia: cada elo sobe uma versão e a cadeia compõe', () => {
    const base = metaPadrao();
    expect(MIGRACOES_DO_META.length).toBe(2);
    expect(MIGRACOES_DO_META[0]!({ ...base, versao: 1 }).versao).toBe(2);
    expect(MIGRACOES_DO_META[1]!({ ...base, versao: 2 }).versao).toBe(3);
    expect(migrarMeta({ ...base, versao: 1 }, 1, 3).versao).toBe(3);
    expect(migrarMeta(base, 3, 3)).toBe(base);
  });

  it('v1 e v2 com soma errada ou campo fora do tipo caem nos padrões', () => {
    expect(lerMeta(textoV1().replace('"seq":7', '"seq":8'))).toEqual(metaPadrao());
    expect(lerMeta(textoV2().replace('"brasas":3', '"brasas":4'))).toEqual(metaPadrao());
    expect(lerMeta(textoV2().replace('"brasas":3', '"brasas":"3"'))).toEqual(metaPadrao());
  });
});

describe('vdc.meta.anterior (MT2, ST1)', () => {
  function falso(): { getItem(k: string): string | null; setItem(k: string, v: string): void; dados: Map<string, string> } {
    const dados = new Map<string, string>();
    return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
  }

  it('o 1º meta migrado guarda o texto antigo em vdc.meta.anterior antes de gravar a versão nova; só uma geração', () => {
    const f = falso();
    f.dados.set(CHAVE_DO_META, textoV2());
    const a = new ArmazenamentoDoMeta(f);
    const m = a.ler();
    expect(m.versao).toBe(3);
    expect(f.dados.has(CHAVE_DO_META_ANTERIOR)).toBe(false); // ler não grava
    expect(a.gravar(m)).toBe(true);
    expect(f.dados.get(CHAVE_DO_META_ANTERIOR)).toBe(textoV2());
    expect(JSON.parse(f.dados.get(CHAVE_DO_META)!).versao).toBe(3);
    // A 2ª gravação já é da versão atual: o anterior não é tocado.
    a.gravar({ ...m, almas: 1 });
    expect(f.dados.get(CHAVE_DO_META_ANTERIOR)).toBe(textoV2());
    // Outro boot, com o meta já na 3, não arquiva nada de novo.
    const b = new ArmazenamentoDoMeta(f);
    b.gravar(b.ler());
    expect(f.dados.get(CHAVE_DO_META_ANTERIOR)).toBe(textoV2());
  });

  it('um vdc.meta que não vale volta para o anterior; sem anterior válido, para os padrões', () => {
    const f = falso();
    f.dados.set(CHAVE_DO_META_ANTERIOR, textoV2());
    f.dados.set(CHAVE_DO_META, '{"versao":3,"soma":"zzzz"');
    expect(new ArmazenamentoDoMeta(f).ler()).toMatchObject({ versao: 3, almas: 450, brasas: 3 });
    f.dados.set(CHAVE_DO_META_ANTERIOR, 'lixo');
    expect(new ArmazenamentoDoMeta(f).ler()).toEqual(metaPadrao());
  });

  it('falha de setItem mantém o meta na memória da sessão (a cópia do anterior também não derruba)', () => {
    const dados = new Map<string, string>([[CHAVE_DO_META, textoV1()]]);
    const quebrado = { getItem: (k: string) => dados.get(k) ?? null, setItem: (): void => { throw new Error('cota'); } };
    const a = new ArmazenamentoDoMeta(quebrado);
    const m = a.ler();
    expect(a.gravar({ ...m, almas: 321 })).toBe(false);
    expect(a.ler().almas).toBe(321);
    expect(dados.get(CHAVE_DO_META)).toBe(textoV1());
  });
});

describe('300 Almas garantidas (GA1)', () => {
  const credito = (m: Meta, r: Partial<ResultadoDaVigilia>): Meta => aplicarFimDeVigilia(m, resultado(r));

  it('o 1º Apagar com saldo baixo completa até 300; com o saldo acima não muda', () => {
    expect(ALMAS_GARANTIDAS).toBe(300);
    const m = credito(v3({ almas: 10 }), {});
    expect([m.almas, m.primeiroApagarFeito]).toEqual([300, true]);
    expect(credito(v3({ almas: 500 }), { almasAoSantuario: 70 }).almas).toBe(570);
    expect(credito(v3({ almas: 0 }), { almasAoSantuario: 400 }).almas).toBe(400);
  });

  it('A Fome conta como Apagar; Amanhecer e Abandonar não garantem nada', () => {
    expect(credito(v3({ almas: 0 }), { causa: CAUSA_DO_FIM.aFome, almasAoSantuario: 20 }).almas).toBe(300);
    const am = credito(v3({ almas: 0 }), { causa: CAUSA_DO_FIM.amanhecer, almasAoSantuario: 20, brasas: 1 });
    expect([am.almas, am.primeiroApagarFeito]).toEqual([20, false]);
    const ab = credito(v3({ almas: 0 }), { causa: CAUSA_DO_FIM.abandonar, almasAoSantuario: 20 });
    expect([ab.almas, ab.primeiroApagarFeito]).toEqual([20, false]);
  });

  it('só na 1ª vez: um segundo Apagar soma o líquido e nada mais', () => {
    const primeiro = credito(v3({ almas: 0 }), { almasAoSantuario: 20 });
    expect(primeiro.almas).toBe(300);
    const gasto = { ...primeiro, almas: 5 };
    expect(credito(gasto, { almasAoSantuario: 20 }).almas).toBe(25);
  });
});
