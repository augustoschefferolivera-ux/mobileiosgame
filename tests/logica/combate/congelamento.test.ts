// Consumo da borda das ações ao vivo (ET6) e congelamento no passo e em
// `avancar` (ET7; design/decisoes-F-006.md). O contador de congelamento ainda
// não é ligado por nenhuma regra de jogo (a esquiva perfeita e o aparo vêm
// adiante): os testes o põem à mão.
import { describe, expect, it } from 'vitest';
import { criarAcumulador } from '../../../src/logica/nucleo/acumulador';
import { ACAO, criarComandos, fonteConstante, type FonteDeComandos } from '../../../src/logica/nucleo/comandos';
import { rodarFrame } from '../../../src/logica/nucleo/driver';
import { CAB, JOGADOR3_U8, criarEstado, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSO_MS } from '../../../src/logica/nucleo/passos';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';
import { laco } from './apoio';

/** Fonte que registra (passo, ações) de cada consulta que a simulação faz. */
function espiada(base: FonteDeComandos): { fonte: FonteDeComandos; lidas: { passo: number; acoes: number }[] } {
  const lidas: { passo: number; acoes: number }[] = [];
  const fonte: FonteDeComandos = {
    comandosDoPasso(passo, out) {
      base.comandosDoPasso(passo, out);
      lidas.push({ passo, acoes: out.acoes[0]! });
    },
  };
  return { fonte, lidas };
}

const comAcao = (acoes: number = ACAO.aparo) => {
  const cmd = criarComandos();
  cmd.acoes[0] = acoes;
  return cmd;
};

describe('a borda ao vivo entra uma vez só (ET6)', () => {
  const comAcoesLidas = (lidas: { passo: number; acoes: number }[]) => lidas.filter((l) => l.acoes !== 0);

  it('quadro de 0 passos seguido de quadro de 1: a ação entra no passo da leitura', () => {
    const e = criarEstado(1, D);
    const acc = criarAcumulador();
    const cmd = comAcao();
    const { fonte, lidas } = espiada(fonteConstante(cmd));
    expect(rodarFrame(e, D, acc, 1, fonte)).toBe(0);
    expect(cmd.acoes[0]).toBe(ACAO.aparo);
    expect(rodarFrame(e, D, acc, PASSO_MS, fonte)).toBe(1);
    expect(comAcoesLidas(lidas)).toEqual([{ passo: 0, acoes: ACAO.aparo }]);
    expect(cmd.acoes[0]).toBe(0);
  });

  it('quadro de 5 passos: o aparo vai só no 1º passo do quadro', () => {
    const e = criarEstado(1, D);
    const cmd = comAcao();
    const { fonte, lidas } = espiada(fonteConstante(cmd));
    expect(rodarFrame(e, D, criarAcumulador(), 5 * PASSO_MS, fonte)).toBe(5);
    expect(lidas.map((l) => l.acoes)).toEqual([ACAO.aparo, 0, 0, 0, 0]);
  });

  it('dois quadros de 0 passos antes do passo: a ação sobrevive e entra uma vez', () => {
    const e = criarEstado(1, D);
    const acc = criarAcumulador();
    const cmd = comAcao(ACAO.esquiva);
    cmd.mira[1] = -1;
    const { fonte, lidas } = espiada(fonteConstante(cmd));
    expect(rodarFrame(e, D, acc, 1, fonte)).toBe(0);
    expect(rodarFrame(e, D, acc, 1, fonte)).toBe(0);
    expect(rodarFrame(e, D, acc, PASSO_MS, fonte)).toBe(1);
    expect(rodarFrame(e, D, acc, PASSO_MS, fonte)).toBe(1);
    expect(comAcoesLidas(lidas)).toEqual([{ passo: 0, acoes: ACAO.esquiva }]);
    expect(cmd.mira[1]).toBe(0);
  });

  it('os três caminhos dão o mesmo estado (a ação ainda não tem efeito de jogo)', () => {
    const hash = (frames: number[]): number => {
      const e = criarEstado(1, D);
      const acc = criarAcumulador();
      const fonte = fonteConstante(comAcao());
      for (const ms of frames) rodarFrame(e, D, acc, ms, fonte);
      return hashEstado(e);
    };
    const a = hash([1, PASSO_MS, 4 * PASSO_MS]);
    expect(hash([5 * PASSO_MS])).toBe(a);
    expect(hash([1, 1, 5 * PASSO_MS])).toBe(a);
  });

  it('o mutante "não zerar a borda" repetiria o aparo em todos os passos do quadro', () => {
    const e = criarEstado(1, D);
    const cmd = comAcao();
    // Uma fonte que copia sem zerar (o mutante) vê 5 aparos; a de produção, 1.
    const mutante = espiada({ comandosDoPasso: (_p, out) => out.acoes.set(cmd.acoes) });
    avancar(e, D, mutante.fonte, 5);
    expect(comAcoesLidas(mutante.lidas)).toHaveLength(5);
    const real = espiada(fonteConstante(comAcao()));
    avancar(criarEstado(1, D), D, real.fonte, 5);
    expect(comAcoesLidas(real.lidas)).toHaveLength(1);
  });
});

