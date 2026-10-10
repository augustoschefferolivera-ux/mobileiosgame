# Pipeline Blender: do modelo gerado por IA ao atlas do Phaser

Complemento de `SKILL.md`. Tudo aqui foi conferido em código-fonte (Blender, glTF-Blender-IO,
Phaser, three.js) ou nas notas de pesquisa do repositório em 10/10/2026; o que veio de snippet
de busca está marcado [secundário]. **Nenhum render foi executado no ambiente em que isto foi
escrito (sem Blender)** — valide num modelo pequeno antes do lote.

## 1. A cadeia e as licenças

```
modelo 3D ──► rig + clipes ──► Blender headless ──► PNGs + manifest ──► atlas JSON hash ──► Phaser
(Tripo/Meshy pago, TRELLIS.2 MIT, TripoSG MIT, CC0: Kenney/Quaternius/Poly Haven)
             (auto-rig Tripo/Meshy; UniRig MIT; Mixamo grátis c/ Adobe ID; Quaternius CC0; Rokoko Create)
                            (render_sprites.py: Workbench/EEVEE/Cycles, GPL — não licencia a saída)
                                                 (montar_atlas_phaser.py: Pillow)
```

| Elo | Opções | Licença da saída | Observação |
|---|---|---|---|
| Modelo | **Tripo 3.0 / Meshy 7** (planos pagos) | comercial no plano pago; Meshy grátis = CC BY 4.0; Tripo grátis = não comercial | ambos têm auto-rig + animações prontas, o que encurta a cadeia (`/gerar-ativos-3d`) |
| Modelo | **TRELLIS.2-4B** (MIT, ≥24 GB VRAM) · **TripoSG** (MIT, ≥8 GB, sem textura) | sua | TRELLIS.2 exporta 1 M faces e GLB opaco por padrão — decime antes de renderizar (velocidade, não qualidade) |
| Modelo | **Kenney**, **Quaternius** (CC0 [secundário, confirmar nas páginas]) · **Poly Haven** (CC0, ToS da API lido) | CC0 | base low-poly já com rig/animação em vários packs do Quaternius; ótimo para prototipar o pipeline antes de pagar gerador |
| Rig | auto-rig **Tripo Studio** (bípedes e multi-pernas, fornecedor) / **Meshy** · **UniRig → SkinTokens** (MIT) · **Mixamo** | plano pago / MIT / Adobe: royalty-free inclusive em jogos [secundário, FAQ oficial via busca] | Mixamo só humanoide, "maintenance mode" [secundário]; arquive os FBX |
| Clipes | Mixamo · **Quaternius Universal Animation Library** (CC0) · Rokoko Create (vídeo→FBX) · auto-animação Tripo/Meshy | idem | `/rigging-e-animacao-3d` detalha |
| Render | Blender 4.2 LTS / 4.5 LTS / 5.0 | GPL não alcança seus renders | `/blender-automatizado` para limpeza prévia |
| Lista vermelha | Hunyuan3D / HY-World (saídas proibidas fora do Território: UE/UK/Coreia), Roblox Cube (research-only) | — | vale também para sprites renderizados a partir deles: a restrição é sobre a **saída** |

## 2. O que o pré-render perdoa — e o que não perdoa

- **Topologia** importa muito menos do que no 3D em tempo real: não há orçamento de triângulos
  no Phaser; o que o jogador vê é **silhueta + textura + sombreado**. Malhas densas de gerador
  só custam tempo de render (decime para ~50–100 K tris com `/otimizar-3d-para-mobile` ou
  `--decimate` do `bpy_cleanup_template.py` para acelerar).
- Topologia **ainda importa para deformação**: rig em malha suja gera "candy wrapper" e
  intersecções que aparecem em todo frame. Retopo/remesh antes de rigar continua valendo.
- **Textura com luz assada** (erro comum dos geradores: sombras pintadas no albedo) fica
  evidente ao girar 8 direções — a sombra pintada não gira. Saídas: toon/flat shading
  (`--toon`, `--engine workbench`), reduzir contraste do albedo ou re-texturizar
  (`/materiais-e-texturas-pbr`).
