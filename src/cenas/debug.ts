// window.__GAME_DEBUG__ (B §3.13; ADR-0002 §14; ADR-0004 §7; design/decisoes-F-003.md §8;
// design/decisoes-F-004.md §8: build, números de dano, últimos eventos, mortes, pausa e opções;
// design/decisoes-F-005.md: progressão, level up, baú, pickups e ondas).
// Sempre presente e só de leitura; os ganchos de escrita (pausar, retomar,
// avancar, entrada.injetar, entrada.roteiro e removerInimigo) e as leituras
// pesadas (quadros, inimigos, hashPorSecao) só existem no build de debug. Os campos dos sistemas
// que ainda não existem entram com as suas features (stamina, chefe, save,
// degradacao, build...).
import type Phaser from 'phaser';
import { fonteConstante, fonteDoRoteiro, validarAcoes, validarRoteiro, type AcaoDeRoteiro, type Roteiro } from '../logica/nucleo/comandos';
import {
  BAU, BYTES_ESTADO, CAB, CAPACIDADE_DE_EFEITOS, FASE, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PICKUPS, CAPACIDADE_DE_PROJETEIS, CARTAS, CATEGORIA_DE_ITEM, JOGADOR, JOGADOR2, JOGADOR3, JOGADOR3_U8, JOGADOR_U8,
  FOGUEIRA_U8, MUNDO, MUNDO2, PROGRESSAO, JOGADOR3_U16, TIPO_DE_CARTA, TIPO_DE_PROJETIL, TIPO_DE_PICKUP, VAGAS_DE_ARMA, VAGAS_DE_PASSIVA, hashEstado, hashPorSecao, type Estado,
} from '../logica/nucleo/estado';
import { BYTES_DO_ANEL, EV, FLAG, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { quantosAtivos } from '../logica/nucleo/pool';
import { escalaDeTempo } from '../logica/nucleo/cameraLenta';
import { ATRIBUTOS, IDS_DE_ARMA } from '../logica/armas/tabela';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';
import { armadura, poderPct } from '../logica/progressao/dano';
import { bauNaFrente, modalAberto } from '../logica/progressao/modal';
import { completaUniao } from '../logica/progressao/oferta';
import { MEMBROS_DAS_ARMAS, MEMBROS_DOS_DIGITOS } from './render/armas';
import { MEMBROS_DOS_MEDIOS, MEMBROS_DOS_PROJETEIS_INIMIGOS, MEMBROS_DOS_TELEGRAFOS } from './render/ataques';
import { MEMBROS_DO_MUNDO } from './render/pickups';
import { CAPACIDADE_DE_MORTES } from './render/efeitos';
import { alvoDaLinha, convertidosVivos, linhaCorrente, vivosEquivalentes } from '../logica/diretor/diretor';
import { removerInimigo } from '../logica/mundo/inimigos';
import { IDS_DE_TIPO } from '../logica/mundo/tipos';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { Teto } from '../plataforma/teto';
import type { Quadro } from './medidas';
import { FLOATS_POR_MEMBRO, HordaPorGPU } from './render/escritores';
import { TIPO_DE_TOQUE } from '../entrada/filaDeToques';
import { hex8 } from '../logica/nucleo/hash';
import { avancar } from '../logica/nucleo/passo';
import { atributosDe, bytesDoBackbuffer } from '../plataforma/memoria';
import type { Insets } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';

/** Tipos de entidade de `vivos` (ADR-0002 §14); os de inimigo contam o pool desde a F-003. */
const TIPOS_VIVOS = [
  'oco_das_lanternas', 'oco_grande', 'novica_de_sal', 'oco_grande_coroado', 'o_lanterneiro',
  'projeteis', 'efeitos', 'pickups', 'particulas',
] as const;
type TipoVivo = (typeof TIPOS_VIVOS)[number];

/**
 * Bytes do atlas (512² RGBA) e dos buffers de instâncias das camadas GPU (membros × 168, na CPU e na GPU). Desde a
 * F-006 entram a 2ª camada de médios (500), os telegrafos (64) e os projéteis inimigos (128; RE8).
 */
const BYTES_DO_ATLAS = 512 * 512 * 4;
export const MEMBROS_DAS_CAMADAS =
  MEMBROS_DO_MUNDO + CAPACIDADE_DE_INIMIGOS + CAPACIDADE_DE_MORTES + CAPACIDADE_DE_INIMIGOS + MEMBROS_DAS_ARMAS + MEMBROS_DOS_DIGITOS +
  MEMBROS_DOS_MEDIOS + MEMBROS_DOS_TELEGRAFOS + MEMBROS_DOS_PROJETEIS_INIMIGOS;
const BYTES_DAS_CAMADAS = 2 * MEMBROS_DAS_CAMADAS * FLOATS_POR_MEMBRO * 4;

export const NOMES_DOS_EVENTOS = [
  '',
  'acerto',
  'morte',
  'golpe',
  'pulso',
  'nivel',
  'carta',
  'onda',
  'bau',
  'item',
  'uniao',
  'telegrafo',
  'golpeInimigo',
  'esquiva',
  'esquivaPerfeita',
  'aparo',
  'aparoFalho',
  'posturaQuebrada',
  'contraAtaque',
  'acaoNegada',
  'projetilLancado',
  'aparoVazio',
  'frascoIniciado',
  'frascoInterrompido',
  'frascoCancelado',
  'apagou',
  'fimDaVigilia',
  'manchaRecuperada',
  'danoAoJogador',
  'marcoIniciado',
  'marcoVencido',
  'marcoConcluido',
  'fogueiraAcesa',
  'fogueiraAberta',
  'descansou',
  'forjou',
  'fogueiraPartiu',
  'fogueiraApagada',
  'convocacao',
] as const;
const NOMES_DAS_CARTAS = ['', 'melhoriaDeArma', 'armaNova', 'melhoriaDePassiva', 'passivaNova', 'bolsa'] as const;
const NOMES_DAS_CATEGORIAS = ['', 'arma', 'passiva', 'bolsa'] as const;
type NomeDoEvento = (typeof NOMES_DOS_EVENTOS)[number];

/** Um evento do anel como objeto (ultimosEventos). */
export interface EventoDebug {
  passo: number;
  tipo: NomeDoEvento;
  arma: string | null;
  /** FORMA; no evento esquivaPerfeita é ORIGEM_DO_DANO e no acaoNegada é ACAO (decisoes-F-006 ET10). */
  forma: number;
  alvo: { slot: number; geracao: number } | null;
  valor: number;
  /** O 4º float do evento (no golpeInimigo, o desfecho: 1 acertou, 2 esquivado, 3 aparado, 4 errou). */
  extra: number;
  x: number;
  y: number;
  critico: boolean;
  matou: boolean;
  convertido: boolean;
  /** FLAG.contra: golpe ou acerto de uma salva extra do Contra-ataque. */
  contra: boolean;
  causa: number;
}

function lerEventos(e: Estado): EventoDebug[] {
  const n = eventosEscritos(e.eventos);
  const u = e.eventos.u32;
  const f = e.eventos.f32;
  const lista: EventoDebug[] = [];
  for (let k = Math.max(0, n - 1024); k < n; k++) {
    const i = inicioDoEvento(k);
    const taf = u[i + EV.tipoArmaForma]!;
    const alvo = u[i + EV.alvo]!;
    const ifc = u[i + EV.inimigoFlagsCausa]!;
    const flags = (ifc >>> 8) & 0xff;
    const arma = (taf >>> 8) & 0xff;
    lista.push({
      passo: u[i + EV.passo]!,
      tipo: NOMES_DOS_EVENTOS[taf & 0xff] ?? '',
      arma: arma === 0 ? null : (IDS_DE_ARMA[arma] ?? null),
      forma: (taf >>> 16) & 0xff,
      alvo: alvo === 0xffffffff ? null : { slot: alvo & 0xffff, geracao: alvo >>> 16 },
      valor: f[i + EV.floats + 2]!,
      extra: f[i + EV.floats + 3]!,
      x: f[i + EV.floats]!,
      y: f[i + EV.floats + 1]!,
      critico: (flags & FLAG.critico) !== 0,
      matou: (flags & FLAG.matou) !== 0,
      convertido: (flags & FLAG.convertido) !== 0,
      contra: (flags & FLAG.contra) !== 0,
      causa: (ifc >>> 16) & 0xff,
    });
  }
  return lista;
}

/** O inimigo aparado ainda vivo (slot e geração conferem com o pool), ou null (0xffff = nenhum; o estado inicial grava 0). */
function alvoAparadoDe(e: Estado): { slot: number; geracao: number } | null {
  const slot = e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot]!;
  const geracao = e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao]!;
  if (slot >= CAPACIDADE_DE_INIMIGOS || e.pool.posicao[slot]! < 0 || e.pool.geracao[slot] !== geracao) return null;
  return { slot, geracao };
}

