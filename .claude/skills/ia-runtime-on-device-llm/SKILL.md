---
name: ia-runtime-on-device-llm
description: >
  Embarca um LLM próprio (0,6B–2B em 4-bit) no iPhone para gerar texto offline sem depender da Apple
  Intelligence: orçamento realista de RAM/tok/s/termal com números medidos no iPhone 17 Pro, escolha de
  runtime (llama.cpp, MLX Swift, ExecuTorch, LiteRT-LM) e de quantização, licenças de pesos (Llama, Qwen,
  Gemma), tamanho do app com Background Assets, saída restrita por gramática e testes de memória/termal
  com o jogo renderizando. Use quando o jogo precisa de modelo próprio ou fine-tuned, de paridade com
  Android, ou de IA offline em aparelhos sem Apple Intelligence. Não use se o Foundation Models framework
  resolve (/ia-runtime-foundation-models: zero custo, zero MB no app); para modelos de visão/áudio pequenos
  use Core ML/Unity Inference Engine, não um LLM.
license: MIT
compatibility: "Claude Code ou Codex; macOS com Xcode 27 e CMake para llama.cpp; iPhone físico obrigatório para medir"
metadata:
  grupo: ia-runtime
  alvo: [2d, 3d, app]
  fase: [7, 8]
argument-hint: "[modelo ex.: Qwen3-0.6B | Gemma 4 E2B] [runtime: llama.cpp | mlx | executorch | litert-lm]"
disable-model-invocation: false
user-invocable: true
---

# LLM próprio on-device no iPhone

Entrega um modelo de 0,6B–2B quantizado rodando dentro do jogo com saída restrita por gramática, download fora do binário e fallback escrito; termina quando o aparelho rodou 10 minutos de partida com inferência ativa e `production/evidencias/<data>-on-device-llm/` tem tok/s, pico de RAM, estado térmico e frame time medidos.

## Quando usar / quando não usar

Use quando:
- O jogo precisa de pesos próprios (fine-tune de estilo, idioma ou domínio) ou de um modelo específico que a Apple não oferece.
- Precisa rodar offline em aparelhos **sem** Apple Intelligence (iPhone 15 e anteriores, regiões sem suporte) [lista de aparelhos: secundário, confirmar].
- Quer o mesmo modelo no iOS e no Android (llama.cpp, LiteRT-LM e ExecuTorch são multiplataforma).

Não use quando:
- O `SystemLanguageModel` está disponível e basta: zero custo, zero MB, saída estruturada garantida e atualizado pela Apple. Comece sempre por `/ia-runtime-foundation-models`.
- A tarefa é visão, áudio ou classificação pequena: use Core ML (ANE) ou Unity Inference Engine/Sentis com ONNX, não um LLM.
- O jogo é 3D pesado e o alvo inclui iPhone 15/16 base: 2B em 4-bit disputa 1,3–3 GB de RAM com o render; só com medição.
- Precisa de conhecimento de mundo ou raciocínio: nenhum modelo ≤ 2B entrega isso; use PCC ou nuvem.

## Pré-requisitos

- Mac Apple silicon com Xcode 27; iPhone físico (o simulador não mede nada relevante de GPU/termal).
- Runtime escolhido pela tabela em `references/runtimes-e-licencas.md`:
  - `ggml-org/llama.cpp` (MIT): `build-xcframework.sh` gera o framework iOS com Metal.
  - `ml-explore/mlx-swift-examples` (MIT) + `mlx-swift-lm` (bibliotecas `MLXLLM`/`MLXVLM`).
  - `pytorch/executorch` (BSD): backends XNNPACK, Core ML e MLX (experimental) via SwiftPM.
  - `google-ai-edge/LiteRT-LM` (Apache-2.0, v0.18.0): Swift em "Early Preview".
- Pesos em formato do runtime (GGUF para llama.cpp; safetensors MLX 4-bit; `.pte` para ExecuTorch; `.litertlm` para LiteRT-LM) com LICENSE lido e arquivado em `docs/licencas/`.
- Falas/conteúdo escrito de fallback para quando o download não terminou ou a RAM não permite carregar.
- Skill vizinha `/licencas-e-proveniencia` para registrar a licença dos pesos e a atribuição em `PROVENANCE.md`.

## Entradas

- Caso de uso e orçamento: tok/s mínimo (fala de 25 palavras ≈ 40 tokens; a 40 tok/s ≈ 1 s), RAM máxima que o jogo cede (meça o jogo sem LLM primeiro), latência p95.
- Aparelho mínimo suportado (define o teto: iPhone 15 Pro–17 Pro com 8 GB; modelos base com 6 GB [secundário, confirmar RAM por modelo]).
- Formato de saída esperado (JSON/enum) para a gramática.
- Decisão sobre tamanho de download aceitável e se o modelo entra no binário ou vem por Background Assets.

## Passos

1. **Provar que o Foundation Models não basta.** Rode o conjunto fixo de prompts (`/npc-e-dialogo-dinamico`) no `SystemLanguageModel`; só continue se a falha for documentada (indisponibilidade no aparelho-alvo, qualidade, idioma). Anote em `docs/ia-runtime.md`.

