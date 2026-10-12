// TradutorDeGestos e fila de toques (ADR-0002 §12; design/decisoes-F-002.md §4):
// dono do joystick, reposição a cada toque novo, toques fora da área, slots de
// 5 dedos, fila de 64 eventos, reconciliação pelo retrato de e.touches,
// "soltar todos", mouse de debug e prioridade do toque sobre o teclado.
import { beforeEach, describe, expect, it } from 'vitest';
import { CAPACIDADE_DA_FILA, FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { ID_DO_MOUSE, MAX_DEDOS, TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import combate from '../../src/dados/combate.json';
import { ACAO, criarComandos } from '../../src/logica/nucleo/comandos';
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
  cmd.acoes[0] = 0;
  cmd.mira[0] = cmd.mira[1] = 0;
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
    fila.empurrar(T.move, 4, 160, 600, 200);
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
    // Som e Flashes (FB3, RE11): lado a lado acima de "números", y 546 a 618 com estes insets.
    em(460, T.inicio, 7, 119, 582);
    em(470, T.fim, 7, 119, 582);
    quadro(470);
    expect(trad.toqueNaPausa).toBe('som');
    em(480, T.inicio, 8, 271, 582);
    em(490, T.fim, 8, 271, 582);
    quadro(490);
    expect(trad.toqueNaPausa).toBe('flashes');
    // O vão de 16 pt entre os dois não é alvo.
    em(495, T.inicio, 9, 195, 582);
    em(498, T.fim, 9, 195, 582);
    quadro(498);
    expect(trad.toqueNaPausa).toBeNull();
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

/** Evento com timeStamp (ms inteiros) e o retrato de e.touches. */
function em(t: number, tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number): void {
  if (tipo === T.inicio) naTela.push(id);
  else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
  fila.empurrar(tipo, id, x, y, t);
  fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
}
const acoes = (): number => cmd.acoes[0]!;
/** Consome a borda como a fonte ao vivo faz. */
const consumir = (): void => {
  cmd.acoes[0] = 0;
  cmd.mira[0] = cmd.mira[1] = 0;
};

describe('swipe do dedo do joystick (GE1; F-006.5, parte do tradutor)', () => {
  it('os números vêm do combate.json', () => {
    expect(combate.gestos.swipe).toEqual({ velocidade_min_pt_s: 400, janela_ms: 100, dt_min_ms: 16, distancia_min_pt: 24, amostras: 16 });
  });

  const swipe = (dx: number, dy: number, dt: number): boolean => {
    em(1000, T.inicio, 1, 100, 600);
    em(1000 + dt, T.move, 1, 100 + dx, 600 + dy);
    frame();
    return acoes() === ACAO.esquiva;
  };

  it('50 pt em 80 ms (625 pt/s) disparam, com a mira normalizada; o joystick não muda', () => {
    expect(swipe(50, 0, 80)).toBe(true);
    expect([cmd.mira[0], cmd.mira[1]]).toEqual([1, 0]);
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 100, origemY: 600 });
  });

  it('a mira tem módulo 1 ± 1e-7 em qualquer direção', () => {
    expect(swipe(30, 40, 80)).toBe(true);
    expect(Math.abs(Math.hypot(cmd.mira[0]!, cmd.mira[1]!) - 1)).toBeLessThan(1e-7);
    expect(cmd.mira[0]).toBeCloseTo(0.6, 6);
    expect(cmd.mira[1]).toBeCloseTo(0.8, 6);
  });

  it('50 pt em 125 ms (400 pt/s) não disparam: a velocidade é estritamente maior', () => {
    expect(swipe(50, 0, 125)).toBe(false);
  });

  it('50 pt em 130 ms (385 pt/s) não disparam; 50 pt em 100 ms (a borda da janela, 500 pt/s) disparam', () => {
    expect(swipe(50, 0, 130)).toBe(false);
    trad.reiniciar();
    fila.reiniciar();
    naTela = [];
    expect(swipe(50, 0, 100)).toBe(true);
  });

  it('23 pt em 40 ms não disparam (distância); 24 pt em 40 ms disparam', () => {
    expect(swipe(23, 0, 40)).toBe(false);
    trad.reiniciar();
    fila.reiniciar();
    naTela = [];
    expect(swipe(24, 0, 40)).toBe(true);
  });

  it('70 pt no mesmo timeStamp e 60 pt em 15 ms não disparam (Δt mínimo); 60 pt em 16 ms disparam', () => {
    expect(swipe(70, 0, 0)).toBe(false);
    trad.reiniciar();
    fila.reiniciar();
    naTela = [];
    expect(swipe(60, 0, 15)).toBe(false);
    trad.reiniciar();
    fila.reiniciar();
    naTela = [];
    expect(swipe(60, 0, 16)).toBe(true);
  });

  it('o limite é estrito com ms inteiros: 32 pt em 80 ms, 30 pt em 75 ms e 40 pt em 100 ms (400 pt/s exatos) não disparam; 33 em 80 e 41 em 100 disparam', () => {
    const novo = (): void => {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
    };
    expect(swipe(32, 0, 80)).toBe(false);
    novo();
    expect(swipe(30, 0, 75)).toBe(false);
    novo();
    expect(swipe(40, 0, 100)).toBe(false);
    novo();
    expect(swipe(33, 0, 80)).toBe(true);
    novo();
    expect(swipe(41, 0, 100)).toBe(true);
  });

  it('a janela de 100 ms: a amostra a 99 e a 100 ms entram; a 101 ms já saiu e 50 pt (495 pt/s) não disparam', () => {
    const novo = (): void => {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
    };
    expect(swipe(50, 0, 99)).toBe(true);
    novo();
    expect(swipe(50, 0, 100)).toBe(true);
    novo();
    expect(swipe(50, 0, 101)).toBe(false);
  });

  it('rearma quando a velocidade cai a 400 pt/s ou menos, com amostras ainda na janela: o arranque seguinte dispara', () => {
    for (const lento of [20, 32]) {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
      em(1000, T.inicio, 1, 100, 600);
      em(1080, T.move, 1, 150, 600);
      frame();
      expect(acoes()).toBe(ACAO.esquiva);
      consumir();
      // 20 pt (250 pt/s) ou 32 pt (400 pt/s exatos) em 80 ms: o dedo segue lento, a amostra de 1080 ainda na janela.
      em(1160, T.move, 1, 150 + lento, 600);
      frame();
      expect(acoes(), `lento ${lento}`).toBe(0);
      em(1200, T.move, 1, 150 + lento + 60, 600);
      frame();
      expect(acoes(), `lento ${lento}`).toBe(ACAO.esquiva);
    }
  });

  it('só o dono do joystick: um 2º dedo rápido não dispara', () => {
    em(1000, T.inicio, 1, 100, 600);
    em(1000, T.inicio, 2, 100, 650);
    em(1080, T.move, 2, 160, 650);
    frame();
    expect(acoes()).toBe(0);
  });

  it('na pausa e no modal não dispara', () => {
    for (const modo of ['pausa', 'modal'] as const) {
      trad.mudarModo(modo);
      em(1000, T.inicio, 1, 100, 600);
      em(1080, T.move, 1, 160, 600);
      frame();
      expect(acoes(), modo).toBe(0);
      trad.mudarModo('vigilia');
      fila.reiniciar();
      naTela = [];
    }
  });

  it('o dono que já existe quando o modo muda (sem passar por mudarModo) não gera esquiva na pausa nem no modal', () => {
    for (const modo of ['pausa', 'modal'] as const) {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
      em(1000, T.inicio, 1, 100, 600);
      frame();
      expect(trad.joystick.ativo).toBe(true);
      trad.modo = modo;
      em(1080, T.move, 1, 160, 600);
      frame();
      expect(acoes(), modo).toBe(0);
      expect([cmd.mira[0], cmd.mira[1]], modo).toEqual([0, 0]);
    }
  });

  it('um 2º swipe no mesmo gesto, sem a velocidade cair, não dispara; depois de uma pausa lenta, rearma', () => {
    em(1000, T.inicio, 1, 100, 600);
    em(1080, T.move, 1, 150, 600);
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
    consumir();
    em(1100, T.move, 1, 200, 600);
    em(1120, T.move, 1, 250, 600);
    frame();
    expect(acoes()).toBe(0);
    // Lento: a velocidade cai a ≤ 400 pt/s e rearma; o novo arranque dispara de novo.
    em(1400, T.move, 1, 255, 600);
    em(1500, T.move, 1, 305, 600);
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
  });

  it('um arrasto lento de 70 pt em 400 ms não gera ações', () => {
    em(1000, T.inicio, 1, 100, 600);
    for (let k = 1; k <= 4; k++) em(1000 + k * 100, T.move, 1, 100 + k * 17.5, 600);
    frame();
    expect(acoes()).toBe(0);
    expect(trad.joystick.vx).toBe(1);
  });

  it('as ações não se apagam sozinhas: o tradutor só liga o bit', () => {
    expect(swipe(50, 0, 80)).toBe(true);
    em(1200, T.move, 1, 150, 600);
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
  });

  it('mudarModo zera a esquiva pendente', () => {
    expect(swipe(50, 0, 80)).toBe(true);
    trad.mudarModo('pausa');
    expect(acoes()).toBe(0);
    expect([cmd.mira[0], cmd.mira[1]]).toEqual([0, 0]);
  });
});

