// A arena do Lanterneiro contém o jogador e o chefe; a solidez da caixa e o movimento (design/decisoes-F-009.md LN3, AB2, F-009.10).
import { describe, expect, it } from 'vitest';
import { DADOS_BRUTOS } from '../apoio';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CAB, CAPACIDADE_DE_INIMIGOS, CENARIO, CHEFE_U16, CHEFE_U8, FOGUEIRA_F32, JOGADOR, type Estado } from '../../../src/logica/nucleo/estado';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { PARADO } from '../apoio';
import { comChefe } from './apoio';

const B = DADOS_BRUTOS;
const INVULNERAVEL = CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel;

const centro = (e: Estado): [number, number] => [e.fogueiraF32[FOGUEIRA_F32.arenaX]!, e.fogueiraF32[FOGUEIRA_F32.arenaY]!];
const dist = (x: number, y: number, c: [number, number]): number => Math.hypot(x - c[0], y - c[1]);

describe('a borda contém o jogador (F-009.10)', () => {
  it('empurrando a borda por 120 passos em 8 direções, o jogador fica a ≤ 208 px do centro', () => {
    for (let k = 0; k < 8; k++) {
      const { e } = comChefe({ cenario: INVULNERAVEL }, B);
      const c = centro(e);
      const a = (k * Math.PI) / 4;
      const fonte = fonteDoRoteiro([{ passo: 0, mx: Math.cos(a), my: Math.sin(a) }]);
      for (let p = 0; p < 120; p++) {
        avancar(e, B, fonte, 1);
        expect(dist(e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, c), `dir ${k} passo ${p}`).toBeLessThanOrEqual(208 + 1e-3);
      }
      // Na direção contrária à do chefe (−x) o jogador chega ao limite; nas outras, o chefe e a caixa também o seguram.
      if (k === 4) expect(dist(e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, c)).toBeGreaterThan(200);
    }
  });
});

describe('a borda contém o chefe (LN3, AB2)', () => {
  it('o centro do chefe fica a ≤ 144 px e os 4 cantos da caixa a ≤ 224 durante a perseguição, com o jogador no limite da arena', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    const c = centro(e);
    // O jogador corre em volta, sempre no limite; o chefe o persegue e ataca.
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: -1 }, { passo: 150, mx: 1, my: 0 }, { passo: 300, mx: 0, my: 1 }, { passo: 450, mx: -1, my: 0 }]);
    let maximoDoCentro = 0;
    let maximoDoCanto = 0;
    for (let p = 0; p < 900; p++) {
      avancar(e, B, fonte, 1);
      const x = e.inimigos.x[s]!;
      const y = e.inimigos.y[s]!;
      maximoDoCentro = Math.max(maximoDoCentro, dist(x, y, c));
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) maximoDoCanto = Math.max(maximoDoCanto, dist(x + 48 * sx, y + 64 * sy, c));
    }
    expect(maximoDoCentro).toBeLessThanOrEqual(144 + 0.01);
    expect(maximoDoCanto).toBeLessThanOrEqual(224 + 0.01);
  });

  it('um chefe posto fora do limite (170 px) volta a ≤ 144 no passo seguinte', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    const c = centro(e);
    e.inimigos.x[s] = e.inimigos.xAnt[s] = c[0] + 170;
    e.inimigos.y[s] = e.inimigos.yAnt[s] = c[1];
    avancar(e, B, PARADO, 1);
    expect(dist(e.inimigos.x[s]!, e.inimigos.y[s]!, c)).toBeLessThanOrEqual(144 + 0.01);
  });

  it('um inimigo a 230 px do centro não entra na arena em 300 passos', () => {
    const { e } = comChefe({ cenario: INVULNERAVEL }, B);
    const c = centro(e);
    const oco = nascerInimigo(e, B, TIPO.oco_das_lanternas, c[0] + 230, c[1], false);
    for (let p = 0; p < 300; p++) {
      avancar(e, B, PARADO, 1);
      expect(dist(e.inimigos.x[oco]!, e.inimigos.y[oco]!, c), `passo ${p}`).toBeGreaterThanOrEqual(224);
    }
  });
});

describe('a caixa é sólida (LN3)', () => {
  it('o jogador que anda contra a caixa não entra: a distância jogador–caixa fica ≥ 16', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    // Quebrado, o chefe fica parado; o jogador anda para ele pelo lado esquerdo e depois pelo de cima.
    e.chefeU16[CHEFE_U16.quebraPassos] = 400;
    e.chefeU8[CHEFE_U8.quebraNova] = 0;
    const c = centro(e);
    e.inimigos.x[s] = e.inimigos.xAnt[s] = c[0];
    e.inimigos.y[s] = e.inimigos.yAnt[s] = c[1];
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = c[0] - 150;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = c[1] + 10;
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }, { passo: 100, mx: 0, my: 1 }, { passo: 200, mx: 0.9, my: -0.3 }]);
    const x0 = e.inimigos.x[s]!;
    const y0 = e.inimigos.y[s]!;
    for (let p = 0; p < 300; p++) {
      avancar(e, B, fonte, 1);
      const dx = Math.max(Math.abs(e.jogador[JOGADOR.x]! - x0) - 48, 0);
      const dy = Math.max(Math.abs(e.jogador[JOGADOR.y]! - y0) - 64, 0);
      expect(Math.hypot(dx, dy), `passo ${p}`).toBeGreaterThanOrEqual(16 - 1e-3);
      // O chefe nunca é empurrado.
      expect([e.inimigos.x[s], e.inimigos.y[s]]).toEqual([x0, y0]);
    }
  });

  it('um convocado dentro da caixa é empurrado para fora dela, sem empurrar o chefe', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    e.chefeU16[CHEFE_U16.quebraPassos] = 400;
    const c = centro(e);
    e.inimigos.x[s] = e.inimigos.xAnt[s] = c[0];
    e.inimigos.y[s] = e.inimigos.yAnt[s] = c[1];
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = c[0] - 190;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = c[1];
    const oco = nascerInimigo(e, B, TIPO.oco_das_lanternas, c[0] - 20, c[1] + 10, false);
    for (let p = 0; p < 120; p++) avancar(e, B, PARADO, 1);
    const dx = Math.max(Math.abs(e.inimigos.x[oco]! - c[0]) - 48, 0);
    const dy = Math.max(Math.abs(e.inimigos.y[oco]! - c[1]) - 64, 0);
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(16 - 0.05);
    expect([e.inimigos.x[s], e.inimigos.y[s]]).toEqual([c[0], c[1]]);
    expect(CAPACIDADE_DE_INIMIGOS).toBeGreaterThan(oco);
  });
});

describe('movimento do chefe (LN3)', () => {
  it('livre, persegue a 1,08 px por passo em linha reta (e para a 96 do jogador, ou ao entrar no gatilho do ataque)', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    const c = centro(e);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = c[0] - 190;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = c[1];
    // Termina a recuperação de nascimento (120 passos): parado até lá.
    const x0 = e.inimigos.x[s]!;
    avancar(e, B, PARADO, 100);
    expect(e.inimigos.x[s]).toBe(x0);
    while (e.inimigos.ataqueFase[s] !== 0) avancar(e, B, PARADO, 1);
    const a = e.inimigos.x[s]!;
    const b = e.inimigos.y[s]!;
    avancar(e, B, PARADO, 1);
    expect(Math.hypot(e.inimigos.x[s]! - a, e.inimigos.y[s]! - b)).toBeCloseTo(1.08, 3);
    expect(e.cab[CAB.passo]).toBeGreaterThan(120);
  });
});