function buildDe(e: Estado | undefined): { armas: { id: string; nivel: number; recarga: number }[]; passivas: { id: string; nivel: number }[] } {
  const armas: { id: string; nivel: number; recarga: number }[] = [];
  const passivas: { id: string; nivel: number }[] = [];
  if (e) {
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      const c = e.build.codigo[v]!;
      if (c !== 0) armas.push({ id: IDS_DE_ARMA[c]!, nivel: e.build.nivel[v]!, recarga: e.build.recarga[v]! });
    }
    for (let v = 0; v < VAGAS_DE_PASSIVA; v++) {
      const c = e.passivas.codigo[v]!;
      if (c !== 0) passivas.push({ id: IDS_DE_PASSIVA[c]!, nivel: e.passivas.nivel[v]! });
    }
  }
  return { armas, passivas };
}

/** Nome do item de uma carta ou de um item de baú (arma, passiva ou null na Bolsa). */
function idDoItem(passiva: boolean, codigo: number): string | null {
  if (codigo === 0) return null;
  return passiva ? (IDS_DE_PASSIVA[codigo] ?? null) : (IDS_DE_ARMA[codigo] ?? null);
}

/** Nível que a carta deixa o item (melhoria: atual + 1; novo: 1; Bolsa: 0). */
function nivelDaCarta(e: Estado, tipo: number, item: number): number {
  if (tipo === TIPO_DE_CARTA.melhoriaDeArma) return e.build.nivel[e.build.codigo.indexOf(item)]! + 1;
  if (tipo === TIPO_DE_CARTA.melhoriaDePassiva) return e.passivas.nivel[e.passivas.codigo.indexOf(item)]! + 1;
  return tipo === TIPO_DE_CARTA.bolsa ? 0 : 1;
}

function levelUpDe(e: Estado, dados: DadosDaVigilia, selecionada: number | null) {
  const aberto = modalAberto(e) && !bauNaFrente(e);
  const cartas = [];
  if (aberto) {
    for (let k = 0; k < CARTAS; k++) {
      const tipo = e.oferta.tipo[k]!;
      const item = e.oferta.item[k]!;
      const passiva = tipo === TIPO_DE_CARTA.melhoriaDePassiva || tipo === TIPO_DE_CARTA.passivaNova;
      const uniao = completaUniao(e, dados, tipo, item);
      cartas.push({ tipo: NOMES_DAS_CARTAS[tipo] ?? '', item: idDoItem(passiva, item), nivel: nivelDaCarta(e, tipo, item), completaUniao: uniao === 0 ? null : IDS_DE_ARMA[uniao]! });
    }
  }
  return { aberto, pendentes: e.progresso[PROGRESSAO.niveisPendentes]!, nivel: e.progresso[PROGRESSAO.nivel]!, cartas, selecionada: aberto ? selecionada : null };
}

function bauDe(e: Estado) {
  const aberto = bauNaFrente(e);
  const f = e.filaDeBaus;
  const itens = [];
  if (aberto) {
    for (let k = 0; k < f[BAU.itens]!; k++) {
      const cat = f[BAU.categoria + k]!;
      itens.push({ categoria: NOMES_DAS_CATEGORIAS[cat] ?? '', item: idDoItem(cat === CATEGORIA_DE_ITEM.passiva, f[BAU.codigo + k]!), nivel: f[BAU.nivel + k]! });
    }
  }
  return { aberto, porFechar: e.progresso[PROGRESSAO.bausPorFechar]!, uniao: aberto && f[BAU.uniao] === 1, itens };
}
/** O renderer do WebGL por software (SwiftShader, llvmpipe...): o fps não mede o nosso código (decisoes-F-003 E1). */
const RE_SOFTWARE = /SwiftShader|llvmpipe|softpipe|Software/i;

