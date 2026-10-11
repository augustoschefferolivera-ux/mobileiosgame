// Física da horda (design/decisoes-F-003.md §2): separação (S1 a S3, teste
// S5), solidez com a regra simétrica (S4), comportamento provisório dos médios
// (S6), casos degenerados, costura, o invariante de 32 px por passo (D §2) e a
// lista de obstáculos por célula, bit a bit igual à lista inteira.
import { describe, expect, it } from 'vitest';
import { CAB, CENARIO, JOGADOR, criarEstado, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { criarComandos, fonteConstante, type ComandosDoPasso } from '../../../src/logica/nucleo/comandos';
import { avancar, passo } from '../../../src/logica/nucleo/passo';
import { semear, proximoUnitario } from '../../../src/logica/nucleo/rng';
import { EMPURRAO, empurroesDoPasso, separarHorda } from '../../../src/logica/mundo/horda';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { colidirComObstaculos, colidirComObstaculosDaCelula } from '../../../src/logica/mundo/obstaculos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro, normalizarNoToro } from '../../../src/logica/mundo/toro';
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as VAZIO, PARADO, SEM_HORDA, dadosDe } from '../apoio';

const V = { oco: 1.32, grande: 1.68, novica: 1.92 };

function estadoCom(dados: DadosDaVigilia, jx: number, jy: number, extra: Partial<ParametrosDaVigilia> = {}): Estado {
  const e = criarEstado(1, dados, { ...SEM_HORDA, ...extra });
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = jx;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = jy;
  return e;
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(deltaNoToro(ax, bx, W), deltaNoToro(ay, by, H));
const distJ = (e: Estado, s: number): number => dist(e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, e.inimigos.x[s]!, e.inimigos.y[s]!);
const intencao = (mx: number, my: number): ComandosDoPasso => {
  const c = criarComandos();
  c.movimento[0] = mx;
  c.movimento[1] = my;
  return c;
};

function vivos(e: Estado): Int32Array {
  const ids: number[] = [];
  for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0) ids.push(s);
  return Int32Array.from(ids);
}

