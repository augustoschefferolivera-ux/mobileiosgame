---
name: gerar-musica
description: >
  Gera a trilha do jogo (loops por área, stingers, camadas/stems) com modelos de licença
  segura — ACE-Step 1.5 (MIT) ou Stable Audio 3 Small/Medium local, HeartMuLa, Lyria 3 —
  a partir da sound bible, em BPM/tom fixos, acha loops com PyMusicLooper, arquiva WAV master
  e registra PROVENANCE.md. Use sempre que o usuário pedir música, trilha, tema, jingle,
  stinger ou "som de fundo" musical. Recusa Suno/Udio em assets lançados. Não use para SFX
  (/gerar-sfx), voz (/voz-e-dialogo) nem para normalizar/exportar (/pos-producao-audio-mobile).
license: MIT
compatibility: "Claude Code ou Codex; ACE-Step/Stable Audio locais pedem GPU NVIDIA ou Apple Silicon"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [6]
argument-hint: "[nome_arquivo da lista de assets | area/estado] [--ferramenta ace-step|stable-audio-3|heartmula|lyria-3]"
disable-model-invocation: false
user-invocable: true
---

# Gerar música

Entrega, para cada linha `mus` da lista de assets, um WAV master em `./masters/audio/`, os cortes intro/loop/outro (ou stinger) em `./assets/audio/musica/`, os pontos de loop em samples e a linha correspondente em `PROVENANCE.md`; a evidência é o arquivo tocando em loop sem clique, ouvido pelo humano, registrado em `production/evidencias/`.

## Quando usar / quando não usar

- **Use** na fase 6 depois de `design/sound-bible.md` aprovado e com `design/audio/lista-de-assets-audio.csv` existente.
- **Use** também para regenerar uma música quando mudar BPM/tom na bible.
- **Não use** sem bible: pare e rode `/direcao-de-audio-e-sound-bible` (15 minutos) antes.
- **Não use** Suno ou Udio para nada que vá ao build: litígio UMG/Sony vs Suno v6 (18/09/2026), tetos de download e Udio sem downloads desde 29/10/2025. Protótipo descartável, no máximo, e nunca arquivado como master.

## Pré-requisitos

| Ferramenta | Licença | Instalação / acesso | Quando escolher |
| --- | --- | --- | --- |
| **ACE-Step 1.5** (padrão) | MIT (código e pesos) | repositório oficial `ace-step/ACE-Step-1.5`; <4 GB VRAM com INT8+offload, ou Apple Silicon via MLX; lotes de até 8 músicas | precisa de BPM/tom/compasso como **metadado**, stems ("Track Separation"), LoRA de estilo (~8 músicas, ~1 h em RTX 3090) |
| **Stable Audio 3 Small-Music / Medium** | código MIT; pesos Stability AI Community License (limiar de receita reportado US$ 1 M [secundário, confirmar em stability.ai/license]) | `Stability-AI/stable-audio-3`; Small roda em CPU/MLX/CoreML, Medium pede CUDA 5–6,5 GB | inpainting/continuação, variações rápidas; BPM **só por texto** |
| **HeartMuLa** | Apache-2.0 (repo e pesos) | `HeartMuLa/heartlib` | alternativa Apache; sem stems/BPM documentados |
| **Lyria 3** (Gemini API) | API comercial; saída com SynthID | `lyria-3-clip-preview` (30 s) / `lyria-3-pro-preview` (~3 min); ≈US$ 0,04/clipe e 0,08/música [secundário, confirmar] | sem GPU local; aceitar watermark e ausência de BPM/stems na API |
| PyMusicLooper | MIT | `pip install pymusiclooper` ou `uv tool install pymusiclooper` (+ ffmpeg para MP3/M4A); instalação centralizada em `/instalar-ferramentas` | sempre, para loops |
| soundfile, pyloudnorm | BSD/MIT | `pip install soundfile pyloudnorm` | pós (ver `/pos-producao-audio-mobile`) |

Evitados: **Eleven Music** self-serve ("except film, TV, radio, & Studio Games"; só com esclarecimento escrito ou Enterprise); **YuE2** se o titular for empresa (pesos CC BY-NC + "creator permission" só para indivíduos); **AudioCraft/MusicGen** (pesos CC-BY-NC). Detalhes e URLs em `references/modelos-e-licencas.md`.

## Entradas

