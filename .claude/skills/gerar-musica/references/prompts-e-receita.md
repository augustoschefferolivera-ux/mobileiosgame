# Prompts estruturados, receita de loop e formato do PROVENANCE.md

## 1. Fórmula de prompt para música

```
<paleta da bible> , <instrumentação central> , <instrumentos de acento ou "sem X"> ,
<BPM> BPM , <tom> , <compasso> , energia <1–5 em palavras> , <função: loop de área | stinger de vitória | tema de menu> ,
instrumental, sem vocais
```

Exemplos (sem nomes reais, só qualidades):

| Área/estado | Prompt |
| --- | --- |
| Menu | `lo-fi acolhedor, piano elétrico suave e percussão de madeira, baixo redondo, sem metais, 84 BPM, Lá menor, 4/4, energia baixa, tema de menu em loop, instrumental, sem vocais` |
| Exploração | `chiptune moderno com pads quentes, lead de onda quadrada discreto, bateria leve, 110 BPM, Dó maior, 4/4, energia média-baixa, loop de exploração, instrumental, sem vocais` |
| Combate | `percussão tribal seca e sintetizadores agressivos, sem reverb longo, 140 BPM, Ré menor, 4/4, energia alta, loop de combate que entra forte desde o primeiro compasso, instrumental, sem vocais` |
| Stinger vitória | `fanfarra curta de sinos e pizzicato, resolve em acorde maior, 110 BPM, Dó maior, 4/4, 4 segundos, stinger de vitória, instrumental, sem vocais` |

Por ferramenta:
- **ACE-Step 1.5**: além do texto, preencha os metadados de duração, BPM, tom/escala e compasso; deixe o campo de letra vazio para instrumental; gere lote de 8 com seeds diferentes e guarde os seeds.
- **Stable Audio 3**: o BPM só entra como texto; repita "`110 BPM`" no início e no fim do prompt; confirme o BPM resultante.
- **Lyria 3**: sem BPM/escala na API síncrona; escreva o BPM no texto e aceite variação; a saída tem SynthID.
- **Camadas**: para música em camadas, gere a versão completa e separe stems (não gere camadas em prompts separados: não ficam no mesmo andamento/tom).

## 2. Receita de loop (derivada das ferramentas citadas)

1. Gerar em BPM fixo com duração ≥ 2× o loop desejado.
2. `find_loops.sh --min-loop <s> [--approx INI FIM]` → LOOP_START/LOOP_END em samples.
3. Conferir compassos inteiros: `compassos = (END − START) / taxa / (60 / BPM × 4)` para 4/4. Se não der inteiro, use `--approx` para empurrar o fim para a barra mais próxima e repita.
4. Ouvir 3 repetições. Clique na emenda → crossfade 5–20 ms (no `/pos-producao-audio-mobile`) ou outro ponto.
5. Exportar intro/loop/outro; no engine, agendar o loop por samples (não por marcadores de container).
6. Normalizar o lote de música para −18 LUFS / −1 dBTP; codificar (AAC/Ogg).

Ambientes musicais contínuos (drones) podem dispensar o PyMusicLooper: gere com ElevenLabs SFX v2 `loop=true` (ver `/gerar-sfx`).

## 3. Formato do `PROVENANCE.md` (uma linha por asset, tabela Markdown)

Colunas alinhadas ao que `/licencas-e-proveniencia` audita (caminho, tipo, ferramenta e versão, seed, prompt, referências, edição humana, master, data, licença como `LICENCAS.md#id`, C2PA). O mesmo cabeçalho é o que `batch_sfx_elevenlabs.py` cria.

```
| asset | tipo | data | ferramenta | versao | seed/id | prompt | parametros | referencias | master | edicao humana | licenca (LICENCAS.md#id) | c2pa | curadoria |
| ./assets/audio/musica/mus_explora_floresta_loop.m4a | mus | 2026-10-10 | ACE-Step 1.5 XL 4B | <commit> | 42 | "chiptune moderno..., 110 BPM, Dó maior, 4/4, ..." | bpm=110 key=C_major ts=4/4 dur=150 loop=88200-5203800@44100 | - | ./masters/audio/musica/mus_explora_floresta_master.wav | corte de loop, crossfade 10 ms, −18 LUFS | LICENCAS.md#ace-step-1.5 (classe A, MIT) | nao | <nome> |
```

Campos obrigatórios: ferramenta + versão, seed/ID, prompt completo, master, edição humana (é o que sustenta autoria humana nos EUA e no Brasil, conforme relatório), licença da saída apontando para `LICENCAS.md`.

## 4. Orçamento

- Local (ACE-Step/Stable Audio 3): custo marginal zero; tempo ≈ segundos por música em GPU, minutos em CPU/MLX.
- Lyria 3: ≈US$ 0,08 por música completa, ≈US$ 0,04 por clipe de 30 s [secundário, confirmar]. Uma trilha com 8 músicas × 6 candidatos ≈ US$ 4.
- GPU alugada por hora para ACE-Step: registre o custo real na evidência.
