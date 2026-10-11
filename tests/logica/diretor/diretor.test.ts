// Diretor de spawn (B §3.7; ADR-0002 §8; design/decisoes-F-003.md §1 e §4):
// intervalo e alvo em inteiros, timeline compilada, 1ª reposição no 1º passo (r = 1),
// reposição até o mínimo (F-003.2), conversão de excedente (F-003.3), escala
// no spawn (F-003.6), janela antes dos marcos (F-003.8) e garantidos. Na F-003
// ninguém morre: os testes removem inimigos com removerInimigo.
import { describe, expect, it } from 'vitest';
import {
  alvoDaLinha,
  convertidosVivos,
  intervaloEfetivo,
  linhaCorrente,
  naJanelaDoMarco,
  rodarDiretor,
  sortearTipo,
  vivosEquivalentes,
} from '../../../src/logica/diretor/diretor';
import { PASSOS_POR_MINUTO } from '../../../src/logica/diretor/timeline';
import { CAB, CENARIO, MUNDO, baseDoFluxo, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar, passo } from '../../../src/logica/nucleo/passo';
import { criarComandos } from '../../../src/logica/nucleo/comandos';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { danoNoSpawn, hpNoSpawn, nascerInimigo, removerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import { DADOS_DA_CHARNECA as D, PARADO, dadosDe } from '../apoio';

const SEED = 1;

function vivosPorTipo(e: Estado): Record<number, number> {
  const c: Record<number, number> = {};
  for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0) c[e.inimigos.tipo[s]!] = (c[e.inimigos.tipo[s]!] ?? 0) + 1;
  return c;
}

function removerTodos(e: Estado): void {
  for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0) removerInimigo(e, s);
}

function removerAlguns(e: Estado, k: number): void {
  let n = 0;
  for (let s = 0; s < 500 && n < k; s++) if (e.pool.posicao[s]! >= 0) {
    removerInimigo(e, s);
    n++;
  }
}

/** Um passo só do diretor, com o relógio avançado como no passo (sem física). */
function passoDoDiretor(e: Estado, moveu = false): void {
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  e.cab[CAB.relogio] = e.cab[CAB.relogio]! + 1;
  rodarDiretor(e, D, moveu);
}

describe('intervalo e alvo em inteiros (§1)', () => {
  const base = [120, 96, 84, 72, 60, 60, 54, 48, 48, 42, 42, 36, 36, 30, 30, 30, 27, 24, 24, 21, 18, 18, 18];
  const comI11 = [109, 87, 76, 65, 55, 55, 49, 44, 44, 38, 38, 33, 33, 27, 27, 27, 25, 22, 22, 19, 16, 16, 16];

  it('passos-base por linha: round(intervalo × 60); as linhas de marco usam o da anterior', () => {
    expect(Array.from(D.timeline.passosBase)).toEqual(base);
    expect(Array.from(D.timeline.marco).map((m, i) => (m ? i : -1)).filter((i) => i >= 0)).toEqual([5, 10, 15]);
  });

  it('intervalo efetivo com I = 1,0 e 1,1: round(p × 10 / I10)', () => {
    expect(base.map((p) => intervaloEfetivo(p, 10))).toEqual(base);
    expect(base.map((p) => intervaloEfetivo(p, 11))).toEqual(comI11);
  });

  it('alvo = ⌈min × I⌉ em inteiros; o double 1,1 erraria em 90, 100, 180, 200 e 230', () => {
    const minimos = charneca.linhas.map((l) => l.min_na_tela);
    expect(minimos.map((m) => alvoDaLinha(m, 10))).toEqual(minimos);
    expect(minimos.map((m) => alvoDaLinha(m, 11))).toEqual([
      17, 28, 39, 50, 61, 44, 77, 88, 99, 110, 66, 132, 154, 176, 198, 88, 220, 253, 286, 330, 330, 330, 330,
    ]);
    expect([90, 100, 180, 200, 230].map((m) => Math.ceil(m * 1.1))).toEqual([100, 111, 199, 221, 254]);
  });

  it('nas linhas de marco, o roster é o da linha anterior (o "idem" do doc 07 §3.2)', () => {
    const tl = D.timeline;
    for (const m of [5, 10, 15]) {
      const r = (k: number) => Array.from(tl.rosterTipo.subarray(tl.inicioDoRoster[k]!, tl.inicioDoRoster[k + 1]!));
      expect(r(m)).toEqual(r(m - 1));
      expect(tl.minimo[m]).toBe(charneca.linhas[m]!.min_na_tela);
    }
  });
});