describe('separação (S1, S5)', () => {
  const sx = new Float64Array(500);
  const sy = new Float64Array(500);

  it('um par com 2 px de sobreposição: cada um recebe 1 px, simétrico (resolve em 1 passo)', () => {
    const e = estadoCom(VAZIO, 100, 100);
    const a = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 500, 500, false);
    const b = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 530, 500, false);
    const ids = vivos(e);
    separarHorda(e, VAZIO, ids, ids.length, sx, sy);
    expect([sx[a], sy[a], sx[b], sy[b]]).toEqual([-1, 0, 1, 0]);
  });

  it('o empurrão somado de um corpo nunca passa da velocidade dele, mesmo com 6 vizinhos sobrepostos', () => {
    const e = estadoCom(VAZIO, 100, 100);
    const c = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 500, 500, false);
    for (const [dx, dy] of [[20, 0], [-18, 5], [0, 22], [3, -20], [-15, -15], [12, 14]] as const) {
      nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 500 + dx, 500 + dy, false);
    }
    const ids = vivos(e);
    separarHorda(e, VAZIO, ids, ids.length, sx, sy);
    expect(Math.abs(Math.hypot(sx[c]!, sy[c]!) - V.oco)).toBeLessThan(1e-9);
    for (const s of ids) expect(Math.hypot(sx[s]!, sy[s]!)).toBeLessThanOrEqual(V.oco + 1e-9);
  });

  it('Jacobi: o resultado não depende da ordem dos slots (três corpos em coordenadas exatas)', () => {
    const pontos: [number, number][] = [[100, 100], [100, 128], [124, 100]];
    const resultado = (ordem: number[]): string[] => {
      const e = estadoCom(VAZIO, 600, 1800);
      const slots = ordem.map((i) => nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, pontos[i]![0], pontos[i]![1], false));
      const ids = vivos(e);
      separarHorda(e, VAZIO, ids, ids.length, sx, sy);
      const porPonto: string[] = [];
      ordem.forEach((i, k) => (porPonto[i] = `${sx[slots[k]!]},${sy[slots[k]!]}`));
      return porPonto;
    };
    expect(resultado([2, 0, 1])).toEqual(resultado([0, 1, 2]));
    expect(resultado([1, 2, 0])).toEqual(resultado([0, 1, 2]));
  });

  it('pares através da costura em x e em y se separam (a vizinhança fixa de 3 × 3 perderia os dois)', () => {
    for (const [a, b] of [
      [[10, 500], [1140, 500]],
      [[500, 2], [500, 2495]],
    ] as const) {
      const e = estadoCom(VAZIO, 300, 1800);
      const s1 = nascerInimigo(e, VAZIO, TIPO.oco_grande, a[0], a[1], false);
      const s2 = nascerInimigo(e, VAZIO, TIPO.oco_grande, b[0], b[1], false);
      const ids = vivos(e);
      separarHorda(e, VAZIO, ids, ids.length, sx, sy);
      expect(Math.hypot(sx[s1]!, sy[s1]!)).toBeGreaterThan(0);
      expect(Math.hypot(sx[s2]!, sy[s2]!)).toBeGreaterThan(0);
    }
  });

  it('F-003.1 na separação: 1.000 configurações aleatórias (inclusive nas costuras) dão o mesmo que a força bruta', () => {
    // A separação visita a grade em linha (laço quente); aqui ela é comparada com todos os pares, um a um.
    const rng = new Uint32Array(4);
    semear(rng, 0, 31, 'diretor');
    const u = (): number => proximoUnitario(rng, 0);
    const tipos = [TIPO.oco_das_lanternas, TIPO.oco_grande, TIPO.novica_de_sal];
    const t = VAZIO.tipos;
    const rx = new Float64Array(500);
    const ry = new Float64Array(500);
    let pares = 0;
    for (let caso = 0; caso < 1000; caso++) {
      const e = estadoCom(VAZIO, 585, 1266);
      const n = 2 + Math.floor(u() * 60);
      // Um aglomerado em volta de um centro qualquer; 1 caso em 4 sobre a costura em x, 1 em 4 sobre a de y.
      const cx = caso % 4 === 1 ? (u() < 0.5 ? u() * 20 : W - u() * 20) : u() * W;
      const cy = caso % 4 === 2 ? (u() < 0.5 ? u() * 20 : H - u() * 20) : u() * H;
      const raio = 20 + u() * 120;
      for (let k = 0; k < n; k++) {
        nascerInimigo(e, VAZIO, tipos[Math.floor(u() * 3)]!, normalizarNoToro(cx + (u() - 0.5) * 2 * raio, W), normalizarNoToro(cy + (u() - 0.5) * 2 * raio, H), false);
      }
      const ids = vivos(e);
      separarHorda(e, VAZIO, ids, ids.length, sx, sy);
      const ini = e.inimigos;
      for (const a of ids) {
        rx[a] = 0;
        ry[a] = 0;
      }
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i]!, ids[j]!];
          const soma = t.raio[ini.tipo[a]!]! + t.raio[ini.tipo[b]!]!;
          const dx = deltaNoToro(ini.x[a]!, ini.x[b]!, W);
          const dy = deltaNoToro(ini.y[a]!, ini.y[b]!, H);
          const d = Math.hypot(dx, dy);
          if (d >= soma) continue;
          pares++;
          const [nx, ny] = d > 0 ? [dx / d, dy / d] : [1, 0];
          const meia = (soma - d) / 2;
          rx[a] = rx[a]! - nx * meia;
          ry[a] = ry[a]! - ny * meia;
          rx[b] = rx[b]! + nx * meia;
          ry[b] = ry[b]! + ny * meia;
        }
      }
      for (const a of ids) {
        const v = t.velocidade[ini.tipo[a]!]!;
        const m = Math.hypot(rx[a]!, ry[a]!);
        const f = m > v ? v / m : 1;
        expect(Math.abs(sx[a]! - rx[a]! * f), `caso ${caso}, slot ${a}`).toBeLessThan(1e-9);
        expect(Math.abs(sy[a]! - ry[a]! * f), `caso ${caso}, slot ${a}`).toBeLessThan(1e-9);
      }
    }
    expect(pares).toBeGreaterThan(5000);
  }, 60_000);

  it('centros coincidentes: o slot menor vai para −x e o maior para +x, sem NaN', () => {
    const e = estadoCom(VAZIO, 300, 1800);
    const a = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 500, 500, false);
    const b = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 500, 500, false);
    const ids = vivos(e);
    separarHorda(e, VAZIO, ids, ids.length, sx, sy);
    expect(sx[a]).toBeLessThan(0);
    expect(sx[b]).toBeGreaterThan(0);
    passo(e, VAZIO, criarComandos());
    expect(e.inimigos.x[a]!).toBeLessThan(e.inimigos.x[b]!);
    for (const s of [a, b]) expect(Number.isNaN(e.inimigos.x[s]) || Number.isNaN(e.inimigos.y[s])).toBe(false);
  });

  it('linha 19 com o jogador parado: sobreposição média ≤ 25% e máxima ≤ 70% da soma dos raios; a horda assenta', () => {
    const D = DADOS_DA_CHARNECA;
    const e = criarEstado(1, D, { linhaFixa: 19, cenario: CENARIO.jogadorInvulneravel, tutoriaisVistos: 1 });
    avancar(e, D, PARADO, 6600);
    let soma = 0;
    let max = 0;
    let n = 0;
    for (let k = 0; k < 600; k++) {
      avancar(e, D, PARADO, 1);
      for (let s = 0; s < 500; s++) {
        if (e.pool.posicao[s]! < 0) continue;
        const m = dist(e.inimigos.xAnt[s]!, e.inimigos.yAnt[s]!, e.inimigos.x[s]!, e.inimigos.y[s]!);
        soma += m;
        n++;
        max = Math.max(max, m);
      }
    }
    expect(soma / n, 'deslocamento médio por corpo e por passo').toBeLessThanOrEqual(0.01);
    expect(max, 'deslocamento máximo num passo').toBeLessThanOrEqual(0.1);
    const ids = vivos(e);
    let pares = 0;
    let fracao = 0;
    let fracaoMax = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        const r = D.tipos.raio[e.inimigos.tipo[a]!]! + D.tipos.raio[e.inimigos.tipo[b]!]!;
        const d = dist(e.inimigos.x[a]!, e.inimigos.y[a]!, e.inimigos.x[b]!, e.inimigos.y[b]!);
        if (d >= r) continue;
        pares++;
        fracao += (r - d) / r;
        fracaoMax = Math.max(fracaoMax, (r - d) / r);
      }
    }
    expect(pares).toBeGreaterThan(500);
    expect(fracao / pares).toBeLessThanOrEqual(0.25);
    expect(fracaoMax).toBeLessThanOrEqual(0.7);
  }, 120_000);
});

