---
name: animar-sprites
description: >
  Produz animações de sprite 2D (idle, walk, attack, jump, hit, death) por uma de quatro rotas:
  sprite sheet com o template oficial "Sprite Sheet Generator" do ComfyUI (Nano Banana Pro),
  ferramentas pixel-native (PixelLab esqueleto/Retro Diffusion/Ludo), imagem→vídeo→frames
  (Kling 3.0, Veo 3.1, Wan 2.6, Runway Gen-4.5) ou rig esquelético (Spine/DragonBones). Fatia a
  sheet, valida a linha de base, exporta frames + JSON de atlas e registra tudo. Use sempre que o
  usuário pedir "animação", "ciclo de caminhada", "sprite sheet", "frames", "o personagem se mexer".
  Não use para o sprite estático-base (/gerar-sprites-2d ou /pixel-art-pipeline primeiro).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; ffmpeg para a rota de vídeo; ComfyUI opcional"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [6]
argument-hint: "[personagem] [acao idle|walk|attack|jump] [frames]"
disable-model-invocation: false
user-invocable: true
---

# Animar sprites

Entrega frames alinhados (`./assets/sprites/<chr>_<acao>_NN.png`), a sheet montada e o atlas JSON (`./assets/atlas/<chr>_<acao>.json`), com relatório de linha de base e preview em `production/evidencias/<data>-anim-<chr>-<acao>/`; pronto só quando a animação roda no jogo em vídeo/GIF de evidência.

## Quando usar / quando não usar

- **Use** quando existe sprite-base aprovado e registrado e o jogo precisa de ciclo (idle, walk, run, attack, jump, hit, death) ou de direções (4/8).
- **Use** para converter um vídeo gerado por IA em frames alinhados, ou para fatiar uma sheet que veio irregular.
- **Não use** para criar o personagem (`/gerar-sprites-2d`, `/pixel-art-pipeline`), nem para efeitos de partícula do engine (ficam no código).

## Pré-requisitos

- Sprite-base com alfa limpo e `./assets/referencias/chr_<nome>_sheet.png`; `design/style-card.md`.
- `python3 -m pip install Pillow`; `ffmpeg` no PATH para a rota C; ComfyUI com os custom nodes `comfyui-kjnodes` e `comfyui_layerstyle` + chave Gemini para a rota A.
- Conta/créditos conforme a rota (tabela abaixo). Leia `references/rotas-de-animacao.md` para prompts, nós e custos reportados [secundário].
- **Licença de saída**: Nano Banana Pro/Kling/Veo/Wan/Runway — termos comerciais não lidos ("confirmar" no PROVENANCE). `spine-animation-ai` é PolyForm Noncommercial: **não** usar em jogo comercial. Spine Runtimes exigem licença do Spine por quem edita [confirmar em esotericsoftware.com].

| Rota | Quando | Ferramenta | Saída |
|---|---|---|---|
| **A — Sheet em um disparo** | HD/pintado, poucos frames (4–8), rapidez | ComfyUI template "Sprite Sheet Generator" (nós `LoadImage` → `GeminiImage2Node` → `BatchImagesNode`), ou prompt direto no Nano Banana Pro | sheet PNG com grade (irregular: validar) |
| **B — Pixel-native** | pixel art; rotações; muitos ciclos | PixelLab (esqueleto no Aseprite; 4/8 direções; MCP), Retro Diffusion animações (US$ 0,07–0,25 [secundário]), Ludo.ai (30 presets de walk; 4–64 frames; trim de loop) | frames na grade |
| **C — Imagem→vídeo→frames** | HD com movimento fluido (12–24 fps) | Kling 3.0 (motion control desde 08/03/2026), Veo 3.1, Wan 2.6, Runway Gen-4.5; **Sora 2 encerrado** (API até 24/09/2026) | MP4 → frames → recorte → alinhamento |
| **D — Rig esquelético** | personagem com muitas ações; memória mínima no mobile | Spine (auto-rig não está no roadmap; rig manual), DragonBones (grátis; nenhuma ferramenta de IA encontrada); Layer "Create Spine components" ajuda a separar partes | atlas de partes + JSON de esqueleto |

