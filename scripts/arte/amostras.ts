// As 3 amostras do style card (design/arte/style-card.md §8), geradas das
// mesmas grades e procedurais que o jogo usa:
//   1. a paleta e o Aldric (ampliado, com a luz e o golpe, e em escala real);
//   2. um modelo de cada categoria, na mesma escala de pixel;
//   3. uma cena em escala real de 390 × 844 pt, no canvas de 2× (780 × 1688).
// `node scripts/arte/rodar.mjs amostras [pasta]` (padrão: design/arte).
import { compor, novaImagem, pintar, rasterizar, type Imagem } from '../../src/arte/imagem';
import { COR_DA_CHAVE, PALETA } from '../../src/arte/paleta';
import { anel, arcoDoGolpe, brilho, chao, clarear, contornar, cristal, disco, faca, rocha, setor, virarCinza } from '../../src/arte/procedural';

const ICONE_ESPADA = MIOLO_DOS_ICONES.espada;
import { ALDRIC_PARADO } from '../../src/arte/sprites/aldric';
import { ALMA, BAU_COMUM, BAU_DOURADO, MIOLO_DOS_ICONES } from '../../src/arte/sprites/itens';
import { OCO_DAS_LANTERNAS, OCO_GRANDE } from '../../src/arte/sprites/ocos';
import { NOVICA_DE_SAL } from '../../src/arte/sprites/sepultadoras';
import { FONTE_DOS_DIGITOS } from '../../src/cenas/render/atlas';
import { salvarPng } from './png';

const cor = (chave: string): number => COR_DA_CHAVE[chave]!;

function preencher(img: Imagem, chave: string): void {
  for (let y = 0; y < img.altura; y++) for (let x = 0; x < img.largura; x++) pintar(img, x, y, cor(chave));
}

function retangulo(img: Imagem, x0: number, y0: number, w: number, h: number, chave: string, alfa = 255): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pintar(img, x, y, cor(chave), alfa);
}

/** Número com a fonte pixel 5 × 7 dos dígitos (a mesma do jogo), em células de `c` px. */
function numero(img: Imagem, n: number, x0: number, y0: number, c: number, chave: string): void {
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    const bits = FONTE_DOS_DIGITOS[Number(s[i])]!;
    for (let l = 0; l < 7; l++) for (let k = 0; k < 5; k++) if ((bits[l]! >> (4 - k)) & 1) retangulo(img, x0 + i * 6 * c + k * c, y0 + l * c, c, c, chave);
  }
}

/** Gira em múltiplos de 90° (o único giro permitido na arte; style card §6). */
function girar90(img: Imagem, vezes: number): Imagem {
  let atual = img;
  for (let v = 0; v < ((vezes % 4) + 4) % 4; v++) {
    const s = novaImagem(atual.altura, atual.largura);
    for (let y = 0; y < atual.altura; y++) {
      for (let x = 0; x < atual.largura; x++) {
        const i = (y * atual.largura + x) * 4;
        const j = (x * s.largura + (s.largura - 1 - y)) * 4;
        s.px.set(atual.px.subarray(i, i + 4), j);
      }
    }
    atual = s;
  }
  return atual;
}

/** Faca em qualquer uma das 16 direções: 4 desenhos e giros de 90°. */
function facaEm(direcao16: number): Imagem {
  return girar90(faca((direcao16 % 4) * 22.5), Math.floor(direcao16 / 4));
}

function amostraUm(): Imagem {
  const img = novaImagem(1260, 600);
  preencher(img, 'F');
  // Paleta: 2 linhas de 16 amostras de 64 px, com o índice embaixo.
  PALETA.forEach((c, i) => {
    const x = 20 + (i % 16) * 76;
    const y = 20 + Math.floor(i / 16) * 110;
    retangulo(img, x - 2, y - 2, 68, 68, 'K');
    retangulo(img, x, y, 64, 64, c.chave);
    numero(img, i, x + 2, y + 74, 3, 'O');
  });
  const aldric = rasterizar(ALDRIC_PARADO);
  // Três vezes ampliado (12×): sem luz, com a luz da brasa, com o golpe.
  for (let i = 0; i < 3; i++) {
    const x0 = 20 + i * 330;
    const y0 = 250;
    retangulo(img, x0, y0, 312, 312, 'F');
    if (i >= 1) compor(img, brilho(13), x0 + 156 - 13 * 12, y0 + 156 - 13 * 12, 12, true);
    compor(img, aldric, x0, y0, 12);
    if (i === 2) compor(img, girar90(arcoDoGolpe(23, 1), 1), x0 + 170, y0 + 12, 6);
  }
  // Escala real: 4 px de canvas por px de arte (o jogo no canvas de 2×) e 6 px (o iPhone de 3×).
  compor(img, aldric, 1060, 270, 4);
  compor(img, aldric, 1060, 400, 6);
  return img;
}

