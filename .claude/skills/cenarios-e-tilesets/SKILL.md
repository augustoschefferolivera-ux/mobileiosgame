---
name: cenarios-e-tilesets
description: >
  Produz cenários 2D: tilesets em grade (tiles-base por bioma com IA, costura seamless verificada
  por script, autotile/rule tiles no engine — Unity create-tile-palette-or-rule-tiles, Godot
  TileMapLayer, Phaser tilemaps — editados em Sprite Fusion ou Tiled) e backgrounds em camadas para
  parallax (céu/meio/frente gerados separadamente com transparência), com prompts por bioma a partir
  do style card. Use sempre que o usuário pedir "cenário", "fundo", "fase", "mapa", "tiles",
  "chão/parede", "parallax", "bioma". Não use para sprites de personagem/prop (/gerar-sprites-2d)
  nem para o empacotamento final (/atlas-e-exportacao-2d-mobile).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; Sprite Fusion (navegador) ou Tiled"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [5, 6]
argument-hint: "[bioma] [tileset|background|ambos] [grade]"
disable-model-invocation: false
user-invocable: true
---

# Cenários e tilesets

Entrega, por bioma, um tileset em grade (`./assets/tiles/tileset_<bioma>.png` + regras de autotile no engine) e/ou camadas de background (`./assets/backgrounds/bg_<bioma>_{ceu,meio,frente}.png`) com costura verificada; a evidência é o preview 3×3 de cada tile, a prévia de parallax e o screenshot da fase rodando.

## Quando usar / quando não usar

- **Use** quando a fase/mapa precisa de chão, paredes, plataformas, decoração repetível (tiles) ou de fundo em profundidade (parallax).
- **Use** para transformar um conceito de cenário em camadas separadas com transparência.
- **Não use** para props únicos (`/gerar-sprites-2d`), para tiles pixel-native em si (`/pixel-art-pipeline` gera os tiles-base; esta skill cuida da costura, autotile e mapa) ou para empacotar (`/atlas-e-exportacao-2d-mobile`).

## Pré-requisitos

- `design/art-bible.md` seções 6 (câmera), 7 (grade/tile em px) e 9 (biomas), `design/style-card.md`, `design/paleta.txt`.
- Geração: gpt-image-1.5 (alfa nativa para camadas meio/frente), Nano Banana Pro para coerência com o moodboard; tiles pixel: Retro Diffusion "tileset" (≈ US$ 0,10 [secundário]) ou PixelLab; requantização via `/pixel-art-pipeline`.
- Editor de mapa: **Sprite Fusion** (gratuito no navegador; autotiling; exporta Unity, Godot, GB Studio, PNG, JSON; desktop US$ 12 [secundário]) ou **Tiled** (gratuito; TMX/JSON) [licença do editor não lida; os mapas são seus].
- Engine: Unity → skill oficial `create-tile-palette-or-rule-tiles` (paleta e RuleTile; invoque, não reescreva); Godot 4.3+ → `TileMapLayer` + terrain sets, tools `tilemap_manage`/`tileset_manage` do Godot AI (MIT); Phaser → `this.make.tilemap` com JSON do Tiled [confirmar formatos aceitos pelo Sprite Fusion para Phaser].
- `python3 -m pip install Pillow` para `scripts/verificar_seamless.py`.
- **Licença de saída**: termos dos geradores não lidos → "confirmar" em `PROVENANCE.md`.

## Entradas

1. Bioma(s) e, para cada um, temperatura de cor, densidade de props e 3 elementos narrativos (bible seção 9).
2. Tamanho do tile (16/32/64 px @1x), vista (lateral/top-down/isométrica) e lista mínima de tiles: chão, chão-borda (esq/dir/topo/base/cantos internos e externos), parede, plataforma, 3–5 decorações; para top-down, o conjunto de transições (terrain) para autotile.
3. Resolução lógica da tela e nº de camadas de parallax (2–4; mobile ≤ 4).

## Passos

1. **Prompts por bioma** a partir do style card: leia `references/prompts-por-bioma.md` (modelos para tile-base, borda, decoração e cada camada de fundo). Regra fixa: tiles em vista ortográfica, sem perspectiva, iluminação uniforme (sem luz direcional forte — tiles repetem), "seamless tileable, edges match exactly".
2. **Tiles-base.** HD: gpt-image-1.5 em 512–1024 px por tile-base (reduzir depois com Lanczos para a grade × @3x); pixel: Retro Diffusion/PixelLab direto na grade. 2–4 variações do mesmo tile para quebrar repetição. Brutos em `./assets/brutos/<data>/tiles_<bioma>/`.
3. **Verificar costura** (todo tile que repete; camadas de fundo só no eixo h):
   ```bash
   python3 .claude/skills/cenarios-e-tilesets/scripts/verificar_seamless.py assets/brutos/<data>/tiles_<bioma>/grama_00.png --eixos hv --max-diff 12 --preview production/evidencias/<data>-tiles-<bioma>/grama_00_3x3.png
   python3 .claude/skills/cenarios-e-tilesets/scripts/verificar_seamless.py assets/backgrounds/bg_<bioma>_meio.png --eixos h --preview production/evidencias/<data>-bg-<bioma>/meio_3x1.png
   ```
   Falhou (código 2)? Corrija: (a) peça edição ao modelo com a imagem deslocada em meia largura (wrap) e máscara na emenda (edição com máscara em gpt-image-1.5 — confirme a API de edição), (b) espelhe o tile (só decoração), (c) retoque no Aseprite/Krita. Repita até passar e olhe o preview: a métrica não vê padrões "de mesa de xadrez".
