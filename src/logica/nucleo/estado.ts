// Estado da simulação: um único ArrayBuffer com views tipadas (ADR-0002 §4).
// Nada é alocado depois de criarEstado(). Na F-003 (VERSAO_LAYOUT 3;
// design/decisoes-F-003.md §6): cabeçalho com os parâmetros da Vigília, fluxos
// de RNG, registro do jogador, bloco do mundo e do diretor e o pool de
// inimigos. Cada feature seguinte aumenta VERSAO_LAYOUT.
import type { DadosDaVigilia } from '../mundo/dados';
import { fnv1aBytes, FNV_BASE } from './hash';
import { bytesDoPool, esvaziarPool, viewsDoPool, type Pool } from './pool';
import { FLUXOS, PALAVRAS_POR_FLUXO, indiceDoFluxo, semear, type Fluxo } from './rng';

export const VERSAO_LAYOUT = 3;

/** Palavras do cabeçalho (Uint32). As não usadas ficam em zero e entram no hash. */
export const CAB = {
  versao: 0,
  seed: 1,
  /** Passos simulados desde o início da Vigília. */
  passo: 2,
  /** Relógio da Vigília em passos; para na Fogueira (a partir da F-008). */
  relogio: 3,
  /** Parâmetro da Vigília: bits de TUTORIAL já cumpridos (ADR-0002 §3; Q-26). */
  tutoriaisVistos: 4,
  /** Impressão da disposição dos obstáculos (design/decisoes-F-002.md §2). */
  disposicao: 5,
  /** Parâmetro da Vigília: TETO de inimigos vivos, 300 ou 500 (ADR-0002 §13). */
  teto: 6,
  /** Parâmetro da Vigília: bits de CENARIO (só os cenários de debug os ligam). */
  cenario: 7,
  /** Parâmetro da Vigília: linha fixa do diretor (LINHA_LIVRE = nenhuma). */
  linhaFixa: 8,
  /** Parâmetro da Vigília: inimigos removidos a cada 60 passos pelo cenário (0 = nenhum). */
  rotacao: 9,
} as const;
const PALAVRAS_CAB = 16;

/** Bits de `CAB.tutoriaisVistos`; esquiva e aparo entram na F-006. */
export const TUTORIAL = { mover: 1 } as const;
/** Todos os bits de TUTORIAL (?tutorial=0). */
export const TODOS_OS_TUTORIAIS = TUTORIAL.mover;

/** Bits de `CAB.cenario` (design/decisoes-F-003.md §5). */
export const CENARIO = { jogadorInvulneravel: 1, diretorDesligado: 2 } as const;
/** `CAB.linhaFixa` sem linha fixa: o diretor segue o relógio. */
export const LINHA_LIVRE = 0xffffffff;
/** TETO de fallback (ADR-0002 §13; B §3.7). */
export const TETO_PADRAO = 300;

/** Registro do jogador, Float32. (x, y) é o incentro do triângulo. */
export const JOGADOR = { x: 0, y: 1, xAnt: 2, yAnt: 3, dirX: 4, dirY: 5, hp: 6 } as const;
const FLOATS_JOGADOR = 7;
/** Registro do jogador, Uint8 (os 2 bytes seguintes ficam reservados, em zero). */
export const JOGADOR_U8 = {
  promptMover: 0,
  /** Passos restantes da invulnerabilidade pós-contato (B §3.3; decisoes-F-003 §3). */
  invulContato: 1,
} as const;
const BYTES_JOGADOR_U8 = 4;

/** Estados do prompt "Deslize para mover" (A2.TUTORIAL.01; design/decisoes-F-002.md §7). */
export const PROMPT = { aguardando: 0, visivel: 1, cumprido: 2 } as const;

/** Bloco do mundo e do diretor, Uint32 (design/decisoes-F-003.md §4 e §6). */
export const MUNDO = {
  /** I em décimos: 10 (1,0) ou 11 (1,1, depois de Descansar, F-008). */
  intensidade10: 0,
  /** Passos até a próxima reposição do diretor; 0 = repõe no próximo passo ativo. */
  espera: 1,
  /** Um bit por linha da timeline: garantido já entregue. */
  garantidosEntregues: 2,
  /** Inimigos que o diretor fez nascer (reposição, garantidos e convertidos), acumulado. */
  spawns: 3,
  /** Spawns recusados com o pool físico cheio (ADR-0002 §4); com TETO ≤ 500, fica em 0. */
  recusados: 4,
  /** Spawns recusados por não achar ponto livre de obstáculo no anel. */
  semPontoLivre: 5,
  /** Inimigos removidos pela rotação do cenário, acumulado. */
  removidos: 6,
  /** Garantidos que não nasceram porque os slots estavam no TETO. */
  garantidosPerdidos: 7,
} as const;
const PALAVRAS_MUNDO = 8;

