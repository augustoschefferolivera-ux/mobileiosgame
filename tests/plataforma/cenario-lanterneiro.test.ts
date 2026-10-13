// O cenário lanterneiro (F-009 CN1, D9 §5): nível 29, a build do chefe e a arena formada no passo 30.
import { describe, expect, it } from 'vitest';
import { CAB, CHEFE_F32, CHEFE_U16, ETAPA, FOGUEIRA_U8, JOGADOR, JOGADOR2, JOGADOR4_U8, PROGRESSAO, SEM_CHEFE, criarEstado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { parametrosDoCenario, prepararNivelDoCenario } from '../../src/plataforma/cenarios';
import { criarDadosDaCharneca } from '../../src/plataforma/dadosDaVigilia';
import { PARADO } from '../logica/apoio';

const dados = criarDadosDaCharneca();
const abrir = () => {
  const e = criarEstado(424242, dados, { ...parametrosDoCenario('lanterneiro'), teto: 300 });
  prepararNivelDoCenario(e, dados, 'lanterneiro');
  return e;
};

describe('cenário lanterneiro', () => {
  it('nível 29 sem pendentes, XP 0, HP cheio, 3 Frascos e a build da D9', () => {
    const e = abrir();
    expect(e.progresso[PROGRESSAO.nivel]).toBe(29);
    expect(e.progresso[PROGRESSAO.xp]).toBe(0);
    expect(e.progresso[PROGRESSAO.niveisPendentes]).toBe(0);
    expect(e.jogador[JOGADOR.hp]).toBe(e.jogador2[JOGADOR2.hpMax]);
    expect(e.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(3);
    expect([...e.build.nivel.slice(0, 3)]).toEqual([8, 8, 8]);
    expect(e.cab[CAB.relogio]).toBe(71970);
  });

  it('a arena forma no passo 30 e o chefe tem 14.040 de HP', () => {
    const e = abrir();
    avancar(e, dados, PARADO, 29);
    expect(e.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
    avancar(e, dados, PARADO, 1);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.chefe);
    expect(e.chefeU16[CHEFE_U16.slot]).not.toBe(SEM_CHEFE);
    expect(e.chefeF32[CHEFE_F32.hpMax]).toBe(14040);
  });
});
