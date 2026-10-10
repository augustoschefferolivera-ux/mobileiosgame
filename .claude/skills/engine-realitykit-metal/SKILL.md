---
name: engine-realitykit-metal
description: >
  Monta e verifica um jogo 3D nativo para iOS com RealityKit (RealityView em SwiftUI, ECS,
  Reality Composer Pro, USDZ) e decide quando descer para Metal 4 instalando as skills oficiais
  do Game Porting Toolkit da Apple; build com xcodebuild e execução/screenshot no simulador.
  Use sempre que o jogo-alvo for 3D nativo iOS (sem Unity/Godot), inclusive quando o usuário
  pedir "SceneKit" — SceneKit está deprecado desde o Xcode 26 e esta skill redireciona para
  RealityKit. Não use para 2D nativo (engine-spritekit-swiftui), Unity/Godot (engine-unity-mobile,
  engine-godot-mobile) nem 3D web (engine-web-threejs).
license: MIT
compatibility: "Claude Code ou Codex; macOS Apple silicon com Xcode 26.3+ (Xcode 27 + macOS 27 para gpucapture/gpudebug do GPTK 4)"
metadata:
  grupo: engines
  alvo: [3d, app]
  fase: [2, 3, 5, 8]
argument-hint: "[nome-do-projeto] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine nativa 3D: RealityKit (e Metal 4 quando preciso)

Entrega um projeto Xcode 3D jogável (SwiftUI + `RealityView`, entidades/componentes/sistemas, assets USDZ dentro do orçamento mobile) e prova que terminou com `scripts/verify.sh`: build, launch no simulador, screenshot, log e `debug_state.json` em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** para 3D nativo iOS: jogos de perspectiva fixa, endless runners 3D, puzzles 3D, AR opcional. A Apple recomenda RealityKit para projetos novos desde que **deprecou o SceneKit em todas as plataformas no Xcode 26**.
- **Use Metal 4 diretamente** só quando RealityKit não alcança o efeito (renderer próprio, dezenas de milhares de instâncias, pós-processamento customizado, port de engine existente). Aí a regra é instalar as skills do Game Porting Toolkit **antes** de escrever Metal: na sessão 357 da WWDC26, sem as skills "the agent produced code that compiled but rendered incorrectly".
- **Não use** para 2D (SpriteKit é mais simples e verificável), para cross-platform (Unity 6.3 LTS) ou para jogos web 3D (Three.js/Babylon).

## Pré-requisitos

- macOS Apple silicon, Xcode 26.3+ (Xcode 27 recomendado: agentes bootam simulador/tocam/screenshot). Reality Composer Pro vem com o Xcode (`Xcode → Open Developer Tool`).
- Xcode como MCP: `claude mcp add --transport stdio xcode -- xcrun mcpbridge` (projeto aberto). Detalhes em `/xcode-agentico`.
- Para o caminho Metal 4 (apenas se for necessário):

```text
/plugin marketplace add apple/game-porting-toolkit
/plugin install game-porting-skills@game-porting-toolkit
```

  Pré-requisitos declarados pela Apple: Mac com Apple silicon, macOS 27 (traz `gpucapture`/`gpudebug`), Xcode 27, Game Porting Toolkit 4. Licença Apache 2.0.
- Ferramentas de assets: Reality Converter (Apple) ou `usdzconvert` para GLB → USDZ; `gltfpack`/glTF-Transform para reduzir malhas antes (skills do grupo 3D).

## Entradas

- Brief com câmera (fixa, orbital, terceira pessoa), número de objetos simultâneos, se usa AR, dispositivos mínimos.
- Assets 3D já otimizados: **≤100 mil triângulos e um conjunto de texturas 2048×2048 por modelo** (orientação da Apple para AR Quick Look, reafirmada em 2021; RealityKit tem "um pouco mais de folga"), em USDZ.
- `production/feature_list.json` com a feature atual.

## Passos

1. **Esqueleto** (fase 2): app SwiftUI com `RealityView` (iOS 18+) cuja closure `make` monta a cena raiz: câmera (`PerspectiveCamera`), luz, chão, jogador. Sem ARKit a menos que o brief peça. Estrutura e ECS em `references/realitykit-ecs.md`. Resultado: `xcodebuild build` sai 0.
2. **Canal de depuração**: reutilize `../engine-spritekit-swiftui/assets/DebugChannel.swift` (grava `Documents/debug_state.json` e `os_log`); chame `tick(delta:)` dentro do `System.update(context:)` principal e `setScene` ao trocar de estado.
3. **Primeira verificação**:

```bash
.claude/skills/engine-realitykit-metal/scripts/verify.sh --feature esqueleto --simulator "iPhone 17"
```

