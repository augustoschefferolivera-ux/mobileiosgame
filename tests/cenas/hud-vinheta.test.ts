// Vinheta do acerto na cena Hud (design/decisoes-F-007.md HB2, E7): com "Flashes" desligado o objeto da vinheta nunca é
// criado (fica só o retardo estático da barra); ligado, nasce preguiçosamente no 1º pedido. A cena roda sem Phaser de
// verdade: só o método de feedback, com um `add.graphics()` falso que conta as criações.
import './ambientePhaser';
import { describe, expect, it } from 'vitest';
import { Hud } from '../../src/cenas/Hud';
import type { ContextoDoJogo } from '../../src/cenas/contexto';
import { FeedbackDaInterface } from '../../src/cenas/feedback';
import { VINHETA_DO_ACERTO } from '../../src/cenas/layoutDoHud';

/** Um Graphics falso: qualquer chamada devolve ele mesmo. */
function graficoFalso(): unknown {
  const g: unknown = new Proxy(function () {}, { get: (_t, k) => (k === 'alfa' ? undefined : () => g), apply: () => g });
  return g;
}

function montar(flashes: boolean): { hud: Hud; criados: () => number; feedback: FeedbackDaInterface } {
  const feedback = new FeedbackDaInterface();
  const ctx = { feedback, opcoes: { numerosDeDano: true, som: true, flashes }, flashSegurar: false, sfx: null } as unknown as ContextoDoJogo;
  const hud = new Hud(ctx);
  let n = 0;
  (hud as unknown as { add: unknown }).add = {
    graphics: () => {
      n++;
      return graficoFalso();
    },
  };
  (hud as unknown as { flashGrafico: unknown }).flashGrafico = graficoFalso();
  return { hud, criados: () => n, feedback };
}

const quadro = (hud: Hud): void => (hud as unknown as { atualizarFeedback(sim: unknown): void }).atualizarFeedback({ efeitos: null });
const vinheta = (hud: Hud): unknown => (hud as unknown as { vinheta: unknown }).vinheta;

describe('vinheta do acerto na Hud (HB2)', () => {
  it('com "Flashes" desligado, mesmo com a vinheta pedida, nenhum Graphics é criado em 60 quadros', () => {
    const { hud, criados, feedback } = montar(false);
    feedback.vinheta.pedir(0);
    for (let q = 0; q < 60; q++) quadro(hud);
    expect([criados(), vinheta(hud)]).toEqual([0, null]);
  });

  it('com "Flashes" ligado, o 1º pedido cria o objeto uma vez (preguiçoso) e os seguintes o reaproveitam', () => {
    const { hud, criados, feedback } = montar(true);
    for (let q = 0; q < 10; q++) quadro(hud);
    expect(criados()).toBe(0);
    feedback.vinheta.pedir(0);
    for (let q = 0; q < VINHETA_DO_ACERTO.quadros + 2; q++) quadro(hud);
    expect(criados()).toBe(1);
    feedback.vinheta.pedir(5_000);
    for (let q = 0; q < VINHETA_DO_ACERTO.quadros + 2; q++) quadro(hud);
    expect(criados()).toBe(1);
    expect(vinheta(hud)).not.toBeNull();
  });

  it('desligar "Flashes" no meio apaga o alfa e não cria objeto novo', () => {
    const { hud, criados, feedback } = montar(true);
    feedback.vinheta.pedir(0);
    quadro(hud);
    const antes = criados();
    (hud as unknown as { ctx: ContextoDoJogo }).ctx.opcoes.flashes = false;
    feedback.vinheta.pedir(5_000);
    for (let q = 0; q < 20; q++) quadro(hud);
    expect(criados()).toBe(antes);
  });
});
