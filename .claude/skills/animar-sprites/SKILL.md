---
name: animar-sprites
description: >
  Produz animações de sprite 2D (idle, walk, attack, jump, hit, death) para Phaser 4 web mobile por uma
  de quatro rotas: sprite sheet com o template oficial "Sprite Sheet Generator" do ComfyUI (Nano Banana
  Pro, grade 2×2 em chroma verde) ou sua versão mínima em formato API, ferramentas pixel-native
  (PixelLab esqueleto/Retro Diffusion), imagem→vídeo→frames (Kling 3.0, Veo 3.1, Wan 2.6, Runway Gen-4.5)
  ou esqueleto (Spine oficial para Phaser 4, que exige licença do editor para distribuir, ou rig de recorte
  com tweens do próprio Phaser, sem licença). Converte chroma em alfa, fatia a sheet, valida a linha de
  base, exporta frames + JSON de atlas e registra tudo. Use sempre que o usuário pedir "animação", "ciclo
  de caminhada", "sprite sheet", "frames", "o personagem se mexer". Não use para o sprite estático-base
  (/gerar-sprites-2d ou /pixel-art-pipeline primeiro).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; ffmpeg para a rota de vídeo; ComfyUI na estação GPU opcional"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [6]
argument-hint: "[personagem] [acao idle|walk|attack|jump] [frames]"
disable-model-invocation: false
user-invocable: true
---

# Animar sprites

Entrega frames alinhados (`./assets/sprites/<chr>_<acao>_NN.png` ou sheet), o atlas JSON (`./assets/atlas/<chr>_<acao>.json`) e, para rigs, as peças + código de tween; relatório de baseline e GIF de prévia em `production/evidencias/<data>-anim-<chr>-<acao>/`; pronto só quando a animação roda no jogo em GIF/vídeo de evidência (`scripts/verify.sh`).

## Quando usar / quando não usar

- **Use** quando existe sprite-base aprovado e registrado e o jogo precisa de ciclo (idle, walk, run, attack, jump, hit, death) ou de direções (4/8).
- **Use** para converter um vídeo gerado por IA em frames alinhados, ou para fatiar uma sheet irregular.
- **Não use** para criar o personagem (`/gerar-sprites-2d`, `/pixel-art-pipeline`), nem para partículas e efeitos de shader (ficam no código: `this.add.particles`, filtros do Phaser 4).

## Pré-requisitos

- Sprite-base com alfa limpo, `./assets/referencias/chr_<nome>_sheet.png`, `design/style-card.md`.
- `python3 -m pip install Pillow`; `ffmpeg` para a rota C; para a rota A, ComfyUI na estação GPU (`/estacao-gpu-remota`) com os nós parceiros do Google habilitados (conta Comfy com créditos) — ou chamada direta à API Gemini.
- Rota D com Spine: `npm i @esotericsoftware/spine-phaser-v4` (4.3.13, `peerDependencies phaser ^4.2.1`) **e** licença do editor Spine (ver "Armadilhas"). Rota D com recorte: só Phaser.
- Leia `references/rotas-de-animacao.md` para prompts, nós, custos e código Phaser.
- **Licença de saída**: Nano Banana Pro/Kling/Veo/Wan/Runway — classe B, termos não lidos ("[confirmar]" no PROVENANCE). Spine Runtimes License (05/04/2025): distribuir software com o runtime exige licença Spine no momento da integração. `spine-animation-ai` é PolyForm Noncommercial: fora.

