---
name: gerar-sprites-2d
description: >
  Gera sprites 2D (personagens, inimigos, itens, props, efeitos) com fundo transparente e estilo
  consistente a partir do style card: gpt-image-1.5 com background transparente como rota principal,
  Nano Banana Pro com referências como secundária, GPT Image 2 e Midjourney V8.1 com recorte BiRefNet.
  Faz variações, curadoria em folha de contato, recorte determinístico, nome previsível e registro
  em PROVENANCE.md. Use sempre que o usuário pedir qualquer imagem 2D para o jogo, mesmo sem dizer
  "sprite". Não use para pixel art em grade (/pixel-art-pipeline), animação (/animar-sprites),
  UI/ícones (/ui-hud-e-icones) nem cenários/tiles (/cenarios-e-tilesets).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; rembg opcional para recorte local"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [4, 6]
argument-hint: "[categoria] [nome-do-asset] [variante]"
disable-model-invocation: false
user-invocable: true
---

# Gerar sprites 2D

Entrega PNGs RGBA nomeados (`assets/sprites/<cat>_<nome>_<variante>.png`), uma folha de contato aprovada por humano em `production/evidencias/<data>-sprites-<nome>/` e uma linha por arquivo em `PROVENANCE.md`; o asset só é "pronto" quando aparece em screenshot do jogo rodando (skill do engine).

## Quando usar / quando não usar

- **Use** para qualquer sprite estático de arte pintada/HD/flat: herói em pose, inimigo, item, prop, projétil, efeito em um frame.
- **Use** quando o usuário diz "preciso de uma imagem de X para o jogo", "desenha um inimigo", "gera o ícone do item" (ícone de UI → `/ui-hud-e-icones`).
- **Não use** sem `design/style-card.md` aprovado: rode `/direcao-de-arte-e-style-card` primeiro (versão mínima leva 30 min).
- **Não use** para pixel art (grade, paleta limitada): `/pixel-art-pipeline`. Para frames de animação: `/animar-sprites`. Para cenários: `/cenarios-e-tilesets`.

## Pré-requisitos

- `design/style-card.md`, `design/art-bible.md`, `design/paleta.txt` e, para personagens, `assets/referencias/chr_<nome>_sheet.png`.
- Chaves: `OPENAI_API_KEY` (gpt-image-1.5; GPT Image 2) e/ou chave Gemini (Nano Banana Pro = `gemini-3-pro-image-preview`). Midjourney só via app/web (sem rota de API confirmada nesta pesquisa).
- Python: `python3 -m pip install Pillow openai google-genai`; para recorte local `python3 -m pip install "rembg[cpu]"` (o modelo é baixado na 1ª execução; `scripts/remove_bg.py` avisa e exige `--permitir-download`). Alternativa paga sem instalação: Replicate `sprited/birefnet` ou `sprited/birefnet-toonout` (`REPLICATE_API_TOKEN`).
- Orçamento por asset (preços de revendedores, [secundário, confirmar]): GPT Image 2 ≈ US$ 0,21 por 1024² em alta na fal; Nano Banana Pro ≈ US$ 0,13 (1K/2K); gpt-image-1.5 não capturado. Regra: 4 variações × 1 recorte por asset; estime antes de gerar lotes.
- **Licença de saída**: termos comerciais da OpenAI, Google e Midjourney para assets de jogo **não foram lidos** nesta pesquisa — registre "confirmar" em `PROVENANCE.md` até alguém ler os termos vigentes.

## Entradas

1. Categoria (`chr`, `enm`, `itm`, `prp`, `fx`), nome, variante (ex.: `idle`, `dano`, `nivel2`) e tamanho-alvo em px @3x (seção 7 da bible).
2. Descrição funcional em 1–2 frases: o que o jogador precisa reconhecer de relance (ex.: "inimigo lento que explode: corpo redondo, pavio aceso").
3. Rota de modelo (tabela abaixo) e número de variações (padrão 4).

