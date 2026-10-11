/* eslint-disable vdc/glossario -- este arquivo testa o detector de palavras proibidas com exemplos delas */
// F-001.10: as regras de lint pegam o que o ADR-0002 §2/§5/§11 e a Q-31 proíbem.
// Cada caso roda o ESLint do projeto sobre um trecho, num caminho virtual.
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
    ["export const p = import('phaser');", 'no-restricted-syntax'],
    ["export const v = eval('1');", 'no-restricted-globals'],
    ['export const t0 = process.hrtime();', 'no-restricted-globals'],
    ["import { performance as p } from 'node:perf_hooks';\nexport const x = p;", 'no-restricted-imports'],
    ["import { setTimeout as s } from 'timers';\nexport const x = s;", 'no-restricted-imports'],
  ])('%s → %s', async (codigo, regra) => {
    expect(await regras(codigo, LOGICA)).toContain(regra);
  });

  it('a fronteira vale também para .js em src/logica', async () => {
    expect(await regras("import Phaser from 'phaser';\nexport const p = Phaser;", 'src/logica/nucleo/__trecho__.js')).toContain(
      'no-restricted-imports',
    );
  });

  it('aceita a aritmética exata', async () => {
    const ok = 'export const v = Math.sqrt(2) + Math.imul(3, 5) + Math.floor(1.5) + Math.fround(0.1) + (7 % 3);';
    expect(await regras(ok, LOGICA)).toEqual([]);
  });
});

describe('a lista densa do pool só no pool (design/decisoes-F-004.md §4, Remoções)', () => {
  it.each([
    ['declare const p: { ativos: Int32Array };\nexport const s = p.ativos[0];'],
    ["declare const p: { ativos: Int32Array };\nexport const s = p['ativos'][0];"],
    ['declare const p: { ativos: Int32Array };\nconst { ativos } = p;\nexport const s = ativos[0];'],
  ])('%s → no-restricted-syntax', async (codigo) => {
    expect(await regras(codigo, 'src/logica/armas/__trecho__.ts')).toContain('no-restricted-syntax');
  });

  it('pool.ts lê a lista densa; fora de src/logica a regra não vale', async () => {
    const codigo = 'declare const p: { ativos: Int32Array };\nexport const s = p.ativos[0];';
    expect(await regras(codigo, 'src/logica/nucleo/pool.ts')).toEqual([]);
    expect(await regras(codigo, CENAS)).toEqual([]);
  });
});

describe('a simulação não lê o anel de eventos (design/decisoes-F-004.md §4)', () => {
  const decl = 'declare const e: { eventos: { u32: Uint32Array; f32: Float32Array } };\ndeclare function gravarEvento(a: unknown): void;\n';
  it.each([
    ['const { eventos } = e;\nexport const n = eventos.u32[0];'],
    ['const anel = e.eventos;\nexport const n = anel.u32[0];'],
    ['let anel: unknown;\nanel = e.eventos;\nexport { anel };'],
    ['export const n = e.eventos.u32[0];'],
    ['export const v = e.eventos.f32[4];'],
  ])('%s → no-restricted-syntax', async (codigo) => {
    expect(await regras(decl + codigo, 'src/logica/armas/__trecho__.ts')).toContain('no-restricted-syntax');
  });

  it('passar o anel ao gravador é permitido', async () => {
    expect(await regras(decl + 'gravarEvento(e.eventos);', 'src/logica/armas/__trecho__.ts')).toEqual([]);
  });
});

/** Arquivos .ts de uma pasta, recursivo. */
function arquivosTs(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? arquivosTs(join(pasta, d.name)) : d.name.endsWith('.ts') ? [join(pasta, d.name)] : [],
  );
}

