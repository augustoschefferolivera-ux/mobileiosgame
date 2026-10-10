---
name: engine-unity-mobile
description: >
  Configura, codifica e verifica um jogo mobile em Unity 6.3 LTS para iOS usando o plug-in
  oficial Unity-Technologies/unity-agent-plugin (32 skills: IAP, LevelPlay, pixel perfect,
  sprite atlas, física 2D, tiles, áudio, live game), apple/unityplugins (StoreKit 2, GameKit,
  Background Assets), MCP for Unity (CoplayDev) e Unity CLI; build iOS em batchmode gera projeto
  Xcode que é compilado e executado no simulador. Use sempre que o jogo for em Unity (2D ou 3D),
  especialmente quando IAP/anúncios/cross-platform pesam. Não use para nativo SwiftUI/SpriteKit
  (engine-spritekit-swiftui), Godot (engine-godot-mobile) ou web (engine-web-phaser).
license: MIT
compatibility: "Claude Code (plug-in oficial também em Codex e Grok); Unity 6.3 LTS com iOS Build Support; macOS com Xcode para build/simulador iOS"
metadata:
  grupo: engines
  alvo: [2d, 3d, app]
  fase: [2, 3, 5, 8]
argument-hint: "[caminho-do-projeto] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine Unity 6.3 LTS para iOS

Entrega um projeto Unity com assets serializados em texto, plug-in oficial instalado, testes do Unity Test Framework e um build iOS verificado: `scripts/verify.sh` roda os testes em batchmode, gera o projeto Xcode, compila para o simulador, lança, tira screenshot e coleta logs em `production/evidencias/<data>-<feature>/`.

## Quando usar / quando não usar

- **Use** quando o brief exige IAP, anúncios (LevelPlay), serviços live (contas, cloud save, leaderboards) ou Android além de iOS. A lista de skills oficiais da Unity é a mais voltada a monetização mobile de qualquer engine.
- **Use** para 3D mobile se RealityKit não serve (cross-platform, pipeline URP conhecido).
- **Não use** para um 2D pequeno só-iOS (SpriteKit é mais verificável e sem licença de engine) nem quando a equipe não quer binários/YAML grandes no repositório: cenas e prefabs são o ponto fraco dos agentes em Unity.
- Versão: **Unity 6.3 LTS** (suporte de dois anos, até dezembro de 2027 — fonte secundária, confirme em unity.com). Fixe em `ProjectSettings/ProjectVersion.txt` e não deixe o agente "atualizar o editor".

## Pré-requisitos

- Unity Hub + Unity 6.3 LTS com módulo **iOS Build Support**; macOS com Xcode para compilar o projeto Xcode gerado (Unity não gera .ipa sem Xcode).
- Plug-in oficial da Unity (Unity Companion License), dentro de uma sessão do Claude Code:

```text
/plugin marketplace add Unity-Technologies/unity-agent-plugin
/plugin install unity@unity-agent-plugin
```

  Verifique digitando `/unity:` — as skills aparecem. Via terminal: `claude plugin marketplace add Unity-Technologies/unity-agent-plugin` e `claude plugin install unity@unity-agent-plugin` (carrega na próxima sessão ou com `/reload-plugins`).
- Unity CLI (o plug-in instala quando precisa; o Hub já instala automaticamente). Teste: `unity status`. Pacote `com.unity.pipeline` no projeto (`unity pipeline install`) para o agente dirigir o Editor aberto.
- Opcional: **MCP for Unity** (CoplayDev, MIT, Unity 2021.3 → 6.x, Python 3.10+ via `uv`): Package Manager → Add from git URL `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main` (fixe a tag da release atual; v10.3.0 em 04/10/2026) ou `openupm add com.coplaydev.unity-mcp`; depois `Window → MCP for Unity → Configure All Detected Clients`. Traz validação Roslyn de scripts, execução de testes e grupos de ferramentas.
- Plug-ins da Apple para Unity (Apache 2.0): clone `apple/unityplugins` e construa os pacotes (`build.py` do repo; novos StoreKit/Background Assets exigem Xcode 27, Python 3 e Unity 2022 LTS+). Mínimo iOS 15.6.
- Git com `.gitignore` de Unity e **commit antes de cada tarefa grande** — a Unity avisa que nem toda mudança do agente é desfeita pelo Editor.

