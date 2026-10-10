---
name: audio-adaptativo-no-engine
description: >
  Implementa a camada de reprodução e áudio adaptativo no engine do jogo: buses e mixer,
  loops por samples, camadas/stems por intensidade, transições em barra, ducking de música
  sob voz/SFX e SFX de UI sem latência, usando AVAudioEngine/AVAudioPlayerNode
  (SpriteKit/RealityKit), Unity Audio Mixer (com as skills oficiais audio-setup-mixers e
  optimize-audio), Godot AudioStreamPlayer/buses ou Howler.js/Web Audio. Arquitetura
  realista: gerar offline → camadas → loops → lógica adaptativa convencional; FMOD/Wwise sem
  geração; Lyria RealTime só protótipo. Use quando o usuário pedir "tocar a música no jogo",
  "música que muda com a ação", "mixer", "volume por categoria", "som atrasado" ou "loop
  clicando no engine". Não gera assets (/gerar-*) nem normaliza (/pos-producao-audio-mobile).
license: MIT
compatibility: "Claude Code ou Codex; macOS + Xcode para SpriteKit/RealityKit; Unity 6+ com unity-agent-plugin; Godot 4.x"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [5, 7, 8]
argument-hint: "[engine spritekit|realitykit|unity|godot|web] [feature: musica-adaptativa|mixer|sfx-ui]"
disable-model-invocation: false
user-invocable: true
---

# Áudio adaptativo no engine

Entrega um `AudioManager` (ou equivalente) com buses por categoria, loop por samples, camadas por intensidade, transições em barra e ducking, mais testes; a evidência é o jogo rodando no simulador/dispositivo com log de eventos de áudio e a nota do humano de que a música muda com o estado sem clique e a UI responde sem atraso.

## Quando usar / quando não usar

- **Use** na fase 5 (feature "áudio") assim que existir pelo menos um loop e um SFX normalizados; e na fase 8 para ducking, polish e latência.
- **Use** para decidir middleware: a resposta padrão para um solo dev é **sem middleware** (API nativa do engine); FMOD/Wwise só se o projeto já os usa.
- **Não use** para gerar música em tempo real no jogo lançado: Lyria RealTime é `v1alpha`, instrumental, sem Vertex e sem preço público; Magenta RealTime 2 em tempo real exige Apple Silicon (Mac). Ambos só para protótipo/companheiro.
- **Não use** esta skill para assets: eles vêm de `/gerar-musica`, `/gerar-sfx`, `/voz-e-dialogo` e passam por `/pos-producao-audio-mobile`.

## Pré-requisitos

| Engine | API | Instalar / invocar |
| --- | --- | --- |
| SpriteKit / RealityKit (iOS nativo) | `AVAudioEngine`, `AVAudioPlayerNode`, `AVAudioMixerNode`, `AVAudioSession` | Xcode; nenhum pacote. Receita em `references/avaudioengine.md` |
| Unity 6+ | Audio Mixer (grupos, snapshots, parâmetros expostos), `AudioSource.PlayScheduled`, `AudioSettings.dspTime` | `/plugin marketplace add Unity-Technologies/unity-agent-plugin`; invoque **`audio-setup-mixers`** para rotear AudioSources em grupos existentes e **`optimize-audio`** para import settings/CPU do mixer (Unity Companion License: use, não copie) |
| Godot 4.x | `AudioStreamPlayer{,2D,3D}`, layout de buses, `AudioServer`, `AudioStreamInteractive`/`AudioStreamSynchronized` (4.3+) | Godot fixado na fase 2; receita em `references/unity-godot-web.md` |
| Web (PWA/WebView) | Howler.js (MIT) ou Web Audio direto (`AudioBufferSourceNode`, `GainNode`) | `npm i howler`; ressalvas Safari em `references/unity-godot-web.md` |
| Middleware (opcional) | FMOD (grátis abaixo de US$ 200K de receita, depois US$ 5.000/projeto [secundário, confirmar]); Wwise | só se já adotado; nenhum tem recurso generativo |

## Entradas

1. `design/sound-bible.md` §3 (BPM/tom/camadas/transições por estado), §5 (buses, prioridades, ducking), §7 (formatos).
2. Assets finais em `./assets/audio/{musica,sfx,voz}/` com `loop_points` em samples (`PROVENANCE.md`).
3. Estados do jogo que disparam música (máquina de estados do gameplay) e lista de eventos de SFX (da lista de assets).
4. Engine e versão fixados na fase 2.

