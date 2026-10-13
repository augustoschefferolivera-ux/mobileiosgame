// Simulação de 20 min (design/decisoes-F-005.md P6): só confere que o script roda
// 3.600 passos nos três comportamentos, que duas execuções dão o mesmo JSON e que
// os campos existem. Os números (níveis, DPS) não são gate.
import { describe, expect, it } from 'vitest';
import { COMPORTAMENTOS, simular } from '../scripts/sim20';

const OPCOES = { seeds: [1], passos: 3600, comportamentos: COMPORTAMENTOS } as const;

describe('sim20', () => {
  const a = simular(OPCOES);

  // Prazo explícito: 3 comportamentos × 3.600 passos com a Fogueira e o chefe passam
  // dos 5 s padrão do Vitest com a máquina ocupada; o teste é de determinismo, não de tempo.
  it('duas execuções dão o mesmo JSON', () => {
    expect(JSON.stringify(simular(OPCOES))).toBe(JSON.stringify(a));
  }, 60_000);

  it('o jogador parado morre em poucos segundos, com e sem a Brasa Firme (AG8), em 8 seeds', () => {
    for (const lado of [a.tempoAteAMorte.comBrasaFirme, a.tempoAteAMorte.semBrasaFirme]) {
      expect(Object.keys(lado)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
      for (const passos of Object.values(lado)) {
        expect(passos).not.toBeNull();
        expect(passos!).toBeGreaterThan(60);
        expect(passos!).toBeLessThan(900);
      }
    }
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
      expect(r.picoDePickups).toBeLessThanOrEqual(r.capacidadeDePickups);
      expect(r.creditosDiretosDeAlma).toBeGreaterThanOrEqual(0);
      expect(r.juncoes).toBeGreaterThanOrEqual(0);
      expect(r.bolsas).toBeGreaterThanOrEqual(0);
      expect(r.marcos).toEqual([]);
      expect(r).toHaveProperty('minutoEspada8Elmo');
    }
  });
});
