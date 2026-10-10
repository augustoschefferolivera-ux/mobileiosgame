---
name: pos-lancamento-e-telemetria
description: >
  Opera o jogo depois do lançamento: telemetria com MetricKit do iOS 27 (frame rate Metal,
  crashes, hangs, memória, StateReporting por tela) ou Sentry, leitura dos crashes do
  Organizer pelo agente via MCP do Xcode 27, triagem de crash → feature_list.json →
  ciclo-de-feature, day-one patch com escopo mínimo e plano de rollback, monitoramento de
  reviews e de backlash sobre IA, métricas leves de retenção, atualização de conteúdo sem
  novo build com Background Assets e retrospectiva (post-mortem). Use quando o usuário
  disser "lançou", "está crashando", "reviews", "patch", "hotfix", "retenção",
  "atualizar conteúdo" ou "post-mortem". Não use antes da aprovação na App Store
  (submissao-app-store) nem para corrigir o bug em si (ciclo-de-feature).
license: MIT
compatibility: "Claude Code ou Codex; Xcode 27 em macOS 26.6+ para MetricKit novo e Organizer via MCP; iOS 27 nos dispositivos para MetricKit Swift-first"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app]
  fase: [10]
argument-hint: "[24h|72h|patch|retro]"
disable-model-invocation: false
user-invocable: true
---

# Pós-lançamento e telemetria

Entrega `production/releases/pos-lancamento-<versao>.md` com relatórios de 24 h e 72 h (crashes, hangs, FPS, retenção, reviews), bugs triados em `feature_list.json`, day-one patch com rollback documentado quando necessário e `production/releases/post-mortem-<versao>.md`, com evidências em `production/evidencias/<data>-pos-lancamento/`.

## Quando usar / quando não usar

Use a partir da aprovação na App Store (ou do primeiro build no TestFlight externo, para ensaiar): `24h` e `72h` para os relatórios, `patch` para montar o day-one/hotfix, `retro` para a retrospectiva 48–72 h depois do lançamento e ao fim de cada ciclo.

Não use para: submeter (`/submissao-app-store`); implementar a correção (`/ciclo-de-feature`, uma feature por sessão, com evidência); decidir monetização (`/monetizacao-iap-e-ads`).

## Pré-requisitos

- Telemetria no build lançado: MetricKit (iOS 27: API Swift-first `MetricManager`; relatórios diários e por intervalo; grupos `.cpu`, `.memory`, `.display`, `.gpu`; taxa de quadros Metal; diagnósticos de crash com backtrace e categoria de término, hangs e memory exception; `StateReporting` para segmentar por tela/estado; relatórios `Codable`) enviando para um endpoint seu ou para o Sentry. Implementação em `references/metrickit-e-triagem.md`.
- Xcode 27 com o MCP (`xcrun mcpbridge`) ou MobileBuildMCP (proxy das tools do Xcode desde 2.0.0) para o agente ler crashes, hangs, energia e launch issues do Organizer.
- Acesso ao App Store Connect (App Analytics, Ratings and Reviews, Phased Release).
- Opcional: Apple-Hosted Background Assets configurado (até 200 GB por app incluídos na membership; iOS 26+; packs localizados no iOS 27).

## Entradas

- Versão lançada, data/hora, modo de lançamento (manual, automático, Phased Release).
- `feature_list.json`, `production/releases/checklist-submissao-<versao>.md`, lista de riscos aceitos.
- Linha de base de FPS/memória do crítico (fase 8) para comparar.

## Passos

