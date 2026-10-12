// Pickups (design/decisoes-F-005.md §2 e §4, X2 a X6 e B3; F-007 AM1 a AM3): Cinzas, Almas e baús no
// mesmo pool de 512. A Alma segue a Cinza (Ímã, voo, coleta), mas soma em `almas`. A Cinza nasce na morte por arma, com o XP do tipo; com o
// pool cheio, o valor se junta na Cinza viva mais próxima. O baú nunca é
// recusado: com o pool cheio, a Cinza mais próxima do ponto de queda é juntada
// na vizinha dela, e o slot vai para o baú. Fase 7e do passo, em slot
// crescente: xAnt = x, Ímã (d² ≤ 48², de centro a centro), voo de 8 px por
// passo, coleta a ≤ 16 px, abertura do baú a ≤ 32 px; depois, os cruzamentos
// de nível e, se for o caso, a oferta. Nenhum double atravessa chamada nos
// laços: o delta toroidal e a normalização vão em linha. Importado por
// estado.ts: nada no nível do módulo usa os valores de lá.
import type { DadosDaVigilia } from '../mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { CAB, CAPACIDADE_DE_PICKUPS, CENARIO, JOGADOR, LIMITE_DE_ALMAS, MUNDO2, PROGRESSAO, TIPO_DE_PICKUP, baseDoFluxo, type Estado } from '../nucleo/estado';
import { alocar, liberar } from '../nucleo/pool';
import { DOIS_A_MENOS_32, SORTEADO, sortear } from '../nucleo/rng';
import { MASSA_POR_CONVERTIDO } from '../mundo/inimigos';
import { TIPO } from '../mundo/tipos';
import { cruzarNiveis } from './atributos';
import { abrirBau } from './bau';
import { gerarOfertaSeFor } from './oferta';

/** Libera o slot do pickup e zera os campos (o hash só vê os vivos). */
export function liberarPickup(e: Estado, s: number): void {
  liberar(e.poolDePickups, s);
  const p = e.pickups;
  p.x[s] = p.y[s] = p.xAnt[s] = p.yAnt[s] = 0;
  p.valor[s] = 0;
  p.tipo[s] = 0;
}

/**
 * Pickup vivo do `tipo` (Cinza ou Alma) mais próximo de PONTO, pelo delta toroidal (empate: menor slot),
 * sem contar o slot `exceto`; −1 se não há. Lê x e y de PONTO (rascunho).
 */
function maisProximoDoTipo(e: Estado, exceto: number, tipo: number): number {
  const px = PONTO[0]!;
  const py = PONTO[1]!;
  const p = e.pickups;
  const pos = e.poolDePickups.posicao;
  let melhor = -1;
  let melhorD2 = Infinity;
  for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
    if (pos[s]! < 0 || s === exceto || p.tipo[s] !== tipo) continue;
    let dx = p.x[s]! - px;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = p.y[s]! - py;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d2 = dx * dx + dy * dy;
    if (d2 < melhorD2) {
      melhorD2 = d2;
      melhor = s;
    }
  }
  return melhor;
}

/** Ponto da busca da Cinza mais próxima (rascunho: nenhum double atravessa a chamada). */
const PONTO = new Float64Array(2);

/** Ocupa um slot de pickup em PONTO; −1 com o pool cheio. */
function ocupar(e: Estado, tipo: number, valor: number): number {
  const s = alocar(e.poolDePickups);
  if (s < 0) return -1;
  const p = e.pickups;
  p.x[s] = p.xAnt[s] = PONTO[0]!;
  p.y[s] = p.yAnt[s] = PONTO[1]!;
  p.valor[s] = valor;
  p.tipo[s] = tipo;
  return s;
}

/**
 * Cinza da morte do inimigo `slot` por arma (X2, X3): o XP do tipo (o
 * convertido: 10 × a do Oco), no ponto da morte. Chamada por matarInimigo antes
 * de remover; nada com CENARIO.semCinzas. Pool cheio: o valor se junta na
 * Cinza viva mais próxima (X6).
 */
