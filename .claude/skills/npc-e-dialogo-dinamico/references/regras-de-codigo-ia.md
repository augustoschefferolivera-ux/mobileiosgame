# Regras de código para IA em runtime (NPCs, diálogo, geração)

Adaptado de `.claude/rules/ai-code.md` e `.claude/agents/ai-programmer.md` do template **Claude-Code-Game-Studios** (Donchitos, licença MIT; https://github.com/Donchitos/Claude-Code-Game-Studios). O original trata de IA clássica (behavior trees, pathfinding); aqui as regras foram reescritas para IA generativa em runtime. Registre o crédito em `THIRD_PARTY_NOTICES.md` do projeto.

## Regras (aplicar em `src/ai/**`, `Sources/**/AI/**`, `Assets/**/AI/**`)

1. **Orçamento por frame**: nenhuma chamada a modelo roda na thread de render. Geração é assíncrona com prioridade abaixo do render; o custo na thread principal é só o de atualizar a UI. Meça com Instruments/Profiler.
2. **Parâmetros em dados, não em código**: fichas, limites de palavras, listas de termos, timeouts, orçamento de contexto e pools de fallback vivem em arquivos de dados (`content/dialogos/<npc>/*.json`), carregados em runtime; mudar um NPC não recompila o jogo.
3. **Toda saída de modelo é entrada não confiável**: validar forma (schema/`@Generable`), limites (palavras, faixas), termos proibidos e `intent` ∈ enum antes de qualquer uso. Nunca executar ação de jogo a partir de texto livre.
4. **Proposta, não ação**: campos como `intent`, `item_sugerido`, `quest_hint` são propostas; o código do jogo decide com suas regras (moedas, flags, disponibilidade) e pode recusar em silêncio.
5. **Fallback obrigatório e testado**: toda chamada tem fala/conteúdo escrito de reserva e um timeout (2,5 s para fala). O jogador nunca vê erro, mensagem técnica ou texto de modelo ("as an AI").
6. **Telegrafar e identificar**: a UI mostra "..." imediato e um ícone "gerado por IA" na primeira fala gerada (HIG). O jogador precisa saber o que é IA e poder desligar.
7. **Logar transições, não pessoas**: cada troca registra `customId`, NPC, fonte (on-device/PCC/nuvem/fallback), motivo de fallback, latência e `usage`; nunca o texto do jogador. Retenção ≤ 30 dias.
8. **Depurável**: um painel de debug (só em builds internos) mostra ficha carregada, estado serializado, memória atual, última resposta bruta e motivo de rejeição.
9. **Determinismo onde importa**: conteúdo que afeta jogabilidade carrega `seed` e `schema_version`; o mesmo seed reproduz o mesmo conteúdo em outro aparelho.
10. **Memória com teto**: anel de N trocas + resumo; corte antes de `exceededContextWindowSize`; persista só resumo e flags.
11. **Provedor atrás de interface**: `DialogueProvider` com implementações on-device, PCC, proxy e scripted; troca por configuração; nenhum SDK de middleware de NPC como dependência obrigatória.
12. **Testes fixos antes de "pronto"**: os 12 prompts de `testes-npc.md` passam 12/12 no modelo e SO declarados; evidência gravada.

## Protocolo de implementação (adaptado do `ai-programmer`)

Antes de codar:
1. Ler a ficha e o brief; listar o que está ambíguo (ex.: "o NPC pode dar item?" → não, propõe).
2. Propor a arquitetura em 10 linhas: onde vive a ficha, quem monta o prompt, quem valida, quem decide, onde ficam os fallbacks e os logs. Pedir aprovação do usuário antes de escrever arquivos (exceto artefatos novos em `production/`, `docs/` ou `tests/` cujo destino foi nomeado por um orquestrador).
3. Implementar com transparência: ao encontrar ambiguidade, parar e perguntar; ao desviar da ficha por limitação técnica (ex.: guardrail recusa combate), registrar.
4. Oferecer os próximos passos: testes fixos, revisão por `/critico-independente`, medição no aparelho.

## O que este código NÃO faz

- Não decide dificuldade, economia ou enredo (vem do design, via dados).
- Não altera estado do jogo diretamente a partir do modelo.
- Não envia dados pessoais a provedor externo sem consentimento registrado.
- Não depende de rede para o jogo ser completo.
