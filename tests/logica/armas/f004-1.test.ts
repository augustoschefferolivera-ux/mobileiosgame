// F-004.1: dano de cada arma em cada nível bate com a tabela 3.8 de B (±1%),
// pelo caminho real (design/decisoes-F-004.md §8): estado sem diretor nem
// obstáculos, jogador parado, só a arma em teste, e um Oco Grande (HP 100)
// parado a 48 px na mira, dentro do setor, da estocada, da aura e do alcance
// das facas. O esperado é o literal da tabela da §3 da decisão (Aldric FOR 6,
// DES 3, FÉ 3, Poder 0, bônus somados), não o código. Com VDC_EVIDENCIAS=1,
// grava production/evidencias/F-004/tabela-de-dano.md.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMA, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS as D, PARADO } from '../apoio';
import { estadoCom, eventos, por } from './apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Tabela da §3 da decisão: por acerto (Espada e Facas) e por segundo (Círculo). */
const ESPERADO = {
  [ARMA.espada_longa_do_juramento]: { nome: 'Espada Longa do Juramento', valor: [6.75, 8.1, 8.1, 8.1, 8.1, 9.45, 9.45, 9.45], porAtivacao: [1, 1, 2, 2, 2, 2, 3, 4], recarga: 72, base: 10, escala: 'FOR C 0,75 × 6/10 + DES C 0,75 × 3/10 = 0,675' },
  [ARMA.facas_de_sal]: { nome: 'Facas de Sal', valor: [1.8, 1.8, 2.16, 2.16, 2.16, 2.16, 2.16, 2.16], porAtivacao: [2, 3, 3, 3, 4, 4, 4, 5], recarga: 54, base: 6, escala: 'DES B 1,0 × 3/10 = 0,3' },
  [ARMA.circulo_de_sal]: { nome: 'Círculo de Sal', valor: [1.5, 1.5, 1.8, 1.8, 1.8, 2.1, 2.1, 2.1], porAtivacao: [1, 1, 1, 1, 1, 1, 1, 1], recarga: 30, base: 4, escala: 'FÉ A 1,25 × 3/10 = 0,375' },
} as const;
const SOMA_PCT = {
  [ARMA.espada_longa_do_juramento]: [0, 20, 20, 20, 20, 40, 40, 40],
  [ARMA.facas_de_sal]: [0, 0, 20, 20, 20, 20, 20, 20],
  [ARMA.circulo_de_sal]: [0, 0, 20, 20, 20, 40, 40, 40],
} as const;
const RAIO = [64, 73.6, 73.6, 73.6, 83.2, 83.2, 83.2, 96];

interface Linha {
  nivel: number;
  esperado: number;
  obtido: number;
  desvio: number;
  acertos: number;
  quedaDoHp: number;
  ok: boolean;
}
const linhas = new Map<number, Linha[]>();

/** Uma ativação da arma (o 1º ciclo, a 1ª salva ou o 1º tick) contra o Oco Grande parado a 48 px. */
function medir(codigo: number, nivel: number): { valores: number[]; quedaDoHp: number } {
  const e = estadoCom([[codigo, nivel]]);
  const s = por(e, TIPO.oco_grande, 0, -48);
  // Espada: os golpes do 1º ciclo saem até o passo 37; Facas: a salva do passo 1 acerta em ≤ 3 passos; Círculo: o tick do passo 1.
  const passos = codigo === ARMA.circulo_de_sal ? 1 : codigo === ARMA.facas_de_sal ? 20 : 60;
  avancar(e, D, PARADO, passos);
  const valores = eventos(e)
    .filter((v) => v.tipo === EVENTO.acerto && v.slot === s)
    .map((v) => v.f[2]);
  return { valores, quedaDoHp: 100 - e.inimigos.hp[s]! };
}

