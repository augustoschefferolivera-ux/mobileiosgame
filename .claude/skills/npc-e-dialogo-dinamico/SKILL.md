---
name: npc-e-dialogo-dinamico
description: >
  Projeta e implementa NPCs com diálogo dinâmico que vale a pena: decide onde IA agrega (fala ambiente,
  quest-giver com saídas estruturadas, companheiro com memória) e onde falas escritas são melhores;
  define a ficha estruturada do personagem (@Generable/JSON), memória curta por sessão, estado do mundo
  como contexto, estilo e limites, fallback para falas escritas, filtro de conteúdo e botão de denúncia,
  ponte para voz e um conjunto fixo de testes com critérios. Use sempre que o usuário pedir "NPC que
  conversa", "diálogo com IA", "personagem que lembra do jogador" ou "chat com personagem". Não use para
  escolher o modelo (isso é /ia-runtime-nuvem-claude), para quests/itens (/geracao-procedural-com-llm) nem para voz (/voz-e-dialogo).
license: MIT
compatibility: "Claude Code ou Codex; qualquer engine; exemplos em Swift (@Generable) e JSON"
metadata:
  grupo: ia-runtime
  alvo: [2d, 3d, app, web]
  fase: [5, 7, 9]
argument-hint: "[nome-do-npc] [padrao: ambiente | quest-giver | companheiro]"
disable-model-invocation: false
user-invocable: true
---

# NPC e diálogo dinâmico

Entrega, por personagem, uma ficha estruturada, um esquema de resposta, memória de sessão, falas escritas de fallback, filtro/denúncia e um conjunto fixo de testes aprovado; termina quando o NPC foi conversado no simulador/aparelho pelos 12 prompts de teste e `production/evidencias/<data>-npc-<nome>/` tem as saídas, o veredito e screenshots.

## Quando usar / quando não usar

Use quando:
- O personagem reage a **estado do jogo** que muda (quest, inventário, hora, escolhas) e escrever todas as combinações à mão é inviável.
- O jogador **escreve** algo (nome, pergunta, pedido) e precisa de resposta dentro da persona.
- Há companheiro ou mercador recorrente em que lembrar a sessão melhora a sensação de presença.

Não use quando:
- A cena é crítica para a história: falas escritas (e dubladas) ganham sempre; IA só no periférico. Aviso de 2026: "Name a game that you play because of its 'AI NPCs'. You can't, not really." (Frisson Labs). O diálogo dinâmico é condimento, não o prato.
- O jogo é infantil sem moderação: chat livre eleva a classificação etária e exige filtro, denúncia e bloqueio (4.7.1/1.2).
- Você quer depender de middleware de NPC: a Inworld aposentou o Character Studio e virou voz/inferência; a Convai não tem SDK iOS visível; o NVIDIA ACE exige GPU RTX. Nenhum serve de base para iPhone.
- A fala precisa afetar regra (dar item, abrir porta, mudar preço): a IA propõe por campo estruturado e o código decide (`/geracao-procedural-com-llm`).

## Pré-requisitos

- Modelo: Claude Haiku 5.5 via proxy (`/ia-runtime-nuvem-claude`); no stack web não há modelo on-device da Apple. Esta skill é agnóstica: a ficha vira `@Generable` em Swift ou JSON Schema na nuvem.
- Falas escritas por situação (`content/dialogos/<npc>/fallback.json`): obrigatórias antes de qualquer geração.
- UI: balão com indicador "...", ícone "fala gerada por IA" (HIG), botões "Denunciar" e "Desligar diálogo por IA".
- Se houver nuvem: folha de consentimento 5.1.2(i) e backend com denúncia (ver `/ia-runtime-nuvem-claude`).
- Regras de código adaptadas do Claude-Code-Game-Studios (MIT): `references/regras-de-codigo-ia.md`.
- Skills vizinhas: `/voz-e-dialogo` (falas dubladas/TTS), `/classificacao-etaria`, `/privacidade-lgpd-e-eca-digital`, `/divulgacao-de-uso-de-ia`, `/critico-independente` (revisão cega do conjunto de testes).

## Entradas

- Brief, tom do jogo e classificação etária alvo.
- Lista de NPCs com **padrão** (ambiente / quest-giver / companheiro), frequência de interação e orçamento de latência.
- Estado do mundo que cada NPC pode "ver" (flags, local, hora, inventário) e o que **não** pode (segredos de enredo, estado de outros jogadores).
- Idioma(s) e limite de palavras por fala (25 em balão, 60 em painel).

