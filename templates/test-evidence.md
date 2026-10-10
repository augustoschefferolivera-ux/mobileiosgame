<!--
Template: test-evidence.md — registro de evidência de uma feature.
Adaptado de Claude-Code-Game-Studios (Donchitos, MIT), .claude/docs/templates/test-evidence.md
https://github.com/Donchitos/Claude-Code-Game-Studios — traduzido e ajustado para feature_list.json,
simulador iOS e métricas de mobile.

Salvar em: production/evidencias/<AAAA-MM-DD>-<id>/evidencia.md
Ao lado dele FICAM OS ARQUIVOS: os PNGs, verify.log, run.log, estado.json. Um nome listado aqui
sem arquivo ao lado não satisfaz nada — /ciclo-de-feature procura o arquivo, não a linha.
-->
# Evidência: [F-xxx — título da feature]

> **Feature:** `F-xxx` em `feature_list.json`
> **Data:** AAAA-MM-DD HH:MM
> **Build / commit:** `[hash curto]` (`git rev-parse --short HEAD`)
> **Engine / versão:** [ex.: SpriteKit, Xcode 27.0 | Godot 4.7.2 | Unity 6000.3.x | Phaser 4.x]
> **Onde rodou:** [ex.: iOS Simulator iPhone 17, iOS 27.0 | iPhone 13 físico, iOS 26.x | Safari iOS via Playwright 390×844]
> **Quem observou:** [agente + humano | só agente — anote]

---

## O que foi testado

[Um parágrafo: o comportamento validado e quais critérios de aceite da feature ele cobre.]

**Critérios cobertos:** [AC-1, AC-2, AC-3]

---

## Resultado por critério de aceite

| # | Critério (texto exato de feature_list.json) | Resultado | Como foi verificado | Arquivo |
|---|---|---|---|---|
| AC-1 | | PASSOU / FALHOU | teste / screenshot / estado / log | `teste.log` |
| AC-2 | | PASSOU / FALHOU | | `01-apos-toque.png` |
| AC-3 | | PASSOU / FALHOU | | `estado.json` |

---

## Screenshots / vídeo

| # | Arquivo | O que mostra | Critério |
|---|---|---|---|
| 1 | `01-tela-inicial.png` | | AC-1 |
| 2 | `02-apos-toque.png` | | AC-2 |

*Se houver vídeo, anote o timestamp do momento relevante.*

---

## Condições do teste

- **Estado inicial:** [ex.: "partida nova, seed 42, tabuleiro vazio"]
- **Comando de verificação:** `bash scripts/verify.sh --feature F-xxx` → exit `0`
- **Dispositivo / simulador / navegador:** [...]
- **Orientação:** retrato / paisagem
- **FPS durante o teste:** [ex.: "60 estável" | "~48 com quedas a 31 ao spawnar" — fonte: MetricKit / log de frame time / Metal HUD]
- **Memória / tamanho do build (se relevante):** [...]
- **Preparação especial:** [ex.: "argumento de lançamento --scene Jogo --seed 42"]

---

## Observações

[O que não causou FALHOU mas merece registro: jitter, texto apertado, atraso de áudio. Vira candidato a polimento ou a defeito para o crítico.]

- 

Se nada: *Sem observações relevantes.*

---

## Assinatura

Solo dev: você assina como revisor. A intenção é que alguém OLHE a evidência deliberadamente antes de marcar `done`.

| Papel | Nome | Data | |
|---|---|---|---|
| Revisor | | | [ ] Aprovado |

*Qualquer assinatura pode ser "Adiada — motivo"; uma feature com assinatura adiada não entra em `done`.*
