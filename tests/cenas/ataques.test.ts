// Render dos ataques dos inimigos (design/decisoes-F-006.md §8, RE4 a RE9): a 2ª camada de médios com o brilho do
// telegrafo por tintBlend, a cunha e a faixa no chão, o projétil de Sal com o anel e o indício da janela de aparo,
// a estrela do atordoado e os pares de cor da D6. Sem Phaser, salvo o SpriteGPULayer real sobre o gl falso.
import { criarCena } from './phaserFalso';
import { describe, expect, it } from 'vitest';
import inimigos from '../../src/dados/inimigos.json';
import { COR, COR_DO_INIMIGO } from '../../src/cenas/estilo';
import {
  ALFA_DO_TELEGRAFO,
  MEMBROS_DOS_MEDIOS,
  MEMBROS_DOS_PROJETEIS_INIMIGOS,
  MEMBROS_DOS_TELEGRAFOS,
  prepararMedios,
  prepararProjeteisInimigos,
  prepararTelegrafos,
} from '../../src/cenas/render/ataques';
import { MEMBROS_DAS_ARMAS, prepararArmas, prepararStatus } from '../../src/cenas/render/armas';
import { MOLDURA, RAIO_DA_CUNHA_PT } from '../../src/cenas/render/atlas';
import { CamadaPorGPU, CamadaPorImagem, criarSaidaDeSprites, indiceDaMoldura, tintDoBlend } from '../../src/cenas/render/camadas';
import { EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { OFFSET } from '../../src/cenas/render/escritores';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { CAB, JOGADOR, JOGADOR3_U8, TIPO_DE_PROJETIL, type Estado } from '../../src/logica/nucleo/estado';
import { alocar } from '../../src/logica/nucleo/pool';
import { FASE_DO_ATAQUE, TIPO } from '../../src/logica/mundo/tipos';
import { J, estadoCom, por } from '../logica/armas/apoio';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';
import { contraste, de2000, rgb } from './cores';

const TABELA = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
const TEL_OCO = D.combate.telegrafoPassos[TIPO.oco_grande]!;
const TEL_NOVICA = D.combate.telegrafoPassos[TIPO.novica_de_sal]!;

/** Põe o inimigo em telegrafo com `timer` passos por contar e a mira (mx, my). */
function telegrafar(e: Estado, s: number, timer: number, mx = 1, my = 0): void {
  e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
  e.inimigos.ataqueTimer[s] = timer;
  e.inimigos.miraX[s] = mx;
  e.inimigos.miraY[s] = my;
}

function horda(e: Estado, alfa = 1): ReturnType<typeof criarSaidaDaHorda> {
  const h = criarSaidaDaHorda();
  prepararHorda(e, alfa, J.x, J.y, h);
  return h;
}

describe('2ª camada de médios (RE8)', () => {
  it('escrita compacta só dos médios, na ordem dos slots, com a forma e a cor do tipo; a massa fica de fora', () => {
    const e = estadoCom([]);
    const massa = por(e, TIPO.oco_das_lanternas, 30, 0);
    const grande = por(e, TIPO.oco_grande, 0, -100);
    const novica = por(e, TIPO.novica_de_sal, 100, 0);
    const h = horda(e);
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    expect(prepararMedios(e, h, TABELA, D, 1, out)).toBe(2);
    expect([out.visivel[0], out.visivel[1], out.visivel[2]]).toEqual([1, 1, 0]);
    expect([out.moldura[0], out.moldura[1]]).toEqual([indiceDaMoldura('quadrado'), indiceDaMoldura('quadrado')]);
    expect([out.cor[0], out.cor[1]]).toEqual([COR_DO_INIMIGO['oco_grande'], COR_DO_INIMIGO['novica_de_sal']]);
    expect([out.x[0], out.y[0]]).toEqual([h.x[grande], h.y[grande]]);
    expect([out.x[1], out.y[1]]).toEqual([h.x[novica], h.y[novica]]);
    expect(h.tipo[massa]).toBe(TIPO.oco_das_lanternas);
    expect(MOLDURA.quadrado.largura * out.escalaX[0]!).toBe(48);
  });

  it('a cauda usada no quadro anterior é zerada quando um médio morre', () => {
    const e = estadoCom([]);
    por(e, TIPO.oco_grande, 0, -100);
    const b = por(e, TIPO.novica_de_sal, 100, 0);
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    prepararMedios(e, horda(e), TABELA, D, 1, out);
    expect([out.visivel[0], out.visivel[1]]).toEqual([1, 1]);
    e.pool.posicao[b] = -1;
    expect(prepararMedios(e, horda(e), TABELA, D, 1, out)).toBe(1);
    expect([out.visivel[0], out.visivel[1]]).toEqual([1, 0]);
  });

  it('um Oco Grande e um Oco no mesmo ponto: o médio é o da 2ª camada, desenhada acima da massa', () => {
    const e = estadoCom([]);
    por(e, TIPO.oco_das_lanternas, 0, -100);
    const g = por(e, TIPO.oco_grande, 0, -100);
    const h = horda(e);
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    prepararMedios(e, h, TABELA, D, 1, out);
    expect([out.x[0], out.y[0], out.cor[0]]).toEqual([h.x[g], h.y[g], 0x9fa39a]);
  });
});

describe('brilho do telegrafo no corpo por tintBlend (RE4)', () => {
  const blendDe = (e: Estado, s: number, alfa: number): number => {
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    prepararMedios(e, horda(e, alfa), TABELA, D, alfa, out);
    // O único médio vivo é o do slot s: o membro 0.
    expect(s).toBeGreaterThanOrEqual(0);
    return out.blend[0]!;
  };

  it('Oco Grande: 1 em T e 0 em T+35 (último passo), linear; Noviça: 1 em T e 0 em T+29', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    expect(blendDe(e, g, 1)).toBe(1);
    telegrafar(e, g, TEL_OCO);
    expect(blendDe(e, g, 1)).toBe(1);
    telegrafar(e, g, TEL_OCO - 35);
    expect(blendDe(e, g, 1)).toBe(0);
    telegrafar(e, g, TEL_OCO - 7);
    expect(blendDe(e, g, 1)).toBeCloseTo(1 - 7 / 35, 12);
    const f = estadoCom([]);
    const n = por(f, TIPO.novica_de_sal, 0, -100);
    telegrafar(f, n, TEL_NOVICA);
    expect(blendDe(f, n, 1)).toBe(1);
    telegrafar(f, n, TEL_NOVICA - 29);
    expect(blendDe(f, n, 1)).toBe(0);
    expect([TEL_OCO, TEL_NOVICA]).toEqual([36, 30]);
  });

  it('interpolado pelo alfa do render, sem passar de [0, 1]', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    telegrafar(e, g, TEL_OCO - 10);
    expect(blendDe(e, g, 0.5)).toBeCloseTo(1 - 9.5 / 35, 12);
    expect(blendDe(e, g, 0)).toBeCloseTo(1 - 9 / 35, 12);
    telegrafar(e, g, TEL_OCO);
    expect(blendDe(e, g, 0)).toBe(1);
    telegrafar(e, g, 1);
    expect(blendDe(e, g, 1)).toBe(0);
  });

  it('o SpriteGPULayer real recebe tintBlend (offset 28) de 1 a 0 e o tintMode (offset 38) nunca muda', () => {
    const { cena } = criarCena();
    const camada = new CamadaPorGPU(cena, MEMBROS_DOS_MEDIOS, false);
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    const layer = camada.layer;
    const f32 = layer.submitterNode.instanceBufferLayout.buffer.viewF32!;
    const vistos: number[] = [];
    for (let k = 0; k < TEL_OCO; k++) {
      telegrafar(e, g, TEL_OCO - k);
      prepararMedios(e, horda(e), TABELA, D, 1, out);
      camada.escrever(out);
      vistos.push(f32[OFFSET.tintBlend]!);
      expect(f32[OFFSET.tintMode]).toBe(0);
    }
    expect(vistos[0]).toBe(1);
    expect(vistos[TEL_OCO - 1]).toBe(0);
    for (let k = 1; k < vistos.length; k++) expect(vistos[k]!).toBeLessThan(vistos[k - 1]!);
    expect((layer.getMember(0) as unknown as { tintMode: number }).tintMode).toBe(0);
  });

  it('plano B (?render=image): o tint é mix(branco, cor, blend) em inteiros; blend 0 dá #ffffff', () => {
    expect(tintDoBlend(0x9fa39a, 1)).toBe(0x9fa39a);
    expect(tintDoBlend(0x9fa39a, 0)).toBe(0xffffff);
    expect(tintDoBlend(0x000000, 0.5)).toBe(0x808080);
    expect(typeof CamadaPorImagem).toBe('function');
  });
});

