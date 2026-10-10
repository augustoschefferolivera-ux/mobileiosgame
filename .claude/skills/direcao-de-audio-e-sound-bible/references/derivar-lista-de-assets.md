# Derivar a lista de assets de áudio do `feature_list.json`

Leia este arquivo no passo 5 da skill. O objetivo é sair com `design/audio/lista-de-assets-audio.csv` completo, uma linha por asset, sem inventar sons para features que não existem.

## 1. Formato esperado do `feature_list.json`

A fase 1 produz uma lista de features com, no mínimo, `id`, `nome`, `tipo` e `prioridade`. Exemplo mínimo que esta skill entende (campos extras são ignorados):

```json
[
  {"id": "F01", "nome": "Menu principal", "tipo": "tela", "prioridade": "P0"},
  {"id": "F02", "nome": "Pulo do jogador", "tipo": "mecanica", "prioridade": "P0"},
  {"id": "F03", "nome": "Inimigo morcego", "tipo": "inimigo", "prioridade": "P1"},
  {"id": "F04", "nome": "Fase floresta", "tipo": "area", "prioridade": "P0"},
  {"id": "F05", "nome": "Loja de itens", "tipo": "tela", "prioridade": "P1"}
]
```

Se o arquivo não existir, derive a lista do brief e marque `provisorio=sim` em todas as linhas.

## 2. Tabela feature → eventos de áudio

| `tipo` da feature | Eventos de áudio padrão | Família | Variações | Loop |
| --- | --- | --- | --- | --- |
| `tela` (menu, HUD, loja, pausa) | abrir, fechar, confirmar, cancelar, erro, navegação | ui | 1–2 | não |
| `tela` com música própria (menu principal, créditos) | música da tela | mus | 1 | sim |
| `mecanica` do jogador (pulo, ataque, dash, coleta) | início da ação, acerto/sucesso, falha | sfx (jogador) | 3–5 | não |
| `mecanica` de dano/morte do jogador | dano, morte, respawn | sfx (jogador) | 2–3 | não |
| `inimigo` | aparecer, atacar, ser atingido, morrer | sfx (inimigo) | 2–3 | não |
| `item`/`recompensa` | coletar, usar, raro | sfx (feedback) | 2–3 | não |
| `area`/`fase` | música da área (camadas conforme bible §3), ambiente, stinger de entrada | mus + amb | 1 | sim |
| `estado` (combate, tensão, vitória, game over) | música/stinger do estado | mus | 1 | depende |
| `dialogo`/`npc` | linhas de voz, "blip" de texto | vo ou ui | por linha | não |
| `sistema` (save, conquista, notificação) | confirmação, conquista | ui | 1 | não |

Regras:
- Feature P0 → assets P0. Nunca gere P2 antes de todos os P0 existirem.
- Sons tocados mais de 3×/min (passos, tiros, moedas) exigem ≥3 variações (regra do template).
- Uma área sem música própria **pode** reutilizar a música de outra área: registre `reutiliza=<nome>` em vez de criar asset novo.
- Não crie evento para o que a bible marcou como silêncio (ex.: "sem som de passos neste jogo").

## 3. Colunas do CSV

Cabeçalho pronto em `assets/lista-de-assets-audio.csv`:

```
id_feature,prioridade,familia,nome_arquivo,variacoes,loop,duracao_s,bus,alvo_lufs,bpm,tom,prompt_base,ferramenta_sugerida,provisorio,observacao
```

| Coluna | Como preencher |
| --- | --- |
| `id_feature` | o `id` da feature de origem (`F02`) |
| `prioridade` | herda da feature (P0/P1/P2) |
| `familia` | `mus`, `sfx`, `ui`, `amb`, `vo` |
| `nome_arquivo` | naming da bible sem extensão nem número de variação: `sfx_jogador_pulo` |
| `variacoes` | inteiro (1 para música/ambiente) |
| `loop` | `sim`/`nao` |
| `duracao_s` | alvo em segundos (UI 0,1–0,4; impactos 0,3–1,5; ambiente 15–30; música 60–150; stinger 2–8) |
| `bus` | `musica`, `sfx`, `ui`, `voz`, `ambiente` |
| `alvo_lufs` | da tabela da bible §5 (ex.: `-18`, `-20`, `-24`) |
| `bpm`, `tom` | só para `mus`; vem da bible §3 |
| `prompt_base` | 1 frase, sem nomes reais: material + ação + espaço + caráter (ver §4) |
| `ferramenta_sugerida` | `ace-step`, `stable-audio-3`, `elevenlabs-sfx`, `eleven-v3`, `fish-s2`, `kokoro`… |
| `provisorio` | `sim` se derivado sem `feature_list.json` |
| `observacao` | `reutiliza=…`, `silencio`, dependências |

## 4. Como escrever o `prompt_base`

Fórmula que funciona para SFX: **fonte/material + ação + espaço/acústica + caráter/tamanho + duração**.

- Ruim: `som de pulo estilo Mario`.
- Bom: `salto curto de personagem pequeno, "whoosh" leve com sopro de ar, sem reverb, cartoon, 0,3 s`.

Para música: **gênero/paleta da bible + instrumentação + BPM + tom + compasso + energia + função (loop/stinger) + "instrumental, sem vocais"**.

- Bom: `lo-fi acolhedor, piano elétrico e percussão de madeira, 84 BPM, Lá menor, 4/4, energia baixa, loop de exploração, instrumental, sem vocais`.

Para voz: **personagem + idade/registro + emoção padrão + ritmo**; o texto das linhas fica no roteiro, não no CSV.

Nunca inclua nome de artista, música, jogo, filme ou marca: a bible traduz referências em qualidades; o prompt só recebe as qualidades.

## 5. Estimativa de orçamento (rodapé do CSV ou `design/audio/orcamento-audio.md`)

- SFX: nº de linhas `sfx`/`ui` × `variacoes` × (8–16 candidatos por prompt na curadoria) = chamadas de API. Custo por chamada: ver `/gerar-sfx` (créditos ElevenLabs não confirmados nesta pesquisa; Stable Audio 3 Small-SFX local = custo zero por geração).
- Música: minutos totais = soma de `duracao_s` das linhas `mus`/60. Local (ACE-Step 1.5, Stable Audio 3) = custo zero por geração; Lyria 3 ≈ US$ 0,08 por música [secundário, confirmar].
- Voz: caracteres totais do roteiro × nº de idiomas. Eleven v3 ≈ US$ 0,08/1.000 chars [secundário, confirmar]; Fish S2 US$ 15/M bytes.
- Tamanho no bundle: música AAC 128 kbps ≈ 0,96 MB/min; SFX PCM 16-bit mono 44,1 kHz ≈ 88 KB/s; IMA4 ≈ 1/4 disso.
