// Dados fixos de uma Vigília, montados uma vez a partir dos JSON da região,
// dos inimigos, das armas e do Vigilante: obstáculos (e a lista por célula),
// início, HP e velocidade do jogador, tipos de inimigo, a tabela das armas e a
// timeline do diretor compilada.
// Não mudam durante a Vigília e não ficam no estado; o estado guarda só a
// impressão da disposição (design/decisoes-F-002.md §2), que entra no hash.
import chefes from '../../dados/chefes.json';
import combate from '../../dados/combate.json';
import { criarTabelaDeArmas, type ArmaDoJson, type TabelaDeArmas } from '../armas/tabela';
import {
  criarTabelaDeProgressao,
  hpMaximo,
  type FontesDaProgressao,
  type TabelaDeProgressao,
  type VigilanteDaProgressao,
} from '../progressao/tabela';
import { PASSOS_POR_MINUTO, compilarTimeline, type LinhaDoJson, type Timeline } from '../diretor/timeline';
import { PASSOS_POR_SEGUNDO, segundosEmPassos } from '../nucleo/passos';
import { FOLGA_DOS_GRANDES } from './grade';
import {
  criarObstaculos,
  criarObstaculosPorCelula,
  impressaoDaDisposicao,
  type ObstaculoDoJson,
  type Obstaculos,
  type ObstaculosPorCelula,
} from './obstaculos';
import {
  COMPORTAMENTO,
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
  /** Os marcos de 5, 10 e 15 minutos, o 20:00 e o 23:00 (design/decisoes-F-008.md AR1 e AR8). */
  readonly marcos: TabelaDeMarcos;
  /** Stamina, esquiva, aparo, congelamento, Poder, Postura Quebrada e os ataques dos inimigos (design/decisoes-F-006.md ET9). */
  readonly combate: TabelaDeCombate;
  /** O Lanterneiro, A Fome, o Amanhecer e a Fúria (design/decisoes-F-009.md). */
  readonly chefe: TabelaDoChefe;
}

/** Códigos de `inimigos.ataqueId` do Lanterneiro (AT1); 0 com a fase em telegrafo é o cast do Convocar (FS3). */
export const ATAQUE_DO_CHEFE = { convocar: 0, vara: 1, bater: 2, luzCega: 3, lanterna: 4, explosao: 5, agarrar: 6 } as const;

/**
 * Os números do Lanterneiro, compilados uma vez de chefes.json e de combate.json (`chefe`, `fome`, `amanhecer`, `furia`).
 * Durações em passos inteiros, distâncias em px. Os vetores por ataque são indexados por `ATAQUE_DO_CHEFE` (índice 0 sem uso).
 */
