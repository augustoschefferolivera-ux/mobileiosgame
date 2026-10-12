// Dano de contato (F-003.5; B §3.3; Q-13 (a); Q-14; design/decisoes-F-003.md §3):
// cada acerto vale dano × 0,3 (1,5 no minuto 0), o timer abre 18 passos sem
// contato, vários encostados dão um acerto com o maior dano (empate: menor
// slot), só o Oco das Lanternas tem contato, o alcance tem a folga de 1/16 px,
// vale na costura e no anel de 7 Ocos que rejeitou a medida antes do bloqueio.
import { describe, expect, it } from 'vitest';
import { CAB, CENARIO, JOGADOR, JOGADOR_U8, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { proximoUnitario, semear } from '../../../src/logica/nucleo/rng';
import {
  FATOR_DO_ACERTO_DE_CONTATO,
  FOLGA_DO_CONTATO,
  PASSOS_DE_INVULNERABILIDADE,
  aplicarContato,
} from '../../../src/logica/mundo/contato';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W } from '../../../src/logica/mundo/toro';
import { DADOS_BRUTOS as D, PARADO } from '../apoio';

const JX = 585;
const JY = 1266;

function estadoEm(jx: number, jy: number, cenario = 0): Estado {
  const e = criarEstado(1, D, { cenario: CENARIO.diretorDesligado | cenario, armas: [] });
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = jx;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = jy;
  return e;
}

const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const timer = (e: Estado): number => e.jogadorU8[JOGADOR_U8.invulContato]!;

describe('acerto e período (F-003.5)', () => {
  it('no minuto 0, cada acerto vale 5 × 0,3 = 1,5, e o HP nasce em 150', () => {
    expect(D.hpInicial).toBe(150);
    expect(FATOR_DO_ACERTO_DE_CONTATO).toBe(0.3);
    const e = estadoEm(JX, JY);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32, JY, false);
    expect(aplicarContato(e, D)).toBe(0);
    expect(hp(e)).toBe(148.5);
    expect(timer(e)).toBe(PASSOS_DE_INVULNERABILIDADE);
  });

  it('com o contato contínuo, os acertos caem em t, t + 18, t + 36…: 1.080 passos dão 60 acertos e o HP vai a 60 (5/s)', () => {
    const e = estadoEm(JX, JY);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32, JY, false);
    const acertos: number[] = [];
    for (let k = 1; k <= 1080; k++) {
      const antes = hp(e);
      avancar(e, D, PARADO, 1);
      if (hp(e) < antes) {
        acertos.push(k);
        expect(antes - hp(e)).toBe(1.5);
      }
    }
    expect(acertos).toHaveLength(60);
    expect(acertos.slice(0, 3)).toEqual([1, 19, 37]);
    expect(acertos.every((k, i) => i === 0 || k - acertos[i - 1]! === 18)).toBe(true);
    expect(hp(e)).toBe(60);
    expect([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]).toEqual([JX, JY]);
  });

  it('o timer decrementa no início da fase: 17 passos sem acerto, e o 18º acerta de novo', () => {
    const e = estadoEm(JX, JY);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX - 32, JY, false);
    expect(aplicarContato(e, D)).toBe(0);
    for (let k = 1; k < 18; k++) {
      expect(aplicarContato(e, D)).toBe(-1);
      expect(timer(e)).toBe(18 - k);
    }
    expect(aplicarContato(e, D)).toBe(0);
    expect(hp(e)).toBe(147);
  });

  it('sem ninguém encostado, o timer só desce até 0 e o HP não muda', () => {
    const e = estadoEm(JX, JY);
    e.jogadorU8[JOGADOR_U8.invulContato] = 5;
    for (let k = 0; k < 10; k++) expect(aplicarContato(e, D)).toBe(-1);
    expect([timer(e), hp(e)]).toEqual([0, 150]);
  });
});

