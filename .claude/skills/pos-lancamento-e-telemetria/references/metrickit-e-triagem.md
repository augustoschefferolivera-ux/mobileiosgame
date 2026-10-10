# MetricKit (iOS 27), Organizer via MCP, Sentry e triagem de crashes

## MetricKit no iOS 27 (WWDC26 sessão 222)

O que a sessão documenta: API Swift-first (`MetricManager`), relatórios diários e por intervalo, grupos de métricas `.cpu`, `.memory`, `.display`, `.gpu`, **taxa de quadros Metal**, diagnósticos de crash (backtrace, categoria de término), hangs, memory exception (novo), `StateReporting` para segmentar métricas por estado do app, relatórios `Codable` enviáveis ao servidor. Nomes de tipos e assinaturas exatas: confirme em developer.apple.com/documentation/metrickit [não lido nesta pesquisa].

Esqueleto (ajuste aos nomes reais da documentação):

```swift
import MetricKit

final class Telemetria {
    // 1. Assinar relatórios na inicialização do app.
    // 2. Receber relatórios diários/intervalares e diagnósticos (crash, hang, memória).
    // 3. Serializar (Codable) e enviar para o seu endpoint ou para o Sentry.
    // 4. Marcar estados de jogo com StateReporting: "menu", "gameplay", "boss", "loja".
}
```

Regras: não inclua texto do jogador nem identificadores nos payloads; envie em background com retry; guarde o primeiro payload de produção como evidência (`primeiro-payload.json`).

Compatibilidade: a API Swift-first exige iOS 27; em iOS 26 use a API anterior do MetricKit (`MXMetricManager`) [confirmar disponibilidade e diferenças].

## Organizer e crashes via agente (Xcode 27)

- Release Notes: "Agents in Xcode now have access to insights about your projects, such as crashes, disk writes, energy, hangs and launch issues"; SOTU: o agente pode "pull up the top crashes from the latest release" e corrigir com o log simbolizado.
- Caminhos: Xcode 27 (`xcrun mcpbridge`; `xcrun mcp-server enable --unsafe-always-allow-all-agents` só em ambiente não assistido e isolado) ou MobileBuildMCP (proxy das tools do Xcode desde 2.0.0; Device Hub desde 2.7.0; renomeado em 2.7.1).
- Dispositivo físico: `xcrun devicectl device info files --domain-type systemCrashLogs` lista crash logs; `devicectl device copy from` copia; use `--json-output`.

## Sentry (alternativa/complemento)

Crash e performance com dashboard pronto; o MobileBuildMCP é mantido pela getsentry e tem telemetria de erros própria (opt-out). Termos e preço não lidos nesta pesquisa; declare o SDK nos rótulos de privacidade e no manifest.

## Triagem → feature_list.json

Entrada em `feature_list.json` (campos sugeridos; adapte ao esquema do projeto):

```json
{
  "id": "BUG-0007",
  "tipo": "bug",
  "titulo": "Crash ao abrir a loja após compra restaurada",
  "severidade": "S1",
  "assinatura": "StoreView.swift:142 EXC_BAD_ACCESS",
  "ocorrencias_24h": 37,
  "build": "1.0.0 (12)",
  "log": "production/evidencias/2026-10-11-pos-lancamento/crash-BUG-0007.crash",
  "estado": "aberto",
  "reproduzido_por": "critico"
}
```

Severidade: S1 crash no launch, perda de progresso, compra não entregue; S2 crash em feature central ou hang > 2 s frequente; S3 crash raro/visual; S4 cosmético. Ordem: S1 → S2 → reviews com inconsistência de IA → S3.

Fluxo: `/ciclo-de-feature` com o bug (construtor), reprodução pelo crítico com o log antes/depois, evidência em `production/evidencias/`, depois `/submissao-app-store` para o patch.

## Day-one patch e rollback (adaptado do Game Studios, MIT)

Critérios de inclusão: S1/S2 seguros; fix < 4 h; sem novos caminhos de código; config/dados-only entram; exigências de revisão entram. Total < 1 dia. Fora disso → 1.1.

Plano de rollback na App Store (não há reversão de versão publicada): pausar Phased Release; se S1 generalizado, "Remove from Sale" temporário; submeter patch com pedido de revisão acelerada; comunicação aos jogadores (nota na ficha + reviews). Dono do rollback: [nome]. Gatilho: [N] S1 em [X] horas.

## Relatório 24 h / 72 h (modelo)

```markdown
# Pós-lançamento — [jogo] v[versão] — relatório [24h|72h]
- Lançado em: [data/hora]; modo: [manual/Phased]
- Downloads / sessões: [n] / [n]
- Crashes: [n] sessões, [x]% (meta < 0,1%); top 3 assinaturas → BUG-IDs
- Hangs: [n]; FPS médio por estado: menu [..], gameplay [..], boss [..]
- Memória pico: [MB]; launch: [s]
- Retenção D1: [%] (72h: D1/D3)
- Reviews: [n] novas, nota [x]; menções a IA: [n] → ações
- Bugs abertos: S1 [n], S2 [n], S3 [n]
- Decisão: [nenhuma ação / day-one patch / 1.1]
```

## Fontes

- https://developer.apple.com/videos/play/wwdc2026/222/
- https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- https://developer.apple.com/videos/play/wwdc2026/102/
- https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
- https://github.com/getsentry/MobileBuildMCP ; https://github.com/getsentry/MobileBuildMCP/blob/main/CHANGELOG.md
- https://github.com/Donchitos/Claude-Code-Game-Studios (MIT)
