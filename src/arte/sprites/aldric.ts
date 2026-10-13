// Aldric, o jogador: 24 × 24 px de arte (48 pt), de frente, a partir da
// referência aprovada (design/arte/aldric24-referencia.png), sem a espada que
// ela pendura ao lado (pedido do usuário, 2026-10-13). Virado para a
// esquerda, o render espelha a grade; a luz é de cima, então o espelho não a
// inverte (style card §3). Os quadros de andar e de respirar saem do parado por
// troca de linhas e de pixels; os demais são desenhados à mão (style card §4).
import type { Grade } from '../imagem';

export const ALDRIC_PARADO: Grade = [
  '........................',
  '..........KKKK..........',
  '.........KMLLMK.........',
  '........KDLHHLDK........',
  '........KDMLLMDK........',
  '........KKKKKKKK........',
  '........KDAKKADK........',
  '........KKDMMDKK........',
  '......KKKCCOOCCKKK......',
  '.....KMLHKCOOCKHLMK.....',
  '.....KDMDKOOOOKDMDK.....',
  '......KcKDOYYODKcK......',
  '......KcKDOABODKcK......',
  '......KcKDOOOODKcK......',
  '......KHKDDOODDKHK......',
  '......KcKGGZZGGKcK......',
  '......KcKDDOODDKcK......',
  '......KcKDMssMDKcK......',
  '.....KcKKDDKKDDKKcK.....',
  '.....KCKKDMKKMDKKCK.....',
  '......K.KDMKKMDK.K......',
  '........KDDKKDDK........',
  '.......KMLMKKMLMK.......',
  '.......KKKKKKKKKK.......',
];

/** A grade com as linhas a partir de `de` trocadas. */
function comLinhas(base: Grade, de: number, novas: readonly string[]): Grade {
  return base.map((l, y) => (y >= de && y < de + novas.length ? novas[y - de]! : l));
}

/** A grade com alguns pixels trocados: [x, y, chave]. */
function comPixels(base: Grade, pixels: readonly (readonly [number, number, string])[]): Grade {
  const linhas = base.map((l) => [...l]);
  for (const [x, y, ch] of pixels) linhas[y]![x] = ch;
  return linhas.map((l) => l.join(''));
}

/** Parado, 2º quadro: a brasa do peito e os olhos acendem (respiração a 2 quadros por segundo). */
export const ALDRIC_PARADO_2: Grade = comPixels(ALDRIC_PARADO, [
  [10, 6, 'a'],
  [13, 6, 'a'],
  [11, 12, 'Y'],
  [12, 12, 'A'],
  [10, 11, 'a'],
  [13, 11, 'a'],
]);

/**
 * Quadro de contato do andar: do elmo ao cinto o corpo desce 1 px (some a linha
 * da barra da capa) e as pernas trocam pelas `pernas` a partir da linha `de`;
 * os pés ficam na mesma linha (style card §7).
 */
function comPasso(de: number, pernas: readonly string[]): Grade {
  const abaixado = ALDRIC_PARADO.map((l, y) => (y === 0 ? '.'.repeat(24) : y <= 18 ? ALDRIC_PARADO[y - 1]! : l));
  return comLinhas(abaixado, de, pernas);
}

/** Andar: a bota esquerda (do Aldric, à direita da tela) e a direita sobem 2 px e o corpo desce 1 px, alternados com o passo neutro (o parado). */
export const ALDRIC_ANDAR_1: Grade = comPasso(20, [
  '......KKMLMKKMDK.K......',
  '.......KKKKKKDDK........',
  '............KMLMK.......',
  '............KKKKK.......',
]);
export const ALDRIC_ANDAR_3: Grade = comPasso(20, [
  '......K.KDMKKMLMKK......',
  '........KDDKKKKKK.......',
  '.......KMLMK............',
  '.......KKKKK............',
]);

/** Esquiva, 1º e 3º quadros: agachado, o corpo 3 px abaixo e os joelhos para fora. */
export const ALDRIC_AGACHADO: Grade = [
  '........................',
  '........................',
  '........................',
  '........................',
  '..........KKKK..........',
  '.........KMLLMK.........',
  '........KDLHHLDK........',
  '........KKKKKKKK........',
  '........KDAKKADK........',
  '......KKKKDMMDKKKK......',
  '.....KMLHKCOOCKHLMK.....',
  '.....KDMDKOOOOKDMDK.....',
  '.....KKcKDOYYODKcKK.....',
  '....KcKcKDOABODKcKcK....',
  '....KKcKKDOOOODKKcKK....',
  '....KcKHKGGZZGGKHKcK....',
  '.....KKcKDDOODDKcKK.....',
  '.....KcKDDMssMDDKcK.....',
  '.....KKDDMKKKKMDDKK.....',
  '......KDMK....KMDK......',
  '......KMLMK..KMLMK......',
  '......KKKKK..KKKKK......',
  '........................',
  '........................',
];

