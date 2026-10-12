// Cálculo do desenho das armas, sem Phaser (design/decisoes-F-004.md §6):
// mortes (V5), marcador do Sal (V4), facas, aura, golpe, estocada e pulso (V1
// a V3) e números de dano (N2 a N6). Cada função escreve uma SaidaDeSprites
// que os dois escritores só copiam. Tudo é desenhado na cópia mais próxima da
// câmera e arredondado para o pixel do canvas, como a horda; as idades contam
// em passos do evento, então a imagem pausada depende só da seed e do passo.
// Nada é alocado por frame; nos laços por membro, as contas vão em linha.
import { ESCALA_DA_GRADE, ESTOCADA, MEIA_DA_ONDA, RAIO_DO_ARCO, nomeDoArco } from '../../arte/catalogo';
import { ARMA, ARQUETIPO, indiceDoNivel } from '../../logica/armas/tabela';
import { CAB, TIPO_DE_PROJETIL, CAPACIDADE_DE_EFEITOS as CAPACIDADE_DE_ONDAS, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, VAGAS_DE_ARMA, type Estado } from '../../logica/nucleo/estado';
import { FORMA } from '../../logica/nucleo/eventos';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR } from '../paleta';
import { ORIGEM_X, ORIGEM_Y, direcao16 } from './arte';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';
import { CAPACIDADE_DE_EFEITOS, CAPACIDADE_DE_MORTES, CAPACIDADE_DE_NUMEROS, EFEITO, VIDA, digitosDe, idade, type EfeitosDaVigilia } from './efeitos';
import type { DesenhoDoTipo, SaidaDaHorda } from './horda';

/** Cores dos efeitos (V1 a V4, N3). */
export const COR_DO_CRITICO = COR.amarelo;
/** Os grãos do Círculo de Sal (F-011): até 64 por anel, um a cada ≈ 10 pt da circunferência, girando 0,24 rad por segundo; a 2 pt por px de arte (6 pt). */
const GRAOS_POR_ANEL = 64;
const PT_POR_GRAO = 10;
const ALFA_DO_GRAO = 0.85;
const GIRO_POR_PASSO = 0.004;
/** Pulsos desenhados ao mesmo tempo na camada do sal (o resto do pool fica de fora, só render). */
const PULSOS_DO_SAL = 4;
export const MEMBROS_DO_SAL = (VAGAS_DE_ARMA + PULSOS_DO_SAL) * GRAOS_POR_ANEL;
/** O pulso cresce 96 px em 12 passos (V3). */
const CRESCIMENTO_DO_PULSO_PX = 96;
/** Animação do número (N6): sobe 16 pt; alpha 1 até a idade 24 e reta até 0 na 36. */
const SUBIDA_DO_NUMERO_PT = 16;
const IDADE_DO_FADE = 24;
/** Dígito: 7,5 pt de glifo e 1 pt entre dígitos; escala 0,5 (atlas a 2×), ×1,5 no crítico (N3, N4). */
const AVANCO_DO_DIGITO_PT = 8.5;
const ESCALA_DO_DIGITO = 0.5;
const ESCALA_DO_CRITICO = 1.5;
/** Onda da União (U6): brasa a 0,4 até a idade 8 e reta até 0 na vida da onda (15). */
const ALFA_DA_ONDA = 0.4;
const IDADE_DO_FADE_DA_ONDA = 8;
/** Tint neutro: a arte (F-011) não é tingida. */
const BRANCO = 0xffffff;

/** Membros da camada das armas: as facas por slot, 5 anéis de aura (um por vaga), os 16 efeitos e as 64 ondas da União (um por slot do pool, U6): 485. */
export const MEMBROS_DAS_ARMAS = CAPACIDADE_DE_PROJETEIS + VAGAS_DE_ARMA + CAPACIDADE_DE_EFEITOS + CAPACIDADE_DE_ONDAS;
/** Primeiro membro das ondas na camada das armas. */
export const INICIO_DAS_ONDAS = CAPACIDADE_DE_PROJETEIS + VAGAS_DE_ARMA + CAPACIDADE_DE_EFEITOS;
/** Membros da camada dos dígitos: 4 por número. */
export const DIGITOS_POR_NUMERO = 4;
export const MEMBROS_DOS_DIGITOS = CAPACIDADE_DE_NUMEROS * DIGITOS_POR_NUMERO;

