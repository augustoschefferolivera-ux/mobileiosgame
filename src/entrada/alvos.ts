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

/** Fração da largura útil, à esquerda, que cria o joystick (doc 02 §4: "60% larg."). */
export const FRACAO_DA_AREA_DO_JOYSTICK = 0.6;

/**
 * Área que cria o joystick (design/decisoes-F-002.md §4), escrita em `out`
 * sem alocar: de x = esquerda até esquerda + 0,6 × largura útil, e de
 * y = máx(422, topo) até a borda de cima do inset inferior. Os 40% da direita
 * ficam livres para o Aparo e o Frasco (F-006, F-007).
 */
export function areaDoJoystick(insets: Insets, out: Alvo): Alvo {
  const larguraUtil = LARGURA_LOGICA - insets.esquerda - insets.direita;
  const topo = Math.max(ALTURA_LOGICA / 2, insets.topo);
  out.id = 'joystick';
  out.x = insets.esquerda;
  out.y = topo;
  out.largura = FRACAO_DA_AREA_DO_JOYSTICK * larguraUtil;
  out.altura = ALTURA_LOGICA - insets.baixo - topo;
  return out;
}

/**
 * Botão de pausa (design/decisoes-F-004.md P1): alvo de 72 × 72 pt no canto
 * superior esquerdo da área segura (doc 11 §3.6; doc 02 §4), escrito em `out`.
 */
export function alvoDaPausa(insets: Insets, out: Alvo): Alvo {
  out.id = 'pausa';
  out.x = insets.esquerda;
  out.y = insets.topo;
  out.largura = ALVO_MINIMO_PT;
  out.altura = ALVO_MINIMO_PT;
  return out;
}

/** Botão Aparo (design/decisoes-F-006.md AP1): 80 × 80 pt no canto inferior direito, a 24 pt dos insets (a margem do Continuar). */
export const BOTAO_DO_APARO = { lado: 80, margem: 24 } as const;

/** Botão Aparo, escrito em `out` sem alocar. A caixa do Frasco (F-007) fica 16 pt acima dele. */
export function alvoDoAparo(insets: Insets, out: Alvo): Alvo {
  out.id = 'aparo';
  out.x = LARGURA_LOGICA - insets.direita - BOTAO_DO_APARO.margem - BOTAO_DO_APARO.lado;
  out.y = ALTURA_LOGICA - insets.baixo - BOTAO_DO_APARO.margem - BOTAO_DO_APARO.lado;
  out.largura = BOTAO_DO_APARO.lado;
  out.altura = BOTAO_DO_APARO.lado;
  return out;
}

/** Botão do Frasco (design/decisoes-F-007.md FR8): 72 × 72 pt, centrado sobre o Aparo e 16 pt acima dele. */
export const BOTAO_DO_FRASCO = { lado: ALVO_MINIMO_PT, acimaDoAparo: 16 } as const;

/** Botão do Frasco, escrito em `out` sem alocar. */
export function alvoDoFrasco(insets: Insets, out: Alvo): Alvo {
  alvoDoAparo(insets, out);
  out.id = 'frasco';
  out.x += (out.largura - BOTAO_DO_FRASCO.lado) / 2;
  out.y -= BOTAO_DO_FRASCO.acimaDoAparo + BOTAO_DO_FRASCO.lado;
  out.largura = BOTAO_DO_FRASCO.lado;
  out.altura = BOTAO_DO_FRASCO.lado;
  return out;
}

/** Vigília: o botão de pausa (F-004), a área do joystick (F-002), o botão Aparo (F-006) e o do Frasco (F-007). */
export function alvosDaVigilia(insets: Insets, out: Alvo[]): Alvo[] {
  out.length = 0;
  out.push(alvoDaPausa(insets, { id: '', x: 0, y: 0, largura: 0, altura: 0 }));
  out.push(areaDoJoystick(insets, { id: '', x: 0, y: 0, largura: 0, altura: 0 }));
  out.push(alvoDoAparo(insets, { id: '', x: 0, y: 0, largura: 0, altura: 0 }));
  out.push(alvoDoFrasco(insets, { id: '', x: 0, y: 0, largura: 0, altura: 0 }));
  return out;
}

