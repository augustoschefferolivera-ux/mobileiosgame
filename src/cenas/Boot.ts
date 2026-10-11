// Cena Boot (ADR-0002 §11.1): gera o atlas e passa para a Tela de Acender.
// Os SFX sintetizados entram com as features que os usam.
import Phaser from 'phaser';
import type { ContextoDoJogo } from './contexto';
import { gerarAtlas } from './render/atlas';

export class Boot extends Phaser.Scene {
  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Boot' });
  }

  create(): void {
    this.ctx.tela = 'BOOT';
    gerarAtlas(this.textures);
    this.scene.start('Acender');
  }
}
