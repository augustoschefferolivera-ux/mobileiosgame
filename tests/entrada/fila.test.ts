// FilaDeToques (ADR-0002 §12; design/decisoes-F-002.md §4): 64 eventos por
// frame em Float64Array, excedente contado, retrato de e.touches para a
// reconciliação e pedido de soltar todos. Só aceita eventos durante a Vigília.
import { describe, expect, it } from 'vitest';
import {
  CAMPOS_POR_EVENTO,
  CAPACIDADE_DA_FILA,
  CAPACIDADE_DO_RETRATO,
  FilaDeToques,
  TIPO_DE_TOQUE as T,
} from '../../src/entrada/filaDeToques';

const ativa = (): FilaDeToques => {
  const f = new FilaDeToques();
  f.reiniciar();
  return f;
};
const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ identifier: 100 + i }));

describe('FilaDeToques', () => {
  it('copia tipo, id, x, y e t de cada evento, na ordem', () => {
    const f = ativa();
    f.empurrar(T.inicio, 3, 10.5, 20.25, 1000.125);
    f.empurrar(T.fim, 3, 11, 21, 1016);
    expect(f.n).toBe(2);
    expect(Array.from(f.eventos.subarray(0, 2 * CAMPOS_POR_EVENTO))).toEqual([T.inicio, 3, 10.5, 20.25, 1000.125, T.fim, 3, 11, 21, 1016]);
  });

  it(`guarda ${CAPACIDADE_DA_FILA} eventos por frame; o excedente é descartado e contado`, () => {
    const f = ativa();
    for (let i = 0; i < CAPACIDADE_DA_FILA + 9; i++) f.empurrar(T.move, 1, i, 0, i);
    expect([f.n, f.perdidos]).toEqual([CAPACIDADE_DA_FILA, 9]);
    expect(f.eventos[(CAPACIDADE_DA_FILA - 1) * CAMPOS_POR_EVENTO + 2]).toBe(CAPACIDADE_DA_FILA - 1);
  });

  it('fora da Vigília não recebe eventos; reiniciar zera fila e contagens', () => {
    const f = new FilaDeToques();
    f.empurrar(T.inicio, 1, 100, 600, 0);
    expect([f.n, f.perdidos]).toEqual([0, 0]);
    f.reiniciar();
    for (let i = 0; i < CAPACIDADE_DA_FILA + 1; i++) f.empurrar(T.move, 1, 0, 0, 0);
    f.reiniciar();
    expect([f.n, f.perdidos, f.ativa]).toEqual([0, 0, true]);
  });

  it('o retrato guarda os ids de e.touches; com dedos demais, deixa de valer', () => {
    const f = ativa();
    f.gravarRetrato(ids(3));
    expect([f.retratoValido, f.noRetrato(101), f.noRetrato(103)]).toEqual([true, true, false]);
    f.gravarRetrato(ids(CAPACIDADE_DO_RETRATO + 1));
    expect(f.retratoValido).toBe(false);
    f.gravarRetrato([]);
    expect([f.retratoValido, f.nRetrato]).toEqual([true, 0]);
  });

  it('ajustarRetrato (injetar) acrescenta no início e tira no fim e no cancela, sem repetir', () => {
    const f = ativa();
    f.ajustarRetrato(T.inicio, 5);
    f.ajustarRetrato(T.inicio, 5);
    f.ajustarRetrato(T.inicio, 6);
    f.ajustarRetrato(T.move, 7);
    expect(f.nRetrato).toBe(2);
    f.ajustarRetrato(T.fim, 5);
    expect([f.noRetrato(5), f.noRetrato(6)]).toEqual([false, true]);
    f.ajustarRetrato(T.cancela, 6);
    expect(f.nRetrato).toBe(0);
  });

  it('pedir para soltar todos descarta a fila e o retrato', () => {
    const f = ativa();
    f.empurrar(T.inicio, 1, 0, 0, 0);
    f.gravarRetrato(ids(1));
    f.pedirSoltarTodos();
    expect([f.n, f.nRetrato, f.soltarTodos]).toEqual([0, 0, true]);
  });
});
