// Cena Hud (ADR-0002 §11.1; design/decisoes-F-002.md §4 e §7): 390 × 844
// lógicos com câmera própria em zoom 2, sobre a Vigília. Desenha o joystick
// (base, anel e pino: imagens do atlas que só se movem), o prompt "Deslize
// para mover" e, desde a F-004, o botão de pausa (design/decisoes-F-004.md P1).
// Desde a F-005, a barra de XP, o nível e as 12 vagas de item (decisoes-F-005 R4
// e R5). Mede a safe-area em create e resize e passa as áreas ao tradutor. Os demais
// elementos entram com as suas features.
import Phaser from 'phaser';
import { alvoDaPausa, areaDoJoystick, type Alvo } from '../entrada/alvos';
import { RAIO_DO_JOYSTICK_PT, RAIO_DO_PINO_PT } from '../entrada/joystick';
import { JOGADOR_U8, PROGRESSAO, PROMPT, VAGAS_DE_ARMA, VAGAS_DE_PASSIVA, type Estado } from '../logica/nucleo/estado';
import { medirSafeArea, type Insets } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import {
  BARRA_DE_XP,
  PRIMEIRA_PASSIVA_NO_HUD,
  VAGAS_DO_HUD,
  caixaDaBarraDeXp,
  larguraDoPreenchimento,
  vagasDoHud,
  type CaixaDaBarra,
  type VagaDoHud,
} from './layoutDoHud';
import { CHAVE_DO_ATLAS, escalaPara } from './render/atlas';
import { desenharIcone, iconeDaArma, iconeDaPassiva } from './render/icones';
import { t } from './textos';

/** Estilo "pedra e osso" (doc 13 §1.7): fundo a 35% na base do joystick e a 60% no painel. */
const ALFA_DA_BASE = 0.35;
const ALFA_DO_OSSO = 0.6;
const ALFA_DO_PAINEL = 0.6;
const BORDA_PT = 2;
/** Transições ≤ 200 ms (doc 11 §1). */
const FADE_MS = 200;
const FOLGA_DO_PAINEL = { x: 16, y: 10 };
/** Ícone de pausa (P1): disco de 44 pt a 35% e duas barras de 8 × 24 pt, 6 pt entre elas, em osso a 60%. */
const ICONE_DA_PAUSA = { disco: 44, barraLargura: 8, barraAltura: 24, entre: 6 } as const;
/** Trilho da barra de XP: #0b0e14 a 35% (R4). */
const ALFA_DO_TRILHO = 0.35;
/** Vaga vazia: contorno de 1 pt em osso a 30% (R5). */
const ALFA_DA_VAGA_VAZIA = 0.3;

