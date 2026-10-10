# Catálogo de ferramentas (estado em 10/10/2026)

Tabela completa do que `/instalar-ferramentas` pode instalar. Colunas: para quê · instalação · smoke test · requisito · licença · custo · fonte.
"[s]" = dado de fonte secundária (página oficial não lida); confirme antes de depender. Preços mudam trimestralmente.

## Base e agente

| Ferramenta | Para quê | Instalação | Smoke test | Requisito | Licença | Custo | Fonte |
|---|---|---|---|---|---|---|---|
| Claude Code | agente de código; carrega ferramentas sob demanda (sem teto de ~100 tools) | instalador nativo ou `npm install -g @anthropic-ai/claude-code` (Node 22+) | `claude --version` | macOS/Linux/Windows | proprietária | assinatura ~US$ 20 (Pro) a US$ 200/mês (Max) [s]; API: Opus 5.5 US$ 4/20, Sonnet 5.5 US$ 2/10, Haiku 5.5 US$ 0,10/0,50 por MTok | code.claude.com; docs.claude.com/en/docs/about-claude/models/overview |
| Codex (alternativa) | único outro agente com plug-ins oficiais Unity, Roblox e GPTK | ver openai.com [s] | `codex --version` | — | proprietária | ~US$ 20/mês entrada [s] | notas KQ1 |
| git | versionamento; o Xcode só faz rollback das ações do agente com Git | `brew install git` | `git --version` | — | GPLv2 | grátis | git-scm.com |
| Node.js | MCPs em npm (MobileBuildMCP, ios-simulator-mcp, gltfpack, glTF-Transform) | `brew install node` | `node --version` (18+; 22+ para o Claude Code via npm) | — | MIT | grátis | nodejs.org |
| uv / uvx | MCPs em Python (MCP for Blender, Godot AI, MCP for Unity), CLIs Python | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `uvx --version` | não usar `pip install uv` | MIT/Apache 2.0 | grátis | docs.astral.sh/uv |
| Python 3 | hooks deste repositório, pyloudnorm, scripts | `brew install python` | `python3 --version` | 3.10+ | PSF | grátis | python.org |
| jq | leitura de JSON em hooks/scripts | `brew install jq` | `jq --version` | — | MIT | grátis | jqlang.github.io/jq |

## Camada Apple (alvo app)

| Ferramenta | Para quê | Instalação | Smoke test | Requisito | Licença | Custo | Fonte |
|---|---|---|---|---|---|---|---|
| Xcode 26.3+ / 27 | build, simulador, MCP do Xcode; no 27 o agente boota simulador, toca e tira screenshot | App Store / developer.apple.com | `xcodebuild -version` | 27: Apple silicon + macOS Tahoe 26.6+ | Apple | grátis; Apple Developer Program US$ 99/ano para distribuir [s] | Xcode 27 Release Notes |
| MCP do Xcode | ferramentas do Xcode para o agente externo | `claude mcp add --transport stdio xcode -- xcrun mcpbridge`; ativar "Allow external agents to use Xcode tools" | `claude mcp get xcode` com projeto aberto | Xcode 26.3+ | Apple | grátis | Giving external agents access to Xcode |
| `xcrun mcp-server enable` | MCP sem workspace aberto (CI); `--unsafe-always-allow-all-agents` só em ambiente não assistido | `sudo xcrun mcp-server enable` | — | Xcode 27 (preview) | Apple | grátis | Xcode 27 Release Notes |
| MobileBuildMCP (ex-XcodeBuildMCP) | build/test no simulador, UI automation (AXe), LLDB, logs, Device Hub | `npx -y mobilebuildmcp@latest mcp` ou `brew tap getsentry/xcodebuildmcp && brew install mobilebuildmcp` | `mobilebuildmcp --help` | macOS 14.5+, Xcode 16+, Node 18+ | MIT | grátis (telemetria Sentry, opt-out) | github.com/getsentry/MobileBuildMCP |
| ios-simulator-mcp | `ui_tap`, `ui_swipe`, `ui_type` (ASCII), `screenshot`, `record_video` | `npx -y ios-simulator-mcp@latest` (já em `.mcp.json`) | `claude mcp get ios-simulator` | Facebook IDB (`idb_companion`) [s] | MIT | grátis | github.com/joshuayoes/ios-simulator-mcp |
| Maestro | testes YAML de menus (árvore de acessibilidade); `maestro mcp` embutido | ver github.com/mobile-dev-inc/maestro | `maestro --version` | simulador; sem iOS físico | Apache 2.0 | grátis (Cloud pago) | repositório Maestro |
| Claude Code computer use | clicar no Simulator quando não há MCP; "compile a Swift app, launch it, click through every button" | preview, Pro/Max, macOS | — | macOS | — | incluído no plano | code.claude.com/docs/en/computer-use |
| Xcode Cloud | CI + TestFlight | App Store Connect | — | membership | Apple | 25 h/mês incluídas; US$ 49,99 (100 h) a US$ 3.999,99 | developer.apple.com/xcode-cloud |

