// Cenários de teste do build de debug (?cenario=<id>; ADR-0002 §14;
// design/decisoes-F-003.md §5; design/decisoes-F-004.md §5): cada receita de src/dados/cenarios vira
// parâmetros da Vigília, que entram no cabeçalho do estado e no hash. Um id
// desconhecido é erro no boot. O build de produção nunca lê ?cenario.
import horda from '../dados/cenarios/horda.json';
import hordaRotativa from '../dados/cenarios/horda_rotativa.json';
import semHorda from '../dados/cenarios/sem_horda.json';
import tresArmas from '../dados/cenarios/tres_armas.json';
import nivelTres from '../dados/cenarios/nivel_tres.json';
import bauUniao from '../dados/cenarios/bau_uniao.json';
import vigiliaSemCinzas from '../dados/cenarios/vigilia_sem_cinzas.json';
import { codigoDaArma } from '../logica/armas/tabela';
import { segundosEmPassos } from '../logica/nucleo/passos';
import { codigoDaPassiva } from '../logica/progressao/tabela';
import { CENARIO, LINHA_LIVRE, TODOS_OS_TUTORIAIS, type ParametrosDaVigilia } from '../logica/nucleo/estado';

/** O que se lê de uma receita (cenario.schema.json). */
export interface ReceitaDeCenario {
  readonly id: string;
  readonly linha_fixa: number | null;
  readonly jogador: { readonly invulneravel: boolean };
  readonly diretor_desligado: boolean;
  readonly tutoriais_vistos: boolean;
  readonly rotacao: number;
  /** Build inicial, na ordem das vagas (design/decisoes-F-004.md §5). */
  readonly armas: readonly { readonly arma: string; readonly nivel: number }[];
  /** false liga CENARIO.semCinzas (design/decisoes-F-005.md §5). */
  readonly cinzas: boolean;
  readonly passivas: readonly { readonly passiva: string; readonly nivel: number }[];
  readonly baus: readonly { readonly dx: number; readonly dy: number; readonly dourado: boolean }[];
  readonly xp_inicial: number;
  readonly relogio_inicial_s: number;
}

export const RECEITAS: readonly ReceitaDeCenario[] = [horda, hordaRotativa, semHorda, tresArmas, nivelTres, bauUniao, vigiliaSemCinzas];

/** Parâmetros da Vigília de um cenário (sem o TETO, que vem de ?teto ou da detecção). */
export function parametrosDoCenario(id: string): Omit<ParametrosDaVigilia, 'teto'> {
  const r = RECEITAS.find((x) => x.id === id);
  if (!r) throw new Error(`cenário desconhecido: ${id}`);
  return {
    tutoriaisVistos: r.tutoriais_vistos ? TODOS_OS_TUTORIAIS : 0,
    cenario:
      (r.jogador.invulneravel ? CENARIO.jogadorInvulneravel : 0) |
      (r.diretor_desligado ? CENARIO.diretorDesligado : 0) |
      (r.cinzas ? 0 : CENARIO.semCinzas),
    linhaFixa: r.linha_fixa ?? LINHA_LIVRE,
    rotacao: r.rotacao,
    armas: r.armas.map((a) => ({ codigo: codigoDaArma(a.arma), nivel: a.nivel })),
    passivas: r.passivas.map((p) => ({ codigo: codigoDaPassiva(p.passiva), nivel: p.nivel })),
    baus: r.baus,
    xpInicial: r.xp_inicial,
    relogioInicial: segundosEmPassos(r.relogio_inicial_s),
  };
}
