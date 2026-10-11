// F-002.5: jogador a 4,5 corpos/s (144 px/s) com o joystick saturado; partida
// e parada instantâneas; direção do triângulo; colisão no passo; e o estado do
// prompt de mover (F-002.8 na simulação; design/decisoes-F-002.md §6 e §7).
import { describe, expect, it } from 'vitest';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { CAB, JOGADOR as J, JOGADOR_U8, PROMPT, TUTORIAL, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar, passo } from '../../../src/logica/nucleo/passo';
import { CORPO_PX } from '../../../src/logica/mundo/dados';
import { PASSO_DO_PROMPT_DE_MOVER, RAIO_DO_JOGADOR } from '../../../src/logica/mundo/jogador';
import { LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as VAZIO, PARADO, SEM_HORDA, dadosDe } from '../apoio';

const R2 = Math.fround(0.7071067811865476);
const intencao = (mx: number, my: number) => {
  const c = criarComandos();
  c.movimento[0] = mx;
  c.movimento[1] = my;
  return c;
};
const pos = (e: Estado): [number, number] => [e.jogador[J.x]!, e.jogador[J.y]!];
const prompt = (e: Estado): number => e.jogadorU8[JOGADOR_U8.promptMover]!;

describe('velocidade (F-002.5, B §3.3)', () => {
  it('1,0 = 4,5 corpos/s = 144 px/s = 2,4 px por passo', () => {
    expect(VAZIO.velocidadePorPasso * 60).toBeCloseTo(4.5 * CORPO_PX, 10);
    expect(VAZIO.velocidadePorPasso).toBeCloseTo(2.4, 12);
  });

  it.each([
    ['direita', 1, 0],
    ['esquerda', -1, 0],
    ['cima', 0, -1],
    ['baixo', 0, 1],
    ['diagonal (|v| = 1, não 1,41)', R2, R2],
  ])('saturado para %s: 60 passos = 144 px (±1%), sem obstáculos', (_nome, mx, my) => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    const [x0, y0] = pos(e);
    avancar(e, VAZIO, fonteConstante(intencao(mx, my)), 60);
    const [x, y] = pos(e);
    const d = Math.sqrt(deltaNoToro(x0, x, W) ** 2 + (y - y0) ** 2);
    expect(Math.abs(d - 144) / 144).toBeLessThanOrEqual(0.01);
  });

  it('a intenção é analógica: |v| = 0,5 anda 72 px em 60 passos', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    avancar(e, VAZIO, fonteConstante(intencao(0.5, 0)), 60);
    expect(pos(e)[0] - VAZIO.inicioX).toBeCloseTo(72, 2);
  });

  it('partida e parada instantâneas: o 1º passo já anda 2,4 px e o 1º passo parado não anda', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    passo(e, VAZIO, intencao(1, 0));
    expect(pos(e)[0] - VAZIO.inicioX).toBeCloseTo(2.4, 4);
    const [x1, y1] = pos(e);
    passo(e, VAZIO, intencao(0, 0));
    expect(pos(e)).toEqual([x1, y1]);
    expect([e.jogador[J.xAnt], e.jogador[J.yAnt]]).toEqual([x1, y1]);
  });

  it('intenção acima de |v| = 1 é reduzida ao círculo', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    passo(e, VAZIO, intencao(3, 4));
    const [x, y] = pos(e);
    expect(Math.sqrt((x - VAZIO.inicioX) ** 2 + (y - VAZIO.inicioY) ** 2)).toBeCloseTo(2.4, 4);
  });

  it.each([
    ['NaN', Number.NaN, 0],
    ['infinito', Infinity, 0],
    ['−infinito em y', 0, -Infinity],
  ])('%s conta como parada: não anda, não gira e não cumpre o prompt', (_nome, mx, my) => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    passo(e, VAZIO, intencao(mx, my));
    expect(pos(e)).toEqual([VAZIO.inicioX, VAZIO.inicioY]);
    expect([e.jogador[J.dirX], e.jogador[J.dirY]]).toEqual([0, -1]);
    expect(prompt(e)).toBe(PROMPT.aguardando);
    expect(Array.from(e.jogador).some(Number.isNaN)).toBe(false);
  });

  it('o 1º passo da Vigília é o passo 0 do roteiro', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }, { passo: 1, mx: 1, my: 0 }]);
    avancar(e, VAZIO, fonte, 1);
    expect(pos(e)[0]).toBe(VAZIO.inicioX);
    avancar(e, VAZIO, fonte, 1);
    expect(pos(e)[0]).toBeCloseTo(VAZIO.inicioX + 2.4, 4);
  });

  it('a posição fica em Float32 no toro, e xAnt/yAnt guardam a do passo anterior', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    avancar(e, VAZIO, fonteConstante(intencao(1, 0)), 300);
    const [x, y] = pos(e);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(W);
    expect(x).toBe(Math.fround(x));
    expect(deltaNoToro(e.jogador[J.xAnt]!, x, W)).toBeCloseTo(2.4, 3);
    expect(y).toBe(VAZIO.inicioY);
  });
});