| Situação | Rota | Por quê |
|---|---|---|
| Padrão (UI, itens, props, iteração rápida) | **gpt-image-1.5**, `background: "transparent"`, PNG/WebP | alfa nativa evita artefato de recorte (lançado 16/12/2025) |
| Personagem recorrente com folha de referência | **Nano Banana Pro** (`gemini-3-pro-image-preview`) com a folha + refs (até ~14 [secundário]) | consistência por referência; sem alfa nativa confirmada → recorte |
| Arte-herói/opaca de alta fidelidade | **GPT Image 2** (`gpt-image-2`; snapshot `gpt-image-2-2026-04-21`) | topo da arena; transparência em preview desde 20/08/2026, "may be unstable" → gere opaco e recorte |
| Exploração estética manual | **Midjourney V8.1** (padrão desde 10/06/2026; `--hd` 2K) + recorte | sem alfa, sem API confirmada; registrar manualmente |

## Passos

1. **Montar o prompt** = prefixo literal do style card + descrição do asset + enquadramento fixo: "single subject, full body, centered, facing [direção da câmera da bible], neutral ground contact, isolated, no background, no shadow on ground, no text" + negativo do style card. Salve em `prompts/<cat>_<nome>_<variante>.txt` (o `PROVENANCE.md` aponta para ele). Veja exemplos e trechos de código em `references/prompts-e-modelos.md`.
2. **Gerar variações** (4 por padrão) para `assets/brutos/<data>/<cat>_<nome>_<variante>/`. Com gpt-image-1.5 use `background: "transparent"` e `output_format: "png"`; peça tamanho ≥ 2× o alvo final para reduzir depois (nunca ampliar). Guarde a resposta da API (modelo, snapshot, `n`, `size`, `quality`) em `resposta.json` na mesma pasta; seeds só quando o provedor expõe.
3. **Recortar** quando a rota não dá alfa (Nano Banana Pro, GPT Image 2 opaco, Midjourney):
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/remove_bg.py assets/brutos/<data>/<asset> --saida assets/brutos/<data>/<asset>/recortes --aparar --margem 4 --relatorio assets/brutos/<data>/<asset>/recortes/relatorio.json
   ```
   Padrão `--modelo birefnet-general` (BiRefNet, MIT). Para arte estilizada/anime, `--backend replicate --replicate-modelo sprited/birefnet-toonout` (ToonOut: 99,5% de acurácia em testes de anime [secundário]; licença do fine-tune: confirmar no model card).
4. **Curadoria humana.** Folha de contato sobre xadrez (revela halos) e sobre a cor do cenário:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/brutos/<data>/<asset>/recortes --colunas 4 --celula 256 --saida production/evidencias/<data>-sprites-<nome>/contact-sheet.png
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/brutos/<data>/<asset>/recortes --fundo "#<cor do cenário>" --saida production/evidencias/<data>-sprites-<nome>/contact-sheet-cenario.png
   ```
   Apresente ambas; o humano escolhe 1 (ou pede nova rodada com o prompt ajustado). Anote a escolha e o motivo.