- **PBR vs toon**: PBR do gerador em EEVEE dá look "render de 2005" se iluminado de qualquer
  jeito; com 1 sol + ambiente baixo e `view_transform = Standard` fica aceitável. Toon
  (Shader to RGB + Color Ramp) esconde ruído de malha e textura e combina com UI 2D.
- **AgX/Filmic** (padrão do Blender) comprime cores e dessatura: o script força `Standard`
  para o render bater com a paleta do style card.
- **Simetria**: geradores produzem assimetrias sutis; em 8 direções elas viram "o braço
  esquerdo é maior". Olhe o `preview` lado a lado (d2 vs d6).

## 3. Preparar o modelo (antes de renderizar)

1. **Escala e origem**: metros, pés em Z = 0, origem em (0,0,0). No Blender (ou via
   `/blender-automatizado`): `transform_apply`, mover para que `min z = 0`. O script usa a origem
   como pivot (`--pivo origem`); se o modelo veio deslocado, o sprite "flutua".
2. **Frente**: glTF +Z → Blender -Y (importador oficial). Teste: `--direcoes 1 --frames 1`;
   se o personagem renderizar de costas, use `--frente +y`.
3. **Luzes/câmeras do arquivo**: o script cria as suas; luzes importadas do GLB/FBX somam luz
   extra — apague-as (`bpy.data.objects.remove`) ou use um `.blend` limpo.
4. **Materiais**: `blend_method`/`surface_render_method` para cabelo/folhas com alfa
   (EEVEE: `DITHERED` ou `BLENDED`); `use_backface_culling` se houver faces internas.
5. **Decimar** (opcional, só velocidade): 1 M faces × 256 frames é lento no EEVEE.

## 4. Rig e clipes

- **GLB com animações** (Tripo/Meshy/Quaternius): o importador glTF do Blender cria uma
  **NLA track por animação, com o nome da animação do glTF, muda** (`animation_utils.py`,
  `simulate_stash`), e as actions com slots no 4.4+. `render_sprites.py --lista` mostra os
  nomes; `--acoes idle,walk` casa por igualdade ou substring sem maiúsculas.
- **Mixamo**: baixe FBX "with skin" para o primeiro clipe e "without skin" para os demais;
  importe o primeiro, depois cada clipe e renomeie a action (`Armature|mixamo.com|Layer0`)
  para `walk`, `idle`…; salve um `.blend` e rode `blender -b heroi.blend --python
  render_sprites.py -- --acoes all`. O script lê actions por nome quando não há NLA tracks.
  Opções de export do Mixamo (fps, "In Place") [confirmar na interface atual].
- **Clipes curtos e com loop**: `walk` 0,6–1,0 s, `idle` 1–2 s, `attack` 0,4–0,8 s. O script
  amostra `--frames` pontos uniformes no intervalo; para loops exclui o último (igual ao
  primeiro); `--incluir-ultimo` para ações que terminam numa pose.
- **Mesmo esqueleto para a família** (regra de `/rigging-e-animacao-3d`): os clipes se
  reaproveitam entre personagens e os sprites ganham ritmo consistente.

## 5. Qual engine de render

| Engine (`--engine`) | ID interno | Velocidade | Look | Quando |
|---|---|---|---|---|
| `workbench` | `BLENDER_WORKBENCH` | muito rápida | flat/studio, sem materiais complexos, outline nativo (`show_object_outline`), sem sombras suaves | pixel art, protótipo, props, toon simples |
| `eevee` (padrão) | `BLENDER_EEVEE_NEXT` (4.2–4.5) · `BLENDER_EEVEE` (5.0+) | rápida com GPU | materiais PBR, sombras, Shader to RGB (toon por nós), Freestyle | personagens HD, 2.5D |
| `cycles` | `CYCLES` | lenta | path tracing | só look pictórico; raramente vale |

