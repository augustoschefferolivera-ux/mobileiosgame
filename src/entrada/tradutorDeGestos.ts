// TradutorDeGestos (ADR-0002 §12; design/decisoes-F-002.md §4;
// design/decisoes-F-004.md §7): uma vez por frame, esvazia a fila de toques em
// slots fixos de dedos, classifica cada dedo pelo lugar onde começou,
// reconcilia com o retrato de `e.touches` e escreve o movimento nos
// ComandosDoPasso, já com a zona morta, a curva e o limite. Na F-004 também
// entrega, numa saída própria (fora dos ComandosDoPasso, P4), o pedido de
// pausa pelo botão ou pelo gesto de dois dedos parados por 0,5 s, e, no modo
// da tela de pausa, o toque nos alvos dela. Na F-005, o modo `modal` (cartas
// do level up ou o Continuar do baú; design/decisoes-F-005.md M4 e M5): sem
// joystick, botão de pausa nem gesto; cada toque que começa e solta no mesmo
// alvo entra, em ordem, numa lista de até 8 por quadro. Na F-006 (decisoes-F-006
// GE1 a GE3), o swipe do dedo do joystick e o toque duplo na área dele viram a
// esquiva: o tradutor liga o bit `ACAO.esquiva` e a `mira` nos ComandosDoPasso
// e nunca os desliga (a fonte ao vivo consome a borda). Não aloca.
import combate from '../dados/combate.json';
import { ACAO, type ComandosDoPasso } from '../logica/nucleo/comandos';
import { alvoDaPausa, alvosDaTelaDePausa, alvosDasCartas, alvosDoBau, areaDoJoystick, contem, type Alvo } from './alvos';
import { CAMPOS_POR_EVENTO, TIPO_DE_TOQUE, type FilaDeToques } from './filaDeToques';
import { pinoDoJoystick, vetorDoJoystick, type Vetor } from './joystick';
import type { Insets } from '../plataforma/safeArea';

/** Dedos acompanhados ao mesmo tempo; o 6º é descartado e contado (§4; conferir no iPhone, Q-29). */
export const MAX_DEDOS = 5;
/** Identificador do dedo virtual do mouse (build de debug); nunca solto pelo retrato de toques. */
export const ID_DO_MOUSE = -1;

/** Papel do dedo, pelo lugar onde começou: o botão de pausa não cria joystick nem conta para o gesto (P1, P3). */
const PAPEL = { livre: 0, joystick: 1, outro: 2, botao: 3 } as const;

/** Gesto de pausa (P3): "parado" = até 10 pt do ponto do touchstart, por pelo menos 500 ms (o UILongPressGestureRecognizer). */
export const GESTO_DE_PAUSA = { movimentoMaximoPt: 10, duracaoMs: 500, dedos: 2 } as const;
/** Swipe e toque duplo (combate.json, `gestos`): os números moram nos dados. */
const SWIPE = {
  velocidadeMinPtS: combate.gestos.swipe.velocidade_min_pt_s,
  janelaMs: combate.gestos.swipe.janela_ms,
  dtMinMs: combate.gestos.swipe.dt_min_ms,
  distanciaMinPt: combate.gestos.swipe.distancia_min_pt,
  amostras: combate.gestos.swipe.amostras,
} as const;
const TOQUE_DUPLO = {
  intervaloMaxMs: combate.gestos.toque_duplo.intervalo_max_ms,
  duracaoMaxMs: combate.gestos.toque_duplo.duracao_max_ms,
  distanciaMaxPt: combate.gestos.toque_duplo.distancia_entre_toques_max_pt,
  deslocamentoMaxPt: combate.gestos.toque_duplo.deslocamento_max_pt,
} as const;
/** Um timeStamp a mais de 60 s do relógio do quadro está em outro relógio: vale o agora do quadro (P3). */
const RELOGIO_SUSPEITO_MS = 60_000;

