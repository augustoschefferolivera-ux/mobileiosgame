# ADR-0012 — Decisões de implementação da F-010 (Santuário mínimo e PWA)

- **Status:** em andamento na Etapa 2 (2a: Fundação, meta v3 e simulação; 2b: Santuário, fluxo, pausa, lint e PWA; 2c: Playwright, evidências e fechamento). São as decisões técnicas tomadas ao implementar `design/decisoes-F-010.md` (aqui, **D10**), aprovada pelo usuário sem veto em 2026-10-12.
- **Fontes:** D10; D7 a D9; ADR-0002 §10, §12 a §15; ADR-0010; ADR-0011.

## 1. Estado v10 e determinismo

- **Layout v10 = 76.872 B** (v9 76.868 + 4 B no fim, LY1): `Estado.fundacaoU8` em `LAYOUT.fundacaoU8` = 76.868, índices `FUNDACAO_U8` = `{ pele: 0, folego: 1, casco: 2, bigorna: 3 }` (mora em `efeitosDaFundacao.ts`, sem imports, para não criar ciclo; `estado.ts` reexporta). `BYTES_DO_LAYOUT_9` exportado; `hashPorSecao` ganha a seção `fundacao` (última). `VERSAO_LAYOUT` 10.
- **Entrada:** `ParametrosDaVigilia.fundacao: RanksDaFundacao { pele, folego, casco, bigorna }` (padrão 0; validado em `reiniciarEstado`: inteiro e dentro do rank máximo do nó). Os ranks valem desde o passo 0 e nunca mudam na Vigília. Os cenários ignoram a Fundação (`ParametrosDoCenario` a omite; FD12).
- **Efeitos (tabelas puras, sem double atravessando chamada):** `armadura()` soma 2 por rank de Pele; o HP inicial e o `hpMax` de cada nível somam 5 × rank de Fôlego ao Σ% (`reiniciarEstado` e `cruzarNiveis`); `aplicarContato` põe `18 + 3 × rank de Casco` passos de invulnerabilidade; `danoAoJogador` multiplica por `MULTIPLICADOR_DA_BIGORNA[rank]` (1; 0,97; 0,94; 0,91, Float32) só na origem contato, depois da armadura e antes da Brasa Firme (FD6). Nenhum fluxo de RNG novo.
- **Mãos de aprendiz (FD7):** `parametrosDaFundacao(meta)` (`fundacao.ts`) devolve `{ fundacao, armas }`; `armas` é `null` com rank 0 e `[{ Espada, 1 + r }]` (máx. 4) com r > 0. O botão Vigília faz `criarEstado/reiniciarEstado(seed, dados, { ...parametrosDaFundacao(meta), ... })`.
- **Hashes de referência (`determinismo.test.ts`, passo de referência):** seed 1 `29725375` e seed 424242 `1776801d` (eram `115fd0ca` e `3b1e2566` no v9; só o layout muda, ranks 0). Regressão `regressao-v9.test.ts` (campos do v9 sem a palavra da versão, horda e Lanterneiro, 2 seeds, valores gravados antes da mudança de simulação) e `migracao-v10.test.ts` (migração 9 → 10: bloco novo em zero, versão 10).
- **Migração do `vigilia`:** `MIGRACOES_DO_LAYOUT[9] = migrarLayout9Para10`; a 8 → 9 agora para em `BYTES_DO_LAYOUT_9` e a cadeia 8 → 9 → 10 é testada.

## 2. Fundação: custo, compra e reembolso

- **Custo (FD3):** `custoDoRank(base, rank, g)` em `src/logica/progressao/fundacao.ts`; potência iterativa em Float32 (`p = fround(p × fround(1,12))`), depois `fround(fround(base × p) × fround(1 + fround(fround(0,015) × g)))` e `⌊v + 0,5⌋`. As três ordens possíveis dos produtos dão os sete vetores da D10 §3 (300, 305, 341, 309, 602, 600, 472); ficou a ordem acima. Os nós e os máximos vêm de `arvore.json` (importado pelo módulo); os efeitos por rank (Pele 2, Fôlego 5 %, Casco 3 passos, Bigorna 0,97 por rank) são tabelas do código, conferidas contra o JSON por teste.

## 3. Meta v3, migrações e armazenamento

