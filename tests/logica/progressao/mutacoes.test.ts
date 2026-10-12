// Testes que matam as mutações sobreviventes da revisão da F-005 (A1, A4 a A7,
// A11, A12): fila de baús, dano vivo depois de carta e baú, semente do level up,
// ordem das fases do passo, ajuda dos 35% no limite, voo das Cinzas pelo toro
// e os desempates da junção. Cada bloco diz a mutação que ele reprova.
import { describe, expect, it } from 'vitest';
import { BAU, BYTES_POR_BAU, CAB, CENARIO, FILA_DE_BAUS, JOGADOR, JOGADOR2, MUNDO2, TIPO_DE_PICKUP } from '../../../src/logica/nucleo/estado';
import { CAUSA, EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W } from '../../../src/logica/mundo/toro';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { abrirBau } from '../../../src/logica/progressao/bau';
import { danoVivo } from '../../../src/logica/progressao/dano';
import { confirmarModal } from '../../../src/logica/progressao/modal';
import { gerarOferta, limparOferta, nivelOfertado, passivaDaAjuda } from '../../../src/logica/progressao/oferta';
import { soltarBau } from '../../../src/logica/progressao/pickups';
import { PARADO } from '../apoio';
import { eventos, por } from '../armas/apoio';
import { CARTA, CIRCULO, D, ELMO, ESPADA, FACAS, J, LAMINA, LUVAS, P, cinzaEm, estadoDe, oferta, pickupEm } from './apoio';

const DEZ_MINUTOS = 36000;
const MEIO_DIA = 43200;

const fila = (e: ReturnType<typeof estadoDe>, k: number): number[] => [...e.filaDeBaus.slice(k * BYTES_POR_BAU, (k + 1) * BYTES_POR_BAU)];

describe('fila de baús desliza ao confirmar (A1: sem o copyWithin de confirmarModal)', () => {
  it('3 baús de conteúdos diferentes (União, itens, itens): cada confirmação põe na frente a entrada que era a 2ª e zera a última', () => {
    const e = estadoDe([[ESPADA, 8], [FACAS, 1], [CIRCULO, 1]], [[ELMO, 1], [LUVAS, 1]]);
    e.cab[CAB.relogio] = DEZ_MINUTOS;
    for (const indice of [1, 2, 3]) abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, indice));
    expect(e.progresso[P.bausPorFechar]).toBe(3);
    const [a, b, c] = [fila(e, 0), fila(e, 1), fila(e, 2)];
    expect(a[BAU.uniao]).toBe(1);
    expect(b[BAU.uniao]).toBe(0);
    expect(new Set([a.join(), b.join(), c.join()]).size).toBe(3);
    expect(fila(e, 3)).toEqual(new Array(BYTES_POR_BAU).fill(0));
    confirmarModal(e, D, 0);
    expect([fila(e, 0), fila(e, 1), fila(e, 2)]).toEqual([b, c, new Array(BYTES_POR_BAU).fill(0)]);
    confirmarModal(e, D, 0);
    expect([fila(e, 0), fila(e, 1)]).toEqual([c, new Array(BYTES_POR_BAU).fill(0)]);
    confirmarModal(e, D, 0);
    for (let k = 0; k < FILA_DE_BAUS; k++) expect(fila(e, k)).toEqual(new Array(BYTES_POR_BAU).fill(0));
    expect(e.progresso[P.bausPorFechar]).toBe(0);
  });

  it('com a fila cheia (4), a última entrada vira a 3ª e a 4ª zera', () => {
    const e = estadoDe([[ESPADA, 1], [FACAS, 1], [CIRCULO, 1]], [[ELMO, 1], [LUVAS, 1]]);
    for (let i = 1; i <= FILA_DE_BAUS; i++) abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, i));
    const antes = [0, 1, 2, 3].map((k) => fila(e, k));
    confirmarModal(e, D, 0);
    expect([0, 1, 2, 3].map((k) => fila(e, k))).toEqual([antes[1], antes[2], antes[3], new Array(BYTES_POR_BAU).fill(0)]);
  });
});

