// O Amanhecer (design/decisoes-F-009.md AN1 a AN4, §4): a morte do Lanterneiro encerra a luta, as Almas do chão entram no
// contador, o que está pendente é descartado e o jogador anda 10 s sob o céu que clareia; no passo 600 a Vigília termina com
// as Almas ×1,5 e uma Brasa. Sem RNG.
import type { ComandosDoPasso } from '../nucleo/comandos';
import { CAB, CAPACIDADE_DE_PICKUPS, CENARIO, CHEFE_U16, CHEFE_U8, ETAPA, FASE, FOGUEIRA_U8, JOGADOR, JOGADOR4_U8, PROGRESSAO, TIPO_DE_PICKUP, CAPACIDADE_DE_INIMIGOS, CAUSA_DO_FIM, type Estado } from '../nucleo/estado';
import { CAUSA, EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { limparOferta } from '../progressao/oferta';
import { creditarAlmas, liberarPickup } from '../progressao/pickups';
import { desfazerArena } from './arena';
import type { DadosDaVigilia } from './dados';
import { andarSemAcoes, cortarOCombate, iniciarFome } from './fome';
import { matarInimigo } from './inimigos';
import { encerrarVigilia } from './vigilia';

/**
 * Morte do chefe (AN1, AN2): a arena se desfaz (os obstáculos seguem inativos); as Almas no chão entram no contador (nada se
 * perde) e as Cinzas de XP somem; níveis pendentes, baús por fechar e a oferta são descartados (como na morte); `etapa`
 * AMANHECER e `fase` 4; o combate é cortado; evento 46.
 */
export function iniciarAmanhecer(e: Estado): void {
  desfazerArena(e);
  const p = e.pickups;
  const pos = e.poolDePickups.posicao;
  for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
    if (pos[s]! < 0) continue;
    if (p.tipo[s] === TIPO_DE_PICKUP.alma) creditarAlmas(e, p.valor[s]!);
    else if (p.tipo[s] !== TIPO_DE_PICKUP.cinza) continue;
    liberarPickup(e, s);
  }
  const pr = e.progresso;
  pr[PROGRESSAO.niveisPendentes] = 0;
  pr[PROGRESSAO.bausPorFechar] = 0;
  e.filaDeBaus.fill(0);
  limparOferta(e);
  e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.amanhecer;
  e.jogador4U8[JOGADOR4_U8.fase] = FASE.amanhecer;
  e.chefeU16[CHEFE_U16.amanhecerPassos] = 0;
  cortarOCombate(e);
  FLOATS_DO_EVENTO[0] = e.jogador[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = e.jogador[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = 0;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.amanhecerIniciado, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Um passo do Amanhecer (AN4): no 1º, todo inimigo vivo é removido por `CAUSA.cinza` (sem Cinza, Alma nem `mortes`); o jogador
 * anda e a mancha pode ser recuperada; no passo `amanhecerPassos` (600) a Vigília termina (causa amanhecer).
 */
export function rodarAmanhecer(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  const n = e.chefeU16[CHEFE_U16.amanhecerPassos]! + 1;
  e.chefeU16[CHEFE_U16.amanhecerPassos] = n;
  if (n === 1) {
    const pos = e.pool.posicao;
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) if (pos[s]! >= 0) matarInimigo(e, dados, s, CAUSA.cinza);
  }
  andarSemAcoes(e, dados, cmd);
  if (n >= dados.chefe.amanhecerPassos) encerrarVigilia(e, dados, CAUSA_DO_FIM.amanhecer);
}

/**
 * O fim da etapa CHEFE, uma vez por passo, no fim do passo da fase VIVA (OP da D9): a morte do Lanterneiro (AN1) vence o 23:00 (a
 * morte no passo do vencimento vale); às 23:00 (AR8, FM1), fora da transição de fase, começa A Fome. Chamada só por `rodarEtapa`.
 */
export function verificarFimDoChefe(e: Estado, dados: DadosDaVigilia): void {
  if (e.chefeU8[CHEFE_U8.morto] === 1) iniciarAmanhecer(e);
  else if (e.cab[CAB.relogio]! >= dados.marcos.aFomeEm && (e.cab[CAB.cenario]! & CENARIO.semFome) === 0 && e.chefeU16[CHEFE_U16.transicaoPassos] === 0) iniciarFome(e);
}