1. **Hora zero**: confirmar que a telemetria recebe dados do build de produção (primeiro payload de MetricKit ou evento de Sentry salvo como `primeiro-payload.json`); fixar o dashboard; registrar em `pos-lancamento-<versao>.md` a hora e o modo de lançamento. Se Phased Release, saber como pausar.
2. **Relatório 24 h** (`24h`): crashes por versão e por tela (`StateReporting`), hangs, taxa de quadros Metal por estado (menu, gameplay, boss), memória pico, launch time; downloads e sessões (App Analytics); reviews novas. Meta herdada do Game Studios: taxa de crash por sessão < 0,1% (heurística, não regra da Apple). O agente pode pedir ao Xcode 27 "os top crashes da última release" via MCP e receber o log simbolizado.
3. **Triagem de crash** (`references/metrickit-e-triagem.md`): agrupar por assinatura; classificar S1 (crash no launch/perda de progresso), S2 (crash em feature central), S3 (crash raro ou visual), S4 (cosmético); cada grupo vira item em `feature_list.json` com `tipo: bug`, severidade, assinatura, contagem, build e link do log; o próximo `/ciclo-de-feature` pega S1 primeiro. Regra: o construtor não avalia a própria correção — o crítico (subagente limpo) reproduz com o log.
4. **Reviews e backlash**: ler todas as reviews diariamente na primeira semana; marcar as que citam IA ("IA", "AI", "gerado", "slop", "voz robótica") e inconsistências visíveis (dedos, texto ilegível, prompt esquecido); responder com a divulgação específica (`/divulgacao-de-uso-de-ia`) e prazo de correção; lembrar 5.6.4 (reviews negativas e reembolsos em excesso pesam contra o desenvolvedor). Lições: The Alters removeu o prompt esquecido em update; Embark regravou vozes.
5. **Day-one patch / hotfix** (`patch`; regras adaptadas do Game Studios, MIT): só bugs S1/S2 seguros, fix mínimo, sem feature nova, sem refatoração, cada correção < 4 h; **rollback primeiro**: na App Store não se reverte uma versão publicada — o plano é (a) pausar o Phased Release, (b) remover o app da venda em caso extremo, (c) submeter versão corrigida com pedido de revisão acelerada; registre em `production/releases/rollback-plan-<versao>.md`. QA do patch: reproduzir cada crash com o log antes e depois; smoke test da sessão de 10 min; submeter via `/submissao-app-store` (checklist completo de novo, inclusive varredura de placeholders).
6. **Retenção leve**: D1/D7 do App Analytics (ou dos seus eventos: sessão iniciada, nível alcançado, primeiro "game over"), duração média de sessão, funil do tutorial. Sem identificador persistente além do que o App Analytics já dá (ver `/privacidade-lgpd-e-eca-digital`). Compare com o brief; registre no relatório 72 h.
7. **Relatório 72 h** (`72h`): consolidar 24 h + tendências; listar bugs abertos por severidade; decidir patch 1.1; anexar screenshots dos painéis.
8. **Conteúdo sem build**: para novos níveis, skins, trilhas e textos, usar Apple-Hosted Background Assets (asset packs; mock server local no Xcode 27; plug-in Unity "Background Assets" de `apple/unityplugins`); nunca código (Guideline 2.5.2). Registrar packs e versões em `production/releases/assets-packs.md`.
9. **Retrospectiva** (`retro`): preencher `references/post-mortem.md` → `production/releases/post-mortem-<versao>.md`: metas vs resultados, linha do tempo, o que funcionou, o que falhou (inclusive custo de tokens/créditos e horas de revisão da App Store), métricas, lições, ações com dono e prazo. Alimentar o `CLAUDE.md` do projeto com as lições operacionais.

## Verificar no simulador/dispositivo

- MetricKit só entrega relatórios em dispositivo real (não no simulador): instale o build de produção via TestFlight em um iPhone e force um crash de teste em build de debug separado para validar o pipeline de recepção.
- Background Assets: no Xcode 27 o mock server inicia automaticamente; valide download, versionamento e fallback offline no iPhone.

## Critério de pronto e evidência

Pronto quando existirem `pos-lancamento-<versao>.md` (24 h e 72 h), `primeiro-payload.json`, screenshots dos painéis (`crashes-24h.png`, `fps-por-estado.png`, `reviews-72h.png`), bugs S1/S2 em `feature_list.json` com link de log, e `post-mortem-<versao>.md`. Um dashboard aberto sem relatório gravado não é evidência.

## Armadilhas conhecidas

- **Sem rollback na App Store**: planeje pausar o Phased Release e ter o patch pronto; não prometa "reverter".
- **Patch inchado**: cada item além do mínimo aumenta o risco; o Game Studios limita a < 1 dia de trabalho.
- **MetricKit no simulador** não gera relatórios; teste em dispositivo.
- **MobileBuildMCP renomeado** (2.7.1): pacote npm, binários e variáveis mudaram; fixe a versão.
- **Backlash de IA** cresce com inconsistência visível, não com o rótulo; corrija rápido e especifique.
- **5.6.4**: reviews negativas e reembolsos em excesso podem pesar no Developer Code of Conduct.
- **Custo**: Haiku 5.5 para triagem em massa de logs; Opus/Sonnet só para a correção.
- **Dados pessoais em logs de crash**: não inclua texto do jogador nos payloads.

## Fontes

- WWDC26 sessão 222 "Meet the new MetricKit": https://developer.apple.com/videos/play/wwdc2026/222/
- Xcode 27 Release Notes (Organizer via agentes/MCP; simulador por agentes): https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- WWDC26 Platforms State of the Union ("pull up the top crashes from the latest release"): https://developer.apple.com/videos/play/wwdc2026/102/
- WWDC26 sessão 378 (Apple-Hosted Background Assets, 200 GB, packs localizados, mock server): https://developer.apple.com/videos/play/wwdc2026/378/
- apple/unityplugins (Background Assets): https://github.com/apple/unityplugins
- MobileBuildMCP (proxy do MCP do Xcode; renomeação 2.7.1): https://github.com/getsentry/MobileBuildMCP ; https://github.com/getsentry/MobileBuildMCP/blob/main/CHANGELOG.md
- devicectl (crash logs do dispositivo): https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- App Store Review Guidelines (2.5.2, 5.6.4): https://developer.apple.com/app-store/review/guidelines/
- Casos The Alters / ARC Raiders: https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ ; https://www.pcgamesn.com/arc-raiders/ai-voices-replaced [secundário]
- Day-one patch, release-manager e post-mortem adaptados de Claude-Code-Game-Studios (MIT, © 2026 Donchitos): https://github.com/Donchitos/Claude-Code-Game-Studios