function contarVivos(e: Estado | undefined): Record<TipoVivo, number> {
  const vivos = Object.fromEntries(TIPOS_VIVOS.map((tipo) => [tipo, 0])) as Record<TipoVivo, number>;
  if (!e) return vivos;
  vivos.projeteis = quantosAtivos(e.poolDeProjeteis);
  vivos.pickups = quantosAtivos(e.poolDePickups);
  vivos.efeitos = quantosAtivos(e.poolDeEfeitos);
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (e.pool.posicao[s]! < 0) continue;
    const id = IDS_DE_TIPO[e.inimigos.tipo[s]!] as TipoVivo;
    vivos[id]++;
  }
  return vivos;
}

function diretorDe(e: Estado, dados: DadosDaVigilia) {
  const linha = linhaCorrente(e, dados);
  const alvo = alvoDaLinha(dados.timeline.minimo[linha]!, e.mundo[MUNDO.intensidade10]!);
  return {
    linha,
    espera: e.mundo[MUNDO.espera]!,
    alvo,
    minEfetivo: Math.min(alvo, e.cab[CAB.teto]!),
    vivosEq: vivosEquivalentes(e),
    spawns: e.mundo[MUNDO.spawns]!,
    garantidosPerdidos: e.mundo[MUNDO.garantidosPerdidos]!,
    semPontoLivre: e.mundo[MUNDO.semPontoLivre]!,
    removidos: e.mundo[MUNDO.removidos]!,
  };
}

