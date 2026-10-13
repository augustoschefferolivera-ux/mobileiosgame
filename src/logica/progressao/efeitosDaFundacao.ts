// Efeitos da Fundação que a simulação lê (design/decisoes-F-010.md FD4 a FD7): tabelas puras, sem double atravessando
// chamada (ADR-0007 §8). Sem importar nada: estado.ts, contato.ts, dano.ts e atributos.ts importam este módulo. Um teste
// confere cada valor contra `arvore.json`.

/** Pele que esqueceu de sangrar: Armadura +2 por rank (FD4). */
export const ARMADURA_POR_RANK_DE_PELE = 2;
/** Fôlego de forja: +5 % do HP máximo por rank, somado ao Σ% do hpMax (D5 P3; FD4). */
export const HP_PCT_POR_RANK_DE_FOLEGO = 5;
/** Casco: +3 passos de invulnerabilidade pós-acerto por rank (0,05 s = 3 passos; FD5). */
export const PASSOS_DE_CASCO_POR_RANK = 3;
/** Rank máximo de cada nó que a simulação lê, na ordem Pele, Fôlego, Casco, Bigorna (a validação dos parâmetros). */
export const RANK_MAXIMO_PELE = 5;
export const RANK_MAXIMO_FOLEGO = 5;
export const RANK_MAXIMO_CASCO = 3;
export const RANK_MAXIMO_BIGORNA = 3;
/** Mãos de aprendiz: rank máximo, e a Espada começa no nível `1 + rank` (FD7). */
export const RANK_MAXIMO_MAOS = 3;

/**
 * Bigorna no peito: multiplicador do dano de contato por rank 0 a 3 (FD6): 1; 0,97; 0,94; 0,91, em Float32. Multiplica
 * depois da armadura e antes da Brasa Firme, só na origem contato (projétil, golpe, fome e Agarrar não recebem).
 */
export const MULTIPLICADOR_DA_BIGORNA = new Float32Array([1, 0.97, 0.94, 0.91]);

/**
 * Índices dos ranks no estado (layout v10, `Estado.fundacaoU8`; LY1): Pele, Fôlego, Casco e Bigorna. Valem desde o passo 0 e
 * nunca mudam dentro da Vigília. As Mãos de aprendiz entram só pelos parâmetros (a lista de armas, FD7). Mora aqui (e
 * `estado.ts` o reexporta) para `dano.ts`, que o estado importa, não criar um ciclo de valores.
 */
export const FUNDACAO_U8 = { pele: 0, folego: 1, casco: 2, bigorna: 3 } as const;
