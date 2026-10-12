// Migrações do save `vigilia` (design/decisoes-F-008.md SV7). Duas cadeias de funções puras, uma por eixo de versão:
// o envelope (`versao`, hoje 1) e o buffer da simulação (`layout`, hoje 8). `MIGRACOES_DO_ENVELOPE[i]` leva a versão
// `i + 1` à `i + 2`; `MIGRACOES_DO_LAYOUT[n]` leva o buffer do layout `n` ao `n + 1`, estendendo-o com os padrões do que o
// layout novo acrescenta (stamina 100, contadores 0: a regra da D6 §10). Nada gravava `vigilia` antes do layout 8, então
// as duas cadeias nascem vazias; a feature que aumentar `VERSAO_LAYOUT` acrescenta aqui a migração do layout anterior.
// Módulo puro, sem I/O.

/** O envelope lido do JSON, ainda sem tipo (a validação vem depois da migração). */
export type EnvelopeBruto = Record<string, unknown>;

/** `vN → vN+1` sobre o envelope (sem a soma). */
export type MigracaoDeEnvelope = (envelope: EnvelopeBruto) => EnvelopeBruto;

/** Estende o buffer do layout `n` para o `n + 1` (devolve bytes novos). */
export type MigracaoDeLayout = (bytes: Uint8Array) => Uint8Array;

/** Índice 0 = v1 → v2 etc. Vazia: só existe a versão 1. */
export const MIGRACOES_DO_ENVELOPE: readonly MigracaoDeEnvelope[] = [];

/** Chave = layout de origem. Vazia: não existe save de layout < 8 (nada gravava `vigilia`). */
export const MIGRACOES_DO_LAYOUT: Readonly<Record<number, MigracaoDeLayout>> = {};

/**
 * Leva o envelope da versão `de` até `ate` pela cadeia dada; `null` se falta algum elo ou `de` é maior que `ate`
 * (save de um build mais novo: ignorado, sem crédito).
 */
export function migrarEnvelope(envelope: EnvelopeBruto, de: number, ate: number, cadeia: readonly MigracaoDeEnvelope[] = MIGRACOES_DO_ENVELOPE): EnvelopeBruto | null {
  if (!Number.isInteger(de) || de < 1 || de > ate) return null;
  let atual = envelope;
  for (let v = de; v < ate; v++) {
    const passo = cadeia[v - 1];
    if (passo === undefined) return null;
    atual = { ...passo(atual), versao: v + 1 };
  }
  return atual;
}

/** Leva o buffer do layout `de` até `ate`; `null` se falta algum elo ou `de` é maior que `ate`. */
export function migrarLayout(bytes: Uint8Array, de: number, ate: number, cadeia: Readonly<Record<number, MigracaoDeLayout>> = MIGRACOES_DO_LAYOUT): Uint8Array | null {
  if (!Number.isInteger(de) || de < 1 || de > ate) return null;
  let atual = bytes;
  for (let l = de; l < ate; l++) {
    const passo = cadeia[l];
    if (passo === undefined) return null;
    atual = passo(atual);
  }
  return atual;
}
