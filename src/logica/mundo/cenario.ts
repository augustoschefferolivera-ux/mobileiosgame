// Rotação do cenário horda_rotativa (design/decisoes-F-003.md §5): a cada 60
// passos, os N inimigos vivos de menor slot são removidos pelo caminho comum de
// liberação, sem efeito de morte, e o diretor os repõe na reposição seguinte.
// Só serve ao teste de heap (F-003.7); nas Vigílias normais, N = 0.
import { CAB, CAPACIDADE_DE_INIMIGOS, MUNDO, type Estado } from '../nucleo/estado';
import { segundosEmPassos } from '../nucleo/passos';
import { removerInimigo } from './inimigos';

/** Período da rotação: 1 s. */
export const PASSOS_DA_ROTACAO = segundosEmPassos(1);

export function aplicarRotacao(e: Estado): void {
  const n = e.cab[CAB.rotacao]!;
  if (n === 0 || e.cab[CAB.passo]! % PASSOS_DA_ROTACAO !== 0) return;
  let removidos = 0;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS && removidos < n; s++) {
    if (e.pool.posicao[s]! < 0) continue;
    removerInimigo(e, s);
    removidos++;
  }
  e.mundo[MUNDO.removidos] = e.mundo[MUNDO.removidos]! + removidos;
}