const M_D0 = indiceDaMoldura('d0');
/** Molduras da arte (F-011): os 4 ângulos desenhados de cada efeito girado, os grãos e os marcadores de status. */
const QUATRO = [0, 1, 2, 3] as const;
const M_FACA = QUATRO.map((k) => indiceDaMoldura(`faca_${k}`));
const M_ESTOCADA = QUATRO.map((k) => indiceDaMoldura(`estocada_${k}`));
const M_ONDA = QUATRO.map((k) => indiceDaMoldura(`onda_${k}`));
/** Arco: [forte][volta][ângulo][quadro] achatado em forte·16 + volta·8 + ângulo·2 + quadro. */
const M_ARCO = [false, true].flatMap((forte) => [false, true].flatMap((volta) => QUATRO.flatMap((k) => [0, 1].map((q) => indiceDaMoldura(nomeDoArco(forte, volta, k, q))))));
const M_GRAO = [indiceDaMoldura('grao_sal_0'), indiceDaMoldura('grao_sal_1')] as const;
export const M_STATUS_ATORDOADO = indiceDaMoldura('status_atordoado');
export const M_STATUS_SAL = indiceDaMoldura('status_sal');
const ARTE = ESCALA_DA_GRADE.arte;
/** O marcador de status fica 12 pt acima do centro do corpo (na cabeça da massa, no peito dos médios). */
const ACIMA_DO_CENTRO_PT = 12;
const DIRECAO = { base: 0, rotacao: 0 };

const DIGITOS = new Uint8Array(4);

/**
 * Mortes (V5; F-011): o inimigo vira cinza em 3 quadros (doc 13 §1.5), um por terço dos 12 passos, no tamanho do
 * corpo; o último terço some aos poucos.
 */
