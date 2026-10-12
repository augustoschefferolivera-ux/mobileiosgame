// Regressão contra a F-003 (design/decisoes-F-004.md §8; achado T9 da revisão):
// sem armas, o estado v4 tem de evoluir bit a bit como o v3. O hash cobre só
// os campos que já existiam no v3 (cabeçalho sem a versão, RNG, jogador,
// as 8 palavras do mundo da F-003, o pool de inimigos e os campos x, y, xAnt,
// yAnt, hp, dano, tipo e convertido), na mesma ordem. Os valores foram
// gravados com o código do commit aad3094 (F-003 ratificada). Desde a F-005, o
// bit semCinzas do cabeçalho fica de fora (os cenários antigos o ligam). Desde a F-007 a palavra do HP também fica de
// fora e os valores foram regravados com o código da F-007 etapa 2c (56304b2), o último com o HP bruto.
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { CAB, CENARIO, JOGADOR, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO, SEM_ARMAS } from '../apoio';

function hashDosCamposV3(e: Estado): string {
  const b = (ini: number, fim: number): Uint8Array => new Uint8Array(e.buffer, ini, fim - ini);
  // O bit semCinzas da F-005 (decisoes-F-005 §5) não existia no v3: mascarado na palavra 7 do cabeçalho.
  const cab = new Uint32Array(e.cab.slice(1));
  cab[CAB.cenario - 1] = cab[CAB.cenario - 1]! & ~CENARIO.semCinzas;
  // Desde a F-006 os bits de esquiva e aparo (2 e 4) existem em tutoriaisVistos (decisoes-F-006 ET3): só o bit mover (1) vale.
  cab[CAB.tutoriaisVistos - 1] = cab[CAB.tutoriaisVistos - 1]! & 1;
  let h = fnv1aBytes(FNV_BASE, new Uint8Array(cab.buffer));
  h = fnv1aBytes(h, b(e.rng.byteOffset, e.rng.byteOffset + e.rng.byteLength));
  // Desde a F-007 o HP recebe armadura e Brasa Firme (DM1, DM2): a palavra do HP fica de fora (decisoes-F-007 LY1).
  const jogador = new Uint8Array(e.buffer.slice(e.jogador.byteOffset, e.jogador.byteOffset + 32));
  new DataView(jogador.buffer).setUint32(JOGADOR.hp * 4, 0, true);
  h = fnv1aBytes(h, jogador);
  h = fnv1aBytes(h, b(e.mundo.byteOffset, e.mundo.byteOffset + 32));
  h = fnv1aBytes(h, b(e.pool.contagens.byteOffset, e.inimigos.convertido.byteOffset + 500));
  return hex8(h);
}

const V3 = {
  vigilia: { 1: 'badf5995', 424242: 'dcb425b0' },
  horda: { 1: '95b3b5d4', 424242: 'eb4d7178' },
  hordaRotativa: { 1: 'fd88af07', 424242: '3d5f97a3' },
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
