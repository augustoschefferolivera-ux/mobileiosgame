// Linhas da build na tela de pausa (design/decisoes-F-005.md §6, "Pausa"), sem
// Phaser: até 11 pares nome + nível, as armas e depois as passivas, na ordem das
// vagas. O bloco do nome sai da flag `uniao` da tabela (F1 arma, F2 União, F3
// passiva), nunca do id; a arma de nivel_max 1 (a União) não mostra o nível.
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';

export interface LinhaDaPausa {
  /** Id do nome em pt-BR.json (F1.*.NOME, F2.*.NOME ou F3.*.NOME). */
  readonly idDoNome: string;
  /** Nível a mostrar em A6.PAUSA.NIVEL; null = o Text do nível fica escondido. */
  readonly nivel: number | null;
}

export interface BuildParaAPausa {
  readonly armas: { readonly codigo: ArrayLike<number>; readonly nivel: ArrayLike<number> };
  readonly passivas: { readonly codigo: ArrayLike<number>; readonly nivel: ArrayLike<number> };
  /** Da tabela de armas (por código): 1 = União; nível máximo. */
  readonly uniao: ArrayLike<number>;
  readonly nivelMax: ArrayLike<number>;
}

/** Pares de texto da pausa: 5 de arma + 6 de passiva. */
export const PARES_DA_PAUSA = 11;

/** Linhas de vagas ocupadas, armas primeiro; `out` é reaproveitado. */
export function linhasDaPausa(b: BuildParaAPausa, out: LinhaDaPausa[]): LinhaDaPausa[] {
  out.length = 0;
  for (let v = 0; v < b.armas.codigo.length; v++) {
    const c = b.armas.codigo[v]!;
    if (c === 0) continue;
    const bloco = b.uniao[c] === 1 ? 'F2' : 'F1';
    out.push({
      idDoNome: `${bloco}.${IDS_DE_ARMA[c]!.toUpperCase()}.NOME`,
      nivel: b.nivelMax[c] === 1 ? null : b.armas.nivel[v]!,
    });
  }
  for (let v = 0; v < b.passivas.codigo.length; v++) {
    const c = b.passivas.codigo[v]!;
    if (c === 0) continue;
    out.push({ idDoNome: `F3.${IDS_DE_PASSIVA[c]!.toUpperCase()}.NOME`, nivel: b.passivas.nivel[v]! });
  }
  return out;
}
