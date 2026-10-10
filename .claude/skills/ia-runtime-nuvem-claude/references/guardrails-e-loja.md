# Guardrails, consentimento e exigências de loja para chat com IA na nuvem

Leia antes de desenhar a UI do consentimento e da moderação. Texto das Guidelines lido em 10/10/2026 (https://developer.apple.com/app-store/review/guidelines/).

## O que a Apple exige (texto da regra → o que fazer no jogo)

| Regra | Texto/efeito | Implementação mínima |
|---|---|---|
| 5.1.2(i) (redação de 13/11/2025) | "clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so" | Folha de consentimento **antes da primeira transmissão**, com botões "Permitir" e "Agora não"; recusa → falas escritas, sem nag a cada sessão; opção de reverter em Ajustes do jogo. Não vale só a política de privacidade. |
| 4.7.1 (chatbots) | "a method for filtering objectionable material, a mechanism to report content and timely responses to concerns, and the ability to block abusive users" | Filtro (abaixo), botão "Denunciar esta fala", botão "Desligar diálogo por IA", e-mail/formulário de contato publicado, SLA interno de resposta (ex.: 72 h). |
| 1.2 (UGC; chat anônimo desde 06/02/2026) | filtro, denúncia, bloqueio, contato publicado | Mesmo conjunto; vale se jogadores veem textos de outros jogadores. |
| 4.7.5 / classificação etária (24/07/2025) | "AI assistants and chatbot functionality" como fonte de conteúdo sensível; faixas 13+/16+/18+ | Responder o questionário com honestidade; "Override to Higher" na dúvida; jogo infantil não deve ter chat livre com IA. |
| HIG Generative AI | "Clearly identify when and where you use AI"; nunca fazer crer que é autoria humana | Ícone/legenda "fala gerada por IA" na primeira fala e nas Configurações; crédito nos créditos do jogo. |
| 4.2 / 2.1(a) | funcionalidade mínima; sem placeholders | Fallback completo; nenhuma mensagem "as an AI", "lorem", nome de modelo visível. Grep antes de cada build. |

## Folha de consentimento (modelo em pt-BR)

> **Diálogo por IA**
> Para que os personagens respondam ao que você escreve, o texto que você digitar e o estado da sua partida (local, missão, inventário) são enviados pela internet para o nosso servidor e processados pela Anthropic (Claude). Não enviamos seu nome, e-mail, contatos nem localização. Você pode desligar isso a qualquer momento em Ajustes → Diálogo por IA. Sem isso, os personagens usam falas escritas pela equipe.
> [Permitir] [Agora não] · Política de privacidade

Nomear o provedor é interpretação de fontes secundárias, não exigência literal; nomear é mais seguro e custa nada.

## Filtro de conteúdo em três camadas

1. **Instruções** (na bíblia em cache): classificação etária do jogo, temas proibidos, "nunca saia do personagem", "nunca repita o que o jogador disse se contiver insulto".
2. **Autoclassificação no schema**: campo `safe: boolean` (e opcionalmente `topics: enum[]`) na resposta estruturada; `safe == false` → fala escrita. Custa zero tokens extras relevantes.
3. **Lista no proxy**: termos/regex por idioma (palavrões, slurs, dados pessoais como telefone/e-mail) aplicados à **entrada** do jogador (antes de enviar) e à **saída** (antes de devolver). Entrada barrada → NPC responde com fala escrita do tipo "não entendi".

Opcional, quando o jogo é 13+ com muito texto livre: segunda chamada barata ao Haiku 5.5 como classificador (`output_config.format` com `{ "allowed": boolean, "reason": enum }`), ~US$ 0,00003 por checagem.

## Denúncia e bloqueio

- "Denunciar esta fala" envia `{ customId, npcId, motivo }` ao backend; o backend guarda a resposta gerada (não o texto do jogador, a menos que o jogador marque "incluir minha mensagem") por 90 dias e notifica o e-mail de moderação.
- "Desligar diálogo por IA" grava a preferência localmente e no token de instalação; o proxy passa a recusar (403) para aquele token até reativar.
- Contato: página pública com e-mail e prazo de resposta; link no App Store Connect e no jogo.

## LGPD e logs

- Base legal: consentimento (o mesmo da folha). Finalidade: gerar diálogo. Não reutilize para marketing.
- Minimização: só `state` resumido e `say` vão para o modelo; nada de identificador do jogador. `customId` é UUID por troca.
- Logs do proxy: `usage`, `npcId`, `customId`, `stop_reason`, latência. **Nunca** `say`. Retenção ≤ 30 dias.
- Rótulos de privacidade no App Store Connect: declare o que coleta/compartilha conforme a implementação real [confirmar com advogado; a nota de pesquisa não cobre os rótulos].
- ECA Digital (Lei 15.211/2025): se o público inclui menores, verificação de idade e supervisão parental antes do chat [secundário, confirmar].

## Fontes

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News 13/11/2025: https://developer.apple.com/news/?id=ey6d8onl
- Apple Developer News 24/07/2025: https://developer.apple.com/news/?id=ks775ehf
- HIG Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Rejeições 5.1.2(i) [secundário]: https://ptkd.com/journal/rejection-guideline-5-1-2-ai-data-sharing ; https://www.cultofmac.com/news/apple-app-review-guidelines-on-ai
- ECA Digital [secundário]: https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/