describe('colisão do jogador (F-002.6)', () => {
  const um = dadosDe({ ...charneca, obstaculos: [{ x: 700, y: 1266, tamanho_px: 80 }] });

  it('a colisão roda em todo passo, mesmo parado: quem está dentro de um obstáculo é empurrado para fora', () => {
    const sobre = dadosDe({ ...charneca, obstaculos: [{ x: 600, y: 1266, tamanho_px: 80 }] });
    const e = criarEstado(1, sobre, SEM_HORDA);
    passo(e, sobre, intencao(0, 0));
    expect(pos(e)).toEqual([600 - 40 - RAIO_DO_JOGADOR, 1266]);
  });

  it('empurrado contra um obstáculo, para na borda e não o atravessa', () => {
    const e = criarEstado(1, um, SEM_HORDA);
    avancar(e, um, fonteConstante(intencao(1, 0)), 200);
    expect(pos(e)[0]).toBeCloseTo(700 - 40 - RAIO_DO_JOGADOR, 3);
  });

  it('na Charneca, o roteiro do corredor passa pela costura sem tocar em nada', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA, SEM_HORDA);
    avancar(e, DADOS_DA_CHARNECA, fonteConstante(intencao(1, 0)), 250);
    // A soma em Float32 deriva ≈ 0,006 px em 250 passos; determinística, mas não exata.
    expect(pos(e)[0]).toBeCloseTo(DADOS_DA_CHARNECA.inicioX + 250 * 2.4 - W, 1);
    expect(pos(e)[1]).toBe(DADOS_DA_CHARNECA.inicioY);
  });
});

describe('direção do triângulo (§5)', () => {
  it('aponta para cima no início, gira para a última intenção não nula e fica ao parar', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    expect([e.jogador[J.dirX], e.jogador[J.dirY]]).toEqual([0, -1]);
    passo(e, VAZIO, intencao(-0.3, 0));
    expect([e.jogador[J.dirX], e.jogador[J.dirY]]).toEqual([-1, 0]);
    passo(e, VAZIO, intencao(0.6, 0.8));
    expect(e.jogador[J.dirX]).toBeCloseTo(0.6, 6);
    expect(e.jogador[J.dirY]).toBeCloseTo(0.8, 6);
    passo(e, VAZIO, intencao(0, 0));
    expect(e.jogador[J.dirX]).toBeCloseTo(0.6, 6);
  });
});

describe('prompt de mover (§7)', () => {
  it('aparece no passo de relógio 600, não antes, e é cumprido no 1º passo com intenção', () => {
    expect(PASSO_DO_PROMPT_DE_MOVER).toBe(600);
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    expect(prompt(e)).toBe(PROMPT.aguardando);
    avancar(e, VAZIO, PARADO, 599);
    expect(prompt(e)).toBe(PROMPT.aguardando);
    avancar(e, VAZIO, PARADO, 1);
    expect([e.cab[CAB.relogio], prompt(e)]).toEqual([600, PROMPT.visivel]);
    passo(e, VAZIO, intencao(0, 1));
    expect(prompt(e)).toBe(PROMPT.cumprido);
    avancar(e, VAZIO, PARADO, 100);
    expect(prompt(e)).toBe(PROMPT.cumprido);
  });

  it('quem se move antes de 0:10 não vê o prompt', () => {
    const e = criarEstado(1, VAZIO, SEM_HORDA);
    avancar(e, VAZIO, fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }, { passo: 1, mx: 1, my: 0 }, { passo: 2, mx: 0, my: 0 }]), 2000);
    expect(prompt(e)).toBe(PROMPT.cumprido);
  });

  it('com o tutorial já visto (?tutorial=0, depois o meta), nasce cumprido', () => {
    const e = criarEstado(1, VAZIO, { ...SEM_HORDA, tutoriaisVistos: TUTORIAL.mover });
    avancar(e, VAZIO, PARADO, 700);
    expect(prompt(e)).toBe(PROMPT.cumprido);
  });

  it('o gatilho é a intenção: andar contra um obstáculo, sem sair do lugar, cumpre', () => {
    const preso = dadosDe({ ...charneca, obstaculos: [{ x: VAZIO.inicioX + 40 + RAIO_DO_JOGADOR, y: VAZIO.inicioY, tamanho_px: 80 }] });
    const e = criarEstado(1, preso, SEM_HORDA);
    avancar(e, preso, PARADO, 650);
    const antes = pos(e);
    passo(e, preso, intencao(1, 0));
    expect(pos(e)[0]).toBeCloseTo(antes[0], 4);
    expect(prompt(e)).toBe(PROMPT.cumprido);
  });
});
