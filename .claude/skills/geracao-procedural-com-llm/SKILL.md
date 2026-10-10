---
name: geracao-procedural-com-llm
description: >
  Gera conteúdo de jogo (níveis, quests, itens, loja, regras, seeds) com LLM no padrão de 2026: o modelo
  produz parâmetros estruturados validados por JSON Schema e por verificadores (nível sempre solucionável,
  economia dentro do orçamento), que alimentam geradores determinísticos (WFC, BSP, Perlin, gramáticas);
  pipeline em estágios mundo → NPCs → campanha → quests; geração offline em lote (Batch API, −50%) ou em
  runtime (Foundation Models @Generable / Haiku 5.5). Use sempre que o usuário pedir "níveis infinitos",
  "quests geradas", "itens aleatórios com IA", "mundo procedural" ou qualquer conteúdo gerado por modelo que
  entre na jogabilidade. Não use para diálogo de personagem (/npc-e-dialogo-dinamico) nem para assets
  visuais/3D (skills de arte); world models (Genie 3, Oasis, WHAMM) e Roblox Cube não servem para iPhone,
  e esta skill explica por quê.
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com `anthropic` para o lote; Swift/C#/GDScript no jogo"
metadata:
  grupo: ia-runtime
  alvo: [2d, 3d, app, web]
  fase: [5, 7]
argument-hint: "[tipo: nivel-2d | quest | loja | mundo] [modo: lote | runtime]"
disable-model-invocation: false
user-invocable: true
---

# Geração procedural com LLM (parâmetros, não texto)

Entrega um pipeline em que o LLM gera **parâmetros estruturados** (JSON validado por schema e por verificadores) e geradores determinísticos do jogo produzem o conteúdo; termina quando 100% de um lote de ≥ 100 itens passou nos verificadores, o jogo carregou uma amostra e `production/evidencias/<data>-pcg-llm/` tem o relatório de validação e screenshots.

## Quando usar / quando não usar

Use quando:
- O jogo precisa de variedade que a mão não dá: níveis, dungeons, quests secundárias, itens, inimigos, lojas, nomes de lugar, regras de modo diário.
- Há um gerador determinístico (ou dá para escrever um) que aceita parâmetros: seed, tamanho, densidade, grafo de salas, tabela de stats.
- Dá para verificar o resultado por código: alcançabilidade, orçamento de stats, unicidade, tamanho.

Não use quando:
- O conteúdo é texto livre que vai direto para a tela como regra ou fato (preço, dano, solução): o LLM gera só o **parâmetro**, e o código aplica.
- Quer "mundo neural" gerado quadro a quadro (Genie 3, WHAMM, Oasis): nenhum roda no iPhone e o custo é US$ 0,02/s ≈ US$ 72/h (ver `references/world-models-por-que-nao.md`).
- Quer texto-para-3D em runtime: Roblox Cube tem licença research-only e precisa de 24 GB de VRAM; use geração 3D offline (skills de 3D).
- É diálogo: `/npc-e-dialogo-dinamico`.

## Pré-requisitos

- Gerador determinístico no engine para cada tipo de conteúdo (ex.: BSP para salas, WFC para tiles, Perlin para terreno, gramática para nomes). Use implementações existentes: GameplayKit `GKNoise`/`GKPerlinNoiseSource` no iOS [confirmar disponibilidade no iOS 27]; `mxgmn/WaveFunctionCollapse` (MIT [confirmar]) como referência de WFC; nunca descreva o algoritmo na skill, chame a biblioteca.
- JSON Schema por tipo de conteúdo (`references/schemas-exemplo.md`) versionado em `content/schemas/`.
- Para lote: Python 3.10+, `pip install anthropic jsonschema`, chave em `ANTHROPIC_API_KEY` **só na máquina de build**. Preços e parâmetros: skill `claude-api` (`/claude-api`).
- Para runtime: `/ia-runtime-foundation-models` (`@Generable`, on-device) ou `/ia-runtime-nuvem-claude` (proxy).
- Verificadores: `scripts/validar-conteudo.py` (nível 2D e loja) como base; estenda por tipo.
- Skill vizinha `/licencas-e-proveniencia` para o `PROVENANCE.md` (modelo, prompt, schema, seed, curadoria humana).

## Entradas

