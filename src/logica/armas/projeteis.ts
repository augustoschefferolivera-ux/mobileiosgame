// Projéteis do jogador (design/decisoes-F-004.md W9 a W13 e §4): a salva das
// armas de arquétipo "mais próximo" (Facas) e o voo, o acerto e a perfuração
// dos projéteis em voo. A salva grava direto nos campos do pool; o voo e o
// acerto ficam em linha, sem double atravessando chamada.
import { CAPACIDADE_DE_PROJETEIS, JOGADOR, JOGADOR3_U8, MUNDO, PERFURACAO_INFINITA, TIPO_DE_PROJETIL, type Estado } from '../nucleo/estado';
import { FORMA, SEM_ALVO } from '../nucleo/eventos';
import { alocar, liberar, quantosAtivos } from '../nucleo/pool';
import type { DadosDaVigilia } from '../mundo/dados';
import { CONSULTA, consultarGradeDoRascunho } from '../mundo/grade';
import { grade } from '../mundo/horda';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { ACERTO, ACHADOS, DANO, acertar, alvoAparado, calcularDano } from './acerto';
import { indiceDoNivel } from './tabela';
import { limiteDeProjeteis, projeteisEEfeitos } from './ondas';

const NP = CAPACIDADE_DE_PROJETEIS;
/** Candidatos de uma salva no máximo: 5 facas no nv8 + 1 da esquiva perfeita (F-006). */
export const MAX_CANDIDATOS = 6;
const CAND_SLOT = new Int32Array(MAX_CANDIDATOS);
const CAND_D2 = new Float64Array(MAX_CANDIDATOS);


/**
 * Salva (W9 a W13): se a recarga venceu e há candidatos com o centro no
 * alcance, as facas saem, a k-ésima para o candidato k mod M, em paralelo e
 * deslocadas na perpendicular; sem candidato, a recarga espera em 0.
 */
export function rodarMaisProximo(e: Estado, dados: DadosDaVigilia, v: number): void {
  const b = e.build;
  let r = b.recarga[v]!;
  if (r > 0) b.recarga[v] = --r;
  if (r !== 0) return;
  if (salvaDeFacas(e, dados, v, 0) === 1) b.recarga[v] = dados.armas.periodo[b.codigo[v]!]!;
}

/**
 * A salva da vaga `v`; devolve 1 se havia candidato (a recarga natural recomeça), senão 0.
 * No Contra-ataque (`contra` = 1, CA3) o único candidato é o aparado vivo, onde estiver, e
 * o dano gravado no disparo leva o fator; sem aparado válido vale o mais próximo normal.
 */
