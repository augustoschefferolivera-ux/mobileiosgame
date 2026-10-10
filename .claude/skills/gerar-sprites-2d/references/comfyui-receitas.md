# Receitas ComfyUI para sprites na estação GPU (RTX 5060, 8 GB)

Tudo abaixo foi lido na documentação oficial do ComfyUI (repositório `Comfy-Org/docs`) e nos templates oficiais
(`Comfy-Org/workflow_templates`, 2026-10-10). Os arquivos `assets/*_api.json` desta skill foram **reconstruídos**
a partir dos nós desses templates no formato API (File → Export Workflow (API)); os nomes dos inputs são os dos nós
core — confirme com `comfyui_lote.py --validar`, que consulta `GET /object_info/<class_type>` antes de enviar.

## Como chamar (de qualquer skill)

```bash
G=.claude/skills/estacao-gpu-remota/scripts/gpu.sh
bash $G tunnel 8188            # opcional: ComfyUI em http://localhost:8188 via SSH; ou use o IP Tailscale
python3 .claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py \
  --workflow .claude/skills/gerar-sprites-2d/assets/flux2_klein_4b_t2i_api.json \
  --server http://gamer-pc:8188 --out assets/brutos/<data>/<asset> \
  --prompt-arquivo prompts/sprites/<asset>.txt --seeds 1,2,3,4 --validar --prefix <asset>_
```
Rotas usadas: `POST /upload/image` (referência), `POST /prompt`, `GET /history/<id>`, `GET /view`,
`GET /object_info/<class>` (doc "ComfyUI Server API routes"). `lote.json` registra seed → arquivo para o `PROVENANCE.md`.

## Receita A — texto→imagem local com FLUX.2 [klein] 4B (Apache 2.0)

Arquivo: `assets/flux2_klein_4b_t2i_api.json` (do template oficial `image_flux2_klein_text_to_image`).
Nós: `UNETLoader` (`flux-2-klein-base-4b-fp8.safetensors`, `weight_dtype: default`) → `CFGGuider` (cfg 5) ←
`CLIPTextEncode` ×2 (positivo, negativo vazio) ← `CLIPLoader` (`qwen_3_4b.safetensors`, `type: flux2`);
`EmptyFlux2LatentImage` (múltiplos de 16) + `Flux2Scheduler` (20 passos) + `KSamplerSelect` (euler) + `RandomNoise`
→ `SamplerCustomAdvanced` → `VAEDecode` (`flux2-vae.safetensors`) → `SaveImage`.
Modelos (pastas `models/diffusion_models`, `text_encoders`, `vae`): links no guia "ComfyUI Flux.2 Klein 4B Guide".
Variante distilled (4 passos, cfg 1, negativo via `ConditioningZeroOut`): `--set 70.inputs.unet_name=flux-2-klein-4b-fp8.safetensors --set 62.inputs.steps=4 --set 63.inputs.cfg=1`.
**VRAM (doc oficial, RTX 5090):** distilled ≈ 1,2 s e 8,4 GB; base ≈ 17 s e 9,2 GB. Em 8 GB é apertado: use o
fp8 com offload automático do ComfyUI ou GGUF Q4_K_M (≈ 2,6 GB) via custom node `ComfyUI-GGUF` (marcado WIP)
[secundário: guias PromptZone/EastonDev 2026]. Meça com `gpu.sh status` durante o job.
Transparência: o klein não emite alfa; gere em fundo branco liso e recorte (Receita B).

## Receita B — recorte BiRefNet (MIT) no ComfyUI

Arquivo: `assets/birefnet_recorte_api.json` (do template oficial `utility_birefnet_remove_background`, 2026-05-10).
`LoadImage` → `LoadBackgroundRemovalModel` (`birefnet.safetensors`, pesos em Hugging Face `Comfy-Org/BiRefNet`) →
`RemoveBackground` → `InvertMask` → `JoinImageWithAlpha` → `SaveImage` (PNG RGBA).
```bash
python3 .claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py --workflow .claude/skills/gerar-sprites-2d/assets/birefnet_recorte_api.json \
  --server http://gamer-pc:8188 --upload assets/brutos/<data>/<asset>/var_00.png --out assets/brutos/<data>/<asset>/recortes --n 1
```
Alternativa sem ComfyUI: `scripts/remove_bg.py --modelo birefnet-general` (rembg). **Atenção:** o modelo padrão
atual do rembg é `bria-rmbg`, cujo peso exige acordo pago para uso comercial (README do rembg); passe sempre
`-m birefnet-general` (ou `isnet-anime` para arte estilizada).

## Receita C — edição com referência (consistência sem LoRA)

Arquivo: `.claude/skills/consistencia-com-lora/assets/flux2_klein_4b_edit_referencia_api.json` (do template
`image_flux2_klein_image_edit_4b_base`): a referência passa por `ImageScaleToTotalPixels` (1 MP) → `VAEEncode` →
`ReferenceLatent` no positivo e no negativo; tamanho do latente copiado de `GetImageSize`. Use a folha de referência
do personagem como imagem e peça a nova pose no texto. Multi-referência (2 imagens) existe no template 9B; o 9B é
não comercial para servir (irrelevante aqui: é produção, não runtime) mas pesa > 8 GB.

## Receita D — sprite sheet com Nano Banana Pro (nó parceiro, créditos Comfy)

Arquivo: `.claude/skills/animar-sprites/assets/sprite_sheet_nano_banana_pro_api.json` — núcleo do template oficial
"Sprite Sheet Generator" (2026-02-05): `LoadImage` → `GeminiImage2Node` (`gemini-3-pro-image-preview`, `2K`,
`aspect_ratio 1:1`, `response_modalities IMAGE`, seed fixa) → `SaveImage`. O template completo gera 4 ações
(idle, walk, attack, jump) em grades 2×2 sobre **chroma verde #00FF00**, recorta cada quadrante com inset de 16 px
(`ImageCrop` + `SimpleMath+ "(a-2*b)/2"`), converte o verde em alfa (`ColorToMask`), monta vídeo de prévia e usa os
custom nodes `comfyui-kjnodes`, `comfyui_essentials`, `comfyui_layerstyle`. Aqui o pós fica em Python:
`chroma_para_alfa.py` + `slice_spritesheet.py fatiar --colunas 2 --linhas 2`.
`GeminiImage2Node` aceita até 14 imagens de referência (via `BatchImagesNode`); seed é "best effort".

## Receita E — reskin por estilo (template "Game Asset Style Transfer Sprite Generator", 2026-03-06)

Dois `LoadImage` (contorno/sprite de referência + imagem do estilo) → `BatchImagesNode` → `GeminiImage2Node` com
prompt "strictly preserve the composition and outline of image 1. Reskin image 1 as <objeto> and restyle into the
style of image 2. Black background" → `RecraftRemoveBackgroundNode` (nó parceiro) → `SaveImage`. Útil para
converter props de placeholder no estilo do jogo mantendo a silhueta. Exporte você mesmo em formato API.

## O que não fazer

- Não use o template "Remove Background: Qwen Image 2.1" para assets comerciais: a licença do Qwen-Image-2.1 foi
  reportada como de pesquisa/não comercial (fonte única, não verificada) — `LICENCAS.md` lista vermelha.
- Não sirva nada disso em runtime no jogo: é pipeline de produção; o build só recebe PNG/WebP + JSON.
- Não dependa de regenerar: brutos aprovados vão para `assets/brutos/` e o master editado para `masters/`.
