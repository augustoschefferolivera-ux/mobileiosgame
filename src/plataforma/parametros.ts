// Parâmetros de URL (ADR-0002 §14): só valem no build de debug; o build de
// produção ignora todos. Existem ?seed=N (F-001) e ?tutorial=0 (F-002); os
// demais (?debug, ?teto, ?render, ?inicio, ?cenario) entram com as suas features.

export interface Parametros {
  /** Seed pedida, ou null para sortear. */
  seed: number | null;
  /** ?tutorial=0: a Vigília começa com todos os tutoriais vistos (ADR-0002 §3). */
  pularTutoriais: boolean;
}

export function lerParametros(busca: string, ehBuildDeDebug: boolean): Parametros {
  if (!ehBuildDeDebug) return { seed: null, pularTutoriais: false };
  const p = new URLSearchParams(busca);
  const textoSeed = p.get('seed');
  const n = textoSeed === null || textoSeed.trim() === '' ? Number.NaN : Number(textoSeed);
  const seed = Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  return { seed, pularTutoriais: p.get('tutorial') === '0' };
}

/** Seed de 32 bits sorteada fora da simulação (a simulação só recebe o número). */
export function sortearSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
