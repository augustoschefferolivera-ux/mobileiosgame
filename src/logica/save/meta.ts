// Save meta mínimo (design/decisoes-F-007.md SV1 a SV9): o que atravessa as Vigílias, em JSON com versão, número de
// sequência e soma de conferência. Módulo puro: quem lê e grava (localStorage) é plataforma/armazenamento.ts.
// Regra do laço quente (também nas funções frias): o FNV-1a de 32 bits roda em duas metades de 16 bits e a soma é
// uma string hex de 8 caracteres, nunca um número ≥ 2^30; nenhum u32 grande atravessa chamada nem mora no objeto.
import { CAUSA_DO_FIM, LIMITE_DE_ALMAS } from '../nucleo/estado';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA } from '../mundo/toro';
import type { ResultadoDaVigilia } from '../mundo/vigilia';

export const VERSAO_DO_META = 2;

/** A mancha das Cinzas Perdidas guardada: posição, Hora (1 a 5), rótulo da capela (null no MVP) e Almas (SV3). */
export interface ManchaDoMeta {
  readonly x: number;
  readonly y: number;
  readonly hora: number;
  readonly rotulo: null;
  readonly almas: number;
}

export interface OpcoesDoMeta {
  readonly som: boolean;
  readonly flashes: boolean;
  readonly numerosDeDano: boolean;
}

export interface Meta {
  readonly versao: number;
  /** Cresce a cada gravação lógica (fim de Vigília, opção, tutorial). */
  readonly seq: number;
  /** FNV-1a do conteúdo, 8 caracteres hex; vazia no objeto em memória até `serializarMeta`. */
  readonly soma: string;
  /** Saldo de Almas do Santuário. */
  readonly almas: number;
  /** Brasas ganhas nos Amanheceres (F-009 AN3, versão 2 do meta); só contabilizadas até a F-010. */
  readonly brasas: number;
  readonly mancha: ManchaDoMeta | null;
  /** Máscara de TUTORIAL (mover 1, esquiva 2, aparo 4). */
  readonly tutoriais: number;
  readonly primeiroApagarFeito: boolean;
  readonly opcoes: OpcoesDoMeta;
  readonly vigiliasConcluidas: number;
  /** Neutros até a F-008 (retomada) e a F-010. */
  readonly proximaIdVigilia: number;
  readonly ultimaEncerrada: number | null;
}

export function metaPadrao(): Meta {
  return {
    versao: VERSAO_DO_META,
    seq: 0,
    soma: '',
    almas: 0,
    brasas: 0,
    mancha: null,
    tutoriais: 0,
    primeiroApagarFeito: false,
    opcoes: { som: true, flashes: true, numerosDeDano: true },
    vigiliasConcluidas: 0,
    proximaIdVigilia: 1,
    ultimaEncerrada: null,
  };
}

const PRIMO_BAIXO = 0x0193;

/**
 * FNV-1a de 32 bits em duas metades de 16 bits (SV9). O primo é 0x01000193: `h × 0x193` mais `(h mod 2^8) × 2^24`,
 * e as contas ficam abaixo de 2^30 (`lo × 0x193`, `hi × 0x193 + vai-um + (lo mod 2^8) × 2^8`). Cada unidade UTF-16
 * entra como dois bytes (o baixo e o alto).
 */
export function somaDoTexto(texto: string): string {
  let hi = 0x811c;
  let lo = 0x9dc5;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    for (let b = 0; b < 2; b++) {
      lo ^= b === 0 ? c & 0xff : c >>> 8;
      const baixo = lo * PRIMO_BAIXO;
      hi = (hi * PRIMO_BAIXO + (baixo >>> 16) + ((lo & 0xff) << 8)) & 0xffff;
      lo = baixo & 0xffff;
    }
  }
  return hex16(hi) + hex16(lo);
}

function hex16(v: number): string {
  return v.toString(16).padStart(4, '0');
}