| Rota | Quando | Ferramenta | Saída |
|---|---|---|---|
| **A — Sheet em um disparo** | HD/pintado, 4–8 frames, rapidez | template oficial ComfyUI "Sprite Sheet Generator" (`GeminiImage2Node`, 2×2 em chroma #00FF00, 2K) ou `assets/sprite_sheet_nano_banana_pro_api.json` + pós em Python | sheet → frames |
| **B — Pixel-native** | pixel art; rotações; muitos ciclos | PixelLab (esqueleto, 4/8 direções, MCP), Retro Diffusion (US$ 0,07–0,25/animação [secundário]), Ludo.ai | frames na grade |
| **C — Imagem→vídeo→frames** | HD com movimento fluido | Kling 3.0, Veo 3.1, Wan 2.6, Runway Gen-4.5 (Sora 2 encerrado) | MP4 → frames → alfa → alinhamento |
| **D — Esqueleto** | personagem com muitas ações; memória mínima | Spine (`spine-phaser-v4`, licença do editor) ou rig de recorte com `Container` + tweens do Phaser | peças + código |

## Entradas

1. Personagem, ação, nº de frames (walk 4 para sprites ≤ 64 px; 6–8 para maiores), fps alvo (pixel 8–12; HD 10–12; só o `frameRate` do Phaser muda), loop sim/não.
2. Vista e direções (seção 6 da bible); célula (maior bbox + margem 2 px); tamanho @2x do sprite-base.
3. Rota e orçamento: 2–3 sheets por ação (rota A ≈ US$ 0,13–0,24 cada em 2K [secundário]); vídeo 1–2 clipes por ação.

## Passos

1. **Rota A (sheet).** Na estação: `comfyui_lote.py --workflow .claude/skills/animar-sprites/assets/sprite_sheet_nano_banana_pro_api.json --upload <sprite-base.png> --seeds 1,2,3 --validar` (prompt da ação via `--set 142.inputs.prompt="..."`, modelos em `references/rotas-de-animacao.md`). Depois converta o chroma e fatie:
   ```bash
   python3 .claude/skills/animar-sprites/scripts/chroma_para_alfa.py assets/brutos/<data>/<chr>_<acao>/s1_*.png --saida assets/brutos/<data>/<chr>_<acao>/sheet_alfa.png --despill
   python3 .claude/skills/animar-sprites/scripts/slice_spritesheet.py fatiar assets/brutos/<data>/<chr>_<acao>/sheet_alfa.png --colunas 2 --linhas 2 --saida assets/brutos/<data>/<chr>_<acao>/frames --prefixo chr_<nome>_<acao> --json assets/atlas/chr_<nome>_<acao>.json --tolerancia-baseline 2 --preview production/evidencias/<data>-anim-<chr>-<acao>/baseline.png
   ```
   `chroma_para_alfa.py` imprime a fração de fundo (< 20 % = o modelo ignorou o chroma: descarte). Sem ComfyUI, mesmo prompt + sprite-base na API Gemini.
2. **Rota B (pixel).** PixelLab: estimar esqueleto → ajustar → animar; ou Retro Diffusion "animation" (`estimate_inference_cost` antes); exporte frames na grade e pule ao passo 5 (`montar`). Requantize cada frame (`/pixel-art-pipeline`) se vier com AA.
3. **Rota C (vídeo).** Clipe de 2 s, câmera fixa, fundo chroma liso, "full body always in frame, loopable":
   ```bash
   ffmpeg -i clip.mp4 -vf fps=12 assets/brutos/<data>/<chr>_<acao>/f_%03d.png
   for f in assets/brutos/<data>/<chr>_<acao>/f_*.png; do python3 .claude/skills/animar-sprites/scripts/chroma_para_alfa.py "$f" --saida "${f%.png}_a.png" --aparar --margem 4 --despill; done
   ```
   Escolha 6–12 poses-chave (contato, passagem, alto, baixo); normalize a altura da caixa de alfa (desvio > 3 % = reescale ou rejeite); feche o loop com o último frame = passagem antes do próximo contato.
4. **Rota D (esqueleto).** Peças isoladas com `/gerar-sprites-2d` (mesma luz e contorno, folha anexada) → **recorte no Phaser**: `Container` com pivôs nas articulações e `this.tweens.add({ targets: braco, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' })`; ou **Spine** (rig manual no editor licenciado → `.skel` + `.atlas` → `this.load.spineBinary/spineAtlas` + `this.add.spine`). Código em `references/rotas-de-animacao.md`.
5. **Fatiar e validar a baseline** (A/C) ou **montar** (B/C):
   ```bash
   python3 .claude/skills/animar-sprites/scripts/slice_spritesheet.py montar assets/brutos/<data>/<chr>_<acao>/frames --colunas 8 --alinhar-baseline --prefixo chr_<nome>_<acao> --saida assets/sprites/chr_<nome>_<acao>_sheet.png --json assets/atlas/chr_<nome>_<acao>.json
   ```
   `fatiar` falha (código 2) se os pés variarem além da tolerância; `montar --alinhar-baseline` corrige frames soltos. Grade irregular → `--margem/--espaco` ou `--frame-w/--frame-h`.
6. **Curadoria em movimento.** GIF de teste (`ffmpeg -framerate 10 -i frames/chr_<nome>_<acao>_%02d.png -vf "scale=iw*2:ih*2:flags=neighbor" previa.gif`) + contact sheet + `verificar_legibilidade.py` nos frames (`--fundo <cenário>`). O humano aprova ritmo, loop (10 repetições) e leitura; frames com luz invertida ou proporção diferente são regenerados.
7. **Registrar** sheet/frames (ou peças) com `../gerar-sprites-2d/scripts/nomear_e_registrar.py` (`--ferramenta` = modelo/rota, `--seed` do `lote.json`, `--selecao "1 de 3 sheets"`, `--edicao-humana` = frames escolhidos e retoques, `--licenca` = id em `LICENCAS.md`, `--pos "chroma_para_alfa; fatiar 2x2; montar --alinhar-baseline"`).
8. **Ver no jogo**: atlas no `preload`, `this.anims.create` com `generateFrameNames`, `setOrigin(0.5, 1)` nos pés; `bash scripts/verify.sh --feature <id>` e grave `production/evidencias/<data>-anim-<chr>-<acao>/no-jogo.gif` (Playwright `recordVideo` ou screenshots sequenciais).

## Critério de pronto e evidência

- [ ] Frames com célula uniforme, alfa limpo (sem verde residual), baseline dentro da tolerância (saída do `fatiar` em `baseline.txt` + `baseline.png`).
- [ ] `./assets/atlas/<chr>_<acao>.json` lido pelo Phaser (`this.load.atlas`); sheet ≤ 2048².
- [ ] `previa.gif` aprovado por humano, `legibilidade.json` sem reprovação, e `no-jogo.gif` do jogo rodando.
- [ ] `PROVENANCE.md` com rota, modelo, seed, prompt, tentativas e edição humana; "[confirmar]" na licença quando os termos não foram lidos.

## Armadilhas conhecidas

- **Grade irregular** é a fraqueza da rota A: nunca confie no espaçamento; valide a baseline sempre. O template oficial recorta cada quadrante com inset de 16 px por isso.
- **Chroma no personagem**: o prompt proíbe verde no sujeito; se o herói é verde, troque a chave (`--chave "#FF00FF"` e peça magenta).
- **Vídeo em pixel art** gera AA e deriva subpixel — rota B.
- **Spine**: auto-rig não existe; `spine-animation-ai` é não comercial; distribuir o jogo com `spine-phaser-v4` exige licença do editor Spine (README e Spine Runtimes License) — orce isso antes de escolher a rota.
- **Phaser 4 removeu os plug-ins Spine antigos** (changelog 4.0): só o oficial da Esoteric.
- **Loop quebrado**: frame 1 = contato; último = passagem; teste 10× antes de aprovar.
- **Memória**: 6 ações × 8 frames × 256² @2x ≈ 12 MB RGBA8 por personagem; reduza frames (4–6) ou use recorte/Spine.
- **Luz inconsistente entre frames** (A/C): peça "same lighting" e descarte frames com luz invertida; não há retoque barato.

## Exportar para Phaser (web mobile)

Frames @2x aparados em atlas JSON hash (`/atlas-e-exportacao-2d-mobile`; `empacotar_atlas.py` com `--trim` mantém `spriteSourceSize` para a baseline), sheet ≤ 2048², padding 2 px; `this.load.atlas(key, png, json)` → `this.anims.create({ key, frames: this.anims.generateFrameNames(key, { prefix: 'chr_x_walk_', start: 0, end: 5, zeroPad: 2 }), frameRate: 10, repeat: -1 })`. Rig de recorte: um atlas de peças + tweens. Spine: `this.load.spineBinary/spineAtlas` com atlas PMA do exportador do Spine. **Licença de saída**: por rota; Spine exige licença do editor; cutout nenhuma.

## Fontes

- Template oficial "Sprite Sheet Generator" (nós, prompts 2×2 chroma #00FF00, inset 16 px, kjnodes/essentials/layerstyle) — https://comfy.org/workflows/templates-sprite_sheet-fe5600667e2c/ ; JSON em https://github.com/Comfy-Org/workflow_templates (lido em 2026-10-10)
- Nó `GeminiImage2Node` (até 14 refs, seed best effort, 1K/2K/4K) — https://github.com/Comfy-Org/docs (built-in-nodes/GeminiImage2Node)
- Spine Runtimes License (05/04/2025) e README ("you need a Spine license at the time of integration") — https://github.com/EsotericSoftware/spine-runtimes ; pacote `@esotericsoftware/spine-phaser-v4` 4.3.13 — https://www.npmjs.com/package/@esotericsoftware/spine-phaser-v4 ; anúncio — https://phaser.io/news/2025/04/spine-phaser-v4-runtime-released
- Phaser 4: remoção dos plug-ins Spine antigos, `TileSprite`/`SpriteGPULayer`, filtros — https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md
- Frames por ciclo, poses de contato/passagem — https://www.sprite-ai.art/blog/sprite-animation-frames [secundário]
- PixelLab esqueleto — https://www.pixellab.ai/docs/tools/skeleton-animation ; Ludo walk cycle — https://ludo.ai/docs/sprite-generator/walk-cycle ; Retro Diffusion preços — https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp [secundário]
- Vídeo: Kling 3.0, Sora 2 encerrado, Veo 3 → 3.1 — https://frameo.ai/blog/ai-video-model-updates/ ; https://wavespeed.ai/blog/de/posts/veo-4-alternatives-2026/ [secundário]
- Spine sem auto-rig — https://esotericsoftware.com/forum/d/24270-auto-rig-ai- ; spine-animation-ai (PolyForm NC) — https://github.com/GenielabsOpenSource/spine-animation-ai
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ3); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