## Entradas

- Brief (2D/3D, retrato/paisagem, monetização), `production/feature_list.json`, art bible.
- Pipeline de render decidido (URP para mobile; `migrate-birp-to-urp` se herdou Built-in).

## Passos

1. **Projeto** (fase 2): invoque `/unity:new-unity-project` (coleta conceito, plataformas, monetização e configura source control e pacotes). Em seguida: `Edit → Project Settings → Editor → Asset Serialization Mode = Force Text` para que cenas, prefabs e `.asset` sejam YAML legíveis pelo agente; `Project Settings → Player → iOS` com bundle id, orientação e `Target SDK` (Device para TestFlight; Simulator para `verify.sh`). Guia de skills por fase em `references/skills-oficiais-por-fase.md`.
2. **Estrutura de código**: `Assets/_Game/{Scripts,Scenes,Prefabs,Art,Audio,Tests}`; `.asmdef` por pasta (`Game.Runtime`, `Game.Editor`, `Game.Tests`); dados em `ScriptableObject`; sem `Find*()` em runtime; referências cacheadas em `Awake()`. Para mudanças de cena/prefab, prefira dirigir o Editor (`unity command …` via skill `unity-cli`) a editar YAML na mão.
3. **Canal de depuração**: um `DebugChannel` MonoBehaviour que grava `Application.persistentDataPath/debug_state.json` (cena, score, fps médio, último erro) a cada 0,5 s e usa `Debug.Log` com prefixo `[GAME]`. É o que o agente lê do simulador (`xcrun simctl get_app_container … data` → `Documents/`) ou do dispositivo (`devicectl device copy from`).
4. **Loop de verificação** (fase 3): copie `assets/BuildScripts.cs` para `Assets/_Game/Editor/` e rode:

```bash
.claude/skills/engine-unity-mobile/scripts/verify.sh --project . --feature esqueleto --tests editmode
```

   Em iterações rápidas use o Editor aberto: skill `unity-cli` → `unity command editor_play`, leia o console e siga o `playmode-verification-loop.md` que ela referencia (Editor sem foco pode congelar no frame 1 — a skill explica como confirmar que o jogo avança).
5. **Features** (fase 5): uma por sessão, sempre começando pela skill oficial correspondente (tabela em `references/skills-oficiais-por-fase.md`): física 2D → `create-2d-physics`; tiles → `create-tile-palette-or-rule-tiles`; HUD → `ui` (roteia para `ui-uitk`/`ui-ugui`); pixel art borrada → `2d-pixel-perfect`; navegação → `initialize-ai-navigation`; idiomas → `localization`.
6. **iOS nativo**: GameKit, CoreHaptics, GameController, StoreKit 2 e Background Assets via `apple/unityplugins` (não via plug-ins pagos da Asset Store). Pagamentos: `implement-in-app-purchases` (Unity IAP) **ou** StoreKit 2 da Apple — não os dois.
7. **Assets** (fase 6): `manage-sprite-atlas` (atlases master/variant com overrides por plataforma), `sprite-editor` (fatias/pivôs por script), `optimize-audio`, `optimize-text-mesh-pro`. Compressão de textura ASTC em iOS nas Platform Overrides.
8. **Unity AI (Assistant/Generators)**: opcional. Créditos acabam rápido (relatos de 1.000 créditos em 3 h–1 dia); ativos saem com metadados "AI-generated" e a Unity transfere ao desenvolvedor as declarações na loja. Registre cada ativo gerado em `PROVENANCE.md`.
9. **Build para TestFlight** (fase 10): `verify.sh --device-sdk` gera projeto Xcode para dispositivo em `production/build/ios-xcode/`; assinatura e upload ficam com `/ci-xcode-cloud-fastlane`.

## Critério de pronto e evidência

