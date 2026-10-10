---
name: ia-runtime-nuvem-claude
description: >
  Liga o jogo ao Claude (Haiku 5.5 para NPCs e conteúdo em massa) com segurança e custo previsível:
  backend/proxy mínimo sem chave no app, prompt caching com prefixo fixo de 512+ tokens, saída
  estruturada por JSON Schema (output_config.format com strict), cálculo de custo por troca, fallback
  offline, consentimento 5.1.2(i) antes da primeira transmissão e filtro/denúncia/bloqueio (4.7.1/1.2).
  Use quando o on-device não basta (conhecimento de mundo, raciocínio, contexto longo, alvo web ou
  Android, consistência entre aparelhos) ou quando o usuário pedir "NPC com ChatGPT/Claude/IA na nuvem".
  Não use se o caso cabe no Foundation Models on-device ou PCC (/ia-runtime-foundation-models), que
  custa zero e não exige consentimento; para gerar conteúdo offline em lote veja /geracao-procedural-com-llm.
license: MIT
compatibility: "Claude Code ou Codex; backend em Cloudflare Workers ou Vercel (TypeScript); cliente iOS/web/Unity por HTTPS"
metadata:
  grupo: ia-runtime
  alvo: [2d, 3d, app, web]
  fase: [7, 9]
argument-hint: "[caso-de-uso] [modelo: haiku-5-5 | sonnet-5-5] [orcamento-usd-mes]"
disable-model-invocation: false
user-invocable: true
---

# IA em runtime na nuvem com Claude

Entrega um proxy mínimo (Cloudflare Worker ou Vercel) que chama `claude-haiku-5-5` com prefixo em cache e saída em JSON Schema, um cliente no jogo com consentimento, timeout e fallback escrito, e uma planilha de custo; termina quando uma partida real passou pelo proxy, `usage.cache_read_input_tokens > 0` apareceu no log e a evidência está em `production/evidencias/<data>-nuvem-claude/`.

## Quando usar / quando não usar

Use quando:
- O conteúdo exige o que o modelo on-device da Apple não dá: conhecimento de mundo, raciocínio em várias etapas, contexto longo (1M tokens nos modelos 5.5), consistência de qualidade entre aparelhos antigos e novos.
- O alvo inclui web (PWA/Safari) ou Android, onde não há Foundation Models.
- Vai pré-gerar conteúdo em massa (diálogos, descrições, quests) e quer o desconto de 50% do Batch.

Não use quando:
- O caso é fala curta e frequente num jogo só iOS: `SystemLanguageModel`/PCC custam zero e não acionam 5.1.2(i).
- O jogo é para crianças sem moderação humana: chat livre com IA eleva a classificação etária e exige filtro, denúncia e bloqueio (4.7.1/1.2).
- Quer voz conversacional em tempo real: ordem de US$ 1–3 por 10 minutos falados (gpt-realtime ~US$ 32/64 por milhão de tokens de áudio) [secundário, confirmar]; use texto + TTS pré-renderizado (`/voz-e-dialogo`).

## Pré-requisitos

- Conta na Anthropic Console com chave de API guardada **só** no backend (variável de ambiente/secret do Worker). Nunca no binário, no `Info.plist`, em `UserDefaults` ou no bundle web.
- Node 20+ e `npm install @anthropic-ai/sdk` no projeto do proxy; `wrangler` (Cloudflare) ou Vercel CLI.
- Skill `claude-api` do Claude Code carregada ao escrever código de API (`/claude-api`); ela é a fonte dos nomes de parâmetros. Preços: https://platform.claude.com/docs/en/about-claude/pricing (lidos em 10/10/2026, ver tabela abaixo).
- Falas escritas de fallback para toda situação coberta pela nuvem.
- Texto da folha de consentimento e página de contato/privacidade publicadas (ver `references/guardrails-e-loja.md`).
- Skills vizinhas: `/privacidade-lgpd-e-eca-digital` (rótulos, LGPD, menores), `/classificacao-etaria` (chatbot no questionário), `/divulgacao-de-uso-de-ia`, `/voz-e-dialogo` (TTS em vez de voz em tempo real).

## Entradas

- Ficha estruturada do NPC/sistema (`/npc-e-dialogo-dinamico`) e "bíblia do mundo" em texto **fixo** (≥ 512 tokens; será o prefixo em cache).
- JSON Schema da resposta (ex.: `{ "line": string, "mood": enum, "safe": boolean }`).
- Orçamento mensal em US$ e estimativa de trocas por jogador/dia.
- Orçamento de latência por caso (ex.: fala ≤ 2,5 s p95) e política offline.

## Passos

