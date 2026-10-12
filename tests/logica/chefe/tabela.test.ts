// A tabela do Lanterneiro (design/decisoes-F-009.md §0.A e §3): os números de chefes.json e combate.json compilados.
import { describe, expect, it } from 'vitest';
import { ATAQUE_DO_CHEFE } from '../../../src/logica/mundo/dados';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_DA_CHARNECA as D } from '../apoio';

describe('TabelaDoChefe', () => {
  const c = D.chefe;

  it('a caixa de 96 × 128, o círculo de 80, a velocidade de 1,08 px por passo e as distâncias (LN1, LN3, AB2)', () => {
    expect([c.meiaLargura, c.meiaAltura, c.circunraio]).toEqual([48, 64, 80]);
    expect(c.velocidade).toBeCloseTo(1.08, 12);
    expect([c.pararA, c.nasceA, c.recuperacaoInicial, c.esperaPosQuebra]).toEqual([96, 144, 120, 30]);
    expect(D.tipos.existe[TIPO.o_lanterneiro]).toBe(1);
    expect(D.tipos.grande[TIPO.o_lanterneiro]).toBe(1);
    expect(D.tipos.raio[TIPO.o_lanterneiro]).toBe(80);
    expect(D.tipos.contato[TIPO.o_lanterneiro]).toBe(0);
    expect(D.tipos.raioDeObstaculo).toBe(32);
  });

  it('HP, fases, Postura e Quebra (LN2, FS1, PO1 a PO3, PO6)', () => {
    expect([c.hpBase, c.hpPctPorNivel, c.almas]).toEqual([6500, 4, 200]);
    expect([...c.limiarPct]).toEqual([60, 25]);
    expect(c.transicaoPassos).toBe(90);
    expect([c.posturaMax, c.ganhoAparo, c.ganhoEsquiva, c.ganhoEspada, c.ganhoPesada, c.ganhoFaca]).toEqual([100, 25, 10, 2, 5, 0.5]);
    expect([c.quebraPassos, c.regenEspera, c.regenPorPasso, c.fatorForaPct, c.fatorQuebraPct]).toEqual([180, 60, Math.fround(20 / 60), 60, 200]);
  });

  it('os seis ataques: telegrafo, recuperação, dano, gatilho e cor (AT1 a AT6, §3)', () => {
    const a = ATAQUE_DO_CHEFE;
    const por = (v: ArrayLike<number>): number[] => [a.vara, a.bater, a.luzCega, a.lanterna, a.explosao, a.agarrar].map((i) => v[i]!);
    expect(por(c.telegrafo)).toEqual([42, 36, 60, 60, 60, 48]);
    expect(por(c.recuperacao)).toEqual([72, 90, 90, 72, 90, 90]);
    expect(por(c.dano)).toEqual([55, 70, 0, 0, 75, 0]);
    expect(por(c.gatilho)).toEqual([144, 208, 208, 320, 0, 128]);
    expect(por(c.aparavel)).toEqual([1, 1, 0, 0, 0, 1]);
  });

  it('Convocar, Explosão, cegueira, zonas, Agarrar, Fúria e A Fome (FS3, FS4, AT3, AT5, AT6, FU1, FM2)', () => {
    expect([c.convocaIntervalo, c.convocaCast, c.convocaRecuperacao, c.convocaPrimeira]).toEqual([600, 60, 60, 180]);
    expect([c.explosaoIntervalo, c.explosaoPrimeira, c.explosaoRaioIni, c.explosaoRaioFim, c.explosaoMeiaEspessura]).toEqual([720, 360, 32, 192, 12]);
    expect([c.cegoPassos, c.tickPassos, c.tickCego, c.tickZona]).toEqual([120, 10, 8 / 6, 1]);
    expect([c.zonaPassos, c.zonaRaio, c.zonasMaximas, c.agarrarPct, c.presoPassos]).toEqual([360, 64, 3, 20, 60]);
    expect([c.furiaInicio, c.furiaIntervalo, c.furiaPct]).toEqual([90_000, 600, 5]);
    expect([c.fomeTick, c.fomeBase, c.fomeDivisor, c.amanhecerPassos]).toEqual([10, 18, 1800, 600]);
  });
});
