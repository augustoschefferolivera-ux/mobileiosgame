// Ocos (facção da Charneca): musgo, pele cinza e lanterna apagada (doc 13
// §1.3). A massa tem 16 × 16 px (32 pt) e o médio 24 × 24 (48 pt); nenhum usa
// as cores quentes além de 1 px de B na lanterna (style card §3). O bloco 2 × 2
// do centro de cada quadro de andar é a cor de identidade do tipo
// (COR_DO_INIMIGO), que o teste da horda confere no centro de cada inimigo.
import type { Grade } from '../imagem';

/** Oco das Lanternas (massa): curvado, o capuz baixo entre os ombros, a lanterna pendurada à direita. */
export const OCO_DAS_LANTERNAS: Grade = [
  '.....KKKKK......',
  '....KEEEEEK.....',
  '...KEEKKKEEK....',
  '..KEEKPPPKEEK...',
  '..KEeKKPKKeEK...',
  '.KEEeKpPpKeEEK..',
  '.KEEEeKKKeEEEK..',
  'KEEEEEEEEeEEEEK.',
  'KPKEEeEEEEeEKPK.',
  'KpKEEeEEEEeEKpK.',
  'KPKEeEEEEEEeKPK.',
  '.KKEEeEEEEeEKKKK',
  '..KEeEEeEEeEKZZK',
  '..KeEEeEEeEEKBZK',
  '..KEeKEeKEeKKKKK',
  '...KK.KK.KK.....',
];

/** Andar, 2º quadro: os trapos da barra e a lanterna balançam. */
export const OCO_DAS_LANTERNAS_2: Grade = [
  ...OCO_DAS_LANTERNAS.slice(0, 11),
  '.KKEEeEEEEeEKKK.',
  '..KEeEEeEEeEKZK.',
  '..KeEEeEEeEKZBZK',
  '..KeEKeEKeEKKKKK',
  '...KK.KK.KK.....',
];

/** Oco Grande (médio): ombros largos, cabeça afundada, o braço direito em clava. */
export const OCO_GRANDE: Grade = [
  '........................',
  '..........KKKKK.........',
  '.........KEEEEEK........',
  '........KEEEEEEEK.......',
  '........KEKKKKKEK.......',
  '......KKKEKPPPKEKKK.....',
  '....KKPPKeKPKPKeKPPKK...',
  '...KPPPPPKKpPpKKPPPPPK..',
  '..KPPPPEEEKKKKKEEPPPPPK.',
  '..KPpEEEEEEEEEEEEEEPPPK.',
  '..KpKEEePPPPPPPeEEKPPPK.',
  '..KpKEePPPPPPPPPeEKpPPK.',
  '..KpKKPPPpPPPpPPPKKpPPK.',
  '..KPKKPPPPpPpPPPPKKpPPK.',
  '.KPPKKpPPPPPPPPPpKKKpPPK',
  '.KPpK.KpPPPPPPPpK.KPPPpK',
  '.KKKK.KeEEZZZEEeK.KpPppK',
  '......KEeEGGGEeEK.KKKKK.',
  '......KEEeEEEeEEK.......',
  '.......KeEKKKEeK........',
  '.......KpPK.KPpK........',
  '......KKppK.KppKK.......',
  '......KKKKK.KKKKK.......',
  '........................',
];

/** Andar, 2º quadro: o pé esquerdo (à esquerda da tela) sobe 1 px. */
export const OCO_GRANDE_2: Grade = [
  ...OCO_GRANDE.slice(0, 20),
  '......KKppK.KPpK........',
  '......KKKKK.KppKK.......',
  '............KKKKK.......',
  '........................',
];

/** Telegrafo ("inspirar"): a clava sobe acima da cabeça (doc 13 §1.6: o telegrafo é parte do sprite). */
export const OCO_GRANDE_TELEGRAFO: Grade = [
  '..................KKKK..',
  '..........KKKKK..KPPPPK.',
  '.........KEEEEEK.KPpPPK.',
  '........KEEEEEEEKKPPPPK.',
  '........KEKKKKKEKKpPPK..',
  '......KKKEKPPPKEKKPPK...',
  '....KKPPKeKPKPKeKPPK....',
  '...KPPPPPKKpPpKKPPPPK...',
  '..KPPPPEEEKKKKKEEPPPPK..',
  '..KPpEEEEEEEEEEEEEEPPK..',
  '..KpKEEePPPPPPPeEEKKKK..',
  '..KpKEePPPPPPPPPeEK.....',
  '..KpKKPPPpPPPpPPPKK.....',
  '..KPKKPPPPpPpPPPPK......',
  '.KPPKKpPPPPPPPPPpK......',
  '.KPpK.KpPPPPPPPpK.......',
  '.KKKK.KeEEZZZEEeK.......',
  '......KEeEGGGEeEK.......',
  ...OCO_GRANDE.slice(18),
];

/** Ataque: a clava desce à frente, mais baixa que no andar. */
export const OCO_GRANDE_ATAQUE: Grade = [
  ...OCO_GRANDE.slice(0, 15),
  '.KPpK.KpPPPPPPPpK.KPPPPK',
  '.KKKK.KeEEZZZEEeK.KpPPPK',
  '......KEeEGGGEeEK.KPPPpK',
  '......KEEeEEEeEEK.KpPppK',
  '.......KeEKKKEeK..KKKKK.',
  ...OCO_GRANDE.slice(20),
];