1. **Calcular o custo antes de codar.** Rode `python3 scripts/calcular-custo-npc.py --cache 1000 --entrada 200 --saida 150 --trocas 1000`. Com Haiku 5.5: 1.000 tokens de prefixo em cache (US$ 0,01/MTok) + 200 novos (US$ 0,10/MTok) + 150 de saída (US$ 0,50/MTok) ≈ **US$ 0,0001 por troca**, ≈ US$ 0,11 por mil trocas. Sem cache ≈ US$ 0,0002. Registre o resultado em `docs/ia-runtime.md`.

2. **Escolher o modelo.** `claude-haiku-5-5` para falas, classificação e geração em massa (US$ 0,10 entrada / 0,50 saída por MTok até 100K tokens de prompt; US$ 0,50/2,50 acima disso). `claude-sonnet-5-5` (US$ 2/10) só para campanha/quests com dependências, de preferência em Batch. IDs exatos, sem sufixo de data.

3. **Congelar o prefixo e ativar o cache.** Ordem renderizada: `tools → system → messages`. Ponha bíblia + ficha + regras em `system` como bloco com `cache_control: {"type": "ephemeral"}`; tudo que varia (estado, fala do jogador) vai em `messages`. Mínimo cacheável nos modelos 5.5: **512 tokens**; abaixo disso não cacheia e não avisa. **Nada de timestamp, ID de sessão ou JSON com chaves em ordem variável no prefixo**: um byte diferente invalida tudo. Instruções que mudam no meio da conversa vão como `{"role": "system", ...}` dentro de `messages` (suportado em Haiku 5.5), não editando `system`. Detalhes em `references/custos-e-cache.md`.

4. **Forçar JSON válido.** Use `output_config: {"format": {"type": "json_schema", "schema": {...}}}` com `additionalProperties: false` e `required` em todo objeto. Não há suporte a `minimum`/`maximum`/`minLength`/esquemas recursivos: valide esses limites no proxy. Para ações do jogo, defina ferramentas com `"strict": true` (campo de topo da tool). Prefill de assistant retorna 400 nos modelos 5.5; não use.

5. **Ajustar o Haiku 5.5 para latência.** Thinking adaptativo vem ligado por padrão com `effort` padrão `medium`; para fala de NPC use `"thinking": {"type": "disabled"}` (aceito até `effort: high`) ou `output_config.effort: "low"`. Parâmetros de amostragem fora do padrão (`temperature`, `top_p`, `top_k`) retornam 400: a variação vem do prompt (estado, contador de visitas), não da temperatura. `max_tokens` ~300 para falas (saída curta é motivo legítimo para valor baixo).

6. **Escrever o proxy** a partir de `references/proxy-cloudflare-worker.md`: autenticação por token de instalação emitido pelo seu backend (App Attest/DeviceCheck no iOS [confirmar na doc da Apple]), limite por jogador/dia (KV), limite de 200 caracteres na entrada do jogador, `timeout` por requisição de 8 s, retorno `{fallback: true}` quando `stop_reason == "refusal"` (Haiku 5.5 **não** tem fallback server-side) ou erro 429/529. Log só de `usage` e IDs internos, nunca do texto do jogador.

7. **Cliente no jogo.** Antes da **primeira** chamada: folha de consentimento 5.1.2(i) explicando o que sai do aparelho e para quem; recusa → falas escritas, sem nova pergunta a cada sessão. Indicador de "digitando" imediato; se não houver resposta em 2,5 s (p95 alvo), mostre a fala escrita e descarte a resposta tardia. Sem rede: nem tenta.

8. **Filtro, denúncia e bloqueio (4.7.1/1.2).** Filtro em três camadas: instruções na bíblia; campo `safe` no schema (o modelo classifica a própria fala) + lista de termos no proxy; e botão "Denunciar esta fala" que envia o `custom_id` da troca (não o texto do jogador) para revisão. Botão "Desligar diálogo por IA" (bloqueio) e contato publicado. Ver `references/guardrails-e-loja.md`.

9. **Pré-gerar o que puder em Batch (−50%).** Falas ambiente, descrições de item e barks não dependem da entrada do jogador: gere em lote com `/geracao-procedural-com-llm` (`.claude/skills/geracao-procedural-com-llm/scripts/gerar-lote-batch.py`), revise, embale no app. A nuvem em runtime fica só para o que precisa da fala do jogador.

10. **Verificar o cache em produção.** Na segunda chamada com o mesmo prefixo, `usage.cache_read_input_tokens` deve ser > 0 e `input_tokens` deve ser só o resto. Zero em chamadas repetidas = algo variável no prefixo. Adicione um teste de integração que falha se isso regredir.

11. **Rodar partida real e gravar evidência** (seção final).

## Critério de pronto e evidência

