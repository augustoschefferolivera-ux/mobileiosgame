// Checagem automática da arte (design/arte/style-card.md §8): paleta, contorno
// fechado, tamanhos, linha dos pés, cor quente, a cor de identidade no centro
// de cada inimigo e o empacotamento no atlas. Roda sobre o catálogo inteiro, o
// mesmo que o Boot desenha no atlas.
import { describe, expect, it } from 'vitest';
import { CATALOGO, LADO_DO_ATLAS, NOMES_DA_ARTE, REGIOES_DA_ARTE, TIPOS_DE_INIMIGO, corDoCentro, empacotar } from '../../src/arte/catalogo';
import { lerPixel, rasterizar, type Imagem } from '../../src/arte/imagem';
import { COR_DA_CHAVE, PALETA, QUENTES, RESERVADAS } from '../../src/arte/paleta';
import { faca } from '../../src/arte/procedural';
import { ANIMACOES_DO_ALDRIC } from '../../src/arte/sprites/aldric';
import { COR_DO_INIMIGO } from '../../src/cenas/paleta';

const K = COR_DA_CHAVE.K!;
const CORES = new Set(PALETA.map((c) => c.hex));
const RESERVADAS_HEX = new Set([...RESERVADAS].map((ch) => COR_DA_CHAVE[ch]!));
const QUENTES_HEX = new Set([...QUENTES].map((ch) => COR_DA_CHAVE[ch]!));
const IMAGENS = new Map(CATALOGO.map((e) => [e.nome, e.criar()] as const));
const img = (nome: string): Imagem => IMAGENS.get(nome)!;

/** Corpos com contorno obrigatório: a grade de arte, menos a luz, os quadros da cinza que se desfaz e a silhueta branca do telegrafo (o sinal do ataque não tem contorno, style card §5). */
const COM_CONTORNO = CATALOGO.filter((e) => e.grade === 'arte' && e.nome !== 'brilho' && !/_cinza_[12]$/.test(e.nome) && !e.nome.endsWith('_branco')).map((e) => e.nome);

function contornoAberto(i: Imagem): string[] {
  const falhas: string[] = [];
  const vazio = (x: number, y: number): boolean => x < 0 || y < 0 || x >= i.largura || y >= i.altura || lerPixel(i, x, y).alfa === 0;
  for (let y = 0; y < i.altura; y++) {
    for (let x = 0; x < i.largura; x++) {
      const p = lerPixel(i, x, y);
      if (p.alfa === 0 || p.cor === K) continue;
      if (vazio(x + 1, y) || vazio(x - 1, y) || vazio(x, y + 1) || vazio(x, y - 1)) falhas.push(`(${x}, ${y})`);
    }
  }
  return falhas;
}

function contar(i: Imagem, cores: Set<number>): number {
  let n = 0;
  for (let y = 0; y < i.altura; y++) for (let x = 0; x < i.largura; x++) if (lerPixel(i, x, y).alfa !== 0 && cores.has(lerPixel(i, x, y).cor)) n++;
  return n;
}

/** Última linha com pixel: a linha dos pés. */
function linhaDosPes(i: Imagem): number {
  for (let y = i.altura - 1; y >= 0; y--) for (let x = 0; x < i.largura; x++) if (lerPixel(i, x, y).alfa !== 0) return y;
  return -1;
}

describe('arte: paleta', () => {
  it('tem 32 cores e chaves únicas de 1 caractere', () => {
    expect(PALETA).toHaveLength(32);
    expect(new Set(PALETA.map((c) => c.chave)).size).toBe(32);
    for (const c of PALETA) expect(c.chave).toHaveLength(1);
  });

  it('mantém as cores fixas do doc 13 §1.3 e todas as cores que o jogo já usa', () => {
    expect([COR_DA_CHAVE.K, COR_DA_CHAVE.F, COR_DA_CHAVE.D, COR_DA_CHAVE.A, COR_DA_CHAVE.B, COR_DA_CHAVE.C]).toEqual([0x0b0e14, 0x1a1f2b, 0x2b3340, 0xffb347, 0xe2652b, 0x7a1f1f]);
    expect([COR_DA_CHAVE.O, COR_DA_CHAVE.S, COR_DA_CHAVE.W, COR_DA_CHAVE.R]).toEqual([0xe8dcc4, 0xdfe8ea, 0xffffff, 0xff2a2a]);
    for (const cor of Object.values(COR_DO_INIMIGO)) expect(CORES.has(cor), cor.toString(16)).toBe(true);
  });
});

