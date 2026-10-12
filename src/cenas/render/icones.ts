// Ícones das armas e passivas (design/decisoes-F-005.md R6; F-011): a pixel art
// do catálogo (src/arte/sprites/itens.ts), desenhada num quadrado de `lado` pt
// centrado em (cx, cy): 64 pt no modal e 28 pt no HUD. Só Graphics; chamados
// quando a build muda, nunca por quadro.
import type Phaser from 'phaser';
import { ARMA } from '../../logica/armas/tabela';
import { PASSIVA } from '../../logica/progressao/tabela';
import { desenharIconeDePixels } from '../pixel';

export type Icone = 'espada' | 'facas' | 'circulo' | 'lamina' | 'elmo' | 'luvas' | 'bolsa';

const ICONE_DA_ARMA: (Icone | null)[] = [];
ICONE_DA_ARMA[ARMA.vazia] = null;
ICONE_DA_ARMA[ARMA.espada_longa_do_juramento] = 'espada';
ICONE_DA_ARMA[ARMA.facas_de_sal] = 'facas';
ICONE_DA_ARMA[ARMA.circulo_de_sal] = 'circulo';
ICONE_DA_ARMA[ARMA.lamina_do_juramento_eterno] = 'lamina';

const ICONE_DA_PASSIVA: (Icone | null)[] = [];
ICONE_DA_PASSIVA[PASSIVA.vazia] = null;
ICONE_DA_PASSIVA[PASSIVA.elmo_sem_rosto] = 'elmo';
ICONE_DA_PASSIVA[PASSIVA.luvas_de_fole] = 'luvas';

/** Ícone do código da arma; null para a vaga vazia ou um código sem ícone. */
export function iconeDaArma(codigo: number): Icone | null {
  return ICONE_DA_ARMA[codigo] ?? null;
}

/** Ícone do código da passiva; null para a vaga vazia ou um código sem ícone. */
export function iconeDaPassiva(codigo: number): Icone | null {
  return ICONE_DA_PASSIVA[codigo] ?? null;
}

/**
 * Desenha o ícone no quadrado de `lado` pt centrado em (cx, cy) (F-011): a pixel art de 14 × 14 px do catálogo, em
 * células de 2 pt no HUD (28 pt) e de 4 pt no modal (64 pt, 56 de ícone).
 */
export function desenharIcone(g: Phaser.GameObjects.Graphics, icone: Icone, cx: number, cy: number, lado: number): void {
  desenharIconeDePixels(g, icone, cx, cy, lado);
}