/** Capacidade física do pool de inimigos nos dois TETOs (ADR-0002 §4 e §15 item 13). */
export const CAPACIDADE_DE_INIMIGOS = 500;

/** Campos Float32 de cada inimigo, um Float32Array de 500 por campo. */
export interface CamposDosInimigos {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly xAnt: Float32Array;
  readonly yAnt: Float32Array;
  /** HP atual, fixado no spawn pela escala do minuto (Q-10). */
  readonly hp: Float32Array;
  /** Dano escalado, fixado no spawn (por segundo de contato no Oco das Lanternas). */
  readonly dano: Float32Array;
  /** Código do tipo (TIPO em src/logica/mundo/tipos.ts); 0 = vazio. */
  readonly tipo: Uint8Array;
  /** 1 se é um Oco Grande convertido do excedente (ADR-0002 §8.7). */
  readonly convertido: Uint8Array;
}

export interface ParametrosDaVigilia {
  /** Bits de TUTORIAL já cumpridos: do meta (F-007) ou de ?tutorial=0. */
  readonly tutoriaisVistos: number;
  readonly teto: number;
  readonly cenario: number;
  readonly linhaFixa: number;
  readonly rotacao: number;
}
export const PARAMETROS_PADRAO: ParametrosDaVigilia = {
  tutoriaisVistos: 0,
  teto: TETO_PADRAO,
  cenario: 0,
  linhaFixa: LINHA_LIVRE,
  rotacao: 0,
};

const PALAVRAS_RNG = FLUXOS.length * PALAVRAS_POR_FLUXO;
const BYTES_CAB = PALAVRAS_CAB * 4;
const BYTES_RNG = PALAVRAS_RNG * 4;
const INICIO_JOGADOR = BYTES_CAB + BYTES_RNG;
const INICIO_JOGADOR_U8 = INICIO_JOGADOR + FLOATS_JOGADOR * 4;
const INICIO_MUNDO = INICIO_JOGADOR_U8 + BYTES_JOGADOR_U8;
const INICIO_POOL = INICIO_MUNDO + PALAVRAS_MUNDO * 4;
const INICIO_INIMIGOS_F32 = INICIO_POOL + bytesDoPool(CAPACIDADE_DE_INIMIGOS);
const FLOATS_POR_CAMPO = CAPACIDADE_DE_INIMIGOS;
const CAMPOS_F32 = ['x', 'y', 'xAnt', 'yAnt', 'hp', 'dano'] as const;
const INICIO_INIMIGOS_U8 = INICIO_INIMIGOS_F32 + CAMPOS_F32.length * FLOATS_POR_CAMPO * 4;
export const BYTES_ESTADO = INICIO_INIMIGOS_U8 + 2 * CAPACIDADE_DE_INIMIGOS;

export interface Estado {
  readonly buffer: ArrayBuffer;
  /** O buffer inteiro, para o hash e para o save. */
  readonly bytes: Uint8Array;
  readonly cab: Uint32Array;
  /** Estados dos fluxos de RNG, 4 palavras por fluxo, na ordem de FLUXOS. */
  readonly rng: Uint32Array;
  /** Campos Float32 do jogador, pelos índices de JOGADOR. */
  readonly jogador: Float32Array;
  /** Campos Uint8 do jogador, pelos índices de JOGADOR_U8. */
  readonly jogadorU8: Uint8Array;
  /** Bloco do mundo e do diretor, pelos índices de MUNDO. */
  readonly mundo: Uint32Array;
  /** Pilha de livres, lista densa e gerações dos slots de inimigo. */
  readonly pool: Pool;
  readonly inimigos: CamposDosInimigos;
}

