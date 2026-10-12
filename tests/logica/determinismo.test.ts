// F-001.1 e F-001.5: mesma seed + 1.000 passos = mesmo hash; 1 e 5 passos por
// frame dão o mesmo hash. Desde a F-002, os passos seguem o roteiro fixo de
// ComandosDoPasso (ROTEIRO_REFERENCIA: movimento, deslize e as duas costuras)
// na Charneca com Aldric; desde a F-003, com a horda e o diretor ligados
// (design/decisoes-F-003.md §6). Com VDC_EVIDENCIAS=1 (scripts/verify.sh),
// grava o log de evidência e o hash de referência que a Playwright compara
// (F-001.11).
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
  JOGADOR_U8,
  MUNDO,
  TUTORIAL,
  VERSAO_LAYOUT,
  baseDoFluxo,
  criarEstado,
  hashEstado,
  hashPorSecao,
  reiniciarEstado,
  type ParametrosDaVigilia,
} from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../src/logica/nucleo/pool';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA, SEED_PADRAO } from '../../src/logica/nucleo/referencia';
import { RAIO_DO_JOGADOR } from '../../src/logica/mundo/jogador';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, deltaNoToro } from '../../src/logica/mundo/toro';
import type { DadosDaVigilia } from '../../src/logica/mundo/dados';
import charneca from '../../src/dados/regioes/charneca_das_lanternas.json';
import { parametrosDoCenario } from '../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO, PRODUCAO, SEM_ARMAS, SEM_HORDA, dadosDe, semBrasaFirme } from './apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
const log: string[] = [];

function executar(seed: number, n: number, roteiro: Roteiro = ROTEIRO_REFERENCIA, dados: DadosDaVigilia = D, params: Partial<ParametrosDaVigilia> = {}): number {
  const e = criarEstado(seed, dados, params);
  avancar(e, dados, fonteDoRoteiro(roteiro), n);
  return hashEstado(e);
}

/** Passos do cenário horda até a captura E3 (design/decisoes-F-003.md §8). */
const PASSOS_DA_HORDA = 1800;

/** O cenário horda da Playwright (?cenario=horda&teto=300), parado, até o passo da captura. */
function executarHorda(seed: number): number {
  const e = criarEstado(seed, D, { ...parametrosDoCenario('horda'), teto: 300 });
  avancar(e, D, PARADO, PASSOS_DA_HORDA);
  return hashEstado(e);
}

