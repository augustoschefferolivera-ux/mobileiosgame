// Render do mundo (design/decisoes-F-005.md R1, R2 e U6): obstáculos e pickups
// na camada "mundo", Cinzas pela faixa do valor, baús, ondas da União na camada
// das armas e o escritor GPU de 566 membros sobre o SpriteGPULayer real.
import { criarCena } from './phaserFalso';
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { MEMBROS_DAS_ARMAS, INICIO_DAS_ONDAS, prepararArmas } from '../../src/cenas/render/armas';
import { MOLDURA } from '../../src/cenas/render/atlas';
import { RAIOS_DAS_ROCHAS, SEMENTES_DAS_ROCHAS, nomeDaRocha } from '../../src/arte/catalogo';
import { arredondarParaOPixel } from '../../src/cenas/render/camera';
import { CamadaPorGPU, NOMES_DAS_MOLDURAS, criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { MEMBROS_DO_MUNDO, OBSTACULOS_DA_CHARNECA, membrosDoMundo, prepararMundo, prepararObstaculos, prepararPickups } from '../../src/cenas/render/pickups';
import { COR } from '../../src/cenas/paleta';
import { criarOnda } from '../../src/logica/armas/ondas';
import { ARMA } from '../../src/logica/armas/tabela';
import { CAPACIDADE_DE_EFEITOS, CAPACIDADE_DE_PICKUPS, JOGADOR, TIPO_DE_PICKUP, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { alocar } from '../../src/logica/nucleo/pool';
import { semear, proximoUnitario } from '../../src/logica/nucleo/rng';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, copiaMaisProxima, interpolarNoToro } from '../../src/logica/mundo/toro';
import { estadoCom } from '../logica/armas/apoio';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

const OBST = DADOS_DA_CHARNECA.obstaculos.n;
const M_QUADRADO = indiceDaMoldura('quadrado');
/** O cristal de cada faixa (F-011), parado ou no quadro do brilho (a Cinza cintila pelo passo e pelo slot). */
const CRISTAL = (nome: string): number[] => [indiceDaMoldura(nome), indiceDaMoldura(`${nome}_brilho`)];

function porPickup(e: Estado, tipo: number, x: number, y: number, valor = 1, xAnt = x, yAnt = y): number {
  const s = alocar(e.poolDePickups);
  if (s < 0) throw new Error('pool cheio');
  const p = e.pickups;
  p.x[s] = x;
  p.y[s] = y;
  p.xAnt[s] = xAnt;
  p.yAnt[s] = yAnt;
  p.valor[s] = valor;
  p.tipo[s] = tipo;
  return s;
}

describe('camada "mundo" (R1)', () => {
  it('566 membros: 54 obstáculos da Charneca e 512 pickups', () => {
    expect([OBST, OBSTACULOS_DA_CHARNECA, CAPACIDADE_DE_PICKUPS, MEMBROS_DO_MUNDO, membrosDoMundo(OBST)]).toEqual([54, 54, 512, 566, 566]);
  });

  it('a posição dos obstáculos é igual à de antes (copiaMaisProxima do ponto) em 2.000 posições de câmera', () => {
    const rng = new Uint32Array(4);
    semear(rng, 0, 5, 'diretor');
    const u = (): number => proximoUnitario(rng, 0);
    const out = criarSaidaDeSprites(MEMBROS_DO_MUNDO);
    const o = DADOS_DA_CHARNECA.obstaculos;
    for (let c = 0; c < 2000; c++) {
      // Câmera no pixel (como centroDaCamera) e algumas na costura.
      const camX = arredondarParaOPixel(c % 5 === 0 ? (c % 2 === 0 ? u() * 40 : W - u() * 40) : u() * W);
      const camY = arredondarParaOPixel(c % 7 === 0 ? (c % 2 === 0 ? u() * 40 : H - u() * 40) : u() * H);
      prepararObstaculos(DADOS_DA_CHARNECA, camX, camY, out);
      for (let i = 0; i < o.n; i++) {
        expect(out.x[i]).toBe(copiaMaisProxima(o.x[i]!, camX, W));
        expect(out.y[i]).toBe(copiaMaisProxima(o.y[i]!, camY, H));
      }
    }
  });

  it('obstáculo: a rocha do raio da região (F-011; raio em px de arte = raio ÷ 2), sementes alternadas, visível, sem rotação', () => {
    const out = criarSaidaDeSprites(MEMBROS_DO_MUNDO);
    prepararObstaculos(DADOS_DA_CHARNECA, 585, 1266, out);
    const o = DADOS_DA_CHARNECA.obstaculos;
    for (let i = 0; i < o.n; i++) {
      const raio = o.r[i]! / 2;
      expect(RAIOS_DAS_ROCHAS).toContain(raio);
      const moldura = indiceDaMoldura(nomeDaRocha(raio, SEMENTES_DAS_ROCHAS[i % 2]!));
      expect([out.visivel[i], out.moldura[i], out.cor[i], out.alpha[i], out.rotacao[i]]).toEqual([1, moldura, 0xffffff, 1, 0]);
      expect([out.escalaX[i], out.escalaY[i]]).toEqual([2, 2]);
    }
  });
});

describe('prepararPickups', () => {
  it('o slot livre sai invisível; o vivo, visível', () => {
    const e = criarEstado(1, D);
    const out = criarSaidaDeSprites(membrosDoMundo(0));
    out.visivel.fill(1);
    const s = porPickup(e, TIPO_DE_PICKUP.cinza, 700, 1300);
    prepararPickups(e, D, 1, 585, 1266, out);
    expect(out.visivel[s]).toBe(1);
    expect(out.visivel.reduce((a, v) => a + v, 0)).toBe(1);
  });

  it('a Cinza usa o cristal da faixa do valor (dados.progressao): azul 14 × 18, verde 18 × 22, vermelha 22 × 26 pt', () => {
    const e = criarEstado(1, D);
    const out = criarSaidaDeSprites(membrosDoMundo(0));
    const { faixaValor, faixaCor } = D.progressao;
    expect(Array.from(faixaValor)).toEqual([1, 5, 25]);
    expect(faixaCor.length).toBe(3);
    const casos: [number, string][] = [
      [1, 'cinza_azul'],
      [4, 'cinza_azul'],
      [5, 'cinza_verde'],
      [10, 'cinza_verde'],
      [24, 'cinza_verde'],
      [25, 'cinza_vermelha'],
      [400, 'cinza_vermelha'],
    ];
    const slots = casos.map(([valor]) => porPickup(e, TIPO_DE_PICKUP.cinza, 700, 1300, valor));
    prepararPickups(e, D, 1, 585, 1266, out);
    casos.forEach(([valor, nome], i) => {
      const k = slots[i]!;
      expect(CRISTAL(nome), `valor ${valor}`).toContain(out.moldura[k]);
      expect([out.cor[k], out.alpha[k], out.escalaX[k], out.escalaY[k]], `valor ${valor}`).toEqual([0xffffff, 1, 2, 2]);
    });
  });

  it('o baú comum e o dourado (F-011): 16 px de arte a 2 pt, os 32 pt de largura do R2', () => {
    const e = criarEstado(1, D);
    const out = criarSaidaDeSprites(membrosDoMundo(0));
    const comum = porPickup(e, TIPO_DE_PICKUP.bauComum, 700, 1300, 0);
    const ouro = porPickup(e, TIPO_DE_PICKUP.bauDourado, 800, 1300, 1);
    prepararPickups(e, D, 1, 585, 1266, out);
    expect([out.moldura[comum], out.cor[comum]]).toEqual([indiceDaMoldura('bau_comum'), 0xffffff]);
    expect([out.moldura[ouro], out.cor[ouro]]).toEqual([indiceDaMoldura('bau_dourado'), 0xffffff]);
    expect(16 * out.escalaX[comum]!).toBe(32); // pt
    expect(16 * out.escalaX[ouro]!).toBe(32);
  });

  it('os pickups ficam depois dos obstáculos (membro n + slot) e prepararMundo escreve os dois', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA);
    const out = criarSaidaDeSprites(MEMBROS_DO_MUNDO);
    const s = porPickup(e, TIPO_DE_PICKUP.cinza, 700, 1300, 5);
    prepararMundo(e, DADOS_DA_CHARNECA, 1, 585, 1266, out);
    expect(out.visivel[OBST + s]).toBe(1);
    expect(CRISTAL('cinza_verde')).toContain(out.moldura[OBST + s]);
    expect(out.visivel.slice(0, OBST).every((v) => v === 1)).toBe(true);
    expect(out.visivel.reduce((a, v) => a + v, 0)).toBe(OBST + 1);
  });

  it('em 2.000 pickups (inclusive na costura), igual a interpolar, arredondar e levar à cópia mais próxima', () => {
    const rng = new Uint32Array(4);
    semear(rng, 0, 13, 'diretor');
    const u = (): number => proximoUnitario(rng, 0);
    const out = criarSaidaDeSprites(membrosDoMundo(0));
    for (let rodada = 0; rodada < 4; rodada++) {
      const e = criarEstado(1, D);
      for (let k = 0; k < CAPACIDADE_DE_PICKUPS; k++) {
        const x = u() * W;
        const y = u() * H;
        // Metade perto da costura: xAnt e x em lados opostos.
        const xAnt = k % 2 === 0 ? (x + W - 2 + u() * 4) % W : x - u() * 2;
        const yAnt = k % 3 === 0 ? (y + H - 2 + u() * 4) % H : y + u() * 2;
        porPickup(e, TIPO_DE_PICKUP.cinza, x, y, 1 + (k % 30), xAnt, yAnt);
      }
      const [alfa, camX, camY] = [u(), u() * W, u() * H];
      prepararPickups(e, D, alfa, camX, camY, out);
      for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
        const x = arredondarParaOPixel(interpolarNoToro(e.pickups.xAnt[s]!, e.pickups.x[s]!, alfa, W));
        const y = arredondarParaOPixel(interpolarNoToro(e.pickups.yAnt[s]!, e.pickups.y[s]!, alfa, H));
        expect(out.x[s]).toBe(copiaMaisProxima(x, camX, W));
        expect(out.y[s]).toBe(copiaMaisProxima(y, camY, H));
        expect(Math.abs(out.x[s]! - camX)).toBeLessThanOrEqual(W / 2);
      }
    }
  });

  it('na costura, xAnt = 1.168 e x = 2 com alfa 0,5 desenha em 0 (e não em 585), vista da câmera em 10', () => {
    const e = criarEstado(1, D);
    const out = criarSaidaDeSprites(membrosDoMundo(0));
    const s = porPickup(e, TIPO_DE_PICKUP.cinza, 2, 100, 1, 1168, 100);
    prepararPickups(e, D, 0.5, 10, 100, out);
    // 1.168 + 4 × 0,5 = 1.170 ≡ 0; arredondado ao pixel, na cópia mais próxima da câmera em 10.
    expect(out.x[s]).toBe(0);
    expect(out.y[s]).toBe(100);
    prepararPickups(e, D, 0.5, 1160, 100, out);
    expect(out.x[s]).toBe(1170);
  });
});

