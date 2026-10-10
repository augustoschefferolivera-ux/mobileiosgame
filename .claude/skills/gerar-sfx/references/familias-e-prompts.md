# Famílias de SFX, prompts e variações

## 1. Fórmula de prompt

`<fonte/material> + <ação> + <espaço/acústica> + <caráter/tamanho> + <duração ou "short">`

Escreva em inglês para o ElevenLabs (vocabulário de sound design é majoritariamente inglês; funciona melhor), sem nomes de jogos, filmes, marcas ou personagens. Palavras úteis: `dry`, `no reverb`, `close mic`, `tight transient`, `soft`, `punchy`, `metallic`, `wooden`, `glassy`, `airy`, `low thud`, `bright`, `muted`, `cartoon`, `realistic`, `seamless loop`, `no music`, `no voices`.

## 2. Famílias e parâmetros sugeridos

| Família | Exemplo de prompt | `duration_seconds` | `prompt_influence` | `loop` | Variações no arquivo | Variação no engine |
| --- | --- | --- | --- | --- | --- | --- |
| UI confirmar/voltar/erro/abrir | `short soft wooden tap, clean UI confirmation click, no reverb, bright transient` | 0,5 (cortar p/ 0,1–0,3) | 0,6 | não | 1–2 | nenhuma (UI deve ser idêntica) |
| Passos (por superfície) | `single light footstep on dry grass, small character, close mic, no reverb` | 0,5 | 0,5 | não | 4–6 por superfície | pitch ±2 semitons, volume ±2 dB, round-robin |
| Pulo/aterrissagem | `small cartoon character jump, light whoosh with a puff of air, dry` / `soft landing thump on dirt, small body, dry` | 0,5–0,8 | 0,5 | não | 3 | pitch ±1 semitom |
| Ataque/golpe | `quick sword swing whoosh, light blade, dry, no impact` + `blunt impact on leather, medium weight, dry` (separe swing de impacto) | 0,5–1,0 | 0,6 | não | 3–4 cada | combinar swing+impacto no engine |
| Dano ao jogador | `short hurt impact with low thud and soft crunch, no voice, dry` | 0,5–0,8 | 0,6 | não | 2–3 | ducking de −3 dB no resto por 200 ms |
| Coleta/moeda/recompensa | `bright metallic coin pickup, short sparkle tail, playful, dry` | 0,5–0,8 | 0,6 | não | 2–3 | pitch sobe a cada coleta em combo |
| Inimigo (aparecer, atacar, morrer) | `small bat screech, quick flutter of wings, dry, cartoon` | 0,5–1,2 | 0,5 | não | 2–3 | pitch ±1 semitom |
| Stinger de UI (level up, conquista) | `short triumphant chime, three ascending notes, bells and soft synth, dry` | 1–3 | 0,5 | não | 1 | — |
| Ambiente (por área) | `gentle forest ambience, light wind in leaves, distant birds, no footsteps, no music, smooth seamless loop` | 15–30 | 0,3 | **sim** | 1 (ou 2 alternados) | crossfade entre áreas 1–2 s |
| Máquinas/magia contínua | `low mechanical hum with soft periodic clicks, steady, seamless loop, no music` | 10–20 | 0,4 | **sim** | 1 | volume por distância |

## 3. Regra dos candidatos

- 8–16 candidatos por prompt para one-shots frequentes; 4 para ambientes; 2–4 para stingers.
- Ouvir todos em sequência rápida (um player com atalho) e marcar `ok`/`x` numa tabela; não decida pelo waveform.
- Aprovados viram `_01`, `_02`… no naming final; os descartados são apagados (ou movidos para `_candidatos/_descartados/` se o projeto quiser auditar).
- Famílias devem soar como "do mesmo mundo": mesmo grau de realismo (cartoon vs realista), mesma quantidade de reverb (idealmente nenhuma no arquivo; o espaço vem do engine).

## 4. Formato do CSV do script

```
nome_arquivo,prompt,duration_seconds,loop,prompt_influence,variacoes,categoria
```

`categoria` vira subpasta (`ui`, `jogador`, `inimigo`, `feedback`, `ambiente`). `loop` aceita `sim/nao/true/false`. Veja `assets/prompts_sfx_exemplo.csv`.

## 5. Alternativa local: Stable Audio 3 Small-SFX

- Repositório oficial `Stability-AI/stable-audio-3` (código MIT; pesos Community License); modelo Small-SFX 433M "sound effects only", até 120 s, CPU/MLX/CoreML/TFLite; medidas no Mac: 0,7 s para um clipe de 5 s em CPU, 0,23 s em CoreML.
- Use os mesmos prompts; sem `loop` nativo → para ambientes, passe pelo PyMusicLooper (`/gerar-musica`, `find_loops.sh`) ou faça crossfade de fim→início no pós.
- Variações ilimitadas sem custo por chamada: útil para passos (6 superfícies × 6 variações).

## 6. Vídeo-para-áudio (apenas referência interna)

MMAudio (CC-BY-NC) e ThinkSound ("Commercial use is NOT permitted") servem para estudar sincronização de Foley em cutscenes, mas nenhum arquivo deles entra no build. Para cutscene lançada: gere os eventos com ElevenLabs/Stable Audio e sincronize manualmente, ou use o Adobe Firefly (timing pela voz) e confirme os termos.