/** O texto que a soma confere: o objeto sem a soma, com as chaves na ordem fixa. */
function corpoDoMeta(m: Meta): string {
  // A versão 1 não tinha `brasas`: a soma dela é conferida sem o campo (a migração 1 → 2 em `lerMeta`).
  return JSON.stringify({
    versao: m.versao,
    seq: m.seq,
    almas: m.almas,
    ...(m.versao >= 2 ? { brasas: m.brasas } : {}),
    mancha: m.mancha,
    tutoriais: m.tutoriais,
    primeiroApagarFeito: m.primeiroApagarFeito,
    opcoes: m.opcoes,
    vigiliasConcluidas: m.vigiliasConcluidas,
    proximaIdVigilia: m.proximaIdVigilia,
    ultimaEncerrada: m.ultimaEncerrada,
  });
}

/** O texto a gravar: o corpo com a soma de conferência. */
export function serializarMeta(m: Meta): string {
  return JSON.stringify({ ...JSON.parse(corpoDoMeta(m)), soma: somaDoTexto(corpoDoMeta(m)) });
}

const inteiro = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

function lerMancha(v: unknown): ManchaDoMeta | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'object' || v === undefined) return undefined;
  const m = v as Record<string, unknown>;
  const dentro = typeof m.x === 'number' && typeof m.y === 'number' && m.x >= 0 && m.x < LARGURA_DO_MAPA && m.y >= 0 && m.y < ALTURA_DO_MAPA;
  if (!dentro || !inteiro(m.hora, 1, 5) || m.rotulo !== null || !inteiro(m.almas, 1, LIMITE_DE_ALMAS - 1)) return undefined;
  return { x: m.x as number, y: m.y as number, hora: m.hora, rotulo: null, almas: m.almas };
}

/**
 * Lê o texto gravado (SV9): texto ausente, JSON quebrado, soma errada, campo fora do tipo ou versão desconhecida
 * dão os padrões, sem lançar; a versão 0 (sem campo `versao`) migra para os padrões. A versão 1 migra para a 2 com
 * `brasas` 0 (F-009), conferida pela soma da própria versão. Nunca devolve o objeto lido.
 */