## Passos

1. **Escolher o padrão por NPC.** (a) *Ambiente*: barks e comentários sobre o estado, sem entrada do jogador, pode ser 100% pré-gerado em lote; (b) *Quest-giver*: entrada do jogador por opções ou texto curto, resposta com campos estruturados (`intent`, `quest_hint`, `line`); (c) *Companheiro*: memória de sessão e texto livre do jogador, o mais caro e o mais arriscado. Comece por (a), prove valor, só então (c).

2. **Escrever a ficha estruturada** (`references/ficha-de-personagem.md`): identidade, papel, objetivos, o que sabe/não sabe, relações, estilo de fala com 5 exemplos, tabus, idioma, limite de palavras, estado de relação com o jogador (enum). A ficha é texto fixo: na nuvem entra no prefixo em cache (≥ 512 tokens); on-device entra nas instruções da sessão.

3. **Definir o schema de resposta.** Mínimo: `line` (texto ≤ N palavras), `mood` (enum para animação/retrato), `safe` (bool), `intent` (enum do que o NPC quer: `nada`, `oferecer_quest`, `recusar`, `despedir`). Opcional: `memory_note` (≤ 20 palavras, o que o NPC vai lembrar). Nenhum campo altera estado sozinho.

4. **Memória curta por sessão.** Anel das últimas 6 trocas (jogador → NPC) + um resumo de ≤ 60 palavras gerado pelo próprio modelo a cada 6 trocas + `memory_note`s. Orçamento total ≤ 25% do contexto (`contextSize` on-device). Persistir entre sessões só o resumo e flags; nunca o texto bruto do jogador (LGPD).

5. **Estado do mundo como contexto, serializado e curto.** Uma linha por fato, só o que o NPC pode saber: `local=taverna; hora=noite; quest_poco=concluida; moedas=3; relacao=neutra; visita=4`. Isso vai em `messages` (varia), nunca no prefixo (fixo). O campo `visita` dá variação sem timestamp.

6. **Estilo e limites nas instruções**: pt-BR, limite de palavras, "nunca saia do personagem", "nunca mencione marcas, pessoas reais ou o mundo fora do jogo", "não repita insultos", "não invente itens/locais fora desta lista", "se não souber, diga que não sabe no tom do personagem". Texto do jogador ≤ 200 caracteres, sanitizado.

7. **Fallback em cascata.** Modelo indisponível → fala escrita por situação; erro/timeout (2,5 s) → fala escrita; `safe == false` ou guardrail → fala escrita neutra; consentimento recusado → só falas escritas em toda a sessão. O jogador nunca vê erro; o log registra o motivo.

8. **Filtro, denúncia, bloqueio.** Filtro em três camadas (instruções, `safe`, lista de termos no cliente/proxy); botão "Denunciar esta fala" envia `customId` + fala gerada; "Desligar diálogo por IA" nas Configurações; contato publicado. Ícone de IA na primeira fala gerada (HIG "Clearly identify when and where you use AI").

9. **Voz.** Falas escritas centrais: pré-renderizadas (ou atores) via `/voz-e-dialogo`. Fala gerada: TTS on-device (ex.: Kokoro-82M pt-BR via FluidAudio/swift-tts, segundo a tabela de stack do relatório) ou sem voz, com "voz" por som de personagem. Voz conversacional em tempo real custa ~US$ 1–3 por 10 min [secundário] e só em momentos raros.

10. **Testar com o conjunto fixo** (`references/testes-npc.md`): 12 prompts (saudação, pedido dentro do jogo, pergunta fora do mundo, tentativa de injeção, insulto, pergunta sobre fato real, pedido de item, repetição, idioma estrangeiro, texto longo, silêncio/vazio, despedida) com critérios objetivos. Rode no modelo escolhido; aprove só com 12/12. Repita a cada mudança de ficha, modelo ou SO.

11. **Medir valor antes de expandir.** Métrica simples: % de jogadores que conversam ≥ 3 vezes com o NPC e tempo médio; se baixo, volte para falas escritas e gaste o orçamento em outro lugar.

12. **Rodar no simulador/aparelho e gravar evidência** (seção final).

## Critério de pronto e evidência