describe('cunha e faixa no chão (RE5)', () => {
  const telegrafos = (e: Estado, alfa = 1): { out: ReturnType<typeof criarSaidaDeSprites>; sobra: number; h: ReturnType<typeof criarSaidaDaHorda> } => {
    const out = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
    const h = horda(e, alfa);
    const sobra = prepararTelegrafos(e, D, h, alfa, out);
    return { out, sobra, h };
  };

  it('cunha do Oco Grande: raio de 64 com o vértice no centro do corpo, girada para a mira, branca e preenchida', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    telegrafar(e, g, TEL_OCO, 0, 1);
    const { out, h } = telegrafos(e);
    expect(out.moldura[0]).toBe(indiceDaMoldura('cunha'));
    expect([out.cor[0], out.origemX[0], out.origemY[0]]).toEqual([0xffffff, 0.5, 1]);
    expect([out.x[0], out.y[0]]).toEqual([h.x[g], h.y[g]]);
    expect(2 * RAIO_DA_CUNHA_PT * out.escalaX[0]!).toBeCloseTo(64, 9);
    // Mira para baixo (0, 1): a ponta da cunha aponta para +y.
    expect(out.rotacao[0]).toBeCloseTo(Math.PI, 12);
    expect(out.visivel[1]).toBe(0);
  });

  it('alfa da cunha: 0,10 em T e cresce linear a 0,40 até o início do indício; a faixa chega a 0,40 no último passo', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    telegrafar(e, g, TEL_OCO);
    expect(telegrafos(e).out.alpha[0]).toBeCloseTo(0.1, 12);
    telegrafar(e, g, 12);
    expect(telegrafos(e).out.alpha[0]).toBeCloseTo(0.1 + (0.3 * (TEL_OCO - 12 - 1 + 1)) / 35, 12);
    const f = estadoCom([]);
    const n = por(f, TIPO.novica_de_sal, 0, -100);
    telegrafar(f, n, TEL_NOVICA);
    expect(telegrafos(f).out.alpha[0]).toBeCloseTo(ALFA_DO_TELEGRAFO.inicial, 12);
    telegrafar(f, n, 1);
    expect(telegrafos(f).out.alpha[0]).toBeCloseTo(ALFA_DO_TELEGRAFO.final, 12);
    expect([ALFA_DO_TELEGRAFO.inicial, ALFA_DO_TELEGRAFO.final]).toEqual([0.1, 0.4]);
  });

  it('faixa da Noviça: 16 pt de largura e 240 pt de comprimento a partir do centro, na mira, branca', () => {
    const e = estadoCom([]);
    const n = por(e, TIPO.novica_de_sal, 0, -100);
    telegrafar(e, n, 20, 1, 0);
    const { out, h } = telegrafos(e);
    expect(out.moldura[0]).toBe(indiceDaMoldura('quadrado'));
    expect([out.x[0], out.y[0], out.cor[0]]).toEqual([h.x[n], h.y[n], 0xffffff]);
    expect(MOLDURA.quadrado.largura * out.escalaX[0]!).toBeCloseTo(16, 9);
    expect(MOLDURA.quadrado.largura * out.escalaY[0]!).toBeCloseTo(240, 9);
    // Mira para a direita: o comprimento (−y do sprite com origem embaixo) vira +x, rotação de 90°.
    expect(out.rotacao[0]).toBeCloseTo(Math.PI / 2, 12);
  });

  it('segue a posição interpolada do corpo empurrado: o vértice em T+10 está na posição nova', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    telegrafar(e, g, TEL_OCO - 10);
    e.inimigos.xAnt[g] = e.inimigos.x[g]! - 8;
    const meio = telegrafos(e, 0.5);
    expect(meio.out.x[0]).toBe(meio.h.x[g]);
    expect(meio.out.x[0]).not.toBe(telegrafos(e, 1).out.x[0]);
  });

  it('só em telegrafo, só branco (aparável), só para inimigos vivos; fora disso nada é desenhado', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    const m = por(e, TIPO.oco_das_lanternas, 50, 0);
    expect(telegrafos(e).out.visivel[0]).toBe(0);
    telegrafar(e, m, 10);
    expect(telegrafos(e).out.visivel[0]).toBe(0);
    e.inimigos.ataqueFase[m] = FASE_DO_ATAQUE.livre;
    e.inimigos.ataqueFase[g] = FASE_DO_ATAQUE.recuperacao;
    expect(telegrafos(e).out.visivel[0]).toBe(0);
  });

  it('64 membros: o 65º telegrafo não é desenhado e é contado', () => {
    const e = estadoCom([]);
    for (let k = 0; k < 65; k++) telegrafar(e, por(e, TIPO.oco_grande, (k % 13) * 20 - 120, -150 - Math.floor(k / 13) * 40), TEL_OCO);
    const { out, sobra } = telegrafos(e);
    expect(sobra).toBe(1);
    expect(Array.from(out.visivel).every((v) => v === 1)).toBe(true);
  });
});

