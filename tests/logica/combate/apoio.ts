// Auxiliares dos testes de combate da F-006: uma Vigília sem diretor nem armas
// com os tutoriais vistos, um roteiro de ações em passos exatos, o anel de
// eventos lido por tipo e inimigos postos à mão (design/decisoes-F-006.md VT8).
import { ACAO, fonteDoRoteiro, type AcaoDeRoteiro, type FonteDeComandos } from '../../../src/logica/nucleo/comandos';
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CENARIO,
  JOGADOR,
  TODOS_OS_TUTORIAIS,
  criarEstado,
  type Estado,
  type ParametrosDaVigilia,
} from '../../../src/logica/nucleo/estado';
import { SEM_ALVO, eventosEscritos, inicioDoEvento } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS } from '../apoio';
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';

export { ACAO, TIPO };
export const D = DADOS_DA_CHARNECA;
export const D_LIVRE = DADOS_SEM_OBSTACULOS;

/** Sem diretor nem armas, com os três tutoriais vistos (a base dos testes de esquiva). */
export const BASE: Partial<ParametrosDaVigilia> = { cenario: CENARIO.diretorDesligado, armas: [], tutoriaisVistos: TODOS_OS_TUTORIAIS };

/** Um Oco das Lanternas longe do jogador (o slot é reposicionado à mão). */
export const LONGE = { codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 };

export function criar(params: Partial<ParametrosDaVigilia> = {}, dados: DadosDaVigilia = D_LIVRE, seed = 1): Estado {
  return criarEstado(seed, dados, { ...BASE, ...params });
}

/** Roteiro sem intenção, só com as ações dadas (passo exato; mira opcional). */
export function fonteDeAcoes(acoes: readonly AcaoDeRoteiro[], movimento: { mx: number; my: number } = { mx: 0, my: 0 }): FonteDeComandos {
  return fonteDoRoteiro([{ passo: 0, ...movimento }], undefined, acoes);
}

/** Uma esquiva no passo `passo`, na direção (mx, my) (módulo 1) ou na última. */
export const esquivaEm = (passo: number, mira?: readonly [number, number]): AcaoDeRoteiro => (mira ? { passo, acoes: ACAO.esquiva, mira } : { passo, acoes: ACAO.esquiva });
export const aparoEm = (passo: number): AcaoDeRoteiro => ({ passo, acoes: ACAO.aparo });

/** Roda passos até `CAB.passo` valer `alvo` (o passo congelado não o move), de um em um. */
export function ateOPasso(e: Estado, d: DadosDaVigilia, fonte: FonteDeComandos, alvo: number): void {
  let guarda = 0;
  while (e.cab[CAB.passo]! < alvo) {
    avancar(e, d, fonte, 1);
    if (++guarda > 100_000) throw new Error('ateOPasso: o passo não chega');
  }
}

/** Os eventos de um tipo no anel (os `n` últimos escritos). */
export interface EventoLido {
  passo: number;
  forma: number;
  slot: number;
  alvo: number;
  x: number;
  y: number;
  a: number;
  b: number;
}
export function eventosDe(e: Estado, tipo: number): EventoLido[] {
  const saida: EventoLido[] = [];
  const n = eventosEscritos(e.eventos);
  for (let k = Math.max(0, n - 1024); k < n; k++) {
    const i = inicioDoEvento(k);
    const u = e.eventos.u32;
    const f = e.eventos.f32;
    const tipoArmaForma = u[i + 1]!;
    if ((tipoArmaForma & 0xff) !== tipo) continue;
    const alvo = u[i + 2]!;
    saida.push({
      passo: u[i]!,
      forma: tipoArmaForma >>> 16,
      slot: alvo === SEM_ALVO ? -1 : alvo & 0xffff,
      alvo,
      x: f[i + 4]!,
      y: f[i + 5]!,
      a: f[i + 6]!,
      b: f[i + 7]!,
    });
  }
  return saida;
}

/** Posição do jogador. */
export const posJogador = (e: Estado): [number, number] => [e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!];

/** Os slots vivos de inimigo, em ordem. */
export function slotsVivos(e: Estado): number[] {
  const r: number[] = [];
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) if (e.pool.posicao[s]! >= 0) r.push(s);
  return r;
}

/** Põe o inimigo `s` em (x, y) (parado: a posição anterior também). */
export function posicionar(e: Estado, s: number, x: number, y: number): void {
  e.inimigos.x[s] = e.inimigos.xAnt[s] = x;
  e.inimigos.y[s] = e.inimigos.yAnt[s] = y;
}

/** Põe o inimigo `s` a (dx, dy) do jogador. */
export function junto(e: Estado, s: number, dx: number, dy: number): void {
  const [x, y] = posJogador(e);
  posicionar(e, s, x + dx, y + dy);
}