- **Meta v3** (`VERSAO_DO_META` 3): `fundacao { ranks[8], gasto }`, `marcos` (máscara `MARCO.balaoCinzas = 1`, `MARCO.iselda = 2`) e `conviteRecusadoEm` (`vigiliasConcluidas` da recusa, ou null). Migrações puras 1 → 2 → 3 em `migracoes.ts`; `vdc.meta.anterior` guarda o texto de uma versão antiga na próxima gravação (uma geração). Soma errada, NaN, `gasto` incoerente com os ranks e versão futura caem no `anterior` e depois nos padrões.
- **GA1:** `aplicarFimDeVigilia` completa o saldo a 300 no 1º Apagar ou A Fome (`ALMAS_GARANTIDAS`) só se estiver abaixo, na mesma gravação do crédito; depois disso `primeiroApagarFeito` impede repetir.
- **Auxiliares para a cena:** `comMarco(meta, MARCO.x)`, `comConviteRecusado(meta)`, `comprar(meta, idx)`, `reembolsar(meta)`, `custoDaCompra(meta, idx)`, `foiRecusado(r)` (`Recusado.recusa`: bloqueado, maximo, sem_almas, nada_a_reembolsar; nunca debita).
- **ST1:** `localStorage` (sem IndexedDB). O `navigator.storage.persist()` em standalone fica na plataforma da etapa 2b.

## 4. Degradação

- `src/plataforma/degradacao.ts` (puro, relógio injetado): `criarDegradacao(agoraMs)`, `registrarQuadro(d, cpuMs, agoraMs)` (fecha a janela de 2 s e decide), `proximoNivel(d, mediaMs, agoraMs)` (> 16 ms sobe 1; < 10 ms por 10 s seguidos desce 1; entre os dois zera a sequência; um nível por janela), `luzLigada(nivel)` e `POOL_DE_MORTES_DEGRADADO` = 150. A cena mede `performance.now()` de PRE_STEP a POST_RENDER (DG1) e aplica os níveis 1 e 2 no render (2b).
- **Nível 3 na simulação (DG3):** `ComandosDoPasso.degradacao` (`Uint8Array(1)`, 0 a 3, nível e não borda; `copiarComandos` e `fonteConstante` o repassam). `passoVivo` passa `cmd.degradacao[0]` a `rodarDiretor(e, dados, moveu, degradacao = 0)` → `repor` → `tetoEfetivo(teto, minimoDaLinha, degradacao)`: no 3, mín(TETO, mínimo da linha sem `I`); a massa acima vira Ocos Grandes pela regra existente. Replay: `fonteDoRoteiro(roteiro, escolhas, acoes, degradacoes)` com `TrechoDeDegradacao { passo, nivel }`. Nenhum fluxo de RNG novo; `passoVivo` ganhou só um argumento.
- **Pendente na 2b:** gravar `vdc.teto` = 300 quando o nível 3 aparece numa Vigília de TETO 500 (DG4; vale na próxima) e pôr o nível medido em `comandosAoVivo.degradacao[0]`.

## 5. Santuário, fluxo, pausa, lint e PWA
(2b.)

## 6. Playwright e evidências
(2c.)

## 7. Testes e medidas

2a: `tests/logica/progressao/fundacao*.test.ts` (F-010.1, .2, .7), `tests/logica/save/meta-v3.test.ts` (.9, GA1), `tests/logica/combate/regressao-v9.test.ts` e `tests/logica/save/migracao-v10.test.ts` (LY1), `tests/logica/fundacao/efeitos-na-simulacao.test.ts` (.11, com alocação ≤ 16 B por passo, com e sem Fundação, medida pelo HeapProfiler como `alocacao-chefe.test.ts`), `maos-de-aprendiz.test.ts` (.8) e `degradacao.test.ts` (.12). 2b e 2c acrescentam.

## 8. O que ficou pendente de aparelho
F-010.5 e as evidências `iphone-11-ou-12.mp4`, `iphone-14.mp4` e `memoria-safari.png` (D10 IP1).

## 9. Divergências

- **HP inicial com o Fôlego (F-010.4 e F-010.11):** a D10 dá 188 (rank 5) e 158 (rank 1) a partir do `hpInicial` 150. A regra aprovada (FD4) soma 5 pontos por rank ao Σ% do `hpMax`, que já traz os 15 % da passiva do Vigilante sobre a base 130 (`hpMaximo(130, 15 + 5 × rank)`). Resultado: **rank 5 = 182, rank 1 = 156**. Os critérios do `feature_list.json` usam 182 e 156; a fórmula não mudou.

- **R10-2, preço total dos 19 ranks:** a D10 (FD10 e a Revisão) diz 7.851 Almas "na ordem mais barata primeiro". Com a fórmula do FD3, os vetores da §3 e o arredondamento por compra, escolher sempre o próximo rank mais barato (e a ordem rank por rank, que dá o mesmo) soma **7.852**; o mínimo possível entre todas as ordens (comprar os maiores ranks cedo, com `G` baixo) é 7.760. Nenhum cálculo natural dá 7.851; a diferença é de 1 Alma e não muda decisão alguma. O teste de F-010.1 trava os 7.852.
