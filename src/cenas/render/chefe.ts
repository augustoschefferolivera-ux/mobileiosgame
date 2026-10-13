// Cálculo do desenho dos ataques do Lanterneiro, sem Phaser (design/decisoes-F-009.md §3, HD1): os telegrafos brancos (Vara, Bater a Vara e
// Agarrar, aparáveis) e vermelhos (Luz Cega, Explosão de Luz e as zonas da Lanterna) em formas simples do atlas, tingidas; a arte é da
// F-011. Uma SaidaDeSprites que o escritor só copia, com a posição interpolada da horda (já na cópia do toro mais próxima da câmera) e as
// zonas na cópia mais próxima. Nada é alocado por quadro e as contas vão em linha (ADR-0005 §2).
import { CHEFE_U16, JOGADOR3_U8, SEM_CHEFE, type Estado } from '../../logica/nucleo/estado';
import { CHEFE_F32 } from '../../logica/nucleo/estado';
import { ATAQUE_DO_CHEFE, type DadosDaVigilia } from '../../logica/mundo/dados';
import { FASE_DO_ATAQUE } from '../../logica/mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { RAIO_DO_JOGADOR } from '../../logica/mundo/jogador';
import { RAIO_DO_SETOR } from '../../arte/catalogo';
import { COR } from '../paleta';
import { MOLDURA } from './atlas';
import { ORIGEM_X, ORIGEM_Y } from './arte';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';
import type { SaidaDaHorda } from './horda';

/** Membros da camada: o golpe em curso (até 2) e as 3 zonas da Lanterna (2 cada). */
export const MEMBROS_DO_CHEFE = 8;
const M_QUADRADO = indiceDaMoldura('quadrado');
const M_TRIANGULO = indiceDaMoldura('triangulo');
const M_DISCO = indiceDaMoldura('disco');
const M_ANEL = indiceDaMoldura('anel');
const M_SETOR = [0, 1, 2, 3].map((k) => indiceDaMoldura(`setor_${k}`));
const LARGURA_DO_DISCO_PX = MOLDURA.disco.largura;
const LARGURA_DO_QUADRADO_PX = MOLDURA.quadrado.largura;
const LARGURA_DO_TRIANGULO_PX = MOLDURA.triangulo.largura;
const A = ATAQUE_DO_CHEFE;
/** Alfa do telegrafo: 0,10 no passo T e 0,40 no último (como o dos médios, RE5). */
const ALFA = { inicial: 0.1, final: 0.4 } as const;
/** Os brancos ficam sólidos nos últimos passos (AP12): a janela do aparo normal e a estendida pelo tutorial. */
const INDICIO_NORMAL = 11;
const INDICIO_ESTENDIDO = 17;
const FALHAS_DA_JANELA_ESTENDIDA = 2;
/** Alcances da D9 §3 (o mesmo literal de `pegaOJogador`): a forma do golpe, mais a folga do corpo do jogador. */
const ALCANCE_DA_VARA = 128 + RAIO_DO_JOGADOR;
const ALCANCE_DA_LINHA = 192 + RAIO_DO_JOGADOR;
const MEIA_LARGURA_DA_LINHA = 24 + RAIO_DO_JOGADOR;
const ALCANCE_DO_CONE = 192 + RAIO_DO_JOGADOR;
/** Metade da abertura do cone da Luz Cega: tg 30°. */
const TG_DO_CONE = 0.5773502691896257;
/** 22,5° em rad: o passo das 16 direções da arte. */
const PASSO_DA_DIRECAO = Math.PI / 8;

/** Rascunho dos helpers (ADR-0005 §2: um double não atravessa chamada): [0] x, [1] y, [2] raio ou mira x, [3] alfa ou mira y, [4] desvio, [5] alfa do setor. */
const R = new Float64Array(6);

