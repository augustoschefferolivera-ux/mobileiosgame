// Um passo da simulação (1/60 s). Só lê o estado e, a partir da F-002, os
// ComandosDoPasso; nunca lê relógio, DOM nem Math.random (ADR-0002 §2).
import { CAB, type Estado } from './estado';

export function passo(e: Estado): void {
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  e.cab[CAB.relogio] = e.cab[CAB.relogio]! + 1;
}

/** Roda `n` passos seguidos (testes, `__GAME_DEBUG__.avancar`). */
export function avancar(e: Estado, n: number): void {
  for (let i = 0; i < n; i++) passo(e);
}
