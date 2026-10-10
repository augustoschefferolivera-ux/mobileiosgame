# RealityKit para jogos iOS: estrutura, ECS e assets

Leia ao criar o esqueleto e sempre que o agente propuser "um script por objeto" (padrão de outras engines que não existe aqui). Nomes de API conforme a documentação da Apple (https://developer.apple.com/documentation/realitykit); confirme assinaturas no SDK em uso.

## Layout

```
MeuJogo3D/
  MeuJogo3DApp.swift
  UI/GameView.swift            # RealityView { content in ... } update: { ... } + overlay SwiftUI (HUD, botões)
  Scene/SceneBuilder.swift     # monta raiz: câmera, luz, chão, jogador, spawners
  ECS/Components/*.swift       # struct X: Component  (dados)
  ECS/Systems/*.swift          # struct XSystem: System (comportamento; update(context:))
  Core/GameState.swift         # regras puras, Sendable, testáveis
  Debug/DebugChannel.swift     # da skill engine-spritekit-swiftui
  Packages/RealityKitContent/  # pacote do Reality Composer Pro (cenas .usda, materiais, Shader Graph)
```

## RealityView (iOS 18+)

```swift
import SwiftUI
import RealityKit

struct GameView: View {
    @State private var state = GameState()

    var body: some View {
        ZStack {
            RealityView { content in
                let root = SceneBuilder.makeRoot()          // Entity com câmera, luz, chão
                content.add(root)
                // registre sistemas uma vez por app
                MovementSystem.registerSystem()
                SpawnSystem.registerSystem()
            } update: { content in
                // reaja a mudanças de `state` (ex.: pausa) sem reconstruir a cena
            }
            .ignoresSafeArea()
            .gesture(DragGesture().onChanged { value in
                InputBus.shared.drag(translation: value.translation) // vira componente no jogador
            })
            HUDView(state: state)                           // SwiftUI por cima
        }
    }
}
```

- Câmera: entidade com `PerspectiveCamera()` posicionada por código; sem ARKit o `RealityView` usa essa câmera.
- Luz: `DirectionalLight()` + `ImageBasedLightComponent` se quiser reflexos; mantenha uma luz direcional em mobile.

## ECS: regras para o agente

- **Component = dados**: `struct Health: Component { var value: Int }`. Registre tipos customizados com `Health.registerComponent()` antes de usar em cenas carregadas do RCP.
- **System = comportamento**: implemente `init(scene:)` e `update(context: SceneUpdateContext)`; itere com `context.entities(matching: EntityQuery(where: .has(Health.self)), updatingSystemWhen: .rendering)`.
- **Ordem**: declare dependências com `static var dependencies: [SystemDependency]` (`.after(InputSystem.self)`).
- **Nada de lógica em `update:` do RealityView**: é chamado quando o SwiftUI reavalia, não por frame.
- **Delta**: `context.deltaTime`. Chame `DebugChannel.shared.tick(delta:)` no sistema principal.
- **Física**: `PhysicsBodyComponent(massProperties:material:mode:)` + `CollisionComponent(shapes:)`; eventos via `scene.subscribe(to: CollisionEvents.Began.self)`. Para jogos arcade, prefira movimento cinemático (`.kinematic`) e checagem própria de colisão em `Core/`.
- **Input em entidades**: `InputTargetComponent()` + `CollisionComponent` tornam a entidade alvo de gestos SwiftUI (`.targetedToAnyEntity()`).

## Assets

- **USDZ** é o formato de entrada. GLB de geradores → `gltfpack -si 0.5 -tc` (ou `gltf-transform optimize`) → Reality Converter/`usdzconvert` → USDZ. Texturas em USDZ ficam PNG/JPEG (KTX2 não é aceito); reduza resolução antes.
- **Reality Composer Pro**: monte prefabs (jogador, inimigos) como cenas `.usda` no pacote `RealityKitContent`; carregue com `try await Entity(named: "Player", in: realityKitContentBundle)`; clone com `entity.clone(recursive: true)` para spawns.
- **Orçamento mobile** (Apple, AR Quick Look): ≤100 mil triângulos, um conjunto de texturas 2048², ≤10 s de animação por modelo; gere versões por classe de dispositivo se precisar de mais.
- **Animações**: `entity.availableAnimations` + `playAnimation(_:transitionDuration:startsPaused:)`; skeletal via USDZ exportado com rig (skills de rigging do grupo 3D).
- **Áudio espacial**: `SpatialAudioComponent` + `AudioFileResource`; para SFX 2D de HUD use AVFoundation.

## Testes

- `Core/` (regras, spawn tables, pontuação) com Swift Testing.
- Cena: teste de fumaça por screenshot via `scripts/verify.sh`; compare visualmente com a referência (skill `playtest-automatizado`).