export type OrigemDaPausa = 'botao' | 'gesto';
export type ModoDoTradutor = 'vigilia' | 'pausa' | 'modal';
export type TipoDeModal = 'cartas' | 'bau';
/** Toques em alvo do modal guardados por quadro (M4): a 8 fps, um toque duplo entre dois quadros conta como 2. */
export const MAX_TOQUES_NO_MODAL = 8;

/** Estado do joystick, em pt lógicos; a cena Hud o desenha e o __GAME_DEBUG__ o lê. */
export interface EstadoDoJoystick {
  ativo: boolean;
  /** Base: onde o dedo dono tocou. Fica com a última origem depois de soltar. */
  origemX: number;
  origemY: number;
  /** Pino em relação à base, preso no raio. */
  pinoX: number;
  pinoY: number;
  /** Vetor com a zona morta e a curva (|v| ≤ 1). */
  vx: number;
  vy: number;
}

export class TradutorDeGestos {
  readonly joystick: EstadoDoJoystick = { ativo: false, origemX: 0, origemY: 0, pinoX: 0, pinoY: 0, vx: 0, vy: 0 };
  /** Toques novos descartados por falta de slot desde reiniciar(). */
  dedosPerdidos = 0;
  /** Toques que viraram dono do joystick desde reiniciar() (__GAME_DEBUG__.entrada.joystick.criados). */
  joystickCriados = 0;
  /** Pedido de pausa deste frame (botão ou gesto), lido pela Vigília depois de traduzir. */
  pedidoDePausa: OrigemDaPausa | null = null;
  /** No modo pausa: o alvo da tela de pausa acionado neste frame (começou e soltou dentro). */
  toqueNaPausa: string | null = null;
  /** 'vigilia': joystick, botão e gesto; 'pausa': só os alvos da tela de pausa (P8); 'modal': só os do modal (M5). */
  modo: ModoDoTradutor = 'vigilia';
  /** No modo modal: os alvos tocados neste quadro (índice da carta, ou 0 = Continuar do baú), em ordem. */
  readonly toquesNoModal = new Int8Array(MAX_TOQUES_NO_MODAL);
  nToquesNoModal = 0;
  /** Qual modal recebe os toques. */
  tipoDeModal: TipoDeModal = 'cartas';
  private readonly ids = new Float64Array(MAX_DEDOS);
  private readonly papel = new Uint8Array(MAX_DEDOS);
  private readonly inicioX = new Float64Array(MAX_DEDOS);
  private readonly inicioY = new Float64Array(MAX_DEDOS);
  private readonly inicioT = new Float64Array(MAX_DEDOS);
  private readonly parado = new Uint8Array(MAX_DEDOS);
  /** No modo pausa: o índice do alvo onde o dedo começou (−1 = nenhum). */
  private readonly alvoInicial = new Int8Array(MAX_DEDOS);
  private gestoTravado = false;
  private readonly botao: Alvo = { id: 'pausa', x: 0, y: 0, largura: 0, altura: 0 };
  private readonly alvosDaPausa: Alvo[] = [];
  private readonly alvosDasCartas: Alvo[] = [];
  private readonly alvosDoBau: Alvo[] = [];
  /** Anel de amostras (x, y, t) do dedo dono do joystick, para o swipe (GE1). */
  private readonly amostras = new Float64Array(SWIPE.amostras * 3);
  private nAmostras = 0;
  private cabeca = 0;
  /** O swipe só dispara de novo depois que a velocidade cai a 400 pt/s ou menos. */
  private swipeArmado = true;
  /** O último toque curto na área do joystick, esperando o par do toque duplo (GE2). */
  private temToque = false;
  private toqueFimT = 0;
  private toqueX = 0;
  private toqueY = 0;
  /** O dedo que fechou um par não abre outro (um 3º toque não encadeia). */
  private readonly fechouPar = new Uint8Array(MAX_DEDOS);
  /** Pedido de esquiva do teclado de debug (Espaço), atendido no próximo `traduzir`. */
  private esquivaDoTeclado = false;
  /** Os ComandosDoPasso do último `traduzir`: `mudarModo` zera as ações pendentes neles. */
  private saida: ComandosDoPasso | null = null;
  private dono = -1;
  private atualX = 0;
  private atualY = 0;
  private readonly area: Alvo = { id: 'joystick', x: 0, y: 0, largura: 0, altura: 0 };
  private readonly v: Vetor = { x: 0, y: 0 };
  /** Vetor do teclado (build de debug), usado quando nenhum toque move o jogador. */
  readonly teclado: Vetor = { x: 0, y: 0 };

