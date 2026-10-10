---
name: pixel-art-pipeline
description: >
  Produz pixel art em grade real (16/32/64 px, paleta limitada, sem anti-aliasing) para um jogo Phaser 4
  web mobile com ferramentas pixel-native — PixelLab (esqueleto, rotações 4/8, MCP pixellab-mcp), Retro
  Diffusion (pay-per-asset, MCP), Aseprite via pixel-mcp, Sprite Fusion/Tiled para tilemaps — requantiza
  saídas de modelos generalistas quando inevitável, valida grade/paleta/alfa por script e configura o
  Phaser para pixel perfeito (pixelArt, zoom inteiro, smoothPixelArt). Use sempre que o jogo for pixel
  art, retrô, 8/16-bit, ou o usuário pedir "sprite de 32 px", "estilo SNES/Game Boy", tiles em grade.
  Não use para arte pintada/HD (/gerar-sprites-2d) nem para animar frames já em pixel (/animar-sprites,
  rota pixel-native).
license: MIT
compatibility: "Claude Code ou Codex; Aseprite (pago) opcional; Python 3.10+ com Pillow"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [4, 6]
argument-hint: "[grade 16|32|64] [categoria] [nome]"
disable-model-invocation: false
user-invocable: true
---

# Pixel art pipeline

Entrega sprites e tiles em grade exata (`./assets/sprites/*.png`, `./assets/tiles/*.png`) com paleta fechada (0 % fora), alfa binário e registro em `PROVENANCE.md`; a evidência é a folha de contato em 1× e ampliada por inteiro e o screenshot do jogo com `pixelArt: true` e zoom inteiro, sem blur nem "pixel gordo" desigual.

## Quando usar / quando não usar

- **Use** quando a art bible define grade de pixel (seção 7) — qualquer sprite, tile ou ícone passa por aqui.
- **Use** para converter um conceito de modelo generalista em pixel art real (requantização), sabendo que é a pior rota.
- **Não use** para HD pintado (`/gerar-sprites-2d`), ciclos completos (`/animar-sprites`), autotiles e mapas (`/cenarios-e-tilesets` chama esta skill para os tiles-base).

## Pré-requisitos

- `design/art-bible.md` com grade (16/32/64) e `design/paleta.txt` (≤ 32 cores; 16 é o ponto doce; 4–8 por sprite de 16 px).
- Uma rota pixel-native (detalhes, limites e preços [secundário] em `references/ferramentas-pixel.md`):
  - **PixelLab** — canvas 16/32/64/128; esqueleto dentro do Aseprite; rotações 4/8; MCP `pixellab-mcp` 1.1.0 (npm). Planos reportados divergem (US$ 10–50/mês) [secundário, confirmar em pixellab.ai]; uma resenha afirma uso comercial permitido e proíbe treinar outros modelos com as saídas [secundário, confirmar nos termos].
  - **Retro Diffusion** — pay-per-asset sem assinatura (≈ US$ 0,01+/imagem; RD Pro US$ 0,18; tileset US$ 0,10; animação US$ 0,07–0,25; `estimate_inference_cost` grátis) [secundário]; MCP; RD Pro aceita 9 referências. Termos comerciais não lidos.
  - **Aseprite** (editor padrão, pago; EULA própria) + `pixel-mcp` (Go) ou `pixel-plugin` para Claude Code (terceiros).
  - **Tiled** (gratuito; editor GPL, mapas seus) ou **Sprite Fusion** (gratuito no navegador; export para Phaser a confirmar) para tilemaps → `/cenarios-e-tilesets`.
- `python3 -m pip install Pillow` para `scripts/requantizar_pixel.py` e os verificadores das skills vizinhas.
- **Licença de saída**: PixelLab e Retro Diffusion hospedado — classe B, termos não lidos → "[confirmar]" em `PROVENANCE.md`; o modelo baixável de US$ 50 do Retro Diffusion é o da extensão Aseprite, "não os modelos usados em retrodiffusion.ai".

## Entradas

1. Grade (lado em px lógicos), paleta, vista (lateral/top-down/isométrica), rotações (4/8) e se o asset anima.
2. Descrição funcional (o que se lê em 32 px) e folha de referência se for personagem recorrente (gerada em pixel-native).
3. Estratégia de zoom do Phaser (abaixo): define a resolução lógica em pixels de arte, não em pontos.

