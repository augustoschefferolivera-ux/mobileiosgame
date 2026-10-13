// Save meta mínimo (design/decisoes-F-007.md SV1 a SV9, MC3, MC8, PE6, RS8): leitura sem lançar, soma em duas metades,
// versões, crédito do fim da Vigília e o armazenamento com queda para a memória.
import { describe, expect, it } from 'vitest';
import { ArmazenamentoDoMeta, CHAVE_DO_META } from '../../../src/plataforma/armazenamento';
import { CAUSA_DO_FIM, LIMITE_DE_ALMAS } from '../../../src/logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { aplicarFimDeVigilia, comOpcoes, comTutoriais, lerMeta, metaPadrao, serializarMeta, somaDoTexto, type Meta } from '../../../src/logica/save/meta';
import { fnv1aBytes, FNV_BASE, hex8 } from '../../../src/logica/nucleo/hash';

const resultado = (parcial: Partial<ResultadoDaVigilia>): ResultadoDaVigilia => ({
  causa: CAUSA_DO_FIM.apagar,
  segundos: 100,
  nivel: 3,
  mortes: 10,
  danoRecebido: 50,
  aparos: 1,
  almas: 100,
  almasAoSantuario: 70,
  mancha: { x: 100, y: 200, hora: 2, rotulo: null, almas: 30 },
  recuperouMancha: false,
  brasas: 0,
  chefeFase: 0,
  chefeDerrotado: false,
  chefeQuebras: 0,
  ...parcial,
});

describe('soma (SV9)', () => {
  it('o FNV-1a em duas metades de 16 bits dá o mesmo que o FNV-1a de 32 bits em ASCII, e 0xFFFFFFFF vai e volta como "ffffffff"', () => {
    for (const texto of ['', 'a', 'vdc.meta', '{"versao":1,"seq":3}']) {
      const bytes = new Uint8Array(texto.length * 2);
      for (let i = 0; i < texto.length; i++) {
        bytes[2 * i] = texto.charCodeAt(i) & 0xff;
        bytes[2 * i + 1] = texto.charCodeAt(i) >>> 8;
      }
      expect(somaDoTexto(texto), texto).toBe(hex8(fnv1aBytes(FNV_BASE, bytes)));
    }
    expect(somaDoTexto('')).toBe('811c9dc5');
    // Um meta cuja soma real tem os bits altos ligados continua string de 8 caracteres.
    const algum = [...Array(200).keys()].map((k) => somaDoTexto(`k${k}`));
    expect(algum.every((s) => /^[0-9a-f]{8}$/.test(s))).toBe(true);
    expect(algum.some((s) => s >= 'c0000000')).toBe(true);
  });
});

describe('ler e gravar (SV1, SV9)', () => {
  it('ida e volta; a soma é string de 8 caracteres hex', () => {
    const m = { ...metaPadrao(), almas: 1234, mancha: { x: 10.5, y: 20, hora: 3, rotulo: null, almas: 9 }, tutoriais: 5, seq: 7 } as Meta;
    const texto = serializarMeta(m);
    expect(JSON.parse(texto).soma).toMatch(/^[0-9a-f]{8}$/);
    const lido = lerMeta(texto);
    expect(lido).toMatchObject({ almas: 1234, tutoriais: 5, seq: 7, mancha: { x: 10.5, y: 20, hora: 3, almas: 9 } });
    expect(serializarMeta(lido)).toBe(texto);
  });

  it('texto ausente, vazio, quebrado, soma errada, campo fora do tipo e versão desconhecida dão os padrões, sem lançar', () => {
    const bom = JSON.parse(serializarMeta({ ...metaPadrao(), almas: 5 }));
    const casos: (string | null)[] = [
      null,
      '',
      '{',
      '[]',
      'null',
      JSON.stringify({ ...bom, soma: '00000000' }),
      JSON.stringify({ ...bom, soma: 12345 }),
      JSON.stringify({ ...bom, almas: -1 }),
      JSON.stringify({ ...bom, almas: LIMITE_DE_ALMAS }),
      JSON.stringify({ ...bom, almas: 1.5 }),
      JSON.stringify({ ...bom, versao: 3 }),
      JSON.stringify({ ...bom, versao: 0 }),
      JSON.stringify({ almas: 5 }),
      JSON.stringify({ ...bom, mancha: { x: -1, y: 0, hora: 1, rotulo: null, almas: 3 } }),
      JSON.stringify({ ...bom, mancha: { x: 1, y: 1, hora: 6, rotulo: null, almas: 3 } }),
      JSON.stringify({ ...bom, opcoes: { som: 1, flashes: true, numerosDeDano: true } }),
    ];
    for (const c of casos) expect(lerMeta(c), String(c)).toEqual(metaPadrao());
    expect(lerMeta(JSON.stringify(bom)).almas).toBe(5);
  });

  it('a mancha com a soma CERTA mas campo fora da faixa é recusada: Hora 0, 6 a 9 e 1,5; x fora do mapa; Almas 0; rótulo; Hora 1 a 5 passam (crítico M67)', () => {
    const boa = { x: 10, y: 20, hora: 1, rotulo: null, almas: 3 };
    const comMancha = (mancha: unknown): Meta => lerMeta(serializarMeta({ ...metaPadrao(), almas: 7, mancha } as Meta));
    for (const hora of [1, 2, 3, 4, 5]) expect(comMancha({ ...boa, hora }).mancha?.hora, `Hora ${hora}`).toBe(hora);
    for (const ruim of [{ hora: 0 }, { hora: 6 }, { hora: 9 }, { hora: 1.5 }, { x: -1 }, { y: -1 }, { almas: 0 }, { almas: LIMITE_DE_ALMAS }, { rotulo: 'x' }]) {
      expect(comMancha({ ...boa, ...ruim }), JSON.stringify(ruim)).toEqual(metaPadrao());
    }
  });

  it('seq é monotônico: fim de Vigília, opção e tutorial novo o crescem; tutorial repetido não', () => {
    let m = metaPadrao();
    const seqs: number[] = [];
    m = aplicarFimDeVigilia(m, resultado({}));
    seqs.push(m.seq);
    m = comOpcoes(m, { som: false, flashes: true, numerosDeDano: true });
    seqs.push(m.seq);
    m = comTutoriais(m, 3);
    seqs.push(m.seq);
    m = comTutoriais(m, 1);
    seqs.push(m.seq);
    expect(seqs).toEqual([1, 2, 3, 3]);
    expect(m.opcoes.som).toBe(false);
    expect(m.tutoriais).toBe(3);
  });
});

