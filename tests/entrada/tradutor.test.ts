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
  it('5 slots de dedo (design/decisoes-F-002.md §4, T1)', () => {
    expect(MAX_DEDOS).toBe(5);
  });

  it('se o dono solta no mesmo frame em que outro dedo começa, depois dele, o outro não herda o joystick (J2)', () => {
    toque(T.inicio, 1, 100, 600);
    frame();
    toque(T.inicio, 2, 150, 700);
    toque(T.fim, 1, 100, 600); // o retrato do frame já não tem o dedo 1
    toque(T.move, 2, 150, 640);
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick).toMatchObject({ ativo: false, origemX: 100, origemY: 600 });
  });

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

  it('o toque que segue um fim que não chegou vira dono: a reconciliação roda também no touchstart', () => {
    toque(T.inicio, 1, 100, 600);
    toque(T.move, 1, 160, 600);
    expect(frame()).toEqual([1, 0]);
    naTela = []; // o touchend do dedo 1 nunca chegou ao canvas
    toque(T.inicio, 2, 120, 700);
    toque(T.move, 2, 120, 640);
    const [mx, my] = frame();
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 120, origemY: 700 });
    expect(mx).toBe(0);
    expect(my).toBeCloseTo(-1, 6);
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

  it('soltar todos solta também o mouse de debug, que a reconciliação nunca solta', () => {
    fila.empurrar(T.inicio, ID_DO_MOUSE, 100, 600, 0);
    fila.empurrar(T.move, ID_DO_MOUSE, 160, 600, 0);
    expect(frame()).toEqual([1, 0]);
    fila.pedirSoltarTodos();
    expect(frame()).toEqual([0, 0]);
    expect(trad.joystick.ativo).toBe(false);
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

describe('pausa: botão, gesto e modo da tela de pausa (design/decisoes-F-004.md P1, P3, P7, P8)', () => {
  /** Toque com timeStamp (ms). */
  function em(t: number, tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number): void {
    if (tipo === T.inicio) naTela.push(id);
    else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
    fila.empurrar(tipo, id, x, y, t);
    fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
  }
  const quadro = (agora: number): void => trad.traduzir(fila, cmd, agora);

  it('tap no botão (canto superior esquerdo) pede a pausa ao soltar; touchstart nele e touchend fora não pede', () => {
    em(1000, T.inicio, 1, 36, 36);
    quadro(1000);
    expect(trad.pedidoDePausa).toBeNull();
    em(1080, T.fim, 1, 40, 30);
    quadro(1080);
    expect(trad.pedidoDePausa).toBe('botao');
    em(2000, T.inicio, 2, 36, 36);
    em(2100, T.fim, 2, 200, 300);
    quadro(2100);
    expect(trad.pedidoDePausa).toBeNull();
    // O dedo do botão não cria joystick.
    expect(trad.joystickCriados).toBe(0);
  });

  it('dois dedos parados na metade de cima: 499 ms não dispara, 500 dispara, uma vez só enquanto ficam', () => {
    em(1000, T.inicio, 1, 150, 200);
    em(1000, T.inicio, 2, 250, 220);
    quadro(1499);
    expect(trad.pedidoDePausa).toBeNull();
    quadro(1500);
    expect(trad.pedidoDePausa).toBe('gesto');
    quadro(1600);
    expect(trad.pedidoDePausa).toBeNull();
    // Rearma quando um deles solta.
    em(1700, T.fim, 2, 250, 220);
    quadro(1700);
    em(1800, T.inicio, 3, 300, 100);
    quadro(2299);
    expect(trad.pedidoDePausa).toBeNull();
    quadro(2300);
    expect(trad.pedidoDePausa).toBe('gesto');
  });

  it('o gesto completo entre dois quadros (8 fps) conta no fim do dedo, pelo timeStamp do evento', () => {
    em(1000, T.inicio, 1, 150, 200);
    em(1000, T.inicio, 2, 250, 220);
    quadro(1450);
    em(1560, T.fim, 1, 150, 200);
    em(1560, T.fim, 2, 250, 220);
    quadro(1575);
    expect(trad.pedidoDePausa).toBe('gesto');
  });

  it('"parado" = até 10 pt do toque: 10 pt dispara, 10,1 não; 3 dedos com 2 parados dispara', () => {
    em(0, T.inicio, 1, 150, 200);
    em(0, T.inicio, 2, 250, 220);
    em(100, T.move, 1, 160, 200);
    em(100, T.move, 2, 250, 230.1);
    quadro(600);
    expect(trad.pedidoDePausa).toBeNull();
    trad.reiniciar();
    naTela = [];
    em(0, T.inicio, 4, 150, 200);
    em(0, T.inicio, 5, 250, 220);
    em(0, T.inicio, 6, 300, 100);
    em(100, T.move, 6, 340, 100);
    quadro(600);
    expect(trad.pedidoDePausa).toBe('gesto');
  });

  it('o dono do joystick e o dedo do botão não contam (Q-25): dono + 1 dedo não dispara; botão + 1 não', () => {
    em(0, T.inicio, 1, 100, 600);
    em(0, T.inicio, 2, 250, 220);
    quadro(800);
    expect(trad.joystick.ativo).toBe(true);
    expect(trad.pedidoDePausa).toBeNull();
    trad.reiniciar();
    naTela = [];
    em(0, T.inicio, 3, 36, 36);
    em(0, T.inicio, 4, 250, 220);
    quadro(800);
    expect(trad.pedidoDePausa).toBeNull();
  });

  it('um timeStamp a mais de 60 s do agora (outro relógio) vira o agora do quadro', () => {
    em(1e12, T.inicio, 1, 150, 200);
    em(1e12, T.inicio, 2, 250, 220);
    quadro(1000);
    quadro(1499);
    expect(trad.pedidoDePausa).toBeNull();
    quadro(1500);
    expect(trad.pedidoDePausa).toBe('gesto');
  });

  it('no modo pausa: sem joystick nem gesto; o alvo aciona só se o toque começou e soltou nele, e não com um toque de antes', () => {
    trad.definirArea({ topo: 59, direita: 0, baixo: 34, esquerda: 0 });
    em(0, T.inicio, 1, 100, 600);
    quadro(0);
    expect(trad.joystick.ativo).toBe(true);
    fila.pedirSoltarTodos();
    trad.mudarModo('pausa');
    // O dedo de antes solta sobre o Continuar: nada.
    em(100, T.fim, 1, 195, 750);
    quadro(100);
    expect([trad.toqueNaPausa, trad.joystick.ativo]).toEqual([null, false]);
    // Um toque novo no Continuar, que sai fora: nada; outro que começa e solta nele: continuar.
    em(200, T.inicio, 2, 195, 750);
    em(250, T.fim, 2, 195, 400);
    quadro(250);
    expect(trad.toqueNaPausa).toBeNull();
    em(300, T.inicio, 3, 195, 750);
    em(350, T.fim, 3, 196, 751);
    quadro(350);
    expect(trad.toqueNaPausa).toBe('continuar');
    em(400, T.inicio, 4, 195, 660);
    em(450, T.fim, 4, 195, 660);
    quadro(450);
    expect(trad.toqueNaPausa).toBe('numeros');
    // Nada move na pausa, nem com dois dedos parados.
    em(500, T.inicio, 5, 150, 200);
    em(500, T.inicio, 6, 250, 220);
    quadro(1500);
    expect([trad.pedidoDePausa, cmd.movimento[0], cmd.movimento[1]]).toEqual([null, 0, 0]);
    // Depois do Continuar, só um toque novo cria o joystick.
    trad.mudarModo('vigilia');
    quadro(1600);
    expect(trad.joystick.ativo).toBe(false);
    em(1700, T.inicio, 7, 100, 600);
    quadro(1700);
    expect(trad.joystick.ativo).toBe(true);
  });
});
