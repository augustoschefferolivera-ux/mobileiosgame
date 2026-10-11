// XP, Cinzas, Ímã e atributos (design/decisoes-F-005.md §2; F-005.1 e a parte
// do Ímã do F-005.5).
import { describe, expect, it } from 'vitest';
import { avancar } from '../../../src/logica/nucleo/passo';
import { CENARIO, JOGADOR, JOGADOR2, MUNDO2, TIPO_DE_PICKUP, criarEstado, hashEstado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CAUSA } from '../../../src/logica/nucleo/eventos';
import { armadura, poderPct } from '../../../src/logica/progressao/atributos';
import { rodarPickups, soltarBau } from '../../../src/logica/progressao/pickups';
import { custoDoNivel, hpMaximo } from '../../../src/logica/progressao/tabela';
import progressao from '../../../src/dados/progressao.json';
import { PARADO, SEM_CINZAS } from '../apoio';
import { eventos, por } from '../armas/apoio';
import { D, ELMO, ESPADA, LUVAS, P, cinzaEm, estadoDe } from './apoio';

describe('curva de XP (X1; F-005.1)', () => {
  it('o custo ⌈XP(n)⌉ de n = 1 a 30, literal', () => {
    const literal = [10, 19, 29, 40, 52, 65, 80, 96, 113, 131, 150, 171, 193, 216, 240, 265, 292, 320, 349, 379, 410, 443, 477, 512, 548, 585, 624, 664, 705, 747];
    expect(literal.map((_, i) => D.progressao.custo[i + 1])).toEqual(literal);
  });

  it('F-005.1: XP(10) = 130 ± 1 e XP(20) = 380 ± 2', () => {
    const c10 = D.progressao.custo[10]!;
    const c20 = D.progressao.custo[20]!;
    expect(Math.abs(c10 - 130)).toBeLessThanOrEqual(1);
    expect(Math.abs(c20 - 380)).toBeLessThanOrEqual(2);
    // E o teto inteiro equivale a xp ≥ XP(n) com XP inteira: o custo é o menor inteiro ≥ a fórmula.
    for (let n = 1; n <= 255; n++) {
      const exato = 10 + 8 * (n - 1) + 0.6 * (n - 1) ** 2;
      const c = custoDoNivel(progressao.curva_xp, n);
      expect(c, `n=${n}`).toBeGreaterThanOrEqual(exato - 1e-9);
      expect(c - 1, `n=${n}`).toBeLessThan(exato - 1e-9);
    }
  });

  it('uma Cinza de 28 com xp 0 no nv1 deixa o nv2 com 18; uma de 25 com xp 9 no nv1 cruza dois níveis no mesmo passo', () => {
    let e = estadoDe([[ESPADA, 1]]);
    cinzaEm(e, 0, 0, 28);
    rodarPickups(e, D);
    expect([e.progresso[P.nivel], e.progresso[P.xp], e.progresso[P.niveisPendentes]]).toEqual([2, 18, 1]);
    e = estadoDe([[ESPADA, 1]], [], { xpInicial: 9 });
    cinzaEm(e, 0, 0, 25);
    rodarPickups(e, D);
    expect([e.progresso[P.nivel], e.progresso[P.xp], e.progresso[P.niveisPendentes]]).toEqual([3, 5, 2]);
  });

  it('o cruzamento roda em todo passo, mesmo sem coleta: XP inicial 29 dá nível 3 com 2 pendentes no passo 1', () => {
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 29 });
    expect(avancar(e, D, PARADO, 5)).toBe(1);
    expect([e.progresso[P.nivel], e.progresso[P.xp], e.progresso[P.niveisPendentes]]).toEqual([3, 0, 2]);
    const niveis = eventos(e).filter((x) => x.tipo === EVENTO.nivel);
    expect(niveis.map((x) => x.f[0])).toEqual([2, 3]);
  });

  it('teto técnico 255: no nv254 uma Cinza de 100.000 leva ao 255, sem laço infinito, e a XP que sobra se perde', () => {
    const e = estadoDe([[ESPADA, 1]]);
    e.progresso[P.nivel] = 254;
    cinzaEm(e, 0, 0, 100000);
    rodarPickups(e, D);
    expect([e.progresso[P.nivel], e.progresso[P.xp]]).toEqual([255, 0]);
  });
});

