// Cálculo do desenho do mundo, sem Phaser (design/decisoes-F-005.md R1 e R2): os
// obstáculos e os pickups (Cinzas, Almas e baús) numa só camada, nesta ordem de
// membros: os N obstáculos, depois os 512 slots do pool de pickups. Os
// obstáculos ficam na cópia mais próxima da câmera, com as mesmas contas de
// antes (eram Image); cada pickup, na posição interpolada entre xAnt e x pelo
// delta toroidal, arredondada para o pixel do canvas e na cópia mais próxima,
// como a horda. O slot livre sai invisível. Nada é alocado por frame; no laço
// por slot as contas vão em linha (ADR-0005 §2, ADR-0006 §2).
import { ESCALA_DA_GRADE, RAIOS_DAS_ROCHAS, SEMENTES_DAS_ROCHAS, nomeDaRocha } from '../../arte/catalogo';
import { CAB, CAPACIDADE_DE_PICKUPS, TIPO_DE_PICKUP, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { COR_DA_CINZA } from '../../logica/progressao/tabela';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';

/** Obstáculos da Charneca e membros da camada "mundo" (54 + 512 = 566, R1). */
export const OBSTACULOS_DA_CHARNECA = 54;
export const MEMBROS_DO_MUNDO = OBSTACULOS_DA_CHARNECA + CAPACIDADE_DE_PICKUPS;
/** Membros da camada para uma região com `n` obstáculos. */
export function membrosDoMundo(n: number): number {
  return n + CAPACIDADE_DE_PICKUPS;
}

/** Tint neutro e escala da grade de arte: a arte (F-011) não é tingida e cada px de arte vale 2 pt. */
const BRANCO = 0xffffff;
const ESCALA = ESCALA_DA_GRADE.arte;

/** Moldura da rocha mais próxima do raio de um obstáculo (px de arte = raio em pt ÷ 2), nas 2 sementes alternadas. */
export function molduraDaRocha(raioPt: number, i: number): number {
  let melhor: number = RAIOS_DAS_ROCHAS[0];
  for (const r of RAIOS_DAS_ROCHAS) if (Math.abs(r - raioPt / ESCALA) < Math.abs(melhor - raioPt / ESCALA)) melhor = r;
  return indiceDaMoldura(nomeDaRocha(melhor, SEMENTES_DAS_ROCHAS[i % SEMENTES_DAS_ROCHAS.length]!));
}

/** As molduras das rochas da região, calculadas uma vez por região (o laço por quadro não monta nome nenhum). */
let rochasDe: DadosDaVigilia | null = null;
let rochas = new Uint16Array(0);
function rochasDaRegiao(dados: DadosDaVigilia): Uint16Array {
  if (rochasDe !== dados) {
    const o = dados.obstaculos;
    rochas = Uint16Array.from({ length: o.n }, (_, i) => molduraDaRocha(o.r[i]!, i));
    rochasDe = dados;
  }
  return rochas;
}

/** Cristal da Cinza por código de faixa (COR_DA_CINZA): azul 7 × 9, verde 9 × 11 e vermelha 11 × 13 px; e o quadro do brilho. */
const CRISTAL = new Int32Array(4);
const CRISTAL_BRILHANDO = new Int32Array(4);
CRISTAL[COR_DA_CINZA.azul] = indiceDaMoldura('cinza_azul');
CRISTAL[COR_DA_CINZA.verde] = indiceDaMoldura('cinza_verde');
CRISTAL[COR_DA_CINZA.vermelha] = indiceDaMoldura('cinza_vermelha');
CRISTAL_BRILHANDO[COR_DA_CINZA.azul] = indiceDaMoldura('cinza_azul_brilho');
CRISTAL_BRILHANDO[COR_DA_CINZA.verde] = indiceDaMoldura('cinza_verde_brilho');
CRISTAL_BRILHANDO[COR_DA_CINZA.vermelha] = indiceDaMoldura('cinza_vermelha_brilho');
const M_ALMA = [indiceDaMoldura('alma'), indiceDaMoldura('alma_2')] as const;
const M_BAU_COMUM = indiceDaMoldura('bau_comum');
const M_BAU_DOURADO = indiceDaMoldura('bau_dourado');
/** A Cinza cintila 6 passos a cada 48, defasada pelo slot; a Alma troca de quadro a cada 16 passos. */
const CICLO_DO_BRILHO = 48;
const PASSOS_DO_BRILHO = 6;

/** Os obstáculos nos membros 0 a n − 1: a rocha do raio da região (F-011), na cópia mais próxima da câmera. */
export function prepararObstaculos(dados: DadosDaVigilia, camX: number, camY: number, out: SaidaDeSprites, ativo: Uint8Array | null = null): void {
  const o = dados.obstaculos;
  const molduras = rochasDaRegiao(dados);
  for (let i = 0; i < o.n; i++) {
    let mx = (o.x[i]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (o.y[i]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    // Os obstáculos que a arena do marco desativou somem (F-008 AR3); sem o vetor (testes do render), todos aparecem.
    out.visivel[i] = ativo === null || ativo[i] === 1 ? 1 : 0;
    out.x[i] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[i] = camY + my - MEIA_ALTURA_DO_MAPA;
    out.rotacao[i] = 0;
    out.escalaX[i] = out.escalaY[i] = ESCALA;
    out.alpha[i] = 1;
    out.origemX[i] = out.origemY[i] = 0.5;
    out.moldura[i] = molduras[i]!;
    out.cor[i] = BRANCO;
  }
}

/**
 * Os pickups nos membros `dados.obstaculos.n` a n + 511 (F-011): a Cinza (o
 * cristal da faixa do valor, lida de `dados.progressao`, cintilando), a Alma
 * (chama lilás de 2 quadros) e o baú (comum ou dourado).
 */
export function prepararPickups(e: Estado, dados: DadosDaVigilia, alfa: number, camX: number, camY: number, out: SaidaDeSprites): void {
  const p = e.pickups;
  const pos = e.poolDePickups.posicao;
  const base = dados.obstaculos.n;
  const faixaValor = dados.progressao.faixaValor;
  const faixaCor = dados.progressao.faixaCor;
  const nFaixas = faixaValor.length;
  const passo = e.cab[CAB.passo]!;
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
    out.escalaX[k] = out.escalaY[k] = ESCALA;
    out.cor[k] = BRANCO;
    if (tipo === TIPO_DE_PICKUP.cinza) {
      // Faixa do valor: a última cujo "a partir de" o valor alcança (as faixas vêm em ordem crescente).
      const valor = p.valor[s]!;
      let faixa = 0;
      for (let f = 0; f < nFaixas; f++) if (valor >= faixaValor[f]!) faixa = faixaCor[f]!;
      out.moldura[k] = (passo + s * 7) % CICLO_DO_BRILHO < PASSOS_DO_BRILHO ? CRISTAL_BRILHANDO[faixa]! : CRISTAL[faixa]!;
    } else if (tipo === TIPO_DE_PICKUP.alma) {
      out.moldura[k] = M_ALMA[((passo >> 4) + s) & 1]!;
    } else if (tipo === TIPO_DE_PICKUP.bauDourado) {
      out.moldura[k] = M_BAU_DOURADO;
    } else {
      out.moldura[k] = M_BAU_COMUM;
    }
  }
}

/** A camada "mundo" inteira: obstáculos e pickups, nessa ordem de desenho. */
export function prepararMundo(e: Estado, dados: DadosDaVigilia, alfa: number, camX: number, camY: number, out: SaidaDeSprites): void {
  prepararObstaculos(dados, camX, camY, out, e.obstaculoAtivo);
  prepararPickups(e, dados, alfa, camX, camY, out);
}