- Brief do jogo e regras de design: tamanho de nível, duração-alvo, curva de dificuldade, economia (orçamento de stats por raridade, faixa de preços).
- Lista de geradores determinísticos disponíveis e seus parâmetros.
- "Bíblia do mundo" (texto fixo, ≥ 512 tokens para cache) e lista de nomes/termos proibidos.
- Decisão lote × runtime por tipo de conteúdo e volume (ex.: 500 quests em lote; nomes de lugar em runtime).

## Passos

1. **Separar o que o LLM decide do que o código faz.** Para cada tipo, escreva a tabela "parâmetro (LLM) → gerador (código) → verificador (código)". Exemplo: nível 2D: LLM dá `seed`, `largura`, `altura`, `densidade_obstaculos`, `inimigos[]`, `tema`; BSP/WFC gera o grid; verificador checa caminho início→saída. Se não há verificador, o parâmetro não entra no jogo.

2. **Escrever o JSON Schema** com `additionalProperties: false`, `required` em todo objeto, `enum` para tudo que o código compara, e **sem** `minimum`/`maximum`/`minLength` (não suportados pela saída estruturada do Claude; aplique esses limites no verificador). Exemplos prontos para nível 2D e loja em `references/schemas-exemplo.md`. Para Foundation Models, espelhe o schema em `@Generable` com `@Guide`.

3. **Pipeline em estágios** (padrão de 2026, arXiv 2604.25482): mundo (regiões, facções, tom) → NPCs (fichas) → campanha (grafo de objetivos) → expansão de quests (passos, recompensas). Cada estágio recebe a saída validada do anterior como contexto e tem seu schema. Separar planejamento de campanha da expansão de quests melhora estrutura global e narrativa local, segundo os autores.

4. **Lote primeiro.** Gere offline com `scripts/gerar-lote-batch.py` (Batch API, 50% de desconto; Haiku 5.5 em lote ≈ US$ 0,05/0,25 por MTok). Rode com `--dry-run` para ver requisições e custo estimado, depois `--submit`. Resultados chegam fora de ordem: o script indexa por `custom_id`. Saída em `content/gerado/<tipo>/<data>/*.json`.

5. **Validar tudo** com `python3 scripts/validar-conteudo.py nivel content/gerado/niveis/ --schema content/schemas/nivel-2d.json` e `... loja ...`. Testes de propriedade: todo nível tem caminho início→saída (BFS), inimigos em células livres, nenhum item com stats acima do orçamento da raridade, IDs únicos, textos ≤ limite e sem termos proibidos. Rejeitados vão para `rejeitados/` com motivo; nunca "consertados" à mão sem registrar.

6. **Curar por amostragem.** Abra 10% dos aprovados no jogo; marque bons/ruins; ajuste prompt/schema/verificadores; repita. O LLM não avalia o próprio lote (regra herdada do relatório: construtor não avalia o próprio trabalho).

7. **Embalar no app.** Conteúdo aprovado vai como dados (JSON/plist/ScriptableObject) no bundle ou por Background Assets; o jogo nunca chama o LLM para o que já foi gerado. Registre modelo, versão, prompt, schema e data em `PROVENANCE.md` (prova de curadoria humana para direito autoral).

8. **Runtime só para o que depende do jogador.** Nomes de lugar, descrição de item encontrado, variação de quest diária: `@Generable` on-device ou Haiku 5.5 via proxy, sempre passando pelo **mesmo verificador** antes de entrar no estado. Falha de validação → conteúdo pré-gerado do lote (pool de reserva).

9. **Determinismo e reprodução.** O LLM entrega `seed`; o gerador e o verificador são determinísticos; grave `seed` + `schema_version` no save. Bug report com seed reproduz o nível. Nunca gere o tilemap inteiro pelo LLM: além de caro, não é verificável nem reproduzível.

10. **Testar no jogo e gravar evidência** (seção final).

## Critério de pronto e evidência

Em `production/evidencias/<data>-pcg-llm/`:
- `validacao.json`: saída do `validar-conteudo.py` com total, aprovados, rejeitados por motivo (100% dos aprovados passam em todas as propriedades).
- `lote.log`: ID do batch, `request_counts`, custo real (tokens × preço do dia).
- `amostra-curadoria.md`: 10% dos itens com nota humana e decisão.
- Screenshots de ≥ 5 níveis/itens gerados carregados no jogo (simulador ou aparelho) e de um nível rejeitado que **não** aparece.
- `PROVENANCE.md` atualizado (modelo, versão, prompt, schema, seed, curadoria).
Um schema que valida não é um nível que joga: a evidência inclui o jogo rodando o conteúdo.

