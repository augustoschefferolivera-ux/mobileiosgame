// Degradação graciosa (design/decisoes-F-010.md DG1 a DG3; F-010.12): a decisão do nível com o relógio injetado, o TETO efetivo
// do nível 3 no diretor e o replay com `degradacao` gravado no passo 600.
import { describe, expect, it } from 'vitest';
import { tetoEfetivo } from '../../../src/logica/diretor/diretor';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { CAB, CENARIO, MUNDO, criarEstado, hashEstado, TODOS_OS_TUTORIAIS } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { criarDegradacao, proximoNivel, registrarQuadro } from '../../../src/plataforma/degradacao';
import { DADOS_DA_CHARNECA as D } from '../apoio';

/** Alimenta `registrarQuadro` com quadros de 16,67 ms de relógio e o custo dado, por `segundos`. */
function rodar(d: ReturnType<typeof criarDegradacao>, cpuMs: number, desde: number, segundos: number): number {
  let t = desde;
  while (t < desde + segundos * 1000) {
    t += 1000 / 60;
    registrarQuadro(d, cpuMs, t);
  }
  return t;
}

describe('nível de degradação (DG1)', () => {
  it('16,1 ms por 2 s sobe 1; 15,9 não sobe', () => {
    const a = criarDegradacao(0);
    rodar(a, 16.1, 0, 2.1);
    expect(a.nivel).toBe(1);
    const b = criarDegradacao(0);
    rodar(b, 15.9, 0, 6);
    expect(b.nivel).toBe(0);
  });

  it('um nível por janela, até o 3; 9,9 ms por 10 s desce 1 e só 1', () => {
    const d = criarDegradacao(0);
    let t = rodar(d, 20, 0, 2.05);
    expect(d.nivel).toBe(1);
    t = rodar(d, 20, t, 2);
    t = rodar(d, 20, t, 2);
    t = rodar(d, 20, t, 4);
    expect(d.nivel).toBe(3);
    const t0 = t;
    t = rodar(d, 9.9, t, 9);
    expect(d.nivel).toBe(3);
    t = rodar(d, 9.9, t, 6);
    expect(d.nivel).toBe(2);
    expect(t - t0).toBeGreaterThan(10_000);
  });

  it('entre 10 e 16 ms zera a sequência de descida', () => {
    const d = criarDegradacao(0);
    d.nivel = 2;
    expect(proximoNivel(d, 9, 2000)).toBe(2);
    expect(d.baixoDesde).toBe(0);
    expect(proximoNivel(d, 12, 4000)).toBe(2);
    expect(d.baixoDesde).toBe(-1);
    expect(proximoNivel(d, 9, 6000)).toBe(2);
  });
});

describe('TETO efetivo (DG3)', () => {
  it('só o nível 3 troca o TETO pelo mínimo da linha, e só quando o mínimo é menor', () => {
    expect(tetoEfetivo(500, 19, 3)).toBe(19);
    expect(tetoEfetivo(500, 19, 2)).toBe(500);
    expect(tetoEfetivo(300, 400, 3)).toBe(300);
  });

  it('TETO 500 na linha 19 com I alto: o nível 3 mantém os slots no mínimo da linha; sem ele passam', () => {
    const minimo = D.timeline.minimo[19]!;
    const rodarCom = (nivel: number): number => {
      const e = criarEstado(4, D, { teto: 500, cenario: CENARIO.jogadorInvulneravel, relogioInicial: 19 * 3600, inicioLivre: true, tutoriaisVistos: TODOS_OS_TUTORIAIS });
      e.mundo[MUNDO.intensidade10] = 100;
      avancar(e, D, fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, undefined, [{ passo: 0, nivel }]), 120);
      expect(e.cab[CAB.teto]).toBe(500);
      return quantosAtivos(e.pool);
    };
    expect(rodarCom(3)).toBeLessThanOrEqual(minimo);
    expect(rodarCom(0)).toBeGreaterThan(minimo);
  });

  it('replay com degradação 3 no passo 600 reproduz o hash; sem ela o hash difere; a Vigília de TETO 300 reproduz', () => {
    const rodarCom = (nivel: number, teto: 300 | 500, desde = 600): number => {
      const e = criarEstado(4, D, { teto, cenario: CENARIO.jogadorInvulneravel, relogioInicial: 19 * 3600 - 600, inicioLivre: true, tutoriaisVistos: TODOS_OS_TUTORIAIS });
      e.mundo[MUNDO.intensidade10] = 100;
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA, undefined, undefined, nivel > 0 ? [{ passo: desde, nivel }] : undefined);
      avancar(e, D, fonte, 700);
      return hashEstado(e);
    };
    expect(rodarCom(3, 500)).toBe(rodarCom(3, 500));
    expect(rodarCom(3, 500, 0)).not.toBe(rodarCom(0, 500));
    expect(rodarCom(3, 300)).toBe(rodarCom(3, 300));
  }, 60_000);
});

describe('fronteiras exatas da degradação (crítico da F-010, M66, M67, M71)', () => {
  it('a média de 16 ms exatos não sobe (só acima), e 10 ms exatos não contam como baixo (só abaixo)', () => {
    const a = criarDegradacao(0);
    expect(proximoNivel(a, 16, 2000)).toBe(0);
    expect(proximoNivel(a, 16.0001, 4000)).toBe(1);
    const b = criarDegradacao(0);
    b.nivel = 2;
    proximoNivel(b, 9.9, 2000);
    expect(b.baixoDesde).toBe(0);
    proximoNivel(b, 10, 4000);
    expect(b.baixoDesde).toBe(-1);
  });

  it('10.000 ms exatos de sequência abaixo de 10 ms já descem um nível; 9.999 ms não', () => {
    const a = criarDegradacao(0);
    a.nivel = 2;
    a.baixoDesde = 0;
    expect(proximoNivel(a, 5, 9999)).toBe(2);
    const b = criarDegradacao(0);
    b.nivel = 2;
    b.baixoDesde = 0;
    expect(proximoNivel(b, 5, 10_000)).toBe(1);
  });

  it('a janela fecha com 2.000 ms exatos e não com 1.999', () => {
    const a = criarDegradacao(0);
    expect(registrarQuadro(a, 20, 1999)).toBe(0);
    expect(a.quadrosDaJanela).toBe(1);
    expect(registrarQuadro(a, 20, 2000)).toBe(1);
    expect(a.quadrosDaJanela).toBe(0);
  });
});
