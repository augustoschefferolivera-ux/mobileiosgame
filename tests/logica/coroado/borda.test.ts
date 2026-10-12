// A borda da arena (design/decisoes-F-008.md AR2, §3 "Borda") na função isolada: quem estava dentro fica a ≤ R − r do centro;
// quem estava fora fica a ≥ R + r + 0,01 (a folga de 0,01 px é parte da regra, não arredondamento).
import { describe, expect, it } from 'vitest';
import { limitarPelaArena } from '../../../src/logica/mundo/borda';
import { COLISAO, ES } from '../../../src/logica/mundo/obstaculos';
import { CENARIO, FOGUEIRA_F32, TODOS_OS_TUTORIAIS, criarEstado } from '../../../src/logica/nucleo/estado';
import { DADOS_DA_CHARNECA as D } from '../apoio';

function arenaEm(cx: number, cy: number) {
  const e = criarEstado(1, D, { armas: [], tutoriaisVistos: TODOS_OS_TUTORIAIS, cenario: CENARIO.jogadorInvulneravel });
  e.fogueiraF32[FOGUEIRA_F32.arenaX] = cx;
  e.fogueiraF32[FOGUEIRA_F32.arenaY] = cy;
  return e;
}

function corpo(x: number, y: number, xAnt: number, yAnt: number, raio: number): void {
  COLISAO[ES.x] = x;
  COLISAO[ES.y] = y;
  COLISAO[ES.xAnt] = xAnt;
  COLISAO[ES.yAnt] = yAnt;
  COLISAO[ES.raio] = raio;
}

describe('limitarPelaArena (AR2)', () => {
  const R = D.combate.arenaRaio;

  it('quem estava fora e foi empurrado para dentro sai a R + r + 0,01 do centro', () => {
    const e = arenaEm(500, 500);
    corpo(500 + R + 4, 500, 500 + R + 80, 500, 16);
    limitarPelaArena(e, D, false);
    expect(COLISAO[ES.x]! - 500).toBeCloseTo(R + 16 + 0.01, 4);
    expect(COLISAO[ES.x]! - 500).toBeGreaterThan(R + 16 + 0.005);
    expect(COLISAO[ES.y]).toBe(500);
  });

  it('quem estava fora e continua fora não é tocado', () => {
    const e = arenaEm(500, 500);
    corpo(500 + R + 40, 500, 500 + R + 80, 500, 16);
    limitarPelaArena(e, D, false);
    expect(COLISAO[ES.x]).toBe(Math.fround(500 + R + 40));
  });

  it('quem estava dentro e passou fica a R − r do centro; o jogador (dentroFixo) também', () => {
    const e = arenaEm(500, 500);
    corpo(500 + R + 10, 500, 500 + R - 30, 500, 16);
    limitarPelaArena(e, D, false);
    expect(COLISAO[ES.x]! - 500).toBeCloseTo(R - 16, 3);
    corpo(500 + R + 10, 500, 500 + R + 90, 500, 16);
    limitarPelaArena(e, D, true);
    expect(COLISAO[ES.x]! - 500).toBeCloseTo(R - 16, 3);
  });
});
