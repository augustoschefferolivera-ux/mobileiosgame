// PWA (design/decisoes-F-010.md ST2, PW3): modo instalado, convite e persistência, com navegador e janela falsos.
import { describe, expect, it, vi } from 'vitest';
import { metaPadrao, type Meta } from '../../src/logica/save/meta';
import { ehStandalone, convitePendente, pedirPersistencia } from '../../src/plataforma/pwa';

const meta = (vigilias: number, recusadoEm: number | null): Meta => ({ ...metaPadrao(), vigiliasConcluidas: vigilias, conviteRecusadoEm: recusadoEm });
const janela = (instalado: boolean) => ({ matchMedia: (q: string) => ({ matches: instalado && q.includes('standalone') }) });

describe('modo instalado', () => {
  it('navigator.standalone (iOS) ou display-mode: standalone', () => {
    expect(ehStandalone({ standalone: true }, janela(false))).toBe(true);
    expect(ehStandalone({}, janela(true))).toBe(true);
    expect(ehStandalone({}, janela(false))).toBe(false);
    expect(ehStandalone({}, {})).toBe(false);
  });
});

describe('convitePendente (PW3)', () => {
  it('só depois da 1ª Vigília concluída e fora do modo instalado', () => {
    expect(convitePendente(meta(0, null), false)).toBe(false);
    expect(convitePendente(meta(1, null), false)).toBe(true);
    expect(convitePendente(meta(1, null), true)).toBe(false);
  });

  it('depois de "Agora não" só volta com 5 Vigílias a mais', () => {
    expect(convitePendente(meta(1, 1), false)).toBe(false);
    expect(convitePendente(meta(5, 1), false)).toBe(false);
    expect(convitePendente(meta(6, 1), false)).toBe(true);
  });
});

describe('pedirPersistencia (ST2)', () => {
  it('em standalone chama persist e devolve a resposta (true ou false)', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    expect(await pedirPersistencia({ standalone: true, storage: { persist } }, janela(false))).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await pedirPersistencia({ standalone: true, storage: { persist: () => Promise.resolve(false) } }, janela(false))).toBe(false);
  });

  it('fora do modo instalado não chama persist; sem a API ou com falha devolve null sem lançar', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    expect(await pedirPersistencia({ storage: { persist } }, janela(false))).toBeNull();
    expect(persist).not.toHaveBeenCalled();
    expect(await pedirPersistencia({ standalone: true }, janela(false))).toBeNull();
    expect(await pedirPersistencia({ standalone: true, storage: { persist: () => Promise.reject(new Error('negado')) } }, janela(false))).toBeNull();
  });
});
