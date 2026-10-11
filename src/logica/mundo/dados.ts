// Dados fixos de uma Vigília, montados uma vez a partir dos JSON da região,
// dos inimigos e do Vigilante: obstáculos (e a lista por célula), início, HP e
// velocidade do jogador, tipos de inimigo e a timeline do diretor compilada.
// Não mudam durante a Vigília e não ficam no estado; o estado guarda só a
// impressão da disposição (design/decisoes-F-002.md §2), que entra no hash.
import { compilarTimeline, type LinhaDoJson, type Timeline } from '../diretor/timeline';
import { PASSOS_POR_SEGUNDO } from '../nucleo/passos';
import {
  criarObstaculos,
  criarObstaculosPorCelula,
  impressaoDaDisposicao,
  type ObstaculoDoJson,
  type Obstaculos,
  type ObstaculosPorCelula,
} from './obstaculos';
import { IDS_DE_TIPO, TIPO, criarTiposDeInimigo, type InimigoDoJson, type TiposDeInimigo } from './tipos';

/** Corpo, a unidade de distância (B §3.2): 32 px lógicos. */
export const CORPO_PX = 32;
/** Velocidade 1,0 = 4,5 corpos/s = 144 px/s (B §3.3). */
export const CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 = 4.5;

export interface DadosDaVigilia {
  readonly obstaculos: Obstaculos;
  /** Obstáculos por célula da grade, com alcance do maior raio de inimigo (decisoes-F-003 §2). */
  readonly obstaculosPorCelula: ObstaculosPorCelula;
  /** FNV-1a da disposição dos obstáculos (vai para o cabeçalho do estado). */
  readonly impressao: number;
  readonly inicioX: number;
  readonly inicioY: number;
  /** Deslocamento por passo com |v| = 1: 144 px/s ÷ 60 = 2,4 px com velocidade 1,0. */
  readonly velocidadePorPasso: number;
  /** HP inicial: hp × (1 + passiva), arredondado (B §3.3: 130 × 1,15 → 150). */
  readonly hpInicial: number;
  readonly tipos: TiposDeInimigo;
  readonly timeline: Timeline;
}

/** O que se lê do JSON da região (regiao.schema.json). */
export interface RegiaoDoJson {
  readonly inicio_jogador: { readonly x: number; readonly y: number };
  readonly obstaculos: readonly ObstaculoDoJson[];
  readonly sem_spawn_antes_do_marco_s: number;
  readonly linhas: readonly LinhaDoJson[];
}

/** O que se lê do Vigilante (vigilante.schema.json). */
export interface VigilanteDoJson {
  readonly velocidade: number;
  readonly hp: number;
  readonly passiva: { readonly hp_max_pct: number };
}

export function criarDadosDaVigilia(
  regiao: RegiaoDoJson,
  vigilante: VigilanteDoJson,
  inimigos: readonly InimigoDoJson[],
): DadosDaVigilia {
  const obstaculos = criarObstaculos(regiao.obstaculos);
  const timeline = compilarTimeline(regiao.linhas, regiao.sem_spawn_antes_do_marco_s);
  const tipos = tiposQueNascem(criarTiposDeInimigo(inimigos), timeline);
  return {
    obstaculos,
    obstaculosPorCelula: criarObstaculosPorCelula(obstaculos, tipos.raioMaximo),
    impressao: impressaoDaDisposicao(obstaculos),
    inicioX: regiao.inicio_jogador.x,
    inicioY: regiao.inicio_jogador.y,
    velocidadePorPasso: (vigilante.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO,
    hpInicial: Math.round((vigilante.hp * (100 + vigilante.passiva.hp_max_pct)) / 100),
    tipos,
    timeline,
  };
}

/**
 * Confere, no boot, os tipos que podem nascer nesta Vigília (design/decisoes-F-003.md §4):
 * os do roster e dos garantidos de todas as linhas e o Oco Grande (o convertido). Cada um
 * precisa de tamanho e comportamento de movimento; um número pendente (como o tamanho do
 * Coroado, da F-008) é erro aqui, e não no meio de um passo. O R_MAX sai desse conjunto.
 */
function tiposQueNascem(t: TiposDeInimigo, tl: Timeline): TiposDeInimigo {
  const codigos = new Set<number>([...tl.rosterTipo, ...tl.garantidoTipo, TIPO.oco_grande]);
  let raioMaximo = 0;
  for (const c of codigos) {
    if (t.existe[c] !== 1) throw new Error(`tipo de inimigo sem tamanho ou sem comportamento de movimento: ${IDS_DE_TIPO[c]}`);
    raioMaximo = Math.max(raioMaximo, t.raio[c]!);
  }
  return { ...t, raioMaximo };
}
