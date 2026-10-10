---
name: blender-automatizado
description: >
  Opera o Blender por agente: instala e usa o Blender MCP (mcp-for-blender) para limpar,
  retopologizar, fazer UV, bake e exportar GLB/FBX de assets gerados por IA, inspecionar
  cenas (look, get_scene_info) e importar assets CC0 (Poly Haven) ou gerar via Tripo/Rodin;
  inclui script headless `blender -b --python` para lotes de limpeza/LOD/bake (o render de
  sprites em lote é de /sprites-pre-renderizados-de-3d). Use sempre que uma tarefa 3D
  precisar de Blender, mesmo que o usuário só diga "limpa essa malha", "junta num atlas",
  "exporta FBX" ou "monta a cena". Não use para decidir LODs/KTX2 (/otimizar-3d-para-mobile,
  que chama esta skill para retopo e bake) nem para escolher o gerador (/gerar-ativos-3d).
license: MIT
compatibility: "Blender ≥3.0 (recomendado 4.2/4.5 LTS; 5.0 já lançado — IDs do EEVEE mudam); Python ≥3.10; uv; Claude Code ou Codex. Socket local sem autenticação: só loopback/VM"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [0, 6]
argument-hint: "[limpar|retopo|bake|exportar|cena] [arquivo.glb] [--headless]"
disable-model-invocation: false
user-invocable: true
---

# Blender automatizado

Entrega a operação pedida no Blender (malha limpa, bake, exportação, cena montada) com
verificação visual (`look`) e `relatorio.json`/screenshots em `production/evidencias/`.

## Quando usar / quando não usar

- Use para: merge by distance, remesh/QuadriFlow, UV pack, bake PBR high→low, aplicar
  transforms, renomear, exportar GLB/FBX com flags corretas, montar cenas com Poly Haven,
  inspecionar rig/pesos, retarget offline, lotes headless, preparar um modelo para pré-render
  (origem nos pés, frente -Y, decimate, apagar luzes importadas).
- Não use para: gerar malha do zero (o MCP "não gera malhas com IA sozinho": chama
  Tripo/Rodin/Hunyuan3D); otimização final para o engine (`/otimizar-3d-para-mobile`);
  texturização por IA (`/materiais-e-texturas-pbr`).

## Pré-requisitos

```bash
# 1) uv (instalador oficial; NÃO `pip install uv`)
curl -LsSf https://astral.sh/uv/install.sh | sh          # macOS: brew install uv
# 2) servidor MCP no Claude Code (config do usuário; não altera .mcp.json do repositório)
claude mcp add blender uvx mcp-for-blender                  # Codex: codex mcp add blender -- uvx mcp-for-blender
# 3) add-on no Blender
uvx mcp-for-blender install-addon                          # ou: uvx mcp-for-blender setup (faz 2 e 3)
# Blender: Edit → Preferences → Add-ons → "Interface: MCP for Blender"; viewport N → aba MCP for Blender → Start MCP Server
```

- `/instalar-ferramentas` cobre uv, Blender MCP e as CLIs; use-a se algo acima falhar.
- Pacote PyPI `mcp-for-blender` (ex-`blender-mcp`, que ainda funciona); **MIT**; 30,4k★.
  Porta padrão `9876` (`BLENDER_HOST`/`BLENDER_PORT` ou `uvx mcp-for-blender --port 9877`).
- **Uma instância** do servidor por vez. GUI não herda PATH: se `spawn uvx ENOENT`, use o
  caminho completo de `uvx`. Fixe Python: `"args": ["--python", "3.11", "mcp-for-blender"]`.
- Opcional: `uvx mcp-for-blender@latest update`; `DISABLE_TELEMETRY=true`;
  `BLENDER_MCP_SAFE_MODE=1` (bloqueia arquivo/rede/processos nos scripts).
- Headless: `blender -b --python scripts/bpy_cleanup_template.py -- --help`.
- `tripo-mcp` (oficial da Tripo, **alpha**, MIT): exige o add-on Tripo AI para Blender com
  seu servidor MCP ligado; use só se já tiver conta Tripo paga.

## Segurança (leia antes de ligar)

- `execute_blender_code` roda **Python arbitrário** dentro do Blender por um **socket TCP sem
  autenticação nem criptografia** (README). Quem alcança a porta controla sua máquina.
- Regras: só `localhost`; nunca aponte `BLENDER_HOST` para IP remoto (use túnel SSH); para
  prompts ou assets **não confiáveis** (downloads, GLB de terceiros, `.blend` baixado) rode em
  **VM/container isolado** sem segredos; ligue `BLENDER_MCP_SAFE_MODE=1`; **salve antes** de
  cada execução (aviso do README: "ALWAYS save your work before using it").
- Telemetria anônima ligada por padrão (conteúdo só com opt-in); desligue com
  `DISABLE_TELEMETRY=true` se a política do projeto exigir.
- Firewall local: bloqueie a porta 9876 para fora do loopback.

## Entradas

