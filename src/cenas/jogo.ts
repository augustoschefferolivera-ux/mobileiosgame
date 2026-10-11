// Monta o Phaser.Game (ADR-0002 §3, §11 e §12; skills game-setup-and-config e
// scale-and-responsive): canvas fixo de 780 × 1688 (390 × 844 @2×) com FIT,
// passo fixo sem suavização e todo o input do Phaser desligado.
import Phaser from 'phaser';
import { CamadaDeToque } from '../entrada/camadaDeToque';
import { criarAudioSilencioso } from '../plataforma/audio';
import { bloquearGestos } from '../plataforma/bloqueioDeGestos';
import { lerParametros, sortearSeed } from '../plataforma/parametros';
import { insetsZerados } from '../plataforma/safeArea';
import { RegistroDeTelemetria } from '../plataforma/telemetria';
import { Acender } from './Acender';
import { Boot } from './Boot';
import type { ContextoDoJogo } from './contexto';
import { instalarDebug } from './debug';
import { COR } from './estilo';
import { t } from './textos';
import { Vigilia } from './Vigilia';

export const LARGURA_CANVAS = 780;
export const ALTURA_CANVAS = 1688;

function elemento(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`index.html sem #${id}`);
  return el;
}

export function iniciarJogo(): Phaser.Game {
  const ehBuildDeDebug = import.meta.env.DEV || import.meta.env.MODE === 'debug';
  const params = lerParametros(location.search, ehBuildDeDebug);
  bloquearGestos(document);
  document.title = t('A8.SISTEMA.TITULO');

  const ctx: ContextoDoJogo = {
    seed: params.seed ?? sortearSeed(),
    ehBuildDeDebug,
    telemetria: new RegistroDeTelemetria(),
    sonda: elemento('sonda-safe-area'),
    container: elemento('jogo'),
    camada: null,
    insets: insetsZerados(),
    tela: 'BOOT',
    simulacao: null,
    audioSilencioso: criarAudioSilencioso(document),
    desbloqueioDoAudio: null,
  };

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    backgroundColor: COR.fundo,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      parent: 'jogo',
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: LARGURA_CANVAS,
      height: ALTURA_CANVAS,
      expandParent: false,
    },
    fps: { target: 60, limit: 0, forceSetTimeOut: false, smoothStep: false },
    input: { touch: false, mouse: false, keyboard: false, gamepad: false, windowEvents: false },
    callbacks: {
      // O nosso desbloqueio, no touchend do botão de Acender, é o único caminho (ADR-0002 §12):
      // tira o unlock automático que o WebAudioSoundManager agenda para o BOOT (listeners no body).
      preBoot: (game) => {
        if (game.sound instanceof Phaser.Sound.WebAudioSoundManager) {
          game.events.off(Phaser.Core.Events.BOOT, game.sound.unlock, game.sound);
        }
      },
      postBoot: (game) => {
        const camada = new CamadaDeToque(game.canvas, ehBuildDeDebug);
        camada.ligar();
        ctx.camada = camada;
      },
    },
    scene: [new Boot(ctx), new Acender(ctx), new Vigilia(ctx)],
  });
  instalarDebug(jogo, ctx);
  return jogo;
}
