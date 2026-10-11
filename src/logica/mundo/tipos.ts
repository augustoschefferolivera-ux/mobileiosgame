// Tipos de inimigo (B §3.6; design/decisoes-F-003.md §2 e §6): códigos fixos,
// que só crescem no fim (o estado e, a partir da F-008, o save guardam o
// código), e os dados de cada tipo montados uma vez a partir de inimigos.json,
// em arrays indexados pelo código. A simulação nunca lê string por passo.
import { PASSOS_POR_SEGUNDO } from '../nucleo/passos';

/** Códigos de tipo; 0 = slot vazio. O Lanterneiro vem de chefes.json. */
export const TIPO = {
  vazio: 0,
  oco_das_lanternas: 1,
  oco_grande: 2,
  novica_de_sal: 3,
  oco_grande_coroado: 4,
  o_lanterneiro: 5,
} as const;
export type CodigoDeTipo = (typeof TIPO)[keyof typeof TIPO];
/** Ids por código (o índice é o código). */
export const IDS_DE_TIPO = ['', 'oco_das_lanternas', 'oco_grande', 'novica_de_sal', 'oco_grande_coroado', 'o_lanterneiro'] as const;
const CODIGOS = IDS_DE_TIPO.length;

/** Comportamento de movimento (decisoes-F-003 §2, S6), provisório até a F-006, que acrescenta telegrafos e ataques. */
export const COMPORTAMENTO = {
  /** Linha reta até o jogador (Oco das Lanternas). */
  perseguir: 0,
  /** Aproxima até a distância e para; não recua (Oco Grande, "para a 1,5 corpo"). */
  pararADistancia: 1,
  /** Aproxima ou recua até a distância (Noviça, "mantém 4 corpos"). */
  manterDistancia: 2,
} as const;

/** Corpo, a unidade de distância (B §3.2): 32 px lógicos. */
export const CORPO_PX = 32;
/** Velocidade 1,0 = 4,5 corpos/s = 144 px/s (B §3.3), para o jogador e os inimigos. */
export const CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 = 4.5;

/** O que se lê de cada inimigo de inimigos.json (inimigo.schema.json). */
export interface InimigoDoJson {
  readonly id: string;
  readonly tamanho_px: number | null;
  readonly hp_base: number;
  readonly dano_base: number;
  readonly dano_tipo: string;
  readonly velocidade: number;
  /** XP da Cinza que o inimigo solta (B §3.6). */
  readonly xp: number;
  readonly comportamento: { readonly tipo: string; readonly para_a_corpos?: number; readonly distancia_corpos?: number };
}

/** Dados por código de tipo, montados uma vez (arrays indexados pelo código). */
export interface TiposDeInimigo {
  /** 1 se o tipo pode nascer nesta feature (tem tamanho e comportamento de movimento). */
  readonly existe: Uint8Array;
  /** Raio da hitbox: metade do tamanho_px (decisoes-F-002 H1). */
  readonly raio: Float64Array;
  /** Deslocamento por passo: velocidade × 4,5 × 32 ÷ 60, em double (1,32 px no Oco das Lanternas). */
  readonly velocidade: Float64Array;
  readonly hpBase: Float64Array;
  readonly danoBase: Float64Array;
  /** XP da Cinza (B §3.6); o convertido solta 10 × a do Oco das Lanternas (Q-08). */
  readonly xp: Uint16Array;
  /** 1 se causa dano de contato (dano_tipo "contato_por_s"). */
  readonly contato: Uint8Array;
  readonly comportamento: Uint8Array;
  /** Distância de comportamento em px, de centro a centro (decisoes-F-003 S7). */
  readonly distancia: Float64Array;
  /** R_MAX da separação e da lista de obstáculos: aqui, o maior raio entre os tipos que existem; nos dados da Vigília, o dos que podem nascer. */
  readonly raioMaximo: number;
}

export function codigoDoTipo(id: string): number {
  const c = IDS_DE_TIPO.indexOf(id as (typeof IDS_DE_TIPO)[number]);
  if (c <= 0) throw new Error(`tipo de inimigo desconhecido: ${id}`);
  return c;
}

function comportamentoDe(i: InimigoDoJson): { codigo: number; distancia: number } | null {
  const c = i.comportamento;
  if (c.tipo === 'perseguir_reto') return { codigo: COMPORTAMENTO.perseguir, distancia: 0 };
  if (c.tipo === 'aproximar_e_atacar' && c.para_a_corpos !== undefined) {
    return { codigo: COMPORTAMENTO.pararADistancia, distancia: c.para_a_corpos * CORPO_PX };
  }
  if (c.tipo === 'manter_distancia' && c.distancia_corpos !== undefined) {
    return { codigo: COMPORTAMENTO.manterDistancia, distancia: c.distancia_corpos * CORPO_PX };
  }
  return null;
}

export function criarTiposDeInimigo(inimigos: readonly InimigoDoJson[]): TiposDeInimigo {
  const t = {
    existe: new Uint8Array(CODIGOS),
    raio: new Float64Array(CODIGOS),
    velocidade: new Float64Array(CODIGOS),
    hpBase: new Float64Array(CODIGOS),
    danoBase: new Float64Array(CODIGOS),
    xp: new Uint16Array(CODIGOS),
    contato: new Uint8Array(CODIGOS),
    comportamento: new Uint8Array(CODIGOS),
    distancia: new Float64Array(CODIGOS),
  };
  let raioMaximo = 0;
  for (const i of inimigos) {
    const codigo = codigoDoTipo(i.id);
    const comp = comportamentoDe(i);
    // O Coroado (tamanho e comportamento da F-008) ainda não nasce.
    if (i.tamanho_px === null || comp === null) continue;
    t.existe[codigo] = 1;
    t.raio[codigo] = i.tamanho_px / 2;
    t.velocidade[codigo] = (i.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO;
    t.hpBase[codigo] = i.hp_base;
    t.danoBase[codigo] = i.dano_base;
    t.xp[codigo] = i.xp;
    t.contato[codigo] = i.dano_tipo === 'contato_por_s' ? 1 : 0;
    t.comportamento[codigo] = comp.codigo;
    t.distancia[codigo] = comp.distancia;
    raioMaximo = Math.max(raioMaximo, t.raio[codigo]);
  }
  return { ...t, raioMaximo };
}
