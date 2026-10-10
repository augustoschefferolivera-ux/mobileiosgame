# gltfpack e glTF-Transform — flags conferidas (gltfpack 1.3, @gltf-transform/cli 4.5.1)

As flags abaixo foram lidas no `--help` das versões instaladas em 10/10/2026 e no README do
gltfpack citado na nota. Se a sua versão divergir, `gltfpack -h` e `gltf-transform <cmd> --help`
mandam.

## gltfpack (MIT; zeux/meshoptimizer)

```
gltfpack -i in.glb -o out.glb [opções]
```

| Flag | Efeito | Uso mobile |
|---|---|---|
| `-si R` | simplifica malhas para a razão R de triângulos (0–1) | LODs: `-si 0.5`, `-si 0.25`, `-si 0.1` (uma chamada por LOD) |
| `-sa` | simplificação agressiva ignorando qualidade | só LOD distante |
| `-slb` | trava vértices de borda | terreno/peças conectadas |
| `-tc` | converte texturas para KTX2 com BasisU (ETC1S por padrão) | Unity/web; **não** para USDZ |
| `-tu` | usa UASTC (qualidade maior, arquivo maior) | normal maps, hero assets |
| `-tq N` | qualidade de codificação 1–10 (padrão 8) | |
| `-ts R` / `-tl N` | escala texturas por R / limita a N px | `-tl 2048` (teto Apple) |
| `-tp` | redimensiona para potência de 2 | WebGL1 |
| `-c` / `-cc` / `-cz` | compressão meshopt (`EXT_meshopt_compression`); exige decodificador | web (three.js r122+, Babylon 5.0+) |
| `-vp/-vt/-vn N` | bits de quantização de posição/UV/normal (padrão 14/12/8) | |
| `-at/-ar N`, `-af N` | quantização de translação/rotação; reamostra animação a N Hz (padrão 30; 0 desliga) | animação mobile: `-af 30` ou `-af 24` |
| `-kn` / `-km` / `-ke` | mantém nós nomeados / materiais nomeados / extras | **sempre** `-kn -km` para o engine achar peças |
| `-mm` / `-mi` | funde instâncias / `EXT_mesh_gpu_instancing` | kits modulares |
| `-noq` | desliga quantização (`KHR_mesh_quantization`) — arquivo maior, sem extensões | importadores que não leem quantização; precaução para Reality Converter |

Limites: **Draco não suportado**; extensões de fornecedor são descartadas; suporte a extensões
em Unity/Unreal não documentado no README (teste a importação).

## glTF-Transform (MIT; donmccurdy)

```
gltf-transform <comando> in.glb out.glb [opções]
```

| Comando | Opções relevantes | Para que |
|---|---|---|
| `inspect in.glb` | `--format` | medir malhas, materiais, texturas, animações |
| `weld` | — | soldar vértices duplicados (**obrigatório antes de simplify**) |
| `simplify` | `--ratio R` (0–1, vértices a manter), `--error E` (fração do raio; padrão 0.0001), `--lock-border` | LODs; exemplos do help: `ratio=0.5, error=0.001` |
| `resize` | `--width N --height N` (máximos), `--power-of-two`, `--pattern` | texturas ≤2048² |
| `uastc` / `etc1s` | `--mipmaps`, `--level`, `--rdo`, `--pattern`, `--slots`; etc1s: `--quality`, `--resize` | KTX2 (exige `toktx`) |
| `meshopt` | `--level`, `--quantize-*` | compressão para web |
| `resample` | `--tolerance` | deduplica keyframes de animação sem perda visível |
| `dedup`, `prune` | — | remove duplicatas e propriedades não usadas |
| `optimize` | `--compress`, `--join`, `--instance`, `--palette`, `--prune`, `--resample`, `--flatten` | tudo-em-um; `--join` funde malhas (reduz draw calls; evite em peças animadas) |

Notas do `simplify.ts`: solda primeiro ("split vertices will limit the simplifier"); `ratio`
0 = simplificação máxima limitada por `error`; converte índices para 16 bits quando ≤65.534
vértices.

## Receita por alvo

| Alvo | Comando mínimo |
|---|---|
| Unity (iOS) | `optimize_glb.sh -i in.glb -o out --target unity --ktx2 uastc` → importar, `LOD Group`, ASTC na importação |
| Godot | `optimize_glb.sh -i in.glb -o out --target godot --ktx2 none` (deixe o importador comprimir) |
| RealityKit/USDZ | `optimize_glb.sh -i in.glb -o out --target realitykit` → Reality Converter → `.usdz` |
| Web (three.js) | `optimize_glb.sh -i in.glb -o out --target web` (KTX2 + meshopt) |
| Um binário só | `--engine gltfpack` (`-si`, `-tl`, `-tc`, `-cc`, `-kn -km`) |

## Resultado do teste neste repositório (esfera UV sintética, 20.000 tris, PNG 1024²)

Executado em 10/10/2026 com @gltf-transform/cli 4.5.1 e gltfpack 1.3 (npm):

| Engine | Parâmetros | LOD0 | LOD1 | LOD2 | LOD3 | Textura |
|---|---|---|---|---|---|---|
| gltf-transform | `--lods 0.5,0.25,0.1 --error 0.001 --tex 512` | 20.000 | 9.999 | 5.000 | 4.509 (limitado por `--error`) | 1024² → 512² |

| gltf-transform | idem com `--error 0.01` | 20.000 | 9.999 | 5.000 | 2.000 | 512² |
| gltfpack 1.3 (npm) via script | `--engine gltfpack --lods 0.5,0.1 --tex 512 --ktx2 none --target web` (resize pelo glTF-Transform, depois `-si`, `-cc`, `-kn -km`) | 20.000 (280 KB) | 10.000 (248 KB) | 2.000 (209 KB) | — | 1024² → 512² |

Observações: (1) `simplify --ratio` é um alvo; `--error` manda — para LODs distantes use
`--error 0.01`. (2) O **gltfpack instalado pelo npm é build node.js sem BasisU**: `-tc` falha
com "gltfpack was built without BasisU support"; use o binário nativo das releases do
meshoptimizer ou o caminho `uastc`/`etc1s` do glTF-Transform (que exige `toktx`, ausente neste
ambiente — portanto KTX2 **não foi exercitado** aqui). (3) `gltfpack -tl/-ts` **só funcionam
com `-tc/-tu/-tw`** ("Texture processing is only supported when texture compression is
enabled"); sem KTX2 o script redimensiona com `gltf-transform resize`. (4) gltfpack adiciona
`KHR_mesh_quantization` e `KHR_texture_transform` por padrão (`-noq` evita a quantização).
(5) Os números do seu asset vão para `production/evidencias/` do projeto, não para esta
referência.
