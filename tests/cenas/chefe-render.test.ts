// Render dos golpes do Lanterneiro (F-009 §3, HD1): branco o aparável, vermelho o que se esquiva, o anel da Explosão e as zonas. Sem Phaser.
import { describe, expect, it } from 'vitest';
import inimigos from '../../src/dados/inimigos.json';
import { COR } from '../../src/cenas/paleta';
import { criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { MEMBROS_DO_CHEFE, prepararChefe } from '../../src/cenas/render/chefe';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda, prepararQuadrosDaHorda } from '../../src/cenas/render/horda';
import { ATAQUE_DO_CHEFE } from '../../src/logica/mundo/dados';
import { FASE_DO_ATAQUE } from '../../src/logica/mundo/tipos';
import { CHEFE_F32, CHEFE_U16, JOGADOR, type Estado } from '../../src/logica/nucleo/estado';
import { D, comChefe } from '../logica/chefe/apoio';

const TABELA = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
const SEM_ACERTOS = new Float64Array(500).fill(-1e9);

function telegrafando(id: number, timer: number) {
  const { e, s } = comChefe();
  e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
  e.inimigos.ataqueId[s] = id;
  e.inimigos.ataqueTimer[s] = timer;
  e.chefeF32[CHEFE_F32.miraX] = 0;
  e.chefeF32[CHEFE_F32.miraY] = 1;
  return desenhar(e, s);
}

function desenhar(e: Estado, s: number, alfa = 1) {
  const h = criarSaidaDaHorda();
  prepararHorda(e, alfa, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, h);
  prepararQuadrosDaHorda(e, TABELA, SEM_ACERTOS, h);
  const out = criarSaidaDeSprites(MEMBROS_DO_CHEFE);
  const n = prepararChefe(e, D, h, alfa, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, out);
  return { e, s, h, out, n };
}

describe('golpes do Lanterneiro no render', () => {
  it('sem golpe em curso nada é desenhado', () => {
    const { e, s } = comChefe();
    expect(desenhar(e, s).n).toBe(0);
  });

  it('Vara e Bater a Vara são brancos, de alfa 0,10 no passo T a 0,40 antes da janela do aparo', () => {
    const tel = D.chefe.telegrafo[ATAQUE_DO_CHEFE.vara]!;
    const v = telegrafando(ATAQUE_DO_CHEFE.vara, tel);
    expect([v.n, v.out.cor[0], v.out.cor[1]]).toEqual([2, COR.branco, COR.branco]);
    expect(v.out.alpha[0]).toBeCloseTo(0.1, 6);
    const b = telegrafando(ATAQUE_DO_CHEFE.bater, D.chefe.telegrafo[ATAQUE_DO_CHEFE.bater]!);
    expect([b.n, b.out.cor[0], b.out.moldura[0]]).toEqual([1, COR.branco, indiceDaMoldura('quadrado')]);
  });

  it('o branco fica sólido nos últimos 11 passos (indício do aparo); o vermelho não', () => {
    expect(telegrafando(ATAQUE_DO_CHEFE.vara, 11).out.alpha[0]).toBe(1);
    expect(telegrafando(ATAQUE_DO_CHEFE.luzCega, 11).out.alpha[0]).toBeLessThan(0.5);
  });

  it('Luz Cega, Explosão e zonas são vermelhas; o anel da Explosão cresce do raio inicial ao final', () => {
    const luz = telegrafando(ATAQUE_DO_CHEFE.luzCega, 30);
    expect([luz.n, luz.out.cor[0]]).toEqual([1, COR.cinzaVermelha]);
    const tel = D.chefe.telegrafo[ATAQUE_DO_CHEFE.explosao]!;
    const ini = telegrafando(ATAQUE_DO_CHEFE.explosao, tel);
    const fim = telegrafando(ATAQUE_DO_CHEFE.explosao, 1);
    expect(ini.out.cor[1]).toBe(COR.cinzaVermelha);
    expect(fim.out.escalaX[1]! / ini.out.escalaX[1]!).toBeCloseTo(D.chefe.explosaoRaioFim / D.chefe.explosaoRaioIni, 4);
  });

  it('a zona da Lanterna fica no ponto fixado, enchendo no telegrafo e fixa depois', () => {
    const { e, s } = comChefe();
    e.chefeF32[CHEFE_F32.zonaX0] = e.jogador[JOGADOR.x]! + 50;
    e.chefeF32[CHEFE_F32.zonaY0] = e.jogador[JOGADOR.y]!;
    e.chefeU16[CHEFE_U16.zonaTimer0] = 300;
    const r = desenhar(e, s);
    expect(r.n).toBe(2);
    expect(r.out.x[0]).toBeCloseTo(e.jogador[JOGADOR.x]! + 50, 6);
    expect(r.out.alpha[0]).toBeCloseTo(0.3, 6);
  });
});
