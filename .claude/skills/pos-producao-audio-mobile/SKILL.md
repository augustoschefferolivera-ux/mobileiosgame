---
name: pos-producao-audio-mobile
description: >
  Pós-produção de todo áudio do jogo para mobile: normaliza por categoria a −18 LUFS integrado
  / −1 dBTP (ASWG-R001 mobile) com pyloudnorm (MIT), corta silêncio, aplica fades e crossfade
  de loop com pontos exatos em samples, e converte para os formatos de entrega (AAC para
  música/voz e PCM/IMA4 em CAF para SFX no iOS; Ogg Vorbis para Godot/web), com relatório
  antes/depois e orçamento de MB. Use sempre que um asset de áudio gerado precisar ir para o
  build, quando o usuário reclamar de "volume desigual", "clique no loop" ou "app pesado".
  Não gera áudio (use /gerar-musica, /gerar-sfx, /voz-e-dialogo) nem implementa no engine
  (/audio-adaptativo-no-engine).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+; afconvert só no macOS (ffmpeg como alternativa)"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [6, 8]
argument-hint: "[pasta-ou-arquivos] [--categoria musica|sfx|ui|voz|ambiente] [--engine spritekit|unity|godot|web]"
disable-model-invocation: false
user-invocable: true
---

# Pós-produção de áudio para mobile

Entrega os arquivos finais em `assets/audio/{musica,sfx,voz}/` nos formatos do engine, normalizados por categoria, com `relatorio_lufs_<data>.csv` (antes/depois) e tabela de tamanhos em `production/evidencias/<data>-pos-audio/`; a evidência é o relatório com todos os arquivos `ok` e o build rodando com o áudio ouvido no simulador/dispositivo.

## Quando usar / quando não usar

- **Use** depois da curadoria de cada lote (música, SFX, voz) e antes de importar no engine; e de novo na fase 8 quando o orçamento de MB ou o mix mudar.
- **Use** para conferir um build: rode o script em `--dry-run` sobre a pasta de entrega e verifique se tudo está dentro da tolerância.
- **Não use** sobre os masters em `assets/audio/_masters/`: eles ficam intocados; trabalhe sempre sobre cópias.
- **Não use** o LUFSNormalizer (PolyForm Noncommercial 1.0.0): só pyloudnorm (MIT) ou ffmpeg.

## Pré-requisitos

- Python 3.10+ com `pip install pyloudnorm soundfile numpy scipy` (pyloudnorm MIT, BS.1770-4; soundfile BSD; libsndfile lê/escreve WAV, FLAC, OGG, CAF PCM).
- `ffmpeg` no PATH (AAC nativo, `libvorbis`, `adpcm_ima_wav`, muxer CAF) — ou `afconvert` no macOS para CAF/IMA4 e AAC da Apple.
- Opcional: PyMusicLooper (MIT) se o loop ainda não tiver pontos (ver `/gerar-musica`).
- `design/sound-bible.md` §5 (alvos por bus) e §7 (formatos, orçamento de MB).

## Entradas

1. Pasta de arquivos aprovados por categoria (WAV de preferência; MP3 da ElevenLabs aceito como candidato, mas o master deve ser o melhor formato do plano).
2. Categoria de cada lote → alvo LUFS da bible (padrão: música −18, SFX −18, UI −20, voz −18, ambiente −24; todos −1 dBTP).
3. Engine alvo (define formato de saída; tabela em `references/formatos-ios-e-engines.md`).
4. Pontos de loop em samples (`loop_points.txt` do `find_loops.sh`) para músicas e ambientes.

## Passos

1. **Separar por categoria.** Normalização é por lote, nunca por arquivo isolado misturando tipos (one-shots, loops, ambiente e diálogo em lotes separados). Copie os aprovados para `assets/audio/_trabalho/<categoria>/`.
2. **Limpar cada arquivo**: cortar silêncio inicial (SFX devem começar no transiente: latência percebida) e final; fade-in 2–5 ms e fade-out 5–20 ms em one-shots para evitar cliques; para loops, crossfade de 5–20 ms na emenda **sem alterar o comprimento em samples** (receita em `references/formatos-ios-e-engines.md` §3, com soundfile/numpy ou `ffmpeg -af afade`). Registre LOOP_START/LOOP_END finais.
3. **Medir e normalizar** o lote:
   ```bash
   python3 .claude/skills/pos-producao-audio-mobile/scripts/normalize_lufs.py assets/audio/_trabalho/sfx --recursive --dry-run
   python3 .claude/skills/pos-producao-audio-mobile/scripts/normalize_lufs.py assets/audio/_trabalho/sfx --recursive \
     --target-lufs -18 --true-peak -1 --out-dir assets/audio/_trabalho/sfx_norm
   ```
   O script aplica só ganho estático; status `limitado_por_pico` significa que o alvo não cabe sob −1 dBTP: passe um limitador antes (`ffmpeg -af alimiter=limit=0.89` ≈ −1 dBFS, ou DAW) ou aceite o LUFS menor e anote. Para SFX < 0,4 s em que o LUFS integrado não faz sentido, use `--mode peak --true-peak -3` e iguale de ouvido dentro da família.