describe('toque duplo (GE2; F-006.5, parte do tradutor)', () => {
  const toqueDe = (t0: number, x: number, y: number, duracao = 100): void => {
    em(t0, T.inicio, 1, x, y);
    frame();
    em(t0 + duracao, T.fim, 1, x, y);
    frame();
  };

  it('os números vêm do combate.json', () => {
    expect(combate.gestos.toque_duplo).toEqual({ intervalo_max_ms: 250, duracao_max_ms: 200, distancia_entre_toques_max_pt: 40, deslocamento_max_pt: 10 });
  });

  it('2 toques de 100 ms com 249 ms e 39 pt disparam no touchstart do 2º, com mira (0, 0); o 2º dedo vira dono', () => {
    toqueDe(1000, 100, 600);
    expect(acoes()).toBe(0);
    em(1100 + 249, T.inicio, 2, 139, 600);
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
    expect([cmd.mira[0], cmd.mira[1]]).toEqual([0, 0]);
    expect(trad.joystick).toMatchObject({ ativo: true, origemX: 139, origemY: 600 });
  });

  it('250 ms e 40 pt disparam; 251 ms ou 41 pt não', () => {
    const par = (intervalo: number, dist: number): boolean => {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
      toqueDe(1000, 100, 600);
      em(1100 + intervalo, T.inicio, 2, 100 + dist, 600);
      frame();
      return acoes() === ACAO.esquiva;
    };
    expect(par(250, 40)).toBe(true);
    expect(par(251, 40)).toBe(false);
    expect(par(250, 41)).toBe(false);
  });

  it('um toque de 201 ms ou que se mexeu 10,1 pt não conta; 200 ms e 10 pt contam', () => {
    const par = (duracao: number, deslocamento: number): boolean => {
      trad.reiniciar();
      fila.reiniciar();
      naTela = [];
      consumir();
      em(1000, T.inicio, 1, 100, 600);
      frame();
      if (deslocamento > 0) {
        em(1050, T.move, 1, 100 + deslocamento, 600);
        frame();
      }
      em(1000 + duracao, T.fim, 1, 100 + deslocamento, 600);
      frame();
      em(1000 + duracao + 100, T.inicio, 2, 100, 600);
      frame();
      return acoes() === ACAO.esquiva;
    };
    expect(par(200, 0)).toBe(true);
    expect(par(201, 0)).toBe(false);
    expect(par(100, 10)).toBe(true);
    expect(par(100, 10.1)).toBe(false);
  });

  it('fora da área e no modo pausa não conta', () => {
    toqueDe(1000, 100, 100);
    em(1200, T.inicio, 2, 100, 100);
    frame();
    expect(acoes()).toBe(0);
    trad.reiniciar();
    fila.reiniciar();
    naTela = [];
    trad.mudarModo('pausa');
    toqueDe(2000, 100, 600);
    em(2200, T.inicio, 2, 100, 600);
    frame();
    expect(acoes()).toBe(0);
  });

  it('com o dono do joystick ocupado, o 2º dedo é "outro" e não conta', () => {
    em(1000, T.inicio, 1, 100, 600);
    frame();
    toqueDe(1050, 100, 640, 50);
    em(1250, T.inicio, 3, 100, 640);
    frame();
    expect(acoes()).toBe(0);
  });

  it('o par é consumido: um 3º toque não encadeia com o 2º', () => {
    toqueDe(1000, 100, 600);
    em(1300, T.inicio, 2, 100, 600);
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
    consumir();
    em(1400, T.fim, 2, 100, 600);
    frame();
    em(1500, T.inicio, 3, 100, 600);
    frame();
    expect(acoes()).toBe(0);
  });

  it('1º toque, mudarModo(pausa), mudarModo(vigilia) e 2º toque a 100 ms e 20 pt: nada', () => {
    toqueDe(1000, 100, 600);
    trad.mudarModo('pausa');
    trad.mudarModo('vigilia');
    em(1200, T.inicio, 2, 120, 600);
    frame();
    expect(acoes()).toBe(0);
  });

  it('o toque duplo não atrapalha o movimento do 2º dedo', () => {
    toqueDe(1000, 100, 600);
    em(1300, T.inicio, 2, 100, 600);
    em(1400, T.move, 2, 160, 600);
    expect(frame()).toEqual([1, 0]);
  });
});