2. **Escolher a faixa de tamanho pelo orçamento.** Números do iPhone 17 Pro (harness reproduzível `john-rocky/apple-silicon-llm-bench`, capturas jun–ago/2026; benchmark comunitário, não da Apple):
   - **Gemma 4 E2B**: LiteRT-LM (QAT oficial) **61,1 tok/s**, 497 MB, GSM8K 86%; MLX-Swift 4-bit PTQ **49,1 tok/s**, 3.010 MB, 84%; llama.cpp Q4_K_M **38,8 tok/s**, 191 MB via mmap (não comparável), 76%; Cactus CQ4 50,0 tok/s com **3,0% GSM8K** (qualidade destruída).
   - **Qwen3-0.6B**: Core AI GPU INT4 **193,3 tok/s** (196 MB); MLX Q4 167 tok/s (489 MB); LiteRT-LM INT4 121 tok/s; Core ML ANE INT8 37,7 tok/s.
   - **Qwen 3.5 2B** (iOS 26.4.2, builds Debug): MLX-Swift 61,2 tok/s (1.279 MB); llama.cpp 39,1 (1.479 MB); Core ML/ANE 27,9 (241 MB).
   - **Llama 3.2 3B** no iPhone Air: 27,2 tok/s em llama.cpp sem throttling [secundário].
   Regra: 0,6B para classificação/falas curtas; 1–2B para falas com persona; 3B é o limite sem jogo renderizando; **4B+ não** com jogo rodando. Tabela completa em `references/benchmarks-iphone-17-pro.md`.

3. **Escolher quantização pela qualidade, não pela velocidade.** Prefira QAT oficial do fabricante (Gemma 4 QAT em LiteRT-LM: 86–91%) a PTQ agressivo; rejeite qualquer quantização sem benchmark publicado. A linha Cactus CQ4 (50 tok/s, 3% GSM8K) é a prova de que o runtime importa menos que a quantização. Teste você mesmo com 20 prompts do jogo antes de aceitar.

4. **Escolher o runtime pelo que o jogo cede.** RAM apertada → llama.cpp (mmap, 191–696 MB de pico); velocidade máxima no Apple silicon → MLX Swift (mas 2–3 GB de pico); modelo Google com QAT → LiteRT-LM (Swift ainda "Early Preview": fixe a versão e tenha plano B); pipeline PyTorch próprio → ExecuTorch. Se quiser manter a API do Foundation Models, a Apple abriu `MLXLanguageModel` (iOS 27) para ligar modelos MLX ao `LanguageModelSession`.

5. **Verificar a licença dos pesos antes de baixar.** Llama 4: "Built with Llama" visível + licença extra acima de 700 milhões de MAU (LICENSE lido). Qwen (texto): Apache 2.0 [confirmar o LICENSE do checkpoint exato; o Apache 2.0 lido foi o do Qwen-Image]. Gemma: "Gemma Terms of Use" próprios, com restrições de uso [confirmar texto atual]. Phi: MIT [secundário, confirmar]. Copie o LICENSE para `docs/licencas/<modelo>-<versao>.txt` e registre em `PROVENANCE.md`.

6. **Tirar o modelo do binário.** 0,6B em 4-bit ≈ 0,4–0,5 GB; 2B ≈ 1,2–1,5 GB (estimativa pelo uso de memória medido; confirme pelo arquivo). Use Background Assets (Apple-Hosted Background Assets: 200 GB incluídos, segundo a tabela de stack do relatório [confirmar cotas atuais]) com download no primeiro launch e tela de progresso; o jogo é jogável com conteúdo escrito enquanto baixa. Verifique o checksum antes de carregar.

7. **Restringir a saída.** Nunca interprete texto livre: use gramática/JSON Schema do runtime (llama.cpp: gramáticas GBNF [confirmar na doc atual]; NobodyWho: "tool calling via generated structured grammars"; LiteRT-LM/MLX: confira suporte a saída restrita na versão fixada). Valide o JSON no jogo e caia para fallback se inválido.

8. **Integrar sem travar o frame.** Carregue o modelo em thread própria antes da cena que o usa (ou em loading); gere com prioridade abaixo do render; limite `max_tokens` (40–80 para falas); descarregue o modelo ao sair da cena se a RAM apertar. Em Unity/Godot a chamada passa por plug-in nativo e callback assíncrono.

9. **Medir no aparelho com o jogo rodando.** Instruments (Allocations, Metal System Trace) + estado térmico via `ProcessInfo.processInfo.thermalState` [confirmar] logado a cada 30 s. Critérios: pico de RAM do jogo + modelo ≤ 70% do disponível no aparelho mínimo; frame time sem picos > 33 ms durante a geração; tok/s após 10 min ≥ 60% do valor frio (relato secundário mostra −37% por throttling).

10. **Fallback térmico e de memória.** Se `thermalState` ≥ `.serious` [confirmar] ou aviso de memória, pare de gerar e use conteúdo escrito até normalizar; nunca deixe o jogo ser morto pelo sistema por causa do LLM.

