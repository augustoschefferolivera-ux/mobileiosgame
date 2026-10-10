---
name: voz-e-dialogo
description: >
  Produz as vozes do jogo: diálogo fixo pré-renderizado na nuvem (ElevenLabs Eleven v3 /
  Text to Dialogue, Fish Audio S2, OpenAI gpt-4o-mini-tts) e texto dinâmico on-device em
  pt-BR (Kokoro-82M via FluidAudio/swift-tts, Chatterbox Nano, Qwen3-TTS), com roteiro,
  casting de vozes, consentimento escrito para qualquer voz real, divulgação na loja e
  PROVENANCE.md. Use sempre que o usuário pedir narração, dublagem, "voz do personagem",
  TTS, diálogo falado ou NPC que fala. Não use para SFX (/gerar-sfx), música
  (/gerar-musica) nem para normalizar/exportar (/pos-producao-audio-mobile).
license: MIT
compatibility: "Claude Code ou Codex; on-device exige Xcode e iOS 17/18+ conforme o pacote"
metadata:
  grupo: audio
  alvo: [2d, 3d, app, web]
  fase: [6, 7]
argument-hint: "[roteiro.csv | personagem] [--modo fixo|dinamico] [--provedor eleven|fish|openai|kokoro]"
disable-model-invocation: false
user-invocable: true
---

# Voz e diálogo

Entrega as linhas de voz aprovadas em `./assets/audio/voz/<idioma>/` (naming `vo_<personagem>_<linha>_<idioma>`), o casting em `design/audio/casting-vozes.md`, termos de consentimento em `legal/` quando houver voz real, texto de divulgação, e linhas em `PROVENANCE.md`; evidência: humano ouviu cada linha P0 e marcou aprovada no roteiro.

## Quando usar / quando não usar

- **Use** quando a bible §6 diz que há voz. Decida primeiro o **modo**: diálogo **fixo** (roteiro conhecido → pré-renderize na nuvem e embarque arquivos) ou **dinâmico** (texto gerado em runtime → TTS on-device em pt-BR; ver `/ia-em-runtime`-skills da fase 7).
- **Use** para "blips" de texto? Não: isso é SFX (`/gerar-sfx`).
- **Não use** TTS para as linhas centrais de um jogo narrativo sem avaliar atores: o ARC Raiders (Embark) foi criticado por vozes TTS "flat" e regravou com atores depois do lançamento ("A real professional actor is better than AI").
- **Não use** clonagem de voz de pessoa real sem termo de consentimento assinado (padrão SAG-AFTRA 2025, mesmo com não sindicalizados).

## Pré-requisitos

| Opção | Licença/termos | Acesso | Quando |
| --- | --- | --- | --- |
| **ElevenLabs Eleven v3 + Text to Dialogue** | planos pagos comerciais; Free não comercial com atribuição [secundário]; vozes da Voice Library com licença comercial [secundário] | SDK `pip install elevenlabs`, `ELEVENLABS_API_KEY`; `text_to_dialogue.convert(inputs=[{text, voice_id}], model_id, language_code, previous_text, future_text, seed)`; ≤10 vozes e ~2.000 chars por requisição; `previous_text`/`future_text` para continuidade; PCM/WAV só Pro+ | padrão para diálogo fixo multi-personagem; ≈US$ 0,08/1.000 chars em 02/10/2026 [secundário, mudou em semanas] |
| **Fish Audio S2** (`s2.1-pro`) | API paga; empresas >US$ 1 M/ano contatam antes; pesos self-host sob "Fish Audio Research License" (não comercial por padrão) | API pay-as-you-go US$ 15/M bytes UTF-8 [docs via busca]; português em Tier 2; tags de emoção inline `[whisper] [excited] [sigh]…` | mais barato (~5× que Eleven em texto latino); emoção por tag |
| **OpenAI `gpt-4o-mini-tts`** | termos OpenAI API | `audio.speech.create(input ≤4.096 chars, model, voice, instructions, response_format, speed)`; `instructions` dirige a entrega (não existe em `tts-1`) | direção textual simples; preço token/char [secundário] |
| **Kokoro-82M** (on-device) | Apache-2.0 (pesos inclusive) | FluidAudio (Apache-2.0, Swift, iOS 18+ para "Kokoro ANE v3") ou swift-tts (MIT, iOS 17+); CoreML ~80 MB (fp16+int8), ~16,9× tempo real no iPhone 16 Pro; inclui pt-BR (`p`) | texto dinâmico em pt-BR sem custo por chamada |
| **Chatterbox** (Nano 110M, Multilingual, fine-tune pt-BR) | MIT; toda saída com watermark "Perth" | repositório Resemble; FluidAudio (beta Nano/Multilingual); swift-tts só Mac via MLX | clonagem zero-shot e controle `exaggeration`/`cfg_weight`; CPU |
| **Qwen3-TTS** 0,6B/1,7B | Apache-2.0 | repositório oficial; português; clonagem em 3 s; swift-tts só Mac (MLX) | servidor próprio ou Mac |

