import Phaser from 'phaser';
import { debug } from '../debug';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    debug.scene = 'boot';
    this.scene.start('preload');
  }
}
