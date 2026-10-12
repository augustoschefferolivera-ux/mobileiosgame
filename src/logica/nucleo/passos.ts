// Passo fixo de 60 Hz (B §3.1; ADR-0002 §3). Toda duração da simulação é
// contada em passos inteiros.

export const PASSOS_POR_SEGUNDO = 60;
export const PASSO_MS = 1000 / PASSOS_POR_SEGUNDO;
/** Teto de passos por frame (B §3.1). O excedente vai para `passos_perdidos`. */
export const MAX_PASSOS_POR_FRAME = 5;

/**
 * Converte segundos em passos pelo inteiro mais próximo (ADR-0002 §3, aprovado na §15 item 2).
 * Quando B já dá o número de passos (esquiva 21, aparo 11 etc.), vale o de B, não esta função.
 */
export function segundosEmPassos(segundos: number): number {
  return Math.round(segundos * PASSOS_POR_SEGUNDO);
}
