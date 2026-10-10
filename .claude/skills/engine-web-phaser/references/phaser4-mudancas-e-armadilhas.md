# Phaser 4.2.1: o que mudou do 3 para o 4, o que é estável e onde o agente tropeça

Fonte primária offline: o pacote `phaser@4.2.1` instalado em `node_modules/phaser/` traz `changelog/v4/4.0/MIGRATION-GUIDE.md`, `changelog/v4/4.0/CHANGELOG-v4.0.0.md` (800 linhas), `4.1/`, `4.2/`, `4.2.1/`, `docs/` (guias de renderização) e `skills/` (28 `SKILL.md` oficiais para agentes). Tudo lido em 2026-10-10. Espelho: https://github.com/phaserjs/phaser.

## Linha do tempo (npm `time`, 2026-10-10)

| Versão | Codinome | Data | Destaque |
|---|---|---|---|
| 4.0.0-rc.7 | — | 2026-03-25 | último RC |
| **4.0.0** | — | **2026-04-10** | renderer novo (RenderNodes), Filters, SpriteGPULayer, TilemapGPULayer, remoções |
| 4.1.0 | Salusa | 2026-04-30 | `Layer` vira GameObject de verdade; correções do build ESM (default export) |
| 4.2.0 | Giedi | 2026-06-19 | `Stencil`, `Mesh2D`, cone lights, `TintModes.MULTIPLY_TWO`, `render.stencil` (desligar economiza memória), `Timestep#setFPSLimit` |
| **4.2.1** | Giedi | **2026-07-09** | correções (ScaleManager não redimensionava para o pai, #7213; tween com `startDelay` travada, #7093; ESM) |

`npm view phaser dist-tags` → `latest: 4.2.1`. Phaser 3.90 (maio/2025) é a última 3.x. A documentação online é https://docs.phaser.io (não lida: bloqueada neste ambiente; existência de `llms.txt` **[confirmar]**).

## O que ficou igual (API estável — é onde o material de treino do modelo vale)

Scenes (`preload/create/update`, `scene.start/launch/switch`), Loader (`this.load.image/atlas/multiatlas/audio/json/tilemapTiledJSON/bitmapFont/aseprite/pack`), Input (`pointerdown/up/move`, `setInteractive`, drag, `activePointers`), Sound (`this.sound.add/play`, `locked`/`unlocked`, `pauseOnBlur`), ScaleManager (`FIT`, `CENTER_BOTH`, `RESIZE`, `EXPAND`), Arcade e Matter, Tweens, Timers, Groups/Containers, Cameras (propriedades), Tilemaps (`make.tilemap`, `createLayer`, `setCollision`), `DataManager`/`registry`. A README oficial: "the public API is mostly familiar - but under the hood, everything has changed".

## Mudanças que quebram código "estilo Phaser 3" (Migration Guide)

| Phaser 3 | Phaser 4 | Nota |
|---|---|---|
| Pipelines (`setPipeline`, pipelines custom) | `RenderNode`; registrar em `render.renderNodes` | nunca chame `gl.*` direto; use `Extern` |
| `preFX`/`postFX`, `BitmapMask`, `GeometryMask` (WebGL) | `obj.enableFilters(); obj.filters.internal/external.addBlur()…`; `filters.internal.addMask(obj)` | filtros em qualquer objeto ou câmera; cada filtro = framebuffer + draw call |
| `setTintFill(c)` | `setTint(c).setTintMode(Phaser.TintModes.FILL)` | modos: MULTIPLY, FILL, ADD, SCREEN, OVERLAY, HARD_LIGHT (+ MULTIPLY_TWO em 4.2) |
| `sprite.setPipeline('Light2D')` | `sprite.setLighting(true)`; luz com `z` explícito | lighting quebra batch |
| `Geom.Point` | `Phaser.Math.Vector2` (todas as `getPoint*` devolvem Vector2) | `instanceof Point` some |
| `Math.TAU` = π/2, `Math.PI2` = 2π | `Math.TAU` = **2π**; `Math.PI_OVER_2` = π/2; `PI2` removido | valor mudou em silêncio |
| `Phaser.Struct.Set/Map` | `Set`/`Map` nativos | `iterateLocal`, `contains`, `setAll` somem |
| `DynamicTexture.draw()` imediato | precisa `render()` ao final; `preserve()`, `capture()` | `RenderTexture.renderMode` |
| `Shader(scene, x, y, w, h, key)` | `ShaderQuadConfig`; uniforms Shadertoy não automáticos; GLSL com `#pragma` | coordenadas Y=0 embaixo |
| `roundPixels` padrão `true` | padrão **`false`**; só atua em objetos sem escala/rotação; `vertexRoundMode` por objeto | ver Pixel Art Guide abaixo |
| `Mesh`, `Plane`, Camera3D, Layer3D, `Create.GenerateTexture`, polyfills, `phaser-ie9` | removidos | `Mesh2D` (4.2) é outra coisa: triângulos texturizados 2D |
| Spine 3/4 embutidos | plug-in oficial da Esoteric: `@esotericsoftware/spine-phaser-v4` | ver seção Spine |
| Texturas comprimidas top-left | orientação GL (Y para cima): recomprima com "flip Y" | PNG/JPG não precisam |
| Canvas renderer | **deprecado** (ainda existe; sem filtros/GPU layers) | `Phaser.AUTO` cai nele sem WebGL |

Checklist completo com 27 itens: `node_modules/phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`. Skill dedicada para migrar: `node_modules/phaser/skills/v3-to-v4-migration/SKILL.md`.

## Config que importa para iPhone (nomes exatos de `Phaser.Types.Core.*` em `types/phaser.d.ts`)

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,                      // WEBGL sem fallback; HEADLESS só para testes
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390 * dpr, height: 844 * dpr, zoom: 1 / dpr },
  render: { roundPixels: true, antialias: true, powerPreference: 'high-performance', autoMobileTextures: true /* padrão */, stencil: true /* false economiza memória se não usar Stencil/Mask */ },
  input: { activePointers: 3, windowEvents: true },
  audio: { disableWebAudio: false },     // Web Audio; noAudio: true nos testes
  fps: { target: 60, smoothStep: true }, // target é informativo; limit só reduz
  seed: ['fixo-para-playtest'],          // Phaser.Math.RND determinístico
  banner: false,
  scene: [BootScene, PreloadScene, MenuScene, GameScene],
};
```

- `pixelArt: true` = `antialias:false` + `antialiasGL:false` + `roundPixels:true`; `smoothPixelArt: true` (novo, WebGL) para pixel art que escala/rotaciona (Pixel Art Guide: "usually the correct choice for retro graphics with big pixels").
- `autoMobileTextures` (padrão `true`): em iOS/Android o renderer usa **1 textura por batch** (`RenderNodeManager.maxParallelTextureUnits`), por isso tudo deve estar em um atlas — senão cada troca de textura quebra o batch.
- `render.stencil: false` (4.2) evita criar stencil buffer: menos memória de framebuffer se você não usa `Stencil`/máscaras.
- `skipUnreadyShaders: true` evita stutter na compilação de shaders (objetos "pipocam" até o shader ficar pronto).
- Pausa automática: `Game#onHidden` já chama `loop.pause()` e emite `PAUSE`; `onVisible` retoma. O `SoundManager` suspende o `AudioContext` em `blur` e retoma em `focus` (`pauseOnBlur: true`). Um `visibilitychange` próprio (como em `src/main.ts`, que chama `loop.sleep()/wake()`) é redundante, não errado — não duplique lógica de pausa de jogo dentro dele.