## Armadilhas conhecidas

- **Texto livre virando regra**: "dano: 'muito alto'" quebra o balanceamento. Enum e números em faixa verificada; texto só em campos de sabor com limite de tamanho.
- **Schema sem limites numéricos**: a saída estruturada do Claude ignora `minimum`/`maximum`; o verificador é obrigatório. Fonte: docs de structured outputs.
- **Recursão** não suportada no schema (grafos de quest recursivos): modele como lista de nós + lista de arestas por ID.
- **Lote fora de ordem**: resultados do Batch chegam em qualquer ordem; use `custom_id`. Prazo máximo 24 h; resultados ficam 29 dias.
- **Cache no lote**: prefixo fixo (bíblia) com `cache_control` funciona no Batch e corta ainda mais; mas o mínimo de 512 tokens continua.
- **Foundation Models não sabe fatos nem contas**: ótimo para parâmetros e sabor; nunca para resolver o puzzle que ele mesmo gerou. Verificador no código.
- **Qualidade de modelo pequeno**: 0,6–2B on-device segue o schema por gramática, mas a variedade é baixa; use lote na nuvem para o grosso e on-device para variação local.
- **Direito autoral**: conteúdo puramente gerado tende a não ter proteção (EUA e Brasil); a seleção/edição humana documentada tem. `PROVENANCE.md` e `rejeitados/` são a prova.
- **Roblox Cube**: licença "CUBE3D RESEARCH-ONLY RAIL-MS", sem concessão comercial; `GenerateModelAsync` é API do Roblox, não serve fora dele.
- **World models**: demos em GPU de datacenter, memória de 0,9 s (WHAMM) a minutos (Genie 3), sem lógica de jogo confiável; US$ 0,02/s na Oasis 3. Ver referência.
- **Placeholders no build**: grep por "as an AI", "lorem", nomes de modelo e chaves `TODO` no conteúdo gerado antes de cada envio (2.1(a)).

## Verificar no simulador/dispositivo

1. Carregue 20 itens aprovados do lote no simulador; cada nível deve ser concluído por um bot de caminho (BFS) ou por você em ≤ 2× a duração-alvo; capture `xcrun simctl io booted screenshot` de 5 deles.
2. Force um item rejeitado no caminho de carga: o jogo deve recusar e usar o pool de reserva, sem crash.
3. Runtime: no aparelho, gere 10 variações `@Generable`/Haiku e confirme que 100% passam no verificador ou caem no pool; meça latência.
4. Reproduza um nível pelo `seed` salvo em outro aparelho: deve ser idêntico.
5. Grave em `production/evidencias/<data>-pcg-llm/`.

## Fontes

- Pipeline em estágios (From World-Gen to Quest-Line): https://arxiv.org/html/2604.25482 ; resumo: https://www.emergentmind.com/papers/2604.25482
- SLMs para conteúdo dinâmico: https://arxiv.org/pdf/2601.23206 ; lista curada: https://github.com/imclab/awesome-game-gen
- PCG Benchmark: https://arxiv.org/pdf/2503.21474 ; Narrative-to-Scene 2D: https://arxiv.org/pdf/2509.04481
- Saída estruturada (Claude): https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Batch (Claude): https://platform.claude.com/docs/en/build-with-claude/batch-processing ; preços: https://platform.claude.com/docs/en/about-claude/pricing
- WWDC25 301 (`@Generable`, `DynamicGenerationSchema`): https://developer.apple.com/videos/play/wwdc2025/301/
- Roblox Cube LICENSE: https://github.com/Roblox/cube/blob/main/LICENSE ; newsroom: https://about.roblox.com/newsroom/2026/02/accelerating-creation-powered-roblox-cube-foundation-model
- WHAMM: https://www.microsoft.com/en-us/research/articles/whamm-real-time-world-modelling-of-interactive-environments/
- Oasis 3 (US$ 0,02/s): https://techcrunch.com/2026/06/10/decarts-new-world-model-can-simulate-hours-of-photorealistic-driving-with-some-caveats/
- Project Genie [secundário]: https://9to5google.com/2026/01/29/google-project-genie/
- Direito autoral (Copyright Office Parte 2) [secundário]: https://www.reedsmith.com/articles/copyright-office-anticipated-part-two-report-ai-addressing-copyrightability/
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/ia_em_runtime_e_world_models.md` (Key Questions 4 e 5)
