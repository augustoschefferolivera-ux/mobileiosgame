---
name: escolher-engine-e-alvo
description: >
  Decide engine e alvo (2D/3D × web/app) com uma matriz de critérios objetivos — o agente fecha sozinho
  construir→rodar→ver→ler log? o formato de cena é texto? exporta para iOS? IAP/anúncios? licença? — entre
  SwiftUI+SpriteKit, RealityKit, Unity 6.3 LTS, Godot 4.7, Phaser/PixiJS+TypeScript, Three.js/Babylon.js e
  Capacitor/PWA, e grava a decisão como ADR em docs/decisoes/ADR-0001-engine-e-alvo.md mais production/engine.txt.
  Use sempre que o usuário perguntar "qual engine", "Unity ou Godot", "nativo ou web", "dá para fazer em Unreal",
  "SceneKit ainda vale", ou quando existir brief sem ADR de engine. Só decide e aponta para a skill engine-*
  certa; não repete o conteúdo delas. Não use para instalar (/instalar-ferramentas) nem para montar o loop de
  verificação (/montar-loop-de-verificacao).
license: MIT
compatibility: "Claude Code ou Codex"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [2]
argument-hint: "[2d|3d] [app|web|ambos] [restrições]"
disable-model-invocation: false
user-invocable: true
---

# Escolher engine e alvo

Entrega `docs/decisoes/ADR-0001-engine-e-alvo.md` (status `Aceito` pelo usuário) e `production/engine.txt` com o nome canônico que o despachante `./scripts/verify.sh` e `/instalar-ferramentas` leem.

## Quando usar / quando não usar

- **Use** depois do brief e antes de qualquer código; de novo só se o brief mudar (2D→3D, app→web, IAP) — aí um novo ADR substitui o anterior.
- **Não use** para detalhes de implementação da engine (as skills `engine-spritekit-swiftui`, `engine-realitykit-metal`, `engine-unity-mobile`, `engine-godot-mobile`, `engine-web-phaser`, `engine-web-threejs` cuidam disso) nem para comparar geradores de assets.

## Pré-requisitos

- `design/game-brief.md` preenchido (2D/3D, alvo, dispositivo mínimo, IAP/ads, offline, orientação).
- `templates/adr.md` e a matriz completa em `references/matriz-engines.md` (leia-a antes de decidir casos não óbvios).
- Saber se existe Mac: sem macOS não há export iOS em nenhuma engine.

## Entradas

- Do brief: dimensão (2D/3D), alvo (app/web/ambos), Android depois?, IAP/anúncios, offline, dispositivo mínimo, experiência do usuário com linguagens.
- Restrições de orçamento (assinaturas de engine/IA) e de hardware (Apple silicon? macOS 26.6+?).

## Passos

1. **Eliminações sem discussão.** Unreal fica fora: "the worst fit because binary .uasset files are opaque to the agent"; o MCP first-party do UE 5.8 é experimental e sem autenticação. SceneKit fica fora de projeto novo: deprecado em todas as plataformas no Xcode 26, Apple recomenda RealityKit. Plataformas "texto → jogo" (Rosebud, Upit, Bitmagic) hospedam o jogo no runtime delas; o único caminho iOS documentado é web view (FlutterFlow) — não servem para título próprio na App Store.

2. **Critérios, nesta ordem de peso** (a coluna de desempate do relatório foi a mesma para todas as linhas):
   1. O agente fecha sozinho **construir → rodar → ver (screenshot) → ler log**? Com que ferramenta oficial ou MCP mantido?
   2. **Formato de cena/dados é texto** legível e editável pelo agente?
   3. **Export iOS** pelo próprio agente (nativo, projeto Xcode gerado, wrapper)?
   4. **IAP/anúncios** com SDK oficial ou plug-in mantido?
   5. **Licença** da engine/tooling permite venda global sem taxa surpresa?
   6. Risco de alucinação de API (versão recente, poucos exemplos) e custo recorrente.

3. **Árvore de decisão** (confirme na matriz):

