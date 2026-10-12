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
  alvosDoBau,
  alvosDoResultado,
  blocoDaPausa,
  caixaDaOpcao,
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

  it.each(CASOS)('%s: os 40% da direita da largura útil ficam livres para os botões (o Aparo e o Frasco ficam todos à direita da área)', (_nome, insets) => {
    const limite = insets.esquerda + 0.6 * (390 - insets.esquerda - insets.direita);
    for (const a of alvosDaVigilia(insets, [])) {
      if (a.id === 'aparo' || a.id === 'frasco') expect(a.x).toBeGreaterThanOrEqual(limite - 1e-9);
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
    // Som e Flashes (FB3) vêm depois do Continuar: o baú usa o índice 1.
    expect(alvosDaTelaDePausa(ins, [])).toEqual([
      { id: 'numeros', x: 51, y: 626, largura: 288, altura: 72 },
      { id: 'continuar', x: 51, y: 714, largura: 288, altura: 72 },
      { id: 'som', x: 51, y: 546, largura: 136, altura: 72 },
      { id: 'flashes', x: 203, y: 546, largura: 136, altura: 72 },
      { id: 'abandonar', x: 51, y: 458, largura: 288, altura: 72 },
    ]);
  });

  it.each(CASOS)('%s: os alvos da pausa ficam na zona de controles (y ≥ 0,65 da altura útil), sem sobreposição', (_nome, insets) => {
    const [numeros, continuar] = alvosDaTelaDePausa(insets, []);
    const util = 844 - insets.topo - insets.baixo;
    expect(numeros!.y - insets.topo).toBeGreaterThanOrEqual(0.65 * util);
    expect(numeros!.y + numeros!.altura).toBeLessThanOrEqual(continuar!.y);
  });
});

