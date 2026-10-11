// Estado da simulação: um único ArrayBuffer com views tipadas (ADR-0002 §4).
// Nada é alocado depois de criarEstado(). Na F-004 (VERSAO_LAYOUT 4;
// design/decisoes-F-004.md §4): cabeçalho com os parâmetros da Vigília, fluxos
// de RNG, registro do jogador com a build (5 vagas de arma), bloco do mundo e
// do diretor, o pool de inimigos e o pool de projéteis. As seções ficam em
// múltiplos de 4 bytes. O anel de eventos mora no objeto, num ArrayBuffer
// próprio, fora do hash e do save. Cada feature seguinte aumenta VERSAO_LAYOUT.
import type { DadosDaVigilia } from '../mundo/dados';
import { criarAnel, esvaziarAnel, type AnelDeEventos } from './eventos';
import { fnv1aBytes, FNV_BASE } from './hash';
import { bytesDoPool, esvaziarPool, viewsDoPool, type Pool } from './pool';
import { FLUXOS, PALAVRAS_POR_FLUXO, indiceDoFluxo, semear, type Fluxo } from './rng';

export const VERSAO_LAYOUT = 4;

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

/** Vagas de arma da build (B §3.3; vigilantes.json `vagas.armas`). */
export const VAGAS_DE_ARMA = 5;

/** A build no registro do jogador: uma posição por vaga, na ordem de aquisição (design/decisoes-F-004.md W17). */
export interface Build {
  /** Passos até o próximo disparo (no Círculo, o timer do tick); 0 = dispara neste passo. */
  readonly recarga: Uint16Array;
  /** Passos até o próximo pulso do Círculo nv7. */
  readonly esperaPulso: Uint16Array;
  /** Código da arma (ARMA em src/logica/armas/tabela.ts); 0 = vaga vazia. */
  readonly codigo: Uint8Array;
  readonly nivel: Uint8Array;
  /** Índice do próximo golpe da sequência da Espada; 0 = nenhuma sequência em andamento. */
  readonly golpe: Uint8Array;
  /** Passos até o próximo golpe da sequência. */
  readonly esperaGolpe: Uint8Array;
}
const BYTES_BUILD = VAGAS_DE_ARMA * (2 + 2 + 1 + 1 + 1 + 1);

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
  /** Inimigos mortos por arma, 1 por slot (design/decisoes-F-004.md M3). */
  mortes: 8,
  /** Projéteis recusados com o pool no limite (design/decisoes-F-004.md §4). */
  projeteisRecusados: 9,
} as const;
const PALAVRAS_MUNDO = 10;

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
  /** Redução de velocidade do Sal em %: 0, 50 ou 60 (design/decisoes-F-004.md §3). */
  readonly salPct: Uint8Array;
  /** Passos restantes do Sal. */
  readonly salPassos: Uint8Array;
  /** Passos restantes do afastamento do pulso do Círculo (K1). */
  readonly kbPassos: Uint8Array;
}

/** Capacidade física do pool de projéteis nos dois TETOs (ADR-0002 §4 e §15 item 2). */
export const CAPACIDADE_DE_PROJETEIS = 400;

/** Tipos de projétil; 0 = slot vazio. */
export const TIPO_DE_PROJETIL = { vazio: 0, faca: 1 } as const;
/** Perfurações que não se gastam (só a sonda do TETO). */
export const PERFURACAO_INFINITA = 255;

/** Campos de cada projétil, um array de 400 por campo. */
export interface CamposDosProjeteis {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly xAnt: Float32Array;
  readonly yAnt: Float32Array;
  /** Velocidade em px por passo, fixada no disparo. */
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  /** Dano de cada acerto, fixado no disparo (W13). */
  readonly dano: Float32Array;
  /** Handle do último inimigo acertado (0xFFFFFFFF = nenhum). */
  readonly ultimoAlvo: Uint32Array;
  /** Passos de voo restantes. */
  readonly vida: Uint16Array;
  readonly tipo: Uint8Array;
  /** Código da arma que disparou (vai no evento `acerto`). */
  readonly arma: Uint8Array;
  /** Acertos que ainda atravessa (PERFURACAO_INFINITA não se gasta). */
  readonly perfuracoes: Uint8Array;
  /** Sal que aplica, em % e em passos, fixado no disparo; 0 = nenhum. */
  readonly salPct: Uint8Array;
  readonly salPassos: Uint8Array;
}

