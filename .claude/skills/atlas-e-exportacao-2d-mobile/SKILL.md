---
name: atlas-e-exportacao-2d-mobile
description: >
  Empacota sprites, UI e tiles em atlases e exporta para iOS/mobile: agrupamento por configuração de
  compressão (Unity SpriteAtlas via skill oficial manage-sprite-atlas, limite legado 2048²; pastas
  .spriteatlas no SpriteKit; TexturePacker/free-tex-packer para Phaser/Godot com JSON hash/array),
  ASTC vs PVRTC, orçamento de memória em KB por tela, alfa pré-multiplicado, nine-slice, @1x/@2x/@3x.
  Use sempre que assets 2D estiverem prontos para entrar no build, quando a memória de textura
  estourar, quando houver halos escuros ou sangramento entre sprites, ou quando o usuário disser
  "atlas", "sprite sheet para o engine", "compressão de textura", "KB por tela".
  Não use para gerar os assets (/gerar-sprites-2d, /ui-hud-e-icones, /cenarios-e-tilesets).
license: MIT
compatibility: "Claude Code ou Codex; Xcode para SpriteKit; Unity Editor para SpriteAtlas; Python 3.10+ para o estimador"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [6, 8]
argument-hint: "[engine] [pasta-de-assets] [cena]"
disable-model-invocation: false
user-invocable: true
---

# Atlas e exportação 2D para mobile

Entrega atlases por cena/compressão em `./assets/atlas/` (PNG + JSON, ou `.spriteatlas`/`SpriteAtlas` do engine), um orçamento de textura por tela em `design/orcamento-texturas.md` e a prova de que o jogo roda dentro dele; a evidência é o screenshot do jogo + a medição de memória do engine na pasta de evidências.

## Quando usar / quando não usar

- **Use** ao fechar a fase 6 (todos os assets de uma cena prontos) e na fase 8 quando a memória, o tempo de carregamento ou o tamanho do IPA estourarem.
- **Use** para corrigir halos escuros nas bordas (alfa pré-multiplicado) e linhas entre tiles (sangramento de atlas).
- **Não use** para criar arte, nem para o `.ipa` em si (`/submissao-app-store`).

## Pré-requisitos

- Assets finais nomeados e registrados (`./assets/sprites`, `./assets/ui`, `./assets/tiles`, `./assets/backgrounds`); art bible seção 7 (resolução-base, fator @3x) e 13 (limites).
- Por engine: Unity 6.3 com o `unity-agent-plugin` (skill oficial `manage-sprite-atlas`: SpriteAtlas V2, prebuild, overrides por plataforma — invoque-a, não reescreva); Xcode para SpriteKit (asset catalog com pastas `.spriteatlas`); Godot 4.x; Phaser 3.60+ [confirmar]. Empacotadores externos: TexturePacker (CodeAndWeb, pago, CLI) ou `free-tex-packer` (código aberto) [secundário, confirmar licença] — ambos exportam JSON hash/array lido pelo Phaser.
- `python3 -m pip install Pillow` para `scripts/estimar_memoria_atlas.py`.
- Sem custo de IA nesta skill. **Licença**: nenhuma nova; herda a dos assets.

## Entradas

1. Lista de cenas/telas e quais assets cada uma carrega (do `feature_list.json`).
2. Dispositivo mínimo suportado e seu orçamento de memória (defina um teto por tela em MB de texturas GPU; valide no Xcode/Unity Profiler — não há número universal).
3. Estilo: pixel art (sem compressão com perda, filtro nearest) ou HD (ASTC).

## Passos

1. **Agrupar por cena e por configuração de compressão.** Um atlas junta sprites que são carregados juntos **e** querem a mesma compressão/filtro: UI nítida separada de sprites de jogo; pixel art separada de HD; fundos grandes fora de atlas. Regra do Unity: o SpritePacker agrupa sprites com configurações de compressão idênticas no mesmo atlas; o máximo legado é 2048×2048; a compressão é adiada para o atlas (não a fonte).
2. **Estimar antes de empacotar**:
   ```bash
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/estimar_memoria_atlas.py --pasta assets/sprites/cena_floresta --formato astc6x6 --atlas 2048
   python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/estimar_memoria_atlas.py --largura 2048 --altura 2048 --formatos rgba32,astc4x4,astc6x6,pvrtc4
   ```
   Referência: 2048² RGBA32 = 16 MB; ASTC 4x4 = 4 MB; ASTC 6x6 ≈ 3,6 MB... (o script imprime; conferência clássica: 256² PVRTC 4 bpp = 32 KB). Escreva o total por tela em `design/orcamento-texturas.md`. Leia `references/formatos-e-orcamento.md` para a tabela de formatos e as regras de alfa/nine-slice.
