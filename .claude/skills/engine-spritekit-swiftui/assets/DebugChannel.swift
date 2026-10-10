// DebugChannel.swift — canal de depuração para playtest por agente.
// Copie para o projeto (grupo Debug/). Grava o estado do jogo em
// Documents/debug_state.json (lido via `xcrun simctl get_app_container <udid> <bundle> data`
// ou `xcrun devicectl device copy from`) e em os_log (lido via `log show`).
// Ative com a variável de ambiente GAME_DEBUG=1 (simctl: SIMCTL_CHILD_GAME_DEBUG=1) ou em builds DEBUG.

import Foundation
import os

struct DebugSnapshot: Codable, Sendable {
    var scene: String
    var score: Int
    var lives: Int
    var fps: Double
    var frame: Int
    var lastEvent: String
    var lastError: String?
    var hapticsPlayed: Int
    var timestamp: Date
}

@MainActor
final class DebugChannel {
    static let shared = DebugChannel()

    private let log = Logger(subsystem: Bundle.main.bundleIdentifier ?? "game", category: "debug")
    private let url: URL = {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("debug_state.json")
    }()
    private var snapshot = DebugSnapshot(scene: "boot", score: 0, lives: 0, fps: 0, frame: 0,
                                         lastEvent: "launch", lastError: nil, hapticsPlayed: 0,
                                         timestamp: Date())
    private var lastWrite = Date.distantPast
    private var fpsAccumulator: (frames: Int, seconds: Double) = (0, 0)

    let isEnabled: Bool = {
        #if DEBUG
        return true
        #else
        return ProcessInfo.processInfo.environment["GAME_DEBUG"] == "1"
        #endif
    }()

    func setScene(_ name: String) {
        snapshot.scene = name
        event("scene:\(name)")
    }

    func update(score: Int? = nil, lives: Int? = nil) {
        if let score { snapshot.score = score }
        if let lives { snapshot.lives = lives }
    }

    func event(_ name: String) {
        guard isEnabled else { return }
        snapshot.lastEvent = name
        log.info("event=\(name, privacy: .public) scene=\(self.snapshot.scene, privacy: .public) score=\(self.snapshot.score)")
        flush(force: true)
    }

    func error(_ message: String) {
        guard isEnabled else { return }
        snapshot.lastError = message
        log.error("error=\(message, privacy: .public)")
        flush(force: true)
    }

    func hapticPlayed() { snapshot.hapticsPlayed += 1 }

    /// Chame uma vez por frame a partir de SKScene.update(_:) com o delta em segundos.
    func tick(delta: TimeInterval) {
        guard isEnabled else { return }
        snapshot.frame += 1
        fpsAccumulator.frames += 1
        fpsAccumulator.seconds += delta
        if fpsAccumulator.seconds >= 1 {
            snapshot.fps = Double(fpsAccumulator.frames) / fpsAccumulator.seconds
            fpsAccumulator = (0, 0)
        }
        flush(force: false)
    }

    private func flush(force: Bool) {
        let now = Date()
        guard force || now.timeIntervalSince(lastWrite) > 0.5 else { return }
        lastWrite = now
        snapshot.timestamp = now
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        if let data = try? encoder.encode(snapshot) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
