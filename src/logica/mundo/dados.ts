// Dados fixos de uma Vigília, montados uma vez a partir dos JSON da região,
// dos inimigos, das armas e do Vigilante: obstáculos (e a lista por célula),
// início, HP e velocidade do jogador, tipos de inimigo, a tabela das armas e a
// timeline do diretor compilada.
// Não mudam durante a Vigília e não ficam no estado; o estado guarda só a
// impressão da disposição (design/decisoes-F-002.md §2), que entra no hash.
import combate from '../../dados/combate.json';
import { criarTabelaDeArmas, type ArmaDoJson, type TabelaDeArmas } from '../armas/tabela';
import {
  criarTabelaDeProgressao,
  hpMaximo,
  type FontesDaProgressao,
  type TabelaDeProgressao,
  type VigilanteDaProgressao,
} from '../progressao/tabela';
import { compilarTimeline, type LinhaDoJson, type Timeline } from '../diretor/timeline';
import { PASSOS_POR_SEGUNDO, segundosEmPassos } from '../nucleo/passos';
import {
  criarObstaculos,
  criarObstaculosPorCelula,
  impressaoDaDisposicao,
  type ObstaculoDoJson,
  type Obstaculos,
  type ObstaculosPorCelula,
} from './obstaculos';
import {
  CORPO_PX,
  CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1,
  IDS_DE_TIPO,
  TIPO,
  codigoDoTipo,
  criarTiposDeInimigo,
  type InimigoDoJson,
  type TiposDeInimigo,
} from './tipos';


export interface DadosDaVigilia {
  readonly obstaculos: Obstaculos;
  /** Obstáculos por célula da grade, com alcance do maior raio de inimigo (decisoes-F-003 §2). */
  readonly obstaculosPorCelula: ObstaculosPorCelula;
  /** FNV-1a da disposição dos obstáculos (vai para o cabeçalho do estado). */
  readonly impressao: number;
  readonly inicioX: number;
  readonly inicioY: number;
  /** Deslocamento por passo com |v| = 1: 144 px/s ÷ 60 = 2,4 px com velocidade 1,0. */
  readonly velocidadePorPasso: number;
  /** HP inicial: hp × (1 + passiva), com o meio para cima (B §3.3: 130 × 1,15 → 150; decisoes-F-005 P3). */
  readonly hpInicial: number;
  readonly tipos: TiposDeInimigo;
  /** Armas por código e por nível, com a escala do Vigilante (design/decisoes-F-004.md §2). */
  readonly armas: TabelaDeArmas;
  /** XP, Cinzas, level up, baús, passivas e Uniões (design/decisoes-F-005.md). */
  readonly progressao: TabelaDeProgressao;
  readonly timeline: Timeline;
  /** Stamina, esquiva, aparo, congelamento, Poder, Postura Quebrada e os ataques dos inimigos (design/decisoes-F-006.md ET9). */
  readonly combate: TabelaDeCombate;
}

/**
 * Os números do combate, compilados uma vez de combate.json, vigilantes.json e
 * inimigos.json (ET9). Durações em passos inteiros; distâncias em px. Os dados
 * não entram no hash. Os arrays por tipo são indexados pelo código do tipo.
 */
export interface TabelaDeCombate {
  /** Capacidade da stamina (vigilantes.json); o teto de toda soma. */
  readonly staminaMax: number;
  readonly custoEsquiva: number;
  readonly custoAparo: number;
  readonly regeneracaoPorPasso: number;
  /** Passos sem regeneração depois de um gasto. */
  readonly esperaDoGasto: number;
  readonly devolucaoDoAparo: number;
  readonly esquivaDuracao: number;
  /** Primeiro e último passo com i-frames (contados do passo do comando = 1). */
  readonly esquivaIframesDe: number;
  readonly esquivaIframesAte: number;
  readonly esquivaRecuperacao: number;
  readonly esquivaDistancia: number;
  /** Deslocamento por passo da esquiva: distância ÷ duração (80 ÷ 21 = 3,8095 px). */
  readonly esquivaPorPasso: number;
  /** Último passo (depois do comando) em que o aparo protege: 11, ou 17 com a janela do tutorial. */
  readonly aparoLimite: number;
  readonly aparoLimiteEstendido: number;
  readonly aparoFalho: number;
  readonly congelamento: number;
  /** Poder da esquiva perfeita: % e passos. */
  readonly poderPct: number;
  readonly poderPassos: number;
  readonly posturaPassos: number;
  /** Raio da área da Postura Quebrada, de centro do jogador a borda do alvo. */
  readonly posturaRaio: number;
  readonly contraAtaquePassos: number;
  /** Multiplicador do dano contra o atordoado, em % (200 = ×2), antes do marco do nv4 (PQ7). */
  readonly posturaDanoPct: number;
  /** Fator do dano da salva extra do Contra-ataque (×2). */
  readonly contraFator: number;
  /** Por tipo: 1 se a Postura Quebrada o atinge. */
  readonly posturaQuebrada: Uint8Array;
  /** Por tipo: 1 se o ataque tem telegrafo branco (aparável). */
  readonly ataqueAparavel: Uint8Array;
  /** Por tipo, em passos: telegrafo, recuperação do golpe e intervalo do lançamento (0 = não tem). */
  readonly telegrafoPassos: Int32Array;
  readonly recuperacaoPassos: Int32Array;
  readonly intervaloPassos: Int32Array;
  /** Por tipo: alcance do arco em px (0 = sem arco) e dano bruto do ataque no minuto 0. */
  readonly alcanceDoArco: Float64Array;
  readonly danoDoAtaque: Float64Array;
  /** Por tipo: projétil (velocidade em px por passo, raio em px, vida em passos) e o Sal que aplica (% e passos). */
  readonly projetilPorPasso: Float64Array;
  readonly projetilRaio: Float64Array;
  readonly projetilVida: Int32Array;
  /** Por tipo: alcance de tiro em px, de centro a centro (0 = sem tiro; NV2). */
  readonly alcanceDeTiro: Float64Array;
  readonly salPct: Uint8Array;
  readonly salPassos: Int32Array;
}

