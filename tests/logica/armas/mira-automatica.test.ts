// Mira automática da Espada (pedido do usuário, 2026-10-13; ADR-0012 §9): o golpe aponta para o inimigo vivo mais
// próximo do jogador (centro a centro), empate pelo menor slot; sem inimigo na consulta do golpe, vale a direção do jogador.
import { describe, expect, it } from 'vitest';
import { rodarArmas } from '../../../src/logica/armas/armas';
import { ARMA } from '../../../src/logica/armas/tabela';
import { JOGADOR, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS as D, semMiraAutomatica } from '../apoio';
import { estadoCom, eventos, por } from './apoio';

const E = ARMA.espada_longa_do_juramento;

/** Um golpe de ida direto; devolve a mira gravada no evento (vetor unitário). */
function mira(e: Estado, dados = D): [number, number] {
  e.build.recarga[0] = 0;
  e.build.golpe[0] = 0;
  rodarArmas(e, dados);
  const g = eventos(e).filter((v) => v.tipo === EVENTO.golpe).at(-1)!;
  return [g.f[0], g.f[1]];
}

function perto(a: [number, number], x: number, y: number): void {
  const n = Math.hypot(x, y);
  expect(a[0]).toBeCloseTo(x / n, 5);
  expect(a[1]).toBeCloseTo(y / n, 5);
}

describe('mira automática da Espada', () => {
  it('aponta para o inimigo vivo mais próximo, em qualquer lado, inclusive atrás do jogador', () => {
    const posicoes: [number, number][] = [[0, -50], [50, 0], [0, 50], [-50, 0], [30, 40], [-30, -40]];
    for (const [dx, dy] of posicoes) {
      const e = estadoCom([[E, 1]]);
      por(e, TIPO.oco_das_lanternas, dx, dy);
      perto(mira(e), dx, dy);
    }
  });

  it('entre dois, escolhe o mais próximo (mesmo com o mais longe na direção do jogador)', () => {
    const e = estadoCom([[E, 1]]);
    por(e, TIPO.oco_das_lanternas, 0, -70); // na direção do jogador (cima), mais longe
    por(e, TIPO.oco_das_lanternas, 40, 30); // a 50 px, atrás à direita
    perto(mira(e), 40, 30);
  });

  it('empate de distância: vale o menor slot (o 1º a nascer), em qualquer ordem de chegada', () => {
    const e = estadoCom([[E, 1]]);
    const a = por(e, TIPO.oco_das_lanternas, -40, 0);
    const b = por(e, TIPO.oco_das_lanternas, 40, 0);
    expect(a).toBeLessThan(b);
    perto(mira(e), -40, 0);
    const f = estadoCom([[E, 1]]);
    por(f, TIPO.oco_das_lanternas, 0, 45);
    por(f, TIPO.oco_das_lanternas, 0, -45);
    perto(mira(f), 0, 45);
  });

  it('um inimigo morto (hp ≤ 0, ainda no pool) não é escolhido', () => {
    const e = estadoCom([[E, 1]]);
    const morto = por(e, TIPO.oco_das_lanternas, 20, 0);
    por(e, TIPO.oco_das_lanternas, -60, 0);
    e.inimigos.hp[morto] = 0;
    perto(mira(e), -60, 0);
  });

  it('sem inimigo ao alcance de busca (alcance do golpe + R_MAX), usa a direção do jogador', () => {
    const e = estadoCom([[E, 1]]);
    e.jogador[JOGADOR.dirX] = 1;
    e.jogador[JOGADOR.dirY] = 0;
    por(e, TIPO.oco_das_lanternas, -400, 0);
    expect(mira(e)).toEqual([1, 0]);
    const f = estadoCom([[E, 1]]);
    expect(mira(f)).toEqual([0, -1]); // sem ninguém, a direção inicial (para cima)
  });

  it('o Coroado e o chefe (corpos grandes) entram na busca', () => {
    const e = estadoCom([[E, 1]]);
    por(e, TIPO.oco_das_lanternas, -100, 0);
    e.inimigos.hp[por(e, TIPO.oco_grande_coroado, 0, 60)] = 1000;
    perto(mira(e), 0, 1);
    const f = estadoCom([[E, 1]]);
    por(f, TIPO.oco_das_lanternas, 0, -100);
    // O chefe nasce sem HP pelo nascimento comum (o ciclo da luta o define): aqui, um HP qualquer.
    f.inimigos.hp[por(f, TIPO.o_lanterneiro, 70, 0)] = 1000;
    perto(mira(f), 1, 0);
  });

  it('mover o joystick (a direção do jogador) não muda a mira', () => {
    const e = estadoCom([[E, 1]]);
    e.inimigos.hp[por(e, TIPO.oco_das_lanternas, 30, 40)] = 1000; // sobrevive aos 5 golpes
    const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0], [Math.SQRT1_2, Math.SQRT1_2]];
    const miras = dirs.map(([x, y]) => {
      e.jogador[JOGADOR.dirX] = x;
      e.jogador[JOGADOR.dirY] = y;
      return mira(e);
    });
    for (const m of miras) expect(m).toEqual(miras[0]);
    perto(miras[0]!, 30, 40);
  });

  it('com a mira automática desligada nos dados (regressões antigas), vale a direção do jogador', () => {
    const e = estadoCom([[E, 1]]);
    por(e, TIPO.oco_das_lanternas, 30, 40);
    expect(mira(e, semMiraAutomatica(D))).toEqual([0, -1]);
  });
});

describe('a onda da União segue a mira do golpe', () => {
  it('a Lâmina com o inimigo atrás: golpe e onda saem na direção dele, não na do jogador', () => {
    const e = estadoCom([[ARMA.lamina_do_juramento_eterno, 1]]);
    e.inimigos.hp[por(e, TIPO.oco_das_lanternas, 0, 50)] = 1000;
    perto(mira(e), 0, 1);
    const o = e.poolDeEfeitos.posicao.findIndex((p) => p >= 0);
    expect([e.efeitos.dirX[o], e.efeitos.dirY[o]]).toEqual([0, 1]);
  });
});
