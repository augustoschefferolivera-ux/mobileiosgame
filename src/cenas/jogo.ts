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
import { parametrosDoCenario } from '../plataforma/cenarios';
import { ALTURA_LOGICA, LARGURA_LOGICA, insetsZerados } from '../plataforma/safeArea';
import { SondaDoTeto, armazenamentoLocal, classeDaTela, lerCacheDoTeto, versaoDoSafari } from '../plataforma/sonda';
import { decidirTeto, type EntradasDoTeto } from '../plataforma/teto';
import { montarEstadoDaSonda } from '../logica/nucleo/sonda';
import { criarDadosDaCharneca } from '../plataforma/dadosDaVigilia';
import { RegistroDeTelemetria } from '../plataforma/telemetria';
import { suportaWebGL } from '../plataforma/webgl';
import { Acender } from './Acender';
import { FeedbackDaInterface } from './feedback';
import { Boot } from './Boot';
import { Hud } from './Hud';
import { Pausa } from './Pausa';
import type { ContextoDoJogo } from './contexto';
import { instalarDebug, instantaneoDoDebug } from './debug';
import { MedidorDeQuadros } from './medidas';
import { instalarPainelDeDebug } from '../plataforma/painelDeDebug';
import { COR, ESCALA_DO_CANVAS } from './estilo';
import { t } from './textos';
import { Modal } from './Modal';
import { Vigilia } from './Vigilia';

export const LARGURA_CANVAS = LARGURA_LOGICA * ESCALA_DO_CANVAS;
export const ALTURA_CANVAS = ALTURA_LOGICA * ESCALA_DO_CANVAS;

function elemento(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`index.html sem #${id}`);
  return el;
}

/** Sem WebGL, um aviso no lugar do canvas (ADR-0004 §6). */
function mostrarSemWebGL(container: HTMLElement): void {
  const aviso = document.createElement('p');
  aviso.className = 'sem-webgl';
  aviso.textContent = t('A8.SISTEMA.SEM_WEBGL');
  container.appendChild(aviso);
}

/** Cria o jogo; sem WebGL, mostra o aviso e devolve null. */
export function iniciarJogo(): Phaser.Game | null {
  const ehBuildDeDebug = import.meta.env.DEV || import.meta.env.MODE === 'debug';
  const params = lerParametros(location.search, ehBuildDeDebug);
  bloquearGestos(document);
  document.title = t('A8.SISTEMA.TITULO');
  if (!suportaWebGL(document)) {
    mostrarSemWebGL(elemento('jogo'));
    return null;
  }

  // TETO (ADR-0002 §13): override, cache, classe de tela, sonda e fallback, nessa ordem. A sonda só roda se as três
  // primeiras camadas não decidirem e ?sonda=0 não a desligar (decisoes-F-004 §5); ela termina na Tela de Acender.
  const tela = { dpr: window.devicePixelRatio, largura: window.screen.width, altura: window.screen.height };
  const identidade = { build: __VDC_BUILD__, versaoDoSafari: versaoDoSafari(navigator.userAgent), tela: classeDaTela(tela) };
  const entradas: EntradasDoTeto = { override: params.teto, cache: lerCacheDoTeto(armazenamentoLocal(), identidade), tela, sonda: null };
  const teto = decidirTeto(entradas);
  let sondaDoTeto = null;
  if (teto.origem === 'fallback' && params.sonda) {
    const dados = criarDadosDaCharneca();
    sondaDoTeto = { sonda: new SondaDoTeto(montarEstadoDaSonda(dados), dados, () => performance.now()), entradas, identidade };
  }

  const ctx: ContextoDoJogo = {
    seed: params.seed ?? sortearSeed(),
    ehBuildDeDebug,
    pularTutoriais: params.pularTutoriais,
    vistos: params.vistos,
    inicio: params.inicio,
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
    acoesDoRoteiro: null,
    teto,
    sondaDoTeto,
    cenario: params.cenario === null ? null : { id: params.cenario, parametros: parametrosDoCenario(params.cenario) },
    render: { modo: params.render, origem: 'parametro', bufferDinamico: params.bufferDinamico, aquecido: false },
    opcoes: { numerosDeDano: true, som: true, flashes: true },
    feedback: new FeedbackDaInterface(),
    sfx: null,
    flashSegurar: params.flashSegurar,
    debug: params.debug,
    medidor: new MedidorDeQuadros(),
  };

  const jogo = new Phaser.Game({
    // Só WebGL: o render da F-002 em diante depende do tint (WebGL only no Phaser 4) e, na F-003, do
    // SpriteGPULayer. No renderer Canvas tudo sairia em branco, a cor do aparo (ADR-0004 §6). Sem
    // WebGL, iniciarJogo já mostrou o aviso acima e não chega aqui.
    type: Phaser.WEBGL,
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
        if (ehBuildDeDebug) ligarTecladoDeDebug(window, ctx.entrada.tradutor.teclado, () => ctx.entrada.tradutor.pedirEsquivaDoTeclado());
      },
    },
    scene: [new Boot(ctx), new Acender(ctx), new Vigilia(ctx), new Hud(ctx), new Modal(ctx), new Pausa(ctx)],
  });
  const debug = instalarDebug(jogo, ctx);
  if (ctx.debug) instalarPainelDeDebug(document, () => instantaneoDoDebug(debug));
  return jogo;
}