export function salvaDeFacas(e: Estado, dados: DadosDaVigilia, v: number, contra: number): number {
  const b = e.build;
  const t = dados.armas;
  const codigo = b.codigo[v]!;
  const i = indiceDoNivel(codigo, b.nivel[v]!);
  // A faca extra da esquiva perfeita (EP4) entra em `nf` e só é consumida se alguma faca de fato sair.
  const extra = e.jogador3U8[JOGADOR3_U8.facaExtra]!;
  const nf = t.projeteis[i]! + extra;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const alcance = t.alcanceBusca[codigo]!;
  const aparado = contra === 1 ? alvoAparado(e) : -1;
  let m = 0;
  if (aparado < 0) {
    CONSULTA[0] = jx;
    CONSULTA[1] = jy;
    CONSULTA[2] = alcance;
    m = consultarGradeDoRascunho(grade, e.inimigos.x, e.inimigos.y, ACHADOS);
  }
  // Os nf menores por (d², slot), por seleção parcial, sem ordenar nem alocar.
  const ini = e.inimigos;
  const limite = nf < MAX_CANDIDATOS ? nf : MAX_CANDIDATOS;
  let M = 0;
  if (aparado >= 0) {
    CAND_SLOT[0] = aparado;
    M = 1;
  }
  for (let k = 0; k < m; k++) {
    const s = ACHADOS[k]!;
    if (ini.hp[s]! <= 0) continue;
    let dx = ini.x[s]! - jx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - jy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d2 = dx * dx + dy * dy;
    // Posição de inserção na lista ordenada.
    let q = M;
    while (q > 0 && (CAND_D2[q - 1]! > d2 || (CAND_D2[q - 1] === d2 && CAND_SLOT[q - 1]! > s))) q--;
    if (q >= limite) continue;
    const fim = M < limite ? M : limite - 1;
    for (let z = fim; z > q; z--) {
      CAND_D2[z] = CAND_D2[z - 1]!;
      CAND_SLOT[z] = CAND_SLOT[z - 1]!;
    }
    CAND_D2[q] = d2;
    CAND_SLOT[q] = s;
    if (M < limite) M++;
  }
  if (M === 0) return 0;
  calcularDano(e, v, i);
  const dano = Math.fround(contra === 1 ? DANO[v]! * dados.combate.contraFator : DANO[v]!);
  const vel = t.velocidade[i]!;
  const vida = t.vida[i]!;
  const perf = t.perfuracoes[i]!;
  const salPct = t.salPct[i]!;
  const salPassos = t.salPassos[i]!;
  const esp = t.espacamento[codigo]!;
  const pr = e.projeteis;
  const pool = e.poolDeProjeteis;
  const limiteLogico = limiteDeProjeteis(e);
  let criadas = 0;
  const porAlvo = Math.floor(nf / M);
  const sobra = nf % M;
  for (let k = 0; k < nf; k++) {
    const alvo = k % M;
    const s = CAND_SLOT[alvo]!;
    const mAlvo = porAlvo + (alvo < sobra ? 1 : 0);
    const indice = Math.floor(k / M);
    let ux = ini.x[s]! - jx;
    if (ux > MEIA_LARGURA_DO_MAPA) ux -= LARGURA_DO_MAPA;
    if (ux < -MEIA_LARGURA_DO_MAPA) ux += LARGURA_DO_MAPA;
    let uy = ini.y[s]! - jy;
    if (uy > MEIA_ALTURA_DO_MAPA) uy -= ALTURA_DO_MAPA;
    if (uy < -MEIA_ALTURA_DO_MAPA) uy += ALTURA_DO_MAPA;
    const d = Math.sqrt(ux * ux + uy * uy);
    if (d > 0) {
      ux /= d;
      uy /= d;
    } else {
      ux = j[JOGADOR.dirX]!;
      uy = j[JOGADOR.dirY]!;
    }
    if (projeteisEEfeitos(e) >= limiteLogico) {
      e.mundo[MUNDO.projeteisRecusados] = e.mundo[MUNDO.projeteisRecusados]! + 1;
      continue;
    }
    const p = alocar(pool);
    if (p < 0) {
      e.mundo[MUNDO.projeteisRecusados] = e.mundo[MUNDO.projeteisRecusados]! + 1;
      continue;
    }
    const desvio = (indice - (mAlvo - 1) / 2) * esp;
    let xf = Math.fround(jx - uy * desvio);
    if (xf < 0) xf = Math.fround(xf + LARGURA_DO_MAPA);
    if (xf >= LARGURA_DO_MAPA) xf = Math.fround(xf - LARGURA_DO_MAPA);
    let yf = Math.fround(jy + ux * desvio);
    if (yf < 0) yf = Math.fround(yf + ALTURA_DO_MAPA);
    if (yf >= ALTURA_DO_MAPA) yf = Math.fround(yf - ALTURA_DO_MAPA);
    pr.x[p] = pr.xAnt[p] = xf;
    pr.y[p] = pr.yAnt[p] = yf;
    pr.vx[p] = ux * vel;
    pr.vy[p] = uy * vel;
    pr.dano[p] = dano;
    pr.ultimoAlvo[p] = SEM_ALVO;
    pr.vida[p] = vida;
    pr.tipo[p] = TIPO_DE_PROJETIL.faca;
    pr.arma[p] = codigo;
    pr.perfuracoes[p] = perf;
    pr.salPct[p] = salPct;
    pr.salPassos[p] = salPassos;
    criadas = 1;
  }
  if (criadas === 1) e.jogador3U8[JOGADOR3_U8.facaExtra] = 0;
  return 1;
}

