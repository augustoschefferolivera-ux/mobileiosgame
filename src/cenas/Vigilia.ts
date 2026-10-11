// Cena Vigilia (ADR-0002 §3 e §11.1): driver do passo fixo e câmera do mundo.
// Escuta Phaser.Core.Events.STEP (antes dos update() das cenas), traduz os
// toques do frame, soma o delta bruto do rAF e roda no máximo 5 passos por
// frame. No update(), centra a câmera no jogador interpolado e sincroniza o
// render do mundo, com a horda no SpriteGPULayer ou no plano B
// (design/decisoes-F-003.md §7). A cena Hud roda por cima. Mede a CPU do
// frame de PRE_STEP a POST_RENDER (ADR-0002 §14).
import Phaser from 'phaser';
import { alfa, criarAcumulador } from '../logica/nucleo/acumulador';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../logica/nucleo/comandos';
import { rodarFrameComPausas } from '../logica/nucleo/driver';
import { TODOS_OS_TUTORIAIS, criarEstado, type ParametrosDaVigilia } from '../logica/nucleo/estado';
import { verificarNaN } from '../logica/nucleo/nan';
import { criarDadosDaCharneca } from '../plataforma/dadosDaVigilia';
import inimigos from '../dados/inimigos.json';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import type { Pausa } from './Pausa';
import { COR, cameraLogica } from './estilo';
import { centroDaCamera } from './render/camera';
import { criarCamada } from './render/camadas';
import { HordaPorGPU, HordaPorImagem } from './render/escritores';
import { criarTabelaDeDesenho } from './render/horda';
import { RenderDaVigilia } from './render/mundo';