## Entradas

1. Personagem, ação, nº de frames (walk: 4 para sprites pequenos, 6–8 para ≥ 32 px), fps alvo (pixel 8–12; HD 12–24), loop sim/não.
2. Vista e direções necessárias (seção 6 da bible); tamanho de célula (bbox máxima + margem).
3. Rota escolhida com a tabela acima; orçamento (nº de tentativas: 2–3 por ação).

## Passos

1. **Rota A (sheet).** No ComfyUI carregue o template oficial "Sprite Sheet Generator", `LoadImage` com o sprite-base; prompt por ação (modelo em `references/rotas-de-animacao.md`) sempre com "align all frames on the same baseline, keep lighting consistent, match exact character proportions, evenly spaced grid of <C>x<R>, transparent/plain white background, no text". Exporte PNG. Sem ComfyUI, mande o mesmo prompt + sprite-base ao Nano Banana Pro.
2. **Rota B (pixel).** PixelLab: estimar esqueleto → ajustar → animar; ou Retro Diffusion "animation"; ou Ludo com preset de walk e trim de loop. Exporte frames na grade. Pule para o passo 5 com `montar`.
3. **Rota C (vídeo).** Gere clipe de 2–4 s com fundo liso e câmera fixa ("static camera, plain flat background, full body always in frame, loopable"); extraia frames e recorte:
   ```bash
   ffmpeg -i clip.mp4 -vf fps=12 assets/brutos/<data>/<chr>_<acao>/f_%03d.png
   python3 .claude/skills/gerar-sprites-2d/scripts/remove_bg.py assets/brutos/<data>/<chr>_<acao> --saida assets/brutos/<data>/<chr>_<acao>/recortes --aparar --margem 4
   ```
   Escolha 6–12 frames com poses-chave (contato, passagem, alto, baixo) — não use todos; feche o loop fazendo o último frame ser a passagem antes do próximo contato.
4. **Rota D (rig).** Separe o personagem em partes (cabeça, tronco, braços, pernas) como PNGs transparentes — gere cada parte com `/gerar-sprites-2d` usando a folha de referência, ou use o template da Layer; monte o rig manualmente no Spine/DragonBones; exporte atlas + JSON para o runtime do engine. Não use `spine-animation-ai` (PolyForm NC).
5. **Fatiar e validar a baseline** (rotas A/C) ou **montar** (B/C):
   ```bash
   python3 .claude/skills/animar-sprites/scripts/slice_spritesheet.py fatiar sheet.png --colunas 6 --linhas 1 --saida assets/brutos/<data>/<chr>_<acao>/frames --prefixo chr_<nome>_<acao> --json assets/atlas/chr_<nome>_<acao>.json --tolerancia-baseline 2 --preview production/evidencias/<data>-anim-<chr>-<acao>/baseline.png
   python3 .claude/skills/animar-sprites/scripts/slice_spritesheet.py montar assets/brutos/<data>/<chr>_<acao>/recortes --colunas 8 --alinhar-baseline --prefixo chr_<nome>_<acao> --saida assets/sprites/chr_<nome>_<acao>_sheet.png --json assets/atlas/chr_<nome>_<acao>.json
   ```
   `fatiar` mede a caixa de alfa de cada frame e falha (código 2) se os pés variarem além da tolerância; `montar --alinhar-baseline` corrige frames soltos. Grade irregular da IA → ajuste `--margem/--espaco` ou refatie com `--frame-w/--frame-h`.
6. **Curadoria em movimento.** Monte um GIF/MP4 de teste (ffmpeg a partir dos frames) e a folha de contato; o humano aprova ritmo, loop e leitura. Pixel art: requantize cada frame (`/pixel-art-pipeline`) antes.
7. **Registrar** cada frame/sheet com `../gerar-sprites-2d/scripts/nomear_e_registrar.py` (modelo, rota, prompt, nº de tentativas, edição humana: frames escolhidos, retoques).
8. **Ver no jogo**: carregue o atlas no engine (abaixo), rode e grave vídeo/GIF em `production/evidencias/<data>-anim-<chr>-<acao>/no-jogo.gif`.

