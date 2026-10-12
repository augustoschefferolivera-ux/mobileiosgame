// Apoio dos testes das armas (design/decisoes-F-004.md §8): estado sem
// diretor e sem obstáculos, com o jogador parado em (585, 1.266), inimigos
// postos relativos a ele e os eventos do anel lidos como objetos.
import { CENARIO, TODOS_OS_TUTORIAIS, criarEstado, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { EV, eventosEscritos, inicioDoEvento } from '../../../src/logica/nucleo/eventos';
import type { DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, normalizarNoToro } from '../../../src/logica/mundo/toro';
import { DADOS_SEM_OBSTACULOS } from '../apoio';

/** Posição inicial do jogador na Charneca (e na região sem obstáculos). */
export const J = { x: 585, y: 1266 } as const;

/** Estado sem diretor, jogador invulnerável e parado, com as armas dadas ([código, nível]). */
export function estadoCom(armas: readonly (readonly [number, number])[], dados: DadosDaVigilia = DADOS_SEM_OBSTACULOS, extra: Partial<ParametrosDaVigilia> = {}): Estado {
  return criarEstado(1, dados, {
    cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel,
    tutoriaisVistos: TODOS_OS_TUTORIAIS,
    armas: armas.map(([codigo, nivel]) => ({ codigo, nivel })),
    ...extra,
  });
}

/** Nasce um inimigo a (dx, dy) do jogador e devolve o slot. */
export function por(e: Estado, tipo: number, dx: number, dy: number, dados: DadosDaVigilia = DADOS_SEM_OBSTACULOS): number {
  const s = nascerInimigo(e, dados, tipo, normalizarNoToro(J.x + dx, W), normalizarNoToro(J.y + dy, H), false);
  if (s < 0) throw new Error('pool cheio');
  return s;
}

export interface EventoLido {
  passo: number;
  tipo: number;
  arma: number;
  forma: number;
  /** Handle do alvo, ou 0xFFFFFFFF. */
  alvo: number;
  slot: number;
  inimigo: number;
  flags: number;
  causa: number;
  f: [number, number, number, number];
}

/** Eventos escritos a partir do número `desde` (os últimos 1.024 no máximo). */
export function eventos(e: Estado, desde = 0): EventoLido[] {
  const n = eventosEscritos(e.eventos);
  const lista: EventoLido[] = [];
  for (let k = Math.max(desde, n - 1024); k < n; k++) {
    const i = inicioDoEvento(k);
    const u = e.eventos.u32;
    const f = e.eventos.f32;
    const taf = u[i + EV.tipoArmaForma]!;
    const ifc = u[i + EV.inimigoFlagsCausa]!;
    lista.push({
      passo: u[i + EV.passo]!,
      tipo: taf & 0xff,
      arma: (taf >>> 8) & 0xff,
      forma: (taf >>> 16) & 0xff,
      alvo: u[i + EV.alvo]!,
      slot: u[i + EV.alvo]! & 0xffff,
      inimigo: ifc & 0xff,
      flags: (ifc >>> 8) & 0xff,
      causa: (ifc >>> 16) & 0xff,
      f: [f[i + EV.floats]!, f[i + EV.floats + 1]!, f[i + EV.floats + 2]!, f[i + EV.floats + 3]!],
    });
  }
  return lista;
}

/** Posição de um inimigo relativa ao jogador. */
export function rel(e: Estado, s: number): { dx: number; dy: number; d: number } {
  let dx = e.inimigos.x[s]! - J.x;
  let dy = e.inimigos.y[s]! - J.y;
  if (dx > W / 2) dx -= W;
  if (dx < -W / 2) dx += W;
  if (dy > H / 2) dy -= H;
  if (dy < -H / 2) dy += H;
  return { dx, dy, d: Math.hypot(dx, dy) };
}