/** Frames com o delta dado, pelo driver de produção (rodarFrame), até chegar a `n` passos. */
function executarPorFrames(seed: number, n: number, deltaMs: number, params: Partial<ParametrosDaVigilia> = {}): { hash: number; frames: number; max: number } {
  const e = criarEstado(seed, D, params);
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

  it('valores de referência fixos (mudar layout, semeadura, hash, roteiro, disposição, horda, diretor ou armas exige atualizar aqui)', () => {
    // Desde a F-007 (estado v7: fase, Frasco, mancha e contadores; muda só o layout, pois nada da F-007 atua
    // ainda e a regressão v6 prova que os campos antigos não mudaram). Na 3b (dano com armadura e Brasa Firme,
    // Frasco) o HP e o contador `danoRecebido` mudam: 2175475d e de4a60fd (2c) viram os de baixo.
    // Na 3c (Almas soltas pelas mortes, fluxo drops) a seed 424242 muda: 8b2c35ab → 88a3a4f0 (a seed 1 ainda não soltou Alma até o passo 1.000).
    // F-006: c052c6c9 e 6ddd6d39. F-005: f39dd6b4 e 7c1b6c0c; F-004: 901adb6d e 9cdc2c63; F-003: e91ed119 e 6173ca75.
    expect(hex8(executar(1, PASSOS_REFERENCIA))).toBe('a5721bcc');
    expect(hex8(executar(424242, PASSOS_REFERENCIA))).toBe('88a3a4f0');
  });

  /** Vivos, spawns, mortes, passo da 1ª morte, passo do 1º acerto de contato, HP e o fluxo armas intocado, no passo 1.000. */
  const fatos = (seed: number, params: Partial<ParametrosDaVigilia> = {}): (number | boolean)[] => {
    // Sem Brasa Firme: os fatos da F-003 medem o dano bruto (o ×0,8 da F-007 muda o HP, DM7).
    const DB = semBrasaFirme(D);
    const e = criarEstado(seed, DB, params);
    const b = baseDoFluxo('armas');
    const rng0 = Array.from(e.rng.subarray(b, b + 4));
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    let acerto = -1;
    let morte = -1;
    for (let k = 1; k <= PASSOS_REFERENCIA; k++) {
      avancar(e, DB, fonte, 1);
      if (acerto < 0 && e.jogadorU8[JOGADOR_U8.invulContato]! > 0) acerto = k;
      if (morte < 0 && e.mundo[MUNDO.mortes]! > 0) morte = k;
    }
    const intocado = Array.from(e.rng.subarray(b, b + 4)).every((v, i) => v === rng0[i]);
    return [quantosAtivos(e.pool), e.mundo[MUNDO.spawns]!, e.mundo[MUNDO.mortes]!, morte, acerto, e.jogador[JOGADOR.hp]!, intocado];
  };

  it('com a horda e a Espada: vivos, spawns, mortes, a 1ª morte, o 1º acerto de contato e o HP ficam travados no passo 1.000', () => {
    const f = fatos(SEED);
    if (SEED === SEED_PADRAO) expect(f).toEqual([15, 15, 0, -1, 146, 138, true]);
    expect(fatos(424242)).toEqual([15, 19, 4, 505, 283, 135, true]);
    log.push(`horda no passo ${PASSOS_REFERENCIA}: vivos=${f[0]} spawns=${f[1]} mortes=${f[2]} 1a_morte=passo ${f[3]} 1o_acerto=passo ${f[4]} hp=${f[5]}`);
  });

  it('sem armas, os fatos da F-003 continuam os mesmos (regressão; o hash dos campos v3 está em armas/regressao-v3.test.ts)', () => {
    if (SEED === SEED_PADRAO) expect(fatos(SEED, SEM_ARMAS)).toEqual([15, 15, 0, -1, 146, 138, true]);
    expect(fatos(424242, SEM_ARMAS)).toEqual([15, 15, 0, -1, 283, 102, true]);
  });

  it('copiar o buffer no passo 500 para um estado novo e seguir os dois até o 1.000 dá o mesmo hash (nada fica fora do buffer)', () => {
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    const a = criarEstado(SEED, D);
    avancar(a, D, fonte, 500);
    const b = criarEstado(SEED + 1, D);
    avancar(b, D, fonte, 37);
    b.bytes.set(a.bytes);
    avancar(a, D, fonte, PASSOS_REFERENCIA - 500);
    avancar(b, D, fonte, PASSOS_REFERENCIA - 500);
    expect(hashEstado(b)).toBe(hashEstado(a));
    expect(hashEstado(a)).toBe(executar(SEED, PASSOS_REFERENCIA));
  });

  it('cenário horda (300 vivos, linha 19): duas execuções de 1.800 passos dão o mesmo hash, que a Playwright compara', () => {
    const a = executarHorda(SEED);
    expect(executarHorda(SEED)).toBe(a);
    log.push(`cenario horda: seed=${SEED} passos=${PASSOS_DA_HORDA} hash=${hex8(a)} (comparado pela Playwright no E3)`);
  });

  it('trilha a cada 100 passos, com o hash por seção (ADR-0002 §5)', () => {
    const e = criarEstado(SEED, D);
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    for (let k = 100; k <= PASSOS_REFERENCIA; k += 100) {
      avancar(e, D, fonte, 100);
      const s = hashPorSecao(e);
      expect(Object.keys(s)).toEqual(['cabecalho', 'rng', 'jogador', 'mundo', 'inimigos', 'projeteis', 'progressao', 'pickups', 'efeitos', 'combate', 'vigilia']);
      const secoes = Object.entries(s).map(([nome, h]) => `${nome}=${hex8(h)}`).join(' ');
      log.push(`trilha passo=${k} hash=${hex8(hashEstado(e))} ${secoes}`);
    }
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
  }, 30_000);

  it('o cabeçalho guarda versão, seed, passo, relógio, tutoriais e disposição; reiniciar limpa um estado sujo', () => {
    const e = criarEstado(SEED, D, { tutoriaisVistos: TUTORIAL.mover });
    avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), 37);
    expect([e.cab[CAB.versao], e.cab[CAB.seed], e.cab[CAB.passo], e.cab[CAB.relogio]]).toEqual([VERSAO_LAYOUT, SEED, 37, 37]);
    expect([e.cab[CAB.tutoriaisVistos], e.cab[CAB.disposicao]]).toEqual([TUTORIAL.mover, D.impressao]);
    e.bytes.fill(0xab);
    reiniciarEstado(e, SEED, D);
    expect(hashEstado(e)).toBe(hashEstado(criarEstado(SEED, D)));
  });

  it('sem horda, o roteiro de referência anda, desliza num obstáculo e cruza as costuras em x e em y', () => {
    const e = criarEstado(SEED, D, SEM_HORDA);
    const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
    let cruzouX = -1;
    let cruzouY = -1;
    let freados = 0;
    let primeiroTocado = -1;
    const o = D.obstaculos;
    for (let k = 0; k < PASSOS_REFERENCIA; k++) {
      const [x0, y0] = [e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!];
      avancar(e, D, fonte, 1);
      const [x, y] = [e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!];
      if (Math.abs(x - x0) > 500 && cruzouX < 0) cruzouX = k;
      if (Math.abs(y - y0) > 1000 && cruzouY < 0) cruzouY = k;
      const d = Math.sqrt((Math.abs(x - x0) > 500 ? 0 : x - x0) ** 2 + (Math.abs(y - y0) > 1000 ? 0 : y - y0) ** 2);
      if (k >= 25 && d > 0.1 && d < 2.39) freados++;
      for (let i = 0; i < o.n && primeiroTocado < 0; i++) {
        const dx = deltaNoToro(o.x[i]!, x, LARGURA_DO_MAPA);
        const dy = deltaNoToro(o.y[i]!, y, ALTURA_DO_MAPA);
        if (Math.sqrt(dx * dx + dy * dy) < o.r[i]! + RAIO_DO_JOGADOR + 1e-3) primeiroTocado = i;
      }
    }
    // Os fatos que referencia.ts e o ADR-0004 §2 descrevem.
    expect([cruzouX, cruzouY]).toEqual([258, 962]);
    expect([o.x[primeiroTocado], o.y[primeiroTocado]]).toEqual([230, 1278]);
    expect(freados, 'passos de deslize (deslocamento menor que 2,4 px)').toBeGreaterThan(20);
    log.push(`roteiro: costura x no passo ${cruzouX}, costura y no passo ${cruzouY}, ${freados} passos de deslize`);
  });

  it('o hash muda com um único comando diferente e com outra disposição de obstáculos', () => {
    const base = executar(SEED, PASSOS_REFERENCIA);
    const outro: Roteiro = [...ROTEIRO_REFERENCIA, { passo: 990, mx: 0, my: 0.5 }, { passo: 991, mx: 0, my: 1 }];
    expect(executar(SEED, PASSOS_REFERENCIA, outro)).not.toBe(base);
    const semUm = dadosDe({ ...charneca, obstaculos: charneca.obstaculos.slice(1) });
    expect(executar(SEED, 0, ROTEIRO_REFERENCIA, semUm)).not.toBe(executar(SEED, 0));
    const semHorda = criarEstado(SEED, D, SEM_HORDA);
    avancar(semHorda, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), PASSOS_REFERENCIA);
    expect(hashEstado(semHorda)).not.toBe(base);
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
  it('mesmo hash no passo 1.000, na Vigília de produção (com os ataques dos inimigos)', () => {
    const um = executarPorFrames(SEED, PASSOS_REFERENCIA, PASSO_MS, PRODUCAO);
    const cinco = executarPorFrames(SEED, PASSOS_REFERENCIA, 5 * PASSO_MS, PRODUCAO);
    expect(um.max).toBe(1);
    expect(cinco.max).toBe(5);
    expect(um.frames).toBe(PASSOS_REFERENCIA);
    expect(cinco.frames).toBe(PASSOS_REFERENCIA / 5);
    expect(cinco.hash).toBe(um.hash);
    expect(um.hash).toBe(executar(SEED, PASSOS_REFERENCIA, ROTEIRO_REFERENCIA, D, PRODUCAO));
    log.push(
      `1 passo/frame: ${um.frames} frames hash=${hex8(um.hash)}; 5 passos/frame: ${cinco.frames} frames hash=${hex8(cinco.hash)}; iguais=${um.hash === cinco.hash}`,
    );
  });
});

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1') return;
  // A Playwright roda a Vigília de produção sem ?cenario, que liga os ataques (ET3, VT1).
  const hash = executar(SEED, PASSOS_REFERENCIA, ROTEIRO_REFERENCIA, D, PRODUCAO);
  mkdirSync(join(RAIZ, '.verify'), { recursive: true });
  writeFileSync(
    join(RAIZ, '.verify', 'referencia-f001.json'),
    JSON.stringify({ seed: SEED, passos: PASSOS_REFERENCIA, hash: hex8(hash) }, null, 2) + '\n',
  );
  writeFileSync(
    join(RAIZ, '.verify', 'referencia-horda.json'),
    JSON.stringify({ seed: SEED, passos: PASSOS_DA_HORDA, hash: hex8(executarHorda(SEED)) }, null, 2) + '\n',
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