describe('inimigos sólidos para o jogador (S4)', () => {
  it('o jogador parado no meio da horda da linha 19 nunca é deslocado (3.600 passos)', () => {
    const D = DADOS_DA_CHARNECA;
    const e = criarEstado(1, D, { linhaFixa: 19, cenario: CENARIO.jogadorInvulneravel, tutoriaisVistos: 1 });
    const x0 = e.jogador[JOGADOR.x];
    const y0 = e.jogador[JOGADOR.y];
    for (let k = 0; k < 3600; k++) {
      avancar(e, D, PARADO, 1);
      expect([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]).toEqual([x0, y0]);
    }
  }, 60_000);

  it('andando de frente contra um Oco Grande parado (a 40 px, dentro dos 48 dele), o jogador não avança; de raspão, desliza', () => {
    const e = estadoCom(VAZIO, 500, 500);
    const g = nascerInimigo(e, VAZIO, TIPO.oco_grande, 540, 500, false);
    for (let k = 0; k < 30; k++) passo(e, VAZIO, intencao(1, 0));
    expect(e.jogador[JOGADOR.x]).toBe(500);
    expect([e.inimigos.x[g], e.inimigos.y[g]]).toEqual([540, 500]);
    const f = estadoCom(VAZIO, 500, 520);
    nascerInimigo(f, VAZIO, TIPO.oco_grande, 540, 500, false);
    for (let k = 0; k < 60; k++) passo(f, VAZIO, intencao(1, 0));
    expect(f.jogador[JOGADOR.x]).toBeGreaterThan(560);
  });

  it('cercado por 100 Ocos, tentando sair em 3 direções por 600 passos cada, anda menos de 32 px', () => {
    const e = estadoCom(VAZIO, 585, 1266);
    const s = new Uint32Array(4);
    semear(s, 0, 7, 'diretor');
    for (let k = 0; k < 100; k++) {
      const a = proximoUnitario(s, 0) * 2 * Math.PI;
      const r = 60 + proximoUnitario(s, 0) * 200;
      nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 585 + r * Math.cos(a), 1266 + r * Math.sin(a), false);
    }
    avancar(e, VAZIO, PARADO, 600);
    for (const [mx, my] of [[1, 0], [0, -1], [-0.6, 0.8]] as const) {
      const x0 = e.jogador[JOGADOR.x]!;
      const y0 = e.jogador[JOGADOR.y]!;
      avancar(e, VAZIO, fonteConstante(intencao(mx, my)), 600);
      expect(dist(x0, y0, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!)).toBeLessThan(32);
    }
  });

  it('um Oco imprensado entre o jogador parado e um obstáculo não empurra o jogador; cada empurrão ≤ 2v + 2,4 px', () => {
    for (const folga of [1, 9, 12]) {
      for (const tamanho of [64, 96]) {
        const r = tamanho / 2;
        const dados = dadosDe({ obstaculos: [{ x: 700, y: 1266, tamanho_px: tamanho }] });
        const jx = 700 - r - folga - 16;
        const e = estadoCom(dados, jx, 1266);
        nascerInimigo(e, dados, TIPO.oco_das_lanternas, jx + 30, 1266 + 6, false);
        nascerInimigo(e, dados, TIPO.oco_das_lanternas, jx + 200, 1266 - 3, false);
        for (let k = 0; k < 600; k++) {
          passo(e, dados, criarComandos());
          expect([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]).toEqual([jx, 1266]);
          expect(Math.sqrt(empurroesDoPasso[EMPURRAO.jogador2]!)).toBeLessThanOrEqual(2 * V.oco + 2.4 + 1e-6);
        }
      }
    }
  });
});

