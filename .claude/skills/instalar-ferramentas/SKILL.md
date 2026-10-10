---
name: instalar-ferramentas
description: >
  Detecta SO, engine e alvo do projeto e instala só o que ele precisa: plug-ins oficiais do Claude Code
  (Unity, Game Porting Toolkit da Apple, Roblox), servidores MCP (Xcode via xcrun mcpbridge, MobileBuildMCP,
  ios-simulator-mcp, MCP for Unity, Godot AI, MCP for Blender, PixelLab, Retro Diffusion, ElevenLabs, Mubert),
  uv, Node e CLIs MIT (gltfpack, glTF-Transform, pyloudnorm, PyMusicLooper, rembg/BiRefNet, c2patool). Para cada
  item dá o comando, o smoke test, a licença, o requisito de sistema e o custo. Use sempre que o usuário disser
  "instalar", "configurar ambiente", "faltou ferramenta", "MCP não conecta", "adicionar plug-in", ou quando um
  comando de outra skill falhar por ferramenta ausente. Não use para decidir a engine (/escolher-engine-e-alvo)
  nem para montar o loop de build/screenshot (/montar-loop-de-verificacao).
license: MIT
compatibility: "Claude Code (ou Codex para os plug-ins oficiais); macOS obrigatório para Xcode, simulador iOS e export iOS"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [0]
argument-hint: "[engine] [--alvo app|web|ambos] [--so-verificar]"
disable-model-invocation: false
user-invocable: true
---

# Instalar ferramentas

Deixa o ambiente pronto para a engine e o alvo escolhidos e prova isso com `scripts/verificar-ambiente.sh --strict` saindo 0 e um `docs/ambiente.md` com versões e data.

## Quando usar / quando não usar

- **Use** na fase 0 (depois de `/escolher-engine-e-alvo` ter gravado `production/engine.txt`), quando um MCP não conecta, quando um comando falha com "command not found", ou ao trocar de máquina.
- **Use com `--so-verificar`** para só listar o que falta, sem instalar nada.
- **Não use** para escolher engine ou MCP "melhor" (isso é `/escolher-engine-e-alvo`), nem para escrever o verify da engine (`/montar-loop-de-verificacao`). Não instale ferramentas de assets (Blender, PixelLab, ElevenLabs) antes de o brief dizer que o jogo precisa delas: cada uma tem custo ou chave.

## Pré-requisitos

- Terminal com permissão de instalar pacotes; em macOS, Homebrew (`brew`).
- Internet. Claude Code já instalado (`claude --version`).
- O princípio das convenções: **não reinventar**. Se existe plug-in oficial ou MCP mantido, instale-o e use; a tabela completa, com licença e custo por item, está em `references/catalogo-de-ferramentas.md`.

## Entradas

- `production/engine.txt` (uma linha: `spritekit`, `realitykit`, `unity`, `godot`, `phaser`, `pixijs`, `threejs`, `babylonjs`, `capacitor`) ou o ADR em `docs/decisoes/ADR-0001-engine-e-alvo.md`.
- Alvo (`app`, `web`, `ambos`) e, do brief, se o jogo usa assets 2D, 3D, música, SFX, voz.
- `.mcp.json` do projeto, que já declara `xcode`, `mobilebuild`, `ios-simulator`, `blender` e `elevenlabs` (escopo de projeto; o Claude Code pede aprovação na primeira sessão).

## Passos

1. **Diagnóstico.** Só verifica presença (`command -v`), não instala nada:

```bash
bash .claude/skills/instalar-ferramentas/scripts/verificar-ambiente.sh --engine "$(cat production/engine.txt)" --strict
```

   Resultado observável: lista `OK`/`FALTA`/`falta?` por grupo e um resumo. Instale só o que estiver `FALTA` (obrigatório) para a engine/alvo e os opcionais que o brief pede.

2. **Base** (todas as engines). `uv` com o instalador oficial, nunca `pip install uv` (o README do MCP for Blender avisa que o pip pode não criar `uvx`):

