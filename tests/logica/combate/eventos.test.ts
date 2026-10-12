// Códigos de evento, forma e flag das F-006 a F-009 (design/decisoes-F-006.md ET10; decisoes-F-007 LY4): os
// literais ficam travados; os códigos só crescem no fim.
import { describe, expect, it } from 'vitest';
import { NOMES_DOS_EVENTOS } from '../../../src/cenas/debug';
import { EVENTO, FLAG, FORMA } from '../../../src/logica/nucleo/eventos';

describe('códigos de EVENTO, FORMA e FLAG', () => {
  it('EVENTO 1 a 47, literais', () => {
    expect(EVENTO).toEqual({
      acerto: 1, morte: 2, golpe: 3, pulso: 4, nivel: 5, carta: 6, onda: 7, bau: 8, item: 9, uniao: 10,
      telegrafo: 11, golpeInimigo: 12, esquiva: 13, esquivaPerfeita: 14, aparo: 15, aparoFalho: 16,
      posturaQuebrada: 17, contraAtaque: 18, acaoNegada: 19, projetilLancado: 20, aparoVazio: 21,
      frascoIniciado: 22, frascoInterrompido: 23, frascoCancelado: 24, apagou: 25, fimDaVigilia: 26, manchaRecuperada: 27,
      danoAoJogador: 28,
      marcoIniciado: 29, marcoVencido: 30, marcoConcluido: 31, fogueiraAcesa: 32, fogueiraAberta: 33, descansou: 34,
      forjou: 35, fogueiraPartiu: 36, fogueiraApagada: 37, convocacao: 38,
      chefeSurgiu: 39, chefeFase: 40, quebraDoChefe: 41, quebraAcabou: 42, efeitoNoJogador: 43, furia: 44,
      chefeMorreu: 45, amanhecerIniciado: 46, fomeDesceu: 47,
    });
  });

  it('FORMA 1 a 16 e FLAG.contra = 8', () => {
    expect(FORMA).toEqual({ ida: 1, volta: 2, estocada: 3, faca: 4, tick: 5, onda: 6, arcoInimigo: 7, projetilSal: 8, coneInimigo: 9, gritoInimigo: 10,
      varaArco: 11, varaLinha: 12, luzCega: 13, lanternaZona: 14, explosaoAnel: 15, agarrar: 16,
    });
    expect(FLAG).toEqual({ critico: 1, matou: 2, convertido: 4, contra: 8 });
  });
});

describe('nomes dos eventos no debug', () => {
  it('NOMES_DOS_EVENTOS tem o nome de cada código, nas posições 0 a 47', () => {
    expect(NOMES_DOS_EVENTOS).toHaveLength(48);
    for (const [nome, codigo] of Object.entries(EVENTO)) expect(NOMES_DOS_EVENTOS[codigo], nome).toBe(nome);
    expect(NOMES_DOS_EVENTOS[0]).toBe('');
  });
});