## Passos

1. **Fixar a grade no Phaser antes de desenhar.** Com `Scale.FIT` e canvas @2x (`width: 390*dpr`) a escala fica fracionária e o pixel art borra ou fica desigual. Opções: (a) resolução lógica em pixels de arte que dividem a tela, ex. `width: 195, height: 422` com `zoom: 2` → 390×844 CSS px (cada pixel de arte = 2 CSS px = 4 pixels físicos em DPR 2) e `scale.mode: NONE` + `autoCenter`, aceitando margens em telas de proporção diferente; (b) `zoom: Phaser.Scale.ZOOM.MAX_ZOOM` + `Scale.NONE`, que escolhe o maior zoom inteiro que cabe no pai (`getMaxZoom` usa `SnapFloor`); (c) `Scale.FIT` + `pixelArt: true` + `roundPixels` aceitando leve desigualdade. Em todos: `render: { pixelArt: true }` (desliga antialias e liga `roundPixels`); `smoothPixelArt: true` só se sprites giram/escalam (changelog 4.0). Valide com screenshot ampliado.
2. **Escolher a rota**:

   | Necessidade | Rota |
   |---|---|
   | Personagem com rotações/esqueleto, muitos sprites | PixelLab (MCP ou app) |
   | Lote esporádico, tiles, custo por asset | Retro Diffusion (MCP) |
   | Retoque, paleta, tags de animação | Aseprite + `pixel-mcp` |
   | Já existe conceito HD aprovado | `scripts/requantizar_pixel.py` + Aseprite (pior rota) |
   | Variações baratas na estação GPU | FLUX.2 [klein] 4B (`/gerar-sprites-2d`, receita A) + requantizar — só para conceito |

3. **Prompt pixel-native** = prefixo do style card + "pixel art, <N>px canvas, <K>-color palette (#...), 1px dark outline, no anti-aliasing, no dithering [ou dithering ordenado], side view, transparent background". Generalistas não respeitam a grade ("sizes you don't control").
4. **Gerar** (PixelLab/Retro Diffusion via MCP, configurados no `.mcp.json` do projeto conforme o README de cada pacote). Retro Diffusion: `estimate_inference_cost` antes de lotes. Brutos em `./assets/brutos/<data>/<asset>/`.
5. **Requantizar quando a origem for generalista**:
   ```bash
   python3 .claude/skills/pixel-art-pipeline/scripts/requantizar_pixel.py assets/brutos/<data>/<asset>/var_00.png --grade 32 --metodo box --paleta design/paleta.txt --saida assets/brutos/<data>/<asset>/px_00.png
   ```
   O script apara, reduz para a grade, binariza o alfa e encaixa cada pixel na paleta. Ele remove ruído, não cria leitura: redesenhe silhueta e contorno no Aseprite.
6. **Verificar** (critérios de aceite, todos automáticos):
   ```bash
   python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py px_00.png --paleta design/paleta.txt --tolerancia 0 --max-fora 0
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py px_00.png --fundo "#<cor do cenário>" --reducao 2 --min-detalhe 0.2 --folha production/evidencias/<data>-pixel-<nome>/legibilidade.png
   python3 -c "from PIL import Image; im=Image.open('px_00.png'); print(im.size, sorted(set(im.getchannel('A').getdata())))"
   ```
   Dimensões = grade (ou múltiplo inteiro); alfa só {0, 255}; 0 % fora da paleta; contraste com o cenário ≥ 3:1.
7. **Rotações e esqueleto** (PixelLab): 4 ou 8 direções a partir do frontal aprovado; mesma altura de caixa de alfa em todas; esqueleto para `/animar-sprites`.
8. **Curadoria** em 1× e ampliado por inteiro: `python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py <pasta> --celula 192 --ampliar --saida production/evidencias/<data>-pixel-<nome>/contact-sheet.png`.
9. **Nomear e registrar** com `../gerar-sprites-2d/scripts/nomear_e_registrar.py` (`--ferramenta PixelLab|"Retro Diffusion RD Pro"|...`, `--licenca pixellab|retro-diffusion`, `--pos "requantizar_pixel grade 32 paleta v1"`, `--edicao-humana` com o que foi redesenhado; master `.aseprite` em `masters/sprites/`).
10. **Ver no jogo**: `bash scripts/verify.sh --feature <id>`; amplie o `screenshot.png` 4× (nearest) e confira pixels iguais, sem blur e sem gaps entre tiles → `production/evidencias/<data>-pixel-<nome>/no-jogo.png`.

