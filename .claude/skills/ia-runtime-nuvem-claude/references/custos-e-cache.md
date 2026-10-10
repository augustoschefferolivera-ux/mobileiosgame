# Custos, cache e orçamento (preços lidos em 10/10/2026)

Leia quando for orçar ou quando `cache_read_input_tokens` vier zero. Fonte dos preços: https://platform.claude.com/docs/en/about-claude/pricing e https://platform.claude.com/docs/en/build-with-claude/prompt-caching (confira antes de cada release; preços mudam).

## Tabela (US$ por milhão de tokens)

| Modelo | Entrada | Saída | Cache write 5 min | Cache write 1 h | Cache hit | Batch (entrada/saída) |
|---|---|---|---|---|---|---|
| `claude-haiku-5-5` (prompt ≤ 100K) | 0,10 | 0,50 | 0,125 | 0,20 | 0,01 | 0,05 / 0,25 |
| `claude-haiku-5-5` (prompt > 100K) | 0,50 | 2,50 | — | — | — | — |
| `claude-sonnet-5-5` | 2,00 | 10,00 | 2,50 (1,25×) | 4,00 (2×) | 0,10 (página de preços) — a skill `claude-api` local lista 0,20; confirme | 1,00 / 5,00 |
| `claude-opus-5-5` | 4,00 | 20,00 | 5,00 | 8,00 | 0,20 | 2,00 / 10,00 |

Regra geral: cache write 5 min = 1,25× entrada; 1 h = 2×; hit ≈ 0,1× (0,05× no Opus 5.5). Cache write só é cobrado na primeira requisição (e no que mudou depois do maior hit).

## Conta de uma troca de NPC (Haiku 5.5)

| Parte | Tokens | Preço/MTok | Custo |
|---|---|---|---|
| Prefixo em cache (bíblia + ficha) | 1.000 | 0,01 | 0,000010 |
| Entrada nova (estado + fala do jogador) | 200 | 0,10 | 0,000020 |
| Saída (JSON com a fala) | 150 | 0,50 | 0,000075 |
| **Total por troca** | | | **≈ US$ 0,000105** |

- 1.000 trocas ≈ US$ 0,11; 1 milhão de trocas ≈ US$ 105.
- Sem cache (1.200 de entrada a 0,10): ≈ US$ 0,000195 por troca — quase 2×.
- Primeira troca da sessão paga o write: 1.000 × 0,125 = US$ 0,000125 a mais; irrelevante se a sessão tiver ≥ 2 trocas em 5 min.
- Mesma troca no Sonnet 5.5: 1.000×0,10 + 200×2 + 150×10 = ≈ US$ 0,0020 (≈ 19×).
- Pré-geração em Batch (Haiku, sem cache, 300 de entrada + 150 de saída): 300×0,05 + 150×0,25 ≈ US$ 0,00005 por fala.

Orçamento mensal rápido: `DAU × trocas/dia × 30 × custo_por_troca`. 10.000 DAU × 20 trocas × 30 × 0,000105 ≈ **US$ 630/mês** (≈ US$ 705 somando o cache write rateado em sessões de 10 trocas; o script faz essa conta). Se isso assusta, pré-gere em Batch e deixe a nuvem só para falas que dependem do que o jogador digitou.

Script: `python3 scripts/calcular-custo-npc.py --help`.

## Por que o cache zera (auditoria)

Ordem renderizada: `tools → system → messages`. Qualquer byte diferente antes do `cache_control` invalida o resto.

Verifique, nesta ordem:
1. **Prefixo < 512 tokens** (modelos 5.5): não cacheia e não avisa. Meça com `count_tokens`.
2. **Timestamp/data/hora** em `system` ou na descrição de uma tool.
3. **Nome do jogador, ID de sessão, UUID** no `system`. Vão em `messages`.
4. **JSON com chaves em ordem variável** (serializadores sem ordenação) no prefixo.
5. **Lista de tools diferente** entre requisições (ordem ou conjunto).
6. **`thinking`/`effort` diferentes** entre requisições: fazem parte do prefixo renderizado.
7. **Modelo diferente**: cache é por modelo; um "cascade" Haiku → Sonnet não compartilha cache.
8. **Gap > 5 min** entre trocas sem leitura: a entrada expirou. Para pausas de 5–60 min, `cache_control: {"type": "ephemeral", "ttl": "1h"}` (write 2×).

Sinal saudável em sessão multi-turno: `cache_read_input_tokens` cresce a cada turno; `cache_creation_input_tokens` fica pequeno (só o que o turno anterior acrescentou). `input_tokens` é só o resto não cacheado; o total do prompt é a soma dos três.

## Latência

- Estimativas úteis de planejamento: fala curta no Haiku 5.5 com thinking desligado costuma ficar em 1–2 s de ponta a ponta em rede boa [estimativa; meça no aparelho]. Nenhuma fonte oficial lida publica TTFT por modelo.
- Mostre "..." imediato; corte em 2,5 s (p95 alvo) e use fala escrita; descarte a resposta tardia ou guarde para a próxima visita ao NPC.
- Streaming só compensa com > 40 palavras; para 25 palavras, a requisição inteira é mais simples.
- Timeout do SDK: 10 min por padrão; configure 8 s no proxy e lembre que o SDK repete 429/5xx duas vezes.

## Fatos sobre o Haiku 5.5 que mudam código

- Thinking adaptativo ligado por padrão, `effort` padrão `medium`; `{"type": "disabled"}` aceito até `high`.
- `temperature`/`top_p`/`top_k` fora do padrão → 400. Prefill de assistant → 400 (use `output_config.format`).
- `stop_reason: "refusal"` possível; **sem** `fallbacks` server-side neste modelo.
- Tokenizer novo: ~30% mais tokens que o Haiku 4.5 para o mesmo texto.
- Contexto 1M / saída 128K; mas acima de 100K tokens de prompt o preço quintuplica.