11. **Gravar evidência** (seção final).

## Critério de pronto e evidência

Em `production/evidencias/<data>-on-device-llm/`:
- `bench.csv`: tok/s (prefill e decode), pico de RAM, thermalState a cada 30 s por 10 min, no aparelho mínimo e no máximo, com a cena mais pesada ativa.
- `qualidade.md`: 20 prompts fixos do jogo com saída, válido/inválido pela gramática, aprovado/reprovado por persona.
- `tamanho.txt`: tamanho do arquivo do modelo, do binário e do download via Background Assets; checksum.
- `licenca.txt`: caminho do LICENSE arquivado e atribuição exigida (ex.: "Built with Llama") já visível nos créditos (screenshot).
- Screenshots: fala gerada, fallback durante download, fallback por térmico.

## Armadilhas conhecidas

- **Velocidade com qualidade zero**: Cactus CQ4 em Gemma 4 E2B = 50 tok/s e 3% GSM8K. Sempre meça qualidade, não só tok/s. Fonte: apple-silicon-llm-bench.
- **Números de benchmark não somam com o jogo**: o harness roda sem render; o próprio autor avisa que "cross-session ratios are invalid on this device" por estado térmico. Meça no seu jogo.
- **Throttling** ~37% após aquecimento [secundário]; planeje para o valor quente.
- **RAM**: MLX usa 2–3 GB para um 2B; llama.cpp usa mmap e parece pequeno até o sistema paginar. Teste o aparelho mínimo, não o seu.
- **LiteRT-LM Swift é "Early Preview"**: API pode mudar; fixe commit/versão e congele.
- **Licenças**: Llama exige atribuição; Gemma tem termos próprios; checkpoints "community" de terceiros podem ter licença diferente do original. Leia o LICENSE do arquivo que você baixa.
- **Tamanho do app**: 1,5 GB no binário derruba conversão; Background Assets ou download próprio com checksum.
- **Modelo que fala inglês**: muitos ≤ 1B degradam em pt-BR; inclua prompts em pt-BR no teste de qualidade.
- **Core ML/ANE para LLM** rende 28–38 tok/s nos testes citados; ANE compensa para modelos pequenos de visão/áudio, não para decodificação de texto.
- **Unity Inference Engine/Sentis e Unreal NNE** rodam ONNX pequenos no celular, mas não são documentados como runtimes de LLM em mobile; LLM nesses engines = plug-in nativo (llama.cpp/MLX) ou Foundation Models.
- **NobodyWho é EUPL-1.2**: comercial permitido, mas modificações devem ser abertas; o binding Godot não exporta para iOS (só o Swift/Kotlin/Flutter/RN).
- **Prompt injection**: um modelo pequeno segue instruções do jogador com facilidade; restrinja a saída por gramática e nunca dê a ele ação direta no estado.

## Verificar no simulador/dispositivo

1. **Simulador**: só para fluxo (download, fallback, UI). Não aceite nenhuma medição de tok/s, RAM ou térmico do simulador.
2. **Aparelho mínimo suportado**: 10 minutos de partida na cena mais pesada com geração a cada 30 s; registre tok/s, RAM, `thermalState`, frame time.
3. **Aparelho mais novo**: repita para ter o teto; confirme que a saída passa na gramática em 100% dos 20 prompts.
4. **Download**: primeiro launch em rede celular limitada; jogo jogável com conteúdo escrito até o modelo chegar; checksum validado.
5. Grave em `production/evidencias/<data>-on-device-llm/`.

## Fontes

- Benchmark iPhone 17 Pro: https://github.com/john-rocky/apple-silicon-llm-bench
- llama.cpp (MIT): https://github.com/ggml-org/llama.cpp
- MLX Swift examples (MIT): https://github.com/ml-explore/mlx-swift-examples
- ExecuTorch (BSD): https://github.com/pytorch/executorch
- LiteRT-LM (Apache-2.0): https://github.com/google-ai-edge/LiteRT-LM
- swift-transformers (Apache-2.0): https://github.com/huggingface/swift-transformers
- NobodyWho (EUPL-1.2): https://github.com/nobodywho-ooo/nobodywho
- ONNX Runtime GenAI (MIT): https://github.com/microsoft/onnxruntime-genai
- Llama 4 LICENSE: https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE
- Qwen-Image LICENSE (Apache 2.0; confirmar o do checkpoint de texto): https://github.com/QwenLM/Qwen-Image/blob/main/LICENSE
- WWDC26 241 (`MLXLanguageModel`): https://developer.apple.com/videos/play/wwdc2026/241/
- Throttling [secundário]: https://www.buildmvpfast.com/blog/on-device-llm-mobile-llama-ios-android-2026
- Decisão de runtime [secundário]: https://medium.com/@michael.hannecke/choosing-an-on-device-llm-runtime-on-apple-silicon-a-decision-framework-beyond-benchmarks-2449067b8b67
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/ia_em_runtime_e_world_models.md` (Key Question 2)