describe('atributos, HP e passivas (P1 a P5)', () => {
  it('FOR + 1 por nível até 20 (nível 15) e parada dali ao 40; o HP máximo segue a tabela literal', () => {
    const e = estadoDe([[ESPADA, 1]], [], { xpInicial: 20000 });
    const hpMax: number[] = [];
    const forca: number[] = [];
    // Cada passo cruza o que a XP paga; lê-se o nível alcançado.
    avancar(e, D, PARADO, 1);
    expect(e.progresso[P.nivel]).toBeGreaterThanOrEqual(40);
    forca.push(e.atributos[0]!);
    hpMax.push(e.jogador2[JOGADOR2.hpMax]!);
    expect(forca[0]).toBe(20);
    const n = e.progresso[P.nivel]!;
    expect(hpMax[0]).toBe(hpMaximo(130 + 2 * (n - 1), 15));
    expect([1, 2, 15, 29].map((k) => hpMaximo(130 + 2 * (k - 1), 15))).toEqual([150, 152, 182, 214]);
  });

  it('o HP atual sobe o mesmo tanto que o máximo, sem passar dele; com HP 0, fica em 0', () => {
    let e = estadoDe([[ESPADA, 1]], [], { xpInicial: 10 });
    e.jogador[JOGADOR.hp] = 100;
    avancar(e, D, PARADO, 1);
    expect([e.jogador[JOGADOR.hp], e.jogador2[JOGADOR2.hpMax]]).toEqual([102, 152]);
    e = estadoDe([[ESPADA, 1]], [], { xpInicial: 10 });
    e.jogador[JOGADOR.hp] = 0;
    avancar(e, D, PARADO, 1);
    expect(e.jogador[JOGADOR.hp]).toBe(0);
  });

  it('Poder = 8% por nível das Luvas e Armadura = 4 por nível do Elmo; o dano de contato não muda com o Elmo (a redução é da F-007)', () => {
    for (let n = 1; n <= 5; n++) {
      const e = estadoDe([[ESPADA, 1]], [
        [ELMO, n],
        [LUVAS, n],
      ]);
      expect([poderPct(e, D), armadura(e, D)]).toEqual([8 * n, 4 * n]);
    }
    const semElmo = criarEstado(1, D, { cenario: CENARIO.diretorDesligado, armas: [] });
    const comElmo = criarEstado(1, D, { cenario: CENARIO.diretorDesligado, armas: [], passivas: [{ codigo: ELMO, nivel: 5 }] });
    for (const e of [semElmo, comElmo]) por(e, TIPO.oco_das_lanternas, 20, 0);
    avancar(semElmo, D, PARADO, 60);
    avancar(comElmo, D, PARADO, 60);
    expect(comElmo.jogador[JOGADOR.hp]).toBe(semElmo.jogador[JOGADOR.hp]);
  });
});

describe('Cinzas (X2, X3, X6)', () => {
  it('toda morte por arma solta 1 Cinza com o XP do tipo: Oco 1, Grande 5, Noviça 5, convertido 10; o fluxo drops fica intocado', () => {
    const e = estadoDe([]);
    const drops = [...e.rng.slice(8, 12)];
    const slots = [TIPO.oco_das_lanternas, TIPO.oco_grande, TIPO.novica_de_sal].map((t, i) => por(e, t, 200 + 40 * i, 0));
    const conv = por(e, TIPO.oco_grande, 400, 0);
    e.inimigos.convertido[conv] = 1;
    for (const s of [...slots, conv]) matarInimigo(e, D, s, CAUSA.arma);
    const valores = [];
    for (let s = 0; s < 512; s++) if (e.poolDePickups.posicao[s]! >= 0) valores.push(e.pickups.valor[s]);
    expect(valores).toEqual([1, 5, 5, 10]);
    expect([...e.rng.slice(8, 12)]).toEqual(drops);
  });

  it('com semCinzas, a morte não solta Cinza; removerInimigo sozinho nunca solta', () => {
    const e = criarEstado(1, D, { cenario: CENARIO.diretorDesligado | CENARIO.semCinzas, armas: [] });
    matarInimigo(e, D, por(e, TIPO.oco_das_lanternas, 200, 0), CAUSA.arma);
    expect(quantosAtivos(e.poolDePickups)).toBe(0);
  });

  it('com o pool cheio, a Cinza nova se junta na mais próxima e conta a junção; o baú tira uma Cinza de lá e conserva o XP', () => {
    const e = estadoDe([]);
    for (let k = 0; k < 512; k++) cinzaEm(e, 100 + (k % 20) * 10, 100 + Math.floor(k / 20) * 10, 1);
    const alvo = por(e, TIPO.oco_grande, 100, 100);
    matarInimigo(e, D, alvo, CAUSA.arma);
    expect(e.mundo2[MUNDO2.juncoes]).toBe(1);
    const soma = (): number => {
      let t = 0;
      for (let s = 0; s < 512; s++) if (e.pickups.tipo[s] === TIPO_DE_PICKUP.cinza) t += e.pickups.valor[s]!;
      return t;
    };
    expect(soma()).toBe(517);
    expect(soltarBau(e, 300, 300, false)).toBeGreaterThanOrEqual(0);
    expect(soma()).toBe(517);
    expect(e.mundo2[MUNDO2.juncoes]).toBe(2);
  });
});