4. **Conferir a tolerância**: todos `ok` (±0,5 LU) no relatório; refaça os `fora_da_tolerancia`.
5. **Converter para o engine** (comandos em `references/formatos-ios-e-engines.md` §2):
   - iOS (SpriteKit/RealityKit/Unity-iOS): música, ambiente e voz → AAC `.m4a` 128–160 kbps (voz mono 64–96 kbps); SFX curtos → `.caf` PCM 16-bit mono ou IMA4 (4:1).
   - Godot e web → Ogg Vorbis `-q:a 5` (música) / `-q:a 4` (SFX); web no Safari: ver ressalva na referência (formato não verificado nesta pesquisa; mantenha AAC/MP3 de fallback).
   - Unity: importe WAV e deixe o import settings decidir (invoque a skill oficial `optimize-audio` do `unity-agent-plugin` para Load Type, compressão, sample rate e mono).
6. **Medir o orçamento**: `du -ch assets/audio/{musica,sfx,voz}` vs. orçamento da bible §7; regra prática AAC 128 kbps ≈ 0,96 MB/min, PCM mono 44,1 kHz ≈ 88 KB/s, IMA4 ≈ 22 KB/s. Se estourar: música para 112–128 kbps, UI para 32 kHz, voz mono 64 kbps, ou mover música para Background Assets/On-Demand Resources.
7. **Registrar**: atualize `PROVENANCE.md` (coluna "edição humana": corte, fade, ganho em dB, formato); grave `relatorio_lufs_<data>.csv`, a tabela de tamanhos e os `loop_points` finais em `production/evidencias/<data>-pos-audio/`.
8. **Ouvir no alvo**: importe no engine, rode no simulador e **no dispositivo** com alto-falante e fone; confira que SFX de UI tocam sem atraso perceptível, loops não clicam e nada clipa. Sem isso não está pronto.

## Critério de pronto e evidência

- [ ] `relatorio_lufs_<data>.csv` com 100% dos arquivos `ok` (ou `pico_normalizado` para SFX curtos), sem `limitado_por_pico` não justificado.
- [ ] Arquivos finais no formato do engine em `assets/audio/{musica,sfx,voz}/` com naming da bible; masters intactos em `_masters/`.
- [ ] Tabela de tamanhos por pasta dentro do orçamento da bible §7.
- [ ] Loops com LOOP_START/LOOP_END em samples registrados e ouvidos 3× sem clique.
- [ ] Nota do humano: "ouvi no iPhone (alto-falante e fone) build <n>" em `production/evidencias/<data>-pos-audio/`.

## Armadilhas conhecidas

- **LUFSNormalizer** tem os presets ASWG prontos mas é PolyForm NC; fora de pipeline comercial.
- **Alvos conflitantes**: ASWG-R001 "Game (Mobile)" −18 LUFS/−1 dBTP; console −23/−24 (fontes divergem); streaming −14. Não misture.
- **Formatos iOS vêm de docs arquivadas da Apple** (2006–2014): AAC para música, PCM/IMA4 em CAF para SFX, decodificador AAC de hardware não toca múltiplos streams. A documentação atual não pôde ser lida; revalide no Xcode alvo e meça.
- **AAC em one-shot** adiciona latência de decodificação e "priming"; UI e impactos ficam em PCM/IMA4 na memória.
- **Loop com crossfade que muda o comprimento** desalinha stems e transições em barra; o crossfade dobra o fim sobre o início sem mudar o número de samples.
- **MP3 128 kbps como master**: o candidato da ElevenLabs em MP3 serve para curar; regenere/baixe no melhor formato do plano antes de arquivar.
- **Ganho positivo em arquivo já quente** clipa: o script reduz ao teto e marca; não desligue a checagem.
- **`afconvert` só existe no macOS**; em CI Linux use ffmpeg (AAC nativo do ffmpeg é inferior ao da Apple em bitrates baixos; use ≥128 kbps).
- **Ogg Vorbis no Safari/iOS** não está confirmado nesta pesquisa; para web mantenha AAC/MP3.

## Exportar para mobile

Formatos finais: iOS → `.m4a` AAC 128–160 kbps estéreo 44,1 kHz (música/ambiente), AAC mono 64–96 kbps (voz), `.caf` PCM 16-bit mono 44,1 kHz ou IMA4 (SFX, UI a 32 kHz se precisar); Godot/web → Ogg Vorbis q4–q5; Unity → WAV + import settings (`optimize-audio`). Tamanhos: ver passo 6. O engine carrega de `assets/audio/{musica,sfx,voz}/` (ver `/audio-adaptativo-no-engine`). **Licença de saída**: esta skill não altera a licença do asset (vem do gerador, registrada em `PROVENANCE.md`); as ferramentas usadas são MIT/BSD/LGPL (pyloudnorm, soundfile, ffmpeg) e não impõem condições à saída.

## Fontes

- pyloudnorm (MIT, BS.1770-4): https://github.com/csteinmetz1/pyloudnorm
- LUFSNormalizer (PolyForm NC; presets ASWG-R001): https://github.com/vitaleaudio/LUFSNormalizer ; https://en.wikipedia.org/wiki/Audio_normalization
- PyMusicLooper: https://github.com/arkrow/PyMusicLooper
- Apple "Using Audio" (arquivo): https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MultimediaPG/UsingAudio/UsingAudio.html ; CAF spec: https://developer.apple.com/library/archive/documentation/MusicAudio/Reference/CAFSpec/CAF_spec/CAF_spec.html ; Kodeco (2014): https://www.kodeco.com/2434-audio-tutorial-for-ios-file-and-data-formats-2014-edition
- Normalizar por lotes separados [secundário]: https://mastering.to/roblox
- Unity `optimize-audio` (Unity Companion License; invocar, não copiar): https://github.com/Unity-Technologies/unity-agent-plugin
- Fórum Apple sobre AVAudioEngine/LPCM: https://developer.apple.com/forums/thread/84235
