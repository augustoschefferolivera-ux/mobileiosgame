// Cena Vigilia (ADR-0002 §3 e §11.1): driver do passo fixo e câmera do mundo.
// Escuta Phaser.Core.Events.STEP (antes dos update() das cenas), traduz os
// toques do frame, soma o delta bruto do rAF e roda no máximo 5 passos por
// frame. No update(), centra a câmera no jogador interpolado e sincroniza o
// render do mundo.
import Phaser from 'phaser';
import { alfa, criarAcumulador } from '../logica/nucleo/acumulador';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../logica/nucleo/comandos';
import { rodarFrame } from '../logica/nucleo/driver';
import { criarEstado } from '../logica/nucleo/estado';
import { medirSafeArea } from '../plataforma/safeArea';
import { criarDadosDaVigilia } from '../logica/mundo/dados';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import { COR, cameraLogica } from './estilo';
import { centroDaCamera } from './render/camera';
import { RenderPorImagem, type RenderDoMundo } from './render/mundo';

export class Vigilia extends Phaser.Scene {
  private sim: Simulacao | null = null;
  private render: RenderDoMundo | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Vigilia' });
  }

  create(): void {
    cameraLogica(this);
    this.cameras.main.setBackgroundColor(COR.fundo);
    const dados = criarDadosDaVigilia(charneca, vigilantes.vigilantes[0]!);
    const comandosAoVivo = criarComandos();
    this.sim = {
      estado: criarEstado(this.ctx.seed, dados),
      dados,
      acumulador: criarAcumulador(),
      comandosAoVivo,
      fonte: this.ctx.roteiro ? fonteDoRoteiro(this.ctx.roteiro) : fonteConstante(comandosAoVivo),
      camera: { x: dados.inicioX, y: dados.inicioY },
      pausada: false,
    };
    this.render = new RenderPorImagem(this, dados);
    this.ctx.simulacao = this.sim;
    this.ctx.tela = 'VIGILIA';
    // Toques de antes da Vigília (o de Acender) ficam de fora: só um toque novo cria o joystick.
    const { fila, tradutor } = this.ctx.entrada;
    fila.reiniciar();
    tradutor.reiniciar();
    tradutor.definirArea(medirSafeArea(this.ctx.sonda, this.game.canvas, this.ctx.container, this.ctx.insets));
    this.game.events.on(Phaser.Core.Events.STEP, this.aoStep, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.STEP, this.aoStep, this);
      fila.ativa = false;
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
    if (!sim) return;
    // Uma tradução por frame; ao vivo, o vetor vale para todos os passos do frame (design/decisoes-F-002.md §4).
    this.ctx.entrada.tradutor.traduzir(this.ctx.entrada.fila, sim.comandosAoVivo);
    if (sim.pausada) return;
    rodarFrame(sim.estado, sim.dados, sim.acumulador, this.game.loop.rawDelta, sim.fonte);
  }

  override update(): void {
    const sim = this.sim;
    if (!sim || !this.render) return;
    const a = alfa(sim.acumulador);
    centroDaCamera(sim.estado, a, sim.camera);
    this.render.sincronizar(sim.estado, a, sim.camera.x, sim.camera.y);
    this.cameras.main.centerOn(sim.camera.x, sim.camera.y);
  }
}