describe('tipos que podem nascer (§4)', () => {
  it('um tipo sem tamanho no roster ou nos garantidos é erro na montagem dos dados, não no passo', () => {
    const comCoroado = charneca.linhas.map((l) => (l.minuto === 2 ? { ...l, roster: [...l.roster, { inimigo: 'oco_grande_coroado', peso: 1 }] } : l));
    expect(() => dadosDe({ linhas: comCoroado })).toThrow(/oco_grande_coroado/);
    const garantido = charneca.linhas.map((l) => (l.minuto === 4 ? { ...l, garantidos: [{ inimigo: 'oco_grande_coroado', quantidade: 1 }] } : l));
    expect(() => dadosDe({ linhas: garantido })).toThrow(/oco_grande_coroado/);
  });

  it('o R_MAX sai dos tipos que nascem: 24 na Charneca', () => {
    expect(D.tipos.raioMaximo).toBe(24);
  });
});

describe('linha corrente e janela (Q-10, Q-11)', () => {
  it('linha = minuto inteiro do relógio já incrementado; depois da 22, vale a 22', () => {
    const e = criarEstado(SEED, D);
    const linha = (r: number) => {
      e.cab[CAB.relogio] = r;
      return linhaCorrente(e, D);
    };
    expect([linha(1), linha(3599), linha(3600), linha(68400), linha(90000)]).toEqual([0, 0, 1, 19, 22]);
  });

  it('janela meio-aberta de 30 s antes das linhas 5, 10 e 15; o 19:30 não entra', () => {
    const e = criarEstado(SEED, D);
    const janela = (r: number) => {
      e.cab[CAB.relogio] = r;
      return naJanelaDoMarco(e, D);
    };
    for (const m of [5, 10, 15]) {
      const r = m * PASSOS_POR_MINUTO;
      expect([janela(r - 1801), janela(r - 1800), janela(r - 1), janela(r)]).toEqual([false, true, true, false]);
    }
    expect(janela(20 * PASSOS_POR_MINUTO - 1)).toBe(false);
  });
});

describe('reposição (F-003.2; Q-07; ADR-0002 §8.7)', () => {
  it('a 1ª reposição é no 1º passo (r = 1): 15 Ocos (doc 02 §11: "0:00 | 15 Ocos lentos")', () => {
    const e = criarEstado(SEED, D);
    passoDoDiretor(e);
    expect(vivosPorTipo(e)).toEqual({ [TIPO.oco_das_lanternas]: 15 });
    expect(e.mundo[MUNDO.spawns]).toBe(15);
  });

  it('reposições em r = 1 + 120k na linha 0; removidos 5 em r = 50, voltam em r = 121', () => {
    const e = criarEstado(SEED, D);
    for (let r = 1; r <= 49; r++) passoDoDiretor(e);
    removerAlguns(e, 5);
    while (e.cab[CAB.relogio]! < 120) passoDoDiretor(e);
    expect(quantosAtivos(e.pool)).toBe(10);
    passoDoDiretor(e);
    expect(e.cab[CAB.relogio]).toBe(121);
    expect(quantosAtivos(e.pool)).toBe(15);
  });

  it('remover k vivos faz entrar exatamente alvo − vivosEq na reposição seguinte, em qualquer linha', () => {
    for (const m of [2, 8, 13]) {
      const e = criarEstado(SEED, D);
      e.cab[CAB.relogio] = m * PASSOS_POR_MINUTO - 1;
      passoDoDiretor(e);
      const alvo = charneca.linhas[m]!.min_na_tela;
      expect(quantosAtivos(e.pool)).toBe(alvo);
      removerAlguns(e, 7);
      const antes = e.mundo[MUNDO.spawns]!;
      while (e.mundo[MUNDO.espera] !== 0) passoDoDiretor(e);
      passoDoDiretor(e);
      expect(e.mundo[MUNDO.spawns]! - antes).toBe(7);
      expect(quantosAtivos(e.pool)).toBe(alvo);
    }
  });

  it('sem nada abaixo do mínimo, a reposição recarrega o intervalo e não faz nascer ninguém', () => {
    const e = criarEstado(SEED, D);
    passoDoDiretor(e);
    const antes = e.mundo[MUNDO.spawns]!;
    for (let k = 0; k < 600; k++) passoDoDiretor(e);
    expect(e.mundo[MUNDO.spawns]).toBe(antes);
  });
});