/** Botões da tela de pausa (P6): 288 × 72 pt, como o Acender; a largura encolhe com a área segura. */
export const BOTAO_DA_PAUSA = { largura: 288, altura: ALVO_MINIMO_PT } as const;
/** Continuar a 24 pt do inset de baixo, e a opção 16 pt acima dele (P6). */
const MARGEM_DO_CONTINUAR = 24;
const ENTRE_BOTOES = 16;

/** Som e Flashes (FB3): lado a lado numa só linha, 136 × 72 pt, 16 pt entre eles e 8 pt acima de "números". */
export const OPCAO_DUPLA = { largura: 136, entre: 16, acimaDeNumeros: 8, margem: 12 } as const;

/**
 * Tela de pausa (P5, P6, P9, FB3, PE3): a opção de números (a linha inteira é o alvo), o Continuar e, depois dele (o
 * baú usa o índice 1), Som e Flashes lado a lado acima de "números" e, por último, o Abandonar (288 × 72 pt, 16 pt
 * acima de Som e Flashes: o mais longe do Continuar), na zona de controles, centrados na área segura.
 */
export function alvosDaTelaDePausa(insets: Insets, out: Alvo[]): Alvo[] {
  const larguraUtil = LARGURA_LOGICA - insets.esquerda - insets.direita;
  const largura = Math.max(ALVO_MINIMO_PT, Math.min(BOTAO_DA_PAUSA.largura, larguraUtil));
  const x = insets.esquerda + (larguraUtil - largura) / 2;
  const yContinuar = ALTURA_LOGICA - insets.baixo - MARGEM_DO_CONTINUAR - BOTAO_DA_PAUSA.altura;
  out.length = 0;
  out.push({ id: 'numeros', x, y: yContinuar - ENTRE_BOTOES - BOTAO_DA_PAUSA.altura, largura, altura: BOTAO_DA_PAUSA.altura });
  out.push({ id: 'continuar', x, y: yContinuar, largura, altura: BOTAO_DA_PAUSA.altura });
  const d = OPCAO_DUPLA;
  // Em área segura estreita a dupla encolhe (a opção "números" também encolhe).
  const larguraDaOpcao = Math.max(ALVO_MINIMO_PT, Math.min(d.largura, (larguraUtil - d.entre) / 2));
  const yDupla = yContinuar - ENTRE_BOTOES - BOTAO_DA_PAUSA.altura - d.acimaDeNumeros - BOTAO_DA_PAUSA.altura;
  const xDupla = insets.esquerda + (larguraUtil - 2 * larguraDaOpcao - d.entre) / 2;
  out.push({ id: 'som', x: xDupla, y: yDupla, largura: larguraDaOpcao, altura: BOTAO_DA_PAUSA.altura });
  out.push({ id: 'flashes', x: xDupla + larguraDaOpcao + d.entre, y: yDupla, largura: larguraDaOpcao, altura: BOTAO_DA_PAUSA.altura });
  out.push({ id: 'abandonar', x, y: yDupla - ENTRE_BOTOES - BOTAO_DA_PAUSA.altura, largura, altura: BOTAO_DA_PAUSA.altura });
  return out;
}

/** Estatísticas e aviso do Abandonar na pausa (PE3): linhas de 18 pt, o aviso em 2 linhas a 18 pt do botão. */
export const BLOCO_DO_ABANDONAR = { linha: 18, linhasDoAviso: 2, folgaDoAviso: 18, folgaDasEstatisticas: 28, respiroDoPainel: 8 } as const;

export interface BlocoDaPausa {
  /** Topo do aviso (2 linhas) e das estatísticas, e quantas linhas as estatísticas ocupam (3, ou 1 sem espaço: "12 · 340 · 3"). */
  readonly yDoAviso: number;
  readonly yDasEstatisticas: number;
  readonly linhasDasEstatisticas: 1 | 3;
}

/**
 * Onde ficam o aviso e as estatísticas acima do Abandonar. `topoLivre` é o fim da build desenhada (y); com menos de
 * 3 linhas de folga entre ela e o aviso, as estatísticas viram uma linha só (PE3).
 */
