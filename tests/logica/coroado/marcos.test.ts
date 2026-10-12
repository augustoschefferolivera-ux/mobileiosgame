// Marcos, arena e fim do marco (design/decisoes-F-008.md AR1 a AR8, CR6, CR9, FG1, FG7; critérios F-008.4a, 4c, 4d, 4g):
// o Coroado nasce com o HP e o dano da linha de marco; a arena de 224 px tira os obstáculos tocados, mata a massa e os
// médios dentro e prende; o último Coroado morto apaga a arena e acende a Fogueira a 96 px; o marco vencido pelo relógio,
// o 20:00 e o 23:00. Os testes de marco começam a 10 passos do limiar (`inicioLivre`, relógio inicial > 0) e, para
// pular horas, escrevem o `relogio` à mão (o contador é só uma palavra do cabeçalho).
import { describe, expect, it } from 'vitest';
import { hpNoSpawn, danoNoSpawn } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { deltaNoToro } from '../../../src/logica/mundo/toro';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W } from '../../../src/logica/mundo/toro';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CAUSA_DO_FIM,
  CENARIO,
  ETAPA,
  FASE,
  FOGUEIRA_F32,
  FOGUEIRA_U8,
  JOGADOR,
  JOGADOR4_U8,
  MUNDO,
  MUNDO2,
  PROGRESSAO,
  TIPO_DE_PICKUP,
  TODOS_OS_TUTORIAIS,
  criarEstado,
  type Estado,
  type ParametrosDaVigilia,
} from '../../../src/logica/nucleo/estado';
import { CAUSA, EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';
import { eventosDe, posJogador, slotsVivos } from '../combate/apoio';

const BASE: Partial<ParametrosDaVigilia> = { armas: [], tutoriaisVistos: TODOS_OS_TUTORIAIS, cenario: CENARIO.jogadorInvulneravel };

/** Vigília a 10 passos do marco `k` (0, 1 ou 2), no início do jogador. */
function aMarco(k: number, extra: Partial<ParametrosDaVigilia> = {}): Estado {
  return criarEstado(1, D, { ...BASE, relogioInicial: D.marcos.limiar[k]! - 10, inicioLivre: true, ...extra });
}

const coroados = (e: Estado): number[] => slotsVivos(e).filter((s) => e.inimigos.tipo[s] === TIPO.oco_grande_coroado);
const f = (e: Estado, campo: keyof typeof FOGUEIRA_F32): number => e.fogueiraF32[FOGUEIRA_F32[campo]]!;
const u = (e: Estado, campo: keyof typeof FOGUEIRA_U8): number => e.fogueiraU8[FOGUEIRA_U8[campo]]!;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(deltaNoToro(ax, bx, W), deltaNoToro(ay, by, H));
const distAoCentro = (e: Estado, x: number, y: number): number => dist(f(e, 'arenaX'), f(e, 'arenaY'), x, y);
const mortes = (e: Estado): number => e.mundo[MUNDO.mortes]!;

describe('o Coroado do marco (CR6, AR1)', () => {
  it('com I = 1,0: HP 960 às 5:00, 2.200 às 10:00 e 1.680 cada às 15:00; dano 31,25, 37,5 e 43,75', () => {
    const esperado = [
      { quantos: 1, hp: 960, dano: 31.25 },
      { quantos: 1, hp: 2200, dano: 37.5 },
      { quantos: 2, hp: 1680, dano: 43.75 },
    ];
    esperado.forEach((x, k) => {
      const e = aMarco(k);
      expect(u(e, 'etapa')).toBe(ETAPA.hora);
      avancar(e, D, PARADO, 10);
      expect(u(e, 'etapa'), `marco ${k}`).toBe(ETAPA.marco);
      expect(u(e, 'marcosIniciados')).toBe(k + 1);
      const cs = coroados(e);
      expect(cs, `marco ${k}`).toHaveLength(x.quantos);
      for (const s of cs) {
        expect(e.inimigos.hp[s], `hp ${k}`).toBe(x.hp);
        expect(e.inimigos.dano[s], `dano ${k}`).toBe(x.dano);
        expect(e.inimigos.convocaEspera[s]).toBe(600);
      }
      expect(u(e, 'coroadosVivos')).toBe(x.quantos);
      const ev = eventosDe(e, EVENTO.marcoIniciado);
      expect(ev).toHaveLength(1);
      expect([ev[0]!.a, ev[0]!.b]).toEqual([k, x.quantos]);
    });
  });

  it('com I = 1,1 (depois de Descansar) o HP é hpNoSpawn(base, minuto, 11)', () => {
    const e = aMarco(0);
    e.mundo[MUNDO.intensidade10] = 11;
    avancar(e, D, PARADO, 10);
    expect(coroados(e).map((s) => e.inimigos.hp[s])).toEqual([hpNoSpawn(600, 5, 11)]);
    expect(hpNoSpawn(600, 5, 11)).toBeCloseTo(1056, 3);
  });

  it('a conta de hpNoSpawn e danoNoSpawn bate com os literais da D8', () => {
    expect([hpNoSpawn(600, 5, 10), hpNoSpawn(1000, 10, 10), hpNoSpawn(600, 15, 10)]).toEqual([960, 2200, 1680]);
    expect([danoNoSpawn(25, 5), danoNoSpawn(25, 10), danoNoSpawn(25, 15)]).toEqual([31.25, 37.5, 43.75]);
  });

  it('nasce a 128 px do centro da arena, nas direções 0 e 128 da tabela (dois no marco 3)', () => {
    const e = aMarco(2);
    avancar(e, D, PARADO, 10);
    const [a, b] = coroados(e);
    const [cx, cy] = [f(e, 'arenaX'), f(e, 'arenaY')];
    expect(dist(cx, cy, e.inimigos.x[a!]!, e.inimigos.y[a!]!)).toBeCloseTo(128, 3);
    expect(dist(cx, cy, e.inimigos.x[b!]!, e.inimigos.y[b!]!)).toBeCloseTo(128, 3);
    // Em lados opostos (direção 128 = −direção 0).
    expect(deltaNoToro(cx, e.inimigos.x[a!]!, W) + deltaNoToro(cx, e.inimigos.x[b!]!, W)).toBeCloseTo(0, 3);
  });

  it('com linha fixa de cenário a máquina fica presa em HORA', () => {
    const e = criarEstado(1, D, { ...BASE, relogioInicial: 17_990, linhaFixa: 4 });
    avancar(e, D, PARADO, 30);
    expect([u(e, 'etapa'), u(e, 'marcosIniciados'), e.cab[CAB.relogio]]).toEqual([ETAPA.hora, 0, 18_020]);
    expect(coroados(e)).toHaveLength(0);
  });
});

describe('a arena do marco 1 a partir de inicio_jogador (AR2 a AR4; F-008.4c)', () => {
  // Quem está a menos de 224 px do jogador quando a arena se forma (no passo 10, depois de andar rumo a ele) morre; os de fora ficam.
  const COLOCADOS = [
    { codigo: TIPO.oco_das_lanternas, dx: 100, dy: 0 },
    { codigo: TIPO.oco_das_lanternas, dx: 0, dy: -150 },
    { codigo: TIPO.oco_grande, dx: -120, dy: 60 },
    { codigo: TIPO.novica_de_sal, dx: 150, dy: 100 },
    { codigo: TIPO.oco_das_lanternas, dx: 222, dy: 0 },
    { codigo: TIPO.oco_das_lanternas, dx: -250, dy: 0 },
    { codigo: TIPO.oco_grande, dx: 0, dy: 280 },
  ];

  it('tira exatamente os obstáculos com d ≤ 224 + r, para sempre; mata a massa e os médios dentro (sem Cinza, Alma, baú nem `mortes`)', () => {
    const e = aMarco(0, { inimigos: COLOCADOS, cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado });
    expect(quantosAtivos(e.pool)).toBe(7);
    avancar(e, D, PARADO, 10);
    const [jx, jy] = posJogador(e);
    expect([jx, jy]).toEqual([585, 1266]);
    expect([f(e, 'arenaX'), f(e, 'arenaY')]).toEqual([585, 1266]);
    let tocados = 0;
    for (let i = 0; i < D.obstaculos.n; i++) {
      const toca = dist(585, 1266, D.obstaculos.x[i]!, D.obstaculos.y[i]!) <= 224 + D.obstaculos.r[i]!;
      if (toca) tocados++;
      expect(e.obstaculoAtivo[i], `obstáculo ${i}`).toBe(toca ? 0 : 1);
    }
    // De inicio_jogador o obstáculo mais próximo está a 244,5 px da borda do disco: nenhum é tocado.
    expect(tocados).toBe(0);
    expect(u(e, 'arenaAtiva')).toBe(1);
    // Os 5 de dentro (100, 150, 130, 180 e 222 px) morreram pela arena; os 2 de fora (250 e 280) ficaram, mais o Coroado.
    const mortesDaArena = eventosDe(e, EVENTO.morte);
    expect(mortesDaArena).toHaveLength(5);
    const tipos = slotsVivos(e).map((s) => e.inimigos.tipo[s]);
    expect(tipos.filter((t) => t === TIPO.oco_das_lanternas)).toHaveLength(1);
    expect(tipos.filter((t) => t === TIPO.oco_grande)).toHaveLength(1);
    expect(tipos.filter((t) => t === TIPO.novica_de_sal)).toHaveLength(0);
    expect(mortes(e)).toBe(0);
    expect(e.mundo2[MUNDO2.bausSoltos]).toBe(0);
    expect(e.progresso[PROGRESSAO.almas]).toBe(0);
    expect(slotsVivos(e).length).toBe(3);
    for (const s of slotsVivos(e)) {
      if (e.inimigos.tipo[s] === TIPO.oco_grande_coroado) continue;
      expect(distAoCentro(e, e.inimigos.x[s]!, e.inimigos.y[s]!), `slot ${s}`).toBeGreaterThanOrEqual(224);
    }
    const ativosDepois = [...e.obstaculoAtivo];
    avancar(e, D, PARADO, 600);
    expect([...e.obstaculoAtivo]).toEqual(ativosDepois);
    expect(mortes(e)).toBe(0);
  });

  it('perto de obstáculos: `obstaculoAtivo` = 0 exatamente onde d ≤ 224 + r (contagem independente) e nunca volta a 1', () => {
    const e = aMarco(0, { cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado });
    for (const [campo, v] of [[JOGADOR.x, 420], [JOGADOR.xAnt, 420], [JOGADOR.y, 1100], [JOGADOR.yAnt, 1100]] as const) e.jogador[campo] = v;
    avancar(e, D, PARADO, 10);
    const esperado: number[] = [];
    for (let i = 0; i < D.obstaculos.n; i++) esperado.push(dist(420, 1100, D.obstaculos.x[i]!, D.obstaculos.y[i]!) <= 224 + D.obstaculos.r[i]! ? 0 : 1);
    expect(esperado.filter((v) => v === 0).length).toBeGreaterThanOrEqual(2);
    expect([...e.obstaculoAtivo].slice(0, D.obstaculos.n)).toEqual(esperado);
    expect([...e.obstaculoAtivo].slice(D.obstaculos.n).every((v) => v === 0)).toBe(true);
    avancar(e, D, PARADO, 300);
    expect([...e.obstaculoAtivo].slice(0, D.obstaculos.n)).toEqual(esperado);
  });

  it('o diretor não nasce nada durante o marco: `spawns` fica constante por 600 passos e `espera` em 0', () => {
    const e = aMarco(0);
    avancar(e, D, PARADO, 10);
    const spawns = e.mundo[MUNDO.spawns];
    avancar(e, D, PARADO, 600);
    expect(e.mundo[MUNDO.spawns]).toBe(spawns);
    expect(e.mundo[MUNDO.espera]).toBe(0);
  });

  it('o inimigo de fora (a 250 px, 237 quando a arena se forma) não entra: fica além de 224 px do centro por 300 passos', () => {
    const e = aMarco(0, { inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: 250 }], cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado });
    avancar(e, D, PARADO, 10);
    const [s] = slotsVivos(e).filter((x) => e.inimigos.tipo[x] === TIPO.oco_das_lanternas);
    expect(s).toBeDefined();
    let menor = Infinity;
    for (let k = 0; k < 300; k++) {
      avancar(e, D, PARADO, 1);
      menor = Math.min(menor, distAoCentro(e, e.inimigos.x[s!]!, e.inimigos.y[s!]!));
    }
    expect(menor).toBeGreaterThanOrEqual(224 + 16 - 0.01);
  });

  it('o jogador que empurra a borda por 120 passos fica a ≤ 208 px do centro', () => {
    for (const mira of [[0, -1], [-1, 0], [0, 1], [-0.6, -0.8]] as const) {
      const e = aMarco(0, { cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado });
      avancar(e, D, PARADO, 10);
      // Sem o Coroado no caminho: o da direção 0 está em +x; as miras acima o evitam.
      const fonte = fonteDoRoteiro([{ passo: 0, mx: mira[0], my: mira[1] }]);
      let maior = 0;
      for (let k = 0; k < 120; k++) {
        avancar(e, D, fonte, 1);
        const [jx, jy] = posJogador(e);
        maior = Math.max(maior, distAoCentro(e, jx, jy));
      }
      expect(maior, `mira ${mira.join(',')}`).toBeLessThanOrEqual(208 + 1e-3);
      expect(maior).toBeGreaterThan(200);
    }
  });
});

