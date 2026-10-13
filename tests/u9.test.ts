// U9 da F-009 (design/decisoes-F-009.md §6): a luta com o Lanterneiro de 20:00 a 23:00, medida e sem gate: tempo até a morte do chefe (alvo do
// doc 06: 2 a 3 min, numa janela de 3), quebras por luta, Almas ao Santuário contra o Q-21 (≈ 400 / 1.100 / 1.600 aos 20:00, com as 200 do
// chefe e o ×1,5 do Amanhecer) e a taxa de derrota por fome. Com VDC_EVIDENCIAS=1 (scripts/verify.sh) roda as seeds 1 a 8 nos dois
// comportamentos e grava production/evidencias/F-009/u9.log, com a repetição de uma luta (`iguais=true`); sem ele só confere uma seed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALMAS_DO_Q21, COMPORTAMENTOS, medir, type ResultadoDaLuta } from '../scripts/sim9';

const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';
const SEEDS = EVIDENCIAS ? [1, 2, 3, 4, 5, 6, 7, 8] : [1];
const segundos = (p: number | null): string => (p === null ? 'o chefe não morreu' : `${(p / 60).toFixed(1)} s`);
const media = (v: readonly number[]): number => (v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length);

const linha = (r: ResultadoDaLuta): string =>
  `seed ${r.seed} ${r.comportamento.padEnd(13)} fim ${r.fim.padEnd(9)} chefe morto em ${segundos(r.passosAteAMorte).padEnd(18)} fase máxima ${r.faseMax}; quebras ${r.quebras}; ` +
  `Almas ao Santuário (${ALMAS_DO_Q21.join(' / ')} aos 20:00): ${r.almasAoSantuario.join(' / ')}; HP no fim ${r.hpDoJogadorNoFim}`;

describe('U9: a luta de 20:00 a 23:00 (medida, sem gate)', () => {
  const lutas: ResultadoDaLuta[] = [];
  for (const s of SEEDS) for (const c of COMPORTAMENTOS) lutas.push(medir(s, c));

  it('toda luta acaba num dos três fins e mede o que o log registra', () => {
    for (const r of lutas) {
      expect(['amanhecer', 'a_fome', 'apagar'], `seed ${r.seed} ${r.comportamento}`).toContain(r.fim);
      expect(r.almasAoSantuario).toHaveLength(ALMAS_DO_Q21.length);
      if (r.fim === 'amanhecer') expect(r.passosAteAMorte).not.toBeNull();
    }
  });

  it('a repetição dá a mesma medida e grava o u9.log', () => {
    const repetida = medir(SEEDS[0]!, 'corpo_a_corpo');
    const iguais = JSON.stringify(repetida) === JSON.stringify(lutas[0]);
    expect(iguais).toBe(true);
    if (!EVIDENCIAS) return;
    const corpoACorpo = lutas.filter((l) => l.comportamento === 'corpo_a_corpo');
    const mortos = corpoACorpo.filter((l) => l.passosAteAMorte !== null).map((l) => l.passosAteAMorte!);
    const fome = lutas.filter((l) => l.fim === 'a_fome').length;
    const corpo = [
      '# U9 da F-009 (design/decisoes-F-009.md §6): a luta com o Lanterneiro de 20:00 a 23:00. Medida, sem gate nem decisão.',
      `# Cenário lanterneiro (nível 29, Espada + Facas + Círculo nv8, Elmo e Luvas nv5, 3 Frascos), jogador mortal, seeds ${SEEDS[0]} a ${SEEDS.at(-1)}.`,
      '# "corpo_a_corpo": anda até 90 px do chefe, apara os brancos e esquiva dos vermelhos; "parado": só apara e esquiva. Os dois bebem o Frasco abaixo de 60 de HP.',
      '# As seeds não mudam a luta: o chefe não usa RNG e o diretor está desligado; as 8 seeds repetem o mesmo resultado (a medida é determinística).',
      `# Almas aos 20:00 do Q-21 (≈ ${ALMAS_DO_Q21.join(' / ')}); o Santuário soma as 200 do chefe e o ×1,5 do Amanhecer (A Fome e o Apagar: 70%).`,
      ...lutas.map(linha),
      `resumo corpo_a_corpo: chefe morto em ${mortos.length} de ${corpoACorpo.length} lutas; tempo médio até a morte ${segundos(media(mortos))} (alvo do doc 06: 120 a 180 s; a janela de luta é de 180 s); quebras médias ${media(corpoACorpo.map((l) => l.quebras)).toFixed(1)}`,
      `taxa de derrota por fome (os dois comportamentos): ${fome} de ${lutas.length} lutas`,
      `repetição (seed ${SEEDS[0]}, corpo_a_corpo): iguais=${iguais}`,
    ];
    const dir = join(process.cwd(), 'production', 'evidencias', 'F-009');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'u9.log'), corpo.join('\n') + '\n');
  }, 600_000);
});
