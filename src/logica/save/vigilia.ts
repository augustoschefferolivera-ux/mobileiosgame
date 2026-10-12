// Save `vigilia` e `andamento` (design/decisoes-F-008.md SV1 a SV8): o buffer inteiro da simulação em base64 dentro de um
// envelope JSON versionado, com soma de conferência; a leitura valida tudo e nunca lança; a carga copia os bytes, refaz
// os derivados e deixa o modal aberto como estava. Módulo puro: quem lê e grava (localStorage) é
// plataforma/armazenamento.ts. Regra do laço quente (também nas funções frias): a soma é o FNV-1a de 32 bits em
// metades de 16 bits de meta.ts (string hex de 8), e nenhum u32 grande atravessa chamada nem mora no objeto.
import type { DadosDaVigilia } from '../mundo/dados';
import { guardarSombra } from '../mundo/fogueira';
import { encerrarVigilia, resultadoDaVigilia } from '../mundo/vigilia';
import {
  CAB,
  CAUSA_DO_FIM,
  ETAPA,
  FOGUEIRA_U32,
  FOGUEIRA_U8,
  JOGADOR,
  JOGADOR4_U8,
  LIMITE_DE_ALMAS,
  PROGRESSAO,
  VERSAO_LAYOUT,
  sincronizarDerivados,
  type Estado,
} from '../nucleo/estado';
import { esvaziarAnel } from '../nucleo/eventos';
import { FNV_BASE, fnv1aBytes, hex8 } from '../nucleo/hash';
import { verificarNaN } from '../nucleo/nan';
import { aplicarFimDeVigilia, somaDoTexto, type Meta } from './meta';
import { MIGRACOES_DO_ENVELOPE, MIGRACOES_DO_LAYOUT, migrarEnvelope, migrarLayout, type EnvelopeBruto, type MigracaoDeEnvelope, type MigracaoDeLayout } from './migracoes';

/** Versão do envelope `vigilia` (SV7); cada mudança do envelope acrescenta uma migração em migracoes.ts. */
export const VERSAO_DO_ENVELOPE = 1;

/** O save `vigilia` já validado. `bytes` é o buffer em base64; a soma confere o resto. */
export interface EnvelopeDaVigilia {
  readonly versao: number;
  /** `VERSAO_LAYOUT` do buffer gravado. */
  readonly layout: number;
  readonly idVigilia: number;
  /** Cresce a cada gravação da mesma Vigília. */
  readonly seq: number;
  /** Hora da Fogueira (1 a 3), ou 0 no save do passo 0 (SV5). */
  readonly hora: number;
  readonly nivel: number;
  readonly almas: number;
  readonly frascos: number;
  readonly bytes: string;
  readonly soma: string;
}

/** O save pequeno de 60 s (SV3): só o que a Recusar e o resumo precisam; nunca o buffer. */
export interface AndamentoDaVigilia {
  readonly idVigilia: number;
  readonly seqDoVigilia: number;
  readonly hora: number;
  readonly almas: number;
  readonly x: number;
  readonly y: number;
  readonly relogio: number;
  readonly passo: number;
}

// ——— base64 próprio (SV9) ———

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const INVERSO = new Int8Array(128).fill(-1);
for (let i = 0; i < ALFABETO.length; i++) INVERSO[ALFABETO.charCodeAt(i)] = i;

export function bytesParaBase64(bytes: Uint8Array): string {
  const partes: string[] = [];
  let bloco = '';
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < n ? bytes[i + 1]! : 0;
    const c = i + 2 < n ? bytes[i + 2]! : 0;
    bloco += ALFABETO[a >> 2]! + ALFABETO[((a & 3) << 4) | (b >> 4)]! + (i + 1 < n ? ALFABETO[((b & 15) << 2) | (c >> 6)]! : '=') + (i + 2 < n ? ALFABETO[c & 63]! : '=');
    if (bloco.length >= 8192) {
      partes.push(bloco);
      bloco = '';
    }
  }
  partes.push(bloco);
  return partes.join('');
}