Em `production/evidencias/<data>-nuvem-claude/`:
- `custo.txt`: saída do `calcular-custo-npc.py` com os parâmetros reais medidos (tokens de `usage`).
- `usage.log`: ≥ 20 trocas reais com `cache_read_input_tokens > 0` a partir da segunda.
- `latencia.csv`: p50/p95 medidos no aparelho em rede celular, não só Wi-Fi.
- Screenshots: folha de consentimento, fala gerada, fala de fallback com rede desligada, botão de denúncia, tela "desligar IA".
- `wrangler deploy`/log do Vercel mostrando a chave só em secret; `grep -r "sk-ant" .` no repositório do jogo retornando vazio.
- Rótulos de privacidade e questionário etário preenchidos no App Store Connect (screenshot).

## Armadilhas conhecidas

- **Chave no app** vaza em minutos (binário descompilado, proxy de rede). Sempre backend. Mesmo com backend, limite por jogador/dia ou alguém usará seu proxy como API grátis.
- **Cache silencioso**: timestamp, `Date()`, nome do jogador ou ordem de chaves de JSON no `system` zeram o cache sem erro. Verifique `usage` após toda mudança no prompt. Fonte: docs de prompt caching.
- **Prefixo curto**: < 512 tokens não cacheia nos modelos 5.5. Complete a bíblia com lore e exemplos úteis, não com lixo.
- **TTL de 5 minutos** renovado a cada leitura: sessões com trocas a < 5 min mantêm o cache quente; escrita custa 1,25× (5 min) ou 2× (1 h).
- **`refusal`** acontece em cenas de violência/temas sensíveis e, no Haiku 5.5, não há `fallbacks` server-side: trate no proxy e devolva fala escrita.
- **Tokenizer novo**: Haiku 5.5 conta ~30% mais tokens que Haiku 4.5 para o mesmo texto; meça com `count_tokens`, não estime de memória.
- **Preço em duas faixas**: acima de 100K tokens de prompt o Haiku 5.5 custa 5×. Nunca deixe o histórico crescer sem corte.
- **5.1.2(i)** (redação de 13/11/2025): consentimento explícito **antes** de compartilhar dados pessoais com "third-party AI". Fala digitada pelo jogador é dado pessoal potencial. Consentimento enterrado na política de privacidade gerou rejeições em 2026 [secundário].
- **1.2/4.7.1**: chat com IA sem filtro, denúncia, bloqueio e contato publicado é motivo de rejeição; chat anônimo cai em 1.2 desde 06/02/2026.
- **Classificação etária**: "AI assistants and chatbot functionality" entram no questionário desde 24/07/2025; faixas 13+/16+/18+.
- **LGPD**: não envie nome, e-mail, ID de publicidade ou localização ao modelo; logs com texto do jogador são dado pessoal. Guarde só `usage`, `custom_id` e hash.
- **ECA Digital (Lei 15.211/2025)**: jogo com público infantil exige verificação de idade e supervisão parental antes de qualquer chat com IA [secundário, confirmar com advogado].
- **Voz em tempo real** custa 100–1.000× o texto; só em momentos raros e com consentimento próprio.
- **Preços mudam**: recalcule a cada trimestre pela página oficial; os valores aqui são de 10/10/2026.

## Verificar no simulador/dispositivo

1. Simulador com Network Link Conditioner em "3G": a fala escrita deve aparecer em ≤ 2,5 s quando a nuvem demora; captura com `xcrun simctl io booted screenshot`.
2. Aparelho em rede celular: 20 trocas reais; confira no log do proxy `cache_read_input_tokens > 0` da segunda em diante e p95 dentro do orçamento.
3. Modo avião: nenhuma requisição sai, nenhuma tela de erro, jogo completo com falas escritas.
4. Recusar o consentimento: nenhuma chamada ao proxy durante toda a sessão (confira no log).
5. Denunciar uma fala e bloquear a IA: ambos chegam ao backend e o jogo continua.
6. Grave tudo em `production/evidencias/<data>-nuvem-claude/`.

## Fontes

- Preços da Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
- Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Saída estruturada: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Batch: https://platform.claude.com/docs/en/build-with-claude/batch-processing
- Rate limits: https://platform.claude.com/docs/en/api/rate-limits
- Modelos: https://platform.claude.com/docs/en/about-claude/models/overview
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News 13/11/2025 (5.1.2(i)): https://developer.apple.com/news/?id=ey6d8onl
- Apple Developer News 24/07/2025 (idade): https://developer.apple.com/news/?id=ks775ehf
- HIG Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Rejeições 5.1.2(i) [secundário]: https://ptkd.com/journal/rejection-guideline-5-1-2-ai-data-sharing
- gpt-realtime preços [secundário]: https://www.layer3labs.io/guides/openai-realtime-api-pricing
- ECA Digital [secundário]: https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/ia_em_runtime_e_world_models.md` (Key Question 3)