1. `design/sound-bible.md` §2–3 e §9 (paleta, BPM/tom/compasso por área, modelos autorizados).
2. Linhas `familia=mus` de `design/audio/lista-de-assets-audio.csv` (nome, duração, loop, bpm, tom, prompt_base).
3. Hardware disponível (GPU NVIDIA? Mac Apple Silicon? só CPU?) para escolher a ferramenta.
4. `PROVENANCE.md` do projeto (criar se não existir; formato em `references/prompts-e-receita.md`).

## Passos

1. **Checar a licença antes de gerar.** Confirme que a ferramenta escolhida está na lista de autorizados da bible §9 e registrada como classe A/B em `LICENCAS.md` (`/licencas-e-proveniencia`). Se for Stable Audio 3, confirme o limiar da Community License para o titular do jogo; se for Lyria 3, registre que a saída carrega SynthID. Nunca prossiga com Suno/Udio/Eleven Music self-serve.
2. **Montar o prompt estruturado** a partir do `prompt_base` com a fórmula de `references/prompts-e-receita.md` §1: paleta + instrumentação + **BPM + tom + compasso** + energia + função (loop/stinger) + "instrumental, sem vocais". No ACE-Step, passe BPM/tom/compasso/duração nos campos de metadado, não só no texto; no Stable Audio 3 e Lyria, repita "`<N> BPM`" no texto (único controle disponível).
3. **Gerar candidatos.** Duração-alvo = 2 ciclos do loop desejado (ex.: loop de 60 s → gere 120 s) para o PyMusicLooper ter onde buscar. ACE-Step: lote de 8 com seeds distintos; Stable Audio 3: 4–8 execuções; Lyria 3: 2–4. Salve tudo em `./assets/audio/_candidatos/<nome>/seedNNN.wav` com o prompt completo em `prompt.txt` ao lado.
4. **Curar de ouvido** (humano): escolha 1–2 candidatos por asset; critérios: respeita BPM (confira batendo com metrônomo ou com a extração de BPM do ACE-Step), sem vocal, sem citação reconhecível, funciona em mono. Descarte o resto e apague os descartados dos candidatos quando o asset for aprovado.
5. **Achar o loop** com o wrapper:
   ```bash
   .claude/skills/gerar-musica/scripts/find_loops.sh --min-loop 30 -o assets/audio/_loops assets/audio/_candidatos/<nome>/seed042.wav
   ```
   Saída: `<nome>/loop_points.txt` (LOOP_START/LOOP_END em samples na taxa do arquivo) e `-intro.wav`, `-loop.wav`, `-outro.wav`. Use `--approx INI FIM` para forçar uma região em barras inteiras e `--brute-force` se o áudio não tiver beats claros. Confira que o trecho de loop tem um número inteiro de compassos: `compassos = (LOOP_END − LOOP_START) / taxa / (60/BPM × batidas_por_compasso)`.
6. **Stems/camadas** (se a bible §3 pede camadas): no ACE-Step use "Track Separation" sobre o candidato aprovado; alternativas MIT: Demucs (arquivado desde 01/01/2025) ou `ZFTurbo/Music-Source-Separation-Training`. Corte todos os stems **nos mesmos samples** de loop do passo 5 para que fiquem alinhados.
7. **Ouvir o loop em repetição** 3 vezes seguidas (`pymusiclooper play --path arquivo.wav` ou DAW). Se houver clique, aplique crossfade de 5–20 ms na emenda em `/pos-producao-audio-mobile` ou escolha outro ponto com `--approx`.
8. **Arquivar e registrar.** Copie o candidato aprovado para `./masters/audio/musica/<nome>_master.wav` (WAV original, sem normalização); mova intro/loop/outro ou stinger para `./assets/audio/musica/`; adicione a linha em `PROVENANCE.md` (modelo, versão/commit, seed, prompt completo, BPM/tom, loop points, edição humana, licença da saída). Nunca dependa de regenerar: modelos somem (Suno prometeu deprecar modelos; Udio fechou downloads).
9. **Entregar ao pós**: rode `/pos-producao-audio-mobile` para −18 LUFS/−1 dBTP e AAC/Ogg. Evidência em `production/evidencias/<data>-musica-<nome>/` (loop_points.txt, prompt.txt, nota de 1 linha do humano "ouvi 3 loops, sem clique").

## Critério de pronto e evidência

