// F-002.6 (colisão): círculo de raio r contra os obstáculos, para o jogador
// (16 px) e para corpos sintéticos de 16 e 24 px (massa e médio; os Ocos reais
// passam a usá-la na F-003). Casos: contra a face, de raspão (deslize), na
// junção de dois obstáculos, cruzando a costura, centros coincidentes e o
// desempate da tangente nula (design/decisoes-F-002.md §3).
import { describe, expect, it } from 'vitest';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import {
  colidirComObstaculos,
  criarObstaculos,
  impressaoDaDisposicao,
  type ObstaculoDoJson,
  type Obstaculos,
} from '../../../src/logica/mundo/obstaculos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro, normalizarNoToro } from '../../../src/logica/mundo/toro';

const PASSO_PX = 2.4;

/** Distância entre o corpo e a borda do obstáculo i (negativa = penetração). */
function folga(o: Obstaculos, i: number, x: number, y: number, r: number): number {
  const dx = deltaNoToro(o.x[i]!, x, W);
  const dy = deltaNoToro(o.y[i]!, y, H);
  return Math.sqrt(dx * dx + dy * dy) - o.r[i]! - r;
}

/** Um corpo andando: a cada passo soma (vx, vy), colide e normaliza no toro, como o jogador. */
function andar(o: Obstaculos, x0: number, y0: number, r: number, passos: number, rumo: (x: number, y: number) => [number, number], desempate: boolean) {
  const p = { x: x0, y: y0 };
  let contatos = 0;
  let menorFolga = Infinity;
  for (let k = 0; k < passos; k++) {
    const [vx, vy] = rumo(p.x, p.y);
    contatos += colidirComObstaculos(o, p.x + vx, p.y + vy, r, vx, vy, desempate, p) > 0 ? 1 : 0;
    p.x = normalizarNoToro(p.x, W);
    p.y = normalizarNoToro(p.y, H);
    for (let i = 0; i < o.n; i++) menorFolga = Math.min(menorFolga, folga(o, i, p.x, p.y, r));
  }
  return { x: p.x, y: p.y, contatos, menorFolga };
}

const reto = (vx: number, vy: number) => (): [number, number] => [vx, vy];
/** Rumo em linha reta até um alvo, a 2,4 px por passo (como o Oco, B §3.6). */
const ate = (ax: number, ay: number) => (x: number, y: number): [number, number] => {
  const dx = deltaNoToro(x, ax, W);
  const dy = deltaNoToro(y, ay, H);
  const d = Math.sqrt(dx * dx + dy * dy);
  return d < PASSO_PX ? [dx, dy] : [(dx / d) * PASSO_PX, (dy / d) * PASSO_PX];
};
const um = (x: number, y: number, tamanho_px: number): ObstaculoDoJson => ({ x, y, tamanho_px });

describe.each([16, 24])('corpo de raio %s px', (r) => {
  const o = criarObstaculos([um(600, 600, 80)]);

  it('contra a face: para no contato e nunca atravessa', () => {
    const fim = andar(o, 400, 600, r, 300, reto(PASSO_PX, 0), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.menorFolga).toBeGreaterThan(-1e-3);
    expect(fim.x).toBeCloseTo(600 - 40 - r, 3);
    expect(fim.y).toBe(600);
  });

  it('de raspão: desliza pela borda e segue para o outro lado', () => {
    const fim = andar(o, 400, 600 - 12, r, 300, reto(PASSO_PX, 0), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.menorFolga).toBeGreaterThan(-1e-3);
    expect(fim.x).toBeGreaterThan(600 + 40 + r);
    expect(fim.y).toBeLessThan(600 - 12);
  });

  it('desempate: corpo, obstáculo e alvo na mesma y; com ele o corpo sai do contato e chega ao alvo', () => {
    const alvo = ate(800, 600);
    const sem = andar(o, 400, 600, r, 400, alvo, false);
    expect(sem.x).toBeCloseTo(600 - 40 - r, 3);
    const com = andar(o, 400, 600, r, 400, alvo, true);
    expect(com.menorFolga).toBeGreaterThan(-1e-3);
    expect(Math.abs(com.x - 800) + Math.abs(com.y - 600)).toBeLessThan(PASSO_PX);
  });

  it.each([
    ['reta 2:1 pelo centro', 400, 500, 800, 700, true],
    ['alvo a 0,001 px da linha dos centros', 400, 600, 800, 600.001, true],
    // Sai sozinho, mas só depois de ≈ 340 passos (5,7 s) roçando o obstáculo.
    ['alvo a 0,01 px da linha dos centros', 400, 600, 800, 600.01, false],
  ])('desempate com tangente quase nula (%s): o corpo não fica preso', (_nome, x0, y0, ax, ay, presoSemDesempate) => {
    const sem = andar(o, x0, y0, r, 2000, ate(ax, ay), false);
    const com = andar(o, x0, y0, r, 400, ate(ax, ay), true);
    if (presoSemDesempate) expect(Math.abs(sem.x - ax) + Math.abs(sem.y - ay), 'sem o desempate fica preso').toBeGreaterThan(100);
    expect(com.menorFolga).toBeGreaterThan(-1e-3);
    expect(Math.abs(com.x - ax) + Math.abs(com.y - ay)).toBeLessThan(PASSO_PX);
  });

  it('desempate: com a tangente quase nula, desliza para o lado em que o movimento pende', () => {
    const p = { x: 0, y: 0 };
    for (const [movY, lado] of [
      [1e-4, 1],
      [-1e-4, -1],
    ] as const) {
      colidirComObstaculos(o, 600 - 40 - r + 1, 600, r, PASSO_PX, movY, true, p);
      expect(Math.sign(p.y - 600), `movY = ${movY}`).toBe(lado);
      expect(Math.abs(p.y - 600)).toBeGreaterThan(2);
    }
  });

  it('desempate: gira a normal +90° (−ny, nx); em world, n = (−1, 0) vai para (0, −1)', () => {
    const p = { x: 0, y: 0 };
    // O corpo encosta pela esquerda (n = (−1, 0)) andando para +x.
    colidirComObstaculos(o, 600 - 40 - r + 1, 600, r, PASSO_PX, 0, true, p);
    expect(p.x).toBeCloseTo(600 - 40 - r, 6);
    expect(p.y).toBeCloseTo(600 - PASSO_PX, 6);
    // Por cima (n = (0, −1)) andando para +y, o giro dá (1, 0).
    colidirComObstaculos(o, 600, 600 - 40 - r + 1, r, 0, PASSO_PX, true, p);
    expect(p.x).toBeCloseTo(600 + PASSO_PX, 6);
    expect(p.y).toBeCloseTo(600 - 40 - r, 6);
  });
});

