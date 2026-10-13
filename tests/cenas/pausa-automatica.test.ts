// Pausa automática na cena Pausa (design/decisoes-F-010.md PS1): só o véu, o título e `A6.PAUSA.TOQUE_PARA_CONTINUAR`; a pausa do botão
// continua com a tela inteira. Phaser falso.
import './ambientePhaser';
import { describe, expect, it } from 'vitest';
import type { ContextoDoJogo } from '../../src/cenas/contexto';
import { Pausa } from '../../src/cenas/Pausa';
import { insetsZerados } from '../../src/plataforma/safeArea';

function objetoFalso(texto = ''): Record<string, unknown> {
  const dados = new Map<string, unknown>();
  const base: Record<string, unknown> = { visible: true, text: texto, height: 20, width: 100, alpha: 1 };
  const p: Record<string, unknown> = new Proxy(base, {
    get: (t, k: string) => {
      if (k in t) return t[k];
      if (k === 'setText') return (x: string) => ((t['text'] = x), p);
      if (k === 'setVisible') return (v: boolean) => ((t['visible'] = v), p);
      if (k === 'setData') return (c: string, v: unknown) => (dados.set(c, v), p);
      if (k === 'getData') return (c: string) => dados.get(c);
      return () => p;
    },
  });
  return p;
}

function montar(): { cena: Pausa; visiveis: () => string[] } {
  const objetos: Record<string, unknown>[] = [];
  const novo = (s = ''): Record<string, unknown> => {
    const o = objetoFalso(s);
    objetos.push(o);
    return o;
  };
  const ctx = { insets: insetsZerados(), simulacao: null, opcoes: { numerosDeDano: true, som: true, flashes: true } } as unknown as ContextoDoJogo;
  const cena = new Pausa(ctx);
  Object.assign(cena as unknown as Record<string, unknown>, {
    add: { graphics: () => novo(), text: (_x: number, _y: number, s: string) => novo(s) },
    cameras: { main: { setZoom: () => ({ centerOn: () => {} }) } },
    scale: { on: () => {}, off: () => {} },
    events: { once: () => {} },
    scene: { setVisible: () => {} },
    tweens: { killTweensOf: () => {}, add: () => {} },
  });
  cena.create();
  const id = (o: Record<string, unknown>): unknown => (o['getData'] as (c: string) => unknown)('idTexto');
  return { cena, visiveis: () => objetos.filter((o) => o['visible'] === true && typeof id(o) === 'string').map((o) => id(o) as string) };
}

describe('cena Pausa', () => {
  it('automática: título e toque para continuar; nada de Continuar, Abandonar, opções nem estatísticas', () => {
    const { cena, visiveis } = montar();
    cena.mostrar(true);
    const v = visiveis();
    expect(v).toEqual(expect.arrayContaining(['A6.PAUSA.TITULO', 'A6.PAUSA.TOQUE_PARA_CONTINUAR']));
    for (const id of ['A6.PAUSA.CONTINUAR', 'A6.PAUSA.ABANDONAR', 'A6.PAUSA.NUMEROS', 'A6.PAUSA.SOM', 'A6.PAUSA.FLASHES', 'A6.PAUSA.ESTATISTICAS_LINHA', 'A6.PAUSA.MORTES']) expect(v).not.toContain(id);
  });

  it('do botão: Continuar, Abandonar e opções; sem o toque para continuar', () => {
    const { cena, visiveis } = montar();
    cena.mostrar();
    const v = visiveis();
    expect(v).toEqual(expect.arrayContaining(['A6.PAUSA.TITULO', 'A6.PAUSA.CONTINUAR', 'A6.PAUSA.ABANDONAR', 'A6.PAUSA.NUMEROS', 'A6.PAUSA.SOM', 'A6.PAUSA.FLASHES']));
    expect(v).not.toContain('A6.PAUSA.TOQUE_PARA_CONTINUAR');
  });
});
