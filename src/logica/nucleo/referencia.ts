// Parâmetros do teste de determinismo, compartilhados pelo Vitest, pela
// Playwright e por `__GAME_DEBUG__` (F-001.1 e F-001.11).

/** Passos do teste de determinismo (B §4, F-001). */
export const PASSOS_REFERENCIA = 1000;
/** Seed usada quando nem `?seed` nem `--seed` foram dados. */
export const SEED_PADRAO = 1;
