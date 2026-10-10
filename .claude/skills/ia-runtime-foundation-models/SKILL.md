---
name: ia-runtime-foundation-models
description: >
  Integra o Foundation Models framework da Apple (iOS 26/27) ao jogo: modelo on-device
  SystemLanguageModel com geração guiada @Generable, tool calling, PrivateCloudComputeLanguageModel
  (32K de contexto, sem custo de API abaixo de 2 milhões de downloads) e o protocolo LanguageModel
  para trocar por Claude/Gemini sem reescrever o jogo. Use sempre que o jogo nativo iOS precisar
  de texto ou estrutura gerada em tempo de execução (fala de NPC, descrição de item, dica
  contextual, nome de lugar), mesmo que o usuário diga só "quero que o NPC fale coisas diferentes".
  Não use para lógica de jogo crítica nem fatos de mundo; para modelo próprio (llama.cpp/MLX) use
  /ia-runtime-on-device-llm; para Claude com backend próprio use /ia-runtime-nuvem-claude.
license: MIT
compatibility: "Claude Code ou Codex; macOS Tahoe 26.6+ com Xcode 27; iOS 26 (on-device) ou iOS 27 (PCC, protocolo LanguageModel, contextSize)"
metadata:
  grupo: ia-runtime
  alvo: [2d, 3d, app]
  fase: [7, 9]
argument-hint: "[caso-de-uso: dialogo-npc | descricao-item | dica] [degrau: on-device | pcc | externo]"
disable-model-invocation: false
user-invocable: true
---

# IA em runtime com Foundation Models (iOS 26/27)

Entrega um módulo Swift que gera texto e structs validados em runtime pelo Foundation Models framework (on-device → Private Cloud Compute → provedor externo, com o mesmo `LanguageModelSession`) e cai para falas escritas quando o modelo não está disponível; termina quando o jogo rodou no simulador ou no aparelho e há screenshot + log de latência em `production/evidencias/<data>-foundation-models/`.

## Quando usar / quando não usar

Use quando:
- O alvo é app nativo iOS 26+ (SwiftUI + SpriteKit, RealityKit, ou Unity/Godot com ponte Swift) e o jogo quer texto variável em runtime: fala ambiente de NPC, descrição de item gerado, dica contextual, resumo do que aconteceu na partida. A Apple lista "on-the-fly in-game character dialog" como caso de uso oficial.
- A saída precisa ser **estrutura válida** (struct Swift com campos tipados), não texto solto: `@Generable` garante a forma por decodificação restrita.
- Custo zero, offline e sem envio de dados por padrão importam (sem provedor externo não há consentimento 5.1.2(i) a pedir).

Não use quando:
- O conteúdo depende de conhecimento de mundo ou raciocínio longo: a Apple diz que o modelo on-device "is not designed for world knowledge or advanced reasoning" (~3B parâmetros, 2 bits). Suba para PCC ou nuvem.
- A decisão afeta regra crítica (dano, economia, progresso, vitória). Gere **parâmetros validados** com `/geracao-procedural-com-llm`; a regra fica no código.
- O alvo é web (Safari/PWA): o framework é Swift-only.
- Precisa de pesos próprios ou fine-tuning: `/ia-runtime-on-device-llm` (adapters da Apple existem, mas "require retraining as Apple updates the model").

## Pré-requisitos

- Xcode 27 em Mac Apple silicon; deployment target iOS 26 (on-device) ou **iOS 27** (PCC, `contextSize`/`tokenCount(for:)`, entrada de imagem, protocolo `LanguageModel`; pacotes de provedor exigem `.iOS(.v27)`).
- Aparelho de teste com Apple Intelligence ativada. A Apple descreve o requisito apenas como "Apple Intelligence-enabled devices in supported regions"; a lista "iPhone 15 Pro ou posterior, iPad/Mac M1+" vem de fontes secundárias [secundário, confirmar].
- Para PCC: entitlement do `PrivateCloudComputeLanguageModel` (a sessão 241 diz que exige entitlement; o identificador exato não consta nas fontes lidas: confirme no portal do desenvolvedor).
- Para provedor externo: pacote Swift da Anthropic ou do Google para o protocolo `LanguageModel` (a Apple afirma que ambos publicam pacotes; nome/URL não constam nas fontes lidas: confirme na sessão WWDC26 339 e na documentação do provedor). Chave de API **nunca** no app: ver `/ia-runtime-nuvem-claude`.
- Falas escritas de fallback para toda situação coberta pelo modelo (obrigatório; sem isso a feature não é "pronta").
- Skills vizinhas já existentes no banco: `/classificacao-etaria` (chatbot no questionário), `/privacidade-lgpd-e-eca-digital` (rótulos e consentimento), `/divulgacao-de-uso-de-ia` (como identificar IA ao jogador).

## Entradas

