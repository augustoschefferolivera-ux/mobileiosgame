# Runtimes de LLM on-device e licenças (estado do GitHub em 10/10/2026)

Leia ao escolher runtime e pesos. Licenças de runtime foram lidas nos repositórios; licenças de pesos marcadas conforme a nota de pesquisa.

## Runtimes

| Runtime | Licença | iOS | Pontos fortes | Pontos fracos | Formato |
|---|---|---|---|---|---|
| `ggml-org/llama.cpp` (130,7k ★) | MIT | sim; `build-xcframework.sh`; "Apple silicon is a first-class citizen" (NEON, Accelerate, Metal) | menor pico de RAM (mmap); gramáticas de saída; maior comunidade | decode mais lento que MLX/LiteRT-LM (38–39 tok/s em 2B) | GGUF |
| `ml-explore/mlx-swift-examples` (2,7k ★) + `mlx-swift-lm` | MIT | sim; apps `LLMEval`, `MLXChatExample` | decode mais rápido no Apple silicon (49–61 tok/s em 2B); Apple abriu `MLXLanguageModel` para o Foundation Models (iOS 27) | 1,3–4,6 GB de pico em 2B; só Apple | safetensors MLX |
| `pytorch/executorch` (5,1k ★) | BSD | sim; SwiftPM; backends XNNPACK (CPU), Core ML, MLX (experimental, só aparelho físico) | pipeline PyTorch → `.pte`; multimodal (Gemma 4, Voxtral Realtime, Parakeet) | menos exemplos de jogo; MLX experimental | `.pte` |
| `google-ai-edge/LiteRT-LM` (6,6k ★, v0.18.0) | Apache-2.0 | Swift "Early Preview" | QAT oficial da Gemma (melhor tok/s × qualidade); Multi-Token Prediction "até 3x"; Android/Web/desktop | API Swift pode mudar; fixe versão | `.litertlm` |
| `huggingface/swift-transformers` (1,4k ★, v1.3.0) | Apache-2.0 | sim | tokenizers + utilitários Core ML/MLX; `swift-chat` | não é runtime completo | — |
| `nobodywho-ooo/nobodywho` (1,5k ★) | EUPL-1.2 | binding Swift (iPhone 11+, ≥ 4 GB RAM); binding Godot **sem** export iOS | llama.cpp + ONNX (STT/TTS/VAD); "tool calling via generated structured grammars" | EUPL: modificações devem ser abertas | GGUF |
| `microsoft/onnxruntime-genai` (1,1k ★) | MIT | status iOS incerto; sem Core ML EP listado | Foundry Local / Windows ML | não recomendado para iOS hoje | ONNX |
| Core ML (Apple) | — | sim | ANE eficiente para modelos pequenos (visão, áudio, classificação) | 28–38 tok/s em LLM; não é a via para texto | `.mlpackage` |
| Unity Inference Engine/Sentis (`com.unity.ai.inference`) | Unity | sim (ONNX, CPU/GPU) | visão/áudio/animação em todas as plataformas Unity; samples "Chat LLM" existem | não documentado como runtime de LLM em celular | ONNX |
| Unreal NNE | Epic | sem runtime iOS documentado nas fontes lidas | API comum para execution providers | lacuna iOS | ONNX |

Decisão rápida:
- **RAM apertada / jogo 3D** → llama.cpp.
- **Velocidade máxima, jogo 2D leve, só iOS** → MLX Swift (ou `MLXLanguageModel` para manter a API do Foundation Models).
- **Modelo Gemma com QAT, paridade Android** → LiteRT-LM (fixe versão).
- **Pipeline PyTorch próprio** → ExecuTorch.

## Pesos: licenças e obrigações

| Família | Licença | Obrigação prática | Status da verificação |
|---|---|---|---|
| Llama 4 (Meta) | Llama 4 Community License | exibir "Built with Llama"; licença adicional acima de 700 milhões de MAU; restrições de uso | LICENSE lido (relatório) |
| Qwen3 / Qwen 3.5 (Alibaba) | Apache 2.0 esperado | atribuição | Apache 2.0 **lido para Qwen-Image**; confirmar o LICENSE do checkpoint de texto exato [confirmar] |
| Gemma 4 (Google) | Gemma Terms of Use | aceitar termos; restrições de uso proibido; repassar termos | não lido [confirmar] |
| Phi (Microsoft) | MIT | atribuição | não lido [secundário, confirmar] |
| Mistral NeMo Minitron 0,5B (inZOI/ACE) | NVIDIA | só via ACE (RTX) | irrelevante para iOS |

Regras:
1. Leia o LICENSE **do arquivo que você baixa** (checkpoints quantizados por terceiros podem trocar a licença).
2. Arquive em `docs/licencas/<modelo>-<versao>.txt` e cite em `PROVENANCE.md` e nos créditos do jogo.
3. Prefira Apache/MIT quando houver empate de qualidade; evite pesos com restrição territorial (ver relatório sobre a licença Tencent em 3D).

## Tamanho e distribuição

- Estimativas por uso de memória medido (confirme pelo arquivo real): 0,6B 4-bit ≈ 0,2–0,5 GB; 2B 4-bit ≈ 1,2–1,5 GB; 3B 4-bit ≈ 1,7–2,5 GB.
- Fora do binário: Background Assets / Apple-Hosted Background Assets (o relatório cita 200 GB incluídos [confirmar cotas e preços atuais]) ou CDN própria com checksum SHA-256 e retomada.
- Jogo jogável com conteúdo escrito durante o download; nunca bloqueie o primeiro launch.

## Fontes

- https://github.com/ggml-org/llama.cpp · https://github.com/ml-explore/mlx-swift-examples · https://github.com/pytorch/executorch · https://github.com/google-ai-edge/LiteRT-LM · https://github.com/huggingface/swift-transformers · https://github.com/nobodywho-ooo/nobodywho · https://github.com/microsoft/onnxruntime-genai
- Llama 4 LICENSE: https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE
- Qwen-Image LICENSE: https://github.com/QwenLM/Qwen-Image/blob/main/LICENSE
- Unity Inference Engine: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/index.html · samples: https://github.com/Unity-Technologies/sentis-samples
- Unreal NNE: https://dev.epicgames.com/documentation/unreal-engine/neural-network-engine-in-unreal-engine
- WWDC26 241: https://developer.apple.com/videos/play/wwdc2026/241/