  /** Começa a Vigília: solta todos os dedos; um toque que começou antes nunca vira dono. */
  reiniciar(): void {
    this.papel.fill(PAPEL.livre);
    this.dono = -1;
    this.joystick.ativo = false;
    this.joystick.vx = this.joystick.vy = 0;
    this.dedosPerdidos = 0;
    this.joystickCriados = 0;
    this.teclado.x = this.teclado.y = 0;
    this.temToque = false;
    this.esquivaDoTeclado = false;
    this.saida = null;
    this.modo = 'vigilia';
    this.pedidoDePausa = null;
    this.toqueNaPausa = null;
    this.nToquesNoModal = 0;
    this.gestoTravado = false;
  }

  /** Recalcula a área do joystick, o botão de pausa e os alvos da tela de pausa (create e resize da Hud). */
  definirArea(insets: Insets): void {
    areaDoJoystick(insets, this.area);
    alvoDaPausa(insets, this.botao);
    alvosDaTelaDePausa(insets, this.alvosDaPausa);
    alvosDasCartas(insets, this.alvosDasCartas);
    alvosDoBau(insets, this.alvosDoBau);
  }

  /**
   * Troca de modo (P8): ao abrir a pausa e ao continuar, todos os dedos são
   * soltos; depois do Continuar, só um toque novo cria o joystick, e um toque
   * que começou antes da abertura nunca aciona um alvo da pausa.
   */
  mudarModo(modo: ModoDoTradutor, tipoDeModal: TipoDeModal = 'cartas'): void {
    for (let s = 0; s < MAX_DEDOS; s++) this.soltar(s);
    // A esquiva pendente e o 1º toque do par não atravessam a pausa nem o modal (D5 §9).
    if (this.saida) {
      this.saida.acoes[0] = 0;
      this.saida.mira[0] = this.saida.mira[1] = 0;
    }
    this.temToque = false;
    this.esquivaDoTeclado = false;
    this.modo = modo;
    this.tipoDeModal = tipoDeModal;
    this.nToquesNoModal = 0;
    this.gestoTravado = false;
  }

  /** Esquece os toques de modal que sobraram no quadro e solta os dedos (M4: a oferta seguinte só recebe toques novos). */
  descartarToquesDoModal(): void {
    this.nToquesNoModal = 0;
    for (let s = 0; s < MAX_DEDOS; s++) this.soltar(s);
  }

