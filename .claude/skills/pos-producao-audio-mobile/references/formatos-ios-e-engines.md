# Formatos, comandos de conversão e receita de loop/fade

## 1. Tabela de formatos por engine (mobile primeiro)

| Tipo | iOS nativo (SpriteKit/RealityKit/AVAudioEngine) | Unity (iOS) | Godot 4.x | Web (Howler/Web Audio) |
| --- | --- | --- | --- | --- |
| Música/ambiente (stream, loop) | AAC `.m4a` 128–160 kbps, 44,1 kHz estéreo | WAV importado; Load Type *Streaming*, compressão Vorbis/AAC via import settings (`optimize-audio`) | Ogg Vorbis `-q:a 5` (`AudioStreamOggVorbis.loop`, `loop_offset`) | AAC/MP3 (+ Ogg como opção; Safari não verificado) |
| SFX curtos (polifonia) | `.caf` PCM 16-bit mono (ou IMA4 4:1), 44,1 kHz; UI a 32 kHz | WAV; Load Type *Decompress On Load*, PCM/ADPCM, *Force To Mono* | Ogg Vorbis `-q:a 4` ou WAV (`AudioStreamWAV`, IMA ADPCM) | AAC/MP3 em sprites (Howler `sprite`) |
| Voz | AAC `.m4a` mono 64–96 kbps | WAV; *Streaming* ou *Compressed In Memory* | Ogg Vorbis mono | AAC/MP3 mono |

Base: docs arquivadas da Apple (PCM/IMA4 em `.caf/.aif/.wav` para sons curtos; AAC de hardware não toca múltiplos sons simultâneos; CAF sem limite de 4 GB) — **revalidar no Xcode alvo**. Godot/Unity/web: nomes de propriedades conforme docs públicas dos engines; não lidos nesta pesquisa, confira na versão fixada do projeto.

Taxas de origem dos geradores: ElevenLabs SFX v2 48 kHz; Eleven Music v2 `mp3_48000_192`; Lyria 3 44,1 kHz; Lyria RealTime 48 kHz PCM; Stable Audio 3 44,1 kHz estéreo; Kokoro 24 kHz; YuE2 48 kHz. Converta tudo para 44,1 kHz na entrega (uma taxa só evita resampling em runtime).

## 2. Comandos de conversão

ffmpeg (verificados nesta sessão; `aac` nativo, `libvorbis`, `adpcm_ima_wav`, `adpcm_ima_qt`, muxer `caf`):

```bash
# Música/ambiente → AAC estéreo 128 kbps
ffmpeg -y -i in.wav -ar 44100 -c:a aac -b:a 128k mus_area_loop.m4a
# Voz → AAC mono 64 kbps
ffmpeg -y -i in.wav -ar 44100 -ac 1 -c:a aac -b:a 64k vo_npc_linha_ptbr.m4a
# SFX → CAF PCM 16-bit mono
ffmpeg -y -i in.wav -ar 44100 -ac 1 -c:a pcm_s16le -f caf sfx_jogador_pulo_01.caf
# SFX → IMA4 em CAF (4:1; codec adpcm_ima_qt = 'ima4' da Apple)
ffmpeg -y -i in.wav -ar 44100 -ac 1 -c:a adpcm_ima_qt -f caf sfx_jogador_pulo_01.caf
# SFX → IMA ADPCM em WAV (4:1), para engines que leem WAV
ffmpeg -y -i in.wav -ar 44100 -ac 1 -c:a adpcm_ima_wav sfx_jogador_pulo_01.wav
# Godot/web → Ogg Vorbis
ffmpeg -y -i in.wav -ar 44100 -c:a libvorbis -q:a 5 mus_area_loop.ogg
# Limitador antes de normalizar quando o pico impede o alvo (≈ -1 dBFS)
ffmpeg -y -i in.wav -af "alimiter=limit=0.89" out.wav
```

afconvert (macOS; confira `afconvert -h` na sua versão):

```bash
afconvert -f caff -d ima4 in.wav sfx_jogador_pulo_01.caf        # IMA4 em CAF
afconvert -f caff -d LEI16 in.wav sfx_ui_confirmar_01.caf        # PCM 16-bit LE em CAF
afconvert -f m4af -d aac -b 128000 in.wav mus_area_loop.m4a      # AAC da Apple, 128 kbps
```

## 3. Receita de fades e loop com pontos exatos em samples

Entrada: `loop_points.txt` do `find_loops.sh` (LOOP_START/LOOP_END em samples na taxa do arquivo).

```python
import numpy as np, soundfile as sf
x, sr = sf.read("mus_area_full.wav", always_2d=True)
start, end = 88200, 5203800          # do loop_points.txt
loop = x[start:end].copy()
n = int(sr * 0.010)                  # crossfade de 10 ms
fade_in, fade_out = np.linspace(0, 1, n)[:, None], np.linspace(1, 0, n)[:, None]
# dobra o fim sobre o início: o comprimento do loop NÃO muda
loop[:n] = loop[:n] * fade_in + x[end:end + n] * fade_out
sf.write("mus_area_loop.wav", loop, sr, subtype="PCM_24")
sf.write("mus_area_intro.wav", x[:start], sr, subtype="PCM_24")
```

- Stems/camadas: aplique **os mesmos** `start`/`end` a todos os stems.
- One-shots: fade-in 2–5 ms, fade-out 5–20 ms (`ffmpeg -af "afade=t=in:d=0.003,afade=t=out:st=<dur-0.01>:d=0.01"`), corte de silêncio inicial (`-af silenceremove=start_periods=1:start_threshold=-50dB`).
- Compassos inteiros: `(end - start) / sr / (60 / BPM * 4)` deve ser inteiro em 4/4.
- Guarde `start`, `end` (samples) e `sr` no `PROVENANCE.md`; no engine, o loop é agendado por samples (ver `/audio-adaptativo-no-engine`), não por marcadores do container.

## 4. Alvos de loudness por categoria (ponto de partida)

| Lote | LUFS integrado | dBTP | Observação |
| --- | --- | --- | --- |
| Música (loops, stingers) | −18 | −1 | lote único para toda a trilha; ajuste no bus |
| SFX jogador/inimigo/feedback | −18 | −1 | `--mode peak --true-peak -3` para < 0,4 s |
| UI | −20 | −1 | nunca mais alto que SFX de gameplay |
| Voz | −18 | −1 | mono; corte de silêncio obrigatório |
| Ambiente | −24 | −1 | fica atrás de tudo |

ASWG-R001: Game (Console) −24 / Game (Mobile) **−18** / Streaming −14, todos −1 dBTP (via README do LUFSNormalizer; Wikipedia lista Sony ASWG −23 console / −18 portátil).

## 5. Orçamento de tamanho (derivado)

- AAC 128 kbps ≈ 0,96 MB/min; 10 min de trilha com 3 stems ≈ 29 MB; o mesmo em PCM 16-bit 44,1 estéreo ≈ 318 MB.
- PCM 16-bit mono 44,1 kHz ≈ 88 KB/s; IMA4 ≈ 22 KB/s; 100 SFX de 0,5 s ≈ 4,4 MB (PCM) ou 1,1 MB (IMA4).
- Voz AAC mono 64 kbps ≈ 0,48 MB/min.
- Modelos TTS on-device: Kokoro CoreML ≈ 80 MB (ver `/voz-e-dialogo`).
