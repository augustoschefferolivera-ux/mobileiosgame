// Render da horda (design/decisoes-F-003.md §7): prepararHorda igual às funções
// do toro e da câmera, tabela de desenho, cores (V1) e o F-003.11 com o
// SpriteGPULayer real do Phaser 4.2.1 sobre um gl falso: stride de 168 B, os
// offsets que o escritor usa lidos pelo getMember do próprio Phaser, o caminho
// DYNAMIC_DRAW e a limpeza do que o preDestroy não libera.
import { criarCena } from './phaserFalso';
import { beforeAll, describe, expect, it } from 'vitest';
import Phaser from 'phaser';
import inimigos from '../../src/dados/inimigos.json';
import { COR, COR_DO_INIMIGO } from '../../src/cenas/estilo';
import { arredondarParaOPixel } from '../../src/cenas/render/camera';
import { FLOATS_POR_MEMBRO, HordaPorGPU, OFFSET, tintOpaco } from '../../src/cenas/render/escritores';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { escalaPara } from '../../src/cenas/render/atlas';
import { criarEstado } from '../../src/logica/nucleo/estado';
import { semear, proximoUnitario } from '../../src/logica/nucleo/rng';
import { nascerInimigo, removerInimigo } from '../../src/logica/mundo/inimigos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, copiaMaisProxima, interpolarNoToro } from '../../src/logica/mundo/toro';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('prepararHorda', () => {
  it('em 2.000 slots aleatórios (inclusive na costura), igual a interpolar, arredondar e levar à cópia mais próxima', () => {
    const rng = new Uint32Array(4);
    semear(rng, 0, 11, 'diretor');
    const u = (): number => proximoUnitario(rng, 0);
    const saida = criarSaidaDaHorda();
    for (let rodada = 0; rodada < 4; rodada++) {
      const e = criarEstado(1, D);
      for (let k = 0; k < 500; k++) {
        const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, u() * W, u() * H, false);
        // Metade perto da costura: xAnt e x em lados opostos.
        e.inimigos.xAnt[s] = k % 2 === 0 ? (e.inimigos.x[s]! + 1168 + u() * 4) % W : e.inimigos.x[s]! - u() * 2;
        e.inimigos.yAnt[s] = k % 3 === 0 ? (e.inimigos.y[s]! + 2530 + u() * 4) % H : e.inimigos.y[s]! + u() * 2;
      }
      const [alfa, camX, camY] = [u(), u() * W, u() * H];
      prepararHorda(e, alfa, camX, camY, saida);
      for (let s = 0; s < 500; s++) {
        const x = arredondarParaOPixel(interpolarNoToro(e.inimigos.xAnt[s]!, e.inimigos.x[s]!, alfa, W));
        const y = arredondarParaOPixel(interpolarNoToro(e.inimigos.yAnt[s]!, e.inimigos.y[s]!, alfa, H));
        expect(saida.x[s]).toBe(copiaMaisProxima(x, camX, W));
        expect(saida.y[s]).toBe(copiaMaisProxima(y, camY, H));
        expect(Math.abs(saida.x[s]! - camX)).toBeLessThanOrEqual(W / 2);
      }
    }
  });

  it('o slot livre sai invisível (tipo 0) e o vivo sai com o seu tipo', () => {
    const e = criarEstado(1, D);
    const a = nascerInimigo(e, D, TIPO.oco_grande, 100, 100, false);
    const b = nascerInimigo(e, D, TIPO.novica_de_sal, 200, 200, false);
    removerInimigo(e, a);
    const saida = criarSaidaDaHorda();
    saida.tipo.fill(9);
    prepararHorda(e, 1, 585, 1266, saida);
    expect([saida.tipo[a], saida.tipo[b], saida.tipo[499]]).toEqual([0, TIPO.novica_de_sal, 0]);
  });
});

describe('tabela de desenho', () => {
  it('massa em círculo de 32 pt e médios em quadrado de 48 pt, com as cores de estilo.ts; o resto fica null', () => {
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    expect(tabela[TIPO.oco_das_lanternas]).toEqual({
      moldura: 'massa',
      escala: escalaPara('massa', 32),
      cor: COR_DO_INIMIGO['oco_das_lanternas'],
      tint: tintOpaco(COR_DO_INIMIGO['oco_das_lanternas']!),
    });
    expect(tabela[TIPO.oco_grande]).toEqual({
      moldura: 'quadrado',
      escala: escalaPara('quadrado', 48),
      cor: COR_DO_INIMIGO['oco_grande'],
      tint: tintOpaco(COR_DO_INIMIGO['oco_grande']!),
    });
    expect(tabela[TIPO.novica_de_sal]).toMatchObject({ moldura: 'quadrado', cor: COR_DO_INIMIGO['novica_de_sal'] });
    expect([tabela[TIPO.vazio], tabela[TIPO.oco_grande_coroado], tabela[TIPO.o_lanterneiro]]).toEqual([null, null, null]);
    expect(escalaPara('massa', 32)).toBe(0.5);
  });

  it('um tipo que nasce sem tamanho ou sem cor é erro na montagem', () => {
    const existe = Uint8Array.from(D.tipos.existe);
    existe[TIPO.oco_grande_coroado] = 1;
    expect(() => criarTabelaDeDesenho(inimigos.inimigos, existe)).toThrow(/oco_grande_coroado/);
  });
});

