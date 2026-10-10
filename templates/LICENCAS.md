# LICENCAS — [Nome do jogo]

Registro de licenças de cada ferramenta, modelo, SDK e template usados no projeto, com versão e URL da licença lida. Lido por `check_provenance.py` (coluna `id` e `classe`). Atualize a cada ferramenta nova e antes de cada submissão. Não é aconselhamento jurídico.

Classes: **A** Apache/MIT/BSD · **B** comercial por plano/API (guarde recibo e termos datados) · **C** não comercial/pesquisa — fora do build · **D** territorial — saída proibida em certos países · **E** atribuição/aviso obrigatório · **F** litígio em curso.
Países de lançamento: [lista]. Se incluir UE, UK ou Coreia do Sul, nenhuma ferramenta de classe D pode ter saída no build.

## Tabela

| id | ferramenta / modelo | versão usada | classe | licença (URL) | cobre | verificado em | observações |
|---|---|---|---|---|---|---|---|
| claude-api | Claude API (Opus/Sonnet/Haiku 5.5) | [modelo e data] | B | https://www.anthropic.com/legal [não lido] | código, texto, diálogo em runtime | [data] | termos comerciais; confirmar propriedade da saída |
| apple-foundation-models | Apple Foundation Models / Private Cloud Compute | iOS 27 | n/a | Apple Developer Program License Agreement | diálogo on-device/PCC | [data] | PCC sem custo abaixo de 2 M downloads (WWDC26) |
| gpt-image-1-5 | gpt-image-1.5 (OpenAI API) | [data] | B | https://openai.com/policies [não lido] | arte 2D, UI | [data] | confirmar direitos sobre saída |
| nano-banana-pro | Nano Banana Pro (Gemini API) | [data] | B | https://ai.google.dev/gemini-api/terms [não lido] | folhas de personagem | [data] | saídas com SynthID |
| flux2-klein-4b | FLUX.2 [klein] 4B (+ LoRA via fal) | [data] | A | Apache 2.0 [secundário] | estilo/LoRA | [data] | não confundir com [klein] 9B (não comercial) |
| flux1-schnell | FLUX.1 [schnell] | [data] | A | https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell | arte 2D | [data] | verificado |
| recraft-v4-vector | Recraft V4 Vector | [data] | B | [URL de termos; não lido] | ícones/UI SVG | [data] | |
| birefnet | BiRefNet / ToonOut | [versão] | A | MIT (README Replicate) [secundário] | remoção de fundo | [data] | |
| pixellab | PixelLab (MCP) | [data] | B | [URL; não encontrada] | pixel art | [data] | confirmar termos comerciais antes de publicar |
| tripo-pro | Tripo Studio (plano Pro) | [data] | B | [URL de termos; não lido] | modelos 3D, rig | [data] | free tier = não comercial |
| meshy-pro | Meshy 7 (plano Pro) | [data] | B | https://docs.meshy.ai/en/webapp/pricing [secundário] | modelos 3D | [data] | free tier = CC BY 4.0 (atribuição) |
| trellis2 | TRELLIS.2 | [commit] | A | MIT (repositório) | modelos 3D | [data] | |
| unirig | UniRig / SkinTokens | [commit] | A | MIT | rigging | [data] | |
| puppeteer | Puppeteer | [commit] | A | Apache-2.0 | rig + FBX | [data] | bpy==4.2.0 |
| ace-step-1-5 | ACE-Step 1.5 | [versão] | A | MIT | música | [data] | |
| stable-audio-3 | Stable Audio 3 Small/Medium | [versão] | B | Stability AI Community License | SFX/música | [data] | registro; >US$ 1 M/ano exige Enterprise |
| elevenlabs-sfx-v2 | ElevenLabs Sound Effects v2 | [data] | B | [termos ElevenLabs; não lidos] | SFX | [data] | |
| eleven-v3 | ElevenLabs Eleven v3 (voz) | [data] | B | [termos; não lidos] | voz pré-renderizada | [data] | consentimento escrito para qualquer voz real |
| kokoro-82m | Kokoro-82M (on-device, pt-BR) | [versão] | A | Apache-2.0 | TTS dinâmico | [data] | |
| pyloudnorm | pyloudnorm | [versão] | A | MIT | normalização −18 LUFS | [data] | substitui LUFSNormalizer (PolyForm NC) |
| pymusiclooper | PyMusicLooper | [versão] | [confirmar] | [URL do repositório] | loops | [data] | licença não citada nas notas |
| gltfpack | meshoptimizer/gltfpack; glTF-Transform | [versão] | A | MIT | otimização 3D | [data] | |
| c2pa-rs | c2pa-rs / c2patool | [versão] | A | MIT/Apache-2.0 | assinatura C2PA | [data] | |
| apple-unityplugins | apple/unityplugins (StoreKit, GameKit, Background Assets) | [versão] | A | Apache-2.0 | IAP/serviços Apple no Unity | [data] | Xcode 27, Unity 2022 LTS+ |
| unity-agent-plugin | Unity Agent Plugin (skills) | [versão] | n/a | Unity Companion License | fluxo do agente | [data] | não copiar texto das skills |
| game-porting-toolkit | Apple Game Porting Toolkit 4 (skills) | [versão] | A | Apache-2.0 | Metal | [data] | |
| mobilebuildmcp | MobileBuildMCP | [versão] | A | MIT | build/simulador | [data] | telemetria Sentry opt-out |
| maestro | Maestro | [versão] | A | Apache-2.0 | testes de UI | [data] | |
| game-studios-templates | Claude-Code-Game-Studios (templates adaptados) | [commit] | A | MIT © 2026 Donchitos | checklists, post-mortem | [data] | crédito em THIRD_PARTY_NOTICES.md |
| levelplay | LevelPlay (Ads Mediation) | [versão] | B | termos Unity/ironSource [não lidos] | anúncios | [data] | ATT; declarar nos rótulos de privacidade |
| revenuecat | RevenueCat SDK | [versão] | B | [termos; não lidos] | IAP | [data] | preço por receita rastreada |