describe('F-004.1: dano em cada nível bate com a tabela 3.8 (±1%)', () => {
  for (const codigo of [ARMA.espada_longa_do_juramento, ARMA.facas_de_sal, ARMA.circulo_de_sal] as const) {
    const esp = ESPERADO[codigo];
    it(`${esp.nome}, níveis 1 a 8`, () => {
      const tabela: Linha[] = [];
      for (let nivel = 1; nivel <= 8; nivel++) {
        const { valores, quedaDoHp } = medir(codigo, nivel);
        const porAcerto = codigo === ARMA.circulo_de_sal ? esp.valor[nivel - 1]! / 2 : esp.valor[nivel - 1]!;
        // Acertos por ativação: golpes do ciclo, facas da salva ou 1 tick.
        expect(valores, `nv${nivel}: acertos`).toHaveLength(esp.porAtivacao[nivel - 1]!);
        for (const v of valores) {
          // Asserção técnica: o valor do evento é o esperado em Float32 (erro relativo ≤ 1e-6).
          expect(Math.abs(v - Math.fround(porAcerto)) / porAcerto, `nv${nivel}: valor do evento`).toBeLessThanOrEqual(1e-6);
        }
        // O critério: ±1% contra a tabela; no Círculo, o 1º tick × 2 contra o valor por segundo.
        const obtido = codigo === ARMA.circulo_de_sal ? valores[0]! * 2 : valores[0]!;
        const desvio = (obtido - esp.valor[nivel - 1]!) / esp.valor[nivel - 1]!;
        expect(Math.abs(desvio), `nv${nivel}: desvio`).toBeLessThanOrEqual(0.01);
        // A queda do HP é a soma dos acertos, arredondada no ulp do HP (≈ 7,6e-6 perto de 100).
        const soma = porAcerto * valores.length;
        expect(Math.abs(quedaDoHp - soma) / soma, `nv${nivel}: queda do HP`).toBeLessThanOrEqual(0.01);
        tabela.push({ nivel, esperado: esp.valor[nivel - 1]!, obtido, desvio, acertos: valores.length, quedaDoHp, ok: true });
      }
      linhas.set(codigo, tabela);
    });
  }

  it('o nv4 da Espada é igual ao nv3: o +50% contra Postura Quebrada não tem gatilho antes da F-006', () => {
    expect(medir(ARMA.espada_longa_do_juramento, 4).valores[0]).toBe(medir(ARMA.espada_longa_do_juramento, 3).valores[0]);
  });

  it('os bônus por nível somam (D2) e o raio do Círculo segue a tabela', () => {
    for (const codigo of [ARMA.espada_longa_do_juramento, ARMA.facas_de_sal, ARMA.circulo_de_sal] as const) {
      for (let n = 1; n <= 8; n++) expect(D.armas.somaDanoPct[indiceDoNivel(codigo, n)]).toBe(SOMA_PCT[codigo][n - 1]);
    }
    for (let n = 1; n <= 8; n++) expect(D.armas.alcance[indiceDoNivel(ARMA.circulo_de_sal, n)]).toBe(RAIO[n - 1]);
  });
});

const fmt = (v: number, casas = 4): string => v.toFixed(casas).replace('.', ',');
/** Desvio em %: abaixo de 0,0001% (o erro do Float32), escrito como tal. */
const pct = (d: number): string => (Math.abs(d * 100) < 1e-4 ? '< 0,0001%' : `${fmt(d * 100, 4)}%`);

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1' || linhas.size < 3) return;
  const saida: string[] = [
    '# F-004 — tabela de dano gerada pelo teste (Vitest, tests/logica/armas/f004-1.test.ts)',
    '',
    `Gerada em ${new Date().toISOString()} com Node ${process.version}.`,
    '',
    '- Vigilante: Aldric, FOR 6 / DES 3 / FÉ 3 (B §3.3), Poder 0.',
    '- Fórmula: Dano = Base(nível) × (1 + Poder) × Escala (B §3.8), com Base(nível) = Base₁ × (1 + Σ bônus de dano do nível), os +20% somados (design/decisoes-F-004.md D2).',
    '- Medida pelo caminho real: o valor de cada evento `acerto` contra um Oco Grande (HP 100) parado a 48 px na mira; o tick do Círculo sai a cada 30 passos com metade do dano por segundo.',
    '- Critério: |desvio| ≤ 1% contra o valor da tabela da §3 da decisão (6,75 no nv1 da Espada, não o "≈ 7" de B).',
    '',
  ];
  for (const codigo of [ARMA.espada_longa_do_juramento, ARMA.facas_de_sal, ARMA.circulo_de_sal] as const) {
    const esp = ESPERADO[codigo];
    const circulo = codigo === ARMA.circulo_de_sal;
    saida.push(`## ${esp.nome} (base ${esp.base}${circulo ? ' por s' : ''}; escala ${esp.escala}; recarga ${esp.recarga} passos)`, '');
    saida.push(
      circulo
        ? '| Nível | Raio (px) | Σ bônus | Esperado por s | Obtido (tick × 2) | Por tick | Desvio | ok |'
        : `| Nível | Σ bônus | Esperado por acerto | Obtido | ${codigo === ARMA.facas_de_sal ? 'Facas por salva' : 'Golpes por ciclo'} | Por ${codigo === ARMA.facas_de_sal ? 'salva' : 'ciclo'} | Desvio | ok |`,
      '|---|---|---|---|---|---|---|---|',
    );
    for (const l of linhas.get(codigo)!) {
      const soma = SOMA_PCT[codigo][l.nivel - 1];
      saida.push(
        circulo
          ? `| ${l.nivel} | ${fmt(RAIO[l.nivel - 1]!, 1)} | +${soma}% | ${fmt(l.esperado, 2)} | ${fmt(l.obtido)} | ${fmt(l.obtido / 2)} | ${pct(l.desvio)} | ${l.ok ? 'sim' : 'não'} |`
          : `| ${l.nivel} | +${soma}% | ${fmt(l.esperado, 2)} | ${fmt(l.obtido)} | ${l.acertos} | ${fmt(l.obtido * l.acertos)} | ${pct(l.desvio)} | ${l.ok ? 'sim' : 'não'} |`,
      );
    }
    saida.push('');
  }
  saida.push('aprovado: true');
  const dir = join(RAIZ, 'production', 'evidencias', 'F-004');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tabela-de-dano.md'), saida.join('\n') + '\n');
});