export class Hud extends Phaser.Scene {
  private base: Phaser.GameObjects.Image | null = null;
  private anel: Phaser.GameObjects.Image | null = null;
  private pino: Phaser.GameObjects.Image | null = null;
  private painel: Phaser.GameObjects.Graphics | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private iconeDaPausa: Phaser.GameObjects.Graphics | null = null;
  private readonly botaoDaPausa: Alvo = { id: 'pausa', x: 0, y: 0, largura: 0, altura: 0 };
  private trilho: Phaser.GameObjects.Image | null = null;
  private preenchimento: Phaser.GameObjects.Image | null = null;
  private nivelTexto: Phaser.GameObjects.Text | null = null;
  private vagas: Phaser.GameObjects.Graphics | null = null;
  private readonly caixaDaBarra: CaixaDaBarra = { x: 0, y: 0, largura: 0, altura: 0 };
  private readonly posicoesDasVagas: VagaDoHud[] = [];
  /** Último estado lido e o que já foi desenhado dele; -1 = nada ainda. */
  private estadoVisto: Estado | null = null;
  private nivelDesenhado = -1;
  private xpDesenhado = -1;
  private assinaturaDasVagas = -1;
  private promptMostrado = false;
  private readonly area: Alvo = { id: 'joystick', x: 0, y: 0, largura: 0, altura: 0 };

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Hud' });
  }

  create(): void {
    cameraLogica(this);
    const imagem = (moldura: 'disco' | 'anel', cor: number, alfa: number, diametro: number): Phaser.GameObjects.Image =>
      this.add.image(0, 0, CHAVE_DO_ATLAS, moldura).setTint(cor).setAlpha(alfa).setScale(escalaPara(moldura, diametro)).setVisible(false);
    this.base = imagem('disco', COR.pedra, ALFA_DA_BASE, 2 * RAIO_DO_JOYSTICK_PT);
    this.anel = imagem('anel', COR.osso, ALFA_DO_OSSO, 2 * RAIO_DO_JOYSTICK_PT);
    this.pino = imagem('disco', COR.osso, ALFA_DO_OSSO, 2 * RAIO_DO_PINO_PT);
    this.iconeDaPausa = this.add.graphics();
    const barra = (cor: number, alfa: number): Phaser.GameObjects.Image =>
      this.add.image(0, 0, CHAVE_DO_ATLAS, 'quadrado').setOrigin(0, 0.5).setTint(cor).setAlpha(alfa).setScale(0, escalaPara('quadrado', BARRA_DE_XP.altura));
    this.trilho = barra(COR.pedra, ALFA_DO_TRILHO);
    this.preenchimento = barra(COR.cinzaAzul, 1).setVisible(false);
    this.nivelTexto = texto(this, 0, 0, 'A5.HUD.NIVEL', 15, COR.osso, { nivel: 1 }).setOrigin(0, 0.5);
    this.vagas = this.add.graphics();
    this.estadoVisto = null;
    this.nivelDesenhado = -1;
    this.xpDesenhado = -1;
    this.assinaturaDasVagas = -1;
    this.painel = this.add.graphics().setAlpha(0).setVisible(false);
    this.prompt = texto(this, 0, 0, 'A2.TUTORIAL.01', 18, COR.osso).setOrigin(0.5).setAlpha(0).setVisible(false);
    this.promptMostrado = false;
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    });
  }

  /** Mede a safe-area, passa a área ao tradutor e centra o prompt nela (§7). */
  private diagramar(): void {
    const ins = medirSafeArea(this.ctx.sonda, this.game.canvas, this.ctx.container, this.ctx.insets);
    this.ctx.entrada.tradutor.definirArea(ins);
    const a = areaDoJoystick(ins, this.area);
    const b = alvoDaPausa(ins, this.botaoDaPausa);
    const bx = b.x + b.largura / 2;
    const by = b.y + b.altura / 2;
    const i = ICONE_DA_PAUSA;
    this.iconeDaPausa!.clear()
      .fillStyle(COR.pedra, ALFA_DA_BASE)
      .fillCircle(bx, by, i.disco / 2)
      .fillStyle(COR.osso, ALFA_DO_OSSO)
      .fillRect(bx - i.entre / 2 - i.barraLargura, by - i.barraAltura / 2, i.barraLargura, i.barraAltura)
      .fillRect(bx + i.entre / 2, by - i.barraAltura / 2, i.barraLargura, i.barraAltura);
    this.diagramarProgresso(ins);
    const cx = a.x + a.largura / 2;
    const cy = a.y + a.altura / 2;
    const p = this.prompt!;
    p.setPosition(cx, cy);
    const w = p.width + 2 * FOLGA_DO_PAINEL.x;
    const h = p.height + 2 * FOLGA_DO_PAINEL.y;
    this.painel!.clear()
      .fillStyle(COR.pedra, ALFA_DO_PAINEL)
      .fillRect(cx - w / 2, cy - h / 2, w, h)
      .lineStyle(BORDA_PT, COR.osso, 1)
      .strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  /** Barra de XP, nível e vagas na safe-area (R4 e R5); força a releitura do estado. */
  private diagramarProgresso(ins: Insets): void {
    const c = caixaDaBarraDeXp(ins, this.caixaDaBarra);
    const meio = c.y + c.altura / 2;
    this.trilho!.setPosition(c.x, meio).setScale(escalaPara('quadrado', c.largura), escalaPara('quadrado', c.altura));
    this.preenchimento!.setPosition(c.x, meio);
    this.nivelTexto!.setPosition(c.x + c.largura + BARRA_DE_XP.folgaDoNivel, meio);
    vagasDoHud(ins, this.posicoesDasVagas);
    this.xpDesenhado = -1;
    this.assinaturaDasVagas = -1;
  }

  /** Nível, preenchimento e vagas: cada um só muda quando o valor muda; nada aloca por quadro. */
  private atualizarProgresso(sim: NonNullable<ContextoDoJogo['simulacao']>): void {
    const e = sim.estado;
    if (e !== this.estadoVisto) {
      this.estadoVisto = e;
      this.nivelDesenhado = -1;
      this.xpDesenhado = -1;
      this.assinaturaDasVagas = -1;
    }
    const nivel = e.progresso[PROGRESSAO.nivel]!;
    const xp = e.progresso[PROGRESSAO.xp]!;
    if (nivel !== this.nivelDesenhado) {
      this.nivelDesenhado = nivel;
      this.nivelTexto!.setText(t('A5.HUD.NIVEL', { nivel }));
      this.xpDesenhado = -1;
    }
    if (xp !== this.xpDesenhado) {
      this.xpDesenhado = xp;
      const custo = sim.dados.progressao.custo;
      const l = larguraDoPreenchimento(this.caixaDaBarra.largura, xp, nivel < custo.length ? custo[nivel]! : 0);
      this.preenchimento!.setVisible(l > 0).setScale(escalaPara('quadrado', l), escalaPara('quadrado', BARRA_DE_XP.altura));
    }
    const assinatura = this.assinaturaDaBuild(e);
    if (assinatura !== this.assinaturaDasVagas) {
      this.assinaturaDasVagas = assinatura;
      this.desenharVagas(e);
    }
  }

  /** Os códigos das armas e das passivas em base 16: o ícone só depende deles (o nível não muda o desenho). */
  private assinaturaDaBuild(e: Estado): number {
    let a = 0;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) a = a * 16 + e.build.codigo[v]!;
    for (let v = 0; v < VAGAS_DE_PASSIVA; v++) a = a * 16 + e.passivas.codigo[v]!;
    return a;
  }

  private desenharVagas(e: Estado): void {
    const g = this.vagas!.clear();
    const lado = VAGAS_DO_HUD.lado;
    for (let i = 0; i < this.posicoesDasVagas.length; i++) {
      const { x, y } = this.posicoesDasVagas[i]!;
      let icone: ReturnType<typeof iconeDaArma> = null;
      if (i < VAGAS_DE_ARMA) icone = iconeDaArma(e.build.codigo[i]!);
      else if (i >= PRIMEIRA_PASSIVA_NO_HUD) icone = iconeDaPassiva(e.passivas.codigo[i - PRIMEIRA_PASSIVA_NO_HUD]!);
      if (icone !== null) desenharIcone(g, icone, x + lado / 2, y + lado / 2, lado);
      else g.lineStyle(1, COR.osso, ALFA_DA_VAGA_VAZIA).strokeRect(x + 0.5, y + 0.5, lado - 1, lado - 1);
    }
  }

  override update(): void {
    const j = this.ctx.entrada.tradutor.joystick;
    this.base!.setVisible(j.ativo);
    this.anel!.setVisible(j.ativo);
    this.pino!.setVisible(j.ativo);
    if (j.ativo) {
      this.base!.setPosition(j.origemX, j.origemY);
      this.anel!.setPosition(j.origemX, j.origemY);
      this.pino!.setPosition(j.origemX + j.pinoX, j.origemY + j.pinoY);
    }
    const sim = this.ctx.simulacao;
    const mostrar = sim !== null && sim.estado.jogadorU8[JOGADOR_U8.promptMover] === PROMPT.visivel;
    if (mostrar !== this.promptMostrado) this.fadeDoPrompt(mostrar);
    if (sim !== null) this.atualizarProgresso(sim);
  }

  private fadeDoPrompt(mostrar: boolean): void {
    this.promptMostrado = mostrar;
    const alvos = [this.painel!, this.prompt!];
    this.tweens.killTweensOf(alvos);
    if (mostrar) for (const a of alvos) a.setVisible(true);
    this.tweens.add({
      targets: alvos,
      alpha: mostrar ? 1 : 0,
      duration: FADE_MS,
      onComplete: () => {
        if (!mostrar) for (const a of alvos) a.setVisible(false);
      },
    });
  }
}
