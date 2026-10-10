# Skills do plug-in oficial da Unity por fase do roteiro

Nomes conferidos no diretório `skills/` do repositório `Unity-Technologies/unity-agent-plugin` em 10/10/2026 (32 skills, v0.1.8-beta). Invoque como `/unity:<nome>` ou descreva a tarefa — o agente escolhe pela `description`. O conteúdo das skills é da Unity (Unity Companion License); aqui só o mapa de uso.

| Fase | Skill | Quando invocar |
|---|---|---|
| 2 Esqueleto | `new-unity-project` | Criar o projeto: coleta conceito, plataformas, monetização; configura VCS e pacotes |
| 2 | `unity-cli` | Instalar/gerenciar Editores e licenças, abrir projeto, dirigir o Editor aberto (`unity command …`), builds e testes, configurar o MCP da Unity |
| 2 | `unity-package-management` | Instalar/atualizar pacotes UPM fora do Editor (CI/headless); a CLI não gerencia pacotes |
| 2 | `ui` → `ui-uitk` / `ui-ugui` | Qualquer menu/HUD/painel; `ui` roteia para UI Toolkit (UXML/USS) ou uGUI (Canvas). Consulte antes de escrever UI |
| 3 Verificação | `unity-cli` | Loop Play → confirmar que o jogo avança → capturar → ler console (referência `playmode-verification-loop.md` dentro da skill) |
| 4 Direção de arte | `2d-pixel-perfect` | Pixel art borrada/tremendo: `PixelPerfectCamera` em URP/Built-in. Não para HD 2D |
| 4 | `urp-postprocessing` | Bloom, tonemapping, vinheta, DoF via Volume |
| 4 | `audio-setup-mixers` | Rotear Audio Sources em grupos do Audio Mixer |
| 5 Features | `create-2d-physics` | Qualquer física 2D (2D Physics Core ou Rigidbody 2D legado) |
| 5 | `physics-3d-collision` | `OnCollisionEnter`/`OnTriggerEnter` não dispara, objetos atravessam, raycast falha |
| 5 | `create-tile-palette-or-rule-tiles` | Tile palettes e Rule Tiles (autotiling) |
| 5 | `sprite-editor` | Fatiar sprite sheets, bordas, pivôs por script |
| 5 | `initialize-ai-navigation` | NavMesh, agentes, obstáculos, patrulha |
| 5 | `shader-graph-create-custom-node` | Nó custom em Shader Graph a partir de HLSL |
| 5 | `localization` | Locales, String/Asset Tables, fontes CJK |
| 5 | `setup-multiplayer-services` | Matchmaking, lobbies, sessões (não backend) |
| 5 | `setup-vivox-voice-chat` | Voz/texto in-game |
| 5/10 | `build-live-game` | Contas, cloud save, leaderboards, conquistas, economia, remote config, cloud code |
| 6 Assets | `manage-sprite-atlas` | Criar/otimizar SpriteAtlas (master/variant, overrides por plataforma) |
| 6 | `sprite-segment-3x3grid` | Analisar estrutura/cores de um sprite (documentação de assets) |
| 6 | `asset-transformer-toolkit` | Importar modelos/nuvens de pontos com Asset Transformer (ex-Pixyz), LODs |
| 6/8 | `optimize-audio` | Load Types, sample rate, codec, forçar mono em 3D |
| 6/8 | `optimize-text-mesh-pro` | Fontes TMP, fallbacks, SDF, CJK |
| 8 Polimento | `validate-urp-render-graph-renderer-feature` | Revisar `ScriptableRendererFeature` com Render Graph |
| 8 | `migrate-birp-to-urp` | Projeto herdado em Built-in → URP |
| 10 Monetização | `implement-in-app-purchases` | Unity IAP, assinaturas, validação de recibo (ou use StoreKit 2 da Apple — não ambos) |
| 10 | `levelplay-unity-integration` | Anúncios rewarded/interstitial/banner via LevelPlay; falhas de dependência iOS |
| — | `optimize-web` | Só builds WebGL/WebGPU (não iOS) |
| — | `build-gtk`, `ui-imgui`, `generate-editor-search-query` | Ferramentas de Editor; raramente em jogo mobile |

## Como combinar com o restante do banco

- Assets gerados por IA (sprites, áudio, 3D) vêm das skills de arte/áudio deste repositório; a Unity só importa e otimiza (`manage-sprite-atlas`, `optimize-audio`).
- Verificação de execução no iOS: `scripts/verify.sh` desta skill + `/playtest-automatizado`.
- Submissão: `/ci-xcode-cloud-fastlane` (o projeto Xcode gerado em `production/build/ios-xcode/` é a entrada).

## Alternativa MIT: MCP for Unity (CoplayDev)

Útil quando o Editor está aberto e você quer que o agente crie GameObjects, rode testes (`run tests`), valide scripts com Roslyn e tire o projeto do estado quebrado. Ative só os grupos de ferramentas necessários (vfx/animation/ui/testing) para não inflar o contexto. Fonte: https://github.com/CoplayDev/unity-mcp
