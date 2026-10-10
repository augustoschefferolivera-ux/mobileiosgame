---
name: direcao-de-audio-e-sound-bible
description: >
  Escreve a sound bible curta do jogo (paleta sonora, referências, BPM/tom por área,
  hierarquia de mix, alvo −18 LUFS/−1 dBTP, buses, naming) e deriva do feature_list.json a
  lista completa de assets de áudio a gerar. Use antes de gerar qualquer música, SFX ou voz,
  sempre que o usuário falar em "som do jogo", "trilha", "identidade sonora", "mix" ou pedir
  áudio sem ter design/sound-bible.md aprovado. Não gera arquivos de áudio: para isso use
  /gerar-musica, /gerar-sfx ou /voz-e-dialogo depois que a bible estiver aprovada.
license: MIT
compatibility: "Claude Code ou Codex; sem dependência de plataforma"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [4]
argument-hint: "[nome-do-jogo] [genero/estilo]"
disable-model-invocation: false
user-invocable: true
---

# Direção de áudio e sound bible

Entrega `design/sound-bible.md` (1–2 páginas, aprovado por humano) e `design/audio/lista-de-assets-audio.csv` derivada do `feature_list.json`; a evidência é a tabela "Aprovação" preenchida na bible e o CSV com uma linha por asset.

## Quando usar / quando não usar

- **Use** no início da fase 4, antes de qualquer geração de áudio; ou quando o jogo mudou de escopo (nova área, novo sistema) e a lista de assets precisa ser rederivada.
- **Use** quando o usuário pede "uma música" ou "um som" solto e não existe bible: faça a bible mínima primeiro (15 minutos), senão cada asset sai com um estilo diferente.
- **Não use** para gerar áudio (`/gerar-musica`, `/gerar-sfx`, `/voz-e-dialogo`), normalizar (`/pos-producao-audio-mobile`) ou implementar no engine (`/audio-adaptativo-no-engine`).

## Pré-requisitos

- Template `templates/sound-bible.md` deste repositório (adaptado do Claude-Code-Game-Studios, MIT; crédito em `THIRD_PARTY_NOTICES.md`).
- `feature_list.json` do projeto (lista de features/telas/sistemas da fase 1). Se não existir, peça o brief e produza a lista de assets a partir dele, marcando "provisório".
- Nenhuma chave de API. Nenhuma ferramenta além de leitura/escrita de arquivos.

## Entradas

1. Brief do jogo (gênero, plataforma, público, tom emocional, classificação etária).
2. `feature_list.json` (ou equivalente): telas, mecânicas, inimigos, itens, áreas, estados de jogo.
3. Art bible (`design/art-bible.md`) se existir: a paleta sonora deve casar com a visual.
4. Engine escolhido na fase 2 (SpriteKit/RealityKit, Unity, Godot, web): define formatos na seção 7.
5. Restrições: orçamento em MB para áudio, há voz ou não, idiomas.

## Passos

1. **Ler o que já governa o projeto.** Leia brief, `feature_list.json`, art bible e `CLAUDE.md`. Não pergunte o que já está escrito.
2. **Perguntar só o que o humano decide** (uma rodada, ≤5 perguntas): emoção central do áudio; 2–3 referências que a pessoa ama e 1 que odeia; haverá voz?; orçamento de MB; se o jogo será jogado com som desligado com frequência (define quanto investir).
3. **Propor 2–3 direções sonoras** em 5 linhas cada (paleta, instrumentação, BPM médio, o que evitar) com prós/contras para mobile (alto-falante pequeno, sessões curtas, repetição). Recomende uma, mas a pessoa escolhe.
4. **Preencher a bible** copiando `templates/sound-bible.md` para `design/sound-bible.md` e completando as seções 1–9 na direção escolhida. Regras fixas que não dependem de gosto:
   - alvo de loudness −18 LUFS integrado / −1 dBTP (ASWG-R001 "Game (Mobile)") para o jogo; alvos por bus conforme a tabela da seção 5 do template;
   - BPM, tom e compasso **explícitos** para cada área/estado (sem isso não há loop limpo nem transição em barra);
   - naming `<cat>_<contexto>_<nome>_<variação>.<ext>` com `cat ∈ {mus, sfx, ui, amb, vo}`;
   - pastas `assets/audio/{musica,sfx,voz}` para entregas e `assets/audio/_masters/` para WAV originais (fora do bundle);
   - nenhuma referência a artista, música ou marca real dentro de prompts (risco 5.2.1 da App Store e de semelhança); referências ficam na bible como *descrição de qualidade*.
