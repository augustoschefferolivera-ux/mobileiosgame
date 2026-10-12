// Escala do HP e do dano no spawn (B §3.6; decisoes-F-003 §1). Módulo folha, sem
// nada do estado: o `estado.ts` o importa para postar os inimigos iniciais sem
// criar um ciclo de valores com `inimigos.ts`.

/**
 * HP no spawn: fround(hp_base × (100 + 12·min) × I10 / 1.000) (B §3.6;
 * decisoes-F-003 §1), escrito em `out[i]` (no V8, um double devolvido alocaria
 * um HeapNumber a cada nascimento; decisoes-F-004 E6).
 */
export function gravarHpNoSpawn(out: Float32Array, i: number, hpBase: number, minuto: number, intensidade10: number): void {
  out[i] = (hpBase * (100 + 12 * minuto) * intensidade10) / 1000;
}

/** Dano no spawn: fround(dano_base × (100 + 5·min) / 100) (B §3.6), escrito em `out[i]`. */
export function gravarDanoNoSpawn(out: Float32Array, i: number, danoBase: number, minuto: number): void {
  out[i] = (danoBase * (100 + 5 * minuto)) / 100;
}
