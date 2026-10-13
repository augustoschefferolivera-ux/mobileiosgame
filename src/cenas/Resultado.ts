// Tela de Resultado (design/decisoes-F-007.md AG5, RS1 a RS7, RS9; doc 11 §3.10 e §3.12). Nasce com o Apagar: em
// APAGANDO mostra só o véu a 60% e o título "Você se apaga." (fade ≤ 200 ms); no FIM, com o `ResultadoDaVigilia` calculado,
// mostra as linhas, a mancha, o mapa pequeno e os botões Voltar e Repetir. O Abandonar pula direto ao FIM, com o título
// da pausa. Os Text são criados uma vez (o __GAME_DEBUG__.textoAtivo os lê, com o valor final desde o 1º quadro); os toques
// vêm do tradutor, no modo resultado: esta cena só desenha.
import Phaser from 'phaser';
import { alvosDoResultado, type Alvo } from '../entrada/alvos';
import type { ResultadoDaVigilia } from '../logica/mundo/vigilia';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { MAPA_PEQUENO_PT, linhaDaMancha, linhasDoResultado, pontoNoMapaPequeno, tituloDoResultado } from './linhasDoResultado';
import { t } from './textos';

/** Véu #0b0e14 a 60% (AG5: o mesmo da pausa). */
const ALFA_DO_VEU = 0.6;
/** Véu cheio atrás das linhas do Resultado: o jogo já acabou. */
const ALFA_DO_VEU_NO_FIM = 0.9;
const FADE_MS = 200;
const LINHAS = 7;
const ENTRE_LINHAS = 34;
const MARGEM_LATERAL = 40;

