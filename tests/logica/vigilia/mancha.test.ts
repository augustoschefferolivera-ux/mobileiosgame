// Mancha das Cinzas Perdidas (design/decisoes-F-007.md MC1, MC4 a MC7, MC11): a Hora, o ponto livre, encostar e o
// estado sem RNG.
import { describe, expect, it } from 'vitest';
import { almasAoSantuario, almasNaMancha, horaDoRelogio, pontoLivreMaisProximo } from '../../../src/logica/mundo/mancha';
import { resultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { CAUSA_DO_FIM, JOGADOR4_U8, PROGRESSAO } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, deltaNoToro } from '../../../src/logica/mundo/toro';
import { PARADO } from '../apoio';
import { D_LIVRE, criar, eventosDe, posJogador } from '../combate/apoio';
import { DADOS_DA_CHARNECA as D_REAL } from '../apoio';

const min = (m: number, s = 0): number => (m * 60 + s) * 60;

describe('Hora (MC5)', () => {
  it('0:00, 4:59, 5:00, 9:59, 10:00, 15:00, 19:59 (IV), 20:00 e 22:59 (A Fome)', () => {
    expect([0, min(4, 59), min(5), min(9, 59), min(10), min(15), min(19, 59), min(20), min(22, 59)].map(horaDoRelogio)).toEqual([1, 1, 2, 2, 3, 4, 4, 5, 5]);
  });
});

describe('divisão das Almas (MC1)', () => {
  it('⌊(3N + 5)/10⌋ em inteiro: 0, 1, 2, 3, 4, 5, 15, 280, 1.100 → 0, 0, 1, 1, 1, 2, 5, 84, 330; mancha + Santuário = N', () => {
    const esperado = [0, 0, 1, 1, 1, 2, 5, 84, 330];
    [0, 1, 2, 3, 4, 5, 15, 280, 1100].forEach((n, i) => {
      const m = almasNaMancha(CAUSA_DO_FIM.apagar, n, 30);
      expect(m).toBe(esperado[i]);
      expect(m + almasAoSantuario(CAUSA_DO_FIM.apagar, n, m)).toBe(n);
    });
    expect(almasNaMancha(CAUSA_DO_FIM.abandonar, 280, 30)).toBe(0);
  });
});

describe('ponto livre (MC4)', () => {
  const o = D_REAL.obstaculos;
  const dentroDaZona = (x: number, y: number, margem: number): boolean => {
    for (let i = 0; i < o.n; i++) {
      const dx = deltaNoToro(o.x[i]!, x, LARGURA_DO_MAPA);
      const dy = deltaNoToro(o.y[i]!, y, ALTURA_DO_MAPA);
      const zona = o.r[i]! + margem;
      if (dx * dx + dy * dy < zona * zona - 1e-3) return true;
    }
    return false;
  };

  it('fora das zonas, o ponto fica onde está; dentro de uma, sai para a borda (raio + 16) pela normal', () => {
    const p = { x: 0, y: 0 };
    pontoLivreMaisProximo(o, 5, 5, 16, p);
    if (!dentroDaZona(5, 5, 16)) expect(p).toEqual({ x: 5, y: 5 });
    const x = o.x[0]!;
    const y = o.y[0]!;
    pontoLivreMaisProximo(o, x + 3, y, 16, p);
    expect(dentroDaZona(p.x, p.y, 16)).toBe(false);
    expect(Math.hypot(deltaNoToro(x, p.x, LARGURA_DO_MAPA), deltaNoToro(y, p.y, ALTURA_DO_MAPA))).toBeGreaterThanOrEqual(o.r[0]! + 16);
  });

  it('em 20.000 pontos da grade do mapa, o resultado nunca cai numa zona e fica dentro do mapa', () => {
    const p = { x: 0, y: 0 };
    const lado = 141;
    let dentro = 0;
    for (let a = 0; a < lado; a++) {
      for (let b = 0; b < lado; b++) {
        const x = ((a + 0.5) * LARGURA_DO_MAPA) / lado;
        const y = ((b + 0.5) * ALTURA_DO_MAPA) / lado;
        if (dentroDaZona(x, y, 16)) dentro++;
        pontoLivreMaisProximo(o, x, y, 16, p);
        expect(dentroDaZona(p.x, p.y, 16), `${x},${y}`).toBe(false);
        expect(p.x >= 0 && p.x < LARGURA_DO_MAPA && p.y >= 0 && p.y < ALTURA_DO_MAPA).toBe(true);
      }
    }
    expect(dentro).toBeGreaterThan(0);
  });

  it('a mancha do Resultado cai no ponto livre mais próximo da posição da morte', () => {
    const e = criar({ almasIniciais: 100 }, D_REAL);
    e.jogador[0] = o.x[0]! + 2;
    e.jogador[1] = o.y[0]!;
    e.jogador4U8[JOGADOR4_U8.causaDoFim] = CAUSA_DO_FIM.apagar;
    const m = resultadoDaVigilia(e, D_REAL).mancha!;
    expect(m.almas).toBe(30);
    expect(dentroDaZona(m.x, m.y, 16)).toBe(false);
  });
});

describe('encostar (MC7, MC11, MC6)', () => {
  const COM_MANCHA = (dx: number) => ({ mancha: { x: 585 + dx, y: 1266, almas: 84 } });

  it('33 px não pega, 32 pega, uma vez; manchaAtiva vai a 0, o evento leva as Almas e o resultado vê a recuperação', () => {
    const longe = criar(COM_MANCHA(33));
    avancar(longe, D_LIVRE, PARADO, 5);
    expect([longe.progresso[PROGRESSAO.almas], longe.jogador4U8[JOGADOR4_U8.manchaAtiva]]).toEqual([0, 1]);
    const perto = criar(COM_MANCHA(32));
    expect(posJogador(perto)).toEqual([585, 1266]);
    avancar(perto, D_LIVRE, PARADO, 1);
    expect([perto.progresso[PROGRESSAO.almas], perto.jogador4U8[JOGADOR4_U8.manchaAtiva]]).toEqual([84, 0]);
    avancar(perto, D_LIVRE, PARADO, 50);
    expect(perto.progresso[PROGRESSAO.almas]).toBe(84);
    const ev = eventosDe(perto, EVENTO.manchaRecuperada);
    expect([ev.length, ev[0]!.a, ev[0]!.passo]).toEqual([1, 84, 1]);
    expect(resultadoDaVigilia(perto, D_LIVRE).recuperouMancha).toBe(true);
    expect(resultadoDaVigilia(longe, D_LIVRE).recuperouMancha).toBe(false);
  });

  it('o toro vale: mancha na costura do mapa a 20 px é recuperada', () => {
    const e = criar({ mancha: { x: LARGURA_DO_MAPA - 5, y: 1266, almas: 3 } });
    e.jogador[0] = e.jogador[2] = 5;
    avancar(e, D_LIVRE, PARADO, 1);
    expect(e.progresso[PROGRESSAO.almas]).toBe(3);
  });

  it('a mancha não consome RNG: o estado dos fluxos depois de 600 passos é igual com e sem mancha', () => {
    const com = criar({ ...COM_MANCHA(200), cenario: 0 });
    const sem = criar({ cenario: 0 });
    avancar(com, D_LIVRE, PARADO, 600);
    avancar(sem, D_LIVRE, PARADO, 600);
    expect([...com.rng]).toEqual([...sem.rng]);
  });
});
