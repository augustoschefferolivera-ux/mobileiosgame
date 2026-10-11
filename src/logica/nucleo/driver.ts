// Um frame do driver do passo fixo (ADR-0002 §3): soma o delta bruto ao
// acumulador e roda de 0 a 5 passos. A cena Vigilia só repassa o rawDelta e a
// fonte de comandos: ao vivo, o vetor que o tradutor leu neste frame.
import { avancarAcumulador, type Acumulador } from './acumulador';
import type { FonteDeComandos } from './comandos';
import type { Estado } from './estado';
import type { DadosDaVigilia } from '../mundo/dados';
import { avancar } from './passo';

/** Devolve quantos passos rodaram neste frame. */
export function rodarFrame(e: Estado, dados: DadosDaVigilia, acc: Acumulador, deltaMs: number, fonte: FonteDeComandos): number {
  const n = avancarAcumulador(acc, deltaMs);
  avancar(e, dados, fonte, n);
  return n;
}