function amostraDois(): Imagem {
  const e = 8; // px de arte da grade principal (2 pt); a grade fina (1 pt) usa e / 2
  const img = novaImagem(1680, 1000);
  preencher(img, 'F');
  let x = 20;
  const linha = (y: number, itens: { img: Imagem; fina?: boolean; aditivo?: boolean }[]): void => {
    x = 20;
    for (const it of itens) {
      const esc = it.fina ? e / 2 : e;
      compor(img, it.img, x, y, esc, it.aditivo ?? false);
      x += it.img.largura * esc + 24;
    }
  };
  const oco = rasterizar(OCO_DAS_LANTERNAS);
  linha(20, [
    { img: rasterizar(ALDRIC_PARADO) },
    { img: oco },
    { img: clarear(oco) },
    { img: virarCinza(oco, 0) },
    { img: virarCinza(oco, 1) },
    { img: virarCinza(oco, 2) },
    { img: rasterizar(OCO_GRANDE) },
    { img: rasterizar(NOVICA_DE_SAL) },
  ]);
  linha(250, [
    ...[0, 1, 2, 3, 4, 6].map((d) => ({ img: facaEm(d) })),
    { img: cristal(2, 3, 'b') },
    { img: cristal(3, 4, 'g') },
    { img: cristal(4, 5, 'r') },
    { img: rasterizar(ALMA) },
    { img: rasterizar(BAU_COMUM) },
    { img: rasterizar(BAU_DOURADO) },
    { img: contornar(rasterizar(ICONE_ESPADA)) },
  ]);
  const ladrilhos = novaImagem(32, 32);
  for (let k = 0; k < 4; k++) compor(ladrilhos, chao(k), (k % 2) * 16, Math.floor(k / 2) * 16);
  linha(400, [{ img: rocha(5, 1) }, { img: rocha(8, 3) }, { img: rocha(12, 2) }, { img: ladrilhos }]);
  linha(640, [
    { img: arcoDoGolpe(46, 0), fina: true },
    { img: arcoDoGolpe(46, 1), fina: true },
    { img: arcoDoGolpe(46, 2), fina: true },
    { img: setor(46, 120, 'W', 90), fina: true },
  ]);
  const projetil = novaImagem(24, 24);
  compor(projetil, anel(12, 2, 'W'), 0, 0);
  compor(projetil, disco(8, 'W'), 4, 4);
  linha(860, [{ img: projetil, fina: true }, { img: anel(12, 2, 'S'), fina: true }, { img: brilho(16), fina: true, aditivo: true }]);
  return img;
}

