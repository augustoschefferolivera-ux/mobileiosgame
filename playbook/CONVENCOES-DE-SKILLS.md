# Convenções do banco de skills

Este arquivo governa toda skill em `.claude/skills/`. Quem escreve ou altera uma skill lê isto primeiro. As convenções não são invenção deste repositório: seguem o padrão aberto Agent Skills (agentskills.io) usado pelo Claude Code, pelo Codex e pelos plug-ins oficiais da Unity, da Apple (Game Porting Toolkit) e da Roblox, e as práticas do repositório `anthropics/skills` (skill-creator) e do template `Donchitos/Claude-Code-Game-Studios` (MIT).

## Princípio: não reinventar

1. Se existe plug-in oficial ou MCP mantido para a tarefa, a skill **instala e usa** esse recurso e documenta só o que ele não cobre (mobile, IA generativa de assets, licença, loja). Nunca reescreva o conteúdo de `Unity-Technologies/unity-agent-plugin`, `apple/game-porting-toolkit`, `Roblox/roblox-studio-agent-plugin`, `CoplayDev/unity-mcp`, `hi-godot/godot-ai`, `getsentry/MobileBuildMCP`, `ahujasid/mcp-for-blender`.
2. Se existe ferramenta MIT/Apache scriptável (gltfpack, glTF-Transform, pyloudnorm, PyMusicLooper, BiRefNet, meshoptimizer, c2pa-rs), a skill chama a ferramenta; não descreve algoritmo próprio.
3. Templates reaproveitados do Claude-Code-Game-Studios (MIT) são adaptados e creditados em `THIRD_PARTY_NOTICES.md`.

## Localização e nome

- Caminho: `.claude/skills/<nome>/SKILL.md`. O nome do diretório vira o comando `/<nome>`.
- Nome em português, kebab-case, **sem acentos nem cedilha** (vira comando de terminal): `gerar-sprites-2d`, não `geração-de-sprites`.
- Arquivos de apoio: `references/*.md` (lidos sob demanda), `scripts/*` (executáveis com `--help`), `assets/*` (modelos de arquivo copiados para o projeto).
- `SKILL.md` com até **300 linhas**. O que passar disso vai para `references/` com um ponteiro claro ("Leia `references/x.md` quando ...").

## Frontmatter (YAML, primeira linha do arquivo é `---`)

Campos usados neste repositório (todos reconhecidos pelo Claude Code; os seis primeiros são do padrão aberto):

```yaml
---
name: gerar-sprites-2d
description: >
  O que faz + QUANDO usar, em uma frase "insistente". Ex.: "Gera sprites 2D com fundo
  transparente e estilo consistente. Use sempre que o usuário pedir personagem, inimigo,
  item, cenário ou qualquer imagem 2D para o jogo, mesmo sem dizer 'sprite'."
license: MIT
compatibility: "Claude Code ou Codex; macOS para passos de Xcode"   # opcional
metadata:
  grupo: arte-2d          # processo | engines | arte-2d | 3d | audio | ia-runtime | publicacao | meta
  alvo: [2d, app, web]    # subconjunto de 2d, 3d, app, web
  fase: [3, 4]            # fases do roteiro em playbook/01-roteiro-passo-a-passo.md
argument-hint: "[nome-do-asset] [estilo]"     # opcional
disable-model-invocation: false              # true só para fluxos perigosos/caros (ex.: submissão)
user-invocable: true
---
```

Regras:
- `description` ≤ 1.000 caracteres, começa pelo caso de uso principal, termina dizendo quando NÃO usar se houver skill vizinha.
- Nunca use `allowed-tools` para dar permissão a comandos destrutivos.
- `model`/`effort` só quando houver motivo (ex.: `model: haiku` para QA em massa).

## Estrutura obrigatória do corpo

```markdown
# Título

Uma frase: o que esta skill entrega e qual evidência prova que terminou.

## Quando usar / quando não usar
## Pré-requisitos
(ferramentas, MCPs, plug-ins, chaves, versões fixadas; comando de instalação ou ponteiro para /instalar-ferramentas)
## Entradas
(o que a skill precisa saber do projeto: brief, art bible, feature_list.json, etc.)
## Passos
(numerados; cada passo diz o comando/ferramenta e o resultado observável)
## Critério de pronto e evidência
(o que precisa existir em disco: screenshot, log, arquivo; "um parse check não é uma execução")
## Armadilhas conhecidas
(licença, custo, loja, bugs frequentes; cada item com fonte quando houver)
## Fontes
(URLs vindas de research_notes/ ou do relatório; marque "[secundário]" quando a página oficial não foi lida)
```

## Idioma e precisão

- Texto em português do Brasil. Nomes de produtos, modelos, APIs, flags e arquivos **exatamente** como os fabricantes escrevem (`gpt-image-1.5`, `FLUX.2 [klein] 4B`, `@Generable`, `xcrun mcpbridge`).
- Fatos com data e fonte. Preço, data de lançamento e termo de licença que não vieram de página oficial recebem "[secundário, confirmar]". Não invente ferramentas, versões, flags ou preços; na dúvida, diga "verifique em <URL>".
- Comandos em blocos de código; nunca em prosa.
- Cada skill explicita o **orçamento** quando houver (tokens, créditos, US$ por asset) e a **licença de saída** (comercial global? exclui UE/UK/Coreia? atribuição?).

## Evidência e verificação (regra herdada do Game Studios)

Uma skill que muda algo visível no jogo só declara "pronto" quando o jogo foi **construído, executado, observado** e a evidência (screenshot, log, arquivo gerado) foi gravada em `production/evidencias/<data>-<feature>/`. Um parse check não é uma execução. Isso vale para todo nível de rigor.

## Mobile primeiro

Toda skill de asset termina com a seção "Exportar para mobile" (formato, resolução/@2x/@3x ou LOD, compressão ASTC/KTX2, tamanho em KB, onde o engine carrega). Toda skill de código termina com "Verificar no simulador/dispositivo".

## Checklist antes de salvar uma skill

- [ ] `name` igual ao nome do diretório
- [ ] `description` diz o que faz e quando usar
- [ ] ≤ 300 linhas; conteúdo longo em `references/`
- [ ] Nenhuma ferramenta/versão/preço inventado; incertezas marcadas
- [ ] Seção "Critério de pronto e evidência" presente
- [ ] Seção "Fontes" com URLs
- [ ] Rode `python3 scripts/check-skills.py` sem erros
