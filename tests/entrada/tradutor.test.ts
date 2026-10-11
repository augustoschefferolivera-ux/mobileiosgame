// TradutorDeGestos e fila de toques (ADR-0002 §12; design/decisoes-F-002.md §4):
// dono do joystick, reposição a cada toque novo, toques fora da área, slots de
// 5 dedos, fila de 64 eventos, reconciliação pelo retrato de e.touches,
// "soltar todos", mouse de debug e prioridade do toque sobre o teclado.
import { beforeEach, describe, expect, it } from 'vitest';
import { CAPACIDADE_DA_FILA, FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { ID_DO_MOUSE, MAX_DEDOS, TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { criarComandos } from '../../src/logica/nucleo/comandos';
import { insetsZerados } from '../../src/plataforma/safeArea';

let fila: FilaDeToques;
let trad: TradutorDeGestos;
const cmd = criarComandos();
/** Dedos na tela, para o retrato de e.touches que um TouchEvent traria. */
let naTela: number[];

function toque(tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number): void {
  if (tipo === T.inicio) naTela.push(id);
  else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
  fila.empurrar(tipo, id, x, y, 0);
  fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
}
const frame = (): [number, number] => {
  trad.traduzir(fila, cmd);
  return [cmd.movimento[0]!, cmd.movimento[1]!];
};

beforeEach(() => {
  fila = new FilaDeToques();
  fila.reiniciar();
  trad = new TradutorDeGestos();
  trad.reiniciar();
  trad.definirArea(insetsZerados());
  naTela = [];
});

describe('joystick flutuante', () => {
  it('nasce onde o dedo toca na área e o arrasto vira o vetor', () => {
    toque(T.inicio, 7, 100, 600);
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 100, origemY: 600 });
    toque(T.move, 7, 160, 600);
    expect(frame()).toEqual([1, 0]);
    toque(T.move, 7, 100, 534.5);
    const [mx, my] = frame();
    expect(mx).toBe(0);
    expect(my).toBeCloseTo(-1, 6);
  });

  it('cada toque novo depois de soltar reposiciona a base (F-002.4); a última origem fica ao soltar', () => {
    toque(T.inicio, 1, 50, 500);
    frame();
    toque(T.fim, 1, 50, 500);
    frame();
    expect(trad.joystick).toMatchObject({ ativo: false, origemX: 50, origemY: 500, vx: 0, vy: 0 });
    toque(T.inicio, 2, 200, 780);
    frame();
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 200, origemY: 780 });
  });

  it('fora da área (acima da metade da tela ou nos 40% da direita) não cria o joystick', () => {
    for (const [x, y] of [[100, 421], [234, 600], [300, 700]] as const) {
      toque(T.inicio, 3, x, y);
      toque(T.move, 3, x + 60, y);
      expect(frame(), `${x}, ${y}`).toEqual([0, 0]);
      expect(trad.joystick.ativo).toBe(false);
      toque(T.fim, 3, x, y);
      frame();
    }
  });

  it('o 1º dedo é o dono até soltar; um 2º dedo na área não mexe no movimento nem teletransporta a base', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.inicio, 2, 150, 700);
    toque(T.move, 2, 50, 700);
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick).toMatchObject({ origemX: 100, origemY: 600 });
    toque(T.fim, 1, 100, 600);
    frame();
    expect(trad.joystick.ativo).toBe(false);
    // O 2º dedo não herda o joystick: só um toque novo o cria.
    toque(T.move, 2, 0, 700);
    expect(frame()).toEqual([0, 0]);
  });

  it('o dono continua dono ao sair da área', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 100, 300);
    frame();
    expect(trad.joystick.ativo).toBe(true);
    expect(cmd.movimento[1]).toBe(-1);
  });

  it('um toque que começou antes da Vigília nunca vira dono', () => {
    toque(T.inicio, 9, 100, 600);
    trad.reiniciar();
    fila.reiniciar();
    toque(T.move, 9, 160, 600);
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick.ativo).toBe(false);
  });

  it('o pino fica preso no raio', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 100 + 300, 600 + 400);
    frame();
    expect(trad.joystick.pinoX).toBeCloseTo(36, 9);
    expect(trad.joystick.pinoY).toBeCloseTo(48, 9);
  });
});

describe('capacidade, reconciliação e soltar todos', () => {
  it(`o ${MAX_DEDOS + 1}º dedo é descartado e contado`, () => {
    for (let i = 0; i <= MAX_DEDOS; i++) toque(T.inicio, i, 300, 100 + i);
    frame();
    expect(trad.dedosPerdidos).toBe(1);
  });

  it('um fim perdido na fila cheia é recuperado pelo retrato de e.touches', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 160, 600);
    expect(frame()).toEqual([1, 0]);
    for (let i = 0; i < CAPACIDADE_DA_FILA; i++) fila.empurrar(T.move, 1, 160, 600, i);
    toque(T.fim, 1, 160, 600); // descartado: a fila está cheia, mas o retrato já não tem o dedo 1
    expect(fila.perdidos).toBe(1);
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick.ativo).toBe(false);
  });

  it('soltar todos (touchcancel sem toques, blur, pagehide, visibilitychange) desliga o joystick', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 160, 600);
    frame();
    fila.pedirSoltarTodos();
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick.ativo).toBe(false);
    // Um toque novo depois do pedido cria o joystick de novo.
    toque(T.inicio, 2, 120, 650);
    frame();
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 120 });
  });

  it('o mouse de debug não é solto pelo retrato de toques', () => {
    fila.empurrar(T.inicio, ID_DO_MOUSE, 100, 600, 0);
    fila.empurrar(T.move, ID_DO_MOUSE, 160, 600, 0);
    fila.gravarRetrato([]);
    expect(frame()).toEqual([1, 0]);
    expect(frame()).toEqual([1, 0]);
  });

  it('o retrato ajustado pelo injetar faz o papel de e.touches', () => {
    fila.empurrar(T.inicio, 4, 100, 600, 0);
    fila.ajustarRetrato(T.inicio, 4);
    fila.empurrar(T.move, 4, 160, 600, 16);
    expect(frame()).toEqual([1, 0]);
    expect(frame()).toEqual([1, 0]);
    fila.ajustarRetrato(T.fim, 4);
    expect(frame()).toEqual([0, 0]);
  });
});

describe('teclado de debug', () => {
  it('vale quando nenhum toque move o jogador; o toque tem prioridade', () => {
    trad.teclado.x = -1;
    expect(frame()).toEqual([-1, 0]);
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 100, 660);
    expect(frame()).toEqual([0, 1]);
    toque(T.fim, 1, 100, 660);
    expect(frame()).toEqual([-1, 0]);
  });
});
