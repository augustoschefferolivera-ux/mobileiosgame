// A escolha no modal, sem Phaser (design/decisoes-F-005.md §3, M4 e M5): a
// seleção por toques, a confirmação, a abertura e o fechamento da fila. A
// Vigília só liga os ganchos (telemetria, mostrar e esconder a cena Modal).
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { Estado } from '../logica/nucleo/estado';
import { bauNaFrente, confirmarModal, modalAberto } from '../logica/progressao/modal';
import type { FilaDeToques } from '../entrada/filaDeToques';
import type { TradutorDeGestos } from '../entrada/tradutorDeGestos';

/** O que a escolha lê e escreve da simulação: o estado, os dados e a carta selecionada (estado de UI). */
export interface SimDoModal {
  readonly estado: Estado;
  readonly dados: DadosDaVigilia;
  readonly modal: { selecionada: number | null };
}

export interface GanchosDoModal {
  /** Antes de aplicar a carta k escolhida numa oferta (telemetria `level_up`); não vale para o baú. */
  aoEscolherCarta?(k: number): void;
  /** A fila acabou: o modal some e o tradutor voltou à Vigília. */
  aoFecharAFila?(): void;
}

type EntradaDoModal = { readonly tradutor: TradutorDeGestos; readonly fila: Pick<FilaDeToques, 'pedirSoltarTodos'> };

/** Abre o modal (M5): seleção vazia, todos os dedos soltos e o tradutor no modo modal, do baú ou das cartas. */
export function abrirModal(sim: SimDoModal, entrada: EntradaDoModal): void {
  sim.modal.selecionada = null;
  entrada.fila.pedirSoltarTodos();
  entrada.tradutor.mudarModo('modal', bauNaFrente(sim.estado) ? 'bau' : 'cartas');
}

/**
 * Os toques do quadro, em ordem (M4): num baú, o Continuar fecha; nas cartas,
 * o 1º toque seleciona, outro troca, e o toque na selecionada confirma. Depois
 * de confirmar, os toques que sobraram são descartados e os dedos soltos.
 */
export function tratarToquesDoModal(sim: SimDoModal, entrada: EntradaDoModal, ganchos: GanchosDoModal = {}): void {
  const trad = entrada.tradutor;
  for (let i = 0; i < trad.nToquesNoModal; i++) {
    const k = trad.toquesNoModal[i]!;
    if (bauNaFrente(sim.estado)) {
      confirmar(sim, entrada, 0, ganchos);
      return;
    }
    if (sim.modal.selecionada === k) {
      ganchos.aoEscolherCarta?.(k);
      confirmar(sim, entrada, k, ganchos);
      return;
    }
    sim.modal.selecionada = k;
  }
}

/** Confirma o modal da frente; com a fila acabada, o tradutor volta à Vigília e só um toque novo cria o joystick. */
function confirmar(sim: SimDoModal, entrada: EntradaDoModal, k: number, ganchos: GanchosDoModal): void {
  const trad = entrada.tradutor;
  confirmarModal(sim.estado, sim.dados, k);
  sim.modal.selecionada = null;
  trad.descartarToquesDoModal();
  entrada.fila.pedirSoltarTodos();
  if (modalAberto(sim.estado)) {
    trad.mudarModo('modal', bauNaFrente(sim.estado) ? 'bau' : 'cartas');
  } else {
    trad.mudarModo('vigilia');
    ganchos.aoFecharAFila?.();
  }
}
