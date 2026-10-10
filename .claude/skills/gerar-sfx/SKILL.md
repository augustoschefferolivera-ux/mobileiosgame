---
name: gerar-sfx
description: >
  Gera efeitos sonoros do jogo (UI, passos, impactos, coletas, ambientes em loop) em lote com
  ElevenLabs Sound Effects v2 (eleven_text_to_sound_v2, loop nativo, 48 kHz) via SDK/MCP, ou
  localmente com Stable Audio 3 Small-SFX, em famílias com variações, 8–16 candidatos por
  prompt para curadoria humana, e registra PROVENANCE.md. Use sempre que o usuário pedir
  "som de", "efeito", "SFX", "clique", "ambiente", "foley" ou qualquer áudio não musical e
  não falado. Não use para música (/gerar-musica), voz (/voz-e-dialogo) nem para
  normalizar/converter (/pos-producao-audio-mobile).
license: MIT
compatibility: "Claude Code ou Codex; ElevenLabs exige conta e ELEVENLABS_API_KEY; Stable Audio 3 Small-SFX roda em CPU/Apple Silicon"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [6]
argument-hint: "[csv-de-prompts | familia] [--ferramenta elevenlabs|stable-audio-3|firefly]"
disable-model-invocation: false
user-invocable: true
---

# Gerar SFX

Entrega, para cada linha `sfx`/`ui`/`amb` da lista de assets, candidatos em `./assets/audio/_candidatos/sfx/`, as variações aprovadas em `./assets/audio/sfx/` com o naming da bible, e linhas em `PROVENANCE.md`; a evidência é o relatório de curadoria (quais candidatos ficaram e por quê) em `production/evidencias/`.

## Quando usar / quando não usar

- **Use** na fase 6, com `design/sound-bible.md` aprovado e `design/audio/lista-de-assets-audio.csv` pronto.
- **Use** para ambientes em loop (vento, chuva, multidão): o `loop=true` do ElevenLabs v2 evita o passo de achar loop.
- **Não use** para Foley sincronizado com vídeo via MMAudio/ThinkSound em asset lançado: checkpoints não comerciais.
- **Não use** sem bible: cada família precisa de caráter definido ou os sons não combinam entre si.

## Pré-requisitos

| Ferramenta | Licença/termos | Acesso | Quando |
| --- | --- | --- | --- |
| **ElevenLabs Sound Effects v2** (padrão) | planos pagos com direitos comerciais [secundário, confirmar no plano]; Free não comercial | SDK oficial `pip install elevenlabs` + `ELEVENLABS_API_KEY`; ou MCP hospedado `https://api.elevenlabs.io/v1/mcp` (já declarado em `.mcp.json` com `xi-api-key: ${ELEVENLABS_API_KEY}`; ver `/instalar-ferramentas`; pacote local `elevenlabs-mcp` está deprecado) | padrão para one-shots e ambientes em loop; 48 kHz; `duration_seconds` 0,5–30; `prompt_influence` 0–1 (padrão 0,3); WAV/PCM 44,1 kHz só a partir do tier Pro, MP3 192 kbps a partir de Creator [SDK] |
| **Stable Audio 3 Small-SFX** (433M) | código MIT; pesos Stability AI Community License (limiar de receita [secundário, confirmar]) | `Stability-AI/stable-audio-3`; CPU, MLX, CoreML, TFLite; até 120 s | variações ilimitadas sem custo por chamada; "sound effects only" |
| **Adobe Firefly Generate Sound Effects** | Adobe anuncia "commercially safe" para seus modelos (parceiros excluídos) [secundário] | app Firefly (manual); permite sincronizar som a um clipe usando a própria voz como timing | alternativa quando há vídeo/cutscene; sem API verificada nesta pesquisa |
| soundfile, pyloudnorm, ffmpeg | BSD/MIT/LGPL | `pip install soundfile pyloudnorm` | pós (ver `/pos-producao-audio-mobile`) |

Não comerciais (não entram no build): MMAudio (checkpoints CC-BY-NC), ThinkSound ("Commercial use is NOT permitted"), AudioLDM2/Tango (licença não declarada).

