// window.__GAME_DEBUG__ (B §3.13; ADR-0002 §14; ADR-0004 §7; design/decisoes-F-003.md §8;
// design/decisoes-F-004.md §8: build, números de dano, últimos eventos, mortes, pausa e opções).
// Sempre presente e só de leitura; os ganchos de escrita (pausar, retomar,
// avancar, entrada.injetar, entrada.roteiro e removerInimigo) e as leituras
// pesadas (quadros, inimigos, hashPorSecao) só existem no build de debug. Os campos dos sistemas
// que ainda não existem entram com as suas features (stamina, chefe, save,
// degradacao, build...).
import type Phaser from 'phaser';
import { fonteConstante, fonteDoRoteiro, validarRoteiro, type Roteiro } from '../logica/nucleo/comandos';
import { BYTES_ESTADO, CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, JOGADOR, JOGADOR_U8, MUNDO, VAGAS_DE_ARMA, hashEstado, hashPorSecao, type Estado } from '../logica/nucleo/estado';
import { BYTES_DO_ANEL, EV, FLAG, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { quantosAtivos } from '../logica/nucleo/pool';
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { MEMBROS_DAS_ARMAS, MEMBROS_DOS_DIGITOS } from './render/armas';
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

/** Bytes do atlas (512² RGBA) e dos buffers de instâncias das camadas GPU (membros × 168, na CPU e na GPU). */
const BYTES_DO_ATLAS = 512 * 512 * 4;
export const MEMBROS_DAS_CAMADAS = CAPACIDADE_DE_INIMIGOS + CAPACIDADE_DE_MORTES + CAPACIDADE_DE_INIMIGOS + MEMBROS_DAS_ARMAS + MEMBROS_DOS_DIGITOS;
const BYTES_DAS_CAMADAS = 2 * MEMBROS_DAS_CAMADAS * FLOATS_POR_MEMBRO * 4;

const NOMES_DOS_EVENTOS = ['', 'acerto', 'morte', 'golpe', 'pulso'] as const;
type NomeDoEvento = (typeof NOMES_DOS_EVENTOS)[number];

/** Um evento do anel como objeto (ultimosEventos). */
export interface EventoDebug {
  passo: number;
  tipo: NomeDoEvento;
  arma: string | null;
  forma: number;
  alvo: { slot: number; geracao: number } | null;
  valor: number;
  x: number;
  y: number;
  critico: boolean;
  matou: boolean;
  convertido: boolean;
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
      x: f[i + EV.floats]!,
      y: f[i + EV.floats + 1]!,
      critico: (flags & FLAG.critico) !== 0,
      matou: (flags & FLAG.matou) !== 0,
      convertido: (flags & FLAG.convertido) !== 0,
      causa: (ifc >>> 16) & 0xff,
    });
  }
  return lista;
}

function buildDe(e: Estado | undefined): { armas: { id: string; nivel: number; recarga: number }[]; passivas: never[] } {
  const armas: { id: string; nivel: number; recarga: number }[] = [];
  if (e) {
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      const c = e.build.codigo[v]!;
      if (c !== 0) armas.push({ id: IDS_DE_ARMA[c]!, nivel: e.build.nivel[v]!, recarga: e.build.recarga[v]! });
    }
  }
  return { armas, passivas: [] };
}
/** O renderer do WebGL por software (SwiftShader, llvmpipe...): o fps não mede o nosso código (decisoes-F-003 E1). */
const RE_SOFTWARE = /SwiftShader|llvmpipe|softpipe|Software/i;

function contarVivos(e: Estado | undefined): Record<TipoVivo, number> {
  const vivos = Object.fromEntries(TIPOS_VIVOS.map((tipo) => [tipo, 0])) as Record<TipoVivo, number>;
  if (!e) return vivos;
  vivos.projeteis = quantosAtivos(e.poolDeProjeteis);
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
   * `null` volta à entrada ao vivo. Só no build de debug.
   */
  roteiro?: (lista: Roteiro | null) => void;
}