## Lista vermelha (não usar; manter aqui para o script bloquear)

| id | ferramenta / modelo | classe | motivo | fonte |
|---|---|---|---|---|
| hunyuan3d | Hunyuan3D 2.x / Omni / Part | D | Tencent Community License: saída proibida fora do Territory (UE/UK/Coreia excluídos) | https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/LICENSE |
| hy-world | HunyuanWorld 1.0 / HY-World 1.5 / 2.0 | D | idem | https://raw.githubusercontent.com/Tencent-Hunyuan/HY-World-2.0/main/License.txt |
| flux1-dev-servido | FLUX.1 [dev] servido/produção; FLUX.2 [dev]; [klein] 9B | C | Non-Commercial License (saídas livres, modelo não) | https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev |
| cube-3d | Roblox Cube 3D | C | restritiva segundo relatório [confirmar] | https://github.com/Roblox/cube |
| mmaudio | MMAudio | C | checkpoints CC-BY-NC 4.0 | https://github.com/hkchengrex/MMAudio |
| thinksound | ThinkSound / PrismAudio | C | "Commercial use is NOT permitted" | https://github.com/liuhuadai/ThinkSound |
| audiocraft | AudioCraft / MusicGen | C | pesos CC-BY-NC 4.0 | https://github.com/facebookresearch/audiocraft |
| spine-animation-ai | spine-animation-ai | C | PolyForm Noncommercial | https://github.com/GenielabsOpenSource/spine-animation-ai |
| lufsnormalizer | LUFSNormalizer | C | PolyForm NC 1.0.0 | https://github.com/vitaleaudio/LUFSNormalizer |
| yue2-empresa | YuE2 (uso por empresa) | C | pesos CC BY-NC 4.0; "creator permission" só para indivíduos | https://github.com/multimodal-art-projection/YuE/blob/main/MODEL_LICENSE |
| tripo-free | Tripo free tier | C | não comercial | https://costbench.com/software/ai-3d-generation/tripo-ai/ [secundário] |
| eleven-music-selfserve | Eleven Music (self-serve) | B* | exclui "Studio Games"; usar só com esclarecimento escrito/Enterprise | Model-Specific Terms [secundário] |
| suno | Suno | F | UMG/Sony v. Suno (18/09/2026) | https://www.billboard.com/pro/umg-sony-hit-suno-with-lawsuit-after-new-ai-music-model/ [secundário] |
| udio | Udio | F | Sony v. Udio (20/07/2026); sem downloads desde 29/10/2025 | https://www.chartlex.com/blog/business/music-industry-ai-lawsuits-tracker-2026 [secundário] |

## Decisões

| data | ferramenta | decisão | motivo | quem |
|---|---|---|---|---|
| [data] | [id] | substituída por [id] / removida / mantida com atribuição | [motivo] | [nome] |
