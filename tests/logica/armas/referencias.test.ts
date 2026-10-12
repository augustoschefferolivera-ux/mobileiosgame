// E5 e as referências da F-004 (design/decisoes-F-004.md §8). Com
// VDC_EVIDENCIAS=1 (scripts/verify.sh), grava para a Playwright:
//  - .verify/referencia-f004.json: o passo da 1ª morte da Vigília normal com o
//    jogador parado e o hash do estado nesse passo (F-004.4, Node × Chromium);
//  - .verify/referencia-tres-armas.json: o passo da captura E7 (o 1º passo ≥ 600
//    com um golpe de idade ≤ 2 e uma faca em voo) e o hash nele.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMA } from '../../../src/logica/armas/tabela';
import { hex8 } from '../../../src/logica/nucleo/hash';
import { CAB, MUNDO, criarEstado, equiparArma, esvaziarBuild, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { SEED_PADRAO } from '../../../src/logica/nucleo/referencia';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO, PRODUCAO } from '../apoio';
import { eventos } from './apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);

/** Penetração média e máxima dos pares sobrepostos, em fração da soma dos raios (S5 da D3). */
function penetracao(e: Estado): { media: number; maxima: number } {
  const ids: number[] = [];
  for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0) ids.push(s);
  let pares = 0;
  let soma = 0;
  let maxima = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const r = D.tipos.raio[e.inimigos.tipo[a]!]! + D.tipos.raio[e.inimigos.tipo[b]!]!;
      const d = Math.hypot(deltaNoToro(e.inimigos.x[a]!, e.inimigos.x[b]!, W), deltaNoToro(e.inimigos.y[a]!, e.inimigos.y[b]!, H));
      if (d >= r) continue;
      pares++;
      soma += (r - d) / r;
      maxima = Math.max(maxima, (r - d) / r);
    }
  }
  return { media: pares ? soma / pares : 0, maxima };
}

describe('horda depois do pulso (E5)', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: na linha 19 assentada, um pulso do Círculo nv7 e a build esvaziada; a horda volta à S5 em ≤ 120 passos`, () => {
      const e = criarEstado(seed, D, { ...parametrosDoCenario('horda'), teto: 300 });
      avancar(e, D, PARADO, 6600);
      equiparArma(e, D, ARMA.circulo_de_sal, 7);
      avancar(e, D, PARADO, 1);
      expect(eventos(e).filter((v) => v.tipo === EVENTO.pulso)).toHaveLength(1);
      esvaziarBuild(e);
      // Até o fim do 12º passo de empurrão.
      avancar(e, D, PARADO, 12);
      let voltou = -1;
      for (let k = 0; k <= 120 && voltou < 0; k++) {
        const p = penetracao(e);
        if (p.media <= 0.25 && p.maxima <= 0.7) voltou = k;
        else avancar(e, D, PARADO, 1);
      }
      expect(voltou).toBeGreaterThanOrEqual(0);
    }, 60_000);
  }
});

/** Passo da 1ª morte da Vigília normal com o jogador parado (F-004.4), até 1.800. */
function primeiraMorte(seed: number): { passo: number; hash: string } {
  // Com os ataques ligados, como na Vigília de produção que a Playwright abre (decisoes-F-006 ET3).
  const e = criarEstado(seed, D, { ...PRODUCAO, teto: 300 });
  for (let k = 1; k <= 1800; k++) {
    avancar(e, D, PARADO, 1);
    if (e.mundo[MUNDO.mortes]! > 0) return { passo: k, hash: hex8(hashEstado(e)) };
  }
  return { passo: -1, hash: '' };
}

/** Passo da captura E7 no tres_armas: o 1º ≥ 600 com um golpe de idade ≤ 2 e uma faca em voo (teto de 600 passos). */
function passoDaCaptura(seed: number): { passo: number; hash: string } {
  const e = criarEstado(seed, D, { ...parametrosDoCenario('tres_armas'), teto: 300 });
  avancar(e, D, PARADO, 600);
  for (let k = 0; k <= 600; k++) {
    const passo = e.cab[CAB.passo]!;
    const golpe = eventos(e).some((v) => v.tipo === EVENTO.golpe && passo - v.passo <= 2);
    if (golpe && quantosAtivos(e.poolDeProjeteis) > 0) return { passo, hash: hex8(hashEstado(e)) };
    avancar(e, D, PARADO, 1);
  }
  return { passo: -1, hash: '' };
}

describe('referências da F-004 (Node × Chromium)', () => {
  it(`seed ${SEED}: a Vigília normal parada mata o 1º Oco antes do passo 1.800 (F-004.4)`, () => {
    const r = primeiraMorte(SEED);
    expect(r.passo).toBeGreaterThan(0);
    expect(r.passo).toBeLessThanOrEqual(1800);
    expect(primeiraMorte(SEED)).toEqual(r);
  });

  it(`seed ${SEED}: o tres_armas tem um passo de captura (golpe de idade ≤ 2 e faca em voo) até o 1.200`, () => {
    const r = passoDaCaptura(SEED);
    expect(r.passo).toBeGreaterThanOrEqual(600);
    expect(r.passo).toBeLessThanOrEqual(1200);
  });
});

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1') return;
  mkdirSync(join(RAIZ, '.verify'), { recursive: true });
  const morte = primeiraMorte(SEED);
  writeFileSync(join(RAIZ, '.verify', 'referencia-f004.json'), JSON.stringify({ seed: SEED, passo: morte.passo, hash: morte.hash }, null, 2) + '\n');
  const captura = passoDaCaptura(SEED);
  writeFileSync(join(RAIZ, '.verify', 'referencia-tres-armas.json'), JSON.stringify({ seed: SEED, passo: captura.passo, hash: captura.hash }, null, 2) + '\n');
});
