// Cálculo do desenho das armas, sem Phaser (design/decisoes-F-004.md §6):
// mortes (V5), marcador do Sal (V4), facas, aura, golpe, estocada e pulso (V1
// a V3) e números de dano (N2 a N6). Cada função escreve uma SaidaDeSprites
// que os dois escritores só copiam. Tudo é desenhado na cópia mais próxima da
// câmera e arredondado para o pixel do canvas, como a horda; as idades contam
// em passos do evento, então a imagem pausada depende só da seed e do passo.
// Nada é alocado por frame; nos laços por membro, as contas vão em linha.
import { ARQUETIPO, indiceDoNivel } from '../../logica/armas/tabela';
import { CAB, CAPACIDADE_DE_EFEITOS as CAPACIDADE_DE_ONDAS, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, VAGAS_DE_ARMA, type Estado } from '../../logica/nucleo/estado';
import { FORMA } from '../../logica/nucleo/eventos';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR } from '../paleta';
import { MOLDURA, RAIO_DA_CUNHA_PT } from './atlas';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';
import { CAPACIDADE_DE_EFEITOS, CAPACIDADE_DE_MORTES, CAPACIDADE_DE_NUMEROS, EFEITO, VIDA, digitosDe, idade, type EfeitosDaVigilia } from './efeitos';
import type { DesenhoDoTipo, SaidaDaHorda } from './horda';

/** Cores dos efeitos (V1 a V4, N3). */
export const COR_DO_CRITICO = 0xffd166;
const ALFA_DO_GOLPE = 0.5;
const ALFA_DO_ANEL = 0.6;
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
/** Morte: escala de 1 a 0,6 e alpha de 1 a 0 em 12 passos (V5). */
const ESCALA_FINAL_DA_MORTE = 0.6;

/** Membros da camada das armas: as facas por slot, 5 anéis de aura (um por vaga), os 16 efeitos e as 64 ondas da União (um por slot do pool, U6): 485. */
export const MEMBROS_DAS_ARMAS = CAPACIDADE_DE_PROJETEIS + VAGAS_DE_ARMA + CAPACIDADE_DE_EFEITOS + CAPACIDADE_DE_ONDAS;
/** Primeiro membro das ondas na camada das armas. */
export const INICIO_DAS_ONDAS = CAPACIDADE_DE_PROJETEIS + VAGAS_DE_ARMA + CAPACIDADE_DE_EFEITOS;
/** Membros da camada dos dígitos: 4 por número. */
export const DIGITOS_POR_NUMERO = 4;
export const MEMBROS_DOS_DIGITOS = CAPACIDADE_DE_NUMEROS * DIGITOS_POR_NUMERO;

const M_FACA = indiceDaMoldura('faca');
const M_LOSANGO = indiceDaMoldura('losango');
const M_ANEL = indiceDaMoldura('anel');
const M_CUNHA = indiceDaMoldura('cunha');
const M_QUADRADO = indiceDaMoldura('quadrado');
const M_D0 = indiceDaMoldura('d0');
const M_MASSA = indiceDaMoldura('massa');
const LARGURA_DO_ANEL_PT = MOLDURA.anel.largura / 2;
const LADO_DO_QUADRADO_PT = MOLDURA.quadrado.largura / 2;
const LARGURA_DO_QUADRADO_PX = MOLDURA.quadrado.largura;

const DIGITOS = new Uint8Array(4);

/** Mortes (V5): a forma e a cor do tipo, alpha de 1 a 0 e escala de 1 a 0,6 em 12 passos. */
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
    const escala = d.escala * (1 - (1 - ESCALA_FINAL_DA_MORTE) * u);
    out.escalaX[k] = out.escalaY[k] = escala;
    out.rotacao[k] = 0;
    out.alpha[k] = 1 - u;
    out.origemX[k] = out.origemY[k] = 0.5;
    out.moldura[k] = d.moldura === 'massa' ? M_MASSA : M_QUADRADO;
    out.cor[k] = d.cor;
  }
}

