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

/**
 * Barra de HP (decisoes-F-007 HB1): a metade esquerda da faixa da barra de XP, na mesma linha da stamina (topo + 56, 10 pt,
 * vão de 8 pt: x = esquerda + 80 e largura 119 pt com a faixa de 246). O número (`ceil(hp)`) fica logo abaixo, a 2 pt,
 * em 12 pt de corpo, acima das vagas (topo + 80).
 */
export const BARRA_DE_HP = { altura: 10, abaixoDoTopo: 56, vao: 8, numeroAbaixo: 0, corpoDoNumero: 12 } as const;
/** Retardo da perda (HB2): a barra mostra o HP de antes por 12 passos da simulação, e a vinheta do acerto dura 6 quadros a 0,35. */
export const RETARDO_DO_HP = { passos: 12 } as const;
export const VINHETA_DO_ACERTO = { alfa: 0.35, quadros: 6, degraus: 6, borda: 48 } as const;

/** Caixa da barra de HP, escrita em `out` sem alocar. */
export function caixaDaBarraDeHp(insets: Insets, out: CaixaDaBarra): CaixaDaBarra {
  const xp = caixaDaBarraDeXp(insets, out);
  out.largura = Math.max(0, (xp.largura - BARRA_DE_HP.vao) / 2);
  out.y = insets.topo + BARRA_DE_HP.abaixoDoTopo;
  out.altura = BARRA_DE_HP.altura;
  return out;
}

/** Posição y do número de HP (topo do texto), abaixo da barra. */
export function yDoNumeroDeHp(caixa: CaixaDaBarra): number {
  return caixa.y + caixa.altura + BARRA_DE_HP.numeroAbaixo;
}

/**
 * Larguras dos trechos da barra de HP, em pt, escritas em `out` [cheio, cura, retardo] sem alocar: o HP atual; a cura
 * que falta do Frasco (de hp até hp + restante, limitada ao máximo); e o retardo (de hp até o valor de antes). Cada
 * uma é a largura desde o início da barra até o fim do trecho; o desenho empilha retardo, cura e cheio.
 */
export function trechosDaBarraDeHp(largura: number, hp: number, hpMax: number, restante: number, retardo: number, out: Float64Array): Float64Array {
  out[0] = larguraDaStamina(largura, hp, hpMax);
  out[1] = larguraDaStamina(largura, Math.min(hpMax, hp + Math.max(0, restante)), hpMax);
  out[2] = larguraDaStamina(largura, Math.min(hpMax, Math.max(hp, retardo)), hpMax);
  return out;
}

/** O número mostrado do HP: `ceil`, então HP > 0 nunca mostra 0 (DM4). */
export function numeroDoHp(hp: number): number {
  return hp > 0 ? Math.ceil(hp) : 0;
}

/** HUD de Almas (decisoes-F-007 AM5): canto esquerdo, 116 pt abaixo do topo (logo sob a linha de vagas), corpo de 14 pt. */
export const HUD_DE_ALMAS = { abaixoDoTopo: 116, recuoEsquerdo: 12, corpo: 14 } as const;

/** Posição (canto superior esquerdo) do HUD de Almas na área segura, escrita em `out` sem alocar. */
export function posicaoDoHudDeAlmas(insets: Insets, out: { x: number; y: number }): { x: number; y: number } {
  out.x = insets.esquerda + HUD_DE_ALMAS.recuoEsquerdo;
  out.y = insets.topo + HUD_DE_ALMAS.abaixoDoTopo;
  return out;
}

/** O saldo de Almas com "." de milhar (pt-BR): 0, 999, "1.000", "12.345". Só roda quando o valor muda; inteiro ≥ 0. */
export function formatarAlmas(n: number): string {
  const s = String(n > 0 ? Math.floor(n) : 0);
  let saida = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) saida += '.';
    saida += s[i];
  }
  return saida;
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

/** Estados do botão do Frasco (FR8): esmaecido sem cargas ou com o HP cheio; ativo durante a cura. */
export const ESTADO_DO_FRASCO = { normal: 0, pressionado: 1, esmaecido: 2, curando: 3 } as const;

/**
 * Estado do botão do Frasco: pressionado (preenchido por 4 quadros) tem a vez; a cura em curso fica acesa; sem cargas ou
 * com o HP cheio ele esmaece (o toque segue valendo para o cancelamento, e a simulação ignora o resto).
 */
export function estadoDoFrasco(quadrosPressionado: number, cargas: number, hp: number, hpMax: number, frascoPasso: number): number {
  if (quadrosPressionado > 0) return ESTADO_DO_FRASCO.pressionado;
  if (frascoPasso > 0) return ESTADO_DO_FRASCO.curando;
  if (cargas === 0 || !(hp < hpMax)) return ESTADO_DO_FRASCO.esmaecido;
  return ESTADO_DO_FRASCO.normal;
}

/** Desenho do botão do Frasco: anel de 64 pt, rótulo de 12 pt e uma marca por carga (até 3), sem texto por quadro. */
export const BOTAO_DO_FRASCO_DESENHO = { raioDoAnel: 32, traco: 3, raioDaMarca: 4, entreMarcas: 14, marcasAbaixoDoCentro: 16, alfaEsmaecido: 0.35 } as const;
