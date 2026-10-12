// Os cenários da F-008 (design/decisoes-F-008.md CE1): fogueira_hora1 e marco_coroado.
import { describe, expect, it } from 'vitest';
import { criarEstado, CAB, ETAPA, FOGUEIRA_U8, JOGADOR, JOGADOR2, JOGADOR4_U8, PROGRESSAO, TODOS_OS_TUTORIAIS } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { RECEITAS, parametrosDoCenario, prepararFogueiraDoCenario } from '../../src/plataforma/cenarios';
import { criarDadosDaCharneca } from '../../src/plataforma/dadosDaVigilia';
import { PARADO } from '../logica/apoio';

const dados = criarDadosDaCharneca();
const abrir = (id: string) => {
  const e = criarEstado(1, dados, { ...parametrosDoCenario(id), teto: 300 });
  prepararFogueiraDoCenario(e, id);
  return e;
};

describe('cenários da F-008', () => {
  it('as duas receitas existem', () => {
    expect(RECEITAS.map((r) => r.id)).toEqual(expect.arrayContaining(['fogueira_hora1', 'marco_coroado']));
  });

  it('fogueira_hora1: relógio 18.000, Espada nv8 + Elmo, 400 Almas, 1 Frasco, HP 50%; o 1º passo abre a Fogueira da Hora I', () => {
    const e = abrir('fogueira_hora1');
    expect(e.cab[CAB.relogio]).toBe(18000);
    expect(e.progresso[PROGRESSAO.almas]).toBe(400);
    expect(e.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(1);
    expect(e.jogador[JOGADOR.hp]).toBeCloseTo(e.jogador2[JOGADOR2.hpMax]! / 2, 3);
    expect(e.build.nivel[0]).toBe(8);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.hora);
    avancar(e, dados, PARADO, 1);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.fogueira);
    expect(e.fogueiraU8[FOGUEIRA_U8.fogueiraHora]).toBe(1);
    expect(e.fogueiraU8[FOGUEIRA_U8.marcosIniciados]).toBe(1);
  });

  it('marco_coroado: relógio 17.970; a arena se forma no passo 30', () => {
    const e = abrir('marco_coroado');
    expect(e.cab[CAB.relogio]).toBe(17970);
    avancar(e, dados, PARADO, 29);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(0);
    avancar(e, dados, PARADO, 1);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    expect(e.fogueiraU8[FOGUEIRA_U8.coroadosVivos]).toBe(1);
  });

  it('um tutorial visto em ambos', () => {
    expect(parametrosDoCenario('fogueira_hora1').tutoriaisVistos).toBe(TODOS_OS_TUTORIAIS);
  });
});
