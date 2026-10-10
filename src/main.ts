import Phaser from 'phaser';
import './debug';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

// Resolução lógica de iPhone em retrato; DPR limitado a 2 para poupar memória de GPU no Safari.
const LOGICAL_WIDTH = 390;
const LOGICAL_HEIGHT = 844;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101418',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH * dpr,
    height: LOGICAL_HEIGHT * dpr,
    zoom: 1 / dpr,
  },
  // RNG determinístico quando o playtest injeta window.__GAME_SEED__ (scripts/playtest.mjs --seed).
  seed: window.__GAME_SEED__ ? [String(window.__GAME_SEED__)] : undefined,
  input: { activePointers: 3 },
  audio: { disableWebAudio: false },
  render: { roundPixels: true, antialias: true },
  scene: [BootScene, PreloadScene, MenuScene, GameScene],
};

// O Phaser 4 já pausa o loop e suspende/retoma o AudioContext quando a aba sai de foco
// (Game#onHidden / WebAudioSoundManager); não duplique esse gerenciamento aqui.
new Phaser.Game(config);
