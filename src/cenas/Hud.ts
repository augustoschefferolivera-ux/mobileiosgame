// Cena Hud (ADR-0002 §11.1; design/decisoes-F-002.md §4 e §7): 390 × 844
// lógicos com câmera própria em zoom 2, sobre a Vigília. Desenha o joystick
// (base, anel e pino: imagens do atlas que só se movem), o prompt "Deslize
// para mover" e, desde a F-004, o botão de pausa (design/decisoes-F-004.md P1).
// Desde a F-005, a barra de XP, o nível e as 12 vagas de item (decisoes-F-005 R4
// e R5). Mede a safe-area em create e resize e passa as áreas ao tradutor. Os demais
// elementos entram com as suas features.
import Phaser from 'phaser';
import { alvoDaPausa, alvoDoAparo, areaDoJoystick, type Alvo } from '../entrada/alvos';
import { RAIO_DO_JOYSTICK_PT, RAIO_DO_PINO_PT } from '../entrada/joystick';
import { JOGADOR3, JOGADOR3_U8, PROGRESSAO, VAGAS_DE_ARMA, VAGAS_DE_PASSIVA, type Estado } from '../logica/nucleo/estado';
import { ALTURA_LOGICA, LARGURA_LOGICA, medirSafeArea, type Insets } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { IDS_DOS_PROMPTS, promptEmTela } from './prompts';
import {
  BARRA_DE_STAMINA,
  BARRA_DE_XP,
  ESTADO_DO_APARO,
  PRIMEIRA_PASSIVA_NO_HUD,
  PULSO_DA_STAMINA,
  QUADROS_DO_APARO_PRESSIONADO,
  STAMINA_DA_ESQUIVA,
  VAGAS_DO_HUD,
  caixaDaBarraDeStamina,
  caixaDaBarraDeXp,
  estadoDoAparo,
  larguraDaStamina,
  larguraDoPreenchimento,
  xDaMarcaDeStamina,
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
/** Largura de quebra antes da primeira medição (a área de 234 pt menos a folga); o diagramar refaz. */
const LARGURA_DE_QUEBRA_INICIAL = 202;
/** Ícone de pausa (P1): disco de 44 pt a 35% e duas barras de 8 × 24 pt, 6 pt entre elas, em osso a 60%. */
const ICONE_DA_PAUSA = { disco: 44, barraLargura: 8, barraAltura: 24, entre: 6 } as const;
/** Trilho da barra de XP: #0b0e14 a 35% (R4). */
const ALFA_DO_TRILHO = 0.35;
/** Botão Aparo (AP1, RE2): anel osso de 3 pt (diâmetro de 64 pt) com o glifo ⟲ em arco, sem texto. */
const BOTAO_DO_APARO_DESENHO = { raioDoAnel: 32, traco: 3, raioDoGlifo: 14, tracoDoGlifo: 3, alfaPressionado: 0.35, alfaIndisponivel: 0.35, arco: [4.2, -0.6] as const } as const;
/** Vaga vazia: contorno de 1 pt em osso a 30% (R5). */
const ALFA_DA_VAGA_VAZIA = 0.3;

export class Hud extends Phaser.Scene {
  private base: Phaser.GameObjects.Image | null = null;
  private anel: Phaser.GameObjects.Image | null = null;
  private pino: Phaser.GameObjects.Image | null = null;
  private painel: Phaser.GameObjects.Graphics | null = null;
  /** Um Text por prompt (mover, esquiva, aparo; TU11) e um painel só. */
  private readonly prompts: Phaser.GameObjects.Text[] = [];
  private promptCentro = { x: 0, y: 0 };
  private larguraDoPrompt = 0;
  private iconeDaPausa: Phaser.GameObjects.Graphics | null = null;
  private readonly botaoDaPausa: Alvo = { id: 'pausa', x: 0, y: 0, largura: 0, altura: 0 };
  private trilho: Phaser.GameObjects.Image | null = null;
  private preenchimento: Phaser.GameObjects.Image | null = null;
  private nivelTexto: Phaser.GameObjects.Text | null = null;
  private vagas: Phaser.GameObjects.Graphics | null = null;
  private trilhoDaStamina: Phaser.GameObjects.Image | null = null;
  private preenchimentoDaStamina: Phaser.GameObjects.Image | null = null;
  private marcasDaStamina: Phaser.GameObjects.Graphics | null = null;
  private botaoDoAparoGrafico: Phaser.GameObjects.Graphics | null = null;
  private flashGrafico: Phaser.GameObjects.Graphics | null = null;
  private readonly caixaDaStamina: CaixaDaBarra = { x: 0, y: 0, largura: 0, altura: 0 };
  private readonly botaoDoAparo: Alvo = { id: 'aparo', x: 0, y: 0, largura: 0, altura: 0 };
  /** Toca um SFX (criado uma vez; o closure não se refaz por quadro). */
  private readonly tocarSfx = (i: number): void => this.ctx.sfx?.tocar(i);
  private staminaDesenhada = -1;
  private alfaDaStaminaDesenhado = -1;
  private estadoDoAparoDesenhado = -1;
  private apertosVistos = 0;
  private quadrosDoAparoPressionado = 0;
  private alfaDoFlashDesenhado = 0;
  private readonly caixaDaBarra: CaixaDaBarra = { x: 0, y: 0, largura: 0, altura: 0 };
  private readonly posicoesDasVagas: VagaDoHud[] = [];
  /** Último estado lido e o que já foi desenhado dele; -1 = nada ainda. */
  private estadoVisto: Estado | null = null;
  private nivelDesenhado = -1;
  private xpDesenhado = -1;
  private assinaturaDasVagas = -1;
  /** Índice do prompt mostrado (-1 = nenhum). */
  private promptMostrado = -1;
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
    this.trilhoDaStamina = barra(COR.pedra, ALFA_DO_TRILHO);
    this.preenchimentoDaStamina = barra(COR.osso, 1).setVisible(false);
    this.marcasDaStamina = this.add.graphics();
    this.botaoDoAparoGrafico = this.add.graphics();
    this.staminaDesenhada = -1;
    this.alfaDaStaminaDesenhado = -1;
    this.estadoDoAparoDesenhado = -1;
    this.apertosVistos = this.ctx.entrada.tradutor.aparoApertos;
    this.quadrosDoAparoPressionado = 0;
    this.estadoVisto = null;
    this.nivelDesenhado = -1;
    this.xpDesenhado = -1;
    this.assinaturaDasVagas = -1;
    this.painel = this.add.graphics().setAlpha(0).setVisible(false);
    this.prompts.length = 0;
    // A largura de quebra vem do diagramar (a área do joystick menos a folga do painel).
    for (const id of IDS_DOS_PROMPTS) this.prompts.push(texto(this, 0, 0, id, 18, COR.osso, undefined, LARGURA_DE_QUEBRA_INICIAL).setOrigin(0.5).setAlpha(0).setVisible(false));
    this.promptMostrado = -1;
    // O flash por último: acima do mundo e de tudo o que o Hud desenha (FB2, RE3). Branco cheio; o alfa muda por quadro.
    this.flashGrafico = this.add.graphics().setVisible(false).setAlpha(0);
    this.flashGrafico.fillStyle(COR.branco, 1).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    this.alfaDoFlashDesenhado = 0;
    this.ctx.feedback.reiniciar();
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
    this.promptCentro = { x: cx, y: cy };
    this.larguraDoPrompt = Math.max(0, a.largura - 2 * FOLGA_DO_PAINEL.x);
    for (const p of this.prompts) p.setWordWrapWidth(this.larguraDoPrompt).setPosition(cx, cy);
    if (this.promptMostrado >= 0) this.refazerPainel(this.promptMostrado);
  }

  /** Painel do prompt `i`: do tamanho do texto (já quebrado em linhas) mais a folga. */
  private refazerPainel(i: number): void {
    const p = this.prompts[i]!;
    const { x: cx, y: cy } = this.promptCentro;
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
    // Barra de stamina (RE1): trilho, preenchimento e as 3 marcas de 1 pt em pedra (uma esquiva = 25 pontos).
    const s = caixaDaBarraDeStamina(ins, this.caixaDaStamina);
    const meioDaStamina = s.y + s.altura / 2;
    this.trilhoDaStamina!.setPosition(s.x, meioDaStamina).setScale(escalaPara('quadrado', s.largura), escalaPara('quadrado', s.altura));
    this.preenchimentoDaStamina!.setPosition(s.x, meioDaStamina);
    const maxima = this.ctx.simulacao?.dados.combate.staminaMax ?? 100;
    const marcas = this.marcasDaStamina!.clear().fillStyle(COR.pedra, 1);
    for (const pontos of BARRA_DE_STAMINA.marcas) {
      marcas.fillRect(s.x + xDaMarcaDeStamina(s.largura, pontos, maxima) - BARRA_DE_STAMINA.larguraDaMarca / 2, s.y, BARRA_DE_STAMINA.larguraDaMarca, s.altura);
    }
    this.staminaDesenhada = -1;
    this.alfaDaStaminaDesenhado = -1;
    alvoDoAparo(ins, this.botaoDoAparo);
    this.estadoDoAparoDesenhado = -1;
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
      this.staminaDesenhada = -1;
      this.estadoDoAparoDesenhado = -1;
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

  /**
   * Barra de stamina (RE1): o preenchimento só é reescrito quando a stamina muda (osso; laranja abaixo de 25, em que a
   * esquiva é negada), e o pulso da ação negada leva o alfa a 0,3 por 12 quadros. Nada aloca por quadro.
   */
  private atualizarStamina(sim: NonNullable<ContextoDoJogo['simulacao']>): void {
    const st = sim.estado.jogador3[JOGADOR3.stamina]!;
    if (st !== this.staminaDesenhada) {
      this.staminaDesenhada = st;
      const l = larguraDaStamina(this.caixaDaStamina.largura, st, sim.dados.combate.staminaMax);
      this.preenchimentoDaStamina!
        .setVisible(l > 0)
        .setTint(st < STAMINA_DA_ESQUIVA ? COR.laranjaQueimado : COR.osso)
        .setScale(escalaPara('quadrado', l), escalaPara('quadrado', BARRA_DE_STAMINA.altura));
    }
    const fb = this.ctx.feedback;
    const alfa = fb.pulsoDaStamina > 0 ? PULSO_DA_STAMINA.alfa : 1;
    if (fb.pulsoDaStamina > 0) fb.pulsoDaStamina--;
    if (alfa !== this.alfaDaStaminaDesenhado) {
      this.alfaDaStaminaDesenhado = alfa;
      this.preenchimentoDaStamina!.setAlpha(alfa);
    }
  }

  /** Botão Aparo (RE2): redesenhado só quando o estado muda (normal, pressionado por 4 quadros, indisponível). */
  private atualizarAparo(sim: NonNullable<ContextoDoJogo['simulacao']>): void {
    const apertos = this.ctx.entrada.tradutor.aparoApertos;
    if (apertos !== this.apertosVistos) {
      if (apertos > this.apertosVistos) this.quadrosDoAparoPressionado = QUADROS_DO_APARO_PRESSIONADO;
      this.apertosVistos = apertos;
    }
    const e = sim.estado;
    const u8 = e.jogador3U8;
    const estado = estadoDoAparo(
      this.quadrosDoAparoPressionado,
      e.jogador3[JOGADOR3.stamina]!,
      sim.dados.combate.custoAparo,
      u8[JOGADOR3_U8.esquivaPasso]!,
      u8[JOGADOR3_U8.aparoJanela]!,
      u8[JOGADOR3_U8.aparoFalho]!,
    );
    if (this.quadrosDoAparoPressionado > 0) this.quadrosDoAparoPressionado--;
    if (estado !== this.estadoDoAparoDesenhado) {
      this.estadoDoAparoDesenhado = estado;
      this.desenharAparo(estado);
    }
  }

  private desenharAparo(estado: number): void {
    const d = BOTAO_DO_APARO_DESENHO;
    const b = this.botaoDoAparo;
    const bx = b.x + b.largura / 2;
    const by = b.y + b.altura / 2;
    const g = this.botaoDoAparoGrafico!;
    g.clear().setAlpha(estado === ESTADO_DO_APARO.indisponivel ? d.alfaIndisponivel : 1);
    g.fillStyle(COR.pedra, ALFA_DA_BASE).fillCircle(bx, by, d.raioDoAnel);
    if (estado === ESTADO_DO_APARO.pressionado) g.fillStyle(COR.osso, d.alfaPressionado).fillCircle(bx, by, d.raioDoAnel);
    g.lineStyle(d.traco, COR.osso, 1).strokeCircle(bx, by, d.raioDoAnel);
    // Glifo ⟲: arco no sentido anti-horário com a ponta de seta no fim, desenhado (sem texto).
    const [inicio, fim] = d.arco;
    g.lineStyle(d.tracoDoGlifo, COR.osso, 1).beginPath().arc(bx, by, d.raioDoGlifo, inicio, fim, true).strokePath();
    const px = bx + d.raioDoGlifo * Math.cos(fim);
    const py = by + d.raioDoGlifo * Math.sin(fim);
    const tx = Math.sin(fim);
    const ty = -Math.cos(fim);
    const nx = Math.cos(fim);
    const ny = Math.sin(fim);
    g.fillStyle(COR.osso, 1).fillTriangle(px + tx * 8, py + ty * 8, px + nx * 5, py + ny * 5, px - nx * 5, py - ny * 5);
  }

  /**
   * O flash branco de tela inteira (FB2, RE3): o consumidor do anel dispara ao ler o aparo ou a esquiva perfeita; o
   * alfa de cada quadro vem do controlador (2 quadros de 0,35, no máximo 3 por segundo, opção "Flashes"). Os sons
   * tocam pelo mesmo consumidor (RE12). Tudo fora do estado e do hash.
   */
  private atualizarFeedback(sim: NonNullable<ContextoDoJogo['simulacao']>): void {
    const fb = this.ctx.feedback;
    const ef = sim.efeitos;
    if (ef !== null) fb.atualizar(ef.feedback, performance.now(), this.ctx.opcoes, this.tocarSfx);
    const alfa = fb.flash.proximoAlfa(this.ctx.opcoes.flashes, this.ctx.flashSegurar);
    if (alfa !== this.alfaDoFlashDesenhado) {
      this.alfaDoFlashDesenhado = alfa;
      this.flashGrafico!.setAlpha(alfa).setVisible(alfa > 0);
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
    const mostrar = sim === null ? -1 : promptEmTela(sim.estado);
    if (mostrar !== this.promptMostrado) this.trocarPrompt(mostrar);
    if (sim !== null) {
      this.atualizarProgresso(sim);
      this.atualizarStamina(sim);
      this.atualizarAparo(sim);
      this.atualizarFeedback(sim);
    }
  }

  /**
   * Troca o prompt mostrado (TU4, TU11). De nenhum para um, fade de entrada; de um para nenhum, de saída;
   * de um para outro (o maior cumpriu ou chegou o seguinte), troca o texto e refaz o painel sem fade.
   */
  private trocarPrompt(novo: number): void {
    const anterior = this.promptMostrado;
    this.promptMostrado = novo;
    const todos = [this.painel!, ...this.prompts];
    this.tweens.killTweensOf(todos);
    if (novo >= 0) {
      this.refazerPainel(novo);
      this.prompts.forEach((p, i) => p.setVisible(i === novo).setAlpha(i === novo ? (anterior >= 0 ? 1 : 0) : 0));
      this.painel!.setVisible(true).setAlpha(anterior >= 0 ? 1 : 0);
      if (anterior < 0) this.tweens.add({ targets: [this.painel!, this.prompts[novo]!], alpha: 1, duration: FADE_MS });
      return;
    }
    const alvos = [this.painel!, this.prompts[anterior]!];
    this.tweens.add({
      targets: alvos,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        for (const a of todos) a.setVisible(false);
      },
    });
  }
}
