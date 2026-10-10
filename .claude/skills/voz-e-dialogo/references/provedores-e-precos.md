# Provedores de voz em nuvem: parâmetros, limites e preços (10/10/2026)

Preços são **[secundário, confirmar]** salvo indicação; páginas oficiais da ElevenLabs e OpenAI estavam bloqueadas durante a pesquisa.

## ElevenLabs

- Modelos: `eleven_v3` (70+ idiomas, tags de áudio, ≈500 ms), `eleven_multilingual_v2` (29 idiomas), `eleven_turbo_v2_5` (≈250 ms), `eleven_flash_v2_5` (≈75 ms) [lista de um wrapper comunitário; secundário].
- Preço API por 1.000 chars (02/10/2026, observado pela Cartesia): v3 e Multilingual v2 **US$ 0,08** (antes 0,10); Flash/Turbo 0,04. Em assinatura: 1 char = 1 crédito (v3/Multilingual), 0,5 (Flash/Turbo). Tags de áudio provavelmente contam como caracteres (não confirmado).
- **Text to Dialogue** (`text_to_dialogue.convert`, lido no SDK): `inputs=[{text, voice_id}]`, máx. 10 `voice_id` únicos, manter ≤ ~2.000 chars por requisição; `seed` 0–4294967295 (determinismo "best effort"); `language_code` ISO 639-1 (não no multilingual_v2); `previous_text`/`future_text` para continuidade prosódica; até 3 `pronunciation_dictionary_locators`; `output_format` idem SFX (MP3 192 kbps Creator+, PCM/WAV 44,1 kHz Pro+); `enable_logging=false` (zero retenção) só Enterprise.
- Licença: Free é não comercial e exige atribuição; vozes da Voice Library "free commercial use license"; clonar outra pessoa exige confirmar consentimento; criar um modelo de voz concede à ElevenLabs licença ampla de uso para operar/melhorar o serviço [secundário].
- Exemplo mínimo (Python):
  ```python
  import os
  from elevenlabs.client import ElevenLabs
  client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
  audio = b"".join(client.text_to_dialogue.convert(
      inputs=[{"text": "Bem-vindo à forja.", "voice_id": "<VOICE_A>"},
              {"text": "Preciso de uma espada.", "voice_id": "<VOICE_B>"}],
      model_id="eleven_v3", language_code="pt", seed=1234,
      previous_text="(cena anterior) ...", future_text="(fala seguinte) ...",
      output_format="mp3_44100_128"))
  open("vo_cena01_ptbr.mp3", "wb").write(audio)
  ```
  Confira os nomes dos campos no `client.py` do SDK instalado antes de rodar.

## Fish Audio S2

- API `s2.1-pro`: **US$ 15 por 1 M bytes UTF-8**, pay-as-you-go, sem assinatura; `s2.1-pro-free` grátis até 30/11/2026; empresas acima de US$ 1 M/ano devem contatar antes (docs via busca).
- Idiomas: 80+; Tier 1 JA/EN/ZH; **Tier 2 inclui português**.
- Controle: tags inline `[whisper] [excited] [angry] [laughing] [sigh] [pause] [emphasis]` entre 15.000+ descrições livres.
- Self-host (fish-speech): "FISH AUDIO RESEARCH LICENSE" — não use pesos locais em produto comercial sem licença.

## OpenAI

- `audio.speech.create(input ≤4.096 chars, model, voice, instructions, response_format, speed 0,25–4,0, stream_format)`; modelos `gpt-4o-mini-tts`, `gpt-4o-mini-tts-2025-12-15`, `tts-1`, `tts-1-hd`; `instructions` não existe em `tts-1/tts-1-hd`; 13 vozes embutidas + vozes custom por `{id}`; formatos mp3, opus, aac, flac, wav, pcm (lido no SDK).
- Preço [secundário]: ≈US$ 15/M chars ou token-based (US$ 0,60/M tokens de entrada + US$ 12/M tokens de áudio).

## Outros (sem decisão aqui)

- Google Gemini TTS: cobrança por token; normalizações de terceiros conflitam (US$ 16,50–36,6/M chars) [secundário].
- Cartesia (`sonic-3.5`, WebSocket, 44,1 kHz; SDK Apache-2.0): ≈US$ 30–49/M chars [secundário].
- Hume Octave 2: ≈US$ 120/M chars, enterprise [secundário].

## Cálculo de orçamento

- Roteiro de 50.000 palavras ≈ 300.000 chars → Eleven v3 ≈ US$ 24/passada; Fish S2 ≈ US$ 4,5 (bytes ≈ chars em texto latino com acentos ocupando 2 bytes); 3 passadas de retake é o normal. Multiplique por idiomas.
- Pré-renderize e embarque; não sintetize diálogo fixo em runtime (custo recorrente, latência, 5.1.2(i)).

## URLs

- https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/text_to_dialogue/client.py
- https://www.cartesia.ai/learn/elevenlabs-pricing · https://texttolab.com/blog/elevenlabs-pricing · https://elevenlabs.io/elevenlabs-voices-a-comprehensive-guide
- https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits · https://github.com/fishaudio/fish-speech
- https://github.com/openai/openai-python/blob/main/src/openai/resources/audio/speech.py · https://texttolab.com/blog/openai-tts-pricing
- https://github.com/cartesia-ai/cartesia-python
