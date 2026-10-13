// Câmera lenta do tutorial (FB5), telemetria local de esquiva e aparo (FB6, CA6) e o painel de prompts
// (TU4): lógica pura, sem Phaser (design/decisoes-F-006.md §3 e §6).
import { describe, expect, it } from 'vitest';
import { avancarAcumulador, criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { criarCameraLenta, dispararCameraLenta, escalaDeTempo, escalarDelta } from '../../src/logica/nucleo/cameraLenta';
import { CAB, JOGADOR3_U8, JOGADOR_U8, PROMPT, criarEstado, hashEstado, type Estado } from '../../src/logica/nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../../src/logica/nucleo/eventos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { IDS_DOS_PROMPTS, promptEmTela } from '../../src/cenas/prompts';
import { TelemetriaDeCombate } from '../../src/cenas/telemetriaDeCombate';
import { RegistroDeTelemetria } from '../../src/plataforma/telemetria';
import { DADOS_DA_CHARNECA } from '../logica/apoio';
import { t } from '../../src/cenas/textos';

describe('câmera lenta leve (FB5, TU8)', () => {
  /** Roda quadros de 1000/60 ms de tempo real e conta os passos. */
  function passosEmMs(ms: number, c = criarCameraLenta()): number {
    const acc = criarAcumulador();
    let passos = 0;
    for (let t0 = 0; t0 < ms; t0 += 1000 / 60) passos += avancarAcumulador(acc, escalarDelta(c, 1000 / 60));
    return passos;
  }

  it('500 ms de tempo real rodam 15 passos em vez de 30, e a escala volta a 1', () => {
    const c = criarCameraLenta();
    expect(escalaDeTempo(c)).toBe(1);
    expect(dispararCameraLenta(c)).toBe(true);
    expect(escalaDeTempo(c)).toBe(0.5);
    const passos = passosEmMs(500, c);
    expect(passos).toBeGreaterThanOrEqual(14);
    expect(passos).toBeLessThanOrEqual(16);
    expect(escalaDeTempo(c)).toBe(1);
    expect(escalarDelta(c, 16)).toBe(16);
    // Sem câmera lenta, os mesmos 500 ms são 30 passos.
    expect(passosEmMs(500)).toBeGreaterThanOrEqual(29);
  });

  it('dispara uma vez só e vale em qualquer taxa de quadros (o fator é sobre o delta)', () => {
    const c = criarCameraLenta();
    expect(dispararCameraLenta(c)).toBe(true);
    expect(dispararCameraLenta(c)).toBe(false);
    // 30 fps: quadros de 33,3 ms; 500 ms são 15 quadros e 15 passos, como a 60 fps (k = 2 daria 0,25).
    const acc = criarAcumulador();
    let passos = 0;
    for (let i = 0; i < 15; i++) passos += avancarAcumulador(acc, escalarDelta(c, 1000 / 30));
    expect(passos).toBeGreaterThanOrEqual(14);
    expect(passos).toBeLessThanOrEqual(16);
    expect(dispararCameraLenta(c)).toBe(false);
  });

  it('mistura o quadro que cruza o fim: parte em câmera lenta, parte em tempo normal', () => {
    const c = criarCameraLenta();
    dispararCameraLenta(c);
    expect(escalarDelta(c, 480)).toBe(240);
    expect(escalarDelta(c, 40)).toBe(10 + 20);
    expect(escalarDelta(c, 40)).toBe(40);
  });

  it('nada entra no hash do estado', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA);
    const antes = hashEstado(e);
    dispararCameraLenta(criarCameraLenta());
    expect(hashEstado(e)).toBe(antes);
  });
});

describe('prompts na tela (TU4, TU11)', () => {
  const comPrompts = (m: number, es: number, ap: number): Estado => {
    const e = criarEstado(1, DADOS_DA_CHARNECA);
    e.jogadorU8[JOGADOR_U8.promptMover] = m;
    e.jogador3U8[JOGADOR3_U8.promptEsquiva] = es;
    e.jogador3U8[JOGADOR3_U8.promptAparo] = ap;
    return e;
  };

  it('mostra o de maior índice entre os visíveis; o menor volta quando o maior cumpre', () => {
    expect(IDS_DOS_PROMPTS).toEqual(['A2.TUTORIAL.01', 'A2.TUTORIAL.02', 'A2.TUTORIAL.03']);
    const V = PROMPT.visivel;
    const N = PROMPT.aguardando;
    const C = PROMPT.cumprido;
    expect(promptEmTela(comPrompts(N, N, N))).toBe(-1);
    expect(promptEmTela(comPrompts(V, N, N))).toBe(0);
    expect(IDS_DOS_PROMPTS[promptEmTela(comPrompts(V, V, N))]).toBe('A2.TUTORIAL.02');
    expect(IDS_DOS_PROMPTS[promptEmTela(comPrompts(V, V, V))]).toBe('A2.TUTORIAL.03');
    expect(IDS_DOS_PROMPTS[promptEmTela(comPrompts(V, V, C))]).toBe('A2.TUTORIAL.02');
    expect(promptEmTela(comPrompts(C, C, C))).toBe(-1);
  });

  it('os três textos existem em pt-BR.json, com o glifo ⟲ no do aparo', () => {
    expect(t('A2.TUTORIAL.02')).toBe('Toque duas vezes para esquivar');
    expect(t('A2.TUTORIAL.03')).toContain('⟲');
  });
});

