// Cálculo do desenho dos ataques dos inimigos, sem Phaser (design/decisoes-F-006.md §8, RE4 a RE8): a 2ª camada de
// médios acima da massa (com o brilho do telegrafo por `tintBlend`), a cunha e a faixa no chão, e o projétil de Sal
// com o anel. Cada função escreve uma SaidaDeSprites que os escritores só copiam, com a posição interpolada da
// horda (já na cópia mais próxima da câmera). Nada é alocado por quadro; as contas dos laços vão em linha, porque um
// double passado a uma função fora de linha vira objeto no V8 (E4 e E6).
import { CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, JOGADOR, JOGADOR3_U8, TIPO_DE_PROJETIL, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { RAIO_DO_JOGADOR } from '../../logica/mundo/jogador';
import { FASE_DO_ATAQUE, TIPO } from '../../logica/mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR } from '../paleta';
import { MOLDURA, RAIO_DA_CUNHA_PT } from './atlas';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';
import type { DesenhoDoTipo, SaidaDaHorda } from './horda';

/** Membros das 3 camadas novas (RE5, RE8): médios (corpo e silhueta do telegrafo, F-011), telegrafos (cunha ou faixa) e projéteis inimigos (anel + disco). */
/** Tint neutro: a arte (F-011) não é tingida. */
const BRANCO = 0xffffff;
export const MEMBROS_DOS_MEDIOS = 2 * CAPACIDADE_DE_INIMIGOS;
export const MEMBROS_DOS_TELEGRAFOS = 64;
export const MEMBROS_DOS_PROJETEIS_INIMIGOS = 128;
/** Cada projétil usa 2 membros (o anel e o disco): 64 projéteis. */
export const MEMBROS_POR_PROJETIL_INIMIGO = 2;

/** Alfa do telegrafo no chão: 0,10 no passo T e 0,40 no último (RE5). */
export const ALFA_DO_TELEGRAFO = { inicial: 0.1, final: 0.4 } as const;
/** Anel do projétil: pulsa entre 0,35 e 0,5 com período de 30 passos (RE6). */
const ALFA_DO_ANEL_DO_PROJETIL = { medio: 0.425, amplitude: 0.075, periodo: 30 } as const;
/** Disco do projétil: 16 pt (a massa de 32 pt a 0,5) e anel de 24 pt (RE6). */
const DIAMETRO_DO_DISCO_PT = 16;
const DIAMETRO_DO_ANEL_PT = 24;
/** Passos do indício da janela de aparo (AP12): a janela normal e a estendida pelo tutorial. */
const INDICIO_NORMAL = 11;
const INDICIO_ESTENDIDO = 17;
/** Aparos falhos seguidos que ligam a janela estendida enquanto o prompt está visível (AP11). */
const FALHAS_DA_JANELA_ESTENDIDA = 2;

const M_QUADRADO = indiceDaMoldura('quadrado');
const M_MASSA = indiceDaMoldura('massa');
const M_CUNHA = indiceDaMoldura('cunha');
const M_ANEL_PEQUENO = indiceDaMoldura('anel_pequeno');
const LARGURA_DO_QUADRADO_PX = MOLDURA.quadrado.largura;
const ALTURA_DA_CUNHA_PX = RAIO_DA_CUNHA_PT * 2;

/**
 * A 2ª camada de médios (RE8), em pares de membros na ordem dos slots: o corpo (membro 2k) e a silhueta branca do
 * telegrafo por cima (2k + 1). O corpo usa o quadro da arte (F-011): o acerto, o telegrafo ("inspirar"), o ataque
 * na recuperação ou o andar, espelhado pela direção (no telegrafo, pela mira). O brilho do telegrafo (RE4) é o
 * `blend` de 1 em T a 0 no último passo, interpolado pelo `alfa`: a silhueta branca tem alfa 1 − blend, e o corpo
 * termina em branco puro. O resto da camada fica invisível. Devolve quantos médios foram escritos.
 */
export function prepararMedios(e: Estado, horda: SaidaDaHorda, tabela: readonly (DesenhoDoTipo | null)[], dados: DadosDaVigilia, alfa: number, out: SaidaDeSprites): number {
  const ini = e.inimigos;
  const c = dados.combate;
  let k = 0;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    const tipo = horda.tipo[s]!;
    if (tipo === 0) continue;
    const d = tabela[tipo];
    if (!d || !d.medio || 2 * k + 1 >= out.capacidade) continue;
    const fase = ini.ataqueFase[s]!;
    let blend = 1;
    if (fase === FASE_DO_ATAQUE.telegrafo) {
      const tel = c.telegrafoPassos[tipo]!;
      // Passos desde T no instante desenhado (T = 0, o último passo do telegrafo = tel − 1).
      let passos = tel - ini.ataqueTimer[s]! - 1 + alfa;
      if (passos < 0) passos = 0;
      if (passos > tel - 1) passos = tel - 1;
      blend = 1 - passos / (tel - 1);
    }
    const acertado = horda.quadro[s] === d.acerto;
    const quadro = acertado ? d.acerto : fase === FASE_DO_ATAQUE.telegrafo ? d.telegrafo : fase === FASE_DO_ATAQUE.recuperacao ? d.ataque : horda.quadro[s]!;
    const espelhar = fase === FASE_DO_ATAQUE.telegrafo ? ini.miraX[s]! < 0 : horda.espelhar[s] === 1;
    const escalaX = espelhar ? -d.escala : d.escala;
    const corpo = 2 * k;
    out.visivel[corpo] = 1;
    out.x[corpo] = horda.x[s]!;
    out.y[corpo] = horda.y[s]!;
    out.rotacao[corpo] = 0;
    out.escalaX[corpo] = escalaX;
    out.escalaY[corpo] = d.escala;
    out.alpha[corpo] = 1;
    out.origemX[corpo] = out.origemY[corpo] = 0.5;
    out.moldura[corpo] = quadro;
    out.cor[corpo] = BRANCO;
    out.blend[corpo] = blend;
    const brilho = corpo + 1;
    if (fase === FASE_DO_ATAQUE.telegrafo && !acertado && blend < 1) {
      out.visivel[brilho] = 1;
      out.x[brilho] = horda.x[s]!;
      out.y[brilho] = horda.y[s]!;
      out.rotacao[brilho] = 0;
      out.escalaX[brilho] = escalaX;
      out.escalaY[brilho] = d.escala;
      out.alpha[brilho] = 1 - blend;
      out.origemX[brilho] = out.origemY[brilho] = 0.5;
      out.moldura[brilho] = d.branco;
      out.cor[brilho] = BRANCO;
      out.blend[brilho] = 1;
    } else {
      out.visivel[brilho] = 0;
    }
    k++;
  }
  for (let r = 2 * k; r < out.capacidade; r++) out.visivel[r] = 0;
  return k;
}

