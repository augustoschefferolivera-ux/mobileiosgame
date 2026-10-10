---
name: engine-web-threejs
description: >
  Monta e verifica um jogo web 3D para iPhone com Three.js ou Babylon.js + TypeScript + Vite:
  WebGL2/WebGPU no iOS, assets glTF com Draco/meshopt e texturas KTX2, limites de memória do
  Safari, Gaussian splats com Spark (MIT); verificação com Playwright em WebKit emulando iPhone
  (scripts/verify.sh sobe 'vite preview' e roda o playtest com checagem de contexto WebGL).
  Use sempre que o jogo for 3D para navegador/PWA. Não use para 2D web (engine-web-phaser) nem
  para 3D nativo iOS (engine-realitykit-metal).
license: MIT
compatibility: "Claude Code ou Codex; Node.js 20+; Playwright WebKit; Safari real em iPhone para validar WebGPU/memória"
metadata:
  grupo: engines
  alvo: [3d, web]
  fase: [2, 3, 5, 8]
argument-hint: "[pasta-do-jogo] [feature]"
disable-model-invocation: false
user-invocable: true
---

# Engine web 3D: Three.js / Babylon.js + TypeScript + Vite

Entrega um jogo 3D web que carrega rápido e roda estável no Safari do iPhone, com pipeline de assets glTF otimizado e canal de depuração; `scripts/verify.sh` faz build, sobe preview e roda Playwright em WebKit (iPhone) capturando screenshot, console, `window.__GAME_DEBUG__` e confirmando que o canvas tem contexto WebGL.

## Quando usar / quando não usar

- **Use** para 3D leve no navegador: runners, puzzles 3D, visualização de mundos (splats), protótipos de "feel" antes de uma versão nativa. O caso público com mais tração em jogos feitos por IA (fly.pieter.com) é Three.js/WebGL2.
- **Three.js** (versão `r17x` em 2026 **[secundário, confirmar em threejs.org]**) quando quer controle e ecossistema; **Babylon.js 8** **[secundário, confirmar]** quando quer engine completa (física, GUI, inspector, WebGPU maduro).
- **Não use** para 3D pesado em iPhone (memória do Safari e térmica limitam) — vá para RealityKit/Unity. Não use se precisa de IAP/Game Center nativos.

## Pré-requisitos

- Node 20+, Vite + TypeScript, `npm i three` (+ `@types/three`) ou `npm i @babylonjs/core`.
- Playwright: `npm i -D playwright && npx playwright install webkit`.
- Pipeline de assets (CLI, scriptável): `npm i -D @gltf-transform/cli` e/ou `gltfpack` (meshoptimizer, MIT); `ktx` (KTX-Software) para KTX2 se não usar o `gltf-transform ktx2`.
- Splats: `npm i @sparkjsdev/spark` (World Labs, MIT; PLY/SPZ/SPLAT/KSPLAT/SOG; mira 98%+ dos dispositivos WebGL2 e "renders fast on low-powered mobile devices").

## Entradas

- Brief (câmera, número de objetos, alvo de fps), `production/feature_list.json`, modelos GLB das skills de 3D (já com orçamento ≤100K tris/2048² por asset — regra da Apple que também cabe no Safari).

## Passos

1. **Esqueleto** (fase 2): `src/main.ts` cria `WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, `setSize` por `ResizeObserver`, cena com câmera, luz direcional + ambiente, chão, loop com `renderer.setAnimationLoop`. Para WebGPU, use `WebGPURenderer` **com fallback** automático para WebGL2 — Safari iOS habilitou WebGPU recentemente e versões antigas não têm. Babylon: `Engine`/`WebGPUEngine.IsSupportedAsync` com o mesmo fallback.
2. **Canal de depuração**: `window.__GAME_DEBUG__ = { scene, fps, frame, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, errors[] }` atualizado por frame; registre `webglcontextlost` como erro.
3. **Primeira verificação**:

```bash
.claude/skills/engine-web-threejs/scripts/verify.sh --dir . --feature esqueleto
```

   O playtest reprova se não houver `<canvas>` com contexto WebGL ou se houver `pageerror`.
4. **Assets** (fase 6): `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (ou `gltfpack -i in.glb -o out.glb -cc -tc -si 0.5`); carregue com `GLTFLoader` + `DRACOLoader`/`MeshoptDecoder` + `KTX2Loader` (`detectSupport(renderer)`). Mantenha ≤100K tris e ≤2048² por modelo e total de texturas na cena < ~256 MB descomprimidos. Receita e tabela de formatos em `references/assets-gltf-ktx2.md`.
5. **Input** (fase 5): `pointer*` events, `touch-action: none`; joystick virtual para movimento; `OrbitControls` só em modos de câmera livre (pinch funciona no Safari real; no Playwright teste com `page.touchscreen.tap`).
6. **Performance** (fase 8): alvo 60 fps (ou 30 declarado) em iPhone de 4 anos; `InstancedMesh` para repetição; sombras só `PCFShadowMap` com mapa 1024; sem pós-processamento multi-pass no iPhone; `renderer.info` no canal de debug; `dispose()` de geometrias/texturas ao trocar de nível (Safari recarrega abas acima de ~1–1,5 GB).
7. **Splats** (opcional): `SplatMesh` do Spark para ambientes gerados (Marble exporta `.spz`/`.ply`); misture com malhas; teste memória no iPhone real, não no emulador.
8. **PWA e Safari real**: igual a `engine-web-phaser/references/pwa.md`; valide WebGPU/WebGL2 no Safari do iPhone (`xcrun simctl openurl booted <url>` no simulador ou dispositivo).