describe('Ímã e coleta (X4; F-005.5)', () => {
  it('a 48 px a Cinza anda no 1º passo; a 48 + 1/16 fica parada por 600 passos', () => {
    let e = estadoDe([]);
    const s = cinzaEm(e, 48, 0);
    avancar(e, D, PARADO, 1);
    expect(e.pickups.x[s]).toBe(585 + 40);
    e = estadoDe([]);
    const t = cinzaEm(e, 48.0625, 0);
    avancar(e, D, PARADO, 600);
    expect(e.pickups.x[t]).toBe(585 + 48.0625);
  });

  it('parado, a Cinza a 48 px é coletada no 5º passo; na costura (jogador em x 5, Cinza em x 1.160) o delta é 15 px', () => {
    const e = estadoDe([]);
    cinzaEm(e, 0, -48, 3);
    for (let k = 1; k <= 4; k++) {
      avancar(e, D, PARADO, 1);
      expect(e.progresso[P.xpTotal], `passo ${k}`).toBe(0);
    }
    avancar(e, D, PARADO, 1);
    expect(e.progresso[P.xpTotal]).toBe(3);
    const c = estadoDe([]);
    c.jogador[JOGADOR.x] = c.jogador[JOGADOR.xAnt] = 5;
    const s = cinzaEm(c, 0, 0);
    c.pickups.x[s] = 1160;
    avancar(c, D, PARADO, 1);
    expect(c.progresso[P.xpTotal]).toBe(1);
  });

  it('centros coincidentes coletam sem NaN; o hash não depende de quantos passos por chamada', () => {
    const e = estadoDe([]);
    cinzaEm(e, 0, 0);
    avancar(e, D, PARADO, 1);
    expect(e.progresso[P.xp]).toBe(1);
    const a = estadoDe([[ESPADA, 1]]);
    const b = estadoDe([[ESPADA, 1]]);
    for (const x of [a, b]) for (let k = 0; k < 30; k++) cinzaEm(x, -60 + k * 4, 30 - k * 3, 1 + (k % 5));
    avancar(a, D, PARADO, 40);
    for (let k = 0; k < 8; k++) avancar(b, D, PARADO, 5);
    expect(hashEstado(a)).toBe(hashEstado(b));
  });
});

describe('Vigília normal parada (E6, teste-guarda)', () => {
  it('seed 1: o 1º modal não abre antes do passo 700 e abre até o 760 (medido: 723); com SEM_CINZAS, nunca', () => {
    const e = criarEstado(1, D);
    const rodados = avancar(e, D, PARADO, 760);
    expect(rodados).toBeGreaterThanOrEqual(700);
    expect(rodados).toBeLessThan(760);
    expect(e.progresso[P.niveisPendentes]).toBe(1);
    const s = criarEstado(1, D, SEM_CINZAS);
    expect(avancar(s, D, PARADO, 2000)).toBe(2000);
    expect(s.progresso[P.nivel]).toBe(1);
  });
});
