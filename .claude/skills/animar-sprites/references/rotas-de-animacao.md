# Rotas de animação: prompts, nós, custos e critérios

## Rota A — ComfyUI "Sprite Sheet Generator" (Nano Banana Pro)

Template oficial (comfy.org): recebe **um** sprite e devolve frames de idle, attack, walk e jump. Nós: `LoadImage` → `GeminiImage2Node` (Nano Banana Pro, exige chave Gemini configurada no ComfyUI) → `BatchImagesNode`; segmentação de frames via `PrimitiveInt`/`PrimitiveNode`. Dependências: custom nodes `comfyui-kjnodes` e `comfyui_layerstyle`. Instale via ComfyUI Manager e confira o README de cada nó (licenças de terceiros).

Prompt por ação (cole após o prefixo do style card):

```
Sprite sheet of the SAME character from the reference image: <ação>, <N> frames in a single row,
evenly spaced grid, each frame the same size, all frames aligned on the same baseline (feet at the same y),
keep lighting consistent, match exact character proportions and colors, side view facing right,
plain white background (or transparent), no text, no labels, no numbers.
```

Ações e frames típicos: idle 4 (respiração sutil), walk 6–8 (contato → passagem), run 6–8, attack 4–6 (antecipação, golpe, recuperação), jump 3–5 (agachar, subir, ápice, descer, pouso), hit 2–3, death 4–6.

Depois: `slice_spritesheet.py fatiar` com `--preview`; se a IA desenhou molduras ou números, recorte com `--margem/--espaco` ou refaça pedindo "no frame borders".

## Rota B — Pixel-native

- **PixelLab**: estimar esqueleto do sprite-base (dentro do Aseprite), ajustar o template, inserir; esqueleto reaproveitável; 4/8 direções. MCP `pixellab-mcp` (rotação, estimativa de esqueleto).
- **Retro Diffusion**: animações pagas por item (US$ 0,07–0,25 reportados); use `estimate_inference_cost` antes.
- **Ludo.ai Sprite Generator**: parte de um PNG transparente, 30 presets de walk, escolha de ângulo/direção, Max Frames 4/9/16/25/36/49/64, trim de início/fim para fechar loop; preço por créditos sem lista verificada.
- Saída já na grade: só `montar --alinhar-baseline` e requantizar se necessário.

## Rota C — Imagem→vídeo→frames

Modelos vivos em 2026: Kling 3.0 (fev/2026; Motion Control 08/03/2026 transfere movimento de um vídeo de referência para a imagem do personagem), Veo 3.1 (Veo 3 desligado em 30/06/2026), Wan 2.6 (multi-shot, 1080p), Runway Gen-4.5 (dez/2025). Sora 2: app encerrado 26/04/2026, API até 24/09/2026 — fora.

Prompt de vídeo:

```
<personagem da imagem> performing a <ação> cycle in place, side view, static camera, no camera motion,
plain flat <cor> background, full body always fully in frame, consistent lighting, loopable, 2 seconds.
```

Pipeline: `ffmpeg -i clip.mp4 -vf fps=12 f_%03d.png` → `remove_bg.py --aparar` → escolher poses-chave → `montar --alinhar-baseline`. Em vídeo o personagem "deriva" (muda de tamanho); normalize a altura da caixa de alfa (reescale frames com desvio > 3%) antes de montar, ou rejeite o clipe. Não use para pixel art.

Sem comparação independente entre Kling/Veo/Wan/Runway em critérios de sprite (fundo, loop, consistência) — teste 1 clipe em cada antes de escolher.

## Rota D — Rig esquelético

- Spine: Esoteric Software diz que auto-rig não está no roadmap; rigging manual. Spine Runtimes exigem licença do Spine [confirmar termos].
- `spine-animation-ai` (GenielabsOpenSource): posiciona partes por SIFT+RANSAC, gera esqueleto JSON e ciclos; **PolyForm Noncommercial** → só para estudo.
- Layer.ai "Create Spine components": separa a arte em partes; "não substitui rigging manual"; melhor com personagens frontais e membros separados.
- DragonBones: editor gratuito; nenhuma ferramenta de IA encontrada.
- Produção de partes com IA: gere cada parte isolada com a folha de referência (`/gerar-sprites-2d`), mesma luz e contorno; monte no editor; exporte atlas + JSON para o runtime (SpriteKit via runtime spine-ios/Unity/Godot/Phaser).

## Critérios de aceitação de uma animação

1. Célula uniforme; baseline estável (≤ 2 px HD; 0 px pixel art).
2. Loop sem "pulo" em 10 repetições.
3. Luz e paleta iguais em todos os frames (`verificar_paleta.py` em cada frame se a paleta é fechada).
4. Silhueta legível em 64 px em todos os frames.
5. Duração por frame definida no engine (não na imagem); registre fps alvo no `PROVENANCE.md`.