Evitar: F5-TTS (pesos CC-BY-NC), Supertonic 3 (pesos OpenRAIL-M, repo arquivado), VibeVoice (uso só pesquisa), Fish S2 self-host sem licença. Detalhes em `references/provedores-e-precos.md` e `references/on-device-ios.md`. SDKs e MCP da ElevenLabs: `/instalar-ferramentas` (`.mcp.json` já declara `elevenlabs`); toda ferramenta usada entra em `LICENCAS.md` (`/licencas-e-proveniencia`).

## Entradas

1. `design/sound-bible.md` §6 (há voz? idiomas, consentimento, divulgação) e §5 (bus voz −18 LUFS).
2. Roteiro em CSV (`assets/roteiro-dialogo-exemplo.csv`): `id_linha,personagem,texto,emocao,contexto_antes,contexto_depois,idioma,prioridade`.
3. Lista de personagens com idade, registro, sotaque, emoção padrão.
4. Orçamento: caracteres totais × idiomas (ex.: 300 mil chars ≈ US$ 24 por passada no Eleven v3 [secundário]).
5. Decisão humana: TTS para quais linhas (periféricas) e atores para quais (centrais).

## Passos

1. **Classificar as linhas**: central (protagonista, momentos-chave) vs periférica (NPCs genéricos, tutoriais, avisos). Recomende ator real para as centrais; registre a decisão. Se o humano optar por TTS em tudo, anote o risco (lição ARC Raiders) na evidência.
2. **Casting**: para cada personagem, escolha 2–3 vozes candidatas do catálogo do provedor (nunca clone voz real sem termo). Gere a mesma linha de teste com cada voz; o humano escolhe; grave em `design/audio/casting-vozes.md` (personagem → provedor, `voice_id`, idioma, emoção padrão).
3. **Consentimento e divulgação**: se qualquer voz vier de pessoa real (ator, amigo, o próprio dev), preencha `assets/termo-consentimento-voz.md` → `legal/consentimento-voz-<nome>.md` assinado antes de gerar. Escreva o texto de divulgação (ficha da loja e créditos): "Vozes de X sintetizadas com <ferramenta>; vozes de Y gravadas por atores" (HIG pede identificar uso de IA; Steam/itch exigem).
4. **Pré-renderizar o diálogo fixo** (modo fixo), em blocos de cena de ≤2.000 chars e ≤10 vozes para o Text to Dialogue, passando `previous_text`/`future_text` com a linha anterior/posterior para continuidade prosódica; use `seed` fixo por cena e registre. Fish S2: insira tags de emoção da coluna `emocao`. OpenAI: coloque direção em `instructions`. Salve WAV/PCM no melhor formato do plano em `./masters/audio/voz/` e MP3/AAC de trabalho em `./assets/audio/voz/<idioma>/vo_<personagem>_<id_linha>_<idioma>.<ext>`.
5. **Texto dinâmico** (modo dinâmico, fase 7): integre Kokoro-82M via FluidAudio ou swift-tts; a voz pt-BR do Kokoro é fixa (sem clonagem); meça RTF no simulador e no dispositivo; mantenha fallback para `AVSpeechSynthesizer` do sistema (observe regressões reportadas no iOS 26: `AVSpeechSynthesisVoice(language:)` devolvendo voz padrão). Qualquer TTS em nuvem em runtime exige consentimento 5.1.2(i) antes da primeira transmissão e entra na classificação etária se for chat.
6. **Revisar de ouvido** (humano): toda linha P0 ouvida; checar pronúncia de nomes próprios (use dicionário de pronúncia do provedor quando houver), ritmo, emoção. Regenerar o que falhar com `previous_text`/tags ajustadas; no máximo 3 passadas por linha antes de escalar para ator.
7. **PROVENANCE.md**: por linha de voz: provedor, modelo (`eleven_v3`, `s2.1-pro`, `gpt-4o-mini-tts`, `Kokoro-82M`), `voice_id`, seed, texto, tags/instructions, edição humana, licença/plano, consentimento (link do termo).
8. **Entregar ao pós** (`/pos-producao-audio-mobile`): bus voz −18 LUFS/−1 dBTP, corte de silêncio, AAC/Ogg mono. Evidência em `production/evidencias/<data>-voz-<cena>/` (roteiro com coluna `aprovada`, casting, termo de consentimento quando houver).

## Critério de pronto e evidência

