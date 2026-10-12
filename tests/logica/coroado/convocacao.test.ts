// Convocação do Coroado (design/decisoes-F-008.md CR7; critério F-008.4b): 10 Ocos das Lanternas a cada 600 passos, a
// primeira 600 passos depois do nascimento, num anel de 80 px em volta do Coroado, rodado de 37 em 37 direções a cada
// convocação; os fora da arena levados para dentro (≤ 207,5 px do centro); a regra do ADR-0002 §8.7 com `falta` = 10
// (entra o que cabe no TETO, nada converte); ponto sobre obstáculo ativo é descartado; sem RNG; não nascem atordoados.
import { describe, expect, it } from 'vitest';
import { DIRECAO_X, DIRECAO_Y } from '../../../src/logica/mundo/direcoes';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CENARIO,
  FOGUEIRA_F32,
  FOGUEIRA_U32,
  FOGUEIRA_U8,
  MUNDO,
  TODOS_OS_TUTORIAIS,
  criarEstado,
  type Estado,
  type ParametrosDaVigilia,
} from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { DADOS_DA_CHARNECA as D, DADOS_SEM_OBSTACULOS as VAZIO, PARADO } from '../apoio';
import { eventosDe, slotsVivos } from '../combate/apoio';

const BASE: Partial<ParametrosDaVigilia> = { armas: [], tutoriaisVistos: TODOS_OS_TUTORIAIS, cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado };
const COROADO = TIPO.oco_grande_coroado;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(deltaNoToro(ax, bx, W), deltaNoToro(ay, by, H));
const coroados = (e: Estado): number[] => slotsVivos(e).filter((s) => e.inimigos.tipo[s] === COROADO);
const ocos = (e: Estado): number[] => slotsVivos(e).filter((s) => e.inimigos.tipo[s] === TIPO.oco_das_lanternas);

/** Um Coroado vivo, longe do jogador, o único inimigo, parado pelo cenário (sem ataques). */
function comCoroado(extra: Partial<ParametrosDaVigilia> = {}, dados = VAZIO): { e: Estado; s: number } {
  const e = criarEstado(1, dados, { ...BASE, inimigos: [{ codigo: COROADO, dx: 400, dy: 0 }], ...extra });
  return { e, s: coroados(e)[0]! };
}

describe('dados e prazo (CR7)', () => {
  it('nasce com convocaEspera 600; a 1ª convocação sai 600 passos depois e a 2ª, mais 600', () => {
    const { e, s } = comCoroado();
    expect(e.inimigos.convocaEspera[s]).toBe(600);
    avancar(e, VAZIO, PARADO, 599);
    expect(eventosDe(e, EVENTO.convocacao)).toHaveLength(0);
    avancar(e, VAZIO, PARADO, 1);
    const ev = eventosDe(e, EVENTO.convocacao);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.passo).toBe(600);
    expect(e.inimigos.convocaEspera[s]).toBe(600);
    avancar(e, VAZIO, PARADO, 600);
    const dois = eventosDe(e, EVENTO.convocacao);
    expect(dois.map((x) => x.passo)).toEqual([600, 1200]);
    expect(e.fogueiraU32[FOGUEIRA_U32.convocacoes]).toBe(2);
  });

  it('o prazo é o do JSON: 10 s = 600 passos, 10 Ocos das Lanternas, anel de 80 px', () => {
    const c = D.combate;
    expect([c.convocaPassos[COROADO], c.convocaQuantidade[COROADO], c.convocaAnel[COROADO], c.convocaTipo[COROADO]]).toEqual([600, 10, 80, TIPO.oco_das_lanternas]);
  });

  it('Coroado morto antes não convoca', () => {
    const { e, s } = comCoroado();
    avancar(e, VAZIO, PARADO, 300);
    e.inimigos.hp[s] = 0;
    avancar(e, VAZIO, PARADO, 400);
    expect(eventosDe(e, EVENTO.convocacao)).toHaveLength(0);
    expect(ocos(e)).toHaveLength(0);
    expect(e.fogueiraU32[FOGUEIRA_U32.convocacoes]).toBe(0);
  });
});

