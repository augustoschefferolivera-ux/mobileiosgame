// Modal da simulação (design/decisoes-F-005.md R6 e B4; ADR-0002 §11.1, a cena
// Modal): as 3 cartas do level up ou o baú da frente da fila, sobre a Vigília e
// a Hud, com o véu da pausa. Os Text são criados uma vez (o
// __GAME_DEBUG__.textoAtivo os lê) e trocados com setText; o conteúdo sai de
// conteudoDoModal.ts. Os toques vêm do tradutor, no modo modal, e a Vigília
// decide a seleção e a confirmação: esta cena só desenha.
import Phaser from 'phaser';
import { alvosDasCartas, alvosDoBau, type Alvo } from '../entrada/alvos';
import { PROGRESSAO } from '../logica/nucleo/estado';
import { bauNaFrente, modalAberto } from '../logica/progressao/modal';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { conteudoDaCarta, linhasDoBau, parametrosDe, type TextoDoModal } from './conteudoDoModal';
import { COR, cameraLogica, css, texto } from './estilo';
import { COR_DO_CRITICO } from './render/armas';
import { desenharIcone } from './render/icones';
import { t } from './textos';

/** Véu #0b0e14 a 60% (a P6 da D4); cartas a 85%. */
const ALFA_DO_VEU = 0.6;
const ALFA_DA_CARTA = 0.85;
/** Transições ≤ 200 ms (doc 11 §1). */
const FADE_MS = 200;
const MARGEM = 16;
const ICONE_PT = 64;
/** A coluna de texto começa depois do ícone (16 + 64 + 12). */
const TEXTO_X = 92;
const LINHAS_DO_BAU = 5;

interface TextosDaCarta {
  readonly nome: Phaser.GameObjects.Text;
  readonly etiqueta: Phaser.GameObjects.Text;
  readonly funcional: Phaser.GameObjects.Text;
  readonly rodape: Phaser.GameObjects.Text;
}

