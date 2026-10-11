// Alvos de toque da UI, em pt lógicos (ADR-0002 §12). O hit-test é nosso;
// todo alvo tem pelo menos 72 pt (B §3.5) e fica fora dos insets de safe-area.
import { ALTURA_LOGICA, LARGURA_LOGICA, type Insets } from '../plataforma/safeArea';

export const ALVO_MINIMO_PT = 72;

export interface Alvo {
  id: string;
  /** Canto superior esquerdo, em pt. */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export function contem(a: Alvo, px: number, py: number): boolean {
  return px >= a.x && px < a.x + a.largura && py >= a.y && py < a.y + a.altura;
}

/** Primeiro alvo que contém o ponto, ou null. Não aloca. */
export function acharAlvo(alvos: readonly Alvo[], px: number, py: number): Alvo | null {
  for (const a of alvos) if (contem(a, px, py)) return a;
  return null;
}

export function alvoInvadeInsets(a: Alvo, insets: Insets): boolean {
  return (
    a.y < insets.topo ||
    a.x < insets.esquerda ||
    a.x + a.largura > LARGURA_LOGICA - insets.direita ||
    a.y + a.altura > ALTURA_LOGICA - insets.baixo
  );
}

/**
 * Tela de Acender (doc 11 §3.1): botão único, centrado na área segura.
 * Medidas provisórias (288 × 72 pt) até a arte, depois da F-010; a largura
 * encolhe se a área segura for mais estreita.
 */
export const BOTAO_ACENDER = { largura: 288, altura: ALVO_MINIMO_PT } as const;

export function alvosDoAcender(insets: Insets, out: Alvo[]): Alvo[] {
  const larguraUtil = LARGURA_LOGICA - insets.esquerda - insets.direita;
  const alturaUtil = ALTURA_LOGICA - insets.topo - insets.baixo;
  const cx = insets.esquerda + larguraUtil / 2;
  const cy = insets.topo + alturaUtil / 2;
  const largura = Math.max(ALVO_MINIMO_PT, Math.min(BOTAO_ACENDER.largura, larguraUtil));
  out.length = 0;
  out.push({
    id: 'acender',
    x: cx - largura / 2,
    y: cy - BOTAO_ACENDER.altura / 2,
    largura,
    altura: BOTAO_ACENDER.altura,
  });
  return out;
}

/** Todas as telas com alvos; o teste de safe-area (F-001.13) percorre esta tabela. */
export const ALVOS_POR_TELA: Record<string, (insets: Insets, out: Alvo[]) => Alvo[]> = {
  acender: alvosDoAcender,
};