/** Renderer do WebGL (WEBGL_debug_renderer_info), lido uma vez. */
function rendererDoWebGL(jogo: Phaser.Game): string {
  const gl = (jogo.renderer as Partial<Phaser.Renderer.WebGL.WebGLRenderer>).gl;
  if (!gl) return '';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

/** Programas do SpriteGPULayer já compilados no cache do renderer. */
function programasDoLayer(jogo: Phaser.Game): number {
  const fabrica = (jogo.renderer as unknown as { shaderProgramFactory?: { programs: Record<string, unknown> } }).shaderProgramFactory;
  return fabrica ? Object.keys(fabrica.programs).filter((k) => k.startsWith('SpriteGPULayer')).length : 0;
}

/** Conta as chamadas de desenho do renderer (só no build de debug; zerado a cada PRE_RENDER). */
function contarDrawCalls(jogo: Phaser.Game): { ultimo: number } {
  const contagem = { atual: 0, ultimo: 0 };
  const r = jogo.renderer as unknown as Record<string, unknown>;
  for (const nome of ['drawElements', 'drawInstancedArrays']) {
    const original = r[nome];
    if (typeof original !== 'function') continue;
    r[nome] = function (this: unknown) {
      contagem.atual++;
      // eslint-disable-next-line prefer-rest-params -- sem alocar um array por chamada
      return (original as (...a: unknown[]) => unknown).apply(this, arguments as unknown as unknown[]);
    };
  }
  jogo.events.on('prerender', () => {
    contagem.atual = 0;
  });
  jogo.events.on('postrender', () => {
    contagem.ultimo = contagem.atual;
  });
  return contagem;
}

/** Backbuffer pelo contexto real (WebGL) ou, no Canvas, cor em dobro. */
function bytesDoCanvas(jogo: Phaser.Game): number {
  const { width, height } = jogo.canvas;
  const gl = (jogo.renderer as Partial<Phaser.Renderer.WebGL.WebGLRenderer>).gl;
  if (!gl) return width * height * 4 * 2;
  return bytesDoBackbuffer(width, height, atributosDe(gl));
}

/** Tipos do gancho `entrada.injetar` (design/decisoes-F-002.md §8). */
export type TipoInjetado = keyof typeof TIPO_DE_TOQUE;

export interface EntradaDebug {
  /** navigator.maxTouchPoints: toques simultâneos que o aparelho informa (5 no iPhone; conferir no aparelho, Q-29). */
  readonly maxToques: number;
  /** Joystick em pt lógicos; a origem fica com ativo = false depois de soltar (F-002.4); `criados` conta os donos desde o início da Vigília. */
  readonly joystick: { ativo: boolean; origemX: number; origemY: number; vx: number; vy: number; criados: number };
  /**
   * Grava um evento na mesma fila da camada de toque, com x e y em pt e t em ms no
   * relógio do TouchEvent.timeStamp, e ajusta o retrato como um TouchEvent faria.
   * Só no build de debug.
   */
  injetar?: (tipo: TipoInjetado, id: number, x: number, y: number, t: number) => void;
  /**
   * Impõe ComandosDoPasso por passo absoluto (design/decisoes-F-002.md §6 e §8),
   * para o driver e para avancar, desde o passo 0 se chamado antes da Vigília.
   * `null` volta à entrada ao vivo. A lista paralela `acoes` (esquiva e aparo em
   * passos exatos; decisoes-F-006 ET5) vale só com o roteiro. Só no build de debug.
   */
  roteiro?: (lista: Roteiro | null, acoes?: readonly AcaoDeRoteiro[] | null) => void;
}

export interface GameDebug {
  readonly fps: number;
  readonly passo: number;
  /** Relógio da Vigília em passos (para na Fogueira, a partir da F-008). */
  readonly relogio: number;
  /**
   * A fase da Vigília (decisoes-F-007 AG4): 'ACENDER' e 'BOOT' fora dela; dentro, 'VIGILIA' (fase VIVA; o nome antigo,
   * para os testes das F-001 a F-006), 'APAGANDO' e 'FIM(apagar)' ou 'FIM(abandonar)'.
   */
  readonly estado: string;
  /** A tela em exibição, em minúsculas: 'boot', 'acender', 'vigilia' e 'resultado' (do Apagar em diante). */
  readonly tela: string;
  /** Fim da Vigília, Frasco e mancha, lidos do estado (F-007); null sem simulação. */
  readonly vigilia: {
    fase: string;
    causa: number;
    apagandoPassos: number;
    frasco: { cargas: number; passo: number; restante: number; usados: number };
    mancha: { ativa: boolean; x: number; y: number; almas: number };
    danoRecebido: number;
    aparos: number;
    esquivasPerfeitas: number;
    /** As etapas da Vigília (F-008 AR1): HORA 0, MARCO 1, FOGUEIRA 2, CHEFE 3, A_FOME 4, a arena, os Coroados vivos e a Fogueira. */
    etapas: { etapa: number; marcosIniciados: number; arenaAtiva: boolean; coroadosVivos: number; fogueiraAcesa: boolean; fogueiraHora: number; fogueiraAcoes: number };
    resultado: { segundos: number; nivel: number; mortes: number; danoRecebido: number; almas: number; almasAoSantuario: number; mancha: { x: number; y: number; hora: number; almas: number } | null } | null;
  } | null;
  /** O meta lido do armazenamento (cópia): Almas do Santuário, mancha, tutoriais e opções. */
  readonly meta: { almas: number; mancha: { x: number; y: number; hora: number; almas: number } | null; tutoriais: number; primeiroApagarFeito: boolean; seq: number };
  readonly vivos: Record<TipoVivo, number>;
  /** Quantos dos oco_grande vivos são convertidos do excedente (ADR-0002 §8.7). */
  readonly convertidos: number;
  readonly diretor: ReturnType<typeof diretorDe> | null;
  readonly teto: Teto;
  readonly cenario: string | null;
  readonly render: {
    modo: 'gpu' | 'image';
    origem: 'parametro' | 'fallback';
    buffer: 'estatico' | 'dinamico';
    stride: number | null;
    capacidade: number;
    drawCalls: number | null;
    programaAquecido: boolean;
    /** Programas do SpriteGPULayer no cache do renderer (o aquecimento os compila antes da Vigília). */
    programasDoLayer: number;
  };
  readonly webgl: { renderer: string; software: boolean };
  /** p50 e p95 da CPU do frame (PRE_STEP → POST_RENDER) nos últimos 60 quadros, em ms. */
  readonly cpuFrameMs: { p50: number; p95: number };
  /** Quadros medidos desde o boot (para recortar o anel de quadros() numa janela, F-003.4). */
  readonly quadrosContados: number;
  readonly passos_perdidos: number;
  readonly recusados: { inimigos: number; projeteis: number; efeitos: number; pickups: number; efeitosDeChao: number; numeros: number; mortes: number; telegrafos: number; projeteisInimigos: number };
  /** Armas da build, na ordem das vagas (recarga em passos), e as passivas (F-005). */
  readonly build: ReturnType<typeof buildDe>;
  /** Números de dano vivos no pool do render (não membros de dígito); 0 com a opção desligada. */
  readonly numerosDeDano: number;
  /** Os últimos 1.024 eventos do anel, em ordem. */
  readonly ultimosEventos: EventoDebug[];
  /** Eventos que o render não leu porque o anel deu a volta. */
  readonly eventosPerdidos: number;
  /** Inimigos mortos por arma (o contador do estado). */
  readonly mortes: number;
  /** Pausa do jogador (fora do estado; o estado de jogo continua VIGILIA). */
  readonly pausa: { ativa: boolean; origem: 'botao' | 'gesto' | null };
  readonly opcoes: { numerosDeDano: boolean; som: boolean; flashes: boolean };
  /** Quadros de render que faltam do flash branco (decisoes-F-006 RE3); só leitura. */
  readonly flash: number;
  /** Fator da câmera lenta leve do tutorial da esquiva (0,5 durante 500 ms de tempo real, senão 1; FB5); só leitura. */
  readonly escalaDeTempo: number;
  readonly memoriaEstimadaMB: number;
  readonly seed: number;
  /** Insets da safe-area em pt lógicos, como a cena ativa os mediu. */
  readonly safeArea: Insets;
  /** Ids de t() visíveis nas cenas ativas. */
  readonly textoAtivo: string[];
  readonly eventos: ReturnType<ContextoDoJogo['telemetria']['eventos']>;
  /** Estado devolvido pelo nosso desbloqueio no toque de Acender (null antes). */
  readonly desbloqueioDoAudio: string | null;
  /** `locked` do SoundManager do Phaser: só o nosso desbloqueio o leva a false (F-001.14). */
  readonly somTravado: boolean;
  /** Jogador em px lógicos do toro (estado da simulação), a direção do triângulo, o HP e o timer de contato. */
  readonly jogador: {
    x: number; y: number; dirX: number; dirY: number; hp: number; invulContato: number;
    /** Progressão (F-005): nível, XP no nível e o custo do próximo, XP total, níveis por escolher. */
    nivel: number; xp: number; xpParaSubir: number; xpTotal: number; niveisPendentes: number;
    atributos: Record<string, number>; poderPct: number; armadura: number; hpMax: number; almas: number;
    /** Stamina e esquiva (F-006; decisoes-F-006 ES8). */
    stamina: number; esperaRegen: number; esquivaPasso: number; poderPassos: number; congelamento: number; facaExtra: number;
    /** Capacidade da stamina (100). */
    staminaMax: number;
    /** Esquiva em curso: passo (0 = fora), se está nos i-frames (passos 2 a 13) e se já deu a perfeita. */
    esquiva: { passo: number; invulneravel: boolean; perfeitaDada: boolean };
    /** Aparo: passos restantes da janela (12 ou 18 no passo do comando) e do aparo falho (24). */
    aparo: { janela: number; falho: number };
    /** Sal no jogador: lentidão em % e passos restantes. */
    sal: { pct: number; passos: number };
    /** Ataques aparáveis a caminho no passo anterior (decide o aparo falho). */
    ameacasAparaveis: number;
    /** O último inimigo aparado (alvo do Contra-ataque), ou null. */
    alvoAparado: { slot: number; geracao: number } | null;
    /** Estado dos prompts de tutorial (0 aguardando, 1 visível, 2 cumprido) e as falhas de aparo. */
    prompts: { esquiva: number; aparo: number; falhas: number };
  } | null;
  /** O modal de level up (F-005): aberto, níveis pendentes, as 3 cartas e a carta selecionada na tela. */
  readonly levelUp: ReturnType<typeof levelUpDe> | null;
  /** O modal do baú da frente da fila (F-005). */
  readonly bau: ReturnType<typeof bauDe> | null;
  /** Cinzas juntadas com o pool de pickups cheio (X6). */
  readonly juncoes: number;
  /** Centro da câmera do mundo, em px lógicos do toro (arredondado para 0,5 pt). */
  readonly camera: { x: number; y: number } | null;
  readonly entrada: EntradaDebug;
  /** Eventos de toque descartados (fila de 64 por frame) e dedos além de 5, na Vigília. */
  readonly toquesPerdidos: number;
  /** O último `vigilia` gravado: a sequência e o hash do buffer gravado (F-008 SV9); null antes da 1ª gravação e nos cenários que não gravam. */
  readonly save: { seq: number; hash: string } | null;
  hash(): string | null;
  audio(): string;
  pausar?: () => void;
  retomar?: () => void;
  /** Roda n passos (para antes num modal aberto) e devolve quantos rodaram. Só no build de debug. */
  avancar?: (n: number) => number;
  /** Cópia dos pickups vivos (Cinzas e baús). Só no build de debug. */
  pickups?: () => { slot: number; tipo: string; x: number; y: number; valor: number }[];
  /** Cópia das ondas vivas da União. Só no build de debug. */
  efeitosDeChao?: () => { slot: number; arma: string; x: number; y: number; dirX: number; dirY: number; dano: number; idade: number }[];
  /** Os últimos 2.048 quadros (F-003.4). Só no build de debug. */
  quadros?: () => Quadro[];
  /** Cópia dos inimigos vivos. Só no build de debug. */
  inimigos?: () => { slot: number; tipo: string; x: number; y: number; convertido: boolean; hp: number; salPct: number; salPassos: number; kbPassos: number; ataqueFase: number; ataqueTimer: number; ataqueId: number; quebradaPassos: number }[];
  /** Cópia dos projéteis vivos. Só no build de debug. */
  /** `tipo`: faca ou sal; `dono`: o atirador do projétil de Sal (null nas facas). */
  projeteis?: () => { slot: number; arma: string; x: number; y: number; vx: number; vy: number; dano: number; vida: number; perfuracoes: number; tipo: string; dono: { slot: number; geracao: number } | null }[];
  /** Hash de cada seção do estado, em hexadecimal. Só no build de debug. */
  hashPorSecao?: () => Record<string, string> | null;
  /** Remove um inimigo vivo pelo caminho comum (o teste do slot morto, decisoes-F-003 §8). Só no build de debug. */
  removerInimigo?: (slot: number) => void;
  /** Põe o HP do jogador (0 < hp ≤ hpMax), para o screenshot do HUD com HP 71 (decisoes-F-007 HB2). Só no build de debug. */
  definirHp?: (hp: number) => void;
}

/** FIM(apagar), FIM(abandonar)...; VIVA e APAGANDO sem causa. */
function nomeDaFase(fase: number, causa: number): string {
  if (fase === FASE.apagando) return 'APAGANDO';
  if (fase !== FASE.fim) return 'VIVA';
  const nomes = ['', 'apagar', 'abandonar', 'a_fome', 'amanhecer'];
  return `FIM(${nomes[causa] ?? ''})`;
}

/** O `estado` do debug: a tela fora da Vigília; dentro dela, 'VIGILIA' (fase VIVA), 'APAGANDO' ou 'FIM(causa)'. */
function estadoDaVigilia(ctx: ContextoDoJogo): string {
  const sim = ctx.simulacao;
  if (!sim || (ctx.tela !== 'VIGILIA' && ctx.tela !== 'RESULTADO')) return ctx.tela;
  const nome = nomeDaFase(sim.estado.jogador4U8[JOGADOR4_U8.fase]!, sim.estado.jogador4U8[JOGADOR4_U8.causaDoFim]!);
  return nome === 'VIVA' ? 'VIGILIA' : nome;
}

function textosVisiveis(jogo: Phaser.Game): string[] {
  const ids: string[] = [];
  for (const cena of jogo.scene.getScenes(true)) {
    if (!cena.sys.isVisible()) continue;
    for (const obj of cena.children.list) {
      const id: unknown = obj.getData('idTexto');
      if (typeof id === 'string' && (obj as Phaser.GameObjects.Text).visible) ids.push(id);
    }
  }
  return ids;
}

export function instalarDebug(jogo: Phaser.Game, ctx: ContextoDoJogo): GameDebug {
  let bytesBackbuffer: number | null = null;
  let renderer: string | null = null;
  const drawCalls = ctx.ehBuildDeDebug ? contarDrawCalls(jogo) : null;
  const debug: GameDebug = {
    get fps() {
      return jogo.loop.actualFps;
    },
    get passo() {
      return ctx.simulacao?.estado.cab[CAB.passo] ?? 0;
    },
    get relogio() {
      return ctx.simulacao?.estado.cab[CAB.relogio] ?? 0;
    },
    get estado() {
      return estadoDaVigilia(ctx);
    },
    get tela() {
      return ctx.tela.toLowerCase();
    },
    get vigilia() {
      const sim = ctx.simulacao;
      if (!sim) return null;
      const e = sim.estado;
      const u8 = e.jogador4U8;
      return {
        fase: nomeDaFase(u8[JOGADOR4_U8.fase]!, u8[JOGADOR4_U8.causaDoFim]!),
        causa: u8[JOGADOR4_U8.causaDoFim]!,
        apagandoPassos: u8[JOGADOR4_U8.apagandoPassos]!,
        frasco: {
          cargas: u8[JOGADOR4_U8.frascoCargas]!,
          passo: u8[JOGADOR4_U8.frascoPasso]!,
          restante: e.jogador4[JOGADOR4.frascoRestante]!,
          usados: e.jogador4U32[JOGADOR4_U32.frascosUsados]!,
        },
        mancha: {
          ativa: u8[JOGADOR4_U8.manchaAtiva] === 1,
          x: e.jogador4[JOGADOR4.manchaX]!,
          y: e.jogador4[JOGADOR4.manchaY]!,
          almas: e.jogador4U32[JOGADOR4_U32.manchaAlmas]!,
        },
        danoRecebido: e.jogador4[JOGADOR4.danoRecebido]!,
        aparos: e.jogador4U32[JOGADOR4_U32.aparos]!,
        esquivasPerfeitas: e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]!,
        etapas: {
          etapa: e.fogueiraU8[FOGUEIRA_U8.etapa]!,
          marcosIniciados: e.fogueiraU8[FOGUEIRA_U8.marcosIniciados]!,
          arenaAtiva: e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] === 1,
          coroadosVivos: e.fogueiraU8[FOGUEIRA_U8.coroadosVivos]!,
          fogueiraAcesa: e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] === 1,
          fogueiraHora: e.fogueiraU8[FOGUEIRA_U8.fogueiraHora]!,
          fogueiraAcoes: e.fogueiraU8[FOGUEIRA_U8.fogueiraAcoes]!,
        },
        resultado: sim.resultado
          ? {
              segundos: sim.resultado.segundos,
              nivel: sim.resultado.nivel,
              mortes: sim.resultado.mortes,
              danoRecebido: sim.resultado.danoRecebido,
              almas: sim.resultado.almas,
              almasAoSantuario: sim.resultado.almasAoSantuario,
              mancha: sim.resultado.mancha ? { x: sim.resultado.mancha.x, y: sim.resultado.mancha.y, hora: sim.resultado.mancha.hora, almas: sim.resultado.mancha.almas } : null,
            }
          : null,
      };
    },
    get meta() {
      const m = ctx.meta.atual;
      return {
        almas: m.almas,
        mancha: m.mancha ? { x: m.mancha.x, y: m.mancha.y, hora: m.mancha.hora, almas: m.mancha.almas } : null,
        tutoriais: m.tutoriais,
        primeiroApagarFeito: m.primeiroApagarFeito,
        seq: m.seq,
      };
    },
    get vivos() {
      return contarVivos(ctx.simulacao?.estado);
    },
    get convertidos() {
      return ctx.simulacao ? convertidosVivos(ctx.simulacao.estado) : 0;
    },
    get diretor() {
      return ctx.simulacao ? diretorDe(ctx.simulacao.estado, ctx.simulacao.dados) : null;
    },
    get teto() {
      return { ...ctx.teto };
    },
    get cenario() {
      return ctx.cenario?.id ?? null;
    },
    get render() {
      const horda = ctx.simulacao?.horda ?? null;
      return {
        modo: ctx.render.modo,
        origem: ctx.render.origem,
        buffer: horda instanceof HordaPorGPU && horda.bufferDinamico ? ('dinamico' as const) : ('estatico' as const),
        stride: horda instanceof HordaPorGPU ? FLOATS_POR_MEMBRO : null,
        capacidade: CAPACIDADE_DE_INIMIGOS,
        drawCalls: drawCalls ? drawCalls.ultimo : null,
        programaAquecido: ctx.render.aquecido,
        programasDoLayer: programasDoLayer(jogo),
      };
    },
    get webgl() {
      renderer ??= rendererDoWebGL(jogo);
      return { renderer, software: RE_SOFTWARE.test(renderer) };
    },
    get cpuFrameMs() {
      return ctx.medidor.cpuFrameMs();
    },
    get quadrosContados() {
      return ctx.medidor.contados;
    },
    get passos_perdidos() {
      return ctx.simulacao?.acumulador.passosPerdidos ?? 0;
    },
    get recusados() {
      const e = ctx.simulacao?.estado;
      const ef = ctx.simulacao?.efeitos;
      return {
        inimigos: e?.mundo[MUNDO.recusados] ?? 0,
        projeteis: e?.mundo[MUNDO.projeteisRecusados] ?? 0,
        efeitos: ef?.recusados.efeitos ?? 0,
        pickups: 0,
        efeitosDeChao: e?.mundo2[MUNDO2.efeitosRecusados] ?? 0,
        numeros: ef?.recusados.numeros ?? 0,
        mortes: ef?.recusados.mortes ?? 0,
        telegrafos: ef?.recusados.telegrafos ?? 0,
        projeteisInimigos: ef?.recusados.projeteisInimigos ?? 0,
      };
    },
    get build() {
      return buildDe(ctx.simulacao?.estado);
    },
    get numerosDeDano() {
      return ctx.simulacao?.efeitos?.numerosVivos ?? 0;
    },
    get ultimosEventos() {
      return ctx.simulacao ? lerEventos(ctx.simulacao.estado) : [];
    },
    get eventosPerdidos() {
      return ctx.simulacao?.efeitos?.leitor.perdidos ?? 0;
    },
    get mortes() {
      return ctx.simulacao?.estado.mundo[MUNDO.mortes] ?? 0;
    },
    get pausa() {
      const p = ctx.simulacao?.pausa;
      return { ativa: p?.ativa ?? false, origem: p?.origem ?? null };
    },
    get opcoes() {
      return { numerosDeDano: ctx.opcoes.numerosDeDano, som: ctx.opcoes.som, flashes: ctx.opcoes.flashes };
    },
    get flash() {
      return ctx.feedback.flash.quadros;
    },
    get escalaDeTempo() {
      return ctx.simulacao ? escalaDeTempo(ctx.simulacao.cameraLenta) : 1;
    },
    get memoriaEstimadaMB() {
      bytesBackbuffer ??= bytesDoCanvas(jogo);
      return (BYTES_ESTADO + BYTES_DO_ANEL + bytesBackbuffer + BYTES_DO_ATLAS + BYTES_DAS_CAMADAS) / (1024 * 1024);
    },
    get seed() {
      return ctx.seed;
    },
    get safeArea() {
      return { ...ctx.insets };
    },
    get textoAtivo() {
      return textosVisiveis(jogo);
    },
    get eventos() {
      return ctx.telemetria.eventos();
    },
    get desbloqueioDoAudio() {
      return ctx.desbloqueioDoAudio;
    },
    get somTravado() {
      return jogo.sound.locked;
    },
    get jogador() {
      const e = ctx.simulacao?.estado;
      if (!e) return null;
      const j = e.jogador;
      return {
        x: j[JOGADOR.x]!,
        y: j[JOGADOR.y]!,
        dirX: j[JOGADOR.dirX]!,
        dirY: j[JOGADOR.dirY]!,
        hp: j[JOGADOR.hp]!,
        invulContato: e.jogadorU8[JOGADOR_U8.invulContato]!,
        nivel: e.progresso[PROGRESSAO.nivel]!,
        xp: e.progresso[PROGRESSAO.xp]!,
        xpParaSubir: ctx.simulacao!.dados.progressao.custo[e.progresso[PROGRESSAO.nivel]!] ?? 0,
        xpTotal: e.progresso[PROGRESSAO.xpTotal]!,
        niveisPendentes: e.progresso[PROGRESSAO.niveisPendentes]!,
        atributos: Object.fromEntries(ATRIBUTOS.map((a, i) => [a, e.atributos[i]!])),
        poderPct: poderPct(e, ctx.simulacao!.dados),
        armadura: armadura(e, ctx.simulacao!.dados),
        hpMax: e.jogador2[JOGADOR2.hpMax]!,
        almas: e.progresso[PROGRESSAO.almas]!,
        stamina: e.jogador3[JOGADOR3.stamina]!,
        esperaRegen: e.jogador3U8[JOGADOR3_U8.esperaRegen]!,
        esquivaPasso: e.jogador3U8[JOGADOR3_U8.esquivaPasso]!,
        poderPassos: e.jogador3U8[JOGADOR3_U8.poderPassos]!,
        congelamento: e.jogador3U8[JOGADOR3_U8.congelamento]!,
        facaExtra: e.jogador3U8[JOGADOR3_U8.facaExtra]!,
        staminaMax: ctx.simulacao!.dados.combate.staminaMax,
        esquiva: {
          passo: e.jogador3U8[JOGADOR3_U8.esquivaPasso]!,
          invulneravel:
            e.jogador3U8[JOGADOR3_U8.esquivaPasso]! >= ctx.simulacao!.dados.combate.esquivaIframesDe &&
            e.jogador3U8[JOGADOR3_U8.esquivaPasso]! <= ctx.simulacao!.dados.combate.esquivaIframesAte,
          perfeitaDada: e.jogador3U8[JOGADOR3_U8.esquivaPerfeitaDada] === 1,
        },
        aparo: { janela: e.jogador3U8[JOGADOR3_U8.aparoJanela]!, falho: e.jogador3U8[JOGADOR3_U8.aparoFalho]! },
        sal: { pct: e.jogador3U8[JOGADOR3_U8.salPct]!, passos: e.jogador3U8[JOGADOR3_U8.salPassos]! },
        ameacasAparaveis: e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]!,
        alvoAparado: alvoAparadoDe(e),
        prompts: { esquiva: e.jogador3U8[JOGADOR3_U8.promptEsquiva]!, aparo: e.jogador3U8[JOGADOR3_U8.promptAparo]!, falhas: e.jogador3U8[JOGADOR3_U8.falhasDeAparo]! },
      };
    },
    get levelUp() {
      const sim = ctx.simulacao;
      return sim ? levelUpDe(sim.estado, sim.dados, sim.modal.selecionada) : null;
    },
    get bau() {
      return ctx.simulacao ? bauDe(ctx.simulacao.estado) : null;
    },
    get juncoes() {
      return ctx.simulacao?.estado.mundo2[MUNDO2.juncoes] ?? 0;
    },
    get camera() {
      const c = ctx.simulacao?.camera;
      return c ? { x: c.x, y: c.y } : null;
    },
    entrada: {
      get maxToques() {
        return navigator.maxTouchPoints;
      },
      get joystick() {
        const { ativo, origemX, origemY, vx, vy } = ctx.entrada.tradutor.joystick;
        return { ativo, origemX, origemY, vx, vy, criados: ctx.entrada.tradutor.joystickCriados };
      },
    },
    get toquesPerdidos() {
      return ctx.entrada.fila.perdidos + ctx.entrada.tradutor.dedosPerdidos;
    },
    get save() {
      return ctx.simulacao?.gravador?.ultimo ?? null;
    },
    hash() {
      return ctx.simulacao ? hex8(hashEstado(ctx.simulacao.estado)) : null;
    },
    audio() {
      const som = jogo.sound as Phaser.Sound.WebAudioSoundManager;
      return som.context?.state ?? 'ausente';
    },
  };
  if (ctx.ehBuildDeDebug) {
    debug.pausar = () => {
      if (ctx.simulacao) ctx.simulacao.pausada = true;
    };
    debug.retomar = () => {
      if (ctx.simulacao) ctx.simulacao.pausada = false;
    };
    debug.entrada.injetar = (tipo, id, x, y, t) => {
      const codigo = TIPO_DE_TOQUE[tipo];
      if (codigo === undefined) throw new Error(`injetar: tipo desconhecido: ${String(tipo)}`);
      ctx.entrada.fila.empurrar(codigo, id, x, y, t);
      ctx.entrada.fila.ajustarRetrato(codigo, id);
    };
    debug.entrada.roteiro = (lista, acoes) => {
      if (lista) validarRoteiro(lista);
      if (acoes) validarAcoes(acoes);
      ctx.roteiro = lista ? lista.map((t) => ({ ...t })) : null;
      ctx.acoesDoRoteiro = lista && acoes ? acoes.map((a) => ({ ...a })) : null;
      const sim = ctx.simulacao;
      if (sim) sim.fonte = ctx.roteiro ? fonteDoRoteiro(ctx.roteiro, undefined, ctx.acoesDoRoteiro ?? undefined) : fonteConstante(sim.comandosAoVivo);
    };
    debug.avancar = (n: number) => {
      const sim = ctx.simulacao;
      if (!sim) throw new Error('avancar: a Vigília ainda não começou');
      sim.pausada = true;
      return avancar(sim.estado, sim.dados, sim.fonte, n);
    };
    debug.pickups = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const p = e.pickups;
      const nomes = ['', 'cinza', 'bauComum', 'bauDourado'];
      const lista: { slot: number; tipo: string; x: number; y: number; valor: number }[] = [];
      for (let s = 0; s < CAPACIDADE_DE_PICKUPS; s++) {
        if (e.poolDePickups.posicao[s]! < 0 || p.tipo[s] === TIPO_DE_PICKUP.vazio) continue;
        lista.push({ slot: s, tipo: nomes[p.tipo[s]!]!, x: p.x[s]!, y: p.y[s]!, valor: p.valor[s]! });
      }
      return lista;
    };
    debug.efeitosDeChao = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const f = e.efeitos;
      const lista: { slot: number; arma: string; x: number; y: number; dirX: number; dirY: number; dano: number; idade: number }[] = [];
      for (let s = 0; s < CAPACIDADE_DE_EFEITOS; s++) {
        if (e.poolDeEfeitos.posicao[s]! < 0) continue;
        lista.push({ slot: s, arma: IDS_DE_ARMA[f.arma[s]!]!, x: f.x[s]!, y: f.y[s]!, dirX: f.dirX[s]!, dirY: f.dirY[s]!, dano: f.dano[s]!, idade: f.idade[s]! });
      }
      return lista;
    };
    debug.quadros = () => ctx.medidor.quadros();
    debug.inimigos = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const lista: { slot: number; tipo: string; x: number; y: number; convertido: boolean; hp: number; salPct: number; salPassos: number; kbPassos: number; ataqueFase: number; ataqueTimer: number; ataqueId: number; quebradaPassos: number }[] = [];
      for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
        if (e.pool.posicao[s]! < 0) continue;
        const ini = e.inimigos;
        lista.push({
          slot: s,
          tipo: IDS_DE_TIPO[ini.tipo[s]!]!,
          x: ini.x[s]!,
          y: ini.y[s]!,
          convertido: ini.convertido[s] === 1,
          hp: ini.hp[s]!,
          salPct: ini.salPct[s]!,
          salPassos: ini.salPassos[s]!,
          kbPassos: ini.kbPassos[s]!,
          ataqueFase: ini.ataqueFase[s]!,
          ataqueTimer: ini.ataqueTimer[s]!,
          ataqueId: ini.ataqueId[s]!,
          quebradaPassos: ini.quebradaPassos[s]!,
        });
      }
      return lista;
    };
    debug.projeteis = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const p = e.projeteis;
      const lista: { slot: number; arma: string; x: number; y: number; vx: number; vy: number; dano: number; vida: number; perfuracoes: number; tipo: string; dono: { slot: number; geracao: number } | null }[] = [];
      for (let s = 0; s < CAPACIDADE_DE_PROJETEIS; s++) {
        if (e.poolDeProjeteis.posicao[s]! < 0) continue;
        lista.push({ slot: s, arma: IDS_DE_ARMA[p.arma[s]!]!, x: p.x[s]!, y: p.y[s]!, vx: p.vx[s]!, vy: p.vy[s]!, dano: p.dano[s]!, vida: p.vida[s]!, perfuracoes: p.perfuracoes[s]!,
          tipo: p.tipo[s] === TIPO_DE_PROJETIL.sal ? 'sal' : 'faca',
          dono: p.tipo[s] === TIPO_DE_PROJETIL.sal ? { slot: p.donoSlot[s]!, geracao: p.donoGeracao[s]! } : null });
      }
      return lista;
    };
    debug.removerInimigo = (slot: number) => {
      const e = ctx.simulacao?.estado;
      if (!e || !(slot >= 0 && slot < CAPACIDADE_DE_INIMIGOS) || e.pool.posicao[slot]! < 0) {
        throw new Error(`removerInimigo: o slot ${slot} não está vivo`);
      }
      removerInimigo(e, slot);
    };
    debug.definirHp = (hp: number) => {
      const e = ctx.simulacao?.estado;
      if (!e || !(hp > 0 && hp <= e.jogador2[JOGADOR2.hpMax]!)) throw new Error(`definirHp: HP inválido: ${hp}`);
      e.jogador[JOGADOR.hp] = hp;
    };
    debug.hashPorSecao = () => {
      const e = ctx.simulacao?.estado;
      return e ? Object.fromEntries(Object.entries(hashPorSecao(e)).map(([k, v]) => [k, hex8(v)])) : null;
    };
  }
  (window as unknown as { __GAME_DEBUG__: GameDebug }).__GAME_DEBUG__ = debug;
  return debug;
}

