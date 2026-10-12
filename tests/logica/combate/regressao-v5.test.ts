// Regressão contra a F-005 (design/decisoes-F-006.md ET3): o layout v6 só
// acrescenta seções no fim, então os 67.488 bytes do v5 (menos a palavra da
// versão) têm de evoluir bit a bit como no código da F-005 enquanto os ataques
// dos inimigos estão desligados (o padrão). A palavra 4 do cabeçalho
// (tutoriaisVistos) é mascarada com `& 1` (o v5 só tinha o bit mover). Os
// valores foram gravados com o código do commit bc999b3 (o da F-005, antes de
// qualquer mudança da F-006). O caso com ataques ligados vem na etapa dos
// ataques.
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { BYTES_DO_LAYOUT_5, CAB, PROGRESSAO, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { confirmarModal, modalAberto } from '../../../src/logica/progressao/modal';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';

/** Os 67.488 bytes do v5 a partir do byte 4, com a palavra 4 mascarada em `& 1`. */
function hashDosCamposV5(e: Estado): string {
  expect(BYTES_DO_LAYOUT_5).toBe(67_488);
  const copia = e.bytes.slice(4, BYTES_DO_LAYOUT_5);
  const cab = new Uint32Array(copia.buffer, 0, 15);
  cab[CAB.tutoriaisVistos - 1] = cab[CAB.tutoriaisVistos - 1]! & 1;
  return hex8(fnv1aBytes(FNV_BASE, copia));
}

const V5 = {
  vigilia: { 1: '1dd460b1', 424242: 'e46a0209' },
  parada433: { 1: 'f48f5ca0', 424242: '16e92743' },
  horda: { 1: '3f730374', 424242: 'b7d1a24c' },
  rotativa: { 1: '8f066243', 424242: 'bbbe5267' },
  tresArmas: { 1: '09c2ea46', 424242: '0d28e6e5' },
  nivelTresAbertura: { 1: '738f3f7e', 424242: '2222ef20' },
  nivelTresFim: { 1: 'b207b53a', 424242: 'fe399427' },
  bauUniaoBau: '52625e62',
  bauUniao285: '5a5e7cb4',
} as const;

describe('os campos do v5 evoluem como na F-005 enquanto os ataques estão desligados', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: Vigília normal e o roteiro de referência, ${PASSOS_REFERENCIA} passos`, () => {
      const e = criarEstado(seed, D);
      expect(avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), PASSOS_REFERENCIA)).toBe(PASSOS_REFERENCIA);
      expect(hashDosCamposV5(e)).toBe(V5.vigilia[seed]);
    });

    it(`seed ${seed}: Vigília normal parada até a 1ª morte da F-004.4 (passo 433)`, () => {
      const e = criarEstado(seed, D);
      expect(avancar(e, D, PARADO, 433)).toBe(433);
      expect(hashDosCamposV5(e)).toBe(V5.parada433[seed]);
    });

    it(`seed ${seed}: cenário horda, 1.800 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda'), teto: 300 });
      avancar(e, D, PARADO, 1800);
      expect(hashDosCamposV5(e)).toBe(V5.horda[seed]);
    });

    it(`seed ${seed}: cenário horda_rotativa, 3.600 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda_rotativa'), teto: 300 });
      avancar(e, D, PARADO, 3600);
      expect(hashDosCamposV5(e)).toBe(V5.rotativa[seed]);
    }, 20_000);

    it(`seed ${seed}: cenário tres_armas, 1.200 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('tres_armas'), teto: 300 });
      avancar(e, D, PARADO, 1200);
      expect(hashDosCamposV5(e)).toBe(V5.tresArmas[seed]);
    });

    it(`seed ${seed}: nivel_tres no passo 1 e depois das duas cartas 0`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('nivel_tres'), teto: 300 });
      avancar(e, D, PARADO, 10);
      expect(e.cab[CAB.passo]).toBe(1);
      expect(hashDosCamposV5(e)).toBe(V5.nivelTresAbertura[seed]);
      confirmarModal(e, D, 0);
      confirmarModal(e, D, 0);
      expect(modalAberto(e)).toBe(false);
      expect(e.progresso[PROGRESSAO.nivel]).toBe(3);
      expect(hashDosCamposV5(e)).toBe(V5.nivelTresFim[seed]);
    });
  }

  it('seed 1: bau_uniao, o baú abre no passo 27 e o estado no passo 285', () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('bau_uniao'), teto: 300 });
    const fonte = fonteDoRoteiro([
      { passo: 0, mx: 0, my: -1 },
      { passo: 27, mx: 0, my: 0 },
    ]);
    expect(avancar(e, D, fonte, 600)).toBe(27);
    expect(modalAberto(e)).toBe(true);
    expect(hashDosCamposV5(e)).toBe(V5.bauUniaoBau);
    confirmarModal(e, D, 0);
    avancar(e, D, fonte, 285 - 27);
    expect(e.cab[CAB.passo]).toBe(285);
    expect(hashDosCamposV5(e)).toBe(V5.bauUniao285);
  });
});