O script detecta a versão (`bpy.app.version`) e escolhe o ID do EEVEE; `BLENDER_EEVEE_NEXT`
existe "only for versioning" no 5.x (`DNA_scene_types.h`). Blender ≤ 4.1 usa `BLENDER_EEVEE`
legado (sem `use_raytracing`; o script testa `hasattr`).

## 6. Toon e contorno

- **Workbench**: `--toon` = `shading.light = 'FLAT'` + `color_type = 'TEXTURE'` + outline preto;
  `--sem-aa` = `display.render_aa = 'OFF'`. Resultado: cores chapadas da textura com linha fina.
- **EEVEE** `--toon`: em cada material o script liga `Diffuse BSDF (branco) → Shader to RGB →
  Color Ramp (CONSTANT, N degraus) → Vector Math MULTIPLY × Base Color → Emission → Output`.
  Mantém a textura, quantiza a luz. Shader to RGB **só existe no EEVEE**. Em materiais com
  nós exóticos (mix de shaders) o script pega o nó ligado ao Surface; confira o `preview`.
- **Contorno** `--contorno 2`: Freestyle (`use_freestyle`, `line_thickness_mode = 'ABSOLUTE'`,
  lineset com silhouette/border/crease). Freestyle é um passe extra e lento em malhas densas;
  para pixel art prefira o outline do Workbench ou um contorno 1 px no pós (Aseprite).
- Validar no Blender real: nomes dos sockets (`"Shader"`, `"Fac"`, `"Color"`, `"Emission"`),
  `linesets.new()` criando `linestyle`, e `ShaderNodeValToRGB.color_ramp.elements.new()`.

## 7. Iluminação fixa

- `--luz-fixa camera` (padrão): a luz é filha do rig e gira com a câmera → **cada direção tem o
  mesmo sombreado** (alto-esquerda). É a convenção de Diablo II/AoE2/Fallout [background] e
  a que não denuncia "sprite girado".
- `--luz-fixa mundo`: luz presa ao mundo → a face voltada para o sol muda por direção;
  coerente com um cenário que tem sol fixo, mas exige que props/tiles sigam o mesmo sol.
- `--ambiente 0.3` (Background do mundo, branco) tira o preto das sombras; `--sem-sombra`
  para pixel art ou quando a sombra será uma elipse no jogo.

## 8. Rodar em lote

```bash
S=.claude/skills/sprites-pre-renderizados-de-3d/scripts
blender -b --python $S/render_sprites.py -- --input assets/3d/rig/heroi/heroi-rig.glb --lista
blender -b --python $S/render_sprites.py -- --input assets/3d/rig/heroi/heroi-rig.glb \
   --acoes idle,walk --direcoes 8 --frames 8 --tamanho 256 --saida assets/_render/ \
   --elevacao 45 --luz-azimute -35 --toon --contorno 1.5 --dry-run        # só manifest, 0 renders
blender -b --python $S/render_sprites.py -- --input ... --acoes idle --direcoes 1 --frames 1 --saida /tmp/teste  # 1 frame
blender -b --python $S/render_sprites.py -- --input ... --acoes idle,walk,attack --direcoes 8 --frames 8 --saida assets/_render/
```

- **Estação GPU** (`/estacao-gpu-remota`): `gpu.sh push` do GLB e do script, `gpu.sh run
  '"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b --python C:\gpu-work\render_sprites.py -- ...'`
  [confirmar caminho do executável na estação], `gpu.sh pull` da pasta de saída. No Arch:
  `sudo pacman -S blender` (versão do repositório [confirmar]; para fixar 4.2/4.5 LTS use o
  tarball oficial em blender.org/download/lts/).
- Tempo: sem medição neste repositório. Ordem de grandeza esperada (inferência): Workbench
  bem abaixo de 1 s/frame; EEVEE com GPU ~1 s/frame a 256 px; 3 ações × 8 dir × 8 fr = 192
  frames → minutos. Meça e anote no `relatorio`/`PROVENANCE.md`.
- Saída: `assets/_render/<nome>/<nome>_<acao>_d<d>_f<ff>.png` + `manifest.json` (pivot, ppm,
  duração de cada ação, versão do Blender, args). **Não** commite a pasta `_render` inteira se
  for grande; commite o atlas e guarde o `.blend`/GLB + manifest.