describe('dano vivo refeito depois da carta e do baú (A4: sem recalcularDano em aplicarCarta ou em abrirBau)', () => {
  /** Dano de um acerto real de Espada contra um Oco Grande parado à frente. */
  function danoDoAcerto(e: ReturnType<typeof estadoDe>): number {
    const s = por(e, TIPO.oco_grande, 0, -40);
    e.inimigos.hp[s] = 100000;
    avancar(e, D, PARADO, 1);
    return eventos(e).find((x) => x.tipo === EVENTO.acerto && x.slot === s)!.f[2];
  }

  it('carta Luvas nova (Poder +8%): o dano vivo e o acerto real passam a valer o de uma build que já nasceu com as Luvas', () => {
    const e = estadoDe([[ESPADA, 1]]);
    const antes = danoVivo(e, ESPADA, 1);
    e.progresso[P.nivel] = 2;
    e.progresso[P.niveisPendentes] = 1;
    e.oferta.tipo.set([CARTA.passivaNova, CARTA.bolsa, CARTA.bolsa]);
    e.oferta.item.set([LUVAS, 0, 0]);
    confirmarModal(e, D, 0);
    const esperado = danoVivo(estadoDe([[ESPADA, 1]], [[LUVAS, 1]]), ESPADA, 1);
    expect(esperado).toBeCloseTo(antes * 1.08, 12);
    expect(danoVivo(e, ESPADA, 1)).toBe(esperado);
    expect(e.derivados.danoOnda[LAMINA]).toBe(estadoDe([[ESPADA, 1]], [[LUVAS, 1]]).derivados.danoOnda[LAMINA]);
    expect(danoDoAcerto(e)).toBe(Math.fround(esperado));
  });

  it('carta de melhoria das Luvas (nv1 → nv2): o dano vivo sobe para o da build com Luvas nv2', () => {
    const e = estadoDe([[ESPADA, 1]], [[LUVAS, 1]]);
    e.progresso[P.nivel] = 2;
    e.progresso[P.niveisPendentes] = 1;
    e.oferta.tipo.set([CARTA.melhoriaDePassiva, CARTA.bolsa, CARTA.bolsa]);
    e.oferta.item.set([LUVAS, 0, 0]);
    confirmarModal(e, D, 0);
    expect(danoVivo(e, ESPADA, 1)).toBe(danoVivo(estadoDe([[ESPADA, 1]], [[LUVAS, 2]]), ESPADA, 1));
  });

  it('baú que sobe as Luvas (único item elegível): o dano vivo e o acerto real passam a valer o das Luvas nv2', () => {
    const e = estadoDe([[ESPADA, 8]], [[LUVAS, 1]]);
    abrirBau(e, D, pickupEm(e, 200, 0, TIPO_DE_PICKUP.bauComum, 1));
    expect(e.passivas.nivel[0]).toBe(2);
    const esperado = danoVivo(estadoDe([[ESPADA, 8]], [[LUVAS, 2]]), ESPADA, 8);
    expect(danoVivo(e, ESPADA, 8)).toBe(esperado);
    confirmarModal(e, D, 0);
    expect(danoDoAcerto(e)).toBe(Math.fround(esperado));
  });
});

