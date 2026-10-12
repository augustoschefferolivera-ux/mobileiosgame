// Tela de Acender (doc 11 §3.1; ADR-0002 §11.1 e §12): botão único "Toque
// para acender a Chama", frase e aviso da chave de silêncio. O toque é tratado
// pela camada DOM: o desbloqueio do áudio roda dentro do touchend. Também
// aquece o programa do SpriteGPULayer da horda (ADR-0002 §11) e, se ele não
// puder rodar neste aparelho, passa a horda para o plano B
// (design/decisoes-F-003.md §7).
import Phaser from 'phaser';
import { acharAlvo, alvosDoAcender, type Alvo } from '../entrada/alvos';
import { desbloquearAudio, type SomDesbloqueavel } from '../plataforma/audio';
import { FPS_MINIMO_PARA_O_CACHE, armazenamentoLocal, gravarCacheDoTeto } from '../plataforma/sonda';
import { decidirTeto } from '../plataforma/teto';
import { ALTURA_LOGICA, LARGURA_LOGICA, medirSafeArea } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { criarLayerDaHorda, liberarLayer } from './render/escritores';
import { CHAVE_DO_ATLAS } from './render/atlas';
import { ESCALA_DA_GRADE } from '../arte/catalogo';

interface NavegadorComSessao {
  audioSession?: { type: string };
}

