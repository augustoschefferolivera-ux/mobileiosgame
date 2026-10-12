// Imagem RGBA em memória e o rasterizador das grades da paleta. Sem Phaser e
// sem DOM: o Boot copia as imagens para o atlas (putImageData), e o gerador
// de amostras e os testes as leem direto.
import { COR_DA_CHAVE, VAZIO } from './paleta';

export interface Imagem {
  readonly largura: number;
  readonly altura: number;
  /** RGBA, linha a linha. */
  readonly px: Uint8ClampedArray;
}

/** Grade de caracteres da paleta: todas as linhas com o mesmo comprimento. */
export type Grade = readonly string[];

export function novaImagem(largura: number, altura: number): Imagem {
  return { largura, altura, px: new Uint8ClampedArray(largura * altura * 4) };
}

/** Pinta um pixel com uma cor 0xRRGGBB e alfa 0 a 255 (substitui, sem misturar). */
export function pintar(img: Imagem, x: number, y: number, cor: number, alfa = 255): void {
  if (x < 0 || y < 0 || x >= img.largura || y >= img.altura) return;
  const i = (y * img.largura + x) * 4;
  img.px[i] = (cor >> 16) & 0xff;
  img.px[i + 1] = (cor >> 8) & 0xff;
  img.px[i + 2] = cor & 0xff;
  img.px[i + 3] = alfa;
}

/** Cor 0xRRGGBB e alfa de um pixel. */
export function lerPixel(img: Imagem, x: number, y: number): { cor: number; alfa: number } {
  const i = (y * img.largura + x) * 4;
  return { cor: (img.px[i]! << 16) | (img.px[i + 1]! << 8) | img.px[i + 2]!, alfa: img.px[i + 3]! };
}

/** Rasteriza uma grade; chave fora da paleta é erro (a checagem automática a pega antes). */
export function rasterizar(grade: Grade): Imagem {
  const altura = grade.length;
  const largura = grade[0]?.length ?? 0;
  const torta = grade.findIndex((l) => l.length !== largura);
  if (torta >= 0) throw new Error(`arte: a linha ${torta} tem ${grade[torta]!.length} px, e não ${largura}`);
  const img = novaImagem(largura, altura);
  desenharGrade(img, grade, 0, 0);
  return img;
}

/** Desenha a grade em (x0, y0) da imagem, por cima do que houver (o '.' não pinta). */
export function desenharGrade(img: Imagem, grade: Grade, x0: number, y0: number, espelhar = false): void {
  for (let y = 0; y < grade.length; y++) {
    const linha = grade[y]!;
    for (let x = 0; x < linha.length; x++) {
      const ch = linha[espelhar ? linha.length - 1 - x : x]!;
      if (ch === VAZIO) continue;
      const cor = COR_DA_CHAVE[ch];
      if (cor === undefined) throw new Error(`arte: chave '${ch}' fora da paleta`);
      pintar(img, x0 + x, y0 + y, cor);
    }
  }
}

/** Compõe `de` sobre `em` em (x0, y0) com alfa (source-over), em escala inteira `escala`. */
export function compor(em: Imagem, de: Imagem, x0: number, y0: number, escala = 1, aditivo = false): void {
  for (let y = 0; y < de.altura * escala; y++) {
    const ty = y0 + y;
    if (ty < 0 || ty >= em.altura) continue;
    for (let x = 0; x < de.largura * escala; x++) {
      const tx = x0 + x;
      if (tx < 0 || tx >= em.largura) continue;
      const s = ((((y / escala) | 0) * de.largura + ((x / escala) | 0)) * 4) | 0;
      const a = de.px[s + 3]! / 255;
      if (a === 0) continue;
      const d = (ty * em.largura + tx) * 4;
      for (let k = 0; k < 3; k++) {
        const fonte = de.px[s + k]!;
        const base = em.px[d + k]!;
        em.px[d + k] = aditivo ? base + fonte * a : base * (1 - a) + fonte * a;
      }
      em.px[d + 3] = aditivo ? em.px[d + 3]! : Math.max(em.px[d + 3]!, de.px[s + 3]!);
    }
  }
}
