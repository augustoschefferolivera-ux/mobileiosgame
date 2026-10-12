// Poder, Armadura e o dano vivo (design/decisoes-F-005.md P4 e P5). Poder e
// Armadura são derivados das passivas, sem campo. O dano por (arma, nível)
// vive nos derivados do Estado, fora do buffer, e é refeito só quando mudam os
// atributos ou o Poder, com a mesma fórmula do boot (gravarDanoPorAcerto).
// Importado por estado.ts: só tipos do estado (nada de ciclo de valores).
import { gravarDanoPorAcerto, MULT_NEUTRO_PCT } from '../armas/dano';
import { CODIGOS_DE_ARMA, NUMERO_DE_ATRIBUTOS, indiceDoNivel } from '../armas/tabela';
import type { DadosDaVigilia } from '../mundo/dados';
import type { Estado } from '../nucleo/estado';
import { EFEITO_DE_PASSIVA } from './tabela';

/** Soma do efeito das passivas de um tipo: valor × nível (Luvas: 8% por nível; Elmo: 4 de Armadura por nível). */
function somaDoEfeito(e: Estado, dados: DadosDaVigilia, efeito: number): number {
  const t = dados.progressao;
  let soma = 0;
  for (let v = 0; v < e.passivas.codigo.length; v++) {
    const c = e.passivas.codigo[v]!;
    if (c !== 0 && t.passivaEfeito[c] === efeito) soma += t.passivaValor[c]! * e.passivas.nivel[v]!;
  }
  return soma;
}

/** Poder em % das passivas (P5); o temporário da esquiva perfeita fica na outra tabela do dano vivo (F-006 EP3). */
export function poderPct(e: Estado, dados: DadosDaVigilia): number {
  return somaDoEfeito(e, dados, EFEITO_DE_PASSIVA.poderPct);
}

/** Armadura das passivas (P5): só registrada; a redução A/(A + 20) é da F-007. */
export function armadura(e: Estado, dados: DadosDaVigilia): number {
  return somaDoEfeito(e, dados, EFEITO_DE_PASSIVA.armadura);
}

/**
 * Refaz o dano vivo de toda (arma, nível) e o da onda com os atributos e o
 * Poder do estado (P4), cada um em duas tabelas: sem e com o Poder temporário
 * da esquiva perfeita (decisoes-F-006 EP3; entrar e sair do Poder só troca o índice): Σ grau × atributo em inteiros e a fórmula única da D4.
 * Roda na criação, no cruzamento de nível, na carta, no baú, na União e na
 * cópia do buffer; nunca por disparo.
 */
export function recalcularDano(e: Estado, dados: DadosDaVigilia): void {
  const t = dados.armas;
  const at = e.atributos;
  const poder = poderPct(e, dados);
  const vivo = e.derivados.danoVivo;
  const vivoPoder = e.derivados.danoVivoPoder;
  const poderTemp = poder + dados.combate.poderPct;
  for (let c = 1; c < CODIGOS_DE_ARMA; c++) {
    const max = t.nivelMax[c]!;
    if (max === 0) continue;
    let escala = 0;
    for (let k = 0; k < NUMERO_DE_ATRIBUTOS; k++) escala += t.grauPorAtributo[c * NUMERO_DE_ATRIBUTOS + k]! * at[k]!;
    for (let n = 1; n <= max; n++) {
      const i = indiceDoNivel(c, n);
      gravarDanoPorAcerto(vivo, i, t.danoBase[c]!, t.numDano[c]!, t.denDano[c]!, t.somaDanoPct[i]!, poder, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
      gravarDanoPorAcerto(vivoPoder, i, t.danoBase[c]!, t.numDano[c]!, t.denDano[c]!, t.somaDanoPct[i]!, poderTemp, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
    }
    if (t.ondaVida[c]! > 0) {
      gravarDanoPorAcerto(e.derivados.danoOnda, c, t.ondaDanoBase[c]!, 1, 1, 0, poder, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
      gravarDanoPorAcerto(e.derivados.danoOndaPoder, c, t.ondaDanoBase[c]!, 1, 1, 0, poderTemp, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
    }
  }
}

/** Dano vivo de (arma, nível) (testes e debug). */
export function danoVivo(e: Estado, codigo: number, nivel: number): number {
  return e.derivados.danoVivo[indiceDoNivel(codigo, nivel)]!;
}