## Camada engine

| Ferramenta | Para quê | Instalação | Smoke test | Requisito | Licença | Custo | Fonte |
|---|---|---|---|---|---|---|---|
| unity-agent-plugin (oficial) | 32 skills (`implement-in-app-purchases`, `levelplay-unity-integration`, `2d-pixel-perfect`, `manage-sprite-atlas`, `build-live-game`…) + Unity CLI | `/plugin marketplace add Unity-Technologies/unity-agent-plugin` → `/plugin install unity@unity-agent-plugin` | `/unity:` lista skills | Unity 6+; v0.1.8-beta em 10/10/2026 | Unity Companion License | grátis; Unity por assento [s] | github.com/Unity-Technologies/unity-agent-plugin |
| Unity CLI | instala Editors, cria/abre projetos, builds e testes; o plug-in a usa | vem com o Unity Hub | ver docs.unity.com/en-us/unity-cli | Unity Hub | Unity | grátis | README do plug-in |
| MCP for Unity (CoplayDev) | 48–50 tools; Unity 2021.3–6.x; validação Roslyn; testes | Package Manager git URL `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`; `Configure All Detected Clients` | `claude mcp list` | Python 3.10+ via uv | MIT | grátis (Aura vende camada premium) | github.com/CoplayDev/unity-mcp |
| apple/unityplugins | StoreKit 2, GameKit, Background Assets, CoreHaptics, GameController, PHASE para Unity | ver repositório | — | iOS 15.6+; novos StoreKit/Background Assets exigem Xcode 27 e Unity 2022 LTS+ | Apache 2.0 | grátis | github.com/apple/unityplugins |
| Godot AI (hi-godot) | 46 tools: `project_run`, `test_run`, `logs_read`, `editor_screenshot` do jogo rodando | release em `addons/godot_ai/`; habilitar plug-in; dock → Configure | dock conectado | Godot 4.7+; uv; C# só texto | MIT | grátis (telemetria com opt-out) | github.com/hi-godot/godot-ai |
| Godot 4.7.x | engine; export iOS gera projeto Xcode (`export_project_only` para fastlane) | godotengine.org | `godot --version` | export iOS exige macOS + Xcode; simulador só renderer Compatibility | MIT | grátis | godot-docs Exporting for iOS |
| game-porting-toolkit (skills Apple) | Metal 4, MetalFX, GCController, gpucapture/gpudebug; sem elas "the agent produced code that compiled but rendered incorrectly" | `/plugin marketplace add apple/game-porting-toolkit` → `/plugin install game-porting-skills@game-porting-toolkit` | skills `translating-to-metal4-api` etc. | Apple silicon, macOS 27, Xcode 27 | Apache 2.0 | grátis | github.com/apple/game-porting-toolkit; WWDC26 357 |
| roblox-studio-agent-plugin | `start_stop_play`, `user_keyboard_input`, `screen_capture`, `generate_mesh` sobre o MCP embutido no Studio | ver repositório; Studio → Assistant → Settings → MCP Servers → Enable | tools visíveis | Studio local | ver repo | grátis; distribuição só dentro do Roblox | github.com/Roblox/roblox-studio-agent-plugin |
| Phaser Editor MCP / PlayCanvas MCP | cenas, assets, `scene-get-screenshot` / runtime tools com screenshot e input | npm (ver repositórios) | — | editor respectivo | ver repos | grátis | github.com/phaserjs/editor-mcp-server; github.com/playcanvas/editor-mcp-server |
| Playwright | screenshot e console de jogos web em viewport de iPhone | `npm i -D playwright && npx playwright install` [s] | `npx playwright --version` | Node | Apache 2.0 | grátis | playwright.dev |

## Assets, áudio e pós-processamento

