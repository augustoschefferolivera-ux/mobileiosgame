// Checagem automática da arte (design/arte/style-card.md §7): paleta,
// contorno fechado, tamanhos e o limite de cor quente nos inimigos. Roda sobre
// as mesmas grades e procedurais que o jogo e as amostras usam.
import { describe, expect, it } from 'vitest';
import { lerPixel, rasterizar, type Grade, type Imagem } from '../../src/arte/imagem';
import { COR_DA_CHAVE, PALETA, QUENTES, RESERVADAS, VAZIO } from '../../src/arte/paleta';
import { arcoDoGolpe, brilho, chao, clarear, cristal, faca, rocha, virarCinza } from '../../src/arte/procedural';
import { ALDRIC_PARADO } from '../../src/arte/sprites/aldric';
import { ALMA, BAU_COMUM, BAU_DOURADO, ICONE_ESPADA } from '../../src/arte/sprites/itens';
import { OCO_DAS_LANTERNAS, OCO_GRANDE } from '../../src/arte/sprites/ocos';
import { NOVICA_DE_SAL } from '../../src/arte/sprites/sepultadoras';

const K = COR_DA_CHAVE.K!;
const CORES = new Set(PALETA.map((c) => c.hex));

/** Sprites desenhados à mão, com o tamanho exigido pela escala do style card §4. */
const SPRITES: { nome: string; grade: Grade; largura: number; altura: number; inimigo: boolean }[] = [
  { nome: 'Aldric parado', grade: ALDRIC_PARADO, largura: 24, altura: 24, inimigo: false },
  { nome: 'Oco das Lanternas', grade: OCO_DAS_LANTERNAS, largura: 16, altura: 16, inimigo: true },
  { nome: 'Oco Grande', grade: OCO_GRANDE, largura: 24, altura: 24, inimigo: true },
  { nome: 'Noviça de Sal', grade: NOVICA_DE_SAL, largura: 24, altura: 24, inimigo: true },
  { nome: 'Alma', grade: ALMA, largura: 7, altura: 8, inimigo: false },
  { nome: 'baú comum', grade: BAU_COMUM, largura: 16, altura: 11, inimigo: false },
  { nome: 'baú dourado', grade: BAU_DOURADO, largura: 16, altura: 11, inimigo: false },
  { nome: 'ícone da espada', grade: ICONE_ESPADA, largura: 14, altura: 14, inimigo: false },
];

/** Pixels cheios que encostam no vazio (4-conexo) ou na borda da imagem e não são K. */
function contornoAberto(img: Imagem): string[] {
  const falhas: string[] = [];
  const vazio = (x: number, y: number): boolean => x < 0 || y < 0 || x >= img.largura || y >= img.altura || lerPixel(img, x, y).alfa === 0;
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const p = lerPixel(img, x, y);
      if (p.alfa === 0 || p.cor === K) continue;
      if (vazio(x + 1, y) || vazio(x - 1, y) || vazio(x, y + 1) || vazio(x, y - 1)) falhas.push(`(${x}, ${y})`);
    }
  }
  return falhas;
}

function coresForaDaPaleta(img: Imagem): number[] {
  const fora = new Set<number>();
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const p = lerPixel(img, x, y);
      if (p.alfa !== 0 && !CORES.has(p.cor)) fora.add(p.cor);
    }
  }
  return [...fora];
}

describe('arte: paleta', () => {
  it('tem 32 cores e chaves únicas de 1 caractere, sem o vazio', () => {
    expect(PALETA).toHaveLength(32);
    const chaves = PALETA.map((c) => c.chave);
    expect(new Set(chaves).size).toBe(32);
    for (const ch of chaves) expect(ch).toHaveLength(1);
    expect(chaves).not.toContain(VAZIO);
  });

  it('mantém as cores fixas do doc 13 §1.3', () => {
    expect(COR_DA_CHAVE.K).toBe(0x0b0e14);
    expect(COR_DA_CHAVE.F).toBe(0x1a1f2b);
    expect(COR_DA_CHAVE.D).toBe(0x2b3340);
    expect(COR_DA_CHAVE.A).toBe(0xffb347);
    expect(COR_DA_CHAVE.B).toBe(0xe2652b);
    expect(COR_DA_CHAVE.C).toBe(0x7a1f1f);
    expect(COR_DA_CHAVE.O).toBe(0xe8dcc4);
    expect(COR_DA_CHAVE.S).toBe(0xdfe8ea);
    expect(COR_DA_CHAVE.W).toBe(0xffffff);
    expect(COR_DA_CHAVE.R).toBe(0xff2a2a);
  });
});

describe.each(SPRITES)('arte: $nome', ({ grade, largura, altura, inimigo }) => {
  const img = rasterizar(grade);

  it('tem o tamanho da escala', () => {
    expect([img.largura, img.altura]).toEqual([largura, altura]);
  });

  it('só usa chaves da paleta e nenhuma reservada (W, R)', () => {
    const chaves = new Set(grade.join('').replaceAll(VAZIO, ''));
    for (const ch of chaves) {
      expect(COR_DA_CHAVE[ch], ch).toBeDefined();
      expect(RESERVADAS.includes(ch), ch).toBe(false);
    }
  });

  it('tem o contorno de 1 px em K fechado', () => {
    expect(contornoAberto(img)).toEqual([]);
  });

  it('inimigo: no máximo 1 px de cor quente', () => {
    const quentes = [...grade.join('')].filter((ch) => QUENTES.includes(ch)).length;
    expect(quentes).toBeLessThanOrEqual(inimigo ? 1 : Infinity);
  });
});

describe('arte: procedurais', () => {
  const casos: [string, Imagem][] = [
    ...[0, 22.5, 45, 67.5].map((g): [string, Imagem] => [`faca ${g}°`, faca(g)]),
    ['cristal azul', cristal(2, 3, 'b')],
    ['cristal verde', cristal(3, 4, 'g')],
    ['cristal vermelho', cristal(4, 5, 'r')],
    ...[1, 2, 3].map((s): [string, Imagem] => [`rocha ${s}`, rocha(4 + 3 * s, s)]),
  ];

  it.each(casos)('%s: paleta e contorno fechado', (_nome, img) => {
    expect(coresForaDaPaleta(img)).toEqual([]);
    expect(contornoAberto(img)).toEqual([]);
  });

  it('efeitos e quadros derivados ficam na paleta', () => {
    const oco = rasterizar(OCO_DAS_LANTERNAS);
    for (const img of [chao(0), chao(5), brilho(16), arcoDoGolpe(46, 0), arcoDoGolpe(46, 1), arcoDoGolpe(46, 2), clarear(oco), virarCinza(oco, 0), virarCinza(oco, 1), virarCinza(oco, 2)]) {
      expect(coresForaDaPaleta(img)).toEqual([]);
    }
  });

  it('a faca de 0° é simétrica (o eixo cai no centro)', () => {
    const img = faca(0);
    for (let y = 0; y < img.altura; y++) {
      for (let x = 0; x < img.largura; x++) expect(lerPixel(img, x, y).alfa, `(${x}, ${y})`).toBe(lerPixel(img, img.largura - 1 - x, y).alfa);
    }
  });
});
