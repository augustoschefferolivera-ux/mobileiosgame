/* eslint-disable vdc/glossario -- este arquivo testa o detector de palavras proibidas com exemplos delas */
// F-010.3 e F-010.10 (design/decisoes-F-010.md LT1, LT2): o index.html sem texto visível nem atributo de texto, e as palavras
// proibidas bloqueando em .ts, .json, .html e .webmanifest, passando no repositório; as extras só avisam, e só em pt-BR.json.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { verificarGlossario } from '../scripts/glossario-dados.mjs';

const RAIZ = join(import.meta.dirname, '..');
type Resultado = { arquivos: string[]; violacoes: string[]; avisos: string[] };
const verificar = verificarGlossario as (raiz?: string) => Resultado;

/** Uma raiz de mentira com os arquivos dados (caminho relativo → conteúdo). */
function raizCom(arquivos: Record<string, string>): string {
  const raiz = mkdtempSync(join(tmpdir(), 'vdc-glossario-'));
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(join(raiz, caminho, '..'), { recursive: true });
    writeFileSync(join(raiz, caminho), conteudo);
  }
  return raiz;
}

describe('index.html sem texto (LT1)', () => {
  const html = readFileSync(join(RAIZ, 'index.html'), 'utf-8');

  it('fora de <style>, <script> e comentários não há texto visível', () => {
    const corpo = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]*>/g, '');
    expect(corpo.trim()).toBe('');
  });

  it('aria-label, title, alt e placeholder não têm valor (o <title> e o #gire são preenchidos pelo código)', () => {
    const preenchidos = [...html.matchAll(/\b(aria-label|title|alt|placeholder)\s*=\s*"([^"]+)"/g)].map((m) => `${m[1]}="${m[2]}"`);
    expect(preenchidos).toEqual([]);
    expect(html).toMatch(/<title><\/title>/);
    expect(html).toMatch(/<div id="gire"><\/div>/);
  });
});

describe('palavras proibidas fora do ESLint (LT2)', () => {
  it('bloqueiam em .json, .html, .webmanifest, .yml e .sh, com arquivo e linha', () => {
    const raiz = raizCom({
      'a.json': '{ "x": "o upgrade do nv5" }',
      'b.html': '<p>\nGame Over\n</p>',
      'c.webmanifest': '{ "name": "Roguelike" }',
      'd.yml': 'passo: checkpoint',
      'e.sh': 'echo zumbi',
    });
    const r = verificar(raiz);
    expect(r.violacoes.map((v) => v.split(':').slice(0, 2).join(':'))).toEqual(['a.json:1', 'b.html:2', 'c.webmanifest:1', 'd.yml:1', 'e.sh:1']);
    expect(r.avisos).toEqual([]);
  });

  it('o ESLint bloqueia a palavra num .ts', async () => {
    const [r] = await new ESLint({ cwd: RAIZ }).lintText('export const upgrade = 1;', { filePath: join(RAIZ, 'src/plataforma/__trecho__.ts') });
    expect(r!.messages.map((m) => m.ruleId)).toContain('vdc/glossario');
  });

  it('o subcomando "vitest run" e as chaves de workflow não contam; design/, docs/, production/ e node_modules ficam fora', () => {
    const raiz = raizCom({
      'package.json': '{ "scripts": { "test": "vitest run", "x": "npm run build" } }',
      '.github/w.yml': 'jobs:\n  a:\n    runs-on: ubuntu\n    steps:\n      - run: npm ci',
      'design/d.json': '{ "x": "upgrade" }',
      'docs/d.sh': 'echo upgrade',
      'production/p.json': '{ "x": "upgrade" }',
      'node_modules/m/p.json': '{ "name": "run-parallel" }',
    });
    expect(verificar(raiz).violacoes).toEqual([]);
  });

  it('as extras (vitória, morte, menu, save, ouro...) só avisam, só em pt-BR.json, e "mortes causadas" fica', () => {
    const raiz = raizCom({
      'src/dados/textos/pt-BR.json': '{ "textos": [\n{ "id": "A.B", "texto": "Fim da partida" },\n{ "id": "A.C", "texto": "Mortes causadas" },\n{ "id": "A.D", "texto": "sem nada" }\n] }',
      'outro.json': '{ "texto": "a partida de ouro" }',
    });
    const r = verificar(raiz);
    expect(r.violacoes).toEqual([]);
    expect(r.avisos).toEqual(['src/dados/textos/pt-BR.json:2: partida']);
  });

  it('o repositório passa: 0 violações (as extras são avisos)', () => {
    const r = verificar(RAIZ);
    expect(r.violacoes).toEqual([]);
    expect(r.arquivos).toEqual(expect.arrayContaining(['index.html', 'package.json', 'src/dados/textos/pt-BR.json', 'scripts/verify.sh', '.github/workflows/pages-teste.yml']));
    for (const a of r.avisos) expect(a.startsWith('src/dados/textos/pt-BR.json:')).toBe(true);
  });
});
