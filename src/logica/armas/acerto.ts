// Acerto comum das armas (design/decisoes-F-004.md D1, S1, M1 e §4): os
// rascunhos das consultas, o dano por vaga calculado no passo do disparo e a
// aplicação de um acerto (dano, Sal e evento). Só recebe inteiros: o dano do
// acerto em curso passa por ACERTO, para nenhum double atravessar a chamada.
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR3_U8, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { EVENTO, FLAG, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';

/** Resultados das consultas à grade (rascunho). */
export const ACHADOS = new Int32Array(CAPACIDADE_DE_INIMIGOS);
/** Dano por vaga, calculado no passo em que ela dispara. */
export const DANO = new Float64Array(VAGAS_DE_ARMA);
/** Dano do acerto em curso (lido por acertar). */
export const ACERTO = new Float64Array(1);

/**
 * Aplica ACERTO[0] de dano ao inimigo vivo `s` e o Sal dado (S1: o maior
 * fator e a maior duração, campo a campo) e grava o evento `acerto`, com a
 * flag "matou" se o HP chegou a 0. Só recebe inteiros.
 */
export function acertar(e: Estado, s: number, arma: number, forma: number, salPct: number, salPassos: number): void {
  const ini = e.inimigos;
  const dano = ACERTO[0]!;
  const hp = Math.fround(ini.hp[s]! - dano);
  ini.hp[s] = hp;
  const matou = hp <= 0;
  if (!matou && salPct > 0) {
    if (ini.salPct[s]! < salPct) ini.salPct[s] = salPct;
    if (ini.salPassos[s]! < salPassos) ini.salPassos[s] = salPassos;
  }
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = dano;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acerto, arma, forma, s, e.pool.geracao[s]!, ini.tipo[s]!, matou ? FLAG.matou : 0, 0);
}

/**
 * Dano de um disparo da vaga, em DANO[vaga]: o dano vivo por (arma, nível),
 * refeito pela fórmula única quando mudam os atributos ou o Poder
 * (decisoes-F-005 P4), na tabela com o Poder temporário enquanto `poderPassos` > 0
 * (decisoes-F-006 EP3). Lido no passo em que a vaga age.
 */
export function calcularDano(e: Estado, vaga: number, i: number): void {
  DANO[vaga] = e.jogador3U8[JOGADOR3_U8.poderPassos]! > 0 ? e.derivados.danoVivoPoder[i]! : e.derivados.danoVivo[i]!;
}
