// Cena Santuario (design/decisoes-F-010.md SN1 a SN6, FD1, FD2, FD9, GA2, PW3): o lugar entre as Vigílias. Formas simples e texto
// (a arte é da F-011): a barra de Almas e Brasas, Iselda (tocar abre a árvore da Fundação), o botão Vigília e, por cima, a
// árvore (grade 2 × 4, painel de detalhe, Reembolsar e Voltar) e o convite "Adicionar à Tela de Início". Toda a regra mora em
// santuario.ts (puro); esta cena só desenha e repassa os toques, que chegam pela camada DOM no touchend (como na Acender).
import Phaser from 'phaser';
import { acharAlvo, alvosDaArvore, alvosDoConvite, alvosDoSantuario, ISELDA, medidasDaArvore, type Alvo } from '../entrada/alvos';
import { NUMERO_DE_NOS } from '../logica/progressao/fundacao';
import type { Meta } from '../logica/save/meta';
import { ehStandalone, pedirPersistencia } from '../plataforma/pwa';
import { ALTURA_LOGICA, LARGURA_LOGICA, medirSafeArea } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { formatarAlmas } from './layoutDoHud';
import { abrirArvore, detalheDoNo, entrarNoSantuario, fecharArvore, recusarConvite, tocarNo, tocarReembolsar, type EstadoDoSantuario } from './modeloDoSantuario';
import { t } from './textos';

type Parametros = Record<string, string | number>;

/** Troca o texto de um objeto pelo id (o `idTexto` alimenta o `__GAME_DEBUG__.textoAtivo`). */
function trocar(obj: Phaser.GameObjects.Text, id: string, params?: Parametros): void {
  obj.setText(t(id, params)).setData('idTexto', id);
}

