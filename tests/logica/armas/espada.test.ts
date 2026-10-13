// Espada Longa: mira, setor, hitbox, golpes por nível, sequência, área e
// estocada (design/decisoes-F-004.md W1 a W8 e W16). As formas são testadas
// com a fase de armas chamada direto (sem o passo, que moveria os inimigos).
import { describe, expect, it } from 'vitest';
import { rodarArmas } from '../../../src/logica/armas/armas';
import { ARMA } from '../../../src/logica/armas/tabela';
import { equiparArma, JOGADOR, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { nascerInimigo, removerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS as D, PARADO, dadosDe } from '../apoio';
import { ancoraDeMira, estadoCom, eventos, por } from './apoio';

const E = ARMA.espada_longa_do_juramento;
const HP_OCO = 12;

/** Um golpe de ida direto (recarga em 0): devolve os slots que perderam HP. */
function golpeDireto(e: Estado): number[] {
  const antes = Array.from(e.inimigos.hp);
  e.build.recarga[0] = 0;
  e.build.golpe[0] = 0;
  rodarArmas(e, D);
  const atingidos: number[] = [];
  for (let s = 0; s < antes.length; s++) if (e.pool.posicao[s]! >= 0 && e.inimigos.hp[s]! < antes[s]!) atingidos.push(s);
  return atingidos;
}

describe('mira (W1)', () => {
  it('numa Vigília nova, o 1º golpe sai para cima: acerta (0, −60) e não (0, +60)', () => {
    const e = estadoCom([[E, 1]]);
    const cima = por(e, TIPO.oco_das_lanternas, 0, -60);
    const baixo = por(e, TIPO.oco_das_lanternas, 0, 60);
    expect(golpeDireto(e)).toEqual([cima]);
    expect(e.inimigos.hp[baixo]).toBe(HP_OCO);
  });

  it('10 passos com intenção (1, 0) e depois nula: o golpe seguinte acerta à direita, não à esquerda; NaN mantém a mira', () => {
    const e = estadoCom([]);
    avancar(e, D, { comandosDoPasso: (_p, out) => ((out.movimento[0] = 1), (out.movimento[1] = 0)) }, 10);
    expect([e.jogador[JOGADOR.dirX], e.jogador[JOGADOR.dirY]]).toEqual([1, 0]);
    // Uma intenção NaN não muda a mira.
    avancar(e, D, { comandosDoPasso: (_p, out) => ((out.movimento[0] = NaN), (out.movimento[1] = NaN)) }, 1);
    avancar(e, D, PARADO, 1);
    expect([e.jogador[JOGADOR.dirX], e.jogador[JOGADOR.dirY]]).toEqual([1, 0]);
    equiparArma(e, D, E, 1);
    const jx = e.jogador[JOGADOR.x]!;
    const jy = e.jogador[JOGADOR.y]!;
    const direita = nascerInimigo(e, D, TIPO.oco_das_lanternas, jx + 60, jy, false);
    const esquerda = nascerInimigo(e, D, TIPO.oco_das_lanternas, jx - 60, jy, false);
    avancar(e, D, PARADO, 1);
    expect(e.inimigos.hp[direita]).toBeLessThan(HP_OCO);
    expect(e.inimigos.hp[esquerda]).toBe(HP_OCO);
  });
});

describe('setor de 120° até a hitbox (W2, W3)', () => {
  it('casos fixos com a mira (0, −1) exata', () => {
    const casos: [number, number, number, boolean][] = [
      [TIPO.oco_das_lanternas, 0, -80, true],
      [TIPO.oco_das_lanternas, 0, -80.5, false],
      [TIPO.oco_grande, 0, -88, true],
      [TIPO.oco_grande, 0, -88.5, false],
      [TIPO.oco_das_lanternas, 32, -2, true],
      [TIPO.oco_das_lanternas, 32, 2, false],
      [TIPO.oco_das_lanternas, 0, 32, false],
      // A 100° e 40 px (25,7 px da borda), nenhum nível acerta.
      [TIPO.oco_das_lanternas, 40 * Math.sin((100 * Math.PI) / 180), -40 * Math.cos((100 * Math.PI) / 180), false],
    ];
    for (const [tipo, dx, dy, esperado] of casos) {
      const e = estadoCom([[E, 1]]);
      ancoraDeMira(e, 0, -1); // a mira automática fica em (0, −1) exato
      const s = por(e, tipo, dx, dy);
      expect(golpeDireto(e).includes(s), `${tipo} em (${dx}, ${dy})`).toBe(esperado);
    }
  });

  it('cruzando a costura: jogador perto de x = 0 e o alvo do outro lado do mapa', () => {
    const e = estadoCom([[E, 1]]);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 5;
    e.jogador[JOGADOR.dirX] = -1;
    e.jogador[JOGADOR.dirY] = 0;
    const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, 1170 - 70, 1266, false);
    expect(golpeDireto(e)).toEqual([s]);
  });

  it('igual a um oráculo geométrico (atan2) em 10.000 casos, com r de 0,5 a 24, inclusive na costura', () => {
    // Raios variados: tipos sintéticos com o tamanho trocado.
    let semente = 12345;
    const u = (): number => ((semente = (Math.imul(semente, 1103515245) + 12345) >>> 0) / 2 ** 32);
    const tamanhos = [1, 32, 48];
    let divergencias = 0;
    for (const tamanho of tamanhos) {
      // O Oco das Lanternas com outro tamanho (só o raio da hitbox muda).
      const dadosR = { ...D, tipos: { ...D.tipos, raio: Float64Array.from(D.tipos.raio, (r, c) => (c === TIPO.oco_das_lanternas ? tamanho / 2 : r)) } };
      const e = estadoCom([[E, 1]], dadosR);
      const r = tamanho / 2;
      for (let k = 0; k < 3334; k++) {
        const ang = u() * 2 * Math.PI;
        const dirX = Math.fround(Math.cos(ang));
        const dirY = Math.fround(Math.sin(ang));
        e.jogador[JOGADOR.dirX] = dirX;
        e.jogador[JOGADOR.dirY] = dirY;
        // Âncora a 1 px na mira (a mira automática segue o inimigo mais próximo); o oráculo usa a mira realizada.
        const ancora = nascerInimigo(e, dadosR, TIPO.oco_das_lanternas, Math.fround(e.jogador[JOGADOR.x]! + dirX), Math.fround(e.jogador[JOGADOR.y]! + dirY), false);
        const ax = e.inimigos.x[ancora]! - e.jogador[JOGADOR.x]!;
        const ay = e.inimigos.y[ancora]! - e.jogador[JOGADOR.y]!;
        const na = Math.hypot(ax, ay);
        const px = (u() - 0.5) * 200;
        const py = (u() - 0.5) * 200;
        const x = e.jogador[JOGADOR.x]! + px;
        const y = e.jogador[JOGADOR.y]! + py;
            const s = nascerInimigo(e, dadosR, TIPO.oco_das_lanternas, Math.fround(x), Math.fround(y), false);
        const qx = e.inimigos.x[s]! - e.jogador[JOGADOR.x]!;
        const qy = e.inimigos.y[s]! - e.jogador[JOGADOR.y]!;
        const dist = distanciaAoSetor(qx, qy, ax / na, ay / na, 64);
        e.build.recarga[0] = 0;
        const antes = e.inimigos.hp[s]!;
        rodarArmas(e, dadosR);
        const acertou = e.inimigos.hp[s]! < antes;
        if (Math.abs(dist - r) > 1e-6 && acertou !== dist <= r) divergencias++;
        removerInimigo(e, s);
        removerInimigo(e, ancora);
      }
    }
    expect(divergencias).toBe(0);
  });
});

