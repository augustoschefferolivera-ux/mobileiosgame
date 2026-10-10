# Tabela de licenças por ferramenta/modelo (estado em 10/10/2026)

Classes: **A** Apache/MIT/BSD (modelo e saída livres) · **B** comercial por plano/API (saída liberada enquanto pagar; guarde termos datados) · **C** não comercial/pesquisa (fora do build) · **D** territorial (saída proibida em certos países) · **E** atribuição ou aviso obrigatório · **F** litígio em curso. "[verificado]" = texto da licença lido no GitHub nesta pesquisa; "[secundário]" = resumo de terceiros; confirme antes de publicar.

## Lista vermelha (não vai ao build de um jogo global)

| Ferramenta/modelo | Classe | Trecho ou regra | Substituto | Fonte |
|---|---|---|---|---|
| Hunyuan3D 2.0/2.1/Omni/Part; HunyuanWorld 1.0; HY-World 1.5 (WorldPlay) e 2.0 | D | "DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"; "You must not use... Output or results... outside the Territory"; >1 M MAU exige licença | TRELLIS.2 (MIT), TripoSG/PartCrafter (MIT), Tripo/Meshy pagos | LICENSE Tencent [verificado] |
| FLUX.1 [dev] servido/produção; FLUX.2 [dev]; FLUX.2 [klein] 9B | C | [dev]: "We claim no ownership rights in and to the Outputs. You may use Output for any purpose (including for commercial purposes)", mas seção 4(a) proíbe usar o modelo "for any commercial or production purposes" | FLUX.1 [schnell] (Apache 2.0), FLUX.2 [klein] 4B (Apache 2.0 [secundário]), API BFL (direitos comerciais [secundário]) | LICENSE-FLUX1-dev [verificado] |
| Cube 3D (Roblox) | C | licença restritiva segundo o relatório; texto não citado nas notas | TRELLIS.2, TripoSG | github.com/Roblox/cube [confirmar] |
| MMAudio | C | código MIT; checkpoints CC-BY-NC 4.0; "We do not guarantee that the pre-trained models are suitable for commercial use" | ElevenLabs SFX v2 (B), Stable Audio 3 Small-SFX | README/MODELS.md [verificado] |
| ThinkSound / PrismAudio | C | README: Apache-2.0 **e** "Commercial use is NOT permitted" (conflito; vale a restrição) | idem | README [verificado] |
| AudioCraft (MusicGen, AudioGen, MAGNeT, JASCO) | C | código MIT; pesos CC-BY-NC 4.0 | ACE-Step 1.5 (MIT), Stable Audio 3 | repositório [verificado] |
| spine-animation-ai (GenielabsOpenSource) | C | PolyForm Noncommercial | rig manual no Spine/DragonBones | repositório [verificado] |
| LUFSNormalizer | C | PolyForm Noncommercial 1.0.0 | pyloudnorm (MIT) com −18 LUFS / −1 dBTP | repositório [verificado] |
| YuE2 (pesos) | C para empresas / B criador individual | CC BY-NC 4.0 + "additional creator permission" (16/09/2026) para criadores individuais; empresas precisam de licença comercial | ACE-Step 1.5 | MODEL_LICENSE [verificado] |
| Tripo free tier | C | uso comercial só em planos pagos (Pro ~US$ 19,90/mês) | Tripo Pro/Max | CostBench [secundário] |
| Meshy free tier | E | saídas CC BY 4.0 (atribuição a Meshy); planos pagos incluem uso comercial; créditos não acumulam | Meshy Pro | docs.meshy.ai [secundário] |
| Eleven Music (self-serve) | B com cláusula | "all online and offline commercial use permitted, except film, TV, radio, & Studio Games"; Enterprise cobre games | esclarecimento escrito ou Enterprise; ACE-Step 1.5 | Model-Specific Terms [secundário] |
| Suno (v5–v6) | F | UMG e Sony processaram em 18/09/2026 (60.202 gravações; "model laundering"); Warner e BMG licenciaram; free tier só pessoal; caps de download | ACE-Step 1.5, Stable Audio 3, Lyria 3 | Billboard [secundário] |
| Udio | F | downloads desativados desde 29/10/2025; Sony processou em 20/07/2026 | idem | Undetectr/Chartlex [secundário] |

