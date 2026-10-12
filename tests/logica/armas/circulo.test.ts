// Círculo de Sal: tick, borda da aura (F-004.3), Sal (F-004.2, S1) e pulso
// de afastamento (K1) (design/decisoes-F-004.md §2, §3 e §8).
import { describe, expect, it } from 'vitest';
import { rodarArmas } from '../../../src/logica/armas/armas';
import { ACERTO, acertar } from '../../../src/logica/armas/acerto';
import { ARMA, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { CAPACIDADE_DE_INIMIGOS, JOGADOR, equiparArma, esvaziarBuild, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { EMPURRAO, empurroesDoPasso } from '../../../src/logica/mundo/horda';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { distanciaAoObstaculoMaisProximo } from './geometria';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as D, PARADO, dadosDe } from '../apoio';
import { J, estadoCom, eventos, por, rel } from './apoio';

const C = ARMA.circulo_de_sal;
const F = ARMA.facas_de_sal;
const RAIO = [0, 64, 73.6, 73.6, 73.6, 83.2, 83.2, 83.2, 96];

/** Um tick direto (sem o passo, que moveria os inimigos): devolve os slots que perderam HP. */
function tickDireto(e: Estado): number[] {
  const antes = Array.from(e.inimigos.hp);
  e.build.recarga[0] = 0;
  e.build.esperaPulso[0] = 1;
  rodarArmas(e, D);
  const l: number[] = [];
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) if (e.pool.posicao[s]! >= 0 && e.inimigos.hp[s]! < antes[s]!) l.push(s);
  return l;
}

describe('aura acerta a 2 corpos e não a 2,1 (F-004.3, W3)', () => {
  it('Oco com centro a 80 px (borda a 64) leva; a 83,2 px (borda a 67,2) não; médio a 88 e 91,2; nos 4 eixos', () => {
    const eixos = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const;
    for (const [ux, uy] of eixos) {
      for (const [tipo, d, esperado] of [
        [TIPO.oco_das_lanternas, 80, true],
        [TIPO.oco_das_lanternas, 83.2, false],
        [TIPO.oco_grande, 88, true],
        [TIPO.oco_grande, 91.2, false],
      ] as const) {
        const e = estadoCom([[C, 1]]);
        const s = por(e, tipo, ux * d, uy * d);
        expect(tickDireto(e).includes(s), `tipo ${tipo} a ${d} em (${ux}, ${uy})`).toBe(esperado);
      }
    }
  });

  it('exatamente R + r com coordenada exata (585 + 80 = 665) leva e R + r + 1/16 não; cruzando a costura também', () => {
    const e = estadoCom([[C, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 80, 0);
    expect(e.inimigos.x[s]).toBe(665);
    expect(tickDireto(e)).toEqual([s]);
    const f = estadoCom([[C, 1]]);
    const t = por(f, TIPO.oco_das_lanternas, 80 + 1 / 16, 0);
    expect(tickDireto(f)).toEqual([]);
    void t;
    // Costura: jogador em (5, 1.266) e Oco em (1.095, 1.266), a 80 px pelo toro.
    const g = estadoCom([[C, 1]]);
    g.jogador[JOGADOR.x] = g.jogador[JOGADOR.xAnt] = 5;
    const u = nascerInimigo(g, D, TIPO.oco_das_lanternas, 1095, 1266, false);
    expect(tickDireto(g)).toEqual([u]);
    // Costura em y: jogador em (585, 10) e Oco em (585, 2.462), a 80 px pelo toro (achado A4 do crítico).
    const h = estadoCom([[C, 1]]);
    h.jogador[JOGADOR.y] = h.jogador[JOGADOR.yAnt] = 10;
    const v = nascerInimigo(h, D, TIPO.oco_das_lanternas, 585, 2462, false);
    expect(tickDireto(h)).toEqual([v]);
  });

  it('por nível: leva a R(nv) + r − 1/16 e não a R(nv) + r + 1/16; na fronteira exata quando a coordenada é exata em Float32', () => {
    for (let nivel = 1; nivel <= 8; nivel++) {
      for (const [folga, esperado] of [
        [-1 / 16, true],
        [1 / 16, false],
      ] as const) {
        const e = estadoCom([[C, nivel]]);
        const s = por(e, TIPO.oco_das_lanternas, 0, -(RAIO[nivel]! + 16 + folga));
        expect(tickDireto(e).includes(s), `nv${nivel} folga ${folga}`).toBe(esperado);
      }
      const x = 585 + RAIO[nivel]! + 16;
      if (Math.fround(x) === x) {
        const e = estadoCom([[C, nivel]]);
        const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, x, 1266, false);
        expect(tickDireto(e), `nv${nivel} exato`).toEqual([s]);
      }
    }
  });
});

describe('tick (W14) e timers (W16)', () => {
  it('Oco Grande parado a 48 px na aura nv1 por 600 passos: HP de 100 a exatamente 85, ticks em 1, 31, 61…', () => {
    const e = estadoCom([[C, 1]]);
    const s = por(e, TIPO.oco_grande, 0, -48);
    avancar(e, D, PARADO, 600);
    expect(e.inimigos.hp[s]).toBe(85);
    const ticks = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.forma === FORMA.tick).map((v) => v.passo);
    expect(ticks).toEqual(Array.from({ length: 20 }, (_, k) => 1 + 30 * k));
  });

  it('um Círculo equipado depois do passo t tica em t + 1 e t + 31; subir de nível não reinicia o timer', () => {
    const e = estadoCom([]);
    avancar(e, D, PARADO, 10);
    equiparArma(e, D, C, 1);
    const s = por(e, TIPO.oco_grande, 0, -48);
    avancar(e, D, PARADO, 20);
    e.build.nivel[0] = 3;
    avancar(e, D, PARADO, 20);
    const ticks = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s).map((v) => [v.passo, v.f[2]]);
    expect(ticks).toEqual([
      [11, 0.75],
      [41, Math.fround(0.9)],
    ]);
  });
});

