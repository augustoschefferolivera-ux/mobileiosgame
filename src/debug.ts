// Canal de depuração lido pelo Playwright (scripts/playtest.mjs) e por humanos no console.
// Regra do framework: o agente só confia no que consegue ler daqui, do console e do screenshot.
export interface GameDebug {
  scene: string;
  score: number;
  fps: number;
  frame: number;
  lastEvent: string;
  errors: string[];
  build: string;
}

declare global {
  interface Window {
    __GAME_DEBUG__: GameDebug;
    /** Semente opcional injetada pelo playtest (`--seed`) para RNG determinístico do Phaser. */
    __GAME_SEED__?: string;
  }
}

export const debug: GameDebug = {
  scene: 'boot',
  score: 0,
  fps: 0,
  frame: 0,
  lastEvent: 'init',
  errors: [],
  build: import.meta.env.MODE,
};

window.__GAME_DEBUG__ = debug;
window.addEventListener('error', (e) => debug.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => debug.errors.push(String((e as PromiseRejectionEvent).reason)));

export function tick(game: Phaser.Game, sceneKey: string): void {
  debug.frame += 1;
  debug.fps = Math.round(game.loop.actualFps);
  debug.scene = sceneKey;
}

export function event(name: string): void {
  debug.lastEvent = name;
}
