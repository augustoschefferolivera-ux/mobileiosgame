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
import ocoGrandeSozinho from '../dados/cenarios/oco_grande_sozinho.json';
import novicaSozinha from '../dados/cenarios/novica_sozinha.json';
import hordaComAtaques from '../dados/cenarios/horda_com_ataques.json';
import telegrafos from '../dados/cenarios/telegrafos.json';
import fogueiraHora1 from '../dados/cenarios/fogueira_hora1.json';
import marcoCoroado from '../dados/cenarios/marco_coroado.json';
import { codigoDaArma } from '../logica/armas/tabela';
import { segundosEmPassos } from '../logica/nucleo/passos';
import { codigoDoTipo } from '../logica/mundo/tipos';
import { codigoDaPassiva } from '../logica/progressao/tabela';
import { CENARIO, FOGUEIRA_F32, FOGUEIRA_U8, JOGADOR, JOGADOR2, JOGADOR4_U8, LINHA_LIVRE, TODOS_OS_TUTORIAIS, type Estado, type ParametrosDaVigilia } from '../logica/nucleo/estado';

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
  /** true liga CENARIO.ataques (decisoes-F-006 VT1); ausente = desligado. */
  readonly ataques_inimigos?: boolean;
  /** Inimigos postos no início, em px relativos ao início do jogador. */
  readonly inimigos?: readonly { readonly tipo: string; readonly dx: number; readonly dy: number }[];
  readonly stamina_inicial?: number;
  /** Relógio inicial em passos com a linha livre (como o ?inicio; design/decisoes-F-008.md CE1). */
  readonly inicio_livre_passos?: number;
  /** Almas no início, fora do meta (como o ?almas). */
  readonly almas_iniciais?: number;
  /** Fogueira acesa dentro do raio no início (design/decisoes-F-008.md CE1). */
  readonly fogueira?: { readonly hora: number; readonly dx: number; readonly hp_pct: number; readonly frascos: number };
}

export const RECEITAS: readonly ReceitaDeCenario[] = [
  horda,
  hordaRotativa,
  semHorda,
  tresArmas,
  nivelTres,
  bauUniao,
  vigiliaSemCinzas,
  ocoGrandeSozinho,
  novicaSozinha,
  hordaComAtaques,
  telegrafos,
  fogueiraHora1,
  marcoCoroado,
];

/** Parâmetros da Vigília de um cenário (sem o TETO, que vem de ?teto ou da detecção). */
export type ParametrosDoCenario = Omit<ParametrosDaVigilia, 'teto' | 'inimigos' | 'staminaInicial' | 'inicioLivre' | 'mancha' | 'almasIniciais'> &
  Partial<Pick<ParametrosDaVigilia, 'inimigos' | 'staminaInicial' | 'inicioLivre' | 'almasIniciais'>>;

export function parametrosDoCenario(id: string): ParametrosDoCenario {
  const r = RECEITAS.find((x) => x.id === id);
  if (!r) throw new Error(`cenário desconhecido: ${id}`);
  return {
    tutoriaisVistos: r.tutoriais_vistos ? TODOS_OS_TUTORIAIS : 0,
    cenario:
      (r.jogador.invulneravel ? CENARIO.jogadorInvulneravel : 0) |
      (r.diretor_desligado ? CENARIO.diretorDesligado : 0) |
      (r.cinzas ? 0 : CENARIO.semCinzas) |
      (r.ataques_inimigos ? CENARIO.ataques : 0),
    linhaFixa: r.linha_fixa ?? LINHA_LIVRE,
    rotacao: r.rotacao,
    armas: r.armas.map((a) => ({ codigo: codigoDaArma(a.arma), nivel: a.nivel })),
    passivas: r.passivas.map((p) => ({ codigo: codigoDaPassiva(p.passiva), nivel: p.nivel })),
    baus: r.baus,
    xpInicial: r.xp_inicial,
    relogioInicial: segundosEmPassos(r.relogio_inicial_s),
    // Só quando a receita os traz: um [] ou um valor a mais mudaria o que as receitas antigas comparam.
    ...(r.inimigos ? { inimigos: r.inimigos.map((i) => ({ codigo: codigoDoTipo(i.tipo), dx: i.dx, dy: i.dy })) } : {}),
    ...(r.stamina_inicial !== undefined ? { staminaInicial: r.stamina_inicial } : {}),
    // F-008 CE1: o relógio corre desde o início com a linha livre (os marcos começam sozinhos), e as Almas vêm da receita.
    ...(r.inicio_livre_passos !== undefined ? { relogioInicial: r.inicio_livre_passos, inicioLivre: true } : {}),
    ...(r.almas_iniciais !== undefined ? { almasIniciais: r.almas_iniciais } : {}),
  };
}

/**
 * Acende a Fogueira da receita `fogueira` no estado recém-criado (F-008 CE1): a hora, o ponto a `dx` px do jogador, o HP em %
 * do máximo e as cargas do Frasco. A etapa continua HORA: o 1º passo abre a Fogueira, como no jogo (evento 33, que grava o
 * `vigilia`). Não faz nada se a receita não tem `fogueira`.
 */
export function prepararFogueiraDoCenario(e: Estado, id: string): void {
  const f = RECEITAS.find((x) => x.id === id)?.fogueira;
  if (f === undefined) return;
  e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
  e.fogueiraU8[FOGUEIRA_U8.fogueiraHora] = f.hora;
  e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = e.jogador[JOGADOR.x]! + f.dx;
  e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = e.jogador[JOGADOR.y]!;
  e.jogador[JOGADOR.hp] = (e.jogador2[JOGADOR2.hpMax]! * f.hp_pct) / 100;
  e.jogador4U8[JOGADOR4_U8.frascoCargas] = f.frascos;
}
