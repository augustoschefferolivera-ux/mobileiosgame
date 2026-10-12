// RNG da simulação (ADR-0002 §5).
// - xoshiro128** 1.1 (Blackman e Vigna): 32 bits, estado de 4 palavras;
// - cada fluxo tem o seu estado; a semente de um fluxo é
//   splitmix32(fnv1a(seed, id do fluxo, índice)), então o consumo de um
//   sistema não desloca a sequência de outro;
// - as funções operam sobre um Uint32Array e um deslocamento, sem alocar.
import { FNV_BASE, fnv1aTexto, fnv1aU32 } from './hash';

/** Fluxos da simulação. B pede `diretor` e `levelup`; os demais vêm do ADR-0002 §5. */
export const FLUXOS = ['diretor', 'levelup', 'drops', 'baus', 'ia', 'armas'] as const;
export type Fluxo = (typeof FLUXOS)[number];

/** Palavras de estado por fluxo. */
export const PALAVRAS_POR_FLUXO = 4;

/** 2^-32, exato em double. */
export const DOIS_A_MENOS_32 = 2.3283064365386963e-10;

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Saída de `sortear`: o próximo valor de 32 bits sem sinal, lido pelo chamador
 * sem passar por retorno. No V8, um u32 ≥ 2³⁰ devolvido por uma chamada não
 * inlinada viraria um HeapNumber (design/decisoes-F-004.md §8, E6).
 */
export const SORTEADO = new Uint32Array(1);

/** Avança o estado em `s[base .. base+3]` e escreve o próximo valor de 32 bits em SORTEADO[0]. */
export function sortear(s: Uint32Array, base: number): void {
  const s0 = s[base]!;
  const s1 = s[base + 1]!;
  const s2 = s[base + 2]!;
  const s3 = s[base + 3]!;
  const resultado = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (s1 << 9) >>> 0;
  const n2 = (s2 ^ s0) >>> 0;
  const n3 = (s3 ^ s1) >>> 0;
  s[base + 1] = s1 ^ n2;
  s[base] = s0 ^ n3;
  s[base + 2] = n2 ^ t;
  s[base + 3] = rotl(n3, 11);
  SORTEADO[0] = resultado;
}

/** Próximo valor de 32 bits sem sinal do estado em `s[base .. base+3]`. */
export function proximoU32(s: Uint32Array, base: number): number {
  sortear(s, base);
  return SORTEADO[0]!;
}

/** Número em [0, 1) com 32 bits de resolução. */
export function proximoUnitario(s: Uint32Array, base: number): number {
  return proximoU32(s, base) * DOIS_A_MENOS_32;
}

/**
 * splitmix32: soma a razão áurea e passa o resultado por um hash de duas
 * rodadas do hash-prospector de Chris Wellons, [16 21f0aaad 15 735a2d97 15].
 * `estado[0]` é o contador; cada chamada o avança.
 */
export function splitmix32(estado: Uint32Array): number {
  const z0 = (estado[0]! + 0x9e3779b9) >>> 0;
  estado[0] = z0;
  let z = Math.imul(z0 ^ (z0 >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

/** Semente de 32 bits de um fluxo (ou subfluxo, pelo índice). */
export function sementeDoFluxo(seed: number, fluxo: Fluxo, indice: number): number {
  let h = fnv1aU32(FNV_BASE, seed >>> 0);
  h = fnv1aTexto(h, fluxo);
  return fnv1aU32(h, indice >>> 0);
}

const contador = new Uint32Array(1);

/**
 * Preenche o estado do fluxo em `s[base .. base+3]`.
 * Subfluxos (um por nível de `levelup`, um por baú de `baus`) usam `indice` > 0.
 */
export function semear(s: Uint32Array, base: number, seed: number, fluxo: Fluxo, indice = 0): void {
  contador[0] = sementeDoFluxo(seed, fluxo, indice);
  let soma = 0;
  for (let i = 0; i < PALAVRAS_POR_FLUXO; i++) {
    const v = splitmix32(contador);
    s[base + i] = v;
    soma |= v;
  }
  // Estado todo em zero é inválido no xoshiro; a chance é desprezível, mas a saída é determinística.
  if (soma === 0) s[base] = 1;
}

/** Índice do fluxo no bloco de estados de RNG. */
export function indiceDoFluxo(fluxo: Fluxo): number {
  return FLUXOS.indexOf(fluxo);
}