## Entradas

1. `design/sound-bible.md` §4 (famílias, caráter, variações mínimas) e §5 (bus/alvo LUFS).
2. Linhas `familia ∈ {sfx, ui, amb}` da lista de assets → convertidas no CSV do script (`assets/prompts_sfx_exemplo.csv` mostra o formato).
3. Plano ElevenLabs disponível (define formato: MP3 128 kbps no Free/Starter; PCM só Pro+).
4. `PROVENANCE.md` (o script cria o cabeçalho se não existir).

## Passos

1. **Montar o CSV de prompts** a partir da lista de assets: colunas `nome_arquivo,prompt,duration_seconds,loop,prompt_influence,variacoes,categoria`. Prompt = material + ação + espaço + caráter + "no reverb/dry" quando for one-shot (fórmula e exemplos em `references/familias-e-prompts.md`). `prompt_influence` ≈ 0,5–0,7 para UI/impactos literais; ≈ 0,3 para ambientes texturais (inferência a partir do comportamento documentado do parâmetro). `variacoes` = 8–16 por prompt para one-shots frequentes, 4 para ambientes. Mínimo da API: 0,5 s (corte depois no pós).
2. **Dry-run** para ver o custo em chamadas:
   ```bash
   python3 .claude/skills/gerar-sfx/scripts/batch_sfx_elevenlabs.py design/audio/prompts_sfx.csv --dry-run
   ```
3. **Gerar** (chave só por variável de ambiente):
   ```bash
   export ELEVENLABS_API_KEY=...   # nunca em arquivo versionado
   python3 .claude/skills/gerar-sfx/scripts/batch_sfx_elevenlabs.py design/audio/prompts_sfx.csv \
     --out-dir assets/audio/_candidatos/sfx --provenance PROVENANCE.md --output-format mp3_44100_128
   ```
   Saída: `<categoria>/<nome>_c01..cNN.mp3` e uma linha de PROVENANCE por arquivo. Com tier Pro use `--output-format pcm_44100` (o script embrulha em WAV; confirme canais com `--pcm-channels`). Para variações ilimitadas sem custo, gere os mesmos prompts no Stable Audio 3 Small-SFX (CLI/Python do repositório oficial) para a mesma pasta.
4. **Curar de ouvido** (humano, obrigatório): para cada `nome_arquivo`, escolha as N variações pedidas pela bible (≥3 para sons >3×/min). Critérios: transiente limpo, sem cauda de reverb indesejada, timbre coerente com a família, funciona em mono e no alto-falante do iPhone, nenhum som "de marca" reconhecível. Renomeie os escolhidos para `./assets/audio/sfx/<nome>_01.wav`, `_02`… e apague os descartados.
5. **Famílias coerentes**: se um candidato aprovado "manda" na família (ex.: o clique de confirmar), use seu prompt como base para os irmãos (voltar, erro, abrir) mudando só altura/peso; regenere os irmãos que destoarem.
6. **Ambientes em loop**: gere com `loop=sim` e 15–30 s; toque 3 repetições e confirme ausência de salto. Se precisar de mais duração, use dois loops alternados no engine, não um arquivo de 2 min.
7. **Atualizar PROVENANCE.md**: copie cada aprovado (melhor formato do plano) para `./masters/audio/sfx/` e, nas linhas dos aprovados, preencha `master`, `edicao humana` (corte, fade, normalização) e `curadoria` (nome); remova ou marque "descartado" nas linhas dos excluídos. A ferramenta precisa existir em `LICENCAS.md` (`/licencas-e-proveniencia`).
8. **Entregar ao pós** (`/pos-producao-audio-mobile`): normalização por categoria (UI −20, SFX −18, ambiente −24 LUFS; −1 dBTP), corte de silêncio, fades, conversão para CAF/Ogg. Registre a evidência em `production/evidencias/<data>-sfx-<familia>/` com `curadoria.md` (tabela candidato → aprovado/descartado → motivo).

## Critério de pronto e evidência