/**
 * Cunha do Oco Grande e faixa da Noviça no chão (RE5): brancas e preenchidas, alfa de 0,10 em T a 0,40 no último
 * passo; a cunha no raio do arco com o vértice no centro do corpo (posição interpolada) e girada para a mira
 * fixada; a faixa de 16 pt por 240 pt do centro dela, na mira. Com o indício da janela de aparo (RE7, AP12), a
 * cunha fica sólida (alfa 1) nos últimos 11 passos antes do golpe (17 com a janela estendida). Devolve os
 * telegrafos que não couberam nos membros (só render).
 */
export function prepararTelegrafos(e: Estado, dados: DadosDaVigilia, horda: SaidaDaHorda, alfa: number, out: SaidaDeSprites): number {
  const ini = e.inimigos;
  const c = dados.combate;
  const u8 = e.jogador3U8;
  const estendida = u8[JOGADOR3_U8.promptAparo] === 1 && u8[JOGADOR3_U8.falhasDeAparo]! >= FALHAS_DA_JANELA_ESTENDIDA;
  const indicio = estendida ? INDICIO_ESTENDIDO : INDICIO_NORMAL;
  let k = 0;
  let excedentes = 0;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (ini.ataqueFase[s] !== FASE_DO_ATAQUE.telegrafo || horda.tipo[s] === 0) continue;
    const tipo = horda.tipo[s]!;
    // Só o telegrafo branco (aparável); o vermelho é da F-008.
    if (c.ataqueAparavel[tipo] !== 1) continue;
    if (k >= out.capacidade) {
      excedentes++;
      continue;
    }
    const tel = c.telegrafoPassos[tipo]!;
    const timer = ini.ataqueTimer[s]!;
    let passos = tel - timer - 1 + alfa;
    if (passos < 0) passos = 0;
    if (passos > tel - 1) passos = tel - 1;
    const mx = ini.miraX[s]!;
    const my = ini.miraY[s]!;
    out.visivel[k] = 1;
    out.x[k] = horda.x[s]!;
    out.y[k] = horda.y[s]!;
    out.rotacao[k] = Math.atan2(my, mx) + Math.PI / 2;
    out.origemX[k] = 0.5;
    out.origemY[k] = 1;
    out.cor[k] = COR.branco;
    const raioDoArco = c.alcanceDoArco[tipo]!;
    if (raioDoArco > 0) {
      out.moldura[k] = M_CUNHA;
      out.escalaX[k] = out.escalaY[k] = raioDoArco / ALTURA_DA_CUNHA_PX;
      out.alpha[k] = timer <= indicio ? 1 : ALFA_DO_TELEGRAFO.inicial + ((ALFA_DO_TELEGRAFO.final - ALFA_DO_TELEGRAFO.inicial) * passos) / (tel - 1);
    } else {
      out.moldura[k] = M_QUADRADO;
      out.escalaX[k] = (2 * c.projetilRaio[tipo]!) / LARGURA_DO_QUADRADO_PX;
      out.escalaY[k] = (c.projetilVida[tipo]! * c.projetilPorPasso[tipo]!) / LARGURA_DO_QUADRADO_PX;
      out.alpha[k] = ALFA_DO_TELEGRAFO.inicial + ((ALFA_DO_TELEGRAFO.final - ALFA_DO_TELEGRAFO.inicial) * passos) / (tel - 1);
    }
    k++;
  }
  for (let r = k; r < out.capacidade; r++) {
    if (out.visivel[r] === 0) break;
    out.visivel[r] = 0;
  }
  return excedentes;
}

