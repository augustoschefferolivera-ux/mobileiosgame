// Estado da simulação: um único ArrayBuffer com views tipadas (ADR-0002 §4).
// Nada é alocado depois de criarEstado(). Na F-001 o estado tem só o
// cabeçalho e os fluxos de RNG; jogador, mundo e pools entram nas features
// seguintes, cada uma aumentando VERSAO_LAYOUT.
import { fnv1aBytes, FNV_BASE } from './hash';
import { FLUXOS, PALAVRAS_POR_FLUXO, indiceDoFluxo, semear, type Fluxo } from './rng';

export const VERSAO_LAYOUT = 1;

/** Palavras do cabeçalho (Uint32). As não usadas ficam em zero e entram no hash. */
export const CAB = {
  versao: 0,
  seed: 1,
  /** Passos simulados desde o início da Vigília. */
  passo: 2,
  /** Relógio da Vigília em passos; para na Fogueira (a partir da F-008). */
  relogio: 3,
} as const;
const PALAVRAS_CAB = 8;

const PALAVRAS_RNG = FLUXOS.length * PALAVRAS_POR_FLUXO;
const BYTES_CAB = PALAVRAS_CAB * 4;
export const BYTES_ESTADO = BYTES_CAB + PALAVRAS_RNG * 4;

export interface Estado {
  readonly buffer: ArrayBuffer;
  /** O buffer inteiro, para o hash e para o save. */
  readonly bytes: Uint8Array;
  readonly cab: Uint32Array;
  /** Estados dos fluxos de RNG, 4 palavras por fluxo, na ordem de FLUXOS. */
  readonly rng: Uint32Array;
}

export function criarEstado(seed: number): Estado {
  const buffer = new ArrayBuffer(BYTES_ESTADO);
  const estado: Estado = {
    buffer,
    bytes: new Uint8Array(buffer),
    cab: new Uint32Array(buffer, 0, PALAVRAS_CAB),
    rng: new Uint32Array(buffer, BYTES_CAB, PALAVRAS_RNG),
  };
  reiniciarEstado(estado, seed);
  return estado;
}

/** Zera o estado e semeia todos os fluxos, sem alocar. A seed é um inteiro de 32 bits sem sinal. */
export function reiniciarEstado(e: Estado, seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed fora de u32: ${seed}`);
  e.bytes.fill(0);
  e.cab[CAB.versao] = VERSAO_LAYOUT;
  e.cab[CAB.seed] = seed >>> 0;
  for (const fluxo of FLUXOS) semear(e.rng, baseDoFluxo(fluxo), seed, fluxo);
}

/** Deslocamento do fluxo dentro de `estado.rng`. */
export function baseDoFluxo(fluxo: Fluxo): number {
  return indiceDoFluxo(fluxo) * PALAVRAS_POR_FLUXO;
}

/** FNV-1a de 32 bits sobre o buffer inteiro (as regiões canônicas da F-001). */
export function hashEstado(e: Estado): number {
  return fnv1aBytes(FNV_BASE, e.bytes);
}
