# Unity, Godot e Web: receitas e ressalvas

Nomes de propriedades/APIs conforme documentação pública dos engines; não lidos nesta pesquisa — confirme na versão fixada do projeto.

## Unity 6+

- **Buses**: Audio Mixer com grupos `Master/Music`, `Master/SFX`, `Master/UI`, `Master/Voice`, `Master/Ambience`; exponha o volume de cada grupo como parâmetro (`mixer.SetFloat("MusicVol", dB)`); snapshots por estado (`AudioMixer.TransitionToSnapshots`) para ducking e mudança de mix.
- **Skills oficiais do `unity-agent-plugin`** (Unity Companion License — invoque, não copie):
  - `audio-setup-mixers`: inventaria AudioSources e roteia cada uma ao grupo certo; **não cria grupos** (sem API pública): crie-os na janela Audio Mixer quando a skill pedir; nunca edite `.mixer` à mão. Exige Unity CLI + `eval` no Editor (skill `unity-cli`).
  - `optimize-audio`: Load Type, compressão, sample rate, Force To Mono e custo de CPU do mixer; mede antes/depois; verificar sempre em build de dispositivo.
- **Loop e barra**: `AudioSource.PlayScheduled(AudioSettings.dspTime + delta)` com `delta` calculado até a próxima barra; intro em uma `AudioSource` e loop em outra agendada para `dspTime + introLength`; `AudioSource.SetScheduledEndTime` para cortar na barra. Stems: várias `AudioSource` com o mesmo `PlayScheduled` e volume por intensidade.
- **Ducking**: efeito *Duck Volume* no grupo Music com *Send* do grupo Voice, ou snapshot "Dialogue".
- **Latência de UI**: `Project Settings → Audio → DSP Buffer Size: Best latency`; clipes de UI com Load Type *Decompress On Load*, PCM/ADPCM, mono.
- iOS: a Unity transcodifica no import; entregue WAV e deixe `optimize-audio` ajustar.

## Godot 4.x

- **Buses**: layout de áudio (`default_bus_layout.tres`) com `Master`, `Music`, `SFX`, `UI`, `Voice`, `Ambience`; `AudioStreamPlayer.bus = "SFX"`; `AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Music"), db)`; efeitos de bus (Limiter no Master, Compressor com sidechain para ducking).
- **Loop por samples**: `AudioStreamWAV` tem `loop_mode`, `loop_begin`, `loop_end` (em samples); `AudioStreamOggVorbis` tem `loop` e `loop_offset` (segundos). Para música Ogg, converta LOOP_START em segundos com a taxa do arquivo.
- **Adaptativo nativo (4.3+)**: `AudioStreamInteractive` (clipes com transições em *immediate / next beat / next bar / at end*, com fade) e `AudioStreamSynchronized` (até 32 streams sincronizados = stems com volume independente); `AudioStreamPlaylist` para sequências.
- **Export iOS**: Ogg Vorbis é o padrão; teste polifonia e latência no dispositivo; campos de privacy manifest no export (ver nota de pesquisa iOS/legal).

## Web (Howler.js / Web Audio)

- **Howler.js** (MIT): `new Howl({src: ['mus.m4a', 'mus.ogg'], loop: true, html5: false})`; `sprite` para vários SFX em um arquivo; `autoUnlock` cuida do desbloqueio de áudio no iOS, que só começa após um gesto do usuário; volume por "bus" = grupos de Howl com um multiplicador comum.
- **Web Audio direto**: `AudioBufferSourceNode.loop = true`, `loopStart/loopEnd` em segundos (converta dos samples), `start(when)` com `audioContext.currentTime + delta` para transições em barra; `GainNode.gain.setTargetAtTime(valor, t, 0.05)` para ducking; um `GainNode` por bus.
- **Safari/iOS**: contexto de áudio precisa de gesto do usuário para iniciar/retomar; suporte a Ogg Vorbis **não verificado nesta pesquisa** — entregue AAC/MP3 e, se quiser Ogg, como segunda opção. Pré-decodifique buffers no primeiro gesto.
- **PWA em WebView**: mesmas regras; áudio em segundo plano não é garantido.

## Comum a todos

- Máquina de estados musical isolada da engine (testável sem áudio): estado → {stems ativos, ganhos, próxima transição}.
- Log de eventos de áudio (`t, evento, sampleTime/dspTime, estado`) habilitado por flag de debug: é a evidência que a skill exige.
- Variação de SFX: round-robin + pitch ±2 semitons só em gameplay, nunca em UI.
