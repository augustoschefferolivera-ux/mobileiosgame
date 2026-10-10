import Phaser from 'phaser';
import { debug } from '../debug';

// Ainda sem assets: os atlases entram pela skill /atlas-e-exportacao-2d-mobile (fase 6).
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  create(): void {
    debug.scene = 'preload';
    this.scene.start('menu');
  }
}
