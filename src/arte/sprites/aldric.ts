// Aldric, o jogador: 24 × 24 px de arte (48 pt), de frente, a partir da
// referência aprovada (design/arte/aldric24-referencia.png). Virado para a
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
  '....K.KcKDOABODKcK......',
  '...KZKKcKDOOOODKcK......',
  '..KMGMKHKDDOODDKHK......',
  '...KHKKcKGGZZGGKcK......',
  '...KSKKcKDDOODDKcK......',
  '...KSKKcKDMssMDKcK......',
  '...KSKcKKDDKKDDKKcK.....',
  '...KSKCKKDMKKMDKKCK.....',
  '...KSKK.KDMKKMDK.K......',
  '...KSK..KDDKKDDK........',
  '...KSK.KMLMKKMLMK.......',
  '....K..KKKKKKKKKK.......',
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

/** Andar: a bota esquerda (do Aldric, à direita da tela) e a direita sobem 2 px, alternadas com o passo neutro. */
export const ALDRIC_ANDAR_1: Grade = comLinhas(ALDRIC_PARADO, 20, [
  '...KSKKKMLMKKMDK.K......',
  '...KSK.KKKKKKDDK........',
  '...KSK......KMLMK.......',
  '....K.......KKKKK.......',
]);
export const ALDRIC_ANDAR_3: Grade = comLinhas(ALDRIC_PARADO, 18, [
  '...KSKcKKDDKKDDKKcK.....',
  '...KSKCKKDMKKMDKKCK.....',
  '...KSKK.KDMKKMLMKK......',
  '...KSK..KDDKKKKKK.......',
  '...KSK.KMLMK............',
  '....K..KKKKK............',
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
  '...KZKcKKDOOOODKKcKK....',
  '..KMGMKHKGGZZGGKHKcK....',
  '...KHKKcKDDOODDKcKK.....',
  '...KSKcKDDMssMDDKcK.....',
  '...KSKKDDMKKKKMDDKK.....',
  '...KSKKDMK....KMDK......',
  '...KSKKMLMK..KMLMK......',
  '...KSKKKKKK..KKKKK......',
  '...KSK..................',
  '....K...................',
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

/** Aparo: a espada atravessada na altura do queixo, a guarda à direita da tela e as duas mãos no cabo. */
export const ALDRIC_APARO: Grade = [
  '........................',
  '..........KKKK..........',
  '.........KMLLMK.........',
  '........KDLHHLDK........',
  '........KDMLLMDK........',
  '........KKKKKKKK....K...',
  '........KDAKKADK...KMK..',
  '..KKKKKKKKKKKKKKKKKKMKK.',
  '.KHSSSSSSSSSSSSSSSKHMGZK',
  '..KssssssssssssssKKHMKK.',
  '...KKKDMDKOOOOKDKKKMK...',
  '......KcKDOYYODKcK.K....',
  '......KcKDOABODKcK......',
  '......KcKDOOOODKcK......',
  '......KHKDDOODDKHK......',
  '......KcKGGZZGGKcK......',
  '......KcKDDOODDKcK......',
  '......KcKDMssMDKcK......',
  '.....KcKKDDKKDDKKcK.....',
  '.....KCKKDMKKMDKKCK.....',
  '.....KK.KDMKKMDK.K......',
  '........KDDKKDDK........',
  '.......KMLMKKMLMK.......',
  '.......KKKKKKKKKK.......',
];

/** Aparo, 2º quadro: o brilho corre pela lâmina. */
export const ALDRIC_APARO_2: Grade = comPixels(ALDRIC_APARO, [
  [2, 8, 'S'],
  [7, 8, 'H'],
  [8, 8, 'H'],
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
  '....K.KcKDOABODK........',
  '...KZKKcKDOOOODK........',
  '..KMGMKHKDDOODDKKK......',
]);

/** Frasco, 2º quadro: o frasco inclinado e a brasa escorrendo para o visor. */
export const ALDRIC_FRASCO_2: Grade = comPixels(ALDRIC_FRASCO, [
  [16, 5, 'Y'],
  [16, 6, 'a'],
  [14, 6, 'A'],
  [13, 6, 'a'],
]);

/** Apagar, 1º quadro: ajoelhado sobre a espada, a cabeça baixa e os olhos apagados. */
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
  '...KZKKcKKKDDKKKcK......',
  '..KMGMKcKDOCCODKcK......',
  '...KHKKHKDOBCODKHK......',
  '...KSK.KKDOOOODKK.......',
  '...KSK.KcKGGGGKcK.......',
  '...KSKKcKDDOODDKcK......',
  '...KSKKcKDMssMDKKK......',
  '...KSKKKDDMKKKKMDDK.....',
  '...KSKKDDMK...KDDMK.....',
  '...KSKKMLMKK..KKMLMK....',
  '...KSKKKKKK....KKKKK....',
  '....K...................',
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