describe('conversão de excedente (F-003.3; Q-08; ADR-0002 §8.7)', () => {
  function linha19ComI11(teto: number): Estado {
    const e = criarEstado(SEED, D, { linhaFixa: 19, teto });
    e.mundo[MUNDO.intensidade10] = 11;
    passoDoDiretor(e);
    return e;
  }

  it('TETO 300, 0 vivos, alvo 330 → 297 do roster + 3 convertidos; os slots nunca passam de 300', () => {
    const e = linha19ComI11(300);
    expect(quantosAtivos(e.pool)).toBe(300);
    expect(convertidosVivos(e)).toBe(3);
    const conv: number[] = [];
    for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0 && e.inimigos.convertido[s] === 1) conv.push(s);
    for (const s of conv) {
      expect(e.inimigos.tipo[s]).toBe(TIPO.oco_grande);
      // HP de 10 Ocos do minuto 19 com I = 1,1, calculado de uma vez: 432,96 (não a soma de 10 Float32).
      expect(e.inimigos.hp[s]).toBe(Math.fround((10 * 12 * 328 * 11) / 1000));
      expect(e.inimigos.hp[s]).not.toBe(Math.fround(10 * Math.fround(43.296)));
      expect(e.inimigos.dano[s]).toBe(39);
    }
    for (let k = 0; k < 300; k++) {
      passoDoDiretor(e);
      expect(quantosAtivos(e.pool)).toBeLessThanOrEqual(300);
    }
    expect(e.mundo[MUNDO.recusados]).toBe(0);
  });

  it('290 comuns com alvo 330: entram 7 do roster + 3 convertidos (vivosEq 327); depois, nada', () => {
    const e = criarEstado(SEED, D, { linhaFixa: 19 });
    passoDoDiretor(e);
    removerAlguns(e, 10);
    e.mundo[MUNDO.intensidade10] = 11;
    while (e.mundo[MUNDO.espera] !== 0) passoDoDiretor(e);
    passoDoDiretor(e);
    expect([quantosAtivos(e.pool), convertidosVivos(e)]).toEqual([300, 3]);
    const antes = e.mundo[MUNDO.spawns]!;
    while (e.mundo[MUNDO.espera] !== 0) passoDoDiretor(e);
    passoDoDiretor(e);
    expect(e.mundo[MUNDO.spawns]).toBe(antes);
  });

  it('os convertidos contam 10 em vivosEq: com 3 vivos, removidos 10 comuns, voltam 10 comuns e nenhum convertido', () => {
    // vivosEq = 287 + 9 × 3 = 314; falta 16, livres 10: entram 10, g = ⌊6/10⌋ = 0. Contando só os slots (290),
    // faltariam 40 e entrariam 7 comuns + 3 convertidos (6 no total).
    const e = linha19ComI11(300);
    let n = 0;
    for (let s = 0; s < 500 && n < 10; s++) {
      if (e.pool.posicao[s]! >= 0 && e.inimigos.convertido[s] === 0) {
        removerInimigo(e, s);
        n++;
      }
    }
    expect(vivosEquivalentes(e)).toBe(290 + 9 * 3);
    while (e.mundo[MUNDO.espera] !== 0) passoDoDiretor(e);
    passoDoDiretor(e);
    expect([quantosAtivos(e.pool), convertidosVivos(e), vivosEquivalentes(e)]).toEqual([300, 3, 327]);
  });

  it('com TETO 500 não há conversão: 330 do roster', () => {
    const e = linha19ComI11(500);
    expect([quantosAtivos(e.pool), convertidosVivos(e)]).toEqual([330, 0]);
  });
});