describe('indício da janela de aparo na cunha (RE7, AP12)', () => {
  it('a cunha vira sólida exatamente com ataqueTimer ≤ 11 (≤ 17 com a janela estendida e o prompt visível)', () => {
    const e = estadoCom([]);
    const g = por(e, TIPO.oco_grande, 0, -100);
    const alfaCom = (timer: number): number => {
      telegrafar(e, g, timer);
      const out = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
      prepararTelegrafos(e, D, horda(e), 1, out);
      return out.alpha[0]!;
    };
    expect(alfaCom(12)).toBeLessThan(1);
    expect(alfaCom(11)).toBe(1);
    expect(alfaCom(1)).toBe(1);
    expect(alfaCom(17)).toBeLessThan(1);
    e.jogador3U8[JOGADOR3_U8.promptAparo] = 1;
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = 1;
    expect(alfaCom(17)).toBeLessThan(1);
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = 2;
    expect(alfaCom(18)).toBeLessThan(1);
    expect(alfaCom(17)).toBe(1);
    e.jogador3U8[JOGADOR3_U8.promptAparo] = 0;
    expect(alfaCom(17)).toBeLessThan(1);
  });
});

describe('projétil de Sal da Noviça (RE6) e o anel sólido (RE7)', () => {
  const V = D.combate.projetilPorPasso[TIPO.novica_de_sal]!;

  /** Um projétil de Sal a `dist` do jogador (à direita, indo para ele), com o desvio lateral `lado`. */
  function projetil(e: Estado, dist: number, lado = 0): number {
    const p = alocar(e.poolDeProjeteis);
    const pr = e.projeteis;
    pr.x[p] = pr.xAnt[p] = J.x + dist;
    pr.y[p] = pr.yAnt[p] = J.y + lado;
    pr.vx[p] = -V;
    pr.vy[p] = 0;
    pr.tipo[p] = TIPO_DE_PROJETIL.sal;
    pr.vida[p] = 100;
    return p;
  }
  const desenhar = (e: Estado, alfa = 1): ReturnType<typeof criarSaidaDeSprites> => {
    const out = criarSaidaDeSprites(MEMBROS_DOS_PROJETEIS_INIMIGOS);
    prepararProjeteisInimigos(e, D, alfa, J.x, J.y, out);
    return out;
  };

  it('um disco branco puro de 16 pt (a moldura massa) com um anel branco de 24 pt por trás; a faca é outra camada', () => {
    const e = estadoCom([]);
    projetil(e, 200);
    const out = desenhar(e);
    expect([out.moldura[0], out.moldura[1]]).toEqual([indiceDaMoldura('anel_pequeno'), indiceDaMoldura('massa')]);
    expect([out.cor[0], out.cor[1]]).toEqual([0xffffff, 0xffffff]);
    expect(MOLDURA.massa.largura * out.escalaX[1]!).toBe(16);
    expect(MOLDURA.anel_pequeno.largura * out.escalaX[0]!).toBe(24);
    expect([out.x[0], out.y[0]]).toEqual([J.x + 200, J.y]);
    expect(out.visivel[2]).toBe(0);
    // A camada das armas não desenha o tipo 2 como faca.
    const armas = criarSaidaDeSprites(MEMBROS_DAS_ARMAS);
    prepararArmas(e, D, new EfeitosDaVigilia(D.tipos), 1, J.x, J.y, J.x, J.y, armas);
    expect(armas.visivel[0]).toBe(0);
  });

  it('o anel pulsa entre 0,5 e 0,35 com período de 30 passos (CAB.passo mod 30)', () => {
    const e = estadoCom([]);
    projetil(e, 300);
    const alfas: number[] = [];
    for (let passo = 0; passo < 31; passo++) {
      e.cab[CAB.passo] = passo;
      alfas.push(desenhar(e).alpha[0]!);
    }
    expect(alfas[0]).toBeCloseTo(0.5, 12);
    expect(alfas[15]).toBeCloseTo(0.35, 12);
    expect(alfas[30]).toBeCloseTo(alfas[0]!, 12);
    expect(Math.min(...alfas)).toBeGreaterThanOrEqual(0.35 - 1e-12);
    expect(Math.max(...alfas)).toBeLessThanOrEqual(0.5 + 1e-12);
  });

  it('o anel vira sólido (alfa 1) exatamente quando o impacto previsto cruza 11 passos: distância 11 × 1,6 + 24 = 41,6', () => {
    const e = estadoCom([]);
    const p = projetil(e, 200);
    const alfaA = (dist: number): number => {
      e.projeteis.x[p] = e.projeteis.xAnt[p] = J.x + dist;
      return desenhar(e).alpha[0]!;
    };
    expect(11 * V + 8 + 16).toBeCloseTo(41.6, 9);
    expect(alfaA(41.5)).toBe(1);
    expect(alfaA(41.7)).toBeLessThan(1);
    expect(alfaA(40.5)).toBe(1);
    expect(alfaA(43)).toBeLessThan(1);
    expect(alfaA(300)).toBeLessThan(1);
  });

  it('com o prompt visível e falhasDeAparo ≥ 2, o limiar passa a 17 passos: 17 × 1,6 + 24 = 51,2', () => {
    const e = estadoCom([]);
    const p = projetil(e, 200);
    const alfaA = (dist: number): number => {
      e.projeteis.x[p] = e.projeteis.xAnt[p] = J.x + dist;
      return desenhar(e).alpha[0]!;
    };
    expect(alfaA(51.1)).toBeLessThan(1);
    e.jogador3U8[JOGADOR3_U8.promptAparo] = 1;
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = 2;
    expect(alfaA(51.1)).toBe(1);
    expect(alfaA(51.3)).toBeLessThan(1);
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = 1;
    expect(alfaA(51.1)).toBeLessThan(1);
  });

  it('só quando a linha pega o jogador e o projétil se aproxima: lateral fora de 24 pt, ou indo embora, não é sólido', () => {
    const e = estadoCom([]);
    const p = projetil(e, 30, 23);
    expect(desenhar(e).alpha[0]).toBe(1);
    e.projeteis.y[p] = e.projeteis.yAnt[p] = J.y + 25;
    expect(desenhar(e).alpha[0]).toBeLessThan(1);
    e.projeteis.y[p] = e.projeteis.yAnt[p] = J.y;
    e.projeteis.vx[p] = V;
    expect(desenhar(e).alpha[0]).toBeLessThan(1);
  });

  it('64 projéteis (128 membros): o 65º não é desenhado e é contado', () => {
    const e = estadoCom([]);
    for (let k = 0; k < 65; k++) projetil(e, 100 + k, 60);
    const out = criarSaidaDeSprites(MEMBROS_DOS_PROJETEIS_INIMIGOS);
    expect(prepararProjeteisInimigos(e, D, 1, J.x, J.y, out)).toBe(1);
    expect(Array.from(out.visivel).every((v) => v === 1)).toBe(true);
  });

  it('o jogador na posição do estado: o teste usa a posição simulada, não a interpolada', () => {
    const e = estadoCom([]);
    projetil(e, 41);
    e.jogador[JOGADOR.x] = J.x + 100;
    expect(desenhar(e).alpha[0]).toBeLessThan(1);
  });
});