describe('semente do level up é o nível ofertado (A5: semear com o nível atual)', () => {
  function ofertaDe(nivel: number, pendentes: number, seed: number): [number, number][] {
    const e = estadoDe([[ESPADA, 2], [FACAS, 1]], [[LUVAS, 1]]);
    e.cab[CAB.seed] = seed;
    e.progresso[P.nivel] = nivel;
    e.progresso[P.niveisPendentes] = pendentes;
    limparOferta(e);
    gerarOferta(e, D);
    return oferta(e);
  }

  it('nivelOfertado = nível − pendentes + 1, e a oferta com 2 pendentes é a do nível ofertado, em 40 seeds', () => {
    const e = estadoDe([[ESPADA, 1]]);
    e.progresso[P.nivel] = 5;
    e.progresso[P.niveisPendentes] = 3;
    expect(nivelOfertado(e)).toBe(3);
    let diferentes = 0;
    for (let s = 1; s <= 40; s++) {
      expect(ofertaDe(3, 2, s), `seed ${s}`).toEqual(ofertaDe(2, 1, s));
      expect(ofertaDe(5, 3, s), `seed ${s}`).toEqual(ofertaDe(3, 1, s));
      if (JSON.stringify(ofertaDe(3, 1, s)) !== JSON.stringify(ofertaDe(2, 1, s))) diferentes++;
    }
    // Níveis diferentes dão ofertas diferentes (o teste acima distingue a semente).
    expect(diferentes).toBeGreaterThan(10);
  });
});

describe('ajuda dos 35% no limite exato das 12:00 (A7)', () => {
  it('43.199 nunca força; 43.200 e 43.201 forçam o Elmo (Espada nv8, sem Elmo, sem União, com vaga de passiva)', () => {
    const e = estadoDe([[ESPADA, 8]]);
    expect(D.progressao.relogioDaAjuda).toBe(MEIO_DIA);
    const por_relogio = (r: number): number => {
      e.cab[CAB.relogio] = r;
      return passivaDaAjuda(e, D);
    };
    expect([MEIO_DIA - 1, MEIO_DIA, MEIO_DIA + 1].map(por_relogio)).toEqual([0, ELMO, ELMO]);
  });
});