| Brief diz… | Escolha principal | Alternativa | `production/engine.txt` |
|---|---|---|---|
| 2D, só iOS, IAP/Game Center nativos | SwiftUI + SpriteKit (não deprecado; ciclo `xcodebuild` + `simctl` + MCP do Xcode) | Godot 4.7 se Android vier depois | `spritekit` |
| 2D, iOS + Android, equipe só sabe GDScript ou quer MIT | Godot 4.7 + Godot AI (cenas `.tscn` em texto; `project_run`, `logs_read`, `editor_screenshot`) | Unity 6.3 LTS | `godot` |
| 2D/3D, monetização pesada (IAP + LevelPlay), multiplataforma, C# | Unity 6.3 LTS + plug-in oficial (skills `implement-in-app-purchases`, `levelplay-unity-integration`, `2d-pixel-perfect`, `manage-sprite-atlas`) + apple/unityplugins | Godot 4.7 | `unity` |
| 3D nativo iOS, cenas leves, AR/USDZ | RealityKit (`RealityView` em SwiftUI); Metal 4 só com as skills do Game Porting Toolkit | Unity 6.3 LTS para 3D complexo | `realitykit` |
| 2D web-first (jam, validação, sem Mac) | Phaser ou PixiJS + TypeScript (sem export step; screenshot por Playwright/Puppeteer) | — | `phaser` ou `pixijs` |
| 3D web-first | Three.js ou Babylon.js + TypeScript (o FPS de Shumer com ~55 mil linhas era Three.js/WebGL2 e ficou em ~5/10) | PlayCanvas (MCP oficial com runtime tools) | `threejs` ou `babylonjs` |
| Jogo web que precisa estar na App Store | Capacitor (web view) sobre o jogo web; PWA não aparece na loja | Reescrever nativo | `capacitor` + nome da engine web no ADR |

4. **Escreva o ADR** a partir do template:

```bash
mkdir -p docs/decisoes && cp -n templates/adr.md docs/decisoes/ADR-0001-engine-e-alvo.md
```

   Preencha a tabela "Compatibilidade com a engine e com o agente" com fatos da matriz (versão FIXADA, como o ciclo fecha, formato de cena, export iOS, IAP/ads, licença, risco de conhecimento). Em "Alternativas", registre as duas opções mais próximas e quando reconsiderar. Em "Critérios de validação", inclua sempre: `./scripts/verify.sh` gera screenshot do simulador/navegador em < 3 min; build vazio instala no dispositivo de teste.

5. **Grave o nome canônico** e confira que o despachante o reconhece:

```bash
mkdir -p production && printf '%s\n' spritekit > production/engine.txt   # ou realitykit | unity | godot | phaser | pixijs | threejs | babylonjs | capacitor
bash .claude/skills/montar-loop-de-verificacao/scripts/verify.sh --dry-run
```

   Se o `--dry-run` disser que não há verificador para a engine, anote no ADR em "Riscos": a skill `engine-<x>` precisa trazer `scripts/verify.sh` antes da primeira feature.

6. **Peça aceitação explícita.** Mostre o resumo do ADR e pergunte "aceita?". Só então mude `Status` para `Aceito` e registre a data. Atualize a seção "Stack deste projeto" do `CLAUDE.md` do jogo e a linha em `progress.md` ("Decisões recentes").

7. **Aponte a próxima skill**: `/instalar-ferramentas` e depois `/montar-loop-de-verificacao`; a skill `engine-<x>` correspondente cria o esqueleto.

## Critério de pronto e evidência

- `docs/decisoes/ADR-0001-engine-e-alvo.md` com `Status: Aceito`, data, versão fixada e tabela de compatibilidade sem campos vazios.
- `production/engine.txt` com um dos nomes canônicos; `bash scripts/verify.sh --dry-run` (ou o do banco) identifica a engine e o verificador.
- `CLAUDE.md` (seção Stack) e `progress.md` atualizados.
- Nenhum código de gameplay escrito ainda.

## Armadilhas conhecidas

