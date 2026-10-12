// Pool de slots com capacidade fixa (ADR-0002 §4): pilha de índices livres
// (Int32Array) mais uma lista densa de ativos com troca e remoção, as duas em
// O(1). Referências entre entidades usam handle = índice + geração; a geração
// (Uint16Array) muda quando o slot é liberado, e o handle antigo deixa de valer.
// As views ficam no ArrayBuffer do estado: entram no hash e no save. Nada é
// alocado depois de criadas as views.

export interface Pool {
  readonly capacidade: number;
  /** [0] = livres na pilha, [1] = ativos na lista densa. */
  readonly contagens: Int32Array;
  /** Pilha de slots livres; o topo é `livres[contagens[0] − 1]`. */
  readonly livres: Int32Array;
  /** Lista densa dos slots ativos, `ativos[0 .. contagens[1])`. */
  readonly ativos: Int32Array;
  /** Posição de cada slot ativo em `ativos` (−1 se livre). */
  readonly posicao: Int32Array;
  readonly geracao: Uint16Array;
}

const LIVRES = 0;
const ATIVOS = 1;

/** Bytes que as views de um pool ocupam no buffer (múltiplo de 4). */
export function bytesDoPool(capacidade: number): number {
  const bytesDaGeracao = Math.ceil((capacidade * 2) / 4) * 4;
  return 2 * 4 + 3 * capacidade * 4 + bytesDaGeracao;
}

/** Cria as views do pool em `buffer`, a partir de `inicio` (múltiplo de 4). */
export function viewsDoPool(buffer: ArrayBuffer, inicio: number, capacidade: number): Pool {
  let p = inicio;
  const contagens = new Int32Array(buffer, p, 2);
  p += 8;
  const livres = new Int32Array(buffer, p, capacidade);
  p += capacidade * 4;
  const ativos = new Int32Array(buffer, p, capacidade);
  p += capacidade * 4;
  const posicao = new Int32Array(buffer, p, capacidade);
  p += capacidade * 4;
  const geracao = new Uint16Array(buffer, p, capacidade);
  return { capacidade, contagens, livres, ativos, posicao, geracao };
}

/** Esvazia o pool: o slot 0 sai primeiro, depois o 1, e assim por diante. */
export function esvaziarPool(pool: Pool): void {
  const n = pool.capacidade;
  for (let i = 0; i < n; i++) {
    pool.livres[i] = n - 1 - i;
    pool.ativos[i] = 0;
    pool.posicao[i] = -1;
    pool.geracao[i] = 0;
  }
  pool.contagens[LIVRES] = n;
  pool.contagens[ATIVOS] = 0;
}

export function quantosAtivos(pool: Pool): number {
  return pool.contagens[ATIVOS]!;
}

/** Tira um slot da pilha e o põe no fim da lista densa; −1 se o pool está cheio. */
export function alocar(pool: Pool): number {
  const nLivres = pool.contagens[LIVRES]!;
  if (nLivres === 0) return -1;
  const slot = pool.livres[nLivres - 1]!;
  pool.contagens[LIVRES] = nLivres - 1;
  const nAtivos = pool.contagens[ATIVOS]!;
  pool.ativos[nAtivos] = slot;
  pool.posicao[slot] = nAtivos;
  pool.contagens[ATIVOS] = nAtivos + 1;
  return slot;
}

/**
 * Tira o slot da lista densa (o último ativo ocupa o lugar dele), devolve-o à
 * pilha e avança a geração. Quem chama zera os campos do slot.
 */
export function liberar(pool: Pool, slot: number): void {
  const p = pool.posicao[slot]!;
  if (p < 0) throw new Error(`pool: slot ${slot} já está livre`);
  const ultimo = pool.contagens[ATIVOS]! - 1;
  const movido = pool.ativos[ultimo]!;
  pool.ativos[p] = movido;
  pool.posicao[movido] = p;
  pool.ativos[ultimo] = 0;
  pool.posicao[slot] = -1;
  pool.contagens[ATIVOS] = ultimo;
  pool.livres[pool.contagens[LIVRES]!] = slot;
  pool.contagens[LIVRES] = pool.contagens[LIVRES]! + 1;
  pool.geracao[slot] = (pool.geracao[slot]! + 1) & 0xffff;
}

/** Handle de um slot ativo: geração × 65.536 + índice (u32). */
export function handleDe(pool: Pool, slot: number): number {
  return pool.geracao[slot]! * 0x10000 + slot;
}

/** Slot do handle, ou −1 se o slot foi liberado (ou reaproveitado) depois que o handle foi tirado. */
export function slotDoHandle(pool: Pool, handle: number): number {
  const slot = handle & 0xffff;
  if (slot >= pool.capacidade || pool.posicao[slot]! < 0) return -1;
  return pool.geracao[slot] === handle >>> 16 ? slot : -1;
}