/** Decodifica; `null` com tamanho que não fecha, caractere fora do alfabeto ou `=` fora do fim. */
export function base64ParaBytes(texto: string): Uint8Array | null {
  const n = texto.length;
  if (n % 4 !== 0) return null;
  let sobra = 0;
  if (n > 0 && texto[n - 1] === '=') sobra = texto[n - 2] === '=' ? 2 : 1;
  const saida = new Uint8Array((n / 4) * 3 - sobra);
  let o = 0;
  for (let i = 0; i < n; i += 4) {
    const ultimo = i + 4 === n;
    let acumulado = 0;
    for (let k = 0; k < 4; k++) {
      const c = texto.charCodeAt(i + k);
      let v: number;
      if (c === 61 && ultimo && k >= 4 - sobra) v = 0;
      else {
        v = c < 128 ? INVERSO[c]! : -1;
        if (v < 0) return null;
      }
      acumulado = (acumulado << 6) | v;
    }
    if (o < saida.length) saida[o++] = (acumulado >> 16) & 255;
    if (o < saida.length) saida[o++] = (acumulado >> 8) & 255;
    if (o < saida.length) saida[o++] = acumulado & 255;
  }
  return saida;
}

// ——— Envelope ———

/** O texto que a soma confere: o objeto sem a soma, na ordem em que foi gravado. */
function corpoSemSoma(o: Record<string, unknown>): string {
  const resto: Record<string, unknown> = { ...o };
  delete resto.soma;
  return JSON.stringify(resto);
}

/** Hash do buffer gravado (FNV-1a de 32 bits, 8 hex): o `__GAME_DEBUG__.save.hash` e a conferência da retomada. */
export function hashDosBytes(bytes: Uint8Array): string {
  return hex8(fnv1aBytes(FNV_BASE, bytes));
}

/** Hora do save: a da última Fogueira acesa (1 a 3), ou 0 antes da primeira (o save do passo 0, SV5). Os saves só saem em momentos de Fogueira ou no passo 0. */
function horaDoSave(e: Estado): number {
  return e.fogueiraU8[FOGUEIRA_U8.fogueiraHora]!;
}

/**
 * O texto do `vigilia` a gravar. `bytes` = o buffer a guardar (o do estado, ou a sombra do Partir, FG9); o resumo (nível,
 * Almas, Frascos, hora) vem do estado vivo, ou do `resumo` [nível, Almas, cargas] que acompanha a sombra (o resumo e o buffer
 * são do mesmo passo; o estado vivo pode ter andado um passo além, L7 do crítico).
 */
export function serializarVigilia(e: Estado, seq: number, bytes: Uint8Array = e.bytes, resumo?: Uint32Array): string {
  const corpo = {
    versao: VERSAO_DO_ENVELOPE,
    layout: VERSAO_LAYOUT,
    idVigilia: e.fogueiraU32[FOGUEIRA_U32.idVigilia]!,
    seq,
    hora: horaDoSave(e),
    nivel: resumo?.[0] ?? e.progresso[PROGRESSAO.nivel]!,
    almas: resumo?.[1] ?? e.progresso[PROGRESSAO.almas]!,
    frascos: resumo?.[2] ?? e.jogador4U8[JOGADOR4_U8.frascoCargas]!,
    bytes: bytesParaBase64(bytes),
  };
  const texto = JSON.stringify(corpo);
  return JSON.stringify({ ...corpo, soma: somaDoTexto(texto) });
}

const inteiro = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Por que uma leitura não deu um save utilizável. */
export type MotivoDaRecusa = 'ausente' | 'quebrado' | 'soma' | 'futuro' | 'campo';

export type LeituraDaVigilia = { readonly ok: true; readonly envelope: EnvelopeDaVigilia } | { readonly ok: false; readonly motivo: MotivoDaRecusa };

/**
 * Lê o texto gravado: ausente, JSON quebrado, soma errada (conferida na versão em que foi gravado), `versao` maior que a
 * deste build, falta de elo na cadeia de migração ou campo fora do tipo dão `ok: false`, sem lançar. A `cadeia` e a `versao`
 * existem para o teste da migração (F-008.2); em produção valem as de migracoes.ts.
 */