/** Libera o slot do projétil e zera todos os campos (o hash só vê os vivos). */
export function liberarProjetil(e: Estado, p: number): void {
  liberar(e.poolDeProjeteis, p);
  const pr = e.projeteis;
  pr.x[p] = pr.y[p] = pr.xAnt[p] = pr.yAnt[p] = pr.vx[p] = pr.vy[p] = pr.dano[p] = 0;
  pr.ultimoAlvo[p] = 0;
  pr.vida[p] = 0;
  pr.tipo[p] = pr.arma[p] = pr.perfuracoes[p] = pr.salPct[p] = pr.salPassos[p] = 0;
  pr.donoSlot[p] = pr.donoGeracao[p] = 0;
}

/**
 * 7b: cada projétil anda em linha reta, acerta no máximo 1 inimigo por passo
 * (o vivo de menor d² pelo centro entre os que a hitbox toca, empate pelo
 * menor slot, nunca o último acertado), perde a vida e some ao esgotá-la ou
 * ao gastar a perfuração (W9, W12).
 */
export function moverProjeteis(e: Estado, dados: DadosDaVigilia): void {
  const pos = e.poolDeProjeteis.posicao;
  if (quantosAtivos(e.poolDeProjeteis) === 0) return;
  const pr = e.projeteis;
  const ini = e.inimigos;
  const raio = dados.tipos.raio;
  const rMax = dados.tipos.raioMaximo;
  const geracao = e.pool.geracao;
  for (let p = 0; p < NP; p++) {
    // O projétil de Sal dos inimigos (tipo 2) é da fase 6: nenhuma arma o acerta (NV5, NV6).
    if (pos[p]! < 0 || pr.tipo[p] === TIPO_DE_PROJETIL.sal) continue;
    const x0 = pr.x[p]!;
    const y0 = pr.y[p]!;
    pr.xAnt[p] = x0;
    pr.yAnt[p] = y0;
    let xf = Math.fround(x0 + pr.vx[p]!);
    if (xf < 0) xf = Math.fround(xf + LARGURA_DO_MAPA);
    if (xf >= LARGURA_DO_MAPA) xf = Math.fround(xf - LARGURA_DO_MAPA);
    let yf = Math.fround(y0 + pr.vy[p]!);
    if (yf < 0) yf = Math.fround(yf + ALTURA_DO_MAPA);
    if (yf >= ALTURA_DO_MAPA) yf = Math.fround(yf - ALTURA_DO_MAPA);
    pr.x[p] = xf;
    pr.y[p] = yf;
    const arma = pr.arma[p]!;
    const rp = dados.armas.raioProjetil[arma]!;
    CONSULTA[0] = xf;
    CONSULTA[1] = yf;
    CONSULTA[2] = rp + rMax;
    const m = consultarGradeDoRascunho(grade, ini.x, ini.y, ACHADOS);
    const ultimo = pr.ultimoAlvo[p]!;
    let melhor = -1;
    let melhorD2 = 0;
    for (let k = 0; k < m; k++) {
      const s = ACHADOS[k]!;
      if (ini.hp[s]! <= 0) continue;
      // O handle em linha: geração × 65.536 + slot (pool.handleDe), que pode passar de 2³⁰.
      if (geracao[s]! * 0x10000 + s === ultimo) continue;
      let dx = ini.x[s]! - xf;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = ini.y[s]! - yf;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const d2 = dx * dx + dy * dy;
      const lim = rp + raio[ini.tipo[s]!]!;
      if (d2 > lim * lim) continue;
      if (melhor < 0 || d2 < melhorD2 || (d2 === melhorD2 && s < melhor)) {
        melhor = s;
        melhorD2 = d2;
      }
    }
    if (melhor >= 0) {
      ACERTO[0] = pr.dano[p]!;
      // Lido no acerto, pelo alvo de agora (PQ7); as Facas têm o mesmo fator em todo nível.
      ACERTO[1] = dados.armas.pqFator[indiceDoNivel(arma, 1)]!;
      acertar(e, melhor, arma, FORMA.faca, pr.salPct[p]!, pr.salPassos[p]!);
      const perf = pr.perfuracoes[p]!;
      if (perf === 0) {
        liberarProjetil(e, p);
        continue;
      }
      if (perf !== PERFURACAO_INFINITA) pr.perfuracoes[p] = perf - 1;
      pr.ultimoAlvo[p] = geracao[melhor]! * 0x10000 + melhor;
    }
    const vida = pr.vida[p]! - 1;
    if (vida <= 0) liberarProjetil(e, p);
    else pr.vida[p] = vida;
  }
}
