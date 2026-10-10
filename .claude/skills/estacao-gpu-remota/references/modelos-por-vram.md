# O que cabe na GPU (referência rápida por VRAM)

Valores de VRAM vêm dos READMEs citados no relatório e nas notas (`research_notes/`); onde o
número não foi lido em fonte oficial está marcado [confirmar]. RTX 5060 desktop = 8 GB GDDR7;
RTX 5060 Ti = 8 ou 16 GB [confirmar o seu com `nvidia-smi`].

| Tarefa | Modelo (licença) | VRAM | Cabe em 8 GB? | Alternativa se não couber |
|---|---|---|---|---|
| Música com BPM/tom/stems | ACE-Step 1.5 (MIT) | < 4 GB | **sim** | — |
| Música/SFX variações | Stable Audio 3 Small 433M (Community License) | CPU ou GPU pequena | **sim** | — |
| Música mais longa | Stable Audio 3 Medium 1.4B | CUDA, poucos GB [confirmar] | **sim** | Lyria 3 (API) |
| Música Apache | DiffRhythm (Apache-2.0) | ≥ 8 GB com `--chunked` | limite | HeartMuLa na nuvem |
| Recorte de sprites | BiRefNet / ToonOut (MIT) | ~2–4 GB | **sim** | rembg em CPU |
| Imagem HD local | FLUX.2 [klein] 4B (Apache 2.0) | ~8 GB com fp8/GGUF [confirmar] | **apertado** | gpt-image-1.5 / Nano Banana Pro (API) |
| LoRA de estilo/personagem | treino FLUX.2 klein 4B | > 8 GB na prática [confirmar] | não (sem offload pesado) | fal (treinador FLUX.2) — ver `/consistencia-com-lora` |
| Voz pt-BR em lote | Kokoro-82M (Apache), Chatterbox (MIT), Qwen3-TTS (Apache) | 1–6 GB | **sim** | ElevenLabs/Fish (API) |
| 3D a partir de imagem | TripoSG (MIT) | ~8–12 GB [confirmar] | limite | Tripo/Meshy (API, plano pago) |
| 3D com PBR | TRELLIS.2-4B (MIT) | ≥ 24 GB | **não** | GPU de nuvem por hora ou Tripo/Meshy |
| 3D por partes | PartCrafter (MIT) | [confirmar] | ? | — |
| Texturizar malha | MV-Adapter, Material Anything | 10–14 GB | **não** | PBR do gerador (Tripo/Meshy) |
| Rigging | UniRig / SkinTokens (MIT), Puppeteer (Apache) | [confirmar] | provável | auto-rig Tripo/Meshy |
| Mundos / vídeo | HY-World, WorldPlay, Hunyuan-GameCraft | 24–72 GB | **não** (e licença territorial) | Marble (API) |
| LLM local para utilidades | Qwen3 8B 4-bit, Gemma 3 | 5–6 GB | **sim** | Haiku 5.5 (API) — Claude Code não usa modelos locais |
| Bake/decimate no Blender | Blender (OptiX) | qualquer | **sim** | CPU no Linux |

Regra prática para 8 GB: **áudio, voz, recorte e Blender rodam na estação; imagem HD e 3D ficam
nas APIs comerciais** (cuja licença de saída já é clara), e a GPU vira um acelerador de
pós-produção e de variações baratas. Com 16 GB, FLUX.2 klein local e TripoSG passam a valer.