describe('ordem das fases do passo (A6: pickups antes das armas, ou depois do contato)', () => {
  it('o inimigo morto pela arma a 10 px: a Cinza nasce e é coletada no mesmo passo (pickups depois das armas)', () => {
    const e = estadoDe([[ESPADA, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -10);
    e.inimigos.hp[s] = 1;
    expect(avancar(e, D, PARADO, 1)).toBe(1);
    expect(e.inimigos.hp[s]).toBeLessThanOrEqual(0);
    expect([e.progresso[P.xpTotal], quantosAtivos(e.poolDePickups)]).toEqual([1, 0]);
  });

  it('o nível cruzado no passo sobe o HP antes do contato do mesmo passo: com HP igual ao dano, sobrevive com 2 (pickups antes do contato)', () => {
    const e = estadoDe([], [], { cenario: CENARIO.diretorDesligado, xpInicial: 10 });
    const s = por(e, TIPO.oco_das_lanternas, 10, 0);
    const bruto = Math.fround(e.inimigos.dano[s]! * 0.3);
    expect(bruto).toBeGreaterThan(0);
    e.jogador[JOGADOR.hp] = bruto;
    expect(avancar(e, D, PARADO, 1)).toBe(1);
    expect(e.jogador2[JOGADOR2.hpMax]).toBe(152);
    expect(e.jogador[JOGADOR.hp]).toBe(2);
  });
});

describe('voo das Cinzas pelo toro e xAnt/yAnt (A11)', () => {
  /** Jogador em (jx, jy); Cinza a `d` px do outro lado da costura; devolve o slot. */
  function costura(jx: number, jy: number, cx: number, cy: number) {
    const e = estadoDe([]);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = jx;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = jy;
    const s = cinzaEm(e, 0, 0, 7);
    e.pickups.x[s] = e.pickups.xAnt[s] = cx;
    e.pickups.y[s] = e.pickups.yAnt[s] = cy;
    return { e, s };
  }

  it.each([
    ['x, jogador perto de 0', 40, 1000, W - 3, 1000, +8, 0],
    ['x, jogador perto de W', W - 40, 1000, 3, 1000, -8, 0],
    ['y, jogador perto de 0', 500, 40, 500, H - 3, 0, +8],
    ['y, jogador perto de H', 500, H - 40, 500, 3, 0, -8],
  ])('costura em %s: a Cinza a 43 px voa 8 px na direção do jogador, atravessa a borda e é coletada', (_nome, jx, jy, cx, cy, vx, vy) => {
    const { e, s } = costura(jx, jy, cx, cy);
    avancar(e, D, PARADO, 1);
    const norm = (v: number, m: number): number => ((v % m) + m) % m;
    expect(e.pickups.x[s]).toBeCloseTo(norm(cx + vx, W), 3);
    expect(e.pickups.y[s]).toBeCloseTo(norm(cy + vy, H), 3);
    expect(e.pickups.x[s]).toBeGreaterThanOrEqual(0);
    expect(e.pickups.x[s]).toBeLessThan(W);
    expect(e.pickups.y[s]).toBeGreaterThanOrEqual(0);
    expect(e.pickups.y[s]).toBeLessThan(H);
    avancar(e, D, PARADO, 10);
    expect(e.progresso[P.xpTotal]).toBe(7);
    expect(quantosAtivos(e.poolDePickups)).toBe(0);
  });

  it('xAnt e yAnt guardam a posição do passo anterior (diagonal a 42,4 px)', () => {
    const e = estadoDe([]);
    const s = cinzaEm(e, 30, 30);
    const x0 = e.pickups.x[s]!;
    const y0 = e.pickups.y[s]!;
    avancar(e, D, PARADO, 1);
    const x1 = e.pickups.x[s]!;
    const y1 = e.pickups.y[s]!;
    expect([x1 < x0, y1 < y0]).toEqual([true, true]);
    expect([e.pickups.xAnt[s], e.pickups.yAnt[s]]).toEqual([x0, y0]);
    avancar(e, D, PARADO, 1);
    expect([e.pickups.xAnt[s], e.pickups.yAnt[s]]).toEqual([x1, y1]);
  });
});

describe('desempate da Cinza mais próxima na junção (A12)', () => {
  /** Pool de pickups cheio de Cinzas de valor 1 longe (J + (0, 600)), exceto as postas à mão depois. */
  function poolCheio() {
    const e = estadoDe([]);
    for (let k = 0; k < 512; k++) cinzaEm(e, 0, 600 - (k % 7), 1);
    return e;
  }
  const poe = (e: ReturnType<typeof estadoDe>, s: number, x: number, y: number): void => {
    e.pickups.x[s] = e.pickups.xAnt[s] = x;
    e.pickups.y[s] = e.pickups.yAnt[s] = y;
  };

  it('Cinza nova com o pool cheio: dois candidatos equidistantes, o de menor slot recebe o valor', () => {
    const e = poolCheio();
    const morte = por(e, TIPO.oco_grande, 0, -300);
    const px = e.inimigos.x[morte]!;
    const py = e.inimigos.y[morte]!;
    poe(e, 10, px + 50, py);
    poe(e, 400, px - 50, py);
    matarInimigo(e, D, morte, CAUSA.arma);
    expect(e.mundo2[MUNDO2.juncoes]).toBe(1);
    expect([e.pickups.valor[10], e.pickups.valor[400]]).toEqual([1 + 5, 1]);
  });

  it('baú com o pool cheio: cede a Cinza equidistante de menor slot, que se junta na vizinha equidistante de menor slot', () => {
    const e = poolCheio();
    const bx = J.x;
    const by = J.y - 300;
    poe(e, 10, bx + 50, by);
    poe(e, 400, bx - 50, by);
    // Vizinhas da cedida (slot 10): 20 e 30, a 60 px dela, uma de cada lado; a de menor slot recebe.
    poe(e, 20, bx + 50, by + 60);
    poe(e, 30, bx + 50, by - 60);
    e.pickups.valor[10] = 3;
    const s = soltarBau(e, bx, by, false);
    expect(s).toBe(10);
    expect(e.pickups.tipo[10]).toBe(TIPO_DE_PICKUP.bauComum);
    expect([e.pickups.valor[20], e.pickups.valor[30], e.pickups.valor[400]]).toEqual([1 + 3, 1, 1]);
    expect(e.mundo2[MUNDO2.juncoes]).toBe(1);
  });
});
