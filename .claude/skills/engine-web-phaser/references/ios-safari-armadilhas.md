# Safari iOS para jogos canvas: configuração base e armadilhas (Phaser 4.2.1)

Receita aplicada em `index.html` e `src/main.ts` deste repositório; cada item diz de onde vem o fato. O que o WebKit do Playwright não reproduz (áudio real, barra inferior, memória) é validado no iPhone a cada milestone.

## HTML base

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#101418">
  <meta name="description" content="…">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <style>
    html, body { margin:0; height:100dvh; background:#101418; overflow:hidden; overscroll-behavior:none; }
    #game { width:100%; height:100dvh; touch-action:none; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
    canvas { display:block; }
  </style>
</head>
<body><div id="game"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

- `#game` com altura definida é obrigatório: o `ScaleManager` precisa de pai com dimensões (`expandParent: true` ajuda, mas não substitui); `100dvh` acompanha as barras do Safari; o Phaser ainda corrige o `innerHeight` do iOS medindo um `div` de `100vh` (`src/dom/GetInnerHeight.js`).
- Não estilize o `<canvas>` diretamente (o ScaleManager controla `style.width/height/margin`).

## Phaser: configuração mobile (`src/main.ts`)

```ts
import Phaser from 'phaser';
const dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR 3 dos iPhones Pro dobra os pixels por frame

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,                           // WebGL; Canvas (deprecado no v4) só como fallback
  parent: 'game',
  backgroundColor: '#101418',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390 * dpr, height: 844 * dpr, zoom: 1 / dpr },
  render: { roundPixels: true, antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 3 },
  audio: { disableWebAudio: false },
  fps: { target: 60, smoothStep: true },
  seed: window.__GAME_SEED__ ? [window.__GAME_SEED__] : undefined, // opcional: playtest determinístico (--seed)
  banner: false,
  scene: [BootScene, PreloadScene, MenuScene, GameScene],
};
export const game = new Phaser.Game(config);
```

- **Resolução lógica é `390*dpr × 844*dpr`** (780×1688 em DPR ≥ 2, 390×844 em DPR 1). Consequência: toda posição no jogo deriva de `this.scale.width/height`, nunca de número fixo. Alternativa mais simples (menos nítida em texto): `width: 390, height: 844` sem `zoom`.
- `roundPixels` é `false` por padrão no v4 e só atua em objetos sem escala/rotação; para pixel art use `pixelArt: true` ou `smoothPixelArt: true` (guia de pixel art do Phaser 4).
- `autoMobileTextures` (padrão `true`) limita a 1 textura por batch em iOS/Android → tudo em atlas.
- `fps.target` é informativo; `fps.limit` só reduz. Meça com `game.loop.actualFps`.

## Input

- `this.input.on('pointerdown' | 'pointerup' | 'pointermove', …)`; nunca `mousedown`/`touchstart` diretos. `pointer.id`, `pointer.wasTouch`; `activePointers: 3` dá multitoque.
- Fullscreen e tudo que exige gesto do usuário: em touch, no **`pointerup`** (gotcha oficial do Phaser).
- Alvos ≥ 44×44 pt; teste com `--taps-game` (coordenadas do jogo) em `scripts/playtest.mjs`.
- Bloqueio de gestos do navegador: `touch-action: none` no `#game`; se ainda houver scroll/zoom, `document.addEventListener('touchmove', e => e.preventDefault(), { passive: false })`.

## Áudio

- O Phaser desbloqueia o `AudioContext` no primeiro `touchstart/touchend/mousedown/mouseup/keydown` em `document.body` (`WebAudioSoundManager.unlock`); `this.sound.locked` → `false` e evento `'unlocked'`. A tela "toque para começar" garante que o primeiro `play` vem depois do gesto; `this.sound.unlock()` explícito (como em `MenuScene`) é inofensivo.
- Background: `pauseOnBlur: true` (padrão) suspende o contexto em `blur` e retoma em `focus`; o Phaser também trata interrupção do iOS 17/18+ no evento `VISIBLE`. Não reimplemente.
- Formatos: `this.load.audio('k', ['k.m4a', 'k.ogg'])`; `Phaser.Device.Audio.m4a/ogg/opus` diz o que toca. Sem `StereoPannerNode` no iOS (pan não soa).
- Botão de silêncio físico não cala Web Audio → botão de mute no jogo (`this.sound.mute = true`).

## Ciclo de vida

- Aba/app escondido: `Game#onHidden` → `loop.pause()` + evento `Phaser.Core.Events.PAUSE`; de volta: `loop.resume()` + `RESUME` com a duração da pausa. Ouça esses eventos para pausar cronômetros de gameplay e exibir "pausado". (`src/main.ts` ainda chama `loop.sleep()/wake()` em `visibilitychange`: redundante com o acima; pode ser removido numa feature de limpeza.)
- Safari pode descartar a página por memória: salve progresso em `localStorage` a cada marco e restaure no `BootScene`; `vite:preloadError` → `location.reload()`.
- Contexto WebGL perdido: o renderer v4 trata `webglcontextlost/restored`; texturas voltam, estado de jogo é seu.

## Performance (resumo; detalhes em `performance-e-memoria-mobile.md`)

- 60 fps em iPhone de ~4 anos; `__GAME_DEBUG__.fps` no emulador ≥ 50.
- Atlas ≤ 2048², `BitmapText` no HUD, pooling com `Group`, zero `new` em `update`, sem filtros no MVP, `TilemapGPULayer`/`SpriteGPULayer` para camadas estáticas grandes.
- Build: chunk do Phaser separado (`vite.config.ts`), Brotli no servidor, assets por fase.

## Canal de depuração (`src/debug.ts`)

`window.__GAME_DEBUG__ = { scene, score, fps, frame, lastEvent, errors[], build }` + `tick(game, sceneKey)` no `update()` de cada cena e `event(nome)` nas ações. Toda feature acrescenta ali os campos que o critério de aceite precisa (ex.: `soundUnlocked`, `fase`, `inimigosVivos`). É o que `scripts/playtest.mjs` grava em `state.json`.

## Fontes

- `node_modules/phaser/src/dom/GetInnerHeight.js`, `src/scale/ScaleManager.js` (`parentIsWindow && device.os.iOS`), `src/core/Game.js` (`onHidden/onVisible/onBlur/onFocus`), `src/sound/webaudio/WebAudioSoundManager.js` (`unlock`, `onBlur/onFocus`), `src/renderer/webgl/renderNodes/RenderNodeManager.js` (`maxParallelTextureUnits`) — phaser@4.2.1, 2026-10-10
- Skills oficiais `node_modules/phaser/skills/{scale-and-responsive,input-keyboard-mouse-touch,audio-and-sound,game-setup-and-config}/SKILL.md`; `docs/Phaser 4 Pixel Art Guide`
- Comportamentos do Safari não cobertos pelo código do Phaser (barras, memória, ITP): validar em https://webkit.org/blog/ e https://developer.apple.com/documentation/safari-release-notes [não lidos nesta sessão]
