# Game Center (GameKit) e haptics (CoreHaptics) em jogos SpriteKit

Leia na fase 5 quando o brief pedir ranking/conquistas ou feedback tátil. APIs citadas estão na documentação da Apple (GameKit, Core Haptics); confira assinaturas na versão do SDK que o projeto usa.

## Game Center

1. No target: Signing & Capabilities → `+ Game Center`. Em App Store Connect, crie o app e os leaderboards/achievements (IDs em snake_case estáveis).
2. Autenticação assim que a UI aparecer (nunca em `init`):

```swift
import GameKit

@MainActor
final class GameCenterService {
    static let shared = GameCenterService()
    private(set) var isAuthenticated = false

    func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            if let viewController {
                // apresente a partir da UIWindowScene ativa; em SwiftUI use um UIViewControllerRepresentable ou a janela chave
                _ = viewController
                return
            }
            self?.isAuthenticated = (error == nil) && GKLocalPlayer.local.isAuthenticated
            GKAccessPoint.shared.location = .topLeading
            GKAccessPoint.shared.isActive = self?.isAuthenticated ?? false
        }
    }

    func submit(score: Int, leaderboardID: String) async {
        guard isAuthenticated else { return }
        try? await GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local,
                                             leaderboardIDs: [leaderboardID])
    }
}
```

3. Conquistas: `GKAchievement(identifier:)`, `percentComplete = 100`, `GKAchievement.report([ach])`.
4. Teste: conta sandbox de Game Center no simulador/dispositivo; o `GKAccessPoint` só aparece autenticado.
5. Apple Games app (iOS 26+): jogos com Game Center aparecem automaticamente no app Games — não exige código extra, mas exige metadados corretos em App Store Connect.

## CoreHaptics

- Verifique suporte: `CHHapticEngine.capabilitiesForHardware().supportsHaptics` (falso no simulador e em iPads antigos).
- Um engine por app; reinicie em `resetHandler`; pare ao ir para background.

```swift
import CoreHaptics

@MainActor
final class Haptics {
    private var engine: CHHapticEngine?

    init() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.resetHandler = { [weak self] in try? self?.engine?.start() }
        try? engine?.start()
    }

    func tap(intensity: Float = 0.8, sharpness: Float = 0.6) {
        guard let engine else { return }
        let event = CHHapticEvent(eventType: .hapticTransient, parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
        ], relativeTime: 0)
        if let pattern = try? CHHapticPattern(events: [event], parameters: []),
           let player = try? engine.makePlayer(with: pattern) {
            try? player.start(atTime: CHHapticTimeImmediate)
        }
    }
}
```

- Para feedback simples (acerto, botão) `UIImpactFeedbackGenerator` basta e consome menos; CoreHaptics vale para padrões sincronizados com áudio (`.ahap`).
- Evidência: haptics não aparecem em screenshot; registre no `debug_state.json` um contador `hapticsPlayed` e valide em dispositivo físico via `devicectl device copy from`.

## Unity em vez de nativo?

Se o jogo migrar para Unity, a Apple publica plug-ins Apache-2.0 equivalentes (GameKit, CoreHaptics, StoreKit 2, Background Assets) em `apple/unityplugins` — ver `engine-unity-mobile`.

Fontes: GameKit e Core Haptics em https://developer.apple.com/documentation/gamekit e https://developer.apple.com/documentation/corehaptics (confira a assinatura das APIs no SDK); Apple Developer — Games: https://developer.apple.com/games/ ; apple/unityplugins: https://github.com/apple/unityplugins
