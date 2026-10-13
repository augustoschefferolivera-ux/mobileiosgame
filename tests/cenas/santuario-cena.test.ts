// A cena Santuario (design/decisoes-F-010.md SN1, SN2, FD2, GA2, SN6) com um Phaser falso: a cena é criada, os toques chegam
// pelo `aoSoltar` da camada (como no touchend) e o que o jogador veria é lido dos ids de texto visíveis e do meta gravado.
import './ambientePhaser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alvosDaArvore, alvosDoSantuario, type Alvo } from '../../src/entrada/alvos';
import type { ContextoDoJogo } from '../../src/cenas/contexto';
import { Santuario } from '../../src/cenas/Santuario';
import { NO } from '../../src/logica/progressao/fundacao';
import { MARCO, metaPadrao, type Meta } from '../../src/logica/save/meta';
import { insetsZerados } from '../../src/plataforma/safeArea';

/** Um objeto de cena qualquer: toda chamada devolve ele mesmo; guarda o texto, a visibilidade e os dados. */
function objetoFalso(texto = ''): Record<string, unknown> {
  const dados = new Map<string, unknown>();
  const base: Record<string, unknown> = { visible: true, text: texto, height: 20, width: 100 };
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

interface Montagem {
  cena: Santuario;
  tocar: (a: Alvo) => void;
  visiveis: () => string[];
  gravados: Meta[];
  inicios: string[];
  ctx: ContextoDoJogo;
}

function montar(meta: Meta): Montagem {
  const gravados: Meta[] = [];
  const inicios: string[] = [];
  let aoSoltar: ((x: number, y: number) => void) | null = null;
  const objetos: Record<string, unknown>[] = [];
  const ctx = {
    meta: { atual: meta, armazenamento: { gravar: (m: Meta) => (gravados.push(m), true) } },
    sonda: {},
    container: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) },
    insets: insetsZerados(),
    santuario: null,
    persistido: null,
    camada: { aoSoltar: (f: (x: number, y: number) => void) => (aoSoltar = f), removerAoSoltar: () => {} },
  } as unknown as ContextoDoJogo;
  const cena = new Santuario(ctx);
  const fab = (): Record<string, unknown> => {
    const o = objetoFalso();
    objetos.push(o);
    return o;
  };
  Object.assign(cena as unknown as Record<string, unknown>, {
    add: { graphics: fab, text: (_x: number, _y: number, s: string) => { const o = objetoFalso(s); objetos.push(o); return o; } },
    cameras: { main: { setZoom: () => ({ centerOn: () => {} }) } },
    scale: { on: () => {}, off: () => {} },
    events: { once: () => {} },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) } },
    scene: { start: (k: string) => inicios.push(k) },
  });
  cena.create();
  return {
    cena,
    ctx,
    gravados,
    inicios,
    tocar: (a) => aoSoltar!(a.x + a.largura / 2, a.y + a.altura / 2),
    visiveis: () => objetos.filter((o) => o['visible'] === true && typeof (o['getData'] as (c: string) => unknown)?.('idTexto') === 'string').map((o) => (o['getData'] as (c: string) => string)('idTexto')),
  };
}

const alvoDoSantuario = (id: string): Alvo => alvosDoSantuario(insetsZerados(), []).find((a) => a.id === id)!;
const alvoDaArvore = (id: string): Alvo => alvosDaArvore(insetsZerados(), []).find((a) => a.id === id)!;
const aposApagar = (almas: number): Meta => ({ ...metaPadrao(), almas, primeiroApagarFeito: true, vigiliasConcluidas: 1 });

