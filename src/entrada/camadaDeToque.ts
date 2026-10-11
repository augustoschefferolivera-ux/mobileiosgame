// Camada de toque própria, sobre o canvas (ADR-0002 §12). Todo o input do
// Phaser fica desligado. Ela converte para pt lógicos, impede o comportamento
// padrão, copia cada toque para a FilaDeToques (sem alocar) e avisa, de forma
// síncrona, cada dedo que solta (o desbloqueio do áudio precisa rodar dentro
// do touchend). No build de debug, o mouse é um dedo virtual na mesma fila.
import { ALTURA_LOGICA, LARGURA_LOGICA, type Caixa } from '../plataforma/safeArea';
import { TIPO_DE_TOQUE, type FilaDeToques, type TipoDeToque } from './filaDeToques';
import { ID_DO_MOUSE } from './tradutorDeGestos';

export type AoSoltar = (x: number, y: number) => void;

const NAO_PASSIVO: AddEventListenerOptions = { passive: false };

/** clientX/clientY → pt lógicos, pela caixa do canvas na página. */
export function clienteParaPontos(clientX: number, clientY: number, caixa: Caixa, out: { x: number; y: number }): void {
  out.x = ((clientX - caixa.left) * LARGURA_LOGICA) / caixa.width;
  out.y = ((clientY - caixa.top) * ALTURA_LOGICA) / caixa.height;
}

export class CamadaDeToque {
  private readonly ouvintes: AoSoltar[] = [];
  private readonly ponto = { x: 0, y: 0 };
  /** Caixa do canvas, lida de novo no 1º evento depois de um resize (o FIT muda com rotação e a barra do Safari). */
  private readonly caixa: Caixa = { left: 0, top: 0, width: 0, height: 0 };
  private caixaValida = false;
  private mouseApertado = false;

  constructor(
    private readonly alvo: HTMLElement,
    private readonly aceitarMouse: boolean,
    private readonly fila: FilaDeToques,
  ) {}

  ligar(): void {
    this.alvo.addEventListener('touchstart', this.aoTouchStart, NAO_PASSIVO);
    this.alvo.addEventListener('touchmove', this.aoTouchMove, NAO_PASSIVO);
    this.alvo.addEventListener('touchend', this.aoTouchEnd, NAO_PASSIVO);
    this.alvo.addEventListener('touchcancel', this.aoTouchCancel, NAO_PASSIVO);
    if (this.aceitarMouse) {
      this.alvo.addEventListener('mousedown', this.aoMouse);
      this.alvo.addEventListener('mousemove', this.aoMouse);
      this.alvo.addEventListener('mouseup', this.aoMouse);
    }
    // Soltar todos os dedos (design/decisoes-F-002.md §4); addEventListener, nunca window.onblur (ADR-0002 §12).
    const janela = this.alvo.ownerDocument.defaultView;
    janela?.addEventListener('blur', this.soltarTodos);
    janela?.addEventListener('pagehide', this.soltarTodos);
    this.alvo.ownerDocument.addEventListener('visibilitychange', this.soltarTodos);
    janela?.addEventListener('resize', this.invalidarCaixa);
    janela?.addEventListener('orientationchange', this.invalidarCaixa);
  }

  aoSoltar(fn: AoSoltar): void {
    this.ouvintes.push(fn);
  }

  removerAoSoltar(fn: AoSoltar): void {
    const i = this.ouvintes.indexOf(fn);
    if (i >= 0) this.ouvintes.splice(i, 1);
  }

  /** Também chamado no RESIZE do ScaleManager, que muda o estilo do canvas depois do resize da janela. */
  readonly invalidarCaixa = (): void => {
    this.caixaValida = false;
  };

  private readonly soltarTodos = (): void => {
    this.fila.pedirSoltarTodos();
    this.mouseApertado = false;
  };

  private readonly aoTouchStart = (e: TouchEvent): void => this.copiar(e, TIPO_DE_TOQUE.inicio);
  private readonly aoTouchMove = (e: TouchEvent): void => this.copiar(e, TIPO_DE_TOQUE.move);

  private readonly aoTouchEnd = (e: TouchEvent): void => {
    this.copiar(e, TIPO_DE_TOQUE.fim);
    for (let i = 0; i < e.changedTouches.length; i++) {
      const toque = e.changedTouches[i]!;
      this.avisar(toque.clientX, toque.clientY);
    }
  };

  private readonly aoTouchCancel = (e: TouchEvent): void => {
    this.copiar(e, TIPO_DE_TOQUE.cancela);
    if (e.touches.length === 0) this.soltarTodos();
  };

  private copiar(e: TouchEvent, tipo: TipoDeToque): void {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const toque = e.changedTouches[i]!;
      this.paraPontos(toque.clientX, toque.clientY);
      this.fila.empurrar(tipo, toque.identifier, this.ponto.x, this.ponto.y, e.timeStamp);
    }
    this.fila.gravarRetrato(e.touches);
  }

  private readonly aoMouse = (e: MouseEvent): void => {
    if (e.type === 'mousemove' && !this.mouseApertado) return;
    const tipo = e.type === 'mousedown' ? TIPO_DE_TOQUE.inicio : e.type === 'mouseup' ? TIPO_DE_TOQUE.fim : TIPO_DE_TOQUE.move;
    if (tipo === TIPO_DE_TOQUE.fim && !this.mouseApertado) return;
    this.mouseApertado = tipo !== TIPO_DE_TOQUE.fim;
    this.paraPontos(e.clientX, e.clientY);
    this.fila.empurrar(tipo, ID_DO_MOUSE, this.ponto.x, this.ponto.y, e.timeStamp);
    if (tipo === TIPO_DE_TOQUE.fim) this.avisar(e.clientX, e.clientY);
  };

  private paraPontos(clientX: number, clientY: number): void {
    if (!this.caixaValida) {
      const r = this.alvo.getBoundingClientRect();
      this.caixa.left = r.left;
      this.caixa.top = r.top;
      this.caixa.width = r.width;
      this.caixa.height = r.height;
      this.caixaValida = true;
    }
    clienteParaPontos(clientX, clientY, this.caixa, this.ponto);
  }

  private avisar(clientX: number, clientY: number): void {
    this.paraPontos(clientX, clientY);
    for (const fn of this.ouvintes.slice()) fn(this.ponto.x, this.ponto.y);
  }
}