/** Distância de um ponto ao setor circular de 120° (raio R, mira dir), pelo ângulo: o oráculo do teste. */
function distanciaAoSetor(px: number, py: number, dirX: number, dirY: number, R: number): number {
  const d = Math.hypot(px, py);
  if (d === 0) return 0;
  const ang = Math.abs(Math.atan2(dirX * py - dirY * px, dirX * px + dirY * py));
  if (ang <= Math.PI / 3) return Math.max(0, d - R);
  // Fora do cone: a borda mais próxima é um dos segmentos.
  const seg = (ex: number, ey: number): number => {
    const t = Math.max(0, Math.min(R, px * ex + py * ey));
    return Math.hypot(px - ex * t, py - ey * t);
  };
  const c = Math.cos(Math.PI / 3);
  const s = Math.sin(Math.PI / 3);
  return Math.min(seg(dirX * c - dirY * s, dirX * s + dirY * c), seg(dirX * c + dirY * s, -dirX * s + dirY * c));
}

describe('alvos e golpes (W4, W5, W6, W16)', () => {
  it('5 Ocos no setor e 1 fora: os 5 perdem o dano de um golpe (6,75), o de fora nada', () => {
    const e = estadoCom([[E, 1]]);
    const dentro = [por(e, TIPO.oco_das_lanternas, 0, -40), por(e, TIPO.oco_das_lanternas, 20, -50), por(e, TIPO.oco_das_lanternas, -20, -50), por(e, TIPO.oco_das_lanternas, 30, -30), por(e, TIPO.oco_das_lanternas, -30, -30)];
    const fora = por(e, TIPO.oco_das_lanternas, 0, 60);
    golpeDireto(e);
    for (const s of dentro) expect(e.inimigos.hp[s]).toBe(Math.fround(HP_OCO - 6.75));
    expect(e.inimigos.hp[fora]).toBe(HP_OCO);
  });

  it('um Oco atrás de um obstáculo, dentro do setor, também leva (D2 O6)', () => {
    const dados = dadosDe({ obstaculos: [{ x: 585, y: 1266 - 40, tamanho_px: 16 }] });
    const e = estadoCom([[E, 1]], dados);
    const s = por(e, TIPO.oco_das_lanternas, 0, -70, dados);
    e.build.recarga[0] = 0;
    rodarArmas(e, dados);
    expect(e.inimigos.hp[s]).toBeLessThan(HP_OCO);
  });

  it('numa Vigília nova, a Espada golpeia nos passos 1, 73 e 145', () => {
    const e = estadoCom([[E, 1]]);
    avancar(e, D, PARADO, 150);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.golpe).map((v) => v.passo)).toEqual([1, 73, 145]);
  });

  it('nv8 com um Oco Grande parado a 48 px na mira: acertos em t, t + 12, t + 24, t + 36 e t + 72; formas ida, volta, estocada, ida', () => {
    const e = estadoCom([[E, 8]]);
    const s = por(e, TIPO.oco_grande, 0, -48);
    avancar(e, D, PARADO, 80);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s);
    expect(acertos.map((v) => v.passo)).toEqual([1, 13, 25, 37, 73]);
    expect(acertos.map((v) => v.forma)).toEqual([FORMA.ida, FORMA.volta, FORMA.estocada, FORMA.ida, FORMA.ida]);
    expect(e.inimigos.hp[s]).toBe(acertos.reduce((hp, v) => Math.fround(hp - v.f[2]), 100));
  });

  it('cada golpe da sequência lê a mira do próprio passo', () => {
    const e = estadoCom([[E, 3]]);
    avancar(e, D, PARADO, 1);
    e.jogador[JOGADOR.dirX] = 1;
    e.jogador[JOGADOR.dirY] = 0;
    avancar(e, D, PARADO, 12);
    const golpes = eventos(e).filter((v) => v.tipo === EVENTO.golpe);
    expect(golpes.map((v) => [v.passo, v.forma, v.f[0], v.f[1]])).toEqual([
      [1, FORMA.ida, 0, -1],
      [13, FORMA.volta, 1, 0],
    ]);
  });
});

