// Teclado só no build de debug (ADR-0002 §12; ADR-0003 §4; design/decisoes-F-002.md
// §4): WASD e setas dão um vetor de 8 direções com |v| = 1 (a diagonal usa
// 1/√2 literal), que o tradutor usa quando nenhum toque move o jogador.
import type { Vetor } from './joystick';

const R2 = 0.7071067811865476;

/** Vetor de 8 direções das teclas apertadas; teclas opostas se anulam. */
export function vetorDoTeclado(cima: boolean, baixo: boolean, esquerda: boolean, direita: boolean, out: Vetor): Vetor {
  const x = (direita ? 1 : 0) - (esquerda ? 1 : 0);
  const y = (baixo ? 1 : 0) - (cima ? 1 : 0);
  const k = x !== 0 && y !== 0 ? R2 : 1;
  out.x = x * k;
  out.y = y * k;
  return out;
}

const TECLAS: Record<string, 'cima' | 'baixo' | 'esquerda' | 'direita'> = {
  KeyW: 'cima',
  ArrowUp: 'cima',
  KeyS: 'baixo',
  ArrowDown: 'baixo',
  KeyA: 'esquerda',
  ArrowLeft: 'esquerda',
  KeyD: 'direita',
  ArrowRight: 'direita',
};

/** Acompanha as teclas de movimento na janela e escreve o vetor em `out`. */
export function ligarTecladoDeDebug(janela: Window, out: Vetor): void {
  const apertadas = { cima: false, baixo: false, esquerda: false, direita: false };
  const atualizar = (): void => {
    vetorDoTeclado(apertadas.cima, apertadas.baixo, apertadas.esquerda, apertadas.direita, out);
  };
  const mudar = (valor: boolean) => (e: KeyboardEvent): void => {
    const tecla = TECLAS[e.code];
    if (!tecla) return;
    apertadas[tecla] = valor;
    atualizar();
  };
  janela.addEventListener('keydown', mudar(true));
  janela.addEventListener('keyup', mudar(false));
  janela.addEventListener('blur', () => {
    apertadas.cima = apertadas.baixo = apertadas.esquerda = apertadas.direita = false;
    atualizar();
  });
}
