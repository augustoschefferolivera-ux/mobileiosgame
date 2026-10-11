// F-001.1 e F-001.5: mesma seed + 1.000 passos = mesmo hash; 1 e 5 passos por
// frame dão o mesmo hash. Desde a F-002, os passos seguem o roteiro fixo de
// ComandosDoPasso (ROTEIRO_REFERENCIA: movimento, deslize e as duas costuras)
// na Charneca com Aldric. Com VDC_EVIDENCIAS=1 (scripts/verify.sh), grava o log
// de evidência e o hash de referência que a Playwright compara (F-001.11).
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fonteDoRoteiro, type Roteiro } from '../../src/logica/nucleo/comandos';
import { hex8 } from '../../src/logica/nucleo/hash';
import { PASSO_MS } from '../../src/logica/nucleo/passos';
import { criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { rodarFrame } from '../../src/logica/nucleo/driver';
import {
  BYTES_ESTADO,
  CAB,
  JOGADOR,
  TUTORIAL,
  VERSAO_LAYOUT,
  criarEstado,
  hashEstado,
  reiniciarEstado,
} from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA, SEED_PADRAO } from '../../src/logica/nucleo/referencia';
import { criarDadosDaVigilia, type DadosDaVigilia } from '../../src/logica/mundo/dados';
import charneca from '../../src/dados/regioes/charneca_das_lanternas.json';
import { DADOS_DA_CHARNECA as D } from './apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
const log: string[] = [];

function executar(seed: number, n: number, roteiro: Roteiro = ROTEIRO_REFERENCIA, dados: DadosDaVigilia = D): number {
  const e = criarEstado(seed, dados);
  avancar(e, dados, fonteDoRoteiro(roteiro), n);
  return hashEstado(e);
}

/** Frames com o delta dado, pelo driver de produção (rodarFrame), até chegar a `n` passos. */
function executarPorFrames(seed: number, n: number, deltaMs: number): { hash: number; frames: number; max: number } {
  const e = criarEstado(seed, D);
  const acc = criarAcumulador();
  const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
  let frames = 0;
  let max = 0;
  while (e.cab[CAB.passo]! < n) {
    max = Math.max(max, rodarFrame(e, D, acc, deltaMs, fonte));
    frames++;
  }
  expect(e.cab[CAB.passo]).toBe(n);
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

  it('valores de referência fixos (mudar layout, semeadura, hash, roteiro ou disposição exige atualizar aqui)', () => {
    expect(hex8(executar(1, PASSOS_REFERENCIA))).toBe('3510977e');
    expect(hex8(executar(424242, PASSOS_REFERENCIA))).toBe('3b7955cb');
  });

  it('o hash muda a cada passo e com qualquer byte do estado', () => {
    expect(executar(SEED, PASSOS_REFERENCIA - 1)).not.toBe(executar(SEED, PASSOS_REFERENCIA));
    const e = criarEstado(SEED, D);
    expect(e.bytes.length).toBe(BYTES_ESTADO);
    const base = hashEstado(e);
    for (let i = 0; i < BYTES_ESTADO; i++) {
      e.bytes[i] = e.bytes[i]! ^ 1;
      expect(hashEstado(e), `byte ${i}`).not.toBe(base);
      e.bytes[i] = e.bytes[i]! ^ 1;
    }
  });

  it('o cabeçalho guarda versão, seed, passo, relógio, tutoriais e disposição; reiniciar limpa um estado sujo', () => {
    const e = criarEstado(SEED, D, { tutoriaisVistos: TUTORIAL.mover });
    avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), 37);
    expect([e.cab[CAB.versao], e.cab[CAB.seed], e.cab[CAB.passo], e.cab[CAB.relogio]]).toEqual([VERSAO_LAYOUT, SEED, 37, 37]);
    expect([e.cab[CAB.tutoriaisVistos], e.cab[CAB.disposicao]]).toEqual([TUTORIAL.mover, D.impressao]);
    e.bytes.fill(0xab);
    reiniciarEstado(e, SEED, D);
    expect(hashEstado(e)).toBe(hashEstado(criarEstado(SEED, D)));
  });

  it('o roteiro de referência anda, desliza num obstáculo e cruza as costuras em x e em y', () => {
    const e = criarEstado(SEED, D);
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    let cruzouX = -1;
    let cruzouY = -1;
    let freados = 0;
    for (let k = 0; k < PASSOS_REFERENCIA; k++) {
      const [x0, y0] = [e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!];
      avancar(e, D, fonte, 1);
      const [x, y] = [e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!];
      if (Math.abs(x - x0) > 500 && cruzouX < 0) cruzouX = k;
      if (Math.abs(y - y0) > 1000 && cruzouY < 0) cruzouY = k;
      const d = Math.sqrt((Math.abs(x - x0) > 500 ? 0 : x - x0) ** 2 + (Math.abs(y - y0) > 1000 ? 0 : y - y0) ** 2);
      if (k >= 25 && d > 0.1 && d < 2.39) freados++;
    }
    expect(cruzouX).toBeGreaterThan(0);
    expect(cruzouY).toBeGreaterThan(cruzouX);
    expect(freados, 'passos de deslize (deslocamento menor que 2,4 px)').toBeGreaterThan(20);
    log.push(`roteiro: costura x no passo ${cruzouX}, costura y no passo ${cruzouY}, ${freados} passos de deslize`);
  });

  it('o hash muda com um único comando diferente e com outra disposição de obstáculos', () => {
    const base = executar(SEED, PASSOS_REFERENCIA);
    const outro: Roteiro = [...ROTEIRO_REFERENCIA, { passo: 990, mx: 0, my: 0.5 }, { passo: 991, mx: 0, my: 1 }];
    expect(executar(SEED, PASSOS_REFERENCIA, outro)).not.toBe(base);
    const semUm = criarDadosDaVigilia({ ...charneca, obstaculos: charneca.obstaculos.slice(1) }, { velocidade: 1 });
    expect(executar(SEED, 0, ROTEIRO_REFERENCIA, semUm)).not.toBe(executar(SEED, 0));
  });

  it.each([-1, 1.5, 2 ** 32, Number.NaN])('seed %s fora de u32 é erro', (s) => {
    expect(() => criarEstado(s, D)).toThrow();
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
    '# F-001 — log do teste de determinismo (Vitest, Node); desde a F-002, com o roteiro de ComandosDoPasso',
    `# gerado em ${new Date().toISOString()} com Node ${process.version}`,
    `# referencia: seed=${SEED} passos=${PASSOS_REFERENCIA} hash=${hex8(hash)} (comparado pela Playwright, F-001.11)`,
  ];
  writeFileSync(join(dir, 'determinismo.log'), [...cabecalho, ...log].join('\n') + '\n');
});
