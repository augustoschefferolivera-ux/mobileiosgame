# Sound Bible: [Nome do jogo]

> **Onde salvar**: `design/sound-bible.md` (uma cópia deste arquivo preenchida). Dono: a pessoa que aprova áudio no projeto; a skill `/direcao-de-audio-e-sound-bible` preenche e a pessoa aprova.
> **Tamanho alvo**: 1–2 páginas. Se passar disso, o agente vai ignorar metade. Prefira tabelas a prosa.
> **Crédito**: adaptado de `.claude/docs/templates/sound-bible.md` do repositório `Donchitos/Claude-Code-Game-Studios` (MIT, © 2026 Donchitos); traduzido, encurtado e ajustado para mobile/iOS e para geração por IA. Registrar em `THIRD_PARTY_NOTICES.md`.

## 1. Identidade sonora

**Em duas frases**: [Como o jogo "soa"? Que emoção o áudio sustenta? Ex.: "Lo-fi acolhedor com percussão de madeira; nada estridente, tudo cabe num alto-falante de iPhone."]

**Pilares de áudio** (3, no máximo):
1. **[Pilar]** — [como aparece no som]
2. **[Pilar]** — [como aparece no som]
3. **[Pilar]** — [como aparece no som]

**Referências** (descreva a qualidade; nunca peça ao gerador "soar como X"):

| Referência (jogo/filme/disco) | O que aproveitar | O que evitar |
| --- | --- | --- |
| [ ] | [ ] | [ ] |

## 2. Paleta sonora

| Eixo | Escolha | Observação |
| --- | --- | --- |
| Acústico ↔ sintético | [ ] | |
| Limpo ↔ saturado | [ ] | |
| Esparso ↔ denso | [ ] | |
| Mono/estéreo | [SFX de UI em mono; música estéreo] | alto-falante de celular é quase mono |
| Faixa de frequência | [ex.: evitar graves <80 Hz, não saem no alto-falante] | |

**Instrumentos/texturas centrais**: [ ]
**Instrumentos de acento** (transições, recompensas): [ ]
**Proibido**: [ex.: orquestra épica, vozes cantadas, sirenes]

## 3. Música por área/estado

Gere sempre em BPM fixo e tom declarado; isso é o que permite loops, camadas e transições em barra.

| Área / estado | BPM | Tom | Compasso | Energia (1–5) | Duração do loop | Camadas (stems) | Transição |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Menu | [ ] | [ ] | 4/4 | 1 | 60–90 s | 1 | fade 1,5 s ao iniciar |
| Exploração | [ ] | [ ] | 4/4 | 2 | 90–150 s | base + melodia | em barra, crossfade 1 compasso |
| Tensão/combate | [ ] | [ ] | 4/4 | 4 | 60–120 s | base + percussão + lead | em barra, ≤3 s até intensidade máxima |
| Vitória/recompensa | [ ] | [ ] | 4/4 | 3 | stinger 2–6 s | 1 | volta à exploração |
| Game over | [ ] | [ ] | — | 1 | stinger 3–8 s | 1 | silêncio 2 s depois |

**Regras de música**: [ex.: "todo loop termina com o mesmo caráter espectral com que começa"; "silêncio de 10–15 s entre loops de exploração é permitido"; "nenhuma música tem vocal"].

## 4. Famílias de SFX

| Família | Exemplos | Caráter | Variações mínimas | Loop? |
| --- | --- | --- | --- | --- |
| UI | toque, confirmar, voltar, erro, abrir painel | curto (<300 ms), limpo, nunca cansa | 1–2 | não |
| Jogador | passos, pulo, ataque, dano | à frente do mix, resposta imediata | 3–5 | não |
| Inimigos/objetos | ataque, morte, coleta | distinto do jogador, levemente atrás | 2–3 | não |
| Feedback/recompensa | moeda, level up, combo | claro, satisfatório | 2–3 | não |
| Ambiente | vento, chuva, multidão, máquina | textura, sem eventos marcantes | 1 por área | sim (10–30 s) |

**Regras de SFX**: [ex.: "todo SFX tocado >3×/min tem ≥3 variações"; "SFX de UI em 2D, gameplay posicionado"; "SFX de dano do jogador abaixa o resto em 3 dB por 200 ms"].

