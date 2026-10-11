// Parâmetros do teste de determinismo, compartilhados pelo Vitest, pela
// Playwright e por `__GAME_DEBUG__` (F-001.1, F-001.11 e F-002).
import type { Roteiro } from './comandos';

/** Passos do teste de determinismo (B §4, F-001). */
export const PASSOS_REFERENCIA = 1000;
/** Seed usada quando nem `?seed` nem `--seed` foram dados. */
export const SEED_PADRAO = 1;

/** 1/√2, literal (sem trigonometria na simulação; ADR-0002 §5). */
const R2 = 0.7071067811865476;

/**
 * Roteiro fixo de ComandosDoPasso dos 1.000 passos de referência, por passo
 * absoluto (design/decisoes-F-002.md §6), na Charneca com Aldric: parado,
 * meia velocidade, pelo corredor até cruzar a costura em x (passo ≈ 258),
 * de raspão no 1º obstáculo do outro lado, diagonal, e para baixo, deslizando
 * em outro obstáculo, até cruzar a costura em y (passo ≈ 962). O Vitest
 * confere esses fatos (tests/logica/determinismo.test.ts).
 */
export const ROTEIRO_REFERENCIA: Roteiro = [
  { passo: 0, mx: 0, my: 0 },
  { passo: 5, mx: 0.5, my: 0 },
  { passo: 25, mx: 1, my: 0 },
  { passo: 400, mx: R2, my: R2 },
  { passo: 430, mx: 0, my: 1 },
];