describe('Sal (F-004.2; S1)', () => {
  /** Deslocamento por passo de um Oco a 400 px no eixo y, sem armas: medido pelo delta toroidal. */
  function passos(e: Estado, s: number, n: number): number[] {
    const l: number[] = [];
    for (let k = 0; k < n; k++) {
      const antes = rel(e, s).d;
      avancar(e, D, PARADO, 1);
      l.push(antes - rel(e, s).d);
    }
    return l;
  }

  it('a Noviça salgada a 50% (mantém distância) se aproxima e recua com metade da velocidade base', () => {
    const v = D.tipos.velocidade[TIPO.novica_de_sal]!;
    // A 400 px ela se aproxima (o delta é +v/2); a 60 px, dentro dos 128, recua (−v/2).
    for (const [d, sinal] of [
      [400, 1],
      [60, -1],
    ] as const) {
      const e = estadoCom([]);
      const s = por(e, TIPO.novica_de_sal, 0, -d);
      e.inimigos.salPct[s] = 50;
      e.inimigos.salPassos[s] = 180;
      const [delta] = passos(e, s, 1);
      expect(Math.abs(delta! - (sinal * v) / 2), `a ${d} px`).toBeLessThanOrEqual(1e-3);
    }
  });

  it('(a) 50% por exatamente 180 passos: 0,66 px de t + 1 a t + 180 e 1,32 no t + 181; com 60%, 0,528', () => {
    for (const [pct, devagar] of [
      [50, 0.66],
      [60, 0.528],
    ] as const) {
      const e = estadoCom([]);
      const s = por(e, TIPO.oco_das_lanternas, 0, -400);
      avancar(e, D, PARADO, 3);
      e.inimigos.salPct[s] = pct;
      e.inimigos.salPassos[s] = 180;
      const d = passos(e, s, 182);
      for (let k = 0; k < 180; k++) expect(Math.abs(d[k]! - devagar), `passo ${k + 1}`).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(d[180]! - 1.32)).toBeLessThanOrEqual(1e-3);
      expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]]).toEqual([0, 0]);
    }
  });

  it('(b) uma faca nv4 acerta um Oco a 190 px: Sal 50% por 180 passos; sem armas, o passo seguinte anda 0,66', () => {
    const e = estadoCom([[F, 4]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -190);
    let k = 0;
    while (e.inimigos.salPassos[s] === 0 && k++ < 40) avancar(e, D, PARADO, 1);
    expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]]).toEqual([50, 180]);
    esvaziarBuild(e);
    expect(Math.abs(passos(e, s, 1)[0]! - 0.66)).toBeLessThanOrEqual(1e-3);
  });

  it('(c) um Oco salgado durante um empurrão do pulso continua com o Sal contando uma vez por passo', () => {
    const e = estadoCom([]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -60);
    e.inimigos.salPct[s] = 50;
    e.inimigos.salPassos[s] = 180;
    e.inimigos.kbPassos[s] = 5;
    avancar(e, D, PARADO, 5);
    expect([e.inimigos.salPassos[s], e.inimigos.kbPassos[s]]).toEqual([175, 0]);
  });

  it('(d) um par sobreposto em 4 px e salgado a 50% separa com o limite da velocidade base (1,32, não 0,66)', () => {
    const e = estadoCom([]);
    // Longe do jogador, um em cima do outro, os dois a 28 px.
    const a = por(e, TIPO.oco_das_lanternas, -300, 400);
    const b = por(e, TIPO.oco_das_lanternas, -300, 428);
    for (const s of [a, b]) {
      e.inimigos.salPct[s] = 50;
      e.inimigos.salPassos[s] = 180;
    }
    avancar(e, D, PARADO, 1);
    expect(empurroesDoPasso[EMPURRAO.separacao2]).toBeCloseTo(1.32 * 1.32, 9);
  });

  it('reaplicação (S1) pelo acerto: 60% no passo t e 50% no t + 100 dão 40% da velocidade até o t + 280 e cheia no t + 281', () => {
    const e = estadoCom([]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -600);
    ACERTO[0] = 0;
    acertar(e, s, C, FORMA.tick, 60, 180);
    const d1 = passos(e, s, 100);
    // A aplicação de 50% no passo t + 100, pelo mesmo caminho da fase de armas: máximo campo a campo.
    acertar(e, s, F, FORMA.faca, 50, 180);
    expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]]).toEqual([60, 180]);
    const d2 = passos(e, s, 181);
    expect([...d1, ...d2].slice(0, 280).every((v) => Math.abs(v - 0.528) <= 1e-3)).toBe(true);
    expect(Math.abs(d2[180]! - 1.32)).toBeLessThanOrEqual(1e-3);
  });

  it('reaplicação (S1) no mesmo passo: as duas ordens dão o maior fator e a maior duração, campo a campo', () => {
    for (const [a, b, esperado] of [
      [[60, 180], [50, 180], [60, 180]],
      [[50, 180], [60, 180], [60, 180]],
      [[60, 100], [50, 180], [60, 180]],
      [[50, 180], [60, 100], [60, 180]],
    ] as const) {
      const e = estadoCom([]);
      const s = por(e, TIPO.oco_grande, 0, -600);
      ACERTO[0] = 0;
      acertar(e, s, F, FORMA.faca, a[0], a[1]);
      acertar(e, s, C, FORMA.tick, b[0], b[1]);
      expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]], `${a} e depois ${b}`).toEqual(esperado);
    }
  });

  it('o tick da aura aplica o Sal do nível (50% do nv1 ao nv3, 60% do nv4 em diante), renovado a cada tick', () => {
    for (const [nivel, pct] of [
      [1, 50],
      [3, 50],
      [4, 60],
      [8, 60],
    ] as const) {
      const e = estadoCom([[C, nivel]]);
      const s = por(e, TIPO.oco_grande, 0, -48);
      avancar(e, D, PARADO, 1);
      expect([e.inimigos.salPct[s], e.inimigos.salPassos[s]], `nv${nivel}`).toEqual([pct, 180]);
      avancar(e, D, PARADO, 30);
      expect(e.inimigos.salPassos[s]).toBe(180);
    }
  });
});

