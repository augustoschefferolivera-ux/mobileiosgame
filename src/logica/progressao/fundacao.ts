// Árvore da Fundação (design/decisoes-F-010.md FD1 a FD10): os 8 nós de `arvore.json`, o custo de cada rank e as funções puras de compra e reembolso. Módulo puro: nada de I/O, relógio ou RNG. O custo roda fora do laço
// quente, em Float32 com a potência iterativa (ADR-0002 §5): nunca `Math.pow` nem `**`.
import arvore from '../../dados/arvore.json';
import { LIMITE_DE_ALMAS } from '../nucleo/estado';
import type { Meta } from '../save/meta';

/** Um nó da Fundação, na ordem de `arvore.json` (a ordem do doc 08 §4.1 e a dos 8 ranks do meta). */
export interface NoDaFundacao {
  readonly id: string;
  readonly ranks: number;
  readonly custoBase: number;
  /** `false` nos nós `bloqueado` do JSON (Q-16, Q-17): aparecem na árvore, sem preço, e a compra é recusada. */
  readonly ativo: boolean;
  /** `efeito.tipo` do JSON. */
  readonly efeito: string;
}

const FUNDACAO = arvore.arvores.find((a) => a.id === 'fundacao');
if (FUNDACAO === undefined) throw new Error('arvore.json: falta a árvore `fundacao`');

export const NOS_DA_FUNDACAO: readonly NoDaFundacao[] = FUNDACAO.nos.map((n) => ({
  id: n.id,
  ranks: n.ranks,
  custoBase: n.custo_base,
  ativo: n.no_mvp === 'ativo',
  efeito: n.efeito.tipo,
}));

/** Quantos nós a árvore tem (o tamanho de `meta.fundacao.ranks`). */
export const NUMERO_DE_NOS = NOS_DA_FUNDACAO.length;

/** Índice de cada nó na ordem de `arvore.json` (os testes conferem com os ids). */
export const NO = { martelo: 0, pele: 1, folego: 2, pes: 3, casco: 4, bigorna: 5, ferro: 6, maos: 7 } as const;

/** `1,12` e `0,015` de `arvore.json`, em Float32 (a mesma conta em todo aparelho). */
const MULTIPLICADOR = Math.fround(FUNDACAO.custo.multiplicador_por_rank);
const FATOR_GLOBAL = Math.fround(FUNDACAO.custo.fator_global);

/**
 * Custo do rank `rank` (1 a máximo do nó; o rank que se compra) de um nó de custo base `base`, com `g` = soma dos ranks
 * da árvore antes da compra (FD3): `base × 1,12^(rank−1) × (1 + 0,015 × g)`. Float32 em cada passo (`p` começa em 1 e
 * multiplica por `fround(1,12)` `rank−1` vezes), inteiro mais próximo com o meio para cima (`⌊v + 0,5⌋`, Q-19).
 */
export function custoDoRank(base: number, rank: number, g: number): number {
  if (!Number.isInteger(rank) || rank < 1 || !Number.isInteger(g) || g < 0) throw new Error(`custoDoRank: rank ${rank}, G ${g}`);
  let p = 1;
  for (let i = 1; i < rank; i++) p = Math.fround(p * MULTIPLICADOR);
  const global = Math.fround(1 + Math.fround(FATOR_GLOBAL * g));
  return Math.floor(Math.fround(Math.fround(base * p) * global) + 0.5);
}

/** `G` (FD3): a soma dos ranks da árvore. Os nós bloqueados têm rank 0 (o meta os valida), então não entram. */
export function somaDeRanks(ranks: readonly number[]): number {
  let g = 0;
  for (let i = 0; i < ranks.length; i++) g += ranks[i]!;
  return g;
}

/** Por que uma compra ou um reembolso não aconteceu (FD2, FD8, FD9). */
export type Recusa = 'bloqueado' | 'maximo' | 'sem_almas' | 'nada_a_reembolsar';
export interface Recusado {
  readonly recusa: Recusa;
}

/** Uma gravação lógica a mais (o mesmo `seq` do restante do meta). */
function proximoMeta(m: Meta, mudancas: Partial<Meta>): Meta {
  return { ...m, ...mudancas, seq: Math.min(LIMITE_DE_ALMAS - 1, m.seq + 1), soma: '' };
}

/** O custo da próxima compra do nó `idx` (rank atual + 1) com o `G` do meta; `null` se o nó é bloqueado ou já está no máximo. */
export function custoDaCompra(meta: Meta, idx: number): number | null {
  const n = NOS_DA_FUNDACAO[idx];
  if (n === undefined || !n.ativo) return null;
  const rank = meta.fundacao.ranks[idx]!;
  return rank >= n.ranks ? null : custoDoRank(n.custoBase, rank + 1, somaDeRanks(meta.fundacao.ranks));
}

/**
 * Compra um rank do nó `idx` (FD2, FD3, FD8): devolve o meta novo, ou `{ recusa }` sem débito e sem gravação (a recusa mora
 * aqui, não só na tela): nó bloqueado, rank máximo ou Almas abaixo do custo. `almas −= custo`, `ranks[idx] += 1`,
 * `gasto += custo`, `seq += 1`.
 */
export function comprar(meta: Meta, idx: number): Meta | Recusado {
  const n = NOS_DA_FUNDACAO[idx];
  if (n === undefined || !n.ativo) return { recusa: 'bloqueado' };
  const custo = custoDaCompra(meta, idx);
  if (custo === null) return { recusa: 'maximo' };
  if (meta.almas < custo) return { recusa: 'sem_almas' };
  const ranks = meta.fundacao.ranks.slice();
  ranks[idx] = ranks[idx]! + 1;
  return proximoMeta(meta, { almas: meta.almas - custo, fundacao: { ranks, gasto: meta.fundacao.gasto + custo } });
}

/**
 * Reembolsa tudo (FD9): `almas += gasto` (100 %, sem custo), os 8 ranks e o `gasto` vão a 0 (logo `G` = 0). Recusado com
 * `gasto` 0 (nada a devolver). O teto de Almas é o do meta (2^30 − 1).
 */
export function reembolsar(meta: Meta): Meta | Recusado {
  if (meta.fundacao.gasto === 0) return { recusa: 'nada_a_reembolsar' };
  const soma = meta.almas + meta.fundacao.gasto;
  return proximoMeta(meta, {
    almas: soma < LIMITE_DE_ALMAS ? soma : LIMITE_DE_ALMAS - 1,
    fundacao: { ranks: new Array<number>(NUMERO_DE_NOS).fill(0), gasto: 0 },
  });
}

/** `true` se `r` é uma recusa (e não um meta). */
export function foiRecusado(r: Meta | Recusado): r is Recusado {
  return 'recusa' in r;
}
