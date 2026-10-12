// Fila de toques (ADR-0002 §12; design/decisoes-F-002.md §4): os handlers do
// DOM só copiam tipo, identifier, posição em pt e timeStamp para um
// Float64Array, sem alocar; o TradutorDeGestos a esvazia uma vez por frame.
// Também guarda o retrato dos identificadores de `e.touches` do último evento,
// para soltar dedos cujo fim se perdeu, e o pedido de soltar todos (touchcancel
// sem toques restantes, blur, pagehide, visibilitychange).

export const TIPO_DE_TOQUE = { inicio: 0, move: 1, fim: 2, cancela: 3 } as const;
export type TipoDeToque = (typeof TIPO_DE_TOQUE)[keyof typeof TIPO_DE_TOQUE];

/** Eventos por frame; os excedentes são descartados e contados (§4). */
export const CAPACIDADE_DA_FILA = 64;
/** Identificadores guardados no retrato; com mais dedos, o retrato não vale e ninguém é solto por ele. */
export const CAPACIDADE_DO_RETRATO = 16;
/** Campos por evento: tipo, identifier, x, y, timeStamp. */
export const CAMPOS_POR_EVENTO = 5;

/** O que se lê de `e.touches` (uma TouchList). */
export interface ListaDeToques {
  readonly length: number;
  readonly [i: number]: { readonly identifier: number } | undefined;
}

export class FilaDeToques {
  readonly eventos = new Float64Array(CAPACIDADE_DA_FILA * CAMPOS_POR_EVENTO);
  /** Eventos na fila. */
  n = 0;
  /** Eventos descartados por fila cheia desde reiniciar() (soma em __GAME_DEBUG__.toquesPerdidos). */
  perdidos = 0;
  readonly retrato = new Float64Array(CAPACIDADE_DO_RETRATO);
  nRetrato = 0;
  /** Falso quando `e.touches` passou da capacidade do retrato. */
  retratoValido = true;
  /** Soltar todos os dedos antes dos eventos da fila. */
  soltarTodos = false;
  /** Só a Vigília recebe toques; fora dela a fila não enche. */
  ativa = false;

  /** Começa a Vigília: esvazia, zera as contagens e passa a aceitar eventos. */
  reiniciar(): void {
    this.n = 0;
    this.perdidos = 0;
    this.nRetrato = 0;
    this.retratoValido = true;
    this.soltarTodos = false;
    this.ativa = true;
  }

  empurrar(tipo: TipoDeToque, id: number, x: number, y: number, t: number): void {
    if (!this.ativa) return;
    if (this.n >= CAPACIDADE_DA_FILA) {
      this.perdidos++;
      return;
    }
    const i = this.n * CAMPOS_POR_EVENTO;
    const ev = this.eventos;
    ev[i] = tipo;
    ev[i + 1] = id;
    ev[i + 2] = x;
    ev[i + 3] = y;
    ev[i + 4] = t;
    this.n++;
  }

  /** Copia os identificadores de `e.touches` (todos os dedos ainda na tela). */
  gravarRetrato(toques: ListaDeToques): void {
    this.retratoValido = toques.length <= CAPACIDADE_DO_RETRATO;
    this.nRetrato = 0;
    if (!this.retratoValido) return;
    for (let i = 0; i < toques.length; i++) this.retrato[this.nRetrato++] = toques[i]!.identifier;
  }

  /** Para o gancho `entrada.injetar`, que não tem `e.touches`: mantém o retrato como um TouchEvent faria. */
  ajustarRetrato(tipo: TipoDeToque, id: number): void {
    let i = 0;
    while (i < this.nRetrato && this.retrato[i] !== id) i++;
    if (tipo === TIPO_DE_TOQUE.inicio) {
      if (i === this.nRetrato && this.nRetrato < CAPACIDADE_DO_RETRATO) this.retrato[this.nRetrato++] = id;
    } else if ((tipo === TIPO_DE_TOQUE.fim || tipo === TIPO_DE_TOQUE.cancela) && i < this.nRetrato) {
      this.retrato[i] = this.retrato[--this.nRetrato]!;
    }
  }

  noRetrato(id: number): boolean {
    for (let i = 0; i < this.nRetrato; i++) if (this.retrato[i] === id) return true;
    return false;
  }

  /** Descarta a fila e pede para soltar todos os dedos: depois disso, só um toque novo cria o joystick. */
  pedirSoltarTodos(): void {
    this.n = 0;
    this.nRetrato = 0;
    this.retratoValido = true;
    this.soltarTodos = true;
  }
}