describe('vários encostados (K1)', () => {
  it('um acerto só, com o maior dano: um Oco do minuto 0 (5) e um do minuto 10 (7,5) dão 2,25', () => {
    const e = estadoEm(JX, JY);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32, JY, false);
    e.cab[CAB.relogio] = 10 * 3600;
    const novo = nascerInimigo(e, D, TIPO.oco_das_lanternas, JX - 32, JY, false);
    expect(e.inimigos.dano[novo]).toBe(7.5);
    expect(aplicarContato(e, D)).toBe(novo);
    expect(hp(e)).toBe(147.75);
  });

  it('empate no dano: acerta o menor slot, e o HP cai 1,5 com 6 Ocos encostados', () => {
    const e = estadoEm(JX, JY);
    const slots = [0, 1, 2, 3, 4, 5].map((k) => {
      const a = (k * Math.PI) / 3;
      return nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32 * Math.cos(a), JY + 32 * Math.sin(a), false);
    });
    expect(aplicarContato(e, D)).toBe(Math.min(...slots));
    expect(hp(e)).toBe(148.5);
  });

  it('Oco Grande, Noviça e convertido encostados não têm dano de contato', () => {
    const e = estadoEm(JX, JY);
    nascerInimigo(e, D, TIPO.oco_grande, JX + 40, JY, false);
    nascerInimigo(e, D, TIPO.novica_de_sal, JX - 40, JY, false);
    nascerInimigo(e, D, TIPO.oco_grande, JX, JY + 40, true);
    expect(aplicarContato(e, D)).toBe(-1);
    expect([timer(e), hp(e)]).toEqual([0, 150]);
  });
});

describe('alcance (folga de 1/16 px)', () => {
  it('d = 32 + 1/16 acerta; d = 32,07 não', () => {
    expect(FOLGA_DO_CONTATO).toBe(1 / 16);
    const a = estadoEm(JX, JY);
    nascerInimigo(a, D, TIPO.oco_das_lanternas, JX + 32 + 1 / 16, JY, false);
    expect(aplicarContato(a, D)).toBe(0);
    const b = estadoEm(JX, JY);
    nascerInimigo(b, D, TIPO.oco_das_lanternas, JX + 32.07, JY, false);
    expect(aplicarContato(b, D)).toBe(-1);
  });

  it('na costura em x e em y, pela distância no toro', () => {
    const x = estadoEm(5, JY);
    nascerInimigo(x, D, TIPO.oco_das_lanternas, W - 26, JY, false);
    expect(aplicarContato(x, D)).toBe(0);
    const y = estadoEm(JX, 10);
    nascerInimigo(y, D, TIPO.oco_das_lanternas, JX, H - 21, false);
    expect(aplicarContato(y, D)).toBe(0);
  });

  it('anel de 7 Ocos encostados sem ninguém atrás (sobreposição de 4,2 px entre vizinhos): o contato dispara e segue o período', () => {
    const e = estadoEm(JX, JY);
    for (let k = 0; k < 7; k++) {
      const a = (2 * Math.PI * k) / 7;
      nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32 * Math.cos(a), JY + 32 * Math.sin(a), false);
    }
    avancar(e, D, PARADO, 360);
    expect(hp(e)).toBe(150 - 20 * 1.5);
  });

  it('com chegadas de direções e distâncias aleatórias (7 e 20 Ocos, 5 seeds), o jogador parado leva 5/s no regime', () => {
    // Só um anel perfeitamente simétrico que chega junto de perto para a ≈ 34,7 px (a separação limitada anula a
    // perseguição) sem acertar; com chegadas reais os primeiros encostam e ficam (design/decisoes-F-003.md §11).
    for (const n of [7, 20]) {
      for (let seed = 1; seed <= 5; seed++) {
        const e = estadoEm(JX, JY);
        const s = new Uint32Array(4);
        semear(s, 0, seed, 'diretor');
        for (let k = 0; k < n; k++) {
          const a = proximoUnitario(s, 0) * 2 * Math.PI;
          const r = 100 + proximoUnitario(s, 0) * 400;
          nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + r * Math.cos(a), JY + r * Math.sin(a), false);
        }
        avancar(e, D, PARADO, 1200);
        const antes = hp(e);
        avancar(e, D, PARADO, 360);
        expect(antes - hp(e), `${n} Ocos, seed ${seed}`).toBe(30);
      }
    }
  });
});

describe('dano ao jogador', () => {
  it('com o jogador invulnerável do cenário, o contato é detectado e o timer corre, mas o HP não muda', () => {
    const e = estadoEm(JX, JY, CENARIO.jogadorInvulneravel);
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32, JY, false);
    expect(aplicarContato(e, D)).toBe(0);
    expect([timer(e), hp(e)]).toEqual([18, 150]);
  });

  it('o HP para em 0 e a Vigília apaga (AG1): APAGANDO por 30 passos e FIM, com o passo parado (31)', () => {
    const e = estadoEm(JX, JY);
    e.jogador[JOGADOR.hp] = 1;
    nascerInimigo(e, D, TIPO.oco_das_lanternas, JX + 32, JY, false);
    avancar(e, D, PARADO, 40);
    expect(hp(e)).toBe(0);
    expect(e.cab[CAB.passo]).toBe(31);
  });
});