export interface GameDebug {
  readonly fps: number;
  readonly passo: number;
  /** Relógio da Vigília em passos (para na Fogueira, a partir da F-008). */
  readonly relogio: number;
  readonly estado: string;
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
  readonly recusados: { inimigos: number; projeteis: number; efeitos: number; pickups: number; numeros: number; mortes: number };
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
  readonly opcoes: { numerosDeDano: boolean };
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
  readonly jogador: { x: number; y: number; dirX: number; dirY: number; hp: number; invulContato: number } | null;
  /** Centro da câmera do mundo, em px lógicos do toro (arredondado para 0,5 pt). */
  readonly camera: { x: number; y: number } | null;
  readonly entrada: EntradaDebug;
  /** Eventos de toque descartados (fila de 64 por frame) e dedos além de 5, na Vigília. */
  readonly toquesPerdidos: number;
  hash(): string | null;
  audio(): string;
  pausar?: () => void;
  retomar?: () => void;
  avancar?: (n: number) => void;
  /** Os últimos 2.048 quadros (F-003.4). Só no build de debug. */
  quadros?: () => Quadro[];
  /** Cópia dos inimigos vivos. Só no build de debug. */
  inimigos?: () => { slot: number; tipo: string; x: number; y: number; convertido: boolean; hp: number; salPct: number; salPassos: number; kbPassos: number }[];
  /** Cópia dos projéteis vivos. Só no build de debug. */
  projeteis?: () => { slot: number; arma: string; x: number; y: number; vx: number; vy: number; dano: number; vida: number; perfuracoes: number }[];
  /** Hash de cada seção do estado, em hexadecimal. Só no build de debug. */
  hashPorSecao?: () => Record<string, string> | null;
  /** Remove um inimigo vivo pelo caminho comum (o teste do slot morto, decisoes-F-003 §8). Só no build de debug. */
  removerInimigo?: (slot: number) => void;
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
      return ctx.tela;
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
        efeitos: 0,
        pickups: 0,
        numeros: ef?.recusados.numeros ?? 0,
        mortes: ef?.recusados.mortes ?? 0,
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
      return { numerosDeDano: ctx.opcoes.numerosDeDano };
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
      };
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
    debug.entrada.roteiro = (lista) => {
      if (lista) validarRoteiro(lista);
      ctx.roteiro = lista ? lista.map((t) => ({ ...t })) : null;
      const sim = ctx.simulacao;
      if (sim) sim.fonte = ctx.roteiro ? fonteDoRoteiro(ctx.roteiro) : fonteConstante(sim.comandosAoVivo);
    };
    debug.avancar = (n: number) => {
      const sim = ctx.simulacao;
      if (!sim) throw new Error('avancar: a Vigília ainda não começou');
      sim.pausada = true;
      avancar(sim.estado, sim.dados, sim.fonte, n);
    };
    debug.quadros = () => ctx.medidor.quadros();
    debug.inimigos = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const lista: { slot: number; tipo: string; x: number; y: number; convertido: boolean; hp: number; salPct: number; salPassos: number; kbPassos: number }[] = [];
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
        });
      }
      return lista;
    };
    debug.projeteis = () => {
      const e = ctx.simulacao?.estado;
      if (!e) return [];
      const p = e.projeteis;
      const lista: { slot: number; arma: string; x: number; y: number; vx: number; vy: number; dano: number; vida: number; perfuracoes: number }[] = [];
      for (let s = 0; s < CAPACIDADE_DE_PROJETEIS; s++) {
        if (e.poolDeProjeteis.posicao[s]! < 0) continue;
        lista.push({ slot: s, arma: IDS_DE_ARMA[p.arma[s]!]!, x: p.x[s]!, y: p.y[s]!, vx: p.vx[s]!, vy: p.vy[s]!, dano: p.dano[s]!, vida: p.vida[s]!, perfuracoes: p.perfuracoes[s]! });
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
    webgl: d.webgl.renderer.slice(0, 40),
  };
}
