// Retardo da barra de HP (decisoes-F-007 HB2), sem Phaser e fora do estado e do hash: quando o HP cai, a barra guarda o valor
// de antes por 12 passos da simulação (a janela renova a cada nova perda) e depois alcança o HP. Lido uma vez por quadro de
// render; o passo é o `CAB.passo`, então a janela é exata em passos e para junto com a simulação.
import { RETARDO_DO_HP } from './layoutDoHud';

export class RetardoDeHp {
  /** O HP que a barra de retardo mostra (≥ HP). */
  valor = 0;
  /** O passo (exclusivo) em que o retardo acaba. */
  ate = 0;
  private ultimo = -1;

  /** Recomeça (nova Vigília ou outro estado). */
  reiniciar(): void {
    this.valor = 0;
    this.ate = 0;
    this.ultimo = -1;
  }

  /** Chamado com o HP e o passo do quadro. A perda em `passo` P mostra o retardo em P a P + 11; em P + 12 ele já é o HP. */
  atualizar(hp: number, passo: number): void {
    if (this.ultimo < 0) this.valor = hp;
    else if (hp < this.ultimo) {
      if (passo >= this.ate) this.valor = this.ultimo;
      this.ate = passo + RETARDO_DO_HP.passos;
    }
    if (passo >= this.ate || hp > this.valor) this.valor = hp;
    this.ultimo = hp;
  }
}