describe('comportamento provisório (S6, S7)', () => {
  it('o Oco Grande para a 48 px do centro do jogador e não sai mais dali', () => {
    const e = estadoCom(VAZIO, 585, 1266);
    const g = nascerInimigo(e, VAZIO, TIPO.oco_grande, 885, 1266, false);
    avancar(e, VAZIO, PARADO, 400);
    expect(distJ(e, g)).toBeGreaterThanOrEqual(48);
    expect(distJ(e, g)).toBeLessThanOrEqual(48 + 1e-3);
    const x = e.inimigos.x[g];
    avancar(e, VAZIO, PARADO, 60);
    expect(e.inimigos.x[g]).toBe(x);
  });

  it('a Noviça se aproxima até 128 px e recua até 128 px', () => {
    for (const inicio of [885, 645]) {
      const e = estadoCom(VAZIO, 585, 1266);
      const n = nascerInimigo(e, VAZIO, TIPO.novica_de_sal, inicio, 1266, false);
      avancar(e, VAZIO, PARADO, 400);
      expect(Math.abs(distJ(e, n) - 128)).toBeLessThanOrEqual(1e-3);
    }
  });

  it('o Oco das Lanternas persegue sem cruzar o centro e fica encostado (d = 32, a ±1e-3)', () => {
    const e = estadoCom(VAZIO, 585, 1266);
    const o = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 585, 1066, false);
    avancar(e, VAZIO, PARADO, 300);
    expect(Math.abs(distJ(e, o) - 32)).toBeLessThanOrEqual(1e-3);
  });
});