export function criarEstado(seed: number, dados: DadosDaVigilia, params: Partial<ParametrosDaVigilia> = {}): Estado {
  const buffer = new ArrayBuffer(BYTES_ESTADO);
  const f32 = (i: number): Float32Array =>
    new Float32Array(buffer, INICIO_INIMIGOS_F32 + i * FLOATS_POR_CAMPO * 4, FLOATS_POR_CAMPO);
  const estado: Estado = {
    buffer,
    bytes: new Uint8Array(buffer),
    cab: new Uint32Array(buffer, 0, PALAVRAS_CAB),
    rng: new Uint32Array(buffer, BYTES_CAB, PALAVRAS_RNG),
    jogador: new Float32Array(buffer, INICIO_JOGADOR, FLOATS_JOGADOR),
    jogadorU8: new Uint8Array(buffer, INICIO_JOGADOR_U8, BYTES_JOGADOR_U8),
    mundo: new Uint32Array(buffer, INICIO_MUNDO, PALAVRAS_MUNDO),
    pool: viewsDoPool(buffer, INICIO_POOL, CAPACIDADE_DE_INIMIGOS),
    inimigos: {
      x: f32(CAMPOS_F32.indexOf('x')),
      y: f32(CAMPOS_F32.indexOf('y')),
      xAnt: f32(CAMPOS_F32.indexOf('xAnt')),
      yAnt: f32(CAMPOS_F32.indexOf('yAnt')),
      hp: f32(CAMPOS_F32.indexOf('hp')),
      dano: f32(CAMPOS_F32.indexOf('dano')),
      tipo: new Uint8Array(buffer, INICIO_INIMIGOS_U8, CAPACIDADE_DE_INIMIGOS),
      convertido: new Uint8Array(buffer, INICIO_INIMIGOS_U8 + CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_INIMIGOS),
    },
  };
  reiniciarEstado(estado, seed, dados, params);
  return estado;
}

/**
 * Zera o estado, grava os parâmetros, semeia todos os fluxos, esvazia o pool e
 * põe o jogador no início, apontando para cima, com o HP inicial, sem alocar.
 * A seed é um inteiro de 32 bits sem sinal; o TETO, 300 ou 500.
 */
export function reiniciarEstado(e: Estado, seed: number, dados: DadosDaVigilia, params: Partial<ParametrosDaVigilia> = {}): void {
  const p = { ...PARAMETROS_PADRAO, ...params };
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed fora de u32: ${seed}`);
  if (p.teto !== 300 && p.teto !== 500) throw new Error(`TETO inválido: ${p.teto}`);
  if (p.linhaFixa !== LINHA_LIVRE && !(Number.isInteger(p.linhaFixa) && p.linhaFixa >= 0 && p.linhaFixa < dados.timeline.linhas)) {
    throw new Error(`linha fixa fora da timeline: ${p.linhaFixa}`);
  }
  e.bytes.fill(0);
  e.cab[CAB.versao] = VERSAO_LAYOUT;
  e.cab[CAB.seed] = seed >>> 0;
  e.cab[CAB.tutoriaisVistos] = p.tutoriaisVistos >>> 0;
  e.cab[CAB.disposicao] = dados.impressao >>> 0;
  e.cab[CAB.teto] = p.teto;
  e.cab[CAB.cenario] = p.cenario >>> 0;
  e.cab[CAB.linhaFixa] = p.linhaFixa >>> 0;
  e.cab[CAB.rotacao] = p.rotacao >>> 0;
  for (const fluxo of FLUXOS) semear(e.rng, baseDoFluxo(fluxo), seed, fluxo);
  const j = e.jogador;
  j[JOGADOR.x] = j[JOGADOR.xAnt] = dados.inicioX;
  j[JOGADOR.y] = j[JOGADOR.yAnt] = dados.inicioY;
  j[JOGADOR.dirX] = 0;
  j[JOGADOR.dirY] = -1;
  j[JOGADOR.hp] = dados.hpInicial;
  e.jogadorU8[JOGADOR_U8.promptMover] = p.tutoriaisVistos & TUTORIAL.mover ? PROMPT.cumprido : PROMPT.aguardando;
  e.mundo[MUNDO.intensidade10] = 10;
  esvaziarPool(e.pool);
}

/** Deslocamento do fluxo dentro de `estado.rng`. */
export function baseDoFluxo(fluxo: Fluxo): number {
  return indiceDoFluxo(fluxo) * PALAVRAS_POR_FLUXO;
}

/** FNV-1a de 32 bits sobre o buffer inteiro (ADR-0003 §3), com os slots mortos zerados. */
export function hashEstado(e: Estado): number {
  return fnv1aBytes(FNV_BASE, e.bytes);
}

/**
 * Hash por seção (ADR-0002 §5), para achar a 1ª seção divergente quando dois
 * hashes não batem (testes e build de debug; aloca as views).
 */
export function hashPorSecao(e: Estado): Record<'cabecalho' | 'rng' | 'jogador' | 'mundo' | 'inimigos', number> {
  const secao = (inicio: number, fim: number): number => fnv1aBytes(FNV_BASE, new Uint8Array(e.buffer, inicio, fim - inicio));
  return {
    cabecalho: secao(0, BYTES_CAB),
    rng: secao(BYTES_CAB, INICIO_JOGADOR),
    jogador: secao(INICIO_JOGADOR, INICIO_MUNDO),
    mundo: secao(INICIO_MUNDO, INICIO_POOL),
    inimigos: secao(INICIO_POOL, BYTES_ESTADO),
  };
}
