// Tela de pausa mínima (Q-25; ADR-0002 §11.1, a cena Modal; design/decisoes-F-004.md
// P5, P6 e P9): véu sobre a Vigília e a Hud, título, a build (nome e nível de
// cada arma, dois Text por linha), a opção de números de dano e Continuar. Os
// Text são criados uma vez, na raiz da cena (o __GAME_DEBUG__.textoAtivo os
// lê), e a cena fica invisível fora da pausa. Os toques vêm do tradutor, no
// modo pausa: esta cena só desenha. Som, Flashes, estatísticas e Abandonar
// entram nas F-006 e F-007.
import Phaser from 'phaser';
import { alvosDaTelaDePausa, type Alvo } from '../entrada/alvos';
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import { VAGAS_DE_ARMA } from '../logica/nucleo/estado';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { t } from './textos';

/** Véu #0b0e14 a 60% (P6). */
const ALFA_DO_VEU = 0.6;
/** Transições ≤ 200 ms (doc 11 §1). */
const FADE_MS = 200;
/** Caixa da opção: 28 pt, borda de 2 pt (P9). */
const CAIXA_PT = 28;
const BORDA_PT = 2;
const MARGEM_DA_LINHA = 20;
const ENTRE_LINHAS_DA_BUILD = 24;
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
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
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

  /** Uma linha por arma da build: o nome (F1.*.NOME) e "Nível {nivel}" (A6.PAUSA.NIVEL); vagas vazias somem. */
  private preencherBuild(): void {
    const e = this.ctx.simulacao?.estado;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      const codigo = e ? e.build.codigo[v]! : 0;
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      if (codigo === 0) {
        nome.setVisible(false);
        nivel.setVisible(false);
        continue;
      }
      const id = `F1.${IDS_DE_ARMA[codigo]!.toUpperCase()}.NOME`;
      if (nome.getData('idTexto') !== id) nome.setText(t(id)).setData('idTexto', id);
      nivel.setText(t('A6.PAUSA.NIVEL', { nivel: e!.build.nivel[v]! }));
      nome.setVisible(true);
      nivel.setVisible(true);
    }
  }

  private diagramar(): void {
    const ins = this.ctx.insets;
    alvosDaTelaDePausa(ins, this.alvos);
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    const util = ALTURA_LOGICA - ins.topo - ins.baixo;
    this.veu!.clear().fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    // Textos no terço de cima: o título e, logo abaixo, a build.
    const yTitulo = ins.topo + util / 6;
    this.titulo!.setPosition(cx, yTitulo);
    // Cada linha centrada pelo conjunto "nome  Nível n".
    let y = yTitulo + 44;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      const x0 = cx - (nome.width + ENTRE_NOME_E_NIVEL + nivel.width) / 2;
      nome.setPosition(x0, y);
      nivel.setPosition(x0 + nome.width + ENTRE_NOME_E_NIVEL, y);
      if (nome.visible) y += ENTRE_LINHAS_DA_BUILD;
    }
    const [opcao, cont] = this.alvos;
    this.rotuloDaOpcao!.setPosition(opcao!.x + MARGEM_DA_LINHA, opcao!.y + opcao!.altura / 2);
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
    const opcao = this.alvos[0]!;
    const x = opcao.x + opcao.largura - MARGEM_DA_LINHA - CAIXA_PT;
    const y = opcao.y + (opcao.altura - CAIXA_PT) / 2;
    if (ligada) g.fillStyle(COR.osso).fillRect(x, y, CAIXA_PT, CAIXA_PT);
    else g.fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(x, y, CAIXA_PT, CAIXA_PT);
    g.lineStyle(BORDA_PT, COR.osso).strokeRect(x + BORDA_PT / 2, y + BORDA_PT / 2, CAIXA_PT - BORDA_PT, CAIXA_PT - BORDA_PT);
  }

  override update(): void {
    if (this.aberta && this.numerosDesenhados !== this.ctx.opcoes.numerosDeDano) this.desenharBotoes();
  }
}