describe('Espaço do teclado de debug (GE3)', () => {
  it('pede esquiva na direção do teclado, ou na última (mira nula)', () => {
    trad.teclado.x = -1;
    trad.pedirEsquivaDoTeclado();
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
    expect([cmd.mira[0], cmd.mira[1]]).toEqual([-1, 0]);
    consumir();
    trad.teclado.x = 0;
    trad.pedirEsquivaDoTeclado();
    frame();
    expect(acoes()).toBe(ACAO.esquiva);
    expect([cmd.mira[0], cmd.mira[1]]).toEqual([0, 0]);
    consumir();
    frame();
    expect(acoes()).toBe(0);
  });

  it('não vale na pausa nem se pedido antes de mudar de modo', () => {
    trad.pedirEsquivaDoTeclado();
    trad.mudarModo('pausa');
    frame();
    expect(acoes()).toBe(0);
  });
});

describe('botão Aparo (AP1; F-006.2, parte do tradutor)', () => {
  const NO_BOTAO: [number, number] = [326, 780];

  it('o toque que começa no botão liga o bit do aparo no touchstart, não cria joystick e não move', () => {
    toque(T.inicio, 4, ...NO_BOTAO);
    expect(frame()).toEqual([0, 0]);
    expect(acoes()).toBe(ACAO.aparo);
    expect(trad.joystick.ativo).toBe(false);
    expect(trad.joystickCriados).toBe(0);
    expect(trad.pedidoDePausa).toBeNull();
  });

  it('cada toque que começa no botão conta um aperto (o Hud o lê para o preenchimento de 4 quadros); a pausa e o joystick não contam', () => {
    expect(trad.aparoApertos).toBe(0);
    toque(T.inicio, 4, ...NO_BOTAO);
    frame();
    toque(T.move, 4, ...NO_BOTAO);
    toque(T.fim, 4, ...NO_BOTAO);
    frame();
    expect(trad.aparoApertos).toBe(1);
    toque(T.inicio, 5, ...NO_BOTAO);
    frame();
    expect(trad.aparoApertos).toBe(2);
    toque(T.inicio, 6, 100, 600);
    frame();
    expect(trad.aparoApertos).toBe(2);
  });

  it('segurar não repete e soltar não dispara; cada toque novo é um comando', () => {
    toque(T.inicio, 4, ...NO_BOTAO);
    frame();
    consumir();
    toque(T.move, 4, ...NO_BOTAO);
    frame();
    expect(acoes()).toBe(0);
    toque(T.fim, 4, ...NO_BOTAO);
    frame();
    expect(acoes()).toBe(0);
    toque(T.inicio, 5, ...NO_BOTAO);
    frame();
    expect(acoes()).toBe(ACAO.aparo);
  });

  it('o dedo do joystick que passa por cima do botão não o aciona', () => {
    toque(T.inicio, 1, 100, 780);
    toque(T.move, 1, 326, 780);
    frame();
    expect(acoes() & ACAO.aparo).toBe(0);
    toque(T.fim, 1, 326, 780);
    frame();
    expect(acoes() & ACAO.aparo).toBe(0);
  });

  it('o dedo do botão não conta para o gesto de pausa de dois dedos', () => {
    em(1000, T.inicio, 8, ...NO_BOTAO);
    em(1000, T.inicio, 9, 300, 300);
    trad.traduzir(fila, cmd, 1700);
    expect(trad.pedidoDePausa).toBeNull();
  });

  it('na pausa e no modal o botão não existe, e a borda pendente é descartada ao mudar de modo', () => {
    toque(T.inicio, 4, ...NO_BOTAO);
    frame();
    expect(acoes()).toBe(ACAO.aparo);
    trad.mudarModo('pausa');
    expect(acoes()).toBe(0);
    toque(T.fim, 4, ...NO_BOTAO);
    toque(T.inicio, 5, ...NO_BOTAO);
    frame();
    expect(acoes()).toBe(0);
  });

  it('com a barra do iPhone (baixo 34) o botão sobe: y 706 a 786', () => {
    trad.definirArea({ topo: 59, direita: 0, baixo: 34, esquerda: 0 });
    toque(T.inicio, 4, 326, 790);
    frame();
    expect(acoes()).toBe(0);
    toque(T.inicio, 5, 326, 710);
    frame();
    expect(acoes()).toBe(ACAO.aparo);
  });
});

