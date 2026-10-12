// Regressão contra a F-006 (design/decisoes-F-007.md LY1): o layout v7 só acrescenta o bloco da F-007 no fim, então
// os 74.636 bytes do v6 (menos a palavra da versão) têm de evoluir bit a bit como no código da F-006 enquanto nada
// da F-007 atua. Os valores foram gravados com o código do commit e0d0f68 (o da D7, ainda com o layout v6), antes
// de qualquer mudança de código da F-007. Os casos rodam com `semCinzas` (nenhuma Cinza nem Alma cai, então o
// fluxo `drops` não mexe) e `jogadorInvulneravel` (nenhum dano, então a armadura e a Brasa Firme não aparecem), e
// duas palavras que a F-007 muda de propósito ficam mascaradas: o HP do jogador (armadura e Brasa Firme, DM1 e DM2)
// e `mortes` (o convertido passa a valer 10, RS4). Os casos usam esquiva e aparo por roteiro (bits 1 e 2 de ACAO),
// os mesmos bits do replay v6.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../../../src/logica/nucleo/hash';
import { CENARIO, JOGADOR, LAYOUT, MUNDO, TODOS_OS_TUTORIAIS, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';

const BYTES_V6 = 74_636;
const SEGURO = CENARIO.semCinzas | CENARIO.jogadorInvulneravel;

/** Os 74.636 bytes do v6 a partir do byte 4, sem o HP e sem `mortes` (as duas palavras que a F-007 muda). */
function hashDosCamposV6(e: Estado): string {
  expect(e.bytes.length).toBeGreaterThanOrEqual(BYTES_V6);
  const copia = e.bytes.slice(4, BYTES_V6);
  const f = new DataView(copia.buffer);
  f.setUint32(LAYOUT.jogador + JOGADOR.hp * 4 - 4, 0, true);
  f.setUint32(LAYOUT.mundo + MUNDO.mortes * 4 - 4, 0, true);
  return hex8(fnv1aBytes(FNV_BASE, copia));
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

function cenario(id: string, seed: number): Estado {
  const p = parametrosDoCenario(id);
  return criarEstado(seed, D, { ...p, cenario: p.cenario | SEGURO, tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 });
}

const V6 = {
  vigilia: { 1: 'a4ac1215', 424242: 'ef9c0bf6' },
  horda: { 1: '43a81a37', 424242: 'debf4623' },
  hordaComAtaques: { 1: 'd50c8e4f', 424242: 'cca9e2ef' },
  ocoGrande: { 1: 'e1813bb9', 424242: '3272dd80' },
  novica: { 1: '82cb704f', 424242: 'f0b689c6' },
  telegrafos: { 1: '22ed6946', 424242: '23b45b8f' },
  tresArmas: { 1: '8c64aa99', 424242: '930f2539' },
} as const;

describe('os campos do v6 evoluem como na F-006 enquanto nada da F-007 atua', () => {
  for (const seed of [1, 424242] as const) {
    it(`seed ${seed}: Vigília de produção com ataques, esquiva e aparo no roteiro de referência, ${PASSOS_REFERENCIA} passos`, () => {
      const e = criarEstado(seed, D, { cenario: SEGURO | CENARIO.ataques, tutoriaisVistos: TODOS_OS_TUTORIAIS });
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(PASSOS_REFERENCIA));
      expect(avancar(e, D, fonte, PASSOS_REFERENCIA)).toBe(PASSOS_REFERENCIA);
      expect(hashDosCamposV6(e)).toBe(V6.vigilia[seed]);
    });

    it(`seed ${seed}: cenário horda parado, 1.800 passos`, () => {
      const e = cenario('horda', seed);
      avancar(e, D, PARADO, 1800);
      expect(hashDosCamposV6(e)).toBe(V6.horda[seed]);
    });

    it(`seed ${seed}: cenário horda_com_ataques com esquiva e aparo, 1.800 passos`, () => {
      const e = cenario('horda_com_ataques', seed);
      avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(1800)), 1800);
      expect(hashDosCamposV6(e)).toBe(V6.hordaComAtaques[seed]);
    });

    it(`seed ${seed}: oco_grande_sozinho com esquiva e aparo, 600 passos`, () => {
      const e = cenario('oco_grande_sozinho', seed);
      avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoesAlternadas(600)), 600);
      expect(hashDosCamposV6(e)).toBe(V6.ocoGrande[seed]);
    });

    it(`seed ${seed}: novica_sozinha com esquiva e aparo, 600 passos`, () => {
      const e = cenario('novica_sozinha', seed);
      avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoesAlternadas(600)), 600);
      expect(hashDosCamposV6(e)).toBe(V6.novica[seed]);
    });

    it(`seed ${seed}: telegrafos com esquiva e aparo, 600 passos`, () => {
      const e = cenario('telegrafos', seed);
      avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoesAlternadas(600)), 600);
      expect(hashDosCamposV6(e)).toBe(V6.telegrafos[seed]);
    });

    it(`seed ${seed}: tres_armas com ataques ligados, 1.200 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('tres_armas'), cenario: parametrosDoCenario('tres_armas').cenario | SEGURO | CENARIO.ataques, tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 });
      avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, acoesAlternadas(1200)), 1200);
      expect(hashDosCamposV6(e)).toBe(V6.tresArmas[seed]);
    }, 20_000);
  }
});