/** Uma arma da build inicial: código da tabela de armas e nível. */
export interface ArmaInicial {
  readonly codigo: number;
  readonly nivel: number;
}

export interface ParametrosDaVigilia {
  /** Bits de TUTORIAL já cumpridos: do meta (F-007) ou de ?tutorial=0. */
  readonly tutoriaisVistos: number;
  readonly teto: number;
  readonly cenario: number;
  readonly linhaFixa: number;
  readonly rotacao: number;
  /** Build inicial, na ordem das vagas; null = a arma inicial do Vigilante no nv1 (design/decisoes-F-004.md §5). */
  readonly armas: readonly ArmaInicial[] | null;
}
export const PARAMETROS_PADRAO: ParametrosDaVigilia = {
  tutoriaisVistos: 0,
  teto: TETO_PADRAO,
  cenario: 0,
  linhaFixa: LINHA_LIVRE,
  rotacao: 0,
  armas: null,
};

const PALAVRAS_RNG = FLUXOS.length * PALAVRAS_POR_FLUXO;
const BYTES_CAB = PALAVRAS_CAB * 4;
const BYTES_RNG = PALAVRAS_RNG * 4;
const INICIO_JOGADOR = BYTES_CAB + BYTES_RNG;
const INICIO_JOGADOR_U8 = INICIO_JOGADOR + FLOATS_JOGADOR * 4;
const INICIO_BUILD = INICIO_JOGADOR_U8 + BYTES_JOGADOR_U8;
const INICIO_MUNDO = INICIO_BUILD + BYTES_BUILD;
const INICIO_POOL = INICIO_MUNDO + PALAVRAS_MUNDO * 4;
const INICIO_INIMIGOS_F32 = INICIO_POOL + bytesDoPool(CAPACIDADE_DE_INIMIGOS);
const FLOATS_POR_CAMPO = CAPACIDADE_DE_INIMIGOS;
const CAMPOS_F32 = ['x', 'y', 'xAnt', 'yAnt', 'hp', 'dano'] as const;
const INICIO_INIMIGOS_U8 = INICIO_INIMIGOS_F32 + CAMPOS_F32.length * FLOATS_POR_CAMPO * 4;
const CAMPOS_U8 = ['tipo', 'convertido', 'salPct', 'salPassos', 'kbPassos'] as const;
const INICIO_POOL_PROJETEIS = INICIO_INIMIGOS_U8 + CAMPOS_U8.length * CAPACIDADE_DE_INIMIGOS;
const P = CAPACIDADE_DE_PROJETEIS;
const CAMPOS_PROJETIL_F32 = ['x', 'y', 'xAnt', 'yAnt', 'vx', 'vy', 'dano'] as const;
const INICIO_PROJETEIS_F32 = INICIO_POOL_PROJETEIS + bytesDoPool(P);
const INICIO_PROJETEIS_U32 = INICIO_PROJETEIS_F32 + CAMPOS_PROJETIL_F32.length * P * 4;
const INICIO_PROJETEIS_U16 = INICIO_PROJETEIS_U32 + P * 4;
const INICIO_PROJETEIS_U8 = INICIO_PROJETEIS_U16 + P * 2;
const CAMPOS_PROJETIL_U8 = ['tipo', 'arma', 'perfuracoes', 'salPct', 'salPassos'] as const;
export const BYTES_ESTADO = INICIO_PROJETEIS_U8 + CAMPOS_PROJETIL_U8.length * P;

/** Deslocamento de cada seção no buffer (o teste de layout trava todos e o alinhamento de cada view). */
export const LAYOUT = {
  cabecalho: 0,
  rng: BYTES_CAB,
  jogador: INICIO_JOGADOR,
  jogadorU8: INICIO_JOGADOR_U8,
  build: INICIO_BUILD,
  mundo: INICIO_MUNDO,
  poolDeInimigos: INICIO_POOL,
  inimigosF32: INICIO_INIMIGOS_F32,
  inimigosU8: INICIO_INIMIGOS_U8,
  poolDeProjeteis: INICIO_POOL_PROJETEIS,
  projeteisF32: INICIO_PROJETEIS_F32,
  projeteisU32: INICIO_PROJETEIS_U32,
  projeteisU16: INICIO_PROJETEIS_U16,
  projeteisU8: INICIO_PROJETEIS_U8,
  fim: BYTES_ESTADO,
} as const;

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
  /** Build: as 5 vagas de arma. */
  readonly build: Build;
  /** Bloco do mundo e do diretor, pelos índices de MUNDO. */
  readonly mundo: Uint32Array;
  /** Pilha de livres, lista densa e gerações dos slots de inimigo. */
  readonly pool: Pool;
  readonly inimigos: CamposDosInimigos;
  /** Pool dos projéteis do jogador (facas). */
  readonly poolDeProjeteis: Pool;
  readonly projeteis: CamposDosProjeteis;
  /** Anel de eventos: fora de `bytes`, do hash e do save; só a simulação escreve (decisoes-F-004 §4). */
  readonly eventos: AnelDeEventos;
}