export function prepararMortes(
  ef: EfeitosDaVigilia,
  e: Estado,
  alfa: number,
  camX: number,
  camY: number,
  tabela: readonly (DesenhoDoTipo | null)[],
  out: SaidaDeSprites,
): void {
  const m = ef.mortes;
  const passo = e.cab[CAB.passo]!;
  for (let k = 0; k < CAPACIDADE_DE_MORTES; k++) {
    const d = m.ativo[k] === 1 ? tabela[m.tipo[k]!] : null;
    if (!d) {
      out.visivel[k] = 0;
      continue;
    }
    const u = idade(passo, alfa, m.passo[k]!) / VIDA.morte;
    if (u >= 1) {
      out.visivel[k] = 0;
      continue;
    }
    out.visivel[k] = 1;
    let mx = (m.x[k]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (m.y[k]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.x[k] = Math.round((camX + mx - MEIA_LARGURA_DO_MAPA) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    out.y[k] = Math.round((camY + my - MEIA_ALTURA_DO_MAPA) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    const q = u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2;
    out.escalaX[k] = out.escalaY[k] = d.escala;
    out.rotacao[k] = 0;
    out.alpha[k] = q < 2 ? 1 : 3 * (1 - u);
    out.origemX[k] = out.origemY[k] = 0.5;
    out.moldura[k] = d.cinza[q]!;
    out.cor[k] = BRANCO;
  }
}

/**
 * Marcador de status no inimigo, um membro por slot, 12 pt acima do centro do corpo que a horda desenha (F-011): a
 * estrela do atordoado em amarelo (RE9, com prioridade sobre o Sal: o cristal fica oculto enquanto dura a Postura
 * Quebrada), ou o cristal de sal (V4). Os dois em pixel art com contorno, a 2 pt por px.
 */
export function prepararStatus(e: Estado, horda: SaidaDaHorda, out: SaidaDeSprites): void {
  const sal = e.inimigos.salPassos;
  const quebrada = e.inimigos.quebradaPassos;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    const atordoado = quebrada[s]! > 0;
    if (horda.tipo[s] === 0 || (sal[s] === 0 && !atordoado)) {
      out.visivel[s] = 0;
      continue;
    }
    out.visivel[s] = 1;
    out.x[s] = horda.x[s]!;
    out.y[s] = horda.y[s]! - ACIMA_DO_CENTRO_PT;
    out.rotacao[s] = 0;
    out.escalaX[s] = out.escalaY[s] = ARTE;
    out.alpha[s] = 1;
    out.origemX[s] = out.origemY[s] = 0.5;
    out.moldura[s] = atordoado ? M_STATUS_ATORDOADO : M_STATUS_SAL;
    out.cor[s] = BRANCO;
  }
}

/**
 * Armas: as facas (V2), um anel por vaga de aura (V3), e os golpes, as
 * estocadas e os pulsos vivos (V1, V3), centrados no jogador interpolado
 * (jx, jy, já na cópia da câmera).
 */
export function prepararArmas(
  e: Estado,
  dados: DadosDaVigilia,
  ef: EfeitosDaVigilia,
  alfa: number,
  camX: number,
  camY: number,
  jx: number,
  jy: number,
  out: SaidaDeSprites,
): void {
  const p = e.projeteis;
  const vivo = e.poolDeProjeteis.posicao;
  for (let s = 0; s < CAPACIDADE_DE_PROJETEIS; s++) {
    // Só as facas: o projétil de Sal da Noviça (tipo 2) tem a camada dele (RE6).
    if (vivo[s]! < 0 || p.tipo[s] !== TIPO_DE_PROJETIL.faca) {
      out.visivel[s] = 0;
      continue;
    }
    out.visivel[s] = 1;
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
    out.x[s] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[s] = camY + my - MEIA_ALTURA_DO_MAPA;
    // O ângulo é da cena, nunca da simulação: a faca aponta para onde voa, em 16 direções (4 desenhos e giros de 90°).
    direcao16(Math.atan2(p.vy[s]!, p.vx[s]!) + Math.PI / 2, DIRECAO);
    out.rotacao[s] = DIRECAO.rotacao;
    out.escalaX[s] = out.escalaY[s] = ARTE;
    out.alpha[s] = 1;
    out.origemX[s] = out.origemY[s] = 0.5;
    out.moldura[s] = M_FACA[DIRECAO.base]!;
    out.cor[s] = BRANCO;
  }
  // Os membros da aura ficam ocultos: o anel do Círculo de Sal é de grãos, na camada do sal (prepararSal, F-011).
  for (let v = 0; v < VAGAS_DE_ARMA; v++) out.visivel[CAPACIDADE_DE_PROJETEIS + v] = 0;
  const efs = ef.efeitos;
  const passo = e.cab[CAB.passo]!;
  for (let j = 0; j < CAPACIDADE_DE_EFEITOS; j++) {
    const k = CAPACIDADE_DE_PROJETEIS + VAGAS_DE_ARMA + j;
    if (efs.ativo[j] !== 1) {
      out.visivel[k] = 0;
      continue;
    }
    const t = idade(passo, alfa, efs.passo[j]!);
    if (efs.tipo[j] === EFEITO.pulso) {
      // O pulso também é de grãos (prepararSal).
      out.visivel[k] = 0;
      continue;
    }
    const u = t / VIDA.golpe;
    if (u >= 1) {
      out.visivel[k] = 0;
      continue;
    }
    // F-011: o arco de brasa (ou a lança da estocada) na direção do golpe em 16 passos, com o vértice no jogador;
    // inteiro até a metade da vida e some na outra metade. A Lâmina do Juramento Eterno usa o arco forte.
    direcao16(Math.atan2(efs.b[j]!, efs.a[j]!) + Math.PI / 2, DIRECAO);
    out.visivel[k] = 1;
    out.x[k] = jx;
    out.y[k] = jy;
    out.rotacao[k] = DIRECAO.rotacao;
    out.alpha[k] = u < 0.5 ? 1 : 2 * (1 - u);
    out.cor[k] = BRANCO;
    let m: number;
    if (efs.forma[j] === FORMA.estocada) {
      m = M_ESTOCADA[DIRECAO.base]!;
      out.escalaX[k] = out.escalaY[k] = efs.c[j]! / ESTOCADA.comprimento;
    } else {
      const forte = efs.arma[j] === ARMA.lamina_do_juramento_eterno ? 16 : 0;
      const volta = efs.forma[j] === FORMA.volta ? 8 : 0;
      m = M_ARCO[forte + volta + DIRECAO.base * 2 + (u < 0.25 ? 0 : 1)]!;
      out.escalaX[k] = out.escalaY[k] = efs.c[j]! / RAIO_DO_ARCO;
    }
    out.moldura[k] = m;
    out.origemX[k] = ORIGEM_X[m]!;
    out.origemY[k] = ORIGEM_Y[m]!;
  }
  // Ondas da União (U6): um quadrado de 2 × ondaMeia no centro do acerto, origem + mira × px/60 × (idade − 1 + alfa),
  // girado pela mira, no chão (não segue o jogador). Com alfa = 1 a imagem só depende do estado.
  const f = e.efeitos;
  const posOnda = e.poolDeEfeitos.posicao;
  const t = dados.armas;
  for (let o = 0; o < CAPACIDADE_DE_ONDAS; o++) {
    const k = INICIO_DAS_ONDAS + o;
    if (posOnda[o]! < 0) {
      out.visivel[k] = 0;
      continue;
    }
    const codigo = f.arma[o]!;
    const vida = t.ondaVida[codigo]!;
    let ti = f.idade[o]! - 1 + alfa;
    if (ti < 0) ti = 0;
    if (ti >= vida) {
      out.visivel[k] = 0;
      continue;
    }
    const d = (t.ondaPxPor60[codigo]! * ti) / 60;
    const x = Math.round((f.x[o]! + f.dirX[o]! * d) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    const y = Math.round((f.y[o]! + f.dirY[o]! * d) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    let mx = (x - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (y - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.visivel[k] = 1;
    out.x[k] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[k] = camY + my - MEIA_ALTURA_DO_MAPA;
    // F-011: o crescente de brasa na direção do voo, em 16 passos, na largura da onda.
    direcao16(Math.atan2(f.dirY[o]!, f.dirX[o]!) + Math.PI / 2, DIRECAO);
    out.rotacao[k] = DIRECAO.rotacao;
    out.escalaX[k] = out.escalaY[k] = t.ondaMeia[codigo]! / MEIA_DA_ONDA;
    out.alpha[k] = ti <= IDADE_DO_FADE_DA_ONDA ? ALFA_DA_ONDA : (ALFA_DA_ONDA * (vida - ti)) / (vida - IDADE_DO_FADE_DA_ONDA);
    const m = M_ONDA[DIRECAO.base]!;
    out.origemX[k] = ORIGEM_X[m]!;
    out.origemY[k] = ORIGEM_Y[m]!;
    out.moldura[k] = m;
    out.cor[k] = BRANCO;
  }
}

/**
 * A camada do sal (F-011): o anel do Círculo de Sal de cada vaga de aura, com a borda externa no raio de acerto
 * (V3), e os pulsos (o anel cresce 96 px em 12 passos, V3), feitos de grãos de sal na grade fina, um a cada ≈ 9 pt
 * da circunferência (até 64), girando devagar, a 0,85 de alfa (× (1 − u) no pulso).
 */
export function prepararSal(e: Estado, dados: DadosDaVigilia, ef: EfeitosDaVigilia, alfa: number, jx: number, jy: number, out: SaidaDeSprites): void {
  const b = e.build;
  const passo = e.cab[CAB.passo]!;
  const giro = passo * GIRO_POR_PASSO;
  let anel = 0;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    const codigo = b.codigo[v]!;
    if (codigo === 0 || dados.armas.arquetipo[codigo] !== ARQUETIPO.aura) continue;
    escreverGraos(out, anel++, jx, jy, dados.armas.alcance[indiceDoNivel(codigo, b.nivel[v]!)]!, giro, ALFA_DO_GRAO);
  }
  const efs = ef.efeitos;
  let pulsos = 0;
  for (let j = 0; j < CAPACIDADE_DE_EFEITOS && pulsos < PULSOS_DO_SAL; j++) {
    if (efs.ativo[j] !== 1 || efs.tipo[j] !== EFEITO.pulso) continue;
    const u = idade(passo, alfa, efs.passo[j]!) / VIDA.pulso;
    if (u >= 1) continue;
    escreverGraos(out, VAGAS_DE_ARMA + pulsos++, jx, jy, efs.c[j]! + CRESCIMENTO_DO_PULSO_PX * u, -giro, ALFA_DO_GRAO * (1 - u));
  }
  for (let a = anel; a < VAGAS_DE_ARMA; a++) esconderAnel(out, a);
  for (let p = pulsos; p < PULSOS_DO_SAL; p++) esconderAnel(out, VAGAS_DE_ARMA + p);
}

function esconderAnel(out: SaidaDeSprites, anel: number): void {
  for (let g = 0; g < GRAOS_POR_ANEL; g++) out.visivel[anel * GRAOS_POR_ANEL + g] = 0;
}

/** Os grãos de um anel de raio `raio` pt em volta de (jx, jy), arredondados para o pixel do canvas. */
function escreverGraos(out: SaidaDeSprites, anel: number, jx: number, jy: number, raio: number, giro: number, alpha: number): void {
  let n = Math.round((2 * Math.PI * raio) / PT_POR_GRAO);
  if (n > GRAOS_POR_ANEL) n = GRAOS_POR_ANEL;
  if (n < 12) n = 12;
  const base = anel * GRAOS_POR_ANEL;
  for (let g = 0; g < GRAOS_POR_ANEL; g++) {
    const k = base + g;
    if (g >= n) {
      out.visivel[k] = 0;
      continue;
    }
    // A borda externa no raio: o grão de 5 px (10 pt, com o contorno) fica 4 pt para dentro, com 1 pt de variação.
    const r = raio - 4 - ((g * 7) % 3) * 0.5;
    const ang = (2 * Math.PI * g) / n + giro;
    out.visivel[k] = 1;
    out.x[k] = Math.round((jx + r * Math.sin(ang)) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    out.y[k] = Math.round((jy - r * Math.cos(ang)) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    out.rotacao[k] = 0;
    out.escalaX[k] = out.escalaY[k] = ARTE;
    out.alpha[k] = alpha;
    out.origemX[k] = out.origemY[k] = 0.5;
    out.moldura[k] = M_GRAO[g & 1]!;
    out.cor[k] = BRANCO;
  }
}

/**
 * Números de dano (N2 a N6): até 4 dígitos por número, centrados no ponto do
 * acerto, subindo 16 pt com saída quadrática, alpha 1 até a idade 24 e 0 na
 * 36; osso, ou #ffd166 e ×1,5 no crítico.
 */
export function prepararNumeros(ef: EfeitosDaVigilia, e: Estado, alfa: number, camX: number, camY: number, out: SaidaDeSprites): void {
  const nu = ef.numeros;
  const passo = e.cab[CAB.passo]!;
  for (let n = 0; n < CAPACIDADE_DE_NUMEROS; n++) {
    const base = n * DIGITOS_POR_NUMERO;
    const t = nu.ativo[n] === 1 ? idade(passo, alfa, nu.passo[n]!) : VIDA.numero;
    if (t >= VIDA.numero) {
      for (let d = 0; d < DIGITOS_POR_NUMERO; d++) out.visivel[base + d] = 0;
      continue;
    }
    const u = t / VIDA.numero;
    const dy = -SUBIDA_DO_NUMERO_PT * (1 - (1 - u) * (1 - u));
    const alpha = t <= IDADE_DO_FADE ? 1 : 1 - (t - IDADE_DO_FADE) / (VIDA.numero - IDADE_DO_FADE);
    const critico = nu.critico[n] === 1;
    const escala = critico ? ESCALA_DO_DIGITO * ESCALA_DO_CRITICO : ESCALA_DO_DIGITO;
    const avanco = critico ? AVANCO_DO_DIGITO_PT * ESCALA_DO_CRITICO : AVANCO_DO_DIGITO_PT;
    const nd = digitosDe(nu.valor[n]!, DIGITOS);
    let mx = (nu.x[n]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (nu.y[n]! + dy - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    const cx = camX + mx - MEIA_LARGURA_DO_MAPA;
    const y = Math.round((camY + my - MEIA_ALTURA_DO_MAPA) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    const x0 = cx - (avanco * (nd - 1)) / 2;
    for (let d = 0; d < DIGITOS_POR_NUMERO; d++) {
      const k = base + d;
      if (d >= nd) {
        out.visivel[k] = 0;
        continue;
      }
      out.visivel[k] = 1;
      out.x[k] = Math.round((x0 + d * avanco) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
      out.y[k] = y;
      out.rotacao[k] = 0;
      out.escalaX[k] = out.escalaY[k] = escala;
      out.alpha[k] = alpha;
      out.origemX[k] = 0.5;
      out.origemY[k] = 1;
      out.moldura[k] = M_D0 + DIGITOS[d]!;
      out.cor[k] = critico ? COR_DO_CRITICO : COR.osso;
    }
  }
}
