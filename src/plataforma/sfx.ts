// Os 3 sons placeholder do MVP (decisoes-F-006 RE12 e FB4; ADR-0002 §12): sintetizados no boot por funções puras
// que devolvem Float32Array (o AudioBuffer só embrulha, na taxa do contexto), com limite de vozes e intervalo
// mínimo por som. Aparo e esquiva perfeita tocam na F-006; a quebra é sintetizada e só a F-009 a dispara.
// A síntese usa Math.sin e exp, fora da simulação.

/** Os sons, na ordem dos buffers. */
export const SFX = { aparo: 0, esquivaPerfeita: 1, quebra: 2 } as const;
export const TOTAL_DE_SFX = 3;

/** Limite de vozes simultâneas e intervalo mínimo entre dois disparos do mesmo som (RE12). */
export const LIMITE_DE_SFX = { vozes: 2, intervaloMs: 80 } as const;

/** Duração de cada som em segundos. */
export const DURACAO_DO_SFX = [0.15, 0.08, 0.25] as const;

const DOIS_PI = 2 * Math.PI;
/** Rampa de entrada de 1 ms, contra o estalo do primeiro valor. */
const ATAQUE_S = 0.001;

function criar(taxa: number, segundos: number): Float32Array {
  return new Float32Array(Math.round(taxa * segundos));
}

/** Aparo: metálico agudo, dois senos (≈ 1,8 e ≈ 2,65 kHz) com decaimento exponencial, ≈ 0,15 s. */
export function sintetizarAparo(taxa: number): Float32Array {
  const out = criar(taxa, DURACAO_DO_SFX[SFX.aparo]);
  for (let i = 0; i < out.length; i++) {
    const t = i / taxa;
    const env = Math.exp(-t * 28) * Math.min(1, t / ATAQUE_S);
    out[i] = 0.5 * env * (Math.sin(DOIS_PI * 1800 * t) + 0.6 * Math.sin(DOIS_PI * 2650 * t));
  }
  return out;
}

/** Esquiva perfeita: um seno agudo (≈ 3,2 kHz) de decaimento rápido, ≈ 0,08 s; distinto do aparo. */
export function sintetizarEsquivaPerfeita(taxa: number): Float32Array {
  const out = criar(taxa, DURACAO_DO_SFX[SFX.esquivaPerfeita]);
  for (let i = 0; i < out.length; i++) {
    const t = i / taxa;
    out[i] = 0.6 * Math.exp(-t * 55) * Math.min(1, t / ATAQUE_S) * Math.sin(DOIS_PI * 3200 * t);
  }
  return out;
}

/** Quebra: seno grave (≈ 110 Hz) com um ruído curto (30 ms) de xorshift de semente fixa, ≈ 0,25 s. */
export function sintetizarQuebra(taxa: number): Float32Array {
  const out = criar(taxa, DURACAO_DO_SFX[SFX.quebra]);
  let r = 0x9e3779b9;
  const amostrasDeRuido = Math.round(taxa * 0.03);
  for (let i = 0; i < out.length; i++) {
    const t = i / taxa;
    r ^= r << 13;
    r ^= r >>> 17;
    r ^= r << 5;
    r >>>= 0;
    const ruido = i < amostrasDeRuido ? ((r / 0xffffffff) * 2 - 1) * (1 - i / amostrasDeRuido) : 0;
    out[i] = 0.5 * Math.min(1, t / ATAQUE_S) * (Math.exp(-t * 14) * Math.sin(DOIS_PI * 110 * t) + 0.4 * ruido);
  }
  return out;
}

/** Os 3 buffers, na ordem de SFX. */
export function sintetizarOsSfx(taxa: number): Float32Array[] {
  return [sintetizarAparo(taxa), sintetizarEsquivaPerfeita(taxa), sintetizarQuebra(taxa)];
}

/** FNV-1a de 32 bits sobre os bits das amostras Float32: o hash literal dos testes (um por som). */
export function hashDoSfx(amostras: Float32Array): string {
  const u32 = new Uint32Array(amostras.buffer, amostras.byteOffset, amostras.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < u32.length; i++) {
    h = Math.imul(h ^ u32[i]!, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Limite de vozes e intervalo mínimo por som. `tentar` decide e registra a voz; a voz termina pelo relógio
 * (instante de início + duração), sem callback de `onended`.
 */
export class LimiteDeVozes {
  private readonly fim = new Float64Array(TOTAL_DE_SFX * LIMITE_DE_SFX.vozes).fill(-Infinity);
  private readonly ultimo = new Float64Array(TOTAL_DE_SFX).fill(-Infinity);

  tentar(sfx: number, agoraMs: number): boolean {
    if (agoraMs - this.ultimo[sfx]! < LIMITE_DE_SFX.intervaloMs) return false;
    const base = sfx * LIMITE_DE_SFX.vozes;
    for (let v = 0; v < LIMITE_DE_SFX.vozes; v++) {
      if (this.fim[base + v]! <= agoraMs) {
        this.fim[base + v] = agoraMs + DURACAO_DO_SFX[sfx]! * 1000;
        this.ultimo[sfx] = agoraMs;
        return true;
      }
    }
    return false;
  }
}
