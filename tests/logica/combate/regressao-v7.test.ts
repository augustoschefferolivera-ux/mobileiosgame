// Regressão contra a F-007 (design/decisoes-F-008.md §1, LY1): o layout v8 só acrescenta o bloco da F-008 no fim, então
// os 74.680 bytes do v7 (menos a palavra da versão) têm de evoluir bit a bit como no código da F-007 enquanto nada da
// F-008 atua (nenhum marco antes de 5:00, nenhum Coroado, nenhuma Fogueira). Os valores foram gravados com o código
// do commit fc4dcbc (a D8 aprovada, ainda com o layout v7), antes de qualquer mudança de código da F-008. Sem
// máscara além da palavra `CAB.versao`: o HP, as Almas e as Cinzas entram como estão, e o jogador pode até morrer.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { TODOS_OS_TUTORIAIS, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D } from '../apoio';

const BYTES_V7 = 74_680;

/** Os 74.680 bytes do v7 a partir do byte 4 (sem a palavra da versão). */
function hashDosCamposV7(e: Estado): string {
  expect(e.bytes.length).toBeGreaterThanOrEqual(BYTES_V7);
  return hex8(fnv1aBytes(FNV_BASE, e.bytes.slice(4, BYTES_V7)));
}

/** Esquiva (com mira) e aparo alternados a cada 37 passos, a partir do passo 5. */
function acoesAlternadas(ate: number): AcaoDeRoteiro[] {
  const lista: AcaoDeRoteiro[] = [];
  const direcoes: readonly (readonly [number, number])[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let p = 5, i = 0; p < ate; p += 37, i++) {
    lista.push(i % 2 === 0 ? { passo: p, acoes: ACAO.esquiva, mira: direcoes[(i >> 1) % 4]! } : { passo: p, acoes: ACAO.aparo });
  }
  return lista;
}

const V7 = {
  1: { 1000: '6e82a004', 1800: '9688b3da' },
  424242: { 1000: 'a1dc15b5', 1800: '7f66b2fe' },
} as const;

describe('os campos do v7 evoluem como na F-007 enquanto nada da F-008 atua', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: horda_com_ataques com esquiva e aparo, passos 1.000 e 1.800`, () => {
      const p = parametrosDoCenario('horda_com_ataques');
      const e = criarEstado(seed, D, { ...p, tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 });
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(1800));
      avancar(e, D, fonte, 1000);
      expect(hashDosCamposV7(e)).toBe(V7[seed][1000]);
      avancar(e, D, fonte, 800);
      expect(hashDosCamposV7(e)).toBe(V7[seed][1800]);
    });
  }
});
