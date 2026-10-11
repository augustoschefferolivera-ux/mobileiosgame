// Facas de Sal: alvos da salva, voo, acerto, perfuração, dano fixado no
// disparo e pool de projéteis (design/decisoes-F-004.md W9 a W13 e §4).
import { describe, expect, it } from 'vitest';
import { liberarProjetil, limiteDeProjeteis, rodarArmas } from '../../../src/logica/armas/armas';
import { ARMA } from '../../../src/logica/armas/tabela';
import { CAPACIDADE_DE_PROJETEIS, MUNDO, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA, SEM_ALVO } from '../../../src/logica/nucleo/eventos';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { removerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { DADOS_SEM_OBSTACULOS as D, dadosDe } from '../apoio';
import { J, estadoCom, eventos, por } from './apoio';

const F = ARMA.facas_de_sal;
const HP_OCO = 12;

/** Projéteis vivos, em ordem de slot. */
function vivos(e: Estado): number[] {
  const l: number[] = [];
  for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) l.push(p);
  return l;
}

describe('salva (W9, W10, W11)', () => {
  it('Ocos a 50, 60 e 70 px e 2 facas: uma para o de 50 e uma para o de 60', () => {
    const e = estadoCom([[F, 1]]);
    const a = por(e, TIPO.oco_das_lanternas, 50, 0);
    const b = por(e, TIPO.oco_das_lanternas, 0, -60);
    por(e, TIPO.oco_das_lanternas, -70, 0);
    rodarArmas(e, D);
    const p = vivos(e);
    expect(p).toHaveLength(2);
    // A faca 0 vai ao mais próximo (para a direita), a 1 ao segundo (para cima).
    const v = Math.fround(6.4);
    expect([e.projeteis.vx[p[0]!], e.projeteis.vy[p[0]!]]).toEqual([v, 0]);
    expect([e.projeteis.vx[p[1]!], e.projeteis.vy[p[1]!]]).toEqual([0, -v]);
    // Nascem no centro do jogador (1 faca por alvo, sem deslocamento lateral).
    expect(p.map((q) => [e.projeteis.x[q], e.projeteis.y[q]])).toEqual([
      [J.x, J.y],
      [J.x, J.y],
    ]);
    expect([e.inimigos.hp[a], e.inimigos.hp[b]]).toEqual([HP_OCO, HP_OCO]);
  });

  it('empate exato em d²: vence o menor slot', () => {
    const e = estadoCom([[F, 1]]);
    // Os dois a 50 px; com 2 facas e 3 candidatos, o 3º (a 50 px, slot maior) fica de fora.
    por(e, TIPO.oco_das_lanternas, 0, -50);
    por(e, TIPO.oco_das_lanternas, 50, 0);
    por(e, TIPO.oco_das_lanternas, -50, 0);
    rodarArmas(e, D);
    const dirs = vivos(e).map((p) => [e.projeteis.vx[p], e.projeteis.vy[p]]);
    const v = Math.fround(6.4);
    expect(dirs).toEqual([
      [0, -v],
      [v, 0],
    ]);
  });

  it('nenhum alvo a ≤ 192 px: nenhuma faca e a recarga fica em 0; quando um entra, sai no mesmo passo, e a seguinte 54 passos depois', () => {
    const e = estadoCom([[F, 1]]);
    por(e, TIPO.oco_das_lanternas, 0, -193);
    rodarArmas(e, D);
    expect(vivos(e)).toHaveLength(0);
    expect(e.build.recarga[0]).toBe(0);
    const s = por(e, TIPO.oco_das_lanternas, 0, -192);
    rodarArmas(e, D);
    expect(vivos(e)).toHaveLength(2);
    expect(e.build.recarga[0]).toBe(54);
    removerInimigo(e, s);
    for (let k = 0; k < 52; k++) rodarArmas(e, D);
    por(e, TIPO.oco_das_lanternas, 0, -100);
    const antes = quantosAtivos(e.poolDeProjeteis);
    rodarArmas(e, D);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(antes);
    rodarArmas(e, D);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(antes + 2);
  });

  it('a faca k vai ao candidato k mod M: 2 alvos e 5 facas dão 3 + 2 (nv8)', () => {
    const e = estadoCom([[F, 8]]);
    por(e, TIPO.oco_das_lanternas, 50, 0);
    por(e, TIPO.oco_das_lanternas, 0, -80);
    rodarArmas(e, D);
    const dirs = vivos(e).map((p) => (e.projeteis.vx[p]! > 0 ? 'direita' : 'cima'));
    expect(dirs.filter((d) => d === 'direita')).toHaveLength(3);
    expect(dirs.filter((d) => d === 'cima')).toHaveLength(2);
  });

  it('1 Oco e 3 facas (nv2): nascem deslocadas −8, 0 e +8 px na perpendicular e as 3 acertam', () => {
    const e = estadoCom([[F, 2]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -100);
    rodarArmas(e, D);
    const p = vivos(e);
    expect(p.map((q) => e.projeteis.x[q]! - J.x).sort((a, b) => a - b)).toEqual([-8, 0, 8]);
    expect(p.every((q) => e.projeteis.y[q] === J.y)).toBe(true);
    for (let k = 0; k < 20; k++) rodarArmas(e, D);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s)).toHaveLength(3);
    expect(e.inimigos.hp[s]).toBe(Math.fround(Math.fround(Math.fround(HP_OCO - 1.8) - 1.8) - 1.8));
  });
});

