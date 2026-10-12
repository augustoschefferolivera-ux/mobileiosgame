// Obstáculos por célula com o Coroado e com obstáculos inativos (design/decisoes-F-008.md §3 e CR10): a lista por célula
// (montada com o raio de 32 do Coroado) segue bit a bit igual à lista inteira, com o raio de 32 e com qualquer máscara de
// `obstaculoAtivo`; a folga mínima entre obstáculos da Charneca passa de 2 × 32 + a velocidade do Coroado (65,56 < 67,4).
import { describe, expect, it } from 'vitest';
import { colidirComObstaculos, colidirComObstaculosDaCelula } from '../../../src/logica/mundo/obstaculos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro, normalizarNoToro } from '../../../src/logica/mundo/toro';
import { proximoUnitario, semear } from '../../../src/logica/nucleo/rng';
import { DADOS_DA_CHARNECA as D } from '../apoio';

describe('obstáculos por célula, raio 32 e máscara de ativos', () => {
  it('a lista por célula foi montada com o raio dos obstáculos (32), e não com o R_MAX da grade (24)', () => {
    expect(D.tipos.raioDeObstaculo).toBe(32);
    expect(D.tipos.raioMaximo).toBe(24);
  });

  it('10.000 casos com raio 16, 24 e 32 e máscaras aleatórias: bit a bit iguais à lista inteira', () => {
    const s = new Uint32Array(4);
    semear(s, 0, 77, 'diretor');
    const u = (): number => proximoUnitario(s, 0);
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    const ativo = new Uint8Array(64);
    let tocaram = 0;
    let inativosTocados = 0;
    for (let k = 0; k < 10_000; k++) {
      for (let i = 0; i < D.obstaculos.n; i++) ativo[i] = u() < 0.7 ? 1 : 0;
      // Metade dos casos perto de um obstáculo qualquer, para os empurrões acontecerem.
      let x = u() * W;
      let y = u() * H;
      if (k % 2 === 0) {
        const i = Math.floor(u() * D.obstaculos.n);
        const ang = u() * 2 * Math.PI;
        const d = D.obstaculos.r[i]! + 20 + u() * 20;
        x = normalizarNoToro(D.obstaculos.x[i]! + d * Math.cos(ang), W);
        y = normalizarNoToro(D.obstaculos.y[i]! + d * Math.sin(ang), H);
      }
      if (k % 7 === 1) x = normalizarNoToro(-1e-5, W);
      const raio = k % 3 === 0 ? 16 : k % 3 === 1 ? 24 : 32;
      const mx = (u() - 0.5) * 3.12;
      const my = (u() - 0.5) * 3.12;
      const na = colidirComObstaculos(D.obstaculos, x + mx, y + my, raio, mx, my, true, a, ativo);
      const nb = colidirComObstaculosDaCelula(D.obstaculos, D.obstaculosPorCelula, x + mx, y + my, raio, mx, my, true, b, ativo);
      expect([nb, b.x, b.y], `caso ${k}`).toEqual([na, a.x, a.y]);
      if (na > 0) tocaram++;
      // Com tudo inativo nada empurra.
      const tudo = colidirComObstaculos(D.obstaculos, x + mx, y + my, raio, mx, my, true, a, new Uint8Array(64));
      expect(tudo).toBe(0);
      if (tudo === 0 && colidirComObstaculos(D.obstaculos, x + mx, y + my, raio, mx, my, true, a, null) > 0) inativosTocados++;
    }
    expect(tocaram).toBeGreaterThan(500);
    expect(inativosTocados).toBeGreaterThan(500);
  });

  it('a folga mínima entre obstáculos passa de 2 × 32 + a velocidade do Coroado (1,56 px/passo)', () => {
    const o = D.obstaculos;
    let menor = Infinity;
    for (let i = 0; i < o.n; i++) {
      for (let j = i + 1; j < o.n; j++) menor = Math.min(menor, Math.hypot(deltaNoToro(o.x[i]!, o.x[j]!, W), deltaNoToro(o.y[i]!, o.y[j]!, H)) - o.r[i]! - o.r[j]!);
    }
    expect(D.tipos.velocidade[TIPO.oco_grande_coroado]).toBeCloseTo(1.56, 2);
    expect(menor).toBeGreaterThan(2 * 32 + 1.56);
  });
});
