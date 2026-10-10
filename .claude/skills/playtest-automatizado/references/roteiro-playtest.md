# Roteiro de playtest: estrutura, papéis e critérios

## Papéis

- **Construtor**: implementa a feature, roda `verify.sh`, escreve o roteiro (passos e esperado), **não** preenche "observado" nem veredito.
- **Executor**: agente (ou humano) que executa os passos e coleta evidências; pode ser o construtor, desde que colete tudo mecanicamente.
- **Crítico**: subagente em contexto limpo (sem histórico do construtor), recebe roteiro + evidências + critério de aceite; preenche observado/bugs/veredito. Métrica objetiva sempre que possível (estado esperado no `debug_state.json`, fps alvo, diff ≤ limiar).

## Seções do relatório (`assets/playtest-template.md`)

1. Cabeçalho: feature, data, build (commit, scheme/URL), dispositivo/simulador, camada usada.
2. Critério de aceite copiado de `feature_list.json`.
3. Pré-condições (conta sandbox, estado salvo, seed).
4. Passos: nº, ação (coordenada ou id), espera, esperado, observado, screenshot antes/depois, `debug_state` relevante.
5. Métricas: fps médio/mínimo, memória (se disponível), tempo de carregamento, crashes/hangs.
6. Comparação com referência: por visão (lista de diferenças) e por pixels (percentual, `diff.png`).
7. Bugs: id, severidade (bloqueante/alta/média/baixa), reprodução, evidência.
8. Veredito: `aprovado | reprovado | bloqueado` + justificativa de uma frase.

## Como escrever passos testáveis

- Uma ação por passo; coordenadas em pontos do simulador padrão (`iPhone 17`, retrato, 402×874 pt — confira em `xcrun simctl list devicetypes`/screenshot); ids de acessibilidade para menus.
- Espera explícita (`2 s` ou "até `debug_state.scene == "game"`").
- Esperado verificável: "`score` passa de 0 para 10", "sprite do inimigo desaparece na região (x,y,w,h)", "fps ≥ 55 por 10 s".

## Camadas e comandos

| Camada | Como agir | Como ver |
|---|---|---|
| Xcode 27 MCP | pedir ao agente: boot, install, launch, tap (x,y), swipe, type | screenshot via MCP; crashes/hangs do Organizer |
| ios-simulator-mcp | `ui_tap`, `ui_swipe`, `ui_type` (ASCII) | `screenshot`, `record_video`, `ui_describe_all` (só UI nativa) |
| MobileBuildMCP | build/launch; AXe para UI nativa | logs (daemon), LLDB |
| Maestro | `.maestro/menu.yaml`: `- launchApp` / `- tapOn: { id: "btn_play" }` / `- assertVisible: "Pontuação"` | `maestro test .maestro/menu.yaml` (CI) |
| Web | `playtest.mjs --taps "x,y;x,y"` | `screenshot.png`, `state.json`, `console.log` |
| Linha de comando | `node .claude/skills/engine-web-phaser/scripts/playtest.mjs --url ... --taps "x,y;x,y"` | arquivos em `production/evidencias/` |

## FPS e desempenho

- `debug_state.json.fps`: média de 1 s calculada pelo jogo; registre mínimo e média em 30 s de gameplay.
- Metal Performance HUD (Xcode 26+): leitura visual no simulador/dispositivo; Xcode 27 mostra métricas MetalFX.
- MetricKit iOS 27 (dispositivo): `MetricManager` com grupos `.cpu/.memory/.display/.gpu`, taxa de quadros Metal, diagnósticos de crash/hang/memória, `StateReporting` para separar por tela; relatórios `Codable` — grave em `Documents/metrics/*.json` e puxe com `devicectl device copy from`.
- Instruments: `xcrun xctrace list templates` e `xcrun xctrace record --template '<nome>' --device <udid> --attach <pid> --output trace.trace` para investigações pontuais.

## Comparação de screenshots

- Visão: o crítico lista diferenças em categorias (layout, cor/estilo, elementos ausentes/extras, texto, safe area, estado incorreto).
- Pixels: `scripts/comparar-screenshots.py referencia.png atual.png --limiar 2.0 --regiao x,y,w,h` → `%` de pixels diferentes acima de tolerância e `diff.png`; use seed fixo/modo debug para congelar partículas; compare só regiões estáveis quando houver animação.
- Limite: VLMs erram em avaliações estéticas e em jogos; use para detectar quebra, não nota de qualidade.

## Regressão

- Guarde os roteiros aprovados; reexecute antes de cada TestFlight: menus via Maestro no CI (Xcode Cloud `ci_post_xcodebuild.sh` ou GitHub Actions), gameplay via scripts de toque; compare `debug_state` final com o do roteiro aprovado.

Fontes: ver SKILL.md.
