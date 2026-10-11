// Camada de toque própria, sobre o canvas (ADR-0002 §12). Todo o input do
// Phaser fica desligado. Na F-001 ela converte para pt lógicos, impede o
// comportamento padrão e avisa, de forma síncrona, cada dedo que solta (o
// desbloqueio do áudio precisa rodar dentro do touchend). A fila de toques e o
// TradutorDeGestos entram na F-002.
import { ALTURA_LOGICA, LARGURA_LOGICA, type Caixa } from '../plataforma/safeArea';

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

  constructor(
    private readonly alvo: HTMLElement,
    private readonly aceitarMouse: boolean,
  ) {}

  ligar(): void {
    for (const tipo of ['touchstart', 'touchmove', 'touchcancel'] as const) {
      this.alvo.addEventListener(tipo, this.impedir, NAO_PASSIVO);
    }
    this.alvo.addEventListener('touchend', this.aoTouchEnd, NAO_PASSIVO);
    if (this.aceitarMouse) this.alvo.addEventListener('mouseup', this.aoMouseUp);
  }

  aoSoltar(fn: AoSoltar): void {
    this.ouvintes.push(fn);
  }

  removerAoSoltar(fn: AoSoltar): void {
    const i = this.ouvintes.indexOf(fn);
    if (i >= 0) this.ouvintes.splice(i, 1);
  }

  private readonly impedir = (e: Event): void => {
    if (e.cancelable) e.preventDefault();
  };

  private readonly aoTouchEnd = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const toque = e.changedTouches[i]!;
      this.avisar(toque.clientX, toque.clientY);
    }
  };

  private readonly aoMouseUp = (e: MouseEvent): void => {
    this.avisar(e.clientX, e.clientY);
  };

  /** A caixa é lida no próprio evento: o FIT muda com resize, rotação e a barra do Safari. */
  private avisar(clientX: number, clientY: number): void {
    clienteParaPontos(clientX, clientY, this.alvo.getBoundingClientRect(), this.ponto);
    for (const fn of this.ouvintes.slice()) fn(this.ponto.x, this.ponto.y);
  }
}
