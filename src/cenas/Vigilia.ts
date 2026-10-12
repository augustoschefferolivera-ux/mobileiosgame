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
import { criarCameraLenta, dispararCameraLenta, escalarDelta, escalarDeltaDoApagar } from '../logica/nucleo/cameraLenta';
import { ACAO, criarComandos, fonteConstante, fonteDoRoteiro } from '../logica/nucleo/comandos';
import { rodarFrameComPausas } from '../logica/nucleo/driver';
import { CAB, CAUSA_DO_FIM, CENARIO, ETAPA, FASE, FOGUEIRA_U32, FOGUEIRA_U8, JOGADOR, JOGADOR3_U8, JOGADOR4, JOGADOR4_U8, PROMPT, TIPO_DE_CARTA, TODOS_OS_TUTORIAIS, criarEstado, tutoriaisCumpridos, type Estado, type ParametrosDaVigilia } from '../logica/nucleo/estado';
import { EVENTO, EV, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { modalAberto } from '../logica/progressao/modal';
import { nivelOfertado } from '../logica/progressao/oferta';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';
import { verificarNaN } from '../logica/nucleo/nan';
import { passo } from '../logica/nucleo/passo';
import { resultadoDaVigilia } from '../logica/mundo/vigilia';
import { comOpcoes, comTutoriais, reservarIdDaVigilia } from '../logica/save/meta';
import { GravadorDaVigilia, creditarFim } from '../plataforma/vigiliaGuardada';
import { sortearSeed } from '../plataforma/parametros';
import { criarDadosDaCharneca } from '../plataforma/dadosDaVigilia';
import { prepararFogueiraDoCenario } from '../plataforma/cenarios';
import inimigos from '../dados/inimigos.json';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import type { ContextoDoJogo, Simulacao } from './contexto';
import type { OfertaDeRetomada } from './retomada';
import { TelemetriaDeCombate } from './telemetriaDeCombate';
import type { Modal } from './Modal';
import type { Pausa } from './Pausa';
import type { Resultado } from './Resultado';
import { abrirModal, tratarToquesDoModal } from './escolhaDoModal';
import { COR, cameraLogica } from './estilo';
import { centroDaCamera } from './render/camera';
import { criarCamada } from './render/camadas';
import { HordaPorGPU, HordaPorImagem } from './render/escritores';
import { RAIO_DO_ANEL_DA_MANCHA, criarMarcador, criarSetasDeTelegrafo, marcadorDaMancha, setasDosTelegrafos } from './render/mancha';
import { criarTabelaDeDesenho } from './render/horda';
import { RenderDaVigilia } from './render/mundo';
import { circuloDePixels, desenharIconeDePixels, trianguloDePixels } from './pixel';

export class Vigilia extends Phaser.Scene {
  private sim: Simulacao | null = null;
  /** Eventos do anel já lidos pela telemetria da União. */
  private eventosLidos = 0;
  private render: RenderDaVigilia | null = null;
  private telemetriaDeCombate = new TelemetriaDeCombate();
  /** Anel e seta da mancha (MC9): criado no 1º quadro com a mancha ativa; o marcador é reaproveitado. */
  private manchaGrafico: Phaser.GameObjects.Graphics | null = null;
  private readonly marcador = criarMarcador();
  /** As setas na borda para os atacantes com telegrafo fora da vista (F-008 CR11): o Graphics nasce na 1ª seta. */
  private setasGrafico: Phaser.GameObjects.Graphics | null = null;
  private readonly setas = criarSetasDeTelegrafo();
  private setasDesenhadas = 0;
  /** A tela de Resultado já foi aberta (em APAGANDO ou no Abandonar); o FIM só completa o que ela mostra. */
  private resultadoIniciado = false;
  /** A retomada abriu a pausa no estado antes de as cenas Pausa e Hud existirem; o 1º update as mostra. */
  private pausaDaRetomadaPendente = false;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Vigilia' });
  }

  create(): void {
    cameraLogica(this);
    this.cameras.main.setBackgroundColor(COR.fundo);
    const dados = criarDadosDaCharneca();
    const comandosAoVivo = criarComandos();
    // Os tutoriais vistos vêm do meta (SV5); ?tutorial=0 e ?visto= vencem e não gravam. A mancha do meta nasce no passo 0 (MC6)
    // e ?almas=N dá Almas iniciais sem gravar no meta (MC12).
    const meta = this.ctx.meta.atual;
    const params: Partial<ParametrosDaVigilia> = {
      // Sem ?cenario, a Vigília de produção, com os ataques dos inimigos (VT1); com ele, quem decide é a receita.
      ...(this.ctx.cenario ? this.ctx.cenario.parametros : { cenario: CENARIO.ataques, tutoriaisVistos: meta.tutoriais }),
      mancha: meta.mancha === null ? null : { x: meta.mancha.x, y: meta.mancha.y, almas: meta.mancha.almas },
      ...(this.ctx.almasIniciais === null ? {} : { almasIniciais: this.ctx.almasIniciais }),
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
    // Continuar uma Vigília guardada (F-008 SV5): o estado já vem carregado do Acender, e a Vigília abre na pausa.
    const retomada = this.ctx.retomada;
    this.ctx.retomada = null;
    const estado = retomada !== null ? retomada.estado : criarEstado(this.ctx.seed, dados, params);
    if (retomada === null && this.ctx.cenario) prepararFogueiraDoCenario(estado, this.ctx.cenario.id);
    this.sim = {
      estado,
      dados,
      acumulador: criarAcumulador(),
      comandosAoVivo,
      fonte: this.ctx.roteiro ? fonteDoRoteiro(this.ctx.roteiro, undefined, this.ctx.acoesDoRoteiro ?? undefined) : fonteConstante(comandosAoVivo),
      camera: { x: dados.inicioX, y: dados.inicioY },
      pausada: false,
      pausa: { ativa: false, origem: null, alfa: 0, abandonarArmado: false },
      modal: { selecionada: null },
      cameraLenta: criarCameraLenta(),
      fimCreditado: false,
      resultado: null,
      gravador: null,
      idVigilia: 0,
      horda: this.render.horda,
      efeitos: this.render.efeitos,
    };
    this.ctx.simulacao = this.sim;
    this.iniciarSave(retomada);
    this.ctx.tela = 'VIGILIA';
    this.eventosLidos = 0;
    this.resultadoIniciado = false;
    this.telemetriaDeCombate = new TelemetriaDeCombate();
    // Toques de antes da Vigília (o de Acender) ficam de fora: só um toque novo cria o joystick.
    const { fila, tradutor } = this.ctx.entrada;
    fila.reiniciar();
    tradutor.reiniciar();
    this.scene.launch('Hud');
    this.scene.launch('Fogueira');
    this.scene.launch('Modal');
    this.scene.launch('Pausa');
    this.scene.launch('Resultado');
    this.pausaDaRetomadaPendente = false;
    if (retomada !== null) this.abrirPausaDaRetomada();
    const eventos = this.game.events;
    eventos.on(Phaser.Core.Events.PRE_STEP, this.aoPreStep, this);
    eventos.on(Phaser.Core.Events.STEP, this.aoStep, this);
    eventos.on(Phaser.Core.Events.PRE_RENDER, this.aoPreRender, this);
    eventos.on(Phaser.Core.Events.POST_RENDER, this.aoPostRender, this);
    // O `andamento` também sai quando a aba some (SV3).
    const aoSumir = (): void => this.sim?.gravador?.salvarAndamento(this.sim.estado);
    const aoMudarVisibilidade = (): void => {
      if (document.visibilityState === 'hidden') aoSumir();
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', aoSumir);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', aoSumir);
      eventos.off(Phaser.Core.Events.PRE_STEP, this.aoPreStep, this);
      eventos.off(Phaser.Core.Events.STEP, this.aoStep, this);
      eventos.off(Phaser.Core.Events.PRE_RENDER, this.aoPreRender, this);
      eventos.off(Phaser.Core.Events.POST_RENDER, this.aoPostRender, this);
      this.render?.liberar();
      fila.ativa = false;
      this.scene.stop('Hud');
      this.scene.stop('Fogueira');
      this.scene.stop('Modal');
      this.scene.stop('Pausa');
      this.scene.stop('Resultado');
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
    const fase = sim.estado.jogador4U8[JOGADOR4_U8.fase]!;
    // A cura do Frasco corre? Decide entre iniciar (bit 4) e cancelar ao segurar (bit 8; FR6).
    trad.frascoEmCura = sim.estado.jogador4U8[JOGADOR4_U8.frascoPasso]! > 0;
    // O menu da Fogueira vale com a simulação rodando na etapa FOGUEIRA, sem pausa nem modal (F-008 FG8).
    trad.fogueiraAberta = sim.estado.fogueiraU8[FOGUEIRA_U8.etapa] === ETAPA.fogueira && fase === FASE.viva && !sim.pausa.ativa && !modalAberto(sim.estado);
    trad.traduzir(this.ctx.entrada.fila, sim.comandosAoVivo, performance.now());
    // Outro botão da pausa desarma o Abandonar (PE4); o próprio Abandonar arma no 1º toque e confirma no 2º.
    this.desarmarAbandonar(trad.toqueNaPausa);
    // A pausa é inerte em APAGANDO e em FIM (AG3): sem pedido de pausa, e o Resultado cuida dos toques.
    if (trad.pedidoDePausa !== null && !sim.pausa.ativa && fase === FASE.viva) this.abrirPausa(trad.pedidoDePausa);
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'continuar') this.fecharPausa();
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'abandonar') this.tocarAbandonar();
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'numeros') this.alternarOpcao('numerosDeDano');
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'som') this.alternarOpcao('som');
    else if (sim.pausa.ativa && trad.toqueNaPausa === 'flashes') this.alternarOpcao('flashes');
    else if (trad.modo === 'modal') this.tratarToquesDoModal();
    else if (trad.modo === 'resultado' && trad.toqueNoResultado !== null) this.tratarToqueDoResultado(trad.toqueNoResultado);
    const t0 = performance.now();
    // Câmera lenta (FB5): o fator vale sobre o delta, só com a simulação rodando (pausa e modal não gastam os 500 ms).
    // A do Apagar (AG2) vale enquanto a fase for APAGANDO, por cima da do tutorial, sem gastar os 500 ms dela.
    const rodando = !sim.pausa.ativa && !sim.pausada && !modalAberto(sim.estado);
    const faseAgora = sim.estado.jogador4U8[JOGADOR4_U8.fase]!;
    const bruto = this.game.loop.rawDelta;
    const delta = !rodando ? bruto : faseAgora === FASE.apagando ? escalarDeltaDoApagar(bruto, sim.dados.combate.apagarFator) : escalarDelta(sim.cameraLenta, bruto);
    const promptAntes = sim.estado.jogador3U8[JOGADOR3_U8.promptEsquiva];
    const n = faseAgora === FASE.fim ? 0 : rodarFrameComPausas(sim.estado, sim.dados, sim.acumulador, delta, sim.fonte, sim.pausa.ativa, sim.pausada);
    // Dispara uma vez, no quadro em que o prompt de esquiva fica visível; ?tutorial=0 e o bit pré-visto nunca o acendem (TU8).
    if (promptAntes === PROMPT.aguardando && sim.estado.jogador3U8[JOGADOR3_U8.promptEsquiva] === PROMPT.visivel) dispararCameraLenta(sim.cameraLenta);
    this.ctx.medidor.simulou(performance.now() - t0, n);
    this.persistirTutoriais();
    sim.gravador?.depoisDoFrame(sim.estado);
    this.verificarFase();
    // O modal abre no passo que cruza o nível ou encosta no baú (M1); a pausa aberta tem a vez (M5).
    if (!sim.pausa.ativa && modalAberto(sim.estado) && trad.modo !== 'modal') this.abrirModal();
    this.registrarUnioes();
    this.telemetriaDeCombate.ler(sim.estado, this.ctx.telemetria);
    // Fora do tempo medido como simulação (o F-003.4 roda com ?debug=1).
    if (this.ctx.debug && n > 0) verificarNaN(sim.estado, n);
  }

  /**
   * Save da Vigília (F-008 SV3, SV4): na produção (e no cenário fogueira_hora1) reserva o `idVigilia` no meta, grava o meta e
   * só então o `vigilia` do passo 0. Os outros cenários não gravam.
   */
  private iniciarSave(retomada: OfertaDeRetomada | null): void {
    const c = this.ctx;
    const sim = this.sim!;
    if (retomada !== null) {
      // Continuar: o mesmo `idVigilia` e a sequência de onde parou (nenhum id novo é reservado).
      sim.idVigilia = retomada.envelope.idVigilia;
      sim.gravador = new GravadorDaVigilia(c.vigiliaGuardada, sim.estado, sim.dados.combate.autosavePassos, retomada.envelope.seq);
      c.telemetria.registrar('erro_recuperacao', sim.estado.cab[CAB.passo]!, { aba_morreu: true, retomou_da_fogueira: retomada.envelope.hora > 0 });
      return;
    }
    if (c.cenario !== null && c.cenario.id !== 'fogueira_hora1') return;
    const { meta, id } = reservarIdDaVigilia(c.meta.atual);
    c.meta.atual = meta;
    c.meta.armazenamento.gravar(meta);
    sim.idVigilia = id;
    sim.estado.fogueiraU32[FOGUEIRA_U32.idVigilia] = id;
    sim.gravador = new GravadorDaVigilia(c.vigiliaGuardada, sim.estado, sim.dados.combate.autosavePassos);
    sim.gravador.gravarInicio(sim.estado);
  }

  /**
   * Abre a pausa no estado, antes do 1º passo (SV5: "um toque a mais; o hash confere antes de qualquer passo"). A tela de pausa e
   * a saída da Hud vêm no 1º update, quando as cenas lançadas já existem.
   */
  private abrirPausaDaRetomada(): void {
    const sim = this.sim!;
    sim.pausa.ativa = true;
    sim.pausa.abandonarArmado = false;
    sim.pausa.origem = 'botao';
    sim.pausa.alfa = 1;
    this.ctx.entrada.tradutor.mudarModo('pausa');
    this.game.sound.setMute(true);
    this.pausaDaRetomadaPendente = true;
  }

  /** Alterna uma opção da pausa e grava no meta na hora do toque (SV4, SV6). */
  private alternarOpcao(qual: 'numerosDeDano' | 'som' | 'flashes'): void {
    const o = this.ctx.opcoes;
    o[qual] = !o[qual];
    this.ctx.meta.atual = comOpcoes(this.ctx.meta.atual, { som: o.som, flashes: o.flashes, numerosDeDano: o.numerosDeDano });
    this.ctx.meta.armazenamento.gravar(this.ctx.meta.atual);
  }

  /** O tutorial cumprido vai ao meta (SV4): no máximo 3 gravações por perfil; ?tutorial=0, ?visto= e ?cenario não gravam. */
  private persistirTutoriais(): void {
    const c = this.ctx;
    if (c.pularTutoriais || c.vistos !== null || c.cenario !== null) return;
    const novos = comTutoriais(c.meta.atual, tutoriaisCumpridos(this.sim!.estado));
    if (novos === c.meta.atual) return;
    c.meta.atual = novos;
    c.meta.armazenamento.gravar(novos);
  }

  /** Outro botão da pausa desarma o Abandonar (PE4): só o próprio Abandonar mantém o armado. */
  private desarmarAbandonar(toque: string | null): void {
    const sim = this.sim!;
    if (sim.pausa.ativa && toque !== null && toque !== 'abandonar') sim.pausa.abandonarArmado = false;
  }

  /** O botão Abandonar (PE4): o 1º toque arma (borda de brasa e aviso), o 2º confirma e roda o passo com o bit 16 (PE5). */
  private tocarAbandonar(): void {
    const sim = this.sim!;
    if (!sim.pausa.abandonarArmado) {
      sim.pausa.abandonarArmado = true;
      return;
    }
    sim.pausa.abandonarArmado = false;
    const cmd = criarComandos();
    cmd.acoes[0] = ACAO.abandonar;
    passo(sim.estado, sim.dados, cmd);
    this.verificarFase();
  }

  /**
   * A Vigília saiu da fase VIVA (AG5, SV7): abre a tela de Resultado (em APAGANDO só o véu e o título; no Abandonar, direto
   * ao FIM) e, no FIM, calcula o resultado, credita o meta uma vez, registra a telemetria e passa os toques ao Resultado.
   */
  private verificarFase(): void {
    const sim = this.sim!;
    const fase = sim.estado.jogador4U8[JOGADOR4_U8.fase]!;
    if (fase === FASE.viva) return;
    const resultado = this.scene.get('Resultado') as Resultado;
    if (!this.resultadoIniciado) {
      this.resultadoIniciado = true;
      if (sim.pausa.ativa) this.fecharPausa();
      this.ctx.tela = 'RESULTADO';
      this.ctx.entrada.fila.pedirSoltarTodos();
      if (fase === FASE.apagando) resultado.mostrarApagando();
    }
    if (fase !== FASE.fim || sim.fimCreditado) return;
    sim.fimCreditado = true;
    const r = resultadoDaVigilia(sim.estado, sim.dados);
    sim.resultado = r;
    // FIM atômico (SV4): o meta com o crédito e `ultimaEncerrada` primeiro; só então saem o `vigilia` e o `andamento`.
    this.ctx.meta.atual = creditarFim(this.ctx.meta.armazenamento, this.ctx.vigiliaGuardada, this.ctx.meta.atual, r, sim.idVigilia);
    const e = sim.estado;
    this.ctx.telemetria.registrar('apagar', e.cab[CAB.passo]!, {
      minuto: Math.floor(e.cab[CAB.relogio]! / 3600),
      nivel: r.nivel,
      almas: r.almas,
      causa: r.causa === CAUSA_DO_FIM.abandonar ? 'abandonar' : 'apagar',
      posicao: [Math.round(e.jogador[JOGADOR.x]!), Math.round(e.jogador[JOGADOR.y]!)],
    });
    resultado.mostrarResultado(r);
    this.ctx.entrada.tradutor.mudarModo('resultado');
  }

  /** Voltar leva à cena Acender (o Santuário é da F-010); Repetir abre uma Vigília nova, de seed nova, com a mancha do meta (RS6). */
  private tratarToqueDoResultado(botao: string): void {
    if (botao === 'voltar') {
      this.scene.start('Acender');
    } else if (botao === 'repetir') {
      this.ctx.seed = sortearSeed();
      this.scene.restart();
    }
  }

  /**
   * Abre a pausa do jogador (P4, P8): o relógio e o passo param, o alfa do
   * render congela, todos os dedos são soltos e o tradutor passa ao modo da
   * tela de pausa. O estado de jogo (`__GAME_DEBUG__.estado`) continua VIGILIA.
   */
  private abrirPausa(origem: 'botao' | 'gesto'): void {
    const sim = this.sim!;
    sim.pausa.ativa = true;
    sim.pausa.abandonarArmado = false;
    sim.pausa.origem = origem;
    sim.pausa.alfa = alfa(sim.acumulador);
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('pausa');
    // A pausa cala tudo (FB4, RE11): os SFX são AudioBufferSourceNode que o `pauseAll` não toca, mas o `setMute` sim.
    this.game.sound.setMute(true);
    // A Hud some enquanto a pausa está aberta: a build e as estatísticas caíam sobre a barra de HP e os slots.
    this.scene.get('Hud').sys.setVisible(false);
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
      if ((taf & 0xff) === EVENTO.fogueiraPartiu) {
        // Telemetria `fogueira` ao Partir (F-008): a Hora e as ações usadas (bit 1 Descansar, bit 2 Forjar).
        const acoes = anel.f32[i + EV.floats + 3]!;
        this.ctx.telemetria.registrar('fogueira', sim.estado.cab[CAB.passo]!, { hora: anel.f32[i + EV.floats + 2]!, descansou: (acoes & 1) !== 0, forjou: (acoes & 2) !== 0, oferenda: false });
        continue;
      }
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
    sim.pausa.abandonarArmado = false;
    sim.pausa.origem = null;
    this.ctx.entrada.fila.pedirSoltarTodos();
    this.ctx.entrada.tradutor.mudarModo('vigilia');
    // Som desligado na pausa continua mudo depois do Continuar.
    this.game.sound.setMute(!this.ctx.opcoes.som);
    this.scene.get('Hud').sys.setVisible(true);
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
    if (this.pausaDaRetomadaPendente && this.scene.isActive('Pausa') && this.scene.isActive('Hud')) {
      this.pausaDaRetomadaPendente = false;
      this.scene.get('Hud').sys.setVisible(false);
      (this.scene.get('Pausa') as Pausa).mostrar();
    }
    // Pausada pelo debug, desenha o estado atual: a imagem depende só da seed e do passo (decisoes-F-003 §8).
    // Na pausa do jogador, o alfa fica o do instante em que ela abriu (P4).
    // Durante o congelamento (FB1) o render usa alfa 1: senão xAnt e x interpolariam vai-e-volta com o passo parado.
    const congelado = sim.estado.jogador3U8[JOGADOR3_U8.congelamento]! > 0;
    const a = sim.pausada || congelado ? 1 : sim.pausa.ativa ? sim.pausa.alfa : alfa(sim.acumulador);
    centroDaCamera(sim.estado, a, sim.camera);
    this.render.sincronizar(sim.estado, a, sim.camera.x, sim.camera.y);
    this.desenharMancha(sim.estado);
    this.desenharSetasDeTelegrafo(sim.estado);
    this.cameras.main.centerOn(sim.camera.x, sim.camera.y);
  }

  /**
   * A seta na borda da tela para cada atacante com telegrafo ativo fora da vista (CR11): branca para os aparáveis, vermelha
   * para o Grito. Só redesenha quando há seta ou quando a última some.
   */
  private desenharSetasDeTelegrafo(e: Estado): void {
    const n = setasDosTelegrafos(e, this.sim!.camera.x, this.sim!.camera.y, this.setas);
    if (n === 0 && this.setasDesenhadas === 0) return;
    const g = (this.setasGrafico ??= this.add.graphics());
    g.clear();
    this.setasDesenhadas = n;
    for (let k = 0; k < n; k++) {
      const s = this.setas[k]!;
      const c = Math.cos(s.angulo);
      const sn = Math.sin(s.angulo);
      trianguloDePixels(g, s.x + c * 14, s.y + sn * 14, s.x - c * 8 - sn * 9, s.y - sn * 8 + c * 9, s.x - c * 8 + sn * 9, s.y - sn * 8 - c * 9, s.vermelha ? COR.cinzaVermelha : COR.branco, 1);
    }
  }

  /**
   * Anel de brasa na cor da Alma, pulsando devagar (pelo passo), e a seta no limite da tela quando a mancha está fora da vista
   * (MC9). Só existe com a mancha ativa; recuperada, o Graphics some.
   */
  private desenharMancha(e: Estado): void {
    const u8 = e.jogador4U8;
    if (u8[JOGADOR4_U8.manchaAtiva] === 0) {
      this.manchaGrafico?.setVisible(false);
      return;
    }
    const g = (this.manchaGrafico ??= this.add.graphics());
    const m = marcadorDaMancha(e.jogador4[JOGADOR4.manchaX]!, e.jogador4[JOGADOR4.manchaY]!, this.sim!.camera.x, this.sim!.camera.y, this.marcador);
    g.clear().setVisible(true);
    // F-011: o anel em células de 2 pt (4 pt de traço) e a Alma em pixel no centro; a seta também na grade.
    if (m.dentro) {
      const pulso = RAIO_DO_ANEL_DA_MANCHA + 3 * Math.sin(e.cab[CAB.passo]! / 30);
      const cx = Math.round(m.x);
      const cy = Math.round(m.y);
      circuloDePixels(g, cx, cy, pulso, 4, COR.brasa, 1);
      desenharIconeDePixels(g, 'alma', cx, cy, 14);
      return;
    }
    const c = Math.cos(m.angulo);
    const s = Math.sin(m.angulo);
    trianguloDePixels(g, m.setaX + c * 14, m.setaY + s * 14, m.setaX - c * 8 - s * 9, m.setaY - s * 8 + c * 9, m.setaX - c * 8 + s * 9, m.setaY - s * 8 - c * 9, COR.alma, 1);
  }
}
