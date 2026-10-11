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