- Ficha estruturada de cada NPC/item (ver `/npc-e-dialogo-dinamico`): persona, objetivo, o que sabe, o que não pode dizer, estilo, idioma (pt-BR), limite de palavras.
- Tabela de casos de uso com **degrau** (on-device / PCC / externo) e **orçamento de latência** (ex.: fala ambiente ≤ 1,5 s, descrição de item ≤ 3 s, texto longo só em tela de loading).
- Estado do jogo que entra como contexto (local, hora, flags de quest), já serializado em texto curto.
- `feature_list.json` do projeto com a feature de IA e seu critério de pronto.

## Passos

1. **Escolher o degrau por caso de uso.** Preencha a tabela: on-device para tudo que é curto, frequente e offline; PCC (32K, `reasoningLevel`) para resumo de campanha, quests com dependências, texto longo; provedor externo só quando PCC não basta ou o jogo não é só iOS. Registre a decisão em `docs/ia-runtime.md`. Leia `references/escada-de-modelos.md` para os critérios.

2. **Checar disponibilidade e preparar o fallback antes de qualquer prompt.** Consulte a disponibilidade do `SystemLanguageModel` no início da cena e grave o resultado; se indisponível (aparelho sem Apple Intelligence, região, modelo ainda baixando), o jogo usa as falas escritas sem mostrar erro ao jogador. Nome exato do enum de disponibilidade: ver `references/api-e-exemplos-swift.md` (marcado para confirmação).

3. **Modelar a saída como `@Generable`.** Comece pelo exemplo oficial da Apple e adapte: `@Generable struct NPC { name, level 1...10, attributes, encounter }`. Regras: campos tipados (String, Int, Double, Bool, arrays, enums, structs aninhados); `@Guide` para faixa, descrição e tamanho; propriedades são geradas **na ordem de declaração**, então declare primeiro o que o jogo precisa primeiro e por último o texto livre. Nenhum campo de texto livre vai direto para regra de jogo.

4. **Criar a sessão com instruções fixas e prompts curtos.** Instruções = ficha do personagem + limites + idioma; prompt = estado atual + ação do jogador. A Apple diz que instruções têm prioridade sobre o prompt "but by no means bulletproof" contra injeção: trate texto digitado pelo jogador como não confiável (limite de tamanho, sem comandos). Para saída repetível no mesmo prompt/SO use `GenerationOptions(sampling: .greedy)`; uma atualização do iOS pode mudar a saída.

5. **Tratar os três erros oficiais.** `LanguageModelSession.GenerationError.exceededContextWindowSize` → criar nova sessão carregando instruções + última resposta (recomendação da Apple); violação de guardrail → fala escrita + log local (falsos positivos foram reduzidos no 26.4 e no 27, mas existem); idioma não suportado → fala escrita. Nunca mostre a mensagem de erro ao jogador.

6. **Orçar o contexto (iOS 27).** Leia `contextSize` e meça com `tokenCount(for:)`; o exemplo de slide da Apple imprime **8192**, que é exemplo, não especificação. Mantenha instruções + ficha + estado ≤ 50% do contexto e corte a memória de sessão pelo resto (ver `/npc-e-dialogo-dinamico`).

7. **Tool calling só para ler estado, não para mudar regra.** Implemente o protocolo `Tool` com argumentos `@Generable` (nomes e argumentos nunca saem inválidos); as ferramentas são fixadas na criação da sessão e chamadas em paralelo dentro de uma mesma requisição. Ferramentas que leem inventário/quest são seguras; ferramentas que escrevem no estado passam pelo mesmo validador da `/geracao-procedural-com-llm`.

8. **Streaming para esconder latência.** Use a resposta parcial (`PartiallyGenerated`) para mostrar texto aparecendo; mostre o primeiro campo assim que chegar. Rode a geração fora da thread principal e mantenha o loop de render; meça com o template de Instruments do framework.

9. **Subir degrau com a mesma API.** Troque o modelo da sessão por `PrivateCloudComputeLanguageModel` (contexto de 32.000 tokens, `reasoningLevel`, sem chaves de API, limites diários por usuário, maiores com iCloud+) ou por um `LanguageModel` de terceiros do pacote Swift do provedor. O restante do código não muda. Para provedor externo, **antes da primeira transmissão** mostre a folha de consentimento 5.1.2(i) (ver `/ia-runtime-nuvem-claude`); quem recusa fica no degrau anterior.

10. **Ler `response.usage`** (iOS 27: tokens de entrada, em cache, saída e raciocínio) e logar por caso de uso em arquivo local sem dados pessoais; isso alimenta o orçamento e a decisão de degrau.

11. **Testar com conjunto fixo de prompts.** Use a lista de `/npc-e-dialogo-dinamico` (`.claude/skills/npc-e-dialogo-dinamico/references/testes-npc.md`) e, no macOS 27, o CLI `fm` e o framework de Evaluations do iOS 27 para rodar o mesmo conjunto fora do app. Critérios: forma válida, idioma, limite de palavras, nada fora da persona, latência dentro do orçamento.

12. **Rodar no simulador e no aparelho, gravar evidência.** Ver "Verificar no simulador/dispositivo".

## Critério de pronto e evidência

