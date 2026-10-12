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
export const EVENTO = {
  acerto: 1,
  morte: 2,
  golpe: 3,
  pulso: 4,
  nivel: 5,
  carta: 6,
  onda: 7,
  bau: 8,
  item: 9,
  uniao: 10,
  // F-006 (design/decisoes-F-006.md ET10)
  telegrafo: 11,
  golpeInimigo: 12,
  esquiva: 13,
  esquivaPerfeita: 14,
  aparo: 15,
  aparoFalho: 16,
  posturaQuebrada: 17,
  contraAtaque: 18,
  acaoNegada: 19,
  projetilLancado: 20,
  aparoVazio: 21,
  // F-007 (design/decisoes-F-007.md LY4); os códigos só crescem no fim.
  frascoIniciado: 22,
  frascoInterrompido: 23,
  frascoCancelado: 24,
  apagou: 25,
  fimDaVigilia: 26,
  manchaRecuperada: 27,
  /** Dano líquido (depois da armadura e da Brasa Firme) em `FLOATS_DO_EVENTO[0]`. */
  danoAoJogador: 28,
  // F-008 (design/decisoes-F-008.md LY2); os códigos só crescem no fim.
  marcoIniciado: 29,
  marcoVencido: 30,
  marcoConcluido: 31,
  fogueiraAcesa: 32,
  fogueiraAberta: 33,
  descansou: 34,
  forjou: 35,
  fogueiraPartiu: 36,
  fogueiraApagada: 37,
  convocacao: 38,
} as const;
/** Formas de ataque do evento; os códigos só crescem no fim. */
/** 7 e 8 (F-006): o arco do Oco Grande e o projétil de Sal da Noviça; 9 e 10 (F-008): a Patada (cone) e o Grito (círculo) do Coroado. */
export const FORMA = { ida: 1, volta: 2, estocada: 3, faca: 4, tick: 5, onda: 6, arcoInimigo: 7, projetilSal: 8, coneInimigo: 9, gritoInimigo: 10 } as const;
/** Bits de flags. */
/** `contra` (F-006): evento `golpe` ou `acerto` de uma salva extra do Contra-ataque. */
export const FLAG = { critico: 1, matou: 2, convertido: 4, contra: 8 } as const;
/**
 * Causa de morte (a F-009 acrescenta as suas). Só `arma` solta Cinza, Alma, baú e soma `mortes`; `arena` é a massa e os
 * médios mortos ao formar a arena (AR4) e `cinza` os Coroados do marco vencido ou do 20:00 (AR7, AR8).
 */
export const CAUSA = { arma: 1, arena: 2, cinza: 3 } as const;
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
  /**
   * Os 4 Float32. acerto: x, y, valor, 0; morte: x, y, 0, 0; golpe: dirX, dirY,
   * alcance, meia-largura; pulso: 0, 0, R, empurrão (F-004). F-005
   * (design/decisoes-F-005.md E5): nivel: nível, XP restante; carta: nível
   * ofertado, índice da carta (tipo de carta na forma, item na arma); onda: x,
   * y, dirX, dirY (slot da onda no alvo); bau: x, y, índice de queda, itens
   * (tipo do pickup na forma); item: nível resultante (categoria na forma,
   * código na arma); uniao: código da passiva (o resultado na arma). F-006
   * (ET10): telegrafo: x, y do atacante, duração, alcance; golpeInimigo: x, y,
   * dano bruto (0 se evitado), desfecho (1 acertou, 2 esquivado, 3 aparado, 4
   * errou); esquiva: x, y, dirX, dirY; esquivaPerfeita: x, y (a origem do dano
   * na forma); aparo: x, y do atacante, stamina depois; aparoFalho: x, y do
   * jogador; posturaQuebrada: x, y, passos; contraAtaque: x, y, slot do alvo,
   * vagas armadas; acaoNegada: x, y, stamina, custo (a ação na forma);
   * projetilLancado: x, y, dirX, dirY; aparoVazio: x, y, stamina depois.
   * F-007 (LY4): frascoIniciado: x, y, hp antes, hpMax; frascoInterrompido:
   * x, y, dano líquido, passo da cura; frascoCancelado: x, y, passo da cura,
   * 0; apagou: x, y, Almas, 0; fimDaVigilia: x, y, Almas na mancha, Almas ao
   * Santuário (a causa na forma); manchaRecuperada: x, y, Almas, 0;
   * danoAoJogador: x, y, dano líquido, hp depois.
   * F-008 (LY2): marcoIniciado: x, y do centro da arena, k do marco (0 a 2), Coroados que nasceram;
   * marcoVencido: x, y do centro da arena, k do marco, Coroados que viraram cinza;
   * marcoConcluido: x, y do jogador, k do marco, 0; fogueiraAcesa: x, y da Fogueira, hora (1 a 3), 0;
   * fogueiraApagada: x, y da Fogueira, hora, 0; convocacao: x, y do Coroado, quantos entraram, quantos
   * foram descartados (TETO ou obstáculo); golpeInimigo e telegrafo com a forma 9 ou 10 levam os mesmos
   * floats do arco. Os eventos 33 a 36 (Fogueira aberta, Descansar, Forjar, Partir) são da parte 2b.
   */
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
