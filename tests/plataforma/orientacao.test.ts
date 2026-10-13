// Overlay de paisagem (design/decisoes-F-010.md PS3): o texto vem de t(id) pelo código e as cenas são avisadas quando o aparelho vira.
import { describe, expect, it, vi } from 'vitest';
import { CONSULTA_DE_PAISAGEM, instalarOverlayDeGiro } from '../../src/plataforma/orientacao';
import { t } from '../../src/cenas/textos';

function janelaFalsa(paisagem: boolean) {
  const ouvintes = new Set<() => void>();
  const consulta = {
    matches: paisagem,
    addEventListener: (_: 'change', fn: () => void) => void ouvintes.add(fn),
    removeEventListener: (_: 'change', fn: () => void) => void ouvintes.delete(fn),
  };
  const virar = (p: boolean): void => {
    consulta.matches = p;
    for (const fn of [...ouvintes]) fn();
  };
  const matchMedia = vi.fn(() => consulta);
  return { janela: { matchMedia }, virar, ouvintes, matchMedia };
}

describe('instalarOverlayDeGiro', () => {
  it('escreve t(A8.SISTEMA.GIRE) no elemento e consulta orientation: landscape', () => {
    const el = { textContent: '' as string | null };
    const { janela, matchMedia } = janelaFalsa(false);
    const o = instalarOverlayDeGiro(el, t('A8.SISTEMA.GIRE'), janela);
    expect(el.textContent).toBe('Gire o aparelho');
    expect(matchMedia).toHaveBeenCalledWith(CONSULTA_DE_PAISAGEM);
    expect(o.paisagem()).toBe(false);
  });

  it('avisa a cada virada, com o valor novo, e para de avisar depois de cancelado', () => {
    const { janela, virar, ouvintes } = janelaFalsa(false);
    const o = instalarOverlayDeGiro({ textContent: '' }, 'x', janela);
    const visto: boolean[] = [];
    const cancelar = o.aoMudar((p) => visto.push(p));
    virar(true);
    virar(false);
    expect(visto).toEqual([true, false]);
    cancelar();
    virar(true);
    expect([visto.length, ouvintes.size, o.paisagem()]).toEqual([2, 0, true]);
  });
});