/** Instantâneo do painel do ?debug=1: chaves com os nomes do __GAME_DEBUG__ (decisoes-F-003 §8). */
export function instantaneoDoDebug(d: GameDebug): Record<string, string | number | boolean | null> {
  const v = d.vivos;
  const cpu = d.cpuFrameMs;
  return {
    fps: Math.round(d.fps),
    vivos: v.oco_das_lanternas + v.oco_grande + v.novica_de_sal + v.oco_grande_coroado + v.o_lanterneiro,
    oco_das_lanternas: v.oco_das_lanternas,
    oco_grande: v.oco_grande,
    novica_de_sal: v.novica_de_sal,
    convertidos: d.convertidos,
    teto: d.teto.valor,
    origem: d.teto.origem,
    passo: d.passo,
    relogio: d.relogio,
    passos_perdidos: d.passos_perdidos,
    cpuFrameMs_p50: Number(cpu.p50.toFixed(1)),
    cpuFrameMs_p95: Number(cpu.p95.toFixed(1)),
    render: d.render.modo,
    drawCalls: d.render.drawCalls,
    numerosDeDano: d.numerosDeDano,
    mortes: d.mortes,
    projeteis: v.projeteis,
    nivel: d.jogador?.nivel ?? 0,
    xp: d.jogador ? `${d.jogador.xp}/${d.jogador.xpParaSubir}` : null,
    pendentes: d.jogador?.niveisPendentes ?? 0,
    cinzas: v.pickups,
    webgl: d.webgl.renderer.slice(0, 40),
    // Linha de 12 pt da F-006 (VT3): stamina, esquiva, aparo e congelamento.
    stamina_esq_apa_cong: d.jogador ? [Math.round(d.jogador.stamina), d.jogador.esquiva.passo, d.jogador.aparo.janela, d.jogador.congelamento].join(',') : null,
  };
}
