# Middleware, motores por regras e música generativa em tempo real (10/10/2026)

## O que existe e o que não existe

| Opção | O que faz | Geração em runtime? | Custo/licença | Veredito para iOS indie |
| --- | --- | --- | --- | --- |
| **FMOD** | camadas, transições, parâmetros, ducking | não | grátis para indie abaixo de US$ 200K de receita, depois US$ 5.000/projeto [secundário, confirmar] | só se já usa; API nativa basta |
| **Wwise** (Sony/Audiokinetic) | idem, forte em espacial/interativo | não | licenciamento próprio; não confirmado para mobile indie | idem |
| **Unreal MetaSounds** | grafo DSP procedural | sim (procedural, não ML) | Unreal | fora do escopo iOS 2D deste playbook |
| **Reactional Music** | motor por regras que modula música nota a nota a partir de dados do jogo; Unity e Unreal; venda de música licenciada in-game | "não é IA; não usa ML" (fundador) | preço e suporte mobile não confirmados | avaliar só se o jogo é musical |
| **Mubert** (skills/MCP oficiais, 28/09/2026) | streaming com intensidade e modo loop; stems | sim, no servidor | "royalty-free, cleared for commercial use" segundo o repo; free tier não comercial; API sob consulta | protótipo/radio in-game; confirmar termos do produto |
| **Lyria RealTime** (Gemini API) | música contínua por WebSocket, prompts ponderados, `bpm` 60–200, `scale`, `density`, `brightness`, `guidance`, `mute_bass/drums` | sim | `v1alpha` experimental; só API key (NotImplementedError no Vertex); instrumental; **sem preço público** | **só protótipo** |
| **Magenta RealTime 2** | `mrt2_small` 230M / `mrt2_base` 2,4B; tempo real exige Apple Silicon; AUv3/app macOS | sim (local, Mac) | código Apache-2.0; licença dos pesos não declarada | ferramenta de estúdio para gerar offline; não embarca |
| **Stable Audio 3 Small** on-device | CPU/CoreML; 0,2–6 s por clipe no Mac | plausível para stingers curtos no iPhone, **não comprovado** (iOS não listado) | Community License | experimento de fase 7, nunca P0 |

## Lyria RealTime: fatos técnicos para o protótipo

- Modelo `models/lyria-realtime-exp`; `client.aio.live.music.connect(model=...)`; saída 48.000 Hz, 2 canais, PCM 16-bit; chunks de 4200 frames; buffer de 1 s na partida.
- Prompts `WeightedPrompt(text, weight)` via `set_weighted_prompts`; `set_music_generation_config` com `bpm`, `scale` (enum, ex.: `A_FLAT_MAJOR_F_MINOR`), `top_k`, `temperature` 0–3, `guidance` 0–6, `density`/`brightness` 0–1, `mute_bass`, `mute_drums`, `only_bass_and_drums`, `music_generation_mode` QUALITY/DIVERSITY/VOCALIZATION, `seed` (faixas de um espelho C#; [secundário]).
- **Mudar bpm/scale é descontinuidade: chamar `reset_context()` depois.** `play()/pause()/stop()`; prompts filtrados chegam em `filtered_prompt`.
- Sem Vertex, sem preço 2026 localizado, modelo final "não confirmado até GA". Qualquer uso em produto exige rede constante, consentimento 5.1.2(i) se houver dados pessoais, e aceitar imprevisibilidade na revisão.

## Arquitetura recomendada (do relatório)

Gerar offline (ACE-Step 1.5 / Stable Audio 3) → 2–4 stems ou camadas por música, BPM fixo → loops por samples (PyMusicLooper) → normalizar → tocar com lógica adaptativa convencional (vertical: ganhos por camada; horizontal: troca em barra; stingers). Isso roda offline, custa zero por sessão, passa na revisão e cabe em bateria.

## URLs

- https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_LyriaRealTime.py · https://github.com/googleapis/python-genai/blob/main/google/genai/live_music.py · https://github.com/gunpal5/Google_GenerativeAI/blob/main/src/GenerativeAI/Types/LiveMusic/LiveMusicGenerationConfig.cs [secundário] · https://github.com/magenta/the-infinite-crate
- https://github.com/magenta/magenta-realtime
- https://reactionalmusic.com/engine/ · https://www.musicbusinessworldwide.com/with-its-patented-music-integration-engine-and-in-game-purchases-reactional-music-claims-to-be-the-missing-link-between-the-music-and-games-industries/
- https://github.com/MubertAI/skills
- https://www.strayspark.studio/blog/wwise-fmod-metasounds-audio-middleware-comparison [secundário] · https://developers.meta.com/horizon/blog/meta-haptics-studio-meets-fmod-wwise/
- https://github.com/Stability-AI/stable-audio-3
