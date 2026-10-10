# Rubrica do crítico independente

Espelha os critérios (a)–(g) de `.claude/agents/critico.md` e acrescenta âncoras de nota, métricas objetivas e o modelo do relatório. Valores marcados "[heurística]" são limiares deste banco, não números de fabricante; ajuste no brief.

## Critérios, âncoras e como medir

| # | Critério | Como medir (objetivo primeiro) | 10 | 5 | 0 |
|---|---|---|---|---|---|
| a | **Aceite da feature** | % dos `criterio_de_aceite` com prova em arquivo (teste, screenshot, `debug_state.json`) | todos provados | metade provada, nenhum falho | algum critério falha ou nenhum tem prova |
| b | **Crash / erro** | `app.log`/`run.log` sem `crash|exception|fatal`; processo vivo após o wait; `lastError` nulo no estado | limpo | warnings repetidos / erro não fatal | crash, travamento ou `lastError` preenchido — **crítico, nota final cai para este valor** |
| c | **Desempenho** | FPS médio e mínimo do canal (`fps`) ou MetricKit (iOS 27: taxa de quadros Metal, hangs); tempo de carga; memória | ≥ alvo do brief (ex.: 60 estável no dispositivo mínimo) | quedas visíveis mas sem travar [heurística: mínimo ≥ 30, nenhum frame > 100 ms] | abaixo de 30 ou hitch > 250 ms |
| d | **Legibilidade visual** | no screenshot do menor dispositivo suportado: texto dentro da safe area, alvos de toque ≥ 44×44 pt (HIG), contraste suficiente, nada cortado | tudo legível em 1× | um elemento apertado | texto cortado/ilegível ou alvo < 44 pt em controle principal — **crítico** |
| e | **Consistência com style card / art bible** | paleta, espessura de traço, resolução de sprite, família de UI iguais ao `design/style-card.md`; proveniência registrada | idêntico | um asset destoa | mistura de estilos ou asset sem origem |
| f | **Game feel** | resposta ao toque (≤ 1 frame visível), feedback (som/animação/partícula) em toda ação, transições sem corte; comparar vídeo quando houver | reage e dá feedback em toda ação | reage sem feedback | atraso perceptível ou ação sem resposta |
| g | **Placeholders, texto de IA, marcas** | grep dos padrões do hook (`lorem`, `as an AI`, nomes de modelo, `TODO: replace`) nos assets e strings; logos/nomes de terceiros no screenshot | nada | — | qualquer ocorrência — **reprovação automática (App Store 2.1(a), 5.2.1, 4.1(c))** |

**Nota final** = mínimo entre a média de (a)–(f) e a pior nota marcada como crítica; (g) com ocorrência zera. **Abaixo de 7 a feature não fecha.**

## Comparação cega com referência

1. O chamador coloca `A.png` e `B.png` (uma é a referência, outra é o jogo) sem identificar.
2. O crítico responde: qual parece mais publicável, em três diferenças concretas (densidade de informação, hierarquia visual, acabamento), e o que o pior precisaria para alcançar o melhor.
3. Só depois o chamador revela qual era qual. Se o crítico preferiu o jogo, repita com outra referência antes de confiar.
4. Para jogos 3D web, a referência de Shumer era footage real de FPS comercial; a comparação cega é o que impediu o construtor de "se dar" a nota.

## Defeitos reproduzíveis — formato obrigatório

```
D-01 [crítico|alto|médio|baixo] <título curto>
  Passos: 1) … 2) … 3) …
  Observado: … (arquivo: production/evidencias/<data>-<id>/02-apos-toque.png, linha 143 de app.log)
  Esperado: … (critério AC-2 / pilar "legível com uma mão")
  Sugestão (opcional, uma linha): …
```

Sem passos e sem arquivo não é defeito, é opinião; volta ao crítico.

## Modelo do relatório (`production/criticas/<data>-<id>-rodada-<n>.md`)

```markdown
# Crítica — F-003 <título> — rodada 1 — 2026-10-10

Evidência avaliada: production/evidencias/2026-10-10-F-003/ (screenshot.png, 02-apos-toque.png, app.log, debug_state.json, teste.log)
Referência: design/referencias/threes-tabuleiro.png (comparação cega: A/B)
Dispositivo/simulador: iPhone 17, iOS 27.0, retrato

| Critério | Nota | Justificativa (arquivo/linha) |
|---|---|---|
| a Aceite | 6 | AC-3 sem prova: debug_state.json não tem "ultima_jogada" |
| b Crash | 10 | app.log limpo; processo vivo após 6 s |
| c Desempenho | 8 | fps médio 58, mínimo 51 (debug_state.json) |
| d Legibilidade | 7 | contador de pontos a 11 pt em iPhone SE (02-apos-toque.png) |
| e Consistência | 8 | paleta ok; botão de pausa com raio de canto diferente do style card |
| f Game feel | 6 | peça cai sem som nem partícula |
| g Placeholders | 10 | nenhum |

**Nota final: 6** (média 7,5; pior crítica: a=6) → **CORRIGIR**

## Defeitos
D-01 [crítico] AC-3 não comprovado …
D-02 [alto] contador ilegível …
D-03 [médio] sem feedback ao colocar peça …

## Comparação cega
B (jogo) perde para A em hierarquia visual: …

## O que falta para fechar
AC-3 no canal de depuração; fonte do contador ≥ 13 pt; um SFX de "peça caiu".
```

## Veredito e ação

| Nota final | Veredito | Ação |
|---|---|---|
| ≥ 9 e sem defeito ≥ alto | **APROVADO** | fechar; polimento opcional |
| 7–8,9 sem defeito crítico | **APROVADO COM OBSERVAÇÕES** | fechar; defeitos médios viram feature de fase 8 |
| < 7 ou defeito crítico | **CORRIGIR** | nova rodada (limite padrão 3) |
| 2 rodadas sem subir | **ESTAGNADO** | `blocked` + `motivo`; humano joga e decide |
| Evidência insuficiente | **NÃO AVALIADO** | completar evidência; não conta como rodada |

"NÃO AVALIADO" existe para não transformar "não consegui olhar" em "está ruim" — mesma distinção que o `test-evidence-review` do Game Studios faz entre MISSING e NOT ASSESSED.

## Fontes

Decrypt/edgeX (Gauntlet Loop, 3,59→~5); Anthropic, Claude Code best practices; Claude Code docs — Subagents; Apple HIG (alvos de toque 44 pt), App Store Review Guidelines 2.1(a)/4.1(c)/5.2.1, WWDC26 sessão 222 (MetricKit); `.claude/agents/critico.md` e `.claude/hooks/_common.sh` (padrões de placeholder) deste repositório; Donchitos/Claude-Code-Game-Studios `test-evidence-review` (MIT). URLs no `SKILL.md`.
