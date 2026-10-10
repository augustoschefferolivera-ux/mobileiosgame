import Phaser from 'phaser';
import { debug, event, tick } from '../debug';

// Cena mínima da fase 3: existe para provar o loop construir → rodar → ver → ler log.
// A mecânica real entra pela primeira feature do brief (/ciclo-de-feature).
export class GameScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private alvo!: Phaser.GameObjects.Arc;

  constructor() {
    super('game');
  }

  create(): void {
    debug.scene = 'game';
    debug.score = 0;
    const { width, height } = this.scale;

    this.scoreText = this.add
      .text(width / 2, 96, '0', { fontFamily: 'system-ui, sans-serif', fontSize: '56px', color: '#e8eef4' })
      .setOrigin(0.5);

    this.alvo = this.add.circle(width / 2, height / 2, 72, 0x4fc3f7).setInteractive({ useHandCursor: false });
    this.alvo.on('pointerdown', () => {
      debug.score += 1;
      this.scoreText.setText(String(debug.score));
      event('game:tap');
      this.alvo.setPosition(
        Phaser.Math.Between(96, width - 96),
        Phaser.Math.Between(192, height - 160),
      );
    });
  }

  update(): void {
    tick(this.game, 'game');
  }
}
