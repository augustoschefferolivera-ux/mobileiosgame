// Telemetria local `esquiva` e `aparo` (doc 10 §6; Q-30; decisoes-F-006 FB6, CA6, VT4): lida do anel
// de eventos pela Vigília, como `arma_uniao`. Nada entra no estado nem no hash.
//
// `esquiva`: uma linha por esquiva realizada (a negada não registra), gravada no primeiro destes:
// (a) o evento `esquivaPerfeita`; (b) o quadro em que `esquivaPasso ≥ 14` (a decisão da perfeita
// fecha no passo 14) ou `== 0`; (c) a chegada de um novo evento `esquiva` (esquivas encadeadas).
// `aparo`: uma linha por desfecho (sucesso com o id do atacante, falho e vazio).
import { IDS_DE_TIPO } from '../logica/mundo/tipos';
import { CAB, JOGADOR3_U8, type Estado } from '../logica/nucleo/estado';
import { EV, EVENTO, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import type { RegistroDeTelemetria } from '../plataforma/telemetria';

/** Passo da esquiva em que a decisão de `perfeita` já fechou (ES6). */
const PASSO_DA_DECISAO = 14;
const PASSOS_POR_MINUTO = 3600;

export class TelemetriaDeCombate {
  private lidos = 0;
  private pendente = false;
  private passoPendente = 0;
  private minutoPendente = 0;

  /** Lê os eventos novos do anel e grava as linhas de `esquiva` e `aparo`. */
  ler(e: Estado, registro: RegistroDeTelemetria): void {
    const anel = e.eventos;
    const escritos = eventosEscritos(anel);
    if (this.lidos > escritos) {
      this.lidos = 0;
      this.pendente = false;
    }
    const passoAtual = e.cab[CAB.passo]!;
    const relogio = e.cab[CAB.relogio]!;
    for (let n = Math.max(this.lidos, escritos - 1024); n < escritos; n++) {
      const i = inicioDoEvento(n);
      const passo = anel.u32[i + EV.passo]!;
      const tipo = anel.u32[i + EV.tipoArmaForma]! & 0xff;
      if (tipo === EVENTO.esquiva) {
        if (this.pendente) this.gravarEsquiva(registro, false);
        this.pendente = true;
        this.passoPendente = passo;
        // O relógio e o passo andam juntos: o minuto do início da esquiva.
        this.minutoPendente = Math.floor(Math.max(0, relogio - (passoAtual - passo)) / PASSOS_POR_MINUTO);
      } else if (tipo === EVENTO.esquivaPerfeita) {
        if (this.pendente) this.gravarEsquiva(registro, true);
      } else if (tipo === EVENTO.aparo || tipo === EVENTO.aparoFalho || tipo === EVENTO.aparoVazio) {
        const sucesso = tipo === EVENTO.aparo;
        const tipoDoAtacante = anel.u32[i + EV.inimigoFlagsCausa]! & 0xff;
        registro.registrar('aparo', passo, {
          minuto: Math.floor(Math.max(0, relogio - (passoAtual - passo)) / PASSOS_POR_MINUTO),
          sucesso,
          alvo: sucesso && tipoDoAtacante > 0 ? IDS_DE_TIPO[tipoDoAtacante]! : null,
        });
      }
    }
    this.lidos = escritos;
    const ep = e.jogador3U8[JOGADOR3_U8.esquivaPasso]!;
    if (this.pendente && (ep >= PASSO_DA_DECISAO || ep === 0)) this.gravarEsquiva(registro, false);
  }

  private gravarEsquiva(registro: RegistroDeTelemetria, perfeita: boolean): void {
    this.pendente = false;
    registro.registrar('esquiva', this.passoPendente, { minuto: this.minutoPendente, perfeita, peso: 'leve' });
  }
}
