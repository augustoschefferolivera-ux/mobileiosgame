# Estrutura de projeto SwiftUI + SpriteKit e armadilhas de Swift 6

Leia ao criar o esqueleto (fase 2) e sempre que o compilador reclamar de concorrência.

## Layout recomendado

```
MeuJogo/
  MeuJogoApp.swift          # @main App → WindowGroup { GameRootView() }
  UI/GameRootView.swift     # SwiftUI: SpriteView(scene:) + overlays (pausa, HUD em SwiftUI se preferir)
  Scenes/GameScene.swift    # SKScene: desenha e encaminha input
  Scenes/MenuScene.swift
  Core/GameState.swift      # struct/enum puros: regras, pontuação, níveis (testáveis sem SpriteKit)
  Core/Physics.swift        # enum PhysicsCategory: UInt32 { case player = 1 << 0 ... }
  Debug/DebugChannel.swift  # copiado de assets/ desta skill
  Assets.xcassets/
    Sprites.spriteatlas/    # pastas .spriteatlas DENTRO do catálogo
    AppIcon.appiconset/
  Tests/GameStateTests.swift  # Swift Testing (@Test) sobre Core/
```

Regra de dependência: `Core/` não importa SpriteKit nem SwiftUI. A cena observa o estado e desenha; a UI SwiftUI mostra menus. Isso deixa 80% da lógica testável em segundos por `xcodebuild test`.

## SpriteView

```swift
import SwiftUI
import SpriteKit

struct GameRootView: View {
    @State private var scene: GameScene = {
        let s = GameScene(size: CGSize(width: 390, height: 844))
        s.scaleMode = .resizeFill          // cena acompanha o tamanho real da view
        return s
    }()

    var body: some View {
        SpriteView(scene: scene, preferredFramesPerSecond: 60,
                   options: [.ignoresSiblingOrder],
                   debugOptions: [.showsFPS, .showsNodeCount]) // remova no release
            .ignoresSafeArea()
    }
}
```

- `.resizeFill`: a cena recebe `didChangeSize(_:)`; reposicione HUD ali.
- Safe area: dentro da cena use `view?.safeAreaInsets` (em `didMove(to:)` e `didChangeSize`) para afastar HUD do notch/Dynamic Island e da barra inferior.
- Orientação: fixe em Info.plist (`UISupportedInterfaceOrientations`) em vez de tratar rotação em runtime.

## Input por toque

- `touchesBegan/Moved/Ended` na cena; converta com `touch.location(in: self)`.
- Para botões virtuais, use `SKSpriteNode` com `name` e `nodes(at:)`; para gestos complexos, `UIGestureRecognizer` na `SKView` (`view?.addGestureRecognizer`).
- Pinch não é testável pelo Device Hub do Xcode 27 (sem toque de dois dedos); prefira controles de um dedo em jogos que o agente vai testar.

## Swift 6: o que o código gerado costuma errar

| Sintoma do compilador | Causa comum | Correção |
|---|---|---|
| "Main actor-isolated property ... can not be mutated from a nonisolated context" | `Task {}` desanexado ou `Timer.scheduledTimer` chamando a cena | Faça a lógica em `update(_:)` ou `Task { @MainActor in ... }`; cena é `@MainActor` |
| "Sending 'self' risks causing data races" | passar a `SKScene` para closure `@Sendable` (`DispatchQueue.global`, `URLSession`) | Envie só valores `Sendable` (structs) e volte ao ator principal para aplicar |
| "Non-sendable type 'SKNode'..." | guardar nós em `actor`/tipo `Sendable` | Nós ficam na cena; o estado (`GameState`) é `Sendable` |
| Warnings sobre `static var` global | singletons mutáveis (`static var shared`) | `static let` imutável, `@MainActor static var`, ou injeção |
| `nonisolated(unsafe)` espalhado | atalho do agente para silenciar | Aceite só em buffers de performance documentados |

Outras regras:
- Delta time: use `currentTime` recebido em `update(_:)`; guarde `lastUpdate` e ignore saltos > 1 s (volta do background).
- Pausa: `scene.isPaused = true` + `view.isPaused` quando o app vai para background (`UIApplication.didEnterBackgroundNotification` ou `scenePhase` no SwiftUI).
- Áudio: `SKAction.playSoundFileNamed` para SFX curtos; música em `AVAudioPlayer`. Configure `AVAudioSession` para respeitar o botão de silêncio (`.ambient`).

## Texture atlases

- Crie `Sprites.spriteatlas` dentro de `Assets.xcassets`; arraste PNGs `@2x/@3x`.
- Carregue uma vez: `let atlas = SKTextureAtlas(named: "Sprites")` e `atlas.textureNamed("hero_run_01")`; pré-carregue com `SKTextureAtlas.preloadTextureAtlases([atlas]) { ... }` na tela de loading.
- Para pixel art: `texture.filteringMode = .nearest` e tamanhos de cena múltiplos inteiros do pixel lógico.

## Testes

```swift
import Testing
@testable import MeuJogo

@Test func pontuacaoSobeAoColetar() {
    var state = GameState()
    state.apply(.collect(.coin))
    #expect(state.score == 10)
}
```

Rode com `scripts/verify.sh --test`. Teste de cena (XCTest + `SKView` fora da tela) só quando a feature for visual e mesmo assim exija screenshot.