5. **Verificar paleta** (opcional em HD, obrigatório se a bible fixa paleta fechada): `python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py <escolhido> --paleta design/paleta.txt --tolerancia 28 --max-fora 10`.
6. **Redimensionar para o alvo** com Lanczos (Pillow) para @3x; derive @2x/@1x só na exportação (`/atlas-e-exportacao-2d-mobile`). Se precisar ampliar (raro), prefira a resolução nativa 2K/4K do modelo (Nano Banana Pro) ou um upscaler aberto como Real-ESRGAN [secundário, confirmar licença], e registre na coluna Pós-processo.
7. **Nomear e registrar**:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/nomear_e_registrar.py <escolhido>.png --categoria enm --nome bomba --variante idle --modelo gpt-image-1.5 --versao "<snapshot ou data>" --seed n/a --prompt-arquivo prompts/enm_bomba_idle.txt --refs n/a --pos "nativo transparente; Lanczos 384px" --edicao-humana "curadoria 1/4 por <nome>; motivo: ..." --aprovado-por "<nome>" --licenca "OpenAI: confirmar termos comerciais"
   ```
   O script move para `assets/sprites/`, evita colisão de nome e anexa a linha ao `PROVENANCE.md`.
8. **Ver no jogo.** Entregue à skill do engine (SpriteKit/Unity/Godot/Phaser) para importar e tirar screenshot no simulador/navegador; copie o screenshot para `production/evidencias/<data>-sprites-<nome>/no-jogo.png`. Sem isso, o asset não está pronto.

## Critério de pronto e evidência

- [ ] PNG RGBA em `assets/sprites/` com nome `snake_case` ASCII e tamanho @3x da bible; alfa limpo (bordas sem halo no xadrez).
- [ ] `production/evidencias/<data>-sprites-<nome>/` com `contact-sheet.png`, `contact-sheet-cenario.png`, decisão humana anotada e `no-jogo.png`.
- [ ] Linha em `PROVENANCE.md` com modelo, versão/snapshot, prompt (arquivo), pós-processo, edição humana, aprovador e termos de licença.
- [ ] `assets/brutos/` preservado (ou apagado deliberadamente e anotado): é a prova da curadoria.

## Armadilhas conhecidas

- **Alfa "transparente" com fundo xadrez pintado**: alguns modelos desenham o xadrez. Confira o canal A (o relatório do `remove_bg.py` traz a bbox) antes de aceitar.
- **GPT Image 2 e transparência**: preview desde 20/08/2026, instável; não exponha `background` como se fosse estável [secundário].
- **Limite de referências do Nano Banana Pro**: ~14 na maioria das fontes, 8 em outras — teste com o seu lote e anote.
- **Halo escuro ao compor**: PNG com alfa reto renderizado como pré-multiplicado (ou o inverso) escurece bordas; trate na exportação (`/atlas-e-exportacao-2d-mobile`).
- **Marcas e personagens de terceiros** (App Store 5.2.1/4.1(c)): nunca cite franquias no prompt; faça busca reversa nos heróis antes de publicar.
- **Dependência de regeneração**: Sora 2 e Veo 3 sumiram em 2026; guarde os PNGs finais e os prompts no Git — nunca dependa de regenerar para um rebuild.
- **Custo**: lotes de 50 assets × 4 variações em modelo de fronteira passam de US$ 40 [estimativa com preços secundários]; use Haiku/modelos baratos para rascunho e o caro só na final.

## Exportar para mobile

Formato PNG RGBA 8 bits (WebP só se o engine ler com alfa). Gere @3x no tamanho da bible (ex.: herói 384 px para 128 pt), derive @2x e @1x por redução Lanczos; em SpriteKit entram no asset catalog como `nome.png`, `nome@2x.png`, `nome@3x.png`; em Unity/Godot/Phaser entram no atlas (`/atlas-e-exportacao-2d-mobile`, ASTC em iOS, ≤ 2048²). Orçamento: um sprite 384×384 RGBA ocupa 576 KB descomprimido na GPU se ficar fora de atlas comprimido — empacote. **Licença de saída**: coluna obrigatória em `PROVENANCE.md`; "confirmar" até ler os termos do provedor.

## Fontes

- gpt-image-1.5: lançamento 16/12/2025, `background: "transparent"`, PNG/WebP — https://docs.apiyi.com/en/news/gpt-image-1-5-launch ; https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 ; https://apiframe.ai/guides/gpt-image-versions-explained [secundário]
- GPT Image 2: sem transparência no lançamento; preview em 20/08/2026 "may be unstable"; preço fal — https://fal.ai/learn/tools/gpt-image-2-vs-gpt-image-1-5 ; https://ecorpit.com/gpt-image-2-transparent-background-preview-no-token-table-2026/ [secundário]
- Nano Banana Pro (Gemini 3 Pro Image, `gemini-3-pro-image-preview`, ~14 refs, 2K/4K) — https://www.cometapi.com/pt/tag/gemini-3-pro-image/ ; preços https://benchlm.ai/media-pricing/nano-banana [secundário]
- Midjourney V8.1 padrão em 10/06/2026, `--hd` — https://www.nocode.mba/ai-release-tracker/providers/midjourney [secundário]
- BiRefNet MIT; ToonOut — https://replicate.com/sprited/birefnet/readme ; https://replicate.com/sprited/birefnet-toonout [secundário]
- Exportar PNG, peças separadas e mapa de nomes — https://rosebud.ai/blog/how-to-create-a-sprite-sheet-with-ai-using-google-gemini-and-nano-banana-easy-guide ; https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 [secundário]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md`; relatório: seção "Arte 2D" e "Checklist de riscos".
