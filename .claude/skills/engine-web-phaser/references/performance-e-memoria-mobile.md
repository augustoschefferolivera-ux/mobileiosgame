# Performance e memória no Safari do iPhone (Phaser 4.2.1)

Orçamento de referência deste projeto (ajuste pelo brief; o subagente `engenheiro-de-performance` usa os mesmos números):

| Métrica | Orçamento | Como medir |
|---|---|---|
| FPS | 60 estáveis em iPhone de ~4 anos; ≥ 50 no emulador Playwright | `__GAME_DEBUG__.fps` (`game.loop.actualFps`); Safari real por milestone |
| Bundle inicial (JS) | ≤ ~2 MB bruto / ≤ ~500 KB gzip; Phaser sozinho = 1.374 KB / 357 KB gzip (medido, `vite build` 2026-10-10) | saída do `vite build`; `gzip -9c dist/assets/*.js \| wc -c` |
| Texturas residentes por cena | ≤ 64 MB estimados (4 MB por megapixel RGBA; 2048² = 16 MB; ×2 em sistema+GPU) | planilha de atlases (`/atlas-e-exportacao-2d-mobile`) |
| Heap JS | < ~300 MB no Safari (heurística; Safari recarrega abas pesadas) | Web Inspector no Mac; Chromium via CDP no CI |
| Draw calls | "não mais que algumas centenas" (Rendering Concepts) | contar batches: trocas de textura/shader/blend |
| DPR | ≤ 2 (`Math.min(devicePixelRatio, 2)`) | `state.json.canvasSize` (780×1688 no iPhone emulado) |
| Primeiro frame | < 3 s em 4G [meta deste banco] | `preview.log` + `load.on('complete')` no debug |

## 1. O que custa, segundo o renderer do Phaser 4 (`docs/Phaser 4 Rendering Concepts`)

- "The GPU is very fast, but sending commands back and forth is not." Draw calls e **upload de buffer** são o gargalo, não o número de pixels (exceto fill-rate).
- Um batch quebra quando muda: textura (além do limite de unidades; **1 em mobile** por `autoMobileTextures`), shader (lighting, `smoothPixelArt` por textura, round pixels diferente), blend mode, filtro. Objetos "Stand Alone Render" (`Graphics` complexo, `Shader`, `Text` com filtros) custam 1 draw call cada.
- `Text` sobe uma textura nova a cada `setText`; `BitmapText` só altera vértices.
- Filtros e `DynamicTexture`/`RenderTexture` = framebuffer extra (textura + anexos) + draw calls; framebuffers ociosos são liberados, mas o pico conta.
- `SpriteGPULayer` (milhões de quads estáticos, 168 B por membro em CPU e GPU) e `TilemapGPULayer` (mapa inteiro em 1 quad, custo por pixel) trocam memória e interatividade por FPS: ideais para fundos/parallax e mapas grandes no iPhone.
- Texturas: "assume 4 MB per megapixel"; mipmap +33 %; o formato de download (PNG/WebP/JPG) **não** muda a memória de GPU — só ASTC/PVRTC (texturas comprimidas) mudam.

## 2. Receita de configuração (já aplicada em `src/main.ts`, com o porquê)

- `scale: { mode: FIT, width: 390*dpr, height: 844*dpr, zoom: 1/dpr }` com `dpr = min(devicePixelRatio, 2)`: nitidez em telas Retina sem canvas DPR 3 (iPhone Pro = 1179×2556 → com DPR 3 seriam ~3 M pixels por frame; com 2, ~1,3 M). Se a legibilidade for suficiente em 390×844 lógico (jogos de cartas, puzzles com arte grande), use DPR 1 e ganhe fill-rate.
- `render.roundPixels: true` só em pixel art sem rotação; `antialias: true` para arte HD. Não misture `smoothPixelArt` por textura (quebra batch).
- `render.stencil: false` se não usar `Stencil`/máscaras (4.2: "saving memory").
- `render.skipUnreadyShaders: true` quando houver filtros/lighting: evita travada na primeira compilação.
- `fps.smoothStep: true` (padrão) e **nunca** `forceSetTimeOut`.
- `audio: { disableWebAudio: false }`; SFX curtos pré-carregados; música em `.m4a` 96–128 kbps.

## 3. Checklist por feature (o que o `engenheiro-de-performance` cobra)

1. **Tudo em atlas** (≤ 2048² cada; `multiatlas` se precisar de mais). Zero `this.load.image` solto fora do Boot. Padding ≥ 1 px (2 px recomendado) para não sangrar com filtragem linear.
2. **Zero alocação em `update()`**: sem `new`, sem closures, sem `array.filter/map` por frame, sem `Phaser.Geom.*` criado por frame — reutilize `Vector2`/objetos de trabalho criados em `create()`.
3. **Pooling** com `this.add.group({ classType, maxSize, defaultKey })` + `get()`/`killAndHide()`; partículas com `maxParticles`; nunca `destroy()` + recriar por frame.
4. **HUD em `BitmapText`**; `Text` só para texto raro (diálogo, menus) e com `setText` esporádico.
5. **Sem filtros em mobile** no MVP (Blur, Glow, Bloom, Shadow). Se o brief exigir, aplique em **uma** câmera/contêiner, não por objeto, e meça.
6. **Camadas estáticas** (fundo, parallax, mapa) em `SpriteGPULayer`/`TilemapGPULayer`/`DynamicTexture` pré-renderizada; só o que muda fica em sprites normais.
7. **Lógica fora do frame**: cálculos pesados (geração procedural, pathfinding) em `preload`/entre fases ou em Web Worker; nunca no `update`.
8. **Áudio**: `audioSprite` para SFX; `this.sound.removeByKey` ao sair da fase; não decodificar áudio por frame.
9. **Descarregar ao trocar de fase**: `this.textures.remove(key)`, `this.cache.audio.remove(key)`, `scene.stop()` das cenas que não voltam; `Scene#shutdown` limpa listeners e arrays.
10. **Medir antes e depois** e gravar em `production/perf/<data>.md` (fps médio/mínimo em 30 s, tamanho do bundle, atlases por cena).