describe('telemetria local de esquiva e aparo (FB6, CA6, VT4)', () => {
  const novo = (relogio = 0, passoAtual = 100): Estado => {
    const e = criarEstado(1, DADOS_DA_CHARNECA);
    e.cab[CAB.relogio] = relogio;
    e.cab[CAB.passo] = passoAtual;
    return e;
  };
  const evento = (e: Estado, tipo: number, passo: number, tipoDoInimigo = 0): void => {
    FLOATS_DO_EVENTO.fill(0);
    gravarEvento(e.eventos, passo, tipo, 0, 0, -1, 0, tipoDoInimigo, 0, 0);
  };
  const linhas = (r: RegistroDeTelemetria, nome: string) => r.eventos().filter((x) => x.evento === nome);

  it('3 esquivas (comum, perfeita, negada) dão 2 linhas', () => {
    const e = novo();
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    // Comum: o quadro em que esquivaPasso chega a 14 grava.
    evento(e, EVENTO.esquiva, 100);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    tele.ler(e, r);
    expect(linhas(r, 'esquiva')).toHaveLength(0);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 14;
    tele.ler(e, r);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 0;
    tele.ler(e, r);
    expect(linhas(r, 'esquiva').map((x) => x.campos)).toEqual([{ minuto: 0, perfeita: false, peso: 'leve' }]);
    // Perfeita: grava no evento, e o passo 14 não grava de novo.
    evento(e, EVENTO.esquiva, 130);
    evento(e, EVENTO.esquivaPerfeita, 132);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 6;
    tele.ler(e, r);
    expect(linhas(r, 'esquiva').map((x) => x.campos['perfeita'])).toEqual([false, true]);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 14;
    tele.ler(e, r);
    // Negada: só acaoNegada, nenhuma linha.
    evento(e, EVENTO.acaoNegada, 160);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 0;
    tele.ler(e, r);
    expect(linhas(r, 'esquiva')).toHaveLength(2);
  });

  it('duas esquivas encadeadas no mesmo quadro dão 2 linhas, uma perfeita e uma não', () => {
    const e = novo();
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    evento(e, EVENTO.esquiva, 90);
    evento(e, EVENTO.esquivaPerfeita, 92);
    evento(e, EVENTO.esquiva, 111);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 14;
    tele.ler(e, r);
    expect(linhas(r, 'esquiva').map((x) => x.campos['perfeita'])).toEqual([true, false]);
    // Chegada de uma nova esquiva sem perfeita: a anterior grava como não perfeita.
    const e2 = novo();
    const r2 = new RegistroDeTelemetria();
    const t2 = new TelemetriaDeCombate();
    evento(e2, EVENTO.esquiva, 90);
    evento(e2, EVENTO.esquiva, 111);
    e2.jogador3U8[JOGADOR3_U8.esquivaPasso] = 3;
    t2.ler(e2, r2);
    expect(linhas(r2, 'esquiva').map((x) => x.campos['perfeita'])).toEqual([false]);
  });

  it('o minuto sai do relógio de quando a esquiva começou', () => {
    const e = novo(3 * 3600 + 5, 1000);
    const r = new RegistroDeTelemetria();
    evento(e, EVENTO.esquiva, 995);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 14;
    new TelemetriaDeCombate().ler(e, r);
    expect(linhas(r, 'esquiva')[0]!.campos['minuto']).toBe(3);
  });

  it('aparo: sucesso com o id do atacante, falho e vazio sem alvo', () => {
    const e = novo(3600 * 2 + 100, 500);
    const r = new RegistroDeTelemetria();
    evento(e, EVENTO.aparo, 495, TIPO.oco_grande);
    evento(e, EVENTO.aparo, 496, TIPO.novica_de_sal);
    evento(e, EVENTO.aparoFalho, 497);
    evento(e, EVENTO.aparoVazio, 498);
    new TelemetriaDeCombate().ler(e, r);
    expect(linhas(r, 'aparo').map((x) => x.campos)).toEqual([
      { minuto: 2, sucesso: true, alvo: 'oco_grande' },
      { minuto: 2, sucesso: true, alvo: 'novica_de_sal' },
      { minuto: 2, sucesso: false, alvo: null },
      { minuto: 2, sucesso: false, alvo: null },
    ]);
  });

  it('registrar recusa campo fora da lista do doc 10 §6', () => {
    const r = new RegistroDeTelemetria();
    expect(() => r.registrar('esquiva', 0, { minuto: 0, perfeita: true, peso: 'leve', extra: 1 } as never)).toThrow();
    expect(() => r.registrar('esquiva', 0, { minuto: 0, perfeita: true } as never)).toThrow();
  });
});
