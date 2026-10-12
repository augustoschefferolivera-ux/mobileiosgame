// Ondas de chão da União (design/decisoes-F-005.md §4, U3 a U5): uma por golpe
// de arma com `onda`, criada dentro do golpe (depois do evento `golpe`) na
// origem e na mira do passo; fica no chão. Na fase 7b' do passo seguinte em
// diante, em slot crescente: idade + 1; passada a vida (15), sai; senão o
// centro está a d(t) = px por 60 × t / 60 da origem, e todo inimigo vivo cuja
// hitbox toca o quadrado de 2 × meia (32 × 32 px), ainda não marcado no
// bitset da onda, leva o dano fixado na criação. Pool de 64 (ADR-0002 §4) que
// soma no limite de 200/400 com os projéteis; cheio, a onda é recusada.
// Nenhum double atravessa chamada: o centro, a normalização e o teste vão em
// linha; o dano passa por ACERTO.
import { CAB, CAPACIDADE_DE_EFEITOS, JOGADOR, JOGADOR3_U8, MUNDO2, PALAVRAS_DO_BITSET, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, FORMA, gravarEvento } from '../nucleo/eventos';
import { alocar, liberar, quantosAtivos } from '../nucleo/pool';
import type { DadosDaVigilia } from '../mundo/dados';
import { CONSULTA, consultarGradeComGrandes } from '../mundo/grade';
import { GEO, retanguloToca } from '../mundo/caixa';
import { acertarNoChefe } from '../mundo/chefe';
import { grade } from '../mundo/horda';
import { TIPO } from '../mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { ACERTO, ACHADOS, MIRA, acertar } from './acerto';
import { indiceDoNivel } from './tabela';

/** Limite lógico somado de projéteis e efeitos de chão (B §3.13): 200 com TETO 300, 400 com TETO 500. */
export function limiteDeProjeteis(e: Estado): number {
  return e.cab[CAB.teto] === 500 ? 400 : 200;
}

/** Projéteis e efeitos de chão vivos, contra o limite somado (U5). */
export function projeteisEEfeitos(e: Estado): number {
  return quantosAtivos(e.poolDeProjeteis) + quantosAtivos(e.poolDeEfeitos);
}

/** Libera a onda e zera os campos e o bitset (o hash só vê as vivas). */
export function liberarOnda(e: Estado, o: number): void {
  liberar(e.poolDeEfeitos, o);
  const f = e.efeitos;
  f.x[o] = f.y[o] = f.dirX[o] = f.dirY[o] = f.dano[o] = 0;
  f.idade[o] = 0;
  f.arma[o] = 0;
  f.bits.fill(0, o * PALAVRAS_DO_BITSET, (o + 1) * PALAVRAS_DO_BITSET);
}

/** Tira a marca do slot de inimigo em todas as ondas vivas (removerInimigo: o slot pode ser reaproveitado). */
export function desmarcarInimigo(e: Estado, s: number): void {
  const pos = e.poolDeEfeitos.posicao;
  const bits = e.efeitos.bits;
  const palavra = s >> 5;
  const mascara = ~(1 << (s & 31));
  for (let o = 0; o < CAPACIDADE_DE_EFEITOS; o++) if (pos[o]! >= 0) bits[o * PALAVRAS_DO_BITSET + palavra] = bits[o * PALAVRAS_DO_BITSET + palavra]! & mascara;
}

/**
 * Cria a onda do golpe da arma `codigo` (U3): na posição do jogador e na mira dele; recusa no limite.
 * No Contra-ataque (`fatorContra` > 0, CA2) a mira é a que `golpear` deixou em MIRA e o dano fixado leva esse fator (×2).
 */
export function criarOnda(e: Estado, codigo: number, fatorContra = 0): void {
  if (projeteisEEfeitos(e) >= limiteDeProjeteis(e)) {
    e.mundo2[MUNDO2.efeitosRecusados] = e.mundo2[MUNDO2.efeitosRecusados]! + 1;
    return;
  }
  const o = alocar(e.poolDeEfeitos);
  if (o < 0) {
    e.mundo2[MUNDO2.efeitosRecusados] = e.mundo2[MUNDO2.efeitosRecusados]! + 1;
    return;
  }
  // Cada valor é lido uma vez (todos já são Float32): a função é fria (um golpe por vez) e, no interpretador,
  // cada leitura de Float32Array vira um HeapNumber; lido 2 vezes, eram 9 por onda (≈ 10 B/passo na E6).
  const j = e.jogador;
  const f = e.efeitos;
  const x = j[JOGADOR.x]!;
  const y = j[JOGADOR.y]!;
  const dx = fatorContra > 0 ? MIRA[0]! : j[JOGADOR.dirX]!;
  const dy = fatorContra > 0 ? MIRA[1]! : j[JOGADOR.dirY]!;
  f.x[o] = x;
  f.y[o] = y;
  f.dirX[o] = dx;
  f.dirY[o] = dy;
  const danoOnda = e.jogador3U8[JOGADOR3_U8.poderPassos]! > 0 ? e.derivados.danoOndaPoder[codigo]! : e.derivados.danoOnda[codigo]!;
  f.dano[o] = fatorContra > 0 ? danoOnda * fatorContra : danoOnda;
  f.idade[o] = 0;
  f.arma[o] = codigo;
  f.bits.fill(0, o * PALAVRAS_DO_BITSET, (o + 1) * PALAVRAS_DO_BITSET);
  FLOATS_DO_EVENTO[0] = x;
  FLOATS_DO_EVENTO[1] = y;
  FLOATS_DO_EVENTO[2] = dx;
  FLOATS_DO_EVENTO[3] = dy;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.onda, codigo, FORMA.onda, o, e.poolDeEfeitos.geracao[o]!, 0, 0, 0);
}