describe('congelamento (ET7)', () => {
  const congelar = (e: Estado, n: number): void => {
    e.jogador3U8[JOGADOR3_U8.congelamento] = n;
  };

  it('depois do gatilho, avancar(5) devolve 5; passo, relógio e o hash (salvo o contador) não mudam; o 6º passo anda', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 10);
    const passo = e.cab[CAB.passo]!;
    const relogio = e.cab[CAB.relogio]!;
    const hashSem = hashEstado(e);
    congelar(e, 5);
    const { fonte, lidas } = espiada(PARADO);
    expect(avancar(e, D, fonte, 5)).toBe(5);
    expect([e.cab[CAB.passo], e.cab[CAB.relogio]]).toEqual([passo, relogio]);
    expect(e.jogador3U8[JOGADOR3_U8.congelamento]).toBe(0);
    expect(hashEstado(e)).toBe(hashSem);
    expect(lidas).toHaveLength(0);
    expect(avancar(e, D, fonte, 1)).toBe(1);
    expect(e.cab[CAB.passo]).toBe(passo + 1);
    expect(lidas).toHaveLength(1);
  });

  it('o passo congelado não consome a borda ao vivo', () => {
    const e = criarEstado(1, D);
    congelar(e, 2);
    const cmd = comAcao();
    const fonte = fonteConstante(cmd);
    expect(avancar(e, D, fonte, 2)).toBe(2);
    expect(cmd.acoes[0]).toBe(ACAO.aparo);
    expect(avancar(e, D, fonte, 1)).toBe(1);
    expect(cmd.acoes[0]).toBe(0);
  });

  it('o contador conta 1 dos n pedidos: avancar(3) com congelamento 2 roda 1 passo vivo', () => {
    const e = criarEstado(1, D);
    congelar(e, 2);
    expect(avancar(e, D, PARADO, 3)).toBe(3);
    expect(e.cab[CAB.passo]).toBe(1);
  });

  it('replay com 1 e com 5 passos por quadro dá o mesmo hash', () => {
    const rodar = (porQuadro: number): number => {
      const e = criarEstado(1, D);
      avancar(e, D, PARADO, 10);
      congelar(e, 5);
      let total = 0;
      const g = laco('congelamento: 30 passos');
      while (total < 30) {
        g();
        total += avancar(e, D, PARADO, Math.min(porQuadro, 30 - total));
      }
      expect(e.cab[CAB.passo]).toBe(10 + 25);
      return hashEstado(e);
    };
    expect(rodar(5)).toBe(rodar(1));
  });

  it('o passo congelado não reescreve xAnt e yAnt nem anda o RNG', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 20);
    const antes = e.bytes.slice();
    congelar(e, 5);
    avancar(e, D, PARADO, 5);
    e.jogador3U8[JOGADOR3_U8.congelamento] = 0;
    expect(e.bytes).toEqual(antes);
  });
});