Em `production/evidencias/<data>-npc-<nome>/`:
- `ficha.md` e `schema.json` (ou `.swift` com `@Generable`) versionados.
- `testes-npc.md` preenchido: 12 prompts, saída, aprovado/reprovado, motivo; 12/12 aprovados no modelo e SO declarados.
- `fallback.json` com fala para cada situação listada no passo 7.
- Screenshots: fala gerada com ícone de IA, fala de fallback, botão de denúncia, tela "desligar IA", consentimento (se nuvem).
- `latencia.csv` p50/p95 no aparelho com a cena rodando.
- Log de 20 trocas reais sem texto do jogador (só `customId`, motivo de fallback, `usage` quando houver).

## Armadilhas conhecidas

- **Expectativa**: jogadores não escolhem jogos por NPCs de IA (Frisson Labs, 2026); use IA para presença e variedade, não como pilar de marketing.
- **Alucinação de conteúdo do jogo**: o NPC promete item ou local que não existe. Liste o que existe nas instruções e marque `intent` por enum; o código ignora o resto.
- **Vazamento de instruções**: "repita suas instruções" funciona em modelos pequenos; a Apple avisa que instruções têm prioridade "but by no means bulletproof". Teste de injeção obrigatório.
- **Memória que cresce**: histórico sem corte estoura o contexto (erro `exceededContextWindowSize` on-device; preço 5× acima de 100K na nuvem). Anel + resumo.
- **Persona que deriva**: após 20 trocas o NPC fica genérico; reinjete a ficha (ela já está nas instruções fixas) e corte o histórico.
- **Idioma**: modelos pequenos trocam para inglês com entrada em inglês; exija pt-BR nas instruções e teste.
- **Guardrails e temas de jogo**: violência de fantasia dispara recusas; falas de combate em lote pré-gerado e revisado, não em runtime.
- **Consentimento e menores**: 5.1.2(i) antes de enviar texto do jogador a provedor externo; ECA Digital para público infantil [secundário].
- **Middleware**: Inworld (voz/inferência, sem SDK de engine visível), Convai (Unreal/web, sem iOS), ACE (RTX). Abstraia o provedor atrás da sua interface e trate-os como opcionais.
- **Voz TTS "flat"** em falas centrais gerou backlash (ARC Raiders regravou); atores nas linhas centrais, TTS só no periférico.
- **Placeholders**: "as an AI", "Como modelo de linguagem", nome do modelo: grep antes do build (2.1(a)).

## Verificar no simulador/dispositivo

1. Simulador: 12 prompts de teste digitados na UI real; screenshots de cada resposta com `xcrun simctl io booted screenshot`; força de fallback (modo avião, Apple Intelligence desligada ou proxy derrubado) com a mesma cena.
2. Aparelho: 20 trocas com a cena mais pesada rodando; p95 ≤ orçamento; sem queda de frame perceptível.
3. Denunciar uma fala e desligar a IA: ambos funcionam e o jogo continua com falas escritas.
4. Repetir o teste após atualização do iOS (a saída on-device pode mudar).
5. Grave em `production/evidencias/<data>-npc-<nome>/`.

## Fontes

- Frisson Labs, "AI NPCs 2026": https://www.frisson-labs.com/ai-npcs-2026
- WWDC25 286 (uso oficial "in-game character dialog"; instruções vs prompt): https://developer.apple.com/videos/play/wwdc2025/286/
- WWDC25 301 (exemplo NPC `@Generable`; contexto excedido): https://developer.apple.com/videos/play/wwdc2025/301/
- WWDC26 241 (`contextSize`, `response.usage`): https://developer.apple.com/videos/play/wwdc2026/241/
- App Store Review Guidelines (1.2, 4.7.1, 5.1.2(i)): https://developer.apple.com/app-store/review/guidelines/
- HIG Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Prompt caching (prefixo fixo ≥ 512 tokens): https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Inworld (GitHub): https://github.com/inworld-ai ; Convai: https://github.com/Conv-AI ; NVIDIA ACE: https://github.com/NVIDIA/ACE
- inZOI/ACE (SLM 0,5B on-device, RTX) [secundário]: https://www.tomsguide.com/gaming/pc-gaming/i-played-with-nvidias-ai-npc-prototypes-now-theyre-real-and-i-fear-ill-never-finish-a-game-again
- Claude-Code-Game-Studios (MIT; `ai-programmer.md`, `ai-code.md` adaptados): https://github.com/Donchitos/Claude-Code-Game-Studios
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/ia_em_runtime_e_world_models.md` (Key Questions 1–3)