describe('aplicarFimDeVigilia (SV1, SV7, MC3, MC8, PE6, RS8)', () => {
  const antiga = { x: 5, y: 6, hora: 1, rotulo: null, almas: 40 } as const;
  const comAntiga: Meta = { ...metaPadrao(), almas: 10, mancha: antiga };

  it('Apagar: soma ao Santuário, a mancha nova substitui a antiga (recuperada ou não) e liga o primeiro Apagar', () => {
    const m = aplicarFimDeVigilia(comAntiga, resultado({}));
    expect([m.almas, m.mancha?.almas, m.primeiroApagarFeito, m.vigiliasConcluidas]).toEqual([80, 30, true, 1]);
    const r = aplicarFimDeVigilia(comAntiga, resultado({ recuperouMancha: true, almas: 140, almasAoSantuario: 98, mancha: { x: 1, y: 2, hora: 4, rotulo: null, almas: 42 } }));
    expect(r.mancha?.almas).toBe(42);
  });

  it('Apagar com 0 ou 1 Alma apaga a antiga (nova = null)', () => {
    const m = aplicarFimDeVigilia(comAntiga, resultado({ almas: 1, almasAoSantuario: 1, mancha: null }));
    expect([m.mancha, m.almas]).toEqual([null, 11]);
  });

  it('Abandonar: mantém a antiga se não recuperou, consome se recuperou; não liga o primeiro Apagar', () => {
    const ab = resultado({ causa: CAUSA_DO_FIM.abandonar, almas: 100, almasAoSantuario: 50, mancha: null });
    const manteve = aplicarFimDeVigilia(comAntiga, ab);
    expect([manteve.mancha, manteve.almas, manteve.primeiroApagarFeito]).toEqual([antiga, 60, false]);
    const consumiu = aplicarFimDeVigilia(comAntiga, { ...ab, recuperouMancha: true });
    expect(consumiu.mancha).toBeNull();
  });

  it('Amanhecer: ganho normal; a antiga segue, ou é consumida se recuperada (MC8)', () => {
    const am = resultado({ causa: CAUSA_DO_FIM.amanhecer, almasAoSantuario: 100, mancha: null });
    expect(aplicarFimDeVigilia(comAntiga, am).mancha).toEqual(antiga);
    expect(aplicarFimDeVigilia(comAntiga, { ...am, recuperouMancha: true }).mancha).toBeNull();
  });

  it('o saldo do Santuário para em 2^30 − 1', () => {
    const m = aplicarFimDeVigilia({ ...metaPadrao(), almas: LIMITE_DE_ALMAS - 5 }, resultado({ almasAoSantuario: 1000 }));
    expect(m.almas).toBe(LIMITE_DE_ALMAS - 1);
  });
});