describe('o anel de 10 pontos (CR7)', () => {
  it('com o Coroado fora da arena (sem borda): 10 Ocos a 80 ± 0,01 px dele, nas direções (37 + ⌊i·256/10⌋) & 255 na 1ª convocação', () => {
    const { e, s } = comCoroado();
    const [cx, cy] = [e.inimigos.x[s]!, e.inimigos.y[s]!];
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    const novos = ocos(e);
    expect(novos).toHaveLength(10);
    // O Coroado anda um passo antes? Não: a convocação é no fim do passo; ele se moveu 1,56 px rumo ao jogador. Usa a posição de agora.
    const [px, py] = [e.inimigos.x[s]!, e.inimigos.y[s]!];
    expect(dist(cx, cy, px, py)).toBeLessThan(2);
    const desl = (1 * 37) & 255;
    const esperados = Array.from({ length: 10 }, (_, i) => {
      const k = (desl + Math.floor((i * 256) / 10)) & 255;
      return [px + 80 * DIRECAO_X[k]!, py + 80 * DIRECAO_Y[k]!];
    });
    for (const [i, o] of novos.entries()) {
      expect(dist(px, py, e.inimigos.x[o]!, e.inimigos.y[o]!), `oco ${i}`).toBeCloseTo(80, 1);
      // Antes do passo de comportamento do passo seguinte, o ponto é o do anel (tolerância do Float32).
      expect(Math.abs(deltaNoToro(esperados[i]![0]!, e.inimigos.x[o]!, W)), `x ${i}`).toBeLessThan(0.01);
      expect(Math.abs(deltaNoToro(esperados[i]![1]!, e.inimigos.y[o]!, H)), `y ${i}`).toBeLessThan(0.01);
    }
    for (const o of novos) {
      expect(e.inimigos.convertido[o]).toBe(0);
      expect(e.inimigos.quebradaPassos[o]).toBe(0);
    }
    const ev = eventosDe(e, EVENTO.convocacao)[0]!;
    expect([ev.a, ev.b]).toEqual([10, 0]);
  });

  it('a 2ª convocação gira o anel: desl = (2 × 37) & 255', () => {
    const { e, s } = comCoroado();
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    for (const o of ocos(e)) e.inimigos.hp[o] = 0;
    avancar(e, VAZIO, PARADO, 1);
    expect(ocos(e)).toHaveLength(0);
    e.inimigos.convocaEspera[s] = 1;
    // Para o Coroado não se mexer no passo da 2ª convocação e a comparação ser exata.
    avancar(e, VAZIO, PARADO, 1);
    const [px, py] = [e.inimigos.x[s]!, e.inimigos.y[s]!];
    const desl = (2 * 37) & 255;
    const achados = ocos(e).map((o) => [e.inimigos.x[o]! - px, e.inimigos.y[o]! - py] as const);
    expect(achados).toHaveLength(10);
    // A ordem dos slots depende da pilha de livres; os 10 pontos esperados têm de estar todos lá.
    for (let i = 0; i < 10; i++) {
      const k = (desl + Math.floor((i * 256) / 10)) & 255;
      const perto = achados.some(([x, y]) => Math.abs(x - 80 * DIRECAO_X[k]!) < 0.05 && Math.abs(y - 80 * DIRECAO_Y[k]!) < 0.05);
      expect(perto, `ponto ${i}`).toBe(true);
    }
  });

  it('sem consumir RNG: nenhum fluxo se move na convocação', () => {
    const { e, s } = comCoroado();
    const rng = Array.from(e.rng);
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    expect(ocos(e)).toHaveLength(10);
    expect(Array.from(e.rng)).toEqual(rng);
  });
});

