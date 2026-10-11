// Um frame do driver do passo fixo (ADR-0002 §3): soma o delta bruto ao
// acumulador e roda de 0 a 5 passos. A cena Vigilia só repassa o rawDelta.
import { avancarAcumulador, type Acumulador } from './acumulador';
import type { Estado } from './estado';
import { passo } from './passo';

/** Devolve quantos passos rodaram neste frame. */
export function rodarFrame(e: Estado, acc: Acumulador, deltaMs: number): number {
  const n = avancarAcumulador(acc, deltaMs);
  for (let i = 0; i < n; i++) passo(e);
  return n;
}
