# Índice de skills

Gerado por `python3 scripts/check-skills.py`. Não edite à mão. Invoque uma skill com `/nome`
ou deixe o agente carregá-la quando a descrição casar com a tarefa.

Total: 41 skills válidas.

## Por grupo

### processo

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/brief-do-jogo` | 2d, 3d, app, web | 1 | Escreve o brief de UMA página do jogo em design/game-brief.md a partir de uma ideia solta ou das respostas da entrevista: pitch, loop central, objetivo e estado de falha, até 3 pilares, MVP (≤ 7 itens verificáveis), f... |
| `/instalar-ferramentas` | 2d, 3d, app, web | 0 | Detecta SO, engine e alvo do projeto e instala só o que ele precisa: plug-ins oficiais do Claude Code (Unity, Game Porting Toolkit da Apple, Roblox), servidores MCP (Xcode via xcrun mcpbridge, MobileBuildMCP, ios-simu... |

### engines

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/ci-xcode-cloud-fastlane` | 2d, 3d, app | 0, 3, 10 | Configura integração e distribuição contínuas do jogo iOS: Xcode Cloud (25 h/mês incluídas na membership, TestFlight integrado, scripts ci_scripts), fastlane com App Store Connect API Key (pilot, deliver, match, scree... |
| `/engine-godot-mobile` | 2d, 3d, app | 2, 3, 5, 8 | Configura, codifica e verifica um jogo mobile em Godot 4.7.x (versão fixada) com GDScript, Godot AI MCP (project_run, test_run, logs_read, editor_screenshot), testes GUT ou gdUnit4, CLI headless para CI e export iOS (... |
| `/engine-realitykit-metal` | 3d, app | 2, 3, 5, 8 | Monta e verifica um jogo 3D nativo para iOS com RealityKit (RealityView em SwiftUI, ECS, Reality Composer Pro, USDZ) e decide quando descer para Metal 4 instalando as skills oficiais do Game Porting Toolkit da Apple; ... |
| `/engine-spritekit-swiftui` | 2d, app | 2, 3, 5, 8 | Monta e verifica um jogo 2D nativo para iOS com SwiftUI + SpriteKit (SKScene dentro de SpriteView), Swift 6.x, atlases .spriteatlas, SKAction, física, CoreHaptics e Game Center, com build por xcodebuild e execução/scr... |
| `/engine-unity-mobile` | 2d, 3d, app | 2, 3, 5, 8 | Configura, codifica e verifica um jogo mobile em Unity 6.3 LTS para iOS usando o plug-in oficial Unity-Technologies/unity-agent-plugin (32 skills: IAP, LevelPlay, pixel perfect, sprite atlas, física 2D, tiles, áudio, ... |
| `/engine-web-phaser` | 2d, web | 2, 3, 5, 8 | Monta e verifica um jogo web 2D para iPhone com Phaser (ou PixiJS) + TypeScript + Vite: input por toque, devicePixelRatio, desbloqueio de áudio no Safari iOS, PWA offline, atlases e performance em Safari mobile; verif... |
| `/engine-web-threejs` | 3d, web | 2, 3, 5, 8 | Monta e verifica um jogo web 3D para iPhone com Three.js ou Babylon.js + TypeScript + Vite: WebGL2/WebGPU no iOS, assets glTF com Draco/meshopt e texturas KTX2, limites de memória do Safari, Gaussian splats com Spark ... |
| `/playtest-automatizado` | 2d, 3d, app, web | 3, 5, 8 | Executa o loop de playtest por agente em um jogo iOS/web: três camadas (agentes nativos do Xcode 27; MobileBuildMCP + ios-simulator-mcp; Maestro YAML para menus), computer use no Simulator, roteiro em production/playt... |
| `/xcode-agentico` | 2d, 3d, app | 0, 3 | Conecta o agente ao Xcode 26.3/27 como servidor MCP (xcrun mcpbridge), configura agentes que bootam simulador, tocam, digitam e tiram screenshot (Xcode 27), lldb-mcp, Device Hub, insights do Organizer, modo sem superv... |

### arte-2d

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/animar-sprites` | 2d, app, web | 6 | Produz animações de sprite 2D (idle, walk, attack, jump, hit, death) por uma de quatro rotas: sprite sheet com o template oficial "Sprite Sheet Generator" do ComfyUI (Nano Banana Pro), ferramentas pixel-native (PixelL... |
| `/atlas-e-exportacao-2d-mobile` | 2d, app, web | 6, 8 | Empacota sprites, UI e tiles em atlases e exporta para iOS/mobile: agrupamento por configuração de compressão (Unity SpriteAtlas via skill oficial manage-sprite-atlas, limite legado 2048²; pastas .spriteatlas no Sprit... |
| `/cenarios-e-tilesets` | 2d, app, web | 5, 6 | Produz cenários 2D: tilesets em grade (tiles-base por bioma com IA, costura seamless verificada por script, autotile/rule tiles no engine — Unity create-tile-palette-or-rule-tiles, Godot TileMapLayer, Phaser tilemaps ... |
| `/consistencia-com-lora` | 2d, app, web | 4, 6 | Mantém personagens e estilo consistentes ao longo de dezenas de assets: decide quando treinar um LoRA (FLUX.2 na fal; FLUX.1-dev na Replicate), monta o dataset (20+ imagens consistentes), explica licenças (FLUX.2 [kle... |
| `/direcao-de-arte-e-style-card` | 2d, app, web | 1, 4 | Cria a art bible curta do jogo (paleta hex, proporções, traço, iluminação, câmera, resolução-base, "o que nunca fazer"), o style card de 1 página que vira prefixo de todo prompt de imagem, a folha de referência (chara... |
| `/gerar-sprites-2d` | 2d, app, web | 4, 6 | Gera sprites 2D (personagens, inimigos, itens, props, efeitos) com fundo transparente e estilo consistente a partir do style card: gpt-image-1.5 com background transparente como rota principal, Nano Banana Pro com ref... |
| `/pixel-art-pipeline` | 2d, app, web | 4, 6 | Produz pixel art em grade real (16/32/64 px, paleta limitada, sem anti-aliasing) com ferramentas pixel-native — PixelLab (esqueleto, rotações 4/8, MCP pixellab-mcp), Retro Diffusion (pay-per-asset, MCP), Aseprite via ... |
| `/ui-hud-e-icones` | 2d, 3d, app, web | 4, 6, 10 | Gera a UI do jogo com IA de forma governada: ícones em SVG com Recraft V4 Vector, arte com texto via Ideogram 3 (só quando o texto é arte, ex. logotipo), peças de HUD separadas em PNG transparente (moldura, slot, barr... |

### 3d

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/blender-automatizado` | 3d, app, web | 0, 6 | Opera o Blender por agente: instala e usa o Blender MCP (mcp-for-blender) para limpar, retopologizar, fazer UV, bake e exportar GLB/FBX de assets gerados por IA, inspecionar cenas (look, get_scene_info) e importar ass... |
| `/gerar-ativos-3d` | 3d, app, web | 4, 6 | Gera malhas 3D (personagens, props, cenário) com IA a partir de um brief e de uma imagem de referência, escolhendo o gerador pela licença de saída e pelo orçamento mobile, e registra proveniência. Use sempre que o usu... |
| `/rigging-e-animacao-3d` | 3d, app, web | 6 | Coloca esqueleto, pesos de pele e animações em um personagem ou criatura 3D gerado por IA (auto-rig do Tripo/Meshy, UniRig → SkinTokens, Puppeteer, Mixamo), obtém movimento por vídeo/texto (Rokoko Create, DeepMotion, ... |

### audio

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/audio-adaptativo-no-engine` | 2d, 3d, app, web | 5, 7, 8 | Implementa a camada de reprodução e áudio adaptativo no engine do jogo: buses e mixer, loops por samples, camadas/stems por intensidade, transições em barra, ducking de música sob voz/SFX e SFX de UI sem latência, usa... |
| `/direcao-de-audio-e-sound-bible` | 2d, 3d, app, web | 4 | Escreve a sound bible curta do jogo (paleta sonora, referências, BPM/tom por área, hierarquia de mix, alvo −18 LUFS/−1 dBTP, buses, naming) e deriva do feature_list.json a lista completa de assets de áudio a gerar. Us... |
| `/gerar-musica` | 2d, 3d, app, web | 6 | Gera a trilha do jogo (loops por área, stingers, camadas/stems) com modelos de licença segura — ACE-Step 1.5 (MIT) ou Stable Audio 3 Small/Medium local, HeartMuLa, Lyria 3 — a partir da sound bible, em BPM/tom fixos, ... |
| `/gerar-sfx` | 2d, 3d, app, web | 6 | Gera efeitos sonoros do jogo (UI, passos, impactos, coletas, ambientes em loop) em lote com ElevenLabs Sound Effects v2 (eleven_text_to_sound_v2, loop nativo, 48 kHz) via SDK/MCP, ou localmente com Stable Audio 3 Smal... |
| `/pos-producao-audio-mobile` | 2d, 3d, app, web | 6, 8 | Pós-produção de todo áudio do jogo para mobile: normaliza por categoria a −18 LUFS integrado / −1 dBTP (ASWG-R001 mobile) com pyloudnorm (MIT), corta silêncio, aplica fades e crossfade de loop com pontos exatos em sam... |
| `/voz-e-dialogo` | 2d, 3d, app, web | 6, 7 | Produz as vozes do jogo: diálogo fixo pré-renderizado na nuvem (ElevenLabs Eleven v3 / Text to Dialogue, Fish Audio S2, OpenAI gpt-4o-mini-tts) e texto dinâmico on-device em pt-BR (Kokoro-82M via FluidAudio/swift-tts,... |

### ia-runtime

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/geracao-procedural-com-llm` | 2d, 3d, app, web | 5, 7 | Gera conteúdo de jogo (níveis, quests, itens, loja, regras, seeds) com LLM no padrão de 2026: o modelo produz parâmetros estruturados validados por JSON Schema e por verificadores (nível sempre solucionável, economia ... |
| `/ia-runtime-foundation-models` | 2d, 3d, app | 7, 9 | Integra o Foundation Models framework da Apple (iOS 26/27) ao jogo: modelo on-device SystemLanguageModel com geração guiada @Generable, tool calling, PrivateCloudComputeLanguageModel (32K de contexto, sem custo de API... |
| `/ia-runtime-nuvem-claude` | 2d, 3d, app, web | 7, 9 | Liga o jogo ao Claude (Haiku 5.5 para NPCs e conteúdo em massa) com segurança e custo previsível: backend/proxy mínimo sem chave no app, prompt caching com prefixo fixo de 512+ tokens, saída estruturada por JSON Schem... |
| `/ia-runtime-on-device-llm` | 2d, 3d, app | 7, 8 | Embarca um LLM próprio (0,6B–2B em 4-bit) no iPhone para gerar texto offline sem depender da Apple Intelligence: orçamento realista de RAM/tok/s/termal com números medidos no iPhone 17 Pro, escolha de runtime (llama.c... |
| `/npc-e-dialogo-dinamico` | 2d, 3d, app, web | 5, 7, 9 | Projeta e implementa NPCs com diálogo dinâmico que vale a pena: decide onde IA agrega (fala ambiente, quest-giver com saídas estruturadas, companheiro com memória) e onde falas escritas são melhores; define a ficha es... |

### publicacao

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/classificacao-etaria` | 2d, 3d, app, web | 1, 9, 10 | Responde o questionário de classificação etária da App Store (faixas 4+/9+/13+/16+/18+, obrigatórias desde 31/01/2026) a partir das features reais do jogo — violência, horror, chatbot/IA, compras, loot boxes, apostas ... |
| `/divulgacao-de-uso-de-ia` | 2d, 3d, app, web | 9, 10 | Redige e posiciona a divulgação de uso de IA do jogo (texto-modelo em pt-BR e en, por categoria: gráficos, som, texto/diálogo, código, IA em runtime) seguindo a HIG "Generative AI" da Apple ("Clearly identify when and... |
| `/licencas-e-proveniencia` | 2d, 3d, app, web | 0, 6, 9 | Mantém o registro de licenças (LICENCAS.md) de cada ferramenta, modelo e versão usados no jogo, com classe (Apache/MIT, comercial por plano, não comercial, territorial) e lista vermelha (Hunyuan3D/HY-World fora de UE/... |
| `/monetizacao-iap-e-ads` | 2d, 3d, app, web | 5, 10 | Implementa e testa a monetização de um jogo mobile feito com IA: compras in-app (StoreKit 2 nativo, apple/unityplugins ou RevenueCat), anúncios (LevelPlay via skill oficial da Unity, AdMob no nativo) e a escolha do mo... |
| `/pos-lancamento-e-telemetria` | 2d, 3d, app | 10 | Opera o jogo depois do lançamento: telemetria com MetricKit do iOS 27 (frame rate Metal, crashes, hangs, memória, StateReporting por tela) ou Sentry, leitura dos crashes do Organizer pelo agente via MCP do Xcode 27, t... |
| `/privacidade-lgpd-e-eca-digital` | 2d, 3d, app, web | 5, 9, 10 | Mapeia os fluxos de dados do jogo (SDKs de anúncio, analytics, crash, IAP, LLM em nuvem, texto digitado pelo jogador) e produz o que a LGPD, o ECA Digital (Lei 15.211/2025) e a Apple exigem: base legal e minimização, ... |
| `/publicar-jogo-web` | 2d, 3d, web | 3, 10 | Publica a versão web de um jogo feito com IA (HTML5/WebGL de Godot, Unity, Phaser ou PixiJS) em hospedagem estática (Cloudflare Pages, Vercel, GitHub Pages) como PWA instalável, no itch.io com as tags "AI Generated" o... |
| `/submissao-app-store` | 2d, 3d, app | 10 | Conduz a submissão de um jogo feito com IA à App Store com um checklist derivado das App Store Review Guidelines (08/06/2026): varredura de placeholders e resíduos de IA (2.1(a), caso The Alters), genericidade (4.3(b)... |

## Por fase do roteiro

- **Fase 0 — Preparação do ambiente:** `/blender-automatizado`, `/ci-xcode-cloud-fastlane`, `/instalar-ferramentas`, `/licencas-e-proveniencia`, `/xcode-agentico`
- **Fase 1 — Conceito e brief:** `/brief-do-jogo`, `/classificacao-etaria`, `/direcao-de-arte-e-style-card`
- **Fase 2 — Engine/alvo e esqueleto:** `/engine-godot-mobile`, `/engine-realitykit-metal`, `/engine-spritekit-swiftui`, `/engine-unity-mobile`, `/engine-web-phaser`, `/engine-web-threejs`
- **Fase 3 — Loop de verificação:** `/ci-xcode-cloud-fastlane`, `/engine-godot-mobile`, `/engine-realitykit-metal`, `/engine-spritekit-swiftui`, `/engine-unity-mobile`, `/engine-web-phaser`, `/engine-web-threejs`, `/playtest-automatizado`, `/publicar-jogo-web`, `/xcode-agentico`
- **Fase 4 — Direção de arte e áudio:** `/consistencia-com-lora`, `/direcao-de-arte-e-style-card`, `/direcao-de-audio-e-sound-bible`, `/gerar-ativos-3d`, `/gerar-sprites-2d`, `/pixel-art-pipeline`, `/ui-hud-e-icones`
- **Fase 5 — Produção de features:** `/audio-adaptativo-no-engine`, `/cenarios-e-tilesets`, `/engine-godot-mobile`, `/engine-realitykit-metal`, `/engine-spritekit-swiftui`, `/engine-unity-mobile`, `/engine-web-phaser`, `/engine-web-threejs`, `/geracao-procedural-com-llm`, `/monetizacao-iap-e-ads`, `/npc-e-dialogo-dinamico`, `/playtest-automatizado`, `/privacidade-lgpd-e-eca-digital`
- **Fase 6 — Produção de assets:** `/animar-sprites`, `/atlas-e-exportacao-2d-mobile`, `/blender-automatizado`, `/cenarios-e-tilesets`, `/consistencia-com-lora`, `/gerar-ativos-3d`, `/gerar-musica`, `/gerar-sfx`, `/gerar-sprites-2d`, `/licencas-e-proveniencia`, `/pixel-art-pipeline`, `/pos-producao-audio-mobile`, `/rigging-e-animacao-3d`, `/ui-hud-e-icones`, `/voz-e-dialogo`
- **Fase 7 — IA em runtime e procedural:** `/audio-adaptativo-no-engine`, `/geracao-procedural-com-llm`, `/ia-runtime-foundation-models`, `/ia-runtime-nuvem-claude`, `/ia-runtime-on-device-llm`, `/npc-e-dialogo-dinamico`, `/voz-e-dialogo`
- **Fase 8 — Polimento, game feel, performance:** `/atlas-e-exportacao-2d-mobile`, `/audio-adaptativo-no-engine`, `/engine-godot-mobile`, `/engine-realitykit-metal`, `/engine-spritekit-swiftui`, `/engine-unity-mobile`, `/engine-web-phaser`, `/engine-web-threejs`, `/ia-runtime-on-device-llm`, `/playtest-automatizado`, `/pos-producao-audio-mobile`
- **Fase 9 — Legal, licenças, proveniência:** `/classificacao-etaria`, `/divulgacao-de-uso-de-ia`, `/ia-runtime-foundation-models`, `/ia-runtime-nuvem-claude`, `/licencas-e-proveniencia`, `/npc-e-dialogo-dinamico`, `/privacidade-lgpd-e-eca-digital`
- **Fase 10 — Monetização, submissão, pós-lançamento:** `/ci-xcode-cloud-fastlane`, `/classificacao-etaria`, `/divulgacao-de-uso-de-ia`, `/monetizacao-iap-e-ads`, `/pos-lancamento-e-telemetria`, `/privacidade-lgpd-e-eca-digital`, `/publicar-jogo-web`, `/submissao-app-store`, `/ui-hud-e-icones`
