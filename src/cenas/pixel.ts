// Desenho em pixel para Graphics (F-011, style card §4 e §7): uma imagem da
// arte em células de `tamanho` pt (2 no HUD, 4 no modal) e o disco e o anel na
// grade de 2 pt, para a HUD seguir a grade da arte em vez de curvas lisas.
// Juntam as células vizinhas da mesma cor numa linha em um só retângulo.
// Chamadas só quando o desenho muda, nunca por quadro.
import type Phaser from 'phaser';
import { CATALOGO } from '../arte/catalogo';
import type { Imagem } from '../arte/imagem';

/** Desenha a imagem com o canto de cima à esquerda em (x0, y0), `tamanho` pt por px. */
export function desenharPixels(g: Phaser.GameObjects.Graphics, img: Imagem, x0: number, y0: number, tamanho: number, alfa = 1): void {
  const px = img.px;
  for (let y = 0; y < img.altura; y++) {
    let x = 0;
    while (x < img.largura) {
      const i = (y * img.largura + x) * 4;
      if (px[i + 3] === 0) {
        x++;
        continue;
      }
      const cor = (px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!;
      let fim = x + 1;
      while (fim < img.largura) {
        const j = (y * img.largura + fim) * 4;
        if (px[j + 3] === 0 || ((px[j]! << 16) | (px[j + 1]! << 8) | px[j + 2]!) !== cor) break;
        fim++;
      }
      g.fillStyle(cor, alfa).fillRect(x0 + x * tamanho, y0 + y * tamanho, (fim - x) * tamanho, tamanho);
      x = fim;
    }
  }
}

/**
 * Disco (espessura 0) ou anel de raio externo `raio` pt e `espessura` pt, centrado em (cx, cy), nas células de
 * `tamanho` pt alinhadas ao centro: a célula entra se o centro dela cai na coroa.
 */
export function circuloDePixels(g: Phaser.GameObjects.Graphics, cx: number, cy: number, raio: number, espessura: number, cor: number, alfa: number, tamanho = 2): void {
  const n = Math.ceil(raio / tamanho);
  const dentro = espessura > 0 ? raio - espessura : -1;
  g.fillStyle(cor, alfa);
  for (let j = -n; j < n; j++) {
    const yc = (j + 0.5) * tamanho;
    let i = -n;
    while (i < n) {
      const xc = (i + 0.5) * tamanho;
      const d = Math.sqrt(xc * xc + yc * yc);
      if (d > raio || d <= dentro) {
        i++;
        continue;
      }
      let fim = i + 1;
      while (fim < n) {
        const xf = (fim + 0.5) * tamanho;
        const df = Math.sqrt(xf * xf + yc * yc);
        if (df > raio || df <= dentro) break;
        fim++;
      }
      g.fillRect(cx + i * tamanho, cy + j * tamanho, (fim - i) * tamanho, tamanho);
      i = fim;
    }
  }
}

/** Triângulo (a, b, c) em células de `tamanho` pt alinhadas à origem: a célula entra se o centro cai dentro dele. */
export function trianguloDePixels(
  g: Phaser.GameObjects.Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  cor: number,
  alfa: number,
  tamanho = 2,
): void {
  const lado = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
  const x0 = Math.floor(Math.min(ax, bx, cx) / tamanho);
  const x1 = Math.ceil(Math.max(ax, bx, cx) / tamanho);
  const y0 = Math.floor(Math.min(ay, by, cy) / tamanho);
  const y1 = Math.ceil(Math.max(ay, by, cy) / tamanho);
  g.fillStyle(cor, alfa);
  for (let j = y0; j < y1; j++) {
    for (let i = x0; i < x1; i++) {
      const px = (i + 0.5) * tamanho;
      const py = (j + 0.5) * tamanho;
      const d1 = lado(px, py, ax, ay, bx, by);
      const d2 = lado(px, py, bx, by, cx, cy);
      const d3 = lado(px, py, cx, cy, ax, ay);
      const neg = d1 < 0 || d2 < 0 || d3 < 0;
      const pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) g.fillRect(i * tamanho, j * tamanho, tamanho, tamanho);
    }
  }
}

const ICONES = new Map<string, Imagem>();

/** A imagem de uma moldura da arte (o ícone `icone_<nome>` ou outra pelo nome inteiro), desenhada uma vez. */
export function imagemDoIcone(nome: string): Imagem {
  let img = ICONES.get(nome);
  if (!img) {
    const e = CATALOGO.find((x) => x.nome === `icone_${nome}`) ?? CATALOGO.find((x) => x.nome === nome);
    if (!e) throw new Error(`pixel: ícone ${nome} não existe`);
    img = e.criar();
    ICONES.set(nome, img);
  }
  return img;
}

/** Ícone centrado em (cx, cy) no maior tamanho inteiro de célula que cabe em `lado` pt (14 px de arte). */
export function desenharIconeDePixels(g: Phaser.GameObjects.Graphics, nome: string, cx: number, cy: number, lado: number, alfa = 1): void {
  const img = imagemDoIcone(nome);
  const tamanho = Math.max(1, Math.floor(lado / img.largura));
  desenharPixels(g, img, Math.round(cx - (img.largura * tamanho) / 2), Math.round(cy - (img.altura * tamanho) / 2), tamanho, alfa);
}
