// Regressão contra a F-004 (design/decisoes-F-005.md §5, E2): o layout v5 só
// acrescenta seções no fim, então os 42.988 bytes do v4 (menos a palavra da
// versão) têm de evoluir bit a bit como no código da F-004 enquanto nenhum
// nível sobe. O bit semCinzas do cabeçalho, que não existia no v4, é
// mascarado na palavra 7. Os valores foram gravados com o código do commit
// 69760a8 (o da F-004, antes de qualquer mudança da F-005), sobre o mesmo
// trecho do buffer, com os mesmos roteiros.
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { BYTES_DO_LAYOUT_4, CAB, CENARIO, JOGADOR, LAYOUT, PROGRESSAO, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA, PARADO, semAlmas, semMiraAutomatica } from '../apoio';

/** Sem Almas: o código das F-004 e F-005 não as soltava (AM1), e elas movem o fluxo drops e o pool de pickups. */
// A mira automática da Espada (ADR-0012 §9) fica desligada: estes valores vêm do código que mirava pela direção do jogador.
const D = semMiraAutomatica(semAlmas(DADOS_DA_CHARNECA));

function hashDosCamposV4(e: Estado): string {
  const copia = e.bytes.slice(4, BYTES_DO_LAYOUT_4);
  const cab = new Uint32Array(copia.buffer, 0, 15);
  cab[CAB.cenario - 1] = cab[CAB.cenario - 1]! & ~CENARIO.semCinzas;
  // Desde a F-006 os bits de esquiva e aparo (2 e 4) existem em tutoriaisVistos (decisoes-F-006 ET3): só o bit mover (1) vale.
  cab[CAB.tutoriaisVistos - 1] = cab[CAB.tutoriaisVistos - 1]! & 1;
  // Desde a F-007 o HP recebe armadura e Brasa Firme (DM1, DM2): a palavra do HP fica de fora.
  new DataView(copia.buffer).setUint32(LAYOUT.jogador + JOGADOR.hp * 4 - 4, 0, true);
  return hex8(fnv1aBytes(FNV_BASE, copia));
}

const V4 = {
  vigilia: { 1: '1e07d252', 424242: '15819c05' },
  parada433: { 1: '92cf3c0c', 424242: 'f38b4d73' },
  horda: { 1: 'c9741fef', 424242: 'a9ae0c13' },
  rotativa: { 1: '813b5b3c', 424242: 'c5fae0d8' },
  tresArmas: { 1: 'd275a119', 424242: '6612d966' },
} as const;

describe('os campos do v4 evoluem como na F-004 até o 1º level up', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: Vigília normal (com Cinzas) e o roteiro de referência, ${PASSOS_REFERENCIA} passos, sem level up`, () => {
      const e = criarEstado(seed, D);
      expect(avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), PASSOS_REFERENCIA)).toBe(PASSOS_REFERENCIA);
      expect(e.progresso[PROGRESSAO.nivel]).toBe(1);
      expect(hashDosCamposV4(e)).toBe(V4.vigilia[seed]);
    });

    it(`seed ${seed}: Vigília normal parada até a 1ª morte da F-004.4 (passo 433)`, () => {
      const e = criarEstado(seed, D);
      expect(avancar(e, D, PARADO, 433)).toBe(433);
      expect(hashDosCamposV4(e)).toBe(V4.parada433[seed]);
    });

    it(`seed ${seed}: cenário horda, 1.800 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda'), teto: 300 });
      avancar(e, D, PARADO, 1800);
      expect(hashDosCamposV4(e)).toBe(V4.horda[seed]);
    });

    it(`seed ${seed}: cenário horda_rotativa, 3.600 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda_rotativa'), teto: 300 });
      avancar(e, D, PARADO, 3600);
      expect(hashDosCamposV4(e)).toBe(V4.rotativa[seed]);
    }, 20_000);

    it(`seed ${seed}: cenário tres_armas (mortes sem Cinzas), 1.200 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('tres_armas'), teto: 300 });
      avancar(e, D, PARADO, 1200);
      expect(hashDosCamposV4(e)).toBe(V4.tresArmas[seed]);
    });
  }
});
