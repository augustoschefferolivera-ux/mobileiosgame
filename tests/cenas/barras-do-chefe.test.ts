// As barras do chefe (F-009 HD1): a caixa na safe-area, as cores medidas (ΔE ≥ 20) e o céu das duas fases finais. Sem Phaser.
import { describe, expect, it } from 'vitest';
import { larguraDaBarraDoChefe } from '../../src/cenas/barrasDoChefe';
import { BARRAS_DO_CHEFE, caixaDasBarrasDoChefe, caixaDaBarraDeXp, posicaoDoHudDeAlmas, type CaixaDaBarra } from '../../src/cenas/layoutDoHud';
import { COR } from '../../src/cenas/paleta';
import { CEU_FINAL, veuDaVigilia } from '../../src/cenas/render/estruturas';
import { CAB, CHEFE_U16, CHEFE_U32, ETAPA, FOGUEIRA_U8 } from '../../src/logica/nucleo/estado';
import { estadoDoChefe } from '../logica/chefe/apoio';
import { insetsZerados } from '../../src/plataforma/safeArea';

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function lab(h: number): [number, number, number] {
  const [r, g, b] = [lin((h >> 16) & 255), lin((h >> 8) & 255), lin(h & 255)];
  const [x, y, z] = [0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b];
  const f = (v: number): number => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const [fx, fy, fz] = [f(x / 0.95047), f(y), f(z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a: number, b: number): number => Math.hypot(...(lab(a).map((v, i) => v - lab(b)[i]!) as [number, number, number]));
const caixa = (ins = insetsZerados()): CaixaDaBarra => caixaDasBarrasDoChefe(ins, { x: 0, y: 0, largura: 0, altura: 0 });

describe('barras do chefe (HD1)', () => {
  it('300 pt centradas em 390 pt, 154 pt abaixo do topo: abaixo das Almas, sem passar da área segura', () => {
    expect(caixa()).toEqual({ x: 45, y: 154, largura: 300, altura: 12 });
    const lat = caixa({ topo: 47, direita: 10, baixo: 34, esquerda: 20 });
    expect(lat.x).toBeGreaterThanOrEqual(20 + BARRAS_DO_CHEFE.recuo);
    expect(lat.x + lat.largura).toBeLessThanOrEqual(390 - 10 - BARRAS_DO_CHEFE.recuo);
    const almas = posicaoDoHudDeAlmas(insetsZerados(), { x: 0, y: 0 });
    expect(caixa().y - BARRAS_DO_CHEFE.nomeAcima).toBeGreaterThan(almas.y + 14);
    expect(caixaDaBarraDeXp(insetsZerados(), { x: 0, y: 0, largura: 0, altura: 0 }).y).toBeLessThan(caixa().y);
  });

  it('a largura do preenchimento é a fração do máximo, limitada a [0, largura]', () => {
    expect(larguraDaBarraDoChefe(300, 7020, 14040)).toBe(150);
    expect(larguraDaBarraDoChefe(300, 20000, 14040)).toBe(300);
    expect(larguraDaBarraDoChefe(300, -1, 100)).toBe(0);
    expect(larguraDaBarraDoChefe(300, 5, 0)).toBe(0);
  });

  it('a Postura é #7aa2c9 (nem branco nem #ff2a2a), com ΔE ≥ 20 contra o fundo e contra o HP do chefe', () => {
    expect(COR.postura).toBe(0x7aa2c9);
    expect(deltaE(COR.postura, COR.fundo)).toBeGreaterThanOrEqual(20);
    expect(deltaE(COR.postura, COR.cinzaVermelha)).toBeGreaterThanOrEqual(20);
    expect(deltaE(COR.cinzaVermelha, COR.fundo)).toBeGreaterThanOrEqual(20);
    expect(deltaE(COR.brasa, COR.postura)).toBeGreaterThanOrEqual(20);
    for (const c of [COR.postura, COR.cinzaVermelha]) expect([0xffffff, 0xff2a2a]).not.toContain(c);
  });
});

describe('céu das fases finais', () => {
  const v = new Float64Array(3);
  it('antes de 15:00 não há véu; em A Fome o véu vinho cresce com os passos da fome', () => {
    const e = estadoDoChefe();
    e.cab[CAB.relogio] = 1000;
    veuDaVigilia(e, v);
    expect([v[0], v[2]]).toEqual([0, 0]);
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.aFome;
    e.chefeU32[CHEFE_U32.fomePassos] = 0;
    veuDaVigilia(e, v);
    expect([v[0], v[1]]).toEqual([CEU_FINAL.fome.de, CEU_FINAL.fome.cor]);
    e.chefeU32[CHEFE_U32.fomePassos] = 520;
    veuDaVigilia(e, v);
    expect(v[0]).toBeCloseTo(CEU_FINAL.fome.ate, 6);
  });

  it('no Amanhecer o véu cai de 0,40 a 0 em 600 passos e a aurora sobe de 0 a 0,50', () => {
    const e = estadoDoChefe();
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.amanhecer;
    e.chefeU16[CHEFE_U16.amanhecerPassos] = 0;
    veuDaVigilia(e, v);
    expect([v[0], v[2]]).toEqual([0.4, 0]);
    e.chefeU16[CHEFE_U16.amanhecerPassos] = 300;
    veuDaVigilia(e, v);
    expect([v[0]!, v[2]!]).toEqual([expect.closeTo(0.2, 6), expect.closeTo(0.25, 6)]);
    e.chefeU16[CHEFE_U16.amanhecerPassos] = 600;
    veuDaVigilia(e, v);
    expect([v[0], v[2]]).toEqual([0, CEU_FINAL.amanhecer.aurora]);
    expect(CEU_FINAL.amanhecer.aurora).toBe(0.5);
  });
});
