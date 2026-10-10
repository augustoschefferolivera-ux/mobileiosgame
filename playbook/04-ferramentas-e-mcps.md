# Ferramentas, plug-ins e MCPs

Tudo aqui é instalado pela skill `/instalar-ferramentas` (que também gera
`production/ambiente.md`). Esta página explica o que cada peça faz, como verificar e o que
exige cuidado. Comandos de MCP seguem a documentação do Claude Code; os projetos citados
são os mantidos em out/2026 (estrelas e datas lidas no GitHub em 10/10/2026).

## Plug-ins oficiais (Claude Code e Codex)

| Plug-in | Instalar | Quando | Licença |
|---|---|---|---|
| Unity (`unity-agent-plugin`, v0.1.8-beta, 32 skills) | `/plugin marketplace add Unity-Technologies/unity-agent-plugin` | Projetos Unity 6+ | Unity Companion License |
| Apple Game Porting Toolkit 4 (24 skills de Metal 4/MetalFX/controle) | `/plugin marketplace add apple/game-porting-toolkit` | Metal direto; porte; depuração GPU | Apache 2.0 |
| Roblox Studio (`roblox-studio-agent-plugin`) | `/plugin marketplace add Roblox/roblox-studio-agent-plugin` | Só se o alvo for Roblox | ver repo |

## Servidores MCP configurados em `.mcp.json`

| Nome | Comando | Função | Requisitos / cuidados |
|---|---|---|---|
| `xcode` | `xcrun mcpbridge` | Expõe o Xcode 26.3+/27 ao agente: build, testes, simulador (27: boot, instalar, tocar, screenshot), `lldb-mcp`, Organizer | macOS; Xcode 26.3+. Negar acesso ao projeto no 26.3 é irreversível sem Ajustes. Em CI: `sudo xcrun mcp-server enable` (não use `--unsafe-always-allow-all-agents` em desktop) |
| `mobilebuild` | `npx -y mobilebuildmcp@latest mcp` | MobileBuildMCP (ex-XcodeBuildMCP, getsentry): build, simuladores, dispositivos, automação de UI (AXe), LLDB, logs | macOS 14.5+, Xcode 16+; renomeado na 2.7.1 (pacote e variáveis mudaram); telemetria Sentry opt-out |
| `ios-simulator` | `npx -y ios-simulator-mcp@latest` | `ui_tap`, `ui_swipe`, `screenshot`, `record_video` por coordenada | ≥ 1.3.3 (versões anteriores tinham injeção de comando) |
| `blender` | `uvx mcp-for-blender` | Blender MCP (30k★, MIT): `execute_blender_code`, importar/limpar/exportar, integrações Poly Haven/Sketchfab/Tripo/Rodin | Socket local **sem autenticação**: só loopback/VM; instale o add-on com `uvx mcp-for-blender install-addon` |
| `elevenlabs` | HTTP `https://api.elevenlabs.io/v1/mcp` | SFX v2 (`loop`), TTS, Text to Dialogue, Eleven Music (ver licença) | `ELEVENLABS_API_KEY` no ambiente; MCP local está deprecado. Método de autenticação do MCP hospedado (cabeçalho `xi-api-key` vs OAuth via `/mcp`) [confirmar na doc da ElevenLabs] |

Para aprovar os servidores do projeto na primeira execução, o Claude Code pergunta; depois
`claude mcp list` deve mostrar todos conectados.

## MCPs configurados pela própria ferramenta (não estão em `.mcp.json`)

| Ferramenta | Como habilitar | Notas |
|---|---|---|
| MCP for Unity (CoplayDev, 14,8k★, MIT, v10.3.0) | Package Manager → git URL `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity` → `Window → MCP for Unity → Configure All Detected Clients` | Unity 2021.3–6.x; 50 ferramentas; validação Roslyn; testes |
| Godot AI (hi-godot, 2,9k★, MIT) | Add-on em `addons/godot_ai/` a partir de um release; `Project Settings → Plugins`; o dock configura os clientes | Godot 4.7+; GDScript completo, C# text-only; `project_run`, `test_run`, `logs_read`, `editor_screenshot` |
| PixelLab MCP (`pixellab-mcp`) | ver docs do PixelLab | pixel art, rotações, esqueleto; planos [confirmar] |
| Retro Diffusion MCP | ver docs | pay-per-asset [confirmar] |
| Mubert (skills + MCP, set/2026) | ver `MubertAI/skills` | música em loop com intensidade; licença por plano |
| `tripo-mcp` (oficial, alpha, MIT) | ver repo | geração 3D direto do agente |

Limite de ferramentas por cliente: Windsurf/JetBrains ~100, Gemini CLI ~100, OpenCode degrada
após ~40; o Claude Code carrega sob demanda. Ative só os MCPs da fase atual.

## Ferramentas de linha de comando (MIT/Apache) chamadas pelos scripts das skills

| Ferramenta | Instalar | Uso |
|---|---|---|
| gltfpack (meshoptimizer) | `npm i -g gltfpack` | simplificar/quantizar/KTX2 em GLB |
| glTF-Transform | `npm i -g @gltf-transform/cli` | `simplify`, `weld`, `resize`, `ktx2`, `optimize` |
| pyloudnorm | `pip install pyloudnorm soundfile` | −18 LUFS / −1 dBTP |
| PyMusicLooper | `pip install pymusiclooper` | pontos de loop |
| rembg / BiRefNet | `pip install "rembg[cpu]"` (modelo BiRefNet) | recorte de sprites |
| c2pa-rs (`c2patool`) | ver repo contentauth | proveniência C2PA |
| fastlane | `brew install fastlane` | metadados, TestFlight, screenshots |
| Maestro | `curl -Ls "https://get.maestro.mobile.dev" \| bash` | flows YAML de UI (menus); `maestro mcp` |
| Playwright | `npm i -D @playwright/test` | screenshots de jogos web |
| Aseprite + `pixel-mcp` | compra/compilação do Aseprite; `go install` do pixel-mcp | pixel art |

## Variáveis de ambiente esperadas

Nunca no repositório; use o gerenciador de segredos do sistema ou um `.env` ignorado pelo Git.

| Variável | Para |
|---|---|
| `ANTHROPIC_API_KEY` | backend de IA em runtime (nunca no app) |
| `OPENAI_API_KEY` | gpt-image-1.5 / GPT Image 2; `gpt-4o-mini-tts` |
| `GOOGLE_API_KEY` | Nano Banana Pro/2 (Gemini image), Lyria |
| `FAL_KEY` | treino de LoRA FLUX.2, inferência |
| `ELEVENLABS_API_KEY` | SFX v2, TTS, MCP hospedado |
| `TRIPO_API_KEY` / `MESHY_API_KEY` | geração 3D |
| `PIXELLAB_API_KEY` / `RETRO_DIFFUSION_API_KEY` | pixel art [nomes conforme docs de cada um] |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH` | App Store Connect API (fastlane) |

## Verificação rápida

```bash
bash .claude/skills/instalar-ferramentas/scripts/verificar-ambiente.sh
claude mcp list
python3 scripts/check-skills.py
```