export class Acender extends Phaser.Scene {
  private readonly alvos: Alvo[] = [];
  private acendeu = false;
  private desenho: Phaser.GameObjects.Graphics | null = null;
  private rotulo: Phaser.GameObjects.Text | null = null;
  private frase: Phaser.GameObjects.Text | null = null;
  private aviso: Phaser.GameObjects.Text | null = null;
  /** O Aldric e a luz da brasa no lugar do logotipo (F-011). */
  private aldric: Phaser.GameObjects.Image | null = null;
  private brilho: Phaser.GameObjects.Image | null = null;
  private aquecimento: Phaser.GameObjects.SpriteGPULayer | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Acender' });
  }

  create(): void {
    this.ctx.tela = 'ACENDER';
    this.acendeu = false;
    cameraLogica(this);
    this.desenho = this.add.graphics();
    this.rotulo = texto(this, 0, 0, 'A1.ACENDER.BOTAO', 18, COR.osso).setOrigin(0.5);
    this.frase = texto(this, 0, 0, 'A1.ACENDER.FRASE', 16, COR.sal).setOrigin(0.5);
    this.aviso = texto(this, 0, 0, 'A1.ACENDER.AVISO_AUDIO', 13, COR.sal).setOrigin(0.5).setAlpha(0.7);
    this.aviso.setWordWrapWidth(300);
    // F-011: a luz da brasa (aditiva) e o Aldric a 4 pt por px (96 pt), respirando a 2 quadros por segundo.
    this.brilho = this.add.image(0, 0, CHAVE_DO_ATLAS, 'brilho').setScale(ESCALA_DA_GRADE.arte).setBlendMode(Phaser.BlendModes.ADD);
    this.aldric = this.add.image(0, 0, CHAVE_DO_ATLAS, 'aldric_parado').setScale(2 * ESCALA_DA_GRADE.arte);
    let quadro = 0;
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        quadro ^= 1;
        this.aldric?.setFrame(quadro === 0 ? 'aldric_parado' : 'aldric_parado_2');
      },
    });
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    const camada = this.ctx.camada;
    if (!camada) throw new Error('Acender: a camada de toque nasce no postBoot, antes desta cena');
    camada.aoSoltar(this.aoSoltar);
    this.aquecer();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
      camada.removerAoSoltar(this.aoSoltar);
      if (this.aquecimento) liberarLayer(this.aquecimento);
      this.aquecimento = null;
    });
  }

  /**
   * Desenha uma vez um SpriteGPULayer de 1 membro invisível (escala 0), para
   * compilar o programa antes da Vigília (o cache de programas é do renderer).
   * O vertex shader dele lê uma textura: sem unidade de textura no vértice, ou
   * se a criação falhar, a horda vai para o plano B, também em produção.
   */
  private aquecer(): void {
    const render = this.ctx.render;
    const gl = (this.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    if (Number(gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)) === 0) {
      render.modo = 'image';
      render.origem = 'fallback';
    }
    if (render.modo !== 'gpu' || this.aquecimento) return;
    try {
      this.aquecimento = criarLayerDaHorda(this, 1, render.bufferDinamico);
    } catch {
      render.modo = 'image';
      render.origem = 'fallback';
      return;
    }
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      render.aquecido = true;
      this.aquecimento?.setVisible(false);
    });
  }

  /** Recalcula a safe-area e reposiciona tudo; o canvas não muda. */
  private diagramar(): void {
    const ins = medirSafeArea(this.ctx.sonda, this.game.canvas, this.ctx.container, this.ctx.insets);
    const b = alvosDoAcender(ins, this.alvos)[0]!;
    const cx = b.x + b.largura / 2;
    const g = this.desenho!;
    g.clear();
    g.fillStyle(COR.fundo).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    // O Aldric no lugar do logotipo (F-011), no mesmo vão da chama provisória (de b.y − 168 a b.y − 72).
    this.aldric!.setPosition(Math.round(cx), Math.round(b.y - 120));
    this.brilho!.setPosition(Math.round(cx), Math.round(b.y - 112));
    g.fillStyle(COR.cinzaFrio).fillRect(b.x, b.y, b.largura, b.altura);
    g.lineStyle(2, COR.laranjaQueimado).strokeRect(b.x, b.y, b.largura, b.altura);
    this.rotulo!.setPosition(cx, b.y + b.altura / 2);
    this.frase!.setPosition(cx, b.y + b.altura + 32);
    const yAviso = ALTURA_LOGICA - ins.baixo - 40;
    this.aviso!.setPosition(cx + 10, yAviso);
    // Ícone de áudio visível ao lado do aviso (doc 12 §8): alto-falante geométrico.
    const xi = cx - this.aviso!.width / 2 - 6;
    g.fillStyle(COR.sal, 0.7).fillRect(xi - 10, yAviso - 3, 4, 6);
    g.fillTriangle(xi - 7, yAviso, xi, yAviso - 7, xi, yAviso + 7);
  }

  /** Chamado de forma síncrona pela camada de toque, dentro do touchend. */
  private readonly aoSoltar = (x: number, y: number): void => {
    if (this.acendeu || acharAlvo(this.alvos, x, y)?.id !== 'acender') return;
    this.acendeu = true;
    const nav = navigator as Navigator & NavegadorComSessao;
    void desbloquearAudio(this.sound as unknown as SomDesbloqueavel, {
      audioSession: nav.audioSession,
      tocarSilencio: () => {
        this.ctx.audioSilencioso.play().catch(() => undefined);
      },
    }).then((estado) => {
      this.ctx.desbloqueioDoAudio = estado;
    });
    // Toque antes do fim da sonda: a Vigília fica com o fallback (300) e nada vai para o cache (decisoes-F-004 §5).
    this.ctx.sondaDoTeto = null;
    this.scene.start('Vigilia');
  };

  /**
   * Uma etapa da sonda do TETO por quadro, depois do aquecimento do layer
   * (ou já, no plano B): no fim, decide o TETO e grava o cache, exceto com o
   * rAF a 30 fps (ADR-0002 §13).
   */
  override update(): void {
    const p = this.ctx.sondaDoTeto;
    if (!p || this.acendeu) return;
    if (!this.ctx.render.aquecido && this.ctx.render.modo === 'gpu') return;
    const r = p.sonda.etapa();
    if (!r) return;
    this.ctx.sondaDoTeto = null;
    this.ctx.teto = decidirTeto({ ...p.entradas, sonda: r });
    if (this.game.loop.actualFps >= FPS_MINIMO_PARA_O_CACHE) gravarCacheDoTeto(armazenamentoLocal(), p.identidade, this.ctx.teto.valor);
  }
}