| Ferramenta | Para quê | Instalação | Smoke test | Requisito | Licença | Custo | Fonte |
|---|---|---|---|---|---|---|---|
| MCP for Blender | `execute_blender_code`, renders de verificação, `generate_3d` (Tripo/Rodin/Hunyuan — este último exclui UE/UK/Coreia) | `claude mcp add --transport stdio blender -- uvx mcp-for-blender`; `uvx mcp-for-blender install-addon` | Blender mostra "conectado" | Blender; loopback apenas (sem auth); `BLENDER_MCP_SAFE_MODE=1` disponível | MIT (Blender é GPL — não afeta seus assets) | grátis; geradores pagos à parte | github.com/ahujasid/mcp-for-blender |
| PixelLab MCP | rotações 4/8 direções, estimativa de esqueleto; animação no Aseprite | npm `pixellab-mcp` 1.1.0; comando [s] | — | conta PixelLab | proprietária; confirme termos comerciais | US$ 12 / 24 / 50 por mês [s] | unpkg pixellab-mcp |
| Retro Diffusion MCP | pixel art pay-per-asset, tilesets, animações | ver listagem [s] | — | créditos pré-pagos | proprietária; licença comercial não localizada | ~US$ 0,01/imagem; tileset US$ 0,10; animação US$ 0,07–0,25 [s] | mcpservers.org |
| ElevenLabs MCP (hospedado) | SFX v2 com `loop`, música, voz | `claude mcp add --transport http elevenlabs https://api.elevenlabs.io/v1/mcp` + `ELEVENLABS_API_KEY` | `claude mcp get elevenlabs` | conta; WAV só a partir do tier Pro [s] | proprietária; Eleven Music exclui "Studio Games" em self-serve | por plano [s] | github.com/elevenlabs/elevenlabs-mcp |
| Mubert skills/MCP | música em loop com intensidade | `npx skills add MubertAI/skills` | skill `mubert-generate` carregada | API key | proprietária; free tier não comercial [s] | sob consulta [s] | github.com/MubertAI/skills |
| gltfpack (meshoptimizer) | `-si` simplificar, `-tc` KTX2/BasisU, quantização | `npm i -g gltfpack` | `gltfpack -h` | Node | MIT | grátis | github.com/zeux/meshoptimizer |
| glTF-Transform CLI | `optimize`, `simplify`, `weld`, `resize`, `ktx2` | `npm i -g @gltf-transform/cli` | `gltf-transform --help` | Node | MIT | grátis | github.com/donmccurdy/glTF-Transform |
| PyMusicLooper | pontos de loop, intro/loop/outro, posições em samples | `uv tool install pymusiclooper` | `pymusiclooper --help` | Python; ffmpeg para M4A/AAC | MIT | grátis | github.com/arkrow/PyMusicLooper |
| pyloudnorm | normalização BS.1770 a −18 LUFS / −1 dBTP (não use LUFSNormalizer, PolyForm NC) | `uv pip install pyloudnorm` no venv | `python3 -c "import pyloudnorm"` | Python | MIT | grátis | github.com/csteinmetz1/pyloudnorm |
| rembg + BiRefNet | recorte de fundo de sprites; ToonOut para arte estilizada | `uv tool install rembg` [s] | `rembg --help` | Python; modelos baixados na 1ª execução | rembg MIT [s]; BiRefNet MIT | grátis local; Replicate pago | replicate.com/sprited/birefnet |
| c2patool (c2pa-rs) | assinar/validar manifestos C2PA de proveniência | releases do repositório [s] | `c2patool --version` | — | MIT/Apache 2.0 | grátis | github.com/contentauth/c2pa-rs |
| ffmpeg | vídeo→frames, conversão AAC/CAF | `brew install ffmpeg` | `ffmpeg -version` | — | LGPL/GPL | grátis | ffmpeg.org |

## O que NÃO instalar

- **Hunyuan3D / HunyuanWorld / HY-World** como gerador: a licença lida proíbe usar as saídas fora do "Territory" (exclui UE, UK e Coreia).
- **Suno/Udio** para assets lançados enquanto UMG/Sony litigam; **MMAudio/ThinkSound**, **spine-animation-ai**, **LUFSNormalizer**: não comerciais.
- **Coding-Solo/godot-mcp** (parado desde 16/04/2026, sem screenshot) e **chongdashu/unreal-mcp** (parado desde abril/2025).
- Qualquer MCP que exija expor porta na rede sem autenticação.

Fontes: relatório `reports/Criação de jogos totalmente por IA.md` e `research_notes/` (agentes_de_codigo_e_engines, pipeline_ios_e_aspectos_legais, arte_2d, ativos_3d, audio), com as URLs listadas em cada linha.
