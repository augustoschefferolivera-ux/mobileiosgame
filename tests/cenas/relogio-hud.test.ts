// Relógio e Hora do HUD (design/decisoes-F-008.md HU1): "m:ss" por segundo de relógio, a posição na linha de cima.
import { describe, expect, it } from 'vitest';
import { HUD_DO_RELOGIO, partesDoRelogio, posicoesDoRelogio, segundosDoRelogio } from '../../src/cenas/layoutDoHud';
import { alvoDaPausa } from '../../src/entrada/alvos';
import { t } from '../../src/cenas/textos';
import { insetsZerados, LARGURA_LOGICA } from '../../src/plataforma/safeArea';

describe('relógio do HUD (HU1)', () => {
  it.each([
    [0, '0:00'],
    [59, '0:00'],
    [60, '0:01'],
    [17999, '4:59'],
    [18000, '5:00'],
    [36000 + 9 * 60, '10:09'],
    [82800, '23:00'],
  ])('%i passos → %s', (passos, esperado) => {
    expect(t('A5.HUD.RELOGIO', partesDoRelogio(segundosDoRelogio(passos)))).toBe(esperado);
  });

  it('o texto só muda quando o segundo muda (60 passos)', () => {
    expect(segundosDoRelogio(119)).toBe(1);
    expect(segundosDoRelogio(120)).toBe(2);
  });

  it('a Hora fica depois do botão de pausa e o relógio encosta à direita, na linha de cima, sem invadir os insets', () => {
    const ins = { topo: 47, baixo: 34, esquerda: 8, direita: 8 };
    const p = posicoesDoRelogio(ins, { relogioX: 0, hora: 0, y: 0 });
    const pausa = alvoDaPausa(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    expect(p.hora).toBeGreaterThanOrEqual(pausa.x + pausa.largura);
    expect(p.relogioX).toBe(LARGURA_LOGICA - 8 - HUD_DO_RELOGIO.recuoDireito);
    expect(p.y).toBeGreaterThanOrEqual(ins.topo);
    // A linha de cima termina antes da barra de XP (topo + 40).
    expect(p.y + HUD_DO_RELOGIO.corpoDoRelogio + 4).toBeLessThanOrEqual(ins.topo + 40);
    expect(posicoesDoRelogio(insetsZerados(), { relogioX: 0, hora: 0, y: 0 }).y).toBe(HUD_DO_RELOGIO.acimaDaBarra);
  });
});
