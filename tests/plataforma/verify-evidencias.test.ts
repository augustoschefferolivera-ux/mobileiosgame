// A conferência de evidências do scripts/verify.sh (crítico da F-010, M4): a evidência `pendente_de_aparelho` que o usuário
// grava fora do verify passa mesmo antiga; as demais continuam exigindo arquivo novo. O trecho de node do script roda aqui
// numa pasta temporária, com um feature_list.json de mentira.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = readFileSync('scripts/verify.sh', 'utf-8');
const INICIO = SCRIPT.indexOf("node -e '\n  const fs = require(\"node:fs\");");
const FIM = SCRIPT.indexOf("' \"$FEATURE\" \"$INICIO\"", INICIO);
const CODIGO = SCRIPT.slice(INICIO + "node -e '".length, FIM);

const pastas: string[] = [];
afterEach(() => {
  for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true });
});

/** Roda a conferência com `arquivos` {nome: idade em segundos} e as marcas `pendente` de cada evidência. */
function conferir(evidencias: { arquivo: string; pendente?: boolean; idade?: number | null; tamanho?: number }[]) {
  const pasta = mkdtempSync(join(tmpdir(), 'verify-'));
  pastas.push(pasta);
  mkdirSync(join(pasta, 'ev'));
  const agora = Date.now() / 1000;
  for (const e of evidencias) {
    if (e.idade === null) continue;
    const caminho = join(pasta, e.arquivo);
    writeFileSync(caminho, 'x'.repeat(e.tamanho ?? 4));
    utimesSync(caminho, agora - (e.idade ?? 0), agora - (e.idade ?? 0));
  }
  const lista = evidencias.map((e) => ({ arquivo: e.arquivo, descricao: 'd', ...(e.pendente === undefined ? {} : { pendente_de_aparelho: e.pendente }) }));
  writeFileSync(join(pasta, 'feature_list.json'), JSON.stringify({ features: [{ id: 'F-X', evidencias: lista }] }));
  const r = spawnSync('node', ['-e', CODIGO, 'F-X', String(Math.floor(agora))], { cwd: pasta, encoding: 'utf-8' });
  return { codigo: r.status, saida: r.stdout };
}

describe('verify.sh: evidências pendentes de aparelho (D10 IP1; crítico M4)', () => {
  it('achou o trecho do script', () => {
    expect(CODIGO.length).toBeGreaterThan(500);
  });

  it('pendente com o arquivo antigo (gravado pelo usuário antes do verify) passa', () => {
    const r = conferir([{ arquivo: 'ev/iphone.mp4', pendente: true, idade: 86_400 }]);
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain('ok   ev/iphone.mp4');
  });

  it('pendente sem o arquivo continua pendente, sem bloquear', () => {
    const r = conferir([{ arquivo: 'ev/iphone.mp4', pendente: true, idade: null }]);
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain('PEND  ev/iphone.mp4');
  });

  it('pendente com o arquivo vazio ainda reprova (a conferência de tamanho vale)', () => {
    const r = conferir([{ arquivo: 'ev/iphone.mp4', pendente: true, idade: 0, tamanho: 0 }]);
    expect(r.codigo).toBe(1);
  });

  it('a evidência comum antiga reprova, e a nova passa', () => {
    expect(conferir([{ arquivo: 'ev/lint.txt', idade: 86_400 }]).codigo).toBe(1);
    expect(conferir([{ arquivo: 'ev/lint.txt', idade: 0 }]).codigo).toBe(0);
  });

  it('a marca só vale com `true`: pendente false e antiga reprova', () => {
    expect(conferir([{ arquivo: 'ev/lint.txt', pendente: false, idade: 86_400 }]).codigo).toBe(1);
  });
});
