// Tela de pausa mínima (Q-25; ADR-0002 §11.1, a cena Modal; design/decisoes-F-004.md
// P5, P6 e P9; decisoes-F-005 §6): véu sobre a Vigília e a Hud, título, a build
// (nome e nível de cada arma e de cada passiva, dois Text por linha, a União sem
// o nível), a opção de números de dano e Continuar. Os
// Text são criados uma vez, na raiz da cena (o __GAME_DEBUG__.textoAtivo os
// lê), e a cena fica invisível fora da pausa. Os toques vêm do tradutor, no
// modo pausa: esta cena só desenha. Som, Flashes, estatísticas e Abandonar
// entram nas F-006 e F-007.
import Phaser from 'phaser';
import { CAIXA_DA_OPCAO, alvosDaTelaDePausa, caixaDaOpcao, type Alvo } from '../entrada/alvos';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { PARES_DA_PAUSA, linhasDaPausa, type LinhaDaPausa } from './linhasDaPausa';
import { t } from './textos';

/** Véu #0b0e14 a 60% (P6). */
const ALFA_DO_VEU = 0.6;
/** Transições ≤ 200 ms (doc 11 §1). */
const FADE_MS = 200;
/** 11 linhas de 15 pt cabem no terço de cima com o título (era 24 pt entre linhas com 5 armas). */
const ENTRE_LINHAS_DA_BUILD = 18;
const TITULO_ABAIXO_DO_TOPO = 24;
const PRIMEIRA_LINHA_ABAIXO_DO_TOPO = 56;
const ENTRE_NOME_E_NIVEL = 12;

