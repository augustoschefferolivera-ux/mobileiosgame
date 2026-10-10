# Stack por alvo

Critério de desempate em todas as linhas: **o agente fecha sozinho o ciclo construir → rodar
→ observar → corrigir, e a licença da saída permite venda global.** Fixe as versões no ADR.
Preços e datas com "[confirmar]" vieram de fontes secundárias.

## Camadas de código e engine

| Camada | 2D · app iOS | 3D · app iOS | 2D · web | 3D · web |
|---|---|---|---|---|
| Engine padrão | SwiftUI + SpriteKit (não deprecado) | RealityKit (Apple recomenda; SceneKit deprecado no Xcode 26) | Phaser ou PixiJS + TypeScript + Vite | Three.js ou Babylon.js + TypeScript + Vite |
| Alternativa texto-first | Godot 4.7 GDScript + Godot AI MCP | Godot 4.7 (renderer Mobile) | Godot 4.7 export web (mais pesado) | Godot 4.7 export web |
| Alternativa quando IAP/ads/cross-platform pesam | Unity 6.3 LTS + unity-agent-plugin + apple/unityplugins + MCP for Unity | Unity 6.3 LTS (URP) | — | PlayCanvas (MCP oficial) |
| Baixo nível | — | Metal 4 só com skills do Game Porting Toolkit | WebGL2 | WebGPU/WebGL2; KTX2/Draco |
| Linguagem | Swift 6.x | Swift 6.x | TypeScript estrito | TypeScript estrito |
| UI | SwiftUI; SF Symbols | SwiftUI sobre RealityView | DOM/Canvas do engine | DOM/Canvas do engine |
| Física | SpriteKit physics | RealityKit physics | Arcade/Matter (Phaser) | Rapier/Cannon-es |
| Áudio | AVAudioEngine; AAC música, CAF/PCM SFX | idem | Howler.js/Web Audio (desbloqueio por gesto) | idem |
| Entrada | toque ≥ 44pt; GameController | idem | Pointer events; `touch-action: none` | idem |
| Testes | Swift Testing/XCTest; `scripts/verify.sh` | idem | Vitest + Playwright (viewport iPhone) | idem |
| Verificação pelo agente | MCP do Xcode 27 (`xcrun mcpbridge`), MobileBuildMCP, ios-simulator-mcp | idem | Playwright screenshots | idem |
| CI | Xcode Cloud (25 h/mês) ou GitHub Actions macOS | idem | GitHub Actions Linux | idem |
| Loja/distribuição | App Store (StoreKit 2, GameKit) | idem | PWA; itch.io; portais; Capacitor → App Store só com 4.2/4.7 ok | idem |
| IA em runtime | Foundation Models (on-device → PCC → Claude via `LanguageModel`) | idem | Backend mínimo → Claude Haiku 5.5 | idem |
| Telemetria | MetricKit iOS 27; Sentry | idem | Sentry; Web Vitals | idem |

Não recomendado para agentes em 2026: Unreal (`.uasset` opaco; MCP first-party experimental
sem autenticação), multiplayer em tempo real no MVP (Photon Fusion "useless results"), SceneKit
(deprecado), plataformas texto→jogo (Rosebud, Upit, Bitmagic) quando o objetivo é um app
próprio na App Store (só web view).

## Camadas de assets (iguais para todos os alvos)

| Camada | Escolha principal | Alternativa | Licença/ressalva |
|---|---|---|---|
| Imagem HD/UI | gpt-image-1.5 (`background: "transparent"`) | GPT Image 2 (alfa em preview instável); Midjourney V8.1 + BiRefNet | API comercial; preços por revendedor [confirmar] |
| Consistência | Nano Banana Pro (até ~14 refs [confirmar]) + LoRA em FLUX.2 [klein] 4B (Apache 2.0) via fal | FLUX.1-dev LoRA (Replicate) — saídas ok, não servir o modelo | FLUX [dev]/[klein] 9B: FLUX Non-Commercial |
| Vetor/ícones | Recraft V4 Vector (SVG) | Ideogram 3 (texto em imagem) | API comercial |
| Pixel art | PixelLab (esqueleto, rotações, MCP) + Aseprite (`pixel-mcp`) | Retro Diffusion (pay-per-asset, MCP); Sprite Fusion (tilemaps) | confirmar termos comerciais |
| Recorte/pós | BiRefNet / ToonOut (MIT) | rembg | MIT |
| Animação 2D | ComfyUI "Sprite Sheet Generator" (Nano Banana Pro); PixelLab | Kling 3.0 / Veo 3.1 / Wan 2.6 / Runway Gen-4.5 → frames | Sora 2 encerrado; spine-animation-ai é PolyForm NC |
| 3D geração | Tripo 3.0 Pro ou Meshy 7 Pro (plano pago = comercial) | TRELLIS.2 (MIT, 24 GB VRAM); TripoSG/PartCrafter (MIT); SPAR3D | **Hunyuan3D/HY-World: proibido fora de UE/UK/Coreia**; Meshy free = CC BY 4.0; Tripo free não comercial |
| 3D otimização | Blender MCP (bpy) → gltfpack → glTF-Transform → GLB/USDZ | Reality Converter | MIT; ≤100K tris, 2048² por frame |
| Rigging/animação 3D | UniRig → SkinTokens (MIT); Puppeteer (Apache) | Rokoko Create; Mixamo (manutenção) | Audio2Face-3D só Unreal/Maya (bake) |
| Mundos | World Labs Marble (splats/malha) → bake para malha | HunyuanWorld (licença territorial — evitar) | Genie 3 não exporta |
| Música | ACE-Step 1.5 (MIT; BPM/tom/stems) | Stable Audio 3 (Community License); HeartMuLa (Apache); Lyria 3 | **Suno/Udio fora**; Eleven Music exclui "Studio Games" em self-serve |
| SFX | ElevenLabs SFX v2 (`loop`, 48 kHz; MCP hospedado) | Stable Audio 3 Small-SFX (local) | MMAudio/ThinkSound não comerciais |
| Voz | Eleven v3 / Fish Audio S2 (falas fixas) | Kokoro-82M (Apache, pt-BR, on-device); Chatterbox (MIT) | consentimento escrito; TTS "flat" (ARC Raiders) |
| Pós-áudio | PyMusicLooper + pyloudnorm (−18 LUFS / −1 dBTP) | LANDR/Ozone | LUFSNormalizer é PolyForm NC |
| Proveniência | `PROVENANCE.md` + c2pa-rs | metadados da Unity AI | — |

## Modelos para dirigir o agente

Preços primários (docs.claude.com, out/2026): Fable 5.1 US$ 10/50 por MTok; Opus 5.5
US$ 4/20; Sonnet 5.5 US$ 2/10; Haiku 5.5 US$ 0,10/0,50; todos com 1M de contexto. Use Opus/Sonnet
para arquitetura e depuração, Haiku para QA e geração em massa. O Codex é o único outro agente
com plug-ins oficiais da Unity, Roblox e Apple GPTK.