4. **Montar o tileset** em grade regular (Pillow ou `../animar-sprites/scripts/slice_spritesheet.py montar --celula WxH --espaco 0`), tiles de borda em posição previsível (documente a ordem em `./assets/tiles/tileset_<bioma>.md`), extrusão de 1 px por tile se o engine não fizer (evita linhas entre tiles em @3x). Pixel art: `verificar_paleta.py --tolerancia 0`.
5. **Autotile no engine**: Unity → `create-tile-palette-or-rule-tiles` com os sprites de borda; Godot → `TileSet` com terrain set (autotile por bitmask) e `TileMapLayer`; Phaser → mapa do Tiled/Sprite Fusion (JSON) + `createLayer`. Pinte um mapa de teste de 20×12 tiles com todas as transições; é esse mapa que vira evidência.
6. **Backgrounds em camadas.** Gere separadamente: `ceu` (opaco, 2× a largura da tela, horizontalmente seamless), `meio` (alfa nativo, silhuetas distantes), `frente` (alfa nativo, elementos próximos esparsos). Mesma luz/paleta do style card; nada de personagens. Reduza para @3x e @2x; verifique costura em h. Fatores de parallax sugeridos: céu 0,1–0,2; meio 0,4–0,6; frente 0,8–1,0 (ajuste no engine).
7. **Mapa com Sprite Fusion/Tiled**: importe o tileset, configure autotiling, pinte a fase; exporte para o engine (Unity/Godot/JSON). Guarde o projeto do editor em `design/mapas/<fase>.*` e o export em `./assets/mapas/`.
8. **Registrar** tileset, cada camada e o mapa em `PROVENANCE.md` (`--categoria tile|bg`, modelo, prompt, `--pos "seamless: wrap+edit; extrusão 1px"`), com a edição humana descrita.
9. **Ver no jogo**: fase de teste rodando com parallax em movimento; 3 screenshots em posições diferentes + vídeo curto em `production/evidencias/<data>-cenario-<bioma>/`. Linhas entre tiles ou "salto" no loop do fundo = voltar ao passo 3/4.

## Critério de pronto e evidência

- [ ] Todo tile repetível passa em `verificar_seamless.py` (h e v) e tem preview 3×3 aprovado por humano.
- [ ] `./assets/tiles/tileset_<bioma>.png` em grade regular + `tileset_<bioma>.md` com a ordem dos tiles; regras de autotile criadas no engine com mapa de teste pintado.
- [ ] Camadas `bg_<bioma>_{ceu,meio,frente}.png` com alfa correto, costura h verificada, @2x/@3x.
- [ ] `production/evidencias/<data>-cenario-<bioma>/` com previews, screenshots da fase e vídeo do parallax.
- [ ] `PROVENANCE.md` atualizado para tiles, camadas e mapa.

## Armadilhas conhecidas

- **"Seamless" no prompt não garante costura**: modelos acertam às vezes; meça sempre e corrija por edição com máscara ou retoque.
- **Luz direcional em tile** cria padrão visível ao repetir; peça iluminação plana e deixe a luz para a cena.
- **Camada de fundo RGBA32 @3x** é o maior gasto de memória do jogo: ASTC 8x8 e @2x para o céu (`/atlas-e-exportacao-2d-mobile`).
- **Mais de 4 camadas de tela cheia** custa fill-rate em @3x; prefira camadas estreitas/esparsas na frente.
- **Tiles de borda em ordem aleatória** inviabilizam o autotile: fixe a ordem no `.md` e no nome.
- **Sprite Fusion (modelo próprio de IA, WIP)** e integração Phaser: anúncio de ago/2026 — confirme antes de depender.
- **Isométrico** exige grade 2:1 e tiles com base em losango; não misture com tiles ortogonais do mesmo bioma.

## Exportar para mobile

Tileset ≤ 2048² por bioma (atlas de tiles sem rotação, extrusão 1 px, sem trim), ASTC 6x6 em HD ou RGBA32 + nearest em pixel art; backgrounds como texturas separadas (não em atlas) em ASTC 8x8, céu em @2x quando o blur é aceitável, meio/frente em @3x; largura das camadas 2× a tela para loop; mapas em JSON/TMX versionados em `./assets/mapas/`. Carregue por fase e descarregue ao sair (orçamento em `design/orcamento-texturas.md`). **Licença de saída**: por asset no `PROVENANCE.md`; Sprite Fusion/Tiled não restringem seus mapas [confirmar termos do Sprite Fusion].

## Fontes

- Sprite Fusion (gratuito, autotiling, exports Unity/Godot/GB Studio/PNG/JSON; desktop US$ 12; modelo de pixel art WIP) — https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser ; https://hugo-dz.itch.io/sprite-fusion ; https://gamefromscratch.com/sprite-fusion-easy-to-use-map-editor-with-godot-and-unity-support/ [secundário]
- Retro Diffusion tilesets ≈ US$ 0,10 — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp [secundário]
- gpt-image-1.5 alfa nativa — https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 [secundário]
- Unity `create-tile-palette-or-rule-tiles` (nome da skill oficial; Unity Companion License) — https://github.com/Unity-Technologies/unity-agent-plugin
- Godot AI tools `tilemap_manage`, `tileset_manage`, `theme_manage` (MIT) — https://github.com/hi-godot/godot-ai
- Unity SpritePacker (limites de atlas) — https://docs.unity3d.com/Manual/SpritePacker.html
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ2, KQ7).
