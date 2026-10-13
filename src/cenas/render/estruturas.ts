// Cálculo do desenho das estruturas da F-008, sem Phaser (design/decisoes-F-008.md CR11, AR2, FG1, FG2, ES1): a borda da arena
// do marco (anel de 224 pt de raio), a Fogueira (o losango da base, a chama e o anel do raio de 64 pt) e o véu do escurecimento.
// Formas simples do atlas (anel, quadrado, triângulo), tingidas: a arte é da F-011. Cada função escreve uma SaidaDeSprites que os
// escritores só copiam; nada é alocado por quadro e as contas de posição vão em linha (ADR-0005 §2).
import { CAB, CHEFE_U16, CHEFE_U32, ETAPA, FOGUEIRA_F32, FOGUEIRA_U8, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { COR } from '../paleta';
import { MOLDURA } from './atlas';
import { indiceDaMoldura, type SaidaDeSprites } from './camadas';

/** Membros da camada: a borda da arena, o anel da Fogueira, a base, a chama e o brilho dela. */
export const MEMBROS_DAS_ESTRUTURAS = 5;
const M_ANEL = indiceDaMoldura('anel');
const M_QUADRADO = indiceDaMoldura('quadrado');
const M_TRIANGULO = indiceDaMoldura('triangulo');
const M_DISCO = indiceDaMoldura('disco');
const LARGURA_DO_ANEL_PX = MOLDURA.anel.largura;
/** Lado da base em losango e altura da chama, em pt. */
const BASE_DA_FOGUEIRA_PT = 22;
const CHAMA_PT = 26;
/** O anel do raio da Fogueira: apagado de leve com a Fogueira só acesa, mais forte com o menu aberto. */
const ALFA_DO_RAIO = { acesa: 0.22, aberta: 0.5 } as const;
const ALFA_DA_BORDA_DA_ARENA = 0.85;
/** A névoa da arena do chefe (F-009 AB2): o mesmo anel da borda, mais fraco e na cor do sal. */
const ALFA_DA_NEVOA = 0.5;

/** Escurecimento (ES1): de 15:00 a 19:00 sobe 0,10 por minuto; fica em 0,40 de 19:00 em diante. */
export const ESCURECIMENTO = { inicioEmPassos: 54000, passosPorDegrau: 3600, alfaPorDegrau: 0.1, alfaMaximo: 0.4 } as const;

/** O alfa do véu preto pelo relógio: 0 até 15:00, +0,10 por minuto, estacionado em 0,40. Só render; fora do hash. */
export function alfaDoEscurecimento(relogio: number): number {
  if (relogio <= ESCURECIMENTO.inicioEmPassos) return 0;
  const a = (ESCURECIMENTO.alfaPorDegrau * (relogio - ESCURECIMENTO.inicioEmPassos)) / ESCURECIMENTO.passosPorDegrau;
  return a < ESCURECIMENTO.alfaMaximo ? a : ESCURECIMENTO.alfaMaximo;
}

/**
 * O céu das duas fases finais (F-009 FM1, AN4), só render: em A Fome o véu fica vinho e cresce de 0,40 a 0,75 pelos passos da fome; no
 * Amanhecer o véu preto cai de 0,40 a 0 em 600 passos e uma luz de brasa (aditiva) sobe de 0 a 0,50. `ate` = 520 passos é a fome mais
 * curta que mata (a mais comprida acaba em FIM de qualquer jeito).
 */
export const CEU_FINAL = { fome: { cor: 0x3a0a14, de: 0.4, ate: 0.75, passos: 520 }, amanhecer: { passos: 600, aurora: 0.5 } } as const;

/** O véu da Vigília no estado: [0] alfa, [1] cor e [2] alfa da luz da aurora (0 fora do Amanhecer). Sem alocar. */
export function veuDaVigilia(e: Estado, out: Float64Array): void {
  const etapa = e.fogueiraU8[FOGUEIRA_U8.etapa]!;
  out[1] = 0x000000;
  out[2] = 0;
  if (etapa === ETAPA.aFome) {
    const f = Math.min(1, e.chefeU32[CHEFE_U32.fomePassos]! / CEU_FINAL.fome.passos);
    out[0] = CEU_FINAL.fome.de + (CEU_FINAL.fome.ate - CEU_FINAL.fome.de) * f;
    out[1] = CEU_FINAL.fome.cor;
  } else if (etapa === ETAPA.amanhecer) {
    const f = Math.min(1, e.chefeU16[CHEFE_U16.amanhecerPassos]! / CEU_FINAL.amanhecer.passos);
    out[0] = ESCURECIMENTO.alfaMaximo * (1 - f);
    out[2] = CEU_FINAL.amanhecer.aurora * f;
  } else {
    out[0] = alfaDoEscurecimento(e.cab[CAB.relogio]!);
  }
}

/**
 * Escreve a camada: membro 0 a borda da arena (só com `arenaAtiva`), 1 o anel do raio da Fogueira, 2 a base, 3 a chama e 4 o
 * brilho dela (só com `fogueiraAcesa`). Cada centro fica na cópia do toro mais próxima da câmera.
 */
export function prepararEstruturas(e: Estado, dados: DadosDaVigilia, camX: number, camY: number, out: SaidaDeSprites): void {
  const u8 = e.fogueiraU8;
  const f = e.fogueiraF32;
  const arena = u8[FOGUEIRA_U8.arenaAtiva] === 1;
  out.visivel[0] = arena ? 1 : 0;
  if (arena) {
    let mx = (f[FOGUEIRA_F32.arenaX]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (f[FOGUEIRA_F32.arenaY]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.x[0] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[0] = camY + my - MEIA_ALTURA_DO_MAPA;
    out.rotacao[0] = 0;
    out.escalaX[0] = out.escalaY[0] = (2 * dados.combate.arenaRaio) / LARGURA_DO_ANEL_PX;
    const nevoa = u8[FOGUEIRA_U8.etapa]! >= ETAPA.chefe;
    out.alpha[0] = nevoa ? ALFA_DA_NEVOA : ALFA_DA_BORDA_DA_ARENA;
    out.origemX[0] = out.origemY[0] = 0.5;
    out.moldura[0] = M_ANEL;
    out.cor[0] = nevoa ? COR.sal : COR.laranjaQueimado;
  }
  const acesa = u8[FOGUEIRA_U8.fogueiraAcesa] === 1;
  for (let k = 1; k <= 4; k++) out.visivel[k] = acesa ? 1 : 0;
  if (!acesa) return;
  let mx = (f[FOGUEIRA_F32.fogueiraX]! - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
  if (mx < 0) mx += LARGURA_DO_MAPA;
  let my = (f[FOGUEIRA_F32.fogueiraY]! - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
  if (my < 0) my += ALTURA_DO_MAPA;
  const x = camX + mx - MEIA_LARGURA_DO_MAPA;
  const y = camY + my - MEIA_ALTURA_DO_MAPA;
  const passo = e.cab[CAB.passo]!;
  // A chama respira devagar (±12% no tamanho, 1,5 s), pelo passo; com a Fogueira parada (etapa FOGUEIRA) o passo segue andando.
  const respiro = 1 + 0.12 * Math.sin(passo / 14);
  for (let k = 1; k <= 4; k++) {
    out.x[k] = x;
    out.y[k] = y;
    out.rotacao[k] = 0;
    out.origemX[k] = out.origemY[k] = 0.5;
  }
  out.moldura[1] = M_ANEL;
  out.escalaX[1] = out.escalaY[1] = (2 * dados.combate.fogueiraRaio) / LARGURA_DO_ANEL_PX;
  out.alpha[1] = u8[FOGUEIRA_U8.etapa] === ETAPA.fogueira ? ALFA_DO_RAIO.aberta : ALFA_DO_RAIO.acesa;
  out.cor[1] = COR.brasa;
  out.moldura[2] = M_QUADRADO;
  out.rotacao[2] = Math.PI / 4;
  out.escalaX[2] = out.escalaY[2] = BASE_DA_FOGUEIRA_PT / MOLDURA.quadrado.largura;
  out.alpha[2] = 1;
  out.cor[2] = COR.laranjaQueimado;
  out.moldura[3] = M_TRIANGULO;
  out.y[3] = y - 6;
  out.escalaX[3] = out.escalaY[3] = (CHAMA_PT * respiro) / MOLDURA.triangulo.largura;
  out.alpha[3] = 1;
  out.cor[3] = COR.brasa;
  out.moldura[4] = M_DISCO;
  out.escalaX[4] = out.escalaY[4] = (56 * respiro) / MOLDURA.disco.largura;
  out.alpha[4] = 0.14;
  out.cor[4] = COR.brasaClara;
}