describe('voo e acerto (W9)', () => {
  it('sem nada no caminho, anda 6,4 px por passo e some no passo 30, a 192 px; no nv6, 7,68 e 25', () => {
    for (const [nivel, v, vida] of [
      [1, 6.4, 30],
      [6, 7.68, 25],
    ] as const) {
      const e = estadoCom([[F, nivel]]);
      const s = por(e, TIPO.oco_das_lanternas, 0, -190);
      rodarArmas(e, D);
      removerInimigo(e, s);
      const p = vivos(e)[0]!;
      for (let k = 1; k <= vida; k++) {
        rodarArmas(e, D);
        // Por passo, ±1e-3; no total, o arredondamento Float32 perto de y ≈ 1.100 (ulp 1,2e-4) acumula até ≈ 4e-3.
        if (k < vida) {
          expect(Math.abs(e.projeteis.yAnt[p]! - e.projeteis.y[p]! - v), `passo ${k}`).toBeLessThanOrEqual(1e-3);
          expect(Math.abs(e.projeteis.y[p]! - (J.y - v * k)), `passo ${k}`).toBeLessThanOrEqual(4e-3);
        }
      }
      expect(vivos(e)).toHaveLength(0);
      expect(v * vida).toBeCloseTo(192, 9);
    }
  });

  it('a faca nascida no passo não anda nem acerta nele (xAnt = x)', () => {
    const e = estadoCom([[F, 1]]);
    por(e, TIPO.oco_das_lanternas, 0, -5);
    rodarArmas(e, D);
    const p = vivos(e)[0]!;
    expect([e.projeteis.x[p], e.projeteis.y[p]]).toEqual([e.projeteis.xAnt[p], e.projeteis.yAnt[p]]);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.acerto)).toHaveLength(0);
  });

  it('voo reto: mirada num Oco a (0, −100), acerta outro que entra no caminho em (5, −50)', () => {
    const e = estadoCom([[F, 1]]);
    const longe = por(e, TIPO.oco_das_lanternas, 0, -100);
    rodarArmas(e, D);
    const perto = por(e, TIPO.oco_das_lanternas, 5, -50);
    for (let k = 0; k < 10; k++) rodarArmas(e, D);
    expect(e.inimigos.hp[perto]).toBeLessThan(HP_OCO);
    expect(e.inimigos.hp[longe]).toBe(HP_OCO);
  });

  it('dois Ocos tocando a faca no mesmo passo: só o de menor d² pelo centro perde HP', () => {
    const e = estadoCom([[F, 1]]);
    const alvo = por(e, TIPO.oco_das_lanternas, 0, -150);
    rodarArmas(e, D);
    removerInimigo(e, alvo);
    // Depois de 5 passos a faca (a 0, por ser 1 alvo e 2 facas: −4 e +4) está a y = −32; dois Ocos à mesma altura.
    const p = vivos(e)[0]!;
    const xp = e.projeteis.x[p]! - J.x;
    for (let k = 0; k < 4; k++) rodarArmas(e, D);
    const a = por(e, TIPO.oco_das_lanternas, xp + 10, -32 - 6.4);
    const b = por(e, TIPO.oco_das_lanternas, xp - 20, -32 - 6.4);
    rodarArmas(e, D);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto);
    expect(acertos.map((v) => v.slot)).toContain(a);
    expect(e.inimigos.hp[b]).toBe(HP_OCO);
  });

  it('atravessa um obstáculo e acerta o Oco atrás (D2 O6)', () => {
    const dados = dadosDe({ obstaculos: [{ x: J.x, y: J.y - 60, tamanho_px: 40 }] });
    const e = estadoCom([[F, 1]], dados);
    const s = por(e, TIPO.oco_das_lanternas, 0, -120, dados);
    for (let k = 0; k < 25; k++) rodarArmas(e, dados);
    expect(e.inimigos.hp[s]).toBeLessThan(HP_OCO);
  });

  it('com 7,68 px por passo, um Oco vindo de frente a 12 px por passo nunca é atravessado (1.000 casos)', () => {
    let semente = 7;
    const u = (): number => ((semente = (Math.imul(semente, 1103515245) + 12345) >>> 0) / 2 ** 32);
    let atravessou = 0;
    for (let caso = 0; caso < 1000; caso++) {
      const e = estadoCom([[F, 6]]);
      const alvo = por(e, TIPO.oco_das_lanternas, 0, -191);
      rodarArmas(e, D);
      removerInimigo(e, alvo);
      // O Oco começa à frente da faca, com desvio lateral de até 16 px, e vem a 12 px por passo.
      const lateral = (u() - 0.5) * 32;
      let y = -100 - u() * 60;
      const s = por(e, TIPO.oco_das_lanternas, lateral, y);
      let acertou = false;
      for (let k = 0; k < 25 && !acertou; k++) {
        y += 12;
        e.inimigos.y[s] = Math.fround(J.y + y);
        rodarArmas(e, D);
        acertou = e.inimigos.hp[s]! < HP_OCO;
      }
      if (!acertou) atravessou++;
    }
    expect(atravessou).toBe(0);
  });
});

