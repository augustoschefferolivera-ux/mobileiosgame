// Migrações do save `vigilia` (design/decisoes-F-008.md SV7). Duas cadeias de funções puras, uma por eixo de versão:
// o envelope (`versao`, hoje 1) e o buffer da simulação (`layout`, hoje 10). `MIGRACOES_DO_ENVELOPE[i]` leva a versão
// `i + 1` à `i + 2`; `MIGRACOES_DO_LAYOUT[n]` leva o buffer do layout `n` ao `n + 1`, estendendo-o com os padrões do que o
// layout novo acrescenta (stamina 100, contadores 0: a regra da D6 §10). Nada gravava `vigilia` antes do layout 8, então
// as duas cadeias nascem vazias; a feature que aumentar `VERSAO_LAYOUT` acrescenta aqui a migração do layout anterior.
// A F-009 (layout 9) traz o elo 8 → 9 e a F-010 (layout 10), o 9 → 10. Módulo puro, sem I/O.

import { BYTES_DO_LAYOUT_8, BYTES_DO_LAYOUT_9, CAB, CHEFE_U16, LAYOUT, SEM_CHEFE } from '../nucleo/estado';
import { NUMERO_DE_NOS } from '../progressao/fundacao';
import type { Meta } from './meta';

/** O envelope lido do JSON, ainda sem tipo (a validação vem depois da migração). */
export type EnvelopeBruto = Record<string, unknown>;

/** `vN → vN+1` sobre o envelope (sem a soma). */
export type MigracaoDeEnvelope = (envelope: EnvelopeBruto) => EnvelopeBruto;

/** Estende o buffer do layout `n` para o `n + 1` (devolve bytes novos). */
export type MigracaoDeLayout = (bytes: Uint8Array) => Uint8Array;

/** Índice 0 = v1 → v2 etc. Vazia: só existe a versão 1. */
export const MIGRACOES_DO_ENVELOPE: readonly MigracaoDeEnvelope[] = [];

/**
 * Layout 8 → 9 (F-009, D8 SV7): o buffer ganha o bloco do chefe em zero, com `chefeSlot` = `SEM_CHEFE` (0xFFFF), e a palavra
 * da versão passa a 9. Uma Vigília do v8 nunca passou das 19:59 numa Fogueira (nenhuma existe depois de 20:00), então o chefe
 * ainda não existe e o bloco novo em zero é o estado certo.
 */
export function migrarLayout8Para9(bytes: Uint8Array): Uint8Array {
  const novo = new Uint8Array(BYTES_DO_LAYOUT_9);
  novo.set(bytes.subarray(0, Math.min(bytes.length, BYTES_DO_LAYOUT_8)));
  new Uint32Array(novo.buffer, 0, 16)[CAB.versao] = 9;
  new Uint16Array(novo.buffer, LAYOUT.chefeU16, 12)[CHEFE_U16.slot] = SEM_CHEFE;
  return novo;
}

/**
 * Layout 9 → 10 (F-010, D8 SV7, LY1): o buffer ganha os 4 bytes da Fundação em zero (Pele, Fôlego, Casco, Bigorna em rank 0)
 * e a palavra da versão passa a 10. Uma Vigília gravada antes da Fundação não tinha rank algum, então zero é o estado certo.
 */
export function migrarLayout9Para10(bytes: Uint8Array): Uint8Array {
  const novo = new Uint8Array(LAYOUT.fim);
  novo.set(bytes.subarray(0, Math.min(bytes.length, BYTES_DO_LAYOUT_9)));
  new Uint32Array(novo.buffer, 0, 16)[CAB.versao] = 10;
  return novo;
}

/** Chave = layout de origem: 8 → 9 e 9 → 10. Não existe save de layout < 8 (nada gravava `vigilia`). */
export const MIGRACOES_DO_LAYOUT: Readonly<Record<number, MigracaoDeLayout>> = { 8: migrarLayout8Para9, 9: migrarLayout9Para10 };

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

/** `vN → vN+1` sobre o meta já lido e validado na versão `N` (os campos que a versão não tinha vêm com o padrão; MT2). */
export type MigracaoDeMeta = (meta: Meta) => Meta;

/**
 * Cadeia do meta (D10 MT2); índice 0 = v1 → v2. A 1 → 2 acrescenta `brasas` 0 (F-009); a 2 → 3 acrescenta a Fundação zerada
 * (ranks 0, `gasto` 0), os marcos em 0 e o convite sem recusa (F-010). A soma é refeita na gravação.
 */
export const MIGRACOES_DO_META: readonly MigracaoDeMeta[] = [
  (m) => ({ ...m, versao: 2, brasas: 0, soma: '' }),
  (m) => ({ ...m, versao: 3, fundacao: { ranks: new Array<number>(NUMERO_DE_NOS).fill(0), gasto: 0 }, marcos: 0, conviteRecusadoEm: null, soma: '' }),
];

/** Leva o meta da versão `de` até `ate` pela cadeia. Sem elo (versão futura ou 0), devolve o meta como está: quem chama já recusou essas. */
export function migrarMeta(meta: Meta, de: number, ate: number, cadeia: readonly MigracaoDeMeta[] = MIGRACOES_DO_META): Meta {
  let atual = meta;
  for (let v = de; v < ate; v++) {
    const passo = cadeia[v - 1];
    if (passo === undefined) return atual;
    atual = passo(atual);
  }
  return atual;
}