describe('Som e Flashes na pausa (design/decisoes-F-006.md FB3 e RE11)', () => {
  const FB3: [string, Insets][] = [
    ['sem insets', insetsZerados()],
    ['iPhone 47/34', { topo: 47, direita: 0, baixo: 34, esquerda: 0 }],
    ['topo 20, baixo 0', { topo: 20, direita: 0, baixo: 0, esquerda: 0 }],
    ['do baú: 47/34 com laterais de 10', { topo: 47, direita: 10, baixo: 34, esquerda: 10 }],
  ];
  const cruza = (a: Alvo, b: Alvo): boolean => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;

  it.each(FB3)('%s: dois alvos de 136 × 72 pt lado a lado (16 pt entre eles, 8 pt acima de "números"), sem sobreposição, y ≥ corte de 65% da altura útil', (_nome, ins) => {
    const [numeros, continuar, som, flashes] = alvosDaTelaDePausa(ins, []);
    expect([som!.id, flashes!.id]).toEqual(['som', 'flashes']);
    for (const a of [som!, flashes!]) {
      expect([a.largura, a.altura]).toEqual([136, 72]);
      expect(alvoInvadeInsets(a, ins)).toBe(false);
      expect(a.y - ins.topo).toBeGreaterThanOrEqual(0.65 * (844 - ins.topo - ins.baixo) - 1e-9);
      for (const outro of [numeros!, continuar!]) expect(cruza(a, outro), `${a.id} × ${outro.id}`).toBe(false);
    }
    expect(cruza(som!, flashes!)).toBe(false);
    expect(flashes!.x - (som!.x + som!.largura)).toBe(16);
    expect(numeros!.y - (som!.y + som!.altura)).toBe(8);
    // Centrados na área segura.
    expect(som!.x - ins.esquerda).toBeCloseTo(390 - ins.direita - (flashes!.x + flashes!.largura), 9);
  });

  it('a lista põe o Continuar no índice 1 e o do baú também (alvosDoBau)', () => {
    for (const [, ins] of FB3) {
      expect(alvosDaTelaDePausa(ins, [])[1]!.id).toBe('continuar');
      expect(alvosDoBau(ins, [])[0]!.id).toBe('continuar');
    }
  });

  it('a caixa de cada opção da dupla fica a 12 pt da direita do alvo, centrada na altura', () => {
    const [, , som] = alvosDaTelaDePausa(insetsZerados(), []);
    expect(caixaDaOpcao(som!, 12)).toEqual({ x: som!.x + 136 - 12 - 28, y: som!.y + 22 });
  });

  it('com a área segura estreita a dupla encolhe sem invadir os insets', () => {
    const ins: Insets = { topo: 0, direita: 59, baixo: 21, esquerda: 59 };
    const [, , som, flashes] = alvosDaTelaDePausa(ins, []);
    expect(som!.largura).toBe(128);
    expect(alvoInvadeInsets(som!, ins) || alvoInvadeInsets(flashes!, ins)).toBe(false);
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

  it('entra em alvosDaVigilia depois da pausa, da área do joystick e do Frasco depois dele', () => {
    expect(alvosDaVigilia(insetsZerados(), []).map((a) => a.id)).toEqual(['pausa', 'joystick', 'aparo', 'frasco']);
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

describe('Abandonar e o bloco acima dele (design/decisoes-F-007.md PE3)', () => {
  const alturas: [string, Insets][] = [
    ['844 (notch 47/34)', { topo: 47, direita: 0, baixo: 34, esquerda: 0 }],
    ['812 (sem rodapé)', { topo: 44, direita: 0, baixo: 0, esquerda: 0 }],
    ['736 (barra de 20 pt)', { topo: 20, direita: 0, baixo: 0, esquerda: 0 }],
    ['667 (barra de 20 pt)', { topo: 20, direita: 0, baixo: 0, esquerda: 0 }],
  ];

  it('o Abandonar tem 288 × 72 pt, 16 pt acima de Som e Flashes e é o mais longe do Continuar', () => {
    const ins: Insets = { topo: 47, direita: 0, baixo: 34, esquerda: 0 };
    const alvos = alvosDaTelaDePausa(ins, []);
    const por = (id: string): Alvo => alvos.find((a) => a.id === id)!;
    expect([por('abandonar').largura, por('abandonar').altura, por('som').y - (por('abandonar').y + 72)]).toEqual([288, 72, 16]);
    expect(Math.max(...alvos.map((a) => Math.abs(a.y - por('continuar').y)))).toBe(por('continuar').y - por('abandonar').y);
  });

  it.each(alturas)('%s: nenhum alvo da pausa se sobrepõe, todos têm ≥ 72 pt e ficam na área segura; o aviso e as estatísticas cabem acima do botão', (_nome, ins) => {
    const alvos = alvosDaTelaDePausa(ins, []);
    for (const a of alvos) {
      expect(a.altura).toBeGreaterThanOrEqual(72);
      expect(a.largura).toBeGreaterThanOrEqual(72);
      expect(alvoInvadeInsets(a, ins)).toBe(false);
    }
    for (let i = 0; i < alvos.length; i++) {
      for (let j = i + 1; j < alvos.length; j++) {
        const a = alvos[i]!;
        const b = alvos[j]!;
        expect(a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura, `${a.id} × ${b.id}`).toBe(false);
      }
    }
    const abandonar = alvos.find((a) => a.id === 'abandonar')!;
    const bloco = blocoDaPausa(abandonar, ins.topo + 120);
    expect(bloco.yDoAviso + 2 * 18).toBeLessThanOrEqual(abandonar.y - 18 + 1e-9);
    expect(bloco.yDasEstatisticas + bloco.linhasDasEstatisticas * 18).toBeLessThanOrEqual(bloco.yDoAviso - 28 + 1e-9);
  });

  it.each([...alturas, ['59/34 (ilha dinâmica)', { topo: 59, direita: 0, baixo: 34, esquerda: 0 } as Insets]] as [string, Insets][])(
    '%s com a build cheia (11 linhas): o aviso e as estatísticas não encostam na build nem entre si (risco da D7 PE3)',
    (_nome, ins) => {
      const fimDaBuild = ins.topo + 56 + 11 * 18; // Pausa.ts: PRIMEIRA_LINHA_ABAIXO_DO_TOPO 56, ENTRE_LINHAS_DA_BUILD 18
      const abandonar = alvosDaTelaDePausa(ins, []).find((a) => a.id === 'abandonar')!;
      const bloco = blocoDaPausa(abandonar, fimDaBuild);
      expect(bloco.yDasEstatisticas).toBeGreaterThanOrEqual(fimDaBuild);
      expect(bloco.yDasEstatisticas + bloco.linhasDasEstatisticas * 18).toBeLessThanOrEqual(bloco.yDoAviso);
      expect(bloco.yDoAviso + 2 * 18).toBeLessThan(abandonar.y);
    },
  );

  it('com folga as estatísticas ocupam 3 linhas (y 322 a 376 em 844); sem folga, uma linha só', () => {
    const abandonar = alvosDaTelaDePausa({ topo: 47, direita: 0, baixo: 34, esquerda: 0 }, []).find((a) => a.id === 'abandonar')!;
    expect(blocoDaPausa(abandonar, 300)).toEqual({ yDoAviso: 404, yDasEstatisticas: 322, linhasDasEstatisticas: 3 });
    expect(blocoDaPausa(abandonar, 340)).toEqual({ yDoAviso: 404, yDasEstatisticas: 358, linhasDasEstatisticas: 1 });
  });

  it('o Resultado tem Voltar e Repetir de 288 × 72 pt dentro da área segura, sem se tocar', () => {
    for (const [, ins] of CASOS.slice(0, 3)) {
      const [voltar, repetir] = alvosDoResultado(ins, []);
      expect([voltar!.id, repetir!.id, voltar!.largura, voltar!.altura]).toEqual(['voltar', 'repetir', 288, 72]);
      expect(voltar!.y + voltar!.altura + 16).toBe(repetir!.y);
      expect(alvoInvadeInsets(repetir!, ins) || alvoInvadeInsets(voltar!, ins)).toBe(false);
    }
  });
});