/** Escreve o membro `m` como um disco ou anel (`moldura`, `cor`) de raio R[2] em (R[0], R[1]) com o alfa R[3]. */
function circulo(out: SaidaDeSprites, m: number, moldura: number, cor: number): void {
  out.visivel[m] = 1;
  out.x[m] = R[0]!;
  out.y[m] = R[1]!;
  out.rotacao[m] = 0;
  out.origemX[m] = out.origemY[m] = 0.5;
  out.escalaX[m] = out.escalaY[m] = (2 * R[2]!) / LARGURA_DO_DISCO_PX;
  out.moldura[m] = moldura;
  out.cor[m] = cor;
  out.alpha[m] = R[3]!;
  out.blend[m] = 1;
}

/** Meio setor de 120° do semicírculo da Vara: em (R[0], R[1]), a mira (R[2], R[3]) girada de R[4] rad, com o alfa R[5]. */
function setor(out: SaidaDeSprites, m: number): void {
  // O ângulo de tela (0 = para cima) em 16 passos de 22,5°: o desenho (0 a 3) e o giro de k × 90° (como `direcao16`, em linha).
  let k = Math.round((Math.atan2(R[3]!, R[2]!) + Math.PI / 2 + R[4]!) / PASSO_DA_DIRECAO) % 16;
  if (k < 0) k += 16;
  const q = M_SETOR[k & 3]!;
  out.visivel[m] = 1;
  out.x[m] = R[0]!;
  out.y[m] = R[1]!;
  out.rotacao[m] = (k >> 2) * (Math.PI / 2);
  out.origemX[m] = ORIGEM_X[q]!;
  out.origemY[m] = ORIGEM_Y[q]!;
  out.escalaX[m] = out.escalaY[m] = ALCANCE_DA_VARA / RAIO_DO_SETOR;
  out.moldura[m] = q;
  out.cor[m] = COR.branco;
  out.alpha[m] = R[5]!;
  out.blend[m] = 1;
}

/**
 * Escreve a camada do chefe: o golpe em telegrafo (a Vara em dois setores de 120° a ±30° da mira, que cobrem o semicírculo; o Bater a Vara
 * em retângulo; a Luz Cega em triângulo de 60°; a Explosão em anel que cresce; o Agarrar em disco) e as 3 zonas da Lanterna (disco que
 * enche no telegrafo e fica fixo depois, com o anel). Branco é o aparável e vermelho o que se esquiva. Devolve quantos membros usou.
 */
