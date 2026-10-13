// Regressão contra a F-009 (design/decisoes-F-010.md LY1, F-010.8): o layout v10 só acrescenta 4 bytes de ranks no fim,
// então os 76.868 bytes do v9 (menos a palavra da versão) evoluem bit a bit como no código da F-009 enquanto os ranks
// da Fundação valem 0. Os valores foram gravados com o código do commit d4bb7a1 anterior às mudanças de simulação da F-010
// (layout v9). Máscara: só `CAB.versao` e os 4 B finais.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { BYTES_DO_LAYOUT_9, BYTES_ESTADO, TODOS_OS_TUTORIAIS, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D } from '../apoio';

/** Os 76.868 bytes do v9 a partir do byte 4 (sem a palavra da versão). */
function hashDosCamposV9(e: Estado): string {
  return hex8(fnv1aBytes(FNV_BASE, e.bytes.slice(4, BYTES_DO_LAYOUT_9)));
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

const HORDA = {
  1: { 1000: '3a1fa55c', 1800: '9d38c752' },
  424242: { 1000: 'c6cc15d9', 1800: '95e92d36' },
} as const;
const LANTERNEIRO = {
  1: { 1200: '3fa2eee8', 2400: 'fbbe4139' },
  424242: { 1200: '224bd9cd', 2400: '9555f940' },
} as const;

describe('os campos do v9 evoluem como na F-009 com a Fundação em rank 0', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: horda_com_ataques com esquiva e aparo, passos 1.000 e 1.800`, () => {
      const p = parametrosDoCenario('horda_com_ataques');
      const e = criarEstado(seed, D, { ...p, tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 });
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(1800));
      avancar(e, D, fonte, 1000);
      expect(hashDosCamposV9(e)).toBe(HORDA[seed][1000]);
      avancar(e, D, fonte, 800);
      expect(hashDosCamposV9(e)).toBe(HORDA[seed][1800]);
      expect(e.bytes.length).toBe(BYTES_ESTADO);
      expect([...e.fundacaoU8]).toEqual([0, 0, 0, 0]);
    });

    it(`seed ${seed}: lanterneiro (primeira etapa), passos 1.200 e 2.400`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('lanterneiro'), tutoriaisVistos: TODOS_OS_TUTORIAIS });
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, 'primeira', acoesAlternadas(2400));
      avancar(e, D, fonte, 1200);
      expect(hashDosCamposV9(e)).toBe(LANTERNEIRO[seed][1200]);
      avancar(e, D, fonte, 1200);
      expect(hashDosCamposV9(e)).toBe(LANTERNEIRO[seed][2400]);
    });
  }
});
