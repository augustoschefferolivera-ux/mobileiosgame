// F-001.10: as regras de lint pegam o que o ADR-0002 §2/§5/§11 e a Q-31 proíbem.
// Cada caso roda o ESLint do projeto sobre um trecho, num caminho virtual.
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: RAIZ });

async function regras(codigo: string, arquivo: string): Promise<string[]> {
  const [r] = await eslint.lintText(codigo, { filePath: join(RAIZ, arquivo) });
  return (r?.messages ?? []).map((m) => m.ruleId ?? `fatal: ${m.message}`);
}

const LOGICA = 'src/logica/nucleo/__trecho__.ts';
const CENAS = 'src/cenas/__trecho__.ts';
const PLATAFORMA = 'src/plataforma/__trecho__.ts';

describe('fronteiras de src/logica (ADR-0002 §2 e §5)', () => {
  it.each([
    ["import Phaser from 'phaser';\nexport const p = Phaser;", 'no-restricted-imports'],
    ["import { x } from '../../cenas/x';\nexport const y = x;", 'no-restricted-imports'],
    ["import { x } from '../../entrada/x';\nexport const y = x;", 'no-restricted-imports'],
    ["import { x } from '../../plataforma/x';\nexport const y = x;", 'no-restricted-imports'],
    ['export const w = window.innerWidth;', 'no-restricted-globals'],
    ['export const d = document.body;', 'no-restricted-globals'],
    ['export const n = Date.now();', 'no-restricted-globals'],
    ['export const n = new Date();', 'no-restricted-globals'],
    ['export const p = performance.now();', 'no-restricted-globals'],
    ['requestAnimationFrame(() => 0);', 'no-restricted-globals'],
    ['setTimeout(() => 0, 1);', 'no-restricted-globals'],
    ['export const r = Math.random();', 'no-restricted-properties'],
    ['export const { random } = Math;', 'no-restricted-properties'],
    ['export const s = Math.sin(1);', 'no-restricted-properties'],
    ['export const c = Math.cos(1);', 'no-restricted-properties'],
    ['export const t = Math.tan(1);', 'no-restricted-properties'],
    ['export const a = Math.asin(1) + Math.acos(1) + Math.atan(1);', 'no-restricted-properties'],
    ['export const a = Math.atan2(1, 2);', 'no-restricted-properties'],
    ['export const e = Math.exp(1) + Math.expm1(1);', 'no-restricted-properties'],
    ['export const l = Math.log(2) + Math.log2(2) + Math.log10(2) + Math.log1p(2);', 'no-restricted-properties'],
    ['export const p = Math.pow(2, 3);', 'no-restricted-properties'],
    ['export const h = Math.hypot(3, 4);', 'no-restricted-properties'],
    ['export const c = Math.cbrt(8);', 'no-restricted-properties'],
    ['export const p = 2 ** 3;', 'no-restricted-syntax'],
    ['let p = 2;\np **= 3;\nexport { p };', 'no-restricted-syntax'],
    ['export const o = [3, 1].sort();', 'no-restricted-syntax'],
  ])('%s → %s', async (codigo, regra) => {
    expect(await regras(codigo, LOGICA)).toContain(regra);
  });

  it('aceita a aritmética exata', async () => {
    const ok = 'export const v = Math.sqrt(2) + Math.imul(3, 5) + Math.floor(1.5) + Math.fround(0.1) + (7 % 3);';
    expect(await regras(ok, LOGICA)).toEqual([]);
  });
});

describe('phaser só em src/cenas', () => {
  it('src/plataforma não importa phaser', async () => {
    expect(await regras("import Phaser from 'phaser';\nexport const p = Phaser;", PLATAFORMA)).toContain('no-restricted-imports');
  });
  it('src/cenas importa phaser', async () => {
    expect(await regras("import Phaser from 'phaser';\nexport const p = Phaser;", CENAS)).toEqual([]);
  });
});

describe('textos visíveis só por t(id) (ADR-0002 §11; Q-32)', () => {
  const decl = 'declare function t(id: string): string;\ndeclare const el: { textContent: string; setText(s: string): void };\n';
  it.each([
    ["export const a = t('A1.ACENDER');", 'idForaDoPadrao'],
    ["export const a = t('A1.ACENDER.NAO_EXISTE');", 'idAusente'],
    ["el.textContent = 'Olá';", 'literalNaTela'],
    ['el.setText(`Nv ${1}`);', 'literalNaTela'],
    ["declare const cena: { add: { text(x: number, y: number, s: string): void } };\ncena.add.text(0, 0, 'oi');", 'literalNaTela'],
    ["export const s = 'Toque para acender a Chama';", 'prosa'],
    ["export const s = 'Nível';", 'prosa'],
  ])('%s → %s', async (codigo, mensagem) => {
    const [r] = await eslint.lintText(decl + codigo, { filePath: join(RAIZ, CENAS) });
    expect(r?.messages.map((m) => m.messageId)).toContain(mensagem);
  });

  it('aceita ids válidos, chaves, eventos, CSS e logs', async () => {
    const ok = [
      "export const a = t('A1.ACENDER.BOTAO');",
      "el.textContent = t('A1.ACENDER.AVISO_AUDIO');",
      "export const estilo = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '20px' };",
      "export const css = 'position: fixed; inset: 0';",
      "export const evento = 'touchstart';",
      "export const id = 'oco_das_lanternas';",
      "console.warn('aviso para quem desenvolve');",
      "export function f(): never { throw new Error('estado inconsistente da cena'); }",
    ].join('\n');
    const [r] = await eslint.lintText(decl + ok, { filePath: join(RAIZ, CENAS) });
    expect(r?.messages).toEqual([]);
  });
});

describe('glossário no código (Q-31)', () => {
  it.each([
    ['export const upgradeDaArma = 1;', LOGICA],
    ['// tela de game over\nexport const x = 1;', LOGICA],
    ["export const s = 'checkpoint';", PLATAFORMA],
    ['export function iniciarRun(): void {}', CENAS],
    ['/* menu principal */\nexport const x = 1;', CENAS],
  ])('%s', async (codigo, arquivo) => {
    expect(await regras(codigo, arquivo)).toContain('vdc/glossario');
  });

  it('não confunde trunc, corrida ou gemido com palavras proibidas', async () => {
    expect(await regras('export const v = Math.trunc(2.5);\n// corrida e gemido\n', LOGICA)).toEqual([]);
  });
});