describe('ondas da União na camada das armas (U6)', () => {
  const [PX, VIDA, META] = [
    D.armas.ondaPxPor60[ARMA.lamina_do_juramento_eterno]!,
    D.armas.ondaVida[ARMA.lamina_do_juramento_eterno]!,
    D.armas.ondaMeia[ARMA.lamina_do_juramento_eterno]!,
  ];

  /** Estado com uma onda da Lâmina na origem (585, 1.266), mira (dirX, dirY) e a idade dada. */
  function comOnda(dirX: number, dirY: number, idade: number): { e: Estado; o: number } {
    const e = estadoCom([[ARMA.lamina_do_juramento_eterno, 1]]);
    const j = e.jogador;
    j[JOGADOR.dirX] = dirX;
    j[JOGADOR.dirY] = dirY;
    criarOnda(e, ARMA.lamina_do_juramento_eterno);
    const o = e.poolDeEfeitos.posicao.findIndex((p) => p >= 0);
    e.efeitos.idade[o] = idade;
    return { e, o };
  }
  const saida = criarSaidaDeSprites(MEMBROS_DAS_ARMAS);
  const ef = new EfeitosDaVigilia(D.tipos);

  it('a camada das armas tem 485 membros (421 + 64) e a onda de 32 × 32 pt', () => {
    expect([MEMBROS_DAS_ARMAS, INICIO_DAS_ONDAS, CAPACIDADE_DE_EFEITOS]).toEqual([485, 421, 64]);
    expect([PX, VIDA, META]).toEqual([384, 15, 16]);
  });

  it('o slot livre sai invisível', () => {
    const e = estadoCom([[ARMA.espada_longa_do_juramento, 1]]);
    saida.visivel.fill(1);
    prepararArmas(e, D, ef, 1, 585, 1266, 585, 1266, saida);
    for (let o = 0; o < CAPACIDADE_DE_EFEITOS; o++) expect(saida.visivel[INICIO_DAS_ONDAS + o]).toBe(0);
  });

  it('posição pela idade e pelo alfa: origem + mira × 384 × (idade − 1 + alfa) / 60, no pixel; quadrado de 32 pt em brasa', () => {
    const { e, o } = comOnda(1, 0, 3);
    const k = INICIO_DAS_ONDAS + o;
    prepararArmas(e, D, ef, 1, 585, 1266, 585, 1266, saida);
    expect(saida.visivel[k]).toBe(1);
    expect([saida.x[k], saida.y[k]]).toEqual([arredondarParaOPixel(585 + 19.2), 1266]);
    prepararArmas(e, D, ef, 0.5, 585, 1266, 585, 1266, saida);
    // 384 × 2,5 / 60 = 16 px.
    expect([saida.x[k], saida.y[k]]).toEqual([585 + 16, 1266]);
    expect([saida.moldura[k], saida.cor[k], saida.origemX[k], saida.origemY[k]]).toEqual([M_QUADRADO, COR.brasa, 0.5, 0.5]);
    expect(MOLDURA.quadrado.largura * saida.escalaX[k]!).toBe(32); // pt
    expect(saida.escalaY[k]).toBe(saida.escalaX[k]);
  });

  it('a onda fica no chão: o jogador interpolado não a move; a câmera sim (cópia mais próxima)', () => {
    const { e, o } = comOnda(0, 1, 5);
    const k = INICIO_DAS_ONDAS + o;
    prepararArmas(e, D, ef, 1, 585, 1266, 111, 222, saida);
    expect([saida.x[k], saida.y[k]]).toEqual([585, 1266 + 32]);
    prepararArmas(e, D, ef, 1, 585 + 600, 1266, 111, 222, saida);
    expect(saida.x[k]).toBe(585 + W);
  });

  it('o ângulo é o da mira (0 = ponta para cima), como a cunha', () => {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const { e, o } = comOnda(dx, dy, 4);
      prepararArmas(e, D, ef, 1, 585, 1266, 585, 1266, saida);
      const dif = saida.rotacao[INICIO_DAS_ONDAS + o]! - (Math.atan2(dy, dx) + Math.PI / 2);
      expect(Math.abs(dif)).toBeLessThan(1e-12);
    }
  });

  it('alpha 0,4 até a idade 8, reto até 0 na idade 15; a imagem pausada (alfa = 1) só depende do estado', () => {
    const lido = (idade: number, alfa = 1): { v: number; a: number } => {
      const { e, o } = comOnda(1, 0, idade);
      prepararArmas(e, D, ef, alfa, 585, 1266, 585, 1266, saida);
      return { v: saida.visivel[INICIO_DAS_ONDAS + o]!, a: saida.alpha[INICIO_DAS_ONDAS + o]! };
    };
    expect(lido(6)).toEqual({ v: 1, a: 0.4 });
    expect(lido(8)).toEqual({ v: 1, a: 0.4 });
    expect(lido(11).a).toBeCloseTo((0.4 * 4) / 7, 12);
    expect(lido(12).a).toBeCloseTo((0.4 * 3) / 7, 12);
    expect(lido(14).a).toBeCloseTo(0.4 / 7, 12);
    expect(lido(15)).toEqual({ v: 0, a: expect.anything() });
    // Com alfa < 1 a idade fracionária desce 1 − alfa: idade 9 e alfa 0,5 = 8,5.
    expect(lido(9, 0.5).a).toBeCloseTo((0.4 * 6.5) / 7, 12);
  });

  it('no 1º quadro da onda (idade 0), a posição não recua para trás da origem', () => {
    const { e, o } = comOnda(1, 0, 0);
    prepararArmas(e, D, ef, 0.25, 585, 1266, 585, 1266, saida);
    expect(saida.x[INICIO_DAS_ONDAS + o]).toBe(585);
  });
});