describe('casos de borda', () => {
  it('junção de dois obstáculos: empurrado para o vão, o corpo não passa entre eles', () => {
    // Dois círculos de raio 40 que se tocam, lado a lado em x. Com 1 só iteração
    // por passo, o empurrão do 2º devolve o corpo para dentro do 1º (≈ −0,07 px).
    const o = criarObstaculos([um(560, 600, 80), um(640, 600, 80)]);
    const fim = andar(o, 600, 400, 16, 300, reto(0, PASSO_PX), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.y).toBeLessThan(600 - 16);
    expect(fim.menorFolga).toBeGreaterThan(-0.01);
  });

  it('cruzando a costura em x: o obstáculo junto de x = 0 bloqueia quem vem de x = 1.150', () => {
    const o = criarObstaculos([um(40, 500, 80)]);
    const fim = andar(o, 1150, 500, 16, 100, reto(PASSO_PX, 0), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.x).toBeCloseTo(W - 16, 3);
    expect(fim.menorFolga).toBeGreaterThan(-1e-3);
  });

  it('cruzando a costura em y: o obstáculo junto de y = 0 bloqueia quem vem de y = 2.500', () => {
    const o = criarObstaculos([um(300, 40, 80)]);
    const fim = andar(o, 300, 2500, 16, 100, reto(0, PASSO_PX), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.y).toBeCloseTo(H - 16, 3);
    expect(fim.menorFolga).toBeGreaterThan(-1e-3);
  });

  it('cruzando a costura em x para −x: o obstáculo junto de x = W bloqueia quem vem de x = 20', () => {
    const o = criarObstaculos([um(W - 40, 500, 80)]);
    const fim = andar(o, 20, 500, 16, 100, reto(-PASSO_PX, 0), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.x).toBeCloseTo(16, 3);
    expect(fim.menorFolga).toBeGreaterThan(-1e-3);
  });

  it('cruzando a costura em y, e o raspão leva o corpo para o outro lado do toro', () => {
    const o = criarObstaculos([um(300, 40, 80)]);
    const fim = andar(o, 300 + 10, 200, 16, 200, reto(0, -PASSO_PX), false);
    expect(fim.contatos).toBeGreaterThan(0);
    expect(fim.y).toBeGreaterThan(H / 2);
    expect(fim.x).toBeGreaterThan(300 + 40);
  });

  it('centros coincidentes empurram para +x', () => {
    const o = criarObstaculos([um(600, 600, 80)]);
    const p = { x: 0, y: 0 };
    expect(colidirComObstaculos(o, 600, 600, 16, 0, 0, false, p)).toBeGreaterThan(0);
    expect(p).toEqual({ x: 656, y: 600 });
  });

  it('fora de contato nada muda e nada é contado', () => {
    const o = criarObstaculos([um(600, 600, 80)]);
    const p = { x: 0, y: 0 };
    expect(colidirComObstaculos(o, 600 + 56, 600, 16, 0, 0, false, p)).toBe(0);
    expect(p).toEqual({ x: 656, y: 600 });
  });
});

describe('obstáculos da Charneca', () => {
  const o = criarObstaculos(charneca.obstaculos);

  it('o jogador empurrado contra cada obstáculo do mapa não o atravessa (F-002.6)', () => {
    for (let i = 0; i < o.n; i++) {
      const x0 = normalizarNoToro(o.x[i]! - o.r[i]! - 40, W);
      const fim = andar(o, x0, o.y[i]!, 16, 120, reto(PASSO_PX, 0), false);
      expect(folga(o, i, fim.x, fim.y, 16), `obstáculo ${i}`).toBeGreaterThan(-1e-3);
      expect(deltaNoToro(o.x[i]!, fim.x, W), `obstáculo ${i}`).toBeLessThan(0);
    }
  });

  it('impressão da disposição: estável e sensível a qualquer coordenada', () => {
    const base = impressaoDaDisposicao(o);
    expect(impressaoDaDisposicao(criarObstaculos(charneca.obstaculos))).toBe(base);
    const mudar = (campo: 'x' | 'y' | 'tamanho_px') =>
      impressaoDaDisposicao(criarObstaculos(charneca.obstaculos.map((ob, i) => (i === 7 ? { ...ob, [campo]: ob[campo] + 16 } : ob))));
    for (const campo of ['x', 'y', 'tamanho_px'] as const) expect(mudar(campo), campo).not.toBe(base);
    expect(impressaoDaDisposicao(criarObstaculos(charneca.obstaculos.slice(1)))).not.toBe(base);
  });
});