- **Unity em `-batchmode` não renderiza**: screenshots exigem o player construído ou o editor em play mode (procedimento "Run and Observe" do Game Studios). Cenas/prefabs YAML "são mais difíceis de manipular" que C#; use `Force Text` e mantenha cenas pequenas.
- **Unity AI** (Assistant/Generators) consome créditos que usuários relatam acabar em horas; preço de Personal reportado US$ 10/mês após trial de 14 dias [secundário]. O plug-in oficial é Unity Companion License; a Unity CLI avisa "keep your project under version control".
- **Godot**: export iOS exige macOS + Xcode; o simulador iOS só suporta o renderer Compatibility (Macs Apple silicon rodam o .ipa nativamente); C# em iOS é "experimental" e o Godot AI trata C# como texto. 1.265 correções entre 4.6 e 4.7: fixe a versão e dê ao agente a documentação dela. A Godot Foundation baniu contribuições por agente ao engine (30/06/2026) — vale para o repositório do Godot, não para o seu jogo.
- **SpriteKit/RealityKit**: cenas não expõem árvore de acessibilidade; o playtest por agente usa toques por coordenada + screenshot + canal de depuração. Xcode 27 exige Apple silicon e macOS Tahoe 26.6+. Sem as skills do GPTK, "the agent produced code that compiled but rendered incorrectly" em Metal 4.
- **Web → App Store**: a 4.7 permite mini-jogos HTML5, mas 4.2 (funcionalidade mínima) e 4.3(b) (genericidade) continuam valendo; IAP em web view precisa de ponte nativa para StoreKit [secundário, confirmar no plug-in escolhido]; o único caminho da Rosebud para iOS é web view via FlutterFlow.
- **Não existe benchmark** público comparando qualidade de código de LLM por engine; o argumento "C# tem mais dados de treino / cenas do Godot são texto" vem de um fornecedor de ferramentas para Godot. Decida pelo ciclo de verificação, não por esse argumento.
- **Manutenção importa mais que estrelas**: Coding-Solo/godot-mcp (5,9 mil estrelas) parado desde 16/04/2026 e sem screenshot; chongdashu/unreal-mcp parado desde abril/2025.

## Fontes

- Apple — Xcode 26 Release Notes (SceneKit deprecado): https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes · SpriteKit: https://developer.apple.com/documentation/spritekit
- Apple — Xcode 27 Release Notes (agentes no simulador, requisitos): https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes · Giving external agents access to Xcode: https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode
- Unity-Technologies/unity-agent-plugin (32 skills, Unity 6+, Unity Companion License): https://github.com/Unity-Technologies/unity-agent-plugin · apple/unityplugins: https://github.com/apple/unityplugins · Unity blog (09/09/2026): https://unity.com/blog/unity-plugin-for-claude-code
- hi-godot/godot-ai: https://github.com/hi-godot/godot-ai · godot-docs Exporting for iOS: https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_ios.rst · EditorExportPlatformIOS.xml: https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml · releases: https://github.com/godotengine/godot/releases
- WWDC26 sessão 357 (GPTK, Metal 4): https://developer.apple.com/videos/play/wwdc2026/357/ · apple/game-porting-toolkit: https://github.com/apple/game-porting-toolkit
- Medium (chierhu) — Unreal "worst fit", cenas/prefabs difíceis: https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992 · ziva.sh (argumento C#/texto; vendedor): https://ziva.sh/blogs/unity-vs-godot-2026-ai
- phaserjs/editor-mcp-server: https://github.com/phaserjs/editor-mcp-server · playcanvas/editor-mcp-server: https://github.com/playcanvas/editor-mcp-server · Rosebud (web view via FlutterFlow): https://lab.rosebud.ai/blog/publish-mobile-game-with-ai
- Decrypt — FPS de Shumer em Three.js (~5/10): https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design
- Apple — App Store Review Guidelines (4.2, 4.3(b), 4.7): https://developer.apple.com/app-store/review/guidelines/
- Donchitos/Claude-Code-Game-Studios — `run-and-observe.md` (Unity batchmode não renderiza; MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Relatório interno `reports/Criação de jogos totalmente por IA.md` ("Unity, Xcode 27 e Godot…", "Stack recomendado") e `research_notes/.../pipeline_ios_e_aspectos_legais.md` (Pergunta 2).
