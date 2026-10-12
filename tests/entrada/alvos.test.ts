// F-001.13 e F-002.7: com insets de safe-area não nulos, nenhum alvo de toque
// cai dentro deles; todo alvo tem pelo menos 72 pt (B §3.5), inclusive a área
// do joystick da Vigília (design/decisoes-F-002.md §4 e §8).
import { describe, expect, it } from 'vitest';
import {
  ALVO_MINIMO_PT,
  ALVOS_POR_TELA,
  acharAlvo,
  alvoDaPausa,
  alvoDoAparo,
  alvoInvadeInsets,
  alvosDaTelaDePausa,
  alvosDaVigilia,
  alvosDoAcender,
  areaDoJoystick,
  type Alvo,
} from '../../src/entrada/alvos';
import { clienteParaPontos } from '../../src/entrada/camadaDeToque';
import { insetsZerados, type Insets } from '../../src/plataforma/safeArea';

const CASOS: [string, Insets][] = [
  ['sem insets', insetsZerados()],
  ['Dynamic Island + barra inicial (59/34)', { topo: 59, direita: 0, baixo: 34, esquerda: 0 }],
  ['notch (47/34)', { topo: 47, direita: 0, baixo: 34, esquerda: 0 }],
  ['laterais (paisagem simulada)', { topo: 0, direita: 59, baixo: 21, esquerda: 59 }],
  ['extremo', { topo: 120, direita: 40, baixo: 120, esquerda: 40 }],
];

describe.each(Object.entries(ALVOS_POR_TELA))('tela %s', (_tela, gerar) => {
  it.each(CASOS)('%s: alvos ≥ 72 pt e fora dos insets', (_nome, insets) => {
    const alvos = gerar(insets, []);
    expect(alvos.length).toBeGreaterThan(0);
    for (const a of alvos) {
      expect(a.largura, a.id).toBeGreaterThanOrEqual(ALVO_MINIMO_PT);
      expect(a.altura, a.id).toBeGreaterThanOrEqual(ALVO_MINIMO_PT);
      expect(alvoInvadeInsets(a, insets), a.id).toBe(false);
    }
  });
});