- Arquivo(s) GLB/FBX/OBJ + spec do asset (orçamento, nome kebab-case, alvo).
- Operação pedida e parâmetros (razões de LOD, tamanho do bake, remesh).
- Blender aberto com o add-on ligado (modo MCP) **ou** `blender` no PATH (modo headless).

## Ferramentas do MCP (9)

| Ferramenta | Para que |
|---|---|
| `execute_blender_code` | roda `bpy` (receitas em `references/receitas-bpy.md`) |
| `look` | vê o resultado: `viewport`, `camera`, `angles` (folha multi-vista), `frames` (animação); modos `solid`, `material`, `rendered`, `wireframe`, `xray` |
| `get_scene_info` | resumo por objeto (posição, materiais, topologia, pesos); `root`/`query` para detalhar |
| `generate_3d` | gera e importa via **Tripo, Hunyuan3D ou Hyper3D Rodin** ("Premium generators are preferred automatically" — **defina o gerador explicitamente**; Hunyuan3D tem licença territorial) |
| `search_assets` / `import_asset` | **Poly Haven** (CC0, sem chave; HDRIs/texturas/modelos), **Sketchfab** (chave), **Poly Pizza** (chave grátis; ~69 % CC-BY — crédito em `polypizza_attribution`) |
| `get_addon_status` | versão do Blender/add-on, bibliotecas e geradores ligados |
| `disable_telemetry`, `record_trajectory_feedback` | controle de dados |

## Passos

1. **Preparar**: `get_addon_status` (versão do Blender registrada no `PROVENANCE.md`); salve o
   `.blend`; `get_scene_info` para o estado inicial. Em lote, prefira o modo headless.
2. **Importar**: `bpy.ops.import_scene.gltf(filepath=...)` (ou FBX/OBJ); `look` em `angles`
   + `wireframe` para ver densidade; `get_scene_info` com topologia para contar tris.
3. **Limpar** (receitas): aplicar transforms → merge by distance (0,0001 m) → apagar soltos →
   normais consistentes → (remesh voxel/QuadriFlow se for rigar ou se tris > 3× orçamento) →
   Smart UV Project / `pack_islands` (margem 0,02) → renomear objetos/materiais em kebab-case.
   Confira cada etapa com `look`; registre tris antes/depois.
4. **Bake high→low** (quando houve remesh ou para unificar materiais num atlas): Cycles,
   `use_selected_to_active`, `cage_extrusion` ~0,02, margem 8 px; passes DIFFUSE (COLOR),
   NORMAL (tangente), ROUGHNESS; imagens 2048² (prop 1024²); salvar PNG; religar no
   Principled BSDF. Veja o albedo isolado (`look` em `material`) para checar costuras.
5. **LODs** (opcional aqui; o padrão é `/otimizar-3d-para-mobile`): Decimate Collapse em
   0,5/0,25/0,1 em duplicatas nomeadas `<asset>-lod1..3`.
6. **Exportar** com flags corretas: GLB `export_format='GLB', use_selection=True,
   export_apply=True, export_yup=True, export_materials='EXPORT'`; FBX `apply_unit_scale=True,
   apply_scale_options='FBX_SCALE_ALL', add_leaf_bones=False, use_armature_deform_only=True,
   path_mode='COPY', embed_textures=True`. Nomes `assets/3d/.../<asset>-lod0.glb`.
7. **Headless em lote**:
   ```bash
   blender -b --python .claude/skills/blender-automatizado/scripts/bpy_cleanup_template.py -- \
     --input assets/3d/src/<asset>/<asset>-raw.glb --outdir assets/3d/clean/<asset> \
     --merge-distance 0.0001 --remesh quadriflow --target-faces 8000 --uv smart \
     --bake all --bake-size 2048 --decimate 0.5,0.25,0.1 --export glb,fbx --save-blend
   ```
   Gera `<asset>-lod0..3.glb/.fbx`, PNGs assados e `<asset>-relatorio.json` (tris antes/depois,
   LODs, texturas, avisos). `--help` funciona sem Blender. **O template não foi executado no
   ambiente em que foi escrito (sem Blender)**: valide numa malha pequena antes do lote.
8. **Evidência**: `look` final em `angles`/`wireframe` salvo como imagem, `relatorio.json`,
   lista de arquivos exportados → `production/evidencias/<data>-<asset>-blender/`.

## Critério de pronto e evidência

- Arquivo(s) exportado(s) no caminho combinado, abrindo sem erro no engine/viewer.
- `relatorio.json` (headless) ou log das chamadas MCP com tris antes/depois, remesh, UV,
  bake, nomes; imagens do `look` (sombreado, wireframe, albedo isolado).
- Versão do Blender e do add-on no `PROVENANCE.md`; `.blend` fonte salvo.
- "Exportou" não é "pronto no jogo": a importação e o screenshot no simulador ficam com a
  skill de otimização/engine.

## Armadilhas conhecidas

