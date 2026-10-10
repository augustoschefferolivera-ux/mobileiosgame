---
paths:
  - "**/*.swift"
---
# Regras para código Swift (SpriteKit, RealityKit, SwiftUI)

- Swift 6.x com concorrência estrita: UI e cena no `@MainActor`; nada de `DispatchQueue.main.async`
  para contornar isolamento; use `Task { @MainActor in ... }` ou funções isoladas.
- SceneKit está deprecado desde o Xcode 26: 3D novo em RealityKit; 2D em SpriteKit (não deprecado).
- Zero alocação no `update(_:)`: pré-crie nós, ações (`SKAction`) e buffers; reutilize texturas
  via `SKTextureAtlas`/`.spriteatlas`.
- Áudio: música em AAC via `AVAudioPlayer`/`AVAudioEngine`; SFX curtos em PCM/CAF pré-carregados;
  configure `AVAudioSession` para interrupções (chamada, notificação) e volte do background.
- Entrada: alvos de toque ≥ 44pt; respeite `safeAreaInsets`; suporte a Game Controller quando o
  brief pedir.
- Segredos nunca no app. IA em runtime: `FoundationModels` primeiro; provedor externo só após
  consentimento (5.1.2(i)) e via backend.
- Toda string visível em `Localizable.xcstrings` (pt-BR e en); nenhum texto de placeholder.
- Testes: Swift Testing ou XCTest para lógica; `scripts/verify.sh` constrói, roda no simulador
  e tira screenshot. Uma feature não fecha sem isso.
