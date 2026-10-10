# Regras e hábitos

As regras vêm das evidências do relatório (`reports/`); os hábitos, dos relatos de quem obteve
os melhores resultados em 2025–2026. As dez regras resumidas estão em `CLAUDE.md`; aqui
estão as versões completas e os hábitos que as sustentam.

## Regras

### 1. Evidência ou nada
"Pronto" = construído, executado, observado, evidência gravada. Um parse check, um "compila"
ou um "deveria funcionar" não contam. A regra vem do template Claude-Code-Game-Studios e foi
confirmada pela Anthropic: agentes "declaram o trabalho concluído cedo demais". O Stop hook e
o hook de commit deste repositório impõem isso mecanicamente.

### 2. Uma feature por sessão, em JSON
`feature_list.json`, não Markdown: a Anthropic observou que o modelo altera indevidamente
listas em JSON com menos frequência. Cada feature tem critério de aceite verificável antes de
qualquer código. Sessões de uma feature mantêm o diff pequeno e o contexto limpo.

### 3. A memória é o arquivo, não a conversa
`progress.md` (o que foi feito, o que falta, decisões, dívidas) é lido no início e após
compactação pelo hook `SessionStart`, e atualizado antes de encerrar. Contexto se perde;
arquivo não.

### 4. Quem constrói não avalia
O construtor é otimista por natureza. Antes de fechar algo visível, o subagente `critico`
(contexto limpo, rubrica objetiva, comparação cega quando houver referência) dá a nota. No
melhor caso público, isso levou um FPS de 3,59 para ~5/10; sem crítico ficou em 3,59.

### 5. Investir em instruções, não em documentos
O conselho mais repetido nos relatos é que tempo no `CLAUDE.md` volta em menos correção. O
teste cego do Game Studios mostrou que 30 documentos antes do código produziram o pior jogo.
Documente convenções, autoridade de decisão e o loop de verificação; não escreva GDD longo.

### 6. Diff pequeno, arquitetura pequena, propriedade mental
Um desenvolvedor abandonou um RTS inteiro porque perdeu contato com a base gerada; outro
resumiu: "you have to know what the issue is in order for claude to fix it". Se você não
consegue explicar um módulo, ele é grande demais. Revise diffs. Prefira composição simples.

### 7. Licença antes de gerar, proveniência depois
Só saída com uso comercial global: MIT/Apache ou plano comercial. Lista vermelha em
`templates/LICENCAS.md`. Cada asset recebe linha em `PROVENANCE.md` com edição humana — é a
prova que gera direito autoral nos EUA e no Brasil, onde saída pura de IA não é protegida.

### 8. Loja desde o início
A Apple não exige rótulo de IA; pune genericidade (4.3(b)), funcionalidade mínima (4.2),
placeholders (2.1(a)), marcas de terceiros (4.1(c)/5.2.1) e dados a IA de terceiros sem
consentimento (5.1.2(i)). A classificação etária (13+/16+/18+, loot box = A18 no Brasil) é
decisão de design, tomada no brief.

### 9. Não inventar
Ferramenta, versão, flag, preço ou regra sem fonte lida recebe "[confirmar]". Três modelos de
vídeo trocaram de nome em 2026 e o Sora 2 foi encerrado: fixe versões e aponte a documentação
da versão fixada para o agente.

### 10. Verificação é a feature mais importante
Todas as peças que subiram a qualidade em 2026 (plug-in da Unity que roda no Editor, Xcode 27
que deixa o agente tocar no simulador, Godot AI que espera o jogo ficar vivo, Stop hook) são
mecanismos para o agente ver o jogo. Monte isso no dia 1.

## Hábitos

### De sessão
- Comece com `/checkpoint-e-retomada`; termine com `progress.md` atualizado e commit.
- Use `/clear` entre features; o hook `SessionStart` repõe a memória.
- Peça evidência explicitamente: "mostre o screenshot e o trecho do log".
- Quando o agente insistir que algo funciona sem evidência, não discuta: rode `scripts/verify.sh`.

### De prompt (assets)
- Todo prompt de imagem começa pelo style card; todo prompt de áudio, pelo sound bible.
- Gere em lotes (3–5 imagens, 8–16 SFX, 2–4 músicas) e **cure**; a curadoria humana é a
  intervenção que a lei protege e a qualidade exige.
- Peça parâmetros explícitos: `background: "transparent"`, "same baseline", BPM e tom, seed.
- Proíba no prompt nomes de marcas, personagens e "no estilo de <artista vivo>".

### De custo
- Haiku 5.5 para QA, varreduras e geração em massa; Opus/Sonnet 5.5 para arquitetura e bugs difíceis.
- Prompt caching em qualquer loop repetitivo (prefixo ≥ 512 tokens, sem timestamp).
- Orçamento por sessão em `progress.md`; créditos de fornecedores (Unity AI, Meshy, PixelLab)
  anotados em `LICENCAS.md`.

### De Git
- Commit por feature com evidência; mensagem diz o que mudou e como foi verificado.
- Nunca `--force`, `reset --hard`, `rm -rf` (bloqueados em `.claude/settings.json`).
- Masters (WAV, PNG sem compressão, GLB de alta) fora do bundle mas versionados ou em LFS.

### De segurança
- Chaves só em variáveis de ambiente; o app nunca fala direto com a API de um LLM: backend mínimo.
- MCPs sem autenticação (Blender, Unreal 5.8 first-party) só em loopback ou VM.
- Não abra prompts/assets de terceiros não confiáveis em um MCP com execução de código.

### De aprendizado
- Uma vez por mês, revise `LICENCAS.md` e as versões fixadas: o ritmo de mudança é trimestral.
- Quando uma skill errar, corrija a skill (`/criar-ou-melhorar-skill`), não só o resultado.
- Guarde as críticas (`production/criticas/`): a curva das notas é o melhor indicador de progresso.