export class Vigilia extends Phaser.Scene {
  private sim: Simulacao | null = null;
  private render: RenderDaVigilia | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Vigilia' });
  }

  create(): void {
    cameraLogica(this);
    this.cameras.main.setBackgroundColor(COR.fundo);
    const dados = criarDadosDaCharneca();
    const comandosAoVivo = criarComandos();
    // Os tutoriais vistos vêm do meta a partir da F-007; até lá, de ?tutorial=0 ou do cenário.
    const params: Partial<ParametrosDaVigilia> = {
      ...this.ctx.cenario?.parametros,
      teto: this.ctx.teto.valor,
      ...(this.ctx.pularTutoriais ? { tutoriaisVistos: TODOS_OS_TUTORIAIS } : {}),
    };
    const { modo, bufferDinamico } = this.ctx.render;
    this.render = new RenderDaVigilia(
      this,
      dados,
      {
        criar: (cena) => (modo === 'gpu' ? new HordaPorGPU(cena, bufferDinamico) : new HordaPorImagem(cena)),
        tabela: criarTabelaDeDesenho(inimigos.inimigos, dados.tipos.existe),
      },
      // As camadas das armas trocam de modo junto com a horda (decisoes-F-004 §6).
      { criar: (cena, capacidade) => criarCamada(cena, modo, capacidade, bufferDinamico), opcoes: this.ctx.opcoes },
    );
    this.sim = {
      estado: criarEstado(this.ctx.seed, dados, params),
      dados,
      acumulador: criarAcumulador(),
      comandosAoVivo,
      fonte: this.ctx.roteiro ? fonteDoRoteiro(this.ctx.roteiro) : fonteConstante(comandosAoVivo),
      camera: { x: dados.inicioX, y: dados.inicioY },
      pausada: false,
      pausa: { ativa: false, origem: null, alfa: 0 },
      horda: this.render.horda,
      efeitos: this.render.efeitos,
    };
    this.ctx.simulacao = this.sim;
    this.ctx.tela = 'VIGILIA';
    // Toques de antes da Vigília (o de Acender) ficam de fora: só um toque novo cria o joystick.
    const { fila, tradutor } = this.ctx.entrada;
    fila.reiniciar();
    tradutor.reiniciar();
    this.scene.launch('Hud');
    this.scene.launch('Pausa');
    const eventos = this.game.events;
    eventos.on(Phaser.Core.Events.PRE_STEP, this.aoPreStep, this);
    eventos.on(Phaser.Core.Events.STEP, this.aoStep, this);
    eventos.on(Phaser.Core.Events.PRE_RENDER, this.aoPreRender, this);
    eventos.on(Phaser.Core.Events.POST_RENDER, this.aoPostRender, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventos.off(Phaser.Core.Events.PRE_STEP, this.aoPreStep, this);
      eventos.off(Phaser.Core.Events.STEP, this.aoStep, this);
      eventos.off(Phaser.Core.Events.PRE_RENDER, this.aoPreRender, this);
      eventos.off(Phaser.Core.Events.POST_RENDER, this.aoPostRender, this);
      this.render?.liberar();
      fila.ativa = false;
      this.scene.stop('Hud');
      this.scene.stop('Pausa');
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

  private aoPreStep(): void {
    this.ctx.medidor.inicio(performance.now());
  }

  private aoStep(): void {
    const sim = this.sim;
    if (!sim) return;
    // Uma tradução por frame; ao vivo, o vetor vale para todos os passos do frame (design/decisoes-F-002.md §4).
    // O agora do quadro, no relógio do TouchEvent.timeStamp, completa os 500 ms do gesto de pausa (decisoes-F-004 P3).
    const trad = this.ctx.entrada.tradutor;
    trad.traduzir(this.ctx.entrada.fila, sim.comandosAoVivo, performance.now());
    if (trad.pedidoDePausa !== null && !sim.pausa.ativa) this.abrirPausa(trad.pedidoDePausa);
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'continuar') this.fecharPausa();
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'numeros') this.ctx.opcoes.numerosDeDano = !this.ctx.opcoes.numerosDeDano;
    const t0 = performance.now();
    const n = rodarFrameComPausas(sim.estado, sim.dados, sim.acumulador, this.game.loop.rawDelta, sim.fonte, sim.pausa.ativa, sim.pausada);
    this.ctx.medidor.simulou(performance.now() - t0, n);
    // Fora do tempo medido como simulação (o F-003.4 roda com ?debug=1).
    if (this.ctx.debug && n > 0) verificarNaN(sim.estado, n);
  }

  /**
   * Abre a pausa do jogador (P4, P8): o relógio e o passo param, o alfa do
   * render congela, todos os dedos são soltos e o tradutor passa ao modo da
   * tela de pausa. O estado de jogo (`__GAME_DEBUG__.estado`) continua VIGILIA.
   */
  private abrirPausa(origem: 'botao' | 'gesto'): void {
    const sim = this.sim!;
    sim.pausa.ativa = true;
    sim.pausa.origem = origem;
    sim.pausa.alfa = alfa(sim.acumulador);
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('pausa');
    (this.scene.get('Pausa') as Pausa).mostrar();
  }

  /** Continuar (P7): sem contagem; só um toque novo cria o joystick (P8). */
  private fecharPausa(): void {
    const sim = this.sim!;
    sim.pausa.ativa = false;
    sim.pausa.origem = null;
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('vigilia');
    (this.scene.get('Pausa') as Pausa).esconder();
  }

  private aoPreRender(): void {
    this.ctx.medidor.antesDoRender(performance.now());
  }

  private aoPostRender(): void {
    this.ctx.medidor.fim(performance.now());
  }

  override update(): void {
    const sim = this.sim;
    if (!sim || !this.render) return;
    // Pausada pelo debug, desenha o estado atual: a imagem depende só da seed e do passo (decisoes-F-003 §8).
    // Na pausa do jogador, o alfa fica o do instante em que ela abriu (P4).
    const a = sim.pausada ? 1 : sim.pausa.ativa ? sim.pausa.alfa : alfa(sim.acumulador);
    centroDaCamera(sim.estado, a, sim.camera);
    this.render.sincronizar(sim.estado, a, sim.camera.x, sim.camera.y);
    this.cameras.main.centerOn(sim.camera.x, sim.camera.y);
  }
}