## Liberados com condições

| Ferramenta/modelo | Classe | Condição | Fonte |
|---|---|---|---|
| Llama 4 | E | exibir "Built with Llama"; prefixo "Llama" em derivados; licença se >700 M MAU | LICENSE [verificado] |
| Stable Audio 3 Small/Medium; SD 3.5; SPAR3D | B (cap) | Stability AI Community License: registro; >US$ 1 M/ano exige Enterprise | LICENSE.md SPAR3D [verificado] |
| Stable Audio 3 Large | B | só API | repositório [verificado] |
| gpt-image-1.5 / GPT Image 2 (OpenAI API) | B | termos de uso da API [não lidos; confirmar propriedade da saída] | openai.com/policies [confirmar] |
| Nano Banana 2 / Pro (Gemini API) | B | saídas com SynthID; termos Google [não lidos] | ai.google.dev [confirmar] |
| Recraft V4 Vector, Ideogram 3, Midjourney V8.1 | B | direitos comerciais por plano [não lidos] | páginas de preço [confirmar] |
| PixelLab, Retro Diffusion (hosted) | B | termos comerciais não encontrados; modelo baixável da Retro Diffusion (US$ 50) não é o hospedado | Cinevva/Gumroad [secundário] |
| Unity AI | B | créditos; grava metadados "AI-generated"; dev responsável pelas declarações | Unity blog [secundário] |
| ElevenLabs SFX v2, Eleven v3 (voz), Fish Audio S2 API | B | por plano; Fish self-hosted = "FISH AUDIO RESEARCH LICENSE" (termos comerciais não na página) | repositórios [verificado parcialmente] |
| Lyria 3 / 3 Pro | B | Gemini API; SynthID | docs Gemini [secundário] |
| Claude API (Haiku 5.5 etc.) | B | termos comerciais da Anthropic [não lidos] | anthropic.com/legal [confirmar] |
| Apple Foundation Models / PCC | n/a | Apple Developer Program License Agreement; PCC sem custo abaixo de 2 M downloads | WWDC26 SOTU |

## Livres (A)

FLUX.1 [schnell]; FLUX.2 [klein] 4B [secundário]; Qwen-Image (Apache 2.0 [verificado]); BiRefNet/ToonOut (MIT); TRELLIS.2 (MIT); TripoSG, PartCrafter, UniRig, SkinTokens (MIT); Puppeteer (Apache-2.0); ACE-Step 1.5 (MIT); Kokoro-82M (Apache-2.0, pt-BR); HiDream-O1 (MIT [secundário]); pyloudnorm (MIT); gltfpack/meshoptimizer e glTF-Transform (MIT); c2pa-rs (MIT/Apache-2.0); apple/unityplugins e Game Porting Toolkit (Apache-2.0); MobileBuildMCP e ios-simulator-mcp (MIT); Maestro (Apache-2.0); Claude-Code-Game-Studios (MIT). Chatterbox e PyMusicLooper: licença não citada nas notas [confirmar no repositório]. Unity Agent Plugin: Unity Companion License (vale para as skills, não para seus assets; não copie o texto).

## Fontes

Ver seção "Fontes" do SKILL.md; URLs adicionais: https://github.com/VAST-AI-Research/TripoSG ; https://github.com/wgsxm/PartCrafter ; https://github.com/VAST-AI-Research/UniRig ; https://github.com/VAST-AI-Research/SkinTokens ; https://github.com/Seed3D/Puppeteer ; https://github.com/microsoft/TRELLIS.2 ; https://github.com/ace-step/ACE-Step-1.5 ; https://github.com/hexgrad/kokoro ; https://github.com/resemble-ai/chatterbox ; https://github.com/apple/game-porting-toolkit ; https://github.com/getsentry/MobileBuildMCP ; https://github.com/mobile-dev-inc/maestro ; https://replicate.com/sprited/birefnet/readme [secundário]