- **Segurança**: socket sem auth (acima). UE 5.8 e outros MCPs de engine têm o mesmo padrão.
- **Licença dos geradores** do `generate_3d`: Hunyuan3D exclui UE/UK/Coreia e proíbe saídas
  fora do Território; Rodin tem termos não lidos; "Premium" escolhe gerador automaticamente —
  **nomeie o gerador** e registre no `PROVENANCE.md`.
- **Poly Haven** baixa na thread principal (Blender congela; peça 1k/2k). **Poly Pizza** bloqueia
  IPs de datacenter/VPN; ~69 % é CC-BY (crédito obrigatório no jogo).
- **Timeouts**: quebre operações longas (bake, remesh denso) em passos; no MCP, prefira o modo
  headless para lotes.
- **Versões fixas de `bpy` em pesquisas**: Puppeteer exige `bpy==4.2.0`; Material Anything mira
  Blender 3.2.2; UniRig usa VRM-Addon modificado. Isole em ambientes separados.
- **Rig**: `transform_apply`/`join` em malha com Armature modifier quebram pesos — o template
  pula e avisa; aplique transforms antes de rigar.
- **Remesh destrói UVs**: sempre `--uv smart` + `--bake`; sem bake, a malha fica sem textura.
- **QuadriFlow** falha em malhas não-manifold muito sujas: rode voxel remesh antes ou use
  Instant Meshes/Quad Remesher (`/otimizar-3d-para-mobile`).
- **Docs do Blender** (docs.blender.org) não puderam ser lidas na pesquisa; nomes de operadores
  vieram da API conhecida — se um operador mudar de nome na sua versão, `bpy.ops.<mod>.<op>`
  avisa; consulte `--help` do Blender e o Python Console. Os nomes usados por
  `render_sprites.py` (skill de sprites) foram conferidos no código-fonte `rna_*.cc` em
  10/10/2026. **IDs de engine**: `BLENDER_EEVEE_NEXT` (4.2–4.5) virou `BLENDER_EEVEE` no 5.0
  (`DNA_scene_types.h`); `BLENDER_WORKBENCH` e `CYCLES` não mudaram; ações ganharam slots no
  4.4 (`animation_data.action_slot`).

## Exportar para web

GLB (Y para cima, transforms aplicados, materiais `EXPORT`, imagens PNG/JPEG embutidas —
esta é a **fonte** guardada no repositório), nomes kebab-case `<asset>-lodN`, texturas assadas
≤2048² (prop 1024²), um material por asset. A compressão KTX2 + meshopt e os LODs finais para
Three.js ficam em `/otimizar-3d-para-mobile --target web` (o Blender não lê KTX2: nunca
reimporte o GLB otimizado). FBX só para Mixamo/ferramentas que o exigem; USDZ só com ADR
nativo. **Licença de saída**: o Blender (GPL) e o MCP (MIT) não impõem termos sobre seus
arquivos; a licença do asset segue a origem (gerador, Poly Haven CC0, Poly Pizza CC-BY,
Sketchfab conforme o modelo) registrada no `PROVENANCE.md`.

## Pré-render para Phaser

Esta skill prepara o modelo; o render em lote é de `/sprites-pre-renderizados-de-3d`
(`.claude/skills/sprites-pre-renderizados-de-3d/scripts/render_sprites.py`, headless, com
`manifest.json`). Receita de preparo via MCP ou
`bpy`: `transform_apply` → mover para `min z = 0` (origem nos pés) → confirmar frente em -Y
(`look` em `camera` de frente) → apagar luzes/câmeras importadas → `--decimate 0.5` se a malha
passar de ~100 K tris (só velocidade de render) → salvar `.blend` com as actions renomeadas
(`idle`, `walk`…) quando os clipes vierem de FBX separados (Mixamo). O `look` em `angles` é o
teste rápido de simetria e de luz assada no albedo antes de gastar render em 8 direções.

## Fontes

- README do MCP (lido): https://github.com/ahujasid/mcp-for-blender ; PyPI: https://pypi.org/project/mcp-for-blender/
- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ6, KQ4).
- Relatório: `reports/Criação de jogos totalmente por IA.md` (fluxo agêntico; checklist "Segurança de pontes MCP").
- tripo-mcp: https://github.com/VAST-AI-Research/tripo-mcp
- Avaliações de uso (secundárias): https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/blender-mcp ; https://www.strayspark.studio/blog/blender-mcp-natural-language-3d-modeling
- Poly Haven API ToS: https://github.com/Poly-Haven/Public-API/blob/master/ToS.md ; Poly Pizza chave: https://poly.pizza/settings/api
- Pinos de versão: Puppeteer https://github.com/Seed3D/Puppeteer ; Material Anything https://github.com/3DTopia/MaterialAnything ; UniRig https://github.com/VAST-AI-Research/UniRig
- Hunyuan3D LICENSE: https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE
- Instant Meshes: https://github.com/wjakob/instant-meshes
- Blender (código-fonte, IDs de engine e propriedades lidos 10/10/2026): https://github.com/blender/blender (`source/blender/makesdna/DNA_scene_types.h`, `makesrna/intern/rna_scene.cc`; branches 4.2/4.5/5.0/main)