/** `n` Ocos das Lanternas numa grade de 8 px a 200 px acima do jogador (dentro do alcance de ±500 dos inimigos iniciais). */
function espalhados(n: number): { codigo: number; dx: number; dy: number }[] {
  return Array.from({ length: n }, (_, k) => ({ codigo: TIPO.oco_das_lanternas, dx: -480 + 8 * (k % 120), dy: -200 - 8 * Math.floor(k / 120) }));
}

describe('TETO e excedente (ADR-0002 §8.7 com falta = 10)', () => {
  it('TETO 300 com 295 vivos: entram 5, descartam 5, slots ≤ 300 e nenhum convertido', () => {
    const outros = espalhados(294);
    const e = criarEstado(1, VAZIO, { ...BASE, teto: 300, inimigos: [{ codigo: COROADO, dx: 400, dy: 0 }, ...outros] });
    expect(quantosAtivos(e.pool)).toBe(295);
    const s = coroados(e)[0]!;
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    expect(quantosAtivos(e.pool)).toBe(300);
    const ev = eventosDe(e, EVENTO.convocacao)[0]!;
    expect([ev.a, ev.b]).toEqual([5, 5]);
    expect(slotsVivos(e).some((x) => e.inimigos.convertido[x] === 1)).toBe(false);
    expect(e.mundo[MUNDO.recusados]).toBe(0);
  });

  it('com o TETO cheio nada entra (e a convocação conta, com o prazo reiniciado)', () => {
    const outros = espalhados(299);
    const e = criarEstado(1, VAZIO, { ...BASE, teto: 300, inimigos: [{ codigo: COROADO, dx: 400, dy: 0 }, ...outros] });
    expect(quantosAtivos(e.pool)).toBe(300);
    const s = coroados(e)[0]!;
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    expect(quantosAtivos(e.pool)).toBe(300);
    expect(e.inimigos.convocaEspera[s]).toBe(600);
    expect(e.fogueiraU32[FOGUEIRA_U32.convocacoes]).toBe(1);
  });

  it('o TETO de 500 deixa entrar os 10 mesmo com 480 vivos', () => {
    const outros = espalhados(479);
    const e = criarEstado(1, VAZIO, { ...BASE, teto: 500, inimigos: [{ codigo: COROADO, dx: 400, dy: 0 }, ...outros] });
    const s = coroados(e)[0]!;
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, VAZIO, PARADO, 1);
    expect(quantosAtivos(e.pool)).toBe(490);
    expect(CAPACIDADE_DE_INIMIGOS).toBe(500);
  });
});

