// Acerto comum das armas (design/decisoes-F-004.md D1, S1, M1 e §4): os
// rascunhos das consultas, o dano por vaga calculado no passo do disparo e a
// aplicação de um acerto (dano, Sal e evento). Só recebe inteiros: o dano do
// acerto em curso passa por ACERTO, para nenhum double atravessar a chamada.
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR3_U16, JOGADOR3_U8, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { EVENTO, FLAG, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';

/** Resultados das consultas à grade (rascunho). */
export const ACHADOS = new Int32Array(CAPACIDADE_DE_INIMIGOS);
/** Dano por vaga, calculado no passo em que ela dispara. */
export const DANO = new Float64Array(VAGAS_DE_ARMA);
/**
 * Rascunho do acerto em curso (lido por acertar): [0] o dano; [1] o fator contra
 * o atordoado em % (`pqFator` da tabela por arma e nível, PQ7), que o chamador
 * preenche. Começa em 200 para quem só preenche o dano.
 */
export const ACERTO = new Float64Array([0, 200]);

/** Mira do golpe em curso (a do jogador, ou a do Contra-ataque para o aparado): `golpear` a preenche, `criarOnda` a lê (CA2). */
export const MIRA = new Float64Array(2);

/** "Sem alvo aparado" em `alvoAparadoSlot`. */
export const SEM_APARADO = 0xffff;

/**
 * O alvo do Contra-ataque (CA1, CA5): o slot do aparado se ele segue vivo (mesma
 * geração, hp > 0), senão −1. O handle é conferido por slot e geração separados,
 * sem montar o número de 32 bits.
 */
export function alvoAparado(e: Estado): number {
  const slot = e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot]!;
  if (slot === SEM_APARADO || e.pool.posicao[slot]! < 0) return -1;
  if (e.pool.geracao[slot] !== e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] || e.inimigos.hp[slot]! <= 0) return -1;
  return slot;
}

/**
 * Aplica ACERTO[0] de dano ao inimigo vivo `s` e o Sal dado (S1: o maior
 * fator e a maior duração, campo a campo) e grava o evento `acerto`, com a
 * flag "matou" se o HP chegou a 0. Contra um inimigo em Postura Quebrada
 * (`quebradaPassos` > 0, lido aqui, no momento do acerto) o dano leva o fator
 * ACERTO[1] e o evento leva `FLAG.critico` (PQ7, PQ8). `flagsExtra` traz o bit
 * `contra` da salva extra. Só recebe inteiros.
 */
export function acertar(e: Estado, s: number, arma: number, forma: number, salPct: number, salPassos: number, flagsExtra = 0): void {
  const ini = e.inimigos;
  let dano = ACERTO[0]!;
  let flags = flagsExtra;
  if (ini.quebradaPassos[s]! > 0) {
    dano = (dano * ACERTO[1]!) / 100;
    flags |= FLAG.critico;
  }
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
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acerto, arma, forma, s, e.pool.geracao[s]!, ini.tipo[s]!, matou ? flags | FLAG.matou : flags, 0);
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
