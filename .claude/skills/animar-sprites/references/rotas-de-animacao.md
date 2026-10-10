# Rotas de animação: prompts, nós, custos e integração com o Phaser 4

## Rota A — ComfyUI "Sprite Sheet Generator" (Nano Banana Pro) e a versão mínima em formato API

Template oficial `templates-sprite_sheet` (comfy.org, 2026-02-05; JSON lido em `Comfy-Org/workflow_templates`):
um `LoadImage` com o sprite-base alimenta **quatro** `GeminiImage2Node` (`gemini-3-pro-image-preview`, resolução
`2K`, seeds fixas 1–4, `aspect_ratio` 1:1 — 16:9 no ataque), um por ação (attack, jump, idle, walk). Cada prompt
pede **4 frames em grade 2×2 sobre chroma verde #00FF00**, "every element inside its quadrant, central point of
the character aligned with the central point of each quadrant", "no black borders between frames", "same
character design in all frames, character facing right", e descreve os 4 frames (walk: contato direito,
passagem, contato esquerdo, passagem; idle: respiração sutil; attack: antecipação, golpe, impacto, recuperação;
jump: agachar, subir, ápice, pouso). O pós no template: `ImageCrop` por quadrante com inset de 16 px
(`SimpleMath+ "(a-2*b)/2"`), `ColorToMask` para o verde, `ImageResizeKJv2`, composição com alfa, `RepeatImageBatch`
+ `CreateVideo` a 8 fps para prévia. Custom nodes: `comfyui-kjnodes`, `comfyui_essentials`, `comfyui_layerstyle`.
O nó Gemini é "parceiro" (cobra créditos da conta Comfy/Google) e aceita até 14 imagens de referência via
`BatchImagesNode`; seed é "best effort" (doc do nó).

Versão mínima desta skill (`assets/sprite_sheet_nano_banana_pro_api.json`): `LoadImage` → `GeminiImage2Node`
(walk) → `SaveImage`; o pós fica em Python, determinístico e versionado:

```bash
python3 .claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py --workflow .claude/skills/animar-sprites/assets/sprite_sheet_nano_banana_pro_api.json \
  --server http://gamer-pc:8188 --upload assets/sprites/chr_<nome>_idle.png --out assets/brutos/<data>/<chr>_walk --seeds 1,2,3 --validar
python3 .claude/skills/animar-sprites/scripts/chroma_para_alfa.py assets/brutos/<data>/<chr>_walk/s1_*.png --saida assets/brutos/<data>/<chr>_walk/sheet_alfa.png --despill
python3 .claude/skills/animar-sprites/scripts/slice_spritesheet.py fatiar assets/brutos/<data>/<chr>_walk/sheet_alfa.png --colunas 2 --linhas 2 --saida .../frames --prefixo chr_<nome>_walk --json assets/atlas/chr_<nome>_walk.json --tolerancia-baseline 2 --preview production/evidencias/<data>-anim-<chr>-walk/baseline.png
```
Troque a ação com `--set 142.inputs.prompt="<prompt>"` (prompts das 4 ações acima; cole o prefixo do style card
na primeira linha). Sem ComfyUI: mande o mesmo prompt + sprite-base à API Gemini e faça o mesmo pós.

Prompt-base (após o prefixo do style card):
```
Create a 4-frame <ação> sprite sheet of this character, in the exact art style, proportions and colors of the reference image.
Arrange the 4 frames in a 2x2 grid on a uniform chromakey green background (EXACTLY #00FF00, flat, no gradients, no shadows).
Every element of each frame fits inside its quadrant, character centered in each quadrant, all frames on the same baseline, same lighting.
No green on the subject. No black borders between frames. No text, no labels, no numbers. Character facing right.
Frame 1 (top-left): <pose>. Frame 2 (top-right): <pose>. Frame 3 (bottom-left): <pose>. Frame 4 (bottom-right): <pose>.
```
Frames por ciclo: idle 4 · walk 4 (pequeno) ou 6–8 (≥ 64 px) · run 6–8 · attack 4–6 · jump 3–5 · hit 2–3 · death 4–6.
Grade maior (3×2, 4×2) funciona, com mais deriva; valide sempre a baseline.

## Rota B — Pixel-native

- **PixelLab**: estimar esqueleto do sprite-base (dentro do Aseprite), ajustar o template, inserir; esqueleto
  reaproveitável; 4/8 direções. MCP `pixellab-mcp` (rotação, estimativa de esqueleto). Planos reportados por
  agregadores divergem (US$ 10–50/mês) [secundário].
- **Retro Diffusion**: animações pagas por item (US$ 0,07–0,25 reportados) [secundário]; `estimate_inference_cost` antes.
- **Ludo.ai Sprite Generator**: parte de um PNG transparente, presets de walk, 4–64 frames, trim de loop [secundário].
- Saída já na grade: `montar --alinhar-baseline` e `requantizar_pixel.py` por frame se vier com AA.

## Rota C — Imagem→vídeo→frames

