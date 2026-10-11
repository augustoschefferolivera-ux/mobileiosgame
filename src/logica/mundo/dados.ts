// Dados fixos de uma Vigília, montados uma vez a partir dos JSON da região e
// do Vigilante: obstáculos, início e velocidade do jogador. Não mudam durante
// a Vigília e não ficam no estado; o estado guarda só a impressão da
// disposição (design/decisoes-F-002.md §2), que entra no hash.
import { PASSOS_POR_SEGUNDO } from '../nucleo/passos';
import { criarObstaculos, impressaoDaDisposicao, type ObstaculoDoJson, type Obstaculos } from './obstaculos';

/** Corpo, a unidade de distância (B §3.2): 32 px lógicos. */
export const CORPO_PX = 32;
/** Velocidade 1,0 = 4,5 corpos/s = 144 px/s (B §3.3). */
export const CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 = 4.5;

export interface DadosDaVigilia {
  readonly obstaculos: Obstaculos;
  /** FNV-1a da disposição dos obstáculos (vai para o cabeçalho do estado). */
  readonly impressao: number;
  readonly inicioX: number;
  readonly inicioY: number;
  /** Deslocamento por passo com |v| = 1: 144 px/s ÷ 60 = 2,4 px com velocidade 1,0. */
  readonly velocidadePorPasso: number;
}

/** O que se lê do JSON da região (regiao.schema.json). */
export interface RegiaoDoJson {
  readonly inicio_jogador: { readonly x: number; readonly y: number };
  readonly obstaculos: readonly ObstaculoDoJson[];
}

/** O que se lê do Vigilante (vigilante.schema.json). */
export interface VigilanteDoJson {
  readonly velocidade: number;
}

export function criarDadosDaVigilia(regiao: RegiaoDoJson, vigilante: VigilanteDoJson): DadosDaVigilia {
  const obstaculos = criarObstaculos(regiao.obstaculos);
  return {
    obstaculos,
    impressao: impressaoDaDisposicao(obstaculos),
    inicioX: regiao.inicio_jogador.x,
    inicioY: regiao.inicio_jogador.y,
    velocidadePorPasso: (vigilante.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO,
  };
}