```bash
brew install git node jq            # macOS; Node 18+ (MobileBuildMCP), 22+ se instalar Claude Code via npm
curl -LsSf https://astral.sh/uv/install.sh | sh
uv --version && uvx --version && node --version
```

3. **Camada Apple** (alvo `app`, qualquer engine). Xcode 26.3+ é o mínimo para o Xcode virar servidor MCP; Xcode 27 (Swift 6.4, só Apple silicon, macOS Tahoe 26.6+) deixa o agente iniciar simuladores, tocar na tela e tirar screenshots. No Xcode: Settings → Intelligence → "Allow external agents to use Xcode tools"; o projeto precisa estar aberto no Xcode.

```bash
xcodebuild -version
claude mcp add --transport stdio xcode -- xcrun mcpbridge      # já está em .mcp.json; use se quiser escopo de usuário
claude mcp get xcode                                           # smoke test: status conectado
npx -y mobilebuildmcp@latest --help                            # MobileBuildMCP (MIT; macOS 14.5+, Xcode 16+, Node 18+)
npx -y mobilebuildmcp@latest init                              # instala as skills opcionais do MobileBuildMCP
```

   `ios-simulator-mcp` (MIT, ~2,2 mil estrelas) dá `ui_tap`, `ui_swipe`, `screenshot`, `record_video`; depende do Facebook IDB (`idb_companion`) — instalação do IDB: verifique em https://github.com/joshuayoes/ios-simulator-mcp [secundário, confirmar]. Use versão ≥ 1.3.3 (as anteriores tinham injeção de comando).

4. **Camada engine.** Só a da sua engine:

| Engine | Comando (dentro do Claude Code, salvo indicação) | Smoke test | Requisito | Licença |
|---|---|---|---|---|
| Unity 6.3 LTS | `/plugin marketplace add Unity-Technologies/unity-agent-plugin` e `/plugin install unity@unity-agent-plugin` | digitar `/unity:` lista as skills; `/plugin` mostra `unity` habilitado | Unity 6+; Unity CLI (vem com o Unity Hub) | Unity Companion License |
| Unity (alternativa comunitária) | Package Manager → Add from git URL `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`; depois `Window → MCP for Unity → Configure All Detected Clients` | `claude mcp list` mostra o servidor | Unity 2021.3–6.x; Python 3.10+ via `uv` | MIT |
| Godot 4.7+ | baixe a release do Godot AI em https://github.com/hi-godot/godot-ai/releases para `addons/godot_ai/`; Project Settings → Plugins → Godot AI; no dock, **Configure** para o Claude Code | dock mostra "conectado"; `claude mcp list` | Godot 4.7+; `uv`; GDScript completo, C# só texto | MIT |
| RealityKit / Metal 4 | `/plugin marketplace add apple/game-porting-toolkit` e `/plugin install game-porting-skills@game-porting-toolkit` | skills `translating-to-metal4-api`, `using-metalfx-temporal-upscaler` aparecem | Apple silicon, macOS 27, Xcode 27 | Apache 2.0 |
| Roblox | plug-in oficial em https://github.com/Roblox/roblox-studio-agent-plugin; no Studio: Assistant → Settings → MCP Servers → Enable | ferramentas `get_studio_state`, `screen_capture` disponíveis | Roblox Studio local (claude.ai web não conecta) | ver repositório |

   Para Phaser/PixiJS/Three.js/Babylon.js não há plug-in de engine: a verificação é por navegador (Playwright) e a skill `engine-web-*` cuida disso.

5. **Camada de assets e áudio** (só o que o brief pede). MCP for Blender roda Python arbitrário em um socket local sem autenticação: só em `localhost` ou VM.

