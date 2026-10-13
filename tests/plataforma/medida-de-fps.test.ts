import { describe, expect, it } from 'vitest';
import { contarRecargas, MedidorDeFpsPorHora } from '../../src/plataforma/medidaDeFps';
import { CAMPOS_DOS_EVENTOS, RegistroDeTelemetria } from '../../src/plataforma/telemetria';

describe('fps médio por Hora (D10 IP3, F-010)', () => {
  it('faz a média por Hora e guarda cada Hora à parte', () => {
    const m = new MedidorDeFpsPorHora();
    m.amostrar(1, 60);
    m.amostrar(1, 50);
    m.amostrar(4, 58);
    expect(m.mediaDaHora(1)).toBe(55);
    expect(m.mediaDaHora(2)).toBe(0);
    expect(m.porHora()).toEqual([55, 0, 0, 58, 0]);
    expect(m.mediaGeral()).toBeCloseTo((60 + 50 + 58) / 3, 9);
  });

  it('ignora Hora fora da faixa e fps inválido', () => {
    const m = new MedidorDeFpsPorHora();
    m.amostrar(0, 60);
    m.amostrar(6, 60);
    m.amostrar(1.5, 60);
    m.amostrar(2, Number.NaN);
    m.amostrar(2, -1);
    expect(m.porHora()).toEqual([0, 0, 0, 0, 0]);
    expect(m.mediaGeral()).toBe(0);
  });

  it('conta as recargas da aba: 0 no primeiro boot, +1 a cada boot seguinte', () => {
    const dados = new Map<string, string>();
    const storage = { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => void dados.set(k, v) };
    expect(contarRecargas(storage)).toBe(0);
    expect(contarRecargas(storage)).toBe(1);
    expect(contarRecargas(storage)).toBe(2);
    dados.set('vdc.boots', 'lixo');
    expect(contarRecargas(storage)).toBe(0);
  });

  it('sem sessionStorage, ou com ele a lançar, devolve 0 sem falhar', () => {
    expect(contarRecargas(null)).toBe(0);
    const quebrado = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => undefined };
    expect(contarRecargas(quebrado)).toBe(0);
  });

  it('o evento sessao leva fps_por_hora (LY4)', () => {
    expect(CAMPOS_DOS_EVENTOS.sessao).toContain('fps_por_hora');
    const r = new RegistroDeTelemetria();
    r.registrar('sessao', 10, {
      duracao: 1, vigilias: 1, saiu_em_fogueira: null, plataforma: null, aparelho: null, fps_medio: 58, memoria_pico: null,
      fps_por_hora: [60, 0, 0, 56, 0],
    });
    expect(r.eventos()[0]!.campos['fps_por_hora']).toEqual([60, 0, 0, 56, 0]);
  });
});