- [ ] Toda linha P0 do roteiro tem arquivo em `./assets/audio/voz/<idioma>/` com naming correto e coluna `aprovada=sim` assinada pelo humano.
- [ ] `design/audio/casting-vozes.md` completo; `legal/consentimento-voz-*.md` para cada voz real.
- [ ] Texto de divulgação pronto para a ficha da loja e créditos.
- [ ] `PROVENANCE.md` com uma linha por arquivo de voz (provedor, voice_id, seed, texto).
- [ ] Modo dinâmico: medição de RTF e tamanho do modelo no dispositivo (log em `production/evidencias/`).
- [ ] Veredito `aprovado` do subagente `diretor-de-audio` (pronúncia pt-BR, ritmo, "flat", consentimento) na pasta de evidência.
- Voz gerada e não ouvida **não** está pronta; "flat" é o defeito mais citado e só o ouvido detecta.

## Armadilhas conhecidas

- **Clonagem sem consentimento**: ElevenLabs exige confirmar consentimento e responsabiliza o usuário; o acordo SAG-AFTRA 2025 exige consentimento e divulgação para réplicas digitais; padrão a seguir sempre.
- **Backlash a TTS "flat"** (ARC Raiders); reserve atores para linhas centrais.
- **Limites do Text to Dialogue**: ≤10 vozes únicas e ~2.000 chars por requisição; cenas maiores precisam ser fatiadas com `previous_text`/`future_text`.
- **Preço muda em semanas**: US$ 0,08/1K chars é observação de concorrente (02/10/2026); confirme no site antes de orçar.
- **Fish S2 self-host** é "Research License"; só a API tem termos comerciais. **swift-tts exclui Fish S2, F5-TTS, XTTS e Orpheus por licença.**
- **Tamanho on-device**: Kokoro ~80 MB em CoreML int8, mas ~350 MB via download do swift-tts; Supertonic ~382 MB; justifica-se só para texto dinâmico.
- **Legendas obrigatórias** com identificação de quem fala (bible §8) para toda linha.
- **Idioma**: português está em Tier 2 no Fish; no Eleven use `language_code` (não suportado no `multilingual_v2`); Kokoro só tem pt-BR, não pt-PT.
- **Dados pessoais em TTS de nuvem em runtime**: 5.1.2(i) e rótulos de privacidade; prefira on-device.

## Exportar para mobile

Via `/pos-producao-audio-mobile`: voz em **AAC (.m4a) mono 44,1 kHz** para iOS (fonte 24–48 kHz: Kokoro 24 kHz, Eleven PCM 44,1 kHz), **Ogg Vorbis** para Godot/web; −18 LUFS/−1 dBTP no lote de voz; tamanho ≈ 0,5 MB/min em AAC 64 kbps mono. O engine carrega de `./assets/audio/voz/<idioma>/` com legenda associada por `id_linha` (ver `/audio-adaptativo-no-engine`). Modelo on-device: Kokoro CoreML ~80 MB, iOS 17/18+ conforme o pacote; embarque via On-Demand Resources ou Background Assets se passar do orçamento. **Licença de saída**: Eleven/Fish/OpenAI → termos do plano pago (comercial); Kokoro/Qwen3-TTS → Apache-2.0; Chatterbox → MIT com watermark Perth; vozes reais → o termo assinado define o escopo (jogo, trailers, DLC, idiomas).

## Fontes

- Text to Dialogue (SDK): https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/text_to_dialogue/client.py ; preços [secundário]: https://www.cartesia.ai/learn/elevenlabs-pricing ; vozes/consentimento [secundário]: https://elevenlabs.io/elevenlabs-voices-a-comprehensive-guide
- Fish Audio preços: https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits ; repo: https://github.com/fishaudio/fish-speech
- OpenAI speech (SDK): https://github.com/openai/openai-python/blob/main/src/openai/resources/audio/speech.py
- Kokoro: https://github.com/hexgrad/kokoro ; CoreML/ANE: https://github.com/Jon-Schneider/kokoro-coreml-ane ; FluidAudio: https://github.com/FluidInference/FluidAudio ; swift-tts: https://github.com/arraypress/swift-tts ; kokoro-ios: https://github.com/mlalma/kokoro-ios
- Chatterbox: https://github.com/resemble-ai/chatterbox ; Qwen3-TTS: https://github.com/QwenLM/Qwen3-TTS ; Pocket TTS: https://github.com/kyutai-labs/pocket-tts ; sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
- ARC Raiders regrava vozes TTS: https://www.pcgamesn.com/arc-raiders/ai-voices-replaced
- SAG-AFTRA 2025: https://deadline.com/2025/06/sag-aftra-video-game-deal-ai-1236429174/ ; https://variety.com/2025/gaming/news/video-game-actors-strike-contract-ratified-sag-aftra-1236451291/
- Apple HIG Generative AI (divulgação): https://developer.apple.com/design/human-interface-guidelines/generative-ai ; Guidelines 5.1.2(i): https://developer.apple.com/app-store/review/guidelines/
- Regressões AVSpeechSynthesizer iOS 26 (fóruns Apple): https://developer.apple.com/forums/thread/804648