## 9. Pós-processamento e atlas

```bash
python3 $S/montar_atlas_phaser.py assets/_render/heroi --manifest assets/_render/heroi/manifest.json \
   --saida public/assets/atlas/heroi --max 2048 --padding 2 --extrude 1 --bleed \
   --preview production/evidencias/<data>-heroi-sprites/atlas-preview.png
```

- **Trim** (padrão): recorta a célula ao bbox do alfa e grava `trimmed`, `sourceSize`,
  `spriteSourceSize` — o Phaser recompõe a posição original (`Frame.setTrim`), então o
  pivot permanece válido.
- **Padding 2 + extrude 1**: evita sangramento entre frames com filtro linear/mipmaps
  (extrude replica a borda; o `frame` no JSON exclui a borda replicada).
- **Alpha bleed** (`--bleed`): pinta o RGB dos pixels transparentes com a média dos vizinhos
  opacos. Halo escuro aparece quando o renderer interpola entre a borda e pixels
  transparentes pretos; o Phaser usa alfa pré-multiplicado por padrão, mas com texturas
  redimensionadas (DPR, `Scale.FIT`) o halo ainda surge em fundos claros.
- **Multi-atlas**: acima de `--max`, o script grava `<nome>-0.png`, `-1.png`… e um JSON com
  `textures: [...]` que `this.load.multiatlas(key, json, pasta)` lê (`MultiAtlasFile` e
  `JSONArray` parser).
- **Pixel art**: `--pixelizar 4 --paleta 32 --paleta-de design/style-card-paleta.png` (NEAREST,
  alfa binário). Ou `--escala 0.5` para gerar @1x a partir de um render @2x.
- **Texturas comprimidas no Phaser**: o `CompressedTextureFile` do Phaser 4 lê contêineres
  **PVR e KTX (v1)** com ASTC/PVRTC/ETC/S3TC via `this.load.texture({ ASTC: {type:'KTX'|'PVR',
  textureURL, atlasURL}, IMG: {...} })`; o JSDoc avisa que texturas comprimidas "will appear
  darker" (sRGB) e manda clarear antes de comprimir. Encoder: `astcenc` (ARM). Não é KTX2/Basis
  (isso é three.js). Ganho: 4 bytes/px → 1 byte/px (ASTC 4×4). [validar o fluxo no Phaser 4.2
  com um atlas real; aqui só o código-fonte foi lido].

## 10. Integrar no Phaser

```ts
// preload
this.load.atlas('heroi', 'assets/atlas/heroi.png', 'assets/atlas/heroi.json');   // ou multiatlas
this.load.json('heroi-anims', 'assets/atlas/heroi.anims.json');
// create
const { anims } = this.cache.json.get('heroi-anims') as { anims: Array<{ key: string; prefix: string; start: number; end: number; zeroPad: number; frameRate: number; repeat: number }> };
for (const a of anims) {
  this.anims.create({ key: a.key, frameRate: a.frameRate, repeat: a.repeat,
    frames: this.anims.generateFrameNames('heroi', { prefix: a.prefix, start: a.start, end: a.end, zeroPad: a.zeroPad }) });
}
const heroi = this.add.sprite(195, 500, 'heroi', 'heroi_idle_d0_f00'); // origem vem do pivot do frame
heroi.play('idle-d0');
// update: heroi.play(`walk-d${direcao8(vx, vy)}`, true); heroi.setDepth(heroi.y);
```

`generateFrameNames` aceita `prefix/start/end/zeroPad` (fonte: `AnimationManager.js`). O
parser `JSONHash` lê `pivot`/`anchor` e marca `customPivot`; `setOriginFromFrame` usa esse pivot
como origem.

## 11. Add-ons de GUI (alternativa ao script, não testados aqui)

