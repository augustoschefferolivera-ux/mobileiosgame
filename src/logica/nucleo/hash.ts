// FNV-1a de 32 bits (ADR-0002 §5): hash do estado e semeadura dos fluxos de RNG.

export const FNV_BASE = 0x811c9dc5;
const FNV_PRIMO = 0x01000193;

/** Mistura um byte. */
export function fnv1aByte(h: number, byte: number): number {
  return Math.imul((h ^ (byte & 0xff)) >>> 0, FNV_PRIMO) >>> 0;
}

/** Mistura os bytes de `bytes[inicio .. fim)`. */
export function fnv1aBytes(h: number, bytes: Uint8Array, inicio = 0, fim = bytes.length): number {
  let x = h;
  for (let i = inicio; i < fim; i++) {
    x = Math.imul((x ^ bytes[i]!) >>> 0, FNV_PRIMO) >>> 0;
  }
  return x;
}

/** Mistura uma palavra de 32 bits, byte a byte, em little-endian. */
export function fnv1aU32(h: number, palavra: number): number {
  let x = fnv1aByte(h, palavra);
  x = fnv1aByte(x, palavra >>> 8);
  x = fnv1aByte(x, palavra >>> 16);
  return fnv1aByte(x, palavra >>> 24);
}

/** Mistura um texto ASCII (ids de fluxo). Qualquer caractere fora do ASCII é erro. */
export function fnv1aTexto(h: number, texto: string): number {
  let x = h;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c > 0x7f) throw new Error('fnv1aTexto: só ASCII');
    x = fnv1aByte(x, c);
  }
  return x;
}

/** Hash em hexadecimal de 8 dígitos, para logs e para `__GAME_DEBUG__.hash()`. */
export function hex8(h: number): string {
  return (h >>> 0).toString(16).padStart(8, '0');
}