## Input por toque

- `this.input.on('pointerdown', (p) => …)` cobre toque e mouse; `p.wasTouch`, `p.id`, `pointer1..pointer10`; `activePointers` reserva slots (multi-toque).
- Fullscreen e desbloqueio de áudio: em touch, use **`pointerup`**, não `pointerdown` (skill `scale-and-responsive`, gotcha 4). Fullscreen API não existe no iPhone **[confirmar em webkit.org]** — a tela cheia real vem do PWA `standalone`.
- `touch-action: none` e `user-select: none` no contêiner (já em `index.html`); `disableContextMenu: true` se houver toque longo.
- Hit area ≥ 44×44 pt lógicos; `setInteractive({ pixelPerfect: true })` é caro — evite em mobile.

## Áudio

- O Phaser desbloqueia sozinho: `WebAudioSoundManager.unlock()` escuta `touchstart/touchend/mousedown/mouseup/keydown` em `document.body` e faz `context.resume()`; `this.sound.locked` fica `true` até lá e o evento `'unlocked'` dispara. Uma tela "toque para começar" continua sendo o padrão certo (garante gesto antes do primeiro `play`).
- iOS/Safari: sem `StereoPannerNode` (pan não soa); iOS 17/18+ interrompe áudio em background e o Phaser já faz `context.suspend()/resume()` no evento `VISIBLE` (skill `audio-and-sound`, "iOS/Safari Specifics").
- Formatos: `this.load.audio('k', ['k.m4a', 'k.ogg'])` — AAC/M4A para Safari, OGG para o resto; MP3 universal. `Phaser.Device.Audio` expõe `m4a`, `aac`, `ogg`, `opus`, `webm`, `webAudio`.
- Música longa: `audioSprite` para SFX curtos (um arquivo, JSON de marcadores); `instances` só importa em HTML5 Audio (fallback).

