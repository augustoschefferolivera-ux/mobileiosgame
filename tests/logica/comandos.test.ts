// ComandosDoPasso e fontes de comandos (ADR-0002 §12; design/decisoes-F-002.md
// §4 e §6): ao vivo, a mesma intenção em todos os passos do frame; em teste e
// replay, um roteiro por passo absoluto, em Float32.
import { describe, expect, it } from 'vitest';
import {
  ACAO,
  copiarComandos,
  criarComandos,
  fonteConstante,
  fonteDoRoteiro,
  validarAcoes,
  validarRoteiro,
  type AcaoDeRoteiro,
  type Roteiro,
} from '../../src/logica/nucleo/comandos';
import { ROTEIRO_REFERENCIA } from '../../src/logica/nucleo/referencia';

const ler = (r: Roteiro, passo: number): [number, number] => {
  const c = criarComandos();
  fonteDoRoteiro(r).comandosDoPasso(passo, c);
  return [c.movimento[0]!, c.movimento[1]!];
};

describe('fonteDoRoteiro', () => {
  const r: Roteiro = [
    { passo: 3, mx: 1, my: 0 },
    { passo: 10, mx: 0, my: -0.5 },
    { passo: 11, mx: 0.1, my: 0.2 },
  ];

  it('vale o último trecho com passo ≤ o pedido; antes do 1º, parado', () => {
    expect(ler(r, 0)).toEqual([0, 0]);
    expect(ler(r, 2)).toEqual([0, 0]);
    expect(ler(r, 3)).toEqual([1, 0]);
    expect(ler(r, 9)).toEqual([1, 0]);
    expect(ler(r, 10)).toEqual([0, -0.5]);
    expect(ler(r, 5000)).toEqual([Math.fround(0.1), Math.fround(0.2)]);
  });

  it('serve qualquer ordem de consulta (o resultado só depende do passo)', () => {
    const f = fonteDoRoteiro(r);
    const c = criarComandos();
    const vistos = [11, 0, 10, 3, 2, 11].map((p) => {
      f.comandosDoPasso(p, c);
      return c.movimento[1];
    });
    expect(vistos).toEqual([Math.fround(0.2), 0, -0.5, 0, 0, Math.fround(0.2)]);
  });

  it('roteiro vazio é parado', () => {
    expect(ler([], 42)).toEqual([0, 0]);
  });

  it.each([
    ['passo repetido', [{ passo: 1, mx: 0, my: 0 }, { passo: 1, mx: 1, my: 0 }]],
    ['passo decrescente', [{ passo: 5, mx: 0, my: 0 }, { passo: 4, mx: 1, my: 0 }]],
    ['passo negativo', [{ passo: -1, mx: 0, my: 0 }]],
    ['passo fracionário', [{ passo: 1.5, mx: 0, my: 0 }]],
    ['|v| > 1', [{ passo: 0, mx: 0.8, my: 0.8 }]],
    ['NaN', [{ passo: 0, mx: Number.NaN, my: 0 }]],
  ])('%s é erro', (_nome, roteiro) => {
    expect(() => validarRoteiro(roteiro)).toThrow();
    expect(() => fonteDoRoteiro(roteiro)).toThrow();
  });

  it('o roteiro de referência é válido e a diagonal literal cabe em |v| ≤ 1', () => {
    expect(() => validarRoteiro(ROTEIRO_REFERENCIA)).not.toThrow();
    const r2 = Math.fround(0.7071067811865476);
    expect(r2 * r2 * 2).toBeLessThanOrEqual(1 + 1e-6);
  });
});

describe('fonteConstante', () => {
  it('copia a intenção do frame em todos os passos', () => {
    const doFrame = criarComandos();
    doFrame.movimento[0] = 0.25;
    const f = fonteConstante(doFrame);
    const c = criarComandos();
    for (const p of [0, 1, 99]) {
      f.comandosDoPasso(p, c);
      expect([c.movimento[0], c.movimento[1]]).toEqual([0.25, 0]);
    }
    doFrame.movimento[0] = -1;
    f.comandosDoPasso(100, c);
    expect(c.movimento[0]).toBe(-1);
  });
});

