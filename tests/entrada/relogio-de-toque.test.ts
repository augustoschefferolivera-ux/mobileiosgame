// PS5 (design/decisoes-F-010.md, F-010.14): com o `timeStamp` do toque a mais de 60.000 ms de `performance.now()`, a camada de toque
// grava `performance.now()` no lugar, e o swipe de teste continua reconhecido pelo tradutor.
import { describe, expect, it } from 'vitest';
import { CamadaDeToque, RELOGIO_DE_TOQUE_SUSPEITO_MS } from '../../src/entrada/camadaDeToque';
import { FilaDeToques } from '../../src/entrada/filaDeToques';
import { TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { ACAO, criarComandos } from '../../src/logica/nucleo/comandos';
import { insetsZerados } from '../../src/plataforma/safeArea';

type Ouvinte = (e: unknown) => void;

function montar(agoraAtual: { v: number }) {
  const ouvintes = new Map<string, Ouvinte>();
  const alvo = {
    addEventListener: (tipo: string, fn: Ouvinte) => void ouvintes.set(tipo, fn),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
    ownerDocument: { defaultView: null, addEventListener: () => {} },
  };
  const fila = new FilaDeToques();
  fila.reiniciar();
  const camada = new CamadaDeToque(alvo as unknown as HTMLElement, false, fila, () => agoraAtual.v);
  camada.ligar();
  const toque = (tipo: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number, timeStamp: number): void => {
    const t = { identifier: 1, clientX: x, clientY: y };
    ouvintes.get(tipo)!({ cancelable: true, preventDefault() {}, changedTouches: [t], touches: tipo === 'touchend' ? [] : [t], timeStamp });
  };
  return { camada, fila, toque };
}

describe('relógio dos toques (PS5)', () => {
  it('timeStamp perto de performance.now(): grava o timeStamp do evento', () => {
    const agora = { v: 5000 };
    const { camada, fila, toque } = montar(agora);
    toque('touchstart', 100, 600, 4990);
    expect(camada.relogioDeToque).toBe('timeStamp');
    expect(fila.eventos[4]).toBe(4990);
  });

  it('timeStamp 90.000 ms à frente: passa a gravar performance.now() em todos os toques da sessão', () => {
    const agora = { v: 5000 };
    const { camada, fila, toque } = montar(agora);
    toque('touchstart', 100, 600, 5000 + 90_000);
    agora.v = 5080;
    toque('touchmove', 150, 600, 5080 + 90_000);
    expect(camada.relogioDeToque).toBe('performance');
    expect([fila.eventos[4], fila.eventos[9]]).toEqual([5000, 5080]);
    expect(90_000).toBeGreaterThan(RELOGIO_DE_TOQUE_SUSPEITO_MS);
  });

  it('o swipe de teste (50 pt em 80 ms) continua reconhecido com o relógio trocado', () => {
    const agora = { v: 1000 };
    const { fila, toque } = montar(agora);
    const trad = new TradutorDeGestos();
    trad.reiniciar();
    trad.definirArea(insetsZerados());
    toque('touchstart', 100, 600, 1000 + 90_000);
    agora.v = 1080;
    toque('touchmove', 150, 600, 1080 + 90_000);
    const cmd = criarComandos();
    trad.traduzir(fila, cmd, 1080);
    expect(cmd.acoes[0]).toBe(ACAO.esquiva);
  });
});
