// TETO de inimigos vivos: 300 ou 500 (B §3.7 e §3.13; ADR-0002 §13;
// design/decisoes-F-003.md §5, T1). decidirTeto é pura e tem as 5 camadas do
// ADR, na ordem: override (?teto, só no debug), cache (vdc.teto), classe de
// tela, sonda e fallback 300. Os produtores do cache e da sonda chegam na F-004,
// a 1ª feature com projéteis (src/plataforma/sonda.ts; design/decisoes-F-004.md §5).

export type ValorDoTeto = 300 | 500;
export type OrigemDoTeto = 'override' | 'cache' | 'tela' | 'sonda' | 'fallback';

export interface Tela {
  /** devicePixelRatio. */
  readonly dpr: number;
  /** Largura e altura da tela em pt (screen.width e screen.height). */
  readonly largura: number;
  readonly altura: number;
}

export interface EntradasDoTeto {
  readonly override: ValorDoTeto | null;
  readonly cache: ValorDoTeto | null;
  readonly tela: Tela | null;
  /** Resultado da sonda, com a mediana em ms por passo; null sem sonda. */
  readonly sonda: { readonly valor: ValorDoTeto; readonly ms: number } | null;
}

export interface Teto {
  readonly valor: ValorDoTeto;
  readonly origem: OrigemDoTeto;
  readonly sondaMs: number | null;
}

/** TETO de fallback (B §3.7: "com fallback 300"). */
export const TETO_DE_FALLBACK: ValorDoTeto = 300;

/**
 * Classe de tela dos aparelhos anteriores ao iPhone 12 (ADR-0002 §13 e §15 item 2):
 * DPR 2, largura ≤ 375 pt ou 414 × 896 (em retrato ou em paisagem) → 300.
 */
export function telaDeAparelhoAntigo(t: Tela): boolean {
  const menor = Math.min(t.largura, t.altura);
  const maior = Math.max(t.largura, t.altura);
  return t.dpr === 2 || menor <= 375 || (menor === 414 && maior === 896);
}

export function decidirTeto(e: EntradasDoTeto): Teto {
  if (e.override !== null) return { valor: e.override, origem: 'override', sondaMs: null };
  if (e.cache !== null) return { valor: e.cache, origem: 'cache', sondaMs: null };
  if (e.tela !== null && telaDeAparelhoAntigo(e.tela)) return { valor: 300, origem: 'tela', sondaMs: null };
  if (e.sonda !== null) return { valor: e.sonda.valor, origem: 'sonda', sondaMs: e.sonda.ms };
  return { valor: TETO_DE_FALLBACK, origem: 'fallback', sondaMs: null };
}
