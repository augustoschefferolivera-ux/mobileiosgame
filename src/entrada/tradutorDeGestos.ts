// TradutorDeGestos na F-002 (ADR-0002 §12; design/decisoes-F-002.md §4): uma
// vez por frame, esvazia a fila de toques em slots fixos de dedos, classifica
// cada dedo pelo lugar onde começou, reconcilia com o retrato de `e.touches`
// e escreve o movimento nos ComandosDoPasso, já com a zona morta, a curva e o
// limite. Swipe e toque duplo (esquiva) ficam para a F-006. Não aloca.
import type { ComandosDoPasso } from '../logica/nucleo/comandos';
import { areaDoJoystick, contem, type Alvo } from './alvos';
import { CAMPOS_POR_EVENTO, TIPO_DE_TOQUE, type FilaDeToques } from './filaDeToques';
import { pinoDoJoystick, vetorDoJoystick, type Vetor } from './joystick';
import type { Insets } from '../plataforma/safeArea';

/** Dedos acompanhados ao mesmo tempo; o 6º é descartado e contado (§4; conferir no iPhone, Q-29). */
export const MAX_DEDOS = 5;
/** Identificador do dedo virtual do mouse (build de debug); nunca solto pelo retrato de toques. */
export const ID_DO_MOUSE = -1;

const PAPEL = { livre: 0, joystick: 1, outro: 2 } as const;

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
  private readonly ids = new Float64Array(MAX_DEDOS);
  private readonly papel = new Uint8Array(MAX_DEDOS);
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
    this.teclado.x = this.teclado.y = 0;
  }

  /** Recalcula a área do joystick (create e resize da Hud). */
  definirArea(insets: Insets): void {
    areaDoJoystick(insets, this.area);
  }

  /** Esvazia a fila e escreve o movimento do frame em `out`. */
  traduzir(fila: FilaDeToques, out: ComandosDoPasso): void {
    if (fila.soltarTodos) {
      for (let s = 0; s < MAX_DEDOS; s++) this.soltar(s);
      fila.soltarTodos = false;
    }
    const ev = fila.eventos;
    for (let k = 0; k < fila.n; k++) {
      const i = k * CAMPOS_POR_EVENTO;
      const tipo = ev[i]!;
      const id = ev[i + 1]!;
      if (tipo === TIPO_DE_TOQUE.inicio) {
        // ADR-0002 §12: a cada touchstart, os slots são conferidos com e.touches antes de classificar o dedo
        // novo; assim, o toque que segue um fim perdido pode virar dono.
        this.reconciliar(fila, k + 1);
        this.comecar(id, ev[i + 2]!, ev[i + 3]!);
      } else {
        const s = this.slotDe(id);
        if (s < 0) continue;
        if (tipo === TIPO_DE_TOQUE.move) {
          if (s === this.dono) {
            this.atualX = ev[i + 2]!;
            this.atualY = ev[i + 3]!;
          }
        } else this.soltar(s);
      }
    }
    this.reconciliar(fila, fila.n);
    fila.n = 0;
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
    // O toque tem prioridade sobre o teclado (§4).
    out.movimento[0] = j.ativo ? j.vx : this.teclado.x;
    out.movimento[1] = j.ativo ? j.vy : this.teclado.y;
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

  /** O 1º dedo que começa na área vira dono do joystick, até soltar (§4). */
  private comecar(id: number, x: number, y: number): void {
    if (this.slotDe(id) >= 0) return;
    let s = 0;
    while (s < MAX_DEDOS && this.papel[s] !== PAPEL.livre) s++;
    if (s === MAX_DEDOS) {
      this.dedosPerdidos++;
      return;
    }
    this.ids[s] = id;
    if (this.dono < 0 && contem(this.area, x, y)) {
      this.papel[s] = PAPEL.joystick;
      this.dono = s;
      const j = this.joystick;
      j.ativo = true;
      j.origemX = this.atualX = x;
      j.origemY = this.atualY = y;
      j.pinoX = j.pinoY = j.vx = j.vy = 0;
    } else {
      this.papel[s] = PAPEL.outro;
    }
  }

  private soltar(s: number): void {
    if (this.papel[s] === PAPEL.livre) return;
    this.papel[s] = PAPEL.livre;
    if (s !== this.dono) return;
    this.dono = -1;
    const j = this.joystick;
    j.ativo = false;
    j.pinoX = j.pinoY = j.vx = j.vy = 0;
  }
}
