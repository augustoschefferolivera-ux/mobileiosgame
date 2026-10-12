// Regressão contra a F-005 (design/decisoes-F-006.md ET3): o layout v6 só
// acrescenta seções no fim, então os 67.488 bytes do v5 (menos a palavra da
// versão) têm de evoluir bit a bit como no código da F-005 enquanto os ataques
// dos inimigos estão desligados (o padrão). A palavra 4 do cabeçalho
// (tutoriaisVistos) é mascarada com `& 1` (o v5 só tinha o bit mover). Os
// valores foram gravados com o código do commit bc999b3 (o da F-005, antes de
// qualquer mudança da F-006). O último caso liga os ataques dos inimigos: até o
// passo anterior ao 1º telegrafo os campos do v5 ainda coincidem (o bit 8 da
// palavra do cenário é mascarado).
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { BYTES_DO_LAYOUT_5, CAB, CENARIO, JOGADOR, LAYOUT, PROGRESSAO, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { confirmarModal, modalAberto } from '../../../src/logica/progressao/modal';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { DADOS_DA_CHARNECA, PARADO, semAlmas } from '../apoio';

/** Sem Almas: o código das F-004 e F-005 não as soltava (AM1), e elas movem o fluxo drops e o pool de pickups. */
const D = semAlmas(DADOS_DA_CHARNECA);
import { eventosDe } from './apoio';

/** Os 67.488 bytes do v5 a partir do byte 4, com a palavra 4 mascarada em `& 1`. */
function hashDosCamposV5(e: Estado, mascararAtaques = false): string {
  expect(BYTES_DO_LAYOUT_5).toBe(67_488);
  const copia = e.bytes.slice(4, BYTES_DO_LAYOUT_5);
  const cab = new Uint32Array(copia.buffer, 0, 15);
  cab[CAB.tutoriaisVistos - 1] = cab[CAB.tutoriaisVistos - 1]! & 1;
  if (mascararAtaques) cab[CAB.cenario - 1] = cab[CAB.cenario - 1]! & ~CENARIO.ataques;
  // Desde a F-007 o HP recebe armadura e Brasa Firme (DM1, DM2): a palavra do HP fica de fora.
  new DataView(copia.buffer).setUint32(LAYOUT.jogador + JOGADOR.hp * 4 - 4, 0, true);
  return hex8(fnv1aBytes(FNV_BASE, copia));
}

const V5 = {
  vigilia: { 1: '8c804b7a', 424242: '25092e7f' },
  parada433: { 1: '426c6790', 424242: '86c57b94' },
  horda: { 1: 'be6f9df7', 424242: 'e34c9633' },
  rotativa: { 1: '9e6b13f4', 424242: 'e587d6c8' },
  tresArmas: { 1: '38f5c2fd', 424242: '424ea342' },
  nivelTresAbertura: { 1: '8f528479', 424242: '615168ab' },
  nivelTresFim: { 1: '04a0b35d', 424242: 'd22f5180' },
  bauUniaoBau: '0f59b715',
  bauUniao285: '20982533',
  /** Cenário horda (v5) no passo 117, gravado com bc999b3; com ataques, o 1º telegrafo é no passo 118. */
  ataquesLigados: { 1: 'db6325c2', 424242: '3a586740' },
} as const;
const PASSO_ANTES_DO_PRIMEIRO_TELEGRAFO = 117;

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

  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: com os ataques ligados (horda_com_ataques), os campos do v5 coincidem até o passo anterior ao 1º telegrafo`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda_com_ataques'), teto: 300 });
      expect(e.cab[CAB.cenario]! & CENARIO.ataques).toBe(CENARIO.ataques);
      avancar(e, D, PARADO, PASSO_ANTES_DO_PRIMEIRO_TELEGRAFO);
      expect(e.cab[CAB.passo]).toBe(PASSO_ANTES_DO_PRIMEIRO_TELEGRAFO);
      expect(eventosDe(e, EVENTO.telegrafo)).toHaveLength(0);
      expect(hashDosCamposV5(e, true)).toBe(V5.ataquesLigados[seed]);
      avancar(e, D, PARADO, 1);
      const ev = eventosDe(e, EVENTO.telegrafo);
      expect(ev).toHaveLength(1);
      expect(ev[0]!.passo).toBe(PASSO_ANTES_DO_PRIMEIRO_TELEGRAFO + 1);
    });
  }
});
