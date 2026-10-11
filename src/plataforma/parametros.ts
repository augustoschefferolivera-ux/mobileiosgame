// Parâmetros de URL (ADR-0002 §14): só valem no build de debug; o build de
// produção ignora todos. Na F-001 existem ?seed=N e ?debug=1; os demais
// (?teto, ?render, ?tutorial, ?inicio, ?cenario) entram com as suas features.

export interface Parametros {
  /** Seed pedida, ou null para sortear. */
  seed: number | null;
  debug: boolean;
}

export function lerParametros(busca: string, ehBuildDeDebug: boolean): Parametros {
  if (!ehBuildDeDebug) return { seed: null, debug: false };
  const p = new URLSearchParams(busca);
  const textoSeed = p.get('seed');
  const n = textoSeed === null || textoSeed.trim() === '' ? Number.NaN : Number(textoSeed);
  const seed = Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  return { seed, debug: p.get('debug') === '1' };
}

/** Seed de 32 bits sorteada fora da simulação (a simulação só recebe o número). */
export function sortearSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
