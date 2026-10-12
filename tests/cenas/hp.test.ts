// Barra de HP, retardo e sinal de acerto (design/decisoes-F-007.md HB1, HB2, HB3), sem Phaser.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BARRA_DE_HP,
  RETARDO_DO_HP,
  VAGAS_DO_HUD,
  caixaDaBarraDeHp,
  caixaDaBarraDeStamina,
  caixaDaBarraDeXp,
  numeroDoHp,
  trechosDaBarraDeHp,
  yDoNumeroDeHp,
  type CaixaDaBarra,
} from '../../src/cenas/layoutDoHud';
import { COR } from '../../src/cenas/paleta';
import { RetardoDeHp } from '../../src/cenas/retardoDeHp';
import { t } from '../../src/cenas/textos';
import { ALTURA_LOGICA, LARGURA_LOGICA, insetsZerados, type Insets } from '../../src/plataforma/safeArea';

const IPHONE: Insets = { topo: 59, direita: 0, baixo: 34, esquerda: 0 };
const LATERAIS: Insets = { topo: 47, direita: 10, baixo: 34, esquerda: 20 };
const caixa = (f: typeof caixaDaBarraDeHp, i: Insets): CaixaDaBarra => f(i, { x: 0, y: 0, largura: 0, altura: 0 });

