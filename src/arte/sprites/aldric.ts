// Aldric, o jogador: 24 × 24 px de arte (48 pt), de frente, a partir da
// referência aprovada (design/arte/aldric24-referencia.png). Virado para a
// esquerda, o render espelha a grade; a luz é de cima, então o espelho não a
// inverte (style card §3).
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