Existe em `production/evidencias/<data>-foundation-models/`:
- `disponibilidade.log`: resultado da checagem em pelo menos um aparelho com e um sem Apple Intelligence (ou simulador com fallback forçado).
- `latencia.csv`: p50/p95 por caso de uso, medidos no aparelho com o jogo renderizando (não só no simulador).
- `testes-npc.md` preenchido: cada prompt fixo com saída, aprovado/reprovado e motivo.
- Screenshots do texto gerado na cena e do fallback escrito na mesma cena.
- `usage.log` com tokens por caso de uso (iOS 27).
Um parse check de `@Generable` não é execução: a feature só está pronta com o jogo rodando e a evidência gravada.

## Armadilhas conhecidas

- **Conhecimento e raciocínio**: o modelo on-device erra fatos e contas; nunca gere preço, dano ou solução de puzzle com ele. Fonte: WWDC25 286.
- **Saída muda com o SO**: `.greedy` é repetível só para o mesmo modelo/versão; não grave saídas como conteúdo canônico sem revisar. Fonte: WWDC25 301.
- **Disponibilidade**: aparelho antigo, Apple Intelligence desligada, região sem suporte ou idioma não suportado deixam o jogo sem modelo. pt-BR: confirme na lista oficial de idiomas da Apple Intelligence [secundário, confirmar]. Sem fallback escrito, a App Review vê uma feature quebrada (4.2).
- **Guardrails** bloqueiam temas comuns em jogos (violência, armas, morte) com falsos positivos; teste as cenas de combate cedo. Fonte: WWDC26 241.
- **Contexto de 8192 é exemplo de slide**, não especificação; leia `contextSize` em runtime.
- **PCC exige entitlement e tem limites diários por usuário**; o "sem custo" vale para quem tem menos de 2 milhões de downloads iniciais. Confirme os termos antes de basear a economia do jogo nisso. Fonte: WWDC26 241.
- **PCC e 5.1.2(i)**: a regra fala em "third parties, including with third-party AI". Dados saem do aparelho para a Apple; a nota de pesquisa trata só provedores externos como terceiros. Declare o uso na política de privacidade e nos rótulos de privacidade e confirme com a App Review [não verificado].
- **HIG "Generative AI"**: "Clearly identify when and where you use AI" e nunca fazer o jogador achar que a fala foi escrita por humano quando não foi. Um ícone/aviso na primeira fala gerada resolve.
- **Classificação etária**: o questionário manda considerar "AI assistants and chatbot functionality" como fonte de conteúdo sensível; responda com honestidade e use "Override to Higher" se em dúvida.
- **`ImageCreator`** (Image Playground) foi descontinuado em 11/06/2026 e não funciona no iOS 27; não planeje imagens em runtime por ele.
- **Adapters** personalizados exigem retreino a cada atualização do modelo da Apple; evite em jogo solo.
- **Unity/Godot**: não há plug-in oficial do framework; exige ponte Swift ↔ C#/GDScript (chamada assíncrona, resultado em JSON). Teste a ponte no aparelho, não no editor.

## Verificar no simulador/dispositivo

1. **Simulador**: o simulador do iOS 26/27 usa o modelo do Mac anfitrião; exige Mac Apple silicon com Apple Intelligence ativada [secundário, confirmar]. Rode a cena, force o caminho de fallback (desligue Apple Intelligence no Mac ou injete indisponibilidade) e capture ambas as telas com `xcrun simctl io booted screenshot`.
2. **Aparelho**: meça latência p50/p95 com o jogo renderizando a cena mais pesada; se p95 passar o orçamento, encurte o prompt, reduza campos do `@Generable` ou mova o caso para tela de loading.
3. **Thermal/memória**: rode 10 minutos de partida com geração a cada 30 s e observe no Instruments; se o frame time subir, espaçe as gerações ou pré-gere em loading.
4. Grave tudo em `production/evidencias/<data>-foundation-models/` antes de marcar a feature como pronta.

## Fontes

- WWDC25 Session 286 "Meet the Foundation Models framework": https://developer.apple.com/videos/play/wwdc2025/286/
- WWDC25 Session 301 "Deep dive into the Foundation Models framework": https://developer.apple.com/videos/play/wwdc2025/301/
- WWDC26 Session 241 "What's new in the Foundation Models framework": https://developer.apple.com/videos/play/wwdc2026/241/
- WWDC26 Session 339 "Bring an LLM provider to the Foundation Models framework": https://developer.apple.com/videos/play/wwdc2026/339/
- Apple Developer News (submissões OS 27 em 09/09/2026; ImageCreator descontinuado): https://developer.apple.com/news/
- App Store Review Guidelines (5.1.2(i), 4.7.1, 1.2, 4.2): https://developer.apple.com/app-store/review/guidelines/
- HIG, Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Apple Developer News, 24/07/2025 (classificação etária e chatbots): https://developer.apple.com/news/?id=ks775ehf
- Requisitos de aparelho [secundário]: https://stora.sh/blog/2026-04-21-apple-foundation-models-framework-ios-26-integration-guide ; https://www.infoq.com/news/2025/07/apple-foundation-models-ios26
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/ia_em_runtime_e_world_models.md` (Key Question 2 e 3)