describe('área do nv5 (W7) e estocada (W8)', () => {
  // As fronteiras com 1/16 px de folga: em Float32, 1.266 − 92,8 = 1.173,19995…, e a fronteira exata só vale com coordenada exata.
  it('nv4: Oco a 81 px na mira não leva; nv5: leva a 92,8 − 1/16 e não a 93,3', () => {
    const casos: [number, number, boolean][] = [
      [4, 81, false],
      [4, 80, true],
      [5, 92.8 - 1 / 16, true],
      [5, 93.3, false],
    ];
    for (const [nivel, d, esperado] of casos) {
      const e = estadoCom([[E, nivel]]);
      const s = por(e, TIPO.oco_das_lanternas, 0, -d);
      expect(golpeDireto(e).includes(s), `nv${nivel} a ${d}`).toBe(esperado);
    }
  });

  /** Só o 3º golpe (a estocada) do nv7. */
  function estocadaDireta(e: Estado): number[] {
    const antes = Array.from(e.inimigos.hp);
    e.build.recarga[0] = 50;
    e.build.golpe[0] = 2;
    e.build.esperaGolpe[0] = 1;
    rodarArmas(e, D);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.golpe).at(-1)!.forma).toBe(FORMA.estocada);
    const atingidos: number[] = [];
    for (let s = 0; s < antes.length; s++) if (e.pool.posicao[s]! >= 0 && e.inimigos.hp[s]! < antes[s]!) atingidos.push(s);
    return atingidos;
  }

  it('nv7: Oco em (0, −131,2) leva e em (0, −131,3) não; a 35,2 − 1/16 px do eixo leva e a 35,3 não; atrás, a 16 px exatos leva; 5 em fila levam todos', () => {
    const casos: [number, number, boolean][] = [
      [0, -131.2, true],
      [0, -131.3, false],
      [35.2 - 1 / 16, -60, true],
      [35.3, -60, false],
      [-(35.2 - 1 / 16), -60, true],
      [-35.3, -60, false],
      // A borda de trás, que começa no centro do jogador: com coordenada exata, a = −r leva (≤, sem ε) e −r − 1/16 não.
      [0, 16, true],
      [0, 16 + 1 / 16, false],
    ];
    for (const [dx, dy, esperado] of casos) {
      const e = estadoCom([[E, 7]]);
      ancoraDeMira(e, 0, -1);
      const s = por(e, TIPO.oco_das_lanternas, dx, dy);
      expect(estocadaDireta(e).includes(s), `(${dx}, ${dy})`).toBe(esperado);
    }
    const e = estadoCom([[E, 7]]);
    const ancora = ancoraDeMira(e, 0, -1);
    const fila = [20, 45, 70, 95, 120].map((d) => por(e, TIPO.oco_das_lanternas, 0, -d)).concat(ancora);
    expect(estocadaDireta(e)).toEqual(fila.sort((a, b) => a - b));
  });
});

describe('dano lido no passo do golpe (DN1; T11 e A4 da revisão)', () => {
  it('Espada no nv5: o golpe 1 sai com 8,1; a vaga passa ao nv6 antes do golpe 2, que sai com 9,45', () => {
    const e = estadoCom([[E, 5]]);
    const s = por(e, TIPO.oco_grande, 0, -48);
    avancar(e, D, PARADO, 1);
    e.build.nivel[0] = 6;
    avancar(e, D, PARADO, 12);
    const valores = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s).map((v) => v.f[2]);
    expect(valores).toEqual([Math.fround(8.1), Math.fround(9.45)]);
  });
});