export function criarEstado(seed: number, dados: DadosDaVigilia, params: Partial<ParametrosDaVigilia> = {}): Estado {
  const buffer = new ArrayBuffer(BYTES_ESTADO);
  const f32 = (i: number): Float32Array =>
    new Float32Array(buffer, INICIO_INIMIGOS_F32 + i * FLOATS_POR_CAMPO * 4, FLOATS_POR_CAMPO);
  const u8 = (nome: (typeof CAMPOS_U8)[number]): Uint8Array =>
    new Uint8Array(buffer, INICIO_INIMIGOS_U8 + CAMPOS_U8.indexOf(nome) * CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_INIMIGOS);
  const pf32 = (nome: (typeof CAMPOS_PROJETIL_F32)[number]): Float32Array =>
    new Float32Array(buffer, INICIO_PROJETEIS_F32 + CAMPOS_PROJETIL_F32.indexOf(nome) * P * 4, P);
  const pu8 = (nome: (typeof CAMPOS_PROJETIL_U8)[number]): Uint8Array =>
    new Uint8Array(buffer, INICIO_PROJETEIS_U8 + CAMPOS_PROJETIL_U8.indexOf(nome) * P, P);
  const V = VAGAS_DE_ARMA;
  const estado: Estado = {
    buffer,
    bytes: new Uint8Array(buffer),
    cab: new Uint32Array(buffer, 0, PALAVRAS_CAB),
    rng: new Uint32Array(buffer, BYTES_CAB, PALAVRAS_RNG),
    jogador: new Float32Array(buffer, INICIO_JOGADOR, FLOATS_JOGADOR),
    jogadorU8: new Uint8Array(buffer, INICIO_JOGADOR_U8, BYTES_JOGADOR_U8),
    build: {
      recarga: new Uint16Array(buffer, INICIO_BUILD, V),
      esperaPulso: new Uint16Array(buffer, INICIO_BUILD + 2 * V, V),
      codigo: new Uint8Array(buffer, INICIO_BUILD + 4 * V, V),
      nivel: new Uint8Array(buffer, INICIO_BUILD + 5 * V, V),
      golpe: new Uint8Array(buffer, INICIO_BUILD + 6 * V, V),
      esperaGolpe: new Uint8Array(buffer, INICIO_BUILD + 7 * V, V),
    },
    mundo: new Uint32Array(buffer, INICIO_MUNDO, PALAVRAS_MUNDO),
    pool: viewsDoPool(buffer, INICIO_POOL, CAPACIDADE_DE_INIMIGOS),
    inimigos: {
      x: f32(CAMPOS_F32.indexOf('x')),
      y: f32(CAMPOS_F32.indexOf('y')),
      xAnt: f32(CAMPOS_F32.indexOf('xAnt')),
      yAnt: f32(CAMPOS_F32.indexOf('yAnt')),
      hp: f32(CAMPOS_F32.indexOf('hp')),
      dano: f32(CAMPOS_F32.indexOf('dano')),
      tipo: u8('tipo'),
      convertido: u8('convertido'),
      salPct: u8('salPct'),
      salPassos: u8('salPassos'),
      kbPassos: u8('kbPassos'),
    },
    poolDeProjeteis: viewsDoPool(buffer, INICIO_POOL_PROJETEIS, P),
    projeteis: {
      x: pf32('x'),
      y: pf32('y'),
      xAnt: pf32('xAnt'),
      yAnt: pf32('yAnt'),
      vx: pf32('vx'),
      vy: pf32('vy'),
      dano: pf32('dano'),
      ultimoAlvo: new Uint32Array(buffer, INICIO_PROJETEIS_U32, P),
      vida: new Uint16Array(buffer, INICIO_PROJETEIS_U16, P),
      tipo: pu8('tipo'),
      arma: pu8('arma'),
      perfuracoes: pu8('perfuracoes'),
      salPct: pu8('salPct'),
      salPassos: pu8('salPassos'),
    },
    eventos: criarAnel(),
  };
  reiniciarEstado(estado, seed, dados, params);
  return estado;
}