- `verify.sh` saiu 0: `editmode.xml`/`playmode.xml` sem falhas, `unity-build.log` sem `error CS`, projeto Xcode gerado, `xcodebuild.log` com `BUILD SUCCEEDED`, `screenshot.png` da cena esperada, `app.log`, `debug_state.json`.
- Feature marcada `passing` só com o caminho da evidência anexado.
- Rodar o Editor em Play não é prova: screenshot do simulador (ou dispositivo) é.

## Verificar no simulador/dispositivo

- Simulador: coberto por `verify.sh` (Target SDK Simulator; o `BuildScripts.cs` alterna com `-simulator`).
- Dispositivo: build com `--device-sdk`, abra `Unity-iPhone.xcodeproj`, assine e rode; ou `xcodebuild -scheme Unity-iPhone -destination 'generic/platform=iOS' archive`. Puxe `debug_state.json` com `xcrun devicectl device copy from`.
- Performance real (fps, memória, térmica) só em dispositivo; use Profiler remoto ou MetricKit (iOS 27 reporta frame rate Metal).

## Armadilhas conhecidas

- **Safe Mode**: erro de compilação C# faz o Editor abrir em Safe Mode e a Unity CLI não conecta (`unity status` falha). Corrija os erros e reabra; não edite arquivos às cegas.
- **Cenas/prefabs em YAML**: agentes erram GUIDs e `fileID`; mudanças estruturais pelo Editor (CLI/MCP), mudanças de valor por YAML.
- **Build iOS exige macOS/Xcode** para o `.app`/.ipa; o projeto Xcode em si pode ser gerado em batchmode em qualquer SO com iOS Build Support, mas o `verify.sh` só completa (xcodebuild + simulador) em um Mac.
- **Target SDK**: build para dispositivo não instala no simulador e vice-versa; o `verify.sh` força Simulator SDK salvo `--device-sdk`.
- **Licença de engine**: Unity Personal/Pro conforme receita; Pro/Enterprise subiram 5% em 12/01/2026 [secundário, confirmar]; o Runtime Fee foi cancelado em 2024.
- **Unity AI**: preço do Personal (US$ 10/mês após trial de 14 dias com 1.000 créditos) é de fontes secundárias — confirme em unity.com; não dependa dele para arte final.
- **Plug-in oficial em beta** (0.1.8-beta em 10/10/2026): nomes de skills podem mudar; confira com `/unity:` antes de citar em prompts.
- **MCP for Unity** e Godot AI são da mesma patrocinadora (Aura) com camadas pagas; a versão MIT basta.
- **Custo**: tokens; builds iOS em batchmode levam minutos — use `--tests none --no-xcode` em iterações e o loop completo ao fechar a feature.

## Fontes

- Unity-Technologies/unity-agent-plugin (README: instalação, Unity 6+, aviso de versionamento, Unity CLI): https://github.com/Unity-Technologies/unity-agent-plugin
- Unity blog, anúncio do plug-in (09/09/2026): https://unity.com/blog/unity-plugin-for-claude-code
- Unity CLI: https://docs.unity.com/en-us/unity-cli
- apple/unityplugins (Apache 2.0, iOS 15.6+): https://github.com/apple/unityplugins ; WWDC26 sessão 378 (novos plug-ins StoreKit/Background Assets): https://developer.apple.com/videos/play/wwdc2026/378/
- CoplayDev/unity-mcp (MIT, requisitos, instalação): https://github.com/CoplayDev/unity-mcp
- Unity AI beta e custo [secundário]: https://discussions.unity.com/t/unity-ai-beta-2026-is-here/1703625 ; https://discussions.unity.com/t/unity-ai-is-way-out-of-reality-on-cost/1724381 ; https://unity.com/blog/unity-ai-how-to-get-started
- Unity 6.3 LTS / preços [secundário]: https://unity.com/cn/products/pricing-updates
- Unity Test Framework e argumentos de linha de comando (`-runTests`, `-executeMethod`): https://docs.unity3d.com/Manual/EditorCommandLineArguments.html [não lida nesta pesquisa; confirme]
- Relatório interno `reports/Criação de jogos totalmente por IA.md` (seção Unity/Xcode 27/Godot; tabela Stack).