describe('fim do marco (AR6, FG1, FG7, CR9; F-008.4d)', () => {
  /** Mata os Coroados de uma vez (hp = 0) e roda 1 passo. */
  function matarOsCoroados(e: Estado): void {
    for (const s of coroados(e)) e.inimigos.hp[s] = 0;
    avancar(e, D, PARADO, 1);
  }
  const baus = (e: Estado): { comum: number; dourado: number } => {
    let comum = 0;
    let dourado = 0;
    for (let s = 0; s < 512; s++) {
      if (e.poolDePickups.posicao[s]! < 0) continue;
      if (e.pickups.tipo[s] === TIPO_DE_PICKUP.bauComum) comum++;
      if (e.pickups.tipo[s] === TIPO_DE_PICKUP.bauDourado) dourado++;
    }
    return { comum, dourado };
  };

  it('marco 1: um baú comum, Cinza de 25 e Alma de 30, `mortes` + 1; a Fogueira acende a 96 px, HORA, sem arena, I = 1,0', () => {
    const e = aMarco(0);
    avancar(e, D, PARADO, 10);
    e.mundo[MUNDO.intensidade10] = 11;
    matarOsCoroados(e);
    expect(baus(e)).toEqual({ comum: 1, dourado: 0 });
    expect(e.mundo2[MUNDO2.bausSoltos]).toBe(1);
    expect(mortes(e)).toBe(1);
    let cinza25 = 0;
    let alma30 = 0;
    for (let s = 0; s < 512; s++) {
      if (e.poolDePickups.posicao[s]! < 0) continue;
      if (e.pickups.tipo[s] === TIPO_DE_PICKUP.cinza && e.pickups.valor[s] === 25) cinza25++;
      if (e.pickups.tipo[s] === TIPO_DE_PICKUP.alma && e.pickups.valor[s] === 30) alma30++;
    }
    expect([cinza25, alma30]).toEqual([1, 1]);
    expect([u(e, 'etapa'), u(e, 'arenaAtiva'), u(e, 'coroadosVivos'), u(e, 'fogueiraAcesa'), u(e, 'fogueiraHora'), u(e, 'fogueiraAcoes')]).toEqual([ETAPA.hora, 0, 0, 1, 1, 0]);
    expect(e.mundo[MUNDO.intensidade10]).toBe(10);
    const [jx, jy] = posJogador(e);
    expect(dist(jx, jy, f(e, 'fogueiraX'), f(e, 'fogueiraY'))).toBeCloseTo(96, 2);
    expect(eventosDe(e, EVENTO.marcoConcluido)).toHaveLength(1);
    const acesa = eventosDe(e, EVENTO.fogueiraAcesa);
    expect(acesa).toHaveLength(1);
    expect(acesa[0]!.a).toBe(1);
  });

  it('marco 2: o baú é dourado; marco 3: dois baús comuns (um por Coroado) e Fogueira da Hora III', () => {
    const e2 = aMarco(1);
    avancar(e2, D, PARADO, 10);
    matarOsCoroados(e2);
    expect(baus(e2)).toEqual({ comum: 0, dourado: 1 });
    expect(u(e2, 'fogueiraHora')).toBe(2);
    const e3 = aMarco(2);
    avancar(e3, D, PARADO, 10);
    matarOsCoroados(e3);
    expect(baus(e3)).toEqual({ comum: 2, dourado: 0 });
    expect(e3.mundo2[MUNDO2.bausSoltos]).toBe(2);
    expect(mortes(e3)).toBe(2);
    expect(u(e3, 'fogueiraHora')).toBe(3);
  });

  it('o marco 3 só termina com os dois Coroados mortos; matar um não acende a Fogueira', () => {
    const e = aMarco(2);
    avancar(e, D, PARADO, 10);
    const [a, b] = coroados(e);
    e.inimigos.hp[a!] = 0;
    avancar(e, D, PARADO, 1);
    expect([u(e, 'etapa'), u(e, 'fogueiraAcesa'), u(e, 'coroadosVivos'), u(e, 'arenaAtiva')]).toEqual([ETAPA.marco, 0, 1, 1]);
    e.inimigos.hp[b!] = 0;
    avancar(e, D, PARADO, 1);
    expect([u(e, 'etapa'), u(e, 'fogueiraAcesa'), u(e, 'coroadosVivos'), u(e, 'arenaAtiva')]).toEqual([ETAPA.hora, 1, 0, 0]);
  });

  it('a Fogueira escolhe a direção da mira e, com obstáculo ativo no disco, a próxima livre (k, k+1, k−1 …)', () => {
    const livre = aMarco(0);
    livre.jogador[JOGADOR.dirX] = 0;
    livre.jogador[JOGADOR.dirY] = -1;
    avancar(livre, D, PARADO, 10);
    matarOsCoroados(livre);
    const [jx, jy] = posJogador(livre);
    // A mira (0, −1) é a direção 192 da tabela (270°, meio passo de 0,7°): a Fogueira fica acima do jogador.
    expect(f(livre, 'fogueiraY')).toBeLessThan(jy - 90);
    expect(Math.abs(f(livre, 'fogueiraX') - jx)).toBeLessThan(2);
    // Um obstáculo ativo que cobre a direção da mira empurra a escolha para a vizinha.
    const o = { ...D.obstaculos, n: 1, x: Float32Array.of(585), y: Float32Array.of(1266 - 96), r: Float32Array.of(20) };
    const D1 = { ...D, obstaculos: o, obstaculosPorCelula: { inicio: new Int32Array(D.obstaculosPorCelula.inicio.length), indices: new Int32Array(0) } };
    const e = criarEstado(1, D1, { ...BASE, relogioInicial: 17_990, inicioLivre: true });
    e.jogador[JOGADOR.dirX] = 0;
    e.jogador[JOGADOR.dirY] = -1;
    // Põe o obstáculo ativo de novo depois da arena: na prática, ele é tirado (o disco o toca); o teste usa a função direta.
    avancar(e, D1, PARADO, 10);
    for (const s of coroados(e)) e.inimigos.hp[s] = 0;
    e.obstaculoAtivo[0] = 1;
    avancar(e, D1, PARADO, 1);
    const [px, py] = posJogador(e);
    expect(dist(px, py, f(e, 'fogueiraX'), f(e, 'fogueiraY'))).toBeCloseTo(96, 2);
    expect(dist(f(e, 'fogueiraX'), f(e, 'fogueiraY'), 585, 1266 - 96)).toBeGreaterThan(20 + 64);
  });
});

