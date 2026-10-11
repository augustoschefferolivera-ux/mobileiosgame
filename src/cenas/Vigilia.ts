// Cena Vigilia (ADR-0002 §3 e §11.1): driver do passo fixo. Escuta
// Phaser.Core.Events.STEP (antes dos update() das cenas), soma o delta bruto do
// rAF e roda no máximo 5 passos por frame. Na F-001 ainda não há mundo para
// desenhar: o jogador entra na F-002.
import Phaser from 'phaser';
import { criarAcumulador } from '../logica/nucleo/acumulador';
import { rodarFrame } from '../logica/nucleo/driver';
import { criarEstado } from '../logica/nucleo/estado';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import { COR, cameraLogica } from './estilo';

export class Vigilia extends Phaser.Scene {
  private sim: Simulacao | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Vigilia' });
  }

  create(): void {
    cameraLogica(this);
    this.cameras.main.setBackgroundColor(COR.fundo);
    this.sim = { estado: criarEstado(this.ctx.seed), acumulador: criarAcumulador(), pausada: false };
    this.ctx.simulacao = this.sim;
    this.ctx.tela = 'VIGILIA';
    this.game.events.on(Phaser.Core.Events.STEP, this.aoStep, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.STEP, this.aoStep, this);
    });
    // MVP: Ciclo I, Maldição 0, sem Relíquias; a árvore comprada entra com o save meta (F-010).
    this.ctx.telemetria.registrar('vigilia_inicio', 0, {
      personagem: vigilantes.vigilantes[0]!.id,
      mapa: charneca.id,
      ciclo: 1,
      maldicao: 0,
      reliquias: [],
      arvore_pct: 0,
    });
  }

  private aoStep(): void {
    const sim = this.sim;
    if (!sim || sim.pausada) return;
    rodarFrame(sim.estado, sim.acumulador, this.game.loop.rawDelta);
  }
}
