// Anel de spawn (F-003.9; Q-06; Q-07; design/decisoes-F-003.md §4, R4 a R8):
// 468 a 624 px no toro, 60% no semicírculo oposto à intenção e 40% na frente,
// uniforme parado, busca de ponto livre sem novo sorteio. Tolerância (R8):
// N = 10.000 por caso, seeds 1 a 5, fração oposta em [0,58; 0,62] (≈ 4σ) e
// cada quadrante em [0,233; 0,267] parado.
import { describe, expect, it } from 'vitest';
import {
  ANEL_EXTERNO,
  ANEL_INTERNO,
  rodarDiretor,
  sortearPontoDeSpawn,
  type PontoDeSpawn,
} from '../../../src/logica/diretor/diretor';
import { DIRECAO_X, DIRECAO_Y } from '../../../src/logica/mundo/direcoes';
import { CAB, MUNDO, criarEstado } from '../../../src/logica/nucleo/estado';
import { semear } from '../../../src/logica/nucleo/rng';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS, dadosDe } from '../apoio';

const N = 10000;
const R2 = 0.7071067811865476;
const ponto = (): PontoDeSpawn => ({ x: 0, y: 0, direcaoSorteada: 0, raio: 0, livre: false });

function rng(seed: number): Uint32Array {
  const s = new Uint32Array(4);
  semear(s, 0, seed, 'diretor');
  return s;
}

