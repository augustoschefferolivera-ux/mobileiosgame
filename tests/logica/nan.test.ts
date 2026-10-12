// Verificação de NaN do ?debug=1 (ADR-0002 §5; design/decisoes-F-003.md §8).
import { describe, expect, it } from 'vitest';
import { JOGADOR3, JOGADOR, criarEstado } from '../../src/logica/nucleo/estado';
import { verificarNaN } from '../../src/logica/nucleo/nan';
import { avancar } from '../../src/logica/nucleo/passo';
import { nascerInimigo, removerInimigo } from '../../src/logica/mundo/inimigos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { DADOS_DA_CHARNECA as D, PARADO } from './apoio';

describe('verificarNaN', () => {
  it('passa num estado limpo com a horda, e acusa o slot e o passo de um NaN num vivo', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 5);
    expect(() => verificarNaN(e, 5)).not.toThrow();
    const s = nascerInimigo(e, D, TIPO.oco_grande, 100, 100, false);
    e.inimigos.hp[s] = Number.NaN;
    expect(() => verificarNaN(e, 5)).toThrow(`NaN no inimigo ${s} no passo 5 ou antes (quadro de 5 passos)`);
  });

  it('ignora slots livres e acusa o jogador', () => {
    const e = criarEstado(1, D);
    const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, 100, 100, false);
    removerInimigo(e, s);
    e.inimigos.x[s] = Number.NaN;
    expect(() => verificarNaN(e, 1)).not.toThrow();
    e.jogador[JOGADOR.dirY] = Number.NaN;
    expect(() => verificarNaN(e, 1)).toThrow(/NaN no jogador/);
  });

  it('acusa NaN na stamina e na direção da esquiva do jogador (F-006)', () => {
    for (const campo of [JOGADOR3.stamina, JOGADOR3.esquivaDirX, JOGADOR3.esquivaDirY]) {
      const e = criarEstado(1, D);
      expect(() => verificarNaN(e, 1)).not.toThrow();
      e.jogador3[campo] = Number.NaN;
      expect(() => verificarNaN(e, 1)).toThrow(/NaN no jogador/);
    }
  });

  it('acusa NaN na mira do ataque de um inimigo vivo e ignora a de um slot livre (F-006)', () => {
    const e = criarEstado(1, D);
    const s = nascerInimigo(e, D, TIPO.oco_grande, 100, 100, false);
    e.inimigos.miraX[s] = Number.NaN;
    expect(() => verificarNaN(e, 3)).toThrow(`NaN no inimigo ${s} no passo 0 ou antes (quadro de 3 passos)`);
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = Number.NaN;
    expect(() => verificarNaN(e, 3)).toThrow(/NaN no inimigo/);
    removerInimigo(e, s);
    e.inimigos.miraY[s] = Number.NaN;
    expect(() => verificarNaN(e, 3)).not.toThrow();
  });
});
