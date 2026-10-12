// União e onda (design/decisoes-F-005.md §4, U1 a U6; F-005.6).
import { describe, expect, it } from 'vitest';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import armas from '../../../src/dados/armas.json';
import inimigos from '../../../src/dados/inimigos.json';
import vigilantes from '../../../src/dados/vigilantes.json';
import { criarOnda, rodarOndas } from '../../../src/logica/armas/ondas';
import { indiceDoNivel, GOLPES_MAXIMOS, type ArmaDoJson } from '../../../src/logica/armas/tabela';
import { CAB, MUNDO2, hashEstado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { alocar } from '../../../src/logica/nucleo/pool';
import { avancar } from '../../../src/logica/nucleo/passo';
import { criarDadosDaVigilia } from '../../../src/logica/mundo/dados';
import { grade, listarVivos, vivos } from '../../../src/logica/mundo/horda';
import { reconstruirGrade } from '../../../src/logica/mundo/grade';
import { removerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { aplicarUniao } from '../../../src/logica/progressao/bau';
import { danoVivo } from '../../../src/logica/progressao/dano';
import { FONTES_DA_PROGRESSAO, PARADO } from '../apoio';
import { eventos, por } from '../armas/apoio';
import { D, ELMO, ESPADA, LAMINA, LUVAS, estadoDe } from './apoio';

const t = D.armas;

describe('números da União (U1; F-005.6)', () => {
  it('base 21 = base da Espada nv8 (14) × 1,5, ±1%; golpe de 17,325 com FOR 6; recarga 60; 12 passos entre golpes', () => {
    const baseEspada8 = (t.danoBase[ESPADA]! * (100 + t.somaDanoPct[indiceDoNivel(ESPADA, 8)]!)) / 100;
    expect(baseEspada8).toBe(14);
    expect(Math.abs(t.danoBase[LAMINA]! / (baseEspada8 * 1.5) - 1)).toBeLessThanOrEqual(0.01);
    expect(t.danoBase[LAMINA]).toBe(21);
    expect(t.danoDoNivel[indiceDoNivel(LAMINA, 1)]).toBeCloseTo(17.325, 12);
    expect(Math.fround(t.danoDoNivel[indiceDoNivel(LAMINA, 1)]!)).toBe(Math.fround(17.325));
    expect([t.periodo[LAMINA], t.intervaloGolpes[LAMINA]]).toEqual([60, 12]);
  });

  it('herda os 4 golpes e as formas do nv8 da Espada (ida, volta, estocada, ida) e os tamanhos (76,8; 115,2 × 19,2)', () => {
    const iu = indiceDoNivel(LAMINA, 1);
    const ie = indiceDoNivel(ESPADA, 8);
    expect(t.golpes[iu]).toBe(4);
    expect([...t.formaDoGolpe.slice(iu * GOLPES_MAXIMOS, iu * GOLPES_MAXIMOS + 4)]).toEqual([FORMA.ida, FORMA.volta, FORMA.estocada, FORMA.ida]);
    expect([...t.formaDoGolpe.slice(iu * GOLPES_MAXIMOS, iu * GOLPES_MAXIMOS + 4)]).toEqual([...t.formaDoGolpe.slice(ie * GOLPES_MAXIMOS, ie * GOLPES_MAXIMOS + 4)]);
    expect([t.alcance[iu], t.estocadaL[iu], t.estocadaW[iu]]).toEqual([t.alcance[ie], t.estocadaL[ie], t.estocadaW[ie]]);
  });

  it('dano vivo: FOR 6 / 20 × Espada nv1 e nv8 e União, e as Luvas nv5 no Poder (tabela literal)', () => {
    const e = estadoDe([[ESPADA, 1]]);
    expect([danoVivo(e, ESPADA, 1), danoVivo(e, ESPADA, 8), danoVivo(e, LAMINA, 1)]).toEqual(
      [t.danoDoNivel[indiceDoNivel(ESPADA, 1)], t.danoDoNivel[indiceDoNivel(ESPADA, 8)], t.danoDoNivel[indiceDoNivel(LAMINA, 1)]],
    );
    expect(danoVivo(e, ESPADA, 1)).toBe(6.75);
    const f20 = estadoDe([[ESPADA, 1]], [], { xpInicial: 20000 });
    avancar(f20, D, PARADO, 1);
    expect(f20.atributos[0]).toBe(20);
    expect(danoVivo(f20, ESPADA, 1)).toBeCloseTo(17.25, 12);
    expect(danoVivo(f20, ESPADA, 8)).toBeCloseTo(24.15, 12);
    expect(danoVivo(f20, LAMINA, 1)).toBeCloseTo(46.725, 12);
    const luvas = estadoDe([[ESPADA, 1]], [[LUVAS, 5]]);
    expect(danoVivo(luvas, ESPADA, 1)).toBeCloseTo(6.75 * 1.4, 12);
    expect(Math.fround(luvas.derivados.danoOnda[LAMINA]!)).toBe(Math.fround(6.6 * 1.4));
  });

  it('a onda: dano 6,6 com FOR 6, vida 15, 384 px por 60 passos, meia-largura 16', () => {
    const e = estadoDe([[LAMINA, 1]]);
    expect(Math.fround(e.derivados.danoOnda[LAMINA]!)).toBe(Math.fround(6.6));
    expect([t.ondaVida[LAMINA], t.ondaPxPor60[LAMINA], t.ondaMeia[LAMINA]]).toEqual([15, 384, 16]);
    expect([t.ondaVida[ESPADA], t.ondaVida[LUVAS]]).toEqual([0, 0]);
  });
});

describe('a União entra na vaga da Espada (U2)', () => {
  it('na mesma vaga, nv1, timers em 0; o Elmo continua; golpes em t + 1, 13, 25, 37 e o ciclo seguinte em t + 61, cada um com 1 onda', () => {
    const e = estadoDe([[ESPADA, 8]], [[ELMO, 3]]);
    e.build.golpe[0] = 2;
    e.build.recarga[0] = 40;
    aplicarUniao(e, D, 0);
    expect([e.build.codigo[0], e.build.nivel[0], e.build.recarga[0], e.build.golpe[0], e.build.esperaGolpe[0]]).toEqual([LAMINA, 1, 0, 0, 0]);
    expect([e.passivas.codigo[0], e.passivas.nivel[0]]).toEqual([ELMO, 3]);
    const t0 = e.cab[CAB.passo]!;
    avancar(e, D, PARADO, 62);
    const golpes = eventos(e).filter((x) => x.tipo === EVENTO.golpe).map((x) => x.passo - t0);
    const ondas = eventos(e).filter((x) => x.tipo === EVENTO.onda).map((x) => x.passo - t0);
    expect(golpes).toEqual([1, 13, 25, 37, 61]);
    expect(ondas).toEqual(golpes);
  });
});

/** Dados com a Espada sintética: 1 golpe e um bloco onda (o código não depende do id). */
function dadosComOndaNaEspada(): typeof D {
  const copia = JSON.parse(JSON.stringify(armas.armas)) as { id: string; base: Record<string, unknown> }[];
  copia.find((a) => a.id === 'espada_longa_do_juramento')!.base['onda'] = { comprimento_corpos: 3, dano: 8, largura_corpos: 1, velocidade_corpos_s: 12 };
  return criarDadosDaVigilia({ ...charneca, obstaculos: [] }, vigilantes.vigilantes[0]!, inimigos.inimigos, copia as unknown as ArmaDoJson[], FONTES_DA_PROGRESSAO);
}

/** Roda só a fase das ondas, com a grade refeita (os inimigos ficam parados). */
function rodarSoAsOndas(e: ReturnType<typeof estadoDe>, dados: typeof D, passos: number): void {
  for (let k = 0; k < passos; k++) {
    e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
    const n = listarVivos(e);
    reconstruirGrade(grade, e.inimigos.x, e.inimigos.y, vivos, n);
    rodarOndas(e, dados);
  }
}

describe('geometria e acertos da onda (U3, U4; F-005.6)', () => {
  it('arma sintética com onda: sem o bloco, nenhuma onda; com ele, 1 por golpe', () => {
    const semOnda = estadoDe([[ESPADA, 1]]);
    avancar(semOnda, D, PARADO, 80);
    expect(eventos(semOnda).filter((x) => x.tipo === EVENTO.onda)).toHaveLength(0);
    const d2 = dadosComOndaNaEspada();
    const com = estadoDe([[ESPADA, 1]], [], {}, 1, d2);
    avancar(com, d2, PARADO, 80);
    expect(eventos(com).filter((x) => x.tipo === EVENTO.onda).map((x) => x.passo)).toEqual([1, 73]);
  });

  it('um Oco parado no percurso leva exatamente 1 acerto de onda em 15 passos; a 128 px no eixo leva, a 128 + 1/16 não', () => {
    const d2 = dadosComOndaNaEspada();
    for (const [dist, esperado] of [
      [60, 1],
      [128, 1],
      [128.0625, 0],
    ] as const) {
      const e = estadoDe([], [], {}, 1, d2);
      const s = por(e, TIPO.oco_das_lanternas, 0, -dist, d2);
      e.inimigos.hp[s] = 1000;
      criarOnda(e, ESPADA);
      rodarSoAsOndas(e, d2, 20);
      const acertos = eventos(e).filter((x) => x.tipo === EVENTO.acerto && x.forma === FORMA.onda);
      expect(acertos.length, `${dist} px`).toBe(esperado);
      // A Espada sintética escala com FOR C / DES C: 8 × 0,675 = 5,4 (na União, 8 × 0,825 = 6,6).
      if (esperado) expect(acertos[0]!.f[2]).toBe(Math.fround(5.4));
    }
  });

  it('a onda acerta na costura do toro em y e não acerta para trás', () => {
    const d2 = dadosComOndaNaEspada();
    const e = estadoDe([], [], {}, 1, d2);
    e.jogador[1] = e.jogador[3] = 20;
    const frente = por(e, TIPO.oco_das_lanternas, 0, -1266 - 60, d2);
    const tras = por(e, TIPO.oco_das_lanternas, 0, -1266 + 60, d2);
    e.inimigos.hp[frente] = e.inimigos.hp[tras] = 1000;
    criarOnda(e, ESPADA);
    rodarSoAsOndas(e, d2, 16);
    const alvos = eventos(e).filter((x) => x.tipo === EVENTO.acerto && x.forma === FORMA.onda).map((x) => x.slot);
    expect(alvos).toEqual([frente]);
  });

  it('o slot reaproveitado não herda a marca: removido e renascido no mesmo slot, o inimigo novo leva a onda', () => {
    const d2 = dadosComOndaNaEspada();
    const e = estadoDe([], [], {}, 1, d2);
    const s = por(e, TIPO.oco_das_lanternas, 0, -40, d2);
    e.inimigos.hp[s] = 1000;
    criarOnda(e, ESPADA);
    rodarSoAsOndas(e, d2, 5);
    removerInimigo(e, s);
    const s2 = por(e, TIPO.oco_das_lanternas, 0, -80, d2);
    expect(s2).toBe(s);
    e.inimigos.hp[s2] = 1000;
    rodarSoAsOndas(e, d2, 10);
    expect(eventos(e).filter((x) => x.tipo === EVENTO.acerto && x.forma === FORMA.onda).map((x) => x.slot)).toEqual([s, s]);
  });

  it('com a Lâmina real, nenhuma onda acerta o mesmo inimigo duas vezes, e ninguém leva mais de 2 acertos de onda em 15 passos', () => {
    const e = estadoDe([[LAMINA, 1]]);
    for (let k = 0; k < 6; k++) e.inimigos.hp[por(e, TIPO.oco_grande, -40 + k * 16, -50 - k * 12)] = 5000;
    avancar(e, D, PARADO, 240);
    const ondas = eventos(e).filter((x) => x.forma === FORMA.onda && x.tipo === EVENTO.acerto);
    expect(ondas.length).toBeGreaterThan(0);
    for (const a of ondas) {
      const janela = ondas.filter((b) => b.alvo === a.alvo && b.passo > a.passo - 15 && b.passo <= a.passo);
      expect(janela.length).toBeLessThanOrEqual(2);
    }
  });

  it('recusa: com o pool de efeitos cheio, a onda não nasce, efeitosRecusados = 1 e nenhum evento onda sai; o limite soma projéteis e efeitos', () => {
    const e = estadoDe([[LAMINA, 1]]);
    // Ondas vivas da própria Lâmina (as de arma 0 sairiam na fase 7b' antes do golpe).
    for (let k = 0; k < 64; k++) e.efeitos.arma[alocar(e.poolDeEfeitos)] = LAMINA;
    avancar(e, D, PARADO, 1);
    expect(e.mundo2[MUNDO2.efeitosRecusados]).toBe(1);
    expect(eventos(e).filter((x) => x.tipo === EVENTO.onda)).toHaveLength(0);
    const f = estadoDe([[LAMINA, 1]]);
    for (let k = 0; k < 200; k++) f.projeteis.vida[alocar(f.poolDeProjeteis)] = 100;
    avancar(f, D, PARADO, 1);
    expect(f.mundo2[MUNDO2.efeitosRecusados]).toBe(1);
  });

  it('o mesmo roteiro com a Lâmina dá o mesmo hash com 1 e 5 passos por chamada', () => {
    const montar = () => {
      const e = estadoDe([[LAMINA, 1]]);
      for (let k = 0; k < 10; k++) por(e, TIPO.oco_das_lanternas, -90 + k * 20, -70);
      return e;
    };
    const a = montar();
    const b = montar();
    avancar(a, D, PARADO, 300);
    for (let k = 0; k < 60; k++) avancar(b, D, PARADO, 5);
    expect(hashEstado(a)).toBe(hashEstado(b));
  });
});