describe('escritor GPU de 566 e 485 membros', () => {
  it('as camadas do mundo e das armas criam o layer com a capacidade e escrevem pelo buffer', () => {
    const { cena } = criarCena();
    for (const n of [MEMBROS_DO_MUNDO, MEMBROS_DAS_ARMAS]) {
      const gpu = new CamadaPorGPU(cena, n, false);
      const layer = (gpu as unknown as { layer: Phaser.GameObjects.SpriteGPULayer }).layer;
      expect(layer.memberCount).toBe(n);
      const s = criarSaidaDeSprites(n);
      s.visivel[n - 1] = 1;
      s.x[n - 1] = 12.5;
      s.y[n - 1] = -3;
      s.escalaX[n - 1] = s.escalaY[n - 1] = 0.375;
      s.alpha[n - 1] = 0.4;
      s.moldura[n - 1] = M_QUADRADO;
      s.cor[n - 1] = COR.bauOuro;
      gpu.escrever(s);
      expect(layer.getMember(n - 1)).toMatchObject({ x: 12.5, y: -3, scaleX: 0.375, scaleY: 0.375, tintTopLeft: COR.bauOuro });
      expect((layer.getMember(n - 1) as unknown as { alpha: number }).alpha).toBeCloseTo(0.4, 6);
      expect(layer.getMember(0)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
    }
  });

  it('as molduras novas estão em NOMES_DAS_MOLDURAS e fora do círculo, da faca e do losango', () => {
    expect(NOMES_DAS_MOLDURAS).toContain('cinza');
    expect(NOMES_DAS_MOLDURAS).toContain('bau_ouro');
  });
});