describe('suavização da direção do joystick', () => {
  const graus = (x: number, y: number): number => (Math.atan2(y, x) * 180) / Math.PI;
  const quadro = (agora: number): [number, number] => {
    trad.traduzir(fila, cmd, agora);
    return [cmd.movimento[0]!, cmd.movimento[1]!];
  };
  /** Dedo na base (100, 600) e puxado 60 pt para a direita, em régime. */
  const andandoParaDireita = (): void => {
    toque(T.inicio, 7, 100, 600);
    quadro(1000);
    toque(T.move, 7, 160, 600);
    quadro(1016);
  };
  /** Dedo a 60 pt da base, no ângulo `a` (graus). */
  const puxar = (a: number): void => {
    const r = (a * Math.PI) / 180;
    toque(T.move, 7, 100 + 60 * Math.cos(r), 600 + 60 * Math.sin(r));
  };

  it('partindo do repouso, a direção vale de imediato', () => {
    toque(T.inicio, 7, 100, 600);
    quadro(1000);
    puxar(90);
    const [mx, my] = quadro(1016);
    expect(mx).toBeCloseTo(0, 6);
    expect(my).toBeCloseTo(1, 6);
  });

  it('entrar na zona morta e sair de novo conta como repouso', () => {
    andandoParaDireita();
    toque(T.move, 7, 102, 600);
    expect(quadro(1032)).toEqual([0, 0]);
    puxar(90);
    expect(graus(...quadro(1048))).toBeCloseTo(90, 4);
  });

  it('limita o giro a 540 graus por segundo do quadro e mantém o módulo', () => {
    andandoParaDireita();
    puxar(90);
    const [mx, my] = quadro(1032);
    expect(graus(mx, my)).toBeCloseTo(8.64, 3);
    expect(Math.hypot(mx, my)).toBeCloseTo(1, 6);
    expect(graus(...quadro(1048))).toBeCloseTo(17.28, 3);
  });

  it('o módulo parcial do vetor continua o da curva do joystick', () => {
    andandoParaDireita();
    toque(T.move, 7, 100, 600 + 33);
    const [mx, my] = quadro(1032);
    expect(Math.hypot(mx, my)).toBeCloseTo((33 / 60 - 0.15) / 0.85, 6);
    expect(graus(mx, my)).toBeCloseTo(8.64, 3);
  });

  it('chega ao alvo e para nele, nos dois sentidos', () => {
    andandoParaDireita();
    puxar(-60);
    let a = 0;
    for (let k = 2; k < 40; k++) a = graus(...quadro(1000 + 16 * k));
    expect(a).toBeCloseTo(-60, 4);
  });

  it('um quadro de 0 ms não gira', () => {
    andandoParaDireita();
    puxar(90);
    const [mx, my] = quadro(1016);
    expect(mx).toBeCloseTo(1, 6);
    expect(my).toBeCloseTo(0, 6);
  });

  it('a reversão acima de 150 graus vale de imediato; 150 ou menos é limitada', () => {
    andandoParaDireita();
    puxar(170);
    expect(graus(...quadro(1032))).toBeCloseTo(170, 4);
    puxar(-10);
    expect(graus(...quadro(1048))).toBeCloseTo(-10, 4);
    puxar(135);
    expect(graus(...quadro(1064))).toBeCloseTo(-10 + 8.64, 3);
  });

  it('um quadro muito longo (voltando de uma pausa) chega ao alvo; sem relógio (NaN) também', () => {
    andandoParaDireita();
    puxar(90);
    expect(graus(...quadro(6000))).toBeCloseTo(90, 4);
    puxar(0);
    trad.traduzir(fila, cmd);
    expect(graus(cmd.movimento[0]!, cmd.movimento[1]!)).toBeCloseTo(0, 4);
  });

  it('soltar e tocar de novo recomeça do repouso; o teclado não é suavizado', () => {
    andandoParaDireita();
    toque(T.fim, 7, 160, 600);
    quadro(1032);
    toque(T.inicio, 8, 100, 600);
    quadro(1048);
    puxar(90);
    toque(T.move, 8, 100, 660);
    expect(graus(...quadro(1064))).toBeCloseTo(90, 4);
    toque(T.fim, 8, 100, 660);
    trad.teclado.x = 1;
    trad.teclado.y = 0;
    quadro(1080);
    trad.teclado.x = 0;
    trad.teclado.y = 1;
    expect(quadro(1096)).toEqual([0, 1]);
  });

  it('só mexe nos ComandosDoPasso do movimento: ações e mira ficam como estavam', () => {
    andandoParaDireita();
    puxar(90);
    quadro(1032);
    expect(cmd.acoes[0]).toBe(0);
    expect(cmd.mira[0]).toBe(0);
    expect(cmd.mira[1]).toBe(0);
  });
});