describe('estrela do atordoado (RE9)', () => {
  it('aparece com quebradaPassos > 0, some em 0; com Sal e Postura juntos só a estrela, e o losango volta quando a Postura acaba', () => {
    const e = estadoCom([]);
    const s = por(e, TIPO.oco_grande, 0, -100);
    const h = horda(e);
    const out = criarSaidaDeSprites(500);
    prepararStatus(e, h, out);
    expect(out.visivel[s]).toBe(0);
    e.inimigos.quebradaPassos[s] = 120;
    prepararStatus(e, h, out);
    expect([out.visivel[s], out.moldura[s], out.cor[s]]).toEqual([1, indiceDaMoldura('estrela'), 0xffd166]);
    expect(MOLDURA.estrela.largura * out.escalaX[s]!).toBe(12);
    expect([out.x[s], out.y[s]]).toEqual([h.x[s], h.y[s]]);
    e.inimigos.salPct[s] = 50;
    e.inimigos.salPassos[s] = 30;
    prepararStatus(e, h, out);
    expect([out.moldura[s], out.cor[s]]).toEqual([indiceDaMoldura('estrela'), COR.amarelo]);
    e.inimigos.quebradaPassos[s] = 0;
    prepararStatus(e, h, out);
    expect([out.moldura[s], out.cor[s]]).toEqual([indiceDaMoldura('losango'), COR.sal]);
    e.inimigos.salPassos[s] = 0;
    prepararStatus(e, h, out);
    expect(out.visivel[s]).toBe(0);
  });
});