## Critério de pronto e evidência

- `verify.sh` saiu 0: `build.log` limpo, `state.json` com `hasCanvas: true`, `webgl: true`, `debug.fps` plausível, `console.log` sem `pageerror`/`THREE.WebGLRenderer: Context Lost`, `screenshot.png` com a cena (não tela preta).
- Orçamento de assets anotado em `resumo.md` (saída de `gltf-transform inspect`).
- Tela preta com build verde é falha.

## Verificar no simulador/dispositivo

- Simulador iOS (Safari real): `npx vite preview --host` e `xcrun simctl openurl booted http://<ip>:4173/`; screenshot via `xcrun simctl io booted screenshot`.
- iPhone: Safari + Web Inspector no Mac para `renderer.info`, memória (Timelines → Memory) e erros de contexto; teste com bateria baixa/aquecido (throttling reduz fps).

## Armadilhas conhecidas

- **WebGPU no iOS**: suporte recente e desigual; sempre com fallback WebGL2 e teste nos dois caminhos.
- **Memória do Safari**: texturas 4096² e muitos GLB sem compressão derrubam a aba; KTX2 (UASTC/ETC1S) é lido pela GPU sem descomprimir e reduz o pico.
- **Draco vs meshopt**: Draco exige decoder WASM separado (`DRACOLoader.setDecoderPath`), meshopt precisa de `MeshoptDecoder`; não aplique os dois ao mesmo arquivo.
- **KTX2 em USDZ não existe** — se o mesmo asset for para RealityKit, mantenha o PNG original no repositório.
- **DPR 3** e `antialias: true` dobram o custo de fill; use DPR ≤ 2 e FXAA/sem AA.
- **Splats em Unity** não têm suporte mobile confiável (pacote principal diz "may or may not work"); no web, Spark é o caminho; em nativo, MetalSplatter.
- **Licenças**: Three.js e Babylon.js MIT; Spark MIT; meshoptimizer/glTF-Transform MIT; KTX-Software Apache 2.0; assets 3D seguem licenças das skills de 3D (evite Hunyuan3D/HY-World por restrição UE/UK/Coreia).
- **Custo**: tudo local; CPU/GPU de geração de assets é das skills de 3D.

## Fontes

- Spark (World Labs, MIT; formatos; mobile): https://github.com/sparkjsdev/spark
- glTF-Transform (optimize, draco, meshopt, ktx2): https://github.com/donmccurdy/glTF-Transform
- gltfpack/meshoptimizer (`-si`, `-tc`, `-cc`): https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
- Caso fly.pieter.com (Three.js/WebGL2) e FPS de Shumer (~55 mil linhas, 5/10): `reports/Criação de jogos totalmente por IA.md`; https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design
- Orçamento ≤100K tris / 2048² (Apple, via relatório interno, seção Ativos 3D)
- Three.js e Babylon.js (versões/WebGPU) [não lidos nesta pesquisa; confirme]: https://threejs.org ; https://doc.babylonjs.com
- Suporte WebGPU/WebGL no Safari [não lido nesta pesquisa; confirme na versão do iOS alvo]: https://webkit.org/blog/
- Playwright (emulação de dispositivos) [não lida; confirme]: https://playwright.dev/docs/emulation