/** Luminância relativa e razão de contraste WCAG; ΔE CIE76 em Lab D65. */
function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function xyz(h: number): [number, number, number] {
  const [r, g, b] = [lin((h >> 16) & 255), lin((h >> 8) & 255), lin(h & 255)];
  return [0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b];
}
function razao(a: number, b: number): number {
  const [la, lb] = [xyz(a)[1], xyz(b)[1]];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function lab(h: number): [number, number, number] {
  const [x, y, z] = xyz(h);
  const f = (v: number): number => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const [fx, fy, fz] = [f(x / 0.95047), f(y), f(z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE(a: number, b: number): number {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe('barra de HP (HB1)', () => {
  it('10 pt em topo + 56, na metade esquerda da faixa da barra de XP: x = esquerda + 80, largura 119 pt', () => {
    expect(caixa(caixaDaBarraDeHp, insetsZerados())).toEqual({ x: 80, y: 56, largura: 119, altura: 10 });
    expect(caixa(caixaDaBarraDeHp, IPHONE)).toEqual({ x: 80, y: 115, largura: 119, altura: 10 });
    expect(caixa(caixaDaBarraDeHp, LATERAIS)).toEqual({ x: 100, y: 103, largura: 104, altura: 10 });
  });

  it('HP e stamina dividem a faixa da XP com vão de 8 pt, sem se tocar e sem passar dela (390 × 844)', () => {
    for (const ins of [insetsZerados(), IPHONE, LATERAIS]) {
      const hp = caixa(caixaDaBarraDeHp, ins);
      const st = caixa(caixaDaBarraDeStamina, ins);
      const xp = caixa(caixaDaBarraDeXp, ins);
      expect(st.x - (hp.x + hp.largura)).toBe(BARRA_DE_HP.vao);
      expect(hp.x).toBe(xp.x);
      expect(st.x + st.largura).toBeCloseTo(xp.x + xp.largura, 9);
      expect(hp.y).toBe(st.y);
      expect(hp.x).toBeGreaterThanOrEqual(ins.esquerda);
      expect(st.x + st.largura).toBeLessThanOrEqual(LARGURA_LOGICA - ins.direita);
      expect(hp.y).toBeGreaterThanOrEqual(ins.topo);
    }
  });

  it('o número fica sob a barra e acima da linha de vagas (topo + 80), 12 pt de corpo', () => {
    for (const ins of [insetsZerados(), IPHONE, LATERAIS]) {
      const hp = caixa(caixaDaBarraDeHp, ins);
      const y = yDoNumeroDeHp(hp);
      expect(y).toBe(hp.y + 10 + 2);
      expect(y + BARRA_DE_HP.corpoDoNumero).toBeLessThanOrEqual(ins.topo + VAGAS_DO_HUD.abaixoDoTopo);
    }
    expect(ALTURA_LOGICA).toBe(844);
  });

  it('os trechos: HP, cura do Frasco (hp até hp + resto, no máximo hpMax) e retardo (até o HP de antes)', () => {
    const out = new Float64Array(3);
    trechosDaBarraDeHp(120, 75, 150, 0, 75, out);
    expect(Array.from(out)).toEqual([60, 60, 60]);
    trechosDaBarraDeHp(120, 75, 150, 30, 90, out);
    expect(Array.from(out)).toEqual([60, 84, 72]);
    trechosDaBarraDeHp(120, 140, 150, 60, 140, out);
    expect(Array.from(out)).toEqual([112, 120, 112]);
    trechosDaBarraDeHp(120, 0, 150, 0, 150, out);
    expect(Array.from(out)).toEqual([0, 0, 120]);
    trechosDaBarraDeHp(120, 150, 150, -5, 10, out);
    expect(Array.from(out)).toEqual([120, 120, 120]);
  });

  it('o número usa ceil: HP > 0 nunca mostra 0; 0 mostra 0', () => {
    expect([0.3, 70.2, 71, 150, 0, -3].map(numeroDoHp)).toEqual([1, 71, 71, 150, 0, 0]);
  });

  it('o texto do número é por t(id), só o algarismo', () => {
    expect(t('A5.HUD.HP', { hp: 71 })).toBe('71');
  });
});

describe('contraste e ΔE do retardo (HB1, HB3)', () => {
  it('o retardo tem ΔE ≥ 20 contra a Cinza vermelha e contra o fundo; a Cinza vermelha sozinha não serve (ΔE 0)', () => {
    expect(deltaE(COR.retardoDeHp, COR.cinzaVermelha)).toBeGreaterThanOrEqual(20);
    expect(deltaE(COR.retardoDeHp, COR.fundo)).toBeGreaterThanOrEqual(20);
    expect(deltaE(COR.cinzaVermelha, COR.cinzaVermelha)).toBe(0);
  });

  it('o número em osso tem razão ≥ 4,5 sobre o fundo e sobre o retardo', () => {
    expect(razao(COR.osso, COR.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(razao(COR.osso, COR.retardoDeHp)).toBeGreaterThanOrEqual(4.5);
  });

  it('nunca branco nem #ff2a2a; o trecho da cura se distingue da brasa cheia', () => {
    expect([COR.retardoDeHp, COR.brasaClara, COR.brasa]).not.toContain(0xffffff);
    expect([COR.retardoDeHp, COR.brasaClara, COR.brasa]).not.toContain(0xff2a2a);
    expect(deltaE(COR.brasaClara, COR.brasa)).toBeGreaterThanOrEqual(10);
    expect(COR.laranjaQueimado).toBe(0xe2652b);
    expect(COR.retardoDeHp).not.toBe(COR.laranjaQueimado);
  });

  it('o JSON de textos não traz cor nem número solto no HUD de HP', () => {
    const j = JSON.parse(readFileSync('src/dados/textos/pt-BR.json', 'utf8')) as { textos: { id: string; texto: string }[] };
    expect(j.textos.find((x) => x.id === 'A5.HUD.HP')?.texto).toBe('{hp}');
  });
});

describe('retardo da perda (HB2): janela exata em passos', () => {
  it('a perda no passo P mostra o HP de antes em P a P + 11 e já é o HP em P + 12 (P = 101: retardo em 101..112)', () => {
    const r = new RetardoDeHp();
    r.atualizar(150, 100);
    r.atualizar(130, 101);
    const vistos: number[] = [];
    for (let p = 101; p <= 113; p++) {
      r.atualizar(130, p);
      vistos.push(r.valor);
    }
    expect(vistos).toEqual([...Array(12).fill(150), 130]);
    expect(RETARDO_DO_HP.passos).toBe(12);
  });

  it('uma nova perda dentro da janela renova os 12 passos e mantém o valor mais alto', () => {
    const r = new RetardoDeHp();
    r.atualizar(150, 100);
    r.atualizar(140, 101);
    r.atualizar(140, 105);
    r.atualizar(120, 106);
    expect(r.valor).toBe(150);
    r.atualizar(120, 117);
    expect(r.valor).toBe(150);
    r.atualizar(120, 118);
    expect(r.valor).toBe(120);
  });

  it('cura (HP sobe) alcança na hora; Vigília nova recomeça sem retardo', () => {
    const r = new RetardoDeHp();
    r.atualizar(150, 0);
    r.atualizar(100, 1);
    r.atualizar(101, 2);
    expect(r.valor).toBe(150);
    r.atualizar(160, 3);
    expect(r.valor).toBe(160);
    r.reiniciar();
    r.atualizar(80, 0);
    expect(r.valor).toBe(80);
  });
});