export class Resultado extends Phaser.Scene {
  private veu: Phaser.GameObjects.Graphics | null = null;
  private botoes: Phaser.GameObjects.Graphics | null = null;
  private mapa: Phaser.GameObjects.Graphics | null = null;
  private titulo: Phaser.GameObjects.Text | null = null;
  private readonly rotulos: Phaser.GameObjects.Text[] = [];
  private readonly valores: Phaser.GameObjects.Text[] = [];
  private mancha: Phaser.GameObjects.Text | null = null;
  private voltar: Phaser.GameObjects.Text | null = null;
  private repetir: Phaser.GameObjects.Text | null = null;
  private readonly alvos: Alvo[] = [];
  private resultado: ResultadoDaVigilia | null = null;
  private noFim = false;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Resultado' });
  }

  create(): void {
    cameraLogica(this);
    this.veu = this.add.graphics().setAlpha(0);
    this.mapa = this.add.graphics().setVisible(false);
    this.botoes = this.add.graphics().setVisible(false);
    this.titulo = texto(this, 0, 0, 'A4.APAGAR.01', 26, COR.osso).setOrigin(0.5).setAlpha(0);
    this.rotulos.length = this.valores.length = 0;
    const ids = linhasDoResultado({ segundos: 0, nivel: 1, mortes: 0, danoRecebido: 0, almasAoSantuario: 0, brasas: 0, chefeFase: 0, chefeDerrotado: false } as ResultadoDaVigilia).map((l) => l.rotulo);
    for (let k = 0; k < LINHAS; k++) {
      this.rotulos.push(texto(this, 0, 0, ids[k]!, 18, COR.osso).setOrigin(0, 0.5).setVisible(false));
      this.valores.push(texto(this, 0, 0, 'A7.RESULTADO.VALOR', 18, COR.osso, { valor: 0 }).setOrigin(1, 0.5).setVisible(false));
    }
    this.mancha = texto(this, 0, 0, 'A7.RESULTADO.MANCHA', 16, COR.alma, { almas: 0, hora: 'I' }, LARGURA_LOGICA - 2 * MARGEM_LATERAL).setOrigin(0.5).setVisible(false);
    this.voltar = texto(this, 0, 0, 'A7.RESULTADO.VOLTAR', 18, COR.osso).setOrigin(0.5).setVisible(false);
    this.repetir = texto(this, 0, 0, 'A7.RESULTADO.REPETIR', 18, COR.osso).setOrigin(0.5).setVisible(false);
    this.resultado = null;
    this.noFim = false;
    // Invisível até o Apagar ou o Abandonar (como a pausa): só então a cena entra no textoAtivo.
    this.scene.setVisible(false);
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    });
  }

  /** APAGANDO (AG5): o véu a 60% e o título, com fade; ainda sem linhas nem botões. */
  mostrarApagando(): void {
    if (this.titulo === null) return;
    this.scene.setVisible(true);
    this.titulo.setText(t('A4.APAGAR.01')).setData('idTexto', 'A4.APAGAR.01');
    this.veu!.setAlpha(0);
    this.tweens.killTweensOf([this.veu!, this.titulo!]);
    this.tweens.add({ targets: [this.veu!, this.titulo!], alpha: 1, duration: FADE_MS });
    this.diagramar();
  }

  /** FIM: título da causa, linhas, mancha, mapa e botões; os valores finais valem já no 1º quadro (RS5). */
  mostrarResultado(r: ResultadoDaVigilia): void {
    if (this.titulo === null) return;
    this.scene.setVisible(true);
    this.resultado = r;
    this.noFim = true;
    const id = tituloDoResultado(r.causa);
    this.titulo!.setText(t(id)).setData('idTexto', id);
    this.tweens.killTweensOf([this.veu!, this.titulo!]);
    this.veu!.setAlpha(1);
    this.titulo!.setAlpha(1);
    const linhas = linhasDoResultado(r);
    for (let k = 0; k < LINHAS; k++) {
      this.valores[k]!.setText(t('A7.RESULTADO.VALOR', { valor: linhas[k]!.valor })).setVisible(true);
      this.rotulos[k]!.setVisible(true);
    }
    const m = linhaDaMancha(r);
    if (m !== null) this.mancha!.setText(t(m.id, m.params)).setData('idTexto', m.id).setVisible(true);
    else this.mancha!.setVisible(false);
    this.voltar!.setVisible(true);
    this.repetir!.setVisible(true);
    this.diagramar();
  }

  private diagramar(): void {
    const ins = this.ctx.insets;
    alvosDoResultado(ins, this.alvos);
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    const esquerda = ins.esquerda + MARGEM_LATERAL;
    const direita = LARGURA_LOGICA - ins.direita - MARGEM_LATERAL;
    this.veu!.clear().fillStyle(COR.pedra, this.noFim ? ALFA_DO_VEU_NO_FIM : ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    this.veu!.setAlpha(this.noFim ? 1 : this.veu!.alpha);
    this.titulo!.setPosition(cx, this.noFim ? ins.topo + 56 : ALTURA_LOGICA / 2);
    let y = ins.topo + 110;
    for (let k = 0; k < LINHAS; k++) {
      this.rotulos[k]!.setPosition(esquerda, y);
      this.valores[k]!.setPosition(direita, y);
      y += ENTRE_LINHAS;
    }
    this.mancha!.setPosition(cx, y + 20);
    const abaixoDaMancha = y + 20 + (this.mancha!.visible ? this.mancha!.height / 2 + 14 : 0);
    this.desenharMapa(cx, abaixoDaMancha);
    const [voltar, repetir] = this.alvos;
    this.voltar!.setPosition(voltar!.x + voltar!.largura / 2, voltar!.y + voltar!.altura / 2);
    this.repetir!.setPosition(repetir!.x + repetir!.largura / 2, repetir!.y + repetir!.altura / 2);
    const g = this.botoes!.clear();
    for (const a of this.alvos) {
      g.fillStyle(COR.cinzaFrio).fillRect(a.x, a.y, a.largura, a.altura);
      g.lineStyle(2, COR.laranjaQueimado).strokeRect(a.x, a.y, a.largura, a.altura);
    }
    this.botoes!.setVisible(this.noFim);
  }

  /** Mapa pequeno (RS7): o contorno do mapa na proporção e um ponto na posição da mancha; sem texto. */
  private desenharMapa(cx: number, topo: number): void {
    const r = this.resultado;
    const g = this.mapa!.clear();
    if (!this.noFim || r === null || r.mancha === null) {
      g.setVisible(false);
      return;
    }
    const p = pontoNoMapaPequeno(r.mancha.x, r.mancha.y);
    const x0 = cx - p.largura / 2;
    g.fillStyle(COR.fundo, 1).fillRect(x0, topo, p.largura, MAPA_PEQUENO_PT);
    g.lineStyle(1, COR.osso, 0.6).strokeRect(x0, topo, p.largura, MAPA_PEQUENO_PT);
    g.fillStyle(COR.alma, 1).fillCircle(x0 + p.px, topo + p.py, 4);
    g.setVisible(true);
  }
}
