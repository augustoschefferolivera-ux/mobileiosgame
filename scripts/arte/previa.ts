// Prévia de trabalho: todas as grades exportadas por src/arte/sprites, em
// escala 12 sobre o fundo, lado a lado, num PNG.
// `node scripts/arte/rodar.mjs previa <saida.png> [filtro]` (o filtro casa com o nome da grade).
import { compor, novaImagem, pintar, rasterizar, type Grade } from '../../src/arte/imagem';
import { COR_DA_CHAVE } from '../../src/arte/paleta';
import { salvarPng } from './png';

const MODULOS = import.meta.glob<Record<string, unknown>>('../../src/arte/sprites/*.ts', { eager: true });

export async function principal(args: string[]): Promise<void> {
  const filtro = new RegExp(args[1] ?? '.', 'i');
  const grades: Grade[] = [];
  for (const modulo of Object.values(MODULOS)) {
    for (const [nome, valor] of Object.entries(modulo)) {
      if (Array.isArray(valor) && typeof valor[0] === 'string' && filtro.test(nome)) grades.push(valor as Grade);
    }
  }
  const e = 12;
  const larg = grades.reduce((s, g) => s + (g[0]!.length + 2) * e, e);
  const alt = Math.max(...grades.map((g) => g.length + 2)) * e;
  const img = novaImagem(larg, alt);
  for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) pintar(img, x, y, COR_DA_CHAVE.F!);
  let x0 = e;
  for (const g of grades) {
    compor(img, rasterizar(g), x0, e, e);
    x0 += (g[0]!.length + 2) * e;
  }
  salvarPng(args[0] ?? 'previa.png', img);
}
