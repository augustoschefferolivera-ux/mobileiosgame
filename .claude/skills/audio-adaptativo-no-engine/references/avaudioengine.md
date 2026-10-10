# Receita AVAudioEngine para SpriteKit/RealityKit (iOS)

Nomes de API conforme o framework AVFoundation da Apple; a documentação atual (iOS 18/26) não pôde ser lida nesta pesquisa — confirme assinaturas no Xcode do projeto. Preferir `AVAudioEngine` a `SKAudioNode`/`AVAudioPlayer` quando houver camadas, loops por samples ou ducking.

## Grafo

```
AVAudioPlayerNode (música: intro/loop/stems) ─┐
AVAudioPlayerNode × N (pool de SFX)          ─┼─▶ AVAudioMixerNode por bus (musica, sfx, ui, voz, ambiente) ─▶ engine.mainMixerNode ─▶ outputNode
AVAudioPlayerNode (voz)                      ─┘
```

- Um `AVAudioMixerNode` por bus; `outputVolume` do mixer = volume do bus (persistido em `UserDefaults`).
- Pool de 8–16 `AVAudioPlayerNode` para SFX; round-robin; todos conectados e o engine já `start()`ado na tela de título.
- Formato comum do grafo: 44,1 kHz; SFX em `AVAudioPCMBuffer` carregados de `.caf` PCM/IMA4 via `AVAudioFile`; música em `AVAudioFile` (AAC) por `scheduleSegment`/`scheduleFile` ou em buffers PCM quando precisar de loop por samples (custo de memória: ~10 MB por minuto estéreo 16-bit).

## Sessão

```swift
let session = AVAudioSession.sharedInstance()
try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers]) // respeita o botão de silêncio e mistura com a música do usuário
try session.setPreferredIOBufferDuration(0.005)   // ~5 ms; meça o valor efetivo em session.ioBufferDuration
try session.setActive(true)
```

Trate `AVAudioSession.interruptionNotification` (chamada/Siri: pausar e retomar) e `routeChangeNotification` (fones conectados/desconectados). App em segundo plano: pausar o engine; retomar em `didBecomeActive`.

## Loop por samples e camadas

```swift
let loopBuf: AVAudioPCMBuffer = ...     // trecho LOOP_START..LOOP_END cortado no pós (mesmo comprimento em todos os stems)
let introBuf: AVAudioPCMBuffer = ...
musicNode.scheduleBuffer(introBuf, at: nil, options: [])          // toca a intro já
musicNode.scheduleBuffer(loopBuf, at: nil, options: [.loops])      // enfileira o loop logo após a intro, sem gap
musicNode.play()
// Stems: um AVAudioPlayerNode por stem, todos com scheduleBuffer(stemLoopBuf, at: startTime, options: [.loops])
// e o MESMO startTime (AVAudioTime(sampleTime:atRate:)) para começar alinhados; intensidade = rampa de volume por nó.
```

Rampa de ganho (ducking/intensidade): não há rampa automática em `AVAudioMixerNode.outputVolume`; faça um `Timer`/`CADisplayLink` ou um `AVAudioUnitEQ` de ganho e interpole em 10–20 passos; ou use `AVAudioEnvironmentNode`/`AVAudioMixing` conforme o caso.

## Transição em barra

```swift
let sr = loopBuf.format.sampleRate
let samplesPorBarra = Int64(sr * 60.0 / bpm * 4.0)            // 4/4
guard let last = musicNode.lastRenderTime, let now = musicNode.playerTime(forNodeTime: last) else { return }
let pos = now.sampleTime - loopStartSampleTime                 // posição relativa ao início do loop
let proximaBarra = ((pos / samplesPorBarra) + 1) * samplesPorBarra + loopStartSampleTime
let when = AVAudioTime(sampleTime: proximaBarra, atRate: sr)
novaMusicaNode.scheduleBuffer(novoLoopBuf, at: when, options: [.loops])
novaMusicaNode.play(at: when)
// fade-out do nó antigo durante 1 barra, depois stop()
```

## SFX sem latência

- Buffers em memória (`AVAudioPCMBuffer`), nós conectados e engine rodando antes do primeiro toque.
- Variação: `AVAudioUnitTimePitch` por nó do pool (pitch em cents, ±200) ou escolher arquivo `_01.._05` em round-robin.
- Medir: log de `CACurrentMediaTime()` no toque e no `completionHandler`/início do render; alvo < 20 ms.

## Checklist de teste no dispositivo

- Botão de silêncio ligado → sem som (`.ambient`), jogo continua.
- Música do usuário tocando → mistura, não interrompe.
- Chamada recebida → pausa; ao voltar, música retoma no mesmo estado.
- Fones conectados durante o jogo → sem crash, volume ok.
- Troca `explora → combate` ouvida sem clique 5 vezes; loop 3 repetições sem clique.
