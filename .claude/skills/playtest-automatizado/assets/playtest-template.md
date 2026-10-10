# Playtest — {{FEATURE}} ({{DATA}})

- **Build**: commit `{{COMMIT}}` · scheme/URL: `{{BUILD}}` · configuração: Debug
- **Dispositivo**: {{DISPOSITIVO}} (simulador, retrato) · camada: {{CAMADA}}
- **Critério de aceite** (feature_list.json): {{CRITERIO}}
- **Pré-condições**: app reinstalado (estado limpo), seed de debug = 42, conta sandbox do Game Center: não

## Passos

| # | Ação (coord./id) | Espera | Esperado | Observado | Antes | Depois | debug_state |
|---|---|---|---|---|---|---|---|
| 1 | launch | até `scene == "menu"` | menu com botão Jogar | | `01-antes.png` | `01-depois.png` | `scene=menu` |
| 2 | tap (201, 620) | 2 s | `scene == "game"`, score 0 | | | | |
| 3 | swipe (201,700)→(201,300) | 1 s | personagem pula; `lastEvent == "jump"` | | | | |

## Métricas

- FPS médio / mínimo (30 s): __ / __ (`debug_state.fps`; MetricKit em dispositivo)
- Tempo até `scene == "menu"`: __ s · Crashes/hangs: __ · Memória (se disponível): __ MB

## Comparação com referência

- Referência: `production/referencias/{{FEATURE}}.png`
- Por visão (crítico): …
- Por pixels: __ % acima do limiar (`diff.png`), região: HUD

## Bugs

| id | severidade | reprodução | evidência |
|---|---|---|---|
| B1 | | | |

## Veredito do crítico (contexto limpo)

`aprovado | reprovado | bloqueado` — justificativa:

Evidências copiadas para `production/evidencias/{{DATA}}-{{FEATURE}}/`.