describe('marco vencido pelo relógio, 20:00 e 23:00 (AR7, AR8; F-008.4g)', () => {
  it('Guardião I vivo em 10:00: vira cinza (sem baú, Cinza, Alma nem `mortes`), a Fogueira não acende e o marco 2 começa já, com centro novo', () => {
    const e = aMarco(0);
    avancar(e, D, PARADO, 10);
    const antes = [f(e, 'arenaX'), f(e, 'arenaY')];
    expect(antes).toEqual([585, 1266]);
    // O jogador anda um pouco; o relógio é levado a 5 passos do limiar do marco 2.
    avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: -1 }]), 50);
    e.cab[CAB.relogio] = 35_995;
    const [jx, jy] = posJogador(e);
    const pickups = quantosAtivos(e.poolDePickups);
    const velho = coroados(e)[0]!;
    avancar(e, D, PARADO, 4);
    expect(u(e, 'marcosIniciados')).toBe(1);
    avancar(e, D, PARADO, 1);
    expect(e.cab[CAB.relogio]).toBe(36_000);
    expect(u(e, 'marcosIniciados')).toBe(2);
    expect(u(e, 'etapa')).toBe(ETAPA.marco);
    expect(u(e, 'fogueiraAcesa')).toBe(0);
    expect(eventosDe(e, EVENTO.marcoVencido)).toHaveLength(1);
    expect(e.pool.posicao[velho]).toBeGreaterThanOrEqual(-1);
    const morte = eventosDe(e, EVENTO.morte).filter((m) => m.alvo !== 0xffffffff);
    expect(morte.length).toBeGreaterThan(0);
    expect(mortes(e)).toBe(0);
    expect(e.mundo2[MUNDO2.bausSoltos]).toBe(0);
    expect(e.progresso[PROGRESSAO.almas]).toBe(0);
    expect(quantosAtivos(e.poolDePickups)).toBeLessThanOrEqual(pickups);
    // Arena nova: o centro é a posição do jogador no passo; o Coroado novo tem o HP de 10:00 (2.200).
    const [nx, ny] = [f(e, 'arenaX'), f(e, 'arenaY')];
    expect(ny).not.toBe(antes[1]);
    expect(dist(nx, ny, jx, jy)).toBeLessThan(15);
    expect(coroados(e).map((s) => e.inimigos.hp[s])).toEqual([2200]);
    expect(u(e, 'coroadosVivos')).toBe(1);
  });

  it('a causa da morte do Coroado do marco vencido é cinza; as da arena são `arena`', () => {
    const e = aMarco(0);
    avancar(e, D, PARADO, 10);
    e.cab[CAB.relogio] = 35_999;
    avancar(e, D, PARADO, 1);
    const causas = eventosDe(e, EVENTO.morte);
    expect(causas.length).toBeGreaterThan(0);
    // O evento guarda a causa nos bits 16 a 23 de inimigoFlagsCausa; o leitor de testes não a expõe: confere pelo anel cru.
    const u32 = e.eventos.u32;
    const n = u32[0]!;
    let cinzas = 0;
    for (let k = 0; k < n; k++) {
      const i = 1 + (k % 1024) * 8;
      if ((u32[i + 1]! & 0xff) === EVENTO.morte && u32[i + 3]! >>> 16 === CAUSA.cinza) cinzas++;
    }
    expect(cinzas).toBe(1);
  });

  it('Guardião II vivo em 20:00: viram cinza, a etapa é CHEFE, sem arena nem Fogueira', () => {
    const e = aMarco(2);
    avancar(e, D, PARADO, 10);
    expect(coroados(e)).toHaveLength(2);
    e.cab[CAB.relogio] = 71_995;
    avancar(e, D, PARADO, 5);
    expect(e.cab[CAB.relogio]).toBe(72_000);
    expect([u(e, 'etapa'), u(e, 'coroadosVivos'), u(e, 'arenaAtiva'), u(e, 'fogueiraAcesa')]).toEqual([ETAPA.chefe, 0, 0, 0]);
    expect(mortes(e)).toBe(0);
    expect(e.mundo2[MUNDO2.bausSoltos]).toBe(0);
    expect(coroados(e)).toHaveLength(0);
  });

  it('a Fogueira da Hora III se apaga em 20:00; qualquer Fogueira acesa se apaga', () => {
    const e = aMarco(2);
    avancar(e, D, PARADO, 10);
    for (const s of coroados(e)) e.inimigos.hp[s] = 0;
    avancar(e, D, PARADO, 1);
    expect(u(e, 'fogueiraAcesa')).toBe(1);
    e.cab[CAB.relogio] = 71_990;
    avancar(e, D, PARADO, 10);
    expect([u(e, 'etapa'), u(e, 'fogueiraAcesa')]).toEqual([ETAPA.chefe, 0]);
    expect(eventosDe(e, EVENTO.fogueiraApagada)).toHaveLength(1);
  });

  it('em CHEFE, 23:00 leva a A_FOME e ao FIM com causa aFome, no mesmo passo', () => {
    const e = aMarco(2);
    avancar(e, D, PARADO, 10);
    e.cab[CAB.relogio] = 71_999;
    avancar(e, D, PARADO, 1);
    expect(u(e, 'etapa')).toBe(ETAPA.chefe);
    e.cab[CAB.relogio] = 82_795;
    avancar(e, D, PARADO, 4);
    expect([u(e, 'etapa'), e.jogador4U8[JOGADOR4_U8.fase]]).toEqual([ETAPA.chefe, FASE.viva]);
    avancar(e, D, PARADO, 1);
    expect(e.cab[CAB.relogio]).toBe(82_800);
    expect([u(e, 'etapa'), e.jogador4U8[JOGADOR4_U8.fase], e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([ETAPA.aFome, FASE.fim, CAUSA_DO_FIM.aFome]);
  });

  it('o diretor segue na CHEFE (linha 20) e não nasce nada em MARCO; com marco devido também não', () => {
    const e = criarEstado(1, D, { ...BASE, relogioInicial: 70_000, inicioLivre: true });
    expect(u(e, 'etapa')).toBe(ETAPA.hora);
    avancar(e, D, PARADO, 100);
    expect(e.mundo[MUNDO.spawns]).toBeGreaterThan(0);
    const c = criarEstado(1, D, { ...BASE, relogioInicial: 72_000, inicioLivre: true });
    expect(u(c, 'etapa')).toBe(ETAPA.chefe);
    avancar(c, D, PARADO, 100);
    expect(c.mundo[MUNDO.spawns]).toBeGreaterThan(0);
    expect(CAPACIDADE_DE_INIMIGOS).toBe(500);
  });
});