describe('pulso do nv7 (K1)', () => {
  it('sem obstáculos, um Oco a 40 px no nv7 (R = 83,2) recebe 8 passos e termina a 104 px; o pulso seguinte vem 300 passos depois', () => {
    const e = estadoCom([[C, 7]]);
    // A 41,32 px: no passo 1 ele anda 1,32 e o pulso o pega a 40 px.
    const s = por(e, TIPO.oco_das_lanternas, 0, -41.32);
    avancar(e, D, PARADO, 1);
    expect(Math.abs(rel(e, s).d - 40)).toBeLessThanOrEqual(1e-3);
    expect(e.inimigos.kbPassos[s]).toBe(8);
    avancar(e, D, PARADO, 8);
    expect(Math.abs(rel(e, s).d - 104)).toBeLessThanOrEqual(1e-3);
    expect(e.inimigos.kbPassos[s]).toBe(0);
    avancar(e, D, PARADO, 300);
    const pulsos = eventos(e).filter((v) => v.tipo === EVENTO.pulso).map((v) => v.passo);
    expect(pulsos).toEqual([1, 301]);
  });

  it('um anel de 7 Ocos encostados termina todo a d ≥ 99,2 − 1e-3, cada corpo andando < 16 px por passo', () => {
    const e = estadoCom([[C, 7]]);
    const anel = Array.from({ length: 7 }, (_, k) => por(e, TIPO.oco_das_lanternas, 32 * Math.cos((2 * Math.PI * k) / 7), 32 * Math.sin((2 * Math.PI * k) / 7)));
    avancar(e, D, PARADO, 1);
    let maior = 0;
    for (let k = 0; k < 12; k++) {
      avancar(e, D, PARADO, 1);
      maior = Math.max(maior, empurroesDoPasso[EMPURRAO.total2]!);
    }
    for (const s of anel) expect(rel(e, s).d).toBeGreaterThanOrEqual(99.2 - 1e-3);
    expect(Math.sqrt(maior)).toBeLessThan(16);
  });

  it('centros coincidentes não geram NaN (afastamento para +x); fora da aura ninguém recebe afastamento', () => {
    const e = estadoCom([[C, 7]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, 0);
    const longe = por(e, TIPO.oco_das_lanternas, 0, -200);
    avancar(e, D, PARADO, 10);
    expect(Number.isNaN(e.inimigos.x[s]) || Number.isNaN(e.inimigos.y[s])).toBe(false);
    expect(e.inimigos.kbPassos[longe]).toBe(0);
  });

  it('contra um obstáculo, o Oco empurrado para fora dele; em 1.000 pulsos aleatórios na Charneca, nenhum corpo termina dentro de obstáculo', () => {
    let semente = 99;
    const u = (): number => ((semente = (Math.imul(semente, 1103515245) + 12345) >>> 0) / 2 ** 32);
    const dados = DADOS_DA_CHARNECA;
    let dentro = 0;
    for (let caso = 0; caso < 1000; caso++) {
      const e = estadoCom([[C, 7]], dados);
      // O jogador num ponto aleatório (sobre o chão) e um Oco encostado numa direção aleatória.
      const x = u() * 1170;
      const y = u() * 2532;
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = Math.fround(x);
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = Math.fround(y);
      const a = u() * 2 * Math.PI;
      const s = nascerInimigo(e, dados, TIPO.oco_das_lanternas, Math.fround((x + 40 * Math.cos(a) + 1170) % 1170), Math.fround((y + 40 * Math.sin(a) + 2532) % 2532), false);
      avancar(e, dados, PARADO, 13);
      if (distanciaAoObstaculoMaisProximo(dados, e.inimigos.x[s]!, e.inimigos.y[s]!) < 16 - 1e-3) dentro++;
    }
    expect(dentro).toBe(0);
    // Um caso fixo: obstáculo logo atrás do Oco, na linha do empurrão.
    const comObstaculo = dadosDe({ obstaculos: [{ x: J.x, y: J.y - 90, tamanho_px: 40 }] });
    const f = estadoCom([[C, 7]], comObstaculo);
    const s = por(f, TIPO.oco_das_lanternas, 0, -40, comObstaculo);
    avancar(f, comObstaculo, PARADO, 13);
    expect(distanciaAoObstaculoMaisProximo(comObstaculo, f.inimigos.x[s]!, f.inimigos.y[s]!)).toBeGreaterThanOrEqual(16 - 1e-3);
  });

  it('o pulso não dá dano nem Sal: só o tick do mesmo passo acerta', () => {
    const e = estadoCom([[C, 7]]);
    por(e, TIPO.oco_grande, 0, -48);
    avancar(e, D, PARADO, 1);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto);
    expect(acertos.map((v) => v.forma)).toEqual([FORMA.tick]);
    const tab = D.armas;
    expect(tab.pulso[indiceDoNivel(C, 7)]).toBe(1);
  });

  it('o estado continua determinístico com o pulso (duas execuções, mesmo hash)', () => {
    const h = [0, 1].map(() => {
      const e = estadoCom([[C, 8]]);
      for (let k = 0; k < 7; k++) por(e, TIPO.oco_das_lanternas, 50 * Math.cos(k), 50 * Math.sin(k));
      avancar(e, D, PARADO, 400);
      return hashEstado(e);
    });
    expect(h[0]).toBe(h[1]);
  });
});
