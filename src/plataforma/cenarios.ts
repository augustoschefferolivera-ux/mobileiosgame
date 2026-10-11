// Cenários de teste do build de debug (?cenario=<id>; ADR-0002 §14;
// design/decisoes-F-003.md §5): cada receita de src/dados/cenarios vira
// parâmetros da Vigília, que entram no cabeçalho do estado e no hash. Um id
// desconhecido é erro no boot. O build de produção nunca lê ?cenario.
import horda from '../dados/cenarios/horda.json';
import hordaRotativa from '../dados/cenarios/horda_rotativa.json';
import semHorda from '../dados/cenarios/sem_horda.json';
import { CENARIO, LINHA_LIVRE, TODOS_OS_TUTORIAIS, type ParametrosDaVigilia } from '../logica/nucleo/estado';

/** O que se lê de uma receita (cenario.schema.json). */
export interface ReceitaDeCenario {
  readonly id: string;
  readonly linha_fixa: number | null;
  readonly jogador: { readonly invulneravel: boolean };
  readonly diretor_desligado: boolean;
  readonly tutoriais_vistos: boolean;
  readonly rotacao: number;
}

export const RECEITAS: readonly ReceitaDeCenario[] = [horda, hordaRotativa, semHorda];

/** Parâmetros da Vigília de um cenário (sem o TETO, que vem de ?teto ou da detecção). */
export function parametrosDoCenario(id: string): Omit<ParametrosDaVigilia, 'teto'> {
  const r = RECEITAS.find((x) => x.id === id);
  if (!r) throw new Error(`cenário desconhecido: ${id}`);
  return {
    tutoriaisVistos: r.tutoriais_vistos ? TODOS_OS_TUTORIAIS : 0,
    cenario: (r.jogador.invulneravel ? CENARIO.jogadorInvulneravel : 0) | (r.diretor_desligado ? CENARIO.diretorDesligado : 0),
    linhaFixa: r.linha_fixa ?? LINHA_LIVRE,
    rotacao: r.rotacao,
  };
}