/**
 * Zera o estado e o anel, grava os parâmetros, semeia todos os fluxos, esvazia
 * os pools, põe o jogador no início, apontando para cima, com o HP inicial, e
 * equipa a build inicial. A seed é um inteiro de 32 bits sem sinal; o TETO, 300
 * ou 500. Só a build pedida por parâmetro aloca (a validação).
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
  esvaziarPool(e.poolDeProjeteis);
  esvaziarAnel(e.eventos);
  if (p.armas === null) {
    equiparNaVaga(e, 0, dados.armas.inicial, 1);
  } else {
    validarBuild(p.armas, dados);
    for (let v = 0; v < p.armas.length; v++) equiparNaVaga(e, v, p.armas[v]!.codigo, p.armas[v]!.nivel);
  }
}

/** Recusa uma build impossível na montagem (design/decisoes-F-004.md §5). */
function validarBuild(armas: readonly ArmaInicial[], dados: DadosDaVigilia): void {
  if (armas.length > VAGAS_DE_ARMA) throw new Error(`build com ${armas.length} armas; o máximo é ${VAGAS_DE_ARMA}`);
  const vistas = new Set<number>();
  for (const a of armas) {
    const t = dados.armas;
    if (!Number.isInteger(a.codigo) || a.codigo <= 0 || a.codigo >= t.nivelMax.length || t.nivelMax[a.codigo] === 0) {
      throw new Error(`build: arma desconhecida ou fora desta Vigília: ${a.codigo}`);
    }
    if (!Number.isInteger(a.nivel) || a.nivel < 1 || a.nivel > t.nivelMax[a.codigo]!) {
      throw new Error(`build: nível ${a.nivel} fora de 1 a ${t.nivelMax[a.codigo]} na arma ${a.codigo}`);
    }
    if (vistas.has(a.codigo)) throw new Error(`build: arma repetida: ${a.codigo}`);
    vistas.add(a.codigo);
  }
}

/** Ocupa a vaga com a arma no nível dado e os timers em 0: ela age no próximo passo (W16). */
function equiparNaVaga(e: Estado, vaga: number, codigo: number, nivel: number): void {
  const b = e.build;
  b.codigo[vaga] = codigo;
  b.nivel[vaga] = nivel;
  b.recarga[vaga] = 0;
  b.esperaPulso[vaga] = 0;
  b.golpe[vaga] = 0;
  b.esperaGolpe[vaga] = 0;
}

/**
 * Equipa a arma na 1ª vaga livre, com os timers em 0 (testes, receitas e, na
 * F-005, o level up). Devolve a vaga; lança erro sem vaga livre ou com a arma
 * repetida.
 */
export function equiparArma(e: Estado, dados: DadosDaVigilia, codigo: number, nivel: number): number {
  const b = e.build;
  const atuais: ArmaInicial[] = [];
  let livre = -1;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    if (b.codigo[v] === 0) {
      if (livre < 0) livre = v;
    } else atuais.push({ codigo: b.codigo[v]!, nivel: b.nivel[v]! });
  }
  if (livre < 0) throw new Error('equiparArma: nenhuma vaga livre');
  validarBuild([...atuais, { codigo, nivel }], dados);
  equiparNaVaga(e, livre, codigo, nivel);
  return livre;
}

/** Esvazia a build (testes que medem uma arma por vez). */
export function esvaziarBuild(e: Estado): void {
  const b = e.build;
  b.codigo.fill(0);
  b.nivel.fill(0);
  b.recarga.fill(0);
  b.esperaPulso.fill(0);
  b.golpe.fill(0);
  b.esperaGolpe.fill(0);
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
export function hashPorSecao(e: Estado): Record<'cabecalho' | 'rng' | 'jogador' | 'mundo' | 'inimigos' | 'projeteis', number> {
  const secao = (inicio: number, fim: number): number => fnv1aBytes(FNV_BASE, new Uint8Array(e.buffer, inicio, fim - inicio));
  return {
    cabecalho: secao(0, BYTES_CAB),
    rng: secao(BYTES_CAB, INICIO_JOGADOR),
    jogador: secao(INICIO_JOGADOR, INICIO_MUNDO),
    mundo: secao(INICIO_MUNDO, INICIO_POOL),
    inimigos: secao(INICIO_POOL, INICIO_POOL_PROJETEIS),
    projeteis: secao(INICIO_POOL_PROJETEIS, BYTES_ESTADO),
  };
}