// Cores (V1): contraste WCAG, CIEDE2000 (sRGB, D65) e deuteranopia/protanopia de Machado (2009), severidade 1.
const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (cor: number): number[] => [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255].map((c) => lin(c / 255));
const luminancia = (cor: number): number => {
  const [r, g, b] = rgb(cor) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: number, b: number): number => {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
function lab(linear: number[]): [number, number, number] {
  const [r, g, b] = linear as [number, number, number];
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function de2000(p: number[], q: number[]): number {
  const [L1, a1, b1] = lab(p);
  const [L2, a2, b2] = lab(q);
  const rad = Math.PI / 180;
  const cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)));
  const [a1p, a2p] = [(1 + G) * a1, (1 + G) * a2];
  const [c1, c2] = [Math.hypot(a1p, b1), Math.hypot(a2p, b2)];
  const ang = (x: number, y: number): number => (x === 0 && y === 0 ? 0 : (Math.atan2(y, x) / rad + 360) % 360);
  const [h1, h2] = [ang(a1p, b1), ang(a2p, b2)];
  let dh = 0;
  if (c1 * c2 !== 0) dh = h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh * rad) / 2);
  const lm = (L1 + L2) / 2;
  const cmp = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const rc = 2 * Math.sqrt(cmp ** 7 / (cmp ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2);
  const [sc, sh] = [1 + 0.045 * cmp, 1 + 0.015 * cmp * T];
  const rt = -Math.sin(2 * 30 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad) * rc;
  const [x, y, z] = [(L2 - L1) / sl, (c2 - c1) / sc, dH / sh];
  return Math.sqrt(x * x + y * y + z * z + rt * y * z);
}
const DEUTERANOPIA = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
const PROTANOPIA = [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]];
const simular = (cor: number, m: number[][]): number[] => {
  const c = rgb(cor);
  return m.map((l) => Math.min(1, Math.max(0, l[0]! * c[0]! + l[1]! * c[1]! + l[2]! * c[2]!)));
};

describe('cores dos inimigos (V1)', () => {
  const cores = Object.values(COR_DO_INIMIGO);
  /** Reservadas: a paleta da cena e as do doc 13 §1.3 (vermelhos de dano e telegrafo, branco, as 3 Cinzas e o crítico). */
  const RESERVADAS = [COR.fundo, COR.cinzaFrio, COR.pedra, COR.brasa, COR.laranjaQueimado, 0x7a1f1f, 0xff2a2a, COR.osso, COR.sal, 0xffffff, 0x5aa9e6, 0x6cc57c, 0xc8324b, 0xffd166];

  it('os três tipos que a F-003 desenha têm cor', () => {
    expect(Object.keys(COR_DO_INIMIGO).sort()).toEqual(['novica_de_sal', 'oco_das_lanternas', 'oco_grande']);
  });

  it('contraste ≥ 3:1 contra o fundo e contra os obstáculos, e luminância abaixo da brasa', () => {
    for (const c of cores) {
      expect(contraste(c, COR.fundo)).toBeGreaterThanOrEqual(3);
      expect(contraste(c, COR.cinzaFrio)).toBeGreaterThanOrEqual(3);
      expect(luminancia(c)).toBeLessThan(luminancia(COR.brasa));
    }
  });

  it('ΔE2000 ≥ 14 contra as reservadas e ≥ 18 entre si; ≥ 17,5 entre si com deuteranopia e protanopia', () => {
    for (const c of cores) for (const r of RESERVADAS) expect(de2000(rgb(c), rgb(r)), `${c.toString(16)} × ${r.toString(16)}`).toBeGreaterThanOrEqual(14);
    for (let i = 0; i < cores.length; i++) {
      for (let j = i + 1; j < cores.length; j++) {
        const [a, b] = [cores[i]!, cores[j]!];
        expect(de2000(rgb(a), rgb(b))).toBeGreaterThanOrEqual(18);
        for (const m of [DEUTERANOPIA, PROTANOPIA]) expect(de2000(simular(a, m), simular(b, m))).toBeGreaterThanOrEqual(17.5);
      }
    }
  });
});