/** Esquiva, 2º quadro: enrolado na capa, só o elmo, os olhos e a brasa à vista. */
export const ALDRIC_ROLANDO: Grade = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..........KKKKK.........',
  '........KKCCCCCKK.......',
  '.......KCCcKKKcCCK......',
  '......KCcKKMLLMKcCK.....',
  '.....KCcKDLHHLLDKcCK....',
  '.....KCKKDMLLMMDKKCK....',
  '....KCcKKKKKKKKKKcCcK...',
  '....KCKKDAKKKKADKKCcK...',
  '....KcKKKDMMMMDKKKcCK...',
  '....KCcKKKOOOOKKKcCcK...',
  '....KCCcKKOYYOKKcCCcK...',
  '.....KCCcKKOOKKcCCcK....',
  '.....KcCCcKKKKcCCcK.....',
  '......KcCCCCCCCCcK......',
  '.......KKccccccKK.......',
  '.........KKKKKK.........',
  '........................',
  '........................',
  '........................',
];

/** Aparo: os punhos erguidos em guarda ao lado do visor, os antebraços até as ombreiras; as mãos saem do lado do corpo. */
export const ALDRIC_APARO: Grade = comPixels(
  comLinhas(ALDRIC_PARADO, 4, [
    '.....KKKKDMLLMDKKKK.....',
    '.....KLMKKKKKKKKMLK.....',
    '.....KMDKDAKKADKDMK.....',
    '.....KMDKKDMMDKKDMK.....',
    '.....KMDKCCOOCCKDMK.....',
  ]),
  [
    [7, 14, 'c'],
    [16, 14, 'c'],
  ],
);

/** Aparo, 2º quadro: o brilho corre pelas manoplas. */
export const ALDRIC_APARO_2: Grade = comPixels(ALDRIC_APARO, [
  [6, 5, 'H'],
  [17, 5, 'H'],
]);

/** Frasco: a mão direita (à direita da tela) leva o frasco de brasa ao visor. */
export const ALDRIC_FRASCO: Grade = comLinhas(ALDRIC_PARADO, 4, [
  '........KDMLLMDKKK......',
  '........KKKKKKKKaK......',
  '........KDAKKADKYK......',
  '........KKDMMDKKKKK.....',
  '......KKKCCOOCCKHcK.....',
  '.....KMLHKCOOCKKcLMK....',
  '.....KDMDKOOOOKcKMDK....',
  '......KcKDOYYODKKKK.....',
  '......KcKDOABODK........',
  '......KcKDOOOODK........',
  '......KHKDDOODDKKK......',
]);

/** Frasco, 2º quadro: o frasco inclinado e a brasa escorrendo para o visor. */
export const ALDRIC_FRASCO_2: Grade = comPixels(ALDRIC_FRASCO, [
  [16, 5, 'Y'],
  [16, 6, 'a'],
  [14, 6, 'A'],
  [13, 6, 'a'],
]);

/** Apagar, 1º quadro: ajoelhado, a cabeça baixa e os olhos apagados, as mãos caídas ao lado do corpo. */
export const ALDRIC_AJOELHADO: Grade = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..........KKKK..........',
  '.........KMLLMK.........',
  '........KDLHHLDK........',
  '......KKKDMLLMDKKK......',
  '.....KMLHKKKKKKHLMK.....',
  '....KKDMDKcKKcKDMDK.....',
  '......KcKKKDDKKKcK......',
  '......KcKDOCCODKcK......',
  '......KHKDOBCODKHK......',
  '.......KKDOOOODKK.......',
  '.......KcKGGGGKcK.......',
  '......KcKDDOODDKcK......',
  '......KcKDMssMDKKK......',
  '......KKDDMKKKKMDDK.....',
  '......KDDMK...KDDMK.....',
  '......KMLMKK..KKMLMK....',
  '......KKKKK....KKKKK....',
  '........................',
];

/** Os quadros de cada animação, na ordem de exibição (style card §4 e §7). */
export const ANIMACOES_DO_ALDRIC = {
  parado: [ALDRIC_PARADO, ALDRIC_PARADO_2],
  andar: [ALDRIC_ANDAR_1, ALDRIC_PARADO, ALDRIC_ANDAR_3, ALDRIC_PARADO],
  esquiva: [ALDRIC_AGACHADO, ALDRIC_ROLANDO, ALDRIC_AGACHADO],
  aparo: [ALDRIC_APARO, ALDRIC_APARO_2],
  frasco: [ALDRIC_FRASCO, ALDRIC_FRASCO_2],
  apagar: [ALDRIC_AJOELHADO],
} as const;
