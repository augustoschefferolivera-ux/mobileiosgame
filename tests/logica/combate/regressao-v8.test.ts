// Regressão contra a F-008 (design/decisoes-F-009.md §1, L9): o layout v9 só acrescenta o bloco do chefe no fim, então
// os 76.788 bytes do v8 (menos a palavra da versão) têm de evoluir bit a bit como no código da F-008 enquanto nada da
// F-009 atua (nada age antes de 20:00). Os valores foram gravados com o código do commit 4827a73 (a D9 aprovada, ainda
// com o layout v8), antes de qualquer mudança de código da F-009. Sem máscara além da palavra `CAB.versao`.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { BYTES_DO_LAYOUT_8, BYTES_DO_LAYOUT_9, CHEFE_U16, SEM_CHEFE, TODOS_OS_TUTORIAIS, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D } from '../apoio';

/** Os 76.788 bytes do v8 a partir do byte 4 (sem a palavra da versão). */
function hashDosCamposV8(e: Estado): string {
  expect(e.bytes.length).toBeGreaterThanOrEqual(BYTES_DO_LAYOUT_8);
  return hex8(fnv1aBytes(FNV_BASE, e.bytes.slice(4, BYTES_DO_LAYOUT_8)));
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

const V8 = {
  1: { 1000: '0eb68176', 1800: '32e289ec' },
  424242: { 1000: '44f34bb3', 1800: '9a5522d0' },
} as const;

describe('os campos do v8 evoluem como na F-008 enquanto nada da F-009 atua', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: horda_com_ataques com esquiva e aparo, passos 1.000 e 1.800`, () => {
      const p = parametrosDoCenario('horda_com_ataques');
      const e = criarEstado(seed, D, { ...p, tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 });
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(1800));
      avancar(e, D, fonte, 1000);
      expect(hashDosCamposV8(e)).toBe(V8[seed][1000]);
      avancar(e, D, fonte, 800);
      expect(hashDosCamposV8(e)).toBe(V8[seed][1800]);
      // Sem chefe: o bloco novo segue como nasceu (só o `chefeSlot` em 0xFFFF).
      expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
      expect(e.bytes.slice(BYTES_DO_LAYOUT_8, BYTES_DO_LAYOUT_9).reduce((s, v) => s + v, 0)).toBe(2 * 255);
    });
  }
});