5. **Derivar a lista de assets** com `references/derivar-lista-de-assets.md`: para cada feature do `feature_list.json`, aplique a tabela "feature → eventos de áudio" e gere uma linha por asset em `design/audio/lista-de-assets-audio.csv` (cabeçalho em `assets/lista-de-assets-audio.csv`). Cada linha traz família, nome final, variações, loop, duração alvo, bus, alvo LUFS, prompt-base e prioridade (P0 = sem isso o jogo parece quebrado; P1 = polimento; P2 = luxo).
6. **Estimar orçamento** no fim do CSV: nº de assets × variações; minutos de música; caracteres de voz. Anote custo estimado por ferramenta (ver `/gerar-musica`, `/gerar-sfx`, `/voz-e-dialogo`) e tamanho em MB após exportação (regra prática: música AAC 128 kbps ≈ 1 MB/min; SFX PCM 16-bit mono 44,1 kHz ≈ 88 KB/s).
7. **Pedir aprovação explícita.** Mostre a bible e o CSV; pergunte "Posso gravar `design/sound-bible.md` e `design/audio/lista-de-assets-audio.csv`?". Só grave após "sim". Preencha a tabela "Aprovação" com data e nome.
8. **Registrar a evidência**: copie bible e CSV para `production/evidencias/<AAAA-MM-DD>-sound-bible/` junto com um `decisoes.md` de 10 linhas (direções descartadas e por quê).

## Critério de pronto e evidência

- [ ] `design/sound-bible.md` existe, tem ≤ 2 páginas, todas as tabelas das seções 3, 5 e 7 preenchidas (sem "[ ]" sobrando) e a tabela "Aprovação" com data e nome.
- [ ] `design/audio/lista-de-assets-audio.csv` tem uma linha por asset, cada uma com nome final válido pelo naming, família, variações, bus e prioridade.
- [ ] Toda feature P0 do `feature_list.json` tem pelo menos um asset de áudio associado (ou a palavra `silencio` justificada na coluna `observacao`).
- [ ] `production/evidencias/<data>-sound-bible/` contém bible, CSV e `decisoes.md`.
- Uma bible escrita sem aprovação humana registrada **não** está pronta.

## Armadilhas conhecidas

- **Bible longa é ignorada.** No teste cego do Claude-Code-Game-Studios o modo com 30 documentos ficou em último; 1–2 páginas e tabelas é o formato que o agente respeita (relatório, seção "O teto hoje…").
- **Referência direta a artista/jogo no prompt** vira semelhança indesejada e risco de 5.2.1/4.1(c) da App Store. Traduza referência em adjetivos, instrumentação e BPM.
- **Esquecer BPM/tom** inviabiliza loops e camadas depois; só o ACE-Step 1.5 aceita BPM/tom como metadado, os demais só por texto (nota de pesquisa, Q1).
- **Graves e estéreo largo** somem no alto-falante do iPhone; a paleta deve funcionar em mono e acima de ~150 Hz.
- **Alvo de loudness errado**: −14 LUFS (streaming) ou −23/−24 (console) não servem para mobile; use −18 LUFS/−1 dBTP (ASWG-R001 via LUFSNormalizer README; o próprio LUFSNormalizer é PolyForm NC e não entra no pipeline).
- **Voz decidida tarde**: se houver voz, ela define bus, legendas, consentimento e orçamento; decida na bible, não na fase 6.
- **Lista de assets sem prioridade** leva o agente a gerar 200 sons P2 antes do passo do jogador.

## Exportar para mobile

A bible fixa, na seção 7, o formato de entrega por tipo: iOS → AAC (.m4a) para música/ambiente/voz e PCM 16-bit ou IMA4 em `.caf` para SFX curtos (docs arquivadas da Apple, revalidar); Godot/web → Ogg Vorbis. Resolução: 44,1 kHz; SFX de UI mono. Orçamento de MB total declarado e verificado em `/pos-producao-audio-mobile`. **Licença de saída**: a bible em si é texto do projeto (sem restrição); a seção 9 obriga que cada asset gerado tenha licença de saída comercial global registrada em `PROVENANCE.md`.

## Fontes

- Claude-Code-Game-Studios, template `sound-bible.md` e agentes `audio-director`/`sound-designer` (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- ASWG-R001 mobile −18 LUFS/−1 dBTP (via README do LUFSNormalizer, PolyForm NC): https://github.com/vitaleaudio/LUFSNormalizer ; https://en.wikipedia.org/wiki/Audio_normalization
- ACE-Step 1.5 (controle de BPM/tom/compasso): https://github.com/ace-step/ACE-Step-1.5
- Apple, "Using Audio" (formatos; arquivo, revalidar): https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MultimediaPG/UsingAudio/UsingAudio.html
- App Store Review Guidelines 4.1(c), 5.2.1: https://developer.apple.com/app-store/review/guidelines/
- Relatório interno "Criação de jogos totalmente por IA" (seções Áudio, Stack recomendado, Checklist de riscos) e nota `research_notes/.../audio_musica_sfx_voz.md`.