describe('perfuração (W12) e dano fixado no disparo (W13)', () => {
  it('2 Ocos em fila: no nv6 só o 1º perde HP; no nv7 os dois, e a faca some no 2º acerto', () => {
    for (const [nivel, ambos] of [
      [6, false],
      [7, true],
    ] as const) {
      const e = estadoCom([[F, nivel]]);
      // Um só alvo na busca: o 2º entra depois do disparo.
      const a = por(e, TIPO.oco_das_lanternas, 0, -60);
      rodarArmas(e, D);
      const b = por(e, TIPO.oco_das_lanternas, 0, -110);
      const facas = vivos(e).length;
      for (let k = 0; k < 25; k++) rodarArmas(e, D);
      expect(e.inimigos.hp[a]).toBeLessThan(HP_OCO);
      expect(e.inimigos.hp[b]! < HP_OCO, `nv${nivel}`).toBe(ambos);
      expect(eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === b)).toHaveLength(ambos ? facas : 0);
      expect(vivos(e)).toHaveLength(0);
    }
  });

  it('nv7: um Oco que segue sobreposto à faca leva um acerto só; um inimigo novo no mesmo slot (outra geração) leva, e a faca some', () => {
    const e = estadoCom([[F, 7]]);
    const alvo = por(e, TIPO.oco_das_lanternas, 0, -150);
    rodarArmas(e, D);
    removerInimigo(e, alvo);
    // Fica uma faca só.
    const [p, ...resto] = vivos(e);
    for (const q of resto) liberarProjetil(e, q);
    const s = por(e, TIPO.oco_grande, 0, 0);
    for (let k = 0; k < 6; k++) {
      e.inimigos.x[s] = e.projeteis.x[p!]!;
      e.inimigos.y[s] = e.projeteis.y[p!]!;
      rodarArmas(e, D);
    }
    expect(eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s)).toHaveLength(1);
    expect(e.projeteis.perfuracoes[p!]).toBe(0);
    expect(e.projeteis.ultimoAlvo[p!]).toBe(e.pool.geracao[s]! * 0x10000 + s);
    // O mesmo slot com geração nova é outro inimigo.
    removerInimigo(e, s);
    const novo = por(e, TIPO.oco_grande, 0, 0);
    expect(novo).toBe(s);
    e.inimigos.x[novo] = e.projeteis.x[p!]!;
    e.inimigos.y[novo] = e.projeteis.y[p!]! - 6.4;
    rodarArmas(e, D);
    expect(e.inimigos.hp[novo]).toBeLessThan(100);
    expect(vivos(e)).toHaveLength(0);
  });

  it('o handle 0 (slot 0, geração 0) é um inimigo válido: a faca nova o acerta (sentinela 0xFFFFFFFF)', () => {
    const e = estadoCom([[F, 7]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -40);
    expect([s, e.pool.geracao[s]]).toEqual([0, 0]);
    rodarArmas(e, D);
    expect(e.projeteis.ultimoAlvo[vivos(e)[0]!]).toBe(SEM_ALVO);
    for (let k = 0; k < 6; k++) rodarArmas(e, D);
    expect(e.inimigos.hp[s]).toBeLessThan(HP_OCO);
  });

  it('o dano e o Sal ficam os do disparo: subir de nível com a faca em voo não muda o acerto', () => {
    const e = estadoCom([[F, 2]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -100);
    rodarArmas(e, D);
    e.build.nivel[0] = 4;
    for (let k = 0; k < 20; k++) rodarArmas(e, D);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s);
    expect(acertos.map((v) => v.f[2])).toEqual([Math.fround(1.8), Math.fround(1.8), Math.fround(1.8)]);
    expect(e.inimigos.salPct[s]).toBe(0);
    expect(acertos.every((v) => v.forma === FORMA.faca && v.arma === F)).toBe(true);
  });
});

