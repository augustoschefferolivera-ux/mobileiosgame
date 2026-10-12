// Escolha no modal sem Phaser (design/decisoes-F-005.md §3, M4 e M5): seleção,
// troca, confirmação, descarte dos toques que sobram, abertura (dedos soltos,
// modo modal) e fechamento da fila (volta à Vigília, só toque novo cria o
// joystick). O tradutor é alimentado com toques sintéticos, como em tests/entrada.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirModal, tratarToquesDoModal } from '../../src/cenas/escolhaDoModal';
import { alvoDaPausa, alvosDasCartas, alvosDoBau, type Alvo } from '../../src/entrada/alvos';
import { FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { MAX_TOQUES_NO_MODAL, TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { criarComandos } from '../../src/logica/nucleo/comandos';
import { PROGRESSAO, type Estado } from '../../src/logica/nucleo/estado';
import { confirmarModal } from '../../src/logica/progressao/modal';
import { gerarOfertaSeFor } from '../../src/logica/progressao/oferta';
import { insetsZerados } from '../../src/plataforma/safeArea';
import { D, ESPADA, estadoDe } from '../logica/progressao/apoio';

vi.mock('../../src/logica/progressao/modal', async (original) => {
  const m = await original<typeof import('../../src/logica/progressao/modal')>();
  return { ...m, confirmarModal: vi.fn(m.confirmarModal) };
});

const INSETS = insetsZerados();
const CARTAS = alvosDasCartas(INSETS, []);
const [CONTINUAR] = alvosDoBau(INSETS, []) as [Alvo];
const BOTAO = alvoDaPausa(INSETS, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
const centro = (a: Alvo) => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });
/** Dentro da área do joystick (x < 234, y ≥ 422) e sobre a carta 2. */
const NA_AREA = centro(CARTAS[2]!);

let fila: FilaDeToques;
let trad: TradutorDeGestos;
let sim: { estado: Estado; dados: typeof D; modal: { selecionada: number | null } };
let naTela: number[];
let proximoId: number;
const cmd = criarComandos();
const aoFechar = vi.fn();
const aoEscolher = vi.fn();

function toque(tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number): void {
  if (tipo === T.inicio) naTela.push(id);
  else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
  fila.empurrar(tipo, id, x, y, 0);
  fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
}
/** Um toque que começa e solta no centro do alvo, com um id novo. */
function tocar(a: Alvo): void {
  const id = proximoId++;
  const { x, y } = centro(a);
  toque(T.inicio, id, x, y);
  toque(T.fim, id, x, y);
}
/** O que a Vigília faz num quadro: traduz e, no modo modal, trata os toques. */
function quadro(agora = Number.NaN): void {
  trad.traduzir(fila, cmd, agora);
  if (trad.modo === 'modal') tratarToquesDoModal(sim, { tradutor: trad, fila }, { aoEscolherCarta: aoEscolher, aoFecharAFila: aoFechar });
}
/** Estado com `n` níveis pendentes (oferta gerada) ou, com `bau`, um baú por fechar. */
function montar(n: number, bau = false): void {
  const e = estadoDe([[ESPADA, 1]]);
  e.progresso[PROGRESSAO.nivel] = 1 + n;
  e.progresso[PROGRESSAO.niveisPendentes] = n;
  if (bau) e.progresso[PROGRESSAO.bausPorFechar] = 1;
  gerarOfertaSeFor(e, D);
  sim = { estado: e, dados: D, modal: { selecionada: 7 } };
}
const abrir = (): void => abrirModal(sim, { tradutor: trad, fila });
const pendentes = (): number => sim.estado.progresso[PROGRESSAO.niveisPendentes]!;
const confirmados = (): number => sim.estado.progresso[PROGRESSAO.modaisConfirmados]!;

beforeEach(() => {
  fila = new FilaDeToques();
  fila.reiniciar();
  trad = new TradutorDeGestos();
  trad.reiniciar();
  trad.definirArea(INSETS);
  naTela = [];
  proximoId = 100;
  vi.mocked(confirmarModal).mockClear();
  aoFechar.mockClear();
  aoEscolher.mockClear();
});

describe('seleção e confirmação (M4)', () => {
  beforeEach(() => {
    montar(2);
    abrir();
  });

  it('o 1º toque numa carta seleciona; outra carta troca; fora das cartas nada muda', () => {
    tocar(CARTAS[1]!);
    quadro();
    expect(sim.modal.selecionada).toBe(1);
    tocar(CARTAS[0]!);
    quadro();
    expect(sim.modal.selecionada).toBe(0);
    // No vão de 12 pt entre as cartas 0 e 1 e no topo da tela.
    for (const p of [{ x: 195, y: CARTAS[1]!.y - 6 }, { x: 195, y: 100 }]) {
      const id = proximoId++;
      toque(T.inicio, id, p.x, p.y);
      toque(T.fim, id, p.x, p.y);
      quadro();
    }
    expect(sim.modal.selecionada).toBe(0);
    expect([confirmados(), vi.mocked(confirmarModal).mock.calls.length]).toEqual([0, 0]);
  });

  it('o toque na selecionada confirma, com o índice dela, e a seleção zera', () => {
    tocar(CARTAS[2]!);
    quadro();
    expect(confirmarModal).not.toHaveBeenCalled();
    tocar(CARTAS[2]!);
    quadro();
    expect(confirmarModal).toHaveBeenCalledTimes(1);
    expect(confirmarModal).toHaveBeenCalledWith(sim.estado, D, 2);
    expect(aoEscolher).toHaveBeenCalledWith(2);
    expect([sim.modal.selecionada, confirmados(), pendentes()]).toEqual([null, 1, 1]);
    // Ainda há uma oferta na fila: o modal segue aberto.
    expect(trad.modo).toBe('modal');
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('seleciona uma, troca para outra e confirma a outra', () => {
    tocar(CARTAS[0]!);
    tocar(CARTAS[1]!);
    tocar(CARTAS[1]!);
    quadro();
    expect(confirmarModal).toHaveBeenCalledTimes(1);
    expect(confirmarModal).toHaveBeenCalledWith(sim.estado, D, 1);
  });

  it('2 toques na mesma carta no mesmo quadro: seleciona e confirma', () => {
    tocar(CARTAS[1]!);
    tocar(CARTAS[1]!);
    quadro();
    expect(confirmarModal).toHaveBeenCalledWith(sim.estado, D, 1);
    expect([sim.modal.selecionada, confirmados()]).toEqual([null, 1]);
  });

  it('3 toques na carta 0 com 2 ofertas na fila: confirma só uma; o 3º é descartado e a seleção fica vazia', () => {
    tocar(CARTAS[0]!);
    tocar(CARTAS[0]!);
    tocar(CARTAS[0]!);
    quadro();
    expect(confirmarModal).toHaveBeenCalledTimes(1);
    expect([sim.modal.selecionada, confirmados(), pendentes()]).toEqual([null, 1, 1]);
    expect(trad.nToquesNoModal).toBe(0);
    // O quadro seguinte (sem toques novos) não confirma nem seleciona nada.
    quadro();
    expect([sim.modal.selecionada, confirmados()]).toEqual([null, 1]);
  });

  it('ao confirmar, os dedos são soltos e a fila pede soltar todos', () => {
    toque(T.inicio, 1, NA_AREA.x, NA_AREA.y);
    tocar(CARTAS[0]!);
    tocar(CARTAS[0]!);
    trad.traduzir(fila, cmd);
    tratarToquesDoModal(sim, { tradutor: trad, fila });
    expect(confirmados()).toBe(1);
    expect(fila.soltarTodos).toBe(true);
    // O dedo 1 foi solto: seu fim não aciona nada e uma carta pressionada antes não vale.
    toque(T.fim, 1, NA_AREA.x, NA_AREA.y);
    quadro();
    expect([sim.modal.selecionada, confirmados()]).toEqual([null, 1]);
  });

  it(`só ${MAX_TOQUES_NO_MODAL} toques por quadro são guardados e tratados, em ordem`, () => {
    expect(MAX_TOQUES_NO_MODAL).toBe(8);
    // 1, 2, 1, 2, 1, 2, 1, 2 e um 9º na carta 1: o 9º é perdido, então a seleção termina na 2.
    for (let i = 0; i < 9; i++) tocar(CARTAS[i % 2 === 0 ? 1 : 2]!);
    trad.traduzir(fila, cmd);
    expect(trad.nToquesNoModal).toBe(8);
    expect([...trad.toquesNoModal]).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
    tratarToquesDoModal(sim, { tradutor: trad, fila });
    expect([sim.modal.selecionada, confirmados()]).toEqual([2, 0]);
  });
});

describe('descartarToquesDoModal (M4)', () => {
  it('esquece os toques guardados no quadro e solta os dedos que continuam na tela', () => {
    montar(1);
    abrir();
    toque(T.inicio, 1, NA_AREA.x, NA_AREA.y);
    tocar(CARTAS[0]!);
    tocar(CARTAS[1]!);
    trad.traduzir(fila, cmd);
    expect(trad.nToquesNoModal).toBe(2);
    trad.descartarToquesDoModal();
    expect(trad.nToquesNoModal).toBe(0);
    // O dedo 1 foi solto: o seu fim já não aciona alvo nenhum.
    toque(T.fim, 1, NA_AREA.x, NA_AREA.y);
    trad.traduzir(fila, cmd);
    expect(trad.nToquesNoModal).toBe(0);
  });
});

describe('abertura do modal (M5)', () => {
  beforeEach(() => {
    montar(1);
  });

  it('solta os dedos, zera a seleção e entra no modo modal; o joystick que existia some', () => {
    toque(T.inicio, 1, 100, 600);
    quadro();
    expect(trad.joystick.ativo).toBe(true);
    abrir();
    expect([trad.modo, trad.tipoDeModal, trad.joystick.ativo, sim.modal.selecionada, fila.soltarTodos]).toEqual(['modal', 'cartas', false, null, true]);
    toque(T.move, 1, 160, 600);
    quadro();
    expect(trad.joystick.ativo).toBe(false);
    expect([cmd.movimento[0], cmd.movimento[1]]).toEqual([0, 0]);
  });

  it('no modo modal, um toque na área do joystick não cria o joystick', () => {
    abrir();
    toque(T.inicio, 5, NA_AREA.x, NA_AREA.y);
    toque(T.move, 5, NA_AREA.x + 50, NA_AREA.y);
    quadro();
    expect([trad.joystick.ativo, trad.joystickCriados, cmd.movimento[0]]).toEqual([false, 0, 0]);
  });

  it('no modo modal, o botão de pausa e o gesto de 2 dedos não acionam; na Vigília o gesto aciona', () => {
    const gesto = (): void => {
      toque(T.inicio, 1, 150, 200);
      toque(T.inicio, 2, 250, 220);
      trad.traduzir(fila, cmd, 1000);
    };
    gesto();
    expect(trad.pedidoDePausa).toBe('gesto');
    fila.reiniciar();
    trad.reiniciar();
    naTela = [];
    abrir();
    gesto();
    expect(trad.pedidoDePausa).toBeNull();
    const { x, y } = centro(BOTAO);
    toque(T.inicio, 3, x, y);
    toque(T.fim, 3, x, y);
    quadro(2000);
    expect(trad.pedidoDePausa).toBeNull();
  });
});

describe('fechamento da fila (M5)', () => {
  beforeEach(() => {
    montar(1);
    abrir();
  });

  it('confirmar o último modal volta ao modo vigília, com os dedos soltos', () => {
    tocar(CARTAS[0]!);
    tocar(CARTAS[0]!);
    quadro();
    expect([trad.modo, pendentes(), fila.soltarTodos, trad.nToquesNoModal]).toEqual(['vigilia', 0, true, 0]);
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('o dedo que estava na tela não vira joystick; só um toque novo cria', () => {
    toque(T.inicio, 1, NA_AREA.x, NA_AREA.y);
    tocar(CARTAS[0]!);
    tocar(CARTAS[0]!);
    quadro();
    expect(trad.modo).toBe('vigilia');
    // O dedo 1 continua na tela e se mexe: nada de joystick.
    toque(T.move, 1, NA_AREA.x + 40, NA_AREA.y);
    quadro();
    expect([trad.joystick.ativo, trad.joystickCriados, cmd.movimento[0], cmd.movimento[1]]).toEqual([false, 0, 0, 0]);
    toque(T.fim, 1, NA_AREA.x + 40, NA_AREA.y);
    quadro();
    expect(trad.joystickCriados).toBe(0);
    toque(T.inicio, 2, 100, 600);
    toque(T.move, 2, 160, 600);
    quadro();
    expect([trad.joystick.ativo, trad.joystickCriados, cmd.movimento[0]]).toEqual([true, 1, 1]);
  });

  it('com mais uma oferta na fila, o modal segue (modo modal) e a seleção volta vazia', () => {
    montar(2);
    abrir();
    tocar(CARTAS[1]!);
    tocar(CARTAS[1]!);
    quadro();
    expect([trad.modo, sim.modal.selecionada, pendentes()]).toEqual(['modal', null, 1]);
  });
});

describe('baú (B4)', () => {
  beforeEach(() => {
    montar(0, true);
    abrir();
  });

  it('abre no modo modal do baú; um toque no Continuar fecha, sem confirmar duas vezes', () => {
    expect([trad.modo, trad.tipoDeModal]).toEqual(['modal', 'bau']);
    tocar(CONTINUAR);
    quadro();
    expect(sim.estado.progresso[PROGRESSAO.bausPorFechar]).toBe(0);
    expect([trad.modo, confirmados(), aoFechar.mock.calls.length, aoEscolher.mock.calls.length]).toEqual(['vigilia', 1, 1, 0]);
  });

  it('toque fora do Continuar (nas posições das cartas) não fecha', () => {
    tocar(CARTAS[1]!);
    quadro();
    expect([trad.modo, sim.estado.progresso[PROGRESSAO.bausPorFechar]]).toEqual(['modal', 1]);
  });

  it('baú seguido de um nível pendente: fecha o baú e abre as cartas', () => {
    montar(1, true);
    abrir();
    tocar(CONTINUAR);
    quadro();
    expect([trad.modo, trad.tipoDeModal, pendentes()]).toEqual(['modal', 'cartas', 1]);
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
