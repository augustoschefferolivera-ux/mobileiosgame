// F-001.1 e F-001.5: mesma seed + 1.000 passos = mesmo hash; 1 e 5 passos por
// frame dão o mesmo hash. Com VDC_EVIDENCIAS=1 (scripts/verify.sh), grava o log
// de evidência e o hash de referência que a Playwright compara (F-001.11).
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hex8 } from '../../src/logica/nucleo/hash';
import { PASSO_MS } from '../../src/logica/nucleo/passos';
import { avancarAcumulador, criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { BYTES_ESTADO, CAB, criarEstado, hashEstado } from '../../src/logica/nucleo/estado';
import { avancar, passo } from '../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, SEED_PADRAO } from '../../src/logica/nucleo/referencia';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
const log: string[] = [];

function executar(seed: number, n: number): number {
  const e = criarEstado(seed);
  avancar(e, n);
  return hashEstado(e);
}

/** Driver de teste: frames com o delta dado até chegar a `n` passos. */
function executarPorFrames(seed: number, n: number, deltaMs: number): { hash: number; frames: number; max: number } {
  const e = criarEstado(seed);
  const acc = criarAcumulador();
  let frames = 0;
  let max = 0;
  while (e.cab[CAB.passo]! < n) {
    const k = Math.min(avancarAcumulador(acc, deltaMs), n - e.cab[CAB.passo]!);
    for (let i = 0; i < k; i++) passo(e);
    max = Math.max(max, k);
    frames++;
  }
  expect(acc.passosPerdidos).toBe(0);
  return { hash: hashEstado(e), frames, max };
}

describe('determinismo (F-001.1)', () => {
  it(`seed ${SEED}: duas execuções de ${PASSOS_REFERENCIA} passos dão o mesmo hash`, () => {
    const a = executar(SEED, PASSOS_REFERENCIA);
    const b = executar(SEED, PASSOS_REFERENCIA);
    expect(a).toBe(b);
    log.push(`seed=${SEED} passos=${PASSOS_REFERENCIA} execucao1=${hex8(a)} execucao2=${hex8(b)} iguais=${a === b}`);
  });

  it('seeds diferentes dão hashes diferentes', () => {
    const hashes = [1, 2, 3, 42, 2026, SEED].map((s) => executar(s, PASSOS_REFERENCIA));
    expect(new Set(hashes).size).toBe(new Set([1, 2, 3, 42, 2026, SEED]).size);
  });

  it('o hash muda a cada passo e cobre o buffer inteiro', () => {
    expect(executar(SEED, PASSOS_REFERENCIA - 1)).not.toBe(executar(SEED, PASSOS_REFERENCIA));
    expect(criarEstado(SEED).bytes.length).toBe(BYTES_ESTADO);
  });

  it('o passo não lê relógio nem Math.random', () => {
    const originais = { random: Math.random, now: Date.now, perf: performance.now };
    const proibido = (): never => {
      throw new Error('a simulação leu uma fonte não determinística');
    };
    Math.random = proibido;
    Date.now = proibido;
    performance.now = proibido;
    try {
      expect(() => executar(SEED, PASSOS_REFERENCIA)).not.toThrow();
    } finally {
      Math.random = originais.random;
      Date.now = originais.now;
      performance.now = originais.perf;
    }
  });
});

describe('1 contra 5 passos por frame (F-001.5)', () => {
  it('mesmo hash no passo 1.000', () => {
    const um = executarPorFrames(SEED, PASSOS_REFERENCIA, PASSO_MS);
    const cinco = executarPorFrames(SEED, PASSOS_REFERENCIA, 5 * PASSO_MS);
    expect(um.max).toBe(1);
    expect(cinco.max).toBe(5);
    expect(um.frames).toBe(PASSOS_REFERENCIA);
    expect(cinco.frames).toBe(PASSOS_REFERENCIA / 5);
    expect(cinco.hash).toBe(um.hash);
    expect(um.hash).toBe(executar(SEED, PASSOS_REFERENCIA));
    log.push(
      `1 passo/frame: ${um.frames} frames hash=${hex8(um.hash)}; 5 passos/frame: ${cinco.frames} frames hash=${hex8(cinco.hash)}; iguais=${um.hash === cinco.hash}`,
    );
  });
});

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1') return;
  const hash = executar(SEED, PASSOS_REFERENCIA);
  mkdirSync(join(RAIZ, '.verify'), { recursive: true });
  writeFileSync(
    join(RAIZ, '.verify', 'referencia-f001.json'),
    JSON.stringify({ seed: SEED, passos: PASSOS_REFERENCIA, hash: hex8(hash) }, null, 2) + '\n',
  );
  const dir = join(RAIZ, 'production', 'evidencias', 'F-001');
  mkdirSync(dir, { recursive: true });
  const cabecalho = [
    '# F-001 — log do teste de determinismo (Vitest, Node)',
    `# gerado em ${new Date().toISOString()} com Node ${process.version}`,
    `# referencia: seed=${SEED} passos=${PASSOS_REFERENCIA} hash=${hex8(hash)} (comparado pela Playwright, F-001.11)`,
  ];
  writeFileSync(join(dir, 'determinismo.log'), [...cabecalho, ...log].join('\n') + '\n');
});