```bash
claude mcp add --transport stdio blender -- uvx mcp-for-blender   # já em .mcp.json
uvx mcp-for-blender install-addon                                  # add-on no Blender
claude mcp add --transport http elevenlabs https://api.elevenlabs.io/v1/mcp   # já em .mcp.json; autenticação: ver passo 5a
npx skills add MubertAI/skills                                     # skills + MCP da Mubert (loop, intensidade)
```

   5a. ElevenLabs: o `.mcp.json` passa `xi-api-key: ${ELEVENLABS_API_KEY}`; exporte a variável antes de abrir o Claude Code. A pesquisa registrou o MCP hospedado como OAuth [secundário, confirmar em https://github.com/elevenlabs/elevenlabs-mcp]. Nunca cole a chave em arquivo versionado.
   5b. PixelLab MCP: pacote npm `pixellab-mcp` 1.1.0 (rotações, estimativa de esqueleto); exige conta/API key PixelLab; comando de execução: verifique em https://app.unpkg.com/pixellab-mcp@1.1.0/files/README.md [secundário, confirmar]. Retro Diffusion MCP: listagem em https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp [secundário, confirmar comando e termos comerciais].

6. **CLIs MIT para pós-processamento** (instale quando a skill de asset pedir):

```bash
npm install -g gltfpack @gltf-transform/cli        # meshoptimizer (MIT) e glTF-Transform (MIT)
uv tool install pymusiclooper                       # PyMusicLooper (MIT) — loops de música
uv pip install --system pyloudnorm                  # ou dentro do venv do projeto; pyloudnorm (MIT) é biblioteca
uv tool install rembg                               # recorte de fundo; modelos BiRefNet são MIT [secundário, confirmar nome do pacote]
gltfpack -h && gltf-transform --help && pymusiclooper --help
```

   `c2patool` (C2PA, contentauth/c2pa-rs, MIT/Apache 2.0): binários nas releases do repositório; método de instalação [secundário, confirmar em https://github.com/contentauth/c2pa-rs].

7. **Registrar o ambiente.** Escreva `docs/ambiente.md` com: data, SO e versão, `xcodebuild -version`, versão da engine fixada, saída de `claude mcp list`, versões das CLIs (`gltfpack -v`, `node --version`, `uv --version`). É o que o ADR cita em "Risco de conhecimento" e o que a próxima máquina reproduz.

8. **Re-verificar e aprovar MCPs.** Rode o passo 1 de novo até `0 obrigatórias faltando`. Na primeira sessão o Claude Code pede aprovação dos servidores de `.mcp.json`; confira com `/mcp` que todos estão conectados.

## Critério de pronto e evidência

- `bash .claude/skills/instalar-ferramentas/scripts/verificar-ambiente.sh --engine <engine> --strict` sai 0 (saída salva em `docs/ambiente.md`).
- `claude mcp list` mostra conectados os servidores que a engine/alvo exigem (ao menos `xcode` ou `mobilebuild` para alvo app).
- Para cada ferramenta paga ou com chave, `docs/ambiente.md` anota plano, custo e onde a chave vive (variável de ambiente, nunca no repositório).
- Não há "pronto" por instalação bem-sucedida de pacote: o smoke test de cada item rodou (`--help`, `claude mcp get`, dock conectado).

## Armadilhas conhecidas

- **Xcode 26.3**: negar ao agente acesso a um projeto em Desktop/Downloads/Documents é irreversível sem ir a Ajustes do Sistema (release notes). Decida com cuidado na primeira execução.
- **Xcode 27** só instala em Apple silicon e macOS Tahoe 26.6+; Device Hub não envia toque de dois dedos; controle de jogo só conecta ao simulador de visionOS (release notes).
- **MobileBuildMCP** foi renomeado de XcodeBuildMCP na 2.7.1: pacote npm, binários e variáveis de ambiente mudaram; configurações antigas quebram (CHANGELOG). Telemetria de erros via Sentry, com opt-out.
- **GUI não herda PATH**: clientes abertos pelo Dock não acham `uvx` (`spawn uvx ENOENT`); use o caminho completo (`which uvx`) na configuração (README do MCP for Blender).
- **MCP for Blender e MCP do UE 5.8** não têm autenticação por padrão: loopback apenas; nunca exponha na rede.
- **Unity CLI**: "not every change is logged or can be undone from the Editor, so keep your project under version control" (README do plug-in). **Unity AI** cobra créditos que usuários relatam esgotar em horas; preço de Unity Personal reportado em US$ 10/mês após trial [secundário, confirmar].
- **Godot AI** exige Godot 4.7+ e trata C# como texto (não compila .NET); Godot MCP do Coding-Solo (5,9 mil estrelas) está sem push desde 16/04/2026 e não tira screenshot — prefira o Godot AI. Export templates do Godot devem casar exatamente com a versão [secundário].
- **Limite de ferramentas por cliente** (~100 em Windsurf/Junie/Gemini CLI, ~40 em OpenCode) não afeta o Claude Code, que carrega ferramentas sob demanda; ainda assim, não habilite MCPs que o projeto não usa.
- **Custos recorrentes**: assinaturas de agente ~US$ 20–200/mês [secundário]; PixelLab US$ 12/24/50 por mês [secundário]; Retro Diffusion a partir de ~US$ 0,01 por imagem [secundário]; ElevenLabs SFX em WAV só a partir do tier Pro [secundário]; Xcode Cloud inclui 25 h/mês na Apple Developer Program membership.
- **Licenças de saída** são tratadas por `/licencas-e-proveniencia`; esta skill só garante que a ferramenta roda.

## Fontes

- Claude Code — MCP (`claude mcp add`, escopos, `.mcp.json`): https://code.claude.com/docs/en/mcp
- Claude Code — Plugins (marketplaces, `/plugin`): https://code.claude.com/docs/en/plugins/overview
- Apple — Giving external agents access to Xcode (`xcrun mcpbridge`): https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode
- Apple — Xcode 26.3 Release Notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-26_3-release-notes
- Apple — Xcode 27 Release Notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- getsentry/MobileBuildMCP (README e CHANGELOG): https://github.com/getsentry/MobileBuildMCP
- joshuayoes/ios-simulator-mcp: https://github.com/joshuayoes/ios-simulator-mcp
- Unity-Technologies/unity-agent-plugin: https://github.com/Unity-Technologies/unity-agent-plugin
- CoplayDev/unity-mcp: https://github.com/CoplayDev/unity-mcp
- hi-godot/godot-ai: https://github.com/hi-godot/godot-ai
- apple/game-porting-toolkit: https://github.com/apple/game-porting-toolkit
- Roblox/roblox-studio-agent-plugin: https://github.com/Roblox/roblox-studio-agent-plugin
- ahujasid/mcp-for-blender: https://github.com/ahujasid/mcp-for-blender
- uv — instalação: https://docs.astral.sh/uv/getting-started/installation/
- elevenlabs/elevenlabs-mcp: https://github.com/elevenlabs/elevenlabs-mcp · MubertAI/skills: https://github.com/MubertAI/skills
- pixellab-mcp 1.1.0: https://app.unpkg.com/pixellab-mcp@1.1.0/files/README.md · Retro Diffusion MCP [secundário]: https://mcpservers.org/servers/retro-diffusion/retro-diffusion-mcp
- zeux/meshoptimizer (gltfpack): https://github.com/zeux/meshoptimizer · donmccurdy/glTF-Transform: https://github.com/donmccurdy/glTF-Transform
- csteinmetz1/pyloudnorm: https://github.com/csteinmetz1/pyloudnorm · arkrow/PyMusicLooper: https://github.com/arkrow/PyMusicLooper
- BiRefNet (MIT) via Replicate: https://replicate.com/sprited/birefnet/readme · contentauth/c2pa-rs: https://github.com/contentauth/c2pa-rs
- Relatório interno `reports/Criação de jogos totalmente por IA.md` (seções "Unity, Xcode 27 e Godot", "Stack recomendado", "Checklist de riscos") e `research_notes/.../agentes_de_codigo_e_engines.md` (KQ3).