- [ ] Toda linha `sfx`/`ui`/`amb` P0 da lista de assets tem o número de variações pedido em `./assets/audio/sfx/` com naming correto.
- [ ] `PROVENANCE.md` tem uma linha por arquivo aprovado com prompt, parâmetros, edição humana e licença/plano.
- [ ] `production/evidencias/<data>-sfx-<familia>/curadoria.md` existe e lista os candidatos ouvidos.
- [ ] Ambientes em loop ouvidos em 3 repetições sem salto (nota do humano).
- [ ] Veredito `aprovado` do subagente `diretor-de-audio` para as famílias P0 na pasta de evidência.
- Arquivos gerados e não ouvidos **não** estão prontos; não há métrica objetiva para SFX (nota de pesquisa, Q2).

## Armadilhas conhecidas

- **Custo por geração desconhecido**: o custo em créditos do SFX v2 (e se `loop` muda o custo) não pôde ser lido (elevenlabs.io bloqueado); confira no painel antes de lotes grandes.
- **Formato por tier**: PCM 44,1 kHz só Pro+; MP3 192 kbps só Creator+ (docstring do SDK). MP3 128 kbps é aceitável como candidato, mas o aprovado deve ser regenerado/baixado no melhor formato do plano antes de virar master.
- **Mínimo 0,5 s**: cliques de UI de 100–200 ms saem de um candidato de 0,5 s cortado no pós.
- **Repetição cansa**: sons tocados >3×/min com uma única variação são a reclamação nº 1; gere famílias com variação de pitch ±2 semitons no engine além das variações de arquivo.
- **MMAudio/ThinkSound** são não comerciais; só para referência interna.
- **Nomes de marca/jogos no prompt** geram semelhança e risco 5.2.1/4.1(c) da App Store.
- **Sem seed na API de SFX**: a reprodutibilidade é pelo arquivo salvo, não pela regeneração; arquive os aprovados em `./masters/audio/`.
- **MCP local deprecado**: use o MCP hospedado `https://api.elevenlabs.io/v1/mcp` ou o SDK; o pacote `elevenlabs-mcp` local está marcado como deprecado no repositório.

## Exportar para mobile

Via `/pos-producao-audio-mobile`: SFX curtos em **PCM 16-bit mono 44,1 kHz ou IMA4 em `.caf`** para iOS (vários sons simultâneos; o decodificador AAC de hardware não toca múltiplos streams — docs arquivadas da Apple, revalidar), **Ogg Vorbis** para Godot/web; UI pode cair a 32 kHz; ambientes em loop em AAC/Ogg streaming. Tamanho: PCM 16-bit mono 44,1 kHz ≈ 88 KB/s; IMA4 ≈ 22 KB/s. O engine carrega de `./assets/audio/sfx/` (ver `/audio-adaptativo-no-engine`). **Licença de saída**: ElevenLabs → termos do plano pago (comercial, sem atribuição [secundário, confirmar]); Stable Audio 3 → Community License (comercial até o limiar); Firefly → termos Adobe. Registrar em `PROVENANCE.md`.

## Fontes

- SDK ElevenLabs SFX (`text_to_sound_effects.convert`): https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/text_to_sound_effects/client.py ; IDs de modelo: https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/types/sfx_model_id.py
- ElevenLabs MCP (hospedado recomendado; local deprecado): https://github.com/elevenlabs/elevenlabs-mcp
- Lançamento SFX v2 (02/09/2025) [secundário]: https://blockchain.news/ainews/elevenlabs-launches-sfx-model-v2-high-quality-ai-sound-effects-with-seamless-looping-and-extended-duration
- Stable Audio 3 (Small-SFX): https://github.com/Stability-AI/stable-audio-3
- Adobe Firefly SFX [secundário]: https://www.adobe.com/products/firefly/ ; https://www.adobe.com/uk/products/firefly/features/sound-effect-generator/button-sound.html
- MMAudio (não comercial): https://github.com/hkchengrex/MMAudio ; ThinkSound: https://github.com/liuhuadai/ThinkSound
- Normalizar por lotes separados (one-shots, loops, ambiente, diálogo) [secundário]: https://mastering.to/roblox
- Apple "Using Audio" (arquivo): https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MultimediaPG/UsingAudio/UsingAudio.html