export class Pausa extends Phaser.Scene {
  private veu: Phaser.GameObjects.Graphics | null = null;
  private botoes: Phaser.GameObjects.Graphics | null = null;
  private titulo: Phaser.GameObjects.Text | null = null;
  private readonly nomes: Phaser.GameObjects.Text[] = [];
  private readonly niveis: Phaser.GameObjects.Text[] = [];
  private rotuloDaOpcao: Phaser.GameObjects.Text | null = null;
  private continuar: Phaser.GameObjects.Text | null = null;
  private readonly alvos: Alvo[] = [];
  private readonly linhas: LinhaDaPausa[] = [];
  private aberta = false;
  private numerosDesenhados: boolean | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Pausa' });
  }

  create(): void {
    cameraLogica(this);
    this.veu = this.add.graphics();
    this.botoes = this.add.graphics();
    this.titulo = texto(this, 0, 0, 'A6.PAUSA.TITULO', 22, COR.osso).setOrigin(0.5);
    this.nomes.length = 0;
    this.niveis.length = 0;
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      this.nomes.push(texto(this, 0, 0, 'F1.ESPADA_LONGA_DO_JURAMENTO.NOME', 15, COR.osso).setOrigin(0, 0.5));
      this.niveis.push(texto(this, 0, 0, 'A6.PAUSA.NIVEL', 15, COR.sal, { nivel: 1 }).setOrigin(0, 0.5));
    }
    this.rotuloDaOpcao = texto(this, 0, 0, 'A6.PAUSA.NUMEROS', 18, COR.osso).setOrigin(0, 0.5);
    this.continuar = texto(this, 0, 0, 'A6.PAUSA.CONTINUAR', 18, COR.osso).setOrigin(0.5);
    this.aberta = false;
    this.numerosDesenhados = null;
    for (const obj of this.objetos()) obj.setAlpha(0);
    this.scene.setVisible(false);
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    });
  }

  private objetos(): (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] {
    return [this.veu!, this.botoes!, this.titulo!, ...this.nomes, ...this.niveis, this.rotuloDaOpcao!, this.continuar!];
  }

  /** Mostra a tela com a build atual (fade de 200 ms que não bloqueia toque). */
  mostrar(): void {
    if (this.aberta) return;
    this.aberta = true;
    this.preencherBuild();
    this.numerosDesenhados = null;
    this.diagramar();
    this.scene.setVisible(true);
    this.tweens.killTweensOf(this.objetos());
    this.tweens.add({ targets: this.objetos(), alpha: 1, duration: FADE_MS });
  }

  esconder(): void {
    if (!this.aberta) return;
    this.aberta = false;
    this.tweens.killTweensOf(this.objetos());
    this.tweens.add({
      targets: this.objetos(),
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        if (!this.aberta) this.scene.setVisible(false);
      },
    });
  }

  /** Um par por item da build, armas e depois passivas: o nome (F1/F2/F3.*.NOME) e "Nível {nivel}" (A6.PAUSA.NIVEL); a União não mostra o nível; vagas vazias somem. */
  private preencherBuild(): void {
    const sim = this.ctx.simulacao;
    const e = sim?.estado;
    const linhas = e
      ? linhasDaPausa({ armas: e.build, passivas: e.passivas, uniao: sim.dados.armas.uniao, nivelMax: sim.dados.armas.nivelMax }, this.linhas)
      : this.linhas.splice(0);
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      const l = linhas[v];
      if (l === undefined) {
        nome.setVisible(false);
        nivel.setVisible(false);
        continue;
      }
      if (nome.getData('idTexto') !== l.idDoNome) nome.setText(t(l.idDoNome)).setData('idTexto', l.idDoNome);
      nome.setVisible(true);
      if (l.nivel === null) nivel.setVisible(false);
      else nivel.setText(t('A6.PAUSA.NIVEL', { nivel: l.nivel })).setVisible(true);
    }
  }

  private diagramar(): void {
    const ins = this.ctx.insets;
    alvosDaTelaDePausa(ins, this.alvos);
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    this.veu!.clear().fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    // Textos no terço de cima: o título e, logo abaixo, até 11 linhas da build.
    this.titulo!.setPosition(cx, ins.topo + TITULO_ABAIXO_DO_TOPO);
    // Cada linha centrada pelo conjunto "nome  Nível n" (só o nome, na União).
    let y = ins.topo + PRIMEIRA_LINHA_ABAIXO_DO_TOPO;
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      const largura = nivel.visible ? nome.width + ENTRE_NOME_E_NIVEL + nivel.width : nome.width;
      const x0 = cx - largura / 2;
      nome.setPosition(x0, y);
      nivel.setPosition(x0 + nome.width + ENTRE_NOME_E_NIVEL, y);
      if (nome.visible) y += ENTRE_LINHAS_DA_BUILD;
    }
    const [opcao, cont] = this.alvos;
    this.rotuloDaOpcao!.setPosition(opcao!.x + CAIXA_DA_OPCAO.margem, opcao!.y + opcao!.altura / 2);
    this.continuar!.setPosition(cont!.x + cont!.largura / 2, cont!.y + cont!.altura / 2);
    this.desenharBotoes();
  }

  /** Os dois alvos no estilo do Acender e a caixa da opção: cheia (osso) quando ligada, vazia quando desligada (P9). */
  private desenharBotoes(): void {
    const ligada = this.ctx.opcoes.numerosDeDano;
    this.numerosDesenhados = ligada;
    const g = this.botoes!.clear();
    for (const a of this.alvos) {
      g.fillStyle(COR.cinzaFrio).fillRect(a.x, a.y, a.largura, a.altura);
      g.lineStyle(2, COR.laranjaQueimado).strokeRect(a.x, a.y, a.largura, a.altura);
    }
    const { lado, borda } = CAIXA_DA_OPCAO;
    const { x, y } = caixaDaOpcao(this.alvos[0]!);
    if (ligada) g.fillStyle(COR.osso).fillRect(x, y, lado, lado);
    else g.fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(x, y, lado, lado);
    g.lineStyle(borda, COR.osso).strokeRect(x + borda / 2, y + borda / 2, lado - borda, lado - borda);
  }

  override update(): void {
    if (this.aberta && this.numerosDesenhados !== this.ctx.opcoes.numerosDeDano) this.desenharBotoes();
  }
}