export interface TabelaDoChefe {
  readonly meiaLargura: number;
  readonly meiaAltura: number;
  /** Raio do círculo que contém a caixa: 80 (LN1). */
  readonly circunraio: number;
  /** Deslocamento por passo (velocidade × 4,5 × 32 ÷ 60 = 1,08 px). */
  readonly velocidade: number;
  readonly pararA: number;
  readonly nasceA: number;
  readonly recuperacaoInicial: number;
  readonly esperaPosQuebra: number;
  /** HP: `hpBase × (100 + hpPctPorNivel × nível)/100` (LN2). */
  readonly hpBase: number;
  readonly hpPctPorNivel: number;
  readonly almas: number;
  /** Limiares de HP em % do `hpMax` das fases 2 e 3 (FS1). */
  readonly limiarPct: Float64Array;
  readonly transicaoPassos: number;
  readonly posturaMax: number;
  readonly ganhoAparo: number;
  readonly ganhoEsquiva: number;
  readonly ganhoEspada: number;
  readonly ganhoPesada: number;
  readonly ganhoFaca: number;
  readonly quebraPassos: number;
  readonly regenEspera: number;
  /** Queda da Postura por passo depois da espera: `fround(regen_por_s/60)` (PO3). */
  readonly regenPorPasso: number;
  /** Fator do dano de arma em %: fora da Quebra 100 − Postura Firme (60); dentro, 200 (PO6). */
  readonly fatorForaPct: number;
  readonly fatorQuebraPct: number;
  readonly telegrafo: Int32Array;
  readonly recuperacao: Int32Array;
  readonly dano: Float64Array;
  readonly gatilho: Float64Array;
  readonly aparavel: Uint8Array;
  readonly convocaIntervalo: number;
  readonly convocaCast: number;
  readonly convocaRecuperacao: number;
  readonly convocaPrimeira: number;
  readonly explosaoIntervalo: number;
  readonly explosaoPrimeira: number;
  readonly explosaoRaioIni: number;
  readonly explosaoRaioFim: number;
  readonly explosaoMeiaEspessura: number;
  readonly cegoPassos: number;
  readonly tickPassos: number;
  /** Dano bruto de um tick: `dano_por_s × tickPassos / 60` (AT3, AT5). */
  readonly tickCego: number;
  readonly tickZona: number;
  readonly zonaPassos: number;
  readonly zonaRaio: number;
  readonly zonasMaximas: number;
  readonly agarrarPct: number;
  readonly presoPassos: number;
  readonly furiaInicio: number;
  readonly furiaIntervalo: number;
  readonly furiaPct: number;
  readonly fomeTick: number;
  readonly fomeBase: number;
  readonly fomeDivisor: number;
  readonly amanhecerPassos: number;
}

/** O que se lê de `marco` numa linha da região (regiao.schema.json). */
export interface MarcoDoJson {
  readonly tipo: string;
  readonly indice: number;
  readonly inimigos: readonly { readonly inimigo: string; readonly hp_base: number; readonly quantidade: number }[];
  readonly bau: string;
}

/**
 * Os marcos da região, compilados uma vez (AR1): o relógio em que cada um começa (minuto da linha × 3.600), quantos
 * Coroados nascem, o `hp_base` da linha de marco (CR6) e se o baú é dourado, mais o 20:00 (a linha com `chefe`, AR8)
 * e o 23:00 (`a_fome_em_s`) do gancho da F-009. Vetores indexados pelo marco k (0 a 2).
 */
export interface TabelaDeMarcos {
  readonly n: number;
  readonly limiar: Uint32Array;
  readonly coroados: Uint8Array;
  readonly hpBase: Uint16Array;
  readonly dourado: Uint8Array;
  /** Relógio em que a etapa vira CHEFE (20:00 = 72.000) e em que vira A_FOME (23:00 = 82.800). */
  readonly chefeEm: number;
  readonly aFomeEm: number;
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
  /** O Frasco (vigilantes.json): cargas, cura em % do hpMax, duração da cura e espera da regeneração em passos, limiar de interrupção em % do hpMax. */
  readonly frascoCargas: number;
  readonly frascoCuraPct: number;
  readonly frascoPassos: number;
  readonly frascoInterrompePct: number;
  readonly frascoEsperaRegen: number;
  /** Passos que um novo toque no botão precisa durar para cancelar a cura (combate.json). */
  readonly frascoCancelarPassos: number;
  /** Brasa Firme (vigilantes.json): redução do dano em % e o limiar da stamina em % de `staminaMax` (estrito, `>`). */
  readonly brasaFirmeReducaoPct: number;
  readonly brasaFirmeStaminaPct: number;
  /** Tabelados na carga (DM1, DM2): o fator do dano com Brasa Firme (0,8) e o limiar estrito da stamina (50). */
  readonly brasaFirmeFator: number;
  readonly brasaFirmeLimiar: number;
  /** Apagar: passos de APAGANDO e o fator do `deltaMs` do driver (só apresentação). */
  readonly apagarPassos: number;
  readonly apagarFator: number;
  /** Mancha: % das Almas, raio de encosto e margem da zona proibida, em px. */
  readonly manchaPct: number;
  readonly manchaRaio: number;
  readonly manchaMargem: number;
  /** Telemetria de dano recebido: janela do contato em passos e teto de linhas por fonte. */
  readonly telemetriaAgregacaoPassos: number;
  readonly telemetriaTeto: number;
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
  /**
   * Grito do Coroado, por tipo (CR3; 0 = o tipo não tem): raio da área em px (96), telegrafo e recuperação em passos
   * (60 e 90), parte do dano do slot em % (50) e o empurrão em px totais (64) repartidos em tantos passos (8).
   */
  readonly gritoRaio: Float64Array;
  readonly gritoTelegrafoPassos: Int32Array;
  readonly gritoRecuperacaoPassos: Int32Array;
  readonly gritoDanoPct: Float64Array;
  readonly gritoEmpurraoPx: Float64Array;
  readonly gritoEmpurraoPassos: Int32Array;
  /** Convocação por tipo (CR7; passos 0 = o tipo não convoca): período em passos (600), quantidade (10), anel em px (80) e o tipo dos convocados. */
  readonly convocaPassos: Int32Array;
  readonly convocaQuantidade: Int32Array;
  readonly convocaAnel: Float64Array;
  readonly convocaTipo: Uint8Array;
  /** Arena do marco (AR2): raio em px (224). */
  readonly arenaRaio: number;
  /** Fogueira: raio em que abre (64) e distância do jogador em que acende no fim do marco (96), em px (FG1, FG2). */
  readonly fogueiraRaio: number;
  readonly fogueiraDistancia: number;
  /** Passos entre dois saves `andamento` (SV3): 3.600 = 60 s. */
  readonly autosavePassos: number;
}

