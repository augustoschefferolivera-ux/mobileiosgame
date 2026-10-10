---
name: pixel-art-pipeline
description: >
  Produz pixel art em grade real (16/32/64 px, paleta limitada, sem anti-aliasing) com ferramentas
  pixel-native — PixelLab (esqueleto, rotações 4/8, MCP pixellab-mcp), Retro Diffusion (pay-per-asset,
  MCP), Aseprite via pixel-mcp, Sprite Fusion para tilemaps — e requantiza saídas de modelos generalistas
  quando inevitável. Use sempre que o jogo for pixel art, retrô, 8/16-bit, ou o usuário pedir "sprite
  de 32 px", "estilo SNES/Game Boy", tiles em grade. Não use para arte pintada/HD (/gerar-sprites-2d)
  nem para animar frames já em pixel (/animar-sprites, rota pixel-native).
license: MIT
compatibility: "Claude Code ou Codex; Aseprite (pago) opcional; Python 3.10+ com Pillow"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [4, 6]
argument-hint: "[grade 16|32|64] [categoria] [nome]"
disable-model-invocation: false
user-invocable: true
---

# Pixel art pipeline

Entrega sprites e tiles em grade exata (`./assets/sprites/*.png`, `./assets/tiles/*.png`) com paleta fechada, escala inteira e registro em `PROVENANCE.md`; a evidência é a folha de contato ampliada em escala inteira e o screenshot do jogo com filtro "nearest" ativo.

## Quando usar / quando não usar

- **Use** quando a art bible define grade de pixel (seção 7) — qualquer sprite, tile ou ícone do jogo passa por aqui.
- **Use** para converter um conceito gerado por modelo generalista em pixel art real (requantização), sabendo que é a pior rota.
- **Não use** para HD pintado (`/gerar-sprites-2d`), ciclos de animação completos (`/animar-sprites`), autotiles e mapas (`/cenarios-e-tilesets` chama esta skill para os tiles-base).

## Pré-requisitos

- `design/art-bible.md` com grade (16/32/64) e `design/paleta.txt` (≤ 32 cores; 16 é o ponto doce).
- Uma rota pixel-native (leia `references/ferramentas-pixel.md` para detalhes, limites e preços [secundário]):
  - **PixelLab** — canvas aceitos 16/32/64/128 px; esqueleto dentro do Aseprite; rotações em 4 e 8 direções; servidor MCP `pixellab-mcp` (npm, 1.1.0: rotação + estimativa de esqueleto). Planos reportados US$ 12/24/50 por mês [secundário, confirmar em pixellab.ai].
  - **Retro Diffusion** — pay-per-asset sem assinatura (≈ US$ 0,01+/imagem; RD Pro US$ 0,18; tileset US$ 0,10; animação US$ 0,07–0,25; `estimate_inference_cost` grátis) [secundário]; MCP disponível; extensão para Aseprite (compra única); RD Pro aceita até 9 referências.
  - **Aseprite** (editor padrão, pago) + `pixel-mcp` (servidor MCP em Go) ou o plug-in `pixel-plugin` para Claude Code.
  - **Sprite Fusion** — editor de tilemap gratuito no navegador, autotiling, exporta Unity/Godot/PNG/JSON (desktop US$ 12 [secundário]).
- `python3 -m pip install Pillow` para `scripts/requantizar_pixel.py`.
- **Licença de saída**: termos comerciais do PixelLab e do Retro Diffusion hospedado **não foram lidos** — confirme antes de publicar; o modelo baixável de US$ 50 do Retro Diffusion é da extensão Aseprite, "não os modelos usados em retrodiffusion.ai".

## Entradas

1. Grade (lado em px), paleta (`design/paleta.txt`), vista (lateral/top-down/isométrica) e se o asset precisa de rotações (4/8 direções).
2. Descrição funcional do asset (o que se lê em 32 px) e folha de referência se for personagem recorrente.
3. Engine: define o filtro "nearest" e a câmera pixel-perfect (Exportar para mobile).

## Passos

1. **Escolher a rota** com a tabela:

   | Necessidade | Rota |
   |---|---|
   | Personagem com rotações/esqueleto, muitos sprites | PixelLab (MCP ou app) |
   | Lote esporádico, tiles, custo por asset | Retro Diffusion (MCP) |
   | Retoque, paleta, tags de animação | Aseprite + `pixel-mcp` |
   | Já existe conceito HD aprovado | `scripts/requantizar_pixel.py` + Aseprite (pior rota) |

2. **Prompt pixel-native.** Prefixo do style card + "pixel art, <N>px canvas, <K>-color palette (#...), 1px dark outline, no anti-aliasing, no dithering [ou dithering ordenado], side view, transparent background". Ferramentas pixel-native respeitam a grade; generalistas não ("sizes you don't control").
3. **Gerar** (PixelLab/Retro Diffusion via MCP; configure o servidor conforme o README de cada pacote — não há `.mcp.json` nesta skill). Para Retro Diffusion, chame `estimate_inference_cost` antes de lotes. Salve brutos em `./assets/brutos/<data>/<asset>/`.
4. **Requantizar quando a origem for generalista**:
   ```bash
   python3 .claude/skills/pixel-art-pipeline/scripts/requantizar_pixel.py assets/brutos/<data>/<asset>/var_00.png --grade 32 --metodo box --paleta design/paleta.txt --saida assets/brutos/<data>/<asset>/px_00.png
   ```
   O script apara, reduz para a grade, binariza o alfa (mata AA) e encaixa cada pixel na paleta. Ele remove ruído, não cria leitura: abra no Aseprite e redesenhe silhueta e contorno.
