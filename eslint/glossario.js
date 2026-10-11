// Detector de palavras proibidas (Q-31), compartilhado pelo lint (eslint/vdc.js)
// e pelo teste de integridade dos dados (tests/dados.test.ts).
import { readFileSync } from 'node:fs';

/** @type {{ proibidas_palavra: string[], proibidas_expressao: string[], a_evitar: string[] }} */
const glossario = JSON.parse(readFileSync(new URL('./glossario.json', import.meta.url), 'utf-8'));

export const PROIBIDAS_PALAVRA = glossario.proibidas_palavra;
export const PROIBIDAS_EXPRESSAO = glossario.proibidas_expressao.map((s) => new RegExp(s));
export const A_EVITAR = glossario.a_evitar;

/** Sem acentos, camelCase separado (Q-33), em minúsculas. @param {string} s */
export function normalizar(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

/** @param {string} s @returns {string[]} */
export function tokens(s) {
  return normalizar(s).split(/[^a-z0-9+]+/).filter(Boolean);
}

/** Palavras e expressões proibidas achadas em `s`. @param {string} s @returns {string[]} */
export function proibidasEm(s) {
  const achadas = tokens(s).filter((t) => PROIBIDAS_PALAVRA.includes(t));
  const n = normalizar(s).replace(/[^a-z0-9+]+/g, ' ');
  for (const re of PROIBIDAS_EXPRESSAO) if (re.test(n)) achadas.push(re.source);
  return achadas;
}
