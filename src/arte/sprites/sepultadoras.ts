// Sepultadoras: branco-osso, preto e sal azulado (doc 13 §1.3). A Noviça de
// Sal é o médio à distância: silhueta estreita, em triângulo, sem rosto, com
// os olhos e o frasco de sal em N (o bloco 2 × 2 do centro, a cor de
// identidade que o teste da horda confere).
import type { Grade } from '../imagem';

export const NOVICA_DE_SAL: Grade = [
  '........................',
  '..........KKKK..........',
  '.........KDDDDK.........',
  '........KDMMMMDK........',
  '........KDOOOODK........',
  '.......KDOKKKKODK.......',
  '.......KDONKKNODK.......',
  '.......KDOKKKKODK.......',
  '......KDDOOOOOODDK......',
  '......KDnKOOOOKnDK......',
  '.....KDDnKKSSKKnDDK.....',
  '.....KDnKOSNNSOKnDK.....',
  '.....KDnKOSNNSOKnDK.....',
  '....KDDnKKSssSKKnDDK....',
  '....KDnKDDKKKKDDKnDK....',
  '....KDnKDMDDDDMDKnDK....',
  '...KDDnKDMDDDDMDDKnDK...',
  '...KDnKDDMDDDDMDDKnDK...',
  '...KDnKDDMDDDDMDDKnDK...',
  '..KDDnKDDMDDDDMDDDKnDK..',
  '..KDnKDDDMDDDDMDDDKnDK..',
  '..KnnKDDDMDDDDMDDDKnnK..',
  '..KKKKKKKKKKKKKKKKKKKK..',
  '........................',
];

/** Andar, 2º quadro: as dobras do hábito deslizam 1 px (ela não tem passo, desliza). */
export const NOVICA_DE_SAL_2: Grade = [
  ...NOVICA_DE_SAL.slice(0, 19),
  '..KDDnKDMDDDDDDMDDKnDK..',
  '..KDnKDDMDDDDDDMDDKnDK..',
  '..KnnKDDMDDDDDDMDDKnnK..',
  ...NOVICA_DE_SAL.slice(22),
];

/** Telegrafo: o frasco e os olhos acendem em sal antes do arremesso. */
export const NOVICA_DE_SAL_TELEGRAFO: Grade = NOVICA_DE_SAL.map((l, y) =>
  y === 6 ? l.replace(/N/g, 'S') : y === 11 || y === 12 ? l.replace(/N/g, 'H') : l,
);

/** Ataque: o frasco à frente, o sal explode em lascas. */
export const NOVICA_DE_SAL_ATAQUE: Grade = NOVICA_DE_SAL.map((l, y) =>
  y === 6 ? l.replace(/N/g, 'S') : y === 9 ? '......KDnKOSHHSKnDK.....'.slice(0, 24) : y === 11 || y === 12 ? l.replace(/N/g, 'S') : l,
);
