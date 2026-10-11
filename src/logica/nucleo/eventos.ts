// Anel de eventos da simulação (ADR-0002 §4 e §15 item 2; design/decisoes-F-004.md §4):
// 1.024 entradas de 4 Uint32 + 4 Float32 num ArrayBuffer próprio, fora do
// buffer do estado (nem o hash nem a cópia do buffer o veem). A simulação só
// escreve; o render, o debug e a telemetria leem pelo contador `escritos`, que
// só cresce. Nada é alocado depois de criarAnel().

export const CAPACIDADE_DO_ANEL = 1024;
/** Palavras por evento: 4 Uint32 e 4 Float32. */
export const PALAVRAS_POR_EVENTO = 8;
/** 4 bytes do contador + as entradas. */
export const BYTES_DO_ANEL = 4 + CAPACIDADE_DO_ANEL * PALAVRAS_POR_EVENTO * 4;

/** Tipos de evento; os códigos só crescem no fim. */
export const EVENTO = { acerto: 1, morte: 2, golpe: 3, pulso: 4 } as const;
/** Formas de ataque do evento; os códigos só crescem no fim. */
export const FORMA = { ida: 1, volta: 2, estocada: 3, faca: 4, tick: 5 } as const;
/** Bits de flags. */
export const FLAG = { critico: 1, matou: 2, convertido: 4 } as const;
/** Causa de morte (as F-008 e F-009 acrescentam as suas). */
export const CAUSA = { arma: 1 } as const;
/** Handle de "sem alvo". */
export const SEM_ALVO = 0xffffffff;

/** Uint32 de cada evento, a partir do início da entrada. */
export const EV = {
  passo: 0,
  /** tipo | arma << 8 | forma << 16. */
  tipoArmaForma: 1,
  /** Handle do alvo (geração × 65.536 + slot) ou SEM_ALVO. */
  alvo: 2,
  /** tipo do inimigo | flags << 8 | causa << 16. */
  inimigoFlagsCausa: 3,
  /** Os 4 Float32 (acerto: x, y, valor, 0; morte: x, y, 0, 0; golpe: dirX, dirY, alcance, meia-largura; pulso: 0, 0, R, empurrão). */
  floats: 4,
} as const;

export interface AnelDeEventos {
  readonly buffer: ArrayBuffer;
  /** [0] = escritos; a entrada k começa na palavra 1 + k × 8. */
  readonly u32: Uint32Array;
  readonly f32: Float32Array;
}

export function criarAnel(): AnelDeEventos {
  const buffer = new ArrayBuffer(BYTES_DO_ANEL);
  return { buffer, u32: new Uint32Array(buffer), f32: new Float32Array(buffer) };
}

export function esvaziarAnel(a: AnelDeEventos): void {
  a.u32.fill(0);
}

/** Eventos escritos desde o início da Vigília (só cresce). */
export function eventosEscritos(a: AnelDeEventos): number {
  return a.u32[0]!;
}

/** Palavra inicial do evento de número `n` (0 = o 1º escrito). */
export function inicioDoEvento(n: number): number {
  return 1 + (n % CAPACIDADE_DO_ANEL) * PALAVRAS_POR_EVENTO;
}

/** Os 4 floats do próximo evento: quem grava escreve aqui e chama gravarEvento (sem passar double). */
export const FLOATS_DO_EVENTO = new Float64Array(4);

/**
 * Grava um evento com os floats de FLOATS_DO_EVENTO. Só recebe inteiros
 * pequenos: o handle é montado aqui a partir do slot e da geração (slot −1 =
 * sem alvo), porque um handle ≥ 2³⁰ atravessando a chamada viraria um
 * HeapNumber no V8.
 */
export function gravarEvento(
  a: AnelDeEventos,
  passo: number,
  tipo: number,
  arma: number,
  forma: number,
  slot: number,
  geracao: number,
  tipoDoInimigo: number,
  flags: number,
  causa: number,
): void {
  const u32 = a.u32;
  const n = u32[0]!;
  const i = 1 + (n % CAPACIDADE_DO_ANEL) * PALAVRAS_POR_EVENTO;
  u32[i + EV.passo] = passo;
  u32[i + EV.tipoArmaForma] = tipo | (arma << 8) | (forma << 16);
  u32[i + EV.alvo] = slot < 0 ? SEM_ALVO : geracao * 0x10000 + slot;
  u32[i + EV.inimigoFlagsCausa] = tipoDoInimigo | (flags << 8) | (causa << 16);
  const f32 = a.f32;
  f32[i + EV.floats] = FLOATS_DO_EVENTO[0]!;
  f32[i + EV.floats + 1] = FLOATS_DO_EVENTO[1]!;
  f32[i + EV.floats + 2] = FLOATS_DO_EVENTO[2]!;
  f32[i + EV.floats + 3] = FLOATS_DO_EVENTO[3]!;
  u32[0] = n + 1;
}

/**
 * Leitor do anel (render, debug): guarda o próximo evento a ler. Se ficou
 * mais de 1.024 eventos para trás, pula para os últimos e soma a diferença em
 * `perdidos`.
 */
export class LeitorDeEventos {
  proximo = 0;
  perdidos = 0;

  /** Começa a ler a partir do próximo evento escrito (os anteriores ficam de fora). */
  alinhar(a: AnelDeEventos): void {
    this.proximo = a.u32[0]!;
  }

  reiniciar(): void {
    this.proximo = 0;
    this.perdidos = 0;
  }

  /** Quantos eventos há para ler, depois de pular os que o anel já sobrescreveu. */
  pendentes(a: AnelDeEventos): number {
    const escritos = a.u32[0]!;
    if (escritos < this.proximo) {
      // Anel de outra Vigília (reiniciado): recomeça.
      this.proximo = 0;
    }
    const atraso = escritos - this.proximo;
    if (atraso > CAPACIDADE_DO_ANEL) {
      this.perdidos += atraso - CAPACIDADE_DO_ANEL;
      this.proximo = escritos - CAPACIDADE_DO_ANEL;
    }
    return escritos - this.proximo;
  }
}
