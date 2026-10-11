// Acumulador do passo fixo (B §3.1; ADR-0002 §3). Puro: recebe o delta bruto
// do frame em ms e diz quantos passos rodar. O driver fica em src/cenas.
import { MAX_PASSOS_POR_FRAME, PASSO_MS } from './passos';

/** Tolerância contra o erro de arredondamento de 5 × PASSO_MS. */
const EPS_MS = 1e-6;

export interface Acumulador {
  /** Tempo acumulado que ainda não virou passo, em ms (0 ≤ resto < PASSO_MS). */
  restoMs: number;
  /** Total de passos descartados por excederem o teto de 5 por frame. */
  passosPerdidos: number;
}

export function criarAcumulador(): Acumulador {
  return { restoMs: 0, passosPerdidos: 0 };
}

/**
 * Soma o delta do frame e devolve quantos passos rodar (0 a 5).
 * O que passar de 5 é descartado e somado em `passosPerdidos`.
 */
export function avancarAcumulador(acc: Acumulador, deltaMs: number): number {
  if (!(deltaMs > 0)) return 0;
  let resto = acc.restoMs + deltaMs;
  let n = Math.floor((resto + EPS_MS) / PASSO_MS);
  resto -= n * PASSO_MS;
  if (resto < 0) resto = 0;
  if (n > MAX_PASSOS_POR_FRAME) {
    acc.passosPerdidos += n - MAX_PASSOS_POR_FRAME;
    n = MAX_PASSOS_POR_FRAME;
  }
  acc.restoMs = resto;
  return n;
}

/** Fração do passo seguinte já decorrida (0 ≤ alfa < 1), usada para interpolar o render. */
export function alfa(acc: Acumulador): number {
  return acc.restoMs / PASSO_MS;
}
