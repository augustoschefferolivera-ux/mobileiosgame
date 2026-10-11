// Monta o Phaser.Game (ADR-0002 §3, §11 e §12; skills game-setup-and-config e
// scale-and-responsive): canvas fixo de 780 × 1688 (390 × 844 @2×) com FIT,
// passo fixo sem suavização e todo o input do Phaser desligado.
import Phaser from 'phaser';
import { CamadaDeToque } from '../entrada/camadaDeToque';
import { FilaDeToques } from '../entrada/filaDeToques';
import { ligarTecladoDeDebug } from '../entrada/teclado';
import { TradutorDeGestos } from '../entrada/tradutorDeGestos';
import { criarAudioSilencioso } from '../plataforma/audio';
import { bloquearGestos } from '../plataforma/bloqueioDeGestos';
import { lerParametros, sortearSeed } from '../plataforma/parametros';
import { ALTURA_LOGICA, LARGURA_LOGICA, insetsZerados } from '../plataforma/safeArea';
import { RegistroDeTelemetria } from '../plataforma/telemetria';
import { Acender } from './Acender';
import { Boot } from './Boot';
import type { ContextoDoJogo } from './contexto';
import { instalarDebug } from './debug';
import { COR, ESCALA_DO_CANVAS } from './estilo';
import { t } from './textos';
import { Vigilia } from './Vigilia';

export const LARGURA_CANVAS = LARGURA_LOGICA * ESCALA_DO_CANVAS;
export const ALTURA_CANVAS = ALTURA_LOGICA * ESCALA_DO_CANVAS;

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
    entrada: { fila: new FilaDeToques(), tradutor: new TradutorDeGestos() },
    insets: insetsZerados(),
    tela: 'BOOT',
    simulacao: null,
    audioSilencioso: criarAudioSilencioso(document),
    desbloqueioDoAudio: null,
    roteiro: null,
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
    // Sem MSAA: a 780 × 1688 o 4× custaria ≈ 40 MB de buffers multiamostrados (ADR-0003 §9).
    render: { antialiasGL: false },
    input: { touch: false, mouse: false, keyboard: false, gamepad: false, windowEvents: false },
    callbacks: {
      // O nosso desbloqueio, no touchend do botão de Acender, é o único caminho por toque (ADR-0002 §12):
      // tira o unlock automático que o WebAudioSoundManager agenda para o BOOT (listeners no body).
      // O onGameVisible do Phaser (suspend/resume ao voltar a ficar visível) fica; ver ADR-0003 §1.
      preBoot: (game) => {
        if (game.sound instanceof Phaser.Sound.WebAudioSoundManager) {
          game.events.off(Phaser.Core.Events.BOOT, game.sound.unlock, game.sound);
        }
      },
      postBoot: (game) => {
        const camada = new CamadaDeToque(game.canvas, ehBuildDeDebug, ctx.entrada.fila);
        camada.ligar();
        // O FIT muda o estilo do canvas no refresh do ScaleManager, que emite RESIZE.
        game.scale.on(Phaser.Scale.Events.RESIZE, camada.invalidarCaixa);
        ctx.camada = camada;
        if (ehBuildDeDebug) ligarTecladoDeDebug(window, ctx.entrada.tradutor.teclado);
      },
    },
    scene: [new Boot(ctx), new Acender(ctx), new Vigilia(ctx)],
  });
  instalarDebug(jogo, ctx);
  return jogo;
}