/** O que se lê de combate.json (combate.schema.json). */
type CombateDoJson = typeof combate;

/** O que se lê do JSON da região (regiao.schema.json). */
export interface RegiaoDoJson {
  readonly inicio_jogador: { readonly x: number; readonly y: number };
  readonly obstaculos: readonly ObstaculoDoJson[];
  readonly sem_spawn_antes_do_marco_s: number;
  readonly linhas: readonly LinhaDoJson[];
}

/** O que se lê do Vigilante (vigilante.schema.json). */
export interface VigilanteDoJson extends VigilanteDaProgressao {
  readonly velocidade: number;
  /** Capacidade da stamina (o teto; design/decisoes-F-006.md ST1). */
  readonly stamina: number;
  readonly arma_inicial: string;
}

export function criarDadosDaVigilia(
  regiao: RegiaoDoJson,
  vigilante: VigilanteDoJson,
  inimigos: readonly InimigoDoJson[],
  armas: readonly ArmaDoJson[],
  progressao: FontesDaProgressao,
): DadosDaVigilia {
  const obstaculos = criarObstaculos(regiao.obstaculos);
  const timeline = compilarTimeline(regiao.linhas, regiao.sem_spawn_antes_do_marco_s);
  const tipos = tiposQueNascem(criarTiposDeInimigo(inimigos), timeline);
  const tabelaDeArmas = criarTabelaDeArmas(armas, vigilante.atributos, vigilante.arma_inicial);
  return {
    obstaculos,
    obstaculosPorCelula: criarObstaculosPorCelula(obstaculos, tipos.raioMaximo),
    impressao: impressaoDaDisposicao(obstaculos),
    inicioX: regiao.inicio_jogador.x,
    inicioY: regiao.inicio_jogador.y,
    velocidadePorPasso: (vigilante.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO,
    hpInicial: hpMaximo(vigilante.hp, vigilante.passiva.hp_max_pct),
    tipos,
    armas: tabelaDeArmas,
    progressao: criarTabelaDeProgressao(progressao, vigilante, tabelaDeArmas),
    timeline,
    combate: criarTabelaDeCombate(combate, vigilante.stamina, inimigos),
  };
}

/**
 * Compila combate.json e os ataques de inimigos.json na tabela do combate. O
 * `combate` é recebido para o teste poder trocá-lo; `criarDadosDaVigilia` passa
 * o JSON importado aqui, sem mudar a assinatura. Só o arco de 120° tem cosseno
 * literal no código: outro ângulo é erro de dados.
 */
export function criarTabelaDeCombate(c: CombateDoJson, staminaMax: number, inimigos: readonly InimigoDoJson[]): TabelaDeCombate {
  const n = IDS_DE_TIPO.length;
  const posturaQuebrada = new Uint8Array(n);
  const ataqueAparavel = new Uint8Array(n);
  const telegrafoPassos = new Int32Array(n);
  const recuperacaoPassos = new Int32Array(n);
  const intervaloPassos = new Int32Array(n);
  const alcanceDoArco = new Float64Array(n);
  const danoDoAtaque = new Float64Array(n);
  const projetilPorPasso = new Float64Array(n);
  const projetilRaio = new Float64Array(n);
  const projetilVida = new Int32Array(n);
  const alcanceDeTiro = new Float64Array(n);
  const salPct = new Uint8Array(n);
  const salPassos = new Int32Array(n);
  for (const i of inimigos) {
    const codigo = codigoDoTipo(i.id);
    posturaQuebrada[codigo] = i.postura_quebrada === false ? 0 : 1;
    for (const a of i.ataques ?? []) {
      if (a.forma === 'arco' && a.alcance_corpos != null && a.recuperacao_s != null) {
        if (a.angulo_graus !== 120) throw new Error(`${i.id}.${a.id}: só o arco de 120° tem cosseno literal`);
        alcanceDoArco[codigo] = a.alcance_corpos * CORPO_PX;
        recuperacaoPassos[codigo] = segundosEmPassos(a.recuperacao_s);
      } else if (a.forma === 'projetil' && a.intervalo_s != null && a.projetil?.raio_corpos != null && a.projetil.vida_s != null) {
        intervaloPassos[codigo] = segundosEmPassos(a.intervalo_s);
        projetilPorPasso[codigo] = (a.projetil.velocidade_corpos_s * CORPO_PX) / PASSOS_POR_SEGUNDO;
        projetilRaio[codigo] = a.projetil.raio_corpos * CORPO_PX;
        projetilVida[codigo] = segundosEmPassos(a.projetil.vida_s);
        if (i.id === 'novica_de_sal') alcanceDeTiro[codigo] = c.ataques_dos_inimigos.alcance_de_tiro_novica_corpos * CORPO_PX;
        if (a.aplica?.status === 'sal') {
          salPct[codigo] = a.aplica.fator_pct;
          salPassos[codigo] = segundosEmPassos(a.aplica.duracao_s);
        }
      } else continue;
      ataqueAparavel[codigo] = a.aparavel ? 1 : 0;
      telegrafoPassos[codigo] = segundosEmPassos(a.telegrafo.duracao_s);
      danoDoAtaque[codigo] = a.dano ?? 0;
      break;
    }
  }
  return {
    staminaMax,
    custoEsquiva: c.stamina.custo_esquiva,
    custoAparo: c.stamina.custo_aparo,
    regeneracaoPorPasso: c.stamina.regeneracao_por_passo,
    esperaDoGasto: c.stamina.espera_regeneracao_passos,
    devolucaoDoAparo: c.stamina.devolucao_do_aparo,
    esquivaDuracao: c.esquiva.duracao_passos,
    esquivaIframesDe: c.esquiva.iframes_primeiro_passo,
    esquivaIframesAte: c.esquiva.iframes_ultimo_passo,
    esquivaRecuperacao: c.esquiva.recuperacao_passos,
    esquivaDistancia: c.esquiva.distancia_px,
    esquivaPorPasso: c.esquiva.distancia_px / c.esquiva.duracao_passos,
    aparoLimite: c.aparo.janela_passos,
    aparoLimiteEstendido: c.aparo.janela_passos + c.aparo.janela_tutorial_extra_passos,
    aparoFalho: c.aparo.falho_passos,
    congelamento: c.congelamento_passos,
    poderPct: c.poder_da_esquiva_perfeita.pct,
    poderPassos: c.poder_da_esquiva_perfeita.duracao_passos,
    posturaPassos: c.postura_quebrada.duracao_passos,
    posturaRaio: c.postura_quebrada.raio_px,
    contraAtaquePassos: c.contra_ataque_passos,
    posturaDanoPct: c.postura_quebrada.dano_pct,
    contraFator: c.contra_ataque_fator,
    posturaQuebrada,
    ataqueAparavel,
    telegrafoPassos,
    recuperacaoPassos,
    intervaloPassos,
    alcanceDoArco,
    danoDoAtaque,
    projetilPorPasso,
    projetilRaio,
    projetilVida,
    alcanceDeTiro,
    salPct,
    salPassos,
  };
}

/**
 * Confere, no boot, os tipos que podem nascer nesta Vigília (design/decisoes-F-003.md §4):
 * os do roster e dos garantidos de todas as linhas e o Oco Grande (o convertido). Cada um
 * precisa de tamanho e comportamento de movimento; um número pendente (como o tamanho do
 * Coroado, da F-008) é erro aqui, e não no meio de um passo. O R_MAX sai desse conjunto.
 */
function tiposQueNascem(t: TiposDeInimigo, tl: Timeline): TiposDeInimigo {
  const codigos = new Set<number>([...tl.rosterTipo, ...tl.garantidoTipo, TIPO.oco_grande]);
  const existe = new Uint8Array(t.existe.length);
  let raioMaximo = 0;
  for (const c of codigos) {
    if (t.existe[c] !== 1) throw new Error(`tipo de inimigo sem tamanho ou sem comportamento de movimento: ${IDS_DE_TIPO[c]}`);
    existe[c] = 1;
    raioMaximo = Math.max(raioMaximo, t.raio[c]!);
  }
  // Fora do conjunto, existe = 0: nascerInimigo recusa o tipo, e nenhum corpo passa do R_MAX da separação e dos obstáculos.
  return { ...t, existe, raioMaximo };
}
