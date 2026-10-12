// Folhas da arte: todas as molduras do catálogo em escala real do jogo no canvas
// de 2× (a grade de arte a 4 px por px, a fina a 2), em linhas de 780 px (390 pt),
// sobre o fundo. Evidência da F-011 (folhas.png) e conferência do revisor.
// `node scripts/arte/rodar.mjs folhas [saida.png] [escala extra]`.
import { CATALOGO, ESCALA_DA_GRADE } from '../../src/arte/catalogo';
import { compor, novaImagem, pintar, type Imagem } from '../../src/arte/imagem';
import { COR_DA_CHAVE } from '../../src/arte/paleta';
import { salvarPng } from './png';

export function folhas(extra = 1, largura = 780): Imagem {
  const itens = CATALOGO.map((e) => ({ img: e.criar(), esc: ESCALA_DA_GRADE[e.grade] * 2 * extra }));
  const folga = 8 * extra;
  const linhas: { y: number; itens: { img: Imagem; esc: number; x: number }[]; altura: number }[] = [];
  let atual = { y: folga, itens: [] as { img: Imagem; esc: number; x: number }[], altura: 0 };
  let x = folga;
  for (const it of itens) {
    const w = it.img.largura * it.esc;
    if (x + w > largura - folga && atual.itens.length > 0) {
      linhas.push(atual);
      atual = { y: atual.y + atual.altura + folga, itens: [], altura: 0 };
      x = folga;
    }
    atual.itens.push({ ...it, x });
    atual.altura = Math.max(atual.altura, it.img.altura * it.esc);
    x += w + folga;
  }
  linhas.push(atual);
  const altura = atual.y + atual.altura + folga;
  const img = novaImagem(largura, altura);
  for (let y = 0; y < altura; y++) for (let x2 = 0; x2 < largura; x2++) pintar(img, x2, y, COR_DA_CHAVE.F!);
  for (const l of linhas) for (const it of l.itens) compor(img, it.img, it.x, l.y + l.altura - it.img.altura * it.esc, it.esc);
  return img;
}

export async function principal(args: string[]): Promise<void> {
  const extra = Number(args[1] ?? 1);
  salvarPng(args[0] ?? 'folhas.png', folhas(extra, 780 * extra));
}
