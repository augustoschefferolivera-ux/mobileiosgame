// Plataforma da F-003 (design/decisoes-F-003.md §5 e §8): decidirTeto com as 5
// camadas do ADR-0002 §13 (F-003.10), os parâmetros de URL novos, as receitas
// de cenário e o painel do ?debug=1.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerParametros } from '../../src/plataforma/parametros';
import { TETO_DE_FALLBACK, decidirTeto, telaDeAparelhoAntigo, type EntradasDoTeto, type Tela } from '../../src/plataforma/teto';
import { RECEITAS, parametrosDoCenario } from '../../src/plataforma/cenarios';
import { instalarPainelDeDebug, serializarInstantaneo } from '../../src/plataforma/painelDeDebug';
import { CENARIO, LINHA_LIVRE, TODOS_OS_TUTORIAIS } from '../../src/logica/nucleo/estado';

const IPHONE_14: Tela = { dpr: 3, largura: 390, altura: 844 };
const NADA: EntradasDoTeto = { override: null, cache: null, tela: null, sonda: null };

describe('decidirTeto (F-003.10; ADR-0002 §13)', () => {
  it('tela fora da classe antiga (DPR 3, 390 × 844), sem override, cache nem sonda → 300 com origem fallback', () => {
    expect(decidirTeto({ ...NADA, tela: IPHONE_14 })).toEqual({ valor: 300, origem: 'fallback', sondaMs: null });
    expect(TETO_DE_FALLBACK).toBe(300);
  });

  it('a ordem das camadas: override > cache > tela > sonda > fallback', () => {
    const sonda = { valor: 500, ms: 0.8 } as const;
    const antiga: Tela = { dpr: 2, largura: 375, altura: 667 };
    expect(decidirTeto({ override: 500, cache: 300, tela: antiga, sonda })).toMatchObject({ valor: 500, origem: 'override' });
    expect(decidirTeto({ override: null, cache: 500, tela: antiga, sonda })).toMatchObject({ valor: 500, origem: 'cache' });
    expect(decidirTeto({ override: null, cache: null, tela: antiga, sonda })).toMatchObject({ valor: 300, origem: 'tela' });
    expect(decidirTeto({ override: null, cache: null, tela: IPHONE_14, sonda })).toEqual({ valor: 500, origem: 'sonda', sondaMs: 0.8 });
    expect(decidirTeto({ ...NADA, override: 300 })).toMatchObject({ valor: 300, origem: 'override' });
    expect(decidirTeto(NADA)).toMatchObject({ valor: 300, origem: 'fallback' });
  });

  it.each([
    [{ dpr: 2, largura: 414, altura: 896 }, true],
    [{ dpr: 3, largura: 414, altura: 896 }, true],
    [{ dpr: 3, largura: 896, altura: 414 }, true],
    [{ dpr: 3, largura: 375, altura: 812 }, true],
    [{ dpr: 2, largura: 390, altura: 844 }, true],
    [{ dpr: 3, largura: 390, altura: 844 }, false],
    [{ dpr: 3, largura: 428, altura: 926 }, false],
    [{ dpr: 3, largura: 393, altura: 852 }, false],
  ])('classe de tela antiga: %o → %s', (tela, antiga) => {
    expect(telaDeAparelhoAntigo(tela)).toBe(antiga);
  });
});

describe('parâmetros de URL da F-003 (build de debug)', () => {
  it.each([
    ['?teto=300', 300],
    ['?teto=500', 500],
    ['?teto=400', null],
    ['?teto=', null],
    ['', null],
  ])('%s → teto %s', (busca, teto) => {
    expect(lerParametros(busca, true).teto).toBe(teto);
  });

  it('render, buffer, cenário e debug', () => {
    expect(lerParametros('', true)).toMatchObject({ render: 'gpu', bufferDinamico: false, cenario: null, debug: false });
    expect(lerParametros('?render=image&buffer=dinamico&cenario=horda&debug=1', true)).toMatchObject({
      render: 'image',
      bufferDinamico: true,
      cenario: 'horda',
      debug: true,
    });
    expect(lerParametros('?render=webgpu&buffer=1&cenario=&debug=true', true)).toMatchObject({
      render: 'gpu',
      bufferDinamico: false,
      cenario: null,
      debug: false,
    });
  });
});

describe('receitas de cenário (T2 e T3)', () => {
  it('horda: linha 19 fixa, jogador invulnerável, diretor ligado, tutoriais vistos, sem rotação', () => {
    expect(parametrosDoCenario('horda')).toEqual({
      tutoriaisVistos: TODOS_OS_TUTORIAIS,
      cenario: CENARIO.jogadorInvulneravel,
      linhaFixa: 19,
      rotacao: 0,
    });
  });

  it('horda_rotativa: a mesma receita com rotação de 10 a cada 60 passos', () => {
    expect(parametrosDoCenario('horda_rotativa')).toEqual({ ...parametrosDoCenario('horda'), rotacao: 10 });
  });

  it('sem_horda: só o bit do diretor desligado, sem linha fixa e com os tutoriais por ver (o prompt de mover da F-002)', () => {
    expect(parametrosDoCenario('sem_horda')).toEqual({
      tutoriaisVistos: 0,
      cenario: CENARIO.diretorDesligado,
      linhaFixa: LINHA_LIVRE,
      rotacao: 0,
    });
  });

  it('um id desconhecido é erro, e os ids das receitas são únicos', () => {
    expect(() => parametrosDoCenario('horda_x')).toThrow(/cenário desconhecido/);
    expect(new Set(RECEITAS.map((r) => r.id)).size).toBe(RECEITAS.length);
  });
});

describe('painel do ?debug=1 (V4)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uma linha "chave valor" por campo do instantâneo, sem rótulos literais', () => {
    expect(serializarInstantaneo({ vivos: 300, teto: 300, render: 'gpu', aquecido: true, sonda: null })).toBe(
      'vivos 300\nteto 300\nrender gpu\naquecido true\nsonda null',
    );
  });

  it('cria um <pre class="painel-debug"> e atualiza a cada 500 ms', () => {
    vi.useFakeTimers();
    const filhos: { className: string; textContent: string }[] = [];
    const doc = {
      createElement: () => ({ className: '', textContent: '' }),
      body: { appendChild: (no: { className: string; textContent: string }) => filhos.push(no) },
    } as unknown as Document;
    let n = 0;
    const pre = instalarPainelDeDebug(doc, () => ({ quadro: ++n }));
    expect(filhos).toHaveLength(1);
    expect(pre.className).toBe('painel-debug');
    expect(pre.textContent).toBe('quadro 1');
    vi.advanceTimersByTime(499);
    expect(pre.textContent).toBe('quadro 1');
    vi.advanceTimersByTime(1);
    expect(pre.textContent).toBe('quadro 2');
  });
});
