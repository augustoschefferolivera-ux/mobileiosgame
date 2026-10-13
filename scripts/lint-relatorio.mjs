#!/usr/bin/env node
/* global process, console */
// Relatório de lint da F-010 (design/decisoes-F-010.md LT3): junta o ESLint e o glossário dos dados em
// production/evidencias/F-010/lint.txt. Mostra os arquivos verificados por regra (`vdc/textos` e `vdc/glossario`), os erros (o
// critério pede 0) e a lista de avisos, e termina com a linha "11 palavras: N violações; extras: M avisos". Sai com código 1 se
// houver erro. Uso: o script `lint:relatorio` do package.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { verificarGlossario } from './glossario-dados.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGRAS = ['vdc/textos', 'vdc/glossario'];
const SAIDA = join(RAIZ, 'production', 'evidencias', 'F-010', 'lint.txt');

const eslint = new ESLint({ cwd: RAIZ });
const resultados = await eslint.lintFiles(['.']);

/** @type {Record<string, { arquivos: number, erros: number }>} */
const porRegra = Object.fromEntries(REGRAS.map((r) => [r, { arquivos: 0, erros: 0 }]));
let erros = 0;
let avisosDoEslint = 0;
const listaDeAvisos = [];
for (const r of resultados) {
  erros += r.errorCount;
  avisosDoEslint += r.warningCount;
  const config = await eslint.calculateConfigForFile(r.filePath);
  const arquivo = r.filePath.slice(RAIZ.length + 1);
  for (const regra of REGRAS) {
    const nivel = config?.rules?.[regra]?.[0];
    if (nivel === 2 || nivel === 'error') porRegra[regra].arquivos++;
    porRegra[regra].erros += r.messages.filter((m) => m.ruleId === regra && m.severity === 2).length;
  }
  for (const m of r.messages) if (m.severity === 1) listaDeAvisos.push(`${arquivo}:${m.line}: ${m.ruleId ?? 'aviso'}: ${m.message}`);
}

const glossario = verificarGlossario(RAIZ);
const linhas = [
  'Relatório de lint da F-010 (design/decisoes-F-010.md LT3)',
  '',
  `ESLint: ${resultados.length} arquivos`,
  ...REGRAS.map((r) => `  ${r}: ${porRegra[r].arquivos} arquivos verificados, ${porRegra[r].erros} erros`),
  `  total: ${erros} erros, ${avisosDoEslint} avisos`,
  '',
  `Glossário dos dados (scripts/glossario-dados.mjs): ${glossario.arquivos.length} arquivos .json, .html, .webmanifest, .yml e .sh verificados`,
  ...glossario.violacoes.map((v) => `  erro: ${v}`),
  '',
  'Avisos:',
  ...(listaDeAvisos.length + glossario.avisos.length === 0 ? ['  nenhum'] : [...listaDeAvisos, ...glossario.avisos].map((a) => `  ${a}`)),
  '',
  `11 palavras: ${glossario.violacoes.length} violações; extras: ${glossario.avisos.length} avisos`,
  '',
];
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, linhas.join('\n'));
console.log(linhas.join('\n'));
process.exit(erros === 0 && glossario.violacoes.length === 0 ? 0 : 1);
