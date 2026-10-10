# Pipeline de assets 3D para web mobile: glTF, Draco/meshopt, KTX2

## Fluxo

```
gerador (Tripo/Meshy/TRELLIS) → GLB bruto
  → inspeção:   npx gltf-transform inspect in.glb
  → limpeza:    npx gltf-transform dedup in.glb a.glb && npx gltf-transform prune a.glb b.glb
  → simplificar: gltfpack -i b.glb -o c.glb -si 0.5 -kn          (ou gltf-transform simplify --ratio 0.5)
  → texturas:   npx gltf-transform resize c.glb d.glb --width 2048 --height 2048
                npx gltf-transform ktx2 d.glb e.glb --mode uastc   (ou etc1s para menor tamanho)
  → geometria:  npx gltf-transform meshopt e.glb final.glb          (ou gltfpack -cc)
  → conferir:   npx gltf-transform inspect final.glb  → tris ≤ 100K, texturas ≤ 2048², tamanho em KB
```

- `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2` faz quase tudo em um comando; use os passos separados quando precisar controlar.
- Flags do gltfpack: `-si R` simplifica até a razão R; `-tc` texturas KTX2/BasisU; `-tw` WebP; `-c`/`-cc`/`-cz` compressão meshopt (loaders precisam do decoder; Three.js r122+, Babylon 5.0+); `-mi` instancing; `-kn/-km/-ke` mantêm nomes/materiais/extras.

## Tabela de formatos

| Necessidade | Formato | Loader Three.js | Observação iOS/Safari |
|---|---|---|---|
| Geometria pequena, decoder simples | meshopt (`EXT_meshopt_compression`) | `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` | decoder ~30 KB WASM; rápido |
| Geometria mínima | Draco (`KHR_draco_mesh_compression`) | `DRACOLoader.setDecoderPath('/draco/')` | decoder maior; decodificação na CPU |
| Texturas na GPU sem descompressão | KTX2 Basis Universal (`KHR_texture_basisu`) | `KTX2Loader.setTranscoderPath('/basis/').detectSupport(renderer)` | transcodifica para ASTC/PVRTC no iPhone; menor pico de memória |
| Texturas menores no download, decodificação CPU | WebP | nativo | pico de memória igual ao PNG |
| Splats | `.spz`/`.ply`/`.splat`/`.ksplat`/`.sog` | Spark `SplatMesh` | teste memória em iPhone real |

Copie os decoders de `node_modules/three/examples/jsm/libs/{draco,basis}/` para `public/` e aponte os paths.

## Orçamentos práticos (iPhone, Safari)

- Por modelo: ≤100K triângulos e um conjunto de texturas 2048² (regra da Apple para AR Quick Look; reutilizada aqui por falta de número oficial para Safari).
- Por cena: < 500K triângulos visíveis, < 100 draw calls (`renderer.info.render.calls`), < 256 MB de texturas descomprimidas.
- Download inicial: < 10 MB antes do primeiro frame; o resto por `import()`/streaming com tela de loading.

## Babylon.js

- `SceneLoader.ImportMeshAsync` lê glTF com Draco/meshopt/KTX2 via `@babylonjs/loaders`; configure `KhronosTextureContainer2.URLConfig` para os transcoders.
- Inspector (`scene.debugLayer.show()`) só em desenvolvimento.

## Validação

- `npx gltf-transform validate final.glb` (ou glTF Validator) antes do commit.
- Screenshot via `scripts/verify.sh` e comparação com o render de referência do gerador.

Fontes: https://github.com/donmccurdy/glTF-Transform ; https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md ; https://github.com/sparkjsdev/spark ; notas internas `research_notes/.../ativos_3d_rigging_mundos.md` (Q5/Q6).