describe('cores da D6 (RE5, RE6, RE9)', () => {
  /** `frente` com `alfa` sobre `fundo`, canal a canal, arredondado. */
  const sobre = (frente: number, fundo: number, alfa: number): number => {
    const c = (s: number): number => Math.round(((frente >> s) & 255) * alfa + ((fundo >> s) & 255) * (1 - alfa));
    return (c(16) << 16) | (c(8) << 8) | c(0);
  };
  const de = (a: number, b: number): number => de2000(rgb(a), rgb(b));
  const cunha = sobre(COR.branco, COR.fundo, ALFA_DO_TELEGRAFO.final);

  it('a cunha em alfa 0,40 compõe #767980 sobre o fundo: contraste 3,78:1 (≥ 3) e ΔE 30,9 (≥ 14)', () => {
    expect(cunha).toBe(0x767980);
    expect(contraste(cunha, COR.fundo)).toBeCloseTo(3.78, 2);
    expect(contraste(cunha, COR.fundo)).toBeGreaterThanOrEqual(3);
    expect(de(cunha, COR.fundo)).toBeCloseTo(30.9, 1);
  });

  it('contra o anel da aura (21,3), a massa sob a cunha (27,0) e o corpo do Oco Grande (16,7): todos ≥ 14', () => {
    const aura = de(sobre(COR.sal, cunha, 0.6), cunha);
    const massa = de(sobre(COR.branco, COR_DO_INIMIGO['oco_das_lanternas']!, 0.4), cunha);
    const corpo = de(cunha, COR_DO_INIMIGO['oco_grande']!);
    expect([aura, massa, corpo].map((v) => Math.round(v * 10) / 10)).toEqual([21.3, 27, 16.7]);
    for (const v of [aura, massa, corpo]) expect(v).toBeGreaterThanOrEqual(14);
  });

  it('alfa 0,30 cai a contraste < 3 e alfa 0,60 cai a ΔE < 14 contra a aura e o corpo (os dois limites da D6)', () => {
    expect(contraste(sobre(COR.branco, COR.fundo, 0.3), COR.fundo)).toBeLessThan(3);
    const c60 = sobre(COR.branco, COR.fundo, 0.6);
    expect(de(sobre(COR.sal, c60, 0.6), c60)).toBeLessThan(14);
    expect(de(c60, COR_DO_INIMIGO['oco_grande']!)).toBeLessThan(14);
  });

  it('cunha branca × cunha de brasa do golpe: ΔE 23,5, sem exceção', () => {
    expect(de(cunha, sobre(COR.brasa, COR.fundo, 0.5))).toBeCloseTo(23.5, 1);
  });

  it('pares aceitos abaixo de 14 com o motivo "forma e tamanho distintos": sal × branco (6,5) e branco × osso (12,5)', () => {
    expect(de(COR.sal, COR.branco)).toBeCloseTo(6.5, 1);
    expect(de(COR.branco, COR.osso)).toBeCloseTo(12.5, 1);
  });

  it('estrela #ffd166: ΔE 27,5 (Oco Grande), 31,0 (Oco), 44,1 (Noviça), 22,0 (baú ouro), 26,6 (branco), 28,0 (sal) e 9,8 (brasa, aceito)', () => {
    const alvo = (c: number): number => Math.round(de(COR.amarelo, c) * 10) / 10;
    expect([
      alvo(COR_DO_INIMIGO['oco_grande']!),
      alvo(COR_DO_INIMIGO['oco_das_lanternas']!),
      alvo(COR_DO_INIMIGO['novica_de_sal']!),
      alvo(COR.bauOuro),
      alvo(COR.branco),
      alvo(COR.sal),
      alvo(COR.brasa),
    ]).toEqual([27.5, 31, 44.1, 22, 26.6, 28, 9.8]);
    for (const c of [COR_DO_INIMIGO['oco_grande']!, COR_DO_INIMIGO['oco_das_lanternas']!, COR_DO_INIMIGO['novica_de_sal']!, COR.bauOuro, COR.branco, COR.sal]) {
      expect(de(COR.amarelo, c)).toBeGreaterThanOrEqual(14);
    }
    expect(de(COR.amarelo, COR.brasa)).toBeLessThan(14);
  });

  it('a estrela e o telegrafo não usam o vermelho de dano nem o #ff2a2a', () => {
    for (const c of [COR.amarelo, COR.branco]) expect(c).not.toBe(0xff2a2a);
  });
});
