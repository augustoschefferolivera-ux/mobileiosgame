// Ondas da União: o que os testes da progressão não fixavam (mutações do crítico
// da F-005): ordem e floats do evento golpe (A3), raio da consulta pelo canto do
// quadrado (A8) e dano fixado na criação (A9).
import { describe, expect, it } from 'vitest';
import { criarOnda, rodarOndas } from '../../../src/logica/armas/ondas';
import { CAB, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { reconstruirGrade } from '../../../src/logica/mundo/grade';
import { grade, listarVivos, vivos } from '../../../src/logica/mundo/horda';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { recalcularDano } from '../../../src/logica/progressao/atributos';
import { PARADO } from '../apoio';
import { D, ESPADA, LAMINA, LUVAS, estadoDe } from '../progressao/apoio';
import { eventos, por } from './apoio';

/** Roda só a fase das ondas, com a grade refeita (os inimigos ficam parados). */
function rodarSoAsOndas(e: Estado, passos: number): void {
  for (let k = 0; k < passos; k++) {
    e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
    reconstruirGrade(grade, e.inimigos.x, e.inimigos.y, vivos, listarVivos(e));
    rodarOndas(e, D);
  }
}

const acertosDeOnda = (e: Estado) => eventos(e).filter((x) => x.tipo === EVENTO.acerto && x.forma === FORMA.onda);

describe('evento golpe da Lâmina (A3)', () => {
  it('no 1º golpe, o evento golpe traz os floats do golpe (mira, alcance, 0) e sai antes do evento onda, no mesmo passo', () => {
    const e = estadoDe([[LAMINA, 1]]);
    avancar(e, D, PARADO, 1);
    const evs = eventos(e);
    const golpe = evs.findIndex((x) => x.tipo === EVENTO.golpe);
    const onda = evs.findIndex((x) => x.tipo === EVENTO.onda);
    expect(golpe).toBeGreaterThanOrEqual(0);
    expect(onda).toBeGreaterThan(golpe);
    expect(evs[golpe]!.passo).toBe(evs[onda]!.passo);
    expect(evs[golpe]!.forma).toBe(FORMA.ida);
    // Os mesmos floats que a Espada nv8 grava no 1º golpe (ida) na mesma posição e mira.
    const espada = estadoDe([[ESPADA, 8]]);
    avancar(espada, D, PARADO, 1);
    const golpeDaEspada = eventos(espada).find((x) => x.tipo === EVENTO.golpe)!;
    expect(evs[golpe]!.f).toEqual(golpeDaEspada.f);
    // E não os da onda (posição do jogador e mira).
    expect(evs[golpe]!.f).not.toEqual(evs[onda]!.f);
    expect(evs[golpe]!.f[2]).toBeGreaterThan(0);
  });
});

describe('consulta da onda pelo canto do quadrado (A8)', () => {
  it('um Oco Grande (r 24) no canto dianteiro, a mais de meia + r do centro e a menos de √2·meia + r, leva o acerto no 1º passo da onda', () => {
    const e = estadoDe([[LAMINA, 1]]);
    criarOnda(e, LAMINA);
    // Mira (0, −1); no idade 1 o centro está 6,4 px à frente. Local (a, b) = (30, 30): distância ao centro 42,4 (> 16 + 24 = 40, < 22,6 + 24),
    // e o canto (16, 16) fica a 19,8 < 24 da hitbox.
    const s = por(e, TIPO.oco_grande, 30, -6.4 - 30);
    e.inimigos.hp[s] = 1000;
    rodarSoAsOndas(e, 1);
    expect(acertosDeOnda(e).map((x) => x.slot)).toEqual([s]);
  });
});

describe('dano da onda fixado na criação (A9)', () => {
  it('Poder e FOR que mudam com a onda viva não mudam o acerto dela', () => {
    const e = estadoDe([[LAMINA, 1]]);
    const criado = e.derivados.danoOnda[LAMINA]!;
    criarOnda(e, LAMINA);
    e.passivas.codigo[0] = LUVAS;
    e.passivas.nivel[0] = 5;
    e.atributos[0] = 20;
    recalcularDano(e, D);
    expect(e.derivados.danoOnda[LAMINA]).toBeGreaterThan(criado * 1.4);
    const s = por(e, TIPO.oco_grande, 0, -60);
    e.inimigos.hp[s] = 1000;
    rodarSoAsOndas(e, 15);
    const acertos = acertosDeOnda(e);
    expect(acertos).toHaveLength(1);
    expect(acertos[0]!.f[2]).toBe(Math.fround(criado));
  });
});