Modelos vivos em 2026: Kling 3.0 (motion control desde 08/03/2026), Veo 3.1 (Veo 3 desligado em 30/06/2026),
Wan 2.6, Runway Gen-4.5; Sora 2 encerrado (API até 24/09/2026) [secundário].
```
<personagem da imagem> performing a <ação> cycle in place, side view, static camera, no camera motion,
plain flat <cor chroma> background, full body always fully in frame, consistent lighting, loopable, 2 seconds.
```
Pipeline: `ffmpeg -i clip.mp4 -vf fps=12 f_%03d.png` → `chroma_para_alfa.py` (fundo liso) ou `remove_bg.py
--modelo birefnet-general` → escolher 6–12 poses-chave → `montar --alinhar-baseline`. O personagem "deriva" de
tamanho: normalize a altura da caixa de alfa (reescale frames com desvio > 3 %) ou rejeite o clipe. Não use para
pixel art (adiciona AA e deriva subpixel).

## Rota D — Esqueleto: Spine (oficial para Phaser 4) ou rig de recorte com tweens (sem licença)

- **Spine**: runtime oficial `@esotericsoftware/spine-phaser-v4` (npm 4.3.13, 24/07/2026; `peerDependencies`
  `phaser ^4.2.1`; o Phaser 4 removeu os plug-ins Spine antigos e remete ao plug-in da Esoteric). Carregamento:
  `this.load.spineBinary('k-data', 'x.skel')` + `this.load.spineAtlas('k-atlas', 'x-pma.atlas')`;
  `this.add.spine(x, y, 'k-data', 'k-atlas')`; `obj.animationState.setAnimation(0, 'walk', true)`; plug-in de cena
  `{ key: 'spine.SpinePlugin', plugin: spine.SpinePlugin, mapping: 'spine' }` (exemplo do repositório).
  **Licença (Spine Runtimes License Agreement, 05/04/2025, e README do repositório):** integrar o runtime é
  grátis, mas para **distribuir** software que contém o runtime a quem não tem licença Spine é preciso ter uma
  licença do editor Spine no momento da integração; alternativamente cada usuário precisaria da própria licença.
  Ou seja: jogo publicado com Spine = comprar o Spine (preço na loja da Esoteric, não lido). O auto-rig não está no
  roadmap da Esoteric; `spine-animation-ai` é PolyForm Noncommercial (fora).
- **Rig de recorte ("cutout") nativo do Phaser**: separe o personagem em peças (cabeça, tronco, braços, pernas)
  geradas isoladas com a folha de referência (`/gerar-sprites-2d`, mesma luz e contorno), monte em um
  `Container` com pivôs nos pontos de articulação (`setOrigin`) e anime com `this.tweens.add`/`timeline`
  (rotação, escala, posição; `yoyo`, `repeat: -1`). Custo zero de licença e de memória (1 atlas pequeno),
  interpolação suave; limitação: sem deformação de malha; bom para idle, respiração, balanço, UI viva e
  personagens frontais. DragonBones: editor gratuito, sem ferramenta de IA encontrada; runtime para Phaser 4 não
  verificado.

## Frames vs esqueleto no mobile (regra de decisão)

| Critério | Frames (sheet/atlas) | Rig (Spine ou cutout) |
|---|---|---|
| Memória | cresce por frame (walk 8 frames × 128² @2x ≈ 0,5 MB RGBA8 por personagem; 6 ações ≈ 3 MB) | 1 atlas de peças (≈ 0,3 MB) |
| Fluidez | 8–12 fps aceita; 24 fps dobra a memória | interpolada |
| IA ajuda? | sim (rotas A–C) | só nas peças |
| Pixel art | ideal | mal (rotação quebra a grade) |
| Licença | nenhuma | Spine: licença do editor para distribuir; cutout: nenhuma |

## Phaser 4: carregar e tocar

```ts
// preload
this.load.atlas('heroi', 'assets/atlas/chr_heroi.png', 'assets/atlas/chr_heroi.json');
// create
this.anims.create({ key: 'heroi-walk', frames: this.anims.generateFrameNames('heroi', { prefix: 'chr_heroi_walk_', start: 0, end: 5, zeroPad: 2 }), frameRate: 10, repeat: -1 });
const h = this.add.sprite(x, y, 'heroi', 'chr_heroi_idle_00').setOrigin(0.5, 1); // pivô nos pés = baseline
h.play('heroi-walk');
```
`frameRate` mora no código, não na imagem; registre o fps alvo no `PROVENANCE.md`. Frames aparados pelo atlas
mantêm `spriteSourceSize` → a baseline não pula. Partículas (`this.add.particles(x, y, 'fx', { frame: 'fx_faisca', ... })`)
e filtros do Phaser 4 (`Glow`, `Blur`, `Shadow`, `Pixelate`) substituem muitos frames de VFX.

## Critérios de aceitação de uma animação

1. Célula uniforme; baseline estável (≤ 2 px HD; 0 px pixel art) — `fatiar` falha com código 2 acima da tolerância.
2. Loop sem "pulo" em 10 repetições (GIF de prévia + `no-jogo.gif`).
3. Luz e paleta iguais em todos os frames (`verificar_paleta.py` por frame se a paleta é fechada).
4. Silhueta legível a 1/4 em todos os frames (`verificar_legibilidade.py` nos frames).
5. Nenhum frame com chroma residual (`chroma_para_alfa.py` imprime a fração de fundo; < 20 % = suspeito).
