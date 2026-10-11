// window.__GAME_DEBUG__ (B §3.13; ADR-0002 §14). Sempre presente e só de
// leitura; os ganchos de escrita (pausar, retomar, avancar) só existem no build
// de debug. Os campos dos sistemas que ainda não existem entram com as suas
// features (jogador, chefe, save, teto, degradacao, cpuFrameMs, build...).
import type Phaser from 'phaser';
import { BYTES_ESTADO, CAB, hashEstado } from '../logica/nucleo/estado';
import { hex8 } from '../logica/nucleo/hash';
import { avancar } from '../logica/nucleo/passo';
import { atributosDe, bytesDoBackbuffer } from '../plataforma/memoria';
import type { ContextoDoJogo } from './contexto';

/** Tipos de entidade de `vivos` (ADR-0002 §14); todos em zero até a F-002/F-003. */
const TIPOS_VIVOS = [
  'oco_das_lanternas', 'oco_grande', 'novica_de_sal', 'oco_grande_coroado', 'o_lanterneiro',
  'projeteis', 'efeitos', 'pickups', 'particulas',
] as const;

/** Backbuffer pelo contexto real (WebGL) ou, no Canvas, cor em dobro. */
function bytesDoCanvas(jogo: Phaser.Game): number {
  const { width, height } = jogo.canvas;
  const gl = (jogo.renderer as Partial<Phaser.Renderer.WebGL.WebGLRenderer>).gl;
  if (!gl) return width * height * 4 * 2;
  return bytesDoBackbuffer(width, height, atributosDe(gl));
}

export interface GameDebug {
  readonly fps: number;
  readonly passo: number;
  /** Relógio da Vigília em passos (para na Fogueira, a partir da F-008). */
  readonly relogio: number;
  readonly estado: string;
  readonly vivos: Record<(typeof TIPOS_VIVOS)[number], number>;
  readonly passos_perdidos: number;
  readonly recusados: { inimigos: number; projeteis: number; efeitos: number; pickups: number };
  readonly memoriaEstimadaMB: number;
  readonly seed: number;
  /** Ids de t() visíveis nas cenas ativas. */
  readonly textoAtivo: string[];
  readonly eventos: ReturnType<ContextoDoJogo['telemetria']['eventos']>;
  /** Estado devolvido pelo nosso desbloqueio no toque de Acender (null antes). */
  readonly desbloqueioDoAudio: string | null;
  /** `locked` do SoundManager do Phaser: só o nosso desbloqueio o leva a false (F-001.14). */
  readonly somTravado: boolean;
  hash(): string | null;
  audio(): string;
  pausar?: () => void;
  retomar?: () => void;
  avancar?: (n: number) => void;
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
      return Object.fromEntries(TIPOS_VIVOS.map((tipo) => [tipo, 0])) as GameDebug['vivos'];
    },
    get passos_perdidos() {
      return ctx.simulacao?.acumulador.passosPerdidos ?? 0;
    },
    get recusados() {
      return { inimigos: 0, projeteis: 0, efeitos: 0, pickups: 0 };
    },
    get memoriaEstimadaMB() {
      bytesBackbuffer ??= bytesDoCanvas(jogo);
      return (BYTES_ESTADO + bytesBackbuffer) / (1024 * 1024);
    },
    get seed() {
      return ctx.seed;
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
    debug.avancar = (n: number) => {
      const sim = ctx.simulacao;
      if (!sim) throw new Error('avancar: a Vigília ainda não começou');
      sim.pausada = true;
      avancar(sim.estado, n);
    };
  }
  (window as unknown as { __GAME_DEBUG__: GameDebug }).__GAME_DEBUG__ = debug;
  return debug;
}
