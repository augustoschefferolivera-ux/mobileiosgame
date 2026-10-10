# Índice de skills

Gerado por `python3 scripts/check-skills.py`. Não edite à mão. Invoque uma skill com `/nome`
ou deixe o agente carregá-la quando a descrição casar com a tarefa.

Total: 49 skills válidas.

## Por grupo

### processo

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/brief-do-jogo` | 2d, 3d, app, web | 1 | Escreve o brief de UMA página do jogo em design/game-brief.md a partir de uma ideia solta ou das respostas da entrevista: pitch, loop central, objetivo e estado de falha, até 3 pilares, MVP (≤ 7 itens verificáveis), f... |
| `/checkpoint-e-retomada` | 2d, 3d, app, web | 0, 5 | Salva e repõe a memória do projeto entre sessões: ao encerrar, reescreve o bloco CHECKPOINT de progress.md (feature em andamento, próximo passo, último verify, bloqueios), anexa o histórico da sessão, mantém productio... |
| `/ciclo-de-feature` | 2d, 3d, app, web | 5 | Executa uma — e só uma — feature por sessão: lê progress.md e feature_list.json, escolhe a próxima, escreve o teste e o critério de aceite antes de codar, implementa com diff pequeno, roda scripts/verify.sh (construir... |
| `/critico-independente` | 2d, 3d, app, web | 5, 8 | Invoca o subagente `critico` (.claude/agents/critico.md) em contexto limpo para avaliar uma feature, build ou asset ANTES de fechá-lo: entrega brief, critério de aceite, screenshots/vídeo, logs e métricas; recebe nota... |
| `/escolher-engine-e-alvo` | 2d, 3d, app, web | 2 | Decide engine e alvo (2D/3D × web/app) com uma matriz de critérios objetivos — o agente fecha sozinho construir→rodar→ver→ler log? o formato de cena é texto? exporta para iOS? IAP/anúncios? licença? — entre SwiftUI+Sp... |
| `/escopo-e-anti-padroes` | 2d, 3d, app, web | 1, 5, 8 | Verifica o escopo do jogo contra o brief e contra a lista de coisas que agentes de IA tratam mal (multiplayer em tempo real, 3D pesado/física complexa, Unreal e formatos binários, arte só por prompt, voz central por T... |
| `/estacao-gpu-remota` | 2d, 3d, app, web | 0, 4, 6 | Configura e usa uma máquina Windows com GPU NVIDIA (ex.: RTX 5060) como estação de geração remota acessada por SSH via Tailscale a partir de um PC Linux (Arch): OpenSSH Server no Windows, chaves, WSL2 com CUDA quando ... |
| `/iniciar-projeto` | 2d, 3d, app, web | 0, 1, 2, 3 | Inicializa um projeto de jogo do zero no padrão de agente inicializador da Anthropic adaptado a jogos: entrevista curta → brief de uma página → ADR de engine e alvo → gera init.sh, feature_list.json (JSON, com critéri... |
| `/instalar-ferramentas` | 2d, 3d, app, web | 0 | Detecta SO, engine e alvo do projeto e instala só o que ele precisa: plug-ins oficiais do Claude Code (Unity, Game Porting Toolkit da Apple, Roblox), servidores MCP (Xcode via xcrun mcpbridge, MobileBuildMCP, ios-simu... |
| `/montar-loop-de-verificacao` | 2d, 3d, app, web | 3 | Monta no dia 1 o loop construir → rodar → screenshot → ler log que o agente fecha sozinho: para a engine escolhida, define os comandos de build, execução, captura e leitura de log, instala o canal interno de depuração... |

### engines

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/build-ios-sem-mac` | 2d, 3d, app | 0, 3, 10 | Compila, assina e envia ao TestFlight/App Store um jogo iOS a partir de um PC Linux (Arch) sem Mac local, usando macOS remoto: Xcode Cloud (25 h/mês incluídas na membership), runner macOS do GitHub Actions ou Mac alug... |
| `/ci-xcode-cloud-fastlane` | 2d, 3d, app | 0, 3, 10 | Configura integração e distribuição contínuas do jogo iOS: Xcode Cloud (25 h/mês incluídas na membership, TestFlight integrado, scripts ci_scripts), fastlane com App Store Connect API Key (pilot, deliver, match, scree... |
| `/empacotar-web-para-app` | 2d, 3d, web, app | 2, 10 | Decide se e como levar um jogo web (Phaser, PixiJS, Three.js, Babylon) à App Store via Capacitor (WKWebView) ou mantê-lo como PWA, cobrindo os riscos de revisão 4.2 (funcionalidade mínima), 4.7 (HTML5 games), 2.5.2 (c... |
| `/engine-web-phaser` | 2d, web | 2, 3, 5, 8 | Monta, codifica e verifica um jogo web 2D para iPhone com Phaser 4.2.1 + TypeScript 5.9 + Vite 8 feito por agentes: esqueleto (390×844 retrato, FIT, DPR ≤ 2), arquitetura lógica pura + cena fina (scripts/novo-modulo.s... |
| `/engine-web-threejs` | 3d, web | 2, 3, 5, 8 | Monta e verifica um jogo web 3D para iPhone com Three.js (0.186 / r186) ou Babylon.js 9 + TypeScript + Vite: WebGL2 sempre e WebGPU com fallback (Safari 26+), assets glTF com meshopt/Draco e texturas KTX2 (KTX2Loader ... |
| `/playtest-automatizado` | 2d, 3d, app, web | 3, 5, 8 | Executa o loop de playtest por agente em um jogo iOS/web: três camadas (agentes nativos do Xcode 27; MobileBuildMCP + ios-simulator-mcp; Maestro YAML para menus), computer use no Simulator, roteiro em production/playt... |

### arte-2d

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/animar-sprites` | 2d, web | 6 | Produz animações de sprite 2D (idle, walk, attack, jump, hit, death) para Phaser 4 web mobile por uma de quatro rotas: sprite sheet com o template oficial "Sprite Sheet Generator" do ComfyUI (Nano Banana Pro, grade 2×... |
| `/atlas-e-exportacao-2d-mobile` | 2d, web | 6, 8 | Empacota sprites, UI e tiles em atlases JSON hash/multi-atlas para Phaser 4 web mobile e exporta para o build: scripts próprios (empacotar_atlas.py com Pillow ou free-tex-packer-core, padding/extrusão/trim/ nine-slice... |
| `/cenarios-e-tilesets` | 2d, web | 5, 6 | Produz cenários 2D para Phaser 4 web mobile: tilesets em grade (tiles-base por bioma com IA, costura seamless verificada por script, extrusão para tilemaps, autotile/terrenos editados no Tiled ou Sprite Fusion e carre... |
| `/consistencia-com-lora` | 2d, web | 4, 6 | Mantém personagens e estilo consistentes ao longo de dezenas de assets de um jogo Phaser web mobile: decide entre as três camadas (prefixo + folha + seed fixa; referência por imagem em cada chamada — Nano Banana Pro, ... |
| `/direcao-de-arte-e-style-card` | 2d, web | 1, 4 | Cria a art bible curta do jogo (paleta hex, proporções, traço, iluminação, câmera, resolução-base 390×844 @2x para Phaser, orçamento de textura, "o que nunca fazer"), o style card de 1 página que vira prefixo de todo ... |
| `/gerar-sprites-2d` | 2d, web | 4, 6 | Gera sprites 2D (personagens, inimigos, itens, props, efeitos) com fundo transparente e estilo consistente a partir do style card, para um jogo Phaser 4 web mobile (assets @2x): gpt-image-1.5 com background transparen... |
| `/pixel-art-pipeline` | 2d, web | 4, 6 | Produz pixel art em grade real (16/32/64 px, paleta limitada, sem anti-aliasing) para um jogo Phaser 4 web mobile com ferramentas pixel-native — PixelLab (esqueleto, rotações 4/8, MCP pixellab-mcp), Retro Diffusion (p... |
| `/ui-hud-e-icones` | 2d, web | 4, 6, 10 | Gera a UI do jogo Phaser 4 web mobile com IA de forma governada: ícones em SVG com Recraft V4 Vector (rasterizados @2x para o atlas), peças de HUD separadas em PNG transparente (moldura, slot, barra, botão em 3 estado... |

### 3d

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/ambientes-e-mundos-3d` | 3d, app, web | 5, 6 | Cria cenários, níveis e mundos 3D para jogo mobile com IA: geração de mundo (World Labs Marble), splats e a rota segura "exportar malha + bake", montagem de cena no Blender com assets CC0, skybox/HDRI gerados e níveis... |
| `/blender-automatizado` | 3d, app, web | 0, 6 | Opera o Blender por agente: instala e usa o Blender MCP (mcp-for-blender) para limpar, retopologizar, fazer UV, bake e exportar GLB/FBX de assets gerados por IA, inspecionar cenas (look, get_scene_info) e importar ass... |
| `/gerar-ativos-3d` | 3d, app, web | 4, 6 | Gera malhas 3D (personagens, props, cenário) com IA a partir de um brief e de uma imagem de referência, escolhendo o gerador pela licença de saída e pelo orçamento mobile, e registra proveniência. Use sempre que o usu... |
| `/materiais-e-texturas-pbr` | 3d, app, web | 4, 6, 8 | Obtém, corrige e empacota materiais PBR e texturas para jogo mobile: aproveita o PBR dos geradores (Tripo, Meshy 7, TRELLIS.2), texturiza malhas sem textura (MV-Adapter, Material Anything), gera texturas sem costura c... |
| `/otimizar-3d-para-mobile` | 3d, app, web | 6, 8 | Reduz um modelo 3D gerado por IA ao orçamento do Safari do iPhone (Three.js): retopo/low-poly quando preciso, LODs (0,5/0,25/0,1) ligados a THREE.LOD, texturas ≤2048² em KTX2 (UASTC/ETC1S), meshopt/Draco, GLB final e ... |
| `/rigging-e-animacao-3d` | 3d, app, web | 6 | Coloca esqueleto, pesos de pele e animações em um personagem ou criatura 3D gerado por IA (auto-rig do Tripo/Meshy, UniRig → SkinTokens, Puppeteer, Mixamo), obtém movimento por vídeo/texto (Rokoko Create, DeepMotion, ... |
| `/sprites-pre-renderizados-de-3d` | 2d, web, app | 6 | Transforma um modelo 3D (gerado por IA ou CC0) em sprites 2D para Phaser: rig e clipes → render em lote no Blender headless com câmera ortográfica (top-down 3/4, isométrica ou lateral), 4/8 direções, N frames por ação... |

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
| `/ia-runtime-nuvem-claude` | 2d, 3d, app, web | 7, 9 | Liga o jogo ao Claude (Haiku 5.5 para NPCs e conteúdo em massa) com segurança e custo previsível: backend/proxy mínimo sem chave no app, prompt caching com prefixo fixo de 512+ tokens, saída estruturada por JSON Schem... |
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

### meta

| Skill | Alvo | Fases | O que faz |
|---|---|---|---|
| `/criar-ou-melhorar-skill` | 2d, 3d, app, web | 0 | Cria uma skill nova ou melhora uma existente neste banco seguindo playbook/CONVENCOES-DE-SKILLS.md: nome kebab-case sem acento, frontmatter completo (name, description "insistente", license, metadata grupo/alvo/fase),... |

## Por fase do roteiro

- **Fase 0 — Preparação do ambiente:** `/blender-automatizado`, `/build-ios-sem-mac`, `/checkpoint-e-retomada`, `/ci-xcode-cloud-fastlane`, `/criar-ou-melhorar-skill`, `/estacao-gpu-remota`, `/iniciar-projeto`, `/instalar-ferramentas`, `/licencas-e-proveniencia`
- **Fase 1 — Conceito e brief:** `/brief-do-jogo`, `/classificacao-etaria`, `/direcao-de-arte-e-style-card`, `/escopo-e-anti-padroes`, `/iniciar-projeto`
- **Fase 2 — Engine/alvo e esqueleto:** `/empacotar-web-para-app`, `/engine-web-phaser`, `/engine-web-threejs`, `/escolher-engine-e-alvo`, `/iniciar-projeto`
- **Fase 3 — Loop de verificação:** `/build-ios-sem-mac`, `/ci-xcode-cloud-fastlane`, `/engine-web-phaser`, `/engine-web-threejs`, `/iniciar-projeto`, `/montar-loop-de-verificacao`, `/playtest-automatizado`, `/publicar-jogo-web`
- **Fase 4 — Direção de arte e áudio:** `/consistencia-com-lora`, `/direcao-de-arte-e-style-card`, `/direcao-de-audio-e-sound-bible`, `/estacao-gpu-remota`, `/gerar-ativos-3d`, `/gerar-sprites-2d`, `/materiais-e-texturas-pbr`, `/pixel-art-pipeline`, `/ui-hud-e-icones`
- **Fase 5 — Produção de features:** `/ambientes-e-mundos-3d`, `/audio-adaptativo-no-engine`, `/cenarios-e-tilesets`, `/checkpoint-e-retomada`, `/ciclo-de-feature`, `/critico-independente`, `/engine-web-phaser`, `/engine-web-threejs`, `/escopo-e-anti-padroes`, `/geracao-procedural-com-llm`, `/monetizacao-iap-e-ads`, `/npc-e-dialogo-dinamico`, `/playtest-automatizado`, `/privacidade-lgpd-e-eca-digital`
- **Fase 6 — Produção de assets:** `/ambientes-e-mundos-3d`, `/animar-sprites`, `/atlas-e-exportacao-2d-mobile`, `/blender-automatizado`, `/cenarios-e-tilesets`, `/consistencia-com-lora`, `/estacao-gpu-remota`, `/gerar-ativos-3d`, `/gerar-musica`, `/gerar-sfx`, `/gerar-sprites-2d`, `/licencas-e-proveniencia`, `/materiais-e-texturas-pbr`, `/otimizar-3d-para-mobile`, `/pixel-art-pipeline`, `/pos-producao-audio-mobile`, `/rigging-e-animacao-3d`, `/sprites-pre-renderizados-de-3d`, `/ui-hud-e-icones`, `/voz-e-dialogo`
- **Fase 7 — IA em runtime e procedural:** `/audio-adaptativo-no-engine`, `/geracao-procedural-com-llm`, `/ia-runtime-nuvem-claude`, `/npc-e-dialogo-dinamico`, `/voz-e-dialogo`
- **Fase 8 — Polimento, game feel, performance:** `/atlas-e-exportacao-2d-mobile`, `/audio-adaptativo-no-engine`, `/critico-independente`, `/engine-web-phaser`, `/engine-web-threejs`, `/escopo-e-anti-padroes`, `/materiais-e-texturas-pbr`, `/otimizar-3d-para-mobile`, `/playtest-automatizado`, `/pos-producao-audio-mobile`
- **Fase 9 — Legal, licenças, proveniência:** `/classificacao-etaria`, `/divulgacao-de-uso-de-ia`, `/ia-runtime-nuvem-claude`, `/licencas-e-proveniencia`, `/npc-e-dialogo-dinamico`, `/privacidade-lgpd-e-eca-digital`
- **Fase 10 — Monetização, submissão, pós-lançamento:** `/build-ios-sem-mac`, `/ci-xcode-cloud-fastlane`, `/classificacao-etaria`, `/divulgacao-de-uso-de-ia`, `/empacotar-web-para-app`, `/monetizacao-iap-e-ads`, `/pos-lancamento-e-telemetria`, `/privacidade-lgpd-e-eca-digital`, `/publicar-jogo-web`, `/submissao-app-store`, `/ui-hud-e-icones`