export function lerMeta(texto: string | null): Meta {
  if (texto === null) return metaPadrao();
  try {
    const bruto: unknown = JSON.parse(texto);
    if (typeof bruto !== 'object' || bruto === null) return metaPadrao();
    const o = bruto as Record<string, unknown>;
    const v1 = o.versao === 1;
    if ((!v1 && o.versao !== VERSAO_DO_META) || typeof o.soma !== 'string') return metaPadrao();
    const op = o.opcoes as Record<string, unknown> | null;
    const mancha = lerMancha(o.mancha);
    if (
      mancha === undefined ||
      op === null ||
      typeof op !== 'object' ||
      typeof op.som !== 'boolean' ||
      typeof op.flashes !== 'boolean' ||
      typeof op.numerosDeDano !== 'boolean' ||
      !inteiro(o.seq, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(o.almas, 0, LIMITE_DE_ALMAS - 1) ||
      !(v1 || inteiro(o.brasas, 0, LIMITE_DE_ALMAS - 1)) ||
      !inteiro(o.tutoriais, 0, 7) ||
      typeof o.primeiroApagarFeito !== 'boolean' ||
      !inteiro(o.vigiliasConcluidas, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(o.proximaIdVigilia, 1, LIMITE_DE_ALMAS - 1) ||
      !(o.ultimaEncerrada === null || inteiro(o.ultimaEncerrada, 0, LIMITE_DE_ALMAS - 1))
    ) {
      return metaPadrao();
    }
    const lido: Meta = {
      versao: v1 ? 1 : VERSAO_DO_META,
      seq: o.seq,
      soma: o.soma,
      almas: o.almas,
      brasas: v1 ? 0 : (o.brasas as number),
      mancha,
      tutoriais: o.tutoriais,
      primeiroApagarFeito: o.primeiroApagarFeito,
      opcoes: { som: op.som, flashes: op.flashes, numerosDeDano: op.numerosDeDano },
      vigiliasConcluidas: o.vigiliasConcluidas,
      proximaIdVigilia: o.proximaIdVigilia,
      ultimaEncerrada: o.ultimaEncerrada,
    };
    if (somaDoTexto(corpoDoMeta(lido)) !== o.soma) return metaPadrao();
    // Migração 1 → 2: o resto fica; a soma nova nasce na próxima gravação.
    return v1 ? { ...lido, versao: VERSAO_DO_META, soma: '' } : lido;
  } catch {
    return metaPadrao();
  }
}

/** Uma gravação lógica a mais: `seq` cresce sempre. */
function proximo(m: Meta, mudancas: Partial<Meta>): Meta {
  return { ...m, ...mudancas, seq: Math.min(LIMITE_DE_ALMAS - 1, m.seq + 1), soma: '' };
}

/** A opção alterada na hora do toque (SV4). */
export function comOpcoes(m: Meta, opcoes: OpcoesDoMeta): Meta {
  return proximo(m, { opcoes: { som: opcoes.som, flashes: opcoes.flashes, numerosDeDano: opcoes.numerosDeDano } });
}

/** O tutorial cumprido: soma os bits (SV4); sem bit novo, o meta não muda (nem `seq`). */
export function comTutoriais(m: Meta, mascara: number): Meta {
  const novos = (m.tutoriais | mascara) & 7;
  return novos === m.tutoriais ? m : proximo(m, { tutoriais: novos });
}

/**
 * O crédito do fim da Vigília (SV1, SV7, MC3, MC8, PE6, RS8). As Almas do Santuário somam `almasAoSantuario` com
 * o teto de 2^30 − 1. A mancha: o Apagar (e A Fome) substitui a do meta pela nova (ou `null` com N < 2); Abandonar e
 * Amanhecer mantêm a antiga, a não ser que ela tenha sido recuperada (consumida). `primeiroApagarFeito` liga no Apagar
 * e em A Fome (FM3: B §5.11 chama A Fome de Apagar). `brasas` soma as da Vigília (AN3). `vigiliasConcluidas` conta toda Vigília encerrada. Chamar duas vezes credita duas vezes: o guarda é do
 * chamador (`fimCreditado`).
 */
export function aplicarFimDeVigilia(m: Meta, r: ResultadoDaVigilia): Meta {
  const soma = m.almas + r.almasAoSantuario;
  const cria = r.causa === CAUSA_DO_FIM.apagar || r.causa === CAUSA_DO_FIM.aFome;
  const mancha: ManchaDoMeta | null = cria ? r.mancha : r.recuperouMancha ? null : m.mancha;
  return proximo(m, {
    almas: soma < LIMITE_DE_ALMAS ? soma : LIMITE_DE_ALMAS - 1,
    brasas: Math.min(LIMITE_DE_ALMAS - 1, m.brasas + r.brasas),
    mancha,
    primeiroApagarFeito: m.primeiroApagarFeito || cria,
    vigiliasConcluidas: Math.min(LIMITE_DE_ALMAS - 1, m.vigiliasConcluidas + 1),
  });
}

/**
 * Reserva o `idVigilia` da Vigília que vai começar (SV4): é o `proximaIdVigilia` de agora, e o meta novo já traz o
 * seguinte. Quem chama grava o meta antes do `vigilia` do passo 0.
 */
export function reservarIdDaVigilia(m: Meta): { readonly meta: Meta; readonly id: number } {
  return { meta: proximo(m, { proximaIdVigilia: Math.min(LIMITE_DE_ALMAS - 1, m.proximaIdVigilia + 1) }), id: m.proximaIdVigilia };
}
