import Phaser from 'phaser';
import { debug, event, tick } from '../debug';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    debug.scene = 'menu';
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.42, 'JOGO', { fontFamily: 'system-ui, sans-serif', fontSize: '64px', color: '#e8eef4' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.55, 'Toque para começar', { fontFamily: 'system-ui, sans-serif', fontSize: '28px', color: '#9fb3c8' })
      .setOrigin(0.5);

    // Primeiro gesto do usuário: desbloqueia o áudio no Safari iOS antes de qualquer som.
    this.input.once('pointerdown', () => {
      this.sound.unlock();
      event('menu:start');
      this.scene.start('game');
    });
  }

  update(): void {
    tick(this.game, 'menu');
  }
}
