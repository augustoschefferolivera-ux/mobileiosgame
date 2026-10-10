# Testes em Godot: GUT, gdUnit4 e `test_run` do Godot AI

## Qual usar

| Opção | Formato | Linha de comando headless | Observações |
|---|---|---|---|
| **GUT** (MIT) | `extends GutTest`, `test_*` | `godot --headless --path game -s addons/gut/gut_cmdln.gd -gdir=res://tests -gexit -gjunit_xml_file=res://../out/gut.xml` | Mais antigo e difundido; confirme flags no README do GUT para a versão instalada |
| **gdUnit4** (MIT) | `extends GdUnitTestSuite`, `test_*` | `godot --headless --path game -s res://addons/gdUnit4/bin/GdUnitCmdTool.gd --add res://tests --ignoreHeadlessMode` (há `runtest.sh` que embrulha isso) | Relatórios HTML/JUnit; confirme flags no README |
| **Godot AI `test_run`** | `extends McpTestSuite`, `suite_name()` | Só via MCP com editor aberto (`test_run suite=player`, `verbose=true`) | 300 s de orçamento por run; resultados em `godot://test/results`; ótimo no loop interativo, não substitui CI |

`verify.sh` detecta `addons/gut` ou `addons/gdUnit4` e roda o correspondente; `--tests none` pula.

## O que testar sem cena

- Regras de jogo em `RefCounted`/`Resource` puros (`scripts/core/*.gd`): pontuação, estado, geração de níveis, economia.
- Para nós: instancie a cena no teste, chame `_ready` indiretamente adicionando ao `add_child_autofree`, avance com `await get_tree().process_frame`.

## Screenshot do jogo rodando

### Com Godot AI (editor aberto)

```
editor_state                               -> readiness="ready"
project_run(mode="current", autosave=False)
poll editor_state até is_playing e game_capture_ready
editor_screenshot(source="game", max_resolution=1280)
logs_read(source="game")
project_manage(op="stop")
```

Pré-checagens quando `source="game"` dá timeout: autoload `_mcp_game_helper` presente em `project.godot` (reative o plug-in se faltou); jogo iniciado por `project_run` (F5 não vale); sessão correta em multi-editor; o jogo não travou no boot (`logs_read`).

### Sem editor (CI/`verify.sh`)

`scripts/screenshot_probe.gd` é um `SceneTree` que carrega a cena principal, espera N frames e salva `get_root().get_texture().get_image().save_png(path)`. Precisa de janela: em macOS roda direto; em Linux use `xvfb-run -a godot --path game -s …`. `--headless` não produz imagem.

## Lendo o resultado

- GUT/gdUnit4: código de saída ≠ 0 quando há falha; JUnit XML para o CI.
- `godot-run.log`: `ERROR:`/`SCRIPT ERROR:` reprovam a verificação mesmo com screenshot bonito.
- `debug_state.json` (autoload `DebugChannel`): compare `scene`, `score`, `fps` com o esperado da feature.

Fontes: TOOLS.md e docs/screenshot-testing.md / docs/testing.md do hi-godot/godot-ai (https://github.com/hi-godot/godot-ai); GUT e gdUnit4 (READMEs não lidos nesta pesquisa — confirme flags).