describe('área do joystick (F-002.7)', () => {
  it('em retrato sem insets: x de 0 a 234 pt e y de 422 pt até a borda de baixo', () => {
    expect(alvosDaVigilia(insetsZerados(), [])[1]).toEqual({ id: 'joystick', x: 0, y: 422, largura: 234, altura: 422 });
  });

  it('ancorada na safe-area: começa no inset esquerdo, termina acima do inset de baixo, 60% da largura útil', () => {
    const ins: Insets = { topo: 59, direita: 40, baixo: 34, esquerda: 30 };
    const a = areaDoJoystick(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    expect(a).toEqual({ id: 'joystick', x: 30, y: 422, largura: 0.6 * (390 - 70), altura: 844 - 34 - 422 });
    // Com um inset de cima maior que a metade da tela, a área começa abaixo dele.
    expect(areaDoJoystick({ ...ins, topo: 500 }, a).y).toBe(500);
  });

  it.each(CASOS)('%s: os 40% da direita da largura útil ficam livres para os botões (o Aparo fica todo à direita da área)', (_nome, insets) => {
    const limite = insets.esquerda + 0.6 * (390 - insets.esquerda - insets.direita);
    for (const a of alvosDaVigilia(insets, [])) {
      if (a.id === 'aparo') expect(a.x).toBeGreaterThanOrEqual(limite - 1e-9);
      else expect(a.x + a.largura).toBeLessThanOrEqual(limite + 1e-9);
    }
  });
});

describe('pausa (design/decisoes-F-004.md P1, P6)', () => {
  it.each(CASOS)('%s: o botão de pausa tem 72 × 72 pt no canto superior esquerdo da área segura e não toca a área do joystick', (_nome, insets) => {
    const [pausa, joystick] = alvosDaVigilia(insets, []);
    expect(pausa).toEqual({ id: 'pausa', x: insets.esquerda, y: insets.topo, largura: 72, altura: 72 });
    expect(pausa!.y + pausa!.altura).toBeLessThanOrEqual(joystick!.y);
  });

  it('com inset de 34 pt embaixo: Continuar em y 714 e a opção em y 626, os dois com 288 × 72 pt, centrados', () => {
    const ins: Insets = { topo: 59, direita: 0, baixo: 34, esquerda: 0 };
    expect(alvosDaTelaDePausa(ins, [])).toEqual([
      { id: 'numeros', x: 51, y: 626, largura: 288, altura: 72 },
      { id: 'continuar', x: 51, y: 714, largura: 288, altura: 72 },
    ]);
  });

  it.each(CASOS)('%s: os alvos da pausa ficam na zona de controles (y ≥ 0,65 da altura útil), sem sobreposição', (_nome, insets) => {
    const [numeros, continuar] = alvosDaTelaDePausa(insets, []);
    const util = 844 - insets.topo - insets.baixo;
    expect(numeros!.y - insets.topo).toBeGreaterThanOrEqual(0.65 * util);
    expect(numeros!.y + numeros!.altura).toBeLessThanOrEqual(continuar!.y);
  });
});

describe('hit-test', () => {
  it('acha o botão de Acender no centro e nada fora dele', () => {
    const alvos = alvosDoAcender({ topo: 59, direita: 0, baixo: 34, esquerda: 0 }, []);
    const b = alvos[0]!;
    expect(acharAlvo(alvos, b.x + b.largura / 2, b.y + b.altura / 2)?.id).toBe('acender');
    expect(acharAlvo(alvos, b.x - 1, b.y)).toBeNull();
    expect(acharAlvo(alvos, b.x, b.y + b.altura)).toBeNull();
  });

  it('alvoInvadeInsets detecta cada lado', () => {
    const ins: Insets = { topo: 10, direita: 10, baixo: 10, esquerda: 10 };
    const base: Alvo = { id: 'a', x: 100, y: 100, largura: 72, altura: 72 };
    expect(alvoInvadeInsets(base, ins)).toBe(false);
    expect(alvoInvadeInsets({ ...base, y: 5 }, ins)).toBe(true);
    expect(alvoInvadeInsets({ ...base, x: 5 }, ins)).toBe(true);
    expect(alvoInvadeInsets({ ...base, x: 390 - 72 - 5 }, ins)).toBe(true);
    expect(alvoInvadeInsets({ ...base, y: 844 - 72 - 5 }, ins)).toBe(true);
  });

  it('converte clientX/clientY em pt pela caixa do canvas', () => {
    const p = { x: 0, y: 0 };
    clienteParaPontos(41.6 + 153.4, 332, { left: 41.6, top: 0, width: 306.8, height: 664 }, p);
    expect(p.x).toBeCloseTo(195, 6);
    expect(p.y).toBeCloseTo(422, 6);
  });
});

describe('botão Aparo (design/decisoes-F-006.md AP1)', () => {
  const novo = (): Alvo => ({ id: '', x: 0, y: 0, largura: 0, altura: 0 });

  it('80 × 80 pt a 24 pt dos insets: sem insets x 286 a 366 e y 740 a 820; com a barra do iPhone (baixo 34) y 706 a 786', () => {
    expect(alvoDoAparo(insetsZerados(), novo())).toEqual({ id: 'aparo', x: 286, y: 740, largura: 80, altura: 80 });
    expect(alvoDoAparo({ topo: 59, direita: 0, baixo: 34, esquerda: 0 }, novo())).toMatchObject({ x: 286, y: 706, largura: 80, altura: 80 });
    expect(alvoDoAparo({ topo: 0, direita: 59, baixo: 0, esquerda: 0 }, novo()).x).toBe(390 - 59 - 24 - 80);
  });

  it('entra em alvosDaVigilia depois da pausa e da área do joystick', () => {
    expect(alvosDaVigilia(insetsZerados(), []).map((a) => a.id)).toEqual(['pausa', 'joystick', 'aparo']);
  });

  it.each(CASOS)('%s: fora dos insets, sem cruzar a área do joystick nem o botão de pausa, com a caixa do Frasco (72 pt, 16 pt acima) cabendo', (_nome, insets) => {
    const aparo = alvoDoAparo(insets, novo());
    const joystick = areaDoJoystick(insets, novo());
    const pausa = alvoDaPausa(insets, novo());
    expect(alvoInvadeInsets(aparo, insets)).toBe(false);
    expect(aparo.x).toBeGreaterThanOrEqual(joystick.x + joystick.largura);
    const cruza = (a: Alvo, b: Alvo): boolean => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;
    expect(cruza(aparo, pausa)).toBe(false);
    const frasco: Alvo = { id: 'frasco', x: aparo.x + 4, y: aparo.y - 16 - 72, largura: 72, altura: 72 };
    expect(alvoInvadeInsets(frasco, insets)).toBe(false);
    expect(cruza(frasco, joystick)).toBe(false);
    expect(cruza(frasco, pausa)).toBe(false);
    expect(cruza(frasco, aparo)).toBe(false);
  });

  it('na vertical sem insets, 52 pt à direita da área do joystick', () => {
    const insets = insetsZerados();
    expect(alvoDoAparo(insets, novo()).x - (areaDoJoystick(insets, novo()).x + areaDoJoystick(insets, novo()).largura)).toBe(52);
  });
});
