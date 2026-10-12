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
  /** Alma que o inimigo solta: valor e chance de 0 a 1 (AM1); ausente = não solta. */
  readonly almas?: { readonly valor: number; readonly chance: number };
  readonly comportamento: { readonly tipo: string; readonly para_a_corpos?: number; readonly distancia_corpos?: number };
  /** Imune (false) ou não à Postura Quebrada (design/decisoes-F-006.md §4.2); ausente = true. */
  readonly postura_quebrada?: boolean;
  /** Ataques do tipo; a tabela de combate lê o arco e o projétil (inimigo.schema.json). */
  readonly ataques?: readonly AtaqueDoJson[];
  /** Convocação do Coroado (CR7): quem, quantos, de quanto em quanto tempo e em que anel. */
  readonly convoca?: { readonly inimigo: string; readonly quantidade: number; readonly intervalo_s: number | null; readonly anel_corpos?: number };
}

/** O que a tabela de combate lê de cada ataque de inimigos.json. */
export interface AtaqueDoJson {
  readonly id: string;
  readonly forma: string;
  readonly aparavel: boolean;
  readonly dano: number | null;
  readonly telegrafo: { readonly cor: string; readonly duracao_s: number };
  readonly angulo_graus?: number;
  readonly alcance_corpos?: number | null;
  readonly recuperacao_s?: number | null;
  readonly intervalo_s?: number | null;
  readonly projetil?: { readonly velocidade_corpos_s: number; readonly raio_corpos: number | null; readonly vida_s: number | null };
  readonly aplica?: { readonly status: string; readonly fator_pct: number; readonly duracao_s: number };
  /** Grito do Coroado (CR3): parte do dano do slot (%), raio da área e empurrão (distância em corpos, em tantos passos). */
  readonly dano_pct?: number;
  readonly raio_corpos?: number | null;
  readonly empurrao?: { readonly raio_corpos: number; readonly distancia_corpos: number | null; readonly passos?: number };
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
  /** Alma do tipo (AM1): valor e chance (0 a 1); chance ≥ 1 solta sem sorteio. O convertido sorteia 10 vezes com os do Oco das Lanternas. */
  readonly almasValor: Uint16Array;
  readonly almasChance: Float64Array;
  /** 1 se causa dano de contato (dano_tipo "contato_por_s"). */
  readonly contato: Uint8Array;
  readonly comportamento: Uint8Array;
  /** Distância de comportamento em px, de centro a centro (decisoes-F-003 S7). */
  readonly distancia: Float64Array;
  /** 1 se o corpo é grande (raio > 24 px): fica fora da grade da massa, numa lista própria de até 4 (CR10). */
  readonly grande: Uint8Array;
  /** R_MAX da grade, da separação e das consultas das armas: o maior raio entre os tipos que existem e não são grandes; nos dados da Vigília, o dos que podem nascer. */
  readonly raioMaximo: number;
  /** O maior raio entre todos os tipos que existem, grandes incluídos: o alcance da lista de obstáculos por célula (CR10). */
  readonly raioDeObstaculo: number;
}

/** Acima deste raio (px) o corpo é grande (CR10): o Oco Grande e a Noviça (24) ainda cabem na grade. */
export const RAIO_MAXIMO_DA_GRADE = 24;

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
    almasValor: new Uint16Array(CODIGOS),
    almasChance: new Float64Array(CODIGOS),
    contato: new Uint8Array(CODIGOS),
    comportamento: new Uint8Array(CODIGOS),
    distancia: new Float64Array(CODIGOS),
    grande: new Uint8Array(CODIGOS),
  };
  let raioMaximo = 0;
  let raioDeObstaculo = 0;
  for (const i of inimigos) {
    const codigo = codigoDoTipo(i.id);
    const comp = comportamentoDe(i);
    if (i.tamanho_px === null || comp === null) continue;
    t.existe[codigo] = 1;
    t.raio[codigo] = i.tamanho_px / 2;
    t.velocidade[codigo] = (i.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO;
    t.hpBase[codigo] = i.hp_base;
    t.danoBase[codigo] = i.dano_base;
    t.xp[codigo] = i.xp;
    t.almasValor[codigo] = i.almas?.valor ?? 0;
    t.almasChance[codigo] = i.almas?.chance ?? 0;
    t.contato[codigo] = i.dano_tipo === 'contato_por_s' ? 1 : 0;
    t.comportamento[codigo] = comp.codigo;
    t.distancia[codigo] = comp.distancia;
    t.grande[codigo] = t.raio[codigo]! > RAIO_MAXIMO_DA_GRADE ? 1 : 0;
    if (t.grande[codigo] === 0) raioMaximo = Math.max(raioMaximo, t.raio[codigo]!);
    raioDeObstaculo = Math.max(raioDeObstaculo, t.raio[codigo]!);
  }
  return { ...t, raioMaximo, raioDeObstaculo };
}

/** Fase do ataque de um inimigo (`ataqueFase`). */
export const FASE_DO_ATAQUE = { livre: 0, telegrafo: 1, recuperacao: 2 } as const;
