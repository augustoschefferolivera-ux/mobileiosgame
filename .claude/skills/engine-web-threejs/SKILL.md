---
name: engine-web-threejs
description: >
  Monta e verifica um jogo web 3D para iPhone com Three.js (0.186 / r186) ou Babylon.js 9 +
  TypeScript + Vite: WebGL2 sempre e WebGPU com fallback (Safari 26+), assets glTF com
  meshopt/Draco e texturas KTX2 (KTX2Loader → ASTC/PVRTC no iPhone), LOD, instancing, toon
  para esconder malhas geradas por IA, limites de memória do Safari, Gaussian splats com Spark
  (MIT); verificação com Playwright em WebKit emulando iPhone (scripts/verify.sh sobe 'vite
  preview' e roda o playtest com checagem de contexto WebGL). Use sempre que o jogo for 3D para
  navegador/PWA ou o brief pedir 3D (ADR-0002). Não use para 2D web (engine-web-phaser) nem
  quando o 3D serve só para gerar sprites (sprites-pre-renderizados-de-3d).
license: MIT
compatibility: "Claude Code ou Codex; Node.js 20+; Playwright WebKit; Safari real em iPhone (iOS 26+ para WebGPU) para validar memória e fps"
metadata:
  grupo: engines
  alvo: [3d, web]
  fase: [2, 3, 5, 8]
argument-hint: "[pasta-do-jogo] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine web 3D: Three.js / Babylon.js + TypeScript + Vite

Entrega um jogo 3D web que carrega rápido e roda estável no Safari do iPhone, com pipeline de
assets glTF otimizado (KTX2 + meshopt, LOD, instancing) e canal de depuração; `scripts/verify.sh`
faz build, sobe preview e roda Playwright em WebKit (iPhone) capturando screenshot, console,
`window.__GAME_DEBUG__` e confirmando que o canvas tem contexto WebGL.

## Quando usar / quando não usar

- **Use** para 3D leve no navegador: runners, puzzles 3D, arenas pequenas, visualização de
  mundos (splats), protótipos de "feel". Os casos públicos de jogos quase 100 % por agente
  são Three.js: fly.pieter.com (WebGL2, fev/2025) e o FPS de Shumer (jul/2026, ~55 mil linhas,
  nota 5/10 do crítico) — relatório; Vibe Jam 2025 exigiu jogo web sem login e ≥80 % de código
  por IA, 1.170 inscritos [secundário].
- **Versões** (npm, lido em 10/10/2026): `three` **0.186.1** (r186, 24/09/2026; r185 em
  25/06, r184 em 16/04 — cadência ~bimestral), MIT; `@babylonjs/core` **9.30.0**, **Apache-2.0**;
  `@sparkjsdev/spark` 2.3.1, MIT, peer `three >= 0.180`. Fixe no `package.json`.
- **Three.js** quando quer controle e ecossistema (addons, TSL/WebGPU); **Babylon.js** quando
  quer engine completa (física, GUI, inspector) e aceita bundle maior.
- **Não use** se o jogo é 2D com "visual 3D" — pré-renderize sprites (`/sprites-pre-renderizados-de-3d`),
  que custa zero de GPU 3D no iPhone; nem para 3D pesado (mundos abertos, física complexa):
  corte escopo (`/escopo-e-anti-padroes`). Decisão detalhada em
  `playbook/10-praticas-de-3d-para-jogo-web.md`.

## Pré-requisitos

- Node 20+, Vite + TypeScript, `npm i three@0.186.1` (+ `@types/three`) ou `npm i @babylonjs/core@9.30.0`.
- Playwright: `npm i -D playwright && npx playwright install webkit` (Arch pode exigir
  bibliotecas; `VERIFY_BROWSER=chromium` como fallback — `playbook/07`).
- Pipeline de assets: `npm i -D @gltf-transform/cli@4.5.1` e/ou `gltfpack` 1.3 (binário nativo
  para `-tc`; o do npm não tem BasisU), `toktx` (KTX-Software) para `gltf-transform uastc|etc1s`.
- Decoders copiados para `public/`: `three/examples/jsm/libs/basis/` (basis_transcoder.js +
  .wasm ≈ 0,6 MB), `three/examples/jsm/libs/draco/gltf/` (≈ 0,25 MB) — meshopt vem como módulo
  (`three/addons/libs/meshopt_decoder.module.js`, ≈ 29 KB).
- Splats: `npm i @sparkjsdev/spark` (PLY/SPZ/SPLAT/KSPLAT/SOG; "targeting 98%+ WebGL2 support",
  "renders fast on low-powered mobile devices" — README).

## Entradas

- Brief (câmera, número de objetos, alvo de fps), `feature_list.json`, GLBs das skills de 3D já
  otimizados (`/otimizar-3d-para-mobile --target web`: ≤100K tris/2048² por asset — regra da
  Apple reutilizada por falta de número oficial do Safari).

## Passos

1. **Esqueleto** (fase 2): `src/main.ts` cria `WebGLRenderer({ antialias: false, powerPreference:
   'high-performance' })`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, `setSize` por
   `ResizeObserver`, cena com câmera, luz direcional + ambiente, chão, loop com
   `renderer.setAnimationLoop`. **WebGPU**: `import { WebGPURenderer } from 'three/webgpu'`
   cai sozinho para o backend WebGL2 quando `navigator.gpu` não existe (código: `getFallback`
   → `WebGLBackend`; `forceWebGL: true` força WebGL2); `await renderer.init()` antes de usar.
   Suporte (caniuse, dados lidos): iOS Safari **26.0+** = sim; 17.4–18.x só por flag; WebGL2 em
   todo iOS ≥ 15. Babylon: `WebGPUEngine.IsSupportedAsync` com o mesmo fallback.
2. **Canal de depuração**: `window.__GAME_DEBUG__ = { scene, fps, frame, drawCalls:
   renderer.info.render.calls, triangles: renderer.info.render.triangles, errors[] }` por
   frame; registre `webglcontextlost` como erro.
3. **Primeira verificação**:

```bash
.claude/skills/engine-web-threejs/scripts/verify.sh --dir . --feature esqueleto
```

   O playtest reprova se não houver `<canvas>` com contexto WebGL ou se houver `pageerror`.
4. **Assets** (fase 6): `gltf-transform optimize in.glb out.glb --compress meshopt
   --texture-compress ktx2` (ou `gltfpack -i in.glb -o out.glb -cc -tc -si 0.5 -kn -km`).
   Loader: `GLTFLoader` + `setMeshoptDecoder(MeshoptDecoder)` + `setKTX2Loader(new
   KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer))` (+ `DRACOLoader` só se
   o arquivo for Draco). `detectSupport` escolhe ASTC/PVRTC/ETC2 pelas extensões WebGL ou por
   `hasFeature` no WebGPU (`detectSupportAsync` está deprecated desde r181). LOD:
   `new THREE.LOD().addLevel(mesh, distancia, histerese)` com os `-lod1..3.glb`. Receita e tabela
   de formatos em `references/assets-gltf-ktx2.md`.
5. **Input** (fase 5): `pointer*` events, `touch-action: none`; joystick virtual; `OrbitControls`
   só em câmera livre (pinch funciona no Safari real; no Playwright use `page.touchscreen.tap`).
6. **Performance** (fase 8): alvo 60 fps (ou 30 declarado) em iPhone de 4 anos; `InstancedMesh`
   (ou `EXT_mesh_gpu_instancing` via `gltfpack -mi`, lido pelo GLTFLoader) e `BatchedMesh`
   para repetição; sombras só `PCFShadowMap` com mapa 1024; sem pós-processamento multi-pass;
   materiais `MeshLambert/Phong` em props e `MeshToonMaterial` (`gradientMap`) para esconder
   malhas/texturas de gerador; `dispose()` de geometrias/texturas ao trocar de nível (Safari
   recarrega abas acima de ~1–1,5 GB [confirmar]).
7. **Splats** (opcional): `SplatMesh` do Spark para ambientes gerados (Marble exporta
   `.spz`/`.ply`); misture com malhas; memória só no iPhone real.
8. **PWA e Safari real**: igual a `engine-web-phaser/references/pwa.md`; valide WebGPU/WebGL2
   no Safari do iPhone com `npx vite preview --host`.

## Critério de pronto e evidência

- `verify.sh` saiu 0: `build.log` limpo, `state.json` com `hasCanvas: true`, `webgl: true`,
  `debug.fps` plausível, `drawCalls`/`triangles` dentro do orçamento, `console.log` sem
  `pageerror`/`THREE.WebGLRenderer: Context Lost`, `screenshot.png` com a cena (não tela preta).
- Orçamento de assets anotado em `resumo.md` (saída de `gltf-transform inspect`): tris, KB por GLB,
  KTX2 presentes, decoders usados.
- Tela preta com build verde é falha. Nota de teste no iPhone real por milestone (fps, memória).

## Verificar no simulador/dispositivo

- Sem Mac (perfil deste repositório): `npx vite preview --host` e Safari no **iPhone real** pela
  rede local/Tailscale; Playwright WebKit é a prévia, não a verdade.
- Com Mac: `xcrun simctl openurl booted http://<ip>:4173/`, Web Inspector → Timelines → Memory,
  `renderer.info`; teste com bateria baixa/aquecido (throttling reduz fps).

## Exportar para web

| Item | Formato / valor | Observação |
|---|---|---|
| Geometria | GLB + `EXT_meshopt_compression` (`-cc`) | decoder 29 KB; Draco só se já vier Draco (não misture) |
| Texturas | KTX2 `KHR_texture_basisu`: UASTC (normais, hero) / ETC1S (albedo de props); ≤2048² | GPU recebe ASTC/PVRTC sem descomprimir → menor pico de memória; transcoder 0,6 MB |
| Orçamento por modelo | ≤100K tris, 1 conjunto 2048² | regra da Apple reutilizada |
| Orçamento por cena | <500K tris visíveis, <100 draw calls, <256 MB de texturas descomprimidas, <10 MB antes do 1.º frame | inferência; meça no iPhone |
| LOD | 3 níveis 0,5/0,25/0,1 via `THREE.LOD` | `hysteresis` 0,05–0,1 contra flicker |
| Animação | clipes ≤10 s, `gltfpack -af 30` | `AnimationMixer` |
| Licenças | three MIT · Babylon **Apache-2.0** · Spark MIT · meshoptimizer/glTF-Transform MIT · KTX-Software Apache-2.0 | assets seguem o `PROVENANCE.md` |

## Pré-render para Phaser

Se o brief é 2D e o 3D entra só para dar consistência de ângulo (8 direções, isométrico, props
2.5D), não use esta skill: renderize os mesmos GLBs em sprites com
`/sprites-pre-renderizados-de-3d` (Blender headless → atlas JSON hash) e fique no Phaser
(ADR-0001). Critério: câmera fixa + sem física 3D + sem câmera livre = pré-render; câmera livre,
perspectiva real ou centenas de objetos dinâmicos = Three.js.

## Armadilhas conhecidas

- **WebGPU no iOS** só a partir do iOS 26 (set/2025 [secundário]); sempre com fallback WebGL2 e
  teste nos dois caminhos. Three.js `WebGPURenderer` exige `await renderer.init()`.
- **Memória do Safari**: texturas 4096² e muitos GLB sem compressão derrubam a aba; KTX2 reduz o
  pico porque a GPU lê o formato comprimido.
- **Draco vs meshopt**: Draco exige decoder WASM separado (`DRACOLoader.setDecoderPath`), meshopt
  precisa de `MeshoptDecoder`; não aplique os dois ao mesmo arquivo.
- **Fonte dos assets**: mantenha o GLB com PNG no repositório (fonte) e gere KTX2 só no build —
  KTX2 não serve para Blender/pré-render nem para USDZ (se um ADR futuro pedir app nativo).
- **DPR 3** e `antialias: true` dobram o custo de fill; use DPR ≤ 2 e FXAA/sem AA.
- **Splats**: proveniência do PLY (treino 3DGS da INRIA é não comercial); Spark é o caminho na
  web; teste memória no iPhone real.
- **Licenças de assets**: evite Hunyuan3D/HY-World (saída proibida na UE/UK/Coreia) e Roblox Cube.
- **Custo**: tudo local; CPU/GPU de geração de assets é das skills de 3D.

## Fontes

- Versões (npm, lido 10/10/2026): https://registry.npmjs.org/three/latest ; https://registry.npmjs.org/@babylonjs/core/latest ; https://registry.npmjs.org/@sparkjsdev/spark/latest
- three.js r186 (código lido): `src/renderers/webgpu/WebGPURenderer.js` (fallback WebGL2), `examples/jsm/loaders/KTX2Loader.js` (`detectSupport`), `examples/jsm/loaders/GLTFLoader.js` (extensões), `src/objects/LOD.js` — https://github.com/mrdoob/three.js
- WebGPU/WebGL2 por versão de Safari iOS (caniuse, dados lidos): https://github.com/Fyrd/caniuse/blob/main/features-json/webgpu.json ; WebKit "Safari 26 beta" [secundário]: https://webkit.org/blog/
- Spark (World Labs, MIT; formatos; mobile): https://github.com/sparkjsdev/spark
- glTF-Transform: https://github.com/donmccurdy/glTF-Transform ; gltfpack/meshoptimizer: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
- Casos fly.pieter.com e FPS de Shumer: `reports/Criação de jogos totalmente por IA.md` ; https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design ; Vibe Jam 2025 [secundário]: https://www.indiehackers.com/post/Uz0wHG4pI3KBOiFhP5YR ; https://vibej.am/2026/press
- Orçamento ≤100K tris / 2048² (Apple): https://developer.apple.com/forums/thread/693867
- Playwright (emulação) [não lida; confirme]: https://playwright.dev/docs/emulation
- Práticas e decisão 2D×3D: `playbook/10-praticas-de-3d-para-jogo-web.md`