  /**
   * Esvazia a fila e escreve o movimento do frame em `out`. `agora` é o
   * performance.now() do quadro, no relógio do TouchEvent.timeStamp: com ele,
   * os dedos parados (que não geram evento) completam os 500 ms do gesto (P3).
   */
  traduzir(fila: FilaDeToques, out: ComandosDoPasso, agora = Number.NaN): void {
    this.saida = out;
    this.pedidoDePausa = null;
    this.toqueNaPausa = null;
    this.nToquesNoModal = 0;
    if (fila.soltarTodos) {
      for (let s = 0; s < MAX_DEDOS; s++) this.soltar(s);
      fila.soltarTodos = false;
    }
    const ev = fila.eventos;
    for (let k = 0; k < fila.n; k++) {
      const i = k * CAMPOS_POR_EVENTO;
      const tipo = ev[i]!;
      const id = ev[i + 1]!;
      let t = ev[i + 4]!;
      if (Math.abs(agora - t) > RELOGIO_SUSPEITO_MS) t = agora;
      if (tipo === TIPO_DE_TOQUE.inicio) {
        // ADR-0002 §12: a cada touchstart, os slots são conferidos com e.touches antes de classificar o dedo
        // novo; assim, o toque que segue um fim perdido pode virar dono.
        this.reconciliar(fila, k + 1);
        this.comecar(id, ev[i + 2]!, ev[i + 3]!, t);
      } else {
        const s = this.slotDe(id);
        if (s < 0) continue;
        if (tipo === TIPO_DE_TOQUE.move) {
          if (this.parado[s] === 1) this.conferirParado(s, ev[i + 2]!, ev[i + 3]!);
          if (s === this.dono) {
            this.atualX = ev[i + 2]!;
            this.atualY = ev[i + 3]!;
            this.avaliarSwipe(out, this.atualX, this.atualY, t);
          }
        } else {
          // O gesto pode completar entre o último quadro e o fim do dedo: avalia no instante do evento.
          this.avaliarGesto(t);
          if (tipo === TIPO_DE_TOQUE.fim) {
            this.acionar(s, ev[i + 2]!, ev[i + 3]!);
            this.registrarToque(s, ev[i + 2]!, ev[i + 3]!, t);
          }
          this.soltar(s);
        }
      }
    }
    this.reconciliar(fila, fila.n);
    fila.n = 0;
    this.avaliarGesto(agora);
    if (this.esquivaDoTeclado) {
      this.esquivaDoTeclado = false;
      if (this.modo === 'vigilia') this.pedirEsquiva(out, this.teclado.x, this.teclado.y);
    }
    const j = this.joystick;
    if (j.ativo) {
      const dx = this.atualX - j.origemX;
      const dy = this.atualY - j.origemY;
      pinoDoJoystick(dx, dy, this.v);
      j.pinoX = this.v.x;
      j.pinoY = this.v.y;
      vetorDoJoystick(dx, dy, this.v);
      j.vx = this.v.x;
      j.vy = this.v.y;
    }
    // O toque tem prioridade sobre o teclado (§4); na pausa e no modal, nada move.
    const pausa = this.modo !== 'vigilia';
    out.movimento[0] = pausa ? 0 : j.ativo ? j.vx : this.teclado.x;
    out.movimento[1] = pausa ? 0 : j.ativo ? j.vy : this.teclado.y;
  }

  /**
   * Solta os dedos que não estão mais em `e.touches` (um fim descartado pela fila cheia ou que não chegou).
   * O retrato é o do último evento do frame; por isso, um dedo com evento na fila a partir de `desde` ainda
   * estava na tela naquele ponto e fica: o seu próprio fim o solta.
   */
  private reconciliar(fila: FilaDeToques, desde: number): void {
    if (!fila.retratoValido) return;
    for (let s = 0; s < MAX_DEDOS; s++) {
      if (this.papel[s] === PAPEL.livre || this.ids[s] === ID_DO_MOUSE || fila.noRetrato(this.ids[s]!)) continue;
      if (!this.temEventoDesde(fila, desde, this.ids[s]!)) this.soltar(s);
    }
  }

  private temEventoDesde(fila: FilaDeToques, desde: number, id: number): boolean {
    for (let k = desde; k < fila.n; k++) if (fila.eventos[k * CAMPOS_POR_EVENTO + 1] === id) return true;
    return false;
  }

  private slotDe(id: number): number {
    for (let s = 0; s < MAX_DEDOS; s++) if (this.papel[s] !== PAPEL.livre && this.ids[s] === id) return s;
    return -1;
  }

