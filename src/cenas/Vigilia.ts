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
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../logica/nucleo/comandos';
import { rodarFrameComPausas } from '../logica/nucleo/driver';
import { CAB, TIPO_DE_CARTA, TODOS_OS_TUTORIAIS, criarEstado, type Estado, type ParametrosDaVigilia } from '../logica/nucleo/estado';
import { EVENTO, EV, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { bauNaFrente, confirmarModal, modalAberto } from '../logica/progressao/modal';
import { nivelOfertado } from '../logica/progressao/oferta';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';
import { verificarNaN } from '../logica/nucleo/nan';
import { criarDadosDaCharneca } from '../plataforma/dadosDaVigilia';
import inimigos from '../dados/inimigos.json';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import type { Modal } from './Modal';
import type { Pausa } from './Pausa';
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
      modal: { selecionada: null },
      horda: this.render.horda,
      efeitos: this.render.efeitos,
    };
    this.ctx.simulacao = this.sim;
    this.ctx.tela = 'VIGILIA';
    this.eventosLidos = 0;
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
    else if (trad.modo === 'modal') this.tratarToquesDoModal();
    const t0 = performance.now();
    const n = rodarFrameComPausas(sim.estado, sim.dados, sim.acumulador, this.game.loop.rawDelta, sim.fonte, sim.pausa.ativa, sim.pausada);
    this.ctx.medidor.simulou(performance.now() - t0, n);
    // O modal abre no passo que cruza o nível ou encosta no baú (M1); a pausa aberta tem a vez (M5).
    if (!sim.pausa.ativa && modalAberto(sim.estado) && trad.modo !== 'modal') this.abrirModal();
    this.registrarUnioes();
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

  /**
   * Abre o modal (M5): todos os dedos soltos, o joystick some, o tradutor no
   * modo modal (sem joystick, botão de pausa nem gesto), seleção vazia.
   */
  private abrirModal(): void {
    const sim = this.sim!;
    sim.modal.selecionada = null;
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('modal', bauNaFrente(sim.estado) ? 'bau' : 'cartas');
    (this.scene.get('Modal') as Modal).mostrar();
  }

  /**
   * Os toques do quadro, em ordem (M4): num baú, o Continuar fecha; nas cartas,
   * o 1º toque seleciona, outro troca, e o toque na selecionada confirma. Depois
   * de confirmar, os toques que sobraram são descartados e os dedos soltos; se a
   * fila acabou, o tradutor volta à Vigília e só um toque novo cria o joystick.
   */
  private tratarToquesDoModal(): void {
    const sim = this.sim!;
    const trad = this.ctx.entrada.tradutor;
    for (let i = 0; i < trad.nToquesNoModal; i++) {
      const k = trad.toquesNoModal[i]!;
      if (bauNaFrente(sim.estado)) {
        this.confirmar(0);
        return;
      }
      if (sim.modal.selecionada === k) {
        this.registrarLevelUp(sim.estado, k);
        this.confirmar(k);
        return;
      }
      sim.modal.selecionada = k;
    }
  }

  private confirmar(k: number): void {
    const sim = this.sim!;
    const trad = this.ctx.entrada.tradutor;
    confirmarModal(sim.estado, sim.dados, k);
    sim.modal.selecionada = null;
    trad.descartarToquesDoModal();
    this.ctx.entrada.fila.pedirSoltarTodos();
    if (modalAberto(sim.estado)) {
      trad.mudarModo('modal', bauNaFrente(sim.estado) ? 'bau' : 'cartas');
    } else {
      trad.mudarModo('vigilia');
      (this.scene.get('Modal') as Modal).esconder();
    }
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
