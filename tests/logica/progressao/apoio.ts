// Apoio dos testes da progressão (design/decisoes-F-005.md §8): Cinzas e baús
// postos relativos ao jogador, a leitura da oferta e um estado com build e
// passivas dados.
import { ARMA } from '../../../src/logica/armas/tabela';
import { CENARIO, PROGRESSAO, TIPO_DE_CARTA, TIPO_DE_PICKUP, TODOS_OS_TUTORIAIS, criarEstado, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { alocar } from '../../../src/logica/nucleo/pool';
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, normalizarNoToro } from '../../../src/logica/mundo/toro';
import { PASSIVA } from '../../../src/logica/progressao/tabela';
import { DADOS_BRUTOS } from '../apoio';
import { J } from '../armas/apoio';

export { J };
/** Sem obstáculos e sem Brasa Firme: os testes da F-005 medem o dano bruto (o líquido tem testes próprios). */
export const D = DADOS_BRUTOS;
export const ESPADA = ARMA.espada_longa_do_juramento;
export const FACAS = ARMA.facas_de_sal;
export const CIRCULO = ARMA.circulo_de_sal;
export const LAMINA = ARMA.lamina_do_juramento_eterno;
export const ELMO = PASSIVA.elmo_sem_rosto;
export const LUVAS = PASSIVA.luvas_de_fole;

/** Estado sem diretor, jogador invulnerável e parado, com armas e passivas ([código, nível]). */
export function estadoDe(
  armas: readonly (readonly [number, number])[],
  passivas: readonly (readonly [number, number])[] = [],
  extra: Partial<ParametrosDaVigilia> = {},
  seed = 1,
  dados: DadosDaVigilia = D,
): Estado {
  return criarEstado(seed, dados, {
    cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel,
    tutoriaisVistos: TODOS_OS_TUTORIAIS,
    armas: armas.map(([codigo, nivel]) => ({ codigo, nivel })),
    passivas: passivas.map(([codigo, nivel]) => ({ codigo, nivel })),
    ...extra,
  });
}

/** Põe um pickup a (dx, dy) do jogador e devolve o slot. */
export function pickupEm(e: Estado, dx: number, dy: number, tipo: number, valor: number): number {
  const s = alocar(e.poolDePickups);
  if (s < 0) throw new Error('pool de pickups cheio');
  const p = e.pickups;
  p.x[s] = p.xAnt[s] = normalizarNoToro(J.x + dx, W);
  p.y[s] = p.yAnt[s] = normalizarNoToro(J.y + dy, H);
  p.valor[s] = valor;
  p.tipo[s] = tipo;
  return s;
}

export function cinzaEm(e: Estado, dx: number, dy: number, valor = 1): number {
  return pickupEm(e, dx, dy, TIPO_DE_PICKUP.cinza, valor);
}

/** A oferta aberta como [tipo, item] por carta. */
export function oferta(e: Estado): [number, number][] {
  return [0, 1, 2].map((k) => [e.oferta.tipo[k]!, e.oferta.item[k]!]);
}

export const CARTA = TIPO_DE_CARTA;
export const P = PROGRESSAO;