## 4. Memória no iOS: o que se sabe e o que confirmar

- Phaser contorna o `innerHeight` errado do iOS quando o pai é a janela (`GetInnerHeight`: mede um `div` com `100vh`); por isso `#game` com `height: 100dvh` + `viewport-fit=cover` em `index.html` (receita em `ios-safari-armadilhas.md`).
- Safari mata a aba/PWA que passa do orçamento de memória do processo (valor não documentado publicamente; varia por modelo) **[confirmar em webkit.org]**. Sintomas: recarga ao voltar do background, tela branca. Mitigação: DPR ≤ 2, texturas comprimidas ou menos megapixels, descarregar entre fases, salvar progresso em `localStorage` a cada mudança relevante e restaurar no boot.
- Contexto WebGL perdido (`webglcontextlost`): o renderer v4 "handles context loss gracefully" e expõe `dispatchContextLost` (CHANGELOG 4.0); teste restaurando (Chrome DevTools → Rendering → "Emulate WebGL context loss") **[não testado aqui]**.
- `performance.memory`/`measureUserAgentSpecificMemory` não existem no Safari; use o Web Inspector (Mac) ou o canal de depuração com contadores próprios (sprites ativos, texturas carregadas: `this.textures.list` length).

## 5. Bundle e carregamento

- Vite 8 (Rolldown): `build.rolldownOptions.output.codeSplitting.groups` separa o Phaser em chunk próprio (configurado em `vite.config.ts`; `rollupOptions`/`manualChunks` são alias deprecado). O chunk `phaser-<hash>.js` só muda quando a versão muda → o service worker e o cache HTTP reaproveitam entre releases do jogo.
- `build.chunkSizeWarningLimit: 1500` silencia o aviso de 500 kB que o Phaser sempre dispara; **não** é licença para o código do jogo crescer: o chunk `index-*.js` (seu código) deve ficar em dezenas de KB.
- Minificador padrão do Vite 8 é `oxc`; `--target baseline-widely-available` (padrão) já cobre o Safari atual; o `tsconfig` alveja ES2022.
- Compressão: servir `br` (Brotli) ou `gzip` — Cloudflare Pages/Vercel fazem automaticamente; GitHub Pages serve gzip **[confirmar]**. Texturas `.pvr/.ktx` (ASTC) **beneficiam** de Brotli (não são comprimidas por dentro); PNG/WebP/M4A não.
- Carregamento progressivo: `BootScene` carrega só o atlas do menu + fonte bitmap; `PreloadScene` da fase carrega o resto com barra de progresso real (`this.load.on('progress')`); fases seguintes via `this.load.pack` por fase e `this.load.start()` fora do `preload`.
- Ícone/splash: `apple-touch-icon` 180×180 e `manifest` com 192/512 (ver `pwa-e-distribuicao.md`).

## 6. Diagnóstico rápido (bissecção)

Sintoma → suspeito → prova:

- FPS cai com muitos inimigos → alocação/`Text` por frame ou batches quebrados → desligue o HUD; conte `this.children.list.length`; grep `new ` em `update`.
- FPS cai ao abrir menu → filtro/`Graphics` redesenhado → troque por imagem do atlas.
- Travada de 100–300 ms na primeira ação → shader compilando ou áudio decodificando → `skipUnreadyShaders`, decodificar no Preload.
- Memória sobe por fase → texturas/áudio não removidos, listeners acumulados → `textures.list`, `sound.getAll().length` no debug.
- Chromium headless do CI mostra fps 57–59 e "software WebGL" → ambiente sem GPU; compare só tendência, não valor absoluto.

## Fontes

- `node_modules/phaser/docs/Phaser 4 Rendering Concepts/Phaser 4 Rendering Concepts.md` — "Performance Cheat Sheet", "Efficient Rendering with Batching", "Buffer Memory Usage" (lido em 2026-10-10)
- `node_modules/phaser/docs/Phaser 4 Pixel Art Guide/…` e `docs/WebGL Compressed Textures/…` (ASTC para iOS moderno; PVRTC para iOS antigo; Brotli em `.pvr/.ktx`)
- `node_modules/phaser/changelog/v4/4.2/CHANGELOG-v4.2.0.md` (`render.stencil`, `setFPSLimit`), `4.0/CHANGELOG-v4.0.0.md` (context loss, `roundPixels` padrão false, WebGL2)
- `node_modules/phaser/src/renderer/webgl/renderNodes/RenderNodeManager.js:140` (`maxParallelTextureUnits = 1` em mobile), `src/dom/GetInnerHeight.js`
- Skills oficiais: `groups-and-containers` (pooling), `text-and-bitmaptext` (gotcha 14), `filters-and-postfx`, `particles`
- Vite 8.3.4: `npx vite build --help` (target/minify padrão), `node_modules/vite/dist/node/index.d.ts` (`rolldownOptions`, `chunkSizeWarningLimit`), docs `guide/build.md` (codeSplitting): https://github.com/vitejs/vite/blob/main/docs/guide/build.md
- Medições deste repositório (2026-10-10): `vite build` → `phaser-*.js` 1.374,10 kB / 357,33 kB gzip; `index-*.js` 2,73 kB; playtest Chromium `fps: 59`
- Subagente `.claude/agents/engenheiro-de-performance.md` (orçamentos e procedimento)