| Projeto | Licença | O que faz | Estado |
|---|---|---|---|
| `Mattline1/SpriteAtlasAddon` | MIT | renderiza ações de N ângulos direto numa sprite sheet; exporta JSON/XML; "a prime example would be factorio" | push em abr/2026 |
| `RubielGames/BlenderSpriteGenerator` | MIT | painel "Sprite Renderer": N ângulos, 2D/2.5D, orto/perspectiva, animação por frame step | testado em Blender 3.4–4.0 (README); último push nov/2023 |
| `chronicleroflegends/DirectionalSpriteBatchRender` | GPL-3.0 | lote por animação × direção para GZDoom; rig de câmera com alvo | 2021 |

Úteis para um artista humano ajustar à mão; para o agente, o script headless é reproduzível e
registra `manifest.json`.

## 12. O que validar no Blender real (lista para a primeira execução)

`bpy.ops.import_scene.gltf/fbx`, `bpy.ops.wm.obj_import`, `Camera.type/ortho_scale/clip_*`,
`Light.use_shadow`, `World.node_tree.nodes["Background"]`, `RenderSettings.film_transparent/
filter_size/engine/use_freestyle/line_thickness(_mode)`, `ImageFormatSettings.file_format/
color_mode/color_depth/compression`, `SceneDisplay.render_aa`, `View3DShading.light/color_type/
show_object_outline/object_outline_color/show_shadows/show_cavity`, `SceneEEVEE.taa_render_samples/
use_raytracing`, `ColorManagedViewSettings.view_transform/look`, `FreestyleSettings.linesets.new`,
`NlaTrack.mute`, `NlaStrip.frame_start/frame_end`, `Action.frame_range/slots`,
`AnimData.action/action_slot`, `Scene.frame_set(frame, subframe=)`, `Object.evaluated_get`,
`bpy.ops.render.render(write_still=True)`. Todos os nomes foram lidos em `rna_*.cc`/
`render_internal.cc` do repositório `blender/blender` (main, 4.2, 4.5, 5.0) em 10/10/2026.

## Fontes

- Blender (código-fonte, lido): `rna_scene.cc`, `rna_camera.cc`, `rna_space.cc`, `rna_color.cc`,
  `rna_nodetree.cc`, `rna_animation.cc`, `rna_action.cc`, `rna_nla.cc`, `render_internal.cc`,
  `DNA_scene_types.h` — https://github.com/blender/blender (branches main 5.4-alpha,
  blender-v4.2-release, blender-v4.5-release, blender-v5.0-release)
- glTF-Blender-IO (NLA stash por animação): https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/addons/io_scene_gltf2/blender/imp/animation_utils.py
- Phaser 4.2.1 (lido): `src/textures/parsers/JSONHash.js`, `JSONArray.js`, `src/loader/filetypes/AtlasJSONFile.js`, `MultiAtlasFile.js`, `CompressedTextureFile.js`, `src/animations/AnimationManager.js`, `src/gameobjects/components/Origin.js` — https://github.com/phaserjs/phaser
- Add-ons: https://github.com/Mattline1/SpriteAtlasAddon ; https://github.com/RubielGames/BlenderSpriteGenerator ; https://github.com/chronicleroflegends/DirectionalSpriteBatchRender
- Mixamo FAQ (oficial, via snippet de busca) [secundário]: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html ; status 2026 [secundário]: https://app.cinevva.com/guides/free-character-animations-rigging
- Poly Haven ToS (lido; assets CC0): https://github.com/Poly-Haven/Public-API/blob/master/ToS.md ; Kenney/Quaternius CC0 [secundário]: https://gamefromscratch.com/?p=27165 ; https://licenseorg.com/guide/3d-assets/quaternius
- Dead Cells (3D → pixel art com ferramenta própria) [secundário]: Game Developer, "Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells" (T. Vasseur, 2018); https://80.lv/articles/case-study-dead-cells-character-art-pipeline/ ; Factorio FFF-146 "The GFX workflow" [secundário]: https://factorio.com/blog/post/fff-146
- Geradores e licenças: `.claude/skills/gerar-ativos-3d/references/matriz-geradores.md`; Hunyuan3D LICENSE: https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE
