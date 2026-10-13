// As barras do chefe no HUD (design/decisoes-F-009.md HD1): o nome, o HP e a Postura do Lanterneiro vivo, abaixo das Almas. O HUD só lê
// `chefe` do estado. A Postura é azul-aço (nunca branco nem #ff2a2a); na Quebra ganha o contorno de brasa e o rótulo "QUEBRADO". Cada
// valor só reescreve o objeto quando muda; nada aloca por quadro (ADR-0005 §2).
import type Phaser from 'phaser';
import { CHEFE_F32, CHEFE_U16, SEM_CHEFE, type Estado } from '../logica/nucleo/estado';
import type { Insets } from '../plataforma/safeArea';
import { COR, texto } from './estilo';
import { BARRAS_DO_CHEFE, caixaDasBarrasDoChefe, type CaixaDaBarra } from './layoutDoHud';
import { CHAVE_DO_ATLAS, escalaPara } from './render/atlas';

/** Largura do preenchimento: `valor / maximo` da largura, limitada a [0, largura]; máximo 0 = vazia. */
export function larguraDaBarraDoChefe(largura: number, valor: number, maximo: number): number {
  if (!(maximo > 0) || !(valor > 0)) return 0;
  return valor >= maximo ? largura : (largura * valor) / maximo;
}

export class BarrasDoChefe {
  private readonly trilhoHp: Phaser.GameObjects.Image;
  private readonly hp: Phaser.GameObjects.Image;
  private readonly trilhoPostura: Phaser.GameObjects.Image;
  private readonly postura: Phaser.GameObjects.Image;
  private readonly marcas: Phaser.GameObjects.Graphics;
  private readonly contorno: Phaser.GameObjects.Graphics;
  private readonly nome: Phaser.GameObjects.Text;
  private readonly quebrado: Phaser.GameObjects.Text;
  private readonly caixa: CaixaDaBarra = { x: 0, y: 0, largura: 0, altura: 0 };
  private visivel = false;
  private hpDesenhado = -1;
  private posturaDesenhada = -1;
  private quebraDesenhada = -1;

  constructor(private readonly cena: Phaser.Scene) {
    const barra = (cor: number, alfa: number): Phaser.GameObjects.Image =>
      cena.add.image(0, 0, CHAVE_DO_ATLAS, 'quadrado').setOrigin(0, 0.5).setTint(cor).setAlpha(alfa).setVisible(false).setScale(0, 1);
    this.trilhoHp = barra(COR.pedra, 0.7);
    this.hp = barra(COR.cinzaVermelha, 1);
    this.trilhoPostura = barra(COR.pedra, 0.7);
    this.postura = barra(COR.postura, 1);
    this.marcas = cena.add.graphics().setVisible(false);
    this.contorno = cena.add.graphics().setVisible(false);
    this.nome = texto(cena, 0, 0, 'E1.LANTERNEIRO.NOME', BARRAS_DO_CHEFE.corpoDoNome, COR.osso).setOrigin(0.5, 0).setVisible(false);
    this.quebrado = texto(cena, 0, 0, 'A5.HUD.QUEBRADO', 9, COR.osso).setOrigin(0.5).setVisible(false);
  }

  /** Posiciona tudo na safe-area (a cada diagramação) e força a releitura do estado. */
  diagramar(ins: Insets): void {
    const c = caixaDasBarrasDoChefe(ins, this.caixa);
    const meioHp = c.y + c.altura / 2;
    const yPostura = c.y + c.altura + BARRAS_DO_CHEFE.entreBarras;
    const meioPostura = yPostura + BARRAS_DO_CHEFE.alturaDaPostura / 2;
    this.trilhoHp.setPosition(c.x, meioHp).setScale(escalaPara('quadrado', c.largura), escalaPara('quadrado', c.altura));
    this.hp.setPosition(c.x, meioHp);
    this.trilhoPostura.setPosition(c.x, meioPostura).setScale(escalaPara('quadrado', c.largura), escalaPara('quadrado', BARRAS_DO_CHEFE.alturaDaPostura));
    this.postura.setPosition(c.x, meioPostura);
    this.nome.setPosition(c.x + c.largura / 2, c.y - BARRAS_DO_CHEFE.nomeAcima);
    this.quebrado.setPosition(c.x + c.largura / 2, meioPostura);
    this.marcas.clear().fillStyle(COR.osso, 0.9);
    for (const pct of BARRAS_DO_CHEFE.marcasDeFase) this.marcas.fillRect(c.x + (c.largura * pct) / 100 - 0.5, c.y, 1, c.altura);
    this.contorno.clear().lineStyle(2, COR.brasa, 1).strokeRect(c.x - 1, yPostura - 1, c.largura + 2, BARRAS_DO_CHEFE.alturaDaPostura + 2);
    this.hpDesenhado = this.posturaDesenhada = this.quebraDesenhada = -1;
  }

  /** Lê o chefe do estado: aparece com ele vivo e a Vigília em jogo, e some sem ele ou no APAGANDO e no FIM (o Resultado cobre a tela). */
  atualizar(e: Estado, postura100: number, emJogo: boolean): void {
    const s = e.chefeU16[CHEFE_U16.slot]!;
    const vivo = s !== SEM_CHEFE && emJogo;
    if (vivo !== this.visivel) {
      this.visivel = vivo;
      for (const o of [this.trilhoHp, this.trilhoPostura, this.marcas, this.nome]) o.setVisible(vivo);
      this.hp.setVisible(vivo && this.hpDesenhado !== 0);
      this.postura.setVisible(vivo);
      if (!vivo) {
        this.contorno.setVisible(false);
        this.quebrado.setVisible(false);
      }
      this.hpDesenhado = this.posturaDesenhada = this.quebraDesenhada = -1;
    }
    if (!vivo) return;
    const hp = e.inimigos.hp[s]!;
    if (hp !== this.hpDesenhado) {
      this.hpDesenhado = hp;
      const l = larguraDaBarraDoChefe(this.caixa.largura, hp, e.chefeF32[CHEFE_F32.hpMax]!);
      this.hp.setVisible(l > 0).setScale(escalaPara('quadrado', l), escalaPara('quadrado', this.caixa.altura));
    }
    const postura = e.chefeF32[CHEFE_F32.postura]!;
    if (postura !== this.posturaDesenhada) {
      this.posturaDesenhada = postura;
      const l = larguraDaBarraDoChefe(this.caixa.largura, postura, postura100);
      this.postura.setVisible(l > 0).setScale(escalaPara('quadrado', l), escalaPara('quadrado', BARRAS_DO_CHEFE.alturaDaPostura));
    }
    const quebra = e.chefeU16[CHEFE_U16.quebraPassos]! > 0 ? 1 : 0;
    if (quebra !== this.quebraDesenhada) {
      this.quebraDesenhada = quebra;
      this.contorno.setVisible(quebra === 1);
      this.quebrado.setVisible(quebra === 1);
    }
  }
}
