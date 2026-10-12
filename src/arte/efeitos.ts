// Efeitos girados da grade fina (style card §6): o arco do golpe (ida e volta,
// da Espada e da Lâmina), a estocada, a onda da União e o telegrafo em setor.
// Cada um é desenhado em 0°, 22,5°, 45° e 67,5° por um amostrador único, que
// recorta a imagem e devolve a origem no vértice: o render só gira em
// múltiplos de 90° em volta dela (16 direções sem perder a grade).
import { novaImagem, pintar, type Imagem } from './imagem';
import { COR_DA_CHAVE } from './paleta';
import { bayer } from './procedural';

export interface ImagemComOrigem {
  readonly img: Imagem;
  /** Origem do vértice, em fração da largura e da altura. */
  readonly origemX: number;
  readonly origemY: number;
}

/** Os 4 ângulos desenhados; os outros 12 saem de giros de 90°. */
export const ANGULOS_DESENHADOS = [0, 22.5, 45, 67.5] as const;

type Amostra = (u: number, v: number, bayer16: number) => string | null;

/**
 * Amostra `f` num quadrado de meio-lado `r` em volta do vértice, girada `graus`
 * no sentido horário (0 = para cima). (u, v) é o ponto no referencial do efeito:
 * v para a frente, u para a direita. Recorta no menor retângulo com pixels.
 */
export function girado(r: number, graus: number, f: Amostra): ImagemComOrigem {
  const lado = 2 * Math.ceil(r) + 2;
  const c = Math.ceil(r) + 1;
  const rad = (graus * Math.PI) / 180;
  const sen = Math.sin(rad);
  const cos = Math.cos(rad);
  const chaves: (string | null)[] = new Array(lado * lado).fill(null);
  let x0 = lado;
  let y0 = lado;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const px = x + 0.5 - c;
      const py = y + 0.5 - c;
      const v = px * sen - py * cos;
      const u = px * cos + py * sen;
      const ch = f(u, v, bayer(x, y));
      if (ch === null) continue;
      chaves[y * lado + x] = ch;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { img: novaImagem(1, 1), origemX: 0.5, origemY: 0.5 };
  const img = novaImagem(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = chaves[y * lado + x];
      if (ch) pintar(img, x - x0, y - y0, COR_DA_CHAVE[ch]!);
    }
  }
  return { img, origemX: (c - x0) / img.largura, origemY: (c - y0) / img.altura };
}

/**
 * Arco do golpe: setor de 120° de raio `r` na grade fina. `volta` inverte o
 * sentido da varredura; `forte` é a Lâmina do Juramento Eterno (mais grossa, o
 * núcleo em Y). A borda externa é o fio em Y (a no começo do rastro); para
 * dentro, a, A, B e C. Quadro 0: a varredura até 55% com a ponta mais quente;
 * quadro 1: o arco inteiro, esfriando do fim para o começo (style card §6).
 */
export function arco(r: number, graus: number, quadro: 0 | 1, volta: boolean, forte: boolean): ImagemComOrigem {
  const espessura = r * (forte ? 0.36 : 0.28) * (quadro === 0 ? 1.1 : 1);
  const varredura = quadro === 0 ? 0.55 : 1;
  return girado(r, graus, (u, v, b) => {
    const d = Math.sqrt(u * u + v * v);
    if (d > r || d < r - espessura) return null;
    const ang = (Math.atan2(u, v) * 180) / Math.PI;
    if (ang < -60 || ang > 60) return null;
    let t = (ang + 60) / 120;
    if (volta) t = 1 - t;
    if (t > varredura) return null;
    const frio = 1 - t / varredura;
    // A borda externa (2 px) fica no fio da brasa ao longo do arco todo: Y, e a no começo do rastro.
    if (r - d < 2) return frio < 0.7 ? 'Y' : 'a';
    const fundo = (r - d) / espessura;
    const calor = fundo * (forte ? 0.8 : 1) + frio * 0.75 + (b / 16) * 0.25;
    if (calor > 1.35) return null;
    if (calor < (forte ? 0.32 : 0.18)) return 'Y';
    if (calor < 0.45) return 'a';
    if (calor < 0.75) return 'A';
    if (calor < 1.05) return 'B';
    return 'C';
  });
}

/** Estocada: lança de brasa de `comprimento` × 2·`meia` px a partir do vértice, a ponta em Y e a base esfriando. */
export function estocada(comprimento: number, meia: number, graus: number): ImagemComOrigem {
  return girado(comprimento, graus, (u, v, b) => {
    if (v < 0 || v > comprimento) return null;
    const t = v / comprimento;
    const largura = meia * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    if (Math.abs(u) > largura) return null;
    const borda = Math.abs(u) / largura;
    const calor = (1 - t) * 0.8 + borda * 0.6 + (b / 16) * 0.2;
    if (calor > 1.25) return null;
    return calor < 0.25 ? 'Y' : calor < 0.5 ? 'a' : calor < 0.8 ? 'A' : calor < 1.05 ? 'B' : 'C';
  });
}

/** Onda da União: crescente de brasa de meia largura `meia` px, voando para a frente. */
export function onda(meia: number, graus: number): ImagemComOrigem {
  const r = meia * 1.6;
  return girado(r, graus, (u, v, b) => {
    const d = Math.sqrt(u * u + (v + r * 0.45) * (v + r * 0.45));
    if (Math.abs(u) > meia || d > r || d < r - meia * 0.55) return null;
    if (v + r * 0.45 < 0) return null;
    const calor = (r - d) / (meia * 0.55) + (Math.abs(u) / meia) * 0.5 + (b / 16) * 0.2;
    return calor < 0.35 ? 'Y' : calor < 0.7 ? 'A' : calor < 1.05 ? 'B' : null;
  });
}

/** Telegrafo em setor (o braço do Oco Grande): ângulo `abertura`, raio `r`, branco puro sem contorno; a borda é W cheio. */
export function setorGirado(r: number, abertura: number, graus: number): ImagemComOrigem {
  return girado(r, graus, (u, v) => {
    const d2 = u * u + v * v;
    if (d2 > r * r || v <= 0) return null;
    const ang = Math.abs((Math.atan2(u, v) * 180) / Math.PI);
    return ang <= abertura / 2 ? 'W' : null;
  });
}