beforeEach(() => {
  vi.stubGlobal('getComputedStyle', () => ({ paddingTop: '0', paddingRight: '0', paddingBottom: '0', paddingLeft: '0' }));
  vi.stubGlobal('navigator', { userAgent: 'node' });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('cena Santuario', () => {
  it('a primeira chegada (sem Vigília): barra de Almas e Brasas, Iselda e o botão Vigília; a árvore e o convite fechados', () => {
    const m = montar(metaPadrao());
    expect(m.ctx.tela).toBe('SANTUARIO');
    const v = m.visiveis();
    expect(v).toEqual(expect.arrayContaining(['A9.SANTUARIO.ALMAS', 'A9.SANTUARIO.BRASAS', 'A9.SANTUARIO.ISELDA', 'A9.SANTUARIO.VIGILIA']));
    expect(v).not.toContain('A9.SANTUARIO.ARVORE');
    expect(v).not.toContain('A8.SISTEMA.CONVITE_PWA');
    expect(m.ctx.santuario?.arvoreAberta).toBe(false);
  });

  it('o botão Vigília inicia a Vigília (uma vez só)', () => {
    const m = montar(metaPadrao());
    m.tocar(alvoDoSantuario('vigilia'));
    m.tocar(alvoDoSantuario('vigilia'));
    expect(m.inicios).toEqual(['Vigilia']);
  });

  it('depois do 1º Apagar a árvore abre sozinha com a fala de Iselda; 2 toques em Fôlego de forja compram (Almas − 300, rank 1) e ligam o marco', () => {
    const m = montar(aposApagar(300));
    expect(m.ctx.santuario).toMatchObject({ arvoreAberta: true, selecionado: NO.folego, falaDeIselda: true });
    expect(m.visiveis()).toEqual(expect.arrayContaining(['A9.SANTUARIO.ARVORE', 'A9.SANTUARIO.ISELDA_FALA_01', 'G1.FOLEGO_DE_FORJA.NOME', 'G1.FOLEGO_DE_FORJA.EFEITO', 'G2.FOLEGO_DE_FORJA.MEMORIA', 'A9.SANTUARIO.PESQUISAR']));
    m.tocar(alvoDaArvore(`no${NO.folego}`));
    expect(m.gravados).toHaveLength(0);
    m.tocar(alvoDaArvore(`no${NO.folego}`));
    const g = m.gravados.at(-1)!;
    expect([g.almas, g.fundacao.ranks[NO.folego], g.fundacao.gasto, g.marcos]).toEqual([0, 1, 300, MARCO.iselda]);
    expect(m.ctx.meta.atual).toBe(g);
    expect(m.visiveis()).not.toContain('A9.SANTUARIO.ISELDA_FALA_01');
  });

  it('em standalone, a compra pede navigator.storage.persist() e o resultado vai ao contexto (ST2); fora dele, não pede', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { userAgent: 'node', standalone: true, storage: { persist } });
    const m = montar({ ...aposApagar(1000), marcos: MARCO.iselda });
    m.tocar(alvoDoSantuario('iselda'));
    m.tocar(alvoDaArvore(`no${NO.pele}`));
    expect(persist).not.toHaveBeenCalled();
    m.tocar(alvoDaArvore(`no${NO.pele}`));
    await Promise.resolve();
    await Promise.resolve();
    expect([persist.mock.calls.length, m.ctx.persistido]).toEqual([1, true]);
    vi.stubGlobal('navigator', { userAgent: 'node', storage: { persist } });
    m.tocar(alvoDaArvore(`no${NO.pele}`));
    await Promise.resolve();
    expect(persist.mock.calls.length).toBe(1);
  });

  it('sem Almas: o 2º toque não compra nem grava e mostra a recusa', () => {
    const m = montar({ ...aposApagar(100), marcos: MARCO.iselda });
    m.tocar(alvoDoSantuario('iselda'));
    expect(m.ctx.santuario?.arvoreAberta).toBe(true);
    m.tocar(alvoDaArvore(`no${NO.casco}`));
    m.tocar(alvoDaArvore(`no${NO.casco}`));
    expect(m.gravados).toHaveLength(0);
    expect(m.visiveis()).toContain('A9.SANTUARIO.SEM_ALMAS');
  });

  it('Reembolsar em dois toques devolve as Almas; Voltar fecha a árvore', () => {
    const m = montar({ ...aposApagar(1000), marcos: MARCO.iselda });
    m.tocar(alvoDoSantuario('iselda'));
    m.tocar(alvoDaArvore(`no${NO.pele}`));
    m.tocar(alvoDaArvore(`no${NO.pele}`));
    expect(m.ctx.meta.atual.almas).toBe(700);
    m.tocar(alvoDaArvore('reembolsar'));
    expect(m.visiveis()).toContain('A9.SANTUARIO.REEMBOLSAR_CONFIRMA');
    m.tocar(alvoDaArvore('reembolsar'));
    expect([m.ctx.meta.atual.almas, m.ctx.meta.atual.fundacao.gasto]).toEqual([1000, 0]);
    m.tocar(alvoDaArvore('voltar'));
    expect(m.ctx.santuario?.arvoreAberta).toBe(false);
  });

  it('o convite aparece depois da 1ª Vigília (com Iselda já vista) e "Agora não" grava conviteRecusadoEm', () => {
    const m = montar({ ...aposApagar(500), marcos: MARCO.iselda });
    expect(m.visiveis()).toEqual(expect.arrayContaining(['A8.SISTEMA.CONVITE_PWA', 'A8.SISTEMA.CONVITE_PASSOS', 'A8.SISTEMA.AGORA_NAO']));
    const v = alvoDoSantuario('vigilia');
    m.tocar({ ...v, y: v.y - 16 - v.altura, id: 'agoraNao' });
    expect(m.gravados.at(-1)?.conviteRecusadoEm).toBe(1);
    expect(m.visiveis()).not.toContain('A8.SISTEMA.CONVITE_PWA');
  });
});
