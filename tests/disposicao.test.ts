// F-002.6 (parte dos dados): 4 a 8 obstáculos por tela, fixos no JSON da
// região (Q-04), travados pelas regras de design/decisoes-F-002.md §2:
//   1. (x, y) é o centro; a tela é (⌊x/390⌋, ⌊y/844⌋) e a contagem usa o centro;
//   2. 0 ≤ x < 1.170 e 0 ≤ y < 2.532 (também no schema);
//   3. nenhum obstáculo cruza a costura do toro;
//   4. folga mínima de 64 px entre bordas, medida pelo delta toroidal;
//   5. zona livre de 192 px entre o início e a borda de qualquer obstáculo;
//   6. corredor livre do início até a costura em x.
// Cada regra é uma função que devolve os problemas; um caso sintético por
// regra confere que ela reprova o que deve reprovar.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import charneca from '../src/dados/regioes/charneca_das_lanternas.json';
import {
  ALTURA_DA_TELA,
  ALTURA_DO_MAPA as H,
  LARGURA_DA_TELA,
  LARGURA_DO_MAPA as W,
  deltaNoToro,
} from '../src/logica/mundo/toro';

interface Obstaculo {
  x: number;
  y: number;
  tamanho_px: number;
}
interface Ponto {
  x: number;
  y: number;
}

const FOLGA_PX = 64;
const ZONA_LIVRE_PX = 192;
const RAIO_DO_JOGADOR = 16;
const POR_TELA = { min: 4, max: 8 };

const raio = (o: Obstaculo): number => o.tamanho_px / 2;
const tela = (p: Ponto): [number, number] => [Math.floor(p.x / LARGURA_DA_TELA), Math.floor(p.y / ALTURA_DA_TELA)];
const distanciaNoToro = (a: Ponto, b: Ponto): number => Math.sqrt(deltaNoToro(a.x, b.x, W) ** 2 + deltaNoToro(a.y, b.y, H) ** 2);
const nome = (o: Obstaculo): string => `(${o.x}, ${o.y}) Ø${o.tamanho_px}`;

function contagemPorTela(obs: readonly Obstaculo[]): number[][] {
  const c = [0, 1, 2].map(() => [0, 0, 0]);
  for (const o of obs) {
    const [col, lin] = tela(o);
    c[lin]![col]!++;
  }
  return c;
}

function cruzamCostura(obs: readonly Obstaculo[]): string[] {
  return obs.filter((o) => o.x - raio(o) < 0 || o.x + raio(o) > W || o.y - raio(o) < 0 || o.y + raio(o) > H).map(nome);
}

function semFolga(obs: readonly Obstaculo[]): string[] {
  const problemas: string[] = [];
  for (let i = 0; i < obs.length; i++) {
    for (let j = i + 1; j < obs.length; j++) {
      const a = obs[i]!;
      const b = obs[j]!;
      const folga = distanciaNoToro(a, b) - raio(a) - raio(b);
      if (folga < FOLGA_PX) problemas.push(`${nome(a)} e ${nome(b)}: folga ${folga.toFixed(1)}`);
    }
  }
  return problemas;
}

function naZonaLivre(obs: readonly Obstaculo[], inicio: Ponto): string[] {
  return obs.filter((o) => distanciaNoToro(o, inicio) - raio(o) < ZONA_LIVRE_PX).map(nome);
}

/** Do início até a costura em x, na faixa que o corpo do jogador varre. */
function noCorredor(obs: readonly Obstaculo[], inicio: Ponto): string[] {
  return obs
    .filter((o) => o.x + raio(o) > inicio.x - RAIO_DO_JOGADOR && Math.abs(o.y - inicio.y) < raio(o) + RAIO_DO_JOGADOR)
    .map(nome);
}

const obstaculos: Obstaculo[] = charneca.obstaculos;
const inicio: Ponto = charneca.inicio_jogador;

