// Cálculo do desenho do mundo, sem Phaser (design/decisoes-F-005.md R1 e R2): os
// obstáculos e os pickups (Cinzas e baús) numa só camada, nesta ordem de
// membros: os N obstáculos, depois os 512 slots do pool de pickups. Os
// obstáculos ficam na cópia mais próxima da câmera, com as mesmas contas de
// antes (eram Image); cada pickup, na posição interpolada entre xAnt e x pelo
// delta toroidal, arredondada para o pixel do canvas e na cópia mais próxima,
// como a horda. O slot livre sai invisível. Nada é alocado por frame; no laço
// por slot as contas vão em linha (ADR-0005 §2, ADR-0006 §2).
import { CAPACIDADE_DE_PICKUPS, TIPO_DE_PICKUP, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { COR_DA_CINZA } from '../../logica/progressao/tabela';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR } from '../paleta';
import { MOLDURA, escalaPara } from './atlas';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';

/** Obstáculos da Charneca e membros da camada "mundo" (54 + 512 = 566, R1). */
export const OBSTACULOS_DA_CHARNECA = 54;
export const MEMBROS_DO_MUNDO = OBSTACULOS_DA_CHARNECA + CAPACIDADE_DE_PICKUPS;
/** Membros da camada para uma região com `n` obstáculos. */
export function membrosDoMundo(n: number): number {
  return n + CAPACIDADE_DE_PICKUPS;
}

const M_CIRCULO = indiceDaMoldura('circulo');
const M_CINZA = indiceDaMoldura('cinza');
const M_QUADRADO = indiceDaMoldura('quadrado');
const M_BAU_OURO = indiceDaMoldura('bau_ouro');
const LARGURA_DO_CIRCULO = MOLDURA.circulo.largura;
const COR_DOS_OBSTACULOS = COR.cinzaFrio;

/** Tamanho do baú: 32 pt (R2). */
const LADO_DO_BAU_PT = 32;
const ESCALA_DO_BAU_COMUM = escalaPara('quadrado', LADO_DO_BAU_PT);
const ESCALA_DO_BAU_OURO = escalaPara('bau_ouro', LADO_DO_BAU_PT);

/** Escala e cor da Cinza por código de faixa (COR_DA_CINZA): 0,75 azul, 1,0 verde, 1,25 vermelha, sobre o losango de 12 × 16 pt. */
const ESCALA_DA_CINZA = new Float64Array(4);
const TINT_DA_CINZA = new Uint32Array(4);
ESCALA_DA_CINZA[COR_DA_CINZA.azul] = escalaPara('cinza', 12) * 0.75;
ESCALA_DA_CINZA[COR_DA_CINZA.verde] = escalaPara('cinza', 12);
ESCALA_DA_CINZA[COR_DA_CINZA.vermelha] = escalaPara('cinza', 12) * 1.25;
TINT_DA_CINZA[COR_DA_CINZA.azul] = COR.cinzaAzul;
TINT_DA_CINZA[COR_DA_CINZA.verde] = COR.cinzaVerde;
TINT_DA_CINZA[COR_DA_CINZA.vermelha] = COR.cinzaVermelha;

/** Os obstáculos nos membros 0 a n − 1: círculo cinza-frio do diâmetro da região, na cópia mais próxima da câmera. */
export function prepararObstaculos(dados: DadosDaVigilia, camX: number, camY: number, out: SaidaDeSprites): void {
  const o = dados.obstaculos;
  for (let i = 0; i < o.n; i++) {
    let mx = (o.x[i]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (o.y[i]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.visivel[i] = 1;
    out.x[i] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[i] = camY + my - MEIA_ALTURA_DO_MAPA;
    out.rotacao[i] = 0;
    out.escalaX[i] = out.escalaY[i] = (o.r[i]! * 2) / LARGURA_DO_CIRCULO;
    out.alpha[i] = 1;
    out.origemX[i] = out.origemY[i] = 0.5;
    out.moldura[i] = M_CIRCULO;
    out.cor[i] = COR_DOS_OBSTACULOS;
  }
}

/**
 * Os pickups nos membros `dados.obstaculos.n` a n + 511: a Cinza (losango, escala
 * e cor pela faixa do valor, lida de `dados.progressao`) e o baú (quadrado de
 * 32 pt, bronze o comum e ouro com contorno o dourado).
 */
export function prepararPickups(e: Estado, dados: DadosDaVigilia, alfa: number, camX: number, camY: number, out: SaidaDeSprites): void {
  const p = e.pickups;
  const pos = e.poolDePickups.posicao;
  const base = dados.obstaculos.n;
  const faixaValor = dados.progressao.faixaValor;
  const faixaCor = dados.progressao.faixaCor;
  const nFaixas = faixaValor.length;
  for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
    const k = base + s;
    const tipo = p.tipo[s]!;
    if (pos[s]! < 0 || tipo === TIPO_DE_PICKUP.vazio) {
      out.visivel[k] = 0;
      continue;
    }
    const xAnt = p.xAnt[s]!;
    const yAnt = p.yAnt[s]!;
    let dx = p.x[s]! - xAnt;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = p.y[s]! - yAnt;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const x = Math.round((xAnt + dx * alfa) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    const y = Math.round((yAnt + dy * alfa) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    let mx = (x - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (y - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.visivel[k] = 1;
    out.x[k] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[k] = camY + my - MEIA_ALTURA_DO_MAPA;
    out.rotacao[k] = 0;
    out.alpha[k] = 1;
    out.origemX[k] = out.origemY[k] = 0.5;
    if (tipo === TIPO_DE_PICKUP.cinza) {
      // Faixa do valor: a última cujo "a partir de" o valor alcança (as faixas vêm em ordem crescente).
      const valor = p.valor[s]!;
      let faixa = 0;
      for (let f = 0; f < nFaixas; f++) if (valor >= faixaValor[f]!) faixa = faixaCor[f]!;
      out.moldura[k] = M_CINZA;
      out.escalaX[k] = out.escalaY[k] = ESCALA_DA_CINZA[faixa]!;
      out.cor[k] = TINT_DA_CINZA[faixa]!;
    } else if (tipo === TIPO_DE_PICKUP.bauDourado) {
      out.moldura[k] = M_BAU_OURO;
      out.escalaX[k] = out.escalaY[k] = ESCALA_DO_BAU_OURO;
      out.cor[k] = COR.bauOuro;
    } else {
      out.moldura[k] = M_QUADRADO;
      out.escalaX[k] = out.escalaY[k] = ESCALA_DO_BAU_COMUM;
      out.cor[k] = COR.bauBronze;
    }
  }
}

/** A camada "mundo" inteira: obstáculos e pickups, nessa ordem de desenho. */
export function prepararMundo(e: Estado, dados: DadosDaVigilia, alfa: number, camX: number, camY: number, out: SaidaDeSprites): void {
  prepararObstaculos(dados, camX, camY, out);
  prepararPickups(e, dados, alfa, camX, camY, out);
}