export function soltarCinza(e: Estado, dados: DadosDaVigilia, slot: number): void {
  if ((e.cab[CAB.cenario]! & CENARIO.semCinzas) !== 0) return;
  const ini = e.inimigos;
  const t = dados.tipos;
  const valor = ini.convertido[slot] === 1 ? MASSA_POR_CONVERTIDO * t.xp[TIPO.oco_das_lanternas]! : t.xp[ini.tipo[slot]!]!;
  if (valor === 0) return;
  PONTO[0] = ini.x[slot]!;
  PONTO[1] = ini.y[slot]!;
  if (ocupar(e, TIPO_DE_PICKUP.cinza, valor) >= 0) return;
  juntar(e, -1, valor);
}

/** Soma `valor` na Cinza mais próxima de PONTO (fora `exceto`) e conta a junção. */
function juntar(e: Estado, exceto: number, valor: number): void {
  const alvo = maisProximoDoTipo(e, exceto, TIPO_DE_PICKUP.cinza);
  if (alvo >= 0) e.pickups.valor[alvo] = e.pickups.valor[alvo]! + valor;
  e.mundo2[MUNDO2.juncoes] = e.mundo2[MUNDO2.juncoes]! + 1;
}

/** Soma `v` (< 2^30) em `almas`, com o teto de LIMITE_DE_ALMAS − 1 (AM7); a conta fica em linha. */
export function creditarAlmas(e: Estado, v: number): void {
  const soma = e.progresso[PROGRESSAO.almas]! + v;
  e.progresso[PROGRESSAO.almas] = soma < LIMITE_DE_ALMAS ? soma : LIMITE_DE_ALMAS - 1;
}

/**
 * Alma da morte do inimigo `slot` por arma (AM1): `chance ≥ 1` dá o valor fixo, sem sorteio; senão um
 * sorteio do fluxo `drops` por tentativa (o convertido faz 10, com o valor e a chance do Oco das Lanternas,
 * e solta um pickup só, com a soma). Nada com CENARIO.semCinzas. Pool cheio (AM2): junta na Alma viva mais
 * próxima; sem Alma viva, credita direto em `almas`.
 */
export function soltarAlma(e: Estado, dados: DadosDaVigilia, slot: number): void {
  if ((e.cab[CAB.cenario]! & CENARIO.semCinzas) !== 0) return;
  const ini = e.inimigos;
  const t = dados.tipos;
  const convertido = ini.convertido[slot] === 1;
  const tipo = convertido ? TIPO.oco_das_lanternas : ini.tipo[slot]!;
  const unidade = t.almasValor[tipo]!;
  if (unidade === 0) return;
  const chance = t.almasChance[tipo]!;
  const tentativas = convertido ? MASSA_POR_CONVERTIDO : 1;
  let acertos = tentativas;
  if (!(chance >= 1)) {
    acertos = 0;
    const base = baseDoFluxo('drops');
    for (let k = 0; k < tentativas; k++) {
      sortear(e.rng, base);
      if (SORTEADO[0]! * DOIS_A_MENOS_32 < chance) acertos++;
    }
  }
  if (acertos === 0) return;
  const valor = acertos * unidade;
  PONTO[0] = ini.x[slot]!;
  PONTO[1] = ini.y[slot]!;
  if (ocupar(e, TIPO_DE_PICKUP.alma, valor) >= 0) return;
  juntarAlma(e, -1, valor);
}

/** Pool cheio (AM2): soma `valor` na Alma viva mais próxima de PONTO (fora `exceto`); sem nenhuma, credita direto em `almas`. */
function juntarAlma(e: Estado, exceto: number, valor: number): void {
  const alvo = maisProximoDoTipo(e, exceto, TIPO_DE_PICKUP.alma);
  if (alvo >= 0) {
    const soma = e.pickups.valor[alvo]! + valor;
    e.pickups.valor[alvo] = soma < LIMITE_DE_ALMAS ? soma : LIMITE_DE_ALMAS - 1;
  } else {
    creditarAlmas(e, valor);
  }
}

