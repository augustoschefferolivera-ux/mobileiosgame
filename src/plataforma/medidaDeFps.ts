// Medida de fps do aparelho (D10 IP3, LY4; só com ?debug=1 ou no build de debug). Fora da simulação: não toca o estado
// nem o hash. O fps médio é por Hora da Vigília (1 a 5), para o critério F-010.5 (Hora IV ≥ 55), e o contador de boots
// da aba (`sessionStorage`) mostra se o aparelho recarregou a página entre as Vigílias.

/** Horas medidas: I a IV e A Fome (mancha.ts `horaDoRelogio`). */
export const HORAS_MEDIDAS = 5;
const CHAVE_DE_BOOTS = 'vdc.boots';

export class MedidorDeFpsPorHora {
  private readonly soma = new Float64Array(HORAS_MEDIDAS + 1);
  private readonly quantas = new Uint32Array(HORAS_MEDIDAS + 1);

  /** Uma amostra de fps dentro da Hora `hora` (1 a 5). Hora fora da faixa ou fps inválido são ignorados. */
  amostrar(hora: number, fps: number): void {
    if (!Number.isInteger(hora) || hora < 1 || hora > HORAS_MEDIDAS || !Number.isFinite(fps) || fps < 0) return;
    this.soma[hora]! += fps;
    this.quantas[hora]!++;
  }

  /** Média da Hora, ou 0 se não houve amostra. */
  mediaDaHora(hora: number): number {
    const n = this.quantas[hora] ?? 0;
    return n === 0 ? 0 : this.soma[hora]! / n;
  }

  /** Médias das Horas 1 a 5 (índice 0 = Hora I), arredondadas a 0,1; 0 onde não houve amostra. */
  porHora(): number[] {
    return Array.from({ length: HORAS_MEDIDAS }, (_, i) => Math.round(this.mediaDaHora(i + 1) * 10) / 10);
  }

  /** Média de todas as amostras. */
  mediaGeral(): number {
    let s = 0;
    let n = 0;
    for (let h = 1; h <= HORAS_MEDIDAS; h++) {
      s += this.soma[h]!;
      n += this.quantas[h]!;
    }
    return n === 0 ? 0 : s / n;
  }
}

/**
 * Conta os boots da aba em `sessionStorage` e devolve as recargas: 0 no primeiro boot, +1 a cada recarga na mesma aba.
 * Sem `sessionStorage` (ou com ele a lançar), devolve 0.
 */
export function contarRecargas(storage: Pick<Storage, 'getItem' | 'setItem'> | null): number {
  try {
    if (storage === null) return 0;
    const lido = Number(storage.getItem(CHAVE_DE_BOOTS));
    const boots = (Number.isInteger(lido) && lido > 0 ? lido : 0) + 1;
    storage.setItem(CHAVE_DE_BOOTS, String(boots));
    return boots - 1;
  } catch {
    return 0;
  }
}
