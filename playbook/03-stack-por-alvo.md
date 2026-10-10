# Stack do projeto (web em código puro)

Decidido em `docs/decisoes/ADR-0001-engine-e-alvo.md`: **web em código puro, TypeScript + Vite**,
com Phaser 4 para 2D (padrão) e Three.js se o brief exigir 3D. As demais engines (SpriteKit,
RealityKit, Unity, Godot) foram removidas deste repositório para reduzir ruído; o material está
no histórico do Git (commit `0977213` e anteriores) e na pesquisa em `reports/`.

Critério que decidiu tudo: **o agente fecha sozinho construir → rodar → observar → corrigir no
PC Linux, e a licença da saída permite venda global.** Versões fixadas no `package.json`.

## Camadas de código

| Camada | 2D (padrão) | 3D (se o brief pedir) |
|---|---|---|
| Engine | **Phaser 4.2.1** | Three.js (versão atual, fixar) ou Babylon.js 8 |
| Linguagem / build | TypeScript 5.9 + Vite 8 | idem |
| Resolução / escala | 390×844 lógico, `Phaser.Scale.FIT`, DPR ≤ 2 | viewport + DPR ≤ 2; `renderer.setPixelRatio` |
| Física | Arcade (padrão) · Matter para corpos complexos | Rapier/Cannon-es |
| UI | objetos Phaser (texto, nine-slice) ou DOM sobreposto para menus | DOM sobreposto |
| Áudio | Web Audio via Phaser (`sound.unlock()` no 1º toque); `.m4a` + `.ogg` | Howler.js/Web Audio |
| Entrada | `pointer*`; `touch-action: none`; alvos ≥ 44 px | idem |
| Assets | atlas JSON hash (TexturePacker/free-tex-packer), `multiatlas` > 2048², PNG otimizado/WebP | glTF + Draco/meshopt + KTX2 |
| Testes | Vitest (lógica pura) + Playwright (WebKit/Chromium emulando iPhone) | idem |
| Verificação pelo agente | `scripts/verify.sh` → `.claude/skills/engine-web-phaser/scripts/verify.sh` | `.claude/skills/engine-web-threejs/scripts/verify.sh` |
| CI | GitHub Actions Linux (build + Playwright) | idem |
| Distribuição | PWA em hospedagem estática; itch.io/portais; App Store via Capacitor depois | idem |
| IA em runtime | backend mínimo → Claude Haiku 5.5 (`/ia-runtime-nuvem-claude`); conteúdo em lote (`/geracao-procedural-com-llm`) | idem |
| Telemetria | Sentry (browser) + web-vitals; FPS do `__GAME_DEBUG__` | idem |

## Camadas de assets

| Camada | Escolha principal | Alternativa | Licença/ressalva |
|---|---|---|---|
| Imagem HD/UI | gpt-image-1.5 (`background: "transparent"`) | GPT Image 2 (alfa em preview); Midjourney V8.1 + BiRefNet | API comercial; preços por revendedor [confirmar] |
| Consistência | Nano Banana Pro (refs) + LoRA em FLUX.2 [klein] 4B (Apache 2.0) via fal | FLUX.1-dev LoRA (saídas ok; não servir o modelo) | FLUX [dev]/[klein] 9B não comercial para servir |
| Vetor/ícones | Recraft V4 Vector (SVG) | Ideogram 3 (texto em imagem) | API comercial |
| Pixel art | PixelLab (MCP) + Aseprite (`pixel-mcp`) | Retro Diffusion (MCP); Sprite Fusion (tilemaps → Phaser) | confirmar termos comerciais |
| Recorte/pós | BiRefNet / ToonOut (MIT) — na estação GPU | rembg CPU | MIT |
| Animação 2D | ComfyUI "Sprite Sheet Generator"; PixelLab; **pré-render de 3D** (`/sprites-pre-renderizados-de-3d`) | vídeo→frames (Kling 3.0, Veo 3.1, Wan 2.6) | Spine para Phaser 4 exige licença do editor [confirmar] |
| 3D (pré-render ou Three.js) | Tripo/Meshy Pro → Blender → render de sprites ou glTF otimizado | TRELLIS.2 (MIT, 24 GB VRAM na nuvem); TripoSG | **Hunyuan3D proibido fora de UE/UK/Coreia** |
| Música | ACE-Step 1.5 (MIT) na estação GPU | Stable Audio 3; Lyria 3 | **Suno/Udio fora** |
| SFX | ElevenLabs SFX v2 (`loop`) | Stable Audio 3 Small-SFX local | MMAudio/ThinkSound não comerciais |
| Voz | Eleven v3 / Fish S2 (falas fixas) | Kokoro-82M em lote na estação | consentimento escrito |
| Pós-áudio | PyMusicLooper + pyloudnorm (−18 LUFS / −1 dBTP) → `.m4a` + `.ogg` | — | LUFSNormalizer é PolyForm NC |
| Proveniência | `PROVENANCE.md` + c2pa-rs | — | — |

## Modelos para dirigir o agente

Fable 5.1 US$ 10/50 por MTok; Opus 5.5 US$ 4/20; Sonnet 5.5 US$ 2/10; Haiku 5.5 US$ 0,10/0,50
(docs.claude.com, out/2026). Opus/Sonnet para arquitetura e bugs difíceis; Haiku para QA e lotes.
