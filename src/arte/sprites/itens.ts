// Pickups e ícones (style card §4): a Alma, os baús e os ícones de 14 × 14 px
// (28 pt no HUD e 56 pt no modal, em escala inteira).
import type { Grade } from '../imagem';

/** Alma no chão: chama lilás de 7 × 8 px (14 × 16 pt). */
export const ALMA: Grade = [
  '...K...',
  '..KVK..',
  '.KVVVK.',
  '.KVHVK.',
  'KVVHVVK',
  'KVHHHVK',
  '.KVHVK.',
  '..KKK..',
];

/** Baú comum: couro com cintas de bronze, 16 × 11 px (32 × 22 pt). */
export const BAU_COMUM: Grade = [
  '...KKKKKKKKKK...',
  '..KZZZZZZZZZZK..',
  '.KGZGGGGGGGGZGK.',
  '.KGZGGGGGGGGZGK.',
  '.KKKKKKZZKKKKKK.',
  '.KGZGGKOOKGGZGK.',
  '.KGZGGGKKGGGZGK.',
  '.KGZGGGGGGGGZGK.',
  '.KGZGGGGGGGGZGK.',
  '.KDZDDDDDDDDZDK.',
  '.KKKKKKKKKKKKKK.',
];

/** Baú dourado: a mesma forma em ouro velho com cintas amarelas. */
export const BAU_DOURADO: Grade = BAU_COMUM.map((l) => l.replace(/G/g, 'o').replace(/Z/g, 'y'));

/** Ícone da Espada Longa do Juramento: a lâmina na diagonal, o cabo embaixo à esquerda. */
export const ICONE_ESPADA: Grade = [
  '..........KKK.',
  '.........KHHK.',
  '........KHSK..',
  '.......KHSK...',
  '......KHSK....',
  '.....KHSK.....',
  '..KK.KSK......',
  '..KZKSK.......',
  '...KZK........',
  '..KGKZK.......',
  '.KGK.KK.......',
  'KZK...........',
  'KKK...........',
  '..............',
];
