// Regressão contra a F-003 (design/decisoes-F-004.md §8; achado T9 da revisão):
// sem armas, o estado v4 tem de evoluir bit a bit como o v3. O hash cobre só
// os campos que já existiam no v3 (cabeçalho sem a versão, RNG, jogador,
// as 8 palavras do mundo da F-003, o pool de inimigos e os campos x, y, xAnt,
// yAnt, hp, dano, tipo e convertido), na mesma ordem. Os valores foram
// gravados com o código do commit aad3094 (F-003 ratificada).
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO, SEM_ARMAS } from '../apoio';

function hashDosCamposV3(e: Estado): string {
  const b = (ini: number, fim: number): Uint8Array => new Uint8Array(e.buffer, ini, fim - ini);
  let h = fnv1aBytes(FNV_BASE, b(4, 64));
  h = fnv1aBytes(h, b(e.rng.byteOffset, e.rng.byteOffset + e.rng.byteLength));
  h = fnv1aBytes(h, b(e.jogador.byteOffset, e.jogador.byteOffset + 32));
  h = fnv1aBytes(h, b(e.mundo.byteOffset, e.mundo.byteOffset + 32));
  h = fnv1aBytes(h, b(e.pool.contagens.byteOffset, e.inimigos.convertido.byteOffset + 500));
  return hex8(h);
}

const V3 = {
  vigilia: { 1: '148102b6', 424242: '60e38d12' },
  horda: { 1: '8525ce67', 424242: '6c7b419f' },
  hordaRotativa: { 1: 'db0c9f48', 424242: '44aecf54' },
} as const;

describe('sem armas, o v4 evolui como o v3 (F-003)', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: Vigília normal com o roteiro de referência, ${PASSOS_REFERENCIA} passos`, () => {
      const e = criarEstado(seed, D, SEM_ARMAS);
      avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), PASSOS_REFERENCIA);
      expect(hashDosCamposV3(e)).toBe(V3.vigilia[seed]);
    });

    it(`seed ${seed}: cenário horda, 1.800 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda'), teto: 300 });
      avancar(e, D, PARADO, 1800);
      expect(hashDosCamposV3(e)).toBe(V3.horda[seed]);
    });

    it(`seed ${seed}: cenário horda_rotativa (nascer e remover o tempo todo), 3.600 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda_rotativa'), teto: 300 });
      avancar(e, D, PARADO, 3600);
      expect(hashDosCamposV3(e)).toBe(V3.hordaRotativa[seed]);
    }, 20_000);
  }
});