- [ ] Para cada linha `mus` da lista: `./masters/audio/musica/<nome>_master.wav`, arquivos em `./assets/audio/musica/` conforme naming, `loop_points.txt` com valores em samples.
- [ ] Loop com número inteiro de compassos no BPM declarado (cálculo do passo 5 registrado).
- [ ] Linha em `PROVENANCE.md` com licença da saída (MIT/Apache/Community License/SynthID).
- [ ] Nota do humano em `production/evidencias/` dizendo que ouviu o loop repetir sem clique e que não reconhece citação de obra existente.
- [ ] Veredito `aprovado` do subagente `diretor-de-audio` (tabela `arquivo | veredito | medida | ação`) salvo na pasta de evidência.
- Um arquivo gerado mas não ouvido **não** está pronto.

## Armadilhas conhecidas

- **Suno/Udio**: litígio UMG/Sony vs Suno v6 (Billboard, 18/09/2026), tetos de download (Pro 20/mês, Premier 60/mês [secundário]), Udio sem downloads; fora de qualquer asset lançado.
- **Eleven Music**: termos por modelo excluem "Studio Games" no self-serve; termo não definido; peça esclarecimento escrito antes de usar (Model-Specific Terms).
- **Stable Audio 3 sem BPM real**: BPM só por texto; confira o BPM resultante (extração do ACE-Step ou tap tempo) antes de cortar loops.
- **Loop sem compasso inteiro**: a transição em barra do engine vai cair fora do tempo; sempre faça a conta do passo 5.
- **Stems cortados em pontos diferentes** desalinham camadas; corte todos com os mesmos samples.
- **Vocais indesejados**: peça "instrumental, sem vocais" e, no ACE-Step, deixe letra vazia; em Lyria RealTime a letra é ignorada (instrumental).
- **Graves e estéreo largo** não saem no alto-falante do iPhone; ouça o candidato em mono e no celular.
- **Regeneração como backup** não funciona: arquive o WAV master e o `PROVENANCE.md` no Git LFS ou armazenamento do projeto.
- **Semelhança**: se um candidato lembrar uma música real, descarte; registre na curadoria.

## Exportar para mobile

Entregue ao `/pos-producao-audio-mobile`: música e ambiente em **AAC (.m4a) 128–160 kbps estéreo 44,1 kHz** para iOS (streaming, 1 stream AAC de hardware por vez — docs arquivadas da Apple, revalidar), **Ogg Vorbis** para Godot/web; stems como arquivos separados com o mesmo comprimento em samples; tamanho ≈ 1 MB/min por stem em AAC 128 kbps; o engine carrega de `./assets/audio/musica/` (ver `/audio-adaptativo-no-engine`). **Licença de saída**: ACE-Step 1.5 → MIT (uso comercial global); HeartMuLa → Apache-2.0; Stable Audio 3 → Stability AI Community License (comercial até o limiar de receita, confirmar); Lyria 3 → termos da Gemini API com watermark SynthID. Registre a escolha em `PROVENANCE.md`.

## Fontes

- ACE-Step 1.5: https://github.com/ace-step/ACE-Step-1.5
- Stable Audio 3: https://github.com/Stability-AI/stable-audio-3 ; licença dos pesos: https://stability.ai/license [página não lida; secundário]
- HeartMuLa: https://github.com/HeartMuLa/heartlib
- YuE2 MODEL_LICENSE: https://github.com/multimodal-art-projection/YuE/blob/main/MODEL_LICENSE
- Lyria 3 (Gemini API): https://ai.google.dev/gemini-api/docs/music-generation ; preços [secundário]: https://benchlm.ai/media-pricing/lyria
- Eleven Music Model-Specific Terms: https://elevenlabs.io/eleven-music-model-specific-terms ; SDK: https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/music/client.py
- UMG/Sony vs Suno v6: https://www.billboard.com/pro/umg-sony-hit-suno-with-lawsuit-after-new-ai-music-model/ ; Warner–Suno: https://www.musicbusinessworldwide.com/warner-music-group-settles-with-suno-strikes-first-of-its-kind-deal-with-ai-song-generator/ ; Udio sem downloads [secundário]: https://undetectr.com/blog/udio-download
- PyMusicLooper: https://github.com/arkrow/PyMusicLooper ; Demucs (arquivado): https://github.com/facebookresearch/demucs ; MSST: https://github.com/ZFTurbo/Music-Source-Separation-Training
- Apple "Using Audio" (arquivo): https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MultimediaPG/UsingAudio/UsingAudio.html
