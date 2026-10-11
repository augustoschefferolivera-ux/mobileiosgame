// Estado da simulação: um único ArrayBuffer com views tipadas (ADR-0002 §4).
// Nada é alocado depois de criarEstado(). Na F-002: cabeçalho (com os
// parâmetros da Vigília), fluxos de RNG e o registro do jogador; mundo e pools
// entram nas features seguintes, cada uma aumentando VERSAO_LAYOUT.
import type { DadosDaVigilia } from '../mundo/dados';
import { fnv1aBytes, FNV_BASE } from './hash';
import { FLUXOS, PALAVRAS_POR_FLUXO, indiceDoFluxo, semear, type Fluxo } from './rng';

export const VERSAO_LAYOUT = 2;

/** Palavras do cabeçalho (Uint32). As não usadas ficam em zero e entram no hash. */
export const CAB = {
  versao: 0,
  seed: 1,
  /** Passos simulados desde o início da Vigília. */
  passo: 2,
  /** Relógio da Vigília em passos; para na Fogueira (a partir da F-008). */
  relogio: 3,
  /** Parâmetro da Vigília: bits de TUTORIAL já cumpridos (ADR-0002 §3; Q-26). */
  tutoriaisVistos: 4,
  /** Impressão da disposição dos obstáculos (design/decisoes-F-002.md §2). */
  disposicao: 5,
} as const;
const PALAVRAS_CAB = 8;

/** Bits de `CAB.tutoriaisVistos`; esquiva e aparo entram na F-006. */
export const TUTORIAL = { mover: 1 } as const;

/** Registro do jogador, Float32 (design/decisoes-F-002.md §6). (x, y) é o incentro do triângulo. */
export const JOGADOR = { x: 0, y: 1, xAnt: 2, yAnt: 3, dirX: 4, dirY: 5 } as const;
const FLOATS_JOGADOR = 6;
/** Registro do jogador, Uint8 (os 3 bytes seguintes ficam reservados, em zero). */
export const JOGADOR_U8 = { promptMover: 0 } as const;
const BYTES_JOGADOR_U8 = 4;

/** Estados do prompt "Deslize para mover" (A2.TUTORIAL.01; design/decisoes-F-002.md §7). */
export const PROMPT = { aguardando: 0, visivel: 1, cumprido: 2 } as const;

export interface ParametrosDaVigilia {
  /** Bits de TUTORIAL já cumpridos: do meta (F-007) ou de ?tutorial=0. */
  readonly tutoriaisVistos: number;
}
export const PARAMETROS_PADRAO: ParametrosDaVigilia = { tutoriaisVistos: 0 };

const PALAVRAS_RNG = FLUXOS.length * PALAVRAS_POR_FLUXO;
const BYTES_CAB = PALAVRAS_CAB * 4;
const BYTES_RNG = PALAVRAS_RNG * 4;
const INICIO_JOGADOR = BYTES_CAB + BYTES_RNG;
const INICIO_JOGADOR_U8 = INICIO_JOGADOR + FLOATS_JOGADOR * 4;
export const BYTES_ESTADO = INICIO_JOGADOR_U8 + BYTES_JOGADOR_U8;

export interface Estado {
  readonly buffer: ArrayBuffer;
  /** O buffer inteiro, para o hash e para o save. */
  readonly bytes: Uint8Array;
  readonly cab: Uint32Array;
  /** Estados dos fluxos de RNG, 4 palavras por fluxo, na ordem de FLUXOS. */
  readonly rng: Uint32Array;
  /** Campos Float32 do jogador, pelos índices de JOGADOR. */
  readonly jogador: Float32Array;
  /** Campos Uint8 do jogador, pelos índices de JOGADOR_U8. */
  readonly jogadorU8: Uint8Array;
}

export function criarEstado(seed: number, dados: DadosDaVigilia, params: ParametrosDaVigilia = PARAMETROS_PADRAO): Estado {
  const buffer = new ArrayBuffer(BYTES_ESTADO);
  const estado: Estado = {
    buffer,
    bytes: new Uint8Array(buffer),
    cab: new Uint32Array(buffer, 0, PALAVRAS_CAB),
    rng: new Uint32Array(buffer, BYTES_CAB, PALAVRAS_RNG),
    jogador: new Float32Array(buffer, INICIO_JOGADOR, FLOATS_JOGADOR),
    jogadorU8: new Uint8Array(buffer, INICIO_JOGADOR_U8, BYTES_JOGADOR_U8),
  };
  reiniciarEstado(estado, seed, dados, params);
  return estado;
}

/**
 * Zera o estado, grava os parâmetros, semeia todos os fluxos e põe o jogador
 * no início, apontando para cima, sem alocar. A seed é um inteiro de 32 bits sem sinal.
 */
export function reiniciarEstado(e: Estado, seed: number, dados: DadosDaVigilia, params: ParametrosDaVigilia = PARAMETROS_PADRAO): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed fora de u32: ${seed}`);
  e.bytes.fill(0);
  e.cab[CAB.versao] = VERSAO_LAYOUT;
  e.cab[CAB.seed] = seed >>> 0;
  e.cab[CAB.tutoriaisVistos] = params.tutoriaisVistos >>> 0;
  e.cab[CAB.disposicao] = dados.impressao >>> 0;
  for (const fluxo of FLUXOS) semear(e.rng, baseDoFluxo(fluxo), seed, fluxo);
  const j = e.jogador;
  j[JOGADOR.x] = j[JOGADOR.xAnt] = dados.inicioX;
  j[JOGADOR.y] = j[JOGADOR.yAnt] = dados.inicioY;
  j[JOGADOR.dirX] = 0;
  j[JOGADOR.dirY] = -1;
  e.jogadorU8[JOGADOR_U8.promptMover] = params.tutoriaisVistos & TUTORIAL.mover ? PROMPT.cumprido : PROMPT.aguardando;
}

/** Deslocamento do fluxo dentro de `estado.rng`. */
export function baseDoFluxo(fluxo: Fluxo): number {
  return indiceDoFluxo(fluxo) * PALAVRAS_POR_FLUXO;
}

/** FNV-1a de 32 bits sobre o buffer inteiro: cabeçalho, RNG e jogador. */
export function hashEstado(e: Estado): number {
  return fnv1aBytes(FNV_BASE, e.bytes);
}