3. **Escolher a compressão**: HD em iPhones modernos → **ASTC** (a Apple recomenda formatos comprimidos ASTC/BCn para texturas offline, "4–8× menores"; a skill oficial do Unity exemplifica iOS com `ASTC_6x6`); use 4x4 para UI/texto-like e 6x6/8x8 para sprites de jogo. **PVRTC** só para dispositivos antigos; um relato de fórum indica que atlases PVRTC não podem ser acessados em runtime enquanto ASTC/ETC2 permitem troca de textura [anedótico; inferência: prefira ASTC]. Pixel art → sem compressão com perda (RGBA32/RGBA16) + filtro nearest.
4. **Empacotar por engine** (detalhes em `references/formatos-e-orcamento.md`):
   - **Unity**: invoque `manage-sprite-atlas` (prebuild, V2, override iOS com formato ASTC e `maxTextureSize` 2048); Sprite Editor (skill `sprite-editor`) para bordas nine-slice; `2d-pixel-perfect` se for pixel art.
   - **SpriteKit**: crie pastas `nome.spriteatlas` no asset catalog com as imagens @2x/@3x; o Xcode empacota no build; carregue com `SKTextureAtlas(named:)` e `preload`. Compressão do catalog: atributo "Compression" do asset catalog (opções com GPU/ASTC) [confirmar na doc do Xcode].
   - **Godot 4**: importe PNGs com Compress Mode "VRAM Compressed" para HD (habilite ASTC/ETC2 para mobile em Project Settings → Rendering → Textures) ou "Lossless" para pixel art [confirmar na doc]; sprite sheets via `AtlasTexture`/`SpriteFrames`.
   - **Phaser**: TexturePacker ou free-tex-packer → `atlas.png` + `atlas.json` (hash ou array) → `this.load.atlas(...)`; texturas comprimidas (KTX/PVR com ASTC) via loader de texturas comprimidas do Phaser 3.60+ [confirmar].
   Padding 2 px e extrusão 1 px em todo atlas; `trim` ligado para sprites, desligado para frames de animação que precisam de célula fixa (ou use `spriteSourceSize` do JSON).
5. **Alfa pré-multiplicado**: halos escuros = PNG com alfa reto desenhado como pré-multiplicado ou vice-versa. SpriteKit/Metal e a maioria dos engines esperam pré-multiplicado na GPU; deixe o empacotador "premultiply alpha" (TexturePacker tem a opção) ou garanta que o engine converta ao importar; nunca "corrija" pintando a borda. Teste no xadrez e sobre fundo preto.
6. **Nine-slice**: molduras e botões levam bordas (l,t,r,b) registradas em `design/ui-mapa-de-nomes.md`; não podem ser rotacionadas no atlas (desligue "allow rotation" para UI) nem aparadas.
7. **Medir no dispositivo/simulador**: rode a cena, leia a memória de textura (Xcode Memory/Metal debugger, Unity Memory Profiler, Godot monitor), compare com `design/orcamento-texturas.md`; screenshot + leitura em `production/evidencias/<data>-atlas-<cena>/`. Se estourar: 6x6→8x8, reduzir fundos para @2x, dividir cena, descarregar atlases entre cenas.
8. **Registrar**: cada atlas ganha linha em `PROVENANCE.md` (`--modelo humano --pos "atlas <engine> ASTC 6x6; fontes: <lista>"`) — ele é derivado dos assets, mas o build o distribui.

## Critério de pronto e evidência

- [ ] `./assets/atlas/` (ou equivalente do engine) com atlases ≤ 2048² por cena/compressão; UI separada; pixel art sem compressão com perda.
- [ ] `design/orcamento-texturas.md` com estimativa por tela e a medição real; diferença explicada.
- [ ] `production/evidencias/<data>-atlas-<cena>/` com screenshot do jogo, leitura de memória e teste de halo (xadrez/preto).
- [ ] Nenhum sangramento entre tiles em movimento (vídeo curto ou 3 screenshots em posições diferentes).

## Armadilhas conhecidas

- **Comprimir a fonte em vez do atlas** (Unity): use packing tags/atlas para adiar a compressão ao atlas.
- **ASTC em pixel art** borra e cria cores fora da paleta; use RGBA32/16 + nearest.
- **Misturar UI e sprites** no mesmo atlas força a pior compressão para ambos.
- **Fundos @3x em RGBA32**: um fundo de tela cheia em iPhone @3x passa de 14 MB sem compressão; use ASTC e/ou @2x.
- **Rotação no atlas** quebra nine-slice e tiles; desligue para UI/tiles.
- **Documentação da Apple sobre `.spriteatlas` e tamanhos de bloco ASTC não foi lida** nesta pesquisa: confirme antes de fixar o padrão do projeto.

## Exportar para mobile

Esta skill **é** a exportação: PNG RGBA → atlases ≤ 2048² por cena, ASTC 4x4 (UI) / 6x6–8x8 (sprites) em iOS, RGBA32 + nearest em pixel art, @2x/@3x via asset catalog no SpriteKit, JSON hash/array para Phaser/Godot, bordas nine-slice declaradas, alfa pré-multiplicado tratado pelo empacotador, orçamento em MB por tela medido no dispositivo. **Licença de saída**: herdada dos assets registrados.

## Fontes

- Unity SpritePacker: agrupamento por compressão, limite legado 2048², compressão adiada ao atlas — https://docs.unity3d.com/Manual/SpritePacker.html ; https://docs.unity.cn/2019.3/Documentation/SpritePacker.html
- Unity iOS: 256² PVRTC 4 bpp = 32 KB — https://docs.unity3d.com/es/2019.3/Manual/class-TextureImporterIos.html
- Skill oficial `manage-sprite-atlas` (exemplo iOS com `TextureImporterFormat.ASTC_6x6`; Unity Companion License, não copiar) — https://github.com/Unity-Technologies/unity-agent-plugin
- Apple Game Porting Toolkit (Apache 2.0): "Always use compressed formats (ASTC or BCn) for offline textures — 4–8x size reduction" — https://github.com/apple/game-porting-toolkit
- PVRTC sem acesso em runtime vs. ASTC/ETC2 (fórum Spine, anedótico) — https://esotericsoftware.com/forum/d/9684
- Peças separadas e mapa de nomes — https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 [secundário]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ7, Gaps: SpriteKit/TexturePacker/ASTC não verificados).