describe('pool de projéteis (§4)', () => {
  it('limite lógico 200 com TETO 300 e 400 com TETO 500; a faca recusada soma em projeteisRecusados', () => {
    for (const teto of [300, 500] as const) {
      const e = estadoCom([[F, 8]], D, { teto });
      expect(limiteDeProjeteis(e)).toBe(teto === 300 ? 200 : 400);
      por(e, TIPO.oco_grande, 0, -150);
      let salvas = 0;
      while (quantosAtivos(e.poolDeProjeteis) + 5 <= limiteDeProjeteis(e)) {
        e.build.recarga[0] = 0;
        rodarArmas(e, D);
        salvas++;
        // As facas ficam paradas longe do alvo, com a vida cheia: o pool só enche.
        for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) {
          if (e.poolDeProjeteis.posicao[p]! < 0) continue;
          e.projeteis.vida[p] = 25;
          e.projeteis.vx[p] = e.projeteis.vy[p] = 0;
          e.projeteis.x[p] = J.x + 300;
        }
      }
      expect(salvas).toBeGreaterThan(0);
      const faltam = limiteDeProjeteis(e) - quantosAtivos(e.poolDeProjeteis);
      e.build.recarga[0] = 0;
      rodarArmas(e, D);
      expect(quantosAtivos(e.poolDeProjeteis)).toBe(limiteDeProjeteis(e));
      expect(e.mundo[MUNDO.projeteisRecusados]).toBe(5 - faltam);
    }
  });

  it('os slots livres ficam zerados byte a byte depois de disparar e esgotar as facas', () => {
    const e = estadoCom([[F, 8]]);
    const s = por(e, TIPO.oco_grande, 0, -150);
    rodarArmas(e, D);
    removerInimigo(e, s);
    for (let k = 0; k < 40; k++) rodarArmas(e, D);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(0);
    const p = e.projeteis;
    for (const campo of [p.x, p.y, p.xAnt, p.yAnt, p.vx, p.vy, p.dano, p.ultimoAlvo, p.vida, p.tipo, p.arma, p.perfuracoes, p.salPct, p.salPassos]) {
      expect(campo.every((v) => v === 0)).toBe(true);
    }
  });
});