## Loader, atlas e texturas

- `atlas` (TexturePacker JSON Hash/Array), `multiatlas` (vários PNGs, um JSON), `aseprite`, `atlasXML`, `unityAtlas`, `spritesheet` (grade fixa), `texture` (**comprimidas**: `{ ASTC, PVRTC, ETC, S3TC, IMG }` em `.pvr`/`.ktx`; o Phaser escolhe pelo suporte do WebGL; iOS moderno = ASTC).
- WebP/AVIF são só formatos de download: na GPU todo PNG/WebP vira RGBA (≈ 4 MB por megapixel — Rendering Concepts). Memória de GPU só cai com textura comprimida (ASTC) ou menos pixels.
- "Phaser Compact Texture Atlas" (`.pct`, 4.0): descritor 90–95 % menor que JSON; útil para muitos atlases **[não testado aqui]**.
- `loader.localSchemes` inclui `file://` e `capacitor://` (sem CORS) — relevante para o empacotamento.
- Chaves duplicadas são ignoradas em silêncio; `this.textures.remove(key)` e `this.cache.audio.remove(key)` liberam memória ao trocar de fase.

## Tilemaps

- `this.load.tilemapTiledJSON` + `this.make.tilemap({ key })` + `map.addTilesetImage(nomeNoTiled, chaveDaTextura)` + `map.createLayer(nome, tileset, x, y, gpu?)`. Nomes têm de bater com o Tiled; tileset "collection of images" não é suportado; `setCollision` antes de colisores.
- `TilemapGPULayer` (último argumento `true`): camada inteira em 1 quad, custo por pixel, até 4096×4096 tiles, sem emendas; **só ortogonal, um tileset por camada**, edição exige `generateLayerDataTexture()`. É a escolha para mapas grandes no iPhone.
- Sprite Fusion exporta para Phaser segundo anúncio de ago/2026 (phaser.io/news) — formato exato **[confirmar]**; Tiled JSON é o caminho seguro.

## Spine, Box2D e plug-ins

- **Spine**: `@esotericsoftware/spine-phaser-v4` 4.3.13 (npm, 2026-10-10), `peerDependencies: { phaser: '^4.2.1' }`. Licença "Spine Runtimes License": cada usuário precisa de licença do Spine Editor (LICENSE lido em raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/LICENSE). Só vale se o brief pedir animação esquelética; para sprites gerados por IA, sprite sheets (`/animar-sprites`) são o caminho.
- **Phaser Box2D**: `phaser-box2d` 1.1.0, MIT, Phaser Studio (port JS do Box2D v3, < 70 KB min+gz, standalone com helpers para Phaser). Compatibilidade declarada com Phaser 4 **[confirmar: README não fixa versão]**. Arcade cobre o MVP; Matter já vem no pacote.
- **Plug-ins Rex** (rexrainbow): UI, FSM, etc.; verificar suporte a v4 caso a caso **[confirmar]**.
- **Phaser Editor v5 + MCP** (`@phaserjs/editor-mcp-server` 1.0.6, ISC): ferramentas `scene-get-screenshot`, `scene-add-game-objects`, tilemap editável, assets; o README recomenda "training levels" rotulados (uma camada por objeto) porque screenshot "may not always be sufficient for the LLM". Exige o Editor desktop rodando (licença/preço não lidos **[confirmar]**). Para este projeto, cenas em código + Tiled bastam; o MCP só se o jogo tiver muitas fases desenhadas à mão.
- **`npm create @phaserjs/game@latest`** (`@phaserjs/create-game` 1.3.2): templates oficiais (Vite + TS entre eles) e 3 demos. Este repositório já tem o esqueleto; use o template só como referência de estrutura.

