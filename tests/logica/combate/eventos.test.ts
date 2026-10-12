// Códigos de evento, forma e flag da F-006 (design/decisoes-F-006.md ET10): os
// literais ficam travados; os códigos só crescem no fim.
import { describe, expect, it } from 'vitest';
import { NOMES_DOS_EVENTOS } from '../../../src/cenas/debug';
import { EVENTO, FLAG, FORMA } from '../../../src/logica/nucleo/eventos';

describe('códigos de EVENTO, FORMA e FLAG', () => {
  it('EVENTO 1 a 21, literais', () => {
    expect(EVENTO).toEqual({
      acerto: 1, morte: 2, golpe: 3, pulso: 4, nivel: 5, carta: 6, onda: 7, bau: 8, item: 9, uniao: 10,
      telegrafo: 11, golpeInimigo: 12, esquiva: 13, esquivaPerfeita: 14, aparo: 15, aparoFalho: 16,
      posturaQuebrada: 17, contraAtaque: 18, acaoNegada: 19, projetilLancado: 20, aparoVazio: 21,
    });
  });

  it('FORMA 1 a 8 e FLAG.contra = 8', () => {
    expect(FORMA).toEqual({ ida: 1, volta: 2, estocada: 3, faca: 4, tick: 5, onda: 6, arcoInimigo: 7, projetilSal: 8 });
    expect(FLAG).toEqual({ critico: 1, matou: 2, convertido: 4, contra: 8 });
  });
});

describe('nomes dos eventos no debug', () => {
  it('NOMES_DOS_EVENTOS tem o nome de cada código, nas posições 0 a 21', () => {
    expect(NOMES_DOS_EVENTOS).toHaveLength(22);
    for (const [nome, codigo] of Object.entries(EVENTO)) expect(NOMES_DOS_EVENTOS[codigo], nome).toBe(nome);
    expect(NOMES_DOS_EVENTOS[0]).toBe('');
  });
});