// F-003.11: o SpriteGPULayer real sobre um gl e um renderer falsos (phaserFalso.ts).
type Membro = { x: number; y: number; scaleX: number; scaleY: number; alpha: number; frame: string; tintTopLeft: number; alphaTopLeft: number };

describe('SpriteGPULayer do Phaser 4.2.1 (F-003.11)', () => {
  let tabela: ReturnType<typeof criarTabelaDeDesenho>;
  beforeAll(() => {
    tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
  });

  it('stride de 168 B (42 floats) e os offsets do escritor batem com os campos que o addMember grava', () => {
    const { cena } = criarCena();
    const layer = (cena.add as unknown as { spriteGPULayer: (c: string, n: number) => Phaser.GameObjects.SpriteGPULayer }).spriteGPULayer('atlas', 4);
    expect(layer.getDataByteSize()).toBe(168);
    expect(FLOATS_POR_MEMBRO).toBe(42);
    layer.addMember({ frame: 'quadrado', x: 10.5, y: 20.25, rotation: 0.75, scaleX: 0.5, scaleY: 0.375, alpha: 0.625, tintBlend: 0.125, tintMode: 2, tintTopLeft: 0x9fa39a } as never);
    const u32 = layer.getMemberData(0)!;
    const f32 = new Float32Array(u32.buffer, u32.byteOffset, FLOATS_POR_MEMBRO);
    expect([f32[OFFSET.x], f32[OFFSET.y], f32[OFFSET.rotacao], f32[OFFSET.escalaX], f32[OFFSET.escalaY], f32[OFFSET.alpha], f32[OFFSET.tintBlend]]).toEqual([
      10.5, 20.25, 0.75, 0.5, 0.375, 0.625, 0.125,
    ]);
    expect(f32[OFFSET.moldura]).toBe((layer.frameDataIndices as Record<string, number>)['quadrado']);
    expect(f32[OFFSET.tintMode]).toBe(2);
    // Os 4 tints: 32 é o de baixo à esquerda, 33 o de cima à esquerda (o que o addMember recebeu aqui).
    expect(u32[OFFSET.tint + 1]).toBe(tintOpaco(0x9fa39a));
  });

  for (const dinamico of [false, true]) {
    it(`o escritor grava pelo buffer e o getMember do Phaser lê o mesmo (${dinamico ? 'DYNAMIC_DRAW' : 'STATIC_DRAW'})`, () => {
      const { cena, renderer } = criarCena();
      const horda = new HordaPorGPU(cena, dinamico);
      expect(horda.bufferDinamico).toBe(dinamico);
      const layer = (horda as unknown as { layer: Phaser.GameObjects.SpriteGPULayer }).layer;
      expect(layer.memberCount).toBe(500);
      const saida = criarSaidaDaHorda();
      saida.tipo[3] = TIPO.oco_das_lanternas;
      saida.x[3] = 100.5;
      saida.y[3] = -12;
      saida.tipo[7] = TIPO.novica_de_sal;
      saida.x[7] = 1200;
      saida.y[7] = 2600.5;
      horda.escrever(saida, tabela);
      const vivo = layer.getMember(3) as unknown as Membro;
      expect(vivo).toMatchObject({ x: 100.5, y: -12, scaleX: 0.5, scaleY: 0.5, alpha: 1, frame: 'massa' });
      expect([vivo.tintTopLeft, vivo.alphaTopLeft]).toEqual([COR_DO_INIMIGO['oco_das_lanternas'], 1]);
      const medio = layer.getMember(7) as unknown as Membro;
      expect(medio).toMatchObject({ x: 1200, y: 2600.5, frame: 'quadrado', tintTopLeft: COR_DO_INIMIGO['novica_de_sal'] });
      for (const morto of [0, 4, 499]) expect(layer.getMember(morto)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      // O slot que morre volta a ser invisível no frame seguinte.
      saida.tipo[3] = 0;
      horda.escrever(saida, tabela);
      expect(layer.getMember(3)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      // Limpeza: os buffers e a textura de molduras saem das listas do renderer, e o VAO de cada programa é destruído.
      let destruidos = 0;
      const vao = { destroy: () => destruidos++ };
      renderer.glVAOWrappers.push(vao);
      (layer.submitterNode.programManager as unknown as { programs: Record<string, unknown> }).programs = { k: { vao } };
      expect([renderer.glBufferWrappers.length, renderer.glTextureWrappers.length]).toEqual([2, 1]);
      layer.destroy = () => undefined as never;
      horda.liberar();
      expect([renderer.glBufferWrappers.length, renderer.glTextureWrappers.length, renderer.glVAOWrappers.length, destruidos]).toEqual([0, 0, 0, 1]);
    });
  }
});