## 5. Hierarquia de mix e buses

Prioridade quando sons competem (do mais ao menos importante): 1) dano/avisos críticos ao jogador · 2) ações do jogador · 3) voz/diálogo · 4) inimigos próximos · 5) UI · 6) música · 7) ambiente.

| Bus | Conteúdo | Alvo de loudness do asset | Volume padrão no bus | Ducking |
| --- | --- | --- | --- | --- |
| Master | tudo | — | 0 dB, limitador | nunca clipa |
| Música | loops e stingers | −18 LUFS integrado / −1 dBTP | −6 dB | abaixa −6 dB em diálogo |
| SFX | jogador, inimigos, feedback | −18 LUFS por lote de categoria / −1 dBTP | 0 dB | — |
| UI | interface | −20 LUFS / −1 dBTP | −3 dB | — |
| Voz | diálogo, narração | −18 LUFS / −1 dBTP | 0 dB | prioridade |
| Ambiente | loops de cenário | −24 LUFS / −1 dBTP | −9 dB | abaixa em combate |

Alvo geral do jogo no dispositivo: **−18 LUFS integrado, −1 dBTP** (ASWG-R001, perfil "Game (Mobile)"). Os valores por bus acima são ponto de partida; ajuste ouvindo em alto-falante de iPhone e em fone.

## 6. Voz

| Item | Decisão |
| --- | --- |
| Há diálogo falado? | [não / fixo pré-renderizado / dinâmico on-device] |
| Idiomas | [pt-BR, en] |
| Vozes (personagem → voz, provedor, ID) | [ ] |
| Consentimento | [voz sintética de catálogo / ator com termo assinado em `legal/consentimento-voz-<nome>.md`] |
| Divulgação | [texto da ficha da loja e dos créditos] |

## 7. Especificação técnica (mobile primeiro)

| Tipo | Formato de entrega | Taxa | Canais | Carregamento |
| --- | --- | --- | --- | --- |
| Música | AAC (.m4a) 128–160 kbps [iOS]; Ogg Vorbis q5 [Godot/web] | 44,1 kHz | estéreo | streaming |
| SFX curtos | PCM 16-bit ou IMA4 em .caf [iOS]; Ogg Vorbis [Godot/web] | 44,1 kHz (UI pode ir a 32 kHz) | mono | memória |
| Ambiente | AAC/Ogg, loop | 44,1 kHz | estéreo ou mono | streaming |
| Voz | AAC/Ogg | 44,1 kHz (fonte 24–48 kHz) | mono | streaming |

**Master arquivado**: todo asset tem um WAV 24-bit/44,1 ou 48 kHz em `assets/audio/_masters/`, fora do bundle do app.

**Naming**: `<cat>_<contexto>_<nome>_<variação>.<ext>` com `cat ∈ {mus, sfx, ui, amb, vo}`. Ex.: `sfx_jogador_passo_grama_03.caf`, `mus_explora_floresta_loop.m4a`, `vo_npc_ferreiro_saudacao_ptbr.m4a`.

**Orçamento de tamanho**: áudio total ≤ [ex.: 25 MB] no bundle; música ≤ [ ]; SFX ≤ [ ]; voz ≤ [ ].

## 8. Acessibilidade

- Todo evento crítico tem alternativa visual (ícone, flash, legenda).
- Controles de volume separados por bus; opção "reduzir sons altos repentinos".
- Legendas com identificação de quem fala para todo diálogo.
- Mix padrão testado em alto-falante do iPhone e em fones.

## 9. Proveniência e licença

- Cada asset gerado por IA tem linha em `PROVENANCE.md` (modelo, versão, seed/ID, prompt, edição humana, licença da saída).
- Modelos/APIs autorizados neste projeto: [ex.: ACE-Step 1.5 (MIT), ElevenLabs SFX v2 (plano X), Kokoro-82M (Apache-2.0)].
- Proibidos neste projeto: Suno/Udio em assets lançados; MMAudio/ThinkSound; LUFSNormalizer; qualquer voz real sem termo assinado.

## Aprovação

| Versão | Data | Aprovado por | Mudanças |
| --- | --- | --- | --- |
| 0.1 | [ ] | [ ] | primeira versão |