/** Cena de 390 × 844 pt no canvas de 2×: 1 px de arte = 4 px, grade fina = 2 px. */
function amostraTres(): Imagem {
  const img = novaImagem(780, 1688);
  for (let ty = 0; ty < 1688; ty += 64) for (let tx = 0; tx < 780; tx += 64) compor(img, chao((tx / 64 + (ty / 64) * 13) % 6), tx, ty, 4);
  const arte = (i: Imagem, xPt: number, yPt: number, escala = 4, aditivo = false): void =>
    compor(img, i, Math.round(xPt * 2 - (i.largura * escala) / 2), Math.round(yPt * 2 - (i.altura * escala) / 2), escala, aditivo);
  [[60, 200, 6, 1], [330, 300, 9, 3], [40, 720, 12, 2], [340, 760, 5, 4], [250, 120, 7, 6]].forEach(([x, y, r, s]) => arte(rocha(r!, s!), x!, y!));
  const jx = 195;
  const jy = 470;
  // Pickups.
  [[150, 560, 'b'], [240, 380, 'b'], [280, 520, 'g'], [120, 420, 'b'], [210, 610, 'r'], [90, 520, 'g']].forEach(([x, y, c], i) =>
    arte(c === 'b' ? cristal(2, 3, 'b') : c === 'g' ? cristal(3, 4, 'g') : cristal(4, 5, 'r'), x as number, (y as number) + (i % 2)));
  arte(rasterizar(ALMA), 300, 420);
  arte(rasterizar(BAU_COMUM), 80, 300);
  // Horda: 90 Ocos em anéis desencontrados, de 110 a 330 pt do Aldric, ordenados por y.
  const horda: { x: number; y: number; espelhar: boolean; quadro: number }[] = [];
  for (let k = 0; k < 90; k++) {
    const ang = k * 2.39996;
    const r = 110 + ((k * 37) % 220);
    horda.push({ x: jx + Math.cos(ang) * r, y: jy + Math.sin(ang) * r * 1.25, espelhar: Math.cos(ang) > 0, quadro: k % 9 });
  }
  horda.sort((a, b) => a.y - b.y);
  const oco = rasterizar(OCO_DAS_LANTERNAS);
  const ocoEspelhado = novaImagem(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) ocoEspelhado.px.set(oco.px.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 4), (y * 16 + 15 - x) * 4);
  for (const o of horda) {
    if (o.x < -10 || o.x > 400 || o.y < 40 || o.y > 830) continue;
    const base = o.espelhar ? oco : ocoEspelhado;
    arte(o.quadro === 0 && o.y < 470 ? clarear(base) : o.quadro === 1 && o.y > 470 ? virarCinza(base, 1) : base, o.x, o.y);
  }
  // Oco Grande telegrafando o braço em arco (branco puro, setor de 120°) na direção do Aldric.
  arte(girar90(setor(64, 120, 'W', 80), 1), 120 + 32, 330, 2);
  arte(rasterizar(OCO_GRANDE), 120, 330);
  // Noviça e o projétil branco (disco e anel) a caminho do Aldric.
  arte(rasterizar(NOVICA_DE_SAL), 300, 650);
  arte(anel(12, 2, 'W'), 255, 575, 2);
  arte(disco(8, 'W'), 255, 575, 2);
  // Aldric: a luz da brasa (raio de 5 corpos), o corpo e o golpe para a direita.
  arte(brilho(80), jx, jy, 4, true);
  arte(rasterizar(ALDRIC_PARADO), jx, jy);
  arte(girar90(arcoDoGolpe(46, 1), 1), jx + 30, jy, 2);
  // Facas de Sal voando e faíscas de acerto (grade fina).
  [[2, 250, 410], [7, 150, 520], [13, 140, 400]].forEach(([d, x, y]) => arte(facaEm(d!), x!, y!));
  [[241, 470], [244, 466], [247, 474], [238, 463], [250, 469], [236, 478]].forEach(([x, y], i) => retangulo(img, x! * 2, y! * 2, 2, 2, i % 2 ? 'Y' : 'A'));
  // HUD provisório: XP no topo, HP e stamina abaixo, numa moldura de osso de 1 px de arte (2 pt).
  const barra = (xPt: number, yPt: number, wPt: number, hPt: number, chave: string, cheio: number): void => {
    retangulo(img, xPt * 2 - 4, yPt * 2 - 4, wPt * 2 + 8, hPt * 2 + 8, 'O');
    retangulo(img, xPt * 2, yPt * 2, wPt * 2, hPt * 2, 'K');
    retangulo(img, xPt * 2, yPt * 2, Math.round(wPt * 2 * cheio), hPt * 2, chave);
  };
  barra(16, 56, 358, 6, 'b', 0.62);
  barra(16, 74, 150, 10, 'C', 0.8);
  barra(16, 92, 110, 6, 'S', 0.55);
  retangulo(img, 330 * 2 - 4, 76 * 2 - 4, 28 * 2 + 8, 28 * 2 + 8, 'O');
  retangulo(img, 330 * 2, 76 * 2, 28 * 2, 28 * 2, 'K');
  compor(img, contornar(rasterizar(ICONE_ESPADA)), 330 * 2, 76 * 2, 4);
  return img;
}

export async function principal(args: string[]): Promise<void> {
  const pasta = args[0] ?? 'design/arte';
  salvarPng(`${pasta}/amostra-1-paleta-e-aldric.png`, amostraUm());
  salvarPng(`${pasta}/amostra-2-modelos.png`, amostraDois());
  salvarPng(`${pasta}/amostra-3-cena-390x844.png`, amostraTres());
}
