// Prompts de tutorial do Hud (decisoes-F-006 TU4, TU11): um painel só, com o
// texto do prompt visível de maior índice (mover < esquiva < aparo, o mais
// recente); o menor volta quando o maior cumpre. Puro, sem Phaser.
import { FASE, JOGADOR3_U8, JOGADOR4_U8, JOGADOR_U8, PROMPT, type Estado } from '../logica/nucleo/estado';

/** Ids de pt-BR.json na ordem de prioridade: mover, esquiva, aparo. */
export const IDS_DOS_PROMPTS = ['A2.TUTORIAL.01', 'A2.TUTORIAL.02', 'A2.TUTORIAL.03'] as const;

/** Índice (0 a 2) do prompt a mostrar, ou -1 se nenhum está visível. */
export function promptEmTela(e: Estado): number {
  // Apagando e no Resultado o prompt não fica por baixo do véu (F-007).
  if (e.jogador4U8[JOGADOR4_U8.fase] !== FASE.viva) return -1;
  if (e.jogador3U8[JOGADOR3_U8.promptAparo] === PROMPT.visivel) return 2;
  if (e.jogador3U8[JOGADOR3_U8.promptEsquiva] === PROMPT.visivel) return 1;
  if (e.jogadorU8[JOGADOR_U8.promptMover] === PROMPT.visivel) return 0;
  return -1;
}