export class Modal extends Phaser.Scene {
  private veu: Phaser.GameObjects.Graphics | null = null;
  private desenho: Phaser.GameObjects.Graphics | null = null;
  private confirmar: Phaser.GameObjects.Text | null = null;
  private readonly cartas: TextosDaCarta[] = [];
  private tituloDoBau: Phaser.GameObjects.Text | null = null;
  private readonly nomesDoBau: Phaser.GameObjects.Text[] = [];
  private readonly niveisDoBau: Phaser.GameObjects.Text[] = [];
  private continuar: Phaser.GameObjects.Text | null = null;
  private readonly alvosDasCartas: Alvo[] = [];
  private readonly alvosDoBau: Alvo[] = [];
  private aberta = false;
  /** O conteúdo desenhado: a ordem do modal e a seleção (null = nada selecionado). */
  private ordemDesenhada = -1;
  private selecaoDesenhada: number | null = null;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Modal' });
  }

  create(): void {
    cameraLogica(this);
    this.veu = this.add.graphics();
    this.desenho = this.add.graphics();
    this.confirmar = texto(this, 0, 0, 'A10.LEVELUP.CONFIRMAR', 15, COR.osso).setOrigin(0.5);
    this.cartas.length = 0;
    for (let k = 0; k < 3; k++) {
      const quebra = (obj: Phaser.GameObjects.Text, largura: number): Phaser.GameObjects.Text => {
        obj.setStyle({ align: 'left' }).setWordWrapWidth(largura).setMaxLines(2);
        return obj;
      };
      this.cartas.push({
        nome: texto(this, 0, 0, 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME', 16, COR.osso).setOrigin(0, 0),
        etiqueta: texto(this, 0, 0, 'A10.LEVELUP.NOVO', 13, COR.sal).setOrigin(0, 0),
        funcional: quebra(texto(this, 0, 0, 'A10.LEVELUP.BOLSA_DE_ALMAS_EFEITO', 15, COR.osso).setOrigin(0, 0), 230),
        rodape: quebra(texto(this, 0, 0, 'A10.LEVELUP.NOVO', 13, COR.sal).setOrigin(0, 0).setFontStyle('italic'), 230),
      });
    }
    this.tituloDoBau = texto(this, 0, 0, 'A10.BAU.TITULO', 22, COR.osso).setOrigin(0.5);
    this.nomesDoBau.length = 0;
    this.niveisDoBau.length = 0;
    for (let k = 0; k < LINHAS_DO_BAU; k++) {
      this.nomesDoBau.push(texto(this, 0, 0, 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME', 16, COR.osso).setOrigin(0, 0.5));
      this.niveisDoBau.push(texto(this, 0, 0, 'A10.LEVELUP.NOVO', 15, COR.sal).setOrigin(0, 0.5));
    }
    this.continuar = texto(this, 0, 0, 'A6.PAUSA.CONTINUAR', 18, COR.osso).setOrigin(0.5);
    this.aberta = false;
    this.ordemDesenhada = -1;
    for (const obj of this.objetos()) obj.setAlpha(0).setVisible(false);
    this.scene.setVisible(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redesenhar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.redesenhar, this));
  }

  private objetos(): (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] {
    const textos = this.cartas.flatMap((c) => [c.nome, c.etiqueta, c.funcional, c.rodape]);
    return [this.veu!, this.desenho!, this.confirmar!, ...textos, this.tituloDoBau!, ...this.nomesDoBau, ...this.niveisDoBau, this.continuar!];
  }

  /** Abre com o conteúdo da frente da fila (fade de 200 ms que não bloqueia toque). */
  mostrar(): void {
    this.aberta = true;
    this.ordemDesenhada = -1;
    this.scene.setVisible(true);
    this.update();
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

  /** O modal desenhado (para o debug): a ordem, ou −1 fechado. */
  get ordem(): number {
    return this.aberta ? this.ordemDesenhada : -1;
  }

  private redesenhar(): void {
    this.ordemDesenhada = -1;
  }

  override update(): void {
    const sim = this.ctx.simulacao;
    if (!this.aberta || !sim || !modalAberto(sim.estado)) return;
    const ordem = sim.estado.progresso[PROGRESSAO.modaisConfirmados]!;
    const selecao = sim.modal.selecionada;
    if (ordem === this.ordemDesenhada && selecao === this.selecaoDesenhada) return;
    const novo = ordem !== this.ordemDesenhada;
    this.ordemDesenhada = ordem;
    this.selecaoDesenhada = selecao;
    if (bauNaFrente(sim.estado)) this.desenharBau();
    else this.desenharCartas(selecao);
    if (novo) {
      // Cada modal novo da fila refaz o fade (L18 do levantamento; M4).
      this.tweens.killTweensOf(this.objetos());
      for (const obj of this.objetos()) if (obj.visible) obj.setAlpha(0);
      this.tweens.add({ targets: this.objetos().filter((o) => o.visible), alpha: 1, duration: FADE_MS });
    }
  }

  private escrever(obj: Phaser.GameObjects.Text, x: TextoDoModal | null): void {
    if (x === null) {
      obj.setVisible(false);
      return;
    }
    obj.setText(t(x.id, parametrosDe(x, (id) => t(id)))).setData('idTexto', x.id).setVisible(true);
  }

  private desenharCartas(selecao: number | null): void {
    const sim = this.ctx.simulacao!;
    const ins = this.ctx.insets;
    alvosDasCartas(ins, this.alvosDasCartas);
    const g = this.desenho!.clear();
    this.veu!.clear().fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA).setVisible(true);
    this.esconderBau();
    for (let k = 0; k < 3; k++) {
      const a = this.alvosDasCartas[k]!;
      const c = conteudoDaCarta(sim.estado, sim.dados, k);
      const borda = c.completaUniao ? COR_DO_CRITICO : COR.osso;
      g.fillStyle(COR.pedra, ALFA_DA_CARTA).fillRect(a.x, a.y, a.largura, a.altura);
      g.lineStyle(2, borda, 1).strokeRect(a.x + 1, a.y + 1, a.largura - 2, a.altura - 2);
      if (selecao === k) g.lineStyle(4, COR.brasa, 1).strokeRect(a.x - 2, a.y - 2, a.largura + 4, a.altura + 4);
      desenharIcone(g, c.icone, a.x + MARGEM + ICONE_PT / 2, a.y + a.altura / 2, ICONE_PT);
      const tx = a.x + TEXTO_X;
      const largura = a.largura - TEXTO_X - MARGEM;
      const ts = this.cartas[k]!;
      this.escrever(ts.nome, c.nome);
      this.escrever(ts.etiqueta, c.etiqueta);
      this.escrever(ts.funcional, c.funcional);
      this.escrever(ts.rodape, c.rodape);
      ts.funcional.setWordWrapWidth(largura);
      ts.rodape.setWordWrapWidth(largura).setColor(css(c.completaUniao ? COR_DO_CRITICO : COR.sal));
      ts.nome.setPosition(tx, a.y + 12);
      ts.etiqueta.setPosition(tx, a.y + 34);
      ts.funcional.setPosition(tx, a.y + 54);
      ts.rodape.setPosition(tx, a.y + 100);
    }
    const primeira = this.alvosDasCartas[0]!;
    this.confirmar!.setPosition(primeira.x + primeira.largura / 2, primeira.y - 20).setVisible(selecao !== null);
    if (selecao !== null) this.confirmar!.setAlpha(1);
  }

  private esconderBau(): void {
    this.tituloDoBau!.setVisible(false);
    for (const x of [...this.nomesDoBau, ...this.niveisDoBau]) x.setVisible(false);
    this.continuar!.setVisible(false);
  }

  private desenharBau(): void {
    const sim = this.ctx.simulacao!;
    const ins = this.ctx.insets;
    this.veu!.clear().fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA).setVisible(true);
    for (const c of this.cartas) for (const x of [c.nome, c.etiqueta, c.funcional, c.rodape]) x.setVisible(false);
    this.confirmar!.setVisible(false);
    const g = this.desenho!.clear();
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    const util = ALTURA_LOGICA - ins.topo - ins.baixo;
    const yTitulo = ins.topo + util / 6;
    this.tituloDoBau!.setPosition(cx, yTitulo).setVisible(true);
    const linhas = linhasDoBau(sim.estado, sim.dados);
    for (let k = 0; k < LINHAS_DO_BAU; k++) {
      const nome = this.nomesDoBau[k]!;
      const nivel = this.niveisDoBau[k]!;
      const l = linhas[k];
      if (!l) {
        nome.setVisible(false);
        nivel.setVisible(false);
        continue;
      }
      const y = yTitulo + 56 + k * 40;
      this.escrever(nome, l.nome);
      this.escrever(nivel, l.nivel);
      const largura = 32 + 12 + nome.width + (l.nivel ? 12 + nivel.width : 0);
      const x0 = cx - largura / 2;
      desenharIcone(g, l.icone, x0 + 16, y, 32);
      nome.setPosition(x0 + 44, y);
      nivel.setPosition(x0 + 44 + nome.width + 12, y);
    }
    alvosDoBau(ins, this.alvosDoBau);
    const a = this.alvosDoBau[0]!;
    g.fillStyle(COR.cinzaFrio).fillRect(a.x, a.y, a.largura, a.altura);
    g.lineStyle(2, COR.laranjaQueimado).strokeRect(a.x, a.y, a.largura, a.altura);
    this.continuar!.setPosition(a.x + a.largura / 2, a.y + a.altura / 2).setVisible(true);
  }
}