export function prepararChefe(e: Estado, dados: DadosDaVigilia, horda: SaidaDaHorda, alfa: number, camX: number, camY: number, out: SaidaDeSprites): number {
  for (let m = 0; m < out.capacidade; m++) out.visivel[m] = 0;
  const s = e.chefeU16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE || horda.tipo[s] === 0) return 0;
  const ini = e.inimigos;
  const c = dados.chefe;
  let n = 0;
  const id = ini.ataqueId[s]!;
  if (ini.ataqueFase[s] === FASE_DO_ATAQUE.telegrafo && id !== A.convocar && id !== A.lanterna) {
    const tel = c.telegrafo[id]!;
    const timer = ini.ataqueTimer[s]!;
    let passos = tel - timer - 1 + alfa;
    if (passos < 0) passos = 0;
    if (passos > tel - 1) passos = tel - 1;
    const enche = ALFA.inicial + ((ALFA.final - ALFA.inicial) * passos) / (tel - 1);
    const x = horda.x[s]!;
    const y = horda.y[s]!;
    const mx = e.chefeF32[CHEFE_F32.miraX]!;
    const my = e.chefeF32[CHEFE_F32.miraY]!;
    const u8 = e.jogador3U8;
    const estendida = u8[JOGADOR3_U8.promptAparo] === 1 && u8[JOGADOR3_U8.falhasDeAparo]! >= FALHAS_DA_JANELA_ESTENDIDA;
    const aparavel = c.aparavel[id] === 1;
    const a = aparavel && timer <= (estendida ? INDICIO_ESTENDIDO : INDICIO_NORMAL) ? 1 : enche;
    if (id === A.vara) {
      R[0] = x;
      R[1] = y;
      R[2] = mx;
      R[3] = my;
      R[5] = a;
      R[4] = -Math.PI / 6;
      setor(out, n++);
      R[4] = Math.PI / 6;
      setor(out, n++);
    } else if (id === A.bater) {
      out.visivel[n] = 1;
      out.x[n] = x;
      out.y[n] = y;
      out.rotacao[n] = Math.atan2(my, mx) + Math.PI / 2;
      out.origemX[n] = 0.5;
      out.origemY[n] = 1;
      out.escalaX[n] = (2 * MEIA_LARGURA_DA_LINHA) / LARGURA_DO_QUADRADO_PX;
      out.escalaY[n] = ALCANCE_DA_LINHA / LARGURA_DO_QUADRADO_PX;
      out.moldura[n] = M_QUADRADO;
      out.cor[n] = COR.branco;
      out.alpha[n] = a;
      out.blend[n] = 1;
      n++;
    } else if (id === A.luzCega) {
      // O triângulo de ponta no chefe: a ponta é o topo da moldura, então a origem fica em cima e o giro leva o "para baixo" à mira.
      out.visivel[n] = 1;
      out.x[n] = x;
      out.y[n] = y;
      out.rotacao[n] = Math.atan2(-mx, my);
      out.origemX[n] = 0.5;
      out.origemY[n] = 0;
      out.escalaX[n] = (2 * ALCANCE_DO_CONE * TG_DO_CONE) / LARGURA_DO_TRIANGULO_PX;
      out.escalaY[n] = ALCANCE_DO_CONE / LARGURA_DO_TRIANGULO_PX;
      out.moldura[n] = M_TRIANGULO;
      out.cor[n] = COR.cinzaVermelha;
      out.alpha[n] = a;
      out.blend[n] = 1;
      n++;
    } else if (id === A.explosao) {
      // O anel cresce do raio inicial ao final durante o telegrafo (AT5) e o disco fraco marca por dentro.
      const raio = c.explosaoRaioIni + ((c.explosaoRaioFim - c.explosaoRaioIni) * passos) / (tel - 1);
      R[0] = x;
      R[1] = y;
      R[2] = raio;
      R[3] = enche * 0.5;
      circulo(out, n++, M_DISCO, COR.cinzaVermelha);
      R[3] = enche + 0.4;
      circulo(out, n++, M_ANEL, COR.cinzaVermelha);
    } else if (id === A.agarrar) {
      R[0] = x;
      R[1] = y;
      R[2] = c.agarrarAlcance + RAIO_DO_JOGADOR;
      R[3] = a;
      circulo(out, n++, M_DISCO, COR.branco);
    }
  }
  // As zonas da Lanterna: pendente (o ponto já fixado, o telegrafo em curso) ou ativa (6 s).
  for (let z = 0; z < 3 && n + 2 <= out.capacidade; z++) {
    const t = e.chefeU16[CHEFE_U16.zonaTimer0 + z]!;
    if (t === 0) continue;
    let mx = (e.chefeF32[CHEFE_F32.zonaX0 + z]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (e.chefeF32[CHEFE_F32.zonaY0 + z]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    const x = camX + mx - MEIA_LARGURA_DO_MAPA;
    const y = camY + my - MEIA_ALTURA_DO_MAPA;
    let preenche = 0.3;
    if (t === 0xffff) {
      const tel = c.telegrafo[A.lanterna]!;
      let passos = tel - ini.ataqueTimer[s]! - 1 + alfa;
      if (passos < 0) passos = 0;
      if (passos > tel - 1) passos = tel - 1;
      preenche = ALFA.inicial + ((ALFA.final - ALFA.inicial) * passos) / (tel - 1);
    }
    R[0] = x;
    R[1] = y;
    R[2] = c.zonaRaio;
    R[3] = preenche;
    circulo(out, n++, M_DISCO, COR.cinzaVermelha);
    R[3] = preenche + 0.4;
    circulo(out, n++, M_ANEL, COR.cinzaVermelha);
  }
  return n;
}
