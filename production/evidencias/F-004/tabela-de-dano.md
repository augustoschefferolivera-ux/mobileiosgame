# F-004 — tabela de dano gerada pelo teste (Vitest, tests/logica/armas/f004-1.test.ts)

Gerada em 2026-10-11T17:47:33.819Z com Node v22.22.0.

- Vigilante: Aldric, FOR 6 / DES 3 / FÉ 3 (B §3.3), Poder 0.
- Fórmula: Dano = Base(nível) × (1 + Poder) × Escala (B §3.8), com Base(nível) = Base₁ × (1 + Σ bônus de dano do nível), os +20% somados (design/decisoes-F-004.md D2).
- Medida pelo caminho real: o valor de cada evento `acerto` contra um Oco Grande (HP 100) parado a 48 px na mira; o tick do Círculo sai a cada 30 passos com metade do dano por segundo.
- Critério: |desvio| ≤ 1% contra o valor da tabela da §3 da decisão (6,75 no nv1 da Espada, não o "≈ 7" de B).

## Espada Longa do Juramento (base 10; escala FOR C 0,75 × 6/10 + DES C 0,75 × 3/10 = 0,675; recarga 72 passos)

| Nível | Σ bônus | Esperado por acerto | Obtido | Golpes por ciclo | Por ciclo | Desvio | ok |
|---|---|---|---|---|---|---|---|
| 1 | +0% | 6,75 | 6,7500 | 1 | 6,7500 | < 0,0001% | sim |
| 2 | +20% | 8,10 | 8,1000 | 1 | 8,1000 | < 0,0001% | sim |
| 3 | +20% | 8,10 | 8,1000 | 2 | 16,2000 | < 0,0001% | sim |
| 4 | +20% | 8,10 | 8,1000 | 2 | 16,2000 | < 0,0001% | sim |
| 5 | +20% | 8,10 | 8,1000 | 2 | 16,2000 | < 0,0001% | sim |
| 6 | +40% | 9,45 | 9,4500 | 2 | 18,9000 | < 0,0001% | sim |
| 7 | +40% | 9,45 | 9,4500 | 3 | 28,3500 | < 0,0001% | sim |
| 8 | +40% | 9,45 | 9,4500 | 4 | 37,8000 | < 0,0001% | sim |

## Facas de Sal (base 6; escala DES B 1,0 × 3/10 = 0,3; recarga 54 passos)

| Nível | Σ bônus | Esperado por acerto | Obtido | Facas por salva | Por salva | Desvio | ok |
|---|---|---|---|---|---|---|---|
| 1 | +0% | 1,80 | 1,8000 | 2 | 3,6000 | < 0,0001% | sim |
| 2 | +0% | 1,80 | 1,8000 | 3 | 5,4000 | < 0,0001% | sim |
| 3 | +20% | 2,16 | 2,1600 | 3 | 6,4800 | < 0,0001% | sim |
| 4 | +20% | 2,16 | 2,1600 | 3 | 6,4800 | < 0,0001% | sim |
| 5 | +20% | 2,16 | 2,1600 | 4 | 8,6400 | < 0,0001% | sim |
| 6 | +20% | 2,16 | 2,1600 | 4 | 8,6400 | < 0,0001% | sim |
| 7 | +20% | 2,16 | 2,1600 | 4 | 8,6400 | < 0,0001% | sim |
| 8 | +20% | 2,16 | 2,1600 | 5 | 10,8000 | < 0,0001% | sim |

## Círculo de Sal (base 4 por s; escala FÉ A 1,25 × 3/10 = 0,375; recarga 30 passos)

| Nível | Raio (px) | Σ bônus | Esperado por s | Obtido (tick × 2) | Por tick | Desvio | ok |
|---|---|---|---|---|---|---|---|
| 1 | 64,0 | +0% | 1,50 | 1,5000 | 0,7500 | < 0,0001% | sim |
| 2 | 73,6 | +0% | 1,50 | 1,5000 | 0,7500 | < 0,0001% | sim |
| 3 | 73,6 | +20% | 1,80 | 1,8000 | 0,9000 | < 0,0001% | sim |
| 4 | 73,6 | +20% | 1,80 | 1,8000 | 0,9000 | < 0,0001% | sim |
| 5 | 83,2 | +20% | 1,80 | 1,8000 | 0,9000 | < 0,0001% | sim |
| 6 | 83,2 | +40% | 2,10 | 2,1000 | 1,0500 | < 0,0001% | sim |
| 7 | 83,2 | +40% | 2,10 | 2,1000 | 1,0500 | < 0,0001% | sim |
| 8 | 96,0 | +40% | 2,10 | 2,1000 | 1,0500 | < 0,0001% | sim |

aprovado: true