describe('escala no spawn (F-003.6; B §3.6; Q-10)', () => {
  it.each([
    [0, 10, 12, 5],
    [1, 10, 13.44, 5.25],
    [5, 10, 19.2, 6.25],
    [19, 10, 39.36, 9.75],
    [19, 11, 43.296, 9.75],
  ])('minuto %s, I10 = %s: HP do Oco = %s e dano = %s (em Float32)', (min, i10, hp, dano) => {
    expect(hpNoSpawn(12, min, i10)).toBe(Math.fround(hp));
    expect(danoNoSpawn(5, min)).toBe(Math.fround(dano));
  });

  it('Oco Grande e Noviça: 112 e 108,8 no minuto 1 e 3; o dano do Oco Grande no minuto 19 é 39', () => {
    expect(hpNoSpawn(100, 1, 10)).toBe(112);
    expect(hpNoSpawn(80, 3, 10)).toBe(Math.fround(108.8));
    expect(danoNoSpawn(20, 19)).toBe(39);
  });

  it('o valor fica fixo no spawn: um Oco nascido em 1:59 mantém o HP do minuto 1 depois das 2:00', () => {
    const e = criarEstado(SEED, D, { cenario: CENARIO.diretorDesligado });
    e.cab[CAB.relogio] = 2 * PASSOS_POR_MINUTO - 1;
    const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, 100, 100, false);
    expect(e.inimigos.hp[s]).toBe(Math.fround(13.44));
    avancar(e, D, PARADO, 10);
    expect(e.cab[CAB.relogio]).toBeGreaterThan(2 * PASSOS_POR_MINUTO);
    expect(e.inimigos.hp[s]).toBe(Math.fround(13.44));
  });
});

describe('janela sem spawn antes dos marcos (F-003.8; Q-11)', () => {
  it.each([5, 10, 15])('nenhum spawn em 3.600·%s − 1.800 ≤ r < 3.600·m, mesmo sem ninguém vivo; no marco, a reposição volta', (m) => {
    const e = criarEstado(SEED, D);
    const inicio = m * PASSOS_POR_MINUTO - 1800;
    e.cab[CAB.relogio] = inicio - 1;
    const antes = e.mundo[MUNDO.spawns]!;
    for (let r = inicio; r < m * PASSOS_POR_MINUTO; r++) {
      removerTodos(e);
      passoDoDiretor(e);
      expect(e.cab[CAB.relogio]).toBe(r);
      expect(e.mundo[MUNDO.spawns], `r = ${r}`).toBe(antes);
    }
    passoDoDiretor(e);
    expect(quantosAtivos(e.pool)).toBe(charneca.linhas[m]!.min_na_tela);
  });

  it('controle: removidos em r = 16.100 são repostos antes de 16.200; às 19:30 a reposição continua', () => {
    const e = criarEstado(SEED, D);
    e.cab[CAB.relogio] = 16099;
    passoDoDiretor(e);
    removerTodos(e);
    while (e.cab[CAB.relogio]! < 16199) passoDoDiretor(e);
    expect(quantosAtivos(e.pool)).toBe(55);
    const f = criarEstado(SEED, D);
    f.cab[CAB.relogio] = 19.5 * PASSOS_POR_MINUTO;
    passoDoDiretor(f);
    removerTodos(f);
    for (let k = 0; k < 21; k++) passoDoDiretor(f);
    expect(quantosAtivos(f.pool)).toBe(300);
  });
});

