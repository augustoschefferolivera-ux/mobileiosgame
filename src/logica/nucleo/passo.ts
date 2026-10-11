// Um passo da simulação (1/60 s). Só lê o estado, os dados fixos da Vigília e
// os ComandosDoPasso; nunca lê relógio, DOM nem Math.random (ADR-0002 §2).
import type { DadosDaVigilia } from '../mundo/dados';
import { atualizarPromptDeMover, moverJogador } from '../mundo/jogador';
import { criarComandos, type ComandosDoPasso, type FonteDeComandos } from './comandos';
import { CAB, type Estado } from './estado';

export function passo(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  e.cab[CAB.relogio] = e.cab[CAB.relogio]! + 1;
  const moveu = moverJogador(e, dados, cmd);
  atualizarPromptDeMover(e, moveu);
}

const comandos = criarComandos();

/**
 * Roda `n` passos seguidos, cada um com os comandos que a fonte dá para o seu
 * passo absoluto (driver, testes e `__GAME_DEBUG__.avancar`).
 */
export function avancar(e: Estado, dados: DadosDaVigilia, fonte: FonteDeComandos, n: number): void {
  for (let i = 0; i < n; i++) {
    fonte.comandosDoPasso(e.cab[CAB.passo]!, comandos);
    passo(e, dados, comandos);
  }
}