describe('a simulação só escreve no anel de eventos (design/decisoes-F-004.md §4)', () => {
  it('em src/logica, fora de eventos.ts, o anel só aparece em gravarEvento e esvaziarAnel, e nada importa as leituras', () => {
    const achados: string[] = [];
    for (const arquivo of arquivosTs(join(RAIZ, 'src', 'logica'))) {
      const nome = relative(RAIZ, arquivo);
      if (nome === join('src', 'logica', 'nucleo', 'eventos.ts')) continue;
      readFileSync(arquivo, 'utf-8').split('\n').forEach((linha, i) => {
        const usos = linha.match(/\.eventos\b/g)?.length ?? 0;
        const gravados = linha.match(/(gravarEvento|esvaziarAnel)\(\w+\.eventos\b/g)?.length ?? 0;
        if (usos > gravados) achados.push(`${nome}:${i + 1}: ${linha.trim()}`);
        if (/\b(eventosEscritos|inicioDoEvento|LeitorDeEventos)\b/.test(linha) && !/^\s*(\/\/|\*)/.test(linha)) {
          achados.push(`${nome}:${i + 1}: ${linha.trim()}`);
        }
      });
    }
    expect(achados).toEqual([]);
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
  const decl = [
    'declare function t(id: string): string;',
    'declare function texto(c: unknown, x: number, y: number, id: string, tam: number, cor: number): void;',
    'declare const cena: { scene: { start(k: string): void } };',
    'declare const el: { textContent: string; setText(s: string): void };',
    '',
  ].join('\n');
  it.each([
    ["export const a = t('A1.ACENDER');", 'idForaDoPadrao'],
    ["export const a = t('A1.ACENDER.NAO_EXISTE');", 'idAusente'],
    ["el.textContent = 'Olá';", 'literalNaTela'],
    ['el.setText(`Nv ${1}`);', 'literalNaTela'],
    ["declare const cena: { add: { text(x: number, y: number, s: string): void } };\ncena.add.text(0, 0, 'oi');", 'literalNaTela'],
    ["export const s = 'Toque para acender a Chama';", 'prosa'],
    ["export const s = 'Nível';", 'prosa'],
    ["export const rotulo = 'Pausa';", 'prosa'],
    ["const rotulo = 'pausa';\nel.setText(rotulo);", 'literalNaTela'],
    ["el.setText(String('pausa'));", 'literalNaTela'],
    ["el.setText(['pausa'].join(''));", 'literalNaTela'],
    ["el.textContent = 'x' + t('A1.ACENDER.BOTAO');", 'literalNaTela'],
    ["texto(cena, 0, 0, 'A1.ACENDER.NAO_EXISTE', 18, 0);", 'idAusente'],
    ["texto(cena, 0, 0, 'pausa', 18, 0);", 'idForaDoPadrao'],
    ["export const ids = ['A1.ACENDER.NAO_EXISTE'];", 'idAusente'],
    ["export const id = 'A1.acender.botao';", 'idForaDoPadrao'],
    ["declare const c: { add: { bitmapText(x: number, y: number, f: string, s: string): void } };\nc.add.bitmapText(0, 0, 'fonte', 'pausa');", 'literalNaTela'],
    ["declare const d: { append(s: string): void };\nd.append('pausa');", 'literalNaTela'],
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
      "texto(cena, 0, 0, 'A1.ACENDER.BOTAO', 18, 0);",
      "cena.scene.start('Vigilia');",
      "export const cfg = { key: 'Acender' };",
      "const rotulo = t('A6.PAUSA.CONTINUAR');\nel.setText(rotulo);",
      "export const estado = 'ACENDER';",
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
    ['export const upgradeDoTeste = 1;', 'e2e/__trecho__.spec.ts'],
    ['export const checkpointDoScript = 1;', 'scripts/__trecho__.mjs'],
  ])('%s', async (codigo, arquivo) => {
    expect(await regras(codigo, arquivo)).toContain('vdc/glossario');
  });

  it('não confunde trunc, corrida ou gemido com palavras proibidas', async () => {
    expect(await regras('export const v = Math.trunc(2.5);\n// corrida e gemido\n', LOGICA)).toEqual([]);
  });
});
