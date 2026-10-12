// Telemetria local `esquiva` e `aparo` (doc 10 §6; Q-30; decisoes-F-006 FB6, CA6, VT4): lida do anel
// de eventos pela Vigília, como `arma_uniao`. Nada entra no estado nem no hash.
//
// `esquiva`: uma linha por esquiva realizada (a negada não registra), gravada no primeiro destes:
// (a) o evento `esquivaPerfeita`; (b) o quadro em que `esquivaPasso ≥ 14` (a decisão da perfeita
// fecha no passo 14) ou `== 0`; (c) a chegada de um novo evento `esquiva` (esquivas encadeadas).
// `aparo`: uma linha por desfecho (sucesso com o id do atacante, falho e vazio).
// F-007 (TL1): `frasco`: uma linha por uso (minuto e HP antes); `dano_recebido`: uma linha por golpe e por projétil que
// ferem (fonte, minuto e HP restante) e o contato agregado em uma linha a cada 5 s (300 passos desde o 1º contato da
// janela), fechada antes se o HP zera: a linha que zera o HP sempre entra. O teto de 128 por fonte mora no registro.
import { IDS_DE_TIPO } from '../logica/mundo/tipos';
import { CAB, JOGADOR3_U8, type Estado } from '../logica/nucleo/estado';
import { ORIGEM_DO_DANO } from '../logica/mundo/contato';
import { EV, EVENTO, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import type { RegistroDeTelemetria } from '../plataforma/telemetria';

/** Passo da esquiva em que a decisão de `perfeita` já fechou (ES6). */
const PASSO_DA_DECISAO = 14;
const PASSOS_POR_MINUTO = 3600;
/** Janela do contato agregado: 5 s (combate.json `telemetria.agregacao_do_contato_s`; o teste confere). */
export const JANELA_DO_CONTATO = 300;
const FONTE_DO_DANO: Readonly<Record<number, string>> = { [ORIGEM_DO_DANO.contato]: 'contato', [ORIGEM_DO_DANO.golpe]: 'golpe', [ORIGEM_DO_DANO.projetil]: 'projetil' };

export class TelemetriaDeCombate {
  private lidos = 0;
  private pendente = false;
  private passoPendente = 0;
  private minutoPendente = 0;
  /** Janela do contato em aberto: passo do 1º contato, minuto e HP restante depois do último. */
  private contatoAberto = false;
  private contatoDesde = 0;
  private contatoMinuto = 0;
  private contatoHp = 0;

  /** Lê os eventos novos do anel e grava as linhas de `esquiva` e `aparo`. */
  ler(e: Estado, registro: RegistroDeTelemetria): void {
    const anel = e.eventos;
    const escritos = eventosEscritos(anel);
    if (this.lidos > escritos) {
      this.lidos = 0;
      this.pendente = false;
      this.contatoAberto = false;
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
      } else if (tipo === EVENTO.frascoIniciado) {
        registro.registrar('frasco', passo, {
          minuto: Math.floor(Math.max(0, relogio - (passoAtual - passo)) / PASSOS_POR_MINUTO),
          hp_antes: Math.ceil(anel.f32[i + EV.floats + 2]!),
        });
      } else if (tipo === EVENTO.danoAoJogador) {
        const origem = (anel.u32[i + EV.tipoArmaForma]! >>> 16) & 0xff;
        const minuto = Math.floor(Math.max(0, relogio - (passoAtual - passo)) / PASSOS_POR_MINUTO);
        const hpDepois = anel.f32[i + EV.floats + 3]!;
        if (origem === ORIGEM_DO_DANO.contato) {
          if (this.contatoAberto && passo - this.contatoDesde >= JANELA_DO_CONTATO) this.fecharContato(registro);
          if (!this.contatoAberto) {
            this.contatoAberto = true;
            this.contatoDesde = passo;
            this.contatoMinuto = minuto;
          }
          this.contatoHp = Math.ceil(hpDepois);
          if (hpDepois <= 0) this.fecharContato(registro);
        } else {
          registro.registrar('dano_recebido', passo, { fonte: FONTE_DO_DANO[origem] ?? 'outra', minuto, hp_restante: Math.ceil(hpDepois) });
        }
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
    if (this.contatoAberto && passoAtual - this.contatoDesde >= JANELA_DO_CONTATO) this.fecharContato(registro);
    const ep = e.jogador3U8[JOGADOR3_U8.esquivaPasso]!;
    if (this.pendente && (ep >= PASSO_DA_DECISAO || ep === 0)) this.gravarEsquiva(registro, false);
  }

  private fecharContato(registro: RegistroDeTelemetria): void {
    this.contatoAberto = false;
    registro.registrar('dano_recebido', this.contatoDesde, { fonte: 'contato', minuto: this.contatoMinuto, hp_restante: this.contatoHp });
  }

  private gravarEsquiva(registro: RegistroDeTelemetria, perfeita: boolean): void {
    this.pendente = false;
    registro.registrar('esquiva', this.passoPendente, { minuto: this.minutoPendente, perfeita, peso: 'leve' });
  }
}