export function blocoDaPausa(abandonar: Alvo, topoLivre: number): BlocoDaPausa {
  const b = BLOCO_DO_ABANDONAR;
  const yDoAviso = abandonar.y - b.folgaDoAviso - b.linhasDoAviso * b.linha;
  const fundo = yDoAviso - b.folgaDasEstatisticas;
  // O painel opaco das estatísticas tem um respiro acima e abaixo do texto, e também não encosta na build.
  const tres = fundo - 3 * b.linha - b.respiroDoPainel >= topoLivre;
  return { yDoAviso, yDasEstatisticas: tres ? fundo - 3 * b.linha : fundo - b.linha, linhasDasEstatisticas: tres ? 3 : 1 };
}

/** Resultado (design/decisoes-F-007.md RS6): Voltar e Repetir, 288 × 72 pt, 16 pt entre eles, o último a 24 pt do inset de baixo. */
export function alvosDoResultado(insets: Insets, out: Alvo[]): Alvo[] {
  const larguraUtil = LARGURA_LOGICA - insets.esquerda - insets.direita;
  const largura = Math.max(ALVO_MINIMO_PT, Math.min(BOTAO_DA_PAUSA.largura, larguraUtil));
  const x = insets.esquerda + (larguraUtil - largura) / 2;
  const yRepetir = ALTURA_LOGICA - insets.baixo - MARGEM_DO_CONTINUAR - BOTAO_DA_PAUSA.altura;
  out.length = 0;
  out.push({ id: 'voltar', x, y: yRepetir - ENTRE_BOTOES - BOTAO_DA_PAUSA.altura, largura, altura: BOTAO_DA_PAUSA.altura });
  out.push({ id: 'repetir', x, y: yRepetir, largura, altura: BOTAO_DA_PAUSA.altura });
  return out;
}

/** Caixa da opção de números (P9): 28 pt com borda de 2 pt, a 20 pt da direita da linha, centrada na altura. */
export const CAIXA_DA_OPCAO = { lado: 28, borda: 2, margem: 20 } as const;

/** Canto superior esquerdo da caixa da opção, em pt, dentro do alvo `numeros` da tela de pausa. */
export function caixaDaOpcao(opcao: Alvo, margem: number = CAIXA_DA_OPCAO.margem): { x: number; y: number } {
  return {
    x: opcao.x + opcao.largura - margem - CAIXA_DA_OPCAO.lado,
    y: opcao.y + (opcao.altura - CAIXA_DA_OPCAO.lado) / 2,
  };
}

/**
 * Cartas do level up (design/decisoes-F-005.md R6): coluna de 3 cartas de
 * mín(342, largura útil − 48) × 152 pt, 12 pt entre elas, centradas, com o
 * fundo da última a 24 pt do inset de baixo (como o Continuar da pausa).
 */
export const CARTA_DO_MODAL = { largura: 342, altura: 152, entre: 12, margemLateral: 24, margemBaixo: 24 } as const;

export function alvosDasCartas(insets: Insets, out: Alvo[]): Alvo[] {
  const c = CARTA_DO_MODAL;
  const larguraUtil = LARGURA_LOGICA - insets.esquerda - insets.direita;
  const largura = Math.max(ALVO_MINIMO_PT, Math.min(c.largura, larguraUtil - 2 * c.margemLateral));
  const x = insets.esquerda + (larguraUtil - largura) / 2;
  const fundo = ALTURA_LOGICA - insets.baixo - c.margemBaixo;
  out.length = 0;
  for (let k = 0; k < 3; k++) {
    out.push({ id: `carta${k}`, x, y: fundo - (3 - k) * c.altura - (2 - k) * c.entre, largura, altura: c.altura });
  }
  return out;
}

/** Modal do baú (B4): só o Continuar, no mesmo lugar do da pausa. */
export function alvosDoBau(insets: Insets, out: Alvo[]): Alvo[] {
  const pausa = alvosDaTelaDePausa(insets, []);
  out.length = 0;
  out.push({ ...pausa[1]!, id: 'continuar' });
  return out;
}

/** Todas as telas com alvos; o teste de safe-area (F-001.13 e F-002.7) percorre esta tabela. */
export const ALVOS_POR_TELA: Record<string, (insets: Insets, out: Alvo[]) => Alvo[]> = {
  acender: alvosDoAcender,
  vigilia: alvosDaVigilia,
  pausa: alvosDaTelaDePausa,
  resultado: alvosDoResultado,
  cartas: alvosDasCartas,
  bau: alvosDoBau,
};