/**
 * Projétil de Sal da Noviça (RE6) e o indício da janela de aparo (RE7): para cada projétil tipo 2 em voo, o anel
 * (membro 2n) e o disco branco (membro 2n + 1). O disco é de 16 pt; o anel de 24 pt pulsa entre 0,5 e 0,35 com
 * período de 30 passos (`CAB.passo` mod 30) e vira sólido (alfa 1) quando o impacto previsto está a até 11 passos
 * (17 com a janela estendida), pelo mesmo teste de trajetória da AP5: a linha pega o jogador e a distância ao longo
 * do voo cabe em `n × v + raio do projétil + hitbox do jogador`. Devolve os projéteis que não couberam.
 */
export function prepararProjeteisInimigos(e: Estado, dados: DadosDaVigilia, alfa: number, camX: number, camY: number, out: SaidaDeSprites): number {
  const c = dados.combate;
  const p = e.projeteis;
  const vivo = e.poolDeProjeteis.posicao;
  const novica = TIPO.novica_de_sal; // o único que atira (NV1); o dado do projétil é o dele
  const u8 = e.jogador3U8;
  const estendida = u8[JOGADOR3_U8.promptAparo] === 1 && u8[JOGADOR3_U8.falhasDeAparo]! >= FALHAS_DA_JANELA_ESTENDIDA;
  const raio = c.projetilRaio[novica]!;
  const v = c.projetilPorPasso[novica]!;
  const limite = raio + RAIO_DO_JOGADOR;
  const passosDoIndicio = estendida ? INDICIO_ESTENDIDO : INDICIO_NORMAL;
  const alcance = passosDoIndicio * v + limite;
  const alcance2 = alcance * alcance;
  const limite2 = limite * limite;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const pulso = ALFA_DO_ANEL_DO_PROJETIL.medio + ALFA_DO_ANEL_DO_PROJETIL.amplitude * Math.cos((2 * Math.PI * (e.cab[CAB.passo]! % ALFA_DO_ANEL_DO_PROJETIL.periodo)) / ALFA_DO_ANEL_DO_PROJETIL.periodo);
  const escalaDoDisco = DIAMETRO_DO_DISCO_PT / MOLDURA.massa.largura;
  const escalaDoAnel = DIAMETRO_DO_ANEL_PT / MOLDURA.anel_pequeno.largura;
  let n = 0;
  let excedentes = 0;
  for (let s = 0; s < CAPACIDADE_DE_PROJETEIS; s++) {
    if (vivo[s]! < 0 || p.tipo[s] !== TIPO_DE_PROJETIL.sal) continue;
    if ((n + 1) * MEMBROS_POR_PROJETIL_INIMIGO > out.capacidade) {
      excedentes++;
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
    const cx = camX + mx - MEIA_LARGURA_DO_MAPA;
    const cy = camY + my - MEIA_ALTURA_DO_MAPA;
    // Teste de trajetória da AP5 no estado atual: o jogador relativo ao projétil.
    let rx = jx - p.x[s]!;
    if (rx > MEIA_LARGURA_DO_MAPA) rx -= LARGURA_DO_MAPA;
    if (rx < -MEIA_LARGURA_DO_MAPA) rx += LARGURA_DO_MAPA;
    let ry = jy - p.y[s]!;
    if (ry > MEIA_ALTURA_DO_MAPA) ry -= ALTURA_DO_MAPA;
    if (ry < -MEIA_ALTURA_DO_MAPA) ry += ALTURA_DO_MAPA;
    const vx = p.vx[s]!;
    const vy = p.vy[s]!;
    const vv = vx * vx + vy * vy;
    const pp = rx * vx + ry * vy;
    const cr = rx * vy - ry * vx;
    const solido = pp > 0 && cr * cr <= limite2 * vv && pp * pp <= alcance2 * vv;
    const a = n * MEMBROS_POR_PROJETIL_INIMIGO;
    out.visivel[a] = 1;
    out.x[a] = cx;
    out.y[a] = cy;
    out.rotacao[a] = 0;
    out.escalaX[a] = out.escalaY[a] = escalaDoAnel;
    out.alpha[a] = solido ? 1 : pulso;
    out.origemX[a] = out.origemY[a] = 0.5;
    out.moldura[a] = M_ANEL_PEQUENO;
    out.cor[a] = COR.branco;
    const b = a + 1;
    out.visivel[b] = 1;
    out.x[b] = cx;
    out.y[b] = cy;
    out.rotacao[b] = 0;
    out.escalaX[b] = out.escalaY[b] = escalaDoDisco;
    out.alpha[b] = 1;
    out.origemX[b] = out.origemY[b] = 0.5;
    out.moldura[b] = M_MASSA;
    out.cor[b] = COR.branco;
    n++;
  }
  for (let r = n * MEMBROS_POR_PROJETIL_INIMIGO; r < out.capacidade; r++) {
    if (out.visivel[r] === 0) break;
    out.visivel[r] = 0;
  }
  return excedentes;
}