describe('arte: catálogo', () => {
  it('nomes únicos e menos de 256 molduras com as formas (o índice da camada é Uint8)', () => {
    expect(new Set(NOMES_DA_ARTE).size).toBe(NOMES_DA_ARTE.length);
    expect(NOMES_DA_ARTE.length + 23).toBeLessThan(256);
  });

  it.each(CATALOGO.map((e) => [e.nome]))('%s: só cores da paleta', (nome) => {
    const i = img(nome);
    expect(i.largura * i.altura).toBeGreaterThan(0);
    const fora = new Set<string>();
    for (let y = 0; y < i.altura; y++) {
      for (let x = 0; x < i.largura; x++) {
        const p = lerPixel(i, x, y);
        if (p.alfa !== 0 && !CORES.has(p.cor)) fora.add(p.cor.toString(16));
      }
    }
    expect([...fora]).toEqual([]);
  });

  it.each(COM_CONTORNO.map((n) => [n]))('%s: contorno de 1 px em K fechado e sem cor reservada', (nome) => {
    expect(contornoAberto(img(nome))).toEqual([]);
    expect(contar(img(nome), RESERVADAS_HEX)).toBe(0);
  });

  it('tamanhos da escala (style card §4)', () => {
    for (const nome of NOMES_DA_ARTE) {
      const i = img(nome);
      if (nome.startsWith('oco_grande_coroado')) expect([nome, i.largura, i.altura]).toEqual([nome, 32, 32]);
      else if (nome.startsWith('aldric_') || /^(oco_grande|novica_de_sal)/.test(nome)) expect([nome, i.largura, i.altura]).toEqual([nome, 24, 24]);
      if (nome.startsWith('oco_das_lanternas')) expect([nome, i.largura, i.altura]).toEqual([nome, 16, 16]);
      if (nome.startsWith('icone_')) expect([nome, i.largura, i.altura]).toEqual([nome, 14, 14]);
    }
  });

  it('quadros de pé do Aldric e dos inimigos na mesma linha dos pés', () => {
    const emPe = [...ANIMACOES_DO_ALDRIC.parado, ...ANIMACOES_DO_ALDRIC.andar, ...ANIMACOES_DO_ALDRIC.aparo, ...ANIMACOES_DO_ALDRIC.frasco];
    expect(new Set(emPe.map((g) => linhaDosPes(rasterizar(g))))).toEqual(new Set([23]));
    for (const [id, t] of Object.entries(TIPOS_DE_INIMIGO)) {
      const quadros = [...t.andar, t.telegrafo, t.ataque].filter((g) => g !== null);
      expect(new Set(quadros.map((g) => linhaDosPes(rasterizar(g)))).size, id).toBe(1);
    }
  });

  it('inimigos: no máximo 1 px quente em cada quadro', () => {
    for (const nome of NOMES_DA_ARTE.filter((n) => /^(oco|novica)/.test(n) && !n.endsWith('_branco'))) expect(contar(img(nome), QUENTES_HEX), nome).toBeLessThanOrEqual(1);
  });

  it('inimigos: o bloco 2 × 2 do centro dos quadros de andar é a cor de identidade (COR_DO_INIMIGO, ou a do centro num tipo novo)', () => {
    for (const [id, t] of Object.entries(TIPOS_DE_INIMIGO)) {
      const identidade = COR_DO_INIMIGO[id] ?? corDoCentro(id as keyof typeof TIPOS_DE_INIMIGO);
      for (const g of t.andar) {
        const i = rasterizar(g);
        const m = i.largura / 2;
        for (const [x, y] of [[m - 1, m - 1], [m, m - 1], [m - 1, m], [m, m]] as const) expect(lerPixel(i, x, y).cor, `${id} (${x}, ${y})`).toBe(identidade);
      }
    }
  });

  it('a faca de 0° é simétrica (o eixo cai no centro)', () => {
    const f = faca(0);
    for (let y = 0; y < f.altura; y++) for (let x = 0; x < f.largura; x++) expect(lerPixel(f, x, y).alfa, `(${x}, ${y})`).toBe(lerPixel(f, f.largura - 1 - x, y).alfa);
  });

  it('cabe no atlas de 1024 × 1024, fora do quadrante das formas e sem sobreposição', () => {
    const pos = empacotar(IMAGENS, REGIOES_DA_ARTE);
    expect(pos.size).toBe(NOMES_DA_ARTE.length);
    const lista = [...pos.values()];
    for (const p of lista) {
      expect(p.x + p.largura).toBeLessThanOrEqual(LADO_DO_ATLAS);
      expect(p.y + p.altura).toBeLessThanOrEqual(LADO_DO_ATLAS);
      expect(p.x >= 512 || p.y >= 512).toBe(true);
    }
    for (let a = 0; a < lista.length; a++) {
      for (let b = a + 1; b < lista.length; b++) {
        const [p, q] = [lista[a]!, lista[b]!];
        const separados = p.x + p.largura <= q.x || q.x + q.largura <= p.x || p.y + p.altura <= q.y || q.y + q.altura <= p.y;
        expect(separados).toBe(true);
      }
    }
  });
});
