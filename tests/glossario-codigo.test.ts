// Q-31: o glossário vale para todo o código. O ESLint cobre .ts/.js/.mjs; este
// teste cobre o que ele não lê (index.html e scripts/*.sh). APIs de terceiros
// ficam fora (Q-31): o subcomando de execução do Vitest é retirado antes da checagem.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proibidasEm } from '../eslint/glossario.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const TERCEIROS = [/\bvitest run\b/g];

const ARQUIVOS = [
  'index.html',
  ...readdirSync(join(RAIZ, 'scripts'))
    .filter((f) => f.endsWith('.sh'))
    .map((f) => `scripts/${f}`),
];

describe('glossário fora do ESLint (Q-31)', () => {
  it.each(ARQUIVOS)('%s não tem palavras proibidas', (arquivo) => {
    const achados: string[] = [];
    readFileSync(join(RAIZ, arquivo), 'utf-8')
      .split('\n')
      .forEach((linha, i) => {
        const limpa = TERCEIROS.reduce((l, re) => l.replace(re, ' '), linha);
        for (const p of proibidasEm(limpa)) achados.push(`${arquivo}:${i + 1}: ${p}`);
      });
    expect(achados).toEqual([]);
  });
});