## Passos

1. **Desenhar o grafo de buses** conforme a bible §5: Master ← {Música, SFX, UI, Voz, Ambiente}; cada bus com volume persistido nas opções do jogador; limitador/soft clip no master quando o engine oferecer. Documente em `design/audio/arquitetura-audio.md` (meia página).
2. **Implementar o `AudioManager`** com API mínima: `play(sfx, variation: auto, pitch: ±2 st)`, `playMusic(state)`, `setIntensity(0…1)`, `duck(bus, dB, ms)`, `setBusVolume(bus, dB)`. Receitas por engine:
   - iOS nativo: `references/avaudioengine.md` (AVAudioSession `.ambient` para respeitar o botão de silêncio e misturar com a música do usuário; `AVAudioPlayerNode.scheduleBuffer(... options: .loops)`; pool de nós para SFX; `AVAudioMixerNode` por bus).
   - Unity: Audio Mixer com um grupo por bus, parâmetros expostos para volume, snapshots para estados; `PlayScheduled(dspTime)` para alinhar em barra. Antes de rotear dezenas de AudioSources, rode a skill oficial `audio-setup-mixers`.
   - Godot: buses no layout de áudio, `AudioStreamPlayer.bus`, `AudioServer.set_bus_volume_db`; `AudioStreamInteractive` para transições com clipes e `AudioStreamSynchronized` para stems.
   - Web: `references/unity-godot-web.md` (Howler `sprite`/`loop`, desbloqueio por gesto do usuário; Web Audio `loopStart/loopEnd` e `start(when)`).
3. **Loop por samples**: carregue intro e loop em buffers PCM; agende intro e, no sample exato do fim da intro, o loop com `.loops` (iOS) / `PlayScheduled` (Unity) / `loop_offset` (Godot) / `loopStart`+`loopEnd` (Web). Nunca dependa de marcadores do container nem de "loop" de player de alto nível para música em camadas.
4. **Camadas por intensidade**: todos os stems iniciam juntos no mesmo sample (mesmo comprimento, mesmos pontos de loop) e a intensidade controla só o ganho de cada camada (rampa 0,5–2 s). Verticalidade primeiro; re-sequenciamento horizontal só se a bible pedir.
5. **Transições em barra**: calcule a próxima barra a partir do BPM e da posição em samples (`samplesPorBarra = sr × 60 / BPM × batidas`), agende a entrada da nova música/stinger nesse instante e o fade-out da anterior em 1 barra. Para "combate entra em ≤3 s" use stinger imediato + troca em barra.
6. **Ducking**: ao tocar voz, reduza Música/Ambiente −6 dB em 100–200 ms e restaure em 500 ms após o fim; dano do jogador abaixa SFX restantes −3 dB por 200 ms (bible §4). Implemente como rampa de ganho no bus, não cortando sons.
7. **SFX de UI sem latência**: buffers PCM/IMA4 pré-carregados em memória, nós já conectados ao grafo, iniciar o engine na tela de título (não no primeiro toque); iOS: `AVAudioSession.setPreferredIOBufferDuration(0.005)` e medir; Unity: `DSP Buffer Size` "Best latency" e `Load Type` Decompress On Load (via `optimize-audio`); Web: pré-decodificar e desbloquear contexto no primeiro gesto. Meta: toque → som < 20 ms na medição com log de timestamps.
8. **Testar**: testes unitários da máquina de estados musical (estado → stems/ganhos esperados) e do cálculo de barra; teste de integração que roda a cena, dispara `combate`, `vitória`, `menu` e grava log com `sampleTime` de cada troca; validar no simulador e no dispositivo, com alto-falante e fone, interrupção por chamada/Siri e app em segundo plano (música deve pausar/retomar).
9. **Evidência**: `production/evidencias/<data>-audio-engine/` com log de eventos, vídeo/screenshot do estado e nota do humano ("transição em barra sem clique; UI < 20 ms; ducking ok").

## Critério de pronto e evidência

- [ ] `AudioManager` com buses, volumes persistidos e API mínima; `design/audio/arquitetura-audio.md` escrito.
- [ ] Música em loop por samples ouvida 3× sem clique no **dispositivo**; camadas alinhadas; transição em barra registrada em log.
- [ ] Ducking sob voz e sob dano funcionando (log + ouvido).
- [ ] Latência de SFX de UI medida e < 20 ms (log de timestamps) ou justificativa.
- [ ] Interrupção (chamada), silêncio (botão), segundo plano e fones conectados/desconectados testados.
- [ ] Testes passando em CI; evidência em `production/evidencias/`. Um parse check não é uma execução.
- [ ] Mix no dispositivo revisado pelo subagente `diretor-de-audio` (volumes por bus, ducking, formatos) e pelo humano.

