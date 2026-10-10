# Texturas PBR para mobile — checklist, compressão, shaders (estado em 10/10/2026)

## Checklist de avaliação de um conjunto PBR (preencha por asset)

| Item | Como ver | Aceito |
|---|---|---|
| Base color sem luz/sombra assada | Blender: só a textura, sem luzes (`look` em `material` com world cinza) | sem gradientes de iluminação direcional |
| Costuras de UV | `look` em 4 ângulos; `inspecionar_glb.py` (UV em 0–1) | invisíveis à distância de jogo |
| Metallic coerente | metal = 1, não-metal = 0; valores intermediários só em transições | |
| Roughness com variação | não plana; desgaste onde faz sentido | |
| Normal map convenção | glTF: tangente, **+Y (OpenGL)**; DirectX precisa inverter G | relevos saltam para fora |
| Alpha | `MASK` para recortes (folhas, grades); `BLEND` só quando precisa; TRELLIS.2 vem `OPAQUE` | |
| Resolução | ≤2048² hero, ≤1024² prop (teto Apple: 1 conjunto 2048²) | |
| Texel density consistente | mesmo nível de detalhe entre peças do kit | |
| Mapas presentes | baseColor, normal, metallicRoughness; AO/emissive só se usados | |
| Licença | gerador/modelo de imagem/CC0 no `PROVENANCE.md` | |

Se não puder medir um item, escreva `NÃO AVALIADO` (regra herdada do asset-audit, MIT).

## De onde vem o PBR (2026)

- **Geradores**: Hunyuan3D 2.1 Paint-PBR ("physics-grounded material simulation"; 21 GB VRAM
  só para textura; **licença territorial**), TRELLIS.2 (base color, roughness, metallic,
  opacity; GLB opaco por padrão), Meshy 7 ("8K", Multiview, PBR confirmado nas docs do
  ComfyUI), Tripo 3.0 (edição "magic brush"), Hitem3D (PBR + retopo, fornecedor).
- **Standalone (background, 2024)**: Stable Projectorz (projeção SD, multi-view, inpaint,
  ControlNet; PBR não confirmado; versão 2026 desconhecida); Adobe Substance 3D Sampler
  Text to Texture (beta mar/2024), Text to Pattern e Image to Texture (mai/2024); créditos
  Firefly; nenhuma novidade 2025–26 encontrada.
- **Pesquisa aberta**: MV-Adapter (ICCV 2025; Apache-2.0; texto/imagem→textura guiada por
  geometria; salva `<nome>_shaded.glb`; ~14 GB VRAM; **sem PBR**); Material Anything (CVPR 2025
  Highlight; MIT; albedo/roughness/metallic/bump; entrada GLB; Estimator/Refiner jun/2025;
  scripts Blender 3.2.2).
- **Blender MCP**: atribui/modifica materiais; Poly Haven texturas CC0 (Principled completo
  com os mapas que importam).
- **Avaliação**: Hi3DEval pontua material (albedo, saturação, metallicness) separado da
  estética; placar não lido.

## Texturas sem costura com modelos de imagem

1. Prompt: "seamless tileable <material> texture, top-down orthographic, uniform diffuse
   lighting, no shadows, no vignette, no text, no watermark", quadrada 1024 ou 2048.
2. Gere 4–8 variações; rode `verificar_tiling.py --preview`; descarte razão > 1,5 ou
   repetição óbvia no 2×2.
3. Corrija a emenda (offset 50 % + clone/heal no editor do projeto) e re-verifique.
4. Mapas derivados: altura → normal via bake no Blender (nó Bump → bake NORMAL) ou ferramenta
   do projeto; roughness por curva do albedo dessaturado (ajuste à mão); registre o método.
5. Panoramas (skybox): `--eixo horizontal`; cheque os polos no cubemap.

Nenhuma fonte 2025–26 sobre texto→PBR tileable (MatFuse, Material Palette) foi lida; trate
como pesquisa não verificada.

## Atlas e empacotamento

- Blender: `uv.pack_islands(margin=0.02)` após unir as peças; bake em uma imagem por mapa.
- glTF-Transform `optimize --palette` cria textura-paleta e funde materiais de cor sólida;
  `--join` reduz draw calls (não em peças animadas).
- Canal MR: glTF usa **G = roughness, B = metallic** numa só textura; AO pode ir no R
  (occlusion aponta para a mesma imagem). Não gere três PNGs separados para o engine.
- Unity Sprite Atlas é para 2D; para 3D o atlas é feito no Blender/bake.

## Compressão

| Formato | Onde | Como | Observação |
|---|---|---|---|
| **KTX2 UASTC** | Unity, web | `gltf-transform uastc` (toktx) / gltfpack nativo `-tc -tu` | qualidade alta, arquivo maior; normais e hero |
| **KTX2 ETC1S** | Unity, web | `gltf-transform etc1s --quality N` / gltfpack `-tc` | pequeno; artefatos em normais e gradientes |
| **ASTC** (4×4…8×8) | iOS em todos os engines | importação do engine (Unity por plataforma; Godot import) | 8 → 2 bpp conforme o bloco; blocos maiores para albedo de cenário |
| PNG/JPEG | USDZ/RealityKit | Reality Converter | ASTC na importação da Apple |
| WebP | web | `gltf-transform webp` / gltfpack `-tw` | não para engines nativos |

Memória (aritmética): RGBA8 2048² = 16 MB; ASTC 4×4 = 4 MB; 6×6 = 1,8 MB; 8×8 = 1 MB;
mipmaps somam ~33 %. Mipmaps **sempre ligados** em 3D (sem eles, aliasing e cache miss).

## Decals

- Fonte: PNG com alfa real (`gpt-image-1.5` com `background: "transparent"`; sem halo —
  verifique bordas), tamanho 256–512².
- Unity URP: **Decal Projector** (URP 12+); Godot 4: nó **Decal**; RealityKit: quad com
  `alphaMode BLEND`/`MASK` deslocado da superfície [sem projetor nativo confirmado].
- Orçamento: cada decal é overdraw transparente; limite por cena e use `MASK` quando a borda
  permitir.

## Shaders simples para mobile

| Engine | Recomendado | Evitar |
|---|---|---|
| Unity URP | **Simple Lit** (Blinn-Phong; props/cenário), **Baked Lit** (cenário com lightmap), **Lit** só em hero/metal; Shader Graph com poucos nós; GPU instancing | parallax, clearcoat, SSS, muitas luzes em tempo real, post-processing pesado |
| Godot 4 | renderer **Mobile** no device (Compatibility no simulador, conforme o projeto); `StandardMaterial3D` com albedo+normal+MR; `ORMMaterial3D` quando o atlas é ORM | refração, SSS, clearcoat, sombras de muitas luzes, `BLEND` em massa |
| RealityKit | material PBR padrão com mapas ≤2048; `UnlitMaterial` para elementos assados | materiais customizados pesados sem perfil |
| Web (three.js) | `MeshStandardMaterial` com KTX2 | `MeshPhysicalMaterial` com transmission |

Extensões glTF: fique em `pbrMetallicRoughness` + `KHR_texture_transform` + `KHR_texture_basisu`;
`KHR_materials_transmission/volume/iridescence/sheen` custam e nem todo importador lê.

## Lacunas da pesquisa
- Polycam e Scaniverse (texturização/scan) não lidos; Meshy: custo de créditos por textura e
  tiers de resolução não lidos; Stable Projectorz versão/PBR atual desconhecidos; nada sobre
  decals por IA.