## Critério de pronto e evidência

- [ ] Dimensões = grade (ou múltiplo inteiro); 0 % fora da paleta (`verificar_paleta.py --tolerancia 0`); alfa binário.
- [ ] Legibilidade: contraste ≥ 3:1 e silhueta IoU ≥ 0,80 a 1/2 (`verificar_legibilidade.py --reducao 2`).
- [ ] Folha de contato 1× e ampliada; aprovação humana anotada.
- [ ] `no-jogo.png` sem blur, sem pixels de tamanhos diferentes, sem gaps entre tiles; `pixelArt: true` na config.
- [ ] `PROVENANCE.md` com ferramenta, créditos gastos, prompt, edição humana e "licença: [confirmar]" se os termos não foram lidos.

## Armadilhas conhecidas

- **Generalistas em pixel art** saem em tamanho não controlado, com AA e cores fora da paleta; requantizar nunca recupera leitura de forma. Só para conceito.
- **Escala fracionária** (`Scale.FIT` com canvas @2x) cria pixels desiguais: fixe zoom inteiro (passo 1) ou aceite `smoothPixelArt`.
- **Filtro `Blocky` do Phaser 4** pixeliza preservando paleta — serve para pós retrô de uma cena HD, não para "virar" pixel art um sprite.
- **Vídeo→frames em pixel art** adiciona AA e deriva subpixel; anime com PixelLab/Retro Diffusion.
- **WebP com perda e `pngquant`** quebram a paleta: exporte PNG sem perda (`otimizar_imagens.py --sem-perda`).
- **Planos e preços** do PixelLab/Retro Diffusion vieram de agregadores e divergem; confira antes de assinar.
- **Aseprite** é pago; `pixel-mcp` e `pixel-plugin` são de terceiros — leia licença e README.

## Exportar para Phaser (web mobile)

Exporte na grade (1×; o zoom inteiro do Phaser faz a ampliação) em atlas por escala com `empacotar_atlas.py --padding 2 --extrude 1 --sem-trim` (trim desloca a grade; mantenha célula fixa) ou sprite sheet em grade (`this.load.spritesheet(key, png, { frameWidth, frameHeight })`); tiles com `extrudir_tiles.py`. Config: `render: { pixelArt: true }` (+ `smoothPixelArt` se girar), `scale` com zoom inteiro (passo 1). PNG sem perda sempre; nada de WebP com perda. Memória irrelevante (atlas 512² RGBA8 = 1 MB). **Licença de saída**: confirmar termos do PixelLab/Retro Diffusion hospedado; Aseprite não restringe o que você desenha.

## Fontes

- Phaser 4 `Config.js` (`pixelArt` desliga antialias e liga `roundPixels`; `smoothPixelArt`), `ScaleManager` (`zoom`, `MAX_ZOOM`/`getMaxZoom`), filtro `Blocky` (changelog 4.0) — https://github.com/phaserjs/phaser (fonte, 2026-10-10)
- Generalistas vs. pixel-native; PixelLab e Retro Diffusion — https://app.cinevva.com/guides/ai-pixel-art-generators [secundário]
- PixelLab esqueleto, canvas 16–128 — https://www.pixellab.ai/docs/tools/skeleton-animation ; MCP `pixellab-mcp` 1.1.0 — https://app.unpkg.com/pixellab-mcp@1.1.0/files/README.md ; preços/termos (resenhas divergentes) — https://knowara.com/ai-tools/image/pixellab-review/ ; https://ai.g2.com/marketplace/tools/pixellab [secundário]
- Retro Diffusion MCP e preços — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp ; modelo baixável ≠ hospedado — https://astropulse.gumroad.com/l/RetroDiffusionModel [secundário]
- Aseprite EULA e `pixel-mcp` — https://github.com/aseprite/aseprite/blob/main/EULA.txt ; https://pkg.go.dev/github.com/willibrandon/pixel-mcp
- Tiled (GPL editor, libtiled BSD) — https://github.com/mapeditor/tiled ; Sprite Fusion — https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser [secundário]
- Legibilidade em pixel art (4–8 cores em 16×16, silhueta, teste de cinza) — https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art ; https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly [secundário]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ1, KQ2, KQ6); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