## Armadilhas conhecidas

- **Gerar música em runtime**: Lyria RealTime (`models/lyria-realtime-exp`, `v1alpha`, 48 kHz 16-bit PCM estéreo, `bpm` 60–200, `scale`; mudar bpm/scale exige `reset_context`; instrumental; sem Vertex; sem preço) e Magenta RealTime 2 (Apple Silicon) servem a protótipo; custo, bateria, rede e previsibilidade na revisão da App Store inviabilizam no loop central.
- **Middleware sem ganho**: FMOD/Wwise não têm geração; adicionam licença e build steps. Reactional Music é motor por regras (sem ML) para música licenciada reativa; termos mobile não confirmados.
- **AAC em polifonia**: decodificador de hardware toca um stream; SFX simultâneos em PCM/IMA4 (docs arquivadas da Apple; revalidar).
- **Loop por player de alto nível** (SKAudioNode, AudioSource.loop simples) não garante o sample exato; camadas desalinham com o tempo.
- **Stems com pontos de loop diferentes** = deriva audível em minutos.
- **AVAudioSession errado**: `.soloAmbient` (padrão) corta a música do usuário e é o que a maioria dos jogadores não quer; `.ambient` respeita o botão de silêncio e mistura. Decida e documente.
- **Engine iniciado no primeiro toque** causa o primeiro SFX atrasado; inicie antes.
- **Pitch aleatório em UI** confunde o usuário: variação só em gameplay.
- **Chatbot/TTS em runtime** entra em classificação etária e 5.1.2(i): ver skills de IA em runtime.
- **Unity**: criar grupos de mixer não tem API pública; a skill oficial `audio-setup-mixers` inventaria e roteia, mas pede que você crie grupos na janela Audio Mixer; não edite `.mixer` à mão.

## Exportar para mobile

Carregamento: música/ambiente/voz como streams AAC (.m4a) de `./assets/audio/musica` e `voz`; SFX como buffers PCM/IMA4 `.caf` de `./assets/audio/sfx` em memória; Godot/web com Ogg Vorbis (web: AAC/MP3 de fallback para Safari). Orçamento de memória de SFX carregados ≤ [bible §7] (PCM mono 44,1 kHz ≈ 88 KB/s). **Verificar no simulador/dispositivo**: rode no iPhone real com alto-falante e fone, interrupções e segundo plano; registre em `production/evidencias/`. **Licença de saída**: o código do `AudioManager` é do projeto; Howler.js é MIT; skills da Unity são Unity Companion License (uso dentro de projetos Unity); nenhum asset muda de licença nesta etapa.

## Fontes

- Lyria RealTime (cookbook e SDK): https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_LyriaRealTime.py ; https://github.com/googleapis/python-genai/blob/main/google/genai/live_music.py ; The Infinite Crate: https://github.com/magenta/the-infinite-crate
- Magenta RealTime 2: https://github.com/magenta/magenta-realtime
- Reactional Music: https://reactionalmusic.com/engine/ ; https://reactionalmusic.com/news/reactional-music-brings-interactive-music-to-unity/
- FMOD/Wwise [secundário]: https://www.strayspark.studio/blog/wwise-fmod-metasounds-audio-middleware-comparison ; https://labhub.hopto.org/blog/culture/2026-05-16-game-audio-middleware-2026-wwise-sony-fmod-steam-audio-resonance-tempest-3d-metasounds-deep-dive?lang=en
- Mubert skills/MCP (streaming com intensidade e loop): https://github.com/MubertAI/skills
- Unity skills oficiais `audio-setup-mixers`, `optimize-audio`: https://github.com/Unity-Technologies/unity-agent-plugin
- Apple "Using Audio" (arquivo): https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MultimediaPG/UsingAudio/UsingAudio.html ; fórum AVAudioEngine: https://developer.apple.com/forums/thread/84235
- AudioKit (MIT, alternativa de alto nível para iOS): https://github.com/AudioKit/AudioKit
- Relatório interno (seção Áudio: "arquitetura realista é gerar offline, autorar camadas e loops e tocar com lógica adaptativa convencional").