4. **Features** (fase 5) como componentes e sistemas: dados em `Component`s (`struct`), comportamento em `System`s registrados uma vez; física com `PhysicsBodyComponent`/`CollisionComponent`; input por gestos SwiftUI sobre entidades com `InputTargetComponent` + `CollisionComponent`, ou controles virtuais em overlay SwiftUI (`ZStack`). Controle físico via GameController framework (skill `using-game-controller` do GPTK cobre `GCController`).
5. **Assets** (fase 6): monte cenas e materiais no Reality Composer Pro (pacote `RealityKitContent`), carregue com `Entity(named:in:)`; para modelos gerados por IA, passe por `gltfpack`/glTF-Transform → USDZ e confira o orçamento com `xcrun usdchecker`/inspeção no RCP antes de importar. Materiais PBR do USDZ são lidos direto; shaders customizados via Shader Graph do RCP, não Metal.
6. **Decisão Metal 4** (fase 5/8): só se um critério de `references/metal4-gptk.md` for atendido. Então instale as skills do GPTK e siga a ordem: `translating-to-metal4-api` → `managing-metal4-resources`/`managing-metal4-synchronization` → `creating-metal4-shader-pipelines` → `presenting-metal-drawables` → `using-metal-validation` → `using-gpucapture`/`using-gpudebug`/`debugging-rendering-issues` quando algo renderizar errado → `using-metalfx-temporal-upscaler` para ganhar fps renderizando em resolução menor.
7. **Verificar** com `--test` (lógica em structs puros, Swift Testing) e `--metal-validation` (liga `MTL_DEBUG_LAYER` no app lançado para pegar uso incorreto da API); anexe a evidência à feature.
8. **Performance** (fase 8): Metal Performance HUD (Xcode 26) e Instruments; alvo 60 fps (ou 30 estável declarado) no iPhone mais antigo suportado; LODs por classe de dispositivo; texturas ASTC via Asset Catalog; `MetricKit` do iOS 27 reporta taxa de quadros Metal em produção.

## Critério de pronto e evidência

- `scripts/verify.sh --feature <slug> --test` saiu 0 nesta sessão; `screenshot.png` mostra a cena 3D esperada (não tela preta, não tela de launch).
- `app.log` sem mensagens de validação Metal (`--metal-validation`) nem erros de carregamento de USDZ.
- Orçamento registrado em `resumo.md`: triângulos e texturas por modelo (do RCP ou do `gltf-transform inspect`).
- Parse check não é execução: tela preta no simulador é falha, mesmo com build verde.

## Verificar no simulador/dispositivo

- O simulador renderiza Metal/RealityKit, mas **performance só vale em dispositivo**: instale com `xcrun devicectl device install app` e puxe `debug_state.json` com `xcrun devicectl device copy from`.
- Captura de GPU: `gpucapture` (macOS 27) ou Xcode → Debug → Capture GPU Workload; analise com `gpudebug` (skill `using-gpudebug`).
- Xcode 26.0 não oferecia GPU profiling nem shader debugging para Metal 4; profiling chegou no 26.2 (exige OS 26.2+). Shader debugging: verifique as release notes da sua versão.

## Armadilhas conhecidas

- **Código gerado em SceneKit**: recuse e reescreva em RealityKit; SceneKit não recebe novas features/otimizações (Xcode 26 RN).
- **Metal sem skills**: compila e renderiza errado (residência ausente, offsets de argument buffer, barreiras largas) — WWDC26 357.
- **AR acidental**: templates do Xcode ligam ARKit/câmera; para jogos não-AR remova `ARView`/`AnchorEntity(.camera)` e a permissão de câmera (NSCameraUsageDescription) para não cair em revisão por permissão sem uso.
- **Orçamento estourado**: modelos de geradores 3D saem com 200–500 mil tris; sempre `gltfpack -si` antes do USDZ. Licenças: evite Hunyuan3D/HY-World (saídas proibidas na UE/UK/Coreia) — ver skills de 3D.
- **Controle físico no simulador**: Xcode 27 só conecta controller ao simulador de visionOS; teste gamepad em dispositivo.
- **Pinch**: Device Hub não envia toque de dois dedos; ofereça alternativa de um dedo para câmera orbital.
- **Custo**: tudo local; GPTK e skills são gratuitos (Apache 2.0). Metal 4 custa tempo de agente: só entre nele com motivo medido.

## Fontes

- Xcode 26 Release Notes (SceneKit deprecado, Metal Performance HUD, limitações Metal 4): https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes
- Xcode 26.2 Release Notes (GPU profiling Metal 4): https://developer.apple.com/documentation/xcode-release-notes/xcode-26_2-release-notes
- Xcode 27 Release Notes (agentes no simulador; game controller só visionOS; Device Hub): https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- apple/game-porting-toolkit (pré-requisitos, instalação, lista de skills): https://github.com/apple/game-porting-toolkit e https://github.com/apple/game-porting-toolkit/blob/main/game-porting-skills/README.md
- WWDC26 sessão 357 "Speedrun your game port with agentic coding": https://developer.apple.com/videos/play/wwdc2026/357/
- WWDC26 Games guide (Metal 4.1, MetalFX, GPTK 4): https://developer.apple.com/wwdc26/guides/games/
- RealityKit e Reality Composer Pro (confira assinaturas de API na versão do SDK): https://developer.apple.com/documentation/realitykit
- Orçamento ≤100K tris / 2048² (relatório interno, seção Ativos 3D; origem WWDC 2018 AR Quick Look, reafirmado 2021): `reports/Criação de jogos totalmente por IA.md`
- gltfpack / glTF-Transform: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md ; https://github.com/donmccurdy/glTF-Transform
- Interacting with devices using the command line: https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
