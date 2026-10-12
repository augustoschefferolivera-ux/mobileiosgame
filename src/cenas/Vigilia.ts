// Cena Vigilia (ADR-0002 §3 e §11.1): driver do passo fixo e câmera do mundo.
// Escuta Phaser.Core.Events.STEP (antes dos update() das cenas), traduz os
// toques do frame, soma o delta bruto do rAF e roda no máximo 5 passos por
// frame. No update(), centra a câmera no jogador interpolado e sincroniza o
// render do mundo, com a horda no SpriteGPULayer ou no plano B
// (design/decisoes-F-003.md §7). A cena Hud roda por cima. Mede a CPU do
// frame de PRE_STEP a POST_RENDER (ADR-0002 §14). Desde a F-005, abre e fecha
// o modal da simulação (level up e baú; design/decisoes-F-005.md M1 a M5): o
// 1º toque numa carta seleciona, o toque na selecionada confirma, e só a
// confirmação entra na simulação, por confirmarModal.
import Phaser from 'phaser';
import { alfa, criarAcumulador } from '../logica/nucleo/acumulador';
import { criarCameraLenta, dispararCameraLenta, escalarDelta } from '../logica/nucleo/cameraLenta';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../logica/nucleo/comandos';
import { rodarFrameComPausas } from '../logica/nucleo/driver';
import { CAB, CENARIO, JOGADOR3_U8, PROMPT, TIPO_DE_CARTA, TODOS_OS_TUTORIAIS, criarEstado, type Estado, type ParametrosDaVigilia } from '../logica/nucleo/estado';
import { EVENTO, EV, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { modalAberto } from '../logica/progressao/modal';
import { nivelOfertado } from '../logica/progressao/oferta';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';
import { verificarNaN } from '../logica/nucleo/nan';
import { criarDadosDaCharneca } from '../plataforma/dadosDaVigilia';
import inimigos from '../dados/inimigos.json';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import { TelemetriaDeCombate } from './telemetriaDeCombate';
import type { Modal } from './Modal';
import type { Pausa } from './Pausa';
import { abrirModal, tratarToquesDoModal } from './escolhaDoModal';
import { COR, cameraLogica } from './estilo';
import { centroDaCamera } from './render/camera';
import { criarCamada } from './render/camadas';
import { HordaPorGPU, HordaPorImagem } from './render/escritores';
import { criarTabelaDeDesenho } from './render/horda';
import { RenderDaVigilia } from './render/mundo';

export class Vigilia extends Phaser.Scene {
  private sim: Simulacao | null = null;
  /** Eventos do anel já lidos pela telemetria da União. */
  private eventosLidos = 0;
  private render: RenderDaVigilia | null = null;
  private telemetriaDeCombate = new TelemetriaDeCombate();

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
      // Sem ?cenario, a Vigília de produção, com os ataques dos inimigos (VT1); com ele, quem decide é a receita.
      ...(this.ctx.cenario ? this.ctx.cenario.parametros : { cenario: CENARIO.ataques }),
      teto: this.ctx.teto.valor,
      // ?tutorial=0 vence ?visto (TU6); ?inicio põe o relógio com a linha livre (TU7).
      ...(this.ctx.pularTutoriais ? { tutoriaisVistos: TODOS_OS_TUTORIAIS } : this.ctx.vistos !== null ? { tutoriaisVistos: this.ctx.vistos } : {}),
      ...(this.ctx.inicio !== null ? { relogioInicial: this.ctx.inicio, inicioLivre: true } : {}),
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
      fonte: this.ctx.roteiro ? fonteDoRoteiro(this.ctx.roteiro, undefined, this.ctx.acoesDoRoteiro ?? undefined) : fonteConstante(comandosAoVivo),
      camera: { x: dados.inicioX, y: dados.inicioY },
      pausada: false,
      pausa: { ativa: false, origem: null, alfa: 0 },
      modal: { selecionada: null },
      cameraLenta: criarCameraLenta(),
      horda: this.render.horda,
      efeitos: this.render.efeitos,
    };
    this.ctx.simulacao = this.sim;
    this.ctx.tela = 'VIGILIA';
    this.eventosLidos = 0;
    this.telemetriaDeCombate = new TelemetriaDeCombate();
    // Toques de antes da Vigília (o de Acender) ficam de fora: só um toque novo cria o joystick.
    const { fila, tradutor } = this.ctx.entrada;
    fila.reiniciar();
    tradutor.reiniciar();
    this.scene.launch('Hud');
    this.scene.launch('Modal');
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
      this.scene.stop('Modal');
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
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'som') this.ctx.opcoes.som = !this.ctx.opcoes.som;
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'flashes') this.ctx.opcoes.flashes = !this.ctx.opcoes.flashes;
    else if (trad.modo === 'modal') this.tratarToquesDoModal();
    const t0 = performance.now();
    // Câmera lenta (FB5): o fator vale sobre o delta, só com a simulação rodando (pausa e modal não gastam os 500 ms).
    const rodando = !sim.pausa.ativa && !sim.pausada && !modalAberto(sim.estado);
    const delta = rodando ? escalarDelta(sim.cameraLenta, this.game.loop.rawDelta) : this.game.loop.rawDelta;
    const promptAntes = sim.estado.jogador3U8[JOGADOR3_U8.promptEsquiva];
    const n = rodarFrameComPausas(sim.estado, sim.dados, sim.acumulador, delta, sim.fonte, sim.pausa.ativa, sim.pausada);
    // Dispara uma vez, no quadro em que o prompt de esquiva fica visível; ?tutorial=0 e o bit pré-visto nunca o acendem (TU8).
    if (promptAntes === PROMPT.aguardando && sim.estado.jogador3U8[JOGADOR3_U8.promptEsquiva] === PROMPT.visivel) dispararCameraLenta(sim.cameraLenta);
    this.ctx.medidor.simulou(performance.now() - t0, n);
    // O modal abre no passo que cruza o nível ou encosta no baú (M1); a pausa aberta tem a vez (M5).
    if (!sim.pausa.ativa && modalAberto(sim.estado) && trad.modo !== 'modal') this.abrirModal();
    this.registrarUnioes();
    this.telemetriaDeCombate.ler(sim.estado, this.ctx.telemetria);
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
    // A pausa cala tudo (FB4, RE11): os SFX são AudioBufferSourceNode que o `pauseAll` não toca, mas o `setMute` sim.
    this.game.sound.setMute(true);
    (this.scene.get('Pausa') as Pausa).mostrar();
  }

  /** Abre o modal (M5): ver abrirModal em escolhaDoModal. */
  private abrirModal(): void {
    abrirModal(this.sim!, this.ctx.entrada);
    (this.scene.get('Modal') as Modal).mostrar();
  }

  /** Os toques do quadro no modal (M4); a regra está em escolhaDoModal. */
  private tratarToquesDoModal(): void {
    const sim = this.sim!;
    tratarToquesDoModal(sim, this.ctx.entrada, {
      aoEscolherCarta: (k) => this.registrarLevelUp(sim.estado, k),
      aoFecharAFila: () => (this.scene.get('Modal') as Modal).esconder(),
    });
  }

  /** Telemetria local `level_up` na confirmação, antes de aplicar (Q-30; decisoes-F-005 T1). */
  private registrarLevelUp(e: Estado, k: number): void {
    const id = (c: number): string => {
      const tipo = e.oferta.tipo[c]!;
      const item = e.oferta.item[c]!;
      if (tipo === TIPO_DE_CARTA.bolsa) return 'bolsa_de_almas';
      return tipo === TIPO_DE_CARTA.melhoriaDeArma || tipo === TIPO_DE_CARTA.armaNova ? IDS_DE_ARMA[item]! : IDS_DE_PASSIVA[item]!;
    };
    this.ctx.telemetria.registrar('level_up', e.cab[CAB.passo]!, {
      minuto: Math.floor(e.cab[CAB.relogio]! / 3600),
      nivel: nivelOfertado(e),
      cartas_oferecidas: [id(0), id(1), id(2)],
      carta_escolhida: id(k),
      reroll_usado: 0,
    });
  }

  /** Telemetria local `arma_uniao` ao ler o evento `uniao` do anel (decisoes-F-005 T1). */
  private registrarUnioes(): void {
    const sim = this.sim!;
    const anel = sim.estado.eventos;
    const escritos = eventosEscritos(anel);
    if (this.eventosLidos > escritos) this.eventosLidos = 0;
    for (let n = Math.max(this.eventosLidos, escritos - 1024); n < escritos; n++) {
      const i = inicioDoEvento(n);
      const taf = anel.u32[i + EV.tipoArmaForma]!;
      if ((taf & 0xff) !== EVENTO.uniao) continue;
      const arma = (taf >>> 8) & 0xff;
      const passiva = anel.f32[i + EV.floats]!;
      this.ctx.telemetria.registrar('arma_uniao', sim.estado.cab[CAB.passo]!, {
        minuto: Math.floor(sim.estado.cab[CAB.relogio]! / 3600),
        arma: IDS_DE_ARMA[arma]!,
        passiva: IDS_DE_PASSIVA[passiva]!,
      });
    }
    this.eventosLidos = escritos;
  }

  /** Continuar (P7): sem contagem; só um toque novo cria o joystick (P8). */
  private fecharPausa(): void {
    const sim = this.sim!;
    sim.pausa.ativa = false;
    sim.pausa.origem = null;
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('vigilia');
    // Som desligado na pausa continua mudo depois do Continuar.
    this.game.sound.setMute(!this.ctx.opcoes.som);
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
    // Durante o congelamento (FB1) o render usa alfa 1: senão xAnt e x interpolariam vai-e-volta com o passo parado.
    const congelado = sim.estado.jogador3U8[JOGADOR3_U8.congelamento]! > 0;
    const a = sim.pausada || congelado ? 1 : sim.pausa.ativa ? sim.pausa.alfa : alfa(sim.acumulador);
    centroDaCamera(sim.estado, a, sim.camera);
    this.render.sincronizar(sim.estado, a, sim.camera.x, sim.camera.y);
    this.cameras.main.centerOn(sim.camera.x, sim.camera.y);
  }
}