describe('ações e mira (decisoes-F-006 ET5, ET6)', () => {
  const lerTudo = (f: ReturnType<typeof fonteDoRoteiro>, passo: number): [number, number, number, number, number] => {
    const c = criarComandos();
    f.comandosDoPasso(passo, c);
    return [c.movimento[0]!, c.movimento[1]!, c.acoes[0]!, c.mira[0]!, c.mira[1]!];
  };

  it('a tabela literal dos bits de ação', () => {
    expect(ACAO).toEqual({ esquiva: 1, aparo: 2, frasco: 4, frascoCancelar: 8, abandonar: 16 });
  });

  it('criarComandos zera os três campos e copiarComandos copia movimento, ações e mira', () => {
    const a = criarComandos();
    expect([...a.movimento, ...a.acoes, ...a.mira]).toEqual([0, 0, 0, 0, 0]);
    a.movimento[0] = 0.5;
    a.acoes[0] = ACAO.aparo;
    a.mira[0] = -0.6;
    a.mira[1] = 0.8;
    const b = criarComandos();
    copiarComandos(a, b);
    expect([...b.movimento, ...b.acoes, ...b.mira]).toEqual([...a.movimento, ...a.acoes, ...a.mira]);
  });

  it('a ação vale só no passo exato; fora dele a fonte entrega acoes = 0 e mira = (0, 0)', () => {
    const acoes: AcaoDeRoteiro[] = [
      { passo: 100, acoes: ACAO.esquiva, mira: [0.6, 0.8] },
      { passo: 130, acoes: ACAO.aparo },
    ];
    const f = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }], undefined, acoes);
    expect(lerTudo(f, 99)).toEqual([1, 0, 0, 0, 0]);
    expect(lerTudo(f, 100)).toEqual([1, 0, ACAO.esquiva, Math.fround(0.6), Math.fround(0.8)]);
    expect(lerTudo(f, 101)).toEqual([1, 0, 0, 0, 0]);
    expect(lerTudo(f, 130)).toEqual([1, 0, ACAO.aparo, 0, 0]);
    // Qualquer ordem de consulta: o resultado só depende do passo.
    expect(lerTudo(f, 100)[2]).toBe(ACAO.esquiva);
  });

  it('trecho de roteiro até 400 com acoes em 100 produz exatamente 1 esquiva (ação não persiste no trecho)', () => {
    const f = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }, { passo: 400, mx: 0, my: 0 }], undefined, [{ passo: 100, acoes: ACAO.esquiva }]);
    let n = 0;
    for (let p = 0; p < 500; p++) n += lerTudo(f, p)[2]! & ACAO.esquiva;
    expect(n).toBe(1);
  });

  it('validarAcoes recusa passos repetidos ou fora de ordem, o bit de abandonar, |mira| > 1 e NaN; aceita o Frasco e o cancelar', () => {
    expect(() => validarAcoes([{ passo: 0, acoes: 1 }, { passo: 5, acoes: 2, mira: [1, 0] }])).not.toThrow();
    expect(() => validarAcoes([{ passo: 5, acoes: 1 }, { passo: 5, acoes: 1 }])).toThrow(/fora de ordem/);
    expect(() => validarAcoes([{ passo: 6, acoes: 1 }, { passo: 5, acoes: 1 }])).toThrow(/fora de ordem/);
    expect(() => validarAcoes([{ passo: -1, acoes: 1 }])).toThrow(/fora de ordem/);
    expect(() => validarAcoes([{ passo: 1.5, acoes: 1 }])).toThrow(/fora de ordem/);
    expect(() => validarAcoes([{ passo: 1, acoes: ACAO.frasco }, { passo: 2, acoes: ACAO.frascoCancelar }, { passo: 3, acoes: ACAO.frasco | ACAO.aparo }])).not.toThrow();
    expect(() => validarAcoes([{ passo: 1, acoes: ACAO.abandonar }, { passo: 2, acoes: ACAO.abandonar | ACAO.esquiva }])).not.toThrow();
    expect(() => validarAcoes([{ passo: 1, acoes: 32 }])).toThrow(/bits/);
    expect(() => validarAcoes([{ passo: 1, acoes: 1, mira: [1, 0.1] }])).toThrow(/mira/);
    expect(() => validarAcoes([{ passo: 1, acoes: 1, mira: [Number.NaN, 0] }])).toThrow(/mira/);
    expect(() => validarAcoes([{ passo: 1, acoes: 1, mira: [Number.POSITIVE_INFINITY, 0] }])).toThrow(/mira/);
    // A mesma folga do movimento: 1/√2 em double.
    expect(() => validarAcoes([{ passo: 1, acoes: 1, mira: [Math.SQRT1_2, Math.SQRT1_2] }])).not.toThrow();
  });

  it('fonteDoRoteiro recusa a lista de ações inválida na criação', () => {
    expect(() => fonteDoRoteiro([], undefined, [{ passo: 2, acoes: 1 }, { passo: 1, acoes: 1 }])).toThrow();
  });

  it('fonteConstante entrega a borda uma vez e a zera na origem; o movimento continua', () => {
    const cmd = criarComandos();
    cmd.movimento[0] = 1;
    cmd.acoes[0] = ACAO.esquiva;
    cmd.mira[0] = 0;
    cmd.mira[1] = -1;
    const f = fonteConstante(cmd);
    expect(lerTudo(f, 0)).toEqual([1, 0, ACAO.esquiva, 0, -1]);
    expect(lerTudo(f, 1)).toEqual([1, 0, 0, 0, 0]);
    expect([cmd.acoes[0], cmd.mira[1]]).toEqual([0, 0]);
  });
});