  /**
   * Classifica o dedo novo. Na Vigília: no botão de pausa, só o botão; senão, o
   * 1º dedo que começa na área vira dono do joystick, até soltar (F-002 §4); os
   * outros contam para o gesto. Na pausa: guarda o alvo onde começou.
   */
  private comecar(id: number, x: number, y: number, t: number): void {
    if (this.slotDe(id) >= 0) return;
    let s = 0;
    while (s < MAX_DEDOS && this.papel[s] !== PAPEL.livre) s++;
    if (s === MAX_DEDOS) {
      this.dedosPerdidos++;
      return;
    }
    this.ids[s] = id;
    this.inicioX[s] = x;
    this.inicioY[s] = y;
    this.inicioT[s] = t;
    this.parado[s] = 1;
    this.fechouPar[s] = 0;
    this.alvoInicial[s] = -1;
    if (this.modo !== 'vigilia') {
      this.papel[s] = PAPEL.outro;
      const alvos = this.alvosDoModo();
      for (let k = 0; k < alvos.length; k++) if (contem(alvos[k]!, x, y)) this.alvoInicial[s] = k;
      return;
    }
    if (contem(this.botao, x, y)) {
      this.papel[s] = PAPEL.botao;
    } else if (this.dono < 0 && contem(this.area, x, y)) {
      // Toque duplo (GE2): dispara no touchstart do 2º toque, que segue como dono do joystick.
      if (this.temToque && this.saida) {
        const dt = t - this.toqueFimT;
        const dx = x - this.toqueX;
        const dy = y - this.toqueY;
        const m = TOQUE_DUPLO.distanciaMaxPt;
        if (dt >= 0 && dt <= TOQUE_DUPLO.intervaloMaxMs && dx * dx + dy * dy <= m * m) {
          this.temToque = false;
          this.fechouPar[s] = 1;
          this.pedirEsquiva(this.saida, 0, 0);
        }
      }
      this.nAmostras = this.cabeca = 0;
      this.swipeArmado = true;
      this.empurrarAmostra(x, y, t);
      this.papel[s] = PAPEL.joystick;
      this.dono = s;
      this.joystickCriados++;
      const j = this.joystick;
      j.ativo = true;
      j.origemX = this.atualX = x;
      j.origemY = this.atualY = y;
      j.pinoX = j.pinoY = j.vx = j.vy = 0;
    } else {
      this.papel[s] = PAPEL.outro;
    }
  }

  /** Liga o bit da esquiva e a mira (módulo 1; (0, 0) = a última direção) nos comandos; a mira é Float32. */
  private pedirEsquiva(out: ComandosDoPasso, mx: number, my: number): void {
    out.acoes[0] = out.acoes[0]! | ACAO.esquiva;
    const m2 = mx * mx + my * my;
    if (m2 > 0 && m2 < Infinity) {
      const m = Math.sqrt(m2);
      out.mira[0] = mx / m;
      out.mira[1] = my / m;
    } else {
      out.mira[0] = out.mira[1] = 0;
    }
  }

  /** Esquiva do teclado de debug (Espaço), na direção do teclado ou na última. */
  pedirEsquivaDoTeclado(): void {
    this.esquivaDoTeclado = true;
  }

  /** O dedo `s` saiu de 10 pt do início? Então deixa de ser "parado" (pausa e toque duplo). */
  private conferirParado(s: number, x: number, y: number): void {
    const dx = x - this.inicioX[s]!;
    const dy = y - this.inicioY[s]!;
    const m = this.papel[s] === PAPEL.joystick ? TOQUE_DUPLO.deslocamentoMaxPt : GESTO_DE_PAUSA.movimentoMaximoPt;
    if (dx * dx + dy * dy > m * m) this.parado[s] = 0;
  }

  private empurrarAmostra(x: number, y: number, t: number): void {
    const k = (this.cabeca % SWIPE.amostras) * 3;
    this.amostras[k] = x;
    this.amostras[k + 1] = y;
    this.amostras[k + 2] = t;
    this.cabeca++;
    if (this.nAmostras < SWIPE.amostras) this.nAmostras++;
  }