export class Santuario extends Phaser.Scene {
  private est: EstadoDoSantuario = { arvoreAberta: false, selecionado: null, tocado: false, reembolsoArmado: false, falaDeIselda: false, conviteAberto: false, recusa: null };
  private desenho: Phaser.GameObjects.Graphics | null = null;
  private almas: Phaser.GameObjects.Text | null = null;
  private brasas: Phaser.GameObjects.Text | null = null;
  private iselda: Phaser.GameObjects.Text | null = null;
  private fala: Phaser.GameObjects.Text | null = null;
  private vigilia: Phaser.GameObjects.Text | null = null;
  private convite: Phaser.GameObjects.Text | null = null;
  private passos: Phaser.GameObjects.Text | null = null;
  private agoraNao: Phaser.GameObjects.Text | null = null;
  private titulo: Phaser.GameObjects.Text | null = null;
  private readonly nos: Phaser.GameObjects.Text[] = [];
  private readonly ranks: Phaser.GameObjects.Text[] = [];
  private nome: Phaser.GameObjects.Text | null = null;
  private efeito: Phaser.GameObjects.Text | null = null;
  private memoria: Phaser.GameObjects.Text | null = null;
  private custo: Phaser.GameObjects.Text | null = null;
  private dica: Phaser.GameObjects.Text | null = null;
  private reembolsar: Phaser.GameObjects.Text | null = null;
  private voltar: Phaser.GameObjects.Text | null = null;
  private alvos: Alvo[] = [];
  private iniciou = false;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Santuario' });
  }

  create(): void {
    this.ctx.tela = 'SANTUARIO';
    this.iniciou = false;
    cameraLogica(this);
    this.desenho = this.add.graphics();
    this.almas = texto(this, 0, 0, 'A9.SANTUARIO.ALMAS', 18, COR.osso, { almas: 0 }).setOrigin(0, 0.5);
    this.brasas = texto(this, 0, 0, 'A9.SANTUARIO.BRASAS', 18, COR.brasa, { brasas: 0 }).setOrigin(1, 0.5);
    this.iselda = texto(this, 0, 0, 'A9.SANTUARIO.ISELDA', 16, COR.osso).setOrigin(0.5);
    this.fala = texto(this, 0, 0, 'A9.SANTUARIO.ISELDA_FALA_01', 14, COR.brasaClara, undefined, 340).setOrigin(0.5);
    this.vigilia = texto(this, 0, 0, 'A9.SANTUARIO.VIGILIA', 22, COR.osso).setOrigin(0.5);
    this.convite = texto(this, 0, 0, 'A8.SISTEMA.CONVITE_PWA', 16, COR.osso, undefined, 270).setOrigin(0.5);
    this.passos = texto(this, 0, 0, 'A8.SISTEMA.CONVITE_PASSOS', 14, COR.sal, undefined, 270).setOrigin(0.5);
    this.agoraNao = texto(this, 0, 0, 'A8.SISTEMA.AGORA_NAO', 18, COR.osso).setOrigin(0.5);
    this.titulo = texto(this, 0, 0, 'A9.SANTUARIO.ARVORE', 18, COR.osso).setOrigin(0.5);
    this.nos.length = this.ranks.length = 0;
    for (let i = 0; i < NUMERO_DE_NOS; i++) {
      this.nos.push(texto(this, 0, 0, 'A9.SANTUARIO.ARVORE', 14, COR.osso, undefined, 150).setOrigin(0.5, 0));
      this.ranks.push(texto(this, 0, 0, 'A9.SANTUARIO.RANK', 12, COR.sal, { rank: 0, max: 0 }).setOrigin(0.5, 1));
    }
    this.nome = texto(this, 0, 0, 'A9.SANTUARIO.ARVORE', 18, COR.brasa).setOrigin(0.5, 0);
    this.efeito = texto(this, 0, 0, 'A9.SANTUARIO.ARVORE', 14, COR.osso, undefined, 340).setOrigin(0.5, 0);
    this.memoria = texto(this, 0, 0, 'A9.SANTUARIO.ARVORE', 13, COR.sal, undefined, 340).setOrigin(0.5, 0).setAlpha(0.8);
    this.custo = texto(this, 0, 0, 'A9.SANTUARIO.CUSTO', 15, COR.osso, { custo: 0 }).setOrigin(0.5, 1);
    this.dica = texto(this, 0, 0, 'A9.SANTUARIO.PESQUISAR', 13, COR.brasa).setOrigin(0.5, 1);
    this.reembolsar = texto(this, 0, 0, 'A9.SANTUARIO.REEMBOLSAR', 15, COR.osso, undefined, 150).setOrigin(0.5);
    this.voltar = texto(this, 0, 0, 'A9.SANTUARIO.VOLTAR', 18, COR.osso).setOrigin(0.5);
    // A chegada (GA2, PW3): Iselda apresenta ou o convite abre; o estado fica no contexto para o __GAME_DEBUG__.
    this.est = entrarNoSantuario(this.ctx.meta.atual, ehStandalone(navigator, window));
    this.ctx.santuario = this.est;
    this.redesenhar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redesenhar, this);
    const camada = this.ctx.camada;
    if (!camada) throw new Error('Santuario: a camada de toque nasce no postBoot, antes desta cena');
    camada.aoSoltar(this.aoSoltar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.redesenhar, this);
      camada.removerAoSoltar(this.aoSoltar);
      this.ctx.santuario = null;
    });
  }

  /** Grava o meta novo (compra, reembolso, marco, convite) quando mudou; depois de uma compra pede o armazenamento persistente (ST2). */
  private gravar(novo: Meta): void {
    const antigo = this.ctx.meta.atual;
    if (novo === antigo) return;
    this.ctx.meta.armazenamento.gravar(novo);
    this.ctx.meta.atual = novo;
    if (novo.fundacao.gasto !== antigo.fundacao.gasto) void pedirPersistencia(navigator, window).then((r) => (this.ctx.persistido = r));
  }

  /** Chamado de forma síncrona pela camada de toque, dentro do touchend. */
  private readonly aoSoltar = (x: number, y: number): void => {
    if (this.iniciou) return;
    const alvo = acharAlvo(this.alvos, x, y)?.id;
    if (alvo === undefined) return;
    const m = this.ctx.meta.atual;
    const est = this.est;
    if (est.arvoreAberta) {
      if (alvo === 'voltar') this.gravar(fecharArvore(m, est));
      else if (alvo === 'reembolsar') this.gravar(tocarReembolsar(m, est));
      else if (alvo.startsWith('no')) this.gravar(tocarNo(m, est, Number(alvo.slice(2))));
    } else if (alvo === 'iselda') abrirArvore(est);
    else if (alvo === 'agoraNao') this.gravar(recusarConvite(m, est));
    else if (alvo === 'vigilia') {
      this.iniciou = true;
      this.scene.start('Vigilia');
      return;
    }
    this.redesenhar();
  };

  private redesenhar(): void {
    const ins = medirSafeArea(this.ctx.sonda, this.game.canvas, this.ctx.container, this.ctx.insets);
    const g = this.desenho!.clear();
    g.fillStyle(COR.fundo).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    const meta = this.ctx.meta.atual;
    const est = this.est;
    const arvore = est.arvoreAberta;
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    // O que só existe fora da árvore.
    for (const o of [this.almas!, this.brasas!, this.iselda!, this.vigilia!]) o.setVisible(!arvore);
    this.convite!.setVisible(!arvore && est.conviteAberto);
    this.passos!.setVisible(!arvore && est.conviteAberto);
    this.agoraNao!.setVisible(!arvore && est.conviteAberto);
    // O que só existe na árvore.
    for (const o of [this.titulo!, this.nome!, this.efeito!, this.memoria!, this.reembolsar!, this.voltar!, ...this.nos, ...this.ranks]) o.setVisible(arvore);
    this.custo!.setVisible(false);
    this.dica!.setVisible(false);
    this.fala!.setVisible(est.falaDeIselda);
    if (arvore) this.desenharArvore(ins, cx, meta);
    else this.desenharSantuario(ins, cx, meta);
    this.ctx.santuario = est;
  }

  private desenharSantuario(ins: { topo: number; esquerda: number; direita: number; baixo: number }, cx: number, meta: Meta): void {
    const g = this.desenho!;
    this.alvos = alvosForaDaArvore(this.est, ins);
    const y = ins.topo + 16;
    this.almas!.setPosition(ins.esquerda + 24, y + 12);
    trocar(this.almas!, 'A9.SANTUARIO.ALMAS', { almas: formatarAlmas(meta.almas) });
    this.brasas!.setPosition(LARGURA_LOGICA - ins.direita - 24, y + 12);
    trocar(this.brasas!, 'A9.SANTUARIO.BRASAS', { brasas: formatarAlmas(meta.brasas) });
    const is = this.alvos.find((a) => a.id === 'iselda')!;
    const icx = is.x + is.largura / 2;
    const icy = is.y + is.altura / 2;
    g.fillStyle(COR.brasaClara).fillCircle(icx, icy, ISELDA.circulo / 2);
    g.lineStyle(2, COR.laranjaQueimado).strokeCircle(icx, icy, ISELDA.circulo / 2);
    this.iselda!.setPosition(icx, icy + ISELDA.circulo / 2 + 16);
    const v = this.alvos.find((a) => a.id === 'vigilia')!;
    this.botao(v);
    this.vigilia!.setPosition(v.x + v.largura / 2, v.y + v.altura / 2);
    this.fala!.setPosition(cx, is.y + is.altura + 36);
    if (this.est.conviteAberto) {
      const a = this.alvos.find((b) => b.id === 'agoraNao')!;
      this.botao(a);
      this.agoraNao!.setPosition(a.x + a.largura / 2, a.y + a.altura / 2);
      const topo = a.y - 8 - 150;
      g.fillStyle(COR.pedra, 0.8).fillRect(a.x, topo, a.largura, 150);
      g.lineStyle(2, COR.laranjaQueimado).strokeRect(a.x, topo, a.largura, 150);
      this.convite!.setPosition(cx, topo + 40);
      this.passos!.setPosition(cx, topo + 105);
    }
  }

  private desenharArvore(ins: { topo: number; esquerda: number; direita: number; baixo: number }, cx: number, meta: Meta): void {
    const g = this.desenho!;
    this.alvos = alvosDaArvore(ins, []);
    const med = medidasDaArvore(ins);
    const e = this.est;
    this.titulo!.setPosition(cx, ins.topo + 16);
    this.fala!.setPosition(cx, ins.topo + 38);
    for (let i = 0; i < NUMERO_DE_NOS; i++) {
      const a = this.alvos[i]!;
      const d = detalheDoNo(meta, i);
      const sel = e.selecionado === i;
      g.fillStyle(sel ? COR.fundo : COR.cinzaFrio).fillRect(a.x, a.y, a.largura, a.altura);
      g.lineStyle(sel ? 4 : 2, sel ? COR.brasa : COR.laranjaQueimado, d.bloqueado ? 0.5 : 1).strokeRect(a.x, a.y, a.largura, a.altura);
      // O anel de brasa da apresentação de Iselda (GA2): um segundo contorno, fora do nó.
      if (e.falaDeIselda && sel) g.lineStyle(2, COR.brasaClara).strokeRect(a.x - 4, a.y - 4, a.largura + 8, a.altura + 8);
      trocar(this.nos[i]!, d.nomeId);
      this.nos[i]!.setWordWrapWidth(a.largura - 12).setPosition(a.x + a.largura / 2, a.y + 8).setAlpha(d.bloqueado ? 0.5 : 1);
      if (d.bloqueado) trocar(this.ranks[i]!, 'A9.SANTUARIO.BLOQUEADO');
      else trocar(this.ranks[i]!, 'A9.SANTUARIO.RANK', { rank: d.rank, max: d.maximo });
      this.ranks[i]!.setPosition(a.x + a.largura / 2, a.y + a.altura - 6).setAlpha(d.bloqueado ? 0.5 : 1);
    }
    // O painel fixo de detalhe (FD1): nome, efeito, lore, custo e a dica do 2º toque.
    g.fillStyle(COR.pedra, 0.8).fillRect(med.x0, med.painelY, 2 * med.coluna + 8, med.painelAltura);
    const pcx = med.x0 + med.coluna + 4;
    const sel = e.selecionado;
    const nomes = [this.nome!, this.efeito!, this.memoria!];
    if (sel === null) {
      for (const o of nomes) o.setVisible(false);
    } else {
      const d = detalheDoNo(meta, sel);
      trocar(this.nome!, d.nomeId);
      trocar(this.efeito!, d.efeitoId);
      trocar(this.memoria!, d.memoriaId);
      this.nome!.setPosition(pcx, med.painelY + 10);
      this.efeito!.setPosition(pcx, med.painelY + 38);
      this.memoria!.setPosition(pcx, med.painelY + 38 + this.efeito!.height + 8);
      const fundo = med.painelY + med.painelAltura;
      this.custo!.setVisible(true);
      if (d.bloqueado) trocar(this.custo!, 'A9.SANTUARIO.BLOQUEADO');
      else if (d.custo === null) trocar(this.custo!, 'A9.SANTUARIO.RANK', { rank: d.rank, max: d.maximo });
      else trocar(this.custo!, 'A9.SANTUARIO.CUSTO', { custo: formatarAlmas(d.custo) });
      this.custo!.setPosition(pcx, fundo - 26);
      // A dica do 2º toque (FD2), ou a recusa por falta de Almas.
      const recusa = e.recusa === 'sem_almas';
      if (recusa || (!d.bloqueado && d.custo !== null)) {
        this.dica!.setVisible(true).setColor(recusa ? '#c8324b' : '#ffb347');
        trocar(this.dica!, recusa ? 'A9.SANTUARIO.SEM_ALMAS' : 'A9.SANTUARIO.PESQUISAR');
        this.dica!.setPosition(pcx, fundo - 6);
      }
    }
    const r = this.alvos[NUMERO_DE_NOS]!;
    const v = this.alvos[NUMERO_DE_NOS + 1]!;
    this.botao(r, e.reembolsoArmado, meta.fundacao.gasto === 0);
    this.botao(v);
    trocar(this.reembolsar!, e.reembolsoArmado ? 'A9.SANTUARIO.REEMBOLSAR_CONFIRMA' : 'A9.SANTUARIO.REEMBOLSAR');
    this.reembolsar!.setWordWrapWidth(r.largura - 12).setPosition(r.x + r.largura / 2, r.y + r.altura / 2).setAlpha(meta.fundacao.gasto === 0 ? 0.4 : 1);
    this.voltar!.setPosition(v.x + v.largura / 2, v.y + v.altura / 2);
  }

  /** Botão de formas simples: caixa cinza com contorno (de brasa, grosso, quando armado). */
  private botao(a: Alvo, armado = false, apagado = false): void {
    const g = this.desenho!;
    g.fillStyle(COR.cinzaFrio, apagado ? 0.5 : 1).fillRect(a.x, a.y, a.largura, a.altura);
    g.lineStyle(armado ? 4 : 2, armado ? COR.brasa : COR.laranjaQueimado, apagado ? 0.5 : 1).strokeRect(a.x, a.y, a.largura, a.altura);
  }
}

/** Os alvos do Santuário fora da árvore: Vigília e Iselda, mais o Agora não quando o convite está aberto. */
function alvosForaDaArvore(e: EstadoDoSantuario, ins: { topo: number; esquerda: number; direita: number; baixo: number }): Alvo[] {
  const base = alvosDoSantuario(ins, []);
  return e.conviteAberto ? [...alvosDoConvite(ins, []), ...base] : base;
}
