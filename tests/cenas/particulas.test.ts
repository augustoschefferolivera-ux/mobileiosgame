// Partículas do render (F-011, style card §6): nascem dos eventos do anel (acerto, morte, aparo) e das brasas do
// Frasco, com direção por hash do passo e do alvo (a imagem não depende do fps), andam pela idade em passos e somem
// no fim da vida. Pool cheio recusa, sem reciclar.
import { describe, expect, it } from 'vitest';
import { MEMBROS_DAS_PARTICULAS, prepararParticulas } from '../../src/cenas/render/armas';
import { criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { CAPACIDADE_DE_PARTICULAS, EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { COR_DA_CHAVE } from '../../src/arte/paleta';
import { ARMA } from '../../src/logica/armas/tabela';
import { CAB, JOGADOR, JOGADOR4_U8, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { CAUSA, EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../../src/logica/nucleo/eventos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

function consumirEm(ef: EfeitosDaVigilia, e: Estado, passo: number): void {
  e.cab[CAB.passo] = passo;
  ef.consumir(e, true);
}

function acerto(e: Estado, passo: number, arma: number, slot: number): void {
  FLOATS_DO_EVENTO[0] = 600;
  FLOATS_DO_EVENTO[1] = 1200;
  FLOATS_DO_EVENTO[2] = 5;
  gravarEvento(e.eventos, passo, EVENTO.acerto, arma, 0, slot, 0, TIPO.oco_das_lanternas, 0, CAUSA.arma);
}

const vivas = (ef: EfeitosDaVigilia): number => ef.particulas.ativo.reduce((a, v) => a + v, 0);

describe('partículas (F-011)', () => {
  it('acerto: 3 faíscas de brasa da Espada, 2 lascas de sal das Facas, 1 grão do Círculo; a mesma sequência dá as mesmas partículas', () => {
    const quantas: number[] = [];
    for (const arma of [ARMA.espada_longa_do_juramento, ARMA.facas_de_sal, ARMA.circulo_de_sal]) {
      const e = criarEstado(1, D);
      const ef = new EfeitosDaVigilia(D.tipos);
      acerto(e, 10, arma, 7);
      consumirEm(ef, e, 10);
      quantas.push(vivas(ef));
      const cores = new Set([...Array(CAPACIDADE_DE_PARTICULAS).keys()].filter((k) => ef.particulas.ativo[k] === 1).map((k) => ef.particulas.cor[k]));
      if (arma === ARMA.espada_longa_do_juramento) for (const c of cores) expect([COR_DA_CHAVE.Y, COR_DA_CHAVE.A]).toContain(c);
      else for (const c of cores) expect([COR_DA_CHAVE.S, COR_DA_CHAVE.H]).toContain(c);
    }
    expect(quantas).toEqual([3, 2, 1]);
    const rodar = (): number[] => {
      const e = criarEstado(1, D);
      const ef = new EfeitosDaVigilia(D.tipos);
      acerto(e, 10, ARMA.espada_longa_do_juramento, 7);
      consumirEm(ef, e, 10);
      return [...ef.particulas.vx.subarray(0, 3), ...ef.particulas.vy.subarray(0, 3)];
    };
    expect(rodar()).toEqual(rodar());
  });

  it('morte: 4 grãos de cinza (2 pt) que sobem e caem; aparo: 10 faíscas em anel em volta do jogador', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    FLOATS_DO_EVENTO[0] = 500;
    FLOATS_DO_EVENTO[1] = 900;
    gravarEvento(e.eventos, 20, EVENTO.morte, 0, 0, 3, 0, TIPO.oco_das_lanternas, 0, CAUSA.arma);
    consumirEm(ef, e, 20);
    expect(vivas(ef)).toBe(4);
    expect(ef.particulas.grande.subarray(0, 4).every((g) => g === 1)).toBe(true);
    gravarEvento(e.eventos, 21, EVENTO.aparo, 0, 0, 0, 0, 0, 0, 0);
    consumirEm(ef, e, 21);
    expect(vivas(ef)).toBe(14);
    expect([ef.particulas.x[4], ef.particulas.y[4]]).toEqual([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]);
  });

  it('o desenho: posição pela idade (com a gravidade), o ponto na cor da paleta, some no fim da vida', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    acerto(e, 10, ARMA.espada_longa_do_juramento, 7);
    consumirEm(ef, e, 10);
    const out = criarSaidaDeSprites(MEMBROS_DAS_PARTICULAS);
    e.cab[CAB.passo] = 15;
    prepararParticulas(ef, e, 1, 600, 1200, out);
    const pa = ef.particulas;
    const t = 5;
    // O acerto nasce a 8 pt do ponto do evento (600, 1200), na direção da velocidade.
    expect(Math.hypot(pa.x[0]! - 600, pa.y[0]! - 1200)).toBeCloseTo(8, 9);
    expect(Math.atan2(pa.y[0]! - 1200, pa.x[0]! - 600)).toBeCloseTo(Math.atan2(pa.vy[0]!, pa.vx[0]!), 9);
    expect(out.visivel[0]).toBe(1);
    expect(out.x[0]).toBe(Math.round((pa.x[0]! + pa.vx[0]! * t) * 2) / 2);
    expect(out.y[0]).toBe(Math.round((pa.y[0]! + pa.vy[0]! * t + 0.5 * pa.gravidade[0]! * t * t) * 2) / 2);
    expect([out.moldura[0], out.cor[0], out.alpha[0]]).toEqual([indiceDaMoldura('ponto'), pa.cor[0], 1]);
    consumirEm(ef, e, 40);
    prepararParticulas(ef, e, 1, 600, 1200, out);
    expect(out.visivel.subarray(0, 3).every((v) => v === 0)).toBe(true);
  });

  it('Frasco: uma brasa a cada 5 passos, nascida uma vez por passo (dois quadros no mesmo passo não duplicam)', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    e.jogador4U8[JOGADOR4_U8.frascoPasso] = 3;
    for (let p = 100; p < 110; p++) {
      consumirEm(ef, e, p);
      consumirEm(ef, e, p);
    }
    expect(vivas(ef)).toBe(2);
  });
});
