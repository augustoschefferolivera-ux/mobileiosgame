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

import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { ATAQUE_DO_CHEFE } from '../../../src/logica/mundo/dados';
import { CHEFE_F32 } from '../../../src/logica/nucleo/estado';
import { EVENTO, eventosEscritos, inicioDoEvento } from '../../../src/logica/nucleo/eventos';

export { ATAQUE_DO_CHEFE as ATQ, ACAO };

/** O estado em que o chefe, livre e na fase dada, vai começar o ataque `id` com o jogador no gatilho: tudo à mão (a máquina é do código). */
export function prepararAtaque(e: Estado, s: number, id: number, timer: number, mira?: readonly [number, number]): void {
  const ini = e.inimigos;
  ini.ataqueFase[s] = 1;
  ini.ataqueId[s] = id;
  ini.ataqueTimer[s] = timer;
  let dx = e.jogador[JOGADOR.x]! - ini.x[s]!;
  let dy = e.jogador[JOGADOR.y]! - ini.y[s]!;
  const d = Math.hypot(dx, dy);
  dx = mira ? mira[0] : dx / d;
  dy = mira ? mira[1] : dy / d;
  ini.miraX[s] = dx;
  ini.miraY[s] = dy;
  e.chefeF32[CHEFE_F32.miraX] = dx;
  e.chefeF32[CHEFE_F32.miraY] = dy;
}

/** Põe o jogador a `d` px do centro do chefe, na direção (ux, uy), e o chefe a 0 de velocidade (parado: o jogador não é perseguido). */
export function jogadorA(e: Estado, s: number, d: number, ux = -1, uy = 0): void {
  const j = e.jogador;
  j[JOGADOR.x] = j[JOGADOR.xAnt] = e.inimigos.x[s]! + d * ux;
  j[JOGADOR.y] = j[JOGADOR.yAnt] = e.inimigos.y[s]! + d * uy;
}

/** Quantos eventos do tipo houve no anel (da Vigília inteira, até 1.024). */
export function contar(e: Estado, tipo: number): number {
  let n = 0;
  const total = eventosEscritos(e.eventos);
  for (let k = Math.max(0, total - 1024); k < total; k++) if ((e.eventos.u32[inicioDoEvento(k) + 1]! & 0xff) === tipo) n++;
  return n;
}

/** Roteiro com aparo nos passos dados (sem movimento). */
export function aparoNosPassos(passos: readonly number[]) {
  const acoes: AcaoDeRoteiro[] = passos.map((p) => ({ passo: p, acoes: ACAO.aparo }));
  return fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoes);
}

export { EVENTO };

import { CHEFE_U32, CHEFE_U8 } from '../../../src/logica/nucleo/estado';
import { eventosDe } from '../combate/apoio';

/** Coloca o chefe num ponto de inteiros (as contas de borda ficam exatas) e livre. */
export function chefeEm(e: Estado, s: number, x: number, y: number): void {
  e.inimigos.x[s] = e.inimigos.xAnt[s] = x;
  e.inimigos.y[s] = e.inimigos.yAnt[s] = y;
  e.inimigos.ataqueFase[s] = 0;
  e.inimigos.ataqueTimer[s] = 0;
}

/** O desfecho do último `golpeInimigo` do chefe com a forma dada (1 acertou, 2 esquivado, 3 aparado, 4 errou), ou 0 se não houve. */
export function desfechoDoGolpe(e: Estado, forma: number): number {
  const ev = eventosDe(e, EVENTO.golpeInimigo).filter((x) => x.forma === forma);
  return ev.length === 0 ? 0 : ev[ev.length - 1]!.b;
}

/** Fixa a fase do chefe e a posição no ciclo (a próxima Vara, Bater, etc. sai da tabela); sem Convocar nem Explosão por 600 passos. */
export function fixarCiclo(e: Estado, fase: number, posicao: number): void {
  e.chefeU8[CHEFE_U8.fase] = fase;
  e.chefeU8[CHEFE_U8.faseMax] = fase;
  e.chefeU32[CHEFE_U32.ataqueSeq] = posicao;
  e.chefeU16[CHEFE_U16.convocaEspera] = 600;
  e.chefeU16[CHEFE_U16.explosaoEspera] = 720;
}