5. **Verificar grade e paleta** (0% fora): `python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py px_00.png --paleta design/paleta.txt --tolerancia 0 --max-fora 0`. Dimensões devem ser exatamente a grade (ou múltiplo inteiro para sprites maiores).
6. **Rotações e esqueleto** (PixelLab): gere 4 ou 8 direções a partir do sprite frontal aprovado; estime o esqueleto para `/animar-sprites`. Confira que todas as direções têm a mesma altura de caixa de alfa.
7. **Curadoria** com folha ampliada em escala inteira: `python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py <pasta> --celula 192 --ampliar --saida production/evidencias/<data>-pixel-<nome>/contact-sheet.png`. O humano aprova em 1× e 4×.
8. **Nomear e registrar** com `../gerar-sprites-2d/scripts/nomear_e_registrar.py` (`--ferramenta PixelLab|"Retro Diffusion RD Pro"|...`, `--licenca pixellab|retro-diffusion`, `--pos "requantizar_pixel grade 32 paleta v1"`). Pixel art editada à mão no Aseprite: descreva em `--edicao-humana` (é o que gera direito autoral) e guarde o `.aseprite` em `masters/sprites/` (`--master`).
9. **Ver no jogo** com filtro nearest e câmera pixel-perfect (abaixo); screenshot para `production/evidencias/<data>-pixel-<nome>/no-jogo.png`. Blur ou "pixel gordo" desigual = falha de configuração do engine, não do asset.

## Critério de pronto e evidência

- [ ] Dimensões = grade (ou múltiplo inteiro); 0% fora da paleta; alfa binário (0 ou 255).
- [ ] Folha de contato em 1× e ampliada em `production/evidencias/<data>-pixel-<nome>/`; aprovação humana anotada.
- [ ] `no-jogo.png` sem blur, sem pixels de tamanhos diferentes, sem gaps entre tiles.
- [ ] `PROVENANCE.md` com ferramenta, créditos gastos, prompt, edição humana e "licença: confirmar" se os termos não foram lidos.

## Armadilhas conhecidas

- **Generalistas em pixel art**: saem em tamanho não controlado, com AA e cores fora da paleta; requantizar nunca recupera leitura de forma (Cinevva). Use só para conceito.
- **Escala fracionária** (1,5×, 2,5×) cria pixels desiguais. Só inteiros; em iOS, planeje a câmera para que a grade caiba inteira no @2x/@3x.
- **Vídeo→frames em pixel art** adiciona AA e deriva subpixel; prefira PixelLab/Retro Diffusion para animar (`/animar-sprites`).
- **Planos e preços** do PixelLab/Retro Diffusion vieram de agregadores e divergem entre fontes; confira na página oficial antes de assinar.
- **Modelo baixável do Retro Diffusion (US$ 50)** não é o modelo hospedado; não compre esperando RD Pro offline.
- **Aseprite** é pago; `pixel-mcp` e `pixel-plugin` são de terceiros — leia licença e README antes de instalar.

## Exportar para mobile

Exporte na grade (1×) e deixe o engine escalar por inteiro; se o engine não garantir escala inteira (web), exporte também 2× e 3× com `--escala` (nearest). Filtro **nearest** obrigatório: Unity → skill oficial `2d-pixel-perfect` do `unity-agent-plugin` (configura `PixelPerfectCamera` em URP ou Built-in; invoque-a em projetos Unity, não reescreva) + `Filter Mode: Point`, sem compressão com perda em sprites minúsculos (ASTC borra pixel art; use RGBA32 em atlases pequenos ou teste ASTC 4x4); SpriteKit → `texture.filteringMode = .nearest`; Godot 4 → `texture_filter = Nearest` (projeto ou nó); Phaser → `pixelArt: true` na config do jogo. Atlas por escala (`/atlas-e-exportacao-2d-mobile`), padding ≥ 1 px e extrusão para evitar sangramento entre tiles. **Licença de saída**: confirmar termos do PixelLab/Retro Diffusion hospedado; Aseprite não restringe o que você desenha.

## Fontes

- Generalistas vs. pixel-native; PixelLab e Retro Diffusion — https://app.cinevva.com/guides/ai-pixel-art-generators [secundário]
- PixelLab esqueleto no Aseprite, canvas 16–128 — https://www.pixellab.ai/docs/tools/skeleton-animation ; MCP `pixellab-mcp` 1.1.0 — https://app.unpkg.com/pixellab-mcp@1.1.0/files/README.md ; preços — https://ai.g2.com/marketplace/tools/pixellab [secundário]
- Retro Diffusion MCP, preços por asset, `estimate_inference_cost` — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp ; modelo baixável ≠ hospedado — https://astropulse.gumroad.com/l/RetroDiffusionModel [secundário]
- Aseprite `pixel-mcp` — https://pkg.go.dev/github.com/willibrandon/pixel-mcp ; `pixel-plugin` — https://www.sourcepulse.org/projects/33017483 [secundário]
- Sprite Fusion — https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser ; https://hugo-dz.itch.io/sprite-fusion [secundário]
- Unity `2d-pixel-perfect` (nome da skill oficial; Unity Companion License) — https://github.com/Unity-Technologies/unity-agent-plugin
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ1, KQ2, KQ6).
