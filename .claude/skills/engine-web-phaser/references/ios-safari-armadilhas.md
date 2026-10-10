# Safari iOS para jogos canvas: configuração e armadilhas

## HTML base

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
  <style>
    html, body { margin:0; height:100dvh; background:#000; overflow:hidden; overscroll-behavior:none; }
    #game { width:100%; height:100%; touch-action:none; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
    .safe { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  </style>
</head>
<body><div id="game"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

## Phaser: configuração mobile

```ts
import Phaser from 'phaser';
const dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR 3 estoura memória de GPU

export const game = new Phaser.Game({
  type: Phaser.AUTO,           // WebGL com fallback Canvas
  parent: 'game',
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  render: { antialias: false, pixelArt: true, roundPixels: true, powerPreference: 'high-performance' },
  input: { activePointers: 3, touch: { capture: true } },
  audio: { disableWebAudio: false },
  fps: { target: 60, forceSetTimeOut: false },
  scene: [Boot, Preload, Menu, GameScene],
});
```

- `width/height` são a resolução lógica; para nitidez em DPR 2 use `zoom: 1 / dpr` com `width: 390 * dpr`? Não — prefira manter a lógica em 390×844 e deixar `Scale.FIT`; só suba a resolução lógica se o texto ficar borrado, medindo memória.
- PixiJS equivalente: `new Application({ resizeTo: window, resolution: dpr, autoDensity: true, antialias: false })`.

## Input

- Eventos `pointerdown/pointermove/pointerup` do Phaser (`this.input.on('pointerdown', …)`); nunca `mousedown`.
- Multitouch: `activePointers: 3` e `pointer.id`.
- Bloqueie gestos do navegador: `touch-action: none` no canvas; `event.preventDefault()` em `touchmove` no `document` com `{ passive: false }` se o Phaser não cobrir.
- Botões virtuais ≥ 44×44 pt (HIG); teste com `page.tap(x, y)` no Playwright.

## Áudio

- iOS exige gesto: tela "Toque para começar" → `this.sound.unlock()` ou `(this.sound as Phaser.Sound.WebAudioSoundManager).context.resume()`.
- Volte do background: em `document.visibilitychange` chame `context.resume()`; pause o jogo quando `hidden`.
- Formatos: `.m4a` (AAC) e `.mp3` tocam no Safari; `.ogg` não — carregue `[ 'audio.m4a', 'audio.ogg' ]` e deixe o Phaser escolher.
- Botão de silêncio físico não silencia Web Audio; ofereça botão de mute no jogo.

## Vida do app

- `visibilitychange` → `game.loop.sleep()`/`wake()`; salve estado em `localStorage` ao esconder.
- Safari pode recarregar a aba por memória: carregue estado salvo no boot.
- `100vh` erra com a barra inferior; use `100dvh`.

## Performance

- Meta: 60 fps em iPhone de ~4 anos; mede-se com `game.loop.actualFps` no canal de debug (`window.__GAME_DEBUG__.fps`).
- Atlas em vez de PNGs soltos; texturas ≤ 2048²; `multiatlas` se precisar.
- Pool de objetos (`this.add.group({ classType, maxSize })`); nada de `new` por frame; `setDepth` fixo; evite `Graphics` redesenhado por frame.
- Fontes bitmap (`BitmapText`) em vez de `Text` dinâmico com muitas mudanças.
- Sem pós-processamento/shader pesado no Safari; filtros do PixiJS também custam.
- Build: `vite build` com `target: 'es2020'`, assets com hash; sirva `gzip/brotli`.

## Canal de depuração (`src/debug.ts`)

```ts
export const debugState = { scene: 'boot', score: 0, fps: 0, frame: 0, lastEvent: 'launch', errors: [] as string[] };
(window as any).__GAME_DEBUG__ = debugState;
window.addEventListener('error', e => debugState.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', e => debugState.errors.push(String((e as PromiseRejectionEvent).reason)));
export function tick(game: Phaser.Game) { debugState.frame++; debugState.fps = Math.round(game.loop.actualFps); }
```

Chame `tick(game)` em `update()` da cena ativa e `debugState.scene = 'game'` em `create()`.
