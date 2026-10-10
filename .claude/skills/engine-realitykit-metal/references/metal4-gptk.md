# Quando descer para Metal 4 e como usar as skills do Game Porting Toolkit

## Critérios para sair do RealityKit (precisa de pelo menos um, medido)

1. Instrumentos mostram GPU-bound com RealityKit mesmo após LOD/texturas ASTC/menos luzes, e a meta de fps não fecha no dispositivo mínimo.
2. Efeito impossível no Shader Graph do RCP (ex.: pós-processamento full-screen customizado, compute para simulação de partículas em massa, deferred próprio).
3. Port de um engine/jogo existente em Metal 3, D3D12 ou Vulkan.
4. Mais de ~10 mil instâncias dinâmicas com estado por instância (GPU-driven rendering).

Sem um desses, Metal 4 só adiciona risco: na WWDC26 (sessão 357) a Apple mostrou que agentes sem as skills produziram Metal que "compiled but rendered incorrectly" (residência de recursos ausente, offsets de argument buffer errados, barreiras amplas demais).

## Instalação das skills oficiais (Apache 2.0)

```text
/plugin marketplace add apple/game-porting-toolkit
/plugin install game-porting-skills@game-porting-toolkit
```

Codex CLI: `codex plugin marketplace add https://github.com/apple/game-porting-toolkit` + `codex plugin add game-porting-skills@game-porting-toolkit`. Gemini CLI: `gemini extensions install /caminho/game-porting-toolkit/game-porting-skills`.

Pré-requisitos declarados: Apple silicon; macOS 27 (`gpucapture`, `gpudebug`); Xcode 27 (MCP do Xcode e `lldb-mcp`); Game Porting Toolkit 4.

## Qual skill invocar em cada momento (nomes reais do repositório)

| Momento | Skill da Apple | Observação |
|---|---|---|
| Qualquer chamada MTL4*/tradução Metal 3 → 4 | `translating-to-metal4-api` | Tabelas de tradução e arquitetura TBDR |
| Buffers, texturas, heaps, residency sets | `managing-metal4-resources` | Residência é a falha nº 1 de código gerado |
| Barreiras, fences, events | `managing-metal4-synchronization` | Barreiras amplas demais matam performance em TBDR |
| Criar PSOs, `MTL4Compiler`, cache | `creating-metal4-shader-pipelines` | |
| `CAMetalLayer`, `nextDrawable`, vsync, `CAMetalDisplayLink` | `presenting-metal-drawables` | Tela preta/"vsync não funciona" |
| Gerenciar lifetimes com metal-cpp | `managing-metal-cpp-lifetimes` | Só se usar C++ |
| Converter shaders DXIL | `compiling-with-metal-shaderconverter`, `integrating-metal-shaderconverter-shaders` | Ports |
| Upscaling para ganhar fps | `using-metalfx-temporal-upscaler` (`MTL4FXTemporalScaler`) | Renderize em 60–70% e suba |
| Frame interpolation | `using-metalfx-frame-interpolation` | Avalie latência em jogos de reflexo |
| Gamepad (`GCController`) | `using-game-controller` | Também útil fora do Metal |
| Ligar validação (`MTL_DEBUG_LAYER`, `MTL_SHADER_VALIDATION`) | `using-metal-validation` | Sempre antes de screenshot de verificação |
| Capturar `.gputrace` da app rodando | `using-gpucapture` | macOS 27 |
| Inspecionar `.gputrace` | `using-gpudebug` | Lê encoders, bindings, texturas |
| Tela preta, cores erradas, z-fighting | `debugging-rendering-issues` | Com ou sem trace |

Skills de workflow (`porting-discover`, `porting-plan-goal`, `porting-start-milestone`, `porting-execute`, `porting-validate`, `porting-handoff`, `porting-status`, com `porting-methodology` sempre carregada) só fazem sentido para **ports** de código existente; para um renderer novo, use as expert skills diretamente e mantenha o loop desta skill (`verify.sh` + screenshot).

## Loop de verificação Metal

1. `scripts/verify.sh --feature <slug> --metal-validation` (liga `MTL_DEBUG_LAYER=1` no app via `SIMCTL_CHILD_`); erros de validação aparecem em `app.log`.
2. Em dispositivo: `gpucapture` → `gpudebug` para confirmar bindings; Metal Performance HUD para fps/MetalFX.
3. Compare `screenshot.png` com a referência (RealityKit ou mock) antes de aceitar.

Fontes: https://github.com/apple/game-porting-toolkit ; https://github.com/apple/game-porting-toolkit/blob/main/game-porting-skills/README.md ; https://developer.apple.com/videos/play/wwdc2026/357/ ; https://developer.apple.com/wwdc26/guides/games/
