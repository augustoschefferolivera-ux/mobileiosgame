// Geometria do HUD da F-005 (design/decisoes-F-005.md R4 e R5), em pt lógicos e
// sem Phaser, para a cena Hud desenhar e os testes conferirem posições literais:
// a barra de XP (8 pt em topo + 40) e a linha de 12 vagas de 28 pt (topo + 80).
import { LARGURA_LOGICA, type Insets } from '../plataforma/safeArea';

/** Barra de XP (R4): 8 pt de altura a 40 pt do topo, de esquerda + 80 até a largura − direita − 64. */
export const BARRA_DE_XP = { altura: 8, abaixoDoTopo: 40, recuoEsquerdo: 80, recuoDireito: 64, folgaDoNivel: 8 } as const;

export interface CaixaDaBarra {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Caixa da barra (canto superior esquerdo), escrita em `out` sem alocar. */
export function caixaDaBarraDeXp(insets: Insets, out: CaixaDaBarra): CaixaDaBarra {
  out.x = insets.esquerda + BARRA_DE_XP.recuoEsquerdo;
  out.y = insets.topo + BARRA_DE_XP.abaixoDoTopo;
  out.largura = Math.max(0, LARGURA_LOGICA - insets.direita - BARRA_DE_XP.recuoDireito - out.x);
  out.altura = BARRA_DE_XP.altura;
  return out;
}

/** Largura do preenchimento: xp / custo da largura total, limitada a [0, largura]; custo 0 = vazia. */
export function larguraDoPreenchimento(largura: number, xp: number, custo: number): number {
  if (!(custo > 0)) return 0;
  const f = xp / custo;
  return f <= 0 ? 0 : f >= 1 ? largura : largura * f;
}

/** Vagas do HUD (R5): 5 armas, a Relíquia (sempre vazia) e 6 passivas. */
export const VAGAS_DO_HUD = { lado: 28, armas: 5, reliquia: 1, passivas: 6, entreVagas: 2, entreGrupos: 6, abaixoDoTopo: 80 } as const;
export const TOTAL_DE_VAGAS_DO_HUD = VAGAS_DO_HUD.armas + VAGAS_DO_HUD.reliquia + VAGAS_DO_HUD.passivas;
/** Índices dos grupos na linha. */
export const PRIMEIRA_PASSIVA_NO_HUD = VAGAS_DO_HUD.armas + VAGAS_DO_HUD.reliquia;
export const INDICE_DA_RELIQUIA = VAGAS_DO_HUD.armas;

export interface VagaDoHud {
  /** Canto superior esquerdo. */
  x: number;
  y: number;
}

/** Largura da linha inteira: 12 × 28 + 2 pt dentro dos grupos de armas e de passivas + 2 × 6 pt entre grupos = 366 pt. */
export const LARGURA_DA_LINHA_DE_VAGAS =
  TOTAL_DE_VAGAS_DO_HUD * VAGAS_DO_HUD.lado +
  (VAGAS_DO_HUD.armas - 1 + VAGAS_DO_HUD.passivas - 1) * VAGAS_DO_HUD.entreVagas +
  2 * VAGAS_DO_HUD.entreGrupos;

/** As 12 vagas, centradas na área segura, escritas em `out` (cria os 12 objetos só na 1ª chamada). */
export function vagasDoHud(insets: Insets, out: VagaDoHud[]): VagaDoHud[] {
  while (out.length < TOTAL_DE_VAGAS_DO_HUD) out.push({ x: 0, y: 0 });
  out.length = TOTAL_DE_VAGAS_DO_HUD;
  const util = LARGURA_LOGICA - insets.esquerda - insets.direita;
  let x = insets.esquerda + (util - LARGURA_DA_LINHA_DE_VAGAS) / 2;
  const y = insets.topo + VAGAS_DO_HUD.abaixoDoTopo;
  for (let i = 0; i < TOTAL_DE_VAGAS_DO_HUD; i++) {
    const v = out[i]!;
    v.x = x;
    v.y = y;
    const fimDoGrupo = i === VAGAS_DO_HUD.armas - 1 || i === INDICE_DA_RELIQUIA;
    x += VAGAS_DO_HUD.lado + (fimDoGrupo ? VAGAS_DO_HUD.entreGrupos : VAGAS_DO_HUD.entreVagas);
  }
  return out;
}

/**
 * Barra de stamina (decisoes-F-006 RE1): 10 pt de altura em topo + 56, na metade direita da faixa da barra de XP
 * (vão de 8 pt; a esquerda fica para o HP da F-007). Com a faixa de 246 pt (80 a 326): x = esquerda + 207 e
 * largura 119 pt, isto é, 1,19 pt por ponto de stamina.
 */
export const BARRA_DE_STAMINA = { altura: 10, abaixoDoTopo: 56, vao: 8, marcas: [25, 50, 75] as readonly number[], larguraDaMarca: 1 } as const;
/** Abaixo disto a esquiva é negada (o custo de uma esquiva, ST1): o preenchimento passa a laranja. */
export const STAMINA_DA_ESQUIVA = 25;
/** Quadros de render do pulso da ação negada (≈ 0,2 s a 60 fps; abaixo de 3 Hz) e o alfa do preenchimento nele. */
export const PULSO_DA_STAMINA = { quadros: 12, alfa: 0.3 } as const;

/** Caixa da barra de stamina, escrita em `out` sem alocar. */
export function caixaDaBarraDeStamina(insets: Insets, out: CaixaDaBarra): CaixaDaBarra {
  const xp = caixaDaBarraDeXp(insets, out);
  const largura = Math.max(0, (xp.largura - BARRA_DE_STAMINA.vao) / 2);
  out.x = xp.x + largura + BARRA_DE_STAMINA.vao;
  out.y = insets.topo + BARRA_DE_STAMINA.abaixoDoTopo;
  out.largura = largura;
  out.altura = BARRA_DE_STAMINA.altura;
  return out;
}

/** Largura do preenchimento: stamina / máxima da largura total, limitada a [0, largura]. */
export function larguraDaStamina(largura: number, stamina: number, maxima: number): number {
  if (!(maxima > 0) || !(stamina > 0)) return 0;
  return stamina >= maxima ? largura : (largura * stamina) / maxima;
}

/** Posição x (relativa ao início da barra) da marca de `pontos` pontos de stamina, no centro da marca de 1 pt. */
export function xDaMarcaDeStamina(largura: number, pontos: number, maxima: number): number {
  return (largura * pontos) / maxima;
}

/** Estados do botão Aparo (AP1, RE2). */
export const ESTADO_DO_APARO = { normal: 0, pressionado: 1, indisponivel: 2 } as const;
/** Quadros de render do preenchimento do botão pressionado. */
export const QUADROS_DO_APARO_PRESSIONADO = 4;

/**
 * Estado do botão Aparo: pressionado (preenchido por 4 quadros) tem a vez; indisponível quando falta stamina
 * (< 15), em esquiva, em janela ou em aparo falho; senão, normal.
 */
export function estadoDoAparo(quadrosPressionado: number, stamina: number, custoDoAparo: number, esquivaPasso: number, aparoJanela: number, aparoFalho: number): number {
  if (quadrosPressionado > 0) return ESTADO_DO_APARO.pressionado;
  if (stamina < custoDoAparo || esquivaPasso > 0 || aparoJanela > 0 || aparoFalho > 0) return ESTADO_DO_APARO.indisponivel;
  return ESTADO_DO_APARO.normal;
}
