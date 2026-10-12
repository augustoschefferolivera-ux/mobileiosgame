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

/**
 * Oco Grande Coroado (elite da F-008, 64 pt = 32 × 32 px de arte): o Oco Grande maior, de coroa de bronze, os dois
 * punhos em clava e o cinto de fivela larga. O bloco 2 × 2 do centro é a fivela (Z), a cor de identidade dele.
 */
export const OCO_GRANDE_COROADO: Grade = [
  '................................',
  '...........K..K..K..K...........',
  '..........KZKKZKKZKKZK..........',
  '..........KZZoZZZZoZZK..........',
  '.........KEEEEEEEEEEEEK.........',
  '........KEEeKKKKKKKKeEEK........',
  '........KEeKPPPPPPPPKeEK........',
  '........KEeKPKKPPKKPKeEK........',
  '......KKKEeKPPPppPPPKeEKKK......',
  '....KKPPPKeeKKKKKKKKeeKPPPKK....',
  '...KPPPPPPKEEEEEEEEEEKPPPPPPK...',
  '..KPPPPEEEEEEEEEEEEEEEEEEPPPPK..',
  '..KPppEEEEeEEEEEEEEEEeEEEEppPK..',
  '..KpKKEEePPPPPPPPPPPPPPeEEKKpK..',
  '..KpK.KePPPPPPpPPpPPPPPPeK.KpK..',
  '..KpK.KeGGGGGGGZZGGGGGGGeK.KpK..',
  '..KPK.KeGGGGGGZZZZGGGGGGeK.KPK..',
  '..KPK.KEEEeEEEeEEeEEEeEEEK.KPK..',
  '.KPPPKKEEEeEEEeEEeEEEeEEEKKPPPK.',
  '.KPpPKKEEEeEEEeEEeEEEeEEEKKPpPK.',
  '.KpppKKEEEeEEEeEEeEEEeEEEKKpppK.',
  '..KKK..KEeEKKKKKKKKKKEeEK..KKK..',
  '........KpPPpK....KpPPpK........',
  '........KpPPpK....KpPPpK........',
  '........KpPPpK....KpPPpK........',
  '........KppppK....KppppK........',
  '.......KpPPPpK....KpPPPpK.......',
  '.......KKKKKKK....KKKKKKK.......',
  '................................',
  '................................',
  '................................',
  '................................',
];

/** Andar, 2º quadro: o pé esquerdo (à esquerda da tela) sobe 1 px. */
export const OCO_GRANDE_COROADO_2: Grade = [
  ...OCO_GRANDE_COROADO.slice(0, 25),
  '.......KpPPPpK....KppppK........',
  '.......KKKKKKK....KpPPPpK.......',
  '..................KKKKKKK.......',
  ...OCO_GRANDE_COROADO.slice(28),
];

/** Telegrafo: os olhos acendem em sal e a boca abre (o grito e a patada da F-008 usam o mesmo "inspirar"). */
export const OCO_GRANDE_COROADO_TELEGRAFO: Grade = OCO_GRANDE_COROADO.map((l, y) =>
  y === 7 ? '........KEeKPSSPPSSPKeEK........' : y === 8 ? '......KKKEeKPPKKKKPPKeEKKK......' : l,
);

/** Ataque: os punhos descem 1 px e abrem para fora. */
export const OCO_GRANDE_COROADO_ATAQUE: Grade = [
  ...OCO_GRANDE_COROADO.slice(0, 17),
  '.KKPK.KEEEeEEEeEEeEEEeEEEK.KPKK.',
  'KPPPKKKEEEeEEEeEEeEEEeEEEKKKPPPK',
  'KPpPK.KEEEeEEEeEEeEEEeEEEK.KPpPK',
  'KpppK.KEEEeEEEeEEeEEEeEEEK.KpppK',
  'KKKKK..KEeEKKKKKKKKKKEeEK..KKKKK',
  ...OCO_GRANDE_COROADO.slice(22),
];
