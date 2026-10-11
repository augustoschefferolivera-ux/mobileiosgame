// Tela de Acender (doc 11 §3.1; ADR-0002 §11.1 e §12): botão único "Toque
// para acender a Chama", frase e aviso da chave de silêncio. O toque é tratado
// pela camada DOM: o desbloqueio do áudio roda dentro do touchend.
import Phaser from 'phaser';
import { acharAlvo, alvosDoAcender, type Alvo } from '../entrada/alvos';
import { desbloquearAudio, type SomDesbloqueavel } from '../plataforma/audio';
import { ALTURA_LOGICA, LARGURA_LOGICA, medirSafeArea } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';

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
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.ctx.camada?.aoSoltar(this.aoSoltar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
      this.ctx.camada?.removerAoSoltar(this.aoSoltar);
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
    // Chama provisória no lugar do logotipo (formas geométricas até a arte).
    g.fillStyle(COR.brasa).fillTriangle(cx, b.y - 156, cx - 24, b.y - 84, cx + 24, b.y - 84);
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
    });
    this.scene.start('Vigilia');
  };
}
