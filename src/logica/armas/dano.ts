// Fórmula de dano das armas (B §3.8; design/decisoes-F-004.md D1 a D3):
// Dano = Base(nível) × (1 + Poder) × Escala × multStatus × multStamina, com
// Base(nível) = Base₁ × (1 + Σ bônus de dano do nível ÷ 100) e
// Escala = Σ grau × atributo ÷ 10. Todos os fatores entram como inteiros
// (percentuais e milésimos), o numerador é exato (abaixo de 2⁵³ no pior caso
// do MVP) e há uma única divisão em double: o resultado não depende da ordem
// das multiplicações. Fracionário, sem arredondar na simulação.

/** Poder em % (B §3.3): 0 até as F-005 e F-006, que criam as fontes. */
export const PODER_PCT = 0;
/** multStatus e multStamina neutros (100%): os estados que os mudam nascem nas F-006 e F-009 (D3). */
export const MULT_NEUTRO_PCT = 100;

/**
 * Dano de um acerto. `base` é o dano do nv1 (inteiro); `num`/`den`, a fração
 * por disparo (30/60 no tick da aura); `somaDanoPct`, os bônus de dano do
 * nível somados (D2); `escalaMil`, Σ grau em centésimos × atributo.
 */
export function danoPorAcerto(
  base: number,
  num: number,
  den: number,
  somaDanoPct: number,
  poderPct: number,
  escalaMil: number,
  multStatusPct: number,
  multStaminaPct: number,
): number {
  return (base * num * (100 + somaDanoPct) * (100 + poderPct) * escalaMil * multStatusPct * multStaminaPct) / (den * 1e11);
}
