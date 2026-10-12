// Consumidor do anel para o feedback da interface (decisoes-F-006 FB2, FB4, RE1, RE3 e RE12), sem Phaser: lê os
// contadores de eventos que o render do mundo mantém (aparo, esquiva perfeita, ação negada) e dispara o flash, os
// sons e o pulso da barra de stamina. Fora da simulação, do estado e do hash: o disparo nunca vem do passo.
import { ControladorDeFlash } from './flash';
import { SFX, LimiteDeVozes } from '../plataforma/sfx';
import { PULSO_DA_STAMINA } from './layoutDoHud';

/** Contadores de eventos lidos do anel, desde `reiniciar()` do consumidor. */
export interface ContadoresDeFeedback {
  aparo: number;
  esquivaPerfeita: number;
  acaoNegada: number;
}

export class FeedbackDaInterface {
  readonly flash = new ControladorDeFlash();
  readonly vozes = new LimiteDeVozes();
  /** Quadros de render que faltam do pulso da barra de stamina. */
  pulsoDaStamina = 0;
  private vistoAparo = 0;
  private vistaPerfeita = 0;
  private vistaNegada = 0;

  /**
   * Chamado uma vez por quadro de render, depois de o render do mundo ler o anel. `tocar` (null sem áudio) recebe
   * o índice do som; o flash e o som respeitam as opções.
   */
  atualizar(c: ContadoresDeFeedback, agoraMs: number, opcoes: { som: boolean; flashes: boolean }, tocar: ((sfx: number) => void) | null): void {
    // Um contador que voltou atrás é um consumidor reiniciado (nova Vigília).
    if (c.aparo < this.vistoAparo) this.vistoAparo = 0;
    if (c.esquivaPerfeita < this.vistaPerfeita) this.vistaPerfeita = 0;
    if (c.acaoNegada < this.vistaNegada) this.vistaNegada = 0;
    const novoAparo = c.aparo > this.vistoAparo;
    const novaPerfeita = c.esquivaPerfeita > this.vistaPerfeita;
    this.vistoAparo = c.aparo;
    this.vistaPerfeita = c.esquivaPerfeita;
    if (c.acaoNegada > this.vistaNegada) this.pulsoDaStamina = PULSO_DA_STAMINA.quadros;
    this.vistaNegada = c.acaoNegada;
    if (novoAparo || novaPerfeita) {
      if (opcoes.flashes) this.flash.pedir(agoraMs);
      if (opcoes.som && tocar !== null) {
        if (novoAparo && this.vozes.tentar(SFX.aparo, agoraMs)) tocar(SFX.aparo);
        if (novaPerfeita && this.vozes.tentar(SFX.esquivaPerfeita, agoraMs)) tocar(SFX.esquivaPerfeita);
      }
    }
  }

  reiniciar(): void {
    this.flash.reiniciar();
    this.pulsoDaStamina = 0;
    this.vistoAparo = this.vistaPerfeita = this.vistaNegada = 0;
  }
}