## Critério de pronto e evidência

- [ ] Frames com célula uniforme, alfa limpo, baseline dentro da tolerância (saída do `fatiar` salva como `baseline.txt` + `baseline.png`).
- [ ] `./assets/atlas/<chr>_<acao>.json` (hash ou array) que o engine lê; sheet ≤ 2048².
- [ ] GIF/MP4 de prévia aprovado por humano e `no-jogo.gif` do engine rodando.
- [ ] `PROVENANCE.md` com rota, modelo, prompt, tentativas e edição humana; "licença: confirmar" quando os termos não foram lidos.

## Armadilhas conhecidas

- **Grade irregular** é a fraqueza da rota A: nunca confie no espaçamento; valide sempre.
- **Vídeo em pixel art** gera AA e deriva subpixel — use rota B.
- **Sora 2 acabou; Veo 3 foi substituído pelo 3.1 (30/06/2026)**: não deixe pipeline dependente de regeneração; guarde frames finais no Git.
- **Spine**: auto-rig não existe; `spine-animation-ai` é não comercial; licença de runtime exige Spine licenciado [confirmar].
- **Loop quebrado**: frame 1 = contato; último = passagem; teste em loop 10× antes de aprovar.
- **Luz inconsistente entre frames** (rota A/C): peça "keep lighting consistent" e descarte frames com luz invertida.

## Exportar para mobile

Sheet ≤ 2048² (ou vários atlases por ação), frames aparados com célula comum, padding 2 px; ASTC em iOS via `/atlas-e-exportacao-2d-mobile`. Carregamento: SpriteKit → pasta `.spriteatlas` no asset catalog + `SKTextureAtlas(named:)` e `SKAction.animate(with:timePerFrame:)`; Unity → Sprite Editor (skill oficial `sprite-editor`) fatia a sheet e o Animator usa os sprites; Godot 4 → `SpriteFrames`/`AnimatedSprite2D` a partir da sheet; Phaser → `this.load.atlas(key, png, json)` + `this.anims.create(...)` com `generateFrameNames`. Rig (rota D) é o mais barato em memória (atlas pequeno, interpolação); sheets custam memória por frame. **Licença de saída**: registrar por rota; Spine Runtimes exigem licença.

## Fontes

- ComfyUI template "Sprite Sheet Generator" (nós, dependências) — https://comfy.org/workflows/templates-sprite_sheet-fe5600667e2c/ ; https://www.comfy.org/ja/templates/templates-sprite_sheet/
- Prompts "same baseline", PNG, verificar grade — https://rosebud.ai/blog/how-to-create-a-sprite-sheet-with-ai-using-google-gemini-and-nano-banana-easy-guide [secundário]
- Frames por ciclo, poses de contato/passagem — https://www.sprite-ai.art/blog/sprite-animation-frames ; https://www.sprite-ai.art/guides/how-to-animate-pixel-art [secundário, vendor]
- PixelLab esqueleto — https://www.pixellab.ai/docs/tools/skeleton-animation ; Ludo walk cycle — https://ludo.ai/docs/sprite-generator/walk-cycle ; Retro Diffusion preços — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp [secundário]
- Vídeo: Kling 3.0/motion control, Sora 2 encerrado, Runway Gen-4.5 — https://frameo.ai/blog/ai-video-model-updates/ ; Veo 3 → 3.1 — https://wavespeed.ai/blog/de/posts/veo-4-alternatives-2026/ ; Wan/Veo I2V — https://vercel.com/docs/ai-gateway/modalities/video-generation/image-to-video [secundário]
- Spine sem auto-rig — https://esotericsoftware.com/forum/d/24270-auto-rig-ai- ; spine-animation-ai (PolyForm NC) — https://github.com/GenielabsOpenSource/spine-animation-ai ; Layer "Create Spine components" — https://layer.ai/tools/layer--create-spine-components
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ3).