  /**
   * Swipe (GE1): a cada move do dono do joystick, a amostra mais antiga dentro
   * de 100 ms até a atual dá a velocidade e a direção. Dispara com Δt ≥ 16 ms,
   * distância ≥ 24 pt e velocidade estritamente acima de 400 pt/s (comparada ao
   * quadrado, sem divisão); só rearma quando a velocidade cai a 400 pt/s ou menos.
   */
  private avaliarSwipe(out: ComandosDoPasso, x: number, y: number, t: number): void {
    if (this.modo !== 'vigilia') return;
    this.empurrarAmostra(x, y, t);
    const n = this.nAmostras;
    let antiga = -1;
    for (let k = 1; k < n; k++) {
      const idx = ((this.cabeca - 1 - k + SWIPE.amostras * 2) % SWIPE.amostras) * 3;
      const idade = t - this.amostras[idx + 2]!;
      if (idade < 0 || idade > SWIPE.janelaMs) break;
      antiga = idx;
    }
    if (antiga < 0) {
      this.swipeArmado = true;
      return;
    }
    const dt = t - this.amostras[antiga + 2]!;
    if (dt < SWIPE.dtMinMs) return;
    const dx = x - this.amostras[antiga]!;
    const dy = y - this.amostras[antiga + 1]!;
    const d2 = dx * dx + dy * dy;
    const limite = SWIPE.velocidadeMinPtS * dt;
    if (d2 * 1e6 > limite * limite) {
      if (this.swipeArmado && d2 >= SWIPE.distanciaMinPt * SWIPE.distanciaMinPt) {
        this.swipeArmado = false;
        this.pedirEsquiva(out, dx, dy);
      }
    } else {
      this.swipeArmado = true;
    }
  }

  /** Fim de um toque curto e parado na área do joystick: fica esperando o par (GE2). */
  private registrarToque(s: number, x: number, y: number, t: number): void {
    if (this.modo !== 'vigilia' || this.papel[s] !== PAPEL.joystick || this.fechouPar[s] === 1 || this.parado[s] !== 1) return;
    if (t - this.inicioT[s]! > TOQUE_DUPLO.duracaoMaxMs) return;
    const dx = x - this.inicioX[s]!;
    const dy = y - this.inicioY[s]!;
    const m = TOQUE_DUPLO.deslocamentoMaxPt;
    if (dx * dx + dy * dy > m * m) return;
    this.temToque = true;
    this.toqueFimT = t;
    this.toqueX = this.inicioX[s]!;
    this.toqueY = this.inicioY[s]!;
  }

  /** Fim de um dedo (não cancelamento): o botão e os alvos da pausa acionam se o dedo começou e soltou dentro (P1, P7, P9). */
  private acionar(s: number, x: number, y: number): void {
    if (this.modo === 'vigilia') {
      if (this.papel[s] === PAPEL.botao && contem(this.botao, x, y)) this.pedidoDePausa = 'botao';
      return;
    }
    const k = this.alvoInicial[s]!;
    const alvos = this.alvosDoModo();
    if (k < 0 || !contem(alvos[k]!, x, y)) return;
    if (this.modo === 'pausa') this.toqueNaPausa = alvos[k]!.id;
    else if (this.nToquesNoModal < MAX_TOQUES_NO_MODAL) this.toquesNoModal[this.nToquesNoModal++] = k;
  }

  private alvosDoModo(): Alvo[] {
    if (this.modo === 'pausa') return this.alvosDaPausa;
    return this.tipoDeModal === 'bau' ? this.alvosDoBau : this.alvosDasCartas;
  }

  /**
   * Gesto de pausa (P3): dispara com pelo menos 2 dedos que contam (não são o
   * dono do joystick nem começaram no botão) parados há pelo menos 500 ms; uma
   * vez só, até um deles soltar.
   */
  private avaliarGesto(agora: number): void {
    if (this.modo !== 'vigilia' || this.gestoTravado) return;
    let n = 0;
    for (let s = 0; s < MAX_DEDOS; s++) {
      if (this.papel[s] === PAPEL.outro && this.parado[s] === 1 && agora - this.inicioT[s]! >= GESTO_DE_PAUSA.duracaoMs) n++;
    }
    if (n < GESTO_DE_PAUSA.dedos) return;
    this.gestoTravado = true;
    if (this.pedidoDePausa === null) this.pedidoDePausa = 'gesto';
  }

  private soltar(s: number): void {
    if (this.papel[s] === PAPEL.livre) return;
    if (this.papel[s] === PAPEL.outro) this.gestoTravado = false;
    this.papel[s] = PAPEL.livre;
    if (s !== this.dono) return;
    this.dono = -1;
    const j = this.joystick;
    j.ativo = false;
    j.pinoX = j.pinoY = j.vx = j.vy = 0;
  }
}
