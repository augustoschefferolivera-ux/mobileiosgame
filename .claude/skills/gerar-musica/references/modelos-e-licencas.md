# Modelos de música: controles, hardware e licenças (estado em 10/10/2026)

Fonte principal: `research_notes/Criação de jogos totalmente por IA/audio_musica_sfx_voz.md` (Q1, Q5, Q6). Itens "[GitHub primário]" foram lidos no repositório oficial; "[secundário]" vieram de agregadores e devem ser confirmados antes de qualquer compra.

## Matriz de capacidades

| Modelo / serviço | Licença da saída | BPM/tom | Stems | Duração | Hardware | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| **ACE-Step 1.5** (XL 4B, 02/04/2026) | MIT [GitHub primário] | metadado explícito: duração, BPM, tom/escala, compasso | "Track Separation" nativo | 10 s–10 min | ≤6 GB VRAM (INT8+offload "<4 GB"), Apple Silicon MLX, ROCm, XPU, CPU | lotes de 8; LoRA com ~8 músicas em ~1 h (RTX 3090); extração de BPM/tom/caption; cover/repaint; <10 s por música em 3090 |
| **Stable Audio 3** Small-Music 433M / Medium 1.4B (20/05/2026) | código MIT; pesos Stability AI Community License (limiar reportado US$ 1 M/ano [secundário]) | só texto ("124 BPM") | não | Small 120 s; Medium 380 s | Small: CPU, MLX, CoreML, TFLite; Medium: CUDA + Flash Attention 2, 5–6,5 GB | inpainting/continuação, áudio-para-áudio, LoRA empilhável; 44,1 kHz estéreo; Large só por API |
| **HeartMuLa** 3B (jan/2026) | Apache-2.0 repo e pesos [GitHub primário] | não documentado | não documentado | até 240 s por padrão | GPU; RTF ≈ 1,0 | letras + tags; 7B não lançado |
| **DiffRhythm** | Apache-2.0 [GitHub primário] | não documentado | não | 95–285 s | ≥8 GB VRAM com `--chunked` | alternativa Apache |
| **Lyria 3** / 3 Pro / 3.5 (Gemini API) | termos Gemini API; SynthID em toda saída | não exposto na API (BPM/densidade/escala só no RealTime) | não | clip 30 s / Pro ~3 min | nuvem | ≈US$ 0,04 por clipe de 30 s; ≈US$ 0,08 por música [secundário] |
| **Eleven Music** v2/v2.5 | self-serve exclui "film, TV, radio, & Studio Games"; Enterprise cobre games | só texto; `composition_plan` com seções e durações forçadas | `separate_stems()` oficial | 3 s–10 min | nuvem | `force_instrumental`, `seed`, `sign_with_c_2_pa` (MP3); **não usar sem esclarecimento escrito** |
| **YuE2** 3B | código Apache; pesos CC BY-NC 4.0 + "creator permission" (16/09/2026) só para criadores individuais; empresas precisam de licença comercial | não | não | — | GPU 24 GB BF16 | 48 kHz estéreo |
| **Suno v6** | planos pagos dão direitos comerciais [secundário], mas litígio UMG/Sony (18/09/2026) e tetos de download | só texto | Auto Split 12 stems (Pro/Premier) | — | nuvem | **fora de assets lançados** |
| **Udio** | downloads desativados desde 29/10/2025 | — | — | — | nuvem | **inutilizável para assets** |
| **Mubert** (skills/MCP oficiais, 28/09/2026) | "royalty-free, cleared for commercial use" segundo o repo; dois produtos com duas licenças; free tier não comercial | intensidade e modo loop no streaming | edição de stems | até 25 min | nuvem | preço da API sob consulta; confirmar termos do produto antes |
| **AudioCraft/MusicGen** | pesos CC-BY-NC 4.0 | — | — | — | — | não comercial |

## Separação de stems como fallback

- Demucs (MIT) — `htdemucs`, `htdemucs_ft`, `htdemucs_6s`; arquivado/sem manutenção desde 01/01/2025. Ainda funciona, mas sem suporte.
- Music-Source-Separation-Training (ZFTurbo, MIT) — BS-RoFormer, Mel-Band RoFormer, HTDemucs, SCNet.
- ACE-Step 1.5 "Track Separation" — preferível quando a música veio do próprio ACE-Step.

## Como decidir rápido

1. Tem GPU NVIDIA ≥6 GB ou Mac Apple Silicon? → **ACE-Step 1.5** (BPM/tom reais, stems, MIT).
2. Só CPU/Mac fraco e precisa de muitas variações curtas? → **Stable Audio 3 Small-Music** (confirmar Community License).
3. Sem hardware nenhum? → **Lyria 3** aceitando SynthID e sem BPM garantido; ou alugar GPU por hora e rodar ACE-Step.
4. Titular é empresa? → não use YuE2 sem licença; não use Eleven Music self-serve.
5. Estilo precisa de consistência forte entre 10+ músicas? → treine LoRA no ACE-Step com ~8 músicas aprovadas da própria trilha.

## Proveniência e marcas d'água

- Lyria: SynthID em toda saída. Eleven Music: C2PA opcional (`sign_with_c_2_pa`, só MP3). Modelos abertos: sem marca; a prova é o `PROVENANCE.md` + Git.
- Direção do mercado: modelos licenciados, watermark e controle de download. Planeje provar origem e **arquivar masters WAV**, porque versões de modelo são deprecadas (compromisso Suno–Warner).

## URLs

- https://github.com/ace-step/ACE-Step-1.5
- https://github.com/Stability-AI/stable-audio-3 · https://stability.ai/license (não lida)
- https://github.com/HeartMuLa/heartlib · https://github.com/ASLP-lab/DiffRhythm
- https://ai.google.dev/gemini-api/docs/music-generation · https://benchlm.ai/media-pricing/lyria [secundário]
- https://elevenlabs.io/eleven-music-model-specific-terms · https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/music/client.py
- https://github.com/multimodal-art-projection/YuE/blob/main/MODEL_LICENSE
- https://www.billboard.com/pro/umg-sony-hit-suno-with-lawsuit-after-new-ai-music-model/ · https://undetectr.com/blog/suno-music-downloader [secundário] · https://undetectr.com/blog/udio-download [secundário]
- https://github.com/MubertAI/skills
- https://github.com/facebookresearch/demucs · https://github.com/ZFTurbo/Music-Source-Separation-Training
- https://github.com/facebookresearch/audiocraft
