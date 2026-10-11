// F-003.1: a grade devolve os mesmos vizinhos que a força bruta em 1.000 casos
// aleatórios, inclusive os casos fixos junto da costura do ADR-0002 §6:
// (x = 10, r = 30) precisa da coluna 17 e (y = 10, r = 50) precisa da linha 38.
import { describe, expect, it } from 'vitest';
import { COLUNAS, LADO_DA_CELULA, LINHAS, consultarGrade, criarGrade, reconstruirGrade } from '../../../src/logica/mundo/grade';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import { proximoUnitario, semear } from '../../../src/logica/nucleo/rng';

const CAP = 500;

function forcaBruta(xs: Float32Array, ys: Float32Array, ids: Int32Array, n: number, x: number, y: number, r: number): number[] {
  const achados: number[] = [];
  for (let k = 0; k < n; k++) {
    const id = ids[k]!;
    const dx = deltaNoToro(x, xs[id]!, W);
    const dy = deltaNoToro(y, ys[id]!, H);
    if (dx * dx + dy * dy <= r * r) achados.push(id);
  }
  return achados.sort((a, b) => a - b);
}

function consultar(xs: Float32Array, ys: Float32Array, ids: Int32Array, n: number, x: number, y: number, r: number): number[] {
  const g = criarGrade(CAP);
  reconstruirGrade(g, xs, ys, ids, n);
  const out = new Int32Array(CAP);
  const k = consultarGrade(g, xs, ys, x, y, r, out);
  return Array.from(out.subarray(0, k)).sort((a, b) => a - b);
}

describe('grade espacial (ADR-0002 §6)', () => {
  it('19 colunas × 40 linhas de 64 px; a última coluna tem 18 px e a última linha 36 px', () => {
    expect([COLUNAS, LINHAS, LADO_DA_CELULA]).toEqual([19, 40, 64]);
    expect(W - (COLUNAS - 1) * LADO_DA_CELULA).toBe(18);
    expect(H - (LINHAS - 1) * LADO_DA_CELULA).toBe(36);
  });

  it('caso fixo: (x = 10, r = 30) acha um vizinho em x = 1.151, na coluna 17', () => {
    const xs = Float32Array.of(1151, 1160, 50);
    const ys = Float32Array.of(500, 500, 500);
    const ids = Int32Array.of(0, 1, 2);
    expect(Math.floor(1151 / 64)).toBe(17);
    expect(consultar(xs, ys, ids, 3, 10, 500, 30)).toEqual([0, 1]);
  });

  it('caso fixo: (y = 10, r = 50) acha um vizinho em y = 2.495, na linha 38', () => {
    const xs = Float32Array.of(300, 300);
    const ys = Float32Array.of(2495, 2440);
    const ids = Int32Array.of(0, 1);
    expect(Math.floor(2495 / 64)).toBe(38);
    expect(consultar(xs, ys, ids, 2, 300, 10, 50)).toEqual([0]);
  });

  it('a distância vale com igualdade (d ≤ r) e nunca devolve um id duas vezes, mesmo com r maior que o mapa', () => {
    const xs = Float32Array.of(100, 100, 700);
    const ys = Float32Array.of(100, 164, 1300);
    const ids = Int32Array.of(0, 1, 2);
    expect(consultar(xs, ys, ids, 3, 100, 100, 64)).toEqual([0, 1]);
    expect(consultar(xs, ys, ids, 3, 100, 100, 5000)).toEqual([0, 1, 2]);
  });

  it('1.000 casos aleatórios: os mesmos vizinhos que a força bruta', () => {
    const s = new Uint32Array(4);
    semear(s, 0, 2026, 'diretor');
    const u = (): number => proximoUnitario(s, 0);
    const xs = new Float32Array(CAP);
    const ys = new Float32Array(CAP);
    const ids = new Int32Array(CAP);
    let comVizinhos = 0;
    for (let caso = 0; caso < 1000; caso++) {
      const n = 1 + Math.floor(u() * CAP);
      for (let i = 0; i < CAP; i++) {
        xs[i] = Math.fround(u() * W);
        ys[i] = Math.fround(u() * H);
      }
      // Ids embaralhados e só uma parte deles ativa, como na lista densa do pool.
      for (let i = 0; i < CAP; i++) ids[i] = i;
      for (let i = CAP - 1; i > 0; i--) {
        const j = Math.floor(u() * (i + 1));
        const t = ids[i]!;
        ids[i] = ids[j]!;
        ids[j] = t;
      }
      // Em 3 de cada 4 casos, o ponto cai a menos de r de uma costura; 1 em 10 tem r maior que meio mapa.
      const r = caso % 10 === 0 ? u() * 1400 : 16 + u() * 244;
      let x = Math.fround(u() * W);
      let y = Math.fround(u() * H);
      if (caso % 4 === 1) x = Math.fround(u() * r);
      if (caso % 4 === 2) y = Math.fround(H - u() * r);
      if (caso % 4 === 3) [x, y] = [Math.fround(W - u() * Math.min(r, W - 1)), Math.fround(u() * Math.min(r, H - 1))];
      const esperado = forcaBruta(xs, ys, ids, n, x, y, r);
      if (esperado.length > 0) comVizinhos++;
      expect(consultar(xs, ys, ids, n, x, y, r), `caso ${caso}: (${x}, ${y}) r = ${r}, n = ${n}`).toEqual(esperado);
    }
    // Para o teste não passar em casos vazios: a maioria tem vizinhos.
    expect(comVizinhos).toBeGreaterThan(750);
  });
});