/** Sal no inimigo (V4): losango de 8 × 8 pt em sal no centro do corpo, na posição que a horda desenha. */
export function prepararStatus(e: Estado, horda: SaidaDaHorda, out: SaidaDeSprites): void {
  const sal = e.inimigos.salPassos;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (horda.tipo[s] === 0 || sal[s] === 0) {
      out.visivel[s] = 0;
      continue;
    }
    out.visivel[s] = 1;
    out.x[s] = horda.x[s]!;
    out.y[s] = horda.y[s]!;
    out.rotacao[s] = 0;
    out.escalaX[s] = out.escalaY[s] = 0.5;
    out.alpha[s] = 1;
    out.origemX[s] = out.origemY[s] = 0.5;
    out.moldura[s] = M_LOSANGO;
    out.cor[s] = COR.sal;
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
    if (vivo[s]! < 0) {
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
    // O ângulo é da cena, nunca da simulação: a faca aponta para onde voa.
    out.rotacao[s] = Math.atan2(p.vy[s]!, p.vx[s]!) + Math.PI / 2;
    out.escalaX[s] = out.escalaY[s] = 0.5;
    out.alpha[s] = 1;
    out.origemX[s] = out.origemY[s] = 0.5;
    out.moldura[s] = M_FACA;
    out.cor[s] = COR.sal;
  }
  // Anel da aura de cada vaga de arquétipo aura, com a borda externa no raio de acerto (V3).
  const b = e.build;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    const k = CAPACIDADE_DE_PROJETEIS + v;
    const codigo = b.codigo[v]!;
    if (codigo === 0 || dados.armas.arquetipo[codigo] !== ARQUETIPO.aura) {
      out.visivel[k] = 0;
      continue;
    }
    const R = dados.armas.alcance[indiceDoNivel(codigo, b.nivel[v]!)]!;
    escreverAnel(out, k, jx, jy, R, ALFA_DO_ANEL);
  }
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
      const u = t / VIDA.pulso;
      if (u >= 1) {
        out.visivel[k] = 0;
        continue;
      }
      escreverAnel(out, k, jx, jy, efs.c[j]! + CRESCIMENTO_DO_PULSO_PX * u, ALFA_DO_ANEL * (1 - u));
      continue;
    }
    const u = t / VIDA.golpe;
    if (u >= 1) {
      out.visivel[k] = 0;
      continue;
    }
    out.visivel[k] = 1;
    out.x[k] = jx;
    out.y[k] = jy;
    out.rotacao[k] = Math.atan2(efs.b[j]!, efs.a[j]!) + Math.PI / 2;
    out.alpha[k] = ALFA_DO_GOLPE * (1 - u);
    out.origemX[k] = 0.5;
    out.origemY[k] = 1;
    out.cor[k] = COR.brasa;
    if (efs.forma[j] === FORMA.estocada) {
      // Retângulo de L × 2w a partir do jogador, ao longo da mira.
      out.moldura[k] = M_QUADRADO;
      out.escalaX[k] = (2 * efs.d[j]!) / LADO_DO_QUADRADO_PT / 2;
      out.escalaY[k] = efs.c[j]! / LADO_DO_QUADRADO_PT / 2;
    } else {
      out.moldura[k] = M_CUNHA;
      out.escalaX[k] = out.escalaY[k] = efs.c[j]! / RAIO_DA_CUNHA_PT / 2;
    }
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
    out.rotacao[k] = Math.atan2(f.dirY[o]!, f.dirX[o]!) + Math.PI / 2;
    out.escalaX[k] = out.escalaY[k] = (2 * t.ondaMeia[codigo]!) / LARGURA_DO_QUADRADO_PX;
    out.alpha[k] = ti <= IDADE_DO_FADE_DA_ONDA ? ALFA_DA_ONDA : (ALFA_DA_ONDA * (vida - ti)) / (vida - IDADE_DO_FADE_DA_ONDA);
    out.origemX[k] = out.origemY[k] = 0.5;
    out.moldura[k] = M_QUADRADO;
    out.cor[k] = COR.brasa;
  }
}

function escreverAnel(out: SaidaDeSprites, k: number, jx: number, jy: number, raio: number, alpha: number): void {
  out.visivel[k] = 1;
  out.x[k] = jx;
  out.y[k] = jy;
  out.rotacao[k] = 0;
  out.escalaX[k] = out.escalaY[k] = (2 * raio) / LARGURA_DO_ANEL_PT / 2;
  out.alpha[k] = alpha;
  out.origemX[k] = out.origemY[k] = 0.5;
  out.moldura[k] = M_ANEL;
  out.cor[k] = COR.sal;
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
