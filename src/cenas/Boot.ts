// Cena Boot (ADR-0002 §11.1): gera o atlas e passa para a Tela de Acender.
// Desde a F-006, também sintetiza os 3 sons placeholder (decisoes-F-006 RE12).
import Phaser from 'phaser';
import type { ContextoDoJogo } from './contexto';
import { gerarAtlas } from './render/atlas';
import { criarReprodutorDeSfx } from './sfxDoJogo';

export class Boot extends Phaser.Scene {
  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Boot' });
  }

  create(): void {
    this.ctx.tela = 'BOOT';
    gerarAtlas(this.textures);
    this.ctx.sfx = criarReprodutorDeSfx(this.sound);
    this.scene.start('Acender');
  }
}
