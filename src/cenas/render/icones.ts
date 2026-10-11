// Ícones provisórios das armas e passivas (design/decisoes-F-005.md R6), em formas
// geométricas até a arte, depois da F-010. Desenhados num quadrado de `lado` pt
// centrado em (cx, cy): 64 pt no modal e 28 pt no HUD. Só Graphics; chamados
// quando a build muda, nunca por quadro.
import type Phaser from 'phaser';
import { ARMA } from '../../logica/armas/tabela';
import { PASSIVA } from '../../logica/progressao/tabela';
import { COR } from '../paleta';

export type Icone = 'espada' | 'facas' | 'circulo' | 'lamina' | 'elmo' | 'luvas' | 'bolsa';

const GRAU = Math.PI / 180;
/** Cunha de 120° com a ponta para baixo e o arco para cima. */
const DE = -150 * GRAU;
const ATE = -30 * GRAU;

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

function cunha(g: Phaser.GameObjects.Graphics, vx: number, vy: number, raio: number, cor: number): void {
  g.fillStyle(cor, 1).beginPath().moveTo(vx, vy).arc(vx, vy, raio, DE, ATE, false).closePath().fillPath();
}

function losango(g: Phaser.GameObjects.Graphics, x: number, y: number, meiaLargura: number, meiaAltura: number): void {
  g.beginPath().moveTo(x, y - meiaAltura).lineTo(x + meiaLargura, y).lineTo(x, y + meiaAltura).lineTo(x - meiaLargura, y).closePath().fillPath();
}

/** Desenha o ícone no quadrado de `lado` pt centrado em (cx, cy). */
export function desenharIcone(g: Phaser.GameObjects.Graphics, icone: Icone, cx: number, cy: number, lado: number): void {
  switch (icone) {
    case 'espada':
      // Cunha de 120° em brasa, a ponta embaixo.
      cunha(g, cx, cy + 0.25 * lado, 0.5 * lado, COR.brasa);
      break;
    case 'facas':
      // Dois losangos em sal, lado a lado.
      g.fillStyle(COR.sal, 1);
      losango(g, cx - 0.2 * lado, cy, 0.09 * lado, 0.38 * lado);
      losango(g, cx + 0.2 * lado, cy, 0.09 * lado, 0.38 * lado);
      break;
    case 'circulo':
      // Anel em sal.
      g.lineStyle(0.09 * lado, COR.sal, 1).strokeCircle(cx, cy, 0.36 * lado);
      break;
    case 'lamina':
      // A cunha da Espada, menor, com um arco em osso por fora.
      cunha(g, cx, cy + 0.3 * lado, 0.4 * lado, COR.brasa);
      g.lineStyle(0.06 * lado, COR.osso, 1).beginPath().arc(cx, cy + 0.3 * lado, 0.46 * lado, DE, ATE, false).strokePath();
      break;
    case 'elmo':
      // Semicírculo sobre um retângulo, em osso.
      g.fillStyle(COR.osso, 1).beginPath().arc(cx, cy, 0.3 * lado, Math.PI, 2 * Math.PI, false).closePath().fillPath();
      g.fillRect(cx - 0.3 * lado, cy, 0.6 * lado, 0.28 * lado);
      break;
    case 'luvas':
      // Dois retângulos arredondados, em osso.
      g.fillStyle(COR.osso, 1)
        .fillRoundedRect(cx - 0.36 * lado, cy - 0.28 * lado, 0.3 * lado, 0.56 * lado, 0.08 * lado)
        .fillRoundedRect(cx + 0.06 * lado, cy - 0.28 * lado, 0.3 * lado, 0.56 * lado, 0.08 * lado);
      break;
    case 'bolsa':
      // Disco em laranja queimado (#e2652b).
      g.fillStyle(COR.laranjaQueimado, 1).fillCircle(cx, cy, 0.36 * lado);
      break;
  }
}
