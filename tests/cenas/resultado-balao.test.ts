// Balão das Cinzas Perdidas no Resultado do primeiro Apagar ou A Fome (design/decisoes-F-010.md GA3): o tradutor avisa que um
// dedo soltou no modo resultado, e a cena mostra e fecha o balão `A2.TUTORIAL.05`, com Phaser falso.
import './ambientePhaser';
import { describe, expect, it } from 'vitest';
import { FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import type { ContextoDoJogo } from '../../src/cenas/contexto';
import { Resultado } from '../../src/cenas/Resultado';
import { CAUSA_DO_FIM } from '../../src/logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../../src/logica/mundo/vigilia';
import { criarComandos } from '../../src/logica/nucleo/comandos';
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

const R = {
  causa: CAUSA_DO_FIM.apagar, segundos: 100, nivel: 3, mortes: 10, danoRecebido: 50, aparos: 0, almas: 0, almasAoSantuario: 0,
  mancha: null, recuperouMancha: false, brasas: 0, chefeFase: 0, chefeDerrotado: false, chefeQuebras: 0,
} as ResultadoDaVigilia;

function montar(): { cena: Resultado; textosVisiveis: () => string[] } {
  const objetos: Record<string, unknown>[] = [];
  const ctx = { insets: insetsZerados() } as unknown as ContextoDoJogo;
  const cena = new Resultado(ctx);
  const novo = (s = ''): Record<string, unknown> => {
    const o = objetoFalso(s);
    objetos.push(o);
    return o;
  };
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
  return { cena, textosVisiveis: () => objetos.filter((o) => o['visible'] === true && typeof id(o) === 'string').map((o) => id(o) as string) };
}

describe('balão das Cinzas (GA3)', () => {
  it('aparece no Resultado quando pedido (com ou sem mancha) e fecha ao fechar', () => {
    const { cena, textosVisiveis } = montar();
    cena.mostrarResultado(R, true);
    expect(cena.balaoAberto).toBe(true);
    expect(textosVisiveis()).toContain('A2.TUTORIAL.05');
    cena.fecharBalao();
    expect(cena.balaoAberto).toBe(false);
    expect(textosVisiveis()).not.toContain('A2.TUTORIAL.05');
  });

  it('não aparece quando não pedido (segundo Apagar, Abandonar, Amanhecer)', () => {
    const { cena, textosVisiveis } = montar();
    cena.mostrarResultado({ ...R, causa: CAUSA_DO_FIM.abandonar });
    expect(cena.balaoAberto).toBe(false);
    expect(textosVisiveis()).not.toContain('A2.TUTORIAL.05');
    expect(textosVisiveis()).toContain('A7.RESULTADO.VOLTAR');
  });
});

describe('toque no modo resultado', () => {
  it('soltouNoResultado liga com um dedo solto em qualquer ponto e desliga no frame seguinte', () => {
    const fila = new FilaDeToques();
    fila.reiniciar();
    const trad = new TradutorDeGestos();
    trad.reiniciar();
    trad.definirArea(insetsZerados());
    trad.mudarModo('resultado');
    const cmd = criarComandos();
    fila.empurrar(T.inicio, 1, 10, 100, 0);
    fila.empurrar(T.fim, 1, 10, 100, 10);
    trad.traduzir(fila, cmd, 20);
    expect([trad.soltouNoResultado, trad.toqueNoResultado]).toEqual([true, null]);
    trad.traduzir(fila, cmd, 40);
    expect(trad.soltouNoResultado).toBe(false);
  });
});
