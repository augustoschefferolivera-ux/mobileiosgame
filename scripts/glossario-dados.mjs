#!/usr/bin/env node
/* global process, console */
// Glossário fora do ESLint (design/decisoes-F-010.md LT2): as palavras proibidas (B §3.15: as 11, com as variações do detector
// compartilhado em eslint/glossario.js) bloqueiam em *.json, *.html, *.webmanifest, *.yml e *.sh de todo o repositório, menos
// node_modules, design/, docs/ e production/. As palavras "a evitar" (Q-31: vitória, morte, menu, partida, save, ouro, moeda...)
// só avisam, e só em src/dados/textos/pt-BR.json; "mortes causadas" fica (Q-31). O ESLint segue valendo para .ts/.js/.mjs.
// APIs de terceiros ficam fora (Q-31), como no teste de index.html e scripts: o subcomando de execução do Vitest e do npm e as
// chaves de workflow do GitHub são retirados da linha antes da checagem.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { A_EVITAR, proibidasEm, tokens } from '../eslint/glossario.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSOES = ['.json', '.html', '.webmanifest', '.yml', '.sh'];
const PASTAS_FORA = new Set(['node_modules', 'design', 'docs', 'production', '.git', 'dist', 'dist-debug', 'test-results', 'playwright-report', '.verify', '.claude']);
/**
 * Fora da checagem: o arquivo gerado por terceiros (nomes de pacotes de outras pessoas), a própria lista do detector e a
 * `feature_list.json`, que cita o texto do brief B para dizer o que se verifica (e o brief usa as palavras que o jogo evita).
 */
const ARQUIVOS_FORA = new Set(['package-lock.json', 'eslint/glossario.json', 'feature_list.json']);
const TERCEIROS = [/\bvitest run\b/g, /\bnpm run\b/g, /\bruns-on\b/g, /^\s*(-\s*)?run:/g];
const ARQUIVO_DOS_TEXTOS = 'src/dados/textos/pt-BR.json';
/** "mortes causadas" é a estatística do jogo e fica (Q-31). */
const EXCECOES_DOS_EXTRAS = [/mortes causadas/gi];

/** Todos os arquivos das extensões vigiadas, caminhos relativos à raiz com "/". */
function listar(raiz, dir = raiz, saida = []) {
  for (const nome of readdirSync(dir)) {
    if (PASTAS_FORA.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) listar(raiz, caminho, saida);
    else if (EXTENSOES.some((e) => nome.endsWith(e))) {
      const rel = relative(raiz, caminho).split('\\').join('/');
      if (!ARQUIVOS_FORA.has(rel)) saida.push(rel);
    }
  }
  return saida.sort();
}

/**
 * @param {string} [raiz]
 * @returns {{ arquivos: string[], violacoes: string[], avisos: string[] }}
 */
export function verificarGlossario(raiz = RAIZ) {
  const arquivos = listar(raiz);
  const violacoes = [];
  const avisos = [];
  for (const arquivo of arquivos) {
    const linhas = readFileSync(join(raiz, arquivo), 'utf-8').split('\n');
    linhas.forEach((linha, i) => {
      const limpa = TERCEIROS.reduce((l, re) => l.replace(re, ' '), linha);
      for (const p of proibidasEm(limpa)) violacoes.push(`${arquivo}:${i + 1}: ${p}`);
      if (arquivo !== ARQUIVO_DOS_TEXTOS || !linha.includes('"texto":')) return;
      const sem = EXCECOES_DOS_EXTRAS.reduce((l, re) => l.replace(re, ' '), limpa);
      const achadas = tokens(sem).filter((t) => A_EVITAR.includes(t));
      if (achadas.length > 0) avisos.push(`${arquivo}:${i + 1}: ${[...new Set(achadas)].join(', ')}`);
    });
  }
  return { arquivos, violacoes, avisos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = verificarGlossario();
  for (const v of r.violacoes) console.error(`erro: ${v}`);
  for (const a of r.avisos) console.warn(`aviso: ${a}`);
  console.log(`11 palavras: ${r.violacoes.length} violações; extras: ${r.avisos.length} avisos (${r.arquivos.length} arquivos)`);
  process.exit(r.violacoes.length === 0 ? 0 : 1);
}