/**
 * Solta um baú em (x, y), já no toro (B3): soma `bausSoltos` e grava o índice
 * de queda no valor. Pool cheio: a Cinza mais próxima do ponto se junta na
 * vizinha dela e cede o slot. Devolve o slot, ou −1 se nem assim há vaga.
 */
export function soltarBau(e: Estado, x: number, y: number, dourado: boolean): number {
  const indice = e.mundo2[MUNDO2.bausSoltos]! + 1;
  e.mundo2[MUNDO2.bausSoltos] = indice;
  const tipo = dourado ? TIPO_DE_PICKUP.bauDourado : TIPO_DE_PICKUP.bauComum;
  PONTO[0] = x;
  PONTO[1] = y;
  let s = ocupar(e, tipo, indice);
  if (s >= 0) return s;
  // O baú cede a Cinza mais próxima (AM2); sem Cinza, a Alma mais próxima, que se junta na vizinha ou é creditada.
  const cedida = maisProximoDoTipo(e, -1, TIPO_DE_PICKUP.cinza);
  const cedidaAlma = cedida < 0 ? maisProximoDoTipo(e, -1, TIPO_DE_PICKUP.alma) : -1;
  if (cedida < 0 && cedidaAlma < 0) return -1;
  const origem = cedida >= 0 ? cedida : cedidaAlma;
  const valor = e.pickups.valor[origem]!;
  PONTO[0] = e.pickups.x[origem]!;
  PONTO[1] = e.pickups.y[origem]!;
  if (cedida >= 0) juntar(e, origem, valor);
  else juntarAlma(e, origem, valor);
  liberarPickup(e, origem);
  PONTO[0] = x;
  PONTO[1] = y;
  s = ocupar(e, tipo, indice);
  return s;
}

/** Fase 7e (decisoes-F-005 §5): pickups em slot crescente, cruzamentos de nível e a oferta. */
export function rodarPickups(e: Estado, dados: DadosDaVigilia): void {
  const t = dados.progressao;
  const p = e.pickups;
  const pos = e.poolDePickups.posicao;
  const jx = e.jogador[JOGADOR.x]!;
  const jy = e.jogador[JOGADOR.y]!;
  const ima2 = t.ima2;
  const coleta2 = t.coleta2;
  const abertura2 = t.abertura2;
  const voo = t.vooPorPasso;
  const pr = e.progresso;
  for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
    if (pos[s]! < 0) continue;
    const x = p.x[s]!;
    const y = p.y[s]!;
    p.xAnt[s] = x;
    p.yAnt[s] = y;
    let dx = jx - x;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = jy - y;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d2 = dx * dx + dy * dy;
    const tp = p.tipo[s]!;
    if (tp === TIPO_DE_PICKUP.cinza || tp === TIPO_DE_PICKUP.alma) {
      if (d2 <= coleta2) {
        const v = p.valor[s]!;
        if (tp === TIPO_DE_PICKUP.cinza) {
          pr[PROGRESSAO.xp] = pr[PROGRESSAO.xp]! + v;
          pr[PROGRESSAO.xpTotal] = pr[PROGRESSAO.xpTotal]! + v;
        } else {
          creditarAlmas(e, v);
        }
        liberarPickup(e, s);
      } else if (d2 <= ima2) {
        const k = voo / Math.sqrt(d2);
        let nx = Math.fround(x + dx * k);
        if (nx < 0) nx = Math.fround(nx + LARGURA_DO_MAPA);
        if (nx >= LARGURA_DO_MAPA) nx = Math.fround(nx - LARGURA_DO_MAPA);
        let ny = Math.fround(y + dy * k);
        if (ny < 0) ny = Math.fround(ny + ALTURA_DO_MAPA);
        if (ny >= ALTURA_DO_MAPA) ny = Math.fround(ny - ALTURA_DO_MAPA);
        p.x[s] = nx;
        p.y[s] = ny;
      }
    } else if (d2 <= abertura2 && pr[PROGRESSAO.bausPorFechar]! < t.filaDeBaus) {
      abrirBau(e, dados, s);
    }
  }
  cruzarNiveis(e, dados);
  gerarOfertaSeFor(e, dados);
}