export function lerVigilia(texto: string | null, cadeia: readonly MigracaoDeEnvelope[] = MIGRACOES_DO_ENVELOPE, versaoAtual: number = VERSAO_DO_ENVELOPE): LeituraDaVigilia {
  if (texto === null) return { ok: false, motivo: 'ausente' };
  try {
    const bruto: unknown = JSON.parse(texto);
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return { ok: false, motivo: 'quebrado' };
    const o = bruto as Record<string, unknown>;
    if (!inteiro(o.versao, 1, 1 << 20) || typeof o.soma !== 'string') return { ok: false, motivo: 'quebrado' };
    if (o.versao > versaoAtual) return { ok: false, motivo: 'futuro' };
    if (somaDoTexto(corpoSemSoma(o)) !== o.soma) return { ok: false, motivo: 'soma' };
    const corpo: EnvelopeBruto = { ...o };
    delete corpo.soma;
    const migrado = migrarEnvelope(corpo, o.versao, versaoAtual, cadeia);
    if (migrado === null) return { ok: false, motivo: 'futuro' };
    const m = migrado;
    if (
      !inteiro(m.layout, 1, 1 << 20) ||
      !inteiro(m.idVigilia, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(m.seq, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(m.hora, 0, 3) ||
      !inteiro(m.nivel, 1, 255) ||
      !inteiro(m.almas, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(m.frascos, 0, 255) ||
      typeof m.bytes !== 'string'
    ) {
      return { ok: false, motivo: 'campo' };
    }
    return {
      ok: true,
      envelope: {
        versao: versaoAtual,
        layout: m.layout,
        idVigilia: m.idVigilia,
        seq: m.seq,
        hora: m.hora,
        nivel: m.nivel,
        almas: m.almas,
        frascos: m.frascos,
        bytes: m.bytes,
        soma: o.soma,
      },
    };
  } catch {
    return { ok: false, motivo: 'quebrado' };
  }
}

// ——— Andamento ———

/** O texto do `andamento` (SV3), com soma. */
export function serializarAndamento(e: Estado, seqDoVigilia: number): string {
  const corpo = {
    idVigilia: e.fogueiraU32[FOGUEIRA_U32.idVigilia]!,
    seqDoVigilia,
    hora: horaDoSave(e),
    almas: e.progresso[PROGRESSAO.almas]!,
    x: e.jogador[JOGADOR.x]!,
    y: e.jogador[JOGADOR.y]!,
    relogio: e.cab[CAB.relogio]!,
    passo: e.cab[CAB.passo]!,
  };
  return JSON.stringify({ ...corpo, soma: somaDoTexto(JSON.stringify(corpo)) });
}

export function lerAndamento(texto: string | null): AndamentoDaVigilia | null {
  if (texto === null) return null;
  try {
    const o: unknown = JSON.parse(texto);
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return null;
    const a = o as Record<string, unknown>;
    if (typeof a.soma !== 'string' || somaDoTexto(corpoSemSoma(a)) !== a.soma) return null;
    if (
      !inteiro(a.idVigilia, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(a.seqDoVigilia, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(a.hora, 0, 3) ||
      !inteiro(a.almas, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(a.relogio, 0, LIMITE_DE_ALMAS - 1) ||
      !inteiro(a.passo, 0, LIMITE_DE_ALMAS - 1) ||
      typeof a.x !== 'number' ||
      typeof a.y !== 'number' ||
      !Number.isFinite(a.x) ||
      !Number.isFinite(a.y)
    ) {
      return null;
    }
    return { idVigilia: a.idVigilia, seqDoVigilia: a.seqDoVigilia, hora: a.hora, almas: a.almas, x: a.x, y: a.y, relogio: a.relogio, passo: a.passo };
  } catch {
    return null;
  }
}

// ——— Carga ———

/** O resultado de `restaurar`: `ok`, ou por que o save não vale (o estado deve ser descartado). */
export type ResultadoDaCarga = 'ok' | 'base64' | 'layout' | 'tamanho' | 'disposicao' | 'nan';

/**
 * Carga (SV1, SV6, SV7): decodifica, migra o layout se for menor (sem elo: `layout`), confere o tamanho, a versão e a
 * impressão da disposição dos obstáculos no cabeçalho, copia os bytes para o estado, refaz os derivados
 * (`sincronizarDerivados`: `hpMax` e as tabelas de dano vivo), esvazia o anel de eventos, confere NaN e, com a etapa
 * FOGUEIRA, guarda a sombra. O modal aberto continua aberto (a pilha mora no buffer). Com resultado diferente de `ok`, o
 * estado não serve mais e o chamador o descarta.
 */
export function restaurar(
  e: Estado,
  dados: DadosDaVigilia,
  envelope: EnvelopeDaVigilia,
  cadeiaDeLayout: Readonly<Record<number, MigracaoDeLayout>> = MIGRACOES_DO_LAYOUT,
): ResultadoDaCarga {
  let bytes = base64ParaBytes(envelope.bytes);
  if (bytes === null) return 'base64';
  if (envelope.layout > VERSAO_LAYOUT) return 'layout';
  if (envelope.layout < VERSAO_LAYOUT) {
    const migrados = migrarLayout(bytes, envelope.layout, VERSAO_LAYOUT, cadeiaDeLayout);
    if (migrados === null) return 'layout';
    bytes = migrados;
  }
  if (bytes.length !== e.bytes.length) return 'tamanho';
  const cab = new Uint32Array(bytes.slice(0, 64).buffer);
  if (cab[CAB.versao] !== VERSAO_LAYOUT) return 'layout';
  if (cab[CAB.disposicao] !== dados.impressao >>> 0) return 'disposicao';
  e.bytes.set(bytes);
  sincronizarDerivados(e, dados);
  esvaziarAnel(e.eventos);
  try {
    verificarNaN(e, 0);
  } catch {
    return 'nan';
  }
  if (e.fogueiraU8[FOGUEIRA_U8.etapa] === ETAPA.fogueira) guardarSombra(e);
  return 'ok';
}

// ——— Recusar (SV5, SV6) ———

/**
 * Recusar a retomada com o estado carregado: `encerrarVigilia(abandonar)` com as Almas = o maior entre as do `vigilia` e as
 * do `andamento` do mesmo `idVigilia` (Q-03); devolve o meta creditado (Abandonar leva ⌊N/2⌋, sem mancha nova) com
 * `ultimaEncerrada` = `idVigilia`. O estado deve ter sido restaurado do envelope (`ok`).
 */
export function recusarComEstado(e: Estado, dados: DadosDaVigilia, meta: Meta, andamento: AndamentoDaVigilia | null): Meta {
  const id = e.fogueiraU32[FOGUEIRA_U32.idVigilia]!;
  if (andamento !== null && andamento.idVigilia === id && andamento.almas > e.progresso[PROGRESSAO.almas]!) e.progresso[PROGRESSAO.almas] = andamento.almas;
  encerrarVigilia(e, dados, CAUSA_DO_FIM.abandonar);
  return { ...aplicarFimDeVigilia(meta, resultadoDaVigilia(e, dados)), ultimaEncerrada: id };
}

/**
 * Recusar sem estado (disposição diferente, SV6): as Almas do envelope (ou as do `andamento`, se maiores) × 0,5 vão ao
 * Santuário e a Vigília conta como concluída; sem mancha. `ultimaEncerrada` = `idVigilia`.
 */
export function recusarSemEstado(meta: Meta, idVigilia: number, almas: number, andamento: AndamentoDaVigilia | null): Meta {
  const maior = andamento !== null && andamento.idVigilia === idVigilia && andamento.almas > almas ? andamento.almas : almas;
  const soma = meta.almas + Math.floor(maior / 2);
  return {
    ...meta,
    seq: Math.min(LIMITE_DE_ALMAS - 1, meta.seq + 1),
    soma: '',
    almas: soma < LIMITE_DE_ALMAS ? soma : LIMITE_DE_ALMAS - 1,
    vigiliasConcluidas: Math.min(LIMITE_DE_ALMAS - 1, meta.vigiliasConcluidas + 1),
    ultimaEncerrada: idVigilia,
  };
}
