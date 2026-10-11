// Parâmetros de URL (ADR-0002 §14): só valem no build de debug; o build de
// produção ignora todos. Na F-001 existe só ?seed=N; os demais (?debug,
// ?teto, ?render, ?tutorial, ?inicio, ?cenario) entram com as suas features.

export interface Parametros {
  /** Seed pedida, ou null para sortear. */
  seed: number | null;
}

export function lerParametros(busca: string, ehBuildDeDebug: boolean): Parametros {
  if (!ehBuildDeDebug) return { seed: null };
  const p = new URLSearchParams(busca);
  const textoSeed = p.get('seed');
  const n = textoSeed === null || textoSeed.trim() === '' ? Number.NaN : Number(textoSeed);
  const seed = Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  return { seed };
}

/** Seed de 32 bits sorteada fora da simulação (a simulação só recebe o número). */
export function sortearSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