describe('dentro da arena e com obstáculos (CR7)', () => {
  /** Arena formada no jogador com o Coroado posto à mão em `(dx, dy)` do centro. */
  function naArena(dx: number, dy: number): { e: Estado; s: number } {
    const e = criarEstado(1, D, { ...BASE, relogioInicial: D.marcos.limiar[0]! - 2, inicioLivre: true, cenario: CENARIO.jogadorInvulneravel });
    avancar(e, D, PARADO, 2);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    const s = coroados(e)[0]!;
    const [ax, ay] = [e.fogueiraF32[FOGUEIRA_F32.arenaX]!, e.fogueiraF32[FOGUEIRA_F32.arenaY]!];
    e.inimigos.x[s] = e.inimigos.xAnt[s] = ax + dx;
    e.inimigos.y[s] = e.inimigos.yAnt[s] = ay + dy;
    e.inimigos.convocaEspera[s] = 1;
    return { e, s };
  }

  it('os convocados ficam a ≤ 207,5 px do centro; os de dentro nascem a 80 px do Coroado, sem corte', () => {
    const perto = naArena(30, 0);
    avancar(perto.e, D, PARADO, 1);
    const [ax, ay] = [perto.e.fogueiraF32[FOGUEIRA_F32.arenaX]!, perto.e.fogueiraF32[FOGUEIRA_F32.arenaY]!];
    expect(ocos(perto.e)).toHaveLength(10);
    for (const o of ocos(perto.e)) expect(dist(ax, ay, perto.e.inimigos.x[o]!, perto.e.inimigos.y[o]!)).toBeLessThanOrEqual(207.5 + 0.01);
    // Com o Coroado perto da borda (190 do centro), o anel de 80 px passa de 224 e é levado para dentro.
    const borda = naArena(190, 0);
    avancar(borda.e, D, PARADO, 1);
    const [bx, by] = [borda.e.fogueiraF32[FOGUEIRA_F32.arenaX]!, borda.e.fogueiraF32[FOGUEIRA_F32.arenaY]!];
    let cortados = 0;
    for (const o of ocos(borda.e)) {
      const d = dist(bx, by, borda.e.inimigos.x[o]!, borda.e.inimigos.y[o]!);
      expect(d).toBeLessThanOrEqual(207.5 + 0.01);
      if (Math.abs(d - 207.5) < 0.01) cortados++;
    }
    expect(cortados).toBeGreaterThan(0);
    expect(ocos(borda.e)).toHaveLength(10);
  });

  it('fora da arena, ponto sobre obstáculo ativo é descartado e conta em semPontoLivre; dentro da arena a conta é dispensada (AR3)', () => {
    // O Coroado a 80 px do jogador não anda (pararADistancia): o ponto do anel é conhecido de antemão.
    const desl = (1 * 37) & 255;
    const [cx, cy] = [585 + 80, 1266];
    const alvoX = cx + 80 * DIRECAO_X[desl]!;
    const alvoY = cy + 80 * DIRECAO_Y[desl]!;
    const o = { ...VAZIO.obstaculos, n: 1, x: Float32Array.of(alvoX), y: Float32Array.of(alvoY), r: Float32Array.of(20) };
    const D1 = { ...VAZIO, obstaculos: o };
    const e = criarEstado(1, D1, { ...BASE, inimigos: [{ codigo: COROADO, dx: 80, dy: 0 }] });
    expect(e.obstaculoAtivo[0]).toBe(1);
    const s = coroados(e)[0]!;
    e.inimigos.convocaEspera[s] = 1;
    avancar(e, D1, PARADO, 1);
    expect([e.inimigos.x[s], e.inimigos.y[s]]).toEqual([cx, cy]);
    expect(e.mundo[MUNDO.semPontoLivre]).toBe(1);
    expect(ocos(e)).toHaveLength(9);
    const ev = eventosDe(e, EVENTO.convocacao)[0]!;
    expect([ev.a, ev.b]).toEqual([9, 1]);
    // Obstáculo inativo (tirado pela arena) não descarta.
    const outro = criarEstado(1, D1, { ...BASE, inimigos: [{ codigo: COROADO, dx: 80, dy: 0 }] });
    outro.obstaculoAtivo[0] = 0;
    outro.inimigos.convocaEspera[coroados(outro)[0]!] = 1;
    avancar(outro, D1, PARADO, 1);
    expect(ocos(outro)).toHaveLength(10);
  });

  it('no marco, o Coroado do marco convoca aos 600 passos de nascer', () => {
    const e = criarEstado(1, D, { ...BASE, relogioInicial: D.marcos.limiar[0]! - 2, inicioLivre: true, cenario: CENARIO.jogadorInvulneravel });
    avancar(e, D, PARADO, 2);
    expect(e.cab[CAB.relogio]).toBe(D.marcos.limiar[0]);
    const nasceu = e.cab[CAB.passo]!;
    avancar(e, D, PARADO, 599);
    expect(eventosDe(e, EVENTO.convocacao)).toHaveLength(0);
    avancar(e, D, PARADO, 1);
    const ev = eventosDe(e, EVENTO.convocacao);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.passo - nasceu).toBe(600);
  });
});
