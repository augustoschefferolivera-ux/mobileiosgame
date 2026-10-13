# ADR-0012 — Decisões de implementação da F-010 (Santuário mínimo e PWA)

- **Status:** em andamento na Etapa 2 (2a: Fundação, meta v3 e simulação; 2b: Santuário, fluxo, pausa, lint e PWA; 2c: Playwright, evidências e fechamento). São as decisões técnicas tomadas ao implementar `design/decisoes-F-010.md` (aqui, **D10**), aprovada pelo usuário sem veto em 2026-10-12.
- **Fontes:** D10; D7 a D9; ADR-0002 §10, §12 a §15; ADR-0010; ADR-0011.

## 1. Estado v10 e determinismo
(2a, preenchido junto do commit do layout.)

## 2. Fundação: custo, compra e reembolso

- **Custo (FD3):** `custoDoRank(base, rank, g)` em `src/logica/progressao/fundacao.ts`; potência iterativa em Float32 (`p = fround(p × fround(1,12))`), depois `fround(fround(base × p) × fround(1 + fround(fround(0,015) × g)))` e `⌊v + 0,5⌋`. As três ordens possíveis dos produtos dão os sete vetores da D10 §3 (300, 305, 341, 309, 602, 600, 472); ficou a ordem acima. Os nós e os máximos vêm de `arvore.json` (importado pelo módulo); os efeitos por rank (Pele 2, Fôlego 5 %, Casco 3 passos, Bigorna 0,97 por rank) são tabelas do código, conferidas contra o JSON por teste.

## 3. Meta v3, migrações e armazenamento
(2a.)

## 4. Degradação
(2a.)

## 5. Santuário, fluxo, pausa, lint e PWA
(2b.)

## 6. Playwright e evidências
(2c.)

## 7. Testes e medidas
(2a: ver as seções acima; 2b e 2c acrescentam.)

## 8. O que ficou pendente de aparelho
F-010.5 e as evidências `iphone-11-ou-12.mp4`, `iphone-14.mp4` e `memoria-safari.png` (D10 IP1).

## 9. Divergências

- **R10-2, preço total dos 19 ranks:** a D10 (FD10 e a Revisão) diz 7.851 Almas "na ordem mais barata primeiro". Com a fórmula do FD3, os vetores da §3 e o arredondamento por compra, escolher sempre o próximo rank mais barato (e a ordem rank por rank, que dá o mesmo) soma **7.852**; o mínimo possível entre todas as ordens (comprar os maiores ranks cedo, com `G` baixo) é 7.760. Nenhum cálculo natural dá 7.851; a diferença é de 1 Alma e não muda decisão alguma. O teste de F-010.1 trava os 7.852.