describe('garantidos (R3; Q-26)', () => {
  it('no 1º passo das linhas 1 e 3 nasce exatamente 1 Oco Grande (HP 112) e 1 Noviça (108,8), uma vez', () => {
    // Fora de um passo de reposição (espera > 0), o garantido nasce sozinho.
    const f = criarEstado(SEED, D);
    f.cab[CAB.relogio] = 3599;
    f.mundo[MUNDO.garantidosEntregues] = 0b1;
    f.mundo[MUNDO.espera] = 50;
    passoDoDiretor(f);
    expect(f.cab[CAB.relogio]).toBe(3600);
    expect(vivosPorTipo(f)).toEqual({ [TIPO.oco_grande]: 1 });
    const s = Array.from({ length: 500 }, (_, i) => i).find((i) => f.pool.posicao[i]! >= 0)!;
    expect(f.inimigos.hp[s]).toBe(112);
    expect(f.mundo[MUNDO.garantidosEntregues]! & 0b10).toBe(0b10);
    for (let k = 0; k < 40; k++) passoDoDiretor(f);
    expect(quantosAtivos(f.pool)).toBe(1);
    const g = criarEstado(SEED, D);
    g.cab[CAB.relogio] = 3 * PASSOS_POR_MINUTO - 1;
    g.mundo[MUNDO.garantidosEntregues] = 0b111;
    g.mundo[MUNDO.espera] = 50;
    passoDoDiretor(g);
    expect(vivosPorTipo(g)).toEqual({ [TIPO.novica_de_sal]: 1 });
  });

  it('com os slots no TETO, o garantido não nasce e soma em garantidosPerdidos', () => {
    const e = criarEstado(SEED, D);
    for (let k = 0; k < 300; k++) nascerInimigo(e, D, TIPO.oco_das_lanternas, 10 + k, 10, false);
    e.cab[CAB.relogio] = 3599;
    e.mundo[MUNDO.garantidosEntregues] = 1;
    passoDoDiretor(e);
    expect(e.mundo[MUNDO.garantidosPerdidos]).toBe(1);
    expect(quantosAtivos(e.pool)).toBe(300);
  });

  it('com a linha fixa do cenário, nem garantidos nem janela', () => {
    const e = criarEstado(SEED, D, { linhaFixa: 19 });
    e.cab[CAB.relogio] = 16300;
    passoDoDiretor(e);
    expect(quantosAtivos(e.pool)).toBe(300);
    expect(e.mundo[MUNDO.garantidosEntregues]).toBe(0);
  });
});

describe('sorteio do tipo (§4)', () => {
  it('na linha 3 (10/1/2), 130.000 sorteios dão 10/13, 1/13 e 2/13 ± 0,005', () => {
    const e = criarEstado(SEED, D);
    const base = baseDoFluxo('diretor');
    const c: Record<number, number> = {};
    const N = 130000;
    for (let k = 0; k < N; k++) {
      const t = sortearTipo(e.rng, base, D, 3);
      c[t] = (c[t] ?? 0) + 1;
    }
    expect(Math.abs(c[TIPO.oco_das_lanternas]! / N - 10 / 13)).toBeLessThan(0.005);
    expect(Math.abs(c[TIPO.oco_grande]! / N - 1 / 13)).toBeLessThan(0.005);
    expect(Math.abs(c[TIPO.novica_de_sal]! / N - 2 / 13)).toBeLessThan(0.005);
  });

  it('o consumo do fluxo é fixo: parado ou andando, o k-ésimo tipo sorteado é o mesmo', () => {
    const tipos = (moveu: boolean): number[] => {
      const e = criarEstado(SEED, D, { linhaFixa: 3 });
      passoDoDiretor(e, moveu);
      const lista: number[] = [];
      for (let s = 0; s < 500; s++) if (e.pool.posicao[s]! >= 0) lista.push(e.inimigos.tipo[s]!);
      return lista;
    };
    expect(tipos(true)).toEqual(tipos(false));
  });
});

describe('passo completo', () => {
  it('quem nasce fica com xAnt = x e só anda no passo seguinte', () => {
    const e = criarEstado(SEED, D);
    passo(e, D, criarComandos());
    for (let s = 0; s < 500; s++) {
      if (e.pool.posicao[s]! < 0) continue;
      expect([e.inimigos.xAnt[s], e.inimigos.yAnt[s]]).toEqual([e.inimigos.x[s], e.inimigos.y[s]]);
    }
  });
});