describe('viés de 60% (F-003.9, R6 e R8)', () => {
  const direcoes: [number, number][] = [[1, 0], [0, 1], [-R2, R2], [0.6, -0.8]];
  for (const seed of [1, 2, 3, 4, 5]) {
    it.each(direcoes)(`seed ${seed}, intenção (%s, %s): fração no semicírculo oposto em [0,58; 0,62]`, (dx, dy) => {
      const s = rng(seed);
      const p = ponto();
      let opostos = 0;
      for (let k = 0; k < N; k++) {
        sortearPontoDeSpawn(s, 0, DADOS_SEM_OBSTACULOS, 585, 1266, true, dx, dy, 16, p);
        if (DIRECAO_X[p.direcaoSorteada]! * dx + DIRECAO_Y[p.direcaoSorteada]! * dy < 0) opostos++;
      }
      expect(opostos / N).toBeGreaterThanOrEqual(0.58);
      expect(opostos / N).toBeLessThanOrEqual(0.62);
    });

    it(`seed ${seed}, parado: cada quadrante em [0,233; 0,267] e cada meio-plano em [0,48; 0,52]`, () => {
      const s = rng(seed);
      const p = ponto();
      const quadrantes = [0, 0, 0, 0];
      const meio = direcoes.map(() => 0);
      for (let k = 0; k < N; k++) {
        sortearPontoDeSpawn(s, 0, DADOS_SEM_OBSTACULOS, 585, 1266, false, 0, -1, 16, p);
        const vx = DIRECAO_X[p.direcaoSorteada]!;
        const vy = DIRECAO_Y[p.direcaoSorteada]!;
        quadrantes[(vx >= 0 ? 0 : 1) + (vy >= 0 ? 0 : 2)]!++;
        direcoes.forEach(([dx, dy], i) => {
          if (vx * dx + vy * dy < 0) meio[i]!++;
        });
      }
      for (const q of quadrantes) {
        expect(q / N).toBeGreaterThanOrEqual(0.233);
        expect(q / N).toBeLessThanOrEqual(0.267);
      }
      for (const m of meio) {
        expect(m / N).toBeGreaterThanOrEqual(0.48);
        expect(m / N).toBeLessThanOrEqual(0.52);
      }
    });
  }

  it('parado e andando usam o mesmo k sorteado; só a inversão difere', () => {
    const a = rng(9);
    const b = rng(9);
    const pa = ponto();
    const pb = ponto();
    for (let k = 0; k < 1000; k++) {
      sortearPontoDeSpawn(a, 0, DADOS_SEM_OBSTACULOS, 585, 1266, false, 0, -1, 16, pa);
      sortearPontoDeSpawn(b, 0, DADOS_SEM_OBSTACULOS, 585, 1266, true, 1, 0, 16, pb);
      expect([pa.direcaoSorteada === pb.direcaoSorteada || (pa.direcaoSorteada + 128) % 256 === pb.direcaoSorteada, pa.raio]).toEqual([
        true,
        pb.raio,
      ]);
    }
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe('distância e ponto livre na Charneca (Q-06; R5 e R7)', () => {
  it('em 1.000 posições do jogador (inclusive na costura), todo spawn fica a 468–624 px no toro e livre de obstáculo', () => {
    const s = rng(2026);
    const p = ponto();
    const o = DADOS_DA_CHARNECA.obstaculos;
    let somaRaio = 0;
    let amostras = 0;
    for (let i = 0; i < 1000; i++) {
      const jx = i % 4 === 0 ? (i * 7.3) % 3 : (i * 37.1) % W;
      const jy = i % 4 === 1 ? H - ((i * 1.7) % 3) : (i * 91.7) % H;
      for (const raio of [16, 24]) {
        sortearPontoDeSpawn(s, 0, DADOS_DA_CHARNECA, jx, jy, i % 2 === 0, 1, 0, raio, p);
        expect(p.livre).toBe(true);
        const d = Math.hypot(deltaNoToro(jx, p.x, W), deltaNoToro(jy, p.y, H));
        expect(d).toBeGreaterThanOrEqual(ANEL_INTERNO - 1e-3);
        expect(d).toBeLessThanOrEqual(ANEL_EXTERNO + 1e-3);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(W);
        for (let k = 0; k < o.n; k++) {
          expect(Math.hypot(deltaNoToro(o.x[k]!, p.x, W), deltaNoToro(o.y[k]!, p.y, H))).toBeGreaterThanOrEqual(o.r[k]! + raio - 1e-3);
        }
        somaRaio += p.raio;
        amostras++;
      }
    }
    // Uniforme no raio: média 546 ± 4.
    expect(Math.abs(somaRaio / amostras - 546)).toBeLessThan(4);
  });

  it('wrap perto da horizontal: jogador em x = 1.169 e a ponta do anel passam da meia-largura, e a distância fica em [546, 624]', () => {
    const s = rng(3);
    const p = ponto();
    let passaram = 0;
    for (let k = 0; k < 5000; k++) {
      sortearPontoDeSpawn(s, 0, DADOS_SEM_OBSTACULOS, 1169, 1266, false, 0, -1, 16, p);
      const dxBruto = p.raio * DIRECAO_X[p.direcaoSorteada]!;
      if (Math.abs(dxBruto) > W / 2) {
        passaram++;
        const d = Math.hypot(deltaNoToro(1169, p.x, W), deltaNoToro(1266, p.y, H));
        expect(d).toBeGreaterThanOrEqual(546);
        expect(d).toBeLessThanOrEqual(624 + 1e-3);
      }
    }
    expect(passaram).toBeGreaterThan(0);
  });

  it('sobre um obstáculo: vale a 1ª direção livre de k, k + 1, k − 1…, com o mesmo raio e o mesmo consumo do fluxo', () => {
    const a = rng(77);
    const livre = ponto();
    sortearPontoDeSpawn(a, 0, DADOS_SEM_OBSTACULOS, 585, 1266, false, 0, -1, 16, livre);
    // Um obstáculo de 80 px exatamente onde caiu o 1º sorteio.
    const comObstaculo = dadosDe({ obstaculos: [{ x: Math.round(livre.x), y: Math.round(livre.y), tamanho_px: 80 }] });
    const b = rng(77);
    const desviado = ponto();
    sortearPontoDeSpawn(b, 0, comObstaculo, 585, 1266, false, 0, -1, 16, desviado);
    expect(desviado.direcaoSorteada).toBe(livre.direcaoSorteada);
    expect(desviado.raio).toBe(livre.raio);
    expect(Array.from(b)).toEqual(Array.from(a));
    // A ordem alternada: a 1ª livre entre k + 1, k − 1, k + 2, k − 2…
    const o = comObstaculo.obstaculos;
    const livreEm = (kk: number): boolean => {
      const x = 585 + livre.raio * DIRECAO_X[(kk + 256) % 256]!;
      const y = 1266 + livre.raio * DIRECAO_Y[(kk + 256) % 256]!;
      return Math.hypot(x - o.x[0]!, y - o.y[0]!) >= o.r[0]! + 16;
    };
    const k = livre.direcaoSorteada;
    const ordem = [k + 1, k - 1, k + 2, k - 2, k + 3, k - 3, k + 4, k - 4, k + 5, k - 5, k + 6, k - 6, k + 7, k - 7];
    const esperado = ordem.find(livreEm)!;
    expect(Math.hypot(desviado.x - (585 + livre.raio * DIRECAO_X[(esperado + 256) % 256]!), desviado.y - (1266 + livre.raio * DIRECAO_Y[(esperado + 256) % 256]!))).toBeLessThan(1e-3);
  });

  it('sem nenhuma direção livre, o spawn é recusado e soma em semPontoLivre', () => {
    const fechado = dadosDe({ obstaculos: [{ x: 585, y: 1266, tamanho_px: 1600 }] });
    const e = criarEstado(1, fechado);
    e.cab[CAB.passo] = 1;
    e.cab[CAB.relogio] = 1;
    rodarDiretor(e, fechado, false);
    expect(e.mundo[MUNDO.spawns]).toBe(0);
    expect(e.mundo[MUNDO.semPontoLivre]).toBe(15);
  });
});
