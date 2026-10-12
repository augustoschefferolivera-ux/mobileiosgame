// Simulação de 20 min (design/decisoes-F-005.md P6): só confere que o script roda
// 3.600 passos nos três comportamentos, que duas execuções dão o mesmo JSON e que
// os campos existem. Os números (níveis, DPS) não são gate.
import { describe, expect, it } from 'vitest';
import { COMPORTAMENTOS, simular } from '../scripts/sim20';

const OPCOES = { seeds: [1], passos: 3600, comportamentos: COMPORTAMENTOS } as const;

describe('sim20', () => {
  const a = simular(OPCOES);

  it('duas execuções dão o mesmo JSON', () => {
    expect(JSON.stringify(simular(OPCOES))).toBe(JSON.stringify(a));
  });

  it('roda 3.600 passos nos três comportamentos e traz os campos', () => {
    expect(a.passos).toBe(3600);
    expect(Object.keys(a.resultados)).toEqual(['1']);
    expect(Object.keys(a.resultados['1']!)).toEqual(['parado', 'circulo', 'cacando']);
    for (const r of Object.values(a.resultados['1']!)) {
      expect(r.final.passo).toBe(3600);
      expect(r.final.nivel).toBeGreaterThanOrEqual(1);
      expect(r.final.dps).toBeGreaterThanOrEqual(0);
      expect(r.picoDeCinzas).toBeGreaterThanOrEqual(0);
      expect(r.juncoes).toBeGreaterThanOrEqual(0);
      expect(r.bolsas).toBeGreaterThanOrEqual(0);
      expect(r.marcos).toEqual([]);
      expect(r).toHaveProperty('minutoEspada8Elmo');
    }
  });
});
