// Menu da Fogueira (design/decisoes-F-008.md FG8; ADR-0010 §6): três botões à esquerda (Descansar, Forjar União e
// Partir), sobre a Vigília que segue desenhada, e a linha "Vigília guardada" quando a gravação deu certo. A simulação roda
// por baixo (parada pela etapa FOGUEIRA), então não há véu. Os Text são criados uma vez e trocados só quando o estado do botão
// muda (o __GAME_DEBUG__.textoAtivo os lê pelo `idTexto`); a cena fica invisível fora da Fogueira. Os toques vêm do
// tradutor (alvosDaFogueira, como os botões Aparo e Frasco): esta cena só desenha.
import Phaser from 'phaser';
import { alvosDaFogueira, type Alvo } from '../entrada/alvos';
import { ETAPA, FASE, FOGUEIRA_U8, JOGADOR4_U8, PROGRESSAO } from '../logica/nucleo/estado';
import { modalAberto } from '../logica/progressao/modal';
import { uniaoForjavel } from '../logica/progressao/bau';
import { medirSafeArea } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { botoesDaFogueira } from './botoesDaFogueira';
import { t } from './textos';

const ALFA_DO_FUNDO = 0.85;
const ALFA_DO_DESABILITADO = 0.45;
const FOLGA_DO_TEXTO = 12;
const CORPO_DO_TITULO = 18;
const CORPO_DO_EFEITO = 12;
const CORPO_DO_AVISO = 13;

const IDS_DOS_TITULOS = ['I1.FOGUEIRA.DESCANSAR', 'I1.FOGUEIRA.FORJAR', 'I1.FOGUEIRA.PARTIR'] as const;

export class Fogueira extends Phaser.Scene {
  private fundo: Phaser.GameObjects.Graphics | null = null;
  private readonly titulos: Phaser.GameObjects.Text[] = [];
  private readonly efeitos: Phaser.GameObjects.Text[] = [];
  private aviso: Phaser.GameObjects.Text | null = null;
  private readonly alvos: Alvo[] = [];
  private aberta = false;
  /** A assinatura do que está desenhado (ações, forjável, Almas suficientes, guardada, hora); -1 = nada. */
  private desenhada = -1;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Fogueira' });
  }

  create(): void {
    cameraLogica(this);
    this.fundo = this.add.graphics();
    this.titulos.length = this.efeitos.length = 0;
    for (const id of IDS_DOS_TITULOS) this.titulos.push(texto(this, 0, 0, id, CORPO_DO_TITULO, COR.osso).setOrigin(0, 0));
    for (let k = 0; k < IDS_DOS_TITULOS.length; k++) {
      this.efeitos.push(texto(this, 0, 0, 'I1.FOGUEIRA.PARTIR_EFEITO', CORPO_DO_EFEITO, COR.sal, undefined, 240).setOrigin(0, 0));
    }
    this.aviso = texto(this, 0, 0, 'I1.FOGUEIRA.GUARDADA', CORPO_DO_AVISO, COR.brasa).setOrigin(0, 1);
    this.aberta = false;
    this.desenhada = -1;
    this.scene.setVisible(false);
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    });
  }

  private diagramar(): void {
    const ins = medirSafeArea(this.ctx.sonda, this.game.canvas, this.ctx.container, this.ctx.insets);
    alvosDaFogueira(ins, this.alvos);
    for (let k = 0; k < this.alvos.length; k++) {
      const a = this.alvos[k]!;
      this.titulos[k]!.setPosition(a.x + FOLGA_DO_TEXTO, a.y + 8);
      this.efeitos[k]!.setPosition(a.x + FOLGA_DO_TEXTO, a.y + 8 + CORPO_DO_TITULO + 6).setWordWrapWidth(a.largura - 2 * FOLGA_DO_TEXTO);
    }
    this.aviso!.setPosition(this.alvos[0]!.x, this.alvos[0]!.y - 8);
    this.desenhada = -1;
  }

  override update(): void {
    const sim = this.ctx.simulacao;
    const e = sim?.estado;
    const aberta =
      e !== undefined &&
      sim !== null &&
      e.fogueiraU8[FOGUEIRA_U8.etapa] === ETAPA.fogueira &&
      e.jogador4U8[JOGADOR4_U8.fase] === FASE.viva &&
      !sim.pausa.ativa &&
      !modalAberto(e);
    if (aberta !== this.aberta) {
      this.aberta = aberta;
      this.scene.setVisible(aberta);
      this.desenhada = -1;
    }
    if (!aberta || sim === null || e === undefined) return;
    const hora = e.fogueiraU8[FOGUEIRA_U8.fogueiraHora]!;
    const custo = sim.dados.progressao.forjaCusto[hora]!;
    const acoes = e.fogueiraU8[FOGUEIRA_U8.fogueiraAcoes]!;
    const forjavel = uniaoForjavel(e, sim.dados) >= 0;
    const almas = e.progresso[PROGRESSAO.almas]!;
    const guardada = sim.gravador?.guardou === true;
    const assinatura = acoes | (forjavel ? 4 : 0) | (almas >= custo ? 8 : 0) | (guardada ? 16 : 0) | (hora << 5);
    if (assinatura === this.desenhada) return;
    this.desenhada = assinatura;
    const botoes = botoesDaFogueira(acoes, forjavel, almas, custo);
    const g = this.fundo!.clear();
    for (let k = 0; k < botoes.length; k++) {
      const b = botoes[k]!;
      const a = this.alvos[k]!;
      const alfa = b.habilitado ? 1 : ALFA_DO_DESABILITADO;
      g.fillStyle(COR.pedra, ALFA_DO_FUNDO).fillRect(a.x, a.y, a.largura, a.altura);
      g.lineStyle(2, b.habilitado ? COR.laranjaQueimado : COR.cinzaFrio).strokeRect(a.x, a.y, a.largura, a.altura);
      this.titulos[k]!.setAlpha(alfa);
      this.efeitos[k]!.setAlpha(alfa);
      this.efeitos[k]!.setText(t(b.efeito, b.custo === undefined ? undefined : { custo: b.custo })).setData('idTexto', b.efeito);
    }
    this.aviso!.setVisible(guardada);
  }
}