## HEADLESS para testes

`type: Phaser.HEADLESS` (= 3): sem renderer, mas **exige DOM** ("DOM still required. For unit testing only"). O próprio Phaser testa assim com Vitest + jsdom (`node_modules/phaser/tests/TESTING.md`, `setup.js`, `helper.js`): mock de `Image` que dispara `onload` (senão o `TextureManager` nunca emite `READY`) e stub de `canvas.getContext('2d')` (o módulo chama `getContext` já ao ser importado). Reproduzido neste repositório em `tests/setup-phaser-headless.ts` + `tests/phaser-headless.test.ts` (4 testes, ~8 s). Detalhes em `testes-vitest-e-playwright.md`.

## Armadilhas específicas de agente

1. Modelo gera `this.load.spine`/`SpinePlugin` do Phaser 3 → não existe no 4; instalar o plug-in da Esoteric.
2. `scene.start()` é enfileirado (não síncrono); `pause()` só para o update (ainda renderiza); `switch()` dorme, `start()` desliga.
3. `update()` não roda durante `preload` (barras de progresso usam o evento `'progress'`).
4. `fps.target` não impõe nada; `fps.limit` só reduz. Medir com `game.loop.actualFps`.
5. `Phaser.WEBGL` sem fallback "falha em silêncio"; use `AUTO` e verifique `game.renderer.type` no canal de depuração.
6. Mutar `game.config` após boot não tem efeito; `ScaleManager` precisa de pai com tamanho (`#game` com `height: 100dvh`).
7. `Text` recria canvas e re-sobe textura a cada `setText` → HUD em `BitmapText`.
8. Tween com `loop: -1` nunca dispara `onComplete`; `repeat` ≠ `loop`.
9. `roundPixels` agora é `false` por padrão: pixel art borrada = ligar `pixelArt` (sem escala/rotação) ou `smoothPixelArt`.
10. `Math.TAU` mudou de valor: rotações "pela metade" vindas de código v3.

## Fontes

- `node_modules/phaser/README.md`, `CHANGELOG.md`, `changelog/v4/**` (4.0.0, 4.1.0, 4.2.0, 4.2.1, MIGRATION-GUIDE) — phaser@4.2.1, lidos em 2026-10-10. Público: https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md
- Skills oficiais: `node_modules/phaser/skills/{game-setup-and-config,scale-and-responsive,input-keyboard-mouse-touch,audio-and-sound,loading-assets,tilemaps,scenes,tweens,time-and-timers,text-and-bitmaptext,v4-new-features,v3-to-v4-migration}/SKILL.md` — https://github.com/phaserjs/phaser/tree/master/skills
- Guias: `node_modules/phaser/docs/Phaser 4 Pixel Art Guide/…md`, `…/Phaser 4 Rendering Concepts/…md`, `…/WebGL Compressed Textures/…md`
- Código: `src/core/Game.js` (`onHidden`/`onVisible`), `src/sound/webaudio/WebAudioSoundManager.js` (`unlock`, `onBlur`/`onFocus`), `src/renderer/webgl/renderNodes/RenderNodeManager.js` (`maxParallelTextureUnits`), `src/dom/GetInnerHeight.js` (contorno do iOS)
- npm (2026-10-10): `npm view phaser time`, `npm view @esotericsoftware/spine-phaser-v4`, `npm view phaser-box2d`, `npm view @phaserjs/editor-mcp-server`, `npm view @phaserjs/create-game`
- Spine Runtimes License: https://github.com/EsotericSoftware/spine-runtimes/blob/4.3/LICENSE ; Phaser Box2D: https://github.com/phaserjs/phaser-box2d ; Editor MCP: https://github.com/phaserjs/editor-mcp-server ; create-game: https://github.com/phaserjs/create-game
- Sprite Fusion → Phaser (anúncio): https://phaser.io/news/2026/08/sprite-fusion-tilemap-editor-phaser [não lido nesta sessão]
