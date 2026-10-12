// U7 da F-008 (design/decisoes-F-008.md §6): a simulação de 20 minutos com o Coroado, a Fogueira e o bot que descansa e forja.
// É medida, sem gate nem decisão: registra o minuto da 1ª União (baú ou Forja) e as Almas por Vigília contra os alvos do
// Q-21 (≈ 400 / 1.100 / 1.600). Com VDC_EVIDENCIAS=1 (scripts/verify.sh) roda os 72.000 passos da seed 1 nos três comportamentos
// e grava production/evidencias/F-008/u7.log, com a repetição de uma delas (`iguais=true`: a medida é determinística); sem
// ele, só confere em 3.600 passos que o bot funciona e que as medidas existem.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPORTAMENTOS, simularUma, type Resultado } from '../scripts/sim20';

const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';
const PASSOS = EVIDENCIAS ? 72000 : 3600;
const SEED = 1;
const ALVOS_DE_ALMAS_Q21 = '≈ 400 / 1.100 / 1.600';

const linha = (comportamento: string, r: Resultado): string => {
  const almas = r.marcos.map((m) => `${m.minuto}:00=${m.almas}`).join(' ');
  const uniao = r.minutoDaPrimeiraUniao === null ? 'sem União' : `minuto ${r.minutoDaPrimeiraUniao} (${r.origemDaPrimeiraUniao})`;
  return (
    `seed ${SEED} ${comportamento.padEnd(7)} 1ª União: ${uniao}; Almas na mão: ${almas || 'n/d'}; ` +
    `nível ${r.final.nivel}; Fogueiras ${r.fogueiras} (Descansos ${r.descansos}, Forjas ${r.forjas}); marcos concluídos ${r.marcosConcluidos}, vencidos ${r.marcosVencidos}`
  );
};

describe('U7: 20 minutos com o Coroado e a Fogueira (medida, sem gate)', () => {
  const resultados = new Map<string, Resultado>();
  for (const c of COMPORTAMENTOS) resultados.set(c, simularUma(SEED, c, PASSOS));

  it('o bot abre a Fogueira, descansa e parte; as medidas existem em todos os comportamentos', () => {
    for (const [c, r] of resultados) {
      expect(r.final.passo, c).toBe(PASSOS);
      expect(r.descansos, c).toBe(r.fogueiras);
      expect(r.forjas, c).toBeLessThanOrEqual(r.fogueiras);
      expect(r).toHaveProperty('minutoDaPrimeiraUniao');
    }
    if (EVIDENCIAS) {
      // O jogador que caça mata o Guardião: a Fogueira se abre e o bot a usa; os que não matam têm o marco vencido pelo relógio.
      const cacando = resultados.get('cacando')!;
      expect(cacando.marcosConcluidos + cacando.marcosVencidos).toBeGreaterThanOrEqual(1);
    }
  });

  it('a repetição dá a mesma medida e grava o u7.log', () => {
    const repetida = simularUma(SEED, 'cacando', PASSOS);
    const iguais = JSON.stringify(repetida) === JSON.stringify(resultados.get('cacando'));
    expect(iguais).toBe(true);
    if (!EVIDENCIAS) return;
    const corpo = [
      '# U7 da F-008 (design/decisoes-F-008.md §6): 20 minutos com o Coroado, a Fogueira e o bot que descansa e forja. Medida, sem gate nem decisão.',
      `# Alvos de Almas do Q-21 (coletadas na Vigília; a árvore é da F-010): ${ALVOS_DE_ALMAS_Q21}. Jogador invulnerável, ${PASSOS} passos, seed ${SEED}.`,
      ...COMPORTAMENTOS.map((c) => linha(c, resultados.get(c)!)),
      `repetição (seed ${SEED}, cacando, ${PASSOS} passos): iguais=${iguais}`,
    ];
    const dir = join(process.cwd(), 'production', 'evidencias', 'F-008');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'u7.log'), corpo.join('\n') + '\n');
  }, 300_000);
});
