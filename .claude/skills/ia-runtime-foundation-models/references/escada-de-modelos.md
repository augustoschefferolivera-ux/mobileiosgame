# Escada de modelos com uma só API (iOS 27)

Leia quando decidir, por caso de uso, em qual degrau o jogo gera texto. Os três degraus usam o mesmo `LanguageModelSession`; só o objeto de modelo muda.

| Degrau | Modelo | Custo | Contexto | Offline | Consentimento 5.1.2(i) | Quando |
|---|---|---|---|---|---|---|
| 1 | `SystemLanguageModel` (on-device) | zero; nada de tamanho no app | exemplo de slide: 8192 tokens (leia `contextSize`) | sim | não (nada sai do aparelho) | falas curtas e frequentes, descrições, dicas, classificação de intenção |
| 2 | `PrivateCloudComputeLanguageModel` | zero de API para quem tem < 2 milhões de downloads iniciais; limites diários por usuário (maiores com iCloud+) | 32.000 tokens; `reasoningLevel` | não | dados vão para a Apple; declare na política de privacidade; confirme com App Review se exige folha [não verificado] | quests com dependências, resumo de campanha, texto longo em loading |
| 3 | `LanguageModel` de terceiros (pacotes Swift da Anthropic/Google) | pago (ver `/ia-runtime-nuvem-claude`: Haiku 5.5 US$ 0,10/0,50 por MTok) | 1M (Claude 5.5) | não | **sim**, antes da primeira transmissão | quando o jogo não é só iOS, precisa de qualidade/consistência entre aparelhos ou de recursos que PCC não tem |

## Regras de decisão

1. Comece sempre no degrau 1. Só suba se um teste com o conjunto fixo de prompts mostrar falha de qualidade que o jogador nota.
2. Degrau 2 exige entitlement e tem limites diários: trate como "melhor esforço" e mantenha o degrau 1 como fallback automático no mesmo fluxo.
3. Degrau 3 exige backend próprio para autenticação e cobrança ("third-party models need your own auth/billing", 26/339), folha de consentimento, filtro de conteúdo, denúncia e bloqueio (4.7.1/1.2) e logs sem dados pessoais (LGPD).
4. Quem recusa consentimento, está offline ou em aparelho sem Apple Intelligence recebe falas escritas; a experiência deve continuar completa (4.2 funcionalidade mínima).
5. Registre em `docs/ia-runtime.md`: caso de uso → degrau → orçamento de latência → fallback → data do teste.

## Comparação com modelos próprios

Se o degrau 1 está indisponível no aparelho-alvo (ex.: iPhone sem Apple Intelligence) e o jogo não pode depender de rede, a alternativa é um modelo de 0,6B–2B em 4-bit via MLX/llama.cpp/LiteRT-LM (`/ia-runtime-on-device-llm`). A Apple abriu `MLXLanguageModel`, que permite ligar um modelo MLX ao mesmo `LanguageModelSession` (26/241): isso mantém a API única mesmo com pesos próprios, ao custo de 0,4–1,5 GB no download.

## Fontes

- WWDC26 241: https://developer.apple.com/videos/play/wwdc2026/241/
- WWDC26 339: https://developer.apple.com/videos/play/wwdc2026/339/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