describe('invariante de 32 px por passo (D §2)', () => {
  it('na linha 19, com o jogador andando, nenhum empurrão nem deslocamento de um passo passa de 32 px', () => {
    const D = DADOS_DA_CHARNECA;
    const e = criarEstado(1, D, { linhaFixa: 19, cenario: CENARIO.jogadorInvulneravel, tutoriaisVistos: 1 });
    const rumos: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let k = 0; k < 1500; k++) {
      const [mx, my] = rumos[Math.floor(k / 120) % 4]!;
      passo(e, D, intencao(mx, my));
      const maior = Math.max(empurroesDoPasso[EMPURRAO.separacao2]!, empurroesDoPasso[EMPURRAO.jogador2]!, empurroesDoPasso[EMPURRAO.obstaculo2]!, empurroesDoPasso[EMPURRAO.total2]!);
      expect(Math.sqrt(maior), `passo ${k}`).toBeLessThanOrEqual(32);
      expect(Math.sqrt(empurroesDoPasso[EMPURRAO.separacao2]!)).toBeLessThanOrEqual(V.novica + 1e-9);
      expect(Math.sqrt(empurroesDoPasso[EMPURRAO.jogador2]!)).toBeLessThanOrEqual(2 * V.novica + 2.4 + 1e-6);
    }
    expect(e.cab[CAB.passo]).toBe(1500);
  }, 60_000);
});

describe('obstáculos por célula (§2)', () => {
  it('10.000 casos aleatórios (inclusive junto da costura): bit a bit iguais à lista inteira', () => {
    const D = DADOS_DA_CHARNECA;
    const s = new Uint32Array(4);
    semear(s, 0, 31, 'diretor');
    const u = (): number => proximoUnitario(s, 0);
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    let tocaram = 0;
    for (let k = 0; k < 10000; k++) {
      let x = u() * W;
      let y = u() * H;
      if (k % 5 === 1) x = normalizarNoToro(-1e-5, W);
      if (k % 5 === 2) y = normalizarNoToro(H - 1e-5, H);
      if (k % 5 === 3) x = W - 1e-5 + 2 * (u() - 0.5) * 30;
      const raio = k % 2 === 0 ? 16 : 24;
      const mx = (u() - 0.5) * 4;
      const my = (u() - 0.5) * 4;
      const na = colidirComObstaculos(D.obstaculos, x + mx, y + my, raio, mx, my, true, a);
      const nb = colidirComObstaculosDaCelula(D.obstaculos, D.obstaculosPorCelula, x + mx, y + my, raio, mx, my, true, b);
      expect([nb, b.x, b.y], `caso ${k}`).toEqual([na, a.x, a.y]);
      if (na > 0) tocaram++;
    }
    expect(tocaram).toBeGreaterThan(500);
  });

  it('a folga mínima entre obstáculos da Charneca passa de 2 × o maior raio + a maior velocidade', () => {
    const o = DADOS_DA_CHARNECA.obstaculos;
    let menor = Infinity;
    for (let i = 0; i < o.n; i++) {
      for (let j = i + 1; j < o.n; j++) menor = Math.min(menor, dist(o.x[i]!, o.y[i]!, o.x[j]!, o.y[j]!) - o.r[i]! - o.r[j]!);
    }
    expect(menor).toBeGreaterThan(2 * DADOS_DA_CHARNECA.tipos.raioMaximo + V.novica);
  });
});