/** O que se lê de combate.json (combate.schema.json). */
type CombateDoJson = typeof combate;

/** O que se lê do JSON da região (regiao.schema.json). */
export interface RegiaoDoJson {
  readonly inicio_jogador: { readonly x: number; readonly y: number };
  readonly obstaculos: readonly ObstaculoDoJson[];
  readonly sem_spawn_antes_do_marco_s: number;
  /** Segundos de relógio em que começa A Fome (23:00 = 1.380). */
  readonly a_fome_em_s: number;
  readonly linhas: readonly LinhaDoJson[];
}

/** O que se lê do Vigilante (vigilante.schema.json). */
export interface VigilanteDoJson extends VigilanteDaProgressao {
  readonly velocidade: number;
  /** O Frasco (cargas, cura, duração, limiar de interrupção e espera da stamina; decisoes-F-007 FR). */
  readonly frascos: {
    readonly cargas: number;
    readonly cura_pct: number;
    readonly duracao_s: number;
    readonly interrompe_acima_pct_hp: number;
    readonly sem_regen_stamina_s: number;
  };
  /** A Brasa Firme (decisoes-F-007 DM1 e DM2): a redução do dano e a condição de stamina, em %. */
  readonly passiva: {
    readonly hp_max_pct: number;
    readonly reducao_dano_pct: number;
    readonly condicao_stamina_acima_pct: number;
  };
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
  const marcos = criarTabelaDeMarcos(regiao);
  const chefe = criarTabelaDoChefe(chefes, combate);
  const tipos = comOChefe(tiposQueNascem(criarTiposDeInimigo(inimigos), timeline, marcos), chefe);
  const tabelaDeArmas = criarTabelaDeArmas(armas, vigilante.atributos, vigilante.arma_inicial);
  return {
    obstaculos,
    obstaculosPorCelula: criarObstaculosPorCelula(obstaculos, tipos.raioDeObstaculo),
    impressao: impressaoDaDisposicao(obstaculos),
    inicioX: regiao.inicio_jogador.x,
    inicioY: regiao.inicio_jogador.y,
    velocidadePorPasso: (vigilante.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO,
    hpInicial: hpMaximo(vigilante.hp, vigilante.passiva.hp_max_pct),
    tipos,
    armas: tabelaDeArmas,
    progressao: criarTabelaDeProgressao(progressao, vigilante, tabelaDeArmas),
    timeline,
    marcos,
    combate: criarTabelaDeCombate(combate, vigilante, inimigos),
    chefe,
  };
}

export function criarTabelaDeMarcos(regiao: RegiaoDoJson): TabelaDeMarcos {
  const limiar: number[] = [];
  const coroados: number[] = [];
  const hpBase: number[] = [];
  const dourado: number[] = [];
  let chefeEm = -1;
  for (const l of regiao.linhas) {
    if (l.chefe !== undefined && chefeEm < 0) chefeEm = l.minuto * PASSOS_POR_MINUTO;
    const m = l.marco as MarcoDoJson | undefined;
    if (m === undefined || m === null) continue;
    if (m.inimigos.length !== 1 || m.inimigos[0]!.inimigo !== 'oco_grande_coroado') throw new Error(`marco da linha ${l.minuto}: só o Coroado nasce na F-008`);
    limiar.push(l.minuto * PASSOS_POR_MINUTO);
    coroados.push(m.inimigos[0]!.quantidade);
    hpBase.push(m.inimigos[0]!.hp_base);
    dourado.push(m.bau === 'dourado' ? 1 : 0);
  }
  if (limiar.length > 3) throw new Error('marcos: a máquina de etapas tem 3 marcos (marcosIniciados, 0 a 3)');
  if (chefeEm < 0) throw new Error('região sem linha de chefe: falta o 20:00 (AR8)');
  return {
    n: limiar.length,
    limiar: Uint32Array.from(limiar),
    coroados: Uint8Array.from(coroados),
    hpBase: Uint16Array.from(hpBase),
    dourado: Uint8Array.from(dourado),
    chefeEm,
    aFomeEm: regiao.a_fome_em_s * PASSOS_POR_SEGUNDO,
  };
}

/**
 * Compila combate.json e os ataques de inimigos.json na tabela do combate. O
 * `combate` é recebido para o teste poder trocá-lo; `criarDadosDaVigilia` passa
 * o JSON importado aqui, sem mudar a assinatura. Só o arco de 120° tem cosseno
 * literal no código: outro ângulo é erro de dados.
 */
export function criarTabelaDeCombate(c: CombateDoJson, vigilante: VigilanteDoJson, inimigos: readonly InimigoDoJson[]): TabelaDeCombate {
  const staminaMax = vigilante.stamina;
  const fr = vigilante.frascos;
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
  const gritoRaio = new Float64Array(n);
  const gritoTelegrafoPassos = new Int32Array(n);
  const gritoRecuperacaoPassos = new Int32Array(n);
  const gritoDanoPct = new Float64Array(n);
  const gritoEmpurraoPx = new Float64Array(n);
  const gritoEmpurraoPassos = new Int32Array(n);
  const convocaPassos = new Int32Array(n);
  const convocaQuantidade = new Int32Array(n);
  const convocaAnel = new Float64Array(n);
  const convocaTipo = new Uint8Array(n);
  for (const i of inimigos) {
    const codigo = codigoDoTipo(i.id);
    posturaQuebrada[codigo] = i.postura_quebrada === false ? 0 : 1;
    if (i.convoca !== undefined && i.convoca.intervalo_s != null) {
      convocaPassos[codigo] = segundosEmPassos(i.convoca.intervalo_s);
      convocaQuantidade[codigo] = i.convoca.quantidade;
      convocaAnel[codigo] = (i.convoca.anel_corpos ?? 0) * CORPO_PX;
      convocaTipo[codigo] = codigoDoTipo(i.convoca.inimigo);
    }
    for (const a of i.ataques ?? []) {
      if (a.forma === 'area_circular' && a.raio_corpos != null && a.dano_pct != null && a.empurrao?.distancia_corpos != null && a.empurrao.passos != null && a.recuperacao_s != null) {
        // O Grito (CR3): círculo em volta do centro, vermelho, não aparável; o Coroado tem também a Patada, que vem do ramo abaixo.
        gritoRaio[codigo] = a.raio_corpos * CORPO_PX;
        gritoTelegrafoPassos[codigo] = segundosEmPassos(a.telegrafo.duracao_s);
        gritoRecuperacaoPassos[codigo] = segundosEmPassos(a.recuperacao_s);
        gritoDanoPct[codigo] = a.dano_pct;
        gritoEmpurraoPx[codigo] = a.empurrao.distancia_corpos * CORPO_PX;
        gritoEmpurraoPassos[codigo] = a.empurrao.passos;
        continue;
      }
      if ((a.forma === 'arco' || a.forma === 'cone') && a.alcance_corpos != null && a.recuperacao_s != null) {
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
    frascoCargas: fr.cargas,
    frascoCuraPct: fr.cura_pct,
    frascoPassos: segundosEmPassos(fr.duracao_s),
    frascoInterrompePct: fr.interrompe_acima_pct_hp,
    frascoEsperaRegen: segundosEmPassos(fr.sem_regen_stamina_s),
    frascoCancelarPassos: c.frasco.cancelar_segurando_passos,
    brasaFirmeReducaoPct: vigilante.passiva.reducao_dano_pct,
    brasaFirmeStaminaPct: vigilante.passiva.condicao_stamina_acima_pct,
    brasaFirmeFator: 1 - vigilante.passiva.reducao_dano_pct / 100,
    brasaFirmeLimiar: (staminaMax * vigilante.passiva.condicao_stamina_acima_pct) / 100,
    apagarPassos: c.apagar.duracao_passos,
    apagarFator: c.apagar.camera_lenta_fator,
    manchaPct: c.mancha.pct_das_almas,
    manchaRaio: c.mancha.raio_px,
    manchaMargem: c.mancha.margem_dos_obstaculos_px,
    telemetriaAgregacaoPassos: segundosEmPassos(c.telemetria.agregacao_do_contato_s),
    telemetriaTeto: c.telemetria.teto_por_fonte,
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
    gritoRaio,
    gritoTelegrafoPassos,
    gritoRecuperacaoPassos,
    gritoDanoPct,
    gritoEmpurraoPx,
    gritoEmpurraoPassos,
    convocaPassos,
    convocaQuantidade,
    convocaAnel,
    convocaTipo,
    arenaRaio: c.arena.raio_px,
    fogueiraRaio: c.fogueira.raio_px,
    fogueiraDistancia: c.fogueira.distancia_px,
    autosavePassos: c.fogueira.autosave_passos,
  };
}

/**
 * Confere, no boot, os tipos que podem nascer nesta Vigília (design/decisoes-F-003.md §4):
 * os do roster e dos garantidos de todas as linhas e o Oco Grande (o convertido). Cada um
 * precisa de tamanho e comportamento de movimento; um número pendente (como o tamanho do
 * Coroado, da F-008) é erro aqui, e não no meio de um passo. O R_MAX sai desse conjunto.
 */
function tiposQueNascem(t: TiposDeInimigo, tl: Timeline, marcos: TabelaDeMarcos): TiposDeInimigo {
  // O Coroado nasce pelos marcos (F-008), e não pelo roster; os convocados do Coroado são Ocos das Lanternas, que já estão no roster.
  const codigos = new Set<number>([...tl.rosterTipo, ...tl.garantidoTipo, TIPO.oco_grande]);
  if (marcos.n > 0) codigos.add(TIPO.oco_grande_coroado);
  const existe = new Uint8Array(t.existe.length);
  let raioMaximo = 0;
  let raioDeObstaculo = 0;
  for (const c of codigos) {
    if (t.existe[c] !== 1) throw new Error(`tipo de inimigo sem tamanho ou sem comportamento de movimento: ${IDS_DE_TIPO[c]}`);
    existe[c] = 1;
    if (t.grande[c] === 0) raioMaximo = Math.max(raioMaximo, t.raio[c]!);
    raioDeObstaculo = Math.max(raioDeObstaculo, t.raio[c]!);
  }
  // As consultas somam R_MAX às formas das armas e acrescentam os grandes com a folga fixa de 8 px (CR10): um raio maior que isso não se alcança.
  if (raioDeObstaculo > raioMaximo + FOLGA_DOS_GRANDES) throw new Error(`corpo grande demais: raio ${raioDeObstaculo} px, o máximo é ${raioMaximo + FOLGA_DOS_GRANDES}`);
  // Fora do conjunto, existe = 0: nascerInimigo recusa o tipo, e nenhum corpo passa do R_MAX da separação e do raio dos obstáculos.
  return { ...t, existe, raioMaximo, raioDeObstaculo };
}

type ChefesDoJson = typeof chefes;

/** Compila o Lanterneiro (`chefes.json`) e os blocos `chefe`, `fome`, `amanhecer` e `furia` de combate.json. */
export function criarTabelaDoChefe(j: ChefesDoJson, c: CombateDoJson): TabelaDoChefe {
  const ch = j.chefes[0]!;
  const k = c.chefe;
  const fases = ch.fases as readonly { readonly limiar_hp_pct: number; readonly ataques: readonly Record<string, unknown>[] }[];
  const ataque = (id: string): Record<string, unknown> => {
    for (const f of fases) for (const a of f.ataques) if (a['id'] === id) return a;
    throw new Error(`chefes.json: falta o ataque ${id}`);
  };
  const n = 7;
  const telegrafo = new Int32Array(n);
  const recuperacao = new Int32Array(n);
  const dano = new Float64Array(n);
  const gatilho = new Float64Array(n);
  const aparavel = new Uint8Array(n);
  const por: readonly (readonly [number, string, number])[] = [
    [ATAQUE_DO_CHEFE.vara, 'vara_horizontal', k.gatilho_px.vara],
    [ATAQUE_DO_CHEFE.bater, 'bater_a_vara', k.gatilho_px.bater],
    [ATAQUE_DO_CHEFE.luzCega, 'luz_cega', k.gatilho_px.luz_cega],
    [ATAQUE_DO_CHEFE.lanterna, 'lanterna_arremessada', k.gatilho_px.lanterna],
    [ATAQUE_DO_CHEFE.explosao, 'explosao_de_luz', 0],
    [ATAQUE_DO_CHEFE.agarrar, 'agarrar', k.gatilho_px.agarrar],
  ];
  for (const [codigo, id, g] of por) {
    const a = ataque(id);
    telegrafo[codigo] = segundosEmPassos((a['telegrafo'] as { duracao_s: number }).duracao_s);
    recuperacao[codigo] = segundosEmPassos(a['recuperacao_s'] as number);
    dano[codigo] = (a['dano'] as number | null) ?? 0;
    gatilho[codigo] = g;
    aparavel[codigo] = a['aparavel'] === true ? 1 : 0;
  }
  const luz = ataque('luz_cega');
  const lanterna = ataque('lanterna_arremessada');
  const explosao = ataque('explosao_de_luz');
  const agarrar = ataque('agarrar')['agarrar'] as { dano_hp_pct: number; preso_s: number };
  const convoca = (fases[1] as unknown as { convoca: { intervalo_s: number } }).convoca;
  const meiaLargura = ch.largura_px / 2;
  const meiaAltura = ch.altura_px / 2;
  const tick = k.tick_passos;
  return {
    meiaLargura,
    meiaAltura,
    circunraio: Math.sqrt(meiaLargura * meiaLargura + meiaAltura * meiaAltura),
    velocidade: (ch.velocidade * CORPOS_POR_SEGUNDO_NA_VELOCIDADE_1 * CORPO_PX) / PASSOS_POR_SEGUNDO,
    pararA: k.parar_a_px,
    nasceA: k.nasce_a_px,
    recuperacaoInicial: k.recuperacao_inicial_passos,
    esperaPosQuebra: k.espera_pos_quebra_passos,
    hpBase: ch.hp_base,
    hpPctPorNivel: Math.round(ch.hp_escala_por_nivel * 100),
    almas: ch.almas,
    limiarPct: Float64Array.from([fases[1]!.limiar_hp_pct, fases[2]!.limiar_hp_pct]),
    transicaoPassos: k.transicao_passos,
    posturaMax: ch.postura.max,
    ganhoAparo: ch.postura.ganho_aparo,
    ganhoEsquiva: ch.postura.ganho_esquiva_perfeita,
    ganhoEspada: ch.postura.ganho_acerto_espada,
    ganhoPesada: ch.postura.ganho_acerto_pesada,
    ganhoFaca: ch.postura.ganho_faca,
    quebraPassos: segundosEmPassos(ch.postura.quebra_s),
    regenEspera: ch.postura.regen_espera_passos,
    regenPorPasso: Math.fround(ch.postura.regen_por_s / PASSOS_POR_SEGUNDO),
    fatorForaPct: 100 - ch.postura_firme_reducao_pct,
    fatorQuebraPct: ch.postura.quebra_mult_dano * 100,
    telegrafo,
    recuperacao,
    dano,
    gatilho,
    aparavel,
    convocaIntervalo: segundosEmPassos(convoca.intervalo_s),
    convocaCast: k.convocar.cast_passos,
    convocaRecuperacao: k.convocar.recuperacao_passos,
    convocaPrimeira: k.convocar.primeira_na_fase_2_passos,
    explosaoIntervalo: segundosEmPassos(explosao['intervalo_s'] as number),
    explosaoPrimeira: k.explosao.primeira_na_fase_3_passos,
    explosaoRaioIni: (explosao['raio_inicial_corpos'] as number) * CORPO_PX,
    explosaoRaioFim: (explosao['raio_final_corpos'] as number) * CORPO_PX,
    explosaoMeiaEspessura: k.explosao.meia_espessura_px,
    cegoPassos: segundosEmPassos(luz['duracao_efeito_s'] as number),
    tickPassos: tick,
    tickCego: ((luz['dano_por_s'] as number) * tick) / PASSOS_POR_SEGUNDO,
    tickZona: ((lanterna['dano_por_s'] as number) * tick) / PASSOS_POR_SEGUNDO,
    zonaPassos: segundosEmPassos(lanterna['duracao_efeito_s'] as number),
    zonaRaio: (lanterna['raio_corpos'] as number) * CORPO_PX,
    zonasMaximas: k.zonas_maximas,
    agarrarPct: agarrar.dano_hp_pct,
    presoPassos: segundosEmPassos(agarrar.preso_s),
    furiaInicio: c.furia.inicio_relogio,
    furiaIntervalo: segundosEmPassos(ch.furia.intervalo_s),
    furiaPct: ch.furia.dano_pct,
    fomeTick: c.fome.tick_passos,
    fomeBase: c.fome.base,
    fomeDivisor: c.fome.divisor,
    amanhecerPassos: c.amanhecer.duracao_passos,
  };
}

/**
 * Acrescenta o Lanterneiro (tipo 5) à tabela de tipos: corpo grande de raio = circunraio da caixa (80), que nasce pelo
 * `surgirChefe` e não pelo diretor, persegue (para a `pararA`) e não fere por contato. Fora das consultas de obstáculo
 * (`raioDeObstaculo`): a arena tira todo obstáculo a ≤ 224 + r do jogador, onde ele ainda cabe. A folga das consultas
 * das armas vem de `FOLGAS_DOS_GRANDES` (raio − R_MAX), preenchida por `montarGradeDaMassa`.
 */
function comOChefe(t: TiposDeInimigo, chefe: TabelaDoChefe): TiposDeInimigo {
  const c = TIPO.o_lanterneiro;
  const existe = Uint8Array.from(t.existe);
  const raio = Float64Array.from(t.raio);
  const velocidade = Float64Array.from(t.velocidade);
  const distancia = Float64Array.from(t.distancia);
  const comportamento = Uint8Array.from(t.comportamento);
  const grande = Uint8Array.from(t.grande);
  existe[c] = 1;
  raio[c] = chefe.circunraio;
  velocidade[c] = chefe.velocidade;
  distancia[c] = chefe.pararA;
  comportamento[c] = COMPORTAMENTO.pararADistancia;
  grande[c] = 1;
  return { ...t, existe, raio, velocidade, distancia, comportamento, grande };
}
