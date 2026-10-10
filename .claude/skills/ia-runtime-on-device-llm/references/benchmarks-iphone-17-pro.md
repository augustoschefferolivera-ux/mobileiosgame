# Benchmarks de LLM no iPhone (iPhone 17 Pro, jun–ago/2026)

Fonte única: harness reproduzível `john-rocky/apple-silicon-llm-bench` (https://github.com/john-rocky/apple-silicon-llm-bench), lido em 10/10/2026. **Benchmark comunitário, não da Apple.** O autor avisa: "cross-session ratios are invalid on this device" (estado térmico muda entre sessões). Nenhuma linha roda com um jogo renderizando ao mesmo tempo; os números são tetos, não expectativas.

## Gemma 4 E2B — iOS 27.0

| Runtime / quantização | Decode tok/s | ITL p50 | Memória | GSM8K |
|---|---|---|---|---|
| LiteRT-LM (QAT oficial) | **61,1** | 16,3 ms | 497 MB | 86% |
| Cactus (CQ4) | 50,0 | 19,8 ms | 632 MB | **3,0%** (colapso de qualidade) |
| MLX-Swift PTQ 4-bit | 49,1 | 20,5 ms | 3.010 MB | 84% |
| Core AI int4 | 47,1 | 21,4 ms | 755 MB | 88% |
| llama.cpp Q4_K_M | 38,8 | 24,4 ms | 191 MB (mmap; não comparável) | 76% |
| MLX-Swift QAT | 36,0 | 27,9 ms | 4.592 MB | 91% |

Prefill com p=1024: LiteRT-LM 3.513 tok/s; MLX 3.274 tok/s.

## Qwen3-0.6B — chat curto (128 tokens)

| Runtime | tok/s | Memória |
|---|---|---|
| Core AI GPU INT4 | 193,3 (frio) | 196 MB |
| MLX Q4 | 167,2 frio / 158,8 quente | 489 MB |
| LiteRT-LM INT4 | 121 | 1.384 MB |
| Core ML ANE INT8 | 37,7 | — |

## Qwen 3.5 2B — iOS 26.4.2, builds Debug

| Runtime | tok/s | Memória |
|---|---|---|
| MLX-Swift | 61,2 | 1.279 MB |
| llama.cpp | 39,1 | 1.479 MB |
| Core ML/ANE | 27,9 | 241 MB |

## Outros pontos (secundários)

- Llama 3.2 3B no iPhone Air (A19): 27,2 tok/s em llama.cpp sem throttling; pico de memória llama.cpp 696 MB vs MLX 2.508 MB (Pocket AI Lab, via resumo de busca) [secundário].
- Throttling térmico: 37,58 tok/s frio → 25,31 tok/s quente (−37%) (BuildMVPFast) [secundário].
- Guias genéricos citam 15–30 tok/s em A17 Pro+ com apps llama.cpp [secundário].
- Não existe linha do Foundation Models da Apple no harness; a Apple não publica tok/s do modelo on-device.

## Como ler para um jogo

- Fala de 25 palavras ≈ 40 tokens. A 40 tok/s (quente, 2B em llama.cpp) ≈ 1 s de decode + prefill do prompt. A 150 tok/s (0,6B) ≈ 0,3 s.
- RAM: iPhone 17 Pro tem 12 GB? Não verificado; modelos base têm menos. Mire ≤ 70% da RAM disponível para jogo + modelo no **aparelho mínimo** [confirmar RAM por modelo na Apple].
- Qualidade: 76–91% GSM8K é matemática simples; nada disso é "conhecimento de mundo". Para fala de persona, só o seu teste com prompts do jogo vale.
- Repita o harness no seu aparelho antes de decidir; o repositório traz as instruções.