describe('disposição da Charneca (design/decisoes-F-002.md §2)', () => {
  it('54 obstáculos, de 4 a 8 por tela, com densidades diferentes; a tela do início tem 4', () => {
    expect(obstaculos).toHaveLength(54);
    const c = contagemPorTela(obstaculos);
    for (const n of c.flat()) {
      expect(n).toBeGreaterThanOrEqual(POR_TELA.min);
      expect(n).toBeLessThanOrEqual(POR_TELA.max);
    }
    expect(new Set(c.flat()).size).toBeGreaterThanOrEqual(3);
    const [col, lin] = tela(inicio);
    expect([col, lin]).toEqual([1, 1]);
    expect(c[lin]![col]).toBe(4);
  });

  it('o início é o centro do mapa e da tela central: (585, 1.266)', () => {
    expect(inicio).toEqual({ x: W / 2, y: H / 2 });
  });

  it('todo centro está no toro (0 ≤ x < 1.170, 0 ≤ y < 2.532)', () => {
    expect(obstaculos.filter((o) => !(o.x >= 0 && o.x < W && o.y >= 0 && o.y < H)).map(nome)).toEqual([]);
  });

  it('nenhum obstáculo cruza a costura do toro', () => {
    expect(cruzamCostura(obstaculos)).toEqual([]);
  });

  it('folga mínima de 64 px entre as bordas, medida pelo delta toroidal', () => {
    expect(semFolga(obstaculos)).toEqual([]);
  });

  it('zona livre de 192 px entre o início e a borda de qualquer obstáculo', () => {
    expect(naZonaLivre(obstaculos, inicio)).toEqual([]);
  });

  it('corredor livre do início até a costura em x', () => {
    expect(noCorredor(obstaculos, inicio)).toEqual([]);
  });

  it('do outro lado da costura, o 1º obstáculo no caminho é tocado de raspão (o deslize do vídeo e do roteiro, §8)', () => {
    const noCaminho = obstaculos
      .filter((o) => o.x < inicio.x && Math.abs(o.y - inicio.y) < raio(o) + RAIO_DO_JOGADOR)
      .sort((a, b) => a.x - b.x);
    expect(noCaminho.length).toBeGreaterThan(0);
    const primeiro = noCaminho[0]!;
    expect(primeiro).toMatchObject({ x: 230, y: 1278 });
    expect(primeiro.y).not.toBe(inicio.y);
  });
});

describe('as regras reprovam o que devem reprovar', () => {
  const o = (x: number, y: number, tamanho_px = 96): Obstaculo => ({ x, y, tamanho_px });

  it('folga pelo toro: R = 48 em x = 48 e em x = 1.122, na mesma y, é reprovado', () => {
    expect(semFolga([o(48, 400), o(1122, 400)])).toHaveLength(1);
    // A distância comum (1.074 px) aprovaria o par.
    expect(Math.abs(1122 - 48) - 96).toBeGreaterThan(FOLGA_PX);
    expect(semFolga([o(48, 400), o(48 + 96 + 64, 400)])).toEqual([]);
    expect(semFolga([o(48, 400), o(48 + 96 + 63, 400)])).toHaveLength(1);
  });

  it('costura: um raio de distância de cada borda', () => {
    expect(cruzamCostura([o(48, 48), o(W - 48, H - 48)])).toEqual([]);
    expect(cruzamCostura([o(47, 400), o(400, 47), o(W - 47, 400), o(400, H - 47)])).toHaveLength(4);
  });

  it('zona livre e corredor', () => {
    expect(naZonaLivre([o(inicio.x + 192 + 48, inicio.y)], inicio)).toEqual([]);
    expect(naZonaLivre([o(inicio.x + 191 + 48, inicio.y)], inicio)).toHaveLength(1);
    expect(noCorredor([o(1000, inicio.y + 48 + 15)], inicio)).toHaveLength(1);
    expect(noCorredor([o(1000, inicio.y + 48 + 16)], inicio)).toEqual([]);
    expect(noCorredor([o(inicio.x - 16 - 48 - 1, inicio.y)], inicio)).toEqual([]);
  });

  it('contagem por tela usa o centro', () => {
    expect(contagemPorTela([o(389, 843), o(390, 844), o(1169, 2531)])).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe('regiao.schema.json (design/decisoes-F-002.md §10)', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'dados', 'schemas');
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true });
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(dir, f), 'utf-8')) as object);
  }
  const validar = ajv.getSchema('regiao.schema.json')!;
  const com = (mudar: (r: Record<string, unknown>) => void): unknown => {
    const r = structuredClone(charneca) as unknown as Record<string, unknown>;
    mudar(r);
    return r;
  };
  const primeiro = (r: Record<string, unknown>): Record<string, unknown> => (r['obstaculos'] as Record<string, unknown>[])[0]!;

  it('aceita a Charneca e reprova forma, tamanho, limites e início fora do formato', () => {
    expect(validar(charneca)).toBe(true);
    expect(validar(com((r) => (primeiro(r)['forma'] = 'quadrado')))).toBe(false);
    expect(validar(com((r) => (primeiro(r)['tamanho_px'] = 72)))).toBe(false);
    expect(validar(com((r) => (primeiro(r)['x'] = W)))).toBe(false);
    expect(validar(com((r) => (primeiro(r)['y'] = H)))).toBe(false);
    expect(validar(com((r) => delete r['inicio_jogador']))).toBe(false);
    expect(validar(com((r) => (r['inicio_jogador'] = { x: W, y: 0 })))).toBe(false);
  });
});