describe('meta v2: brasas (F-009 AN3, FM3, F-009.15)', () => {
  /** O texto que a versão 1 gravava (sem `brasas`), com a soma dela. */
  const textoV1 = (): string => {
    const corpo = { versao: 1, seq: 7, almas: 123, mancha: null, tutoriais: 3, primeiroApagarFeito: true, opcoes: { som: false, flashes: true, numerosDeDano: true }, vigiliasConcluidas: 4, proximaIdVigilia: 5, ultimaEncerrada: 4 };
    return JSON.stringify({ ...corpo, soma: somaDoTexto(JSON.stringify(corpo)) });
  };

  it('o meta da versão 1 migra para a 2 com brasas 0 e o resto intacto; a gravação seguinte já é a versão 2', () => {
    const m = lerMeta(textoV1());
    expect([m.versao, m.brasas, m.seq, m.almas, m.tutoriais, m.primeiroApagarFeito, m.vigiliasConcluidas, m.opcoes.som]).toEqual([2, 0, 7, 123, 3, true, 4, false]);
    expect(lerMeta(serializarMeta(m))).toEqual({ ...m, soma: lerMeta(serializarMeta(m)).soma });
    expect(JSON.parse(serializarMeta(m)).versao).toBe(2);
  });

  it('o v1 com a soma errada ou um campo fora do tipo cai nos padrões, como antes', () => {
    expect(lerMeta(textoV1().replace('"seq":7', '"seq":8'))).toEqual(metaPadrao());
    expect(lerMeta(textoV1().replace('"soma":"', '"soma":"0'))).toEqual(metaPadrao());
  });

  it('o v2 confere a soma com o campo brasas (alterá-lo à mão derruba o meta) e exige brasas inteiro', () => {
    const m = aplicarFimDeVigilia(metaPadrao(), resultado({ causa: CAUSA_DO_FIM.amanhecer, mancha: null, brasas: 1 }));
    const texto = serializarMeta(m);
    expect(lerMeta(texto).brasas).toBe(1);
    expect(lerMeta(texto.replace('"brasas":1', '"brasas":9'))).toEqual(metaPadrao());
    expect(lerMeta(texto.replace('"brasas":1', '"brasas":-1'))).toEqual(metaPadrao());
  });

  it('o Amanhecer soma 1 Brasa por Vigília (0 e depois 1 e 2); as outras causas não somam; a mancha antiga fica', () => {
    const antiga = { x: 5, y: 6, hora: 1, rotulo: null, almas: 40 } as const;
    let m: Meta = { ...metaPadrao(), mancha: antiga };
    m = aplicarFimDeVigilia(m, resultado({ causa: CAUSA_DO_FIM.amanhecer, almas: 1200, almasAoSantuario: 1800, mancha: null, brasas: 1 }));
    expect([m.brasas, m.almas, m.mancha]).toEqual([1, 1800, antiga]);
    m = aplicarFimDeVigilia(m, resultado({ causa: CAUSA_DO_FIM.abandonar, mancha: null, brasas: 0 }));
    expect(m.brasas).toBe(1);
    m = aplicarFimDeVigilia(m, resultado({ causa: CAUSA_DO_FIM.amanhecer, mancha: null, brasas: 1 }));
    expect(m.brasas).toBe(2);
  });

  it('A Fome liga o primeiro Apagar (FM3) e cria a mancha; o Abandonar e o Amanhecer não ligam', () => {
    const fome = aplicarFimDeVigilia(metaPadrao(), resultado({ causa: CAUSA_DO_FIM.aFome }));
    expect([fome.primeiroApagarFeito, fome.mancha?.almas]).toEqual([true, 30]);
    const amanhecer = aplicarFimDeVigilia(metaPadrao(), resultado({ causa: CAUSA_DO_FIM.amanhecer, mancha: null, brasas: 1 }));
    expect(amanhecer.primeiroApagarFeito).toBe(false);
  });
});

describe('armazenamento (SV2)', () => {
  function falso(): { getItem(k: string): string | null; setItem(k: string, v: string): void; dados: Map<string, string> } {
    const dados = new Map<string, string>();
    return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
  }

  it('grava em vdc.meta e lê de volta', () => {
    const f = falso();
    const a = new ArmazenamentoDoMeta(f);
    a.gravar({ ...metaPadrao(), almas: 77 });
    expect(f.dados.has(CHAVE_DO_META)).toBe(true);
    expect(new ArmazenamentoDoMeta(f).ler().almas).toBe(77);
  });

  it('localStorage que lança na leitura e na escrita (modo privado, cota): o boot não cai e a memória segura o meta', () => {
    const quebrado = {
      getItem: (): string | null => {
        throw new Error('bloqueado');
      },
      setItem: (): void => {
        throw new Error('cota');
      },
    };
    const a = new ArmazenamentoDoMeta(quebrado);
    expect(a.ler()).toEqual(metaPadrao());
    expect(() => a.gravar({ ...metaPadrao(), almas: 9 })).not.toThrow();
    expect(a.ler().almas).toBe(9);
    expect(new ArmazenamentoDoMeta(null).ler()).toEqual(metaPadrao());
  });

  it('meta corrompido no localStorage vale os padrões', () => {
    const f = falso();
    f.dados.set(CHAVE_DO_META, '{"versao":1,"soma":"zzzz"');
    expect(new ArmazenamentoDoMeta(f).ler()).toEqual(metaPadrao());
  });
});
