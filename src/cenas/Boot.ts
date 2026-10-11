// Cena Boot (ADR-0002 §11.1). Na F-001 só passa para a Tela de Acender; o
// atlas e os SFX sintetizados entram com as features que os usam.
import Phaser from 'phaser';
import type { ContextoDoJogo } from './contexto';

export class Boot extends Phaser.Scene {
  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Boot' });
  }

  create(): void {
    this.ctx.tela = 'BOOT';
    this.scene.start('Acender');
  }
}