/** Fase 7b' (U5): as ondas vivas em slot crescente. */
export function rodarOndas(e: Estado, dados: DadosDaVigilia): void {
  const pos = e.poolDeEfeitos.posicao;
  const f = e.efeitos;
  const t = dados.armas;
  const ini = e.inimigos;
  const raio = dados.tipos.raio;
  const rMax = dados.tipos.raioMaximo;
  for (let o = 0; o < CAPACIDADE_DE_EFEITOS; o++) {
    if (pos[o]! < 0) continue;
    const codigo = f.arma[o]!;
    const idade = f.idade[o]! + 1;
    if (idade > t.ondaVida[codigo]!) {
      liberarOnda(e, o);
      continue;
    }
    f.idade[o] = idade;
    const ux = f.dirX[o]!;
    const uy = f.dirY[o]!;
    // Distância em inteiros e uma divisão: 6,4 × t em double erra 1 ulp em 5 dos 15 passos (U3).
    const d = (t.ondaPxPor60[codigo]! * idade) / 60;
    let cx = f.x[o]! + ux * d;
    if (cx < 0) cx += LARGURA_DO_MAPA;
    if (cx >= LARGURA_DO_MAPA) cx -= LARGURA_DO_MAPA;
    let cy = f.y[o]! + uy * d;
    if (cy < 0) cy += ALTURA_DO_MAPA;
    if (cy >= ALTURA_DO_MAPA) cy -= ALTURA_DO_MAPA;
    const meia = t.ondaMeia[codigo]!;
    CONSULTA[0] = cx;
    CONSULTA[1] = cy;
    CONSULTA[2] = Math.SQRT2 * meia + rMax;
    const m = consultarGradeComGrandes(grade, ini.x, ini.y, ACHADOS);
    ACERTO[0] = f.dano[o]!;
    // A onda herda o fator da arma (a União tem um só nível; PQ7).
    ACERTO[1] = t.pqFator[indiceDoNivel(codigo, 1)]!;
    const base = o * PALAVRAS_DO_BITSET;
    for (let k = 0; k < m; k++) {
      const s = ACHADOS[k]!;
      if (ini.hp[s]! <= 0) continue;
      const palavra = base + (s >> 5);
      const bit = 1 << (s & 31);
      if ((f.bits[palavra]! & bit) !== 0) continue;
      let px = ini.x[s]! - cx;
      if (px > MEIA_LARGURA_DO_MAPA) px -= LARGURA_DO_MAPA;
      if (px < -MEIA_LARGURA_DO_MAPA) px += LARGURA_DO_MAPA;
      let py = ini.y[s]! - cy;
      if (py > MEIA_ALTURA_DO_MAPA) py -= ALTURA_DO_MAPA;
      if (py < -MEIA_ALTURA_DO_MAPA) py += ALTURA_DO_MAPA;
      if (ini.tipo[s] === TIPO.o_lanterneiro) {
        // A caixa do Lanterneiro (F-009 GE): algum dos 6 pontos no quadrado da onda.
        GEO[0] = -px;
        GEO[1] = -py;
        GEO[2] = ux;
        GEO[3] = uy;
        GEO[4] = 2 * meia;
        GEO[5] = meia;
        GEO[6] = -meia;
        if (!retanguloToca()) continue;
        f.bits[palavra] = f.bits[palavra]! | bit;
        acertarNoChefe(e, dados, s, codigo, FORMA.onda, 0);
        continue;
      }
      // Círculo × quadrado exato em coordenadas locais (o teste da estocada, W8).
      const a = px * ux + py * uy;
      const b = px * -uy + py * ux;
      const ca = a < -meia ? -meia : a > meia ? meia : a;
      const cb = b < -meia ? -meia : b > meia ? meia : b;
      const da = a - ca;
      const db = b - cb;
      const r = raio[ini.tipo[s]!]!;
      if (da * da + db * db > r * r) continue;
      f.bits[palavra] = f.bits[palavra]! | bit;
      acertar(e, s, codigo, FORMA.onda, 0, 0);
    }
  }
}
