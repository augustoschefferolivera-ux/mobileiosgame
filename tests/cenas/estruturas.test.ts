// Render das estruturas da F-008 (design/decisoes-F-008.md AR2, AR3, FG2, ES1): a borda da arena, a Fogueira, os obstáculos
// desativados e o escurecimento. Sem Phaser.
import { describe, expect, it } from 'vitest';
import { COR } from '../../src/cenas/paleta';
import { MOLDURA } from '../../src/cenas/render/atlas';
import { criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { ESCURECIMENTO, MEMBROS_DAS_ESTRUTURAS, alfaDoEscurecimento, prepararEstruturas } from '../../src/cenas/render/estruturas';
import { OBSTACULOS_DA_CHARNECA, prepararObstaculos } from '../../src/cenas/render/pickups';
import { ETAPA, FOGUEIRA_F32, FOGUEIRA_U8 } from '../../src/logica/nucleo/estado';
import { J, estadoCom } from '../logica/armas/apoio';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('escurecimento (ES1)', () => {
  it.each([
    [0, 0],
    [54000, 0],
    [54000 + 3600, 0.1],
    [54000 + 7200, 0.2],
    [68400, 0.4],
    [72000, 0.4],
    [82800, 0.4],
  ])('relógio %i → alfa %f', (relogio, esperado) => {
    expect(alfaDoEscurecimento(relogio)).toBeCloseTo(esperado, 10);
  });

  it('as constantes são as da D8', () => {
    expect(ESCURECIMENTO).toMatchObject({ inicioEmPassos: 54000, alfaPorDegrau: 0.1, alfaMaximo: 0.4 });
  });
});

describe('borda da arena e Fogueira (prepararEstruturas)', () => {
  it('sem arena e sem Fogueira, tudo invisível', () => {
    const e = estadoCom([]);
    const out = criarSaidaDeSprites(MEMBROS_DAS_ESTRUTURAS);
    prepararEstruturas(e, D, J.x, J.y, out);
    expect([...out.visivel]).toEqual([0, 0, 0, 0, 0]);
  });

  it('a arena: o anel de 224 pt de raio no centro da arena, na cópia mais próxima da câmera', () => {
    const e = estadoCom([]);
    e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] = 1;
    e.fogueiraF32[FOGUEIRA_F32.arenaX] = J.x + 100;
    e.fogueiraF32[FOGUEIRA_F32.arenaY] = J.y - 50;
    const out = criarSaidaDeSprites(MEMBROS_DAS_ESTRUTURAS);
    prepararEstruturas(e, D, J.x, J.y, out);
    expect([out.visivel[0], out.x[0], out.y[0], out.moldura[0], out.cor[0]]).toEqual([1, J.x + 100, J.y - 50, indiceDaMoldura('anel'), COR.laranjaQueimado]);
    // O anel do atlas tem 120 pt em 240 px: o diâmetro de 448 pt sai de escala 448 / 240.
    expect(MOLDURA.anel.largura * out.escalaX[0]!).toBeCloseTo(2 * D.combate.arenaRaio, 6);
    expect(out.visivel[1]).toBe(0);
  });

  it('a Fogueira acesa: anel do raio de 64 pt (mais forte com o menu aberto), base, chama e brilho no ponto dela', () => {
    const e = estadoCom([]);
    e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = J.x + 30;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = J.y;
    const out = criarSaidaDeSprites(MEMBROS_DAS_ESTRUTURAS);
    prepararEstruturas(e, D, J.x, J.y, out);
    expect([out.visivel[0], out.visivel[1], out.visivel[2], out.visivel[3], out.visivel[4]]).toEqual([0, 1, 1, 1, 1]);
    expect([out.x[1], out.y[1]]).toEqual([J.x + 30, J.y]);
    expect(MOLDURA.anel.largura * out.escalaX[1]!).toBeCloseTo(2 * D.combate.fogueiraRaio, 6);
    const fraco = out.alpha[1]!;
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.fogueira;
    prepararEstruturas(e, D, J.x, J.y, out);
    expect(out.alpha[1]).toBeGreaterThan(fraco);
  });

  it('o centro vem da cópia do toro mais próxima da câmera', () => {
    const e = estadoCom([]);
    e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = 10;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = 20;
    const out = criarSaidaDeSprites(MEMBROS_DAS_ESTRUTURAS);
    prepararEstruturas(e, D, 1160, 20, out);
    expect(out.x[1]).toBe(10 + 1170);
  });
});

describe('obstáculos desativados pela arena (AR3)', () => {
  it('visivel segue obstaculoAtivo; sem o vetor, todos aparecem', () => {
    const n = DADOS_DA_CHARNECA.obstaculos.n;
    expect(n).toBe(OBSTACULOS_DA_CHARNECA);
    const out = criarSaidaDeSprites(n);
    prepararObstaculos(DADOS_DA_CHARNECA, J.x, J.y, out);
    expect(out.visivel.reduce((a, b) => a + b, 0)).toBe(n);
    const ativo = new Uint8Array(n).fill(1);
    ativo[3] = 0;
    ativo[10] = 0;
    prepararObstaculos(DADOS_DA_CHARNECA, J.x, J.y, out, ativo);
    expect(out.visivel.reduce((a, b) => a + b, 0)).toBe(n - 2);
    expect([out.visivel[3], out.visivel[10]]).toEqual([0, 0]);
  });
});
