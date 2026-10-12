// Auxiliares dos testes do Lanterneiro (F-009): o estado a um passo do 20:00, com os ataques ligados e o diretor desligado.
import { ARMA } from '../../../src/logica/armas/tabela';
import { CAB, CENARIO, CHEFE_U16, JOGADOR, PROGRESSAO, SEM_CHEFE, TODOS_OS_TUTORIAIS, criarEstado, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { CAPACIDADE_DE_INIMIGOS } from '../../../src/logica/nucleo/estado';
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { DADOS_DA_CHARNECA, PARADO } from '../apoio';

export { ARMA };
export const D = DADOS_DA_CHARNECA;

/** O relógio em que o Lanterneiro surge no 1º passo: 72.000 − 1. */
export const UM_ANTES_DO_CHEFE = 71_999;

/** Um estado a um passo do 20:00: ataques ligados, diretor desligado, tutoriais vistos, sem armas, o jogador mortal. */
export function estadoDoChefe(extras: Partial<ParametrosDaVigilia> = {}, dados: DadosDaVigilia = D, nivel = 1): Estado {
  const e = criarEstado(424242, dados, {
    cenario: CENARIO.ataques | CENARIO.diretorDesligado,
    relogioInicial: UM_ANTES_DO_CHEFE,
    inicioLivre: true,
    tutoriaisVistos: TODOS_OS_TUTORIAIS,
    armas: [],
    ...extras,
  });
  e.progresso[PROGRESSAO.nivel] = nivel;
  return e;
}

/** O mesmo estado depois do passo em que o chefe surge; devolve o slot. */
export function comChefe(extras: Partial<ParametrosDaVigilia> = {}, dados: DadosDaVigilia = D, nivel = 29): { e: Estado; s: number } {
  const e = estadoDoChefe(extras, dados, nivel);
  avancar(e, dados, PARADO, 1);
  const s = e.chefeU16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE) throw new Error('o chefe não surgiu');
  return { e, s };
}

/** Distância do slot ao jogador, no toro (os testes ficam longe da costura). */
export function distanciaAoJogador(e: Estado, s: number): number {
  return Math.hypot(e.inimigos.x[s]! - e.jogador[JOGADOR.x]!, e.inimigos.y[s]! - e.jogador[JOGADOR.y]!);
}

export function vivos(e: Estado): number {
  let n = 0;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) if (e.pool.posicao[s]! >= 0) n++;
  return n;
}

export { CAB };
